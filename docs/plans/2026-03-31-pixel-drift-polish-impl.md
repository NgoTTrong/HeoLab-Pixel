# Pixel Drift Full Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Pixel Drift from a rough prototype into a polished arcade racer with a proper cyber car sprite, working drift controls, particle effects (skid marks, smoke, speed lines), tiered AI, and a redesigned HUD.

**Architecture:** All transient visual effects (skid marks, smoke, speed lines, notifications) live in React refs inside `DriftCanvas.tsx` — they never enter game state, preventing re-renders. Game logic changes are isolated to `logic.ts` and `config.ts`. Visual code changes are isolated to `sprites.ts` and `road.ts`.

**Tech Stack:** React 19 (useRef, useCallback), Canvas 2D API, TypeScript, existing game reducer pattern.

---

## Task 1: Update types and constants

**Files:**
- Modify: `src/games/drift/types.ts`
- Modify: `src/games/drift/config.ts`

### Step 1: Add `lastSteerDir` to GameState in types.ts

In `GameState` interface, after `steerDir: number;` add:

```typescript
/** last non-zero steer direction — used to set drift direction when steerDir is 0 */
lastSteerDir: number;
```

### Step 2: Update boost/nitro values and add AI tier constants in config.ts

Replace the Drift section constants:

```typescript
export const DRIFT_BOOST_MULTIPLIERS = [1.4, 1.7, 2.2];  // was [1.3, 1.6, 2.0]
export const DRIFT_BOOST_DURATIONS   = [1000, 1800, 2800]; // was [500, 1000, 1500]
```

Replace the AI section at the bottom of config.ts:

```typescript
export const AI_COUNT = 3;
// Tiered AI: index 0 = weak, 1 = medium, 2 = strong
export const AI_BASE_SPEED_RATIOS   = [0.72, 0.85, 0.95]; // fraction of BASE_MAX_SPEED
export const AI_RUBBER_BAND_CAPS    = [0.82, 0.95, 1.08]; // max speed via rubber band
export const AI_DRIFT_CURVE_THRESH  = [999,  0.5,  0.3];  // curve value that triggers drift
export const AI_DRIFT_CHANCES       = [0,    0.30, 0.70]; // probability per eligible frame
export const AI_START_Z_OFFSETS     = [-8,   -5,   -3];   // starting z behind player
export const AI_STEER_SMOOTHNESS    = 0.05;
export const AI_COLLISION_RADIUS    = 0.15;
```

### Step 3: Build check

```bash
cd E:/Personal/GameStation && npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: TypeScript error on `lastSteerDir` missing from `initialState` — that's fine, will be fixed in Task 2.

### Step 4: Commit

```bash
git add src/games/drift/types.ts src/games/drift/config.ts
git commit -m "feat(drift): update boost values and AI tier constants"
```

---

## Task 2: Fix game logic

**Files:**
- Modify: `src/games/drift/logic.ts`

### Step 1: Add `lastSteerDir` to initialState

In `initialState()`, add after `brakePressed: false,`:

```typescript
lastSteerDir: 0,
```

### Step 2: Fix STEER action to track lastSteerDir

Replace the `case "STEER":` line:

```typescript
case "STEER":
  return {
    ...state,
    steerDir: action.direction,
    lastSteerDir: action.direction !== 0 ? action.direction : state.lastSteerDir,
  };
```

### Step 3: Fix DRIFT_START — remove steerDir guard, use lastSteerDir fallback

Replace the entire `case "DRIFT_START":` block:

```typescript
case "DRIFT_START": {
  const car = CARS[state.carIndex];
  const maxSpeed = BASE_MAX_SPEED + (car.speed - 3) * SPEED_PER_RATING;
  if (state.player.speed < maxSpeed * 0.15) return state; // too slow to drift

  const dir = state.steerDir || state.lastSteerDir || 1;
  const player = {
    ...state.player,
    drift: {
      active: true,
      direction: dir,
      chargeMs: state.player.drift.active ? state.player.drift.chargeMs : 0,
      level: state.player.drift.active ? state.player.drift.level : 0,
    },
  };
  return { ...state, player };
}
```

### Step 4: Fix nitro power-up duration

In `case "USE_POWERUP":`, replace the `nitro` branch:

```typescript
case "nitro":
  player.boost = { active: true, remainingMs: 2500, multiplier: 1.8 };
  break;
```

### Step 5: Rewrite createAIDrivers to use tiers

Replace the entire `createAIDrivers` function:

```typescript
function createAIDrivers(segments: Segment[], playerCarIndex: number): AIDriver[] {
  const availableCars = CARS.map((_, i) => i).filter((i) => i !== playerCarIndex);
  return Array.from({ length: AI_COUNT }, (_, tier) => ({
    x: (tier - 1) * 0.4,
    speed: BASE_MAX_SPEED * AI_BASE_SPEED_RATIOS[tier],
    z: AI_START_Z_OFFSETS[tier],
    carIndex: availableCars[tier % availableCars.length],
    targetSpeed: BASE_MAX_SPEED * AI_BASE_SPEED_RATIOS[tier],
  }));
}
```

Also add the missing imports at the top of logic.ts:

```typescript
import {
  // ...existing imports...
  AI_BASE_SPEED_RATIOS,
  AI_RUBBER_BAND_CAPS,
  AI_DRIFT_CURVE_THRESH,
  AI_DRIFT_CHANCES,
  AI_START_Z_OFFSETS,
} from "./config";
```

Remove old imports: `AI_RUBBER_BAND_SPEED`, `AI_STEER_SMOOTHNESS`.

### Step 6: Rewrite tickAI to use tiered rubber band

Replace the entire `tickAI` function:

```typescript
function tickAI(state: GameState, dt: number): GameState {
  if (state.ai.length === 0) return state;
  const segments = state.segments;
  const player = state.player;

  const ai = state.ai.map((driver, tier) => {
    const d = { ...driver };
    const baseSpeed = BASE_MAX_SPEED * AI_BASE_SPEED_RATIOS[tier];
    const capSpeed  = BASE_MAX_SPEED * AI_RUBBER_BAND_CAPS[tier];

    // Rubber band: close the gap to player
    const gap = player.z - d.z;
    if (gap > 20) {
      d.targetSpeed = Math.min(capSpeed, baseSpeed + gap * 0.3);
    } else if (gap < 5) {
      d.targetSpeed = Math.max(baseSpeed * 0.8, d.targetSpeed - 5);
    } else {
      d.targetSpeed = baseSpeed;
    }
    d.speed += (d.targetSpeed - d.speed) * 0.04;

    // Steer toward racing line
    const segIdx = ((Math.floor(d.z) % segments.length) + segments.length) % segments.length;
    const seg = segments[segIdx];
    const targetX = -seg.curve * 0.5;
    d.x += (targetX - d.x) * AI_STEER_SMOOTHNESS;
    d.x = Math.max(-0.9, Math.min(0.9, d.x));

    // Move forward
    d.z += (d.speed * dt) / 1000;

    return d;
  });

  return { ...state, ai };
}
```

Add back `AI_STEER_SMOOTHNESS` to the config.ts imports or define it locally as `const AI_STEER_SMOOTHNESS = 0.05;` in logic.ts.

### Step 7: Build check

```bash
npm run build 2>&1 | grep -E "error TS|✓ Compiled"
```

Expected: `✓ Compiled successfully`

### Step 8: Commit

```bash
git add src/games/drift/logic.ts
git commit -m "fix(drift): fix drift activation, tiered AI, rebalanced boost/nitro"
```

---

## Task 3: Rewrite car sprite

**Files:**
- Modify: `src/games/drift/sprites.ts`

### Step 1: Replace entire sprites.ts

The new sprite draws a cyber racing car from rear 3/4 perspective with neon underglow that changes color by drift charge level.

```typescript
// src/games/drift/sprites.ts
import type { CarDef } from "./types";

// Per-car body proportions (widthRatio, cabinRatio)
const CAR_SHAPES: Record<string, { wr: number; cr: number }> = {
  striker: { wr: 1.00, cr: 0.52 },
  phantom: { wr: 1.10, cr: 0.45 },
  bolt:    { wr: 0.90, cr: 0.58 },
  tank:    { wr: 1.20, cr: 0.42 },
  ghost:   { wr: 0.86, cr: 0.50 },
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

function lighten(hex: string, amt: number): string {
  const [r,g,b] = hexToRgb(hex);
  return `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`;
}

function darken(hex: string, amt: number): string {
  const [r,g,b] = hexToRgb(hex);
  return `rgb(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)})`;
}

function getUnderglowColor(car: CarDef, isDrifting: boolean, chargeMs: number): string {
  if (!isDrifting) return car.accentColor + "44";
  if (chargeMs < 2000) return "rgba(255,255,255,0.95)";
  if (chargeMs < 4000) return "rgba(255,230,0,0.95)";
  // Level 3: flicker orange-red
  return Math.floor(Date.now() / 80) % 2 === 0 ? "rgba(255,80,0,0.95)" : "rgba(255,140,0,0.95)";
}

/**
 * Draw a cyber racing car viewed from behind at slight downward angle.
 * x,y = screen position (y = road contact / bottom of car).
 * angle: -3..+3 for skew (0 = straight).
 * driftChargeMs: used for underglow color.
 */
export function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  angle: number,
  car: CarDef,
  isDrifting: boolean,
  driftChargeMs = 0,
): void {
  const BASE = Math.max(scale * 56, 5);
  const shapes = CAR_SHAPES[car.slug] ?? CAR_SHAPES.striker;
  const bw = BASE * 1.8 * shapes.wr;
  const bh = BASE * 0.95;
  const cabW = bw * shapes.cr;

  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, angle * 0.09, 1, 0, 0);

  // 1. Neon underglow strip
  const glowCol = getUnderglowColor(car, isDrifting, driftChargeMs);
  ctx.save();
  ctx.shadowColor = glowCol;
  ctx.shadowBlur = BASE * 1.1;
  ctx.fillStyle = glowCol;
  ctx.fillRect(-bw * 0.42, -BASE * 0.04, bw * 0.84, BASE * 0.055);
  ctx.restore();

  // 2. Rear wheels
  const ww = BASE * 0.20;
  const wh = BASE * 0.28;
  const wheelY = -bh * 0.78;
  const wo = angle * BASE * 0.035; // steer offset
  ctx.fillStyle = "#111111";
  ctx.fillRect(-bw * 0.50 - ww * 0.55 + wo, wheelY, ww, wh);
  ctx.fillRect( bw * 0.50 - ww * 0.45 + wo, wheelY, ww, wh);
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(-bw * 0.50 - ww * 0.55 + wo + 1, wheelY + 2, ww * 0.45, wh * 0.38);
  ctx.fillRect( bw * 0.50 - ww * 0.45 + wo + 1, wheelY + 2, ww * 0.45, wh * 0.38);

  // 3. Main body trapezoid (wider at bottom)
  ctx.fillStyle = car.bodyColor;
  ctx.beginPath();
  ctx.moveTo(-bw * 0.50,  0);
  ctx.lineTo( bw * 0.50,  0);
  ctx.lineTo( bw * 0.44, -bh);
  ctx.lineTo(-bw * 0.44, -bh);
  ctx.closePath();
  ctx.fill();

  // 4. Top edge highlight
  ctx.fillStyle = lighten(car.bodyColor, 45);
  ctx.fillRect(-bw * 0.42, -bh, bw * 0.84, BASE * 0.075);

  // 5. Accent racing stripe
  ctx.fillStyle = car.accentColor;
  ctx.fillRect(-bw * 0.38, -bh * 0.58, bw * 0.76, BASE * 0.10);
  // Thin highlight above stripe
  ctx.fillStyle = lighten(car.accentColor, 60);
  ctx.fillRect(-bw * 0.38, -bh * 0.58, bw * 0.76, BASE * 0.02);

  // 6. Taillights
  ctx.save();
  ctx.shadowColor = "#ff1a1a";
  ctx.shadowBlur = BASE * 0.6;
  ctx.fillStyle = "#ff3333";
  ctx.fillRect(-bw * 0.44, -bh * 0.84, BASE * 0.17, BASE * 0.12);
  ctx.fillRect( bw * 0.27, -bh * 0.84, BASE * 0.17, BASE * 0.12);
  // Inner bright spot
  ctx.fillStyle = "#ffaaaa";
  ctx.fillRect(-bw * 0.44 + 2, -bh * 0.84 + 2, BASE * 0.06, BASE * 0.04);
  ctx.fillRect( bw * 0.27 + 2, -bh * 0.84 + 2, BASE * 0.06, BASE * 0.04);
  ctx.restore();

  // 7. Cabin
  ctx.fillStyle = darken(car.bodyColor, 28);
  ctx.beginPath();
  ctx.moveTo(-cabW * 0.50, -bh);
  ctx.lineTo( cabW * 0.50, -bh);
  ctx.lineTo( cabW * 0.42, -bh * 1.42);
  ctx.lineTo(-cabW * 0.42, -bh * 1.42);
  ctx.closePath();
  ctx.fill();

  // 8. Rear window (dark glass with subtle tint)
  ctx.fillStyle = "rgba(0, 20, 40, 0.65)";
  ctx.beginPath();
  ctx.moveTo(-cabW * 0.37, -bh * 1.02);
  ctx.lineTo( cabW * 0.37, -bh * 1.02);
  ctx.lineTo( cabW * 0.30, -bh * 1.38);
  ctx.lineTo(-cabW * 0.30, -bh * 1.38);
  ctx.closePath();
  ctx.fill();
  // Glass reflection
  ctx.fillStyle = "rgba(100,180,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(-cabW * 0.37, -bh * 1.02);
  ctx.lineTo(-cabW * 0.05, -bh * 1.02);
  ctx.lineTo(-cabW * 0.05, -bh * 1.38);
  ctx.lineTo(-cabW * 0.30, -bh * 1.38);
  ctx.closePath();
  ctx.fill();

  // 9. Spoiler bar + supports
  ctx.fillStyle = car.accentColor;
  ctx.fillRect(-bw * 0.46, -bh * 1.50, bw * 0.92, BASE * 0.058);
  ctx.fillStyle = darken(car.accentColor, 20);
  ctx.fillRect(-bw * 0.35, -bh * 1.50, BASE * 0.07, BASE * 0.15);
  ctx.fillRect( bw * 0.28, -bh * 1.50, BASE * 0.07, BASE * 0.15);

  // 10. Sparks on high drift charge
  if (isDrifting && driftChargeMs > 800 && scale > 0.25) {
    drawSparks(ctx, bw, bh, angle, driftChargeMs);
  }

  ctx.restore();
}

function drawSparks(
  ctx: CanvasRenderingContext2D,
  bw: number, bh: number, angle: number, chargeMs: number,
): void {
  const count = chargeMs > 4000 ? 6 : chargeMs > 2000 ? 4 : 2;
  const side = angle >= 0 ? -bw * 0.5 : bw * 0.5;
  for (let i = 0; i < count; i++) {
    const sx = side + (Math.random() - 0.5) * bw * 0.25;
    const sy = -bh * (0.1 + Math.random() * 0.3);
    const size = 1 + Math.random() * 2.5;
    const hue = chargeMs > 4000 ? `hsl(${15 + Math.random()*20},100%,${60+Math.random()*30}%)`
              : chargeMs > 2000 ? `hsl(${45 + Math.random()*15},100%,${65+Math.random()*25}%)`
              : `hsl(0,0%,${80+Math.random()*20}%)`;
    ctx.fillStyle = hue;
    ctx.fillRect(sx, sy, size, size);
  }
}

/**
 * Smoke particle - now legacy/unused (DriftCanvas uses its own smoke particle system).
 * Kept for API compatibility.
 */
export function drawSmoke(
  _ctx: CanvasRenderingContext2D,
  _x: number, _y: number, _scale: number, _intensity: number,
): void {
  // Replaced by smokeParticlesRef in DriftCanvas
}

/**
 * Draw a power-up box on the road.
 */
export function drawPowerUpBox(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, scale: number, color: string, emoji: string,
): void {
  if (scale < 0.05) return;
  const size = Math.max(20 * scale, 4);

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.6;
  ctx.fillStyle = color + "33";
  ctx.fillRect(x - size / 2, y - size, size, size);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, scale * 2);
  ctx.strokeRect(x - size / 2, y - size, size, size);
  ctx.restore();

  if (scale > 0.18) {
    ctx.font = `${Math.floor(size * 0.6)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, x, y - size / 2);
  }
}
```

### Step 2: Build check

```bash
npm run build 2>&1 | grep -E "error TS|✓"
```

Expected: type error in DriftCanvas.tsx about `drawCar` call signature — will fix in Task 5.

### Step 3: Commit

```bash
git add src/games/drift/sprites.ts
git commit -m "feat(drift): rewrite car sprite — cyber racing style with neon underglow"
```

---

## Task 4: Polish road rendering

**Files:**
- Modify: `src/games/drift/road.ts`

### Step 1: Replace drawSky with 3-stop gradient + stars

```typescript
const NIGHT_TRACKS = new Set(["city", "cyber"]);

export function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  palette: TrackPalette,
  scenery: string,
): void {
  // 3-stop gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h * 0.42);
  grad.addColorStop(0,   palette.sky1);
  grad.addColorStop(0.6, palette.sky2);
  grad.addColorStop(1,   palette.fog);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h * 0.42);

  // Stars for night tracks
  if (NIGHT_TRACKS.has(scenery)) {
    const PHI = 1.6180339887;
    for (let i = 0; i < 55; i++) {
      const sx = ((i * PHI * 97.3) % 1) * w;
      const sy = ((i * PHI * 53.1) % 1) * h * 0.36;
      const sz = i % 3 === 0 ? 1.5 : 1;
      const alpha = 0.35 + (i % 5) * 0.10;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(sx, sy, sz, sz);
    }
  }
}
```

`drawSky` now takes `scenery: string` as 5th parameter. Update the call in `DriftCanvas.tsx` to pass `track.scenery`.

### Step 2: Add depth fog + better lane markings to drawRoad

Replace `drawRoad`:

```typescript
export function drawRoad(
  ctx: CanvasRenderingContext2D,
  segments: Segment[],
  cameraZ: number,
  w: number,
  h: number,
  palette: TrackPalette,
): void {
  const segIdx = Math.floor(cameraZ / SEGMENT_LENGTH);
  const segCount = segments.length;

  ctx.fillStyle = palette.grass1;
  ctx.fillRect(0, h * 0.4, w, h * 0.6);

  for (let i = VISIBLE_SEGMENTS - 1; i > 0; i--) {
    const rawIdx = segIdx + i;
    const idx     = ((rawIdx     % segCount) + segCount) % segCount;
    const prevIdx = (((rawIdx-1) % segCount) + segCount) % segCount;

    const seg     = segments[idx];
    const prevSeg = segments[prevIdx];

    if (!seg.screen || !prevSeg.screen || seg.screen.scale <= 0) continue;
    const s1 = seg.screen;
    const s2 = prevSeg.screen;
    if (s1.y >= s2.y) continue;

    const isEven = rawIdx % 2 === 0;
    const stripH = Math.ceil(s2.y - s1.y) + 1;

    // Ground strip
    ctx.fillStyle = isEven ? palette.grass1 : palette.grass2;
    ctx.fillRect(0, Math.floor(s1.y), w, stripH);

    // Rumble strips
    drawTrapezoid(ctx, s1.x, s1.y, s1.w * 1.25, s2.x, s2.y, s2.w * 1.25,
      isEven ? palette.rumble1 : palette.rumble2);

    // Road surface
    drawTrapezoid(ctx, s1.x, s1.y, s1.w, s2.x, s2.y, s2.w,
      isEven ? palette.road1 : palette.road2);

    // Lane center markings (dashed, every other pair of segments)
    if (isEven) {
      const lw1 = s1.w * 0.03;
      const lw2 = s2.w * 0.03;
      drawTrapezoid(ctx, s1.x, s1.y, lw1, s2.x, s2.y, lw2, palette.lane);
    }
    // Left/right shoulder lines (solid)
    const shoulderW1 = s1.w * 0.01;
    const shoulderW2 = s2.w * 0.01;
    const shoulderOff1 = s1.w * 0.92;
    const shoulderOff2 = s2.w * 0.92;
    drawTrapezoid(ctx,
      s1.x - shoulderOff1, s1.y, shoulderW1,
      s2.x - shoulderOff2, s2.y, shoulderW2,
      palette.lane);
    drawTrapezoid(ctx,
      s1.x + shoulderOff1, s1.y, shoulderW1,
      s2.x + shoulderOff2, s2.y, shoulderW2,
      palette.lane);
  }

  // Depth fog overlay (atmospheric perspective near horizon)
  const fogGrad = ctx.createLinearGradient(0, h * 0.38, 0, h * 0.58);
  fogGrad.addColorStop(0, palette.fog + "cc");
  fogGrad.addColorStop(1, palette.fog + "00");
  ctx.fillStyle = fogGrad;
  ctx.fillRect(0, h * 0.38, w, h * 0.20);
}
```

### Step 3: Add roadside scenery objects

Add new export `drawScenery` at the bottom of road.ts:

```typescript
/**
 * Draw roadside scenery objects (buildings, trees, etc.) scaled by distance.
 * Called after road, before cars.
 */
export function drawScenery(
  ctx: CanvasRenderingContext2D,
  segments: Segment[],
  cameraZ: number,
  w: number,
  h: number,
  scenery: "city" | "mountain" | "desert" | "cyber",
): void {
  const segIdx = Math.floor(cameraZ / SEGMENT_LENGTH);
  const segCount = segments.length;
  const OBJECT_INTERVAL = 15;

  for (let i = VISIBLE_SEGMENTS - 2; i > 2; i--) {
    const rawIdx = segIdx + i;
    if (rawIdx % OBJECT_INTERVAL !== 0) continue;

    const idx = ((rawIdx % segCount) + segCount) % segCount;
    const seg = segments[idx];
    if (!seg.screen || seg.screen.scale <= 0) continue;

    const s = seg.screen;
    const objScale = s.scale;
    if (objScale < 0.03) continue;

    // Alternate left/right based on segment index
    const side = (Math.floor(rawIdx / OBJECT_INTERVAL)) % 2 === 0 ? -1 : 1;
    const objX = s.x + side * (s.w * 1.55);

    ctx.save();
    ctx.translate(objX, s.y);

    switch (scenery) {
      case "city":
        drawBuilding(ctx, objScale, side, rawIdx);
        break;
      case "mountain":
        drawTree(ctx, objScale, rawIdx);
        break;
      case "desert":
        drawCactus(ctx, objScale, rawIdx);
        break;
      case "cyber":
        drawCyberPillar(ctx, objScale, rawIdx);
        break;
    }
    ctx.restore();
  }
}

function drawBuilding(ctx: CanvasRenderingContext2D, scale: number, side: number, seed: number): void {
  const bw = (30 + (seed * 17) % 25) * scale;
  const bh = (40 + (seed * 23) % 50) * scale;
  ctx.fillStyle = `hsl(${240 + (seed % 30)}, 30%, 15%)`;
  ctx.fillRect(side > 0 ? 0 : -bw, -bh, bw, bh);
  // Neon window dots
  ctx.fillStyle = `rgba(${seed%2===0?249:0},${seed%3===0?115:212},${seed%2===0?22:255},0.7)`;
  const cols = Math.max(2, Math.round(bw / (6 * scale)));
  const rows = Math.max(2, Math.round(bh / (8 * scale)));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c + seed) % 3 !== 0) continue;
      const wx = (side > 0 ? 0 : -bw) + (c + 0.5) * (bw / cols);
      const wy = -bh + (r + 0.5) * (bh / rows);
      ctx.fillRect(wx - scale, wy - scale, scale * 2, scale * 2);
    }
  }
}

function drawTree(ctx: CanvasRenderingContext2D, scale: number, seed: number): void {
  const th = (25 + (seed * 19) % 20) * scale;
  const tw = th * 0.7;
  // Trunk
  ctx.fillStyle = "#3d2b1f";
  ctx.fillRect(-scale * 1.5, 0, scale * 3, -th * 0.3);
  // Foliage layers
  ctx.fillStyle = "#1a3a1a";
  ctx.beginPath();
  ctx.moveTo(0, -th);
  ctx.lineTo(-tw * 0.5, -th * 0.55);
  ctx.lineTo(tw * 0.5, -th * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#153015";
  ctx.beginPath();
  ctx.moveTo(0, -th * 0.75);
  ctx.lineTo(-tw * 0.6, -th * 0.3);
  ctx.lineTo(tw * 0.6, -th * 0.3);
  ctx.closePath();
  ctx.fill();
}

function drawCactus(ctx: CanvasRenderingContext2D, scale: number, seed: number): void {
  const ch = (20 + (seed * 13) % 18) * scale;
  const cw = scale * 3;
  ctx.fillStyle = "#4a7c3f";
  // Main trunk
  ctx.fillRect(-cw / 2, -ch, cw, ch);
  // Left arm
  ctx.fillRect(-cw * 3, -ch * 0.65, cw * 2.5, cw);
  ctx.fillRect(-cw * 3, -ch * 0.85, cw, ch * 0.25);
  // Right arm
  ctx.fillRect(cw / 2, -ch * 0.5, cw * 2.5, cw);
  ctx.fillRect(cw * 2.5, -ch * 0.7, cw, ch * 0.25);
}

function drawCyberPillar(ctx: CanvasRenderingContext2D, scale: number, seed: number): void {
  const ph = (35 + (seed * 11) % 25) * scale;
  const pw = scale * 4;
  // Pillar
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(-pw / 2, -ph, pw, ph);
  // Neon stripe
  ctx.fillStyle = seed % 2 === 0 ? "#00d4ff" : "#f97316";
  ctx.fillRect(-pw / 2, -ph, pw * 0.3, ph);
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = scale * 8;
  ctx.fillRect(-pw / 2, -ph, pw * 0.3, ph);
  ctx.shadowBlur = 0;
  // Top light
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, -ph, scale * 2, 0, Math.PI * 2);
  ctx.fill();
}
```

### Step 4: Update drawParallax to match new sky (keep existing, just update signature)

`drawParallax` stays the same — no changes needed.

### Step 5: Build check

```bash
npm run build 2>&1 | grep -E "error TS|✓"
```

Expected: TS errors in DriftCanvas.tsx about `drawSky` signature mismatch — fix in Task 5.

### Step 6: Commit

```bash
git add src/games/drift/road.ts
git commit -m "feat(drift): road polish — depth fog, stars, shoulder lines, roadside scenery"
```

---

## Task 5: Visual effects and HUD overhaul

**Files:**
- Modify: `src/games/drift/DriftCanvas.tsx`

This is the largest task. The goal: add particle refs for skid marks + smoke + speed lines, boost flash, screen shake, lap notification, drift level notification, and rewrite the HUD with a speedometer arc.

### Step 1: Add particle type definitions and refs at top of component

After `const prevPowerUpRef = useRef(state.player.powerUp);` add:

```typescript
// ---- Visual effect refs (never in game state) ----
type SkidMark   = { x: number; y: number; w: number; alpha: number };
type SmokePart  = { x: number; y: number; vx: number; vy: number; size: number; maxSize: number; alpha: number; color: string };
type SpeedLine  = { x1: number; y1: number; x2: number; y2: number };
type BoostFlash = { alpha: number; color: string; text: string };
type Notif      = { text: string; subText: string; subColor: string; slideY: number; alpha: number };
type LvlNotif   = { text: string; alpha: number; color: string };

const skidMarksRef      = useRef<SkidMark[]>([]);
const smokePartsRef     = useRef<SmokePart[]>([]);
const speedLinesRef     = useRef<SpeedLine[]>([]);
const boostFlashRef     = useRef<BoostFlash | null>(null);
const shakeRef          = useRef<{ mag: number; remaining: number } | null>(null);
const lapNotifRef       = useRef<Notif | null>(null);
const lvlNotifRef       = useRef<LvlNotif | null>(null);
const puFlashRef        = useRef<{ alpha: number; color: string } | null>(null);
const prevLapRef2       = useRef(state.lap);
const prevBoostMulRef   = useRef(0); // track which multiplier triggered flash
```

### Step 2: Update imports at top of file

Add `drawScenery` to imports from `./road`:
```typescript
import { projectSegments, drawSky, drawRoad, drawParallax, drawScenery } from "./road";
```

Also add `DRIFT_BOOST_DURATIONS` to config imports.

### Step 3: Rewrite the main RAF loop

Replace the entire loop function inside the `useEffect`:

```typescript
function loop(timestamp: number) {
  const st  = stateRef.current;
  const aud = audioRef.current;

  if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
  const rawDt = timestamp - lastTimeRef.current;
  lastTimeRef.current = timestamp;
  const dt = Math.min(rawDt, 50);

  // -- Dispatch TICK --
  if (st.status === "racing") {
    dispatch({ type: "TICK", dt });
    if (st.mode === "timeAttack" && st.ghostZ.length > 0) {
      ghostFrameRef.current = Math.min(ghostFrameRef.current + 1, st.ghostZ.length - 1);
    }
  }
  if (st.status === "racing" && !prevRacingRef.current) ghostFrameRef.current = 0;
  prevRacingRef.current = st.status === "racing";

  // -- Audio --
  handleAudio(st, aud);

  // -- Canvas setup --
  const cvs = canvasRef.current!;
  const c   = cvs.getContext("2d")!;
  const w   = cvs.width;
  const h   = cvs.height;

  // Screen shake offset
  let shakeX = 0, shakeY = 0;
  if (shakeRef.current) {
    shakeRef.current.remaining -= dt;
    if (shakeRef.current.remaining <= 0) {
      shakeRef.current = null;
    } else {
      const mag = shakeRef.current.mag * (shakeRef.current.remaining / 300);
      shakeX = (Math.random() - 0.5) * mag;
      shakeY = (Math.random() - 0.5) * mag;
    }
  }

  c.clearRect(0, 0, w, h);
  if (shakeX !== 0 || shakeY !== 0) {
    c.save();
    c.translate(shakeX, shakeY);
  }

  const track   = TRACKS[st.trackIndex];
  const palette = track.palette;

  // 1. Sky
  drawSky(c, w, h, palette, track.scenery);

  // 2. Parallax background
  const parallaxOffset  = st.player.z * 0.001;
  const sceneryPattern  = SCENERY_PATTERN[track.scenery] ?? "buildings";
  drawParallax(c, w, h * 0.5, h * 0.2, parallaxOffset, palette.sky2 + "88", sceneryPattern);

  // 3. Project + draw road
  const playerZWorld = st.player.z * SEGMENT_LENGTH;
  projectSegments(st.segments, playerZWorld, st.player.x, w, h);
  drawRoad(c, st.segments, playerZWorld, w, h, palette);

  // 4. Roadside scenery
  drawScenery(c, st.segments, playerZWorld, w, h, track.scenery as "city"|"mountain"|"desert"|"cyber");

  // 5. Skid marks (update + draw)
  skidMarksRef.current = skidMarksRef.current
    .map(m => ({ ...m, alpha: m.alpha - 0.0025 }))
    .filter(m => m.alpha > 0);

  for (const m of skidMarksRef.current) {
    c.fillStyle = `rgba(30,20,10,${m.alpha})`;
    c.fillRect(m.x - m.w / 2, m.y - 1.5, m.w, 3);
  }

  // 6. Power-up boxes + oil slicks (same as before)
  const cameraSegIdx = Math.floor(playerZWorld / SEGMENT_LENGTH);
  const segCount     = st.segments.length;

  for (const pu of st.powerUps) {
    if (pu.collected) continue;
    const relIdx = ((pu.segmentIndex - cameraSegIdx) % segCount + segCount) % segCount;
    if (relIdx <= 0 || relIdx >= VISIBLE_SEGMENTS) continue;
    const seg = st.segments[pu.segmentIndex % segCount];
    if (!seg.screen || seg.screen.scale <= 0) continue;
    const puDef = POWER_UPS.find(p => p.type === pu.type);
    if (!puDef) continue;
    drawPowerUpBox(c, seg.screen.x + pu.lane * seg.screen.w, seg.screen.y, seg.screen.scale, puDef.color, puDef.emoji);
  }

  for (const oil of st.oilSlicks) {
    const relIdx = ((oil.segmentIndex - cameraSegIdx) % segCount + segCount) % segCount;
    if (relIdx <= 0 || relIdx >= VISIBLE_SEGMENTS) continue;
    const seg = st.segments[oil.segmentIndex % segCount];
    if (!seg.screen || seg.screen.scale <= 0) continue;
    const oilSize = Math.max(8 * seg.screen.scale, 2);
    c.fillStyle = "#1a1a2ecc";
    c.beginPath();
    c.ellipse(seg.screen.x + oil.lane * seg.screen.w, seg.screen.y, oilSize * 1.5, oilSize * 0.5, 0, 0, Math.PI * 2);
    c.fill();
  }

  // 7. AI cars (farthest first)
  const sortedAI = [...st.ai].sort((a, b) => {
    const aDist = ((a.z - st.player.z) % segCount + segCount) % segCount;
    const bDist = ((b.z - st.player.z) % segCount + segCount) % segCount;
    return bDist - aDist;
  });
  for (const ai of sortedAI) {
    const aiSegIdx = Math.floor(ai.z) % segCount;
    const relIdx   = ((aiSegIdx - cameraSegIdx) % segCount + segCount) % segCount;
    if (relIdx <= 0 || relIdx >= VISIBLE_SEGMENTS) continue;
    const seg = st.segments[aiSegIdx >= 0 ? aiSegIdx : aiSegIdx + segCount];
    if (!seg.screen || seg.screen.scale <= 0) continue;
    drawCar(c, seg.screen.x + ai.x * seg.screen.w, seg.screen.y, seg.screen.scale, 0, CARS[ai.carIndex], false);
  }

  // 8. Ghost car
  if (st.mode === "timeAttack" && st.ghostZ.length > 0) {
    const gFrame    = Math.min(ghostFrameRef.current, st.ghostZ.length - 1);
    const ghostZPos = st.ghostZ[gFrame];
    const ghostSeg  = ((Math.floor(ghostZPos) % segCount) + segCount) % segCount;
    const relIdx    = ((ghostSeg - cameraSegIdx) % segCount + segCount) % segCount;
    if (relIdx > 0 && relIdx < VISIBLE_SEGMENTS) {
      const seg = st.segments[ghostSeg];
      if (seg.screen && seg.screen.scale > 0) {
        c.save();
        c.globalAlpha = 0.28;
        drawCar(c, seg.screen.x, seg.screen.y, seg.screen.scale, 0, CARS[st.carIndex], false);
        c.restore();
      }
    }
  }

  // 9. Player car (fixed screen position)
  const px = w / 2;
  const py = h * 0.80;
  const playerCar  = CARS[st.carIndex];
  const isDrifting = st.player.drift.active;

  // Spawn skid marks while drifting
  if (isDrifting && st.status === "racing") {
    const BASE = Math.max(56, 1); // approx at scale=1
    const wOffset = BASE * 1.8 * 0.40;
    skidMarksRef.current.push({ x: px - wOffset, y: py - BASE * 0.12, w: 5, alpha: 0.55 });
    skidMarksRef.current.push({ x: px + wOffset, y: py - BASE * 0.12, w: 5, alpha: 0.55 });
    if (skidMarksRef.current.length > 220) skidMarksRef.current.splice(0, 2);
  }

  // Spawn smoke particles
  if (isDrifting && st.status === "racing") {
    const charge = st.player.drift.chargeMs;
    const color  = charge > 4000 ? "#ff5500" : charge > 2000 ? "#ffdd00" : "#cccccc";
    const count  = charge > 4000 ? 5 : charge > 2000 ? 4 : 3;
    for (let i = 0; i < count; i++) {
      smokePartsRef.current.push({
        x: px + (Math.random() - 0.5) * 30,
        y: py + 5,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -(0.4 + Math.random() * 0.8),
        size: 4 + Math.random() * 4,
        maxSize: 18 + Math.random() * 14,
        alpha: 0.45 + Math.random() * 0.2,
        color,
      });
    }
    if (smokePartsRef.current.length > 160) smokePartsRef.current.splice(0, 4);
  }

  // Update + draw smoke particles
  smokePartsRef.current = smokePartsRef.current
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      size: Math.min(p.size + 0.35, p.maxSize),
      alpha: p.alpha - 0.012,
    }))
    .filter(p => p.alpha > 0);

  for (const p of smokePartsRef.current) {
    c.beginPath();
    c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    c.fillStyle = `rgba(${p.color === "#cccccc" ? "200,200,200" : p.color === "#ffdd00" ? "255,221,0" : "255,85,0"},${p.alpha})`;
    c.fill();
  }

  // Draw player car
  if (st.player.spinOut) {
    c.save();
    c.translate(px, py);
    c.rotate((st.player.spinOutMs / 100) * Math.PI * 0.3);
    c.translate(-px, -py);
    drawCar(c, px, py, 1, st.player.spriteAngle, playerCar, false, 0);
    c.restore();
  } else {
    drawCar(c, px, py, 1, st.player.spriteAngle, playerCar, isDrifting, st.player.drift.chargeMs);
  }

  // Shield ring
  if (st.player.shieldMs > 0) {
    c.strokeStyle = "#3b82f6aa";
    c.lineWidth = 3;
    c.shadowColor = "#3b82f6";
    c.shadowBlur = 10;
    c.beginPath();
    c.arc(px, py - 20, 36, 0, Math.PI * 2);
    c.stroke();
    c.shadowBlur = 0;
  }

  // 10. Speed lines (boost)
  // Detect boost start → generate lines
  if (st.player.boost.active && !prevBoostActiveRef.current) {
    const hx = w / 2, hy = h * 0.4;
    speedLinesRef.current = Array.from({ length: 22 }, (_, i) => {
      const angle = (i / 22) * Math.PI * 2;
      const dist  = Math.hypot(w, h);
      return { x1: hx + Math.cos(angle) * dist, y1: hy + Math.sin(angle) * dist, x2: hx, y2: hy };
    });
    // Boost flash
    const mul = st.player.boost.multiplier;
    if (mul >= 2.2) {
      boostFlashRef.current = { alpha: 0.55, color: "#ff6600", text: "MAX BOOST!" };
      shakeRef.current = { mag: 14, remaining: 300 };
    } else if (mul >= 1.7) {
      boostFlashRef.current = { alpha: 0.4, color: "#ffe600", text: "BOOST!" };
      shakeRef.current = { mag: 7, remaining: 200 };
    } else {
      boostFlashRef.current = { alpha: 0.25, color: "#ffffff", text: "BOOST" };
    }
  }
  if (!st.player.boost.active) speedLinesRef.current = [];

  if (speedLinesRef.current.length > 0 && st.player.boost.remainingMs > 0) {
    const maxDur = DRIFT_BOOST_DURATIONS[2];
    const alpha  = Math.min(0.45, (st.player.boost.remainingMs / maxDur) * 0.5);
    c.save();
    c.strokeStyle = `rgba(255,200,80,${alpha})`;
    c.lineWidth = 1.5;
    for (const l of speedLinesRef.current) {
      c.beginPath();
      c.moveTo(l.x1, l.y1);
      c.lineTo(l.x2, l.y2);
      c.stroke();
    }
    c.restore();
  }

  // 11. Boost flash overlay
  if (boostFlashRef.current) {
    const bf = boostFlashRef.current;
    c.fillStyle = bf.color + Math.round(bf.alpha * 255).toString(16).padStart(2, "0");
    c.fillRect(0, 0, w, h);
    if (bf.alpha > 0.1) {
      const fs = Math.round(w * 0.055);
      c.font = `${fs}px "Press Start 2P", monospace`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = "#ffffff";
      c.shadowColor = bf.color;
      c.shadowBlur = 20;
      c.fillText(bf.text, w / 2, h * 0.35);
      c.shadowBlur = 0;
    }
    boostFlashRef.current = { ...bf, alpha: bf.alpha - 0.022 };
    if (boostFlashRef.current.alpha <= 0) boostFlashRef.current = null;
  }

  // Power-up use flash
  if (puFlashRef.current) {
    c.fillStyle = puFlashRef.current.color + Math.round(puFlashRef.current.alpha * 255).toString(16).padStart(2,"0");
    c.fillRect(0, 0, w, h);
    puFlashRef.current = { ...puFlashRef.current, alpha: puFlashRef.current.alpha - 0.05 };
    if (puFlashRef.current.alpha <= 0) puFlashRef.current = null;
  }

  // 12. Lap notification
  if (st.lap > prevLapRef2.current && st.status === "racing") {
    const lapNum = Math.min(st.lap - 1, st.totalLaps);
    const lapMs  = st.lapTimes[st.lapTimes.length - 1] ?? 0;
    const bestMs = st.bestTime;
    const isFaster = bestMs !== null && lapMs < bestMs / st.totalLaps;
    lapNotifRef.current = {
      text: `LAP ${lapNum}/${st.totalLaps}`,
      subText: `${formatTime(lapMs)}`,
      subColor: isFaster ? "#39ff14" : "#ff2d95",
      slideY: -60,
      alpha: 1,
    };
  }
  prevLapRef2.current = st.lap;

  if (lapNotifRef.current) {
    const n = lapNotifRef.current;
    n.slideY = Math.min(n.slideY + 3, h * 0.22);
    const fs = Math.round(w * 0.038);
    c.textAlign  = "center";
    c.textBaseline = "middle";
    c.font = `${fs}px "Press Start 2P", monospace`;
    c.fillStyle = `rgba(255,200,50,${n.alpha})`;
    c.shadowColor = "#f97316";
    c.shadowBlur = 12;
    c.fillText(n.text, w / 2, n.slideY);
    c.font = `${Math.round(fs * 0.65)}px "Press Start 2P", monospace`;
    c.fillStyle = n.subColor + Math.round(n.alpha * 255).toString(16).padStart(2,"0");
    c.fillText(n.subText, w / 2, n.slideY + fs * 1.4);
    c.shadowBlur = 0;
    lapNotifRef.current = { ...n, alpha: n.alpha - 0.008 };
    if (lapNotifRef.current.alpha <= 0) lapNotifRef.current = null;
  }

  // Drift level notification
  if (st.player.drift.level > prevDriftLevelRef.current && st.player.drift.level > 0) {
    const colors = ["", "#ffffff", "#ffe600", "#ff6600"];
    lvlNotifRef.current = {
      text: `LV${st.player.drift.level}!`,
      alpha: 1.0,
      color: colors[st.player.drift.level],
    };
  }
  if (lvlNotifRef.current) {
    const lv = lvlNotifRef.current;
    c.font = `${Math.round(w * 0.032)}px "Press Start 2P", monospace`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = lv.color + Math.round(lv.alpha * 255).toString(16).padStart(2,"0");
    c.shadowColor = lv.color;
    c.shadowBlur = 10;
    c.fillText(lv.text, w / 2, h * 0.72);
    c.shadowBlur = 0;
    lvlNotifRef.current = { ...lv, alpha: lv.alpha - 0.025 };
    if (lvlNotifRef.current.alpha <= 0) lvlNotifRef.current = null;
  }

  if (shakeX !== 0 || shakeY !== 0) c.restore();

  // 13. HUD (drawn after restore so it doesn't shake)
  drawHUD(c, w, h, st);

  rafRef.current = requestAnimationFrame(loop);
}
```

### Step 4: Rewrite drawHUD with speedometer + improved drift bar

Replace the `drawHUD` useCallback:

```typescript
const drawHUD = useCallback(
  (ctx: CanvasRenderingContext2D, w: number, h: number, st: GameState) => {
    const car      = CARS[st.carIndex];
    const maxSpeed = BASE_MAX_SPEED + (car.speed - 3) * SPEED_PER_RATING;
    const speedFrac = Math.max(0, Math.min(1, st.player.speed / maxSpeed));
    const kmh       = Math.round(speedFrac * 300);
    const fs        = Math.max(9, Math.round(w * 0.017));

    ctx.font = `${fs}px "Press Start 2P", monospace`;
    ctx.textBaseline = "top";

    // ── Top bar ──────────────────────────────────────────────────
    ctx.textAlign = "left";
    ctx.fillStyle = "#f97316";
    ctx.fillText(`LAP ${Math.min(st.lap, st.totalLaps)}/${st.totalLaps}`, w * 0.03, h * 0.04);

    ctx.textAlign = "center";
    const posColors = ["#ffe600", "#cccccc", "#ff6666", "#ff6666"];
    ctx.fillStyle = posColors[Math.min(st.position - 1, 3)];
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.fillText(positionLabel(st.position), w * 0.5, h * 0.04);
    ctx.shadowBlur = 0;

    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(formatTime(st.elapsedMs), w * 0.97, h * 0.04);

    // ── Speedometer arc (bottom-left) ────────────────────────────
    const arcX = w * 0.10;
    const arcY = h * 0.91;
    const arcR = Math.min(w * 0.065, h * 0.085);
    const startA = Math.PI * 0.80;
    const endA   = Math.PI * 2.20;
    const currA  = startA + (endA - startA) * speedFrac;
    const arcColor = speedFrac < 0.5 ? "#39ff14" : speedFrac < 0.8 ? "#ffe600" : "#f97316";

    ctx.lineCap = "round";
    // Background track
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = arcR * 0.22;
    ctx.beginPath();
    ctx.arc(arcX, arcY, arcR, startA, endA);
    ctx.stroke();
    // Filled arc
    ctx.strokeStyle = arcColor;
    ctx.shadowColor = arcColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(arcX, arcY, arcR, startA, currA);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // km/h label
    const kmhFs = Math.max(7, Math.round(arcR * 0.44));
    ctx.font = `${kmhFs}px "Press Start 2P", monospace`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${kmh}`, arcX, arcY);

    // ── Drift charge bar (bottom-center) ─────────────────────────
    const barW = w * 0.28;
    const barH = Math.max(h * 0.022, 6);
    const barX = w / 2 - barW / 2;
    const barY = h * 0.935;

    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(barX, barY, barW, barH);

    let fill = 0;
    let barColor = "#f97316";
    if (st.player.boost.active) {
      fill = st.player.boost.remainingMs / DRIFT_BOOST_DURATIONS[2];
      barColor = "#ff2d95";
    } else if (st.player.drift.active) {
      fill = Math.min(1, st.player.drift.chargeMs / 4000);
      barColor = st.player.drift.level >= 3 ? "#ff6600" : st.player.drift.level >= 2 ? "#ffe600" : "#ffffff";
    }
    fill = Math.max(0, Math.min(1, fill));

    if (fill > 0) {
      ctx.shadowColor = barColor;
      ctx.shadowBlur = 6;
      ctx.fillStyle = barColor;
      ctx.fillRect(barX, barY, barW * fill, barH);
      ctx.shadowBlur = 0;
    }

    // Level markers
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 1.5;
    for (const frac of [0.5, 0.75]) {
      const mx = barX + barW * frac;
      ctx.beginPath();
      ctx.moveTo(mx, barY - 1);
      ctx.lineTo(mx, barY + barH + 1);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Drift label
    const barFs = Math.max(6, Math.round(w * 0.013));
    ctx.font = `${barFs}px "Press Start 2P", monospace`;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("DRIFT", w / 2, barY - 2);

    // ── Power-up slot (bottom-right) ─────────────────────────────
    if (st.player.powerUp) {
      const puDef = POWER_UPS.find(p => p.type === st.player.powerUp);
      if (puDef) {
        // Pulsing border
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
        const slotX = w * 0.90;
        const slotY = h * 0.91;
        const slotR = Math.min(w * 0.04, h * 0.055);
        ctx.strokeStyle = puDef.color;
        ctx.lineWidth = 2 + pulse * 2;
        ctx.shadowColor = puDef.color;
        ctx.shadowBlur = 8 + pulse * 6;
        ctx.beginPath();
        ctx.arc(slotX, slotY, slotR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        const emojiFs = Math.max(14, Math.round(slotR * 1.2));
        ctx.font = `${emojiFs}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(puDef.emoji, slotX, slotY);

        const labelFs = Math.max(6, Math.round(w * 0.012));
        ctx.font = `${labelFs}px "Press Start 2P", monospace`;
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.textBaseline = "top";
        ctx.fillText("[E]", slotX, slotY + slotR + 2);
      }
    } else {
      const labelFs = Math.max(6, Math.round(w * 0.013));
      ctx.font = `${labelFs}px "Press Start 2P", monospace`;
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("[E]", w * 0.97, h * 0.97);
    }

    // ── Countdown ────────────────────────────────────────────────
    if (st.status === "countdown") {
      const cdText = st.countdown > 0 ? `${st.countdown}` : "GO!";
      const cdFs   = Math.round(w * 0.11);
      ctx.font = `${cdFs}px "Press Start 2P", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle   = st.countdown > 0 ? "#ffe600" : "#39ff14";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur  = 25;
      ctx.fillText(cdText, w / 2, h * 0.38);
      ctx.shadowBlur = 0;
    }

    // ── Finish ───────────────────────────────────────────────────
    if (st.status === "finished") {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, h * 0.25, w, h * 0.5);

      const titleFs = Math.round(w * 0.048);
      ctx.font = `${titleFs}px "Press Start 2P", monospace`;
      ctx.fillStyle  = st.position === 1 ? "#ffe600" : "#ff2d95";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur  = 15;
      ctx.fillText(
        st.position === 1 ? "YOU WIN!" : `${positionLabel(st.position)} PLACE`,
        w / 2, h * 0.38,
      );
      ctx.shadowBlur = 0;

      const infoFs = Math.round(w * 0.02);
      ctx.font = `${infoFs}px "Press Start 2P", monospace`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`TIME: ${formatTime(st.elapsedMs)}`, w / 2, h * 0.50);
      ctx.fillText(`SCORE: ${Math.round(st.score)}`, w / 2, h * 0.58);
      ctx.fillText(`DRIFT BONUS: ${Math.round(st.driftScore)}`, w / 2, h * 0.64);
    }
  },
  [],
);
```

### Step 5: Trigger power-up flash when USE_POWERUP fires

In the keyboard `onKeyDown` handler, wrap the `USE_POWERUP` dispatch:

```typescript
case "e":
case "E":
  if (stateRef.current.player.powerUp) {
    const puDef = POWER_UPS.find(p => p.type === stateRef.current.player.powerUp);
    if (puDef) puFlashRef.current = { alpha: 0.22, color: puDef.color };
  }
  dispatch({ type: "USE_POWERUP" });
  break;
```

Do the same for the touch `onUsePowerUp` handler.

Also add `DRIFT_BOOST_DURATIONS` to the imports from `./config`.

### Step 6: Build check

```bash
npm run build 2>&1 | grep -E "error TS|✓"
```

Expected: `✓ Compiled successfully`

### Step 7: Start dev server and verify visually

```bash
npm run dev
```

Open `/games/drift`. Verify:
- [ ] Car sprite shows cyber racing style with underglow
- [ ] Pressing Space while driving starts drift (no steer required)
- [ ] Drift charge shows L1/L2/L3 notifications and underglow color changes
- [ ] Releasing Space triggers boost flash + screen shake at L2/L3
- [ ] Skid marks appear at player wheels during drift
- [ ] Smoke particles appear and fade
- [ ] Speed lines appear during boost
- [ ] Pressing E with a power-up shows flash
- [ ] Speedometer arc in bottom-left shows speed
- [ ] Roadside buildings/trees/cacti/pillars visible and scale with distance
- [ ] Sky has stars on Neon City / Cyber Highway tracks
- [ ] Fog blends road into horizon

### Step 8: Commit

```bash
git add src/games/drift/DriftCanvas.tsx
git commit -m "feat(drift): particle system, HUD overhaul, speed lines, skid marks, boost flash"
```

---

## Final commit

```bash
git add -A
git commit -m "feat(drift): full polish pass — car sprite, drift fix, particles, HUD, AI tiers, scenery"
```
