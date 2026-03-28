# Snake Fix & Enhance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix ×2 power-up layout bug, redesign snake head/tail/food visuals, add bomb obstacle.

**Architecture:** Modify `config.ts` (emoji fix + bomb constants), `logic.ts` (bomb state + reducer logic), `page.tsx` (visual rendering). No new files needed.

**Tech Stack:** React 18, Next.js 16, TypeScript, CSS Grid

---

### Task 1: Fix ×2 emoji and add bomb constants to config.ts

**Files:**
- Modify: `src/games/snake/config.ts`

**Step 1: Open the file**

Read `src/games/snake/config.ts`. Current content at line 38: `emoji: "×2"` — this is a multi-character text string, not an emoji. When rendered in a tiny 1fr grid cell at `fontSize: "0.5rem"`, it overflows and breaks layout.

**Step 2: Apply changes**

Replace the entire file content with:

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
  color: string;
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
    emoji: "💰",      // was "×2" — text string caused layout overflow
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

export const GRID_SIZE = 20;
export const POWER_UP_SPAWN_CHANCE = 0.25;
export const POWER_UP_LIFETIME_MS = 6000;

// Bomb obstacle constants
export const BOMB_SCORE_THRESHOLD = 5;
export const BOMB_SPAWN_CHANCE = 0.15;
export const BOMB_LIFETIME_MS = 6000;
export const BOMB_BLINK_MS = 4000; // start blinking at 4s
```

**Step 3: Verify**

Open `http://localhost:3000/games/snake`. Play until a 💰 power-up appears. Confirm it no longer breaks the grid layout.

**Step 4: Commit**

```bash
git add src/games/snake/config.ts
git commit -m "fix(snake): replace text '×2' emoji with 💰 to prevent grid overflow"
```

---

### Task 2: Add bomb state and logic to logic.ts

**Files:**
- Modify: `src/games/snake/logic.ts`

**Step 1: Add bomb types and update imports**

Replace the entire `logic.ts` with this updated version:

```ts
import {
  GRID_SIZE, LEVELS, POWER_UPS, POWER_UP_SPAWN_CHANCE, POWER_UP_LIFETIME_MS,
  BOMB_SCORE_THRESHOLD, BOMB_SPAWN_CHANCE, BOMB_LIFETIME_MS,
} from "./config";
import type { PowerUpType } from "./config";

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
export type GameStatus = "idle" | "playing" | "dead";

export interface Position { x: number; y: number; }

export interface ActivePowerUp {
  type: PowerUpType;
  expiresAt: number | null;
  scoreDoubleRemaining: number;
}

export interface SpawnedPowerUp {
  pos: Position;
  type: PowerUpType;
  expiresAt: number;
}

export interface BombState {
  pos: Position;
  spawnedAt: number;
}

export interface SnakeState {
  snake: Position[];
  direction: Direction;
  pendingDir: Direction;
  food: Position;
  spawnedPowerUp: SpawnedPowerUp | null;
  activePowerUp: ActivePowerUp | null;
  bomb: BombState | null;     // NEW
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
    bomb: null,                // NEW
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

      let nx = head.x + (dir === "RIGHT" ? 1 : dir === "LEFT" ? -1 : 0);
      let ny = head.y + (dir === "DOWN"  ? 1 : dir === "UP"   ? -1 : 0);

      if (isGhost) {
        nx = (nx + GRID_SIZE) % GRID_SIZE;
        ny = (ny + GRID_SIZE) % GRID_SIZE;
      } else {
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) {
          return { ...state, status: "dead" };
        }
      }

      const newHead = { x: nx, y: ny };

      // Self collision
      if (!isGhost && state.snake.some((s) => posEq(s, newHead))) {
        return { ...state, status: "dead" };
      }

      // Bomb collision — instant death
      if (state.bomb && posEq(newHead, state.bomb.pos)) {
        return { ...state, status: "dead" };
      }

      const ateFood = posEq(newHead, state.food);
      const ateMultiplier = state.activePowerUp?.type === "scoreDouble" ? 2 : 1;

      let newSnake = [newHead, ...state.snake];
      if (!ateFood) newSnake = newSnake.slice(0, -1);

      let newScore = state.score;
      let newActivePowerUp = state.activePowerUp;
      let newSpawned = state.spawnedPowerUp;
      let newBomb = state.bomb;

      // Expire spawned power-up if timed out
      if (newSpawned && action.now > newSpawned.expiresAt) {
        newSpawned = null;
      }

      // Expire bomb if timed out
      if (newBomb && action.now > newBomb.spawnedAt + BOMB_LIFETIME_MS) {
        newBomb = null;
      }

      if (ateFood) {
        newScore += 1 * ateMultiplier;

        if (newActivePowerUp?.type === "scoreDouble") {
          const remaining = newActivePowerUp.scoreDoubleRemaining - 1;
          newActivePowerUp = remaining <= 0 ? null : { ...newActivePowerUp, scoreDoubleRemaining: remaining };
        }

        // Spawn power-up
        if (!newSpawned && Math.random() < POWER_UP_SPAWN_CHANCE) {
          const def = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
          newSpawned = {
            pos: randomPos([...newSnake, state.food]),
            type: def.type,
            expiresAt: action.now + POWER_UP_LIFETIME_MS,
          };
        }

        // Spawn bomb (independent of power-up)
        if (
          !newBomb &&
          newScore >= BOMB_SCORE_THRESHOLD &&
          Math.random() < BOMB_SPAWN_CHANCE
        ) {
          const excludePositions = [
            ...newSnake,
            state.food,
            ...(newSpawned ? [newSpawned.pos] : []),
          ];
          newBomb = {
            pos: randomPos(excludePositions),
            spawnedAt: action.now,
          };
        }
      }

      // Power-up pickup
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
        bomb: newBomb,
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

**Step 2: Verify TypeScript**

Check terminal — no TypeScript errors.

**Step 3: Commit**

```bash
git add src/games/snake/logic.ts
git commit -m "feat(snake): add bomb obstacle state and logic to reducer"
```

---

### Task 3: Update snake rendering in page.tsx

**Files:**
- Modify: `src/app/games/snake/page.tsx`

**Step 1: Add bomb import and state reference**

At line 7, update the import from `config` to include bomb constants:
```ts
import { GRID_SIZE, LEVELS, POWER_UPS, BOMB_BLINK_MS } from "@/games/snake/config";
```

**Step 2: Add bomb reference below `spawnedDef`** (around line 162)

After:
```ts
const spawnedDef = state.spawnedPowerUp
  ? POWER_UPS.find((p) => p.type === state.spawnedPowerUp!.type)
  : null;
```

Add:
```ts
const now = Date.now();
const bombBlinking = state.bomb
  ? now - state.bomb.spawnedAt > BOMB_BLINK_MS
  : false;
```

**Step 3: Update the grid cell rendering**

Find the large `return (` block inside `Array.from(...)` (around line 222). Replace the entire cell `<div>` with this updated version that handles head eyes, food emoji, tail scale, and bomb:

```tsx
return (
  <div
    key={key}
    style={{
      backgroundColor: isHead
        ? snakeColor
        : isSnake
        ? `${snakeColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`
        : isFood
        ? "transparent"
        : isSpawnedPowerUp
        ? spawnedDef?.color ?? "#fff"
        : isBomb
        ? "transparent"
        : "transparent",
      boxShadow: isHead
        ? `0 0 6px ${snakeColor}`
        : isFood
        ? "none"
        : "none",
      borderRadius: isHead ? "4px" : isSnake ? "1px" : "0",
      transform: isTail ? "scale(0.6)" : undefined,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "65%",
      transition: "background-color 0.05s",
      position: "relative" as const,
    }}
  >
    {/* Snake head eyes */}
    {isHead && (
      <>
        <span style={{
          position: "absolute",
          width: "2px", height: "2px",
          background: "#000",
          borderRadius: "50%",
          top: state.direction === "DOWN" ? "auto" : "20%",
          bottom: state.direction === "DOWN" ? "20%" : "auto",
          left: state.direction === "RIGHT" ? "auto" : state.direction === "LEFT" ? "20%" : "20%",
          right: state.direction === "RIGHT" ? "20%" : "auto",
        }} />
        <span style={{
          position: "absolute",
          width: "2px", height: "2px",
          background: "#000",
          borderRadius: "50%",
          top: state.direction === "DOWN" ? "auto" : "20%",
          bottom: state.direction === "DOWN" ? "20%" : "auto",
          left: state.direction === "RIGHT" ? "auto" : state.direction === "LEFT" ? "20%" : "55%",
          right: state.direction === "RIGHT" ? "20%" : state.direction === "UP" ? "auto" : "auto",
        }} />
      </>
    )}
    {/* Food */}
    {isFood && <span>🍎</span>}
    {/* Power-up */}
    {!isFood && isSpawnedPowerUp && spawnedDef?.emoji}
    {/* Bomb */}
    {isBomb && (
      <span className={bombBlinking ? "animate-pulse" : ""}>💣</span>
    )}
  </div>
);
```

**Step 4: Add `isBomb` and `isTail` variables**

Inside the `Array.from` mapping, after `const isSnake = segIdx !== -1;` line, add:
```ts
const isTail = segIdx === state.snake.length - 1 && state.snake.length > 1;
const isBomb = state.bomb?.pos.x === x && state.bomb?.pos.y === y;
```

**Step 5: Verify in browser**

1. Open `http://localhost:3000/games/snake`
2. Play until score ≥ 5 — a 💣 bomb should appear
3. Bomb should blink in last 2 seconds, then disappear
4. Eating bomb → game over immediately
5. Head should show tiny eyes, tail should be smaller, food shows 🍎

**Step 6: Commit**

```bash
git add src/app/games/snake/page.tsx
git commit -m "feat(snake): redesign head/tail/food visuals, add bomb obstacle rendering"
```
