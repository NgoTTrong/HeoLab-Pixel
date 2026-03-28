"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PixelButton from "@/components/PixelButton";
import {
  GRAVITY, FLAP_IMPULSE, PIPE_WIDTH, PIPE_GAP, PIPE_SPEED,
  PIPE_INTERVAL, GROUND_HEIGHT, getTimeTheme, getObstacleTheme, getMedal,
} from "@/games/flappy/config";
import { getHighScore, setHighScore } from "@/lib/scores";
import Link from "next/link";
import { createFlappyAudio } from "@/games/flappy/audio";
import type { FlappyAudio } from "@/games/flappy/audio";
import MuteButton from "@/components/MuteButton";

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
  const audioRef = useRef<FlappyAudio | null>(null);
  const [muted, setMuted] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("flappy-sound-muted") === "1"
  );

  useEffect(() => {
    setUiState((s) => ({ ...s, highScore: getHighScore(GAME_KEY) }));
  }, []);

  // Lazy-init audio on first interaction
  useEffect(() => {
    const init = () => {
      if (!audioRef.current) {
        audioRef.current = createFlappyAudio();
        audioRef.current.setMuted(muted);
      }
    };
    window.addEventListener("pointerdown", init, { once: true });
    window.addEventListener("keydown", init, { once: true });
    return () => {
      window.removeEventListener("pointerdown", init);
      window.removeEventListener("keydown", init);
    };
  }, [muted]);

  useEffect(() => {
    audioRef.current?.setMuted(muted);
    localStorage.setItem("flappy-sound-muted", muted ? "1" : "0");
  }, [muted]);

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
    audioRef.current?.playFlap();
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
      if (document.hidden) { rafRef.current = requestAnimationFrame(draw); return; }
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
            audioRef.current?.playScore();
            setUiState((prev) => ({ ...prev, score: s.score }));
          }
        }

        // Collision: ground/ceiling
        if (s.birdY + BIRD_SIZE / 2 > H - GROUND_HEIGHT || s.birdY - BIRD_SIZE / 2 < 0) {
          s.status = "dead";
          spawnParticles(BIRD_X, s.birdY);
          audioRef.current?.playDie();
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
              audioRef.current?.playDie();
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
      <div className="flex items-center justify-between w-full max-w-md">
        <Link href="/games" className="text-[0.5rem] neon-text-yellow hover:opacity-80">← BACK</Link>
        <h1 className="text-[0.6rem] sm:text-xs neon-text neon-text-yellow">PIXEL FLAP</h1>
        <div className="flex items-center gap-2">
          <span className="text-[0.5rem] text-gray-400">BEST: {uiState.highScore}</span>
          <MuteButton muted={muted} onToggle={() => setMuted(m => !m)} color="yellow" />
        </div>
      </div>

      {/* Canvas */}
      <div className="relative cursor-pointer" onClick={flap} onTouchStart={(e) => { e.preventDefault(); flap(); }}>
        <canvas
          ref={canvasRef}
          width={480}
          height={580}
          className="border border-neon-yellow/20 rounded-sm"
          style={{ imageRendering: "pixelated", touchAction: "none", maxWidth: "100%" }}
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
