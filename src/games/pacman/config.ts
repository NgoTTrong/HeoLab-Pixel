import type { GameModifiers } from "./types";

export const CELL_SIZE = 16;
export const TICK_MS = 120;

export const DEFAULT_MODIFIERS: GameModifiers = {
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
