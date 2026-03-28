export type EventType = "lightning" | "bomb" | "freeze" | "fever";

export interface EventDef {
  type: EventType;
  emoji: string;
  label: string;
  color: string;
}

export const RANDOM_EVENTS: EventDef[] = [
  { type: "lightning", emoji: "⚡", label: "LIGHTNING STRIKE!", color: "#ffe600" },
  { type: "bomb",      emoji: "💣", label: "BOMB BLOCK!",       color: "#ff2d95" },
  { type: "freeze",    emoji: "❄️", label: "ICE FREEZE!",       color: "#00d4ff" },
  { type: "fever",     emoji: "🔥", label: "FEVER TIME!",       color: "#f97316" },
];

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

// Score per lines cleared
export const LINE_SCORES = [0, 100, 300, 500, 800];
