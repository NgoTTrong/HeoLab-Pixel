import type { Ghost, Position, Direction, CellType } from "./types";

// Maze dimensions (classic Pac-Man: 28x31)
const MAZE_WIDTH = 28;
const MAZE_HEIGHT = 31;

// Ghost house entrance (the gate tiles are at row 12, cols 13-14)
// Target for eaten ghosts returning home
const GHOST_GATE: Position = { x: 13, y: 12 };

// Scatter corner targets for each ghost
const SCATTER_TARGETS: Record<string, Position> = {
  blinky: { x: 25, y: 0 },  // top-right
  pinky: { x: 2, y: 0 },    // top-left
  inky: { x: 27, y: 30 },   // bottom-right
  clyde: { x: 0, y: 30 },   // bottom-left
};

// Direction vectors
const DIR_VECTORS: Record<Direction, Position> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

// Opposite directions (ghosts cannot reverse)
const OPPOSITE: Record<Direction, Direction> = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

// Classic Pac-Man tiebreaker priority: UP > LEFT > DOWN > RIGHT
const DIR_PRIORITY: Direction[] = ["UP", "LEFT", "DOWN", "RIGHT"];

/** Euclidean distance squared (no need for sqrt when comparing). */
function distSq(a: Position, b: Position): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

/** Check if a position is walkable for the given entity. */
export function isWalkable(
  x: number,
  y: number,
  maze: CellType[][],
  isGhost: boolean,
  isEaten: boolean,
): boolean {
  // Handle tunnel wrapping
  if (y < 0 || y >= MAZE_HEIGHT) return false;

  // Wrap x for tunnel
  const wx = ((x % MAZE_WIDTH) + MAZE_WIDTH) % MAZE_WIDTH;

  const cell = maze[y][wx];

  // Walls are never walkable
  if (cell === 1) return false;

  // Ghost gate: only walkable by eaten ghosts returning, or ghosts inside leaving
  if (cell === 6) {
    return isGhost && isEaten;
  }

  // Ghost house interior: only walkable by ghosts
  if (cell === 4) {
    return isGhost;
  }

  // Path (0), dot (2), power-pellet (3), tunnel (5) are all walkable
  return true;
}

/** Get the target tile for a ghost based on its name and current mode. */
export function getGhostTarget(
  ghost: Ghost,
  pacman: Position,
  pacDir: Direction,
  blinky: Ghost,
): Position {
  // Eaten mode: head back to the ghost gate
  if (ghost.mode === "eaten" || ghost.eatenReturning) {
    return GHOST_GATE;
  }

  // Scatter mode: go to assigned corner
  if (ghost.mode === "scatter") {
    return ghost.scatterTarget;
  }

  // Frightened mode doesn't use targeting (random direction chosen instead)
  // but return a dummy target just in case
  if (ghost.mode === "frightened") {
    return { x: 0, y: 0 };
  }

  // Chase mode: each ghost has unique targeting
  switch (ghost.name) {
    case "blinky":
      // Blinky targets Pac-Man's exact position
      return { x: pacman.x, y: pacman.y };

    case "pinky": {
      // Pinky targets 4 tiles ahead of Pac-Man
      const vec = DIR_VECTORS[pacDir];
      return {
        x: pacman.x + vec.x * 4,
        y: pacman.y + vec.y * 4,
      };
    }

    case "inky": {
      // Inky: take tile 2 ahead of Pac-Man, vector from Blinky to that tile, double it
      const vec = DIR_VECTORS[pacDir];
      const ahead: Position = {
        x: pacman.x + vec.x * 2,
        y: pacman.y + vec.y * 2,
      };
      return {
        x: ahead.x + (ahead.x - blinky.pos.x),
        y: ahead.y + (ahead.y - blinky.pos.y),
      };
    }

    case "clyde": {
      // Clyde: if distance > 8 tiles, chase Pac-Man; else scatter
      const dist = Math.sqrt(distSq(ghost.pos, pacman));
      if (dist > 8) {
        return { x: pacman.x, y: pacman.y };
      }
      return ghost.scatterTarget;
    }

    default:
      return { x: pacman.x, y: pacman.y };
  }
}

/**
 * Choose the best direction at an intersection toward the target.
 * Ghost cannot reverse direction.
 * Among valid directions, pick the one whose next tile is closest to the target.
 * Tiebreaker: UP > LEFT > DOWN > RIGHT.
 */
export function chooseDirection(
  ghost: Ghost,
  target: Position,
  maze: CellType[][],
): Direction {
  const isEaten = ghost.mode === "eaten" || ghost.eatenReturning;
  let bestDir: Direction = ghost.dir;
  let bestDist = Infinity;

  for (const dir of DIR_PRIORITY) {
    // Cannot reverse
    if (dir === OPPOSITE[ghost.dir]) continue;

    const vec = DIR_VECTORS[dir];
    let nx = ghost.pos.x + vec.x;
    const ny = ghost.pos.y + vec.y;

    // Wrap x for tunnel
    nx = ((nx % MAZE_WIDTH) + MAZE_WIDTH) % MAZE_WIDTH;

    if (!isWalkable(nx, ny, maze, true, isEaten)) continue;

    const d = distSq({ x: nx, y: ny }, target);
    if (d < bestDist) {
      bestDist = d;
      bestDir = dir;
    }
  }

  return bestDir;
}

/**
 * Frightened mode: choose a random valid direction at each intersection.
 * Ghost still cannot reverse.
 */
export function chooseFrightenedDirection(
  ghost: Ghost,
  maze: CellType[][],
): Direction {
  const validDirs: Direction[] = [];

  for (const dir of DIR_PRIORITY) {
    if (dir === OPPOSITE[ghost.dir]) continue;

    const vec = DIR_VECTORS[dir];
    let nx = ghost.pos.x + vec.x;
    const ny = ghost.pos.y + vec.y;

    nx = ((nx % MAZE_WIDTH) + MAZE_WIDTH) % MAZE_WIDTH;

    if (isWalkable(nx, ny, maze, true, false)) {
      validDirs.push(dir);
    }
  }

  if (validDirs.length === 0) {
    // If no valid direction (shouldn't happen normally), reverse
    return OPPOSITE[ghost.dir];
  }

  return validDirs[Math.floor(Math.random() * validDirs.length)];
}

/**
 * Move ghost one tile in its current direction.
 * Handles tunnel wrapping.
 */
export function moveGhost(ghost: Ghost, maze: CellType[][]): Position {
  const vec = DIR_VECTORS[ghost.dir];
  let nx = ghost.pos.x + vec.x;
  const ny = ghost.pos.y + vec.y;

  // Tunnel wrapping: when ghost reaches edge, wrap to other side
  if (nx < 0) {
    nx = MAZE_WIDTH - 1;
  } else if (nx >= MAZE_WIDTH) {
    nx = 0;
  }

  const isEaten = ghost.mode === "eaten" || ghost.eatenReturning;

  // Only move if the target tile is walkable
  if (isWalkable(nx, ny, maze, true, isEaten)) {
    return { x: nx, y: ny };
  }

  // If not walkable, stay in place
  return { x: ghost.pos.x, y: ghost.pos.y };
}
