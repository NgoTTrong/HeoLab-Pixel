// src/games/drift/config.ts
import type { CarDef, PowerUpDef, TrackDef, TrackPalette, Segment } from "./types";

// -- Physics --------------------------------------------------------
export const SEGMENT_LENGTH = 200;    // world units per segment
export const ROAD_WIDTH = 2000;       // road width in world units
export const VISIBLE_SEGMENTS = 300;  // how far ahead to render
export const CAMERA_HEIGHT = 1000;    // camera Y above road
export const CAMERA_DEPTH = 1 / Math.tan((80 / 2) * Math.PI / 180); // FOV 80deg
export const TOTAL_LAPS = 3;

// Speed in segments/second
export const BASE_MAX_SPEED = 200;    // segments/s at rating 3
export const SPEED_PER_RATING = 20;   // extra per speed star
export const ACCEL_RATE = 0.8;        // acceleration per tick (fraction of max)
export const BRAKE_RATE = 1.5;        // braking multiplier
export const OFFROAD_SLOW = 0.65;     // speed multiplier when off road
export const CURVE_SPEED_LOSS = 0.3;  // speed loss multiplier in curves (no drift)

// Drift
export const DRIFT_CHARGE_RATE = 1;         // ms of charge per ms of drifting
export const DRIFT_LEVEL_THRESHOLDS = [0, 2000, 4000]; // ms thresholds for levels 1,2,3
export const DRIFT_BOOST_MULTIPLIERS = [1.4, 1.7, 2.2];  // was [1.3, 1.6, 2.0]
export const DRIFT_BOOST_DURATIONS   = [1000, 1800, 2800]; // was [500, 1000, 1500]
export const DRIFT_STEER_FACTOR = 0.6;      // steering responsiveness while drifting
export const DRIFT_LATERAL_SPEED = 0.003;   // how fast car slides sideways in drift
export const DRIFT_SCORE_PER_SECOND = 50;   // drift score bonus per second

// Collision
export const SPIN_OUT_DURATION = 1000;   // ms of spin-out on collision

// -- Cars -----------------------------------------------------------
export const CARS: CarDef[] = [
  { name: "Neon Striker",   slug: "striker",  speed: 3, drift: 3, boost: 3, handling: 3, bodyColor: "#f97316", accentColor: "#fbbf24" },
  { name: "Drift Phantom",  slug: "phantom",  speed: 2, drift: 5, boost: 4, handling: 2, bodyColor: "#a855f7", accentColor: "#c084fc" },
  { name: "Thunder Bolt",   slug: "bolt",     speed: 5, drift: 2, boost: 2, handling: 3, bodyColor: "#3b82f6", accentColor: "#60a5fa" },
  { name: "Pixel Tank",     slug: "tank",     speed: 2, drift: 3, boost: 5, handling: 4, bodyColor: "#22c55e", accentColor: "#4ade80" },
  { name: "Ghost Racer",    slug: "ghost",    speed: 4, drift: 4, boost: 2, handling: 5, bodyColor: "#06b6d4", accentColor: "#22d3ee" },
];

// -- Tracks ---------------------------------------------------------
const CITY_PALETTE: TrackPalette = {
  sky1: "#0a0020", sky2: "#1a0040",
  road1: "#333333", road2: "#2a2a2a",
  grass1: "#1a1a2e", grass2: "#151525",
  rumble1: "#f97316", rumble2: "#1a1a2e",
  lane: "#ffffff33", fog: "#0a0020",
};

const MOUNTAIN_PALETTE: TrackPalette = {
  sky1: "#0f2027", sky2: "#203a43",
  road1: "#444444", road2: "#3a3a3a",
  grass1: "#1a3a1a", grass2: "#153015",
  rumble1: "#dc2626", rumble2: "#1a3a1a",
  lane: "#ffffff33", fog: "#0f2027",
};

const DESERT_PALETTE: TrackPalette = {
  sky1: "#4a1a00", sky2: "#8b4513",
  road1: "#555555", road2: "#4a4a4a",
  grass1: "#8b6914", grass2: "#7a5c12",
  rumble1: "#f97316", rumble2: "#8b6914",
  lane: "#ffffff33", fog: "#4a1a00",
};

const CYBER_PALETTE: TrackPalette = {
  sky1: "#000011", sky2: "#001133",
  road1: "#1a1a3e", road2: "#15152e",
  grass1: "#000022", grass2: "#00001a",
  rumble1: "#00d4ff", rumble2: "#000022",
  lane: "#00d4ff44", fog: "#000011",
};

export const TRACKS: TrackDef[] = [
  {
    name: "Neon City", slug: "neon-city", difficulty: "easy", length: 300,
    scenery: "city", palette: CITY_PALETTE,
    build: () => buildTrack([
      { len: 30, curve: 0, hill: 0 },
      { len: 20, curve: 0.5, hill: 0 },
      { len: 30, curve: 0, hill: 0 },
      { len: 25, curve: -0.7, hill: 0 },
      { len: 20, curve: 0, hill: 0.3 },
      { len: 25, curve: 0.4, hill: 0 },
      { len: 30, curve: 0, hill: -0.3 },
      { len: 20, curve: -0.5, hill: 0 },
      { len: 30, curve: 0, hill: 0 },
      { len: 25, curve: 0.6, hill: 0 },
      { len: 25, curve: 0, hill: 0 },
      { len: 20, curve: -0.4, hill: 0.2 },
    ]),
  },
  {
    name: "Mountain Pass", slug: "mountain-pass", difficulty: "medium", length: 350,
    scenery: "mountain", palette: MOUNTAIN_PALETTE,
    build: () => buildTrack([
      { len: 20, curve: 0, hill: 0 },
      { len: 30, curve: 0.3, hill: 0.8 },
      { len: 25, curve: 0.6, hill: 0.3 },
      { len: 20, curve: 0, hill: -0.5 },
      { len: 35, curve: -0.8, hill: 0.2 },
      { len: 25, curve: 0, hill: 0.7 },
      { len: 20, curve: 0.5, hill: -0.3 },
      { len: 30, curve: -0.4, hill: -0.6 },
      { len: 25, curve: 0, hill: 0.4 },
      { len: 30, curve: 0.7, hill: 0 },
      { len: 25, curve: 0, hill: -0.4 },
      { len: 15, curve: -0.3, hill: 0 },
      { len: 50, curve: 0, hill: 0 },
    ]),
  },
  {
    name: "Desert Storm", slug: "desert-storm", difficulty: "medium", length: 320,
    scenery: "desert", palette: DESERT_PALETTE,
    build: () => buildTrack([
      { len: 40, curve: 0, hill: 0 },
      { len: 30, curve: 0.3, hill: 0 },
      { len: 40, curve: 0, hill: 0.2 },
      { len: 35, curve: -0.4, hill: 0 },
      { len: 30, curve: 0, hill: -0.2 },
      { len: 25, curve: 0.6, hill: 0 },
      { len: 40, curve: 0, hill: 0 },
      { len: 30, curve: -0.5, hill: 0.3 },
      { len: 25, curve: 0, hill: 0 },
      { len: 25, curve: 0.3, hill: -0.3 },
    ]),
  },
  {
    name: "Cyber Highway", slug: "cyber-highway", difficulty: "hard", length: 400,
    scenery: "cyber", palette: CYBER_PALETTE,
    build: () => buildTrack([
      { len: 15, curve: 0, hill: 0 },
      { len: 20, curve: 1.0, hill: 0.5 },
      { len: 15, curve: 0, hill: -0.5 },
      { len: 20, curve: -1.2, hill: 0.3 },
      { len: 10, curve: 0, hill: 0.8 },
      { len: 25, curve: 0.8, hill: -0.4 },
      { len: 15, curve: 0, hill: -0.8 },
      { len: 20, curve: -0.9, hill: 0.6 },
      { len: 15, curve: 0, hill: 0 },
      { len: 25, curve: 1.1, hill: 0 },
      { len: 15, curve: 0, hill: -0.6 },
      { len: 20, curve: -0.7, hill: 0.4 },
      { len: 25, curve: 0, hill: 0 },
      { len: 15, curve: 0.5, hill: 0.3 },
      { len: 20, curve: -1.0, hill: -0.3 },
      { len: 25, curve: 0, hill: 0 },
      { len: 20, curve: 0.6, hill: 0.5 },
      { len: 15, curve: 0, hill: -0.4 },
      { len: 20, curve: -0.8, hill: 0 },
      { len: 25, curve: 0, hill: 0 },
    ]),
  },
];

// -- Track Builder Helper -------------------------------------------
export interface TrackSection { len: number; curve: number; hill: number }

export function buildTrack(sections: TrackSection[]): Pick<Segment, "curve" | "hill">[] {
  const segs: Pick<Segment, "curve" | "hill">[] = [];
  for (const sec of sections) {
    for (let i = 0; i < sec.len; i++) {
      // Smooth entry/exit using sin easing
      const t = i / sec.len;
      const ease = Math.sin(t * Math.PI); // 0->1->0
      segs.push({ curve: sec.curve * ease, hill: sec.hill * ease });
    }
  }
  return segs;
}

// -- Power-ups ------------------------------------------------------
export const POWER_UPS: PowerUpDef[] = [
  { type: "nitro",  emoji: "\uD83D\uDD25", color: "#ef4444", duration: 0 },
  { type: "shield", emoji: "\uD83D\uDEE1\uFE0F", color: "#3b82f6", duration: 5000 },
  { type: "oil",    emoji: "\uD83D\uDEE2\uFE0F", color: "#a855f7", duration: 3000 },
  { type: "magnet", emoji: "\uD83E\uDDF2", color: "#eab308", duration: 8000 },
];

export const POWERUP_SPAWN_INTERVAL = 80; // every N segments, place a power-up

// -- Race Scoring ---------------------------------------------------
export const POSITION_SCORES = [100, 70, 40, 10]; // 1st, 2nd, 3rd, 4th

// -- AI -------------------------------------------------------------
export const AI_COUNT = 3;
// Tiered AI: index 0 = weak, 1 = medium, 2 = strong
export const AI_BASE_SPEED_RATIOS   = [0.72, 0.85, 0.95]; // fraction of BASE_MAX_SPEED
export const AI_RUBBER_BAND_CAPS    = [0.82, 0.95, 1.08]; // max speed via rubber band
export const AI_START_Z_OFFSETS     = [-8,   -5,   -3];   // starting z behind player
export const AI_STEER_SMOOTHNESS    = 0.05;
export const AI_COLLISION_RADIUS    = 0.15;
