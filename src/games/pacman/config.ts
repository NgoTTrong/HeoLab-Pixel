import type { GameModifiers } from "./types";

export const CELL_SIZE = 16;
export const TICK_MS = 120;

export const DEFAULT_MODIFIERS: GameModifiers = {
  gameMode: "survival",
  ghostSpeed: "normal",
  powerDuration: 8,
  mazeStyle: "classic",
  ghostCount: 4,
  bonusFrequency: "normal",
  lives: 3,
  speedRamp: "gradual",
};

export const GHOST_SPEED_MULT: Record<string, number> = {
  slow: 1.5,
  normal: 1,
  fast: 0.7,
  insane: 0.5,
};

/** Scatter/chase cycle durations in ticks: [scatter, chase] per phase. */
export const SCATTER_CHASE_CYCLE = [
  [7 * 8, 20 * 8],
  [7 * 8, 20 * 8],
  [5 * 8, 20 * 8],
  [5 * 8, Infinity],
];

export const SCORE = {
  dot: 10,
  powerPellet: 50,
  ghost: [200, 400, 800, 1600],
  fruit: [100, 300, 500, 700, 1000],
};

export const GHOST_COLORS: Record<string, string> = {
  blinky: "#ff2d55",
  pinky: "#ff69b4",
  inky: "#00d4ff",
  clyde: "#f97316",
};

// Fog of War
export const FOG_RADIUS = 4;
export const FOG_POWER_RADIUS = 8;
export const FOG_FADE_RANGE = 2;
export const FOG_VISITED_OPACITY = 0.2;

// Ghost proximity audio thresholds
export const PROXIMITY_FAR = 8;
export const PROXIMITY_MID = 5;
export const PROXIMITY_NEAR = 3;

// Combo system
export const COMBO_BREAK_TICKS = 1;
export const COMBO_DOT_CAP = 10;
export const COMBO_MILESTONES = [
  { combo: 10,  bonus: 500,  effect: null as string | null, label: null as string | null },
  { combo: 20,  bonus: 1000, effect: "speedBoost",  label: "BLAZING!" },
  { combo: 50,  bonus: 2500, effect: "visionBoost", label: "UNSTOPPABLE!" },
  { combo: 100, bonus: 5000, effect: "miniPower",   label: "LEGENDARY!" },
];
export const COMBO_SPEED_BOOST_TICKS = Math.round(3 * 1000 / TICK_MS);
export const COMBO_VISION_BOOST_TICKS = Math.round(5 * 1000 / TICK_MS);
export const COMBO_MINI_POWER_TICKS = Math.round(3 * 1000 / TICK_MS);

// Ghost evolution
export const EVOLUTION_TIERS = {
  basic:   { minLevel: 1, predictionChance: 0 },
  aware:   { minLevel: 3, predictionChance: 0.4 },
  evolved: { minLevel: 5, predictionChance: 0.7 },
};
export const EVOLUTION_FORGET_RATE = 0.1;
