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
  color: string; // snake head/body color
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
    emoji: "×2",
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

export const GRID_SIZE = 20; // 20×20 grid
export const POWER_UP_SPAWN_CHANCE = 0.25; // 25% chance per food eaten
export const POWER_UP_LIFETIME_MS = 6000; // power-up disappears after 6s
