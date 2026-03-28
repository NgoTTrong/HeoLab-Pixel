"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import PixelButton from "@/components/PixelButton";
import {
  POWER_UPS, WAVE_PATTERNS, COLS, ROWS, ALIEN_SIZE, ALIEN_GAP,
  BULLET_SPEED, ALIEN_BULLET_SPEED, SHIP_SPEED, ALIEN_SHOOT_INTERVAL,
  LIVES, BOSS_EVERY_N_WAVES, SHOOT_COOLDOWN, RAPID_SHOOT_COOLDOWN,
} from "@/games/space/config";
import type { PowerUpType, WavePattern } from "@/games/space/config";
import { getHighScore, setHighScore } from "@/lib/scores";
import { createSpaceAudio } from "@/games/space/audio";
import type { SpaceAudio } from "@/games/space/audio";

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
  hp: number;
  maxHp: number;   // >1 = tank alien
}

interface Bullet { x: number; y: number; }
interface AlienBullet { x: number; y: number; }
interface DroppedPowerUp { x: number; y: number; type: PowerUpType; }
interface Boss { x: number; y: number; hp: number; maxHp: number; vx: number; phase: number; }

// Per-wave alien roster — different emoji sets as waves progress
const WAVE_ALIENS = [
  ["👾", "👽"],        // wave 1–2
  ["🛸", "👾"],        // wave 3–4
  ["🤖", "👽"],        // wave 5–6
  ["👻", "🤖"],        // wave 7–8
  ["💀", "👾"],        // wave 9+
];

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
  const audioRef = useRef<SpaceAudio | null>(null);
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("space-sound-muted") === "1";
  });

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
    alienMoveInterval: 40,
    alienShootTimer: 0,
    // Power-ups
    activeShield: false,
    shieldEndsAt: 0,
    activeTriple: false,
    tripleEndsAt: 0,
    activeRapid: false,
    rapidEndsAt: 0,
    // Shoot cooldown (hold-space fix)
    shootCooldown: 0,
    // Wave pattern
    pattern: "march" as WavePattern,
    zigzagAngle: 0,
    // Ship tilt (-1 left, 0 none, 1 right)
    shipTilt: 0,
    // Muzzle flash frames
    muzzleFlash: 0,
    // Combo
    combo: 0,
    comboMultiplier: 1,
    comboDisplayTimer: 0,
    prevMultiplier: 1,
  });

  useEffect(() => { setHS(getHighScore(GAME_KEY)); }, []);

  useEffect(() => {
    const init = () => {
      if (!audioRef.current) {
        audioRef.current = createSpaceAudio();
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
    localStorage.setItem("space-sound-muted", muted ? "1" : "0");
  }, [muted]);

  function spawnAliens(wave: number) {
    const g = gameRef.current;
    const roster = WAVE_ALIENS[Math.min(Math.floor((wave - 1) / 2), WAVE_ALIENS.length - 1)];
    const startX = (W - (COLS * (ALIEN_SIZE + ALIEN_GAP))) / 2;
    g.aliens = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // Top row becomes tanks after wave 3
        const isTank = wave >= 3 && r === 0;
        const emoji = isTank ? "💀" : roster[r % roster.length];
        g.aliens.push({
          col: c, row: r,
          x: startX + c * (ALIEN_SIZE + ALIEN_GAP),
          y: 80 + r * (ALIEN_SIZE + ALIEN_GAP),
          alive: true,
          emoji,
          hp: isTank ? 2 : 1,
          maxHp: isTank ? 2 : 1,
        });
      }
    }
    g.alienMoveInterval = Math.max(12, 40 - wave * 2);
    g.pattern = WAVE_PATTERNS[(wave - 1) % WAVE_PATTERNS.length];
    g.alienDx = 1;
    g.zigzagAngle = 0;
  }

  function spawnBoss(wave: number): Boss {
    return { x: W / 2 - 40, y: 60, hp: 20 + wave * 5, maxHp: 20 + wave * 5, vx: 2 + wave * 0.3, phase: 1 };
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
    g.shootCooldown = 0;
    g.activeShield = false;
    g.activeTriple = false;
    g.activeRapid = false;
    g.muzzleFlash = 0;
    g.combo = 0;
    g.comboMultiplier = 1;
    g.comboDisplayTimer = 0;
    g.prevMultiplier = 1;
    g.alienMoveTimer = 0;
    g.shipTilt = 0;
    keysRef.current.clear(); // release any held keys from previous game
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
      if (document.hidden || g.status !== "playing") {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      g.frame++;
      const now = Date.now();

      // ── INPUT ──────────────────────────────────────────
      const movingLeft  = keysRef.current.has("ArrowLeft")  || keysRef.current.has("a");
      const movingRight = keysRef.current.has("ArrowRight") || keysRef.current.has("d");
      if (movingLeft)  { g.shipX = Math.max(0, g.shipX - SHIP_SPEED); g.shipTilt = -1; }
      if (movingRight) { g.shipX = Math.min(W - SHIP_W, g.shipX + SHIP_SPEED); g.shipTilt = 1; }
      if (!movingLeft && !movingRight) g.shipTilt = 0;

      // Hold-space shooting with cooldown (no more inconsistent browser repeat)
      if (g.shootCooldown > 0) g.shootCooldown--;
      if (keysRef.current.has(" ") && g.shootCooldown === 0) {
        const cx = g.shipX + SHIP_W / 2;
        g.bullets.push({ x: cx, y: SHIP_Y - 4 });
        audioRef.current?.playShoot();
        if (g.activeTriple) {
          g.bullets.push({ x: cx - 14, y: SHIP_Y + 4 });
          g.bullets.push({ x: cx + 14, y: SHIP_Y + 4 });
        }
        g.shootCooldown = g.activeRapid ? RAPID_SHOOT_COOLDOWN : SHOOT_COOLDOWN;
        g.muzzleFlash = 4; // frames to show muzzle flash
      }
      if (g.muzzleFlash > 0) g.muzzleFlash--;
      if (g.comboDisplayTimer > 0) g.comboDisplayTimer--;

      // ── EXPIRE POWER-UPS ───────────────────────────────
      if (g.activeShield && now > g.shieldEndsAt) { g.activeShield = false; setActivePowerUpLabel(g.activeRapid ? "⚡ RAPID FIRE" : null); }
      if (g.activeTriple && now > g.tripleEndsAt) { g.activeTriple = false; setActivePowerUpLabel(g.activeShield ? "🛡️ SHIELD" : g.activeRapid ? "⚡ RAPID FIRE" : null); }
      if (g.activeRapid  && now > g.rapidEndsAt)  { g.activeRapid  = false; setActivePowerUpLabel(g.activeShield ? "🛡️ SHIELD" : g.activeTriple ? "🔱 TRIPLE SHOT" : null); }

      // ── MOVE BULLETS ───────────────────────────────────
      g.bullets = g.bullets.filter((b) => b.y > -10);
      g.bullets.forEach((b) => { b.y -= BULLET_SPEED; });
      g.alienBullets = g.alienBullets.filter((b) => b.y < H + 10);
      g.alienBullets.forEach((b) => { b.y += ALIEN_BULLET_SPEED; });
      g.droppedPowerUps = g.droppedPowerUps.filter((p) => p.y < H + 20);
      g.droppedPowerUps.forEach((p) => { p.y += 1.5; });

      // ── ALIEN MOVEMENT ─────────────────────────────────
      g.alienMoveTimer++;
      const liveAliens = g.aliens.filter((a) => a.alive);
      if (g.alienMoveTimer >= g.alienMoveInterval && liveAliens.length > 0) {
        g.alienMoveTimer = 0;
        if (g.pattern === "march") {
          const rightmost = Math.max(...liveAliens.map((a) => a.x));
          const leftmost  = Math.min(...liveAliens.map((a) => a.x));
          if (rightmost + ALIEN_SIZE >= W - 10 || leftmost <= 10) {
            g.alienDx *= -1;
            g.aliens.forEach((a) => { if (a.alive) a.y += 14; });
          }
          g.aliens.forEach((a) => { if (a.alive) a.x += g.alienDx * 12; });
        } else if (g.pattern === "zigzag") {
          g.zigzagAngle += 0.15;
          g.aliens.forEach((a) => {
            if (a.alive) { a.x += Math.sin(g.zigzagAngle + a.row * 0.5) * 8; a.y += 0.3; }
          });
        } else if (g.pattern === "dive") {
          const frontRow = Math.max(...liveAliens.map((a) => a.row));
          g.aliens.forEach((a) => {
            if (a.alive) { a.y += a.row === frontRow ? 4 : 0.5; }
          });
        }
      }

      // ── BOSS MOVEMENT ──────────────────────────────────
      if (g.boss) {
        g.boss.x += g.boss.vx;
        if (g.boss.x <= 0 || g.boss.x + 80 >= W) g.boss.vx *= -1;
        if (g.frame % 28 === 0) {
          const phase = g.boss.hp / g.boss.maxHp;
          const shots = phase < 0.3 ? 4 : phase < 0.6 ? 3 : 2;
          for (let i = 0; i < shots; i++) {
            const spread = shots > 2 ? (i - (shots - 1) / 2) * 16 : (i - 0.5) * 20;
            g.alienBullets.push({ x: g.boss.x + 40 + spread, y: g.boss.y + 50 });
          }
        }
        const hpRatio = g.boss.hp / g.boss.maxHp;
        g.boss.phase = hpRatio < 0.3 ? 3 : hpRatio < 0.6 ? 2 : 1;
      }

      // ── ALIEN SHOOTING ─────────────────────────────────
      g.alienShootTimer++;
      if (g.alienShootTimer >= ALIEN_SHOOT_INTERVAL && liveAliens.length > 0) {
        g.alienShootTimer = 0;
        const cols = [...new Set(liveAliens.map((a) => a.col))];
        const shooterCol = cols[Math.floor(Math.random() * cols.length)];
        const colAliens = liveAliens.filter((a) => a.col === shooterCol);
        const shooter = colAliens.reduce((a, b) => (a.row > b.row ? a : b));
        g.alienBullets.push({ x: shooter.x + ALIEN_SIZE / 2, y: shooter.y + ALIEN_SIZE });
      }

      // ── BULLET-ALIEN COLLISION ─────────────────────────
      for (const bullet of g.bullets) {
        for (const alien of liveAliens) {
          if (
            bullet.x > alien.x && bullet.x < alien.x + ALIEN_SIZE &&
            bullet.y > alien.y && bullet.y < alien.y + ALIEN_SIZE
          ) {
            alien.hp--;
            bullet.y = -999;
            if (alien.hp <= 0) {
              alien.alive = false;
              // Combo
              g.combo++;
              g.prevMultiplier = g.comboMultiplier;
              g.comboMultiplier = g.combo >= 20 ? 4 : g.combo >= 10 ? 3 : g.combo >= 5 ? 2 : 1;
              g.comboDisplayTimer = 90;
              if (g.comboMultiplier > g.prevMultiplier) audioRef.current?.playComboUp();
              const baseScore = alien.maxHp > 1 ? 25 : 10;
              g.score += (baseScore + g.wave * 2) * g.comboMultiplier;
              setUiScore(g.score);
              audioRef.current?.playExplosion();
              // Drop power-up
              const roll = Math.random();
              let cum = 0;
              for (const def of POWER_UPS) {
                cum += def.dropChance;
                if (roll < cum) {
                  g.droppedPowerUps.push({ x: alien.x + ALIEN_SIZE / 2, y: alien.y, type: def.type });
                  break;
                }
              }
            } else {
              // Tank hit — small score for each hit
              g.score += 5 * g.comboMultiplier;
              setUiScore(g.score);
            }
          }
        }
        // Bullet-boss
        if (g.boss) {
          if (bullet.x > g.boss.x && bullet.x < g.boss.x + 80 && bullet.y > g.boss.y && bullet.y < g.boss.y + 50) {
            g.boss.hp -= 1;
            bullet.y = -999;
            g.score += 5 * g.comboMultiplier;
            setUiScore(g.score);
            if (g.boss.hp <= 0) {
              audioRef.current?.playBossDie();
              g.boss = null;
              g.score += 300 + g.wave * 20;
              setUiScore(g.score);
              g.combo = 0;
              g.comboMultiplier = 1;
              g.comboDisplayTimer = 0;
              g.wave++;
              setUiWave(g.wave);
              spawnAliens(g.wave);
            }
          }
        }
      }

      // ── POWER-UP PICKUP ────────────────────────────────
      for (const pu of g.droppedPowerUps) {
        if (pu.x > g.shipX && pu.x < g.shipX + SHIP_W && pu.y > SHIP_Y && pu.y < SHIP_Y + SHIP_H) {
          pu.y = H + 100;
          const def = POWER_UPS.find((p) => p.type === pu.type)!;
          if (pu.type === "bomb") {
            g.aliens.forEach((a) => { if (a.alive) { a.alive = false; g.score += 10; } });
            const hadBoss = !!g.boss;
            g.boss = null;
            if (hadBoss) g.score += 200; // bonus for bombing the boss
            setUiScore(g.score);
            // Advance wave immediately so wave-clear doesn't re-spawn the boss
            g.wave++;
            setUiWave(g.wave);
            spawnAliens(g.wave);
            setActivePowerUpLabel("💣 SCREEN BOMB!");
            audioRef.current?.playPowerUp();
            setTimeout(() => setActivePowerUpLabel(null), 1500);
          } else if (pu.type === "shield") {
            g.activeShield = true;
            g.shieldEndsAt = now + (def.duration ?? 0);
            setActivePowerUpLabel("🛡️ SHIELD");
            audioRef.current?.playPowerUp();
          } else if (pu.type === "tripleShot") {
            g.activeTriple = true;
            g.tripleEndsAt = now + (def.duration ?? 0);
            setActivePowerUpLabel("🔱 TRIPLE SHOT");
            audioRef.current?.playPowerUp();
          } else if (pu.type === "rapidFire") {
            g.activeRapid = true;
            g.rapidEndsAt = now + (def.duration ?? 0);
            g.shootCooldown = 0; // immediate
            setActivePowerUpLabel("⚡ RAPID FIRE");
            audioRef.current?.playPowerUp();
          } else if (pu.type === "extraLife") {
            g.lives = Math.min(g.lives + 1, 5);
            setUiLives(g.lives);
            audioRef.current?.playExtraLife();
            setActivePowerUpLabel("❤️ +1 LIFE!");
            setTimeout(() => setActivePowerUpLabel(null), 1500);
          }
        }
      }

      // ── ALIEN BULLET-SHIP COLLISION ────────────────────
      for (const b of g.alienBullets) {
        if (b.x > g.shipX + 4 && b.x < g.shipX + SHIP_W - 4 && b.y > SHIP_Y + 4 && b.y < SHIP_Y + SHIP_H) {
          b.y = H + 100;
          if (!g.activeShield) {
            g.lives--;
            setUiLives(g.lives);
            g.combo = 0;
            g.comboMultiplier = 1;
            g.comboDisplayTimer = 0;
            audioRef.current?.playHit();
            if (g.lives <= 0) {
              g.status = "dead";
              const hs = getHighScore(GAME_KEY);
              if (g.score > hs) setHighScore(GAME_KEY, g.score);
              setHS(Math.max(g.score, hs));
              setUiStatus("dead");
              // Keep the loop alive so restart works
              rafRef.current = requestAnimationFrame(draw);
              return;
            }
          } else {
            g.activeShield = false;
            setActivePowerUpLabel(null);
          }
        }
      }

      // ── ALIEN REACHES BOTTOM ──────────────────────────
      for (const alien of liveAliens) {
        if (alien.y + ALIEN_SIZE > SHIP_Y) {
          g.status = "dead";
          const hs = getHighScore(GAME_KEY);
          if (g.score > hs) setHighScore(GAME_KEY, g.score);
          setHS(Math.max(g.score, hs));
          setUiStatus("dead");
          // Keep the loop alive so restart works
          rafRef.current = requestAnimationFrame(draw);
          return;
        }
      }

      // ── WAVE CLEAR ────────────────────────────────────
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

      // ══ DRAW ══════════════════════════════════════════
      ctx.fillStyle = "#060614";
      ctx.fillRect(0, 0, W, H);

      // Scrolling star field (3 layers of parallax)
      for (let layer = 0; layer < 3; layer++) {
        const speed = (layer + 1) * 0.15;
        const size  = layer === 2 ? 2 : layer === 1 ? 1.5 : 1;
        const alpha = layer === 2 ? 0.9 : layer === 1 ? 0.6 : 0.3;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        const count = layer === 2 ? 20 : layer === 1 ? 30 : 50;
        for (let i = 0; i < count; i++) {
          const sx = ((i * (73 + layer * 17) + g.frame * speed) % W);
          const sy = (i * (47 + layer * 13)) % (H - 60);
          ctx.fillRect(sx, sy, size, size);
        }
      }

      // ── Draw aliens (with bob animation + tank glow) ──
      ctx.textBaseline = "top";
      for (const alien of g.aliens) {
        if (!alien.alive) continue;
        const bobY = Math.sin(g.frame * 0.06 + alien.col * 0.4 + alien.row * 0.8) * 3;
        const isTank = alien.maxHp > 1;

        if (isTank) {
          // Tank: strong glow + red tint when damaged
          const damaged = alien.hp < alien.maxHp;
          ctx.shadowBlur = damaged ? 20 : 14;
          ctx.shadowColor = damaged ? "#ff2d95" : "#ff6600";
          // HP bar above tank
          const barW = ALIEN_SIZE;
          ctx.fillStyle = "#333";
          ctx.fillRect(alien.x, alien.y + bobY - 6, barW, 3);
          ctx.fillStyle = damaged ? "#ff2d95" : "#39ff14";
          ctx.fillRect(alien.x, alien.y + bobY - 6, barW * (alien.hp / alien.maxHp), 3);
        } else {
          ctx.shadowBlur = 6;
          ctx.shadowColor = "rgba(255,255,255,0.4)";
        }

        ctx.font = `${ALIEN_SIZE}px serif`;
        ctx.fillText(alien.emoji, alien.x, alien.y + bobY);
        ctx.shadowBlur = 0;
      }

      // ── Draw boss (animated + phase colors) ───────────
      if (g.boss) {
        const bossColor = g.boss.phase === 3 ? "#ff2d95" : g.boss.phase === 2 ? "#ffe600" : "#a855f7";
        const bossBob = Math.sin(g.frame * 0.08) * 5;
        const bossScale = 60 + Math.sin(g.frame * 0.1) * 4; // pulsing size
        ctx.shadowBlur = 20 + Math.sin(g.frame * 0.15) * 8;
        ctx.shadowColor = bossColor;
        ctx.font = `${bossScale}px serif`;
        ctx.fillText("👾", g.boss.x, g.boss.y + bossBob);
        ctx.shadowBlur = 0;
        // HP bar
        const hpW = 140;
        const hpRatio = g.boss.hp / g.boss.maxHp;
        ctx.fillStyle = "#222";
        ctx.fillRect(W / 2 - hpW / 2, 18, hpW, 10);
        ctx.fillStyle = bossColor;
        ctx.shadowBlur = 6; ctx.shadowColor = bossColor;
        ctx.fillRect(W / 2 - hpW / 2, 18, hpW * hpRatio, 10);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`BOSS  HP ${g.boss.hp}/${g.boss.maxHp}`, W / 2, 12);
        ctx.textAlign = "left";
      }

      // ── Draw player bullets ────────────────────────────
      for (const b of g.bullets) {
        ctx.fillStyle = "#39ff14";
        ctx.shadowBlur = 8; ctx.shadowColor = "#39ff14";
        ctx.fillRect(b.x - 2, b.y, 4, 14);
        ctx.shadowBlur = 0;
      }

      // ── Draw alien bullets (animated) ─────────────────
      for (const b of g.alienBullets) {
        const pulse = Math.sin(g.frame * 0.3 + b.x) * 1.5;
        ctx.fillStyle = "#ff2d95";
        ctx.shadowBlur = 6 + pulse; ctx.shadowColor = "#ff2d95";
        ctx.fillRect(b.x - 2, b.y, 4, 10);
        ctx.shadowBlur = 0;
      }

      // ── Draw power-ups (bob + glow) ────────────────────
      ctx.font = "22px serif";
      for (const pu of g.droppedPowerUps) {
        const def = POWER_UPS.find((p) => p.type === pu.type)!;
        const puBob = Math.sin(g.frame * 0.1 + pu.x) * 3;
        ctx.shadowBlur = 12; ctx.shadowColor = def.color;
        ctx.fillText(def.emoji, pu.x - 11, pu.y + puBob);
        ctx.shadowBlur = 0;
      }

      // ── Draw combo multiplier ──────────────────────────────────────────
      if (g.comboMultiplier > 1 && g.comboDisplayTimer > 0) {
        const alpha = Math.min(1, g.comboDisplayTimer / 30);
        const comboColor = g.comboMultiplier >= 4 ? "#ff2d95" : g.comboMultiplier === 3 ? "#ffe600" : "#39ff14";
        ctx.globalAlpha = alpha;
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "right";
        ctx.fillStyle = comboColor;
        ctx.shadowBlur = 10; ctx.shadowColor = comboColor;
        ctx.fillText(`×${g.comboMultiplier} COMBO!`, W - 8, 36);
        // Pulse scale when multiplier just changed
        if (g.comboDisplayTimer > 80) {
          const scale = 1 + (g.comboDisplayTimer - 80) / 80 * 0.3;
          ctx.font = `bold ${Math.round(11 * scale)}px monospace`;
          ctx.fillText(`×${g.comboMultiplier} COMBO!`, W - 8, 36);
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.textAlign = "left";
      }

      // ── Draw ship ─────────────────────────────────────
      const shipColor  = g.activeShield ? "#00d4ff" : "#a855f7";
      const shipColor2 = g.activeShield ? "#ffffff" : "#c084fc";

      // Thruster flame (animated, flickers)
      const thrusterH = 6 + Math.sin(g.frame * 0.6) * 4;
      const thrusterColor = g.activeShield ? "#00d4ff" : (g.activeRapid ? "#39ff14" : "#f97316");
      ctx.shadowBlur = 14; ctx.shadowColor = thrusterColor;
      ctx.fillStyle = thrusterColor;
      ctx.fillRect(g.shipX + 8,          SHIP_Y + SHIP_H,     5, thrusterH);
      ctx.fillRect(g.shipX + SHIP_W - 13, SHIP_Y + SHIP_H,     5, thrusterH - 2);
      // Inner thruster (brighter center)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(g.shipX + 9,           SHIP_Y + SHIP_H,     3, thrusterH / 2);
      ctx.fillRect(g.shipX + SHIP_W - 12, SHIP_Y + SHIP_H,     3, thrusterH / 2);
      ctx.shadowBlur = 0;

      // Ship body
      ctx.shadowBlur = g.activeShield ? 20 : 10;
      ctx.shadowColor = shipColor;
      ctx.fillStyle = shipColor;
      // Cannon
      ctx.fillRect(g.shipX + SHIP_W / 2 - 2, SHIP_Y - 2,       4,  10);
      // Hull center
      ctx.fillStyle = shipColor;
      ctx.fillRect(g.shipX + 6,               SHIP_Y + 8,  SHIP_W - 12, SHIP_H - 8);
      // Wings (tilt when moving)
      const tiltOffset = g.shipTilt * 2;
      ctx.fillRect(g.shipX + 0,               SHIP_Y + 12 + tiltOffset, 8, 12);
      ctx.fillRect(g.shipX + SHIP_W - 8,      SHIP_Y + 12 - tiltOffset, 8, 12);
      // Cockpit highlight
      ctx.fillStyle = shipColor2;
      ctx.fillRect(g.shipX + SHIP_W / 2 - 3, SHIP_Y + 4, 6, 6);
      ctx.shadowBlur = 0;

      // Muzzle flash
      if (g.muzzleFlash > 0) {
        const cx = g.shipX + SHIP_W / 2;
        ctx.fillStyle = `rgba(57,255,20,${g.muzzleFlash / 4 * 0.8})`;
        ctx.shadowBlur = 16; ctx.shadowColor = "#39ff14";
        ctx.beginPath();
        ctx.arc(cx, SHIP_Y - 4, g.muzzleFlash * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Keyboard — only track keys, shooting is handled in game loop
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        const g = gameRef.current;
        if (g.status === "idle" || g.status === "dead") {
          startGame();
          return;
        }
      }
      keysRef.current.add(e.key === " " ? " " : e.key);
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key === " " ? " " : e.key);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [startGame]);

  return (
    <div className="flex flex-col items-center min-h-screen p-4 gap-4">
      <div className="flex items-center justify-between w-full max-w-lg">
        <Link href="/games" className="text-[0.5rem] neon-text-blue hover:opacity-80">← BACK</Link>
        <h1 className="text-[0.6rem] sm:text-xs neon-text neon-text-blue">ASTRO RAID</h1>
        <span className="text-[0.5rem] text-gray-400">BEST: {highScore}</span>
      </div>

      {/* HUD */}
      <div className="flex gap-4 text-[0.5rem] font-pixel text-gray-400 flex-wrap justify-center">
        <span>SCORE: {uiScore}</span>
        <span>WAVE: {uiWave}</span>
        <span>{"🚀".repeat(uiLives)}</span>
        <button
          onClick={() => setMuted((m) => !m)}
          className="text-[0.5rem] text-gray-500 hover:text-gray-300 transition-colors"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        {activePowerUpLabel && (
          <span className="text-neon-yellow animate-pulse">{activePowerUpLabel}</span>
        )}
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
              <div className="text-[0.45rem] font-pixel text-gray-500 text-center leading-relaxed">
                <p>← → MOVE · HOLD SPACE SHOOT</p>
                <p className="mt-1">💀 TANK ALIENS TAKE 2 HITS</p>
                <p className="mt-1">⚡ RAPID FIRE · 🔱 TRIPLE · 🛡️ SHIELD · ❤️ LIFE</p>
              </div>
              <p className="text-[0.45rem] font-pixel text-neon-blue/60 animate-pulse">PRESS SPACE OR CLICK TO LAUNCH</p>
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
              <p className="text-[0.45rem] font-pixel text-gray-600 animate-pulse">PRESS SPACE TO RETRY</p>
              <PixelButton color="pink" onClick={startGame}>TRY AGAIN</PixelButton>
            </div>
          </div>
        )}
      </div>

      <p className="text-[0.45rem] font-pixel text-gray-600">
        ← → MOVE · HOLD SPACE SHOOT · BOSS EVERY {BOSS_EVERY_N_WAVES} WAVES
      </p>
    </div>
  );
}
