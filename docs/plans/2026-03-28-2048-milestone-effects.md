# 2048 Milestone Effects & Combo Merges — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add in-board milestone celebrations (512/1024/2048/4096+) and chain combo bonus scoring to Monster 2048.

**Architecture:** CSS keyframes for tile animations, React forwardRef+useImperativeHandle for Grid to expose `triggerMilestone`/`triggerChain`, useEffect in page.tsx to scan merged tiles after each move. No changes to logic.ts or types.ts.

**Tech Stack:** React 18, Next.js 16, Tailwind CSS v4, TypeScript

---

### Task 1: CSS keyframes in globals.css

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add milestone animation keyframes after existing `tileMerge` block**

Find the `.tile-merge` block in `globals.css` and add after it:

```css
@keyframes tileMilestone {
  0%   { transform: scale(0.8); }
  30%  { transform: scale(1.45); }
  70%  { transform: scale(0.97); }
  100% { transform: scale(1); }
}
.tile-milestone { animation: tileMilestone 0.5s ease-out both; }

@keyframes floatUpFade {
  0%   { transform: translateY(0) scale(1.1); opacity: 1; }
  100% { transform: translateY(-44px) scale(0.85); opacity: 0; }
}
.floater { animation: floatUpFade 1.2s ease-out forwards; pointer-events: none; }

@keyframes gridFlash {
  0%   { opacity: 0.18; }
  100% { opacity: 0; }
}
.grid-flash { animation: gridFlash 0.4s ease-out forwards; }

@keyframes rainbowFlash {
  0%   { opacity: 0.22; filter: hue-rotate(0deg); }
  50%  { opacity: 0.22; filter: hue-rotate(180deg); }
  100% { opacity: 0; filter: hue-rotate(360deg); }
}
.grid-flash-rainbow { animation: rainbowFlash 0.5s ease-out forwards; }
```

**Step 2: Verify dev server still compiles**

Visit `http://localhost:3000/games/2048` — page loads without errors.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(2048): add milestone and chain combo CSS keyframes"
```

---

### Task 2: Add MILESTONES map to constants.ts

**Files:**
- Modify: `src/games/2048/constants.ts`

**Step 1: Add MILESTONES export after existing constants**

```ts
export const TILE_SIZE = 72;
export const GAP = 8;
export const PADDING = 12;
export const CONTAINER_SIZE = PADDING * 2 + TILE_SIZE * 4 + GAP * 3;

export interface MilestoneDef {
  name: string;
  color: string;
  emoji: string;
  glowColor: string;
}

export const MILESTONES: Record<number, MilestoneDef> = {
  512:  { name: "WYRM",    color: "#39ff14", emoji: "✨", glowColor: "rgba(57,255,20,0.7)" },
  1024: { name: "WYVERN",  color: "#ffe600", emoji: "🔥", glowColor: "rgba(255,230,0,0.7)" },
  2048: { name: "DRAGON",  color: "#ff2d95", emoji: "🐉", glowColor: "rgba(255,45,149,0.7)" },
  4096: { name: "ANCIENT", color: "#00d4ff", emoji: "⭐", glowColor: "rgba(0,212,255,0.7)" },
};

/** Returns milestone def for a tile value (4096 applies to all >= 4096) */
export function getMilestone(value: number): MilestoneDef | null {
  if (value >= 4096) return MILESTONES[4096];
  return MILESTONES[value] ?? null;
}
```

**Step 2: Verify TypeScript compiles**

Visit `http://localhost:3000/games/2048` — no TypeScript errors in terminal.

**Step 3: Commit**

```bash
git add src/games/2048/constants.ts
git commit -m "feat(2048): add MILESTONES definitions and getMilestone helper"
```

---

### Task 3: Update Tile.tsx — milestone animation class + glow

**Files:**
- Modify: `src/games/2048/Tile.tsx`

**Step 1: Import getMilestone and apply milestone class**

Replace the entire file with:

```tsx
import { TileData, MONSTERS } from "./types";
import { TILE_SIZE, GAP, PADDING, getMilestone } from "./constants";

const bgColors: Record<number, string> = {
  2:    "rgba(57,255,20,0.15)",
  4:    "rgba(57,255,20,0.25)",
  8:    "rgba(255,230,0,0.15)",
  16:   "rgba(255,230,0,0.25)",
  32:   "rgba(255,45,149,0.15)",
  64:   "rgba(255,45,149,0.28)",
  128:  "rgba(0,212,255,0.18)",
  256:  "rgba(0,212,255,0.30)",
  512:  "rgba(255,45,149,0.35)",
  1024: "rgba(255,230,0,0.35)",
  2048: "rgba(57,255,20,0.40)",
  4096: "rgba(255,45,149,0.50)",
};

export default function Tile({ tile }: { tile: TileData }) {
  const monster = MONSTERS[tile.value];
  const bg = bgColors[tile.value] ?? "rgba(255,45,149,0.6)";
  const ms = getMilestone(tile.value);

  const x = PADDING + tile.col * (TILE_SIZE + GAP);
  const y = PADDING + tile.row * (TILE_SIZE + GAP);

  // Milestone tiles get a more dramatic animation than regular merge
  const animClass = tile.isNew
    ? "tile-spawn"
    : tile.isMerged
    ? (ms ? "tile-milestone" : "tile-merge")
    : "";

  // Glow only when newly merged into a milestone value
  const boxShadow =
    tile.isMerged && ms
      ? `0 0 28px 8px ${ms.glowColor}, 0 0 8px 2px ${ms.color}`
      : undefined;

  return (
    <div
      className={`absolute flex flex-col items-center justify-center rounded border border-dark-border select-none ${animClass}`}
      style={{
        width: TILE_SIZE,
        height: TILE_SIZE,
        left: x,
        top: y,
        backgroundColor: bg,
        transition: "left 110ms ease, top 110ms ease",
        zIndex: tile.isMerged ? 10 : 5,
        boxShadow,
      }}
    >
      <span className="text-2xl leading-none">
        {monster ? monster.emoji : "❓"}
      </span>
      <span className="text-[0.45rem] text-gray-300 mt-1 font-pixel">
        {tile.value}
      </span>
    </div>
  );
}
```

**Step 2: Verify in browser**

Open `http://localhost:3000/games/2048`. Play until a merge happens — tile should animate. (Milestone effect verified in Task 5.)

**Step 3: Commit**

```bash
git add src/games/2048/Tile.tsx
git commit -m "feat(2048): apply milestone animation class and glow on high-value merges"
```

---

### Task 4: Rewrite Grid.tsx — forwardRef, floaters, flash overlay

**Files:**
- Modify: `src/games/2048/Grid.tsx`

**Step 1: Replace Grid.tsx with forwardRef version**

```tsx
"use client";

import { forwardRef, useImperativeHandle, useState, useCallback } from "react";
import { GridState, TileData } from "./types";
import Tile from "./Tile";
import { TILE_SIZE, GAP, PADDING, CONTAINER_SIZE, getMilestone } from "./constants";

export interface GridHandle {
  triggerMilestone: (value: number, col: number, row: number) => void;
  triggerChain: (mergeCount: number) => void;
}

interface Floater {
  id: number;
  text: string;
  color: string;
  x: number;  // px left (center of source tile or grid center)
  y: number;  // px top
  large: boolean;
}

interface FlashState {
  id: number;
  rainbow: boolean;
}

let nextFloaterId = 0;
let nextFlashId = 0;

const Grid = forwardRef<GridHandle, { grid: GridState }>(function Grid({ grid }, ref) {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [flash, setFlash] = useState<FlashState | null>(null);

  const removeFloater = useCallback((id: number) => {
    setFloaters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  useImperativeHandle(ref, () => ({
    triggerMilestone(value: number, col: number, row: number) {
      const ms = getMilestone(value);
      if (!ms) return;
      const tileCenterX = PADDING + col * (TILE_SIZE + GAP) + TILE_SIZE / 2;
      const tileCenterY = PADDING + row * (TILE_SIZE + GAP) + TILE_SIZE / 2;
      setFloaters((prev) => [
        ...prev,
        {
          id: nextFloaterId++,
          text: `${ms.emoji} ${ms.name}!`,
          color: ms.color,
          x: tileCenterX,
          y: tileCenterY,
          large: false,
        },
      ]);
      setFlash({ id: nextFlashId++, rainbow: value >= 4096 });
    },
    triggerChain(mergeCount: number) {
      const label =
        mergeCount >= 4 ? "MEGA CHAIN!" : `${mergeCount}× CHAIN!`;
      const bonus =
        mergeCount >= 4 ? "+300" : mergeCount === 3 ? "+150" : "+50";
      const gridCenter = CONTAINER_SIZE / 2;
      setFloaters((prev) => [
        ...prev,
        {
          id: nextFloaterId++,
          text: `${bonus} ${label}`,
          color: "#ffe600",
          x: gridCenter,
          y: gridCenter,
          large: true,
        },
      ]);
      if (mergeCount >= 4) {
        setFlash({ id: nextFlashId++, rainbow: true });
      }
    },
  }), []);

  const tiles = grid
    .flatMap((row) => row)
    .filter((cell): cell is TileData => cell !== null);

  return (
    <div
      className="relative border border-neon-pink/30 rounded bg-dark-bg/80 overflow-hidden"
      style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
      suppressHydrationWarning
    >
      {/* Empty cell backgrounds */}
      {Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => (
          <div
            key={`bg-${r}-${c}`}
            className="absolute bg-dark-card/50 rounded border border-dark-border/30"
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              left: PADDING + c * (TILE_SIZE + GAP),
              top: PADDING + r * (TILE_SIZE + GAP),
            }}
          />
        ))
      )}

      {/* Tiles */}
      {tiles.map((tile) => (
        <Tile key={tile.id} tile={tile} />
      ))}

      {/* Flash overlay */}
      {flash && (
        <div
          key={flash.id}
          className={`absolute inset-0 pointer-events-none ${flash.rainbow ? "grid-flash-rainbow" : "grid-flash"}`}
          style={{ backgroundColor: flash.rainbow ? "#ffe600" : undefined }}
          onAnimationEnd={() => setFlash(null)}
        />
      )}

      {/* Floating text */}
      {floaters.map((f) => (
        <div
          key={f.id}
          className="floater absolute font-pixel whitespace-nowrap"
          style={{
            left: f.x,
            top: f.y,
            color: f.color,
            fontSize: f.large ? "0.55rem" : "0.45rem",
            textShadow: `0 0 8px ${f.color}`,
            transform: "translateX(-50%)",
            zIndex: 20,
          }}
          onAnimationEnd={() => removeFloater(f.id)}
        >
          {f.text}
        </div>
      ))}
    </div>
  );
});

export default Grid;
```

**Step 2: Verify in browser**

`http://localhost:3000/games/2048` — grid renders normally, no TypeScript errors in terminal.

**Step 3: Commit**

```bash
git add src/games/2048/Grid.tsx
git commit -m "feat(2048): add forwardRef Grid with floater system and flash overlay"
```

---

### Task 5: Update page.tsx — gridRef, bonusScore, milestone/chain detection

**Files:**
- Modify: `src/app/games/2048/page.tsx`

**Step 1: Add gridRef and bonusScore state; update imports**

Replace the import line and add ref/state:

```tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import Grid, { GridHandle } from "@/games/2048/Grid";
import { createGame, move, Direction } from "@/games/2048/logic";
import { GameState2048 } from "@/games/2048/types";
import { getHighScore, setHighScore } from "@/lib/scores";
import { getMilestone } from "@/games/2048/constants";

const GAME_KEY = "2048";

export default function Game2048Page() {
  const [state, setState] = useState<GameState2048 | null>(null);
  const [highScore, setHigh] = useState(0);
  const [showWon, setShowWon] = useState(false);
  const [bonusScore, setBonusScore] = useState(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const gridRef = useRef<GridHandle>(null);
```

**Step 2: Update handleNewGame to reset bonusScore**

```tsx
  const handleNewGame = useCallback(() => {
    setState(createGame());
    setShowWon(false);
    setBonusScore(0);
  }, []);
```

**Step 3: Add useEffect to detect milestones and chain after each move**

Insert after the `useEffect` that tracks `state?.won`:

```tsx
  // Detect milestones and chain combos after each move
  useEffect(() => {
    if (!state) return;
    const mergedTiles = state.grid
      .flat()
      .filter((t): t is NonNullable<typeof t> => t !== null && (t.isMerged ?? false));

    // Trigger milestone effects
    mergedTiles.forEach((tile) => {
      const ms = getMilestone(tile.value);
      if (ms) {
        gridRef.current?.triggerMilestone(tile.value, tile.col, tile.row);
      }
    });

    // Chain combo bonus
    if (mergedTiles.length >= 2) {
      const bonus =
        mergedTiles.length >= 4 ? 300 : mergedTiles.length === 3 ? 150 : 50;
      setBonusScore((prev) => prev + bonus);
      gridRef.current?.triggerChain(mergedTiles.length);
    }
  }, [state]);
```

**Step 4: Update high score tracking to include bonusScore**

Replace the existing high score effect:

```tsx
  const displayScore = (state?.score ?? 0) + bonusScore;

  useEffect(() => {
    if (displayScore > highScore) {
      setHigh(displayScore);
      setHighScore(GAME_KEY, displayScore);
    }
  }, [displayScore, highScore]);
```

**Step 5: Wire up gridRef and displayScore in JSX**

Update `<Grid>` and `<GameLayout>`:

```tsx
  return (
    <GameLayout
      title="MONSTER 2048"
      color="pink"
      score={displayScore}
      highScore={highScore}
      onNewGame={handleNewGame}
      controls={
        <span className="text-[0.5rem] text-gray-500">
          ARROW KEYS / WASD / SWIPE
        </span>
      }
    >
      <div className="flex flex-col items-center gap-4">
        {state && <Grid ref={gridRef} grid={state.grid} />}

        {/* Win overlay — keep existing code unchanged */}
        {showWon && !state?.gameOver && (
          // ... existing win overlay JSX unchanged
        )}
        {/* Game over overlay — keep existing code unchanged */}
        {state?.gameOver && (
          // ... existing game over overlay JSX unchanged
        )}
      </div>
    </GameLayout>
  );
```

> **Note:** Keep the win and game over overlay JSX exactly as they are — only change `<Grid>` to add `ref={gridRef}`, add `displayScore` computed var, update `score={displayScore}`, and add the new useEffect and bonusScore state.

**Step 6: Verify milestone effects in browser**

1. Open `http://localhost:3000/games/2048`
2. Play until tiles merge to 512 → tile should flash with green glow + `tile-milestone` animation + "✨ WYRM!" floats up
3. Merge 2+ tiles in one swipe → "+50 2× CHAIN!" floats up in center
4. Score includes bonus

**Step 7: Commit**

```bash
git add src/app/games/2048/page.tsx
git commit -m "feat(2048): wire milestone celebrations and chain combo bonus scoring"
```

---

## Verification Checklist

- [ ] 512 tile merge: green glow + scale pop + "✨ WYRM!" floater
- [ ] 1024 tile merge: yellow glow + "🔥 WYVERN!" floater + grid flash
- [ ] 2048 tile merge: pink glow + "🐉 DRAGON!" floater + grid flash
- [ ] 2× chain: "+50 2× CHAIN!" center floater, no grid flash
- [ ] 4× chain: "+300 MEGA CHAIN!" center floater + rainbow flash
- [ ] bonusScore resets to 0 on new game
- [ ] High score includes bonus score
- [ ] No TypeScript errors in terminal
- [ ] No hydration warnings in console
