// src/games/drift/types.ts

// -- Road Geometry --------------------------------------------------
export interface Segment {
  index: number;
  /** cumulative Z distance from track start */
  z: number;
  /** horizontal curve factor (-1 left ... +1 right) */
  curve: number;
  /** vertical hill factor (-1 down ... +1 up) */
  hill: number;
  /** projected screen coordinates (computed each frame) */
  screen: { x: number; y: number; w: number; scale: number };
}

export interface TrackDef {
  name: string;
  slug: string;
  difficulty: "easy" | "medium" | "hard";
  /** total segments per lap */
  length: number;
  /** function that returns curve/hill for segment index */
  build: () => Pick<Segment, "curve" | "hill">[];
  /** visual theme */
  palette: TrackPalette;
  /** roadside sprite set key */
  scenery: "city" | "mountain" | "desert" | "cyber";
}

export interface TrackPalette {
  sky1: string;        // sky gradient top
  sky2: string;        // sky gradient bottom
  road1: string;       // road stripe A
  road2: string;       // road stripe B
  grass1: string;      // ground stripe A
  grass2: string;      // ground stripe B
  rumble1: string;     // rumble strip A
  rumble2: string;     // rumble strip B
  lane: string;        // lane marking color
  fog: string;         // distance fog color
}

// -- Cars -----------------------------------------------------------
export interface CarDef {
  name: string;
  slug: string;
  /** 1-5 ratings */
  speed: number;
  drift: number;
  boost: number;
  handling: number;
  /** base color for programmatic sprite */
  bodyColor: string;
  accentColor: string;
}

// -- Power-ups ------------------------------------------------------
export type PowerUpType = "nitro" | "shield" | "oil" | "magnet";

export interface PowerUpDef {
  type: PowerUpType;
  emoji: string;
  color: string;
  /** duration in ms (0 = instant) */
  duration: number;
}

export interface PowerUpInstance {
  type: PowerUpType;
  /** Z position on track */
  segmentIndex: number;
  /** lateral offset (-1 left ... +1 right) */
  lane: number;
  collected: boolean;
}

// -- Game State -----------------------------------------------------
export type GameStatus = "menu" | "countdown" | "racing" | "finished" | "paused";
export type GameMode = "timeAttack" | "race";

export interface DriftState {
  active: boolean;
  /** direction: -1 left, 1 right */
  direction: number;
  /** accumulated charge in ms */
  chargeMs: number;
  /** current level 0 | 1 | 2 | 3 */
  level: number;
}

export interface BoostState {
  active: boolean;
  /** remaining ms */
  remainingMs: number;
  /** speed multiplier */
  multiplier: number;
}

export interface PlayerState {
  /** lateral position on road (-1 left edge ... +1 right edge) */
  x: number;
  /** current speed (0 ... maxSpeed) */
  speed: number;
  /** Z position (segment index, fractional) */
  z: number;
  /** car visual angle for sprite (-3 ... +3) */
  spriteAngle: number;
  drift: DriftState;
  boost: BoostState;
  /** held power-up (null if none) */
  powerUp: PowerUpType | null;
  /** active shield remaining ms */
  shieldMs: number;
  /** active magnet remaining ms */
  magnetMs: number;
  /** is currently spinning out from collision */
  spinOut: boolean;
  spinOutMs: number;
}

export interface AIDriver {
  x: number;
  speed: number;
  z: number;
  carIndex: number;
  /** simple state for rubber-banding */
  targetSpeed: number;
}

export interface GameState {
  status: GameStatus;
  mode: GameMode;
  trackIndex: number;
  carIndex: number;
  /** pre-built segment array for current track */
  segments: Segment[];
  player: PlayerState;
  ai: AIDriver[];
  /** current lap (1-based) */
  lap: number;
  totalLaps: number;
  /** race position (1-4) */
  position: number;
  /** elapsed time in ms */
  elapsedMs: number;
  /** lap times in ms */
  lapTimes: number[];
  /** best time from localStorage (Time Attack) */
  bestTime: number | null;
  /** ghost replay data (Time Attack) */
  ghostZ: number[];
  /** power-up instances on track */
  powerUps: PowerUpInstance[];
  /** oil slicks dropped on road */
  oilSlicks: { segmentIndex: number; lane: number; remainingMs: number }[];
  /** countdown value (3,2,1,GO) */
  countdown: number;
  /** drift score bonus accumulated */
  driftScore: number;
  /** final score (Race mode) */
  score: number;
  /** ghost recording of player Z for replay */
  ghostRecording: number[];
  /** player input state */
  steerDir: number;
  /** last non-zero steer direction — used to set drift direction when steerDir is 0 */
  lastSteerDir: number;
  accelPressed: boolean;
  brakePressed: boolean;
}

// -- Actions --------------------------------------------------------
export type GameAction =
  | { type: "INIT"; mode: GameMode; trackIndex: number; carIndex: number; bestTime: number | null; ghostZ?: number[] }
  | { type: "COUNTDOWN_TICK" }
  | { type: "TICK"; dt: number }
  | { type: "STEER"; direction: number }       // -1 left, 0 center, +1 right
  | { type: "ACCELERATE"; pressed: boolean }
  | { type: "BRAKE"; pressed: boolean }
  | { type: "DRIFT_START" }
  | { type: "DRIFT_END" }
  | { type: "USE_POWERUP" }
  | { type: "PAUSE" }
  | { type: "RESUME" };
