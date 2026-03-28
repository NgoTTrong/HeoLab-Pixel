"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import PixelButton from "@/components/PixelButton";
import {
  CHARACTERS, GROUND_HEIGHT, GRAVITY, JUMP_IMPULSE, BASE_SPEED, MAX_SPEED,
  getWorld, getAvailableObstacles,
} from "@/games/runner/config";
import { getHighScore, setHighScore } from "@/lib/scores";

const GAME_KEY = "runner";
const W = 480;
const H = 300;
const CHAR_X = 80;
const CHAR_SIZE = 40;

type GameStatus = "select" | "idle" | "playing" | "dead";

interface ObstacleObj {
  x: number;
  emoji: string;
  width: number;
  height: number;
  isFlying: boolean;
  flyY: number; // y position if flying
}

export default function RunnerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedChar, setSelectedChar] = useState(0);
  const [highScore, setHS] = useState(0);
  const [unlockedChars, setUnlocked] = useState<number[]>([0]);
  const [uiStatus, setUiStatus] = useState<GameStatus>("select");
  const [uiScore, setUiScore] = useState(0);
  const [newUnlock, setNewUnlock] = useState<string | null>(null);

  const gameRef = useRef({
    status: "idle" as GameStatus,
    charY: H - GROUND_HEIGHT - CHAR_SIZE,
    charVY: 0,
    jumpsLeft: 2,
    obstacles: [] as ObstacleObj[],
    score: 0,
    frame: 0,
    speed: BASE_SPEED,
    groundOffset: 0,
  });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const hs = getHighScore(GAME_KEY);
    setHS(hs);
    // Determine unlocked chars
    const unlocked = CHARACTERS.reduce<number[]>((acc, c, i) => {
      if (hs >= c.unlockScore) acc.push(i);
      return acc;
    }, []);
    setUnlocked(unlocked);
  }, []);

  const jump = useCallback(() => {
    const g = gameRef.current;
    if (g.status !== "playing") return;
    if (g.jumpsLeft > 0) {
      g.charVY = JUMP_IMPULSE;
      g.jumpsLeft--;
    }
  }, []);

  const startGame = useCallback(() => {
    const g = gameRef.current;
    g.status = "playing";
    g.charY = H - GROUND_HEIGHT - CHAR_SIZE;
    g.charVY = 0;
    g.jumpsLeft = 2;
    g.obstacles = [];
    g.score = 0;
    g.frame = 0;
    g.speed = BASE_SPEED;
    g.groundOffset = 0;
    setUiStatus("playing");
    setUiScore(0);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const char = CHARACTERS[selectedChar];

    function draw() {
      const g = gameRef.current;
      if (g.status !== "playing") {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      g.frame++;
      const world = getWorld(Math.floor(g.score));
      g.speed = Math.min(MAX_SPEED, BASE_SPEED + g.score / 300);
      g.groundOffset = (g.groundOffset + g.speed) % 40;

      // Physics
      g.charVY += GRAVITY;
      g.charY += g.charVY;
      const groundY = H - GROUND_HEIGHT - CHAR_SIZE;
      if (g.charY >= groundY) {
        g.charY = groundY;
        g.charVY = 0;
        g.jumpsLeft = 2;
      }

      // Spawn obstacles
      const availObs = getAvailableObstacles(Math.floor(g.score));
      const minInterval = Math.max(50, 100 - Math.floor(g.score / 100));
      if (g.frame % minInterval === 0 && availObs.length > 0) {
        const def = availObs[Math.floor(Math.random() * availObs.length)];
        const flyY = def.isFlying
          ? H - GROUND_HEIGHT - def.height - Math.floor(Math.random() * 60 + 20)
          : H - GROUND_HEIGHT - def.height;
        g.obstacles.push({ x: W + 10, emoji: def.emoji, width: def.width, height: def.height, isFlying: def.isFlying, flyY });
      }

      // Move obstacles + score
      g.obstacles = g.obstacles.filter((o) => o.x + o.width > -20);
      for (const o of g.obstacles) { o.x -= g.speed; }
      g.score += 0.1 * world.multiplier;
      setUiScore(Math.floor(g.score));

      // Collision
      for (const o of g.obstacles) {
        const oY = o.flyY;
        if (
          CHAR_X + CHAR_SIZE - 8 > o.x + 4 &&
          CHAR_X + 8 < o.x + o.width - 4 &&
          g.charY + CHAR_SIZE - 8 > oY + 4 &&
          g.charY + 8 < oY + o.height - 4
        ) {
          g.status = "dead";
          const hs = getHighScore(GAME_KEY);
          const finalScore = Math.floor(g.score);
          if (finalScore > hs) setHighScore(GAME_KEY, finalScore);
          // Check new character unlocks
          const newChars = CHARACTERS.filter((c, i) => finalScore >= c.unlockScore && !unlockedChars.includes(i));
          if (newChars.length > 0) setNewUnlock(newChars[0].label);
          setHS(Math.max(finalScore, hs));
          setUiStatus("dead");
          return;
        }
      }

      // Draw sky
      ctx.fillStyle = world.skyColor;
      ctx.fillRect(0, 0, W, H - GROUND_HEIGHT);

      // Draw ground (animated)
      ctx.fillStyle = world.groundColor;
      ctx.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, H - GROUND_HEIGHT, W, 3);

      // Ground detail lines
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      for (let x = -g.groundOffset; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, H - GROUND_HEIGHT + 8);
        ctx.lineTo(x + 20, H - GROUND_HEIGHT + 8);
        ctx.stroke();
      }

      // Draw obstacles (emoji)
      ctx.textBaseline = "top";
      for (const o of g.obstacles) {
        ctx.font = `${o.height}px serif`;
        ctx.fillText(o.emoji, o.x, o.flyY);
      }

      // Draw character (emoji)
      ctx.font = `${CHAR_SIZE}px serif`;
      ctx.fillText(char.emoji, CHAR_X - CHAR_SIZE / 2, g.charY);

      // Score + world label
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "right";
      ctx.fillText(String(Math.floor(g.score)), W - 12, 12);
      ctx.textAlign = "left";
      ctx.font = "10px monospace";
      ctx.fillStyle = char.color;
      ctx.fillText(world.label, 12, 12);
      if (world.multiplier > 1) {
        ctx.fillStyle = "#ffe600";
        ctx.fillText(`×${world.multiplier.toFixed(1)}`, 12, 26);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [selectedChar, unlockedChars]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.code === "Space" || e.key === "ArrowUp") && uiStatus === "playing") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [jump, uiStatus]);

  const char = CHARACTERS[selectedChar];

  return (
    <div className="flex flex-col items-center min-h-screen p-4 gap-4">
      <div className="flex items-center justify-between w-full max-w-lg">
        <Link href="/games" className="text-[0.5rem] neon-text-green hover:opacity-80">← BACK</Link>
        <h1 className="text-[0.6rem] sm:text-xs neon-text neon-text-green">PIXEL DASH</h1>
        <span className="text-[0.5rem] text-gray-400">BEST: {highScore}</span>
      </div>

      {/* Character select */}
      {uiStatus === "select" && (
        <div className="flex flex-col items-center gap-6 py-8">
          <h2 className="font-pixel text-[0.6rem] text-neon-green">SELECT RUNNER</h2>
          <div className="flex gap-4">
            {CHARACTERS.map((c, i) => {
              const unlocked = unlockedChars.includes(i);
              return (
                <button
                  key={c.id}
                  onClick={() => unlocked && setSelectedChar(i)}
                  className={`flex flex-col items-center gap-2 p-4 border transition-all ${
                    selectedChar === i ? "border-neon-green bg-neon-green/10" : "border-gray-700"
                  } ${!unlocked ? "opacity-40 cursor-not-allowed" : "hover:border-gray-500"}`}
                >
                  <span className="text-4xl">{c.emoji}</span>
                  <span className="font-pixel text-[0.4rem]" style={{ color: c.color }}>{c.label}</span>
                  {!unlocked && (
                    <span className="font-pixel text-[0.35rem] text-gray-600">UNLOCK {c.unlockScore}</span>
                  )}
                </button>
              );
            })}
          </div>
          <PixelButton color="green" onClick={() => { setUiStatus("idle"); startGame(); }}>
            RUN!
          </PixelButton>
        </div>
      )}

      {/* Canvas */}
      {uiStatus !== "select" && (
        <div
          className="relative cursor-pointer"
          onClick={jump}
          onTouchStart={(e) => { e.preventDefault(); jump(); }}
        >
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="border border-neon-green/20 rounded-sm"
            style={{ imageRendering: "pixelated", touchAction: "none", maxWidth: "100%" }}
          />

          {/* Dead overlay */}
          {uiStatus === "dead" && (
            <div className="absolute inset-0 flex items-center justify-center bg-dark-bg/30 backdrop-blur-sm animate-[overlayIn_0.5s_ease-out]">
              <div className="flex flex-col items-center gap-3 pointer-events-auto">
                <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">💥</div>
                <h2 className="text-lg font-pixel neon-text-pink animate-[defeatFlash_1s_ease-in-out_infinite]">WIPED OUT!</h2>
                {newUnlock && (
                  <p className="font-pixel text-[0.5rem] text-neon-yellow animate-pulse">🔓 {newUnlock} UNLOCKED!</p>
                )}
                <p className="text-[0.6rem] font-pixel text-neon-pink/70">SCORE: {uiScore} · BEST: {highScore}</p>
                <div className="flex gap-3">
                  <PixelButton color="pink" onClick={() => { setNewUnlock(null); startGame(); }}>TRY AGAIN</PixelButton>
                  <PixelButton color="green" onClick={() => { setNewUnlock(null); setUiStatus("select"); }}>CHANGE</PixelButton>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {uiStatus === "playing" && (
        <p className="text-[0.45rem] font-pixel text-gray-600">TAP / SPACE / ↑ TO JUMP · DOUBLE JUMP AVAILABLE</p>
      )}
    </div>
  );
}
