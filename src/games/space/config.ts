export type PowerUpType = "tripleShot" | "shield" | "bomb";
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
  { type: "tripleShot", emoji: "🔫", label: "TRIPLE SHOT",  color: "#ff2d95", duration: 10000, dropChance: 0.15 },
  { type: "shield",     emoji: "🛡️", label: "SHIELD",       color: "#00d4ff", duration: 12000, dropChance: 0.12 },
  { type: "bomb",       emoji: "💥", label: "SCREEN BOMB",  color: "#ffe600", duration: null,  dropChance: 0.05 },
];

export const WAVE_PATTERNS: WavePattern[] = ["march", "zigzag", "dive"];

export const COLS = 9;
export const ROWS = 4;
export const ALIEN_SIZE = 32;
export const ALIEN_GAP = 10;
export const BULLET_SPEED = 8;
export const ALIEN_BULLET_SPEED = 4;
export const SHIP_SPEED = 5;
export const ALIEN_SHOOT_INTERVAL = 80; // frames between alien shots
export const LIVES = 3;

export const BOSS_EVERY_N_WAVES = 5;
