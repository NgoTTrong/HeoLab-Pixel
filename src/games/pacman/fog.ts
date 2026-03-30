import type { Position } from "./types";
import { FOG_POWER_RADIUS, FOG_FADE_RANGE } from "./config";

/** Calculate distance between two positions. */
function dist(a: Position, b: Position): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Update visited array after pac-man moves. */
export function updateVisited(
  visited: boolean[][],
  pacman: Position,
): boolean[][] {
  const newVisited = visited.map(row => [...row]);
  newVisited[pacman.y][pacman.x] = true;
  return newVisited;
}

/** Create empty visited array for maze dimensions. */
export function createVisited(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(false));
}

/**
 * Get opacity for a cell based on fog of war state.
 * Returns: 1.0 (fully visible), 0-1 (fade zone),
 *          visitedOpacity (visited but out of range), 0 (hidden).
 */
export function getCellOpacity(
  cellX: number,
  cellY: number,
  pacman: Position,
  visRadius: number,
  visited: boolean[][],
  visitedOpacity: number,
): number {
  const d = dist({ x: cellX, y: cellY }, pacman);

  if (d <= visRadius) return 1.0;
  if (d <= visRadius + FOG_FADE_RANGE) {
    // Gradient fade from 1.0 to visitedOpacity
    const t = (d - visRadius) / FOG_FADE_RANGE;
    return 1.0 - t * (1.0 - visitedOpacity);
  }
  if (visited[cellY]?.[cellX]) return visitedOpacity;
  return 0;
}

/**
 * Calculate current visibility radius, factoring in power pellet
 * and combo vision boost effects.
 */
export function getVisRadius(
  baseRadius: number,
  frightenedTimeLeft: number,
  visionBoostTicks: number,
): number {
  let r = baseRadius;
  if (frightenedTimeLeft > 0) r = FOG_POWER_RADIUS;
  if (visionBoostTicks > 0) r += 2;
  return r;
}

/**
 * Find the closest ghost distance to pac-man (for proximity audio).
 * Returns the distance to the nearest non-eaten ghost.
 */
export function getClosestGhostDistance(
  pacman: Position,
  ghosts: { pos: Position; mode: string; eatenReturning: boolean }[],
): number {
  let minDist = Infinity;
  for (const g of ghosts) {
    if (g.eatenReturning || g.mode === "eaten") continue;
    const d = dist(pacman, g.pos);
    if (d < minDist) minDist = d;
  }
  return minDist;
}
