export interface TileData {
  value: number;
  id: number;
}

export type GridState = (TileData | null)[][];

export interface GameState2048 {
  grid: GridState;
  score: number;
  gameOver: boolean;
  won: boolean;
}

export const MONSTERS: Record<number, { name: string; emoji: string }> = {
  2: { name: "Slime", emoji: "\u{1F7E2}" },
  4: { name: "Bat", emoji: "\u{1F987}" },
  8: { name: "Skeleton", emoji: "\u{1F480}" },
  16: { name: "Ghost", emoji: "\u{1F47B}" },
  32: { name: "Goblin", emoji: "\u{1F47A}" },
  64: { name: "Orc", emoji: "\u{1F479}" },
  128: { name: "Demon", emoji: "\u{1F608}" },
  256: { name: "Golem", emoji: "\u{1F5FF}" },
  512: { name: "Vampire", emoji: "\u{1F9DB}" },
  1024: { name: "Wizard", emoji: "\u{1F9D9}" },
  2048: { name: "Dragon", emoji: "\u{1F409}" },
  4096: { name: "Phoenix", emoji: "\u{1F525}" },
};
