"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import PixelButton from "@/components/PixelButton";
import {
  POWER_UPS, WAVE_PATTERNS, COLS, ROWS, ALIEN_SIZE, ALIEN_GAP,
  BULLET_SPEED, ALIEN_BULLET_SPEED, SHIP_SPEED, ALIEN_SHOOT_INTERVAL, LIVES, BOSS_EVERY_N_WAVES,
} from "@/games/space/config";
import type { PowerUpType, WavePattern } from "@/games/space/config";
import { getHighScore, setHighScore } from "@/lib/scores";

const GAME_KEY = "space";
const W = 480;
const H = 540;
const SHIP_Y = H - 60;
const SHIP_W = 36;
const SHIP_H = 28;

type GameStatus = "idle" | "playing" | "dead" | "bossWave";

interface Alien {
  col: number; row: number;
  x: number; y: number;
  alive: boolean;
  emoji: string;
}

interface Bullet { x: number; y: number; }
interface AlienBullet { x: number; y: number; }
interface DroppedPowerUp { x: number; y: number; type: PowerUpType; }
interface Boss { x: number; y: number; hp: number; maxHp: number; vx: number; phase: number; }

export default function SpacePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [highScore, setHS] = useState(0);
  const [uiStatus, setUiStatus] = useState<GameStatus>("idle");
  const [uiScore, setUiScore] = useState(0);
  const [uiLives, setUiLives] = useState(LIVES);
  const [uiWave, setUiWave] = useState(1);
  const [activePowerUpLabel, setActivePowerUpLabel] = useState<string | null>(null);
  const rafRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const gameRef = useRef({
    status: "idle" as GameStatus,
    shipX: W / 2 - SHIP_W / 2,
    aliens: [] as Alien[],
    bullets: [] as Bullet[],
    alienBullets: [] as AlienBullet[],
    droppedPowerUps: [] as DroppedPowerUp[],
    boss: null as Boss | null,
    score: 0,
    lives: LIVES,
    wave: 1,
    frame: 0,
    alienDx: 1,
    alienMoveTimer: 0,
    alienMoveInterval: 40, // frames between moves
    alienShootTimer: 0,
    activeShield: false,
    shieldEndsAt: 0,
    activeTriple: false,
    tripleEndsAt: 0,
    pattern: "march" as WavePattern,
    zigzagAngle: 0,
  });

  useEffect(() => { setHS(getHighScore(GAME_KEY)); }, []);

  function spawnAliens(wave: number) {
    const g = gameRef.current;
    const emojis = ["👾", "👽", "🛸", "🤖", "👻"];
    const emoji = emojis[(wave - 1) % emojis.length];
    const startX = (W - (COLS * (ALIEN_SIZE + ALIEN_GAP))) / 2;
    g.aliens = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        g.aliens.push({
          col: c, row: r,
          x: startX + c * (ALIEN_SIZE + ALIEN_GAP),
          y: 80 + r * (ALIEN_SIZE + ALIEN_GAP),
          alive: true,
          emoji,
        });
      }
    }
    g.alienMoveInterval = Math.max(12, 40 - wave * 2);
    g.pattern = WAVE_PATTERNS[(wave - 1) % WAVE_PATTERNS.length];
    g.alienDx = 1;
    g.zigzagAngle = 0;
  }

  function spawnBoss(wave: number): Boss {
    return {
      x: W / 2 - 40,
      y: 60,
      hp: 20 + wave * 5,
      maxHp: 20 + wave * 5,
      vx: 2 + wave * 0.3,
      phase: 1,
    };
  }

  const startGame = useCallback(() => {
    const g = gameRef.current;
    g.status = "playing";
    g.shipX = W / 2 - SHIP_W / 2;
    g.bullets = [];
    g.alienBullets = [];
    g.droppedPowerUps = [];
    g.boss = null;
    g.score = 0;
    g.lives = LIVES;
    g.wave = 1;
    g.frame = 0;
    g.alienShootTimer = 0;
    g.activeShield = false;
    g.activeTriple = false;
    spawnAliens(1);
    setUiStatus("playing");
    setUiScore(0);
    setUiLives(LIVES);
    setUiWave(1);
    setActivePowerUpLabel(null);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function draw() {
      const g = gameRef.current;
      if (g.status !== "playing") {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      g.frame++;
      const now = Date.now();

      // Input: move ship
      if (keysRef.current.has("ArrowLeft") || keysRef.current.has("a")) g.shipX = Math.max(0, g.shipX - SHIP_SPEED);
      if (keysRef.current.has("ArrowRight") || keysRef.current.has("d")) g.shipX = Math.min(W - SHIP_W, g.shipX + SHIP_SPEED);

      // Expire power-ups
      if (g.activeShield && now > g.shieldEndsAt) { g.activeShield = false; setActivePowerUpLabel(null); }
      if (g.activeTriple && now > g.tripleEndsAt) { g.activeTriple = false; setActivePowerUpLabel(null); }

      // Move bullets
      g.bullets = g.bullets.filter((b) => b.y > -10);
      g.bullets.forEach((b) => { b.y -= BULLET_SPEED; });

      // Move alien bullets
      g.alienBullets = g.alienBullets.filter((b) => b.y < H + 10);
      g.alienBullets.forEach((b) => { b.y += ALIEN_BULLET_SPEED; });

      // Move dropped power-ups
      g.droppedPowerUps = g.droppedPowerUps.filter((p) => p.y < H + 20);
      g.droppedPowerUps.forEach((p) => { p.y += 2; });

      // Alien movement
      g.alienMoveTimer++;
      const liveAliens = g.aliens.filter((a) => a.alive);
      if (g.alienMoveTimer >= g.alienMoveInterval && liveAliens.length > 0) {
        g.alienMoveTimer = 0;

        if (g.pattern === "march") {
          const rightmost = Math.max(...liveAliens.map((a) => a.x));
          const leftmost = Math.min(...liveAliens.map((a) => a.x));
          if (rightmost + ALIEN_SIZE >= W - 10 || leftmost <= 10) {
            g.alienDx *= -1;
            g.aliens.forEach((a) => { if (a.alive) a.y += 16; });
          }
          g.aliens.forEach((a) => { if (a.alive) a.x += g.alienDx * 12; });
        } else if (g.pattern === "zigzag") {
          g.zigzagAngle += 0.15;
          g.aliens.forEach((a) => {
            if (a.alive) {
              a.x += Math.sin(g.zigzagAngle + a.row * 0.5) * 8;
              a.y += 0.3;
            }
          });
        } else if (g.pattern === "dive") {
          const frontRow = Math.max(...liveAliens.map((a) => a.row));
          g.aliens.forEach((a) => {
            if (a.alive) {
              if (a.row === frontRow) a.y += 4;
              else a.y += 0.5;
            }
          });
        }
      }

      // Boss movement
      if (g.boss) {
        g.boss.x += g.boss.vx;
        if (g.boss.x <= 0 || g.boss.x + 80 >= W) g.boss.vx *= -1;
        // Boss shoots
        if (g.frame % 30 === 0) {
          const phase = g.boss.hp / g.boss.maxHp;
          const shots = phase < 0.3 ? 3 : phase < 0.6 ? 2 : 1;
          for (let i = 0; i < shots; i++) {
            g.alienBullets.push({ x: g.boss.x + 40 + (i - 1) * 20, y: g.boss.y + 50 });
          }
        }
        // Boss phase update
        const hpRatio = g.boss.hp / g.boss.maxHp;
        g.boss.phase = hpRatio < 0.3 ? 3 : hpRatio < 0.6 ? 2 : 1;
      }

      // Alien shooting
      g.alienShootTimer++;
      if (g.alienShootTimer >= ALIEN_SHOOT_INTERVAL && liveAliens.length > 0) {
        g.alienShootTimer = 0;
        const cols = [...new Set(liveAliens.map((a) => a.col))];
        const shooterCol = cols[Math.floor(Math.random() * cols.length)];
        const colAliens = liveAliens.filter((a) => a.col === shooterCol);
        const shooter = colAliens.reduce((a, b) => a.row > b.row ? a : b);
        g.alienBullets.push({ x: shooter.x + ALIEN_SIZE / 2, y: shooter.y + ALIEN_SIZE });
      }

      // Bullet-alien collision
      for (const bullet of g.bullets) {
        for (const alien of liveAliens) {
          if (
            bullet.x > alien.x && bullet.x < alien.x + ALIEN_SIZE &&
            bullet.y > alien.y && bullet.y < alien.y + ALIEN_SIZE
          ) {
            alien.alive = false;
            bullet.y = -999;
            g.score += 10 + g.wave * 2;
            setUiScore(g.score);
            // Drop power-up
            const roll = Math.random();
            let cumulative = 0;
            for (const def of POWER_UPS) {
              cumulative += def.dropChance;
              if (roll < cumulative) {
                g.droppedPowerUps.push({ x: alien.x + ALIEN_SIZE / 2, y: alien.y, type: def.type });
                break;
              }
            }
          }
        }
        // Bullet-boss collision
        if (g.boss) {
          if (bullet.x > g.boss.x && bullet.x < g.boss.x + 80 && bullet.y > g.boss.y && bullet.y < g.boss.y + 50) {
            g.boss.hp -= 1;
            bullet.y = -999;
            g.score += 5;
            setUiScore(g.score);
            if (g.boss.hp <= 0) {
              g.boss = null;
              g.score += 200;
              setUiScore(g.score);
              // Next wave after boss
              g.wave++;
              setUiWave(g.wave);
              spawnAliens(g.wave);
            }
          }
        }
      }

      // Power-up pickup
      for (const pu of g.droppedPowerUps) {
        if (
          pu.x > g.shipX && pu.x < g.shipX + SHIP_W &&
          pu.y > SHIP_Y && pu.y < SHIP_Y + SHIP_H
        ) {
          pu.y = H + 100; // remove
          const def = POWER_UPS.find((p) => p.type === pu.type)!;
          if (pu.type === "bomb") {
            g.aliens.forEach((a) => { if (a.alive) { a.alive = false; g.score += 10; } });
            g.boss = null;
            setUiScore(g.score);
          } else if (pu.type === "shield") {
            g.activeShield = true;
            g.shieldEndsAt = now + (def.duration ?? 0);
            setActivePowerUpLabel("🛡️ SHIELD");
          } else if (pu.type === "tripleShot") {
            g.activeTriple = true;
            g.tripleEndsAt = now + (def.duration ?? 0);
            setActivePowerUpLabel("🔫 TRIPLE SHOT");
          }
        }
      }

      // Alien bullet-ship collision
      for (const b of g.alienBullets) {
        if (
          b.x > g.shipX + 4 && b.x < g.shipX + SHIP_W - 4 &&
          b.y > SHIP_Y + 4 && b.y < SHIP_Y + SHIP_H
        ) {
          b.y = H + 100;
          if (!g.activeShield) {
            g.lives--;
            g.activeShield = false;
            setUiLives(g.lives);
            if (g.lives <= 0) {
              g.status = "dead";
              const hs = getHighScore(GAME_KEY);
              if (g.score > hs) setHighScore(GAME_KEY, g.score);
              setHS(Math.max(g.score, hs));
              setUiStatus("dead");
              return;
            }
          } else {
            g.activeShield = false; // shield absorbs one hit
            setActivePowerUpLabel(null);
          }
        }
      }

      // Alien-ship collision (game over if alien reaches bottom)
      for (const alien of liveAliens) {
        if (alien.y + ALIEN_SIZE > SHIP_Y) {
          g.status = "dead";
          const hs = getHighScore(GAME_KEY);
          if (g.score > hs) setHighScore(GAME_KEY, g.score);
          setHS(Math.max(g.score, hs));
          setUiStatus("dead");
          return;
        }
      }

      // Wave cleared → next wave
      if (liveAliens.length === 0 && !g.boss) {
        if (g.wave % BOSS_EVERY_N_WAVES === 0) {
          g.boss = spawnBoss(g.wave);
        } else {
          g.wave++;
          setUiWave(g.wave);
          spawnAliens(g.wave);
          g.alienMoveInterval = Math.max(10, 40 - g.wave * 2);
        }
      }

      // ── DRAW ──
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      // Stars background
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 73 + g.frame * 0.2) % W);
        const sy = (i * 47) % (H - 60);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Draw aliens
      ctx.font = `${ALIEN_SIZE}px serif`;
      ctx.textBaseline = "top";
      for (const alien of g.aliens) {
        if (alien.alive) ctx.fillText(alien.emoji, alien.x, alien.y);
      }

      // Draw boss
      if (g.boss) {
        const bossColor = g.boss.phase === 3 ? "#ff2d95" : g.boss.phase === 2 ? "#ffe600" : "#a855f7";
        ctx.font = "64px serif";
        ctx.fillText("👾", g.boss.x, g.boss.y);
        // HP bar
        const hpW = 120;
        const hpRatio = g.boss.hp / g.boss.maxHp;
        ctx.fillStyle = "#333";
        ctx.fillRect(W / 2 - hpW / 2, 20, hpW, 8);
        ctx.fillStyle = bossColor;
        ctx.fillRect(W / 2 - hpW / 2, 20, hpW * hpRatio, 8);
        ctx.fillStyle = "#fff";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("BOSS", W / 2, 14);
        ctx.textAlign = "left";
      }

      // Draw player bullets
      ctx.fillStyle = "#39ff14";
      for (const b of g.bullets) {
        ctx.fillRect(b.x - 2, b.y, 4, 12);
        ctx.shadowBlur = 6;
        ctx.shadowColor = "#39ff14";
        ctx.fillRect(b.x - 2, b.y, 4, 12);
        ctx.shadowBlur = 0;
      }

      // Draw alien bullets
      ctx.fillStyle = "#ff2d95";
      for (const b of g.alienBullets) {
        ctx.fillRect(b.x - 2, b.y, 4, 10);
      }

      // Draw power-ups
      ctx.font = "20px serif";
      for (const pu of g.droppedPowerUps) {
        const def = POWER_UPS.find((p) => p.type === pu.type)!;
        ctx.fillText(def.emoji, pu.x - 10, pu.y);
      }

      // Draw ship
      const shipColor = g.activeShield ? "#00d4ff" : "#a855f7";
      ctx.fillStyle = shipColor;
      if (g.activeShield) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#00d4ff";
      }
      // Pixel ship shape
      ctx.fillRect(g.shipX + SHIP_W / 2 - 4, SHIP_Y, 8, SHIP_H);
      ctx.fillRect(g.shipX + 4, SHIP_Y + 10, SHIP_W - 8, SHIP_H - 10);
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.code === "Space") {
        e.preventDefault();
        const g = gameRef.current;
        if (g.status !== "playing") return;
        // Shoot
        const cx = g.shipX + SHIP_W / 2;
        g.bullets.push({ x: cx, y: SHIP_Y });
        if (g.activeTriple) {
          g.bullets.push({ x: cx - 14, y: SHIP_Y + 8 });
          g.bullets.push({ x: cx + 14, y: SHIP_Y + 8 });
        }
      }
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  return (
    <div className="flex flex-col items-center min-h-screen p-4 gap-4">
      <div className="flex items-center justify-between w-full max-w-lg">
        <Link href="/games" className="text-[0.5rem] neon-text-blue hover:opacity-80">← BACK</Link>
        <h1 className="text-[0.6rem] sm:text-xs neon-text neon-text-blue">ASTRO RAID</h1>
        <span className="text-[0.5rem] text-gray-400">BEST: {highScore}</span>
      </div>

      {/* HUD */}
      <div className="flex gap-6 text-[0.5rem] font-pixel text-gray-400">
        <span>SCORE: {uiScore}</span>
        <span>WAVE: {uiWave}</span>
        <span>{"🚀".repeat(uiLives)}</span>
        {activePowerUpLabel && <span className="text-neon-yellow animate-pulse">{activePowerUpLabel}</span>}
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="border border-neon-blue/20 rounded-sm"
          style={{ imageRendering: "pixelated", maxWidth: "100%" }}
        />

        {/* Idle overlay */}
        {uiStatus === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-bg/30 backdrop-blur-sm animate-[overlayIn_0.5s_ease-out]">
            <div className="flex flex-col items-center gap-4 pointer-events-auto">
              <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">👾</div>
              <h2 className="text-sm font-pixel neon-text-blue animate-[victoryGlowBlue_1.5s_ease-in-out_infinite]">ASTRO RAID</h2>
              <p className="text-[0.5rem] font-pixel text-gray-500">← → MOVE · SPACE SHOOT</p>
              <PixelButton color="blue" onClick={startGame}>LAUNCH</PixelButton>
            </div>
          </div>
        )}

        {/* Dead overlay */}
        {uiStatus === "dead" && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-bg/30 backdrop-blur-sm animate-[overlayIn_0.5s_ease-out]">
            <div className="flex flex-col items-center gap-3 pointer-events-auto">
              <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">💥</div>
              <h2 className="text-lg font-pixel neon-text-pink animate-[defeatFlash_1s_ease-in-out_infinite]">SHIP DESTROYED!</h2>
              <p className="text-[0.6rem] font-pixel text-neon-pink/70">SCORE: {uiScore} · BEST: {highScore} · WAVE {uiWave}</p>
              <PixelButton color="pink" onClick={startGame}>TRY AGAIN</PixelButton>
            </div>
          </div>
        )}
      </div>

      <p className="text-[0.45rem] font-pixel text-gray-600">← → MOVE · SPACE SHOOT · BOSS EVERY 5 WAVES</p>
    </div>
  );
}
