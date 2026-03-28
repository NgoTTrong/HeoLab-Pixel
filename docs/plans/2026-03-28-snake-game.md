# Neon Serpent (Snake) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build "Neon Serpent" — a Snake game with cyberpunk theme, neon trail, power-ups (Speed Boost, Ghost Mode, Score ×2), and level-up system at `/games/snake`.

**Architecture:** Pure logic in `src/games/snake/logic.ts` using `useReducer`. Grid rendered as CSS grid of divs. Game loop via `setInterval` managed in `useEffect`. Config-driven levels and power-ups.

**Tech Stack:** Next.js 16 App Router, TypeScript, React (useReducer + useEffect + useCallback), Tailwind CSS v4, CSS keyframes.

---

### Task 1: Config file

**Files:**
- Create: `src/games/snake/config.ts`

```ts
export type PowerUpType = "speedBoost" | "ghost" | "scoreDouble";

export interface PowerUpDef {
  type: PowerUpType;
  color: string;
  borderColor: string;
  emoji: string;
  duration: number | null; // ms, null = count-based
  scoreDoubleCount?: number;
}

export interface LevelDef {
  minScore: number;
  intervalMs: number;
  color: string; // snake head/body color
  label: string;
}

export const POWER_UPS: PowerUpDef[] = [
  {
    type: "speedBoost",
    color: "#00d4ff",
    borderColor: "#00d4ff",
    emoji: "⚡",
    duration: 5000,
  },
  {
    type: "ghost",
    color: "#a855f7",
    borderColor: "#a855f7",
    emoji: "👻",
    duration: 3000,
  },
  {
    type: "scoreDouble",
    color: "#ffe600",
    borderColor: "#ffe600",
    emoji: "×2",
    duration: null,
    scoreDoubleCount: 10,
  },
];

export const LEVELS: LevelDef[] = [
  { minScore: 0,  intervalMs: 160, color: "#00d4ff", label: "LVL 1" },
  { minScore: 5,  intervalMs: 135, color: "#39ff14", label: "LVL 2" },
  { minScore: 12, intervalMs: 110, color: "#ff2d95", label: "LVL 3" },
  { minScore: 22, intervalMs: 88,  color: "#a855f7", label: "LVL 4" },
  { minScore: 35, intervalMs: 68,  color: "#ffe600", label: "LVL 5" },
];

export const GRID_SIZE = 20; // 20×20 grid
export const POWER_UP_SPAWN_CHANCE = 0.25; // 25% chance per food eaten
export const POWER_UP_LIFETIME_MS = 6000; // power-up disappears after 6s
```

**Commit:**
```bash
git add src/games/snake/config.ts
git commit -m "feat: add snake game config"
```

---

### Task 2: Game logic

**Files:**
- Create: `src/games/snake/logic.ts`

```ts
import { GRID_SIZE, LEVELS, POWER_UPS, POWER_UP_SPAWN_CHANCE, POWER_UP_LIFETIME_MS } from "./config";
import type { PowerUpType } from "./config";

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
export type GameStatus = "idle" | "playing" | "dead";

export interface Position { x: number; y: number; }

export interface ActivePowerUp {
  type: PowerUpType;
  expiresAt: number | null; // null = count-based
  scoreDoubleRemaining: number; // for scoreDouble
}

export interface SpawnedPowerUp {
  pos: Position;
  type: PowerUpType;
  expiresAt: number;
}

export interface SnakeState {
  snake: Position[];       // [head, ...body]
  direction: Direction;
  pendingDir: Direction;   // buffered next direction
  food: Position;
  spawnedPowerUp: SpawnedPowerUp | null;
  activePowerUp: ActivePowerUp | null;
  score: number;
  level: number;
  status: GameStatus;
}

export type SnakeAction =
  | { type: "START" }
  | { type: "RESET" }
  | { type: "SET_DIR"; dir: Direction }
  | { type: "TICK"; now: number }
  | { type: "EXPIRE_POWERUP" };

function randomPos(exclude: Position[]): Position {
  const excludeSet = new Set(exclude.map((p) => `${p.x},${p.y}`));
  let pos: Position;
  do {
    pos = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
  } while (excludeSet.has(`${pos.x},${pos.y}`));
  return pos;
}

function posEq(a: Position, b: Position) {
  return a.x === b.x && a.y === b.y;
}

function getLevel(score: number) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) {
    if (score >= l.minScore) lvl = l;
  }
  return lvl;
}

function isOpposite(a: Direction, b: Direction) {
  return (a === "UP" && b === "DOWN") || (a === "DOWN" && b === "UP") ||
    (a === "LEFT" && b === "RIGHT") || (a === "RIGHT" && b === "LEFT");
}

function initialState(): SnakeState {
  const snake = [
    { x: 10, y: 10 },
    { x: 9,  y: 10 },
    { x: 8,  y: 10 },
  ];
  return {
    snake,
    direction: "RIGHT",
    pendingDir: "RIGHT",
    food: randomPos(snake),
    spawnedPowerUp: null,
    activePowerUp: null,
    score: 0,
    level: 0,
    status: "idle",
  };
}

export function snakeReducer(state: SnakeState, action: SnakeAction): SnakeState {
  switch (action.type) {
    case "START":
      return { ...initialState(), status: "playing" };

    case "RESET":
      return initialState();

    case "SET_DIR": {
      if (isOpposite(action.dir, state.direction)) return state;
      return { ...state, pendingDir: action.dir };
    }

    case "EXPIRE_POWERUP":
      return { ...state, activePowerUp: null };

    case "TICK": {
      if (state.status !== "playing") return state;

      const dir = state.pendingDir;
      const head = state.snake[0];
      const isGhost = state.activePowerUp?.type === "ghost";

      // Calculate new head position
      let nx = head.x + (dir === "RIGHT" ? 1 : dir === "LEFT" ? -1 : 0);
      let ny = head.y + (dir === "DOWN"  ? 1 : dir === "UP"   ? -1 : 0);

      if (isGhost) {
        // Wrap around walls
        nx = (nx + GRID_SIZE) % GRID_SIZE;
        ny = (ny + GRID_SIZE) % GRID_SIZE;
      } else {
        // Wall collision = death
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) {
          return { ...state, status: "dead" };
        }
      }

      const newHead = { x: nx, y: ny };

      // Self collision (skip if ghost)
      if (!isGhost && state.snake.some((s) => posEq(s, newHead))) {
        return { ...state, status: "dead" };
      }

      // Check food
      const ateFood = posEq(newHead, state.food);
      const ateMultiplier = state.activePowerUp?.type === "scoreDouble" ? 2 : 1;

      let newSnake = [newHead, ...state.snake];
      if (!ateFood) newSnake = newSnake.slice(0, -1); // move (no grow)

      let newScore = state.score;
      let newActivePowerUp = state.activePowerUp;
      let newSpawned = state.spawnedPowerUp;

      // Expire spawned power-up if timed out
      if (newSpawned && action.now > newSpawned.expiresAt) {
        newSpawned = null;
      }

      if (ateFood) {
        newScore += 1 * ateMultiplier;

        // Decrement scoreDouble counter
        if (newActivePowerUp?.type === "scoreDouble") {
          const remaining = newActivePowerUp.scoreDoubleRemaining - 1;
          newActivePowerUp = remaining <= 0 ? null : { ...newActivePowerUp, scoreDoubleRemaining: remaining };
        }

        // Maybe spawn power-up
        if (!newSpawned && Math.random() < POWER_UP_SPAWN_CHANCE) {
          const def = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
          newSpawned = {
            pos: randomPos([...newSnake, state.food]),
            type: def.type,
            expiresAt: action.now + POWER_UP_LIFETIME_MS,
          };
        }
      }

      // Check power-up pickup
      if (newSpawned && posEq(newHead, newSpawned.pos)) {
        const def = POWER_UPS.find((p) => p.type === newSpawned!.type)!;
        newActivePowerUp = {
          type: def.type,
          expiresAt: def.duration ? action.now + def.duration : null,
          scoreDoubleRemaining: def.scoreDoubleCount ?? 0,
        };
        newSpawned = null;
      }

      // Expire timed power-up
      if (newActivePowerUp?.expiresAt && action.now > newActivePowerUp.expiresAt) {
        newActivePowerUp = null;
      }

      const newLevel = LEVELS.findIndex((l, i) =>
        newScore >= l.minScore && (i === LEVELS.length - 1 || newScore < LEVELS[i + 1].minScore)
      );

      return {
        ...state,
        snake: newSnake,
        direction: dir,
        food: ateFood ? randomPos([...newSnake]) : state.food,
        spawnedPowerUp: newSpawned,
        activePowerUp: newActivePowerUp,
        score: newScore,
        level: Math.max(0, newLevel),
        status: "playing",
      };
    }

    default:
      return state;
  }
}
```

**Commit:**
```bash
git add src/games/snake/logic.ts
git commit -m "feat: snake game logic with power-ups and level system"
```

---

### Task 3: Game page

**Files:**
- Create: `src/app/games/snake/page.tsx`

```tsx
"use client";

import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import { snakeReducer, type Direction } from "@/games/snake/logic";
import { GRID_SIZE, LEVELS, POWER_UPS } from "@/games/snake/config";
import { getHighScore, setHighScore } from "@/lib/scores";

const GAME_KEY = "snake";

function isTouchDevice() {
  return typeof window !== "undefined" && "ontouchstart" in window;
}

export default function SnakePage() {
  const [state, dispatch] = useReducer(snakeReducer, {
    snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
    direction: "RIGHT",
    pendingDir: "RIGHT",
    food: { x: 15, y: 10 },
    spawnedPowerUp: null,
    activePowerUp: null,
    score: 0,
    level: 0,
    status: "idle",
  });

  const [highScore, setHS] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const level = LEVELS[state.level] ?? LEVELS[LEVELS.length - 1];

  useEffect(() => {
    setHS(getHighScore(GAME_KEY));
  }, []);

  // Game loop
  useEffect(() => {
    if (state.status !== "playing") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    // Speed boost halves interval
    const speedMult = state.activePowerUp?.type === "speedBoost" ? 0.5 : 1;
    const ms = Math.round(level.intervalMs * speedMult);

    intervalRef.current = setInterval(() => {
      dispatch({ type: "TICK", now: Date.now() });
    }, ms);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.status, state.level, state.activePowerUp?.type, level.intervalMs]);

  // Update high score on death
  useEffect(() => {
    if (state.status === "dead" && state.score > highScore) {
      setHighScore(GAME_KEY, state.score);
      setHS(state.score);
    }
  }, [state.status, state.score, highScore]);

  // Keyboard controls
  const handleKey = useCallback((e: KeyboardEvent) => {
    const map: Record<string, Direction> = {
      ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
      w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT",
      W: "UP", S: "DOWN", A: "LEFT", D: "RIGHT",
    };
    if (map[e.key]) {
      e.preventDefault();
      if (state.status === "idle") dispatch({ type: "START" });
      dispatch({ type: "SET_DIR", dir: map[e.key] });
    }
    if (e.key === " " && state.status === "idle") {
      e.preventDefault();
      dispatch({ type: "START" });
    }
  }, [state.status]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Touch swipe controls
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (state.status === "idle") dispatch({ type: "START" });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) return; // too small
    if (absDx > absDy) {
      dispatch({ type: "SET_DIR", dir: dx > 0 ? "RIGHT" : "LEFT" });
    } else {
      dispatch({ type: "SET_DIR", dir: dy > 0 ? "DOWN" : "UP" });
    }
    touchStartRef.current = null;
  };

  // Build cell set for quick lookup
  const snakeSet = new Set(state.snake.map((p, i) => `${p.x},${p.y},${i}`));
  const headPos = state.snake[0];

  const snakeColor = level.color;

  const activePowerUpDef = state.activePowerUp
    ? POWER_UPS.find((p) => p.type === state.activePowerUp!.type)
    : null;
  const spawnedDef = state.spawnedPowerUp
    ? POWER_UPS.find((p) => p.type === state.spawnedPowerUp!.type)
    : null;

  return (
    <GameLayout
      title="NEON SERPENT"
      color="blue"
      score={state.score}
      highScore={highScore}
      onNewGame={() => dispatch({ type: "START" })}
    >
      {/* Active power-up indicator */}
      {activePowerUpDef && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 font-pixel text-[0.5rem] px-3 py-1 border animate-pulse z-10"
          style={{ color: activePowerUpDef.color, borderColor: activePowerUpDef.color + "80" }}
        >
          {activePowerUpDef.emoji} {activePowerUpDef.type === "scoreDouble"
            ? `×2 ×${state.activePowerUp?.scoreDoubleRemaining}`
            : activePowerUpDef.type.toUpperCase()}
        </div>
      )}

      {/* Level badge */}
      <div
        className="absolute top-16 right-4 font-pixel text-[0.45rem] px-2 py-0.5 border"
        style={{ color: snakeColor, borderColor: snakeColor + "60" }}
      >
        {level.label}
      </div>

      {/* Grid */}
      <div
        className={`relative select-none ${state.status === "dead" ? "animate-[screenShake_0.5s_ease-in-out]" : ""}`}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          width: "min(90vw, 90vh, 500px)",
          aspectRatio: "1",
          border: `1px solid ${snakeColor}33`,
          background: "#0a0a1a",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, idx) => {
          const x = idx % GRID_SIZE;
          const y = Math.floor(idx / GRID_SIZE);
          const key = `${x},${y}`;
          const isFood = state.food.x === x && state.food.y === y;
          const isSpawnedPowerUp = state.spawnedPowerUp?.pos.x === x && state.spawnedPowerUp?.pos.y === y;
          const isHead = headPos.x === x && headPos.y === y;

          // Find snake segment index at this position
          const segIdx = state.snake.findIndex((s) => s.x === x && s.y === y);
          const isSnake = segIdx !== -1;
          const opacity = isSnake ? Math.max(0.15, 1 - segIdx * 0.05) : 1;

          return (
            <div
              key={key}
              style={{
                backgroundColor: isHead
                  ? snakeColor
                  : isSnake
                  ? `${snakeColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`
                  : isFood
                  ? "#ff2d95"
                  : isSpawnedPowerUp
                  ? spawnedDef?.color ?? "#fff"
                  : "transparent",
                boxShadow: isHead
                  ? `0 0 6px ${snakeColor}`
                  : isFood
                  ? "0 0 4px #ff2d95"
                  : "none",
                borderRadius: isHead ? "2px" : "1px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.5rem",
                transition: "background-color 0.05s",
              }}
            >
              {isFood ? "" : isSpawnedPowerUp ? spawnedDef?.emoji : ""}
            </div>
          );
        })}
      </div>

      {/* Idle overlay */}
      {state.status === "idle" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">🐍</div>
            <h2 className="text-sm neon-text-blue animate-[victoryGlowBlue_1.5s_ease-in-out_infinite]">NEON SERPENT</h2>
            <p className="text-[0.5rem] text-neon-blue/60">
              {isTouchDevice() ? "SWIPE TO START" : "PRESS SPACE OR ARROW TO START"}
            </p>
            <PixelButton color="blue" onClick={() => dispatch({ type: "START" })}>PLAY</PixelButton>
          </div>
        </div>
      )}

      {/* Dead overlay */}
      {state.status === "dead" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">💥</div>
            <h2 className="text-lg sm:text-xl neon-text-pink animate-[defeatFlash_1s_ease-in-out_infinite]">SYSTEM CRASH!</h2>
            <p className="text-[0.6rem] text-neon-pink/70">SCORE: {state.score} · BEST: {highScore}</p>
            <PixelButton color="pink" onClick={() => dispatch({ type: "START" })}>TRY AGAIN</PixelButton>
          </div>
        </div>
      )}

      {/* Mobile D-pad hint */}
      {isTouchDevice() && state.status === "playing" && (
        <p className="text-[0.4rem] text-gray-600 mt-2">SWIPE TO TURN</p>
      )}
    </GameLayout>
  );
}
```

**Step 2: Verify**

- `http://localhost:3000/games/snake` loads without errors
- Snake moves, eats food, score increments
- Wall collision → death overlay
- Power-ups appear and activate
- Mobile swipe controls work

**Commit:**
```bash
git add src/app/games/snake/page.tsx
git commit -m "feat: Neon Serpent snake game page with neon trail and power-ups"
```

---

### Task 4: SEO metadata + mark as available

**Files:**
- Create: `src/app/games/snake/layout.tsx`
- Modify: `src/app/games/page.tsx` — set `available: true` for snake

**Step 1: Create layout.tsx**

```tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Neon Serpent — Free Snake Game | HeoLab",
  description:
    "Play Neon Serpent, a cyberpunk snake game with neon trails and power-ups. Speed Boost, Ghost Mode, Score ×2. Free browser game, no download.",
  openGraph: {
    title: "Neon Serpent — Free Snake Game | HeoLab",
    description: "Cyberpunk snake with neon trails and power-ups. Free browser game.",
    url: "https://heolab.dev/games/snake",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

**Step 2: Mark snake as available in /games/page.tsx**

Find the Neon Serpent entry and change `available: false` → `available: true`.

**Step 3: Update sitemap**

In `src/app/sitemap.ts`, add:
```ts
{ url: `${base}/games/snake`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
```

**Step 4: Verify**

- `/games` page now shows Neon Serpent as a clickable card
- Browser tab on `/games/snake` shows "Neon Serpent — Free Snake Game | HeoLab"

**Step 5: Commit**

```bash
git add src/app/games/snake/layout.tsx src/app/games/page.tsx src/app/sitemap.ts
git commit -m "feat: snake SEO metadata, mark as available in arcade"
```

---

### Task 5: Add globals.css animation for level-up (optional polish)

**Files:**
- Modify: `src/app/globals.css`

Add after existing keyframes:

```css
@keyframes victoryGlowBlue {
  0%, 100% { text-shadow: 0 0 8px #00d4ff, 0 0 20px #00d4ff44; }
  50% { text-shadow: 0 0 16px #00d4ff, 0 0 40px #00d4ff88, 0 0 60px #00d4ff44; }
}
```

> Check if `victoryGlowBlue` already exists in globals.css — if it does, skip this task.

**Commit:**
```bash
git add src/app/globals.css
git commit -m "fix: ensure victoryGlowBlue keyframe exists for snake overlay"
```
