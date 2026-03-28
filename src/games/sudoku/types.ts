export type Difficulty = "easy" | "medium" | "hard";

export type SudokuBoard = number[][]; // 9x9, 0 = empty
export type SudokuNotes = Set<number>[][]; // pencil marks

export interface SudokuState {
  puzzle: SudokuBoard; // original (immutable clues)
  board: SudokuBoard; // current player board
  solution: SudokuBoard; // full solution
  notes: SudokuNotes;
  selected: [number, number] | null;
  errors: Set<string>; // "r,c" keys for wrong placements
  difficulty: Difficulty;
  hintsLeft: number;
  runeMode: boolean;
  completed: boolean;
}

// index 0 is empty, 1-9 are Elder Futhark runes
export const RUNES: string[] = [
  "",
  "\u16A0", // 1 = ᚠ
  "\u16A2", // 2 = ᚢ
  "\u16A6", // 3 = ᚦ
  "\u16A8", // 4 = ᚨ
  "\u16B1", // 5 = ᚱ
  "\u16B2", // 6 = ᚲ
  "\u16B7", // 7 = ᚷ
  "\u16B9", // 8 = ᚹ
  "\u16BE", // 9 = ᚾ
];

export const DIFFICULTY_REMOVES: Record<Difficulty, number> = {
  easy: 30,
  medium: 40,
  hard: 55,
};
