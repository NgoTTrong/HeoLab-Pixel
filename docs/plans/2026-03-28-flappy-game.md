# Pixel Flap (Flappy Bird) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build "Pixel Flap" — a Flappy Bird clone with time-of-day themes, milestone obstacle changes, medal system, and pixel particle death at `/games/flappy`.

**Architecture:** Canvas-based rendering with `requestAnimationFrame`. Physics: constant gravity + upward impulse on tap. Config-driven themes and obstacles. No external libraries.

**Tech Stack:** Next.js 16 App Router, TypeScript, React (useRef + useEffect), HTML Canvas, Tailwind CSS v4.

---

### Task 1: Config

**Files:**
- Create: `src/games/flappy/config.ts`

```ts
export interface TimeTheme {
  id: string;
  label: string;
  skyTop: string;
  skyBottom: string;
  groundColor: string;
  hours: number[]; // 24h values that map to this theme
}

export interface ObstacleTheme {
  minScore: number;
  label: string;
  color: string;
  capColor: string;
}

export interface Medal {
  minScore: number;
  label: string;
  color: string;
  emoji: string;
}

export const TIME_THEMES: TimeTheme[] = [
  {
    id: "dawn",
    label: "DAWN",
    skyTop: "#1a1a4e",
    skyBottom: "#ff7043",
    groundColor: "#5d4037",
    hours: [5, 6, 7],
  },
  {
    id: "day",
    label: "DAY",
    skyTop: "#4a90d9",
    skyBottom: "#87ceeb",
    groundColor: "#8b7355",
    hours: [8,9,10,11,12,13,14,15,16],
  },
  {
    id: "dusk",
    label: "DUSK",
    skyTop: "#1a1a2e",
    skyBottom: "#ff5722",
    groundColor: "#6d4c41",
    hours: [17, 18, 19],
  },
  {
    id: "night",
    label: "NIGHT",
    skyTop: "#0a0a0a",
    skyBottom: "#0a0a2e",
    groundColor: "#1a1a2e",
    hours: [20,21,22,23,0,1,2,3,4],
  },
];

export const OBSTACLE_THEMES: ObstacleTheme[] = [
  { minScore: 0,  label: "PIPES",    color: "#2d7a2d", capColor: "#3d9e3d" },
  { minScore: 10, label: "CITY",     color: "#374151", capColor: "#4b5563" },
  { minScore: 20, label: "ROCKETS",  color: "#7f1d1d", capColor: "#ff2d95" },
];

export const MEDALS: Medal[] = [
  { minScore: 40, label: "PLATINUM", color: "#00d4ff", emoji: "💎" },
  { minScore: 20, label: "GOLD",     color: "#ffe600", emoji: "🥇" },
  { minScore: 10, label: "SILVER",   color: "#aaaaaa", emoji: "🥈" },
  { minScore: 5,  label: "BRONZE",   color: "#cd7f32", emoji: "🥉" },
];

export function getTimeTheme(): TimeTheme {
  const hour = new Date().getHours();
  return TIME_THEMES.find((t) => t.hours.includes(hour)) ?? TIME_THEMES[1];
}

export function getObstacleTheme(score: number): ObstacleTheme {
  let theme = OBSTACLE_THEMES[0];
  for (const t of OBSTACLE_THEMES) {
    if (score >= t.minScore) theme = t;
  }
  return theme;
}

export function getMedal(score: number): Medal | null {
  for (const m of MEDALS) {
    if (score >= m.minScore) return m;
  }
  return null;
}

// Physics constants
export const GRAVITY = 0.5;
export const FLAP_IMPULSE = -9;
export const PIPE_WIDTH = 52;
export const PIPE_GAP = 155;
export const PIPE_SPEED = 3;
export const PIPE_INTERVAL = 90; // frames between pipes
export const GROUND_HEIGHT = 60;
```

**Commit:**
```bash
git add src/games/flappy/config.ts
git commit -m "feat: flappy bird config with time themes, obstacles, medals"
```

---

### Task 2: Canvas game page

**Files:**
- Create: `src/app/games/flappy/page.tsx`

```tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PixelButton from "@/components/PixelButton";
import {
  GRAVITY, FLAP_IMPULSE, PIPE_WIDTH, PIPE_GAP, PIPE_SPEED,
  PIPE_INTERVAL, GROUND_HEIGHT, getTimeTheme, getObstacleTheme, getMedal,
} from "@/games/flappy/config";
import { getHighScore, setHighScore } from "@/lib/scores";
import Link from "next/link";

const GAME_KEY = "flappy";

type GameStatus = "idle" | "playing" | "dead";

interface Pipe {
  x: number;
  topHeight: number; // height of top pipe
  passed: boolean;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; // 0-1
  color: string;
  size: number;
}

export default function FlappyPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    status: "idle" as GameStatus,
    birdY: 200,
    birdVY: 0,
    pipes: [] as Pipe[],
    particles: [] as Particle[],
    score: 0,
    frame: 0,
    birdAngle: 0,
  });
  const [uiState, setUiState] = useState<{ status: GameStatus; score: number; highScore: number }>({
    status: "idle", score: 0, highScore: 0,
  });
  const rafRef = useRef<number>(0);
  const theme = useRef(getTimeTheme());

  useEffect(() => {
    setUiState((s) => ({ ...s, highScore: getHighScore(GAME_KEY) }));
  }, []);

  const spawnParticles = (x: number, y: number) => {
    const colors = ["#ff2d95", "#ffe600", "#00d4ff", "#39ff14", "#ffffff"];
    stateRef.current.particles = Array.from({ length: 20 }, () => ({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 6 + 2,
    }));
  };

  const startGame = useCallback(() => {
    theme.current = getTimeTheme();
    stateRef.current = {
      status: "playing",
      birdY: 200,
      birdVY: 0,
      pipes: [],
      particles: [],
      score: 0,
      frame: 0,
      birdAngle: 0,
    };
    setUiState((s) => ({ ...s, status: "playing", score: 0 }));
  }, []);

  const flap = useCallback(() => {
    const s = stateRef.current;
    if (s.status === "idle") { startGame(); return; }
    if (s.status !== "playing") return;
    s.birdVY = FLAP_IMPULSE;
    if ("vibrate" in navigator) navigator.vibrate(15);
  }, [startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const BIRD_X = 80;
    const BIRD_SIZE = 24;

    function draw() {
      const ctx = canvas!.getContext("2d")!;
      const s = stateRef.current;
      const t = theme.current;
      const obstTheme = getObstacleTheme(s.score);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H - GROUND_HEIGHT);
      skyGrad.addColorStop(0, t.skyTop);
      skyGrad.addColorStop(1, t.skyBottom);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H - GROUND_HEIGHT);

      // Ground
      ctx.fillStyle = t.groundColor;
      ctx.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, H - GROUND_HEIGHT, W, 4);

      if (s.status === "playing") {
        s.frame++;
        s.birdVY += GRAVITY;
        s.birdY += s.birdVY;
        s.birdAngle = Math.max(-30, Math.min(90, s.birdVY * 4));

        // Spawn pipes
        if (s.frame % PIPE_INTERVAL === 0) {
          const minTop = 60;
          const maxTop = H - GROUND_HEIGHT - PIPE_GAP - 60;
          const topHeight = Math.floor(Math.random() * (maxTop - minTop) + minTop);
          s.pipes.push({ x: W, topHeight, passed: false });
        }

        // Move pipes
        s.pipes = s.pipes.filter((p) => p.x + PIPE_WIDTH > -10);
        for (const pipe of s.pipes) {
          pipe.x -= PIPE_SPEED;
          // Score
          if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
            pipe.passed = true;
            s.score++;
            setUiState((prev) => ({ ...prev, score: s.score }));
          }
        }

        // Collision: ground/ceiling
        if (s.birdY + BIRD_SIZE / 2 > H - GROUND_HEIGHT || s.birdY - BIRD_SIZE / 2 < 0) {
          s.status = "dead";
          spawnParticles(BIRD_X, s.birdY);
          const hs = getHighScore(GAME_KEY);
          if (s.score > hs) setHighScore(GAME_KEY, s.score);
          setUiState({ status: "dead", score: s.score, highScore: Math.max(s.score, hs) });
          return;
        }

        // Collision: pipes
        for (const pipe of s.pipes) {
          const birdLeft = BIRD_X - BIRD_SIZE / 2 + 4;
          const birdRight = BIRD_X + BIRD_SIZE / 2 - 4;
          const birdTop = s.birdY - BIRD_SIZE / 2 + 4;
          const birdBottom = s.birdY + BIRD_SIZE / 2 - 4;
          const pipeRight = pipe.x + PIPE_WIDTH;
          const gapTop = pipe.topHeight;
          const gapBottom = pipe.topHeight + PIPE_GAP;
          if (birdRight > pipe.x && birdLeft < pipeRight) {
            if (birdTop < gapTop || birdBottom > gapBottom) {
              s.status = "dead";
              spawnParticles(BIRD_X, s.birdY);
              const hs = getHighScore(GAME_KEY);
              if (s.score > hs) setHighScore(GAME_KEY, s.score);
              setUiState({ status: "dead", score: s.score, highScore: Math.max(s.score, hs) });
              return;
            }
          }
        }
      }

      // Draw pipes
      for (const pipe of s.pipes) {
        ctx.fillStyle = obstTheme.color;
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.topHeight + PIPE_GAP, PIPE_WIDTH, H - GROUND_HEIGHT - pipe.topHeight - PIPE_GAP);
        // Caps
        ctx.fillStyle = obstTheme.capColor;
        ctx.fillRect(pipe.x - 4, pipe.topHeight - 14, PIPE_WIDTH + 8, 14);
        ctx.fillRect(pipe.x - 4, pipe.topHeight + PIPE_GAP, PIPE_WIDTH + 8, 14);
      }

      // Draw bird (pixel square with rotation)
      ctx.save();
      ctx.translate(BIRD_X, s.birdY);
      ctx.rotate((s.birdAngle * Math.PI) / 180);
      if (s.status !== "dead") {
        ctx.fillStyle = "#ffe600";
        ctx.fillRect(-BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE);
        ctx.fillStyle = "#ff2d95";
        ctx.fillRect(4, -4, 8, 8); // eye
        ctx.fillStyle = "#f97316";
        ctx.fillRect(BIRD_SIZE / 2 - 2, 0, 8, 4); // beak
      }
      ctx.restore();

      // Draw particles
      s.particles = s.particles.filter((p) => p.life > 0);
      for (const p of s.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.life -= 0.04;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // Score display
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(s.score), W / 2, 44);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "ArrowUp") { e.preventDefault(); flap(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flap]);

  const medal = getMedal(uiState.score);

  return (
    <div className="flex flex-col items-center min-h-screen p-4 gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <Link href="/games" className="text-[0.5rem] neon-text-yellow hover:opacity-80">← BACK</Link>
        <h1 className="text-[0.6rem] sm:text-xs neon-text neon-text-yellow">PIXEL FLAP</h1>
        <span className="text-[0.5rem] text-gray-400">BEST: {uiState.highScore}</span>
      </div>

      {/* Canvas */}
      <div className="relative cursor-pointer" onClick={flap} onTouchStart={(e) => { e.preventDefault(); flap(); }}>
        <canvas
          ref={canvasRef}
          width={360}
          height={540}
          className="border border-neon-yellow/20 rounded-sm"
          style={{ imageRendering: "pixelated", touchAction: "none" }}
        />

        {/* Idle overlay */}
        {uiState.status === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-bg/30 backdrop-blur-sm animate-[overlayIn_0.5s_ease-out]">
            <div className="flex flex-col items-center gap-4">
              <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">🐦</div>
              <h2 className="text-sm font-pixel neon-text-yellow animate-[victoryGlowYellow_1.5s_ease-in-out_infinite]">PIXEL FLAP</h2>
              <p className="text-[0.5rem] font-pixel text-neon-yellow/60">TAP OR PRESS SPACE</p>
            </div>
          </div>
        )}

        {/* Dead overlay */}
        {uiState.status === "dead" && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-bg/30 backdrop-blur-sm animate-[overlayIn_0.5s_ease-out]">
            <div className="flex flex-col items-center gap-3 pointer-events-auto">
              <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">💥</div>
              <h2 className="text-lg font-pixel neon-text-pink animate-[defeatFlash_1s_ease-in-out_infinite]">GAME OVER</h2>
              {medal && (
                <p className="text-2xl">{medal.emoji} <span className="font-pixel text-[0.5rem]" style={{ color: medal.color }}>{medal.label}</span></p>
              )}
              <p className="text-[0.6rem] font-pixel text-neon-pink/70">SCORE: {uiState.score} · BEST: {uiState.highScore}</p>
              <PixelButton color="pink" onClick={startGame}>TRY AGAIN</PixelButton>
            </div>
          </div>
        )}
      </div>

      <p className="text-[0.45rem] font-pixel text-gray-600">TAP / SPACE / ↑ TO FLAP</p>
    </div>
  );
}
```

**Step 2: Verify**

- `http://localhost:3000/games/flappy` — canvas renders sky + ground
- Click/tap → bird flaps up
- Pipes appear and move left
- Score increments on pipe pass
- Death → particle explosion + overlay
- Mobile touch works

**Commit:**
```bash
git add src/app/games/flappy/page.tsx
git commit -m "feat: Pixel Flap flappy bird with canvas, time themes, medals, particles"
```

---

### Task 3: SEO + mark available

**Files:**
- Create: `src/app/games/flappy/layout.tsx`
- Modify: `src/app/games/page.tsx` — set Pixel Flap `available: true`
- Modify: `src/app/sitemap.ts` — add flappy URL

```tsx
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Pixel Flap — Free Flappy Bird Game | HeoLab",
  description: "Play Pixel Flap, a Flappy Bird game with time-of-day themes, obstacle milestones, and medal system. Free browser game, no download.",
  openGraph: {
    title: "Pixel Flap — Free Flappy Bird Game | HeoLab",
    description: "Flappy Bird with time-of-day themes and medal system. Free browser game.",
    url: "https://heolab.dev/games/flappy",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

**Commit:**
```bash
git add src/app/games/flappy/layout.tsx src/app/games/page.tsx src/app/sitemap.ts
git commit -m "feat: flappy SEO metadata, mark as available"
```
