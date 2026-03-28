export interface TimeTheme {
  id: string;
  label: string;
  skyTop: string;
  skyBottom: string;
  groundColor: string;
  hours: number[]; // 24h values that map to this theme
}

export interface ObstacleTheme {
  minScore: number;
  label: string;
  color: string;
  capColor: string;
}

export interface Medal {
  minScore: number;
  label: string;
  color: string;
  emoji: string;
}

export const TIME_THEMES: TimeTheme[] = [
  {
    id: "dawn",
    label: "DAWN",
    skyTop: "#1a1a4e",
    skyBottom: "#ff7043",
    groundColor: "#5d4037",
    hours: [5, 6, 7],
  },
  {
    id: "day",
    label: "DAY",
    skyTop: "#4a90d9",
    skyBottom: "#87ceeb",
    groundColor: "#8b7355",
    hours: [8,9,10,11,12,13,14,15,16],
  },
  {
    id: "dusk",
    label: "DUSK",
    skyTop: "#1a1a2e",
    skyBottom: "#ff5722",
    groundColor: "#6d4c41",
    hours: [17, 18, 19],
  },
  {
    id: "night",
    label: "NIGHT",
    skyTop: "#0a0a0a",
    skyBottom: "#0a0a2e",
    groundColor: "#1a1a2e",
    hours: [20,21,22,23,0,1,2,3,4],
  },
];

export const OBSTACLE_THEMES: ObstacleTheme[] = [
  { minScore: 0,  label: "PIPES",    color: "#2d7a2d", capColor: "#3d9e3d" },
  { minScore: 10, label: "CITY",     color: "#374151", capColor: "#4b5563" },
  { minScore: 20, label: "ROCKETS",  color: "#7f1d1d", capColor: "#ff2d95" },
];

export const MEDALS: Medal[] = [
  { minScore: 40, label: "PLATINUM", color: "#00d4ff", emoji: "💎" },
  { minScore: 20, label: "GOLD",     color: "#ffe600", emoji: "🥇" },
  { minScore: 10, label: "SILVER",   color: "#aaaaaa", emoji: "🥈" },
  { minScore: 5,  label: "BRONZE",   color: "#cd7f32", emoji: "🥉" },
];

export function getTimeTheme(): TimeTheme {
  const hour = new Date().getHours();
  return TIME_THEMES.find((t) => t.hours.includes(hour)) ?? TIME_THEMES[1];
}

export function getObstacleTheme(score: number): ObstacleTheme {
  let theme = OBSTACLE_THEMES[0];
  for (const t of OBSTACLE_THEMES) {
    if (score >= t.minScore) theme = t;
  }
  return theme;
}

export function getMedal(score: number): Medal | null {
  for (const m of MEDALS) {
    if (score >= m.minScore) return m;
  }
  return null;
}

// Physics constants
export const GRAVITY = 0.5;
export const FLAP_IMPULSE = -9;
export const PIPE_WIDTH = 52;
export const PIPE_GAP = 155;
export const PIPE_SPEED = 3;
export const PIPE_INTERVAL = 90; // frames between pipes
export const GROUND_HEIGHT = 60;
