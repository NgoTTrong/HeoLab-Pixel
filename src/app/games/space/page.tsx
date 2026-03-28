"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import PixelButton from "@/components/PixelButton";
import MuteButton from "@/components/MuteButton";
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

type AlienBehavior = "normal" | "zigzag" | "kamikaze" | "shield";

interface Alien {
  col: number; row: number;
  x: number; y: number;
  baseX: number;      // original X for zigzag oscillation
  alive: boolean;
  emoji: string;
  hp: number;
  maxHp: number;
  behavior: AlienBehavior;
  hasShield: boolean; // shield type: shield still active
  isDiving: boolean;  // kamikaze: currently diving toward ship
}

interface Bullet { x: number; y: number; }
interface AlienBullet { x: number; y: number; }
interface HomingBullet { x: number; y: number; angle: number; }
interface DroppedPowerUp { x: number; y: number; type: PowerUpType; }
interface Boss {
  x: number; y: number;
  hp: number; maxHp: number;
  vx: number;
  phase: number;
  type: 1 | 2 | 3;         // 1=Spreader, 2=Summoner, 3=Sniper
  // Boss 2 (Summoner)
  shieldActive: boolean;
  shieldTimer: number;      // frames remaining; set to -1 once used
  // Boss 3 (Sniper)
  chargeTimer: number;      // counts up; charge fires at 300
  chargeWarning: boolean;   // flashing warning before charge shot
  chargeWarningTimer: number;
  stepTimer: number;        // counts up; teleport-step every 45 frames
}

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
    // Homing missiles
    homingBullets: [] as HomingBullet[],
    // Slow time
    slowActive: false,
    slowEndsAt: 0,
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
    const startX = (W - (COLS * (ALIEN_SIZE + ALIEN_GAP))) / 2;
    g.aliens = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const isTank = wave >= 3 && r === 0;

        let behavior: AlienBehavior = "normal";
        let emoji = "👾";
        let hp = 1;

        if (isTank) {
          emoji = "💀"; hp = 2;
        } else if (wave >= 5 && r === 1) {
          behavior = "shield"; emoji = "🤖"; hp = 2;
        } else if (wave >= 7 && r === ROWS - 1) {
          behavior = "kamikaze"; emoji = "🛸";
        } else if (wave >= 3 && r === ROWS - 1) {
          behavior = "zigzag"; emoji = "👽";
        } else if (wave >= 5 && r === ROWS - 2) {
          behavior = "zigzag"; emoji = "👽";
        } else {
          const roster = WAVE_ALIENS[Math.min(Math.floor((wave - 1) / 2), WAVE_ALIENS.length - 1)];
          emoji = roster[r % roster.length];
        }

        const x = startX + c * (ALIEN_SIZE + ALIEN_GAP);
        g.aliens.push({
          col: c, row: r,
          x, y: 80 + r * (ALIEN_SIZE + ALIEN_GAP),
          baseX: x,
          alive: true,
          emoji,
          hp, maxHp: hp,
          behavior,
          hasShield: behavior === "shield",
          isDiving: false,
        });
      }
    }

    g.alienMoveInterval = Math.max(12, 40 - wave * 2);
    g.pattern = WAVE_PATTERNS[(wave - 1) % WAVE_PATTERNS.length];
    g.alienDx = 1;
    g.zigzagAngle = 0;
  }

  function spawnBoss(wave: number): Boss {
    const bossIndex = ((Math.floor(wave / BOSS_EVERY_N_WAVES) - 1) % 3 + 1) as 1 | 2 | 3;
    const hp = 20 + wave * 5;
    return {
      x: W / 2 - 40, y: 60,
      hp, maxHp: hp,
      vx: 2 + wave * 0.3,
      phase: 1,
      type: bossIndex,
      shieldActive: false, shieldTimer: 0,
      chargeTimer: 0, chargeWarning: false, chargeWarningTimer: 0,
      stepTimer: 0,
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
    g.shootCooldown = 0;
    g.activeShield = false;
    g.activeTriple = false;
    g.activeRapid = false;
    g.homingBullets = [];
    g.slowActive = false;
    g.slowEndsAt = 0;
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
      if (g.slowActive   && now > g.slowEndsAt)   {
        g.slowActive = false;
        setActivePowerUpLabel(
          g.activeShield ? "🛡️ SHIELD" : g.activeTriple ? "🔱 TRIPLE SHOT" : g.activeRapid ? "⚡ RAPID FIRE" : null
        );
      }

      // ── MOVE BULLETS ───────────────────────────────────
      g.bullets = g.bullets.filter((b) => b.y > -10);
      g.bullets.forEach((b) => { b.y -= BULLET_SPEED; });
      g.alienBullets = g.alienBullets.filter((b) => b.y < H + 10);
      const alienBulletSpeed = g.slowActive ? ALIEN_BULLET_SPEED * 0.4 : ALIEN_BULLET_SPEED;
      g.alienBullets.forEach((b) => { b.y += alienBulletSpeed; });
      g.droppedPowerUps = g.droppedPowerUps.filter((p) => p.y < H + 20);
      g.droppedPowerUps.forEach((p) => { p.y += 1.5; });

      // Homing missiles
      g.homingBullets = g.homingBullets.filter((hb) => hb.y > -20 && hb.y < H + 20);
      for (const hb of g.homingBullets) {
        const targets = g.aliens.filter((a) => a.alive);
        if (g.boss) {
          const bossCenter = { x: g.boss.x + 40, y: g.boss.y + 25 };
          const dx = bossCenter.x - hb.x;
          const dy = bossCenter.y - hb.y;
          const targetAngle = Math.atan2(dy, dx);
          let diff = targetAngle - hb.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          hb.angle += Math.sign(diff) * Math.min(Math.abs(diff), 0.07);
        } else if (targets.length > 0) {
          let nearest = targets[0];
          let nearDist = Infinity;
          for (const a of targets) {
            const d = Math.hypot(a.x - hb.x, a.y - hb.y);
            if (d < nearDist) { nearDist = d; nearest = a; }
          }
          const dx = nearest.x + ALIEN_SIZE / 2 - hb.x;
          const dy = nearest.y + ALIEN_SIZE / 2 - hb.y;
          const targetAngle = Math.atan2(dy, dx);
          let diff = targetAngle - hb.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          hb.angle += Math.sign(diff) * Math.min(Math.abs(diff), 0.07);
        }
        hb.x += Math.cos(hb.angle) * 5;
        hb.y += Math.sin(hb.angle) * 5;
      }

      // ── ALIEN MOVEMENT ─────────────────────────────────
      g.alienMoveTimer++;
      const liveAliens = g.aliens.filter((a) => a.alive);
      const effectiveInterval = g.slowActive ? g.alienMoveInterval * 2.5 : g.alienMoveInterval;
      if (g.alienMoveTimer >= effectiveInterval && liveAliens.length > 0) {
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

      // Per-alien individual behaviors
      for (const alien of g.aliens) {
        if (!alien.alive) continue;

        if (alien.behavior === "zigzag") {
          // Override X with sine oscillation around baseX
          alien.x = alien.baseX + Math.sin(g.frame * 0.07 + alien.col * 1.1) * 20;
        }

        if (alien.behavior === "kamikaze" && !alien.isDiving) {
          // Trigger dive when fewer than COLS aliens alive or alien gets deep enough
          const liveCount = g.aliens.filter((a) => a.alive).length;
          if (liveCount < COLS || alien.y > H * 0.52) {
            alien.isDiving = true;
          }
        }

        if (alien.isDiving) {
          // Dive toward ship X
          const targetX = g.shipX + SHIP_W / 2 - ALIEN_SIZE / 2;
          alien.x += (targetX - alien.x) * 0.06;
          alien.y += 3.5;
        }
      }

      // Update baseX for non-zigzag aliens (so zigzag still follows formation X drift)
      for (const alien of g.aliens) {
        if (alien.alive && alien.behavior !== "zigzag") {
          alien.baseX = alien.x;
        }
      }

      // ── BOSS MOVEMENT ──────────────────────────────────
      if (g.boss) {
        const hpRatio = g.boss.hp / g.boss.maxHp;
        g.boss.phase = hpRatio < 0.3 ? 3 : hpRatio < 0.6 ? 2 : 1;

        if (g.boss.type === 1) {
          // ── Boss 1: The Spreader ──
          g.boss.x += g.boss.vx * (g.boss.phase === 2 ? 1.5 : g.boss.phase === 3 ? 2 : 1);
          if (g.boss.x <= 0 || g.boss.x + 80 >= W) g.boss.vx *= -1;

          if (g.frame % 28 === 0) {
            const shots = g.boss.phase === 3 ? 5 : g.boss.phase === 2 ? 4 : 2;
            for (let i = 0; i < shots; i++) {
              const spread = (i - (shots - 1) / 2) * 18;
              g.alienBullets.push({ x: g.boss.x + 40 + spread, y: g.boss.y + 50 });
            }
            if (g.boss.phase === 3 && g.frame % 56 === 0) {
              g.alienBullets.push({ x: g.boss.x + 40, y: g.boss.y + 50 });
              g.alienBullets.push({ x: g.boss.x + 40, y: g.boss.y + 50 });
            }
          }

        } else if (g.boss.type === 2) {
          // ── Boss 2: The Summoner ──
          g.boss.x += g.boss.vx;
          if (g.boss.x <= 0 || g.boss.x + 80 >= W) g.boss.vx *= -1;
          g.boss.y = 70 + Math.sin(g.frame * 0.04) * 30;

          // Shield phase at 50% HP (once)
          if (!g.boss.shieldActive && g.boss.shieldTimer === 0 && hpRatio < 0.5) {
            g.boss.shieldActive = true;
            g.boss.shieldTimer = 180;
          }
          if (g.boss.shieldActive) {
            g.boss.shieldTimer--;
            if (g.boss.shieldTimer <= 0) {
              g.boss.shieldActive = false;
              g.boss.shieldTimer = -1;
            }
          }

          // Summon minions every 180 frames
          if (g.frame % 180 === 0 && g.frame > 0) {
            const sx = (W - 5 * (ALIEN_SIZE + ALIEN_GAP)) / 2;
            for (let c = 0; c < 5; c++) {
              const mx = sx + c * (ALIEN_SIZE + ALIEN_GAP);
              g.aliens.push({
                col: c, row: 5,
                x: mx, y: 150,
                baseX: mx,
                alive: true,
                emoji: "👻",
                hp: 1, maxHp: 1,
                behavior: "normal",
                hasShield: false,
                isDiving: false,
              });
            }
          }

          // Shoot toward ship every 90 frames (skip when shielded)
          if (!g.boss.shieldActive && g.frame % 90 === 0) {
            const cx = g.boss.x + 40;
            g.alienBullets.push({ x: cx - 16, y: g.boss.y + 50 });
            g.alienBullets.push({ x: cx + 16, y: g.boss.y + 50 });
          }

        } else if (g.boss.type === 3) {
          // ── Boss 3: The Sniper ──
          g.boss.y = 70;

          // Step movement: teleport 80px left or right every 45 frames
          g.boss.stepTimer++;
          if (g.boss.stepTimer >= 45) {
            g.boss.stepTimer = 0;
            const dir = Math.random() > 0.5 ? 1 : -1;
            g.boss.x = Math.max(0, Math.min(W - 80, g.boss.x + dir * 80));
          }

          // Charge shot every 300 frames
          g.boss.chargeTimer++;
          if (g.boss.chargeTimer >= 300) {
            if (!g.boss.chargeWarning) {
              g.boss.chargeWarning = true;
              g.boss.chargeWarningTimer = 90;
            }
            if (g.boss.chargeWarning) {
              g.boss.chargeWarningTimer--;
              if (g.boss.chargeWarningTimer <= 0) {
                // Fire 8-way burst (spread positions around boss)
                for (let i = 0; i < 8; i++) {
                  const angle = (i / 8) * Math.PI * 2;
                  const bx = g.boss.x + 40 + Math.cos(angle) * 30;
                  const by = g.boss.y + 25 + Math.sin(angle) * 20;
                  g.alienBullets.push({ x: bx, y: by });
                }
                g.boss.chargeTimer = 0;
                g.boss.chargeWarning = false;
              }
            }
          }

          // Regular targeted shot every 35 frames (not during charge warning)
          if (!g.boss.chargeWarning && g.frame % 35 === 0) {
            g.alienBullets.push({ x: g.shipX + SHIP_W / 2, y: g.boss.y + 50 });
          }
        }
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
            // Shield absorbs first hit
            if (alien.hasShield) {
              alien.hasShield = false;
              bullet.y = -999;
              g.score += 5 * g.comboMultiplier;
              setUiScore(g.score);
              continue; // shield broken, alien survives
            }
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
            if (g.boss.shieldActive) {
              bullet.y = -999;
            } else {
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
            } // end !shieldActive
          }
        }
      }

      // Homing missile collision
      for (const hb of g.homingBullets) {
        for (const alien of liveAliens) {
          if (
            hb.x > alien.x && hb.x < alien.x + ALIEN_SIZE &&
            hb.y > alien.y && hb.y < alien.y + ALIEN_SIZE
          ) {
            if (alien.hasShield) { alien.hasShield = false; hb.y = -999; continue; }
            alien.hp--;
            hb.y = -999;
            if (alien.hp <= 0) {
              alien.alive = false;
              g.combo++;
              g.comboMultiplier = g.combo >= 20 ? 4 : g.combo >= 10 ? 3 : g.combo >= 5 ? 2 : 1;
              g.comboDisplayTimer = 90;
              g.score += (25 + g.wave * 2) * g.comboMultiplier;
              setUiScore(g.score);
              audioRef.current?.playExplosion();
            }
          }
        }
        // Homing vs boss
        if (g.boss && !g.boss.shieldActive) {
          if (hb.x > g.boss.x && hb.x < g.boss.x + 80 && hb.y > g.boss.y && hb.y < g.boss.y + 50) {
            g.boss.hp -= 1;
            hb.y = -999;
            g.score += 5 * g.comboMultiplier;
            setUiScore(g.score);
            if (g.boss.hp <= 0) {
              g.boss = null;
              g.score += 300 + g.wave * 20;
              setUiScore(g.score);
              audioRef.current?.playBossDie();
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
          } else if (pu.type === "homingMissile") {
            const cx = g.shipX + SHIP_W / 2;
            [-0.4, -Math.PI / 2, -Math.PI + 0.4].forEach((angle) => {
              g.homingBullets.push({ x: cx, y: SHIP_Y - 4, angle });
            });
            audioRef.current?.playPowerUp();
            setActivePowerUpLabel("🎯 HOMING MISSILE!");
            setTimeout(() => setActivePowerUpLabel(null), 1500);
          } else if (pu.type === "slowTime") {
            g.slowActive = true;
            g.slowEndsAt = now + (def.duration ?? 6000);
            setActivePowerUpLabel("🐌 SLOW TIME");
            audioRef.current?.playPowerUp();
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
        if (alien.y + ALIEN_SIZE > SHIP_Y || (alien.isDiving && alien.y + ALIEN_SIZE > SHIP_Y - 10)) {
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

      // Slow time vignette
      if (g.slowActive) {
        const grad = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.8);
        grad.addColorStop(0, "rgba(0,212,255,0)");
        grad.addColorStop(1, "rgba(0,212,255,0.08)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

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

        // Dive trail for kamikaze
        if (alien.isDiving) {
          ctx.shadowBlur = 0;
          for (let t = 1; t <= 4; t++) {
            ctx.globalAlpha = 0.15 * (5 - t) / 4;
            ctx.font = `${ALIEN_SIZE * 0.7}px serif`;
            ctx.fillText(alien.emoji, alien.x + 4, alien.y - t * 8 + bobY);
          }
          ctx.globalAlpha = 1;
        }

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

        // Shield visual
        if (alien.hasShield) {
          ctx.beginPath();
          ctx.arc(alien.x + ALIEN_SIZE / 2, alien.y + ALIEN_SIZE / 2 + bobY, ALIEN_SIZE / 2 + 4, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0,212,255,${0.5 + Math.sin(g.frame * 0.1) * 0.2})`;
          ctx.lineWidth = 2;
          ctx.shadowBlur = 10; ctx.shadowColor = "#00d4ff";
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // ── Draw boss (per-type rendering) ────────────────
      if (g.boss) {
        const bossEmoji  = g.boss.type === 2 ? "🤖" : g.boss.type === 3 ? "💀" : "👾";
        const bossColor  = g.boss.phase === 3 ? "#ff2d95" : g.boss.phase === 2 ? "#ffe600" : "#a855f7";
        const bossBob    = Math.sin(g.frame * 0.08) * 5;
        const bossScale  = 60 + Math.sin(g.frame * 0.1) * 4;

        // Charge warning for Boss 3
        if (g.boss.chargeWarning) {
          const warnAlpha = 0.4 + Math.sin(g.frame * 0.4) * 0.4;
          ctx.fillStyle = `rgba(255,45,149,${warnAlpha})`;
          ctx.fillRect(0, 0, W, H * 0.25);
          ctx.strokeStyle = `rgba(255,45,149,${warnAlpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(g.shipX + SHIP_W / 2, g.boss.y + 50);
          ctx.lineTo(g.shipX + SHIP_W / 2, SHIP_Y);
          ctx.stroke();
        }

        // Boss 2 shield aura
        if (g.boss.shieldActive) {
          ctx.beginPath();
          ctx.arc(g.boss.x + 40, g.boss.y + 30 + bossBob, 52, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0,212,255,${0.6 + Math.sin(g.frame * 0.2) * 0.3})`;
          ctx.lineWidth = 3;
          ctx.shadowBlur = 20; ctx.shadowColor = "#00d4ff";
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Boss emoji
        ctx.shadowBlur = 20 + Math.sin(g.frame * 0.15) * 8;
        ctx.shadowColor = bossColor;
        ctx.font = `${bossScale}px serif`;
        ctx.fillText(bossEmoji, g.boss.x, g.boss.y + bossBob);
        ctx.shadowBlur = 0;

        // HP bar
        const hpW = 140;
        const hpRatio = g.boss.hp / g.boss.maxHp;
        ctx.fillStyle = "#222";
        ctx.fillRect(W / 2 - hpW / 2, 18, hpW, 10);
        ctx.fillStyle = g.boss.shieldActive ? "#00d4ff" : bossColor;
        ctx.shadowBlur = 6; ctx.shadowColor = g.boss.shieldActive ? "#00d4ff" : bossColor;
        ctx.fillRect(W / 2 - hpW / 2, 18, hpW * hpRatio, 10);
        ctx.shadowBlur = 0;
        const bossName = g.boss.type === 2 ? "THE SUMMONER" : g.boss.type === 3 ? "THE SNIPER" : "THE SPREADER";
        ctx.fillStyle = "#fff";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${bossName}  HP ${g.boss.hp}/${g.boss.maxHp}`, W / 2, 12);
        ctx.textAlign = "left";
      }

      // ── Draw player bullets ────────────────────────────
      for (const b of g.bullets) {
        ctx.fillStyle = "#39ff14";
        ctx.shadowBlur = 8; ctx.shadowColor = "#39ff14";
        ctx.fillRect(b.x - 2, b.y, 4, 14);
        ctx.shadowBlur = 0;
      }

      // ── Draw homing missiles ────────────────────────────
      for (const hb of g.homingBullets) {
        ctx.save();
        ctx.translate(hb.x, hb.y);
        ctx.rotate(hb.angle - Math.PI / 2);
        ctx.fillStyle = "#ffe600";
        ctx.shadowBlur = 10; ctx.shadowColor = "#ffe600";
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(4, 4);
        ctx.lineTo(-4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = "#fff";
        ctx.fillRect(-1, 5, 2, 4);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
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
        <div className="flex items-center gap-2">
          <span className="text-[0.5rem] text-gray-400">BEST: {highScore}</span>
          <MuteButton muted={muted} onToggle={() => setMuted((m) => !m)} color="blue" />
        </div>
      </div>

      {/* HUD */}
      <div className="flex gap-4 text-[0.5rem] font-pixel text-gray-400 flex-wrap justify-center">
        <span>SCORE: {uiScore}</span>
        <span>WAVE: {uiWave}</span>
        <span>{"🚀".repeat(uiLives)}</span>
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
