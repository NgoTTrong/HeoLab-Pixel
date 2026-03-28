export const TILE_SIZE = 72;       // px per tile
export const GAP = 8;              // px gap between tiles
export const PADDING = 12;         // px container padding
export const CONTAINER_SIZE = PADDING * 2 + TILE_SIZE * 4 + GAP * 3; // 336px

export interface MilestoneDef {
  name: string;
  color: string;
  emoji: string;
  glowColor: string;
}

export const MILESTONES: Record<number, MilestoneDef> = {
  512:  { name: "WYRM",    color: "#39ff14", emoji: "✨", glowColor: "rgba(57,255,20,0.7)" },
  1024: { name: "WYVERN",  color: "#ffe600", emoji: "🔥", glowColor: "rgba(255,230,0,0.7)" },
  2048: { name: "DRAGON",  color: "#ff2d95", emoji: "🐉", glowColor: "rgba(255,45,149,0.7)" },
  4096: { name: "ANCIENT", color: "#00d4ff", emoji: "⭐", glowColor: "rgba(0,212,255,0.7)" },
};

/** Returns milestone def for a tile value (4096 applies to all >= 4096) */
export function getMilestone(value: number): MilestoneDef | null {
  if (value >= 4096) return MILESTONES[4096];
  return MILESTONES[value] ?? null;
}
