# Pixel Drift Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a pseudo-3D arcade racing game with drift-boost mechanics, 5 cars, 4 themed tracks, power-ups, and two game modes (Time Attack + Race).

**Architecture:** Canvas 2D rendering with OutRun-style segment projection. Game state managed via useReducer. Road defined as segment arrays with curve/hill data. Drift charges boost through 3 levels. All audio procedural via Web Audio API.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Canvas 2D API, Web Audio API, Tailwind CSS 4

**Design doc:** `docs/plans/2026-03-30-pixel-drift-design.md`

---

## Task 1: Types & Constants

**Files:**
- Create: `src/games/drift/types.ts`
- Create: `src/games/drift/config.ts`

**Step 1: Create types.ts with all game type definitions**

```typescript
// src/games/drift/types.ts

// ── Road Geometry ──────────────────────────────────────
export interface Segment {
  index: number;
  /** cumulative Z distance from track start */
  z: number;
  /** horizontal curve factor (-1 left … +1 right) */
  curve: number;
  /** vertical hill factor (-1 down … +1 up) */
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

// ── Cars ───────────────────────────────────────────────
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

// ── Power-ups ──────────────────────────────────────────
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
  /** lateral offset (-1 left … +1 right) */
  lane: number;
  collected: boolean;
}

// ── Game State ─────────────────────────────────────────
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
  /** lateral position on road (-1 left edge … +1 right edge) */
  x: number;
  /** current speed (0 … maxSpeed) */
  speed: number;
  /** Z position (segment index, fractional) */
  z: number;
  /** car visual angle for sprite (-3 … +3) */
  spriteAngle: number;
  drift: DriftState;
  boost: BoostState;
  /** held power-up (null if none) */
  powerUp: PowerUpType | null;
  /** active shield remaining ms */
  shieldMs: number;
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
}

// ── Actions ────────────────────────────────────────────
export type GameAction =
  | { type: "INIT"; mode: GameMode; trackIndex: number; carIndex: number; bestTime: number | null }
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
```

**Step 2: Create config.ts with game constants and definitions**

```typescript
// src/games/drift/config.ts
import type { CarDef, PowerUpDef, TrackDef, TrackPalette } from "./types";

// ── Physics ────────────────────────────────────────────
export const SEGMENT_LENGTH = 200;    // world units per segment
export const ROAD_WIDTH = 2000;       // road width in world units
export const VISIBLE_SEGMENTS = 300;  // how far ahead to render
export const CAMERA_HEIGHT = 1000;    // camera Y above road
export const CAMERA_DEPTH = 1 / Math.tan((80 / 2) * Math.PI / 180); // FOV 80°
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
export const DRIFT_BOOST_MULTIPLIERS = [1.3, 1.6, 2.0]; // speed mult per level
export const DRIFT_BOOST_DURATIONS = [500, 1000, 1500];  // ms per level
export const DRIFT_STEER_FACTOR = 0.6;      // steering responsiveness while drifting
export const DRIFT_LATERAL_SPEED = 0.003;   // how fast car slides sideways in drift
export const DRIFT_SCORE_PER_SECOND = 50;   // drift score bonus per second

// Collision
export const SPIN_OUT_DURATION = 1000;   // ms of spin-out on collision
export const AI_COLLISION_RADIUS = 0.15; // lateral distance for car-car collision

// ── Cars ───────────────────────────────────────────────
export const CARS: CarDef[] = [
  { name: "Neon Striker",   slug: "striker",  speed: 3, drift: 3, boost: 3, handling: 3, bodyColor: "#f97316", accentColor: "#fbbf24" },
  { name: "Drift Phantom",  slug: "phantom",  speed: 2, drift: 5, boost: 4, handling: 2, bodyColor: "#a855f7", accentColor: "#c084fc" },
  { name: "Thunder Bolt",   slug: "bolt",     speed: 5, drift: 2, boost: 2, handling: 3, bodyColor: "#3b82f6", accentColor: "#60a5fa" },
  { name: "Pixel Tank",     slug: "tank",     speed: 2, drift: 3, boost: 5, handling: 4, bodyColor: "#22c55e", accentColor: "#4ade80" },
  { name: "Ghost Racer",    slug: "ghost",    speed: 4, drift: 4, boost: 2, handling: 5, bodyColor: "#06b6d4", accentColor: "#22d3ee" },
];

// ── Tracks ─────────────────────────────────────────────
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

// ── Track Builder Helper ───────────────────────────────
interface TrackSection { len: number; curve: number; hill: number }

function buildTrack(sections: TrackSection[]): Pick<Segment, "curve" | "hill">[] {
  const segs: Pick<Segment, "curve" | "hill">[] = [];
  for (const sec of sections) {
    for (let i = 0; i < sec.len; i++) {
      // Smooth entry/exit using sin easing
      const t = i / sec.len;
      const ease = Math.sin(t * Math.PI); // 0→1→0
      segs.push({ curve: sec.curve * ease, hill: sec.hill * ease });
    }
  }
  return segs;
}

// ── Power-ups ──────────────────────────────────────────
export const POWER_UPS: PowerUpDef[] = [
  { type: "nitro",  emoji: "🔥", color: "#ef4444", duration: 0 },
  { type: "shield", emoji: "🛡️", color: "#3b82f6", duration: 5000 },
  { type: "oil",    emoji: "🛢️", color: "#a855f7", duration: 3000 },
  { type: "magnet", emoji: "🧲", color: "#eab308", duration: 8000 },
];

export const POWERUP_SPAWN_INTERVAL = 80; // every N segments, place a power-up

// ── Race Scoring ───────────────────────────────────────
export const POSITION_SCORES = [100, 70, 40, 10]; // 1st, 2nd, 3rd, 4th

// ── AI ─────────────────────────────────────────────────
export const AI_COUNT = 3;
export const AI_RUBBER_BAND_SPEED = 0.15; // how much AI adjusts toward player
export const AI_STEER_SMOOTHNESS = 0.05;  // how fast AI steers toward racing line
export const AI_DRIFT_CHANCE = 0.3;       // chance AI drifts on curves

// re-export the Segment type builder
export { buildTrack };
export type { TrackSection };
```

**Step 3: Verify types compile**

Run: `cd E:\Personal\GameStation && npx tsc --noEmit src/games/drift/types.ts src/games/drift/config.ts`
Expected: No errors (or only errors about missing module resolution that resolve in full build)

**Step 4: Commit**

```bash
git add src/games/drift/types.ts src/games/drift/config.ts
git commit -m "feat(drift): add type definitions and game configuration"
```

---

## Task 2: Road Renderer

**Files:**
- Create: `src/games/drift/road.ts`

**Goal:** Pure functions to project road segments onto a 2D canvas and render the pseudo-3D road with sky, ground, and road surface.

**Step 1: Implement road projection and rendering**

```typescript
// src/games/drift/road.ts
import type { Segment, TrackPalette } from "./types";
import { SEGMENT_LENGTH, ROAD_WIDTH, VISIBLE_SEGMENTS, CAMERA_HEIGHT, CAMERA_DEPTH } from "./config";

/**
 * Project world segments to screen coordinates based on camera position.
 * Mutates segment.screen in-place for performance.
 */
export function projectSegments(
  segments: Segment[],
  cameraZ: number,
  cameraX: number,
  canvasW: number,
  canvasH: number,
): void {
  const totalLen = segments.length * SEGMENT_LENGTH;
  let curveAccum = 0;
  let hillAccum = 0;
  let prevY = canvasH; // start from bottom

  for (let i = 0; i < VISIBLE_SEGMENTS; i++) {
    const idx = (Math.floor(cameraZ / SEGMENT_LENGTH) + i) % segments.length;
    const seg = segments[idx];
    const worldZ = (i + 1) * SEGMENT_LENGTH - (cameraZ % SEGMENT_LENGTH);

    if (worldZ <= 0) {
      seg.screen = { x: 0, y: 0, w: 0, scale: 0 };
      continue;
    }

    const scale = CAMERA_DEPTH / worldZ;
    const projX = canvasW / 2 + (scale * (-cameraX * ROAD_WIDTH + curveAccum) * canvasW / 2);
    const projY = canvasH / 2 - (scale * (CAMERA_HEIGHT + hillAccum) * canvasH / 2);
    const projW = scale * ROAD_WIDTH * canvasW / 2;

    seg.screen = { x: projX, y: projY, w: projW, scale };
    curveAccum += seg.curve * SEGMENT_LENGTH;
    hillAccum += seg.hill * SEGMENT_LENGTH;
  }
}

/**
 * Render the sky gradient.
 */
export function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  palette: TrackPalette,
): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h / 2);
  grad.addColorStop(0, palette.sky1);
  grad.addColorStop(1, palette.sky2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h / 2);
}

/**
 * Render road segments from back to front.
 */
export function drawRoad(
  ctx: CanvasRenderingContext2D,
  segments: Segment[],
  cameraZ: number,
  w: number,
  h: number,
  palette: TrackPalette,
): void {
  // Draw from farthest to nearest
  for (let i = VISIBLE_SEGMENTS - 1; i > 0; i--) {
    const idx = (Math.floor(cameraZ / SEGMENT_LENGTH) + i) % segments.length;
    const prevIdx = (Math.floor(cameraZ / SEGMENT_LENGTH) + i - 1) % segments.length;
    if (prevIdx < 0) continue;

    const seg = segments[idx];
    const prevSeg = segments[prevIdx >= 0 ? prevIdx : prevIdx + segments.length];

    if (!seg.screen || !prevSeg.screen || seg.screen.scale <= 0) continue;

    const s1 = seg.screen;
    const s2 = prevSeg.screen;

    // Skip if behind camera or above screen
    if (s1.y >= s2.y) continue;

    const isEven = (Math.floor(cameraZ / SEGMENT_LENGTH) + i) % 2 === 0;

    // Ground/grass
    ctx.fillStyle = isEven ? palette.grass1 : palette.grass2;
    ctx.fillRect(0, s1.y, w, s2.y - s1.y);

    // Road surface
    const roadColor = isEven ? palette.road1 : palette.road2;
    drawTrapezoid(ctx, s1.x, s1.y, s1.w, s2.x, s2.y, s2.w, roadColor);

    // Rumble strips (edge markers)
    const rumbleW1 = s1.w * 1.15;
    const rumbleW2 = s2.w * 1.15;
    const rumbleColor = isEven ? palette.rumble1 : palette.rumble2;
    drawTrapezoid(ctx, s1.x, s1.y, rumbleW1, s2.x, s2.y, rumbleW2, rumbleColor);
    // Re-draw road on top of rumble
    drawTrapezoid(ctx, s1.x, s1.y, s1.w, s2.x, s2.y, s2.w, roadColor);

    // Lane markings (center dashes)
    if (isEven) {
      const laneW1 = s1.w * 0.02;
      const laneW2 = s2.w * 0.02;
      ctx.fillStyle = palette.lane;
      drawTrapezoid(ctx, s1.x, s1.y, laneW1, s2.x, s2.y, laneW2, palette.lane);
    }
  }
}

/** Draw a filled trapezoid between two horizontal lines */
function drawTrapezoid(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, w1: number,
  x2: number, y2: number, w2: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1 - w1, y1);
  ctx.lineTo(x1 + w1, y1);
  ctx.lineTo(x2 + w2, y2);
  ctx.lineTo(x2 - w2, y2);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a simple parallax background layer.
 * offset: 0-1 horizontal scroll position
 * yBase: bottom Y of this layer
 */
export function drawParallax(
  ctx: CanvasRenderingContext2D,
  w: number,
  yBase: number,
  height: number,
  offset: number,
  color: string,
  pattern: "buildings" | "mountains" | "cacti" | "grid",
): void {
  ctx.fillStyle = color;
  const ox = (offset * w) % w;

  if (pattern === "buildings" || pattern === "grid") {
    // Simple silhouette buildings/towers
    for (let i = 0; i < 12; i++) {
      const bx = ((i * w / 8) - ox + w * 2) % (w * 2) - w / 2;
      const bw = 20 + (i * 17) % 30;
      const bh = 30 + (i * 23) % (height * 0.7);
      ctx.fillRect(bx, yBase - bh, bw, bh);
      // Window dots
      if (pattern === "grid") {
        ctx.fillStyle = "#00d4ff33";
        for (let wy = yBase - bh + 5; wy < yBase - 5; wy += 8) {
          for (let wx = bx + 4; wx < bx + bw - 4; wx += 6) {
            ctx.fillRect(wx, wy, 2, 2);
          }
        }
        ctx.fillStyle = color;
      }
    }
  } else if (pattern === "mountains") {
    ctx.beginPath();
    ctx.moveTo(0, yBase);
    for (let x = 0; x <= w; x += 20) {
      const nx = (x - ox + w) % w;
      const mh = (Math.sin(nx * 0.01) * 0.5 + Math.sin(nx * 0.023) * 0.3 + 0.2) * height;
      ctx.lineTo(x, yBase - mh);
    }
    ctx.lineTo(w, yBase);
    ctx.closePath();
    ctx.fill();
  } else if (pattern === "cacti") {
    for (let i = 0; i < 8; i++) {
      const cx = ((i * w / 6) - ox + w * 2) % (w * 2) - w / 4;
      const ch = 15 + (i * 19) % 25;
      // Simple cactus shape
      ctx.fillRect(cx, yBase - ch, 4, ch);
      ctx.fillRect(cx - 6, yBase - ch * 0.7, 6, 3);
      ctx.fillRect(cx + 4, yBase - ch * 0.5, 6, 3);
    }
  }
}
```

**Step 2: Verify compilation**

Run: `npx tsc --noEmit src/games/drift/road.ts`

**Step 3: Commit**

```bash
git add src/games/drift/road.ts
git commit -m "feat(drift): implement pseudo-3D road projection and rendering"
```

---

## Task 3: Car Sprites (Programmatic)

**Files:**
- Create: `src/games/drift/sprites.ts`

**Goal:** Draw pixel-art car sprites directly on canvas. 8 angle frames for drift animation. No image assets needed.

**Step 1: Create sprite rendering functions**

```typescript
// src/games/drift/sprites.ts
import type { CarDef } from "./types";

/**
 * Draw a pixel-art car on canvas at given position.
 * angle: -3 to +3 (0 = straight, negative = left, positive = right)
 * scale: size multiplier (1 = normal, <1 = distant)
 */
export function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  angle: number,
  car: CarDef,
  isDrifting: boolean,
): void {
  const s = Math.max(scale * 40, 4); // base car size in pixels
  const w = s * 1.6;
  const h = s;

  ctx.save();
  ctx.translate(x, y);

  // Skew based on angle for drift visual
  const skew = angle * 0.08;
  ctx.transform(1, 0, skew, 1, 0, 0);

  // Car body
  ctx.fillStyle = car.bodyColor;
  roundRect(ctx, -w / 2, -h, w, h * 0.75, s * 0.1);

  // Windshield
  ctx.fillStyle = "#00000066";
  const wsW = w * 0.5;
  const wsH = h * 0.2;
  ctx.fillRect(-wsW / 2, -h * 0.8, wsW, wsH);

  // Accent stripe
  ctx.fillStyle = car.accentColor;
  ctx.fillRect(-w * 0.35, -h * 0.5, w * 0.7, h * 0.08);

  // Wheels
  ctx.fillStyle = "#1a1a1a";
  const wheelW = w * 0.15;
  const wheelH = h * 0.15;
  const wheelOffset = angle * s * 0.05;
  // Front left
  ctx.fillRect(-w / 2 - wheelW * 0.3 + wheelOffset, -h * 0.85, wheelW, wheelH);
  // Front right
  ctx.fillRect(w / 2 - wheelW * 0.7 + wheelOffset, -h * 0.85, wheelW, wheelH);
  // Rear left
  ctx.fillRect(-w / 2 - wheelW * 0.3, -h * 0.15, wheelW, wheelH);
  // Rear right
  ctx.fillRect(w / 2 - wheelW * 0.7, -h * 0.15, wheelW, wheelH);

  // Drift sparks
  if (isDrifting && scale > 0.3) {
    drawSparks(ctx, w, h, angle);
  }

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function drawSparks(
  ctx: CanvasRenderingContext2D,
  w: number, h: number, angle: number,
): void {
  const sparkCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < sparkCount; i++) {
    const sx = (angle > 0 ? -w / 2 : w / 2) + (Math.random() - 0.5) * w * 0.3;
    const sy = -h * 0.1 + Math.random() * h * 0.2;
    const size = 1 + Math.random() * 2;
    ctx.fillStyle = `hsl(${30 + Math.random() * 30}, 100%, ${70 + Math.random() * 30}%)`;
    ctx.fillRect(sx, sy, size, size);
  }
}

/**
 * Draw drift smoke particles behind a car.
 */
export function drawSmoke(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  intensity: number, // 0-1
): void {
  if (scale < 0.2 || intensity <= 0) return;
  const count = Math.floor(intensity * 5);
  for (let i = 0; i < count; i++) {
    const px = x + (Math.random() - 0.5) * 20 * scale;
    const py = y + Math.random() * 10 * scale;
    const size = (3 + Math.random() * 5) * scale;
    const alpha = 0.2 + Math.random() * 0.3;
    ctx.fillStyle = `rgba(200,200,200,${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw a power-up box on the road.
 */
export function drawPowerUpBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string,
  emoji: string,
): void {
  if (scale < 0.05) return;
  const size = Math.max(20 * scale, 4);

  // Glowing box
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.5;
  ctx.fillStyle = color + "44";
  ctx.fillRect(x - size / 2, y - size, size, size);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, scale * 2);
  ctx.strokeRect(x - size / 2, y - size, size, size);
  ctx.shadowBlur = 0;

  // Emoji (only if big enough)
  if (scale > 0.2) {
    ctx.font = `${Math.floor(size * 0.6)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, x, y - size / 2);
  }
}
```

**Step 2: Commit**

```bash
git add src/games/drift/sprites.ts
git commit -m "feat(drift): add programmatic pixel car sprites and effects"
```

---

## Task 4: Game Logic Reducer

**Files:**
- Create: `src/games/drift/logic.ts`

**Goal:** Core game state reducer handling physics, drift, collisions, power-ups, AI, and lap tracking.

**Step 1: Implement the game reducer**

This is the largest file. Implement:
- `initialPlayerState()` — default player state
- `initialState(mode, trackIndex, carIndex, bestTime)` — full initial game state
- `gameReducer(state, action)` — handles all GameAction types
- `tickPlayer(state, dt)` — player physics per frame
- `tickAI(state, dt)` — AI movement per frame
- `tickDrift(player, dt, car)` — drift charge accumulation
- `releaseDrift(player, car)` — convert drift charge to boost
- `checkCollisions(state)` — barrier and car-car collisions
- `checkPowerUps(state)` — power-up pickup
- `checkLapCompletion(state)` — lap and finish detection
- `spawnPowerUps(segments)` — place power-ups on track

Key physics formulas:
- Speed: `player.speed += (accel - drag - curveLoss) * dt`
- Steering: `player.x += steerInput * handling * dt * (drift ? DRIFT_STEER_FACTOR : 1)`
- Drift lateral: `player.x += drift.direction * DRIFT_LATERAL_SPEED * speed * dt`
- AI rubber-band: `ai.targetSpeed = baseSpeed + (playerZ - aiZ) * RUBBER_BAND`
- Curve speed loss: `speed *= 1 - abs(curve) * CURVE_SPEED_LOSS * (isDrifting ? 0.2 : 1)`

The reducer should handle:
- `INIT` → build segments, spawn power-ups, set initial positions
- `COUNTDOWN_TICK` → decrement countdown (3→2→1→0→racing)
- `TICK` → main game loop (physics, AI, collisions, power-ups, laps)
- `STEER/ACCELERATE/BRAKE` → update input state
- `DRIFT_START/DRIFT_END` → enter/release drift
- `USE_POWERUP` → activate held power-up
- `PAUSE/RESUME` → toggle status

**Step 2: Verify compilation**

Run: `npx tsc --noEmit src/games/drift/logic.ts`

**Step 3: Commit**

```bash
git add src/games/drift/logic.ts
git commit -m "feat(drift): implement core game logic reducer with physics and AI"
```

---

## Task 5: Audio System

**Files:**
- Create: `src/games/drift/audio.ts`

**Goal:** Procedural audio via Web Audio API for engine, drift, boost, collisions, power-ups, and win/lose.

**Step 1: Implement audio factory**

```typescript
// src/games/drift/audio.ts
import { tone, noise } from "@/lib/audioUtils";

export interface DriftAudio {
  playEngine: (speed: number) => void;  // continuous engine hum
  stopEngine: () => void;
  playDriftStart: () => void;
  playDriftLevel: (level: number) => void;
  playBoostRelease: () => void;
  playCollision: () => void;
  playPowerUp: () => void;
  playCountdown: () => void;
  playGo: () => void;
  playLapComplete: () => void;
  playWin: () => void;
  playLose: () => void;
  setMuted: (m: boolean) => void;
  dispose: () => void;
}

export function createDriftAudio(): DriftAudio {
  const ctx = new AudioContext();
  let muted = false;
  let engineOsc: OscillatorNode | null = null;
  let engineGain: GainNode | null = null;

  function startEngine() {
    if (engineOsc) return;
    engineOsc = ctx.createOscillator();
    engineGain = ctx.createGain();
    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = 80;
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain).connect(ctx.destination);
    engineOsc.start();
  }

  return {
    playEngine(speed: number) {
      if (muted) return;
      startEngine();
      if (engineOsc && engineGain) {
        // Pitch scales with speed (80-300 Hz)
        engineOsc.frequency.setTargetAtTime(80 + speed * 2.2, ctx.currentTime, 0.1);
        engineGain.gain.setTargetAtTime(0.03 + speed * 0.0002, ctx.currentTime, 0.1);
      }
    },
    stopEngine() {
      if (engineOsc) {
        engineOsc.stop();
        engineOsc.disconnect();
        engineOsc = null;
      }
      if (engineGain) {
        engineGain.disconnect();
        engineGain = null;
      }
    },
    playDriftStart() {
      if (muted) return;
      noise(ctx, 0.3, 0.08, 0); // tire screech
    },
    playDriftLevel(level: number) {
      if (muted) return;
      const freq = 500 + level * 200;
      tone(ctx, "square", freq, freq + 100, 0.06, 0.1, 0);
    },
    playBoostRelease() {
      if (muted) return;
      // Rising sweep + noise burst
      tone(ctx, "sawtooth", 200, 800, 0.15, 0.3, 0);
      noise(ctx, 0.2, 0.15, 0.05);
    },
    playCollision() {
      if (muted) return;
      noise(ctx, 0.15, 0.2, 0);
      tone(ctx, "square", 150, 50, 0.1, 0.2, 0);
    },
    playPowerUp() {
      if (muted) return;
      [600, 800, 1000].forEach((f, i) => tone(ctx, "square", f, f, 0.06, 0.08, i * 0.06));
    },
    playCountdown() {
      if (muted) return;
      tone(ctx, "square", 440, 440, 0.08, 0.15, 0);
    },
    playGo() {
      if (muted) return;
      tone(ctx, "square", 880, 880, 0.08, 0.2, 0);
    },
    playLapComplete() {
      if (muted) return;
      [500, 600, 700, 900].forEach((f, i) => tone(ctx, "square", f, f, 0.06, 0.1, i * 0.07));
    },
    playWin() {
      if (muted) return;
      [523, 659, 784, 1047].forEach((f, i) => tone(ctx, "square", f, f, 0.1, 0.15, i * 0.12));
    },
    playLose() {
      if (muted) return;
      tone(ctx, "sawtooth", 400, 100, 0.25, 0.2, 0);
    },
    setMuted(m: boolean) { muted = m; },
    dispose() {
      this.stopEngine();
      ctx.close();
    },
  };
}
```

**Step 2: Commit**

```bash
git add src/games/drift/audio.ts
git commit -m "feat(drift): add procedural Web Audio sound effects"
```

---

## Task 6: Canvas Renderer Component

**Files:**
- Create: `src/games/drift/DriftCanvas.tsx`

**Goal:** React component wrapping a `<canvas>` element. Runs the render loop via requestAnimationFrame. Draws road, cars, effects, and HUD each frame.

**Step 1: Create the canvas component**

This component receives `GameState` and `dispatch` as props. Each frame:
1. Clear canvas
2. `drawSky()` — sky gradient
3. `drawParallax()` — background layers (offset by player.z * parallax factor)
4. `projectSegments()` — calculate screen positions
5. `drawRoad()` — render road strips
6. Draw roadside objects (position based on segment screen coords)
7. Draw power-up boxes on road
8. Draw oil slicks on road
9. Draw AI cars (sorted by Z, scaled by distance)
10. Draw player car (centered bottom)
11. Draw drift effects (smoke, tire marks)
12. Draw HUD (speed, boost meter, lap, position, timer, power-up slot)
13. Dispatch `TICK` with delta time

The component also handles:
- Canvas resize on window resize
- Keyboard listeners (steer, accel, brake, drift, power-up)
- Touch controls (left/right buttons, drift button)
- Dispatching input actions to reducer

**Step 2: Commit**

```bash
git add src/games/drift/DriftCanvas.tsx
git commit -m "feat(drift): implement canvas renderer with game loop and HUD"
```

---

## Task 7: Menu / Car & Track Selection

**Files:**
- Create: `src/games/drift/Menu.tsx`

**Goal:** Pre-game menu component for selecting car, track, and game mode. Pixel-art styled matching GameStation aesthetic.

**Step 1: Create menu component**

Sections:
1. **Mode select:** Time Attack / Race (two PixelButtons)
2. **Car select:** Horizontal scrollable list showing car sprite + stat bars + name
3. **Track select:** Cards with track name, difficulty badge, and palette preview
4. **Start button:** Large orange PixelButton

Stats shown as pixel bar fills (e.g., ★★★☆☆ or filled/empty blocks).

Props: `onStart(mode, carIndex, trackIndex)` callback.

**Step 2: Commit**

```bash
git add src/games/drift/Menu.tsx
git commit -m "feat(drift): add car/track selection menu with stat display"
```

---

## Task 8: Game Page Integration

**Files:**
- Create: `src/app/games/drift/page.tsx`
- Modify: `src/app/games/page.tsx` (add game entry)
- Modify: `src/app/page.tsx` (add to homepage grid)

**Step 1: Create the game page**

```typescript
// src/app/games/drift/page.tsx
"use client";

import { useReducer, useRef, useState, useCallback, useEffect } from "react";
import GameLayout from "@/components/GameLayout";
import MuteButton from "@/components/MuteButton";
import { getHighScore, setHighScore, getBestTime, setBestTime } from "@/lib/scores";
import { gameReducer, initialState } from "@/games/drift/logic";
import { createDriftAudio, type DriftAudio } from "@/games/drift/audio";
import DriftCanvas from "@/games/drift/DriftCanvas";
import Menu from "@/games/drift/Menu";
import type { GameMode } from "@/games/drift/types";
import { POSITION_SCORES, TRACKS } from "@/games/drift/config";

const GAME_KEY = "drift";

export default function DriftPage() {
  // State: "menu" | "playing" | "finished"
  const [phase, setPhase] = useState<"menu" | "playing">("menu");
  const [state, dispatch] = useReducer(gameReducer, initialState("timeAttack", 0, 0, null));

  const [highScore, setHS] = useState(() => getHighScore(GAME_KEY));
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("gamestation-drift-muted") === "1";
  });

  const audioRef = useRef<DriftAudio | null>(null);

  const initAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = createDriftAudio();
      audioRef.current.setMuted(muted);
    }
  }, [muted]);

  const handleStart = useCallback((mode: GameMode, carIndex: number, trackIndex: number) => {
    initAudio();
    const bestTime = getBestTime(`${GAME_KEY}-${TRACKS[trackIndex].slug}`);
    dispatch({ type: "INIT", mode, trackIndex, carIndex, bestTime });
    setPhase("playing");
  }, [initAudio]);

  const handleNewGame = useCallback(() => {
    audioRef.current?.stopEngine();
    setPhase("menu");
  }, []);

  // Update high score on finish
  useEffect(() => {
    if (state.status === "finished") {
      audioRef.current?.stopEngine();
      if (state.mode === "timeAttack") {
        const trackKey = `${GAME_KEY}-${TRACKS[state.trackIndex].slug}`;
        const total = state.lapTimes.reduce((a, b) => a + b, 0);
        const prev = getBestTime(trackKey);
        if (!prev || total < prev) {
          setBestTime(trackKey, total);
        }
      } else {
        const pts = POSITION_SCORES[state.position - 1] ?? 0;
        const total = pts + state.driftScore;
        if (total > highScore) {
          setHighScore(GAME_KEY, total);
          setHS(total);
        }
      }
    }
  }, [state.status, state.mode, state.position, state.driftScore, state.lapTimes, state.trackIndex, highScore]);

  // Mute sync
  useEffect(() => {
    audioRef.current?.setMuted(muted);
    localStorage.setItem("gamestation-drift-muted", muted ? "1" : "0");
  }, [muted]);

  const score = state.mode === "race"
    ? (POSITION_SCORES[state.position - 1] ?? 0) + state.driftScore
    : undefined;

  const timer = state.status === "racing" || state.status === "finished"
    ? Math.floor(state.elapsedMs / 1000)
    : undefined;

  return (
    <GameLayout
      title="PIXEL DRIFT"
      color="orange"
      score={score}
      highScore={highScore}
      timer={timer}
      onNewGame={handleNewGame}
      actions={<MuteButton muted={muted} onToggle={() => setMuted(m => !m)} color="orange" />}
    >
      {phase === "menu" ? (
        <Menu onStart={handleStart} />
      ) : (
        <DriftCanvas state={state} dispatch={dispatch} audio={audioRef.current} />
      )}
    </GameLayout>
  );
}
```

**Step 2: Add game entry to games listing page**

In `src/app/games/page.tsx`, add to the games array:
```typescript
{
  title: "PIXEL DRIFT",
  subtitle: "Drift through neon tracks. Master the boost.",
  href: "/games/drift",
  color: "orange",
  emoji: "🏎️",
  tag: "ARCADE",
  category: "ARCADE" as Category,
  available: true,
},
```

**Step 3: Add game entry to homepage**

In `src/app/page.tsx`, add to the GAMES array (same structure as above).

**Step 4: Test the app builds**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 5: Commit**

```bash
git add src/app/games/drift/page.tsx src/app/games/page.tsx src/app/page.tsx
git commit -m "feat(drift): integrate game page, add to listings and homepage"
```

---

## Task 9: Touch Controls & Mobile Support

**Files:**
- Modify: `src/games/drift/DriftCanvas.tsx`

**Goal:** Add responsive touch controls overlay for mobile. Left/Right steer buttons, drift button, power-up button. Canvas scales to fit viewport.

**Step 1: Add touch control overlay**

Add a `<div>` overlay below the canvas with:
- Left half: Left steer (onTouchStart → STEER -1, onTouchEnd → STEER 0)
- Right half: Right steer (onTouchStart → STEER +1, onTouchEnd → STEER 0)
- Bottom-left: DRIFT button (onTouchStart → DRIFT_START, onTouchEnd → DRIFT_END)
- Bottom-right: POWER-UP button (onTouchStart → USE_POWERUP)

Auto-accelerate on mobile (detect touch device via `navigator.maxTouchPoints > 0`).

**Step 2: Canvas responsive sizing**

Canvas should be `width: min(100vw, 800px)`, maintain 16:9 aspect ratio. Use ResizeObserver to update canvas dimensions.

**Step 3: Commit**

```bash
git add src/games/drift/DriftCanvas.tsx
git commit -m "feat(drift): add touch controls and responsive canvas sizing"
```

---

## Task 10: Win/Lose Overlays & Polish

**Files:**
- Modify: `src/app/games/drift/page.tsx`
- Possibly modify: `src/app/globals.css` (if new keyframes needed)

**Goal:** Add game over overlays matching GameStation's established pattern. Countdown animation. Speed lines effect. Screen shake on collision.

**Step 1: Add countdown overlay**

When `state.status === "countdown"`, show large centered numbers (3, 2, 1, GO!) with scale animation and orange glow.

**Step 2: Add finish overlays**

Win overlay (Time Attack personal best OR Race 1st-2nd place):
- `fixed inset-0 z-40` with backdrop blur
- Floating 🏆 emoji with `animate-[floatUp_1s]`
- "NEW RECORD!" or "1ST PLACE!" with `neon-text-orange animate-[victoryGlowOrange_1.5s_infinite]`
- Time or score stat
- PixelButton to return to menu

Lose overlay (Race 3rd-4th place):
- Same structure but 💨 emoji
- "FINISH - 3RD" with `neon-text-pink animate-[defeatFlash_1s_infinite]`
- PixelButton to retry

**Step 3: Add CSS keyframes if needed**

Check if `victoryGlowOrange` already exists in globals.css (it does per research). Add any new keyframes for countdown animation if needed.

**Step 4: Final build & test**

Run: `npm run build && npm run dev`
Test in browser: navigate to /games/drift, verify menu → select → countdown → race → finish → overlay flow.

**Step 5: Commit**

```bash
git add src/app/games/drift/page.tsx src/app/globals.css
git commit -m "feat(drift): add countdown, win/lose overlays, and visual polish"
```

---

## Task 11: Ghost Replay (Time Attack)

**Files:**
- Modify: `src/games/drift/logic.ts`
- Modify: `src/games/drift/DriftCanvas.tsx`

**Goal:** Record player Z position each frame during Time Attack. On subsequent runs, draw a semi-transparent ghost car following the best time path.

**Step 1: Record ghost data**

In the TICK handler, push `player.z` to `state.ghostRecording[]` array each frame.

On finish (if new best time), save ghost data to localStorage: `gamestation-drift-ghost-{track}`.

**Step 2: Render ghost car**

On INIT, load ghost data from localStorage into `state.ghostZ[]`.

In DriftCanvas, render ghost car as a semi-transparent sprite at the ghost's Z position for the current elapsed frame.

**Step 3: Commit**

```bash
git add src/games/drift/logic.ts src/games/drift/DriftCanvas.tsx
git commit -m "feat(drift): add ghost replay for Time Attack mode"
```

---

## Summary

| Task | Component | Est. Complexity |
|------|-----------|----------------|
| 1 | Types & Config | Foundation |
| 2 | Road Renderer | Core engine |
| 3 | Car Sprites | Visual |
| 4 | Game Logic Reducer | Core mechanics |
| 5 | Audio System | Sound |
| 6 | Canvas Renderer | Main component |
| 7 | Menu / Selection | UI |
| 8 | Page Integration | Wiring |
| 9 | Touch & Mobile | Responsive |
| 10 | Overlays & Polish | UX |
| 11 | Ghost Replay | Feature |

**Dependencies:** Task 1 → Tasks 2,3,4,5 (can be parallel) → Task 6 → Tasks 7,8 → Tasks 9,10,11
