export interface CellState {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
  revealOrder: number; // for staggered reveal animation
}

export type Difficulty = "easy" | "medium" | "hard";
export type GameState = "playing" | "won" | "lost";

export interface MinesweeperState {
  board: CellState[][];
  rows: number;
  cols: number;
  mines: number;
  gameState: GameState;
  flagCount: number;
  revealedCount: number;
  firstClick: boolean;
}

export const DIFFICULTIES: Record<
  Difficulty,
  { rows: number; cols: number; mines: number }
> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
};
