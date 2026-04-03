# Tetris 3-Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split Tetris into Classic / Zen / Storm modes selectable on the idle screen, sharing one reducer with mode-specific branching.

**Architecture:** Add `mode: GameMode` to `TetrisState`; `START` action accepts mode. Logic branches at 3 points: event trigger (storm only), speed table (zen slower), piece bag (zen weighted). Page renders a 2-step idle overlay — pick mode then PLAY — with per-mode visuals.

**Tech Stack:** Next.js 16 App Router, React useReducer, TypeScript, Tailwind CSS v4

**Design doc:** `docs/plans/2026-04-03-tetris-modes-design.md`

---

### Task 1: Add GameMode type and Zen config to config.ts

**Files:**
- Modify: `src/games/tetris/config.ts`

**Step 1: Add GameMode export and Zen constants**

Open `src/games/tetris/config.ts`. Add the following at the top (after the EventType block):

```ts
export type GameMode = "classic" | "zen" | "storm";
```

After `LEVEL_SPEEDS`, add:

```ts
export const ZEN_LEVEL_SPEEDS: { level: number; ms: number }[] = [
  { level: 1,  ms: 1100 },
  { level: 2,  ms: 950 },
  { level: 3,  ms: 820 },
  { level: 5,  ms: 700 },
  { level: 7,  ms: 560 },
  { level: 10, ms: 420 },
  { level: 13, ms: 320 },
  { level: 16, ms: 240 },
  { level: 20, ms: 170 },
];

export function getZenSpeed(level: number): number {
  let ms = ZEN_LEVEL_SPEEDS[0].ms;
  for (const l of ZEN_LEVEL_SPEEDS) {
    if (level >= l.level) ms = l.ms;
  }
  return ms;
}

// Weights for Zen piece bag: I/O/L/J spawn more often, S/Z less
export const ZEN_PIECE_WEIGHTS: Record<string, number> = {
  I: 3, O: 2, L: 2, J: 2, T: 2, S: 1, Z: 1,
};
```

**Step 2: Verify TypeScript compiles**

Run: `cd E:/Personal/GameStation && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/games/tetris/config.ts
git commit -m "feat(tetris): add GameMode type and Zen speed/weight config"
```

---

### Task 2: Add createWeightedBag to tetrominoes.ts

**Files:**
- Modify: `src/games/tetris/tetrominoes.ts`

**Step 1: Read the file first to understand createBag()**

Read `src/games/tetris/tetrominoes.ts` to see the existing `createBag` function and `TetrominoType`.

**Step 2: Add createWeightedBag after createBag**

```ts
export function createWeightedBag(weights: Record<string, number>): TetrominoType[] {
  const pool: TetrominoType[] = [];
  for (const type of Object.keys(TETROMINOES) as TetrominoType[]) {
    const w = weights[type] ?? 1;
    for (let i = 0; i < w; i++) pool.push(type);
  }
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}
```

**Step 3: Verify TypeScript compiles**

Run: `cd E:/Personal/GameStation && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/games/tetris/tetrominoes.ts
git commit -m "feat(tetris): add createWeightedBag for Zen mode piece distribution"
```

---

### Task 3: Add mode to TetrisState and branch logic

**Files:**
- Modify: `src/games/tetris/logic.ts`

**Step 1: Update imports at top of logic.ts**

Add to the import from `./config`:
```ts
import {
  BOARD_COLS, BOARD_ROWS, LINE_SCORES, RANDOM_EVENTS, getSpeed, getZenSpeed,
  COMBO_BONUSES, TSPIN_SCORES, BACK_TO_BACK_MULT,
  OVERDRIVE_SCORE_MULT, OVERDRIVE_DURATION, FEVER_DURATION, FREEZE_DURATION,
  GARBAGE_ROWS_BOMB, GARBAGE_ROWS_CURSE, ZEN_PIECE_WEIGHTS,
} from "./config";
import type { EventType, TSpinKind, GameMode } from "./config";
import { TETROMINOES, createBag, createWeightedBag } from "./tetrominoes";
```

**Step 2: Add mode to TetrisState interface**

In the `TetrisState` interface, add after `lastClearedRows`:
```ts
  mode: GameMode;
  streak: number; // consecutive clears without a miss (Classic)
```

**Step 3: Update TetrisAction START to accept mode**

Change:
```ts
  | { type: "START" }
```
To:
```ts
  | { type: "START"; mode: GameMode }
```

**Step 4: Update initialState to accept mode**

Change the signature and body:
```ts
function initialState(mode: GameMode = "storm"): TetrisState {
  const createBagFn = mode === "zen"
    ? () => createWeightedBag(ZEN_PIECE_WEIGHTS)
    : createBag;
  const bag1 = createBagFn();
  const bag2 = createBagFn();
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
    mode,
    streak: 0,
  };
}
```

**Step 5: Update drawFromBag to use weighted bag for Zen**

Change `drawFromBag` to accept mode:
```ts
function drawFromBag(state: TetrisState): { active: ActivePiece; bag: TetrominoType[]; nextPieces: TetrominoType[] } {
  const createBagFn = state.mode === "zen"
    ? () => createWeightedBag(ZEN_PIECE_WEIGHTS)
    : createBag;
  let bag = [...state.bag];
  const allPieces = [...state.nextPieces, ...bag];
  if (allPieces.length < 4) bag = [...bag, ...createBagFn()];
  const next = [...state.nextPieces, ...bag];
  const active = spawnPiece(next[0]);
  return { active, bag: next.slice(4), nextPieces: next.slice(1, 4) };
}
```

**Step 6: Update START case in reducer**

```ts
case "START":
  return { ...initialState(action.mode), status: "playing" };
case "RESET":
  return initialState(state.mode);
```

**Step 7: Gate event trigger on storm mode**

In the TICK/MOVE_DOWN case, find the event trigger block:
```ts
if (linesUntilEvent <= 0 && cleared > 0) {
```
Wrap the entire block:
```ts
if (state.mode === "storm" && linesUntilEvent <= 0 && cleared > 0) {
```

**Step 8: Add streak tracking**

In the TICK/MOVE_DOWN case, after `const newCombo = ...`:
```ts
const newStreak = cleared > 0 ? state.streak + 1 : 0;
```

Add `streak: newStreak` to both the game-over return and the normal return objects. Also add `streak: 0` to the game-over return.

**Step 9: Export streak in return**

Ensure both return statements in TICK/MOVE_DOWN include `streak: newStreak` (game-over) or `streak: 0` for game over state.

For the normal return: `streak: newStreak`
For the game-over return: `streak: 0`

**Step 10: Verify TypeScript compiles**

Run: `cd E:/Personal/GameStation && npx tsc --noEmit`
Expected: No errors (fix any type errors before continuing)

**Step 11: Commit**

```bash
git add src/games/tetris/logic.ts
git commit -m "feat(tetris): add mode + streak to state, branch events/bag by mode"
```

---

### Task 4: Update page.tsx — initial state and speed

**Files:**
- Modify: `src/app/games/tetris/page.tsx`

**Step 1: Update imports**

Add `getZenSpeed` and `GameMode` to imports:
```ts
import { BOARD_COLS, BOARD_ROWS, RANDOM_EVENTS, getSpeed, getZenSpeed, OVERDRIVE_SPEED_MULT } from "@/games/tetris/config";
import type { GameMode } from "@/games/tetris/config";
```

**Step 2: Add selectedMode state**

After the `useReducer` call, add:
```ts
const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
```

**Step 3: Update the useReducer initial state**

The inline initial state object passed to `useReducer` needs `mode` and `streak`. Add:
```ts
mode: "storm" as GameMode,
streak: 0,
```

**Step 4: Update START dispatch calls**

Find all `dispatch({ type: "START" })` calls in the file and change each to:
```ts
dispatch({ type: "START", mode: selectedMode ?? "storm" })
```

There are typically 2 places: the PLAY button and the Space key handler.

**Step 5: Update the tick interval to use mode-aware speed**

Find the `useEffect` that sets the tick interval:
```ts
const ms = Math.max(
  50,
  Math.floor(getSpeed(state.level) / (state.overdriveActive ? OVERDRIVE_SPEED_MULT : 1))
);
```
Change to:
```ts
const speedFn = state.mode === "zen" ? getZenSpeed : getSpeed;
const ms = Math.max(
  50,
  Math.floor(speedFn(state.level) / (state.overdriveActive ? OVERDRIVE_SPEED_MULT : 1))
);
```
Also add `state.mode` to the dependency array.

**Step 6: Update GAME_KEY to be mode-aware**

Remove the `const GAME_KEY = "tetris"` constant. Instead, compute it dynamically:
```ts
const gameKey = state.mode === "classic" ? "tetris-classic"
  : state.mode === "zen" ? "tetris-zen"
  : "tetris";
```

Replace all `GAME_KEY` references with `gameKey`.

**Step 7: Verify TypeScript compiles**

Run: `cd E:/Personal/GameStation && npx tsc --noEmit`
Expected: No errors

**Step 8: Commit**

```bash
git add src/app/games/tetris/page.tsx
git commit -m "feat(tetris): wire mode to START dispatch, speed, and score key"
```

---

### Task 5: Mode selector UI on idle screen

**Files:**
- Modify: `src/app/games/tetris/page.tsx`

**Step 1: Replace the idle overlay**

Find the idle overlay block (`state.status === "idle"`) and replace it entirely:

```tsx
{state.status === "idle" && (
  <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
    <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
    <div className="relative flex flex-col items-center gap-5 pointer-events-auto">
      <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">🧱</div>
      <h2 className="text-sm neon-text-pink animate-[victoryGlow_1.5s_ease-in-out_infinite]">BLOCK STORM</h2>

      {!selectedMode ? (
        <>
          <p className="text-[0.45rem] text-gray-400 font-pixel">SELECT MODE</p>
          <div className="flex gap-3">
            {([
              { mode: "classic" as GameMode, label: "CLASSIC", emoji: "🕹️", desc: "Clean Tetris\nCombo + T-Spin", color: "#00d4ff" },
              { mode: "zen"     as GameMode, label: "ZEN",     emoji: "😌", desc: "Chill vibes\nEasy combos",   color: "#39ff14" },
              { mode: "storm"   as GameMode, label: "STORM",   emoji: "⚡", desc: "Chaos events\nLightning/Bombs", color: "#ff2d95" },
            ] as const).map(({ mode, label, emoji, desc, color }) => (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className="flex flex-col items-center gap-1 px-3 py-2 border font-pixel transition-all hover:scale-105"
                style={{
                  borderColor: color + "66",
                  backgroundColor: color + "11",
                  color,
                  minWidth: "72px",
                }}
              >
                <span className="text-xl">{emoji}</span>
                <span className="text-[0.45rem]">{label}</span>
                {desc.split("\n").map((line, i) => (
                  <span key={i} className="text-[0.35rem] opacity-60">{line}</span>
                ))}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-[0.45rem] font-pixel" style={{
            color: selectedMode === "classic" ? "#00d4ff" : selectedMode === "zen" ? "#39ff14" : "#ff2d95"
          }}>
            {selectedMode === "classic" ? "CLASSIC MODE" : selectedMode === "zen" ? "ZEN MODE" : "STORM MODE"}
          </p>
          <p className="text-[0.4rem] text-gray-500 font-pixel">PRESS SPACE TO START</p>
          <PixelButton
            color={selectedMode === "classic" ? "blue" : selectedMode === "zen" ? "green" : "pink"}
            onClick={() => dispatch({ type: "START", mode: selectedMode })}
          >PLAY</PixelButton>
          <button
            onClick={() => setSelectedMode(null)}
            className="text-[0.35rem] text-gray-600 font-pixel hover:text-gray-400 underline"
          >CHANGE MODE</button>
        </>
      )}
    </div>
  </div>
)}
```

Note: `PixelButton` color prop may only accept "pink" | "green" | "blue" — check `src/components/PixelButton.tsx` and use valid values. If "blue" is not valid, use "green" for classic and adjust accordingly.

**Step 2: Update Space key handler to check selectedMode**

In `handleKey`, the Space key in idle state currently dispatches START. Update:
```ts
if (state.status === "idle" && e.key === " ") {
  e.preventDefault();
  if (selectedMode) dispatch({ type: "START", mode: selectedMode });
  return;
}
```

**Step 3: Reset selectedMode on game over / new game**

In the "New Game" button handler in `GameLayout` (`onNewGame` prop), also reset mode:
```ts
onNewGame={() => { setSelectedMode(null); dispatch({ type: "RESET" }); }}
```

**Step 4: Verify in browser**

Run: `cd E:/Personal/GameStation && npm run dev`
- Navigate to `/games/tetris`
- Idle screen should show 3 mode cards
- Clicking a card should show PLAY button
- PLAY should start the game in that mode
- "CHANGE MODE" link should go back to cards

**Step 5: Commit**

```bash
git add src/app/games/tetris/page.tsx
git commit -m "feat(tetris): add 2-step mode selector on idle screen"
```

---

### Task 6: Classic mode — streak counter in sidebar

**Files:**
- Modify: `src/app/games/tetris/page.tsx`

**Step 1: Add streak display to the Hold sidebar**

Find the Hold sidebar section. After the `LINES {state.lines}` line, add:
```tsx
{state.mode === "classic" && (
  <span className="font-pixel text-[0.4rem] text-neon-blue/80">
    STREAK {state.streak}
  </span>
)}
```

**Step 2: Verify in browser**

Start a Classic game. Clear a line — STREAK should increment. Drop a piece without clearing — STREAK resets to 0.

**Step 3: Commit**

```bash
git add src/app/games/tetris/page.tsx
git commit -m "feat(tetris): show streak counter in sidebar for Classic mode"
```

---

### Task 7: Zen mode — rainbow piece color

**Files:**
- Modify: `src/app/games/tetris/page.tsx`

**Step 1: Add a helper to compute rainbow hue shift**

After the `MiniPiece` component definition, add:
```ts
function zenPieceColor(baseColor: string, combo: number): string {
  if (combo < 1) return baseColor;
  // Shift hue by 30deg per combo, cycling
  const hueShift = (combo * 30) % 360;
  // Simple approach: use a CSS filter hue-rotate on the board cells
  // Return a shifted color using HSL rotation on neon palette
  const zenColors = ["#39ff14","#00d4ff","#a855f7","#ff2d95","#ffe600","#f97316","#39ff14"];
  return zenColors[combo % zenColors.length];
}
```

**Step 2: Apply to active piece color in Zen mode**

Find:
```ts
const activeColor = TETROMINOES[state.active.type].color;
```
Change to:
```ts
const activeColor = state.mode === "zen" && state.combo >= 1
  ? zenPieceColor(TETROMINOES[state.active.type].color, state.combo)
  : TETROMINOES[state.active.type].color;
```

**Step 3: Verify in browser**

Start a Zen game. Build a combo — the active piece color should cycle through colors as combo increases.

**Step 4: Commit**

```bash
git add src/app/games/tetris/page.tsx
git commit -m "feat(tetris): Zen mode rainbow piece color based on combo"
```

---

### Task 8: Zen mode — slow-motion on multi-line clear

**Files:**
- Modify: `src/app/games/tetris/page.tsx`

**Step 1: Add slowMo state**

Add after the other useState declarations:
```ts
const [slowMo, setSlowMo] = useState(false);
const slowMoRef = useRef(false);
```

**Step 2: Trigger slow-mo on Zen multi-line clear**

In the `useEffect` that detects line clears (watches `state.lines`), inside the `if (delta > 0)` block, add:
```ts
if (state.mode === "zen" && delta >= 2) {
  slowMoRef.current = true;
  setSlowMo(true);
  setTimeout(() => {
    slowMoRef.current = false;
    setSlowMo(false);
  }, 400);
}
```

**Step 3: Use slowMo in tick interval**

In the tick interval `useEffect`, update the ms calculation:
```ts
const speedFn = state.mode === "zen" ? getZenSpeed : getSpeed;
const baseMsVal = speedFn(state.level);
const ms = Math.max(
  50,
  Math.floor((slowMo ? baseMsVal * 2 : baseMsVal) / (state.overdriveActive ? OVERDRIVE_SPEED_MULT : 1))
);
```
Add `slowMo` to the dependency array.

**Step 4: Verify in browser**

Start a Zen game. Clear 2+ lines — the piece fall should noticeably slow for ~400ms.

**Step 5: Commit**

```bash
git add src/app/games/tetris/page.tsx
git commit -m "feat(tetris): Zen mode slow-motion on multi-line clear"
```

---

### Task 9: Zen mode — bigger particles

**Files:**
- Modify: `src/app/games/tetris/page.tsx`

**Step 1: Update spawnParticles to be mode-aware**

The `spawnParticles` callback currently uses fixed values. Update to accept a mode multiplier. Change the function signature and body:

```ts
const spawnParticles = useCallback((rows: number[], mode: GameMode = "storm") => {
  if (rows.length === 0) return;
  const isZen = mode === "zen";
  const newParticles: Particle[] = [];
  const isTetris = rows.length >= 4;
  for (const r of rows) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const count = isTetris ? (isZen ? 8 : 5) : (isZen ? 5 : 3);
      for (let i = 0; i < count; i++) {
        const colors = ["#39ff14","#ff2d95","#ffe600","#00d4ff","#a855f7","#f97316"];
        newParticles.push({
          id: ++particleIdRef.current,
          x:  c * CELL_SIZE + CELL_SIZE / 2,
          y:  r * CELL_SIZE + CELL_SIZE / 2,
          vx: (Math.random() - 0.5) * (isZen ? 10 : 8),
          vy: (Math.random() - 0.9) * (isZen ? 10 : 7),
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1.0,
          size: isZen ? Math.random() * 6 + 3 : Math.random() * 4 + 2,
        });
      }
    }
  }
  setParticles(prev => [...prev, ...newParticles]);
}, []);
```

**Step 2: Update the call site**

Find where `spawnParticles(state.lastClearedRows)` is called and change to:
```ts
spawnParticles(state.lastClearedRows, state.mode);
```

**Step 3: Verify in browser**

Zen mode line clears should produce visibly larger and more numerous particles.

**Step 4: Commit**

```bash
git add src/app/games/tetris/page.tsx
git commit -m "feat(tetris): Zen mode larger/more particles on line clear"
```

---

### Task 10: Update HELP content and game title per mode

**Files:**
- Modify: `src/app/games/tetris/page.tsx`

**Step 1: Make HELP content mode-aware**

The current `HELP` constant is static. Since mode is chosen at runtime, simplest approach: keep the current HELP but note that specials only apply in Storm mode.

Update the `specials` section label in HELP — change the last item text to clarify:
```ts
{ icon: "⏩", name: "SPEED UP", desc: "Every 10 lines increases fall speed. Storm mode: events fire every 5 lines cleared." },
```

Add a note at the top of specials:
```ts
// In the HELP object, specials section, add first item:
{ icon: "⚡", name: "STORM ONLY", desc: "Lightning, Bombs, Freeze, Fever, Whirlwind, Overdrive and Curse only appear in STORM mode." },
```

**Step 2: Update GameLayout title to reflect mode**

Find the `<GameLayout title="BLOCK STORM" ...>` call. Change title to:
```tsx
title={
  state.mode === "classic" ? "BLOCK STORM" :
  state.mode === "zen"     ? "ZEN STORM"   :
  "BLOCK STORM"
}
```

**Step 3: Update game-over overlay text per mode**

Find the game over overlay. Change the `CASTLE FELL!` heading:
```tsx
<h2 ...>{state.mode === "zen" ? "STAY ZEN..." : "CASTLE FELL!"}</h2>
```

**Step 4: Verify in browser**

Each mode should show its title. Zen game over says "STAY ZEN...".

**Step 5: Commit**

```bash
git add src/app/games/tetris/page.tsx
git commit -m "feat(tetris): mode-aware title, game-over text, and HELP notes"
```

---

### Task 11: Final TypeScript check and smoke test

**Step 1: Full TypeScript check**

Run: `cd E:/Personal/GameStation && npx tsc --noEmit`
Expected: Zero errors

**Step 2: Build check**

Run: `cd E:/Personal/GameStation && npm run build`
Expected: Successful build, no type errors

**Step 3: Manual smoke test each mode**

Start dev server: `npm run dev`, navigate to `/games/tetris`

- [ ] Classic: mode cards appear, select Classic, PLAY starts game, STREAK counter visible in sidebar, no events fire, speed increases normally
- [ ] Zen: select Zen, pieces spawn more I/L/J, speed is slower, combo changes piece color, clearing 2+ lines triggers slow-mo, particles are bigger
- [ ] Storm: select Storm, events fire (lightning/bomb etc.), event overlays appear, high score key is "tetris" (existing scores preserved)
- [ ] CHANGE MODE link resets to card picker
- [ ] New Game from GameLayout header resets mode picker

**Step 4: Final commit if any fixes needed**

```bash
git add -p
git commit -m "fix(tetris): final polish for 3-mode implementation"
```
