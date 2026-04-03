export type EventType =
  | "lightning" | "bomb" | "freeze" | "fever"
  | "whirlwind" | "overdrive" | "curse";

export interface EventDef {
  type: EventType;
  emoji: string;
  label: string;
  color: string;
}

export const RANDOM_EVENTS: EventDef[] = [
  { type: "lightning", emoji: "⚡", label: "LIGHTNING STRIKE!", color: "#ffe600" },
  { type: "bomb",      emoji: "💣", label: "BOMB BLAST!",       color: "#ff2d95" },
  { type: "freeze",    emoji: "❄️", label: "ICE FREEZE!",       color: "#00d4ff" },
  { type: "fever",     emoji: "🔥", label: "FEVER TIME!",       color: "#f97316" },
  { type: "whirlwind", emoji: "🌪️", label: "WHIRLWIND!",        color: "#a855f7" },
  { type: "overdrive", emoji: "⭐", label: "OVERDRIVE!",        color: "#ffe600" },
  { type: "curse",     emoji: "💀", label: "CURSE!",            color: "#39ff14" },
];

export type GameMode = "classic" | "zen" | "storm";

export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;

export const LEVEL_SPEEDS: { level: number; ms: number }[] = [
  { level: 1,  ms: 800 },
  { level: 2,  ms: 700 },
  { level: 3,  ms: 600 },
  { level: 5,  ms: 500 },
  { level: 7,  ms: 380 },
  { level: 10, ms: 280 },
  { level: 13, ms: 200 },
  { level: 16, ms: 150 },
  { level: 20, ms: 100 },
];

export function getSpeed(level: number): number {
  let ms = LEVEL_SPEEDS[0].ms;
  for (const l of LEVEL_SPEEDS) {
    if (level >= l.level) ms = l.ms;
  }
  return ms;
}

export const ZEN_LEVEL_SPEEDS: { level: number; ms: number }[] = [
  { level: 1,  ms: 1100 },
  { level: 2,  ms: 950 },
  { level: 3,  ms: 820 },
  { level: 5,  ms: 700 },
  { level: 7,  ms: 560 },
  { level: 10, ms: 420 },
  { level: 13, ms: 320 },
  { level: 16, ms: 240 },
  { level: 20, ms: 170 },
];

export function getZenSpeed(level: number): number {
  let ms = ZEN_LEVEL_SPEEDS[0].ms;
  for (const l of ZEN_LEVEL_SPEEDS) {
    if (level >= l.level) ms = l.ms;
  }
  return ms;
}

// Weights for Zen piece bag: I/O/L/J spawn more often, S/Z less
export const ZEN_PIECE_WEIGHTS: Record<string, number> = {
  I: 3, O: 2, L: 2, J: 2, T: 2, S: 1, Z: 1,
};

// Score per lines cleared (base)
export const LINE_SCORES = [0, 100, 300, 500, 800];

// Combo bonuses (index = combo count, capped at index 4)
export const COMBO_BONUSES = [0, 50, 100, 200, 400];

// T-Spin scores
export type TSpinKind = "mini" | "single" | "double" | "triple";

export const TSPIN_SCORES: Record<TSpinKind, number> = {
  mini:   400,
  single: 800,
  double: 1200,
  triple: 1600,
};

// Multipliers
export const BACK_TO_BACK_MULT    = 1.5;
export const OVERDRIVE_SPEED_MULT = 2;
export const OVERDRIVE_SCORE_MULT = 3;
export const OVERDRIVE_DURATION   = 15000;
export const FEVER_DURATION       = 30000;
export const FREEZE_DURATION      = 3000;
export const GARBAGE_ROWS_BOMB    = 2;
export const GARBAGE_ROWS_CURSE   = 3;
