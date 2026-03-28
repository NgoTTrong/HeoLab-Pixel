# Block Storm (Tetris) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build "Block Storm" — a Tetris game with random chaos events (Lightning, Bomb, Ice, Fever) at `/games/tetris`.

**Architecture:** Pure logic in `src/games/tetris/logic.ts` with `useReducer`. Board rendered as 10×20 CSS grid. Game loop via `setInterval`. Events trigger every 5 lines cleared.

**Tech Stack:** Next.js 16 App Router, TypeScript, React hooks, Tailwind CSS v4.

---

### Task 1: Config

**Files:**
- Create: `src/games/tetris/config.ts`

```ts
export type EventType = "lightning" | "bomb" | "freeze" | "fever";

export interface EventDef {
  type: EventType;
  emoji: string;
  label: string;
  color: string;
}

export const RANDOM_EVENTS: EventDef[] = [
  { type: "lightning", emoji: "⚡", label: "LIGHTNING STRIKE!", color: "#ffe600" },
  { type: "bomb",      emoji: "💣", label: "BOMB BLOCK!",       color: "#ff2d95" },
  { type: "freeze",    emoji: "❄️", label: "ICE FREEZE!",       color: "#00d4ff" },
  { type: "fever",     emoji: "🔥", label: "FEVER TIME!",       color: "#f97316" },
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

// Score per lines cleared
export const LINE_SCORES = [0, 100, 300, 500, 800];
```

**Commit:**
```bash
git add src/games/tetris/config.ts
git commit -m "feat: tetris config"
```

---

### Task 2: Tetromino definitions

**Files:**
- Create: `src/games/tetris/tetrominoes.ts`

```ts
// Each tetromino: array of [dx, dy] offsets from pivot
export type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export interface Tetromino {
  type: TetrominoType;
  color: string;
  cells: [number, number][][]; // cells[rotation] = array of [col, row] offsets
}

export const TETROMINOES: Record<TetrominoType, Tetromino> = {
  I: {
    type: "I",
    color: "#00d4ff",
    cells: [
      [[0,1],[1,1],[2,1],[3,1]],
      [[2,0],[2,1],[2,2],[2,3]],
      [[0,2],[1,2],[2,2],[3,2]],
      [[1,0],[1,1],[1,2],[1,3]],
    ],
  },
  O: {
    type: "O",
    color: "#ffe600",
    cells: [
      [[1,0],[2,0],[1,1],[2,1]],
      [[1,0],[2,0],[1,1],[2,1]],
      [[1,0],[2,0],[1,1],[2,1]],
      [[1,0],[2,0],[1,1],[2,1]],
    ],
  },
  T: {
    type: "T",
    color: "#a855f7",
    cells: [
      [[1,0],[0,1],[1,1],[2,1]],
      [[1,0],[1,1],[2,1],[1,2]],
      [[0,1],[1,1],[2,1],[1,2]],
      [[1,0],[0,1],[1,1],[1,2]],
    ],
  },
  S: {
    type: "S",
    color: "#39ff14",
    cells: [
      [[1,0],[2,0],[0,1],[1,1]],
      [[1,0],[1,1],[2,1],[2,2]],
      [[1,1],[2,1],[0,2],[1,2]],
      [[0,0],[0,1],[1,1],[1,2]],
    ],
  },
  Z: {
    type: "Z",
    color: "#ff2d95",
    cells: [
      [[0,0],[1,0],[1,1],[2,1]],
      [[2,0],[1,1],[2,1],[1,2]],
      [[0,1],[1,1],[1,2],[2,2]],
      [[1,0],[0,1],[1,1],[0,2]],
    ],
  },
  J: {
    type: "J",
    color: "#f97316",
    cells: [
      [[0,0],[0,1],[1,1],[2,1]],
      [[1,0],[2,0],[1,1],[1,2]],
      [[0,1],[1,1],[2,1],[2,2]],
      [[1,0],[1,1],[0,2],[1,2]],
    ],
  },
  L: {
    type: "L",
    color: "#ffe600",
    cells: [
      [[2,0],[0,1],[1,1],[2,1]],
      [[1,0],[1,1],[1,2],[2,2]],
      [[0,1],[1,1],[2,1],[0,2]],
      [[0,0],[1,0],[1,1],[1,2]],
    ],
  },
};

const TYPES: TetrominoType[] = ["I","O","T","S","Z","J","L"];

// 7-bag randomizer
export function createBag(): TetrominoType[] {
  const bag = [...TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}
```

**Commit:**
```bash
git add src/games/tetris/tetrominoes.ts
git commit -m "feat: tetromino definitions with 7-bag randomizer"
```

---

### Task 3: Game logic

**Files:**
- Create: `src/games/tetris/logic.ts`

```ts
import { BOARD_COLS, BOARD_ROWS, LINE_SCORES, RANDOM_EVENTS, getSpeed } from "./config";
import type { EventType } from "./config";
import { TETROMINOES, createBag } from "./tetrominoes";
import type { TetrominoType } from "./tetrominoes";

export type Cell = string | null; // color string or null
export type Board = Cell[][];
export type GameStatus = "idle" | "playing" | "paused" | "over";

export interface ActivePiece {
  type: TetrominoType;
  rotation: number;
  col: number; // pivot column
  row: number; // pivot row
}

export interface TetrisState {
  board: Board;
  active: ActivePiece;
  held: TetrominoType | null;
  canHold: boolean;
  bag: TetrominoType[];
  nextPieces: TetrominoType[]; // next 3
  score: number;
  lines: number;
  level: number;
  status: GameStatus;
  activeEvent: EventType | null;
  eventEndsAt: number | null; // for fever/freeze
  linesUntilEvent: number; // counts down to trigger event
}

export type TetrisAction =
  | { type: "START" }
  | { type: "RESET" }
  | { type: "MOVE_LEFT" }
  | { type: "MOVE_RIGHT" }
  | { type: "MOVE_DOWN" }
  | { type: "HARD_DROP" }
  | { type: "ROTATE" }
  | { type: "HOLD" }
  | { type: "TICK"; now: number }
  | { type: "CLEAR_EVENT" };

function emptyBoard(): Board {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

function getAbsCells(piece: ActivePiece): [number, number][] {
  const def = TETROMINOES[piece.type];
  return def.cells[piece.rotation].map(([dc, dr]) => [piece.col + dc, piece.row + dr]);
}

function isValid(board: Board, piece: ActivePiece): boolean {
  return getAbsCells(piece).every(([c, r]) =>
    c >= 0 && c < BOARD_COLS && r >= 0 && r < BOARD_ROWS && board[r][c] === null
  );
}

function lockPiece(board: Board, piece: ActivePiece): Board {
  const color = TETROMINOES[piece.type].color;
  const newBoard = board.map((row) => [...row]);
  getAbsCells(piece).forEach(([c, r]) => {
    newBoard[r][c] = color;
  });
  return newBoard;
}

function clearLines(board: Board): { board: Board; cleared: number } {
  const remaining = board.filter((row) => row.some((c) => c === null));
  const cleared = BOARD_ROWS - remaining.length;
  const newRows = Array.from({ length: cleared }, () => Array(BOARD_COLS).fill(null));
  return { board: [...newRows, ...remaining], cleared };
}

function ghostRow(board: Board, piece: ActivePiece): number {
  let ghost = { ...piece };
  while (isValid(board, { ...ghost, row: ghost.row + 1 })) ghost.row++;
  return ghost.row;
}

function spawnPiece(type: TetrominoType): ActivePiece {
  return { type, rotation: 0, col: 3, row: 0 };
}

function drawFromBag(state: TetrisState): { active: ActivePiece; bag: TetrominoType[]; nextPieces: TetrominoType[] } {
  let bag = [...state.bag];
  const allPieces = [...state.nextPieces, ...bag];
  if (allPieces.length < 4) bag = [...bag, ...createBag()];
  const next = [...state.nextPieces, ...bag];
  const active = spawnPiece(next[0]);
  return { active, bag: next.slice(4), nextPieces: next.slice(1, 4) };
}

function applyEvent(board: Board, event: EventType): Board {
  const newBoard = board.map((row) => [...row]);
  if (event === "lightning") {
    // Clear a random non-empty row
    const nonEmpty = newBoard.reduce<number[]>((acc, row, i) => {
      if (row.some((c) => c !== null)) acc.push(i);
      return acc;
    }, []);
    if (nonEmpty.length > 0) {
      const targetRow = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
      newBoard.splice(targetRow, 1);
      newBoard.unshift(Array(BOARD_COLS).fill(null));
    }
  }
  return newBoard;
}

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
  };
}

export function tetrisReducer(state: TetrisState, action: TetrisAction): TetrisState {
  switch (action.type) {
    case "START":
      return { ...initialState(), status: "playing" };
    case "RESET":
      return initialState();

    case "CLEAR_EVENT":
      return { ...state, activeEvent: null, eventEndsAt: null };

    case "MOVE_LEFT": {
      if (state.status !== "playing") return state;
      const moved = { ...state.active, col: state.active.col - 1 };
      return isValid(state.board, moved) ? { ...state, active: moved } : state;
    }
    case "MOVE_RIGHT": {
      if (state.status !== "playing") return state;
      const moved = { ...state.active, col: state.active.col + 1 };
      return isValid(state.board, moved) ? { ...state, active: moved } : state;
    }
    case "ROTATE": {
      if (state.status !== "playing") return state;
      const rotated = { ...state.active, rotation: (state.active.rotation + 1) % 4 };
      // Wall kick: try col offsets [0, -1, 1, -2, 2]
      for (const offset of [0, -1, 1, -2, 2]) {
        const kicked = { ...rotated, col: rotated.col + offset };
        if (isValid(state.board, kicked)) return { ...state, active: kicked };
      }
      return state;
    }
    case "HOLD": {
      if (state.status !== "playing" || !state.canHold) return state;
      const newHeld = state.active.type;
      const { active, bag, nextPieces } = state.held
        ? { active: spawnPiece(state.held), bag: state.bag, nextPieces: state.nextPieces }
        : drawFromBag(state);
      return { ...state, active, held: newHeld, canHold: false, bag, nextPieces };
    }

    case "MOVE_DOWN":
    case "TICK": {
      if (state.status !== "playing") return state;
      if (state.activeEvent === "freeze" && action.type === "TICK") return state; // freeze pauses auto-drop

      const moved = { ...state.active, row: state.active.row + 1 };
      if (isValid(state.board, moved)) {
        return { ...state, active: moved };
      }

      // Lock piece
      let board = lockPiece(state.board, state.active);
      const { board: clearedBoard, cleared } = clearLines(board);
      board = clearedBoard;

      // Score
      const isFever = state.activeEvent === "fever";
      const multiplier = isFever ? 2 : 1;
      const lineScore = LINE_SCORES[Math.min(cleared, 4)] * multiplier;
      const newScore = state.score + lineScore;
      const newLines = state.lines + cleared;
      const newLevel = Math.floor(newLines / 10) + 1;

      // Event trigger
      let linesUntilEvent = state.linesUntilEvent - cleared;
      let activeEvent = state.activeEvent;
      let eventEndsAt = state.eventEndsAt;

      if (linesUntilEvent <= 0 && cleared > 0) {
        linesUntilEvent = 5;
        const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
        activeEvent = event.type;
        if (event.type === "freeze") {
          board = applyEvent(board, event.type);
          eventEndsAt = Date.now() + 3000;
        } else if (event.type === "fever") {
          eventEndsAt = Date.now() + 30000;
        } else if (event.type === "lightning") {
          board = applyEvent(board, event.type);
          eventEndsAt = Date.now() + 2000;
        } else if (event.type === "bomb") {
          eventEndsAt = Date.now() + 2000; // just banner
        }
      }

      // Expire time-based events
      if (eventEndsAt && Date.now() > eventEndsAt) {
        activeEvent = null;
        eventEndsAt = null;
      }

      // Spawn next piece
      const { active, bag, nextPieces } = drawFromBag({ ...state, bag: state.bag, nextPieces: state.nextPieces });

      // Check top-out (game over)
      if (!isValid(board, active)) {
        return { ...state, board, score: newScore, lines: newLines, level: newLevel, status: "over" };
      }

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
        linesUntilEvent: Math.max(linesUntilEvent, 0),
      };
    }

    case "HARD_DROP": {
      if (state.status !== "playing") return state;
      let dropped = { ...state.active };
      let dropDist = 0;
      while (isValid(state.board, { ...dropped, row: dropped.row + 1 })) {
        dropped.row++;
        dropDist++;
      }
      const locked = { ...state, active: dropped, score: state.score + dropDist * 2 };
      return tetrisReducer(locked, { type: "TICK", now: Date.now() });
    }

    default:
      return state;
  }
}

export { getAbsCells, ghostRow, isValid };
```

**Commit:**
```bash
git add src/games/tetris/logic.ts
git commit -m "feat: tetris game logic with random events, hold, ghost piece"
```

---

### Task 4: Game page

**Files:**
- Create: `src/app/games/tetris/page.tsx`

```tsx
"use client";

import { useReducer, useEffect, useCallback, useState } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import { tetrisReducer, getAbsCells, ghostRow } from "@/games/tetris/logic";
import { BOARD_COLS, BOARD_ROWS, RANDOM_EVENTS, getSpeed } from "@/games/tetris/config";
import { TETROMINOES } from "@/games/tetris/tetrominoes";
import { getHighScore, setHighScore } from "@/lib/scores";

const GAME_KEY = "tetris";
const CELL_SIZE = 28; // px

export default function TetrisPage() {
  const [state, dispatch] = useReducer(tetrisReducer, undefined, () => {
    // lazy initializer — import initialState logic inline
    return { board: Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null)), active: { type: "I" as const, rotation: 0, col: 3, row: 0 }, held: null, canHold: true, bag: [], nextPieces: [] as any[], score: 0, lines: 0, level: 1, status: "idle" as const, activeEvent: null, eventEndsAt: null, linesUntilEvent: 5 };
  });
  const [highScore, setHS] = useState(0);

  useEffect(() => { setHS(getHighScore(GAME_KEY)); }, []);

  useEffect(() => {
    if (state.status !== "playing") return;
    const ms = getSpeed(state.level);
    const id = setInterval(() => dispatch({ type: "TICK", now: Date.now() }), ms);
    return () => clearInterval(id);
  }, [state.status, state.level]);

  useEffect(() => {
    if (state.status === "over" && state.score > highScore) {
      setHighScore(GAME_KEY, state.score);
      setHS(state.score);
    }
  }, [state.status, state.score, highScore]);

  // Auto-clear event banner after 2s
  useEffect(() => {
    if (!state.activeEvent || state.eventEndsAt === null) return;
    const remaining = state.eventEndsAt - Date.now();
    if (remaining <= 0) { dispatch({ type: "CLEAR_EVENT" }); return; }
    const id = setTimeout(() => dispatch({ type: "CLEAR_EVENT" }), remaining);
    return () => clearTimeout(id);
  }, [state.activeEvent, state.eventEndsAt]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (state.status === "idle" && e.key === " ") { e.preventDefault(); dispatch({ type: "START" }); return; }
    if (state.status !== "playing") return;
    switch (e.key) {
      case "ArrowLeft":  e.preventDefault(); dispatch({ type: "MOVE_LEFT" }); break;
      case "ArrowRight": e.preventDefault(); dispatch({ type: "MOVE_RIGHT" }); break;
      case "ArrowDown":  e.preventDefault(); dispatch({ type: "MOVE_DOWN" }); break;
      case "ArrowUp":    e.preventDefault(); dispatch({ type: "ROTATE" }); break;
      case " ":          e.preventDefault(); dispatch({ type: "HARD_DROP" }); break;
      case "c": case "C": dispatch({ type: "HOLD" }); break;
    }
  }, [state.status]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Build active piece cell set
  const activeCells = new Set(
    getAbsCells(state.active).map(([c, r]) => `${c},${r}`)
  );
  const ghostR = state.status === "playing" ? ghostRow(state.board, state.active) : state.active.row;
  const ghostCells = new Set(
    getAbsCells({ ...state.active, row: ghostR }).map(([c, r]) => `${c},${r}`)
  );
  const activeColor = TETROMINOES[state.active.type].color;
  const eventDef = state.activeEvent ? RANDOM_EVENTS.find((e) => e.type === state.activeEvent) : null;

  return (
    <GameLayout title="BLOCK STORM" color="pink" score={state.score} highScore={highScore} onNewGame={() => dispatch({ type: "START" })}>
      <div className="flex gap-4 items-start">
        {/* Hold */}
        <div className="flex flex-col gap-2 items-center">
          <span className="font-pixel text-[0.4rem] text-gray-500">HOLD</span>
          <div className="w-16 h-12 bg-dark-card border border-gray-800 flex items-center justify-center">
            {state.held && (
              <span className="text-xl" style={{ color: TETROMINOES[state.held].color }}>{state.held}</span>
            )}
          </div>
          <span className="font-pixel text-[0.4rem] text-gray-600">LVL {state.level}</span>
          <span className="font-pixel text-[0.4rem] text-gray-600">LINES {state.lines}</span>
        </div>

        {/* Board */}
        <div
          className="relative border border-gray-800"
          style={{ width: CELL_SIZE * BOARD_COLS, height: CELL_SIZE * BOARD_ROWS }}
        >
          {/* Event banner */}
          {eventDef && (
            <div
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 text-center py-2 font-pixel text-[0.5rem] animate-[overlayIn_0.3s_ease-out]"
              style={{ backgroundColor: eventDef.color + "22", color: eventDef.color, border: `1px solid ${eventDef.color}66` }}
            >
              {eventDef.emoji} {eventDef.label}
            </div>
          )}

          {/* Cells */}
          {Array.from({ length: BOARD_ROWS * BOARD_COLS }, (_, idx) => {
            const c = idx % BOARD_COLS;
            const r = Math.floor(idx / BOARD_COLS);
            const key = `${c},${r}`;
            const boardColor = state.board[r][c];
            const isActive = activeCells.has(key);
            const isGhost = !isActive && ghostCells.has(key);
            const color = isActive ? activeColor : boardColor;

            return (
              <div
                key={key}
                style={{
                  position: "absolute",
                  left: c * CELL_SIZE,
                  top: r * CELL_SIZE,
                  width: CELL_SIZE - 1,
                  height: CELL_SIZE - 1,
                  backgroundColor: color ?? (isGhost ? activeColor + "30" : "#0a0a1a"),
                  border: isGhost ? `1px solid ${activeColor}40` : color ? "1px solid rgba(255,255,255,0.1)" : "1px solid #1a1a2e",
                  boxShadow: isActive ? `0 0 4px ${color}88` : "none",
                }}
              />
            );
          })}
        </div>

        {/* Next pieces */}
        <div className="flex flex-col gap-2 items-center">
          <span className="font-pixel text-[0.4rem] text-gray-500">NEXT</span>
          {state.nextPieces.map((type, i) => (
            <div key={i} className="w-16 h-10 bg-dark-card border border-gray-800 flex items-center justify-center">
              <span className="text-sm" style={{ color: TETROMINOES[type].color }}>{type}</span>
            </div>
          ))}
          <div className="mt-2 text-[0.4rem] text-gray-600 font-pixel">
            <div>↑ ROTATE</div>
            <div>SPC DROP</div>
            <div>C HOLD</div>
          </div>
        </div>
      </div>

      {/* Idle overlay */}
      {state.status === "idle" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">🧱</div>
            <h2 className="text-sm neon-text-pink animate-[victoryGlow_1.5s_ease-in-out_infinite]" style={{ "--glow-color": "#f97316" } as any}>BLOCK STORM</h2>
            <p className="text-[0.5rem] text-gray-500">PRESS SPACE TO START</p>
            <PixelButton color="pink" onClick={() => dispatch({ type: "START" })}>PLAY</PixelButton>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {state.status === "over" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">💥</div>
            <h2 className="text-lg sm:text-xl neon-text-pink animate-[defeatFlash_1s_ease-in-out_infinite]">CASTLE FELL!</h2>
            <p className="text-[0.6rem] text-neon-pink/70">SCORE: {state.score} · BEST: {highScore} · LVL {state.level}</p>
            <PixelButton color="pink" onClick={() => dispatch({ type: "START" })}>TRY AGAIN</PixelButton>
          </div>
        </div>
      )}
    </GameLayout>
  );
}
```

**Commit:**
```bash
git add src/app/games/tetris/page.tsx
git commit -m "feat: Block Storm tetris game page"
```

---

### Task 5: SEO + mark available

**Files:**
- Create: `src/app/games/tetris/layout.tsx`
- Modify: `src/app/games/page.tsx` — set Block Storm `available: true`
- Modify: `src/app/sitemap.ts` — add tetris URL

```tsx
// layout.tsx
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Block Storm — Free Tetris Game | HeoLab",
  description: "Play Block Storm, a Tetris game with random chaos events. Lightning strikes, bomb blocks, ice freeze and fever mode. Free browser game.",
  openGraph: {
    title: "Block Storm — Free Tetris Game | HeoLab",
    description: "Tetris with random chaos events. Lightning, bombs, ice freeze, and fever mode.",
    url: "https://heolab.dev/games/tetris",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

**Commit:**
```bash
git add src/app/games/tetris/layout.tsx src/app/games/page.tsx src/app/sitemap.ts
git commit -m "feat: tetris SEO metadata, mark as available"
```
