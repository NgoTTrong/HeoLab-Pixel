"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PixelButton from "@/components/PixelButton";
import {
  GRAVITY, FLAP_IMPULSE, PIPE_WIDTH, PIPE_GAP, PIPE_SPEED,
  PIPE_SPEED_BASE, PIPE_SPEED_MAX,
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
    coins: [] as { x: number; y: number; collected: boolean }[],
    clouds: [] as { x: number; y: number; w: number }[],
    particles: [] as Particle[],
    score: 0,
    frame: 0,
    birdAngle: 0,
    birdWingUp: false,
    newBestTimer: 0,
    newBestShown: false,
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

  // Pre-populate clouds for idle state
  useEffect(() => {
    stateRef.current.clouds = Array.from({ length: 5 }, (_, i) => ({
      x: i * 100 + Math.random() * 60,
      y: 40 + Math.random() * 80,
      w: 60 + Math.random() * 60,
    }));
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
      coins: [],
      clouds: Array.from({ length: 5 }, (_, i) => ({
        x: i * 100 + 50,
        y: 40 + Math.random() * 80,
        w: 60 + Math.random() * 60,
      })),
      particles: [],
      score: 0,
      frame: 0,
      birdAngle: 0,
      birdWingUp: false,
      newBestTimer: 0,
      newBestShown: false,
    };
    setUiState((s) => ({ ...s, status: "playing", score: 0 }));
  }, []);

  const flap = useCallback(() => {
    const s = stateRef.current;
    if (s.status === "idle" || s.status === "dead") { startGame(); return; }
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

      // Draw clouds (parallax background)
      ctx.shadowBlur = 0;
      for (const cloud of s.clouds) {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.arc(cloud.x + cloud.w * 0.3, cloud.y + 9, 12, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.w * 0.6, cloud.y + 5, 16, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.w * 0.8, cloud.y + 11, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      // Idle animation: bird bobs up/down
      if (s.status === "idle") {
        s.frame++;
        s.birdY = 200 + Math.sin(s.frame * 0.05) * 20;
      }

      if (s.status === "playing") {
        s.frame++;
        s.birdVY += GRAVITY;
        s.birdY += s.birdVY;
        const targetAngle = Math.max(-30, Math.min(90, s.birdVY * 5));
        s.birdAngle += (targetAngle - s.birdAngle) * 0.12;

        // Dynamic speed: ramps up gradually with score, capped at max
        const speed = Math.min(PIPE_SPEED_MAX, PIPE_SPEED_BASE + s.score * 0.12);

        // Spawn pipes
        if (s.frame % PIPE_INTERVAL === 0) {
          const minTop = 60;
          const maxTop = H - GROUND_HEIGHT - PIPE_GAP - 60;
          const topHeight = Math.floor(Math.random() * (maxTop - minTop) + minTop);
          s.pipes.push({ x: W, topHeight, passed: false });
          // 50% chance to spawn a coin in the center of the gap
          if (Math.random() < 0.5) {
            const coinY = topHeight + PIPE_GAP / 2;
            s.coins.push({ x: W + PIPE_WIDTH / 2, y: coinY, collected: false });
          }
        }

        // Move pipes
        s.pipes = s.pipes.filter((p) => p.x + PIPE_WIDTH > -10);
        for (const pipe of s.pipes) {
          pipe.x -= speed;
          // Score
          if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
            pipe.passed = true;
            s.score++;
            audioRef.current?.playScore();
            setUiState((prev) => ({ ...prev, score: s.score }));
          }
        }

        // Move clouds (parallax — slower than pipes)
        for (const cloud of s.clouds) {
          cloud.x -= speed * 0.3;
          if (cloud.x + cloud.w < 0) {
            cloud.x = W + cloud.w;
            cloud.y = 40 + Math.random() * 80;
          }
        }

        // Toggle wing animation every 8 frames
        if (s.frame % 8 === 0) s.birdWingUp = !s.birdWingUp;

        // Move coins
        s.coins = s.coins.filter((c) => c.x > -20);
        for (const coin of s.coins) {
          coin.x -= speed;
        }

        // Coin collection
        for (const coin of s.coins) {
          if (
            !coin.collected &&
            Math.abs(coin.x - BIRD_X) < 16 &&
            Math.abs(coin.y - s.birdY) < 16
          ) {
            coin.collected = true;
            s.score++;
            audioRef.current?.playScore();
            setUiState((prev) => ({ ...prev, score: s.score }));
          }
        }
        s.coins = s.coins.filter((c) => !c.collected);

        // New best detection (read from localStorage to avoid stale closure)
        const currentBest = getHighScore(GAME_KEY);
        if (!s.newBestShown && s.score > currentBest && currentBest > 0) {
          s.newBestShown = true;
          s.newBestTimer = 90;
        }
        if (s.newBestTimer > 0) s.newBestTimer--;

        // Collision: ground/ceiling
        if (s.birdY + BIRD_SIZE / 2 > H - GROUND_HEIGHT || s.birdY - BIRD_SIZE / 2 < 0) {
          s.status = "dead";
          spawnParticles(BIRD_X, s.birdY);
          audioRef.current?.playDie();
          const hs = getHighScore(GAME_KEY);
          if (s.score > hs) setHighScore(GAME_KEY, s.score);
          setUiState({ status: "dead", score: s.score, highScore: Math.max(s.score, hs) });
          rafRef.current = requestAnimationFrame(draw);
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
              rafRef.current = requestAnimationFrame(draw);
              return;
            }
          }
        }
      }

      // Draw pipes with 3D shading
      for (const pipe of s.pipes) {
        const px = pipe.x;
        const PW = PIPE_WIDTH;
        const topH = pipe.topHeight;
        const botY = topH + PIPE_GAP;
        const botH = H - GROUND_HEIGHT - botY;

        // --- Pipe body ---
        ctx.fillStyle = obstTheme.color;
        ctx.fillRect(px, 0, PW, topH);
        ctx.fillRect(px, botY, PW, botH);

        // Left highlight (light hitting left face)
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(px, 0, 9, topH);
        ctx.fillRect(px, botY, 9, botH);

        // Right shadow
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.fillRect(px + PW - 9, 0, 9, topH);
        ctx.fillRect(px + PW - 9, botY, 9, botH);

        // Center gloss strip (subtle)
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(px + 10, 0, 8, topH);
        ctx.fillRect(px + 10, botY, 8, botH);

        // --- Caps ---
        ctx.fillStyle = obstTheme.capColor;
        ctx.fillRect(px - 4, topH - 14, PW + 8, 14);
        ctx.fillRect(px - 4, botY, PW + 8, 14);

        // Cap top edge highlight
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(px - 4, topH - 14, PW + 8, 3);
        ctx.fillRect(px - 4, botY, PW + 8, 3);

        // Cap left highlight
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(px - 4, topH - 14, 11, 14);
        ctx.fillRect(px - 4, botY, 11, 14);

        // Cap right shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(px + PW - 3, topH - 14, 11, 14);
        ctx.fillRect(px + PW - 3, botY, 11, 14);

        // Cap bottom edge (thickness / underside)
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(px - 4, topH - 3, PW + 8, 3);
        ctx.fillRect(px - 4, botY + 11, PW + 8, 3);

        // Inner mouth shadow (dark inside the pipe opening)
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(px, topH - 14, 5, 14);   // top pipe left inner
        ctx.fillRect(px, botY, 5, 14);         // bottom pipe left inner
      }

      // Draw coins
      for (const coin of s.coins) {
        const bobY = coin.y + Math.sin(s.frame * 0.1 + coin.x * 0.01) * 4;
        ctx.fillStyle = "#ffe600";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ffe600";
        ctx.beginPath();
        ctx.arc(coin.x, bobY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#b8860b";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("$", coin.x, bobY + 3);
        ctx.shadowBlur = 0;
      }
      ctx.textAlign = "left";

      // New best flash
      if (s.newBestTimer > 0) {
        const alpha = Math.min(1, s.newBestTimer / 30);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffe600";
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ffe600";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText("★ NEW BEST!", W / 2, 72);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.textAlign = "left";
      }

      // Draw bird with wing animation
      ctx.save();
      ctx.translate(BIRD_X, s.birdY);
      ctx.rotate((s.birdAngle * Math.PI) / 180);
      if (s.status !== "dead") {
        const wingUp = s.birdWingUp && s.status === "playing";

        // Glow base (drawn first, behind everything)
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ffe600";
        ctx.fillStyle = "#ffe600";
        ctx.fillRect(-10, -9, 20, 18);
        ctx.shadowBlur = 0;

        // Tail feathers (behind body)
        ctx.fillStyle = "#e08c1a";
        ctx.fillRect(-17, -5, 6, 3);   // upper tail feather
        ctx.fillRect(-17,  2, 6, 3);   // lower tail feather
        ctx.fillStyle = "#f5a623";
        ctx.fillRect(-14, -2, 6, 4);   // center tail feather

        // Wing
        ctx.fillStyle = "#f5a623";
        if (wingUp) {
          ctx.fillRect(-7, -18, 14, 10); // wing up
          ctx.fillStyle = "#e08c1a";
          ctx.fillRect(-5, -22, 10,  5); // wing tip
        } else {
          ctx.fillRect(-7,   8, 14, 10); // wing down
          ctx.fillStyle = "#e08c1a";
          ctx.fillRect(-5,  15, 10,  5); // wing tip
        }

        // Body
        ctx.fillStyle = "#ffe600";
        ctx.fillRect(-10, -9, 20, 18);

        // Belly (lighter patch)
        ctx.fillStyle = "#fff8a0";
        ctx.fillRect(-3, 1, 9, 7);

        // Eye — sclera
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(2, -7, 7, 7);
        // Eye — pupil
        ctx.fillStyle = "#111111";
        ctx.fillRect(4, -5, 4, 4);
        // Eye — shine
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(4, -5, 2, 2);

        // Rosy cheek
        ctx.fillStyle = "rgba(255,100,100,0.4)";
        ctx.fillRect(2, -1, 5, 3);

        // Beak (open when wing is up, closed otherwise)
        ctx.fillStyle = "#f97316";
        if (wingUp) {
          ctx.fillRect(9, -4, 9, 4);   // upper beak
          ctx.fillRect(9,  1, 9, 3);   // lower beak
          ctx.fillStyle = "#7a2e00";
          ctx.fillRect(9,  0, 9, 1);   // mouth gap
        } else {
          ctx.fillRect(9, -2, 9, 5);   // closed beak
          ctx.fillStyle = "#cc5500";
          ctx.fillRect(9,  0, 9, 1);   // beak crease
        }
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
