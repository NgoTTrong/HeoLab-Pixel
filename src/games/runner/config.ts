export interface Character {
  id: string;
  emoji: string;
  label: string;
  unlockScore: number;
  color: string;
}

export interface World {
  minScore: number;
  id: string;
  label: string;
  skyColor: string;
  skyColorBottom: string;
  groundColor: string;
  groundStripeColor: string;
  multiplier: number;
}

export interface Obstacle {
  id: string;
  minScore: number;
  emoji: string;
  width: number;
  height: number;
  isFlying: boolean; // pterodactyl-type (jump over or duck under)
}

export const CHARACTERS: Character[] = [
  { id: "dino",  emoji: "🦕", label: "DINO",  unlockScore: 0,    color: "#39ff14" },
  { id: "robot", emoji: "🤖", label: "ROBOT", unlockScore: 500,  color: "#00d4ff" },
  { id: "ninja", emoji: "🥷", label: "NINJA", unlockScore: 1000, color: "#ff2d95" },
];

export const WORLDS: World[] = [
  {
    minScore: 0,    id: "desert", label: "DESERT",
    skyColor: "#87CEEB",  skyColorBottom: "#c8eaf9",
    groundColor: "#c2965a", groundStripeColor: "#d4a96a",
    multiplier: 1.0,
  },
  {
    minScore: 300,  id: "dusk",   label: "DUSK",
    skyColor: "#c0392b",  skyColorBottom: "#f39c12",
    groundColor: "#6d4c41", groundStripeColor: "#8d6e63",
    multiplier: 1.2,
  },
  {
    minScore: 600,  id: "storm",  label: "NIGHT STORM",
    skyColor: "#0d0d1a",  skyColorBottom: "#1a1a2e",
    groundColor: "#2a2a4a", groundStripeColor: "#3a3a5a",
    multiplier: 1.5,
  },
  {
    minScore: 1000, id: "lava",   label: "LAVA WORLD",
    skyColor: "#1a0500",  skyColorBottom: "#3d0a00",
    groundColor: "#7f1d1d", groundStripeColor: "#991f1f",
    multiplier: 2.0,
  },
];

export const OBSTACLES: Obstacle[] = [
  { id: "cactus",  minScore: 0,   emoji: "🌵", width: 36, height: 58, isFlying: false },
  { id: "ptero",   minScore: 100, emoji: "🦅", width: 44, height: 36, isFlying: true  },
  { id: "boulder", minScore: 300, emoji: "🪨", width: 46, height: 46, isFlying: false },
  { id: "lava",    minScore: 600, emoji: "🌋", width: 54, height: 54, isFlying: false },
];

export function getWorld(score: number): World {
  let world = WORLDS[0];
  for (const w of WORLDS) { if (score >= w.minScore) world = w; }
  return world;
}

export function getAvailableObstacles(score: number): Obstacle[] {
  return OBSTACLES.filter((o) => score >= o.minScore);
}

export const GROUND_HEIGHT = 60;
export const GRAVITY = 0.7;
export const JUMP_IMPULSE = -14;
export const BASE_SPEED = 3;
export const MAX_SPEED = 12;
