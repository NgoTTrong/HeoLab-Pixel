import {
  CellState,
  Difficulty,
  MinesweeperState,
  DIFFICULTIES,
} from "./types";

function deepCopyBoard(board: CellState[][]): CellState[][] {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

let revealCounter = 0;

export function createBoard(difficulty: Difficulty): MinesweeperState {
  revealCounter = 0;
  const { rows, cols, mines } = DIFFICULTIES[difficulty];
  const board: CellState[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
      revealOrder: -1,
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
  const startCell = board[row][col];
  if (startCell.isRevealed || startCell.isFlagged || startCell.isMine) return 0;

  // BFS for staggered reveal animation
  const queue: [number, number][] = [[row, col]];
  startCell.isRevealed = true;
  startCell.revealOrder = revealCounter++;
  let count = 1;

  while (queue.length > 0) {
    const [cr, cc] = queue.shift()!;
    const current = board[cr][cc];

    if (current.adjacentMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          const neighbor = board[nr][nc];
          if (neighbor.isRevealed || neighbor.isFlagged || neighbor.isMine) continue;
          neighbor.isRevealed = true;
          neighbor.revealOrder = revealCounter++;
          count++;
          queue.push([nr, nc]);
        }
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

  revealCounter = 0;
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
    cell.revealOrder = revealCounter++;
    // Reveal all mines with stagger
    for (let r = 0; r < newState.rows; r++) {
      for (let c = 0; c < newState.cols; c++) {
        if (newBoard[r][c].isMine && !newBoard[r][c].isRevealed) {
          newBoard[r][c].isRevealed = true;
          newBoard[r][c].revealOrder = revealCounter++;
        }
      }
    }
    return { ...newState, gameState: "lost" };
  }

  // BFS flood fill with staggered reveal
  const revealed = floodFill(newBoard, newState.rows, newState.cols, row, col);
  newState.revealedCount += revealed;

  if (checkWin(newState)) {
    return { ...newState, gameState: "won" };
  }

  return newState;
}

export function chord(
  state: MinesweeperState,
  row: number,
  col: number
): MinesweeperState {
  if (state.gameState !== "playing") return state;

  const cell = state.board[row][col];
  if (!cell.isRevealed || cell.isMine || cell.adjacentMines === 0) return state;

  revealCounter = 0;

  // Count adjacent flags
  let flagCount = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
        if (state.board[nr][nc].isFlagged) flagCount++;
      }
    }
  }

  // Only chord if flag count matches the number
  if (flagCount !== cell.adjacentMines) return state;

  const newBoard = deepCopyBoard(state.board);
  let newState = { ...state, board: newBoard };
  let hitMine = false;

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= newState.rows || nc < 0 || nc >= newState.cols) continue;
      const neighbor = newBoard[nr][nc];
      if (neighbor.isRevealed || neighbor.isFlagged) continue;

      if (neighbor.isMine) {
        hitMine = true;
        // Reveal all mines
        for (let r = 0; r < newState.rows; r++) {
          for (let c = 0; c < newState.cols; c++) {
            if (newBoard[r][c].isMine) newBoard[r][c].isRevealed = true;
          }
        }
      } else {
        const revealed = floodFill(newBoard, newState.rows, newState.cols, nr, nc);
        newState.revealedCount += revealed;
      }
    }
  }

  if (hitMine) {
    return { ...newState, gameState: "lost" };
  }

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
