# PIXEL CHOMP (Pac-Man) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fully-playable Pac-Man arcade game ("PIXEL CHOMP") with 4 ghost AI behaviors, gameplay modifiers, procedural audio, and responsive controls.

**Architecture:** Reducer-based state management (`useReducer`) with `setInterval` game loop, grid-based maze rendering via DOM elements (consistent with Snake pattern). Ghost AI uses classic Pac-Man targeting algorithms. Settings panel exposes gameplay modifiers stored in component state.

**Tech Stack:** Next.js 16 + TypeScript + Tailwind CSS v4, Web Audio API for procedural sounds, localStorage for high scores and settings.

**Important:** `GameLayout` currently only supports colors `"green" | "pink" | "yellow" | "blue"`. Task 1 extends it to include `"orange"` for this game.

---

### Task 1: Extend GameLayout to support orange color

**Files:**
- Modify: `src/components/GameLayout.tsx:7`
- Modify: `src/components/PixelButton.tsx` (if color type is shared)

**Step 1: Add orange to GameColor type**

In `src/components/GameLayout.tsx`, change line 7:
```typescript
type GameColor = "green" | "pink" | "yellow" | "blue" | "orange";
```

The neon-text classes use Tailwind arbitrary values via `neon-text-${color}`. Check `src/app/globals.css` for existing `.neon-text-green`, `.neon-text-pink`, etc. Add `.neon-text-orange` if missing:
```css
.neon-text-orange {
  color: #f97316;
  text-shadow: 0 0 7px #f97316, 0 0 10px #f97316, 0 0 21px #f97316;
}
```

Also add `.neon-border-orange` if the pattern requires it.

**Step 2: Update PixelButton if it has its own color type**

Check `src/components/PixelButton.tsx` — if it defines its own `ButtonColor` type, add `"orange"` there too and handle the orange variant styles.

**Step 3: Verify by running dev server**

Run: `npm run dev`
Verify no TypeScript errors.

**Step 4: Commit**
```
feat(ui): add orange color support to GameLayout and PixelButton
```

---

### Task 2: Create Pac-Man types and maze data

**Files:**
- Create: `src/games/pacman/types.ts`
- Create: `src/games/pacman/mazes.ts`

**Step 1: Create types**

`src/games/pacman/types.ts`:
```typescript
export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
export type GameStatus = "idle" | "playing" | "won" | "dead";
export type GhostMode = "scatter" | "chase" | "frightened" | "eaten";
export type GhostName = "blinky" | "pinky" | "inky" | "clyde";
export type CellType = 0 | 1 | 2 | 3 | 4 | 5 | 6;
// 0=path, 1=wall, 2=dot, 3=power-pellet, 4=ghost-house, 5=tunnel, 6=ghost-gate

export interface Position { x: number; y: number; }

export interface Ghost {
  name: GhostName;
  pos: Position;
  dir: Direction;
  mode: GhostMode;
  scatterTarget: Position;  // corner target for scatter mode
  color: string;
  frightenedTimer: number;
  eatenReturning: boolean;
  homePos: Position;        // position inside ghost house
  released: boolean;        // whether ghost has left the house
}

export interface PacmanState {
  maze: CellType[][];        // current maze state (dots get removed)
  pacman: Position;
  pacDir: Direction;
  pendingDir: Direction;     // queued direction for smooth cornering
  ghosts: Ghost[];
  score: number;
  level: number;
  lives: number;
  status: GameStatus;
  dotsLeft: number;
  ghostCombo: number;        // 1,2,3,4 for 200->400->800->1600
  frightenedTimeLeft: number;
  modeTimer: number;         // ticks in current scatter/chase cycle
  modeIndex: number;         // index in scatter/chase cycle array
  fruitActive: boolean;
  fruitTimer: number;
  tick: number;              // global tick counter
}

export interface GameModifiers {
  ghostSpeed: "slow" | "normal" | "fast" | "insane";
  powerDuration: 3 | 5 | 8 | 12;  // seconds
  mazeStyle: "classic" | "open" | "tight";
  ghostCount: 1 | 2 | 3 | 4;
  bonusFrequency: "off" | "rare" | "normal" | "frequent";
  lives: 1 | 3 | 5 | 99;
  speedRamp: "off" | "gradual" | "aggressive";
}

export type PacmanAction =
  | { type: "START"; modifiers: GameModifiers }
  | { type: "RESET" }
  | { type: "SET_DIR"; dir: Direction }
  | { type: "TICK" }
  | { type: "NEXT_LEVEL" };
```

**Step 2: Create maze layouts**

`src/games/pacman/mazes.ts` — define at least the classic 28x31 Pac-Man maze as a 2D array. Include `open` and `tight` variants. Each maze is a `CellType[][]`. Export a function `getMaze(style: string): CellType[][]` that returns a deep copy.

Key layout rules:
- Row 0 and last row are walls
- Tunnels on row ~14, columns 0 and 27
- Ghost house in center (~rows 12-15, cols 10-17)
- 4 power pellets in corners
- Pac-Man starts at approximately row 23, col 13

**Step 3: Commit**
```
feat(pacman): add types and maze layouts
```

---

### Task 3: Implement ghost AI

**Files:**
- Create: `src/games/pacman/ghost-ai.ts`

**Step 1: Implement ghost targeting functions**

```typescript
import { Ghost, Position, Direction, GhostMode, CellType } from "./types";

// Get target tile for each ghost based on its name and mode
export function getGhostTarget(
  ghost: Ghost,
  pacman: Position,
  pacDir: Direction,
  blinky: Ghost,  // needed for Inky's calculation
): Position { ... }

// Blinky: targets pacman directly
// Pinky: targets 4 tiles ahead of pacman
// Inky: vector from blinky to 2-ahead-of-pacman, doubled
// Clyde: if distance > 8, chase pacman; else scatter to corner

// Choose direction at intersection (cannot reverse)
export function chooseDirection(
  ghost: Ghost,
  target: Position,
  maze: CellType[][],
): Direction { ... }

// Frightened mode: random valid direction at each intersection
export function chooseFrightenedDirection(
  ghost: Ghost,
  maze: CellType[][],
): Direction { ... }

// Move ghost one tile in its current direction
export function moveGhost(ghost: Ghost, maze: CellType[][]): Position { ... }

// Check if position is walkable (not wall, respects ghost gate rules)
export function isWalkable(
  x: number, y: number,
  maze: CellType[][],
  isGhost: boolean,
  isEaten: boolean,
): boolean { ... }
```

**Step 2: Commit**
```
feat(pacman): implement ghost AI targeting algorithms
```

---

### Task 4: Implement core game logic (reducer)

**Files:**
- Create: `src/games/pacman/config.ts`
- Create: `src/games/pacman/logic.ts`

**Step 1: Create config**

`src/games/pacman/config.ts`:
```typescript
import { GameModifiers } from "./types";

export const CELL_SIZE = 16;  // px per grid cell
export const TICK_MS = 120;   // base tick interval

export const DEFAULT_MODIFIERS: GameModifiers = {
  ghostSpeed: "normal",
  powerDuration: 8,
  mazeStyle: "classic",
  ghostCount: 4,
  bonusFrequency: "normal",
  lives: 3,
  speedRamp: "gradual",
};

export const GHOST_SPEED_MULT: Record<string, number> = {
  slow: 1.5, normal: 1, fast: 0.7, insane: 0.5,
};

export const SCATTER_CHASE_CYCLE = [
  // [scatter_ticks, chase_ticks] per phase
  [7 * 8, 20 * 8],   // 7s scatter, 20s chase
  [7 * 8, 20 * 8],
  [5 * 8, 20 * 8],
  [5 * 8, Infinity],  // permanent chase
];

export const SCORE = {
  dot: 10,
  powerPellet: 50,
  ghost: [200, 400, 800, 1600],
  fruit: [100, 300, 500, 700, 1000],
};

export const GHOST_COLORS: Record<string, string> = {
  blinky: "#ff2d55",
  pinky: "#ff69b4",
  inky: "#00d4ff",
  clyde: "#f97316",
};
```

**Step 2: Create reducer**

`src/games/pacman/logic.ts`:
```typescript
import { PacmanState, PacmanAction, GameModifiers, Ghost, Direction, Position, CellType } from "./types";
import { getMaze } from "./mazes";
import { getGhostTarget, chooseDirection, chooseFrightenedDirection, moveGhost } from "./ghost-ai";
import { SCATTER_CHASE_CYCLE, SCORE, GHOST_COLORS, DEFAULT_MODIFIERS } from "./config";

export function createInitialState(modifiers: GameModifiers = DEFAULT_MODIFIERS): PacmanState { ... }

function createGhosts(count: number, maze: CellType[][]): Ghost[] { ... }

function movePacman(state: PacmanState): PacmanState { ... }
// Applies pendingDir if valid, else continues current dir
// Handles tunnel wrap-around
// Eats dots/power-pellets, updates score
// Triggers frightened mode on power pellet

function updateGhosts(state: PacmanState, modifiers: GameModifiers): PacmanState { ... }
// Move each ghost based on mode
// Update scatter/chase cycle timer
// Decrement frightened timer
// Return eaten ghosts to house

function checkCollisions(state: PacmanState): PacmanState { ... }
// Pac-Man vs Ghost: if frightened -> eat ghost, else lose life
// Check win condition: dotsLeft === 0

export function pacmanReducer(state: PacmanState, action: PacmanAction): PacmanState {
  switch (action.type) {
    case "START": return { ...createInitialState(action.modifiers), status: "playing" };
    case "RESET": return createInitialState();
    case "SET_DIR": return { ...state, pendingDir: action.dir };
    case "TICK": {
      if (state.status !== "playing") return state;
      let s = movePacman(state);
      s = updateGhosts(s, /* modifiers from state or action */);
      s = checkCollisions(s);
      return { ...s, tick: s.tick + 1 };
    }
    case "NEXT_LEVEL": return createInitialState(/* next level config */);
    default: return state;
  }
}
```

**Step 3: Commit**
```
feat(pacman): implement core game logic reducer
```

---

### Task 5: Create procedural audio

**Files:**
- Create: `src/games/pacman/audio.ts`

**Step 1: Implement audio interface**

```typescript
import { tone, noise } from "@/lib/audioUtils";

export interface PacmanAudio {
  playWaka: () => void;
  playPower: () => void;
  playEatGhost: () => void;
  playDeath: () => void;
  playLevelComplete: () => void;
  playFruit: () => void;
  setMuted: (m: boolean) => void;
}

export function createPacmanAudio(): PacmanAudio {
  const ctx = new AudioContext();
  let muted = false;
  const ok = () => !muted;

  return {
    playWaka() {
      if (!ok()) return;
      // Alternating waka-waka tones
      tone(ctx, "square", 200, 300, 0.05, 0.12);
      tone(ctx, "square", 300, 200, 0.05, 0.12, 0.06);
    },
    playPower() {
      if (!ok()) return;
      // Rising power sweep
      tone(ctx, "sine", 200, 800, 0.3, 0.15);
    },
    playEatGhost() {
      if (!ok()) return;
      // Ascending crunch
      [300, 500, 700, 900].forEach((f, i) =>
        tone(ctx, "square", f, f + 100, 0.06, 0.12, i * 0.05)
      );
    },
    playDeath() {
      if (!ok()) return;
      // Descending sad tone
      tone(ctx, "sawtooth", 600, 100, 0.5, 0.18);
      noise(ctx, 0.2, 0.08, 0.3);
    },
    playLevelComplete() {
      if (!ok()) return;
      [400, 500, 600, 800, 1000].forEach((f, i) =>
        tone(ctx, "square", f, f, 0.1, 0.14, i * 0.1)
      );
    },
    playFruit() {
      if (!ok()) return;
      tone(ctx, "sine", 500, 900, 0.12, 0.15);
      tone(ctx, "sine", 900, 500, 0.12, 0.15, 0.12);
    },
    setMuted(m) { muted = m; },
  };
}
```

**Step 2: Commit**
```
feat(pacman): add procedural audio system
```

---

### Task 6: Build game page UI

**Files:**
- Create: `src/app/games/pacman/page.tsx`
- Create: `src/app/games/pacman/layout.tsx`

**Step 1: Create layout with metadata**

`src/app/games/pacman/layout.tsx`:
```typescript
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pixel Chomp — Free Pac-Man Game | HeoLab",
  description:
    "Play Pixel Chomp, a retro Pac-Man arcade game with ghost AI, power crystals, and customizable gameplay modifiers. Free browser game, no download.",
  openGraph: {
    title: "Pixel Chomp — Free Pac-Man Game | HeoLab",
    description: "Retro Pac-Man with smart ghost AI and gameplay modifiers. Free browser game.",
    url: "https://heolab.dev/games/pacman",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

**Step 2: Create main game page**

`src/app/games/pacman/page.tsx` — This is the largest file. Structure:

```typescript
"use client";

import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import MuteButton from "@/components/MuteButton";
import { pacmanReducer, createInitialState } from "@/games/pacman/logic";
import { createPacmanAudio, type PacmanAudio } from "@/games/pacman/audio";
import { getHighScore, setHighScore } from "@/lib/scores";
import { DEFAULT_MODIFIERS, GHOST_COLORS, CELL_SIZE } from "@/games/pacman/config";
import type { Direction, GameModifiers, CellType, PacmanState, Ghost } from "@/games/pacman/types";

const GAME_KEY = "pacman";

export default function PacmanPage() {
  const [modifiers, setModifiers] = useState<GameModifiers>(DEFAULT_MODIFIERS);
  const [showSettings, setShowSettings] = useState(false);
  const [state, dispatch] = useReducer(pacmanReducer, createInitialState());
  // ... high score, muted state, audio ref, interval ref, touch ref

  // Game loop: setInterval dispatching TICK
  // Input: keyboard (arrows/WASD) + touch swipe
  // Audio: lazy init on first interaction, event-based playback
  // Settings panel: toggle overlay with modifier controls

  return (
    <GameLayout
      title="PIXEL CHOMP"
      color="orange"
      score={state.score}
      highScore={highScore}
      onNewGame={() => dispatch({ type: "START", modifiers })}
      actions={<>
        <MuteButton muted={muted} onToggle={() => setMuted(!muted)} color="orange" />
        <button onClick={() => setShowSettings(!showSettings)}>⚙️</button>
      </>}
      controls={<>
        <span className="text-[0.5rem] text-gray-500">
          {"❤️".repeat(state.lives)} | LVL {state.level}
        </span>
      </>}
    >
      {/* Settings overlay */}
      {showSettings && <SettingsPanel modifiers={modifiers} onChange={setModifiers} onClose={() => setShowSettings(false)} />}

      {/* Game board - grid of cells */}
      <div
        className="relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {state.maze.map((row, y) => (
          <div key={y} className="flex">
            {row.map((cell, x) => (
              <MazeCell key={`${x}-${y}`} cell={cell} />
            ))}
          </div>
        ))}

        {/* Pac-Man sprite overlay */}
        <PacManSprite pos={state.pacman} dir={state.pacDir} />

        {/* Ghost sprites overlay */}
        {state.ghosts.map(ghost => (
          <GhostSprite key={ghost.name} ghost={ghost} />
        ))}

        {/* Fruit overlay */}
        {state.fruitActive && <FruitSprite />}
      </div>

      {/* Idle overlay */}
      {state.status === "idle" && <IdleOverlay />}

      {/* Win overlay */}
      {state.status === "won" && <WinOverlay score={state.score} level={state.level} />}

      {/* Death overlay */}
      {state.status === "dead" && <DeathOverlay score={state.score} />}
    </GameLayout>
  );
}
```

Key sub-components (inline in same file or extracted):
- `MazeCell` — renders wall/path/dot/power-pellet based on cell type
- `PacManSprite` — positioned absolutely, chomp animation via CSS
- `GhostSprite` — positioned absolutely, color changes on frightened/eaten
- `SettingsPanel` — modal overlay with modifier dropdowns
- Win/Lose overlays — follow MEMORY.md pattern (orange neon glow)

**Step 3: Run dev server, navigate to `/games/pacman`, verify renders**

**Step 4: Commit**
```
feat(pacman): create game page with board rendering and controls
```

---

### Task 7: Add Pac-Man to homepage and games listing

**Files:**
- Modify: `src/app/page.tsx` — add entry to `allGames` array
- Modify: `src/app/games/page.tsx` — add entry to `games` array

**Step 1: Add to homepage**

In `src/app/page.tsx`, add to `allGames` array (after ASTRO RAID entry):
```typescript
{
  title: "PIXEL CHOMP",
  subtitle: "Navigate pixel mazes, gobble rune stones, and outwit ghost AI.",
  href: "/games/pacman",
  borderColor: "#f97316",
  emoji: "👾",
  tag: "ARCADE",
  category: "ARCADE" as Category,
},
```

**Step 2: Add to games listing**

In `src/app/games/page.tsx`, add to `games` array:
```typescript
{
  title: "PIXEL CHOMP",
  subtitle: "Navigate pixel mazes and outwit ghost AI.",
  href: "/games/pacman",
  color: "orange",
  emoji: "👾",
  tag: "ARCADE",
  category: "ARCADE" as Category,
  available: true,
},
```

Note: The games page uses `color` string keys with `COLOR_HEX` mapping. Add orange to `COLOR_HEX`:
```typescript
const COLOR_HEX: Record<string, string> = {
  green:  "#39ff14",
  pink:   "#ff2d95",
  yellow: "#ffe600",
  blue:   "#00d4ff",
  orange: "#f97316",  // add this
};
```

**Step 3: Update stats count on homepage**

Find `9 GAMES` in `src/app/page.tsx` and update to `10 GAMES`.

**Step 4: Verify both pages show Pac-Man card**

**Step 5: Commit**
```
feat(pacman): add Pixel Chomp to homepage and games listing
```

---

### Task 8: Settings panel and gameplay modifiers

**Files:**
- Modify: `src/app/games/pacman/page.tsx`

**Step 1: Build settings panel component**

The `SettingsPanel` renders inside the game page as an overlay. Each modifier is a row with label + options (small pixel buttons or select).

```typescript
function SettingsPanel({ modifiers, onChange, onClose }: {
  modifiers: GameModifiers;
  onChange: (m: GameModifiers) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-bg/70 backdrop-blur-sm">
      <div className="bg-card-bg border border-neon-orange/30 p-4 max-w-sm w-full mx-4 space-y-3">
        <h2 className="text-[0.7rem] neon-text-orange text-center">SETTINGS</h2>

        {/* Ghost Speed */}
        <ModifierRow label="GHOST SPEED" options={["slow","normal","fast","insane"]}
          value={modifiers.ghostSpeed}
          onChange={v => onChange({...modifiers, ghostSpeed: v})} />

        {/* Power Duration */}
        <ModifierRow label="POWER TIME" options={[3,5,8,12]}
          value={modifiers.powerDuration}
          onChange={v => onChange({...modifiers, powerDuration: v})} />

        {/* ... other modifiers ... */}

        <PixelButton color="orange" onClick={onClose}>CLOSE</PixelButton>
      </div>
    </div>
  );
}
```

**Step 2: Wire modifiers into game logic**

Ensure `dispatch({ type: "START", modifiers })` passes current modifiers to `createInitialState`. The reducer uses modifiers to:
- Set ghost speed (tick interval multiplier)
- Set power pellet duration
- Choose maze layout
- Limit ghost count
- Configure fruit spawn rate
- Set starting lives
- Configure speed ramp per level

**Step 3: Commit**
```
feat(pacman): implement settings panel with gameplay modifiers
```

---

### Task 9: Polish — animations, responsive, win/lose overlays

**Files:**
- Modify: `src/app/games/pacman/page.tsx`
- Modify: `src/app/globals.css` (if new keyframes needed)

**Step 1: Pac-Man chomp animation**

CSS animation for mouth opening/closing:
```css
@keyframes chomp {
  0%   { clip-path: polygon(100% 50%, 50% 0%, 0% 0%, 0% 100%, 50% 100%); }
  50%  { clip-path: polygon(100% 50%, 50% 50%, 0% 0%, 0% 100%, 50% 50%); }
  100% { clip-path: polygon(100% 50%, 50% 0%, 0% 0%, 0% 100%, 50% 100%); }
}
```

Or use simple emoji/sprite alternation for pixel aesthetic.

**Step 2: Ghost frightened flash**

When frightened timer is low (< 2s), flash between blue and white to warn player.

**Step 3: Win/Lose overlays per MEMORY.md pattern**

- Win: `neon-text-orange`, floating `👾`, `victoryGlow` animation (add orange variant `victoryGlowOrange` to globals.css)
- Lose: `neon-text-pink`, `defeatFlash`, `screenShake` on board

**Step 4: Responsive sizing**

Board must scale on mobile. Use CSS:
```css
/* Scale board to fit viewport */
.pacman-board {
  --cell: min(3.5vw, 16px);
}
```
Each cell uses `width: var(--cell); height: var(--cell);`

**Step 5: Commit**
```
feat(pacman): add animations, responsive sizing, win/lose overlays
```

---

### Task 10: Final testing and integration verification

**Step 1: Run `npm run build`** — fix any TypeScript/build errors

**Step 2: Manual testing checklist:**
- [ ] Game starts on first keypress/tap
- [ ] Pac-Man moves continuously, changes direction at intersections
- [ ] All 4 ghosts have distinct behaviors
- [ ] Power pellet triggers frightened mode
- [ ] Ghost combo scoring works (200->400->800->1600)
- [ ] Lives decrease on ghost collision
- [ ] Level completes when all dots eaten
- [ ] Death overlay shows on 0 lives
- [ ] Settings panel opens/closes, modifiers affect gameplay
- [ ] High score saves and persists across page reloads
- [ ] Audio plays correctly, mute toggle works
- [ ] Touch controls work on mobile
- [ ] Game appears on homepage and /games page
- [ ] Responsive — playable on small screens

**Step 3: Commit**
```
feat(pacman): Pixel Chomp arcade game complete
```
