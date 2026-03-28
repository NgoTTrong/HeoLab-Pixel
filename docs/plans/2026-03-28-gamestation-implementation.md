# GameStation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a retro pixel-art themed game website with 4 puzzle games (Minesweeper, 2048, Sudoku, Memory Match), deployed on Vercel.

**Architecture:** Next.js 15 App Router with TypeScript and Tailwind CSS. Each game is a separate page under `/games/[name]`. Game logic lives in `src/games/` with React state management via `useReducer`. Shared retro UI components in `src/components/`.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Google Fonts (Press Start 2P), localStorage for scores.

---

## Task 1: Project Scaffold

**Files:**
- Create: entire Next.js project via CLI
- Modify: `tailwind.config.ts` (custom colors)
- Modify: `src/app/globals.css` (retro theme, scanlines)
- Modify: `src/app/layout.tsx` (pixel font, dark theme)

**Step 1: Create Next.js project**

Run:
```bash
cd E:/Personal/GameStation
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias="@/*" --yes
```

Expected: Project files created, dependencies installed.

**Step 2: Verify project runs**

Run: `npm run dev`
Expected: Dev server starts on localhost:3000

**Step 3: Configure Tailwind custom theme**

Edit `tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/games/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          green: "#39ff14",
          pink: "#ff2d95",
          yellow: "#ffe600",
          blue: "#00d4ff",
        },
        dark: {
          bg: "#0a0a0a",
          card: "#1a1a2e",
          border: "#2a2a4a",
        },
      },
      fontFamily: {
        pixel: ["var(--font-press-start)", "monospace"],
      },
      animation: {
        glow: "glow 2s ease-in-out infinite alternate",
        scanline: "scanline 8s linear infinite",
        "pixel-fade": "pixelFade 0.3s ease-out",
      },
      keyframes: {
        glow: {
          "0%": { textShadow: "0 0 5px currentColor" },
          "100%": { textShadow: "0 0 20px currentColor, 0 0 40px currentColor" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        pixelFade: {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

**Step 4: Set up global styles**

Replace `src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-dark-bg text-white antialiased;
  }
}

@layer components {
  .scanline-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 50;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.03) 0px,
      rgba(0, 0, 0, 0.03) 1px,
      transparent 1px,
      transparent 2px
    );
  }

  .neon-text {
    text-shadow: 0 0 7px currentColor, 0 0 10px currentColor,
      0 0 21px currentColor;
  }

  .neon-border {
    box-shadow: 0 0 5px currentColor, inset 0 0 5px currentColor;
  }

  .pixel-btn {
    @apply font-pixel text-xs px-4 py-2 border-2 transition-all duration-200;
    image-rendering: pixelated;
  }

  .pixel-btn:hover {
    @apply scale-105;
    box-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
  }
}
```

**Step 5: Set up root layout with pixel font**

Replace `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-press-start",
});

export const metadata: Metadata = {
  title: "GameStation - Retro Puzzle Arcade",
  description: "A collection of retro pixel-art puzzle games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={pressStart.variable}>
      <body className="font-pixel">
        <div className="scanline-overlay" />
        {children}
      </body>
    </html>
  );
}
```

**Step 6: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js project with retro pixel theme"
```

---

## Task 2: Shared Components

**Files:**
- Create: `src/components/GameCard.tsx`
- Create: `src/components/GameLayout.tsx`
- Create: `src/components/PixelButton.tsx`
- Create: `src/lib/scores.ts`

**Step 1: Create PixelButton**

Create `src/components/PixelButton.tsx`:
```tsx
"use client";

interface PixelButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  color?: "green" | "pink" | "yellow" | "blue";
  disabled?: boolean;
  className?: string;
}

const colorMap = {
  green: "text-neon-green border-neon-green",
  pink: "text-neon-pink border-neon-pink",
  yellow: "text-neon-yellow border-neon-yellow",
  blue: "text-neon-blue border-neon-blue",
};

export default function PixelButton({
  onClick,
  children,
  color = "green",
  disabled = false,
  className = "",
}: PixelButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`pixel-btn ${colorMap[color]} ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"} ${className}`}
    >
      {children}
    </button>
  );
}
```

**Step 2: Create score utility**

Create `src/lib/scores.ts`:
```ts
export function getHighScore(game: string): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(`gamestation-${game}-highscore`) || "0", 10);
}

export function setHighScore(game: string, score: number): void {
  if (typeof window === "undefined") return;
  const current = getHighScore(game);
  if (score > current) {
    localStorage.setItem(`gamestation-${game}-highscore`, score.toString());
  }
}

export function getBestTime(game: string): number | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(`gamestation-${game}-besttime`);
  return val ? parseInt(val, 10) : null;
}

export function setBestTime(game: string, time: number): void {
  if (typeof window === "undefined") return;
  const current = getBestTime(game);
  if (current === null || time < current) {
    localStorage.setItem(`gamestation-${game}-besttime`, time.toString());
  }
}
```

**Step 3: Create GameLayout**

Create `src/components/GameLayout.tsx`:
```tsx
"use client";

import Link from "next/link";
import PixelButton from "./PixelButton";

interface GameLayoutProps {
  title: string;
  color: "green" | "pink" | "yellow" | "blue";
  score?: number;
  highScore?: number;
  timer?: number;
  onNewGame?: () => void;
  children: React.ReactNode;
  controls?: React.ReactNode;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function GameLayout({
  title,
  color,
  score,
  highScore,
  timer,
  onNewGame,
  children,
  controls,
}: GameLayoutProps) {
  const colorText: Record<string, string> = {
    green: "text-neon-green",
    pink: "text-neon-pink",
    yellow: "text-neon-yellow",
    blue: "text-neon-blue",
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      {/* Top bar */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-4">
        <Link href="/" className={`${colorText[color]} text-[10px] hover:underline`}>
          ← BACK
        </Link>
        <h1 className={`${colorText[color]} text-sm neon-text`}>{title}</h1>
        <div className="text-[10px] text-gray-400">
          {timer !== undefined && <span>TIME {formatTime(timer)}</span>}
        </div>
      </div>

      {/* Score bar */}
      <div className="w-full max-w-2xl flex justify-center gap-8 mb-4 text-[10px]">
        {score !== undefined && (
          <span className="text-white">
            SCORE <span className={colorText[color]}>{score}</span>
          </span>
        )}
        {highScore !== undefined && highScore > 0 && (
          <span className="text-gray-400">
            BEST <span className={colorText[color]}>{highScore}</span>
          </span>
        )}
      </div>

      {/* Game area */}
      <div className="flex-1 flex items-start justify-center w-full max-w-2xl">
        {children}
      </div>

      {/* Bottom bar */}
      <div className="w-full max-w-2xl flex items-center justify-center gap-4 mt-4 pb-4">
        {onNewGame && (
          <PixelButton onClick={onNewGame} color={color}>
            NEW GAME
          </PixelButton>
        )}
        {controls}
      </div>
    </div>
  );
}
```

**Step 4: Create GameCard**

Create `src/components/GameCard.tsx`:
```tsx
import Link from "next/link";

interface GameCardProps {
  title: string;
  subtitle: string;
  href: string;
  color: "green" | "pink" | "yellow" | "blue";
  emoji: string;
  tag: string;
}

const colorMap: Record<string, { border: string; text: string; tag: string }> = {
  green: {
    border: "border-neon-green hover:shadow-[0_0_20px_rgba(57,255,20,0.3)]",
    text: "text-neon-green",
    tag: "bg-neon-green/10 text-neon-green border-neon-green/30",
  },
  pink: {
    border: "border-neon-pink hover:shadow-[0_0_20px_rgba(255,45,149,0.3)]",
    text: "text-neon-pink",
    tag: "bg-neon-pink/10 text-neon-pink border-neon-pink/30",
  },
  yellow: {
    border: "border-neon-yellow hover:shadow-[0_0_20px_rgba(255,230,0,0.3)]",
    text: "text-neon-yellow",
    tag: "bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30",
  },
  blue: {
    border: "border-neon-blue hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]",
    text: "text-neon-blue",
    tag: "bg-neon-blue/10 text-neon-blue border-neon-blue/30",
  },
};

export default function GameCard({ title, subtitle, href, color, emoji, tag }: GameCardProps) {
  const c = colorMap[color];
  return (
    <Link href={href}>
      <div
        className={`bg-dark-card border-2 ${c.border} rounded-lg p-6 transition-all duration-300 hover:scale-105 cursor-pointer group`}
      >
        <div className="text-4xl mb-4 group-hover:animate-pixel-fade">{emoji}</div>
        <h2 className={`${c.text} text-sm mb-2 neon-text`}>{title}</h2>
        <p className="text-gray-400 text-[8px] leading-relaxed mb-3">{subtitle}</p>
        <span className={`text-[7px] px-2 py-1 border rounded ${c.tag}`}>{tag}</span>
      </div>
    </Link>
  );
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add shared components (GameCard, GameLayout, PixelButton, scores)"
```

---

## Task 3: Homepage

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Build homepage**

Replace `src/app/page.tsx`:
```tsx
import GameCard from "@/components/GameCard";

const games = [
  {
    title: "DUNGEON SWEEP",
    subtitle: "Clear the dungeon without waking the monsters. Classic minesweeper with a pixel RPG twist.",
    href: "/games/minesweeper",
    color: "green" as const,
    emoji: "💀",
    tag: "PUZZLE",
  },
  {
    title: "MONSTER 2048",
    subtitle: "Merge pixel monsters to evolve them. Can you reach the legendary Dragon?",
    href: "/games/2048",
    color: "pink" as const,
    emoji: "🐉",
    tag: "PUZZLE",
  },
  {
    title: "RUNE SUDOKU",
    subtitle: "Decode ancient runes in this mystical take on the classic number puzzle.",
    href: "/games/sudoku",
    color: "blue" as const,
    emoji: "🔮",
    tag: "PUZZLE",
  },
  {
    title: "PIXEL BESTIARY",
    subtitle: "Match pixel creatures from the bestiary. Build combos for bonus points.",
    href: "/games/memory-match",
    color: "yellow" as const,
    emoji: "🃏",
    tag: "MEMORY",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      {/* Header */}
      <h1 className="text-2xl md:text-3xl text-neon-green neon-text mb-2">
        GAMESTATION
      </h1>
      <p className="text-[8px] text-gray-500 mb-12 tracking-widest">
        RETRO PUZZLE ARCADE
      </p>

      {/* Game Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl w-full">
        {games.map((game) => (
          <GameCard key={game.href} {...game} />
        ))}
      </div>

      {/* Footer */}
      <p className="text-[7px] text-gray-600 mt-16">
        INSERT COIN TO CONTINUE
      </p>
    </main>
  );
}
```

**Step 2: Verify homepage renders**

Run: `npm run dev`
Expected: Homepage shows 4 game cards in a grid with retro styling.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add homepage with game gallery grid"
```

---

## Task 4: Minesweeper - "Dungeon Explorer"

**Files:**
- Create: `src/games/minesweeper/types.ts`
- Create: `src/games/minesweeper/logic.ts`
- Create: `src/games/minesweeper/Board.tsx`
- Create: `src/games/minesweeper/Cell.tsx`
- Create: `src/app/games/minesweeper/page.tsx`

**Step 1: Define types**

Create `src/games/minesweeper/types.ts`:
```ts
export type CellState = {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
};

export type Difficulty = "easy" | "medium" | "hard";

export type GameState = "playing" | "won" | "lost";

export type MinesweeperState = {
  board: CellState[][];
  rows: number;
  cols: number;
  mines: number;
  gameState: GameState;
  flagCount: number;
  revealedCount: number;
  firstClick: boolean;
};

export const DIFFICULTIES: Record<Difficulty, { rows: number; cols: number; mines: number }> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
};
```

**Step 2: Implement game logic**

Create `src/games/minesweeper/logic.ts`:
```ts
import { CellState, MinesweeperState, Difficulty, DIFFICULTIES } from "./types";

export function createBoard(difficulty: Difficulty): MinesweeperState {
  const { rows, cols, mines } = DIFFICULTIES[difficulty];
  const board: CellState[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    }))
  );
  return {
    board,
    rows,
    cols,
    mines,
    gameState: "playing",
    flagCount: 0,
    revealedCount: 0,
    firstClick: true,
  };
}

function placeMines(state: MinesweeperState, safeRow: number, safeCol: number): void {
  const { board, rows, cols, mines } = state;
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (board[r][c].isMine) continue;
    if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
    board[r][c].isMine = true;
    placed++;
  }
  // Calculate adjacent counts
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) {
            count++;
          }
        }
      }
      board[r][c].adjacentMines = count;
    }
  }
}

function flood(board: CellState[][], rows: number, cols: number, r: number, c: number, state: MinesweeperState): void {
  if (r < 0 || r >= rows || c < 0 || c >= cols) return;
  const cell = board[r][c];
  if (cell.isRevealed || cell.isFlagged || cell.isMine) return;
  cell.isRevealed = true;
  state.revealedCount++;
  if (cell.adjacentMines === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        flood(board, rows, cols, r + dr, c + dc, state);
      }
    }
  }
}

function checkWin(state: MinesweeperState): boolean {
  const totalSafe = state.rows * state.cols - state.mines;
  return state.revealedCount === totalSafe;
}

export function reveal(state: MinesweeperState, row: number, col: number): MinesweeperState {
  const next = { ...state, board: state.board.map((r) => r.map((c) => ({ ...c }))) };
  const cell = next.board[row][col];

  if (cell.isRevealed || cell.isFlagged || next.gameState !== "playing") return state;

  if (next.firstClick) {
    next.firstClick = false;
    placeMines(next, row, col);
  }

  if (cell.isMine) {
    // Reveal all mines
    for (const r of next.board) {
      for (const c of r) {
        if (c.isMine) c.isRevealed = true;
      }
    }
    next.gameState = "lost";
    return next;
  }

  flood(next.board, next.rows, next.cols, row, col, next);

  if (checkWin(next)) {
    next.gameState = "won";
  }

  return next;
}

export function toggleFlag(state: MinesweeperState, row: number, col: number): MinesweeperState {
  if (state.gameState !== "playing") return state;
  const cell = state.board[row][col];
  if (cell.isRevealed) return state;

  const next = { ...state, board: state.board.map((r) => r.map((c) => ({ ...c }))) };
  const target = next.board[row][col];
  target.isFlagged = !target.isFlagged;
  next.flagCount += target.isFlagged ? 1 : -1;
  return next;
}
```

**Step 3: Create Cell component**

Create `src/games/minesweeper/Cell.tsx`:
```tsx
"use client";

import { CellState, GameState } from "./types";

interface CellProps {
  cell: CellState;
  gameState: GameState;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const numberColors: Record<number, string> = {
  1: "text-neon-blue",
  2: "text-neon-green",
  3: "text-neon-pink",
  4: "text-purple-400",
  5: "text-red-500",
  6: "text-cyan-400",
  7: "text-white",
  8: "text-gray-400",
};

export default function Cell({ cell, gameState, onClick, onContextMenu }: CellProps) {
  const size = "w-7 h-7 sm:w-8 sm:h-8";

  if (!cell.isRevealed) {
    return (
      <button
        className={`${size} border border-dark-border flex items-center justify-center text-[10px]
          ${cell.isFlagged ? "bg-dark-card" : "bg-dark-card hover:bg-dark-border"}
          transition-colors duration-100 cursor-pointer`}
        onClick={onClick}
        onContextMenu={onContextMenu}
      >
        {cell.isFlagged ? "🛡️" : ""}
      </button>
    );
  }

  if (cell.isMine) {
    return (
      <div
        className={`${size} border border-dark-border flex items-center justify-center text-[10px]
          ${gameState === "lost" ? "bg-red-900/40" : "bg-dark-bg"}`}
      >
        👹
      </div>
    );
  }

  return (
    <div
      className={`${size} border border-dark-border/50 flex items-center justify-center text-[10px] bg-dark-bg
        ${numberColors[cell.adjacentMines] || ""}`}
    >
      {cell.adjacentMines > 0 ? cell.adjacentMines : ""}
    </div>
  );
}
```

**Step 4: Create Board component**

Create `src/games/minesweeper/Board.tsx`:
```tsx
"use client";

import { MinesweeperState } from "./types";
import Cell from "./Cell";

interface BoardProps {
  state: MinesweeperState;
  onReveal: (row: number, col: number) => void;
  onFlag: (row: number, col: number) => void;
}

export default function Board({ state, onReveal, onFlag }: BoardProps) {
  return (
    <div className="inline-flex flex-col border-2 border-neon-green/30 p-1 bg-dark-bg">
      {state.board.map((row, r) => (
        <div key={r} className="flex">
          {row.map((cell, c) => (
            <Cell
              key={`${r}-${c}`}
              cell={cell}
              gameState={state.gameState}
              onClick={() => onReveal(r, c)}
              onContextMenu={(e) => {
                e.preventDefault();
                onFlag(r, c);
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
```

**Step 5: Create game page**

Create `src/app/games/minesweeper/page.tsx`:
```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import Board from "@/games/minesweeper/Board";
import { createBoard, reveal, toggleFlag } from "@/games/minesweeper/logic";
import { Difficulty, MinesweeperState } from "@/games/minesweeper/types";
import { getBestTime, setBestTime } from "@/lib/scores";

export default function MinesweeperPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [state, setState] = useState<MinesweeperState>(() => createBoard("easy"));
  const [timer, setTimer] = useState(0);
  const [bestTime, setBest] = useState<number | null>(null);

  useEffect(() => {
    setBest(getBestTime(`minesweeper-${difficulty}`));
  }, [difficulty]);

  useEffect(() => {
    if (state.gameState !== "playing" || state.firstClick) return;
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [state.gameState, state.firstClick]);

  const newGame = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    setState(createBoard(diff));
    setTimer(0);
  }, []);

  const handleReveal = useCallback((r: number, c: number) => {
    setState((prev) => {
      const next = reveal(prev, r, c);
      if (next.gameState === "won") {
        setBestTime(`minesweeper-${difficulty}`, timer);
        setBest(getBestTime(`minesweeper-${difficulty}`));
      }
      return next;
    });
  }, [difficulty, timer]);

  const handleFlag = useCallback((r: number, c: number) => {
    setState((prev) => toggleFlag(prev, r, c));
  }, []);

  const difficulties: Difficulty[] = ["easy", "medium", "hard"];

  return (
    <GameLayout
      title="DUNGEON SWEEP"
      color="green"
      timer={timer}
      onNewGame={() => newGame(difficulty)}
      controls={
        <div className="flex gap-2">
          {difficulties.map((d) => (
            <PixelButton
              key={d}
              color={d === difficulty ? "green" : "green"}
              onClick={() => newGame(d)}
              className={d === difficulty ? "opacity-100" : "opacity-40"}
            >
              {d.toUpperCase()}
            </PixelButton>
          ))}
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4">
        {/* Mine counter */}
        <div className="text-[10px] text-gray-400">
          MONSTERS: <span className="text-neon-green">{state.mines - state.flagCount}</span>
          {bestTime && (
            <span className="ml-4">
              BEST: <span className="text-neon-green">{Math.floor(bestTime / 60)}:{(bestTime % 60).toString().padStart(2, "0")}</span>
            </span>
          )}
        </div>

        {/* Board */}
        <div className="overflow-auto max-w-full">
          <Board state={state} onReveal={handleReveal} onFlag={handleFlag} />
        </div>

        {/* Game over message */}
        {state.gameState === "won" && (
          <div className="text-neon-green neon-text text-sm animate-pixel-fade">
            DUNGEON CLEARED!
          </div>
        )}
        {state.gameState === "lost" && (
          <div className="text-neon-pink neon-text text-sm animate-pixel-fade">
            THE MONSTERS GOT YOU!
          </div>
        )}

        {/* Mobile flag toggle hint */}
        <p className="text-[7px] text-gray-600">RIGHT-CLICK TO PLACE SHIELD</p>
      </div>
    </GameLayout>
  );
}
```

**Step 6: Verify game works**

Run: `npm run dev`, navigate to `/games/minesweeper`
Expected: Playable minesweeper with dungeon theme.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Minesweeper (Dungeon Explorer) game"
```

---

## Task 5: 2048 - "Pixel Monsters"

**Files:**
- Create: `src/games/2048/types.ts`
- Create: `src/games/2048/logic.ts`
- Create: `src/games/2048/Tile.tsx`
- Create: `src/games/2048/Grid.tsx`
- Create: `src/app/games/2048/page.tsx`

**Step 1: Define types**

Create `src/games/2048/types.ts`:
```ts
export type TileData = {
  value: number;
  id: number;
};

export type GridState = (TileData | null)[][];

export type GameState2048 = {
  grid: GridState;
  score: number;
  gameOver: boolean;
  won: boolean;
};

export const MONSTERS: Record<number, { name: string; emoji: string }> = {
  2: { name: "Slime", emoji: "🟢" },
  4: { name: "Bat", emoji: "🦇" },
  8: { name: "Skeleton", emoji: "💀" },
  16: { name: "Ghost", emoji: "👻" },
  32: { name: "Goblin", emoji: "👺" },
  64: { name: "Orc", emoji: "👹" },
  128: { name: "Demon", emoji: "😈" },
  256: { name: "Golem", emoji: "🗿" },
  512: { name: "Vampire", emoji: "🧛" },
  1024: { name: "Wizard", emoji: "🧙" },
  2048: { name: "Dragon", emoji: "🐉" },
  4096: { name: "Phoenix", emoji: "🔥" },
};
```

**Step 2: Implement game logic**

Create `src/games/2048/logic.ts`:
```ts
import { GridState, GameState2048, TileData } from "./types";

let nextId = 1;

function newTile(value: number): TileData {
  return { value, id: nextId++ };
}

export function createGame(): GameState2048 {
  const grid: GridState = Array.from({ length: 4 }, () => Array(4).fill(null));
  const state: GameState2048 = { grid, score: 0, gameOver: false, won: false };
  addRandom(state.grid);
  addRandom(state.grid);
  return state;
}

function addRandom(grid: GridState): boolean {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return false;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = newTile(Math.random() < 0.9 ? 2 : 4);
  return true;
}

function compress(line: (TileData | null)[]): { result: (TileData | null)[]; points: number; moved: boolean } {
  const filtered = line.filter((t): t is TileData => t !== null);
  let points = 0;
  const merged: TileData[] = [];
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i].value === filtered[i + 1].value) {
      const val = filtered[i].value * 2;
      merged.push(newTile(val));
      points += val;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i++;
    }
  }
  const result: (TileData | null)[] = [...merged, ...Array(4 - merged.length).fill(null)];
  const moved = line.some((t, idx) => {
    const r = result[idx];
    if (!t && !r) return false;
    if (!t || !r) return true;
    return t.id !== r.id;
  });
  return { result, points, moved };
}

function rotateGrid(grid: GridState, times: number): GridState {
  let g = grid;
  for (let t = 0; t < times; t++) {
    const newG: GridState = Array.from({ length: 4 }, () => Array(4).fill(null));
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        newG[c][3 - r] = g[r][c];
      }
    }
    g = newG;
  }
  return g;
}

export function move(state: GameState2048, direction: "up" | "down" | "left" | "right"): GameState2048 {
  if (state.gameOver) return state;

  const rotations: Record<string, number> = { left: 0, up: 1, right: 2, down: 3 };
  const rot = rotations[direction];
  const unrot = (4 - rot) % 4;

  let grid = rotateGrid(state.grid, rot);
  let totalPoints = 0;
  let anyMoved = false;

  const newGrid: GridState = [];
  for (let r = 0; r < 4; r++) {
    const { result, points, moved } = compress(grid[r]);
    newGrid.push(result);
    totalPoints += points;
    if (moved) anyMoved = true;
  }

  if (!anyMoved) return state;

  grid = rotateGrid(newGrid, unrot);
  addRandom(grid);

  const score = state.score + totalPoints;
  const won = state.won || grid.some((row) => row.some((t) => t && t.value >= 2048));
  const gameOver = !canMove(grid);

  return { grid, score, gameOver, won };
}

function canMove(grid: GridState): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) return true;
      if (c + 1 < 4 && grid[r][c + 1] && grid[r][c]!.value === grid[r][c + 1]!.value) return true;
      if (r + 1 < 4 && grid[r + 1][c] && grid[r][c]!.value === grid[r + 1][c]!.value) return true;
    }
  }
  return false;
}
```

**Step 3: Create Tile component**

Create `src/games/2048/Tile.tsx`:
```tsx
import { MONSTERS } from "./types";

interface TileProps {
  value: number;
}

const bgColors: Record<number, string> = {
  2: "bg-green-900/60 border-green-500/40",
  4: "bg-purple-900/60 border-purple-500/40",
  8: "bg-gray-800/80 border-gray-500/40",
  16: "bg-blue-900/60 border-blue-400/40",
  32: "bg-red-900/60 border-red-500/40",
  64: "bg-red-800/80 border-red-400/40",
  128: "bg-pink-900/60 border-pink-500/40",
  256: "bg-stone-800/80 border-stone-500/40",
  512: "bg-indigo-900/60 border-indigo-400/40",
  1024: "bg-cyan-900/60 border-cyan-400/40",
  2048: "bg-yellow-900/60 border-yellow-400/40",
};

export default function Tile({ value }: TileProps) {
  const monster = MONSTERS[value] || { name: "???", emoji: "❓" };
  const bg = bgColors[value] || "bg-dark-card border-dark-border";

  return (
    <div
      className={`w-16 h-16 sm:w-20 sm:h-20 ${bg} border-2 rounded-lg flex flex-col items-center justify-center gap-0.5 animate-pixel-fade`}
    >
      <span className="text-xl sm:text-2xl">{monster.emoji}</span>
      <span className="text-[7px] text-gray-300">{value}</span>
    </div>
  );
}
```

**Step 4: Create Grid component**

Create `src/games/2048/Grid.tsx`:
```tsx
"use client";

import { GridState } from "./types";
import Tile from "./Tile";

interface GridProps {
  grid: GridState;
}

export default function Grid({ grid }: GridProps) {
  return (
    <div className="inline-grid grid-cols-4 gap-2 p-3 bg-dark-bg border-2 border-neon-pink/30 rounded-lg">
      {grid.flat().map((tile, i) => (
        <div key={i} className="w-16 h-16 sm:w-20 sm:h-20">
          {tile ? (
            <Tile value={tile.value} />
          ) : (
            <div className="w-full h-full bg-dark-card/50 border border-dark-border/30 rounded-lg" />
          )}
        </div>
      ))}
    </div>
  );
}
```

**Step 5: Create game page**

Create `src/app/games/2048/page.tsx`:
```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import GameLayout from "@/components/GameLayout";
import Grid from "@/games/2048/Grid";
import { createGame, move } from "@/games/2048/logic";
import { GameState2048 } from "@/games/2048/types";
import { getHighScore, setHighScore } from "@/lib/scores";

export default function Game2048Page() {
  const [state, setState] = useState<GameState2048>(() => createGame());
  const [highScore, setHigh] = useState(0);

  useEffect(() => {
    setHigh(getHighScore("2048"));
  }, []);

  const handleMove = useCallback((direction: "up" | "down" | "left" | "right") => {
    setState((prev) => {
      const next = move(prev, direction);
      if (next.score > prev.score) {
        setHighScore("2048", next.score);
        setHigh(getHighScore("2048"));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const map: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        handleMove(dir);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleMove]);

  // Touch/swipe support
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    function handleTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }
    function handleTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) < 30) return;
      if (absDx > absDy) {
        handleMove(dx > 0 ? "right" : "left");
      } else {
        handleMove(dy > 0 ? "down" : "up");
      }
    }
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleMove]);

  return (
    <GameLayout
      title="MONSTER 2048"
      color="pink"
      score={state.score}
      highScore={highScore}
      onNewGame={() => setState(createGame())}
    >
      <div className="flex flex-col items-center gap-4">
        <Grid grid={state.grid} />

        {state.won && !state.gameOver && (
          <div className="text-neon-pink neon-text text-sm animate-pixel-fade">
            DRAGON EVOLVED! KEEP GOING?
          </div>
        )}
        {state.gameOver && (
          <div className="text-neon-pink neon-text text-sm animate-pixel-fade">
            NO MORE MOVES!
          </div>
        )}

        <p className="text-[7px] text-gray-600">ARROW KEYS / WASD / SWIPE</p>
      </div>
    </GameLayout>
  );
}
```

**Step 6: Verify and commit**

Run: `npm run dev`, navigate to `/games/2048`
Expected: Playable 2048 with monster evolution theme.

```bash
git add -A
git commit -m "feat: add 2048 (Pixel Monsters) game"
```

---

## Task 6: Sudoku - "Rune Puzzle"

**Files:**
- Create: `src/games/sudoku/types.ts`
- Create: `src/games/sudoku/logic.ts`
- Create: `src/games/sudoku/SudokuGrid.tsx`
- Create: `src/games/sudoku/SudokuCell.tsx`
- Create: `src/app/games/sudoku/page.tsx`

**Step 1: Define types**

Create `src/games/sudoku/types.ts`:
```ts
export type SudokuBoard = number[][];
export type SudokuNotes = Set<number>[][];
export type Difficulty = "easy" | "medium" | "hard";

export type SudokuState = {
  puzzle: SudokuBoard;    // original puzzle (0 = empty)
  board: SudokuBoard;     // current state
  solution: SudokuBoard;  // full solution
  notes: SudokuNotes;
  selected: [number, number] | null;
  errors: Set<string>;
  difficulty: Difficulty;
  hintsLeft: number;
  runeMode: boolean;
  completed: boolean;
};

export const RUNES = ["", "ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚾ"];

export const DIFFICULTY_REMOVES: Record<Difficulty, number> = {
  easy: 30,
  medium: 40,
  hard: 55,
};
```

**Step 2: Implement Sudoku generator and logic**

Create `src/games/sudoku/logic.ts`:
```ts
import { SudokuBoard, SudokuState, Difficulty, DIFFICULTY_REMOVES, SudokuNotes } from "./types";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValid(board: SudokuBoard, row: number, col: number, num: number): boolean {
  for (let c = 0; c < 9; c++) {
    if (board[row][c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

function solve(board: SudokuBoard): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const n of nums) {
          if (isValid(board, r, c, n)) {
            board[r][c] = n;
            if (solve(board)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generateSolution(): SudokuBoard {
  const board: SudokuBoard = Array.from({ length: 9 }, () => Array(9).fill(0));
  solve(board);
  return board;
}

function createPuzzle(solution: SudokuBoard, difficulty: Difficulty): SudokuBoard {
  const puzzle = solution.map((r) => [...r]);
  const removes = DIFFICULTY_REMOVES[difficulty];
  const positions = shuffleArray(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number])
  );
  let removed = 0;
  for (const [r, c] of positions) {
    if (removed >= removes) break;
    puzzle[r][c] = 0;
    removed++;
  }
  return puzzle;
}

export function createSudoku(difficulty: Difficulty): SudokuState {
  const solution = generateSolution();
  const puzzle = createPuzzle(solution, difficulty);
  const board = puzzle.map((r) => [...r]);
  const notes: SudokuNotes = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set<number>())
  );
  return {
    puzzle,
    board,
    solution,
    notes,
    selected: null,
    errors: new Set(),
    difficulty,
    hintsLeft: 3,
    runeMode: false,
    completed: false,
  };
}

export function placeNumber(state: SudokuState, num: number): SudokuState {
  if (!state.selected || state.completed) return state;
  const [r, c] = state.selected;
  if (state.puzzle[r][c] !== 0) return state;

  const next = {
    ...state,
    board: state.board.map((row) => [...row]),
    errors: new Set(state.errors),
    notes: state.notes.map((row) => row.map((s) => new Set(s))),
  };

  next.board[r][c] = num;
  next.notes[r][c].clear();

  // Check errors
  const key = `${r}-${c}`;
  if (num !== 0 && num !== state.solution[r][c]) {
    next.errors.add(key);
  } else {
    next.errors.delete(key);
  }

  // Check completion
  const allFilled = next.board.every((row) => row.every((v) => v !== 0));
  const allCorrect = next.errors.size === 0;
  if (allFilled && allCorrect) {
    next.completed = true;
  }

  return next;
}

export function toggleNote(state: SudokuState, num: number): SudokuState {
  if (!state.selected || state.completed) return state;
  const [r, c] = state.selected;
  if (state.puzzle[r][c] !== 0) return state;

  const next = {
    ...state,
    notes: state.notes.map((row) => row.map((s) => new Set(s))),
    board: state.board.map((row) => [...row]),
  };

  next.board[r][c] = 0;
  if (next.notes[r][c].has(num)) {
    next.notes[r][c].delete(num);
  } else {
    next.notes[r][c].add(num);
  }
  return next;
}

export function useHint(state: SudokuState): SudokuState {
  if (!state.selected || state.hintsLeft <= 0 || state.completed) return state;
  const [r, c] = state.selected;
  if (state.puzzle[r][c] !== 0) return state;

  const next = {
    ...state,
    board: state.board.map((row) => [...row]),
    errors: new Set(state.errors),
    hintsLeft: state.hintsLeft - 1,
  };
  next.board[r][c] = state.solution[r][c];
  next.errors.delete(`${r}-${c}`);

  const allFilled = next.board.every((row) => row.every((v) => v !== 0));
  if (allFilled && next.errors.size === 0) next.completed = true;

  return next;
}
```

**Step 3: Create SudokuCell**

Create `src/games/sudoku/SudokuCell.tsx`:
```tsx
"use client";

import { RUNES } from "./types";

interface CellProps {
  value: number;
  isOriginal: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  isError: boolean;
  notes: Set<number>;
  runeMode: boolean;
  onClick: () => void;
}

function display(val: number, runeMode: boolean): string {
  if (val === 0) return "";
  return runeMode ? RUNES[val] : val.toString();
}

export default function SudokuCell({
  value,
  isOriginal,
  isSelected,
  isHighlighted,
  isError,
  notes,
  runeMode,
  onClick,
}: CellProps) {
  const base = "w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center cursor-pointer transition-all duration-100";
  const bg = isSelected
    ? "bg-neon-blue/20"
    : isHighlighted
    ? "bg-dark-card"
    : "bg-dark-bg";
  const textColor = isError
    ? "text-red-500"
    : isOriginal
    ? "text-neon-blue"
    : "text-white";
  const border = isSelected ? "ring-1 ring-neon-blue" : "";

  if (value === 0 && notes.size > 0) {
    return (
      <button className={`${base} ${bg} ${border}`} onClick={onClick}>
        <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <span key={n} className="text-[5px] text-gray-500 flex items-center justify-center">
              {notes.has(n) ? display(n, runeMode) : ""}
            </span>
          ))}
        </div>
      </button>
    );
  }

  return (
    <button
      className={`${base} ${bg} ${border} ${textColor} text-xs sm:text-sm ${isOriginal ? "font-bold" : ""}`}
      onClick={onClick}
    >
      {display(value, runeMode)}
    </button>
  );
}
```

**Step 4: Create SudokuGrid**

Create `src/games/sudoku/SudokuGrid.tsx`:
```tsx
"use client";

import { SudokuState } from "./types";
import SudokuCell from "./SudokuCell";

interface GridProps {
  state: SudokuState;
  onSelect: (r: number, c: number) => void;
}

export default function SudokuGrid({ state, onSelect }: GridProps) {
  const { board, puzzle, selected, errors, notes, runeMode } = state;

  return (
    <div className="inline-grid grid-cols-9 border-2 border-neon-blue/40">
      {board.map((row, r) =>
        row.map((val, c) => {
          const isSelected = selected?.[0] === r && selected?.[1] === c;
          const isHighlighted = selected
            ? selected[0] === r || selected[1] === c ||
              (Math.floor(selected[0] / 3) === Math.floor(r / 3) &&
               Math.floor(selected[1] / 3) === Math.floor(c / 3))
            : false;

          return (
            <div
              key={`${r}-${c}`}
              className={`
                ${c % 3 === 2 && c < 8 ? "border-r-2 border-r-neon-blue/30" : "border-r border-r-dark-border/50"}
                ${r % 3 === 2 && r < 8 ? "border-b-2 border-b-neon-blue/30" : "border-b border-b-dark-border/50"}
              `}
            >
              <SudokuCell
                value={val}
                isOriginal={puzzle[r][c] !== 0}
                isSelected={isSelected}
                isHighlighted={isHighlighted && !isSelected}
                isError={errors.has(`${r}-${c}`)}
                notes={notes[r][c]}
                runeMode={runeMode}
                onClick={() => onSelect(r, c)}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
```

**Step 5: Create game page**

Create `src/app/games/sudoku/page.tsx`:
```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import SudokuGrid from "@/games/sudoku/SudokuGrid";
import { createSudoku, placeNumber, toggleNote, useHint } from "@/games/sudoku/logic";
import { SudokuState, Difficulty, RUNES } from "@/games/sudoku/types";
import { getBestTime, setBestTime } from "@/lib/scores";

export default function SudokuPage() {
  const [state, setState] = useState<SudokuState>(() => createSudoku("easy"));
  const [noteMode, setNoteMode] = useState(false);
  const [timer, setTimer] = useState(0);
  const [bestTime, setBest] = useState<number | null>(null);

  useEffect(() => {
    setBest(getBestTime(`sudoku-${state.difficulty}`));
  }, [state.difficulty]);

  useEffect(() => {
    if (state.completed) return;
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [state.completed]);

  const newGame = useCallback((diff: Difficulty) => {
    setState(createSudoku(diff));
    setTimer(0);
    setNoteMode(false);
  }, []);

  const handleSelect = useCallback((r: number, c: number) => {
    setState((prev) => ({ ...prev, selected: [r, c] }));
  }, []);

  const handleNumber = useCallback((num: number) => {
    setState((prev) => {
      const next = noteMode ? toggleNote(prev, num) : placeNumber(prev, num);
      if (next.completed) {
        setBestTime(`sudoku-${next.difficulty}`, timer);
        setBest(getBestTime(`sudoku-${next.difficulty}`));
      }
      return next;
    });
  }, [noteMode, timer]);

  const handleHint = useCallback(() => {
    setState((prev) => useHint(prev));
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        handleNumber(num);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        handleNumber(0);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleNumber]);

  const difficulties: Difficulty[] = ["easy", "medium", "hard"];

  return (
    <GameLayout
      title="RUNE SUDOKU"
      color="blue"
      timer={timer}
      onNewGame={() => newGame(state.difficulty)}
      controls={
        <div className="flex gap-2 flex-wrap justify-center">
          {difficulties.map((d) => (
            <PixelButton
              key={d}
              color="blue"
              onClick={() => newGame(d)}
              className={d === state.difficulty ? "opacity-100" : "opacity-40"}
            >
              {d.toUpperCase()}
            </PixelButton>
          ))}
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4">
        {/* Toggle & Hint */}
        <div className="flex gap-3 text-[9px]">
          <PixelButton
            color="blue"
            onClick={() => setState((p) => ({ ...p, runeMode: !p.runeMode }))}
          >
            {state.runeMode ? "NUMBERS" : "RUNES"}
          </PixelButton>
          <PixelButton
            color="blue"
            onClick={() => setNoteMode(!noteMode)}
            className={noteMode ? "opacity-100" : "opacity-50"}
          >
            NOTES {noteMode ? "ON" : "OFF"}
          </PixelButton>
          <PixelButton color="blue" onClick={handleHint} disabled={state.hintsLeft <= 0}>
            HINT ({state.hintsLeft})
          </PixelButton>
        </div>

        {/* Grid */}
        <SudokuGrid state={state} onSelect={handleSelect} />

        {/* Number pad */}
        <div className="flex gap-1 flex-wrap justify-center">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => handleNumber(n)}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-dark-card border border-neon-blue/30 text-neon-blue
                text-xs hover:bg-neon-blue/20 transition-colors cursor-pointer"
            >
              {state.runeMode ? RUNES[n] : n}
            </button>
          ))}
          <button
            onClick={() => handleNumber(0)}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-dark-card border border-red-500/30 text-red-400
              text-[8px] hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            DEL
          </button>
        </div>

        {state.completed && (
          <div className="text-neon-blue neon-text text-sm animate-pixel-fade">
            RUNES DECODED!
          </div>
        )}

        {bestTime && (
          <p className="text-[8px] text-gray-500">
            BEST: {Math.floor(bestTime / 60)}:{(bestTime % 60).toString().padStart(2, "0")}
          </p>
        )}
      </div>
    </GameLayout>
  );
}
```

**Step 6: Verify and commit**

```bash
git add -A
git commit -m "feat: add Sudoku (Rune Puzzle) game"
```

---

## Task 7: Memory Match - "Pixel Bestiary"

**Files:**
- Create: `src/games/memory-match/types.ts`
- Create: `src/games/memory-match/logic.ts`
- Create: `src/games/memory-match/Card.tsx`
- Create: `src/games/memory-match/MatchGrid.tsx`
- Create: `src/app/games/memory-match/page.tsx`

**Step 1: Define types**

Create `src/games/memory-match/types.ts`:
```ts
export type CardData = {
  id: number;
  emoji: string;
  name: string;
  isFlipped: boolean;
  isMatched: boolean;
};

export type GridSize = "easy" | "hard";

export type MemoryState = {
  cards: CardData[];
  cols: number;
  flipped: number[];
  score: number;
  combo: number;
  moves: number;
  matched: number;
  total: number;
  completed: boolean;
  processing: boolean;
};

export const CREATURES = [
  { emoji: "🐲", name: "Dragon" },
  { emoji: "🦇", name: "Bat" },
  { emoji: "💀", name: "Skeleton" },
  { emoji: "👻", name: "Ghost" },
  { emoji: "👹", name: "Demon" },
  { emoji: "🧙", name: "Wizard" },
  { emoji: "🐺", name: "Wolf" },
  { emoji: "🦂", name: "Scorpion" },
  { emoji: "🐍", name: "Serpent" },
  { emoji: "🦉", name: "Owl" },
  { emoji: "🕷️", name: "Spider" },
  { emoji: "🧛", name: "Vampire" },
  { emoji: "🗿", name: "Golem" },
  { emoji: "👺", name: "Goblin" },
  { emoji: "🐙", name: "Kraken" },
  { emoji: "🔥", name: "Phoenix" },
  { emoji: "❄️", name: "Frost" },
  { emoji: "⚡", name: "Thunder" },
];
```

**Step 2: Implement logic**

Create `src/games/memory-match/logic.ts`:
```ts
import { CardData, MemoryState, GridSize, CREATURES } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createMemory(size: GridSize): MemoryState {
  const pairs = size === "easy" ? 8 : 18;
  const cols = size === "easy" ? 4 : 6;
  const selected = shuffle(CREATURES).slice(0, pairs);
  const cards: CardData[] = shuffle(
    selected.flatMap((c, i) => [
      { id: i * 2, emoji: c.emoji, name: c.name, isFlipped: false, isMatched: false },
      { id: i * 2 + 1, emoji: c.emoji, name: c.name, isFlipped: false, isMatched: false },
    ])
  );
  return {
    cards,
    cols,
    flipped: [],
    score: 0,
    combo: 0,
    moves: 0,
    matched: 0,
    total: pairs,
    completed: false,
    processing: false,
  };
}

export function flipCard(state: MemoryState, index: number): MemoryState {
  if (state.processing || state.completed) return state;
  const card = state.cards[index];
  if (card.isFlipped || card.isMatched) return state;
  if (state.flipped.length >= 2) return state;

  const next = {
    ...state,
    cards: state.cards.map((c) => ({ ...c })),
    flipped: [...state.flipped, index],
  };
  next.cards[index].isFlipped = true;

  if (next.flipped.length === 2) {
    next.processing = true;
    next.moves++;
  }

  return next;
}

export function checkMatch(state: MemoryState): MemoryState {
  if (state.flipped.length !== 2) return state;

  const [a, b] = state.flipped;
  const cardA = state.cards[a];
  const cardB = state.cards[b];
  const isMatch = cardA.emoji === cardB.emoji;

  const next = {
    ...state,
    cards: state.cards.map((c) => ({ ...c })),
    flipped: [],
    processing: false,
  };

  if (isMatch) {
    next.cards[a].isMatched = true;
    next.cards[b].isMatched = true;
    next.matched++;
    next.combo++;
    next.score += 100 * next.combo; // Combo multiplier
    if (next.matched === next.total) {
      next.completed = true;
    }
  } else {
    next.cards[a].isFlipped = false;
    next.cards[b].isFlipped = false;
    next.combo = 0;
  }

  return next;
}
```

**Step 3: Create Card component**

Create `src/games/memory-match/Card.tsx`:
```tsx
"use client";

import { CardData } from "./types";

interface CardProps {
  card: CardData;
  onClick: () => void;
}

export default function MemoryCard({ card, onClick }: CardProps) {
  const isVisible = card.isFlipped || card.isMatched;

  return (
    <button
      onClick={onClick}
      disabled={card.isMatched}
      className={`w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-lg border-2 transition-all duration-200
        flex items-center justify-center text-2xl cursor-pointer
        ${card.isMatched
          ? "bg-neon-yellow/10 border-neon-yellow/30 opacity-60"
          : isVisible
          ? "bg-dark-card border-neon-yellow/50 animate-pixel-fade"
          : "bg-dark-card border-dark-border hover:border-neon-yellow/30 hover:scale-105"
        }`}
    >
      {isVisible ? card.emoji : <span className="text-[10px] text-gray-600">?</span>}
    </button>
  );
}
```

**Step 4: Create MatchGrid**

Create `src/games/memory-match/MatchGrid.tsx`:
```tsx
"use client";

import { MemoryState } from "./types";
import MemoryCard from "./Card";

interface GridProps {
  state: MemoryState;
  onFlip: (index: number) => void;
}

export default function MatchGrid({ state, onFlip }: GridProps) {
  return (
    <div
      className="inline-grid gap-2 p-3"
      style={{ gridTemplateColumns: `repeat(${state.cols}, minmax(0, 1fr))` }}
    >
      {state.cards.map((card, i) => (
        <MemoryCard key={card.id} card={card} onClick={() => onFlip(i)} />
      ))}
    </div>
  );
}
```

**Step 5: Create game page**

Create `src/app/games/memory-match/page.tsx`:
```tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import MatchGrid from "@/games/memory-match/MatchGrid";
import { createMemory, flipCard, checkMatch } from "@/games/memory-match/logic";
import { MemoryState, GridSize } from "@/games/memory-match/types";
import { getHighScore, setHighScore } from "@/lib/scores";

export default function MemoryMatchPage() {
  const [size, setSize] = useState<GridSize>("easy");
  const [state, setState] = useState<MemoryState>(() => createMemory("easy"));
  const [timer, setTimer] = useState(0);
  const [highScore, setHigh] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setHigh(getHighScore(`memory-${size}`));
  }, [size]);

  useEffect(() => {
    if (state.completed || state.moves === 0) return;
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [state.completed, state.moves]);

  // Auto check match after delay
  useEffect(() => {
    if (state.flipped.length === 2) {
      timerRef.current = setTimeout(() => {
        setState((prev) => {
          const next = checkMatch(prev);
          if (next.completed) {
            setHighScore(`memory-${size}`, next.score);
            setHigh(getHighScore(`memory-${size}`));
          }
          return next;
        });
      }, 600);
      return () => clearTimeout(timerRef.current);
    }
  }, [state.flipped, size]);

  const handleFlip = useCallback((index: number) => {
    setState((prev) => flipCard(prev, index));
  }, []);

  const newGame = useCallback((s: GridSize) => {
    setSize(s);
    setState(createMemory(s));
    setTimer(0);
  }, []);

  return (
    <GameLayout
      title="PIXEL BESTIARY"
      color="yellow"
      score={state.score}
      highScore={highScore}
      timer={timer}
      onNewGame={() => newGame(size)}
      controls={
        <div className="flex gap-2">
          <PixelButton
            color="yellow"
            onClick={() => newGame("easy")}
            className={size === "easy" ? "opacity-100" : "opacity-40"}
          >
            4x4
          </PixelButton>
          <PixelButton
            color="yellow"
            onClick={() => newGame("hard")}
            className={size === "hard" ? "opacity-100" : "opacity-40"}
          >
            6x6
          </PixelButton>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4">
        {/* Stats */}
        <div className="flex gap-6 text-[9px] text-gray-400">
          <span>MOVES: <span className="text-neon-yellow">{state.moves}</span></span>
          <span>PAIRS: <span className="text-neon-yellow">{state.matched}/{state.total}</span></span>
          {state.combo > 1 && (
            <span className="text-neon-yellow neon-text animate-pixel-fade">
              COMBO x{state.combo}!
            </span>
          )}
        </div>

        {/* Grid */}
        <MatchGrid state={state} onFlip={handleFlip} />

        {state.completed && (
          <div className="text-neon-yellow neon-text text-sm animate-pixel-fade">
            BESTIARY COMPLETE!
          </div>
        )}

        <p className="text-[7px] text-gray-600">MATCH ALL CREATURE PAIRS</p>
      </div>
    </GameLayout>
  );
}
```

**Step 6: Verify and commit**

```bash
git add -A
git commit -m "feat: add Memory Match (Pixel Bestiary) game"
```

---

## Task 8: Build Verification & Final Polish

**Step 1: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 2: Fix any build errors**

Address TypeScript/lint errors if any.

**Step 3: Test all routes**

- `/` - Homepage renders 4 cards
- `/games/minesweeper` - Playable
- `/games/2048` - Playable
- `/games/sudoku` - Playable
- `/games/memory-match` - Playable

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve build issues and final polish"
```
