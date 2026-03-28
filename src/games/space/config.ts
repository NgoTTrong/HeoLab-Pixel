export type PowerUpType = "tripleShot" | "shield" | "bomb" | "rapidFire" | "extraLife" | "homingMissile" | "slowTime";
export type WavePattern = "march" | "zigzag" | "dive";

export interface PowerUpDef {
  type: PowerUpType;
  emoji: string;
  label: string;
  color: string;
  duration: number | null; // ms, null = instant
  dropChance: number;
}

export const POWER_UPS: PowerUpDef[] = [
  { type: "tripleShot", emoji: "🔱", label: "TRIPLE SHOT",  color: "#ff2d95", duration: 10000, dropChance: 0.14 },
  { type: "shield",     emoji: "🛡️", label: "SHIELD",       color: "#00d4ff", duration: 12000, dropChance: 0.12 },
  { type: "bomb",       emoji: "💣", label: "SCREEN BOMB",  color: "#ffe600", duration: null,  dropChance: 0.05 },
  { type: "rapidFire",  emoji: "⚡", label: "RAPID FIRE",   color: "#39ff14", duration: 8000,  dropChance: 0.13 },
  { type: "extraLife",     emoji: "❤️", label: "+1 LIFE",        color: "#ff2d95", duration: null,  dropChance: 0.06 },
  { type: "homingMissile", emoji: "🎯", label: "HOMING MISSILE", color: "#ffe600", duration: null,  dropChance: 0.08 },
  { type: "slowTime",      emoji: "🐌", label: "SLOW TIME",      color: "#00d4ff", duration: 6000,  dropChance: 0.07 },
];

export const WAVE_PATTERNS: WavePattern[] = ["march", "zigzag", "dive"];

export const COLS = 9;
export const ROWS = 4;
export const ALIEN_SIZE = 32;
export const ALIEN_GAP = 10;
export const BULLET_SPEED = 6;
export const ALIEN_BULLET_SPEED = 3;
export const SHIP_SPEED = 5;
export const ALIEN_SHOOT_INTERVAL = 80;
export const LIVES = 3;
export const BOSS_EVERY_N_WAVES = 5;

// Shoot cooldown in frames
export const SHOOT_COOLDOWN = 10;      // normal: ~6 shots/sec at 60fps
export const RAPID_SHOOT_COOLDOWN = 4; // rapid: ~15 shots/sec
