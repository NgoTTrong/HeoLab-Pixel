# Tetris Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance Block Storm (Tetris) with 7 events, combo system, T-spin, back-to-back bonus, particles, screen shake, event overlays, and storm intensity visuals.

**Architecture:** Parallel layers — config.ts constants first, then logic.ts pure reducer changes, then page.tsx visual layer. No new files needed. Visual-only state (particles, shake, popups) lives in page.tsx only; gameplay state lives in the reducer.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, Web Audio API, CSS keyframes (globals.css already has screenShake, overlayIn, floatUp keyframes).

---

## Task 1: Extend config.ts with new events and constants

**Files:**
- Modify: `src/games/tetris/config.ts`

**Step 1: Replace the entire file with the updated version**

```typescript
export type EventType =
  | "lightning" | "bomb" | "freeze" | "fever"
  | "whirlwind" | "overdrive" | "curse";

export interface EventDef {
  type: EventType;
  emoji: string;
  label: string;
  color: string;
}

export const RANDOM_EVENTS: EventDef[] = [
  { type: "lightning", emoji: "⚡", label: "LIGHTNING STRIKE!", color: "#ffe600" },
  { type: "bomb",      emoji: "💣", label: "BOMB BLAST!",       color: "#ff2d95" },
  { type: "freeze",    emoji: "❄️", label: "ICE FREEZE!",       color: "#00d4ff" },
  { type: "fever",     emoji: "🔥", label: "FEVER TIME!",       color: "#f97316" },
  { type: "whirlwind", emoji: "🌪️", label: "WHIRLWIND!",        color: "#a855f7" },
  { type: "overdrive", emoji: "⭐", label: "OVERDRIVE!",        color: "#ffe600" },
  { type: "curse",     emoji: "💀", label: "CURSE!",            color: "#39ff14" },
];

export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;

export const LEVEL_SPEEDS: { level: number; ms: number }[] = [
  { level: 1,  ms: 800 },
  { level: 2,  ms: 700 },
  { level: 3,  ms: 600 },
  { level: 5,  ms: 500 },
  { level: 7,  ms: 380 },
  { level: 10, ms: 280 },
  { level: 13, ms: 200 },
  { level: 16, ms: 150 },
  { level: 20, ms: 100 },
];

export function getSpeed(level: number): number {
  let ms = LEVEL_SPEEDS[0].ms;
  for (const l of LEVEL_SPEEDS) {
    if (level >= l.level) ms = l.ms;
  }
  return ms;
}

// Score per lines cleared (base)
export const LINE_SCORES = [0, 100, 300, 500, 800];

// Combo bonuses (index = combo count, capped at index 4)
export const COMBO_BONUSES = [0, 50, 100, 200, 400];

// T-Spin scores
export const TSPIN_SCORES: Record<string, number> = {
  mini:   400,
  single: 800,
  double: 1200,
  triple: 1600,
};

// Multipliers
export const BACK_TO_BACK_MULT  = 1.5;
export const OVERDRIVE_SPEED_MULT = 2;   // interval divided by this = 2x faster
export const OVERDRIVE_SCORE_MULT = 3;
export const OVERDRIVE_DURATION   = 15000;
export const FEVER_DURATION       = 30000;
export const FREEZE_DURATION      = 3000;
export const GARBAGE_ROWS_BOMB    = 2;
export const GARBAGE_ROWS_CURSE   = 3;
```

**Step 2: Type-check**

Run: `cd E:/Personal/GameStation && npx tsc --noEmit`
Expected: No errors related to config.ts (logic.ts will temporarily fail until Task 2).

**Step 3: Commit**

```bash
git add src/games/tetris/config.ts
git commit -m "feat(tetris): add 3 new events and scoring constants to config"
```

---

## Task 2: Update logic.ts — state types + clearLines row tracking

**Files:**
- Modify: `src/games/tetris/logic.ts`

**Step 1: Add new fields to TetrisState interface**

Find the `TetrisState` interface and add:
```typescript
export interface TetrisState {
  board: Board;
  active: ActivePiece;
  held: TetrominoType | null;
  canHold: boolean;
  bag: TetrominoType[];
  nextPieces: TetrominoType[];
  score: number;
  lines: number;
  level: number;
  status: GameStatus;
  activeEvent: EventType | null;
  eventEndsAt: number | null;
  linesUntilEvent: number;
  // NEW:
  combo: number;
  lastClearWasTetrisOrTSpin: boolean;
  tSpinType: "none" | "mini" | "full";
  overdriveActive: boolean;
  lastWasRotation: boolean;       // used for T-spin detection
  lastClearedRows: number[];      // visual flash: which rows just cleared
}
```

**Step 2: Update clearLines to return which rows were cleared**

Replace the `clearLines` function:
```typescript
function clearLines(board: Board): { board: Board; cleared: number; clearedRows: number[] } {
  const clearedRows: number[] = [];
  board.forEach((row, i) => {
    if (row.every((c) => c !== null)) clearedRows.push(i);
  });
  const remaining = board.filter((row) => row.some((c) => c === null));
  const cleared = BOARD_ROWS - remaining.length;
  const newRows = Array.from({ length: cleared }, () => Array(BOARD_COLS).fill(null));
  return { board: [...newRows, ...remaining], cleared, clearedRows };
}
```

Note: old version used `row.some(c => c === null)` to keep rows — that is correct. The clearedRows check uses `row.every(c => c !== null)`.

**Step 3: Update initialState to include new fields**

```typescript
function initialState(): TetrisState {
  const bag1 = createBag();
  const bag2 = createBag();
  const allPieces = [...bag1, ...bag2];
  return {
    board: emptyBoard(),
    active: spawnPiece(allPieces[0]),
    held: null,
    canHold: true,
    bag: allPieces.slice(4),
    nextPieces: allPieces.slice(1, 4),
    score: 0,
    lines: 0,
    level: 1,
    status: "idle",
    activeEvent: null,
    eventEndsAt: null,
    linesUntilEvent: 5,
    combo: 0,
    lastClearWasTetrisOrTSpin: false,
    tSpinType: "none",
    overdriveActive: false,
    lastWasRotation: false,
    lastClearedRows: [],
  };
}
```

**Step 4: Update ROTATE action to set lastWasRotation: true, and clear it in MOVE_LEFT/MOVE_RIGHT/MOVE_DOWN/HOLD**

In MOVE_LEFT:
```typescript
case "MOVE_LEFT": {
  if (state.status !== "playing") return state;
  const moved = { ...state.active, col: state.active.col - 1 };
  return isValid(state.board, moved)
    ? { ...state, active: moved, lastWasRotation: false }
    : state;
}
```

Same pattern for MOVE_RIGHT.

In ROTATE (after the for loop that finds a valid kick):
```typescript
return { ...state, active: kicked, lastWasRotation: true };
```

In HOLD:
```typescript
return { ...state, active, held: newHeld, canHold: false, bag, nextPieces, lastWasRotation: false };
```

**Step 5: Update the reducer's initial state call (useReducer in page.tsx)**

The page.tsx lazy-init object also needs the new fields — we fix that in Task 7.

**Step 6: Update imports at the top of logic.ts**

Add new constants to the import from config:
```typescript
import {
  BOARD_COLS, BOARD_ROWS, LINE_SCORES, RANDOM_EVENTS, getSpeed,
  COMBO_BONUSES, TSPIN_SCORES, BACK_TO_BACK_MULT,
  OVERDRIVE_SCORE_MULT, OVERDRIVE_DURATION, FEVER_DURATION, FREEZE_DURATION,
  GARBAGE_ROWS_BOMB, GARBAGE_ROWS_CURSE,
} from "./config";
```

**Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: Errors only in TICK case where clearLines return value is not yet destructured with clearedRows — fix in Task 5.

**Step 8: Commit**

```bash
git add src/games/tetris/logic.ts
git commit -m "feat(tetris): extend state types with combo, T-spin, overdrive, clearLines row tracking"
```

---

## Task 3: Update logic.ts — applyEvent for bomb, whirlwind, curse

**Files:**
- Modify: `src/games/tetris/logic.ts`

**Step 1: Replace the applyEvent function**

```typescript
function applyEvent(board: Board, event: EventType): Board {
  const newBoard = board.map((row) => [...row]);

  if (event === "lightning") {
    const nonEmpty = newBoard.reduce<number[]>((acc, row, i) => {
      if (row.some((c) => c !== null)) acc.push(i);
      return acc;
    }, []);
    if (nonEmpty.length > 0) {
      const targetRow = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
      newBoard.splice(targetRow, 1);
      newBoard.unshift(Array(BOARD_COLS).fill(null));
    }
  } else if (event === "bomb" || event === "curse") {
    const rows = event === "bomb" ? GARBAGE_ROWS_BOMB : GARBAGE_ROWS_CURSE;
    for (let i = 0; i < rows; i++) {
      const gapCol = Math.floor(Math.random() * BOARD_COLS);
      const garbageRow: (string | null)[] = Array.from(
        { length: BOARD_COLS },
        (_, c) => (c === gapCol ? null : "#444466")
      );
      newBoard.splice(0, 1);   // remove top row (shift board up)
      newBoard.push(garbageRow); // add garbage at bottom
    }
  } else if (event === "whirlwind") {
    for (let r = 0; r < newBoard.length; r++) {
      const shift = Math.floor(Math.random() * 5) - 2; // -2 to +2
      if (shift === 0) continue;
      const row = newBoard[r];
      const shifted: (string | null)[] = Array(BOARD_COLS).fill(null);
      for (let c = 0; c < BOARD_COLS; c++) {
        const newC = ((c + shift) % BOARD_COLS + BOARD_COLS) % BOARD_COLS;
        shifted[newC] = row[c];
      }
      newBoard[r] = shifted;
    }
  }
  return newBoard;
}
```

**Step 2: Update event trigger block in TICK to handle new events**

In the TICK case, find the event trigger block (around line 200) and replace with:

```typescript
if (linesUntilEvent <= 0 && cleared > 0) {
  linesUntilEvent = 5;
  const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
  activeEvent = event.type;
  if (event.type === "freeze") {
    board = applyEvent(board, event.type);
    eventEndsAt = Date.now() + FREEZE_DURATION;
  } else if (event.type === "fever") {
    eventEndsAt = Date.now() + FEVER_DURATION;
  } else if (event.type === "lightning") {
    board = applyEvent(board, event.type);
    eventEndsAt = Date.now() + 2000;
  } else if (event.type === "bomb") {
    board = applyEvent(board, event.type);
    eventEndsAt = Date.now() + 2000;
  } else if (event.type === "whirlwind") {
    board = applyEvent(board, event.type);
    eventEndsAt = Date.now() + 2000;
  } else if (event.type === "curse") {
    board = applyEvent(board, event.type);
    eventEndsAt = Date.now() + 2000;
  } else if (event.type === "overdrive") {
    eventEndsAt = Date.now() + OVERDRIVE_DURATION;
  }
}
```

**Step 3: Handle overdrive expiry — add overdriveActive to return value in TICK**

In the "Expire time-based events" block, also reset overdriveActive:
```typescript
let overdriveActive = state.overdriveActive;
// Set overdrive when event starts
if (event.type === "overdrive") overdriveActive = true;

// Expire
if (eventEndsAt && Date.now() > eventEndsAt) {
  activeEvent = null;
  eventEndsAt = null;
  overdriveActive = false;
}
```

And include `overdriveActive` in the return object of TICK.

**Step 4: Type-check**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/games/tetris/logic.ts
git commit -m "feat(tetris): fix bomb event, add whirlwind/curse/overdrive event effects"
```

---

## Task 4: Update logic.ts — T-spin detection

**Files:**
- Modify: `src/games/tetris/logic.ts`

**Step 1: Add detectTSpin function (add after ghostRow function)**

```typescript
function detectTSpin(
  board: Board,
  piece: ActivePiece,
  wasRotation: boolean
): "none" | "mini" | "full" {
  if (piece.type !== "T" || !wasRotation) return "none";
  // Check all 4 corners of the T bounding box (3x3)
  const corners: [number, number][] = [
    [piece.col,     piece.row],
    [piece.col + 2, piece.row],
    [piece.col,     piece.row + 2],
    [piece.col + 2, piece.row + 2],
  ];
  const occupied = corners.filter(([c, r]) =>
    c < 0 || c >= BOARD_COLS || r < 0 || r >= BOARD_ROWS ||
    (board[r] !== undefined && board[r][c] !== null)
  ).length;
  if (occupied < 3) return "none";
  return occupied >= 4 ? "full" : "mini";
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/games/tetris/logic.ts
git commit -m "feat(tetris): add T-spin detection"
```

---

## Task 5: Update logic.ts — combo, back-to-back, T-spin scoring in TICK

**Files:**
- Modify: `src/games/tetris/logic.ts`

**Step 1: Replace the scoring block in the TICK case**

Find the section after `const { board: clearedBoard, cleared } = clearLines(board);` and replace the entire scoring + event + return block:

```typescript
// Lock piece
let board = lockPiece(state.board, state.active);
const { board: clearedBoard, cleared, clearedRows } = clearLines(board);
board = clearedBoard;

// T-spin detection (must run before board is cleared)
const tSpinType = detectTSpin(state.board, state.active, state.lastWasRotation);

// Scoring multipliers
const isFever    = state.activeEvent === "fever";
const isOverdrive = state.overdriveActive;

// Base score: T-spin takes priority over line score
let baseScore = 0;
if (tSpinType !== "none" && cleared > 0) {
  const key = ["single", "double", "triple"][Math.min(cleared, 3) - 1] ?? "single";
  baseScore = TSPIN_SCORES[key] ?? TSPIN_SCORES.single;
} else if (tSpinType === "mini" && cleared === 1) {
  baseScore = TSPIN_SCORES.mini;
} else {
  baseScore = LINE_SCORES[Math.min(cleared, 4)];
}

// Back-to-back bonus
const isTetrisOrTSpin = cleared === 4 || tSpinType !== "none";
const b2bMult = (state.lastClearWasTetrisOrTSpin && isTetrisOrTSpin && cleared > 0)
  ? BACK_TO_BACK_MULT : 1;

// Fever + Overdrive multipliers
const scoreMult = (isFever ? 2 : 1) * (isOverdrive ? OVERDRIVE_SCORE_MULT : 1);

const lineScore = Math.floor(baseScore * b2bMult * scoreMult);

// Combo
const newCombo = cleared > 0 ? state.combo + 1 : 0;
const comboBonus = cleared > 0
  ? (COMBO_BONUSES[Math.min(newCombo, COMBO_BONUSES.length - 1)] ?? 400) * scoreMult
  : 0;

const newScore  = state.score + lineScore + Math.floor(comboBonus);
const newLines  = state.lines + cleared;
const newLevel  = Math.floor(newLines / 10) + 1;
```

Also update the return of TICK to include new state fields:
```typescript
return {
  ...state,
  board,
  active,
  bag,
  nextPieces,
  canHold: true,
  score: newScore,
  lines: newLines,
  level: newLevel,
  activeEvent,
  eventEndsAt,
  overdriveActive,
  linesUntilEvent: Math.max(linesUntilEvent, 0),
  combo: newCombo,
  lastClearWasTetrisOrTSpin: cleared > 0 ? isTetrisOrTSpin : state.lastClearWasTetrisOrTSpin,
  tSpinType,
  lastWasRotation: false,  // reset after lock
  lastClearedRows: clearedRows,
};
```

Also update game-over return to include new fields:
```typescript
if (!isValid(board, active)) {
  return {
    ...state,
    board,
    score: newScore,
    lines: newLines,
    level: newLevel,
    status: "over",
    combo: 0,
    tSpinType: "none",
    lastClearedRows: clearedRows,
  };
}
```

**Step 2: Declare `overdriveActive` variable in TICK before the event block**

At the start of the TICK case scoring section, add:
```typescript
let overdriveActive = state.overdriveActive;
```

And in the event trigger:
```typescript
} else if (event.type === "overdrive") {
  eventEndsAt = Date.now() + OVERDRIVE_DURATION;
  overdriveActive = true;
}
```

**Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Verify in browser**

Run: `npm run dev`
- Start game, clear lines → check score increases correctly
- Clear 4 lines twice in a row → score should get 1.5× bonus on second Tetris
- Stack a combo → score popup should show (added in later task, for now just confirm no crash)

**Step 5: Commit**

```bash
git add src/games/tetris/logic.ts
git commit -m "feat(tetris): add combo system, back-to-back bonus, T-spin scoring"
```

---

## Task 6: Update page.tsx — fix lazy init + wire Overdrive speed

**Files:**
- Modify: `src/app/games/tetris/page.tsx`

**Step 1: Update the lazy-init object in useReducer to include new fields**

Find the useReducer initializer function and add new fields:
```typescript
const [state, dispatch] = useReducer(tetrisReducer, undefined, () => {
  return {
    board: Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null)),
    active: { type: "I" as const, rotation: 0, col: 3, row: 0 },
    held: null,
    canHold: true,
    bag: [],
    nextPieces: [] as any[],
    score: 0,
    lines: 0,
    level: 1,
    status: "idle" as const,
    activeEvent: null,
    eventEndsAt: null,
    linesUntilEvent: 5,
    combo: 0,
    lastClearWasTetrisOrTSpin: false,
    tSpinType: "none" as const,
    overdriveActive: false,
    lastWasRotation: false,
    lastClearedRows: [] as number[],
  };
});
```

**Step 2: Update imports in page.tsx**

Add new constants to the config import:
```typescript
import {
  BOARD_COLS, BOARD_ROWS, RANDOM_EVENTS, getSpeed,
  OVERDRIVE_SPEED_MULT,
} from "@/games/tetris/config";
```

**Step 3: Wire Overdrive to tick interval**

Find the setInterval useEffect and change:
```typescript
useEffect(() => {
  if (state.status !== "playing") return;
  const ms = Math.floor(getSpeed(state.level) / (state.overdriveActive ? OVERDRIVE_SPEED_MULT : 1));
  const id = setInterval(() => dispatch({ type: "TICK", now: Date.now() }), ms);
  return () => clearInterval(id);
}, [state.status, state.level, state.overdriveActive]);
```

**Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 5: Verify Overdrive in browser**

Trigger OVERDRIVE event (play until 5 lines cleared, hope it randomly selects OVERDRIVE — or temporarily force it by editing config to only have "overdrive" in RANDOM_EVENTS array). Pieces should fall 2× faster.

**Step 6: Commit**

```bash
git add src/app/games/tetris/page.tsx
git commit -m "feat(tetris): wire overdrive speed multiplier to tick interval"
```

---

## Task 7: page.tsx — line clear flash + screen shake

**Files:**
- Modify: `src/app/games/tetris/page.tsx`

**Step 1: Add shake and flash state + refs**

Add near the top of TetrisPage, after the existing useState hooks:
```typescript
const [shakeKey, setShakeKey]   = useState(0);   // increment to retrigger animation
const [shakeAnim, setShakeAnim] = useState("");   // CSS animation class
const [flashRows, setFlashRows] = useState<number[]>([]);
const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

**Step 2: Add triggerShake helper inside TetrisPage**

```typescript
const triggerShake = useCallback((intensity: "light" | "medium" | "heavy") => {
  const cls = {
    light:  "animate-[screenShake_0.2s_ease-out]",
    medium: "animate-[screenShake_0.3s_ease-out]",
    heavy:  "animate-[screenShake_0.5s_ease-out]",
  }[intensity];
  setShakeAnim("");
  // Double-rAF to force reflow so animation restarts
  requestAnimationFrame(() => requestAnimationFrame(() => setShakeAnim(cls)));
}, []);
```

**Step 3: Add useEffect to react to line clears and trigger flash + shake**

```typescript
useEffect(() => {
  const delta = state.lines - prevLinesRef.current;
  if (delta > 0) {
    // Flash cleared rows
    setFlashRows(state.lastClearedRows);
    setTimeout(() => setFlashRows([]), 150);
    // Shake
    triggerShake(delta >= 4 ? "medium" : "light");
    audioRef.current?.playClear(delta);
  }
  prevLinesRef.current = state.lines;
}, [state.lines, state.lastClearedRows, triggerShake]);
```

**Step 4: Add useEffect for hard-drop and game-over shake**

```typescript
// Game-over shake
useEffect(() => {
  if (state.status === "over" && prevStatusRef.current !== "over") {
    triggerShake("heavy");
    audioRef.current?.playGameOver();
  }
  prevStatusRef.current = state.status;
}, [state.status, triggerShake]);
```

For hard-drop shake, add to the handleKey callback in the Space case:
```typescript
case " ":
  e.preventDefault();
  dispatch({ type: "HARD_DROP" });
  triggerShake("light");
  break;
```

**Step 5: Apply shakeAnim and flash to board wrapper**

The board `<div>` currently has:
```tsx
<div className="relative border border-gray-800" style={{ ... }}>
```

Change to:
```tsx
<div
  className={`relative border border-gray-800 ${shakeAnim}`}
  style={{ width: CELL_SIZE * BOARD_COLS, height: CELL_SIZE * BOARD_ROWS }}
>
```

**Step 6: Add flash overlay inside the board div (after the event banner)**

```tsx
{/* Line clear flash rows */}
{flashRows.map((r) => (
  <div
    key={r}
    className="absolute inset-x-0 pointer-events-none z-10"
    style={{
      top: r * CELL_SIZE,
      height: CELL_SIZE,
      background: "rgba(255,255,255,0.85)",
      animation: "overlayIn 0.15s ease-out forwards",
    }}
  />
))}
```

**Step 7: Type-check and browser verify**

Run: `npx tsc --noEmit`
In browser: clear a line → row should flash white briefly, board should shake slightly.
Clear 4 lines (Tetris) → stronger shake.
Game over → heavy shake.

**Step 8: Commit**

```bash
git add src/app/games/tetris/page.tsx
git commit -m "feat(tetris): add line clear flash animation and screen shake"
```

---

## Task 8: page.tsx — pixel particle system on line clear

**Files:**
- Modify: `src/app/games/tetris/page.tsx`

**Step 1: Add Particle type and state at the top of TetrisPage**

```typescript
interface Particle {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  life: number;   // 1.0 → 0.0
  size: number;
}

const [particles, setParticles] = useState<Particle[]>([]);
const particleIdRef  = useRef(0);
const particleRafRef = useRef<number | null>(null);
```

**Step 2: Add spawnParticles helper**

```typescript
const spawnParticles = useCallback((rows: number[], boardLeft: number) => {
  const newParticles: Particle[] = [];
  for (const r of rows) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const count = 3;
      for (let i = 0; i < count; i++) {
        const colors = ["#39ff14","#ff2d95","#ffe600","#00d4ff","#a855f7","#f97316"];
        newParticles.push({
          id: ++particleIdRef.current,
          x: boardLeft + c * CELL_SIZE + CELL_SIZE / 2,
          y: r * CELL_SIZE + CELL_SIZE / 2,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.8) * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1.0,
          size: Math.random() * 4 + 2,
        });
      }
    }
  }
  setParticles(prev => [...prev, ...newParticles]);
}, []);
```

Note: `boardLeft` is the board's left offset on screen. Pass 0 and use absolute positioning relative to the board div.

Actually, simpler: position particles relative to the board wrapper using `position: absolute` inside the board div. x/y are board-local coordinates.

Update spawnParticles to use board-local coords:
```typescript
const spawnParticles = useCallback((rows: number[]) => {
  const newParticles: Particle[] = [];
  for (const r of rows) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const count = rows.length >= 4 ? 5 : 3;
      for (let i = 0; i < count; i++) {
        const colors = ["#39ff14","#ff2d95","#ffe600","#00d4ff","#a855f7","#f97316"];
        newParticles.push({
          id: ++particleIdRef.current,
          x: c * CELL_SIZE + CELL_SIZE / 2,
          y: r * CELL_SIZE + CELL_SIZE / 2,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.9) * 7,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1.0,
          size: Math.random() * 4 + 2,
        });
      }
    }
  }
  setParticles(prev => [...prev, ...newParticles]);
}, []);
```

**Step 3: Add RAF animation loop for particles**

```typescript
useEffect(() => {
  if (particles.length === 0) {
    if (particleRafRef.current !== null) {
      cancelAnimationFrame(particleRafRef.current);
      particleRafRef.current = null;
    }
    return;
  }
  const tick = () => {
    setParticles(prev => {
      const next = prev
        .map(p => ({
          ...p,
          x:    p.x + p.vx,
          y:    p.y + p.vy,
          vy:   p.vy + 0.3,   // gravity
          life: p.life - 0.04,
        }))
        .filter(p => p.life > 0);
      return next;
    });
    particleRafRef.current = requestAnimationFrame(tick);
  };
  particleRafRef.current = requestAnimationFrame(tick);
  return () => {
    if (particleRafRef.current !== null) cancelAnimationFrame(particleRafRef.current);
  };
}, [particles.length > 0]);
```

Wait — `particles.length > 0` as dep is a boolean. Use a stable dep:

```typescript
const hasParticles = particles.length > 0;
useEffect(() => { ... }, [hasParticles]);
```

**Step 4: Trigger spawnParticles in the line-clear useEffect**

In the existing line-clear useEffect (from Task 7), add:
```typescript
if (delta > 0) {
  setFlashRows(state.lastClearedRows);
  setTimeout(() => setFlashRows([]), 150);
  spawnParticles(state.lastClearedRows);  // ADD THIS
  triggerShake(delta >= 4 ? "medium" : "light");
  audioRef.current?.playClear(delta);
}
```

**Step 5: Render particles inside the board div**

Add after the flashRows render, inside the board `<div>`:
```tsx
{/* Particles */}
{particles.map(p => (
  <div
    key={p.id}
    className="pointer-events-none absolute"
    style={{
      left: p.x - p.size / 2,
      top:  p.y - p.size / 2,
      width:  p.size,
      height: p.size,
      backgroundColor: p.color,
      opacity: p.life,
      boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
      borderRadius: "1px",
      zIndex: 15,
    }}
  />
))}
```

**Step 6: Type-check and verify in browser**

Run: `npx tsc --noEmit`
In browser: clear a line → colored pixels should burst from the cleared row and fall with gravity.

**Step 7: Commit**

```bash
git add src/app/games/tetris/page.tsx
git commit -m "feat(tetris): add pixel particle burst on line clear"
```

---

## Task 9: page.tsx — event visual overlays

**Files:**
- Modify: `src/app/games/tetris/page.tsx`

Each overlay is a `position: absolute` or `position: fixed` div layered over the board. Add inside the board `<div>`, after particles.

**Step 1: Add the event overlay block**

```tsx
{/* Event visual overlays */}
{state.activeEvent === "fever" && (
  <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
    {/* Fire vignette */}
    <div className="absolute inset-0"
      style={{ background: "radial-gradient(ellipse at bottom, rgba(249,115,22,0.35) 0%, transparent 70%)" }} />
    {/* Pulsing border */}
    <div className="absolute inset-0 border-2 border-orange-500/60"
      style={{ animation: "pulseRing 1s ease-out infinite" }} />
  </div>
)}

{state.activeEvent === "freeze" && (
  <div className="absolute inset-0 pointer-events-none z-20">
    <div className="absolute inset-0"
      style={{ background: "rgba(0,212,255,0.08)", border: "2px solid rgba(0,212,255,0.3)" }} />
    {/* Ice tint overlay */}
    <div className="absolute inset-0"
      style={{ background: "radial-gradient(ellipse at top, rgba(0,212,255,0.15) 0%, transparent 60%)" }} />
  </div>
)}

{state.activeEvent === "overdrive" && (
  <div className="absolute inset-0 pointer-events-none z-20">
    <div className="absolute inset-0 border-2 border-yellow-300/70"
      style={{ animation: "pulseRing 0.6s ease-out infinite" }} />
    <div className="absolute inset-0"
      style={{ background: "radial-gradient(ellipse at center, rgba(255,230,0,0.06) 0%, transparent 70%)" }} />
  </div>
)}

{state.activeEvent === "curse" && (
  <div className="absolute inset-0 pointer-events-none z-20">
    <div className="absolute inset-x-0 bottom-0 h-1/3"
      style={{ background: "linear-gradient(to top, rgba(57,255,20,0.2), transparent)" }} />
    <div className="absolute inset-0 border border-neon-green/30" />
  </div>
)}
```

**Step 2: Add lightning/bomb/whirlwind one-shot flash state**

```typescript
const [eventFlash, setEventFlash] = useState<string | null>(null);

// Detect new event triggers to fire one-shot flashes
const prevEventRef = useRef<string | null>(null);
useEffect(() => {
  const cur = state.activeEvent;
  if (cur && cur !== prevEventRef.current) {
    if (cur === "lightning") setEventFlash("yellow");
    else if (cur === "bomb")  setEventFlash("red");
    else if (cur === "whirlwind") setEventFlash("purple");
    else if (cur === "curse") setEventFlash("green");
    setTimeout(() => setEventFlash(null), 180);
  }
  prevEventRef.current = cur;
}, [state.activeEvent]);
```

**Step 3: Render the one-shot flash inside the board**

```tsx
{eventFlash && (
  <div
    className="absolute inset-0 pointer-events-none z-30"
    style={{
      backgroundColor:
        eventFlash === "yellow" ? "rgba(255,230,0,0.35)" :
        eventFlash === "red"    ? "rgba(255,45,149,0.35)" :
        eventFlash === "purple" ? "rgba(168,85,247,0.35)" :
        "rgba(57,255,20,0.25)",
      animation: "overlayIn 0.18s ease-out forwards",
    }}
  />
)}
```

**Step 4: Type-check and verify**

Run: `npx tsc --noEmit`
In browser: trigger events (temporarily comment out other events in RANDOM_EVENTS to force specific ones).
- Fever → orange vignette + pulsing border
- Freeze → blue tint
- Overdrive → yellow pulse
- Lightning/Bomb/Curse → flash

**Step 5: Commit**

```bash
git add src/app/games/tetris/page.tsx
git commit -m "feat(tetris): add event visual overlays (fever, freeze, overdrive, curse, flash)"
```

---

## Task 10: page.tsx — storm intensity visuals (level-based)

**Files:**
- Modify: `src/app/games/tetris/page.tsx`

**Step 1: Add storm class to board wrapper based on level**

The board outer `<div>` currently has `className={...shakeAnim}`. Extend:

```tsx
<div
  className={`relative border transition-colors duration-1000 ${shakeAnim} ${
    state.level >= 20 ? "border-yellow-300/80" :
    state.level >= 15 ? "border-pink-500/60" :
    state.level >= 10 ? "border-purple-500/40" :
    "border-gray-800"
  }`}
  style={{ width: CELL_SIZE * BOARD_COLS, height: CELL_SIZE * BOARD_ROWS }}
>
```

**Step 2: Add level 10+ lightning crack decoration**

Add after the board closing tag (sibling, not inside):
```tsx
{/* Storm intensity: level 10+ edge effects */}
{state.level >= 10 && state.status === "playing" && (
  <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
    <div
      className="absolute left-0 top-0 bottom-0 w-1"
      style={{
        background: `linear-gradient(to bottom, transparent, ${
          state.level >= 20 ? "#ffe600" : state.level >= 15 ? "#ff2d95" : "#a855f7"
        }88, transparent)`,
        animation: "scanlineSwipe 3s linear infinite",
      }}
    />
    <div
      className="absolute right-0 top-0 bottom-0 w-1"
      style={{
        background: `linear-gradient(to bottom, transparent, ${
          state.level >= 20 ? "#ffe600" : state.level >= 15 ? "#ff2d95" : "#a855f7"
        }88, transparent)`,
        animation: "scanlineSwipe 3s linear 1.5s infinite",
      }}
    />
  </div>
)}
```

Note: `scanlineSwipe` keyframe already exists in globals.css.

**Step 3: Add level 15+ board border glitch**

For level 15+, add a glitch class to the board border. Add a CSS animation in globals.css:

In `src/app/globals.css`, add to the keyframes section:
```css
@keyframes borderGlitch {
  0%, 90%, 100% { opacity: 1; }
  92% { opacity: 0.3; }
  94% { opacity: 1; }
  96% { opacity: 0.5; }
  98% { opacity: 1; }
}
```

Apply to the board wrapper when level >= 15:
```tsx
style={{
  width: CELL_SIZE * BOARD_COLS,
  height: CELL_SIZE * BOARD_ROWS,
  animation: state.level >= 15 && state.status === "playing"
    ? "borderGlitch 4s ease-in-out infinite" : undefined,
}}
```

**Step 4: Type-check and verify**

Run: `npx tsc --noEmit`
In browser: level up past 10 → board border changes color. Past 15 → border occasionally glitches.

**Step 5: Commit**

```bash
git add src/app/globals.css src/app/games/tetris/page.tsx
git commit -m "feat(tetris): add storm intensity visuals based on level"
```

---

## Task 11: page.tsx — score, combo, T-spin and back-to-back popups

**Files:**
- Modify: `src/app/games/tetris/page.tsx`

**Step 1: Add Popup type and state**

```typescript
interface Popup {
  id: number;
  text: string;
  color: string;
  y: number;   // board-local y in px
  type: "score" | "combo" | "special";
}
const [popups, setPopups] = useState<Popup[]>([]);
const popupIdRef = useRef(0);
```

**Step 2: Add addPopup helper**

```typescript
const addPopup = useCallback((text: string, color: string, y: number, type: Popup["type"] = "score") => {
  const id = ++popupIdRef.current;
  setPopups(prev => [...prev, { id, text, color, y, type }]);
  setTimeout(() => setPopups(prev => prev.filter(p => p.id !== id)), 1200);
}, []);
```

**Step 3: Trigger popups from line-clear useEffect**

Add refs to track previous combo and tSpinType:
```typescript
const prevComboRef   = useRef(0);
const prevTSpinRef   = useRef<string>("none");
const prevB2BRef     = useRef(false);
```

In the line-clear useEffect, after the delta > 0 block:
```typescript
if (delta > 0) {
  // ... existing flash/shake/particle code ...

  // Score popup
  const topClearedRow = Math.min(...state.lastClearedRows);
  addPopup(`+${state.score - (prevScoreForPopupRef.current)}`, "#ffe600", topClearedRow * CELL_SIZE);

  // Combo popup
  if (state.combo >= 2) {
    addPopup(`COMBO ×${state.combo}`, "#ff2d95", topClearedRow * CELL_SIZE + 24, "combo");
  }

  // T-Spin popup
  if (state.tSpinType !== "none") {
    const label = state.tSpinType === "mini" ? "T-SPIN MINI!" : `T-SPIN ${["","SINGLE","DOUBLE","TRIPLE"][Math.min(delta,3)]}!`;
    addPopup(label, "#a855f7", topClearedRow * CELL_SIZE + 48, "special");
  }

  // Back-to-back popup
  if (state.lastClearWasTetrisOrTSpin && (delta === 4 || state.tSpinType !== "none")) {
    addPopup("BACK TO BACK!", "#00d4ff", topClearedRow * CELL_SIZE + 72, "special");
  }

  // Tetris popup
  if (delta === 4) {
    addPopup("TETRIS!", "#ffe600", topClearedRow * CELL_SIZE + 48, "special");
  }
}
```

Add `prevScoreForPopupRef`:
```typescript
const prevScoreForPopupRef = useRef(0);
// update it after popup calculation:
prevScoreForPopupRef.current = state.score;
```

**Step 4: Render popups inside the board div**

```tsx
{/* Popups */}
{popups.map(p => (
  <div
    key={p.id}
    className="absolute pointer-events-none font-pixel z-25"
    style={{
      left: "50%",
      top: p.y,
      transform: "translateX(-50%)",
      color: p.color,
      fontSize: p.type === "special" ? "0.55rem" : "0.5rem",
      textShadow: `0 0 8px ${p.color}`,
      animation: "floatUp 1.2s ease-out forwards",
      whiteSpace: "nowrap",
    }}
  >
    {p.text}
  </div>
))}
```

**Step 5: Type-check and verify**

Run: `npx tsc --noEmit`
In browser: clear lines → score popup floats up. Chain combos → COMBO ×N shows. Clear 4 lines → "TETRIS!" shows.

**Step 6: Commit**

```bash
git add src/app/games/tetris/page.tsx
git commit -m "feat(tetris): add floating score, combo, T-spin, and back-to-back popups"
```

---

## Task 12: page.tsx — update HELP content and audio for new events

**Files:**
- Modify: `src/app/games/tetris/page.tsx`
- Modify: `src/games/tetris/audio.ts`

**Step 1: Update HELP in page.tsx**

```typescript
const HELP: GameHelp = {
  objective: "Clear horizontal lines by filling them completely with falling pieces. Survive chaos events and reach the highest score before pieces stack to the top.",
  controls: [
    { key: "Left / Right", action: "Move piece sideways" },
    { key: "Up / Z",       action: "Rotate piece" },
    { key: "Down",         action: "Soft drop — faster fall" },
    { key: "Space",        action: "Hard drop — instant place" },
    { key: "C",            action: "Hold piece" },
  ],
  scoring: [
    { icon: "💥", name: "TETRIS",       desc: "Clear 4 lines at once for 800 pts — the most efficient scoring move." },
    { icon: "🔗", name: "COMBO",        desc: "Clear lines on consecutive drops to earn bonus points (50→100→200→400+)." },
    { icon: "⤴️", name: "BACK TO BACK", desc: "Two Tetris or T-Spin clears in a row gives 1.5× score on the second." },
    { icon: "🌀", name: "T-SPIN",       desc: "Lock a T-piece via rotation with 3+ corners occupied for big bonus points." },
  ],
  specials: [
    { icon: "⚡", name: "LIGHTNING",  desc: "Clears one random filled row — a free gift from the storm." },
    { icon: "❄️", name: "ICE FREEZE", desc: "Pauses auto-drop for 3 seconds — use the time wisely." },
    { icon: "🔥", name: "FEVER",      desc: "2× score multiplier for 30 seconds." },
    { icon: "💣", name: "BOMB BLAST", desc: "Adds 2 garbage rows from the bottom. Deal with it." },
    { icon: "🌪️", name: "WHIRLWIND",  desc: "Scrambles all locked cells sideways. Chaos." },
    { icon: "⭐", name: "OVERDRIVE",  desc: "Pieces fall 2× faster — but score 3× for 15 seconds." },
    { icon: "💀", name: "CURSE",      desc: "Adds 3 garbage rows from the bottom. Much worse than a bomb." },
    { icon: "👻", name: "GHOST PIECE", desc: "Faint outline shows where the piece will land." },
    { icon: "⏩", name: "SPEED UP",   desc: "Every 10 lines increases fall speed. At level 15 the board starts glitching." },
  ],
};
```

**Step 2: Add event trigger sound in audio.ts**

Add a new method `playEvent` to TetrisAudio:

In `audio.ts`, add to the interface:
```typescript
playEvent: (type: string) => void;
```

In `createTetrisAudio`, add:
```typescript
playEvent(type) {
  if (!ok()) return;
  if (type === "fever")     tone(ctx, "square",   880, 1100, 0.12, 0.18);
  else if (type === "freeze")    tone(ctx, "triangle", 600, 300,  0.10, 0.20);
  else if (type === "lightning") { tone(ctx, "sawtooth", 800, 200, 0.15, 0.08); noise(ctx, 0.10, 0.08); }
  else if (type === "bomb")      noise(ctx, 0.18, 0.25);
  else if (type === "whirlwind") [400,500,600,500,400].forEach((f,i) => tone(ctx,"square",f,f,0.08,0.10,i*0.06));
  else if (type === "overdrive") [523,659,784,1047].forEach((f,i) => tone(ctx,"square",f,f,0.12,0.14,i*0.07));
  else if (type === "curse")     [300,250,200,150].forEach((f,i) => tone(ctx,"sawtooth",f,f*0.8,0.12,0.12,i*0.08));
},
```

**Step 3: Call playEvent from page.tsx on new event trigger**

In the `prevEventRef` useEffect (Task 9):
```typescript
useEffect(() => {
  const cur = state.activeEvent;
  if (cur && cur !== prevEventRef.current) {
    audioRef.current?.playEvent(cur);
    // ... existing flash code ...
  }
  prevEventRef.current = cur;
}, [state.activeEvent]);
```

**Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 5: Final browser verification**

Run: `npm run dev`

Verify the full feature set:
- [ ] All 7 events appear and do the right thing
- [ ] Bomb/Curse add garbage rows
- [ ] Whirlwind scrambles board
- [ ] Overdrive speeds up + shows pulsing border
- [ ] Line clear → flash + particles + shake + popup
- [ ] Tetris → "TETRIS!" popup + medium shake
- [ ] Combo chain → "COMBO ×N" popup
- [ ] T-spin → "T-SPIN!" popup
- [ ] Back-to-back → "BACK TO BACK!" popup
- [ ] Level 10+ → board border changes color
- [ ] Level 15+ → border glitches
- [ ] Events play distinct sounds
- [ ] Game over → heavy shake
- [ ] All text is English

**Step 6: Final commit**

```bash
git add src/app/games/tetris/page.tsx src/games/tetris/audio.ts
git commit -m "feat(tetris): update HELP content and add event audio sounds"
```
