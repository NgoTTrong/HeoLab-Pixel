export type PowerUpType = "speedBoost" | "ghost" | "scoreDouble";

export interface PowerUpDef {
  type: PowerUpType;
  color: string;
  borderColor: string;
  emoji: string;
  duration: number | null; // ms, null = count-based
  scoreDoubleCount?: number;
}

export interface LevelDef {
  minScore: number;
  intervalMs: number;
  color: string;
  label: string;
}

export const POWER_UPS: PowerUpDef[] = [
  {
    type: "speedBoost",
    color: "#00d4ff",
    borderColor: "#00d4ff",
    emoji: "⚡",
    duration: 5000,
  },
  {
    type: "ghost",
    color: "#a855f7",
    borderColor: "#a855f7",
    emoji: "👻",
    duration: 3000,
  },
  {
    type: "scoreDouble",
    color: "#ffe600",
    borderColor: "#ffe600",
    emoji: "💰",      // was "×2" — text string caused layout overflow
    duration: null,
    scoreDoubleCount: 10,
  },
];

export const LEVELS: LevelDef[] = [
  { minScore: 0,  intervalMs: 160, color: "#00d4ff", label: "LVL 1" },
  { minScore: 5,  intervalMs: 135, color: "#39ff14", label: "LVL 2" },
  { minScore: 12, intervalMs: 110, color: "#ff2d95", label: "LVL 3" },
  { minScore: 22, intervalMs: 88,  color: "#a855f7", label: "LVL 4" },
  { minScore: 35, intervalMs: 68,  color: "#ffe600", label: "LVL 5" },
];

export const GRID_SIZE = 20;
export const POWER_UP_SPAWN_CHANCE = 0.25;
export const POWER_UP_LIFETIME_MS = 6000;

// Bomb obstacle constants
export const BOMB_SCORE_THRESHOLD = 5;
export const BOMB_SPAWN_CHANCE = 0.15;
export const BOMB_LIFETIME_MS = 6000;
export const BOMB_BLINK_MS = 4000; // start blinking at 4s
