import {
  CellState,
  Difficulty,
  MinesweeperState,
  DIFFICULTIES,
} from "./types";

function deepCopyBoard(board: CellState[][]): CellState[][] {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

export function createBoard(difficulty: Difficulty): MinesweeperState {
  const { rows, cols, mines } = DIFFICULTIES[difficulty];
  const board: CellState[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    }))
  );
  return {
    board,
    rows,
    cols,
    mines,
    gameState: "playing",
    flagCount: 0,
    revealedCount: 0,
    firstClick: true,
  };
}

function placeMines(
  board: CellState[][],
  rows: number,
  cols: number,
  mines: number,
  safeRow: number,
  safeCol: number
): void {
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    // Skip 3x3 area around safe cell
    if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
    if (board[r][c].isMine) continue;
    board[r][c].isMine = true;
    placed++;
  }
  // Calculate adjacent mines
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) {
            count++;
          }
        }
      }
      board[r][c].adjacentMines = count;
    }
  }
}

function floodFill(
  board: CellState[][],
  rows: number,
  cols: number,
  row: number,
  col: number
): number {
  if (row < 0 || row >= rows || col < 0 || col >= cols) return 0;
  const cell = board[row][col];
  if (cell.isRevealed || cell.isFlagged || cell.isMine) return 0;

  cell.isRevealed = true;
  let count = 1;

  if (cell.adjacentMines === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        count += floodFill(board, rows, cols, row + dr, col + dc);
      }
    }
  }
  return count;
}

function checkWin(state: MinesweeperState): boolean {
  return state.revealedCount === state.rows * state.cols - state.mines;
}

export function reveal(
  state: MinesweeperState,
  row: number,
  col: number
): MinesweeperState {
  if (state.gameState !== "playing") return state;

  const newBoard = deepCopyBoard(state.board);
  let newState = { ...state, board: newBoard };

  // First click: place mines avoiding the clicked area
  if (newState.firstClick) {
    placeMines(newBoard, newState.rows, newState.cols, newState.mines, row, col);
    newState.firstClick = false;
  }

  const cell = newBoard[row][col];
  if (cell.isRevealed || cell.isFlagged) return newState;

  // Hit a mine
  if (cell.isMine) {
    cell.isRevealed = true;
    // Reveal all mines
    for (let r = 0; r < newState.rows; r++) {
      for (let c = 0; c < newState.cols; c++) {
        if (newBoard[r][c].isMine) {
          newBoard[r][c].isRevealed = true;
        }
      }
    }
    return { ...newState, gameState: "lost" };
  }

  // Flood fill
  const revealed = floodFill(newBoard, newState.rows, newState.cols, row, col);
  newState.revealedCount += revealed;

  if (checkWin(newState)) {
    return { ...newState, gameState: "won" };
  }

  return newState;
}

export function toggleFlag(
  state: MinesweeperState,
  row: number,
  col: number
): MinesweeperState {
  if (state.gameState !== "playing") return state;

  const cell = state.board[row][col];
  if (cell.isRevealed) return state;

  const newBoard = deepCopyBoard(state.board);
  const target = newBoard[row][col];
  target.isFlagged = !target.isFlagged;

  return {
    ...state,
    board: newBoard,
    flagCount: state.flagCount + (target.isFlagged ? 1 : -1),
  };
}
