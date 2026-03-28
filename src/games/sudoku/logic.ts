import {
  Difficulty,
  SudokuBoard,
  SudokuNotes,
  SudokuState,
  DIFFICULTY_REMOVES,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyBoard(): SudokuBoard {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function emptyNotes(): SudokuNotes {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set<number>())
  );
}

function cloneBoard(b: SudokuBoard): SudokuBoard {
  return b.map((row) => [...row]);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Check whether placing `num` at (row, col) is valid. */
function isValid(board: SudokuBoard, row: number, col: number, num: number): boolean {
  // Row check
  for (let c = 0; c < 9; c++) {
    if (board[row][c] === num) return false;
  }

  // Column check
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === num) return false;
  }

  // 3x3 box check
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Generator: backtracking with randomised number order
// ---------------------------------------------------------------------------

function fillBoard(board: SudokuBoard): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;

      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const n of nums) {
        if (isValid(board, r, c, n)) {
          board[r][c] = n;
          if (fillBoard(board)) return true;
          board[r][c] = 0;
        }
      }
      return false; // trigger backtrack
    }
  }
  return true; // board complete
}

/** Generate a fully solved 9x9 board. */
export function generateSolution(): SudokuBoard {
  const board = emptyBoard();
  fillBoard(board);
  return board;
}

/** Remove `count` cells from a solved board to create a puzzle. */
export function createPuzzle(solution: SudokuBoard, difficulty: Difficulty): SudokuBoard {
  const puzzle = cloneBoard(solution);
  const count = DIFFICULTY_REMOVES[difficulty];
  const cells = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number])
  );

  let removed = 0;
  for (const [r, c] of cells) {
    if (removed >= count) break;
    puzzle[r][c] = 0;
    removed++;
  }

  return puzzle;
}

// ---------------------------------------------------------------------------
// State factory
// ---------------------------------------------------------------------------

export function createSudoku(difficulty: Difficulty): SudokuState {
  const solution = generateSolution();
  const puzzle = createPuzzle(solution, difficulty);

  return {
    puzzle: cloneBoard(puzzle),
    board: cloneBoard(puzzle),
    solution,
    notes: emptyNotes(),
    selected: null,
    errors: new Set<string>(),
    difficulty,
    hintsLeft: 3,
    runeMode: true,
    completed: false,
  };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function checkCompletion(board: SudokuBoard, solution: SudokuBoard): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

/** Place a number at the selected cell. Returns new state. */
export function placeNumber(state: SudokuState, num: number): SudokuState {
  const { selected, puzzle, board, solution, notes, errors } = state;
  if (!selected || state.completed) return state;

  const [r, c] = selected;

  // Cannot overwrite original clues
  if (puzzle[r][c] !== 0) return state;

  const newBoard = cloneBoard(board);
  newBoard[r][c] = num;

  // Clone notes and clear notes for this cell
  const newNotes: SudokuNotes = notes.map((row) => row.map((s) => new Set(s)));
  newNotes[r][c].clear();

  // Error tracking
  const newErrors = new Set(errors);
  const key = `${r},${c}`;
  if (num !== 0 && num !== solution[r][c]) {
    newErrors.add(key);
  } else {
    newErrors.delete(key);
  }

  const completed = num !== 0 && checkCompletion(newBoard, solution);

  return {
    ...state,
    board: newBoard,
    notes: newNotes,
    errors: newErrors,
    completed,
  };
}

/** Toggle a pencil-mark note at the selected cell. */
export function toggleNote(state: SudokuState, num: number): SudokuState {
  const { selected, puzzle, board, notes } = state;
  if (!selected || state.completed) return state;

  const [r, c] = selected;
  if (puzzle[r][c] !== 0) return state;

  const newBoard = cloneBoard(board);
  // Clear cell value when entering note mode
  newBoard[r][c] = 0;

  const newNotes: SudokuNotes = notes.map((row) => row.map((s) => new Set(s)));
  if (newNotes[r][c].has(num)) {
    newNotes[r][c].delete(num);
  } else {
    newNotes[r][c].add(num);
  }

  // Remove error since cell is now empty
  const newErrors = new Set(state.errors);
  newErrors.delete(`${r},${c}`);

  return {
    ...state,
    board: newBoard,
    notes: newNotes,
    errors: newErrors,
  };
}

/** Reveal the solution value at the selected cell. */
export function useHint(state: SudokuState): SudokuState {
  const { selected, puzzle, solution, board, notes, hintsLeft } = state;
  if (!selected || hintsLeft <= 0 || state.completed) return state;

  const [r, c] = selected;
  if (puzzle[r][c] !== 0) return state; // already a clue

  const newBoard = cloneBoard(board);
  newBoard[r][c] = solution[r][c];

  const newNotes: SudokuNotes = notes.map((row) => row.map((s) => new Set(s)));
  newNotes[r][c].clear();

  const newErrors = new Set(state.errors);
  newErrors.delete(`${r},${c}`);

  const completed = checkCompletion(newBoard, solution);

  return {
    ...state,
    board: newBoard,
    notes: newNotes,
    errors: newErrors,
    hintsLeft: hintsLeft - 1,
    completed,
  };
}
