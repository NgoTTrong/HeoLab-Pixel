export interface CardData {
  id: number;
  emoji: string;
  name: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export type GridSize = "easy" | "hard";

export interface MemoryState {
  cards: CardData[];
  cols: number;
  flipped: number[];
  score: number;
  combo: number;
  moves: number;
  matched: number;
  total: number;
  completed: boolean;
  processing: boolean;
}

export const CREATURES: { emoji: string; name: string }[] = [
  { emoji: "\uD83D\uDC32", name: "Dragon" },
  { emoji: "\uD83E\uDD87", name: "Bat" },
  { emoji: "\uD83D\uDC80", name: "Skeleton" },
  { emoji: "\uD83D\uDC7B", name: "Ghost" },
  { emoji: "\uD83D\uDC79", name: "Demon" },
  { emoji: "\uD83E\uDDD9", name: "Wizard" },
  { emoji: "\uD83D\uDC3A", name: "Wolf" },
  { emoji: "\uD83E\uDD82", name: "Scorpion" },
  { emoji: "\uD83D\uDC0D", name: "Serpent" },
  { emoji: "\uD83E\uDD89", name: "Owl" },
  { emoji: "\uD83D\uDD77\uFE0F", name: "Spider" },
  { emoji: "\uD83E\uDDDB", name: "Vampire" },
  { emoji: "\uD83D\uDDFF", name: "Golem" },
  { emoji: "\uD83D\uDC7A", name: "Goblin" },
  { emoji: "\uD83D\uDC19", name: "Kraken" },
  { emoji: "\uD83D\uDD25", name: "Phoenix" },
  { emoji: "\u2744\uFE0F", name: "Frost" },
  { emoji: "\u26A1", name: "Thunder" },
];
