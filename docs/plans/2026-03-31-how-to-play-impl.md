# How-to-Play Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a retro-styled how-to-play modal to every game, showing objective, controls, scoring, and special mechanics. Auto-opens on first visit; reopenable via a persistent `?` button.

**Architecture:** `GameHelp` type defined in `src/lib/gameHelp.ts`. `HelpModal` component handles rendering. `GameLayout` gains optional `helpContent` + `gameKey` props — it owns the open/close state, renders the `?` button in the top bar, and auto-opens on first visit. Space and Runner use custom layouts so HelpModal is injected directly into those pages.

**Tech Stack:** React, TypeScript, Tailwind CSS v4 (CSS-based config in globals.css), Next.js App Router, Press Start 2P font via CSS variable `--font-press-start`

---

## Task 1: Create `src/lib/gameHelp.ts` — type definitions

**Files:**
- Create: `src/lib/gameHelp.ts`

**Step 1: Create the file**

```ts
export interface HelpControl {
  key: string;
  action: string;
}

export interface HelpSpecial {
  name: string;
  icon: string;
  desc: string;
}

export interface GameHelp {
  objective: string;
  controls: HelpControl[];
  scoring?: HelpSpecial[];
  specials?: HelpSpecial[];
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add src/lib/gameHelp.ts
git commit -m "feat(help): add GameHelp type definitions"
```

---

## Task 2: Create `src/components/HelpModal.tsx`

**Files:**
- Create: `src/components/HelpModal.tsx`

**Step 1: Create the component**

```tsx
"use client";

import React from "react";
import type { GameHelp } from "@/lib/gameHelp";

type GameColor = "green" | "pink" | "yellow" | "blue" | "orange";

interface HelpModalProps {
  help: GameHelp;
  color: GameColor;
  onClose: () => void;
}

const neonText: Record<GameColor, string> = {
  green: "neon-text-green",
  pink: "neon-text-pink",
  yellow: "neon-text-yellow",
  blue: "neon-text-blue",
  orange: "neon-text-orange",
};

const borderColor: Record<GameColor, string> = {
  green: "border-neon-green/40",
  pink: "border-neon-pink/40",
  yellow: "border-neon-yellow/40",
  blue: "border-neon-blue/40",
  orange: "border-neon-orange/40",
};

const sectionBorder: Record<GameColor, string> = {
  green: "border-neon-green/20",
  pink: "border-neon-pink/20",
  yellow: "border-neon-yellow/20",
  blue: "border-neon-blue/20",
  orange: "border-neon-orange/20",
};

const keyBorder: Record<GameColor, string> = {
  green: "border-neon-green/60 text-neon-green",
  pink: "border-neon-pink/60 text-neon-pink",
  yellow: "border-neon-yellow/60 text-neon-yellow",
  blue: "border-neon-blue/60 text-neon-blue",
  orange: "border-neon-orange/60 text-neon-orange",
};

export default function HelpModal({ help, color, onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-[overlayIn_0.3s_ease-out]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-dark-bg/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div
        className={`relative w-[92vw] max-w-md max-h-[82vh] overflow-y-auto border ${borderColor[color]} p-4 flex flex-col gap-4`}
        style={{ backgroundColor: "#0d0d1a" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className={`text-[0.55rem] ${neonText[color]} tracking-widest`}>
            HOW TO PLAY
          </h2>
          <button
            onClick={onClose}
            className={`text-[0.55rem] ${neonText[color]} hover:opacity-70 transition-opacity px-1`}
          >
            X
          </button>
        </div>

        {/* Objective */}
        <div className="flex flex-col gap-2">
          <p className={`text-[0.45rem] text-gray-500 uppercase tracking-widest border-b ${sectionBorder[color]} pb-1`}>
            Objective
          </p>
          <p className="text-[0.5rem] text-gray-300 leading-relaxed">
            {help.objective}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2">
          <p className={`text-[0.45rem] text-gray-500 uppercase tracking-widest border-b ${sectionBorder[color]} pb-1`}>
            Controls
          </p>
          <div className="flex flex-col gap-1.5">
            {help.controls.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`inline-block px-1.5 py-0.5 border ${keyBorder[color]} text-[0.45rem] shrink-0`}>
                  {c.key}
                </span>
                <span className="text-[0.45rem] text-gray-400">{c.action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring */}
        {help.scoring && help.scoring.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className={`text-[0.45rem] text-gray-500 uppercase tracking-widest border-b ${sectionBorder[color]} pb-1`}>
              Scoring
            </p>
            <div className="flex flex-col gap-2">
              {help.scoring.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-base leading-none shrink-0">{s.icon}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[0.45rem] ${neonText[color]}`}>{s.name}</span>
                    <span className="text-[0.45rem] text-gray-400 leading-relaxed">{s.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Special Mechanics */}
        {help.specials && help.specials.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className={`text-[0.45rem] text-gray-500 uppercase tracking-widest border-b ${sectionBorder[color]} pb-1`}>
              Special Mechanics
            </p>
            <div className="flex flex-col gap-2">
              {help.specials.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-base leading-none shrink-0">{s.icon}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[0.45rem] ${neonText[color]}`}>{s.name}</span>
                    <span className="text-[0.45rem] text-gray-400 leading-relaxed">{s.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add src/components/HelpModal.tsx
git commit -m "feat(help): add HelpModal component"
```

---

## Task 3: Update `GameLayout` — add `?` button, helpOpen state, auto-open

**Files:**
- Modify: `src/components/GameLayout.tsx`

**Step 1: Read current file first, then apply changes**

Read `src/components/GameLayout.tsx` to get exact current content before editing.

The full updated file:

```tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PixelButton from "./PixelButton";
import HelpModal from "./HelpModal";
import type { GameHelp } from "@/lib/gameHelp";

type GameColor = "green" | "pink" | "yellow" | "blue" | "orange";

interface GameLayoutProps {
  title: string;
  color: GameColor;
  score?: number;
  highScore?: number;
  timer?: number;
  onNewGame?: () => void;
  children: React.ReactNode;
  controls?: React.ReactNode;
  actions?: React.ReactNode;
  helpContent?: GameHelp;
  gameKey?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  actions,
  helpContent,
  gameKey,
}: GameLayoutProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!helpContent || !gameKey) return;
    if (typeof window === "undefined") return;
    const key = `gamestation-${gameKey}-help-seen`;
    if (!localStorage.getItem(key)) {
      setHelpOpen(true);
      localStorage.setItem(key, "1");
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen p-4 gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-1 sm:gap-2">
        <Link
          href="/games"
          className={`text-[0.5rem] sm:text-[0.6rem] neon-text-${color} hover:opacity-80 transition-opacity`}
        >
          &larr; BACK
        </Link>
        <h1 className={`text-[0.6rem] sm:text-xs md:text-sm neon-text neon-text-${color} text-center`}>
          {title}
        </h1>
        <div className="flex items-center gap-2">
          {timer !== undefined && (
            <span className="text-[0.5rem] sm:text-[0.6rem] text-gray-400">{formatTime(timer)}</span>
          )}
          {helpContent && (
            <button
              onClick={() => setHelpOpen(true)}
              className={`text-[0.5rem] sm:text-[0.6rem] neon-text-${color} hover:opacity-80 transition-opacity border border-current px-1.5 py-0.5`}
              aria-label="How to play"
            >
              ?
            </button>
          )}
          {!helpContent && timer === undefined && <span />}
        </div>
      </div>

      {/* Score bar */}
      {(score !== undefined || highScore !== undefined || actions) && (
        <div className="flex justify-center items-center gap-8 text-[0.55rem] text-gray-400">
          {score !== undefined && <span>SCORE: {score}</span>}
          {highScore !== undefined && <span>BEST: {highScore}</span>}
          {actions}
        </div>
      )}

      {/* Game area */}
      <div className="flex-1 flex items-center justify-center">{children}</div>

      {/* Bottom bar */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 flex-wrap">
        {onNewGame && (
          <PixelButton color={color} onClick={onNewGame}>
            NEW GAME
          </PixelButton>
        )}
        {controls}
      </div>

      {/* Help Modal */}
      {helpOpen && helpContent && (
        <HelpModal
          help={helpContent}
          color={color}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add src/components/GameLayout.tsx
git commit -m "feat(help): add ? button and auto-open to GameLayout"
```

---

## Task 4: Add help content to Minesweeper, 2048, Sudoku, Memory Match

**Files:**
- Modify: `src/app/games/minesweeper/page.tsx`
- Modify: `src/app/games/2048/page.tsx`
- Modify: `src/app/games/sudoku/page.tsx`
- Modify: `src/app/games/memory-match/page.tsx`

For each file: add `import type { GameHelp } from "@/lib/gameHelp"` at the top, define a `const HELP: GameHelp = { ... }` constant before the component, then pass `helpContent={HELP}` and `gameKey="minesweeper"` (etc.) to `<GameLayout>`.

**Minesweeper help constant:**
```ts
const HELP: GameHelp = {
  objective: "Reveal all safe cells without triggering a mine. Numbers show how many mines are in adjacent cells — use them to deduce where mines are hiding.",
  controls: [
    { key: "Click", action: "Reveal cell" },
    { key: "Right Click", action: "Place / remove flag" },
    { key: "Middle Click", action: "Chord (auto-reveal neighbors)" },
    { key: "Long Press", action: "Flag on mobile" },
    { key: "Double Tap", action: "Chord on mobile" },
  ],
  specials: [
    { icon: "🔢", name: "CHORD CLICK", desc: "Click a revealed number when you have placed exactly that many flags around it to instantly reveal all remaining neighbors." },
    { icon: "🚩", name: "FLAG MODE", desc: "Toggle flag mode on mobile to switch tap behavior between revealing and flagging." },
    { icon: "⚡", name: "DIFFICULTY", desc: "Easy (9x9), Medium (16x16), Hard (30x16) — grid size and mine count increase with difficulty." },
  ],
};
```

**2048 help constant:**
```ts
const HELP: GameHelp = {
  objective: "Slide tiles to merge matching numbers and reach 2048. The board fills up as you merge — plan your moves carefully or you will run out of space!",
  controls: [
    { key: "Arrow Keys", action: "Slide all tiles in that direction" },
    { key: "Swipe", action: "Slide on mobile" },
  ],
  scoring: [
    { icon: "🔢", name: "MERGE SCORE", desc: "Each merge adds the resulting tile value to your score. Merging two 512 tiles scores 1024." },
  ],
  specials: [
    { icon: "🧬", name: "EVOLUTION", desc: "Tiles transform into pixel monsters at milestone values: 128, 256, 512, 1024, 2048, and beyond." },
  ],
};
```

**Sudoku help constant:**
```ts
const HELP: GameHelp = {
  objective: "Fill every row, column, and 3x3 box with each rune (1-9) exactly once. No rune may repeat in the same row, column, or box.",
  controls: [
    { key: "Click cell", action: "Select a cell" },
    { key: "1 - 9", action: "Place rune in selected cell" },
    { key: "Click rune", action: "Place rune (touch)" },
    { key: "Backspace / Delete", action: "Clear selected cell" },
  ],
  specials: [
    { icon: "💡", name: "HINTS", desc: "Use limited hints to reveal the correct rune for a cell. Spend wisely!" },
    { icon: "✅", name: "AUTO-CHECK", desc: "Wrong placements are highlighted in red in real time so you can correct them immediately." },
  ],
};
```

**Memory Match help constant:**
```ts
const HELP: GameHelp = {
  objective: "Flip cards to find matching pixel creature pairs. Match all pairs before the timer runs out. The faster you match, the higher your score!",
  controls: [
    { key: "Click / Tap", action: "Flip a card" },
  ],
  scoring: [
    { icon: "🔥", name: "COMBO MULTIPLIER", desc: "Consecutive successful matches increase your score multiplier. Break the chain with a miss and it resets." },
    { icon: "⏱", name: "TIME BONUS", desc: "Matching pairs quickly earns bonus points on top of the base pair score." },
  ],
};
```

**Step 1: Edit minesweeper/page.tsx** — add import and HELP constant, pass to GameLayout

**Step 2: Edit 2048/page.tsx** — same pattern

**Step 3: Edit sudoku/page.tsx** — same pattern

**Step 4: Edit memory-match/page.tsx** — same pattern

**Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/app/games/minesweeper/page.tsx src/app/games/2048/page.tsx src/app/games/sudoku/page.tsx src/app/games/memory-match/page.tsx
git commit -m "feat(help): add how-to-play content to puzzle games"
```

---

## Task 5: Add help content to Tetris, Snake, Flappy, Runner

**Files:**
- Modify: `src/app/games/tetris/page.tsx`
- Modify: `src/app/games/snake/page.tsx`
- Modify: `src/app/games/flappy/page.tsx`
- Modify: `src/app/games/runner/page.tsx`

**Tetris help constant:**
```ts
const HELP: GameHelp = {
  objective: "Clear horizontal lines by filling them completely with falling pieces. The game ends when pieces stack to the top of the board.",
  controls: [
    { key: "Left / Right", action: "Move piece sideways" },
    { key: "Up / Z", action: "Rotate piece" },
    { key: "Down", action: "Soft drop (faster fall)" },
    { key: "Space", action: "Hard drop (instant place)" },
  ],
  scoring: [
    { icon: "💥", name: "TETRIS", desc: "Clear 4 lines at once for a massive score bonus — the most efficient way to score." },
    { icon: "🔗", name: "COMBOS", desc: "Clearing lines on consecutive drops multiplies your score." },
  ],
  specials: [
    { icon: "👻", name: "GHOST PIECE", desc: "A faint outline shows exactly where the piece will land, helping you plan placements." },
    { icon: "⏩", name: "SPEED UP", desc: "Every 10 lines cleared increases the drop speed — how long can you last?" },
  ],
};
```

**Snake help constant:**
```ts
const HELP: GameHelp = {
  objective: "Eat food to grow your snake and score points. Avoid hitting walls or your own tail — one wrong move ends the game!",
  controls: [
    { key: "Arrow Keys", action: "Change direction" },
    { key: "W A S D", action: "Change direction (alternate)" },
    { key: "Swipe", action: "Change direction on mobile" },
  ],
  scoring: [
    { icon: "🍎", name: "FOOD SCORE", desc: "Each food item scores points based on your current speed tier — faster snake means bigger rewards." },
  ],
  specials: [
    { icon: "⚡", name: "SPEED RAMP", desc: "The snake accelerates as it grows longer, making tight spaces increasingly dangerous." },
  ],
};
```

**Flappy help constant:**
```ts
const HELP: GameHelp = {
  objective: "Tap to flap and fly through gaps between pipes. Each pipe you pass scores 1 point. One touch of a pipe or the ground ends the run!",
  controls: [
    { key: "Space", action: "Flap" },
    { key: "Click / Tap", action: "Flap (mouse or touch)" },
  ],
  specials: [
    { icon: "📏", name: "SHRINKING GAPS", desc: "Pipe gaps get narrower the longer you survive, making each pipe harder to thread than the last." },
    { icon: "🏅", name: "HIGH SCORE", desc: "Your personal best is automatically saved and shown above the game." },
  ],
};
```

**Runner help constant:**
```ts
const HELP: GameHelp = {
  objective: "Run as far as possible by jumping over obstacles. Your score increases with distance. Survive long enough and new worlds unlock!",
  controls: [
    { key: "Space", action: "Jump (hold for higher jump)" },
    { key: "Click / Tap", action: "Jump on mobile" },
    { key: "Double tap", action: "Double jump mid-air" },
  ],
  specials: [
    { icon: "🌍", name: "WORLDS", desc: "Different themed environments unlock as you reach score milestones — each with unique obstacles and visuals." },
    { icon: "✈️", name: "FLYING OBSTACLES", desc: "Some obstacles fly at mid-height — duck under them or time your jump to avoid them." },
    { icon: "⚡", name: "SPEED RAMP", desc: "The game gradually accelerates, demanding faster reactions the further you go." },
  ],
};
```

**Note for Runner:** Runner uses a custom layout (no GameLayout). Find the JSX return and inject HelpModal directly. Add `const [helpOpen, setHelpOpen] = useState(false)` to the component state and a `?` button in the top bar. Add import for HelpModal and GameHelp.

**Step 1: Edit tetris/page.tsx** — add import, HELP constant, pass to GameLayout

**Step 2: Edit snake/page.tsx** — same

**Step 3: Edit flappy/page.tsx** — same

**Step 4: Edit runner/page.tsx** — add imports, HELP constant, local helpOpen state, `?` button in top bar, render `<HelpModal>` when helpOpen

**Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/app/games/tetris/page.tsx src/app/games/snake/page.tsx src/app/games/flappy/page.tsx src/app/games/runner/page.tsx
git commit -m "feat(help): add how-to-play content to arcade games"
```

---

## Task 6: Add help content to Space, Drift, Pacman

**Files:**
- Modify: `src/app/games/space/page.tsx`
- Modify: `src/app/games/drift/page.tsx`
- Modify: `src/app/games/pacman/page.tsx`

**Space help constant:**
```ts
const HELP: GameHelp = {
  objective: "Shoot down alien waves before they reach the bottom. Survive all waves and defeat boss encounters to achieve the highest score.",
  controls: [
    { key: "Left / Right", action: "Move ship" },
    { key: "A / D", action: "Move ship (alternate)" },
    { key: "Space", action: "Shoot" },
  ],
  scoring: [
    { icon: "👾", name: "ALIEN KILLS", desc: "Each alien scores points. Tougher aliens (zigzag, kamikaze, shielded) score more." },
    { icon: "👹", name: "BOSS BONUS", desc: "Defeating a boss scores a large bonus and advances to the next wave set." },
  ],
  specials: [
    { icon: "⚡", name: "RAPID FIRE", desc: "Pick up the rapid-fire power-up to greatly increase your fire rate for a limited time." },
    { icon: "🛡", name: "SHIELD", desc: "Shield power-up absorbs one hit completely — a lifesaver in dense waves." },
    { icon: "💣", name: "BOMB", desc: "Clears all enemy bullets on screen instantly when collected." },
    { icon: "👹", name: "BOSS TYPES", desc: "Spreader fires wide bursts. Summoner shields itself and calls minions. Sniper teleports and fires precise charge shots." },
    { icon: "🎯", name: "ALIEN TYPES", desc: "Zigzag aliens weave unpredictably. Kamikaze aliens dive straight at you. Shielded aliens require two hits to destroy." },
  ],
};
```

**Drift help constant:**
```ts
const HELP: GameHelp = {
  objective: "Race to the finish line or set the fastest lap time. Master drifting to build boost and unleash speed surges at the right moment.",
  controls: [
    { key: "Up / W", action: "Accelerate" },
    { key: "Down / S", action: "Brake / Reverse" },
    { key: "Left / Right", action: "Steer" },
    { key: "A / D", action: "Steer (alternate)" },
  ],
  scoring: [
    { icon: "🏆", name: "RACE MODE", desc: "Finish position determines score — 1st place scores maximum points." },
    { icon: "⏱", name: "TIME ATTACK", desc: "Beat your best lap time to set a new record. No opponents, pure precision driving." },
  ],
  specials: [
    { icon: "🌀", name: "DRIFT", desc: "Hold a turn while accelerating to enter a drift. The longer you drift, the more boost bar you fill." },
    { icon: "⚡", name: "BOOST", desc: "When the boost bar is full, release the drift or hold the boost key for a powerful speed surge." },
    { icon: "👻", name: "GHOST REPLAY", desc: "In Time Attack mode, your best lap is recorded as a ghost car you race against next time." },
  ],
};
```

**Pacman help constant:**
```ts
const HELP: GameHelp = {
  objective: "Eat every dot in the maze to complete the level. Avoid ghosts — getting caught costs a life. Eat power pellets to turn the tables!",
  controls: [
    { key: "Arrow Keys", action: "Move Pixel Chomp" },
    { key: "W A S D", action: "Move (alternate)" },
    { key: "Swipe", action: "Move on mobile" },
  ],
  scoring: [
    { icon: "🔵", name: "DOTS", desc: "Each dot scores 10 points. Clear the whole maze to advance to the next level." },
    { icon: "🍒", name: "FRUIT BONUS", desc: "Fruit appears in the maze center periodically. Each level brings a different fruit worth more points." },
    { icon: "👻", name: "GHOST COMBO", desc: "Eating multiple ghosts in a single power session multiplies: 200 > 400 > 800 > 1600 points." },
  ],
  specials: [
    { icon: "⚡", name: "POWER PELLET", desc: "Eat a large flashing pellet to make all ghosts vulnerable and turn blue — chase and eat them for big points!" },
    { icon: "🌫", name: "FOG OF WAR", desc: "Optional setting that limits your visibility. Listen for audio cues — ghost proximity affects the soundtrack." },
    { icon: "⚙️", name: "SETTINGS", desc: "Adjust ghost speed, power duration, maze layout, and ghost count from the settings panel before or during play." },
  ],
};
```

**Note for Space:** Uses a custom canvas layout (not GameLayout). Add `const [helpOpen, setHelpOpen] = useState(false)` and a `?` button somewhere in the UI (near the score/HUD area at the top). Import HelpModal and GameHelp. Render `<HelpModal>` conditionally.

**Note for Drift:** Uses GameLayout for the playing phase. Pass `helpContent={HELP}` and `gameKey="drift"` to `<GameLayout>`. The Menu component renders separately — the `?` button from GameLayout will be visible during gameplay.

**Step 1: Edit space/page.tsx** — add imports, HELP constant, local helpOpen state, `?` button, render HelpModal

**Step 2: Edit drift/page.tsx** — add imports, HELP constant, pass to GameLayout

**Step 3: Edit pacman/page.tsx** — add imports, HELP constant, pass to GameLayout

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/app/games/space/page.tsx src/app/games/drift/page.tsx src/app/games/pacman/page.tsx
git commit -m "feat(help): add how-to-play content to space, drift, pacman"
```

---

## Task 7: Visual verification

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Check each game**

Visit each game page in browser and verify:
- [ ] `?` button visible in top bar (or equivalent for custom-layout games)
- [ ] Modal opens on first visit (clear localStorage to test: `localStorage.clear()` in devtools)
- [ ] Modal shows correct sections (objective, controls, specials)
- [ ] Modal closes on backdrop click and X button
- [ ] Second visit: modal does NOT auto-open
- [ ] Modal scrolls correctly if content overflows on small screens
- [ ] Neon color theme matches the game's color

**Step 3: Commit final**

```bash
git add -A
git commit -m "feat(help): how-to-play panel complete across all games"
```
