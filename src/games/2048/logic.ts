import { TileData, GridState, GameState2048 } from "./types";

let nextId = 1;

function newTile(value: number): TileData {
  return { value, id: nextId++ };
}

function emptyGrid(): GridState {
  return Array.from({ length: 4 }, () => Array(4).fill(null));
}

function cloneGrid(grid: GridState): GridState {
  return grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function addRandomTile(grid: GridState): GridState {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const g = cloneGrid(grid);
  g[r][c] = newTile(Math.random() < 0.9 ? 2 : 4);
  return g;
}

export function createGame(): GameState2048 {
  nextId = 1;
  let grid = emptyGrid();
  grid = addRandomTile(grid);
  grid = addRandomTile(grid);
  return { grid, score: 0, gameOver: false, won: false };
}

// Rotate grid 90 degrees clockwise n times
function rotateGrid(grid: GridState, times: number): GridState {
  let g = cloneGrid(grid);
  for (let t = 0; t < times % 4; t++) {
    const rotated = emptyGrid();
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        rotated[c][3 - r] = g[r][c];
      }
    }
    g = rotated;
  }
  return g;
}

function compressRow(row: (TileData | null)[]): {
  newRow: (TileData | null)[];
  scored: number;
  moved: boolean;
} {
  // Filter out nulls
  const tiles = row.filter((t): t is TileData => t !== null);
  const result: TileData[] = [];
  let scored = 0;
  let i = 0;

  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i].value === tiles[i + 1].value) {
      const mergedValue = tiles[i].value * 2;
      result.push(newTile(mergedValue));
      scored += mergedValue;
      i += 2;
    } else {
      result.push(tiles[i]);
      i++;
    }
  }

  // Pad with nulls
  const newRow: (TileData | null)[] = [...result];
  while (newRow.length < 4) newRow.push(null);

  // Check if row changed
  const moved = row.some((cell, idx) => {
    const newCell = newRow[idx];
    if (!cell && !newCell) return false;
    if (!cell || !newCell) return true;
    return cell.value !== newCell.value || cell.id !== newCell.id;
  });

  return { newRow, scored, moved };
}

export type Direction = "up" | "down" | "left" | "right";

const rotations: Record<Direction, number> = {
  left: 0,
  down: 1,
  right: 2,
  up: 3,
};

const reverseRotations: Record<Direction, number> = {
  left: 0,
  down: 3,
  right: 2,
  up: 1,
};

export function move(state: GameState2048, direction: Direction): GameState2048 {
  if (state.gameOver) return state;

  // Rotate so we always compress left
  let grid = rotateGrid(state.grid, rotations[direction]);

  let totalScored = 0;
  let anyMoved = false;

  const newGrid = emptyGrid();
  for (let r = 0; r < 4; r++) {
    const { newRow, scored, moved } = compressRow(grid[r]);
    newGrid[r] = newRow;
    totalScored += scored;
    if (moved) anyMoved = true;
  }

  if (!anyMoved) return state;

  // Rotate back
  let finalGrid = rotateGrid(newGrid, reverseRotations[direction]);

  // Add random tile
  finalGrid = addRandomTile(finalGrid);

  const newScore = state.score + totalScored;

  // Check won
  let won = state.won;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (finalGrid[r][c] && finalGrid[r][c]!.value >= 2048) {
        won = true;
      }
    }
  }

  // Check game over
  const gameOver = !canMove(finalGrid);

  return { grid: finalGrid, score: newScore, gameOver, won };
}

function canMove(grid: GridState): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) return true;
      const val = grid[r][c]!.value;
      // Check right neighbor
      if (c < 3 && grid[r][c + 1] && grid[r][c + 1]!.value === val) return true;
      // Check bottom neighbor
      if (r < 3 && grid[r + 1][c] && grid[r + 1][c]!.value === val) return true;
    }
  }
  return false;
}
