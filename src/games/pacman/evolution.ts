import type { Direction, Position, Ghost, CellType } from "./types";
import { isWalkable } from "./ghost-ai";
import { EVOLUTION_TIERS, EVOLUTION_FORGET_RATE } from "./config";

const DIR_VECTORS: Record<Direction, Position> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const DIRECTIONS: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];
const OPPOSITE: Record<Direction, Direction> = {
  UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT",
};

/** Get evolution tier based on current level. */
export function getEvolutionTier(level: number): "basic" | "aware" | "evolved" {
  if (level >= EVOLUTION_TIERS.evolved.minLevel) return "evolved";
  if (level >= EVOLUTION_TIERS.aware.minLevel) return "aware";
  return "basic";
}

/** Record pac-man's turn decision at an intersection. */
export function recordTurn(
  history: Record<string, Direction[]>,
  pos: Position,
  approachDir: Direction,
  chosenDir: Direction,
  maze: CellType[][],
): Record<string, Direction[]> {
  // Only record at intersections (3+ valid exits)
  const exits = countExits(pos, maze);
  if (exits < 3) return history;

  const key = `${pos.x},${pos.y},${approachDir}`;
  const newHistory = { ...history };
  const arr = newHistory[key] ? [...newHistory[key]] : [];
  arr.push(chosenDir);
  if (arr.length > 20) arr.shift(); // cap per key
  newHistory[key] = arr;
  return newHistory;
}

/** Count walkable exits from a position (for pac-man, not ghost). */
function countExits(pos: Position, maze: CellType[][]): number {
  let count = 0;
  for (const dir of DIRECTIONS) {
    const v = DIR_VECTORS[dir];
    const nx = ((pos.x + v.x) % 28 + 28) % 28;
    const ny = pos.y + v.y;
    if (isWalkable(nx, ny, maze, false, false)) count++;
  }
  return count;
}

/**
 * Get predicted direction pac-man will take at a given position.
 * Returns null if no prediction available (not enough data).
 */
export function predictTurn(
  history: Record<string, Direction[]>,
  pos: Position,
  ghostApproachDir: Direction,
): Direction | null {
  const key = `${pos.x},${pos.y},${ghostApproachDir}`;
  const turns = history[key];
  if (!turns || turns.length < 3) return null;

  // Find most frequent direction
  const counts: Record<string, number> = {};
  for (const d of turns) counts[d] = (counts[d] || 0) + 1;
  let best: Direction = turns[0];
  let bestCount = 0;
  for (const [dir, cnt] of Object.entries(counts)) {
    if (cnt > bestCount) { best = dir as Direction; bestCount = cnt; }
  }
  return best;
}

/**
 * Modify ghost target based on evolution prediction.
 * Returns overridden target position, or null to use default AI.
 */
export function getEvolvedTarget(
  ghost: Ghost,
  pacman: Position,
  pacDir: Direction,
  tier: "basic" | "aware" | "evolved",
  history: Record<string, Direction[]>,
  maze: CellType[][],
): Position | null {
  if (tier === "basic") return null;
  if (ghost.mode !== "chase") return null;

  const chance = EVOLUTION_TIERS[tier].predictionChance;
  if (Math.random() > chance) return null;

  // Compute approach direction from ghost to pac-man
  const dx = pacman.x - ghost.pos.x;
  const dy = pacman.y - ghost.pos.y;
  const approachDir: Direction =
    Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? "RIGHT" : "LEFT")
      : (dy > 0 ? "DOWN" : "UP");

  const predicted = predictTurn(history, pacman, approachDir);
  if (!predicted) return null;

  // Target the tile pac-man is predicted to move toward (4 tiles ahead)
  const v = DIR_VECTORS[predicted];
  return { x: pacman.x + v.x * 4, y: pacman.y + v.y * 4 };
}

/**
 * EVOLVED tier: detect if pac-man is in a corridor and coordinate pincer.
 * Returns overridden target for the "pincering" ghost, or null.
 */
export function getPincerTarget(
  ghost: Ghost,
  pacman: Position,
  pacDir: Direction,
  ghosts: Ghost[],
  maze: CellType[][],
): Position | null {
  // Check if pac-man is in a corridor (exactly 2 valid exits)
  const exits = countExits(pacman, maze);
  if (exits !== 2) return null;

  // Find a ghost chasing from behind pac-man
  const behind = OPPOSITE[pacDir];
  const behindVec = DIR_VECTORS[behind];
  const behindPos = { x: pacman.x + behindVec.x * 3, y: pacman.y + behindVec.y * 3 };

  const chasingGhost = ghosts.find(g =>
    g.name !== ghost.name &&
    !g.eatenReturning &&
    g.mode === "chase" &&
    Math.abs(g.pos.x - behindPos.x) <= 2 &&
    Math.abs(g.pos.y - behindPos.y) <= 2
  );

  if (!chasingGhost) return null;

  // This ghost targets ahead of pac-man (other corridor exit)
  const aheadVec = DIR_VECTORS[pacDir];
  return { x: pacman.x + aheadVec.x * 5, y: pacman.y + aheadVec.y * 5 };
}

/** On death: forget a portion of learning data. */
export function forgetHistory(
  history: Record<string, Direction[]>,
): Record<string, Direction[]> {
  const keys = Object.keys(history);
  const removeCount = Math.ceil(keys.length * EVOLUTION_FORGET_RATE);
  if (removeCount === 0) return history;

  const newHistory = { ...history };
  for (let i = 0; i < removeCount && i < keys.length; i++) {
    delete newHistory[keys[i]];
  }
  return newHistory;
}
