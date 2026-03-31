# SURVIVAL Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a SURVIVAL game mode to PIXEL CHOMP with Fog of War, Combo System, and Ghost Evolution — while keeping CLASSIC mode untouched.

**Architecture:** Three self-contained modules (`fog.ts`, `combo.ts`, `evolution.ts`) that plug into the existing reducer tick pipeline. A `gameMode` field on `GameModifiers` gates which modules run. The UI renders fog overlay and combo HUD only in survival mode.

**Tech Stack:** TypeScript, React, Web Audio API, Tailwind CSS v4

---

### Task 1: Extend types and config for survival mode

**Files:**
- Modify: `src/games/pacman/types.ts`
- Modify: `src/games/pacman/config.ts`

**Step 1: Add survival fields to types.ts**

Add `gameMode` to `GameModifiers`:
```typescript
export interface GameModifiers {
  gameMode: "classic" | "survival";       // NEW
  ghostSpeed: "slow" | "normal" | "fast" | "insane";
  // ... rest unchanged
}
```

Add survival state fields to `PacmanState`:
```typescript
export interface PacmanState {
  // ... existing fields unchanged ...

  // Survival mode state
  visited: boolean[][];           // fog: tiles pac-man has visited
  visRadius: number;              // fog: current visibility radius
  combo: number;                  // combo: current streak count
  comboTimer: number;             // combo: ticks since last dot (breaks if >1)
  comboEffects: ComboEffects;     // combo: active milestone effects
  turnHistory: Record<string, Direction[]>; // evolution: ghost learning data
  evolutionTier: "basic" | "aware" | "evolved"; // evolution: current tier
  lastMilestone: number;          // combo: last milestone reached (for UI popup)
  milestonePopup: string | null;  // combo: current popup text ("BLAZING!" etc)
  milestonePopupTimer: number;    // combo: ticks remaining for popup display
  pacMoved: boolean;              // combo: whether pac-man moved this tick
}

export interface ComboEffects {
  speedBoost: number;    // ticks remaining
  visionBoost: number;   // ticks remaining
  miniPower: number;     // ticks remaining
}
```

**Step 2: Update config.ts with survival constants**

Add to `config.ts`:
```typescript
// Fog of War
export const FOG_RADIUS = 4;
export const FOG_POWER_RADIUS = 8;
export const FOG_FADE_RANGE = 2;
export const FOG_VISITED_OPACITY = 0.2;

// Ghost proximity audio thresholds
export const PROXIMITY_FAR = 8;
export const PROXIMITY_MID = 5;
export const PROXIMITY_NEAR = 3;

// Combo system
export const COMBO_BREAK_TICKS = 1;
export const COMBO_DOT_CAP = 10;
export const COMBO_MILESTONES = [
  { combo: 10,  bonus: 500,  effect: null,         label: null },
  { combo: 20,  bonus: 1000, effect: "speedBoost",  label: "BLAZING!" },
  { combo: 50,  bonus: 2500, effect: "visionBoost", label: "UNSTOPPABLE!" },
  { combo: 100, bonus: 5000, effect: "miniPower",   label: "LEGENDARY!" },
];
export const COMBO_SPEED_BOOST_TICKS = Math.round(3 * 1000 / TICK_MS);
export const COMBO_VISION_BOOST_TICKS = Math.round(5 * 1000 / TICK_MS);
export const COMBO_MINI_POWER_TICKS = Math.round(3 * 1000 / TICK_MS);

// Ghost evolution
export const EVOLUTION_TIERS = {
  basic:   { minLevel: 1, predictionChance: 0 },
  aware:   { minLevel: 3, predictionChance: 0.4 },
  evolved: { minLevel: 5, predictionChance: 0.7 },
};
export const EVOLUTION_FORGET_RATE = 0.1;
```

Update `DEFAULT_MODIFIERS` to include `gameMode: "classic"`.

**Step 3: Verify compilation**

Run: `npx tsc --noEmit`

**Step 4: Update `createInitialState` in logic.ts**

Add default values for all new survival fields (empty visited array, combo 0, etc). These fields exist in state but are only used when `gameMode === "survival"`.

**Step 5: Commit**
```
feat(pacman): add survival mode types and config constants
```

---

### Task 2: Implement Fog of War module

**Files:**
- Create: `src/games/pacman/fog.ts`

**Step 1: Create fog.ts**

```typescript
import type { Position } from "./types";
import { FOG_RADIUS, FOG_POWER_RADIUS, FOG_FADE_RANGE } from "./config";

/** Calculate distance between two positions. */
function dist(a: Position, b: Position): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Update visited array after pac-man moves. */
export function updateVisited(
  visited: boolean[][],
  pacman: Position,
): boolean[][] {
  // Mark current position and all tiles within visRadius as visited
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
 *          fogVisitedOpacity (visited but out of range), 0 (hidden).
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
```

**Step 2: Commit**
```
feat(pacman): add fog of war module
```

---

### Task 3: Implement Combo System module

**Files:**
- Create: `src/games/pacman/combo.ts`

**Step 1: Create combo.ts**

```typescript
import type { ComboEffects } from "./types";
import {
  COMBO_BREAK_TICKS,
  COMBO_DOT_CAP,
  COMBO_MILESTONES,
  COMBO_SPEED_BOOST_TICKS,
  COMBO_VISION_BOOST_TICKS,
  COMBO_MINI_POWER_TICKS,
  SCORE,
} from "./config";

export interface ComboResult {
  combo: number;
  score: number;           // additional score to add
  comboEffects: ComboEffects;
  milestonePopup: string | null;
  milestonePopupTimer: number;
}

/** Calculate score for a dot with combo multiplier. */
export function comboDotScore(combo: number): number {
  const mult = Math.min(combo, COMBO_DOT_CAP);
  return SCORE.dot * Math.max(mult, 1);
}

/**
 * Process a dot being eaten in survival mode.
 * Increments combo, checks milestones, returns updated state.
 */
export function onDotEaten(
  combo: number,
  effects: ComboEffects,
  prevMilestone: number,
): ComboResult {
  const newCombo = combo + 1;
  let bonusScore = 0;
  let popup: string | null = null;
  let popupTimer = 0;
  let newEffects = { ...effects };

  // Check milestones (only trigger each once per combo streak)
  for (const m of COMBO_MILESTONES) {
    if (newCombo >= m.combo && prevMilestone < m.combo) {
      bonusScore += m.bonus;
      if (m.label) {
        popup = m.label;
        popupTimer = Math.round(1.5 * 1000 / 120); // ~1.5s at 120ms tick
      }
      if (m.effect === "speedBoost") newEffects.speedBoost = COMBO_SPEED_BOOST_TICKS;
      if (m.effect === "visionBoost") newEffects.visionBoost = COMBO_VISION_BOOST_TICKS;
      if (m.effect === "miniPower") newEffects.miniPower = COMBO_MINI_POWER_TICKS;
    }
  }

  const dotScore = comboDotScore(newCombo);

  return {
    combo: newCombo,
    score: dotScore + bonusScore - SCORE.dot, // subtract base (already added by movePacman)
    comboEffects: newEffects,
    milestonePopup: popup,
    milestonePopupTimer: popupTimer,
  };
}

/** Process a ghost being eaten — adds to combo without resetting. */
export function onGhostEaten(combo: number): number {
  return combo + 1;
}

/** Check if combo should break (pac-man didn't move). */
export function shouldBreakCombo(comboTimer: number): boolean {
  return comboTimer > COMBO_BREAK_TICKS;
}

/** Tick down active combo effects, return updated. */
export function tickComboEffects(effects: ComboEffects): ComboEffects {
  return {
    speedBoost: Math.max(0, effects.speedBoost - 1),
    visionBoost: Math.max(0, effects.visionBoost - 1),
    miniPower: Math.max(0, effects.miniPower - 1),
  };
}

/** Get combo color class based on current combo count. */
export function getComboColor(combo: number): string {
  if (combo >= 50) return "#ff2d55";   // red
  if (combo >= 20) return "#f97316";   // orange
  if (combo >= 10) return "#ffe600";   // yellow
  return "#ffffff";                     // white
}
```

**Step 2: Commit**
```
feat(pacman): add combo system module
```

---

### Task 4: Implement Ghost Evolution module

**Files:**
- Create: `src/games/pacman/evolution.ts`

**Step 1: Create evolution.ts**

```typescript
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
  // Cap history per key to prevent unbounded growth
  if (arr.length > 20) arr.shift();
  newHistory[key] = arr;
  return newHistory;
}

/** Count walkable exits from a position. */
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
 * Returns null if no prediction available.
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

  // Target the tile pac-man is predicted to move toward
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

  // Find the ghost chasing from behind pac-man
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

  // This ghost should target ahead of pac-man (the other corridor exit)
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
  // Remove oldest entries (first keys added)
  for (let i = 0; i < removeCount && i < keys.length; i++) {
    delete newHistory[keys[i]];
  }
  return newHistory;
}
```

**Step 2: Commit**
```
feat(pacman): add ghost evolution module
```

---

### Task 5: Integrate survival modules into game logic

**Files:**
- Modify: `src/games/pacman/logic.ts`

**Step 1: Wire fog, combo, and evolution into the reducer**

Import the three modules at the top of `logic.ts`:
```typescript
import { updateVisited, createVisited, getVisRadius } from "./fog";
import { onDotEaten, onGhostEaten, shouldBreakCombo, tickComboEffects } from "./combo";
import { recordTurn, getEvolutionTier, getEvolvedTarget, getPincerTarget, forgetHistory } from "./evolution";
import { FOG_RADIUS } from "./config";
```

**Modify `createInitialState`:** Initialize survival fields:
```typescript
visited: createVisited(31, 28),
visRadius: FOG_RADIUS,
combo: 0,
comboTimer: 0,
comboEffects: { speedBoost: 0, visionBoost: 0, miniPower: 0 },
turnHistory: {},
evolutionTier: "basic",
lastMilestone: 0,
milestonePopup: null,
milestonePopupTimer: 0,
pacMoved: false,
```

**Modify `movePacman`:** After existing dot/pellet scoring, if survival mode:
- Track whether pac-man actually moved (`pacMoved`)
- On dot eat: call `onDotEaten()`, add bonus score, set milestone popup
- Update `comboTimer` (reset on dot eat, increment otherwise)
- If `shouldBreakCombo()`: reset combo to 0
- Update visited array via `updateVisited()`
- Record turn decisions via `recordTurn()` when direction changes at intersections
- Compute `visRadius` via `getVisRadius()`

**Modify `updateGhosts`:** If survival mode and tier !== "basic":
- For each ghost in chase mode: call `getEvolvedTarget()` to get overridden target
- If evolved tier: also try `getPincerTarget()`
- If override returned, use it instead of normal `getGhostTarget()`

**Modify `checkCollisions`:** If survival mode:
- On ghost eaten (frightened): call `onGhostEaten()` to add to combo
- On death: call `forgetHistory()` to reduce learning data

**Modify `TICK` handler:** If survival mode:
- Call `tickComboEffects()` to count down active effects
- Decrement `milestonePopupTimer`
- Update `evolutionTier` based on level via `getEvolutionTier()`
- Apply combo speed boost (reduce tick interval) if active
- Apply mini power effect if active (frighten ghosts if not already)

**Modify `NEXT_LEVEL`:** Preserve `turnHistory` across levels (learning persists). Reset visited/combo/effects. Update `evolutionTier`.

**Step 2: Verify compilation**

Run: `npx tsc --noEmit`

**Step 3: Commit**
```
feat(pacman): integrate survival modules into game reducer
```

---

### Task 6: Add survival audio (proximity + combo sounds)

**Files:**
- Modify: `src/games/pacman/audio.ts`

**Step 1: Add new audio methods**

Extend `PacmanAudio` interface:
```typescript
export interface PacmanAudio {
  // ... existing methods ...
  playHeartbeat: (intensity: "far" | "mid" | "near") => void;
  playFootstep: (volume: number) => void;
  playComboTick: (combo: number) => void;
  playMilestone: () => void;
  playComboBreak: () => void;
}
```

Implement in `createPacmanAudio()`:
```typescript
playHeartbeat(intensity) {
  if (!ok()) return;
  const rates = { far: 0.8, mid: 0.5, near: 0.2 };
  const rate = rates[intensity];
  // Two-beat pattern: thump-thump
  tone(ctx, "sine", 60, 40, 0.08, 0.10);
  tone(ctx, "sine", 55, 35, 0.08, 0.08, rate * 0.15);
},
playFootstep(volume) {
  if (!ok()) return;
  noise(ctx, 0.04, volume * 0.08);
},
playComboTick(combo) {
  if (!ok()) return;
  if (combo % 5 !== 0 || combo === 0) return;
  // Rising pitch every 5 combo
  const pitch = 300 + Math.min(combo, 100) * 5;
  tone(ctx, "square", pitch, pitch + 100, 0.04, 0.08);
},
playMilestone() {
  if (!ok()) return;
  [500, 700, 900, 1100, 1300].forEach((f, i) =>
    tone(ctx, "square", f, f + 50, 0.08, 0.16, i * 0.06)
  );
},
playComboBreak() {
  if (!ok()) return;
  tone(ctx, "sawtooth", 300, 150, 0.12, 0.08);
},
```

**Step 2: Commit**
```
feat(pacman): add survival audio (proximity, combo sounds)
```

---

### Task 7: Add mode selector and fog rendering to UI

**Files:**
- Modify: `src/app/games/pacman/page.tsx`

**Step 1: Add mode selector to idle overlay**

In the idle overlay section, add two buttons: CLASSIC and SURVIVAL. Store selected mode in a `useState`. Pass mode into `GameModifiers` when dispatching START.

**Step 2: Add fog rendering**

Wrap each `MazeCell` with an opacity style based on `getCellOpacity()` when in survival mode. Import `getCellOpacity` from fog module. Also apply opacity to ghost sprites (ghosts outside fog should be invisible).

In survival mode, each cell gets:
```typescript
const opacity = state.modifiers.gameMode === "survival"
  ? getCellOpacity(x, y, state.pacman, state.visRadius, state.visited, 0.2)
  : 1;
```

Ghost sprites also get opacity based on distance to pac-man (hidden if outside fog radius).

**Step 3: Add proximity audio triggers**

In the game loop effect, when survival mode: compute closest ghost distance using `getClosestGhostDistance()`. Play heartbeat/footstep based on thresholds. Use a `useRef` timer to prevent audio spam (only play every ~500ms).

**Step 4: Commit**
```
feat(pacman): add mode selector and fog of war rendering
```

---

### Task 8: Add combo UI (counter, progress bar, milestone popups)

**Files:**
- Modify: `src/app/games/pacman/page.tsx`

**Step 1: Combo counter display**

In the score bar area (next to SCORE and BEST), add combo display when in survival mode:
```tsx
{state.modifiers.gameMode === "survival" && state.combo > 0 && (
  <span style={{ color: getComboColor(state.combo) }} className="text-[0.55rem]">
    x{state.combo}
  </span>
)}
```

**Step 2: Combo progress bar**

Small bar below the score bar showing progress to next milestone. Width = percentage toward next milestone threshold.

**Step 3: Milestone popup**

When `state.milestonePopup` is not null, show floating text in center of board that fades out:
```tsx
{state.milestonePopup && (
  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
    <span className="text-lg neon-text-orange animate-[floatUp_1.5s_ease-out_forwards]">
      {state.milestonePopup}
    </span>
  </div>
)}
```

**Step 4: Combo audio triggers**

Wire combo sound effects into the audio system:
- On combo increment: `playComboTick(combo)`
- On milestone: `playMilestone()`
- On combo break: `playComboBreak()`

**Step 5: Commit**
```
feat(pacman): add combo UI with counter, progress bar, and popups
```

---

### Task 9: Add ghost evolution visual effects

**Files:**
- Modify: `src/app/games/pacman/page.tsx`
- Modify: `src/app/globals.css` (if new keyframes needed)

**Step 1: Ghost eye glow for AWARE tier**

In `GhostSprite`, when `state.evolutionTier === "aware"` or `"evolved"`:
- Add a glow filter to ghost eyes (CSS `filter: drop-shadow(0 0 3px #ff0)`)

**Step 2: Ghost trail for EVOLVED tier**

When `state.evolutionTier === "evolved"`:
- Ghost eyes turn red (`#ff2d55`)
- Add 2-3 faded afterimage divs behind each ghost using previous positions
- Use CSS opacity 0.3, 0.15 for the trail elements
- Track previous positions in a `useRef` array updated each tick

**Step 3: Add evolution indicator to UI**

Small text in the status bar showing current tier when in survival mode:
```tsx
{state.modifiers.gameMode === "survival" && state.evolutionTier !== "basic" && (
  <span className="text-[0.45rem] text-red-400">
    {state.evolutionTier === "aware" ? "GHOSTS AWARE" : "GHOSTS EVOLVED"}
  </span>
)}
```

**Step 4: Commit**
```
feat(pacman): add ghost evolution visual effects
```

---

### Task 10: Final build verification and testing

**Step 1: Run `npm run build`** — fix any errors

**Step 2: Manual testing checklist (CLASSIC mode):**
- [ ] Classic mode works exactly as before (no regression)
- [ ] Mode selector shows on idle screen
- [ ] Settings panel still works

**Step 3: Manual testing checklist (SURVIVAL mode):**
- [ ] Fog of War: only tiles near pac-man visible
- [ ] Fog: visited tiles show dimly
- [ ] Fog: power pellet expands vision
- [ ] Fog: ghosts invisible outside fog radius
- [ ] Proximity audio: heartbeat when ghost approaches in fog
- [ ] Combo: counter increments on continuous dot eating
- [ ] Combo: resets when pac-man stops
- [ ] Combo: milestones trigger bonuses and popups
- [ ] Combo: progress bar fills toward next milestone
- [ ] Combo: speed boost, vision boost, mini-power work
- [ ] Evolution: ghosts use basic AI on levels 1-2
- [ ] Evolution: ghosts predict turns on levels 3-4 (aware)
- [ ] Evolution: ghosts coordinate pincer on level 5+ (evolved)
- [ ] Evolution: ghost eyes glow on aware, trail on evolved
- [ ] Evolution: learning persists across levels
- [ ] Evolution: 10% forgetting on death

**Step 4: Commit**
```
feat(pacman): SURVIVAL mode complete — Fog of War, Combo, Ghost Evolution
```
