# Audio — All Games Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add consistent retro 8-bit audio to all 9 HeoLab games with a shared `MuteButton` component and shared audio primitives.

**Architecture:** `src/lib/audioUtils.ts` exports `tone()` and `noise()` primitives. Each game has its own `audio.ts` factory importing those primitives. `src/components/MuteButton.tsx` renders a consistent 🔊/🔇 toggle used on all game pages. Mute state is per-game in localStorage. Space and Minesweeper already have audio — only replace their inline mute button with `<MuteButton>`.

**Tech Stack:** Web Audio API, React 18, Next.js 16, TypeScript, Tailwind CSS v4

---

### Task 1: Shared audio primitives

**Files:**
- Create: `src/lib/audioUtils.ts`

**Step 1: Create the file**

```ts
// src/lib/audioUtils.ts

/**
 * Play a tone using an oscillator.
 * Handles its own start/stop — fire and forget.
 */
export function tone(
  ctx: AudioContext,
  type: OscillatorType,
  freqStart: number,
  freqEnd: number,
  duration: number,
  gainPeak = 0.18,
  startDelay = 0,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  const t = ctx.currentTime + startDelay;
  osc.frequency.setValueAtTime(freqStart, t);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(gainPeak, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.01);
}

/**
 * Play a noise burst (white noise).
 * Handles its own start/stop — fire and forget.
 */
export function noise(
  ctx: AudioContext,
  duration: number,
  gainPeak = 0.12,
  startDelay = 0,
): void {
  const bufSize = Math.ceil(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  src.connect(gain);
  gain.connect(ctx.destination);
  const t = ctx.currentTime + startDelay;
  gain.gain.setValueAtTime(gainPeak, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  src.start(t);
  src.stop(t + duration + 0.01);
}
```

**Step 2: Verify TypeScript compiles**

Check dev server terminal — no errors. If AudioContext type is missing, it's a browser API, no import needed.

**Step 3: Commit**

```bash
git add src/lib/audioUtils.ts
git commit -m "feat(audio): add shared tone() and noise() Web Audio primitives"
```

---

### Task 2: Shared MuteButton component

**Files:**
- Create: `src/components/MuteButton.tsx`

**Step 1: Create the component**

```tsx
// src/components/MuteButton.tsx
"use client";

interface Props {
  muted: boolean;
  onToggle: () => void;
  color?: "green" | "pink" | "blue" | "yellow";
}

const colorMap: Record<string, string> = {
  green:  "hover:border-neon-green  hover:text-neon-green",
  pink:   "hover:border-neon-pink   hover:text-neon-pink",
  blue:   "hover:border-neon-blue   hover:text-neon-blue",
  yellow: "hover:border-neon-yellow hover:text-neon-yellow",
};

export default function MuteButton({ muted, onToggle, color = "blue" }: Props) {
  return (
    <button
      onClick={onToggle}
      className={`font-pixel text-[0.5rem] border border-gray-600 px-1.5 py-0.5 transition-colors ${colorMap[color]}`}
      title={muted ? "Unmute sound" : "Mute sound"}
    >
      {muted ? "🔇 OFF" : "🔊 ON"}
    </button>
  );
}
```

**Step 2: Verify it renders**

Visit `http://localhost:3000` — no compile errors.

**Step 3: Commit**

```bash
git add src/components/MuteButton.tsx
git commit -m "feat(audio): add shared MuteButton component for consistent mute UX"
```

---

### Task 3: Create all 7 game audio factories

**Files:**
- Create: `src/games/2048/audio.ts`
- Create: `src/games/sudoku/audio.ts`
- Create: `src/games/memory-match/audio.ts`
- Create: `src/games/snake/audio.ts`
- Create: `src/games/tetris/audio.ts`
- Create: `src/games/flappy/audio.ts`
- Create: `src/games/runner/audio.ts`

**Step 1: Create `src/games/2048/audio.ts`**

```ts
import { tone } from "@/lib/audioUtils";

export interface Audio2048 {
  playMove: () => void;
  playMerge: () => void;
  playMilestone: (value: number) => void;
  playWin: () => void;
  playGameOver: () => void;
  setMuted: (m: boolean) => void;
}

export function create2048Audio(): Audio2048 {
  const ctx = new AudioContext();
  let muted = false;
  const ok = () => !muted;

  return {
    playMove()        { if (!ok()) return; tone(ctx, "square",   300, 200, 0.06, 0.08); },
    playMerge()       { if (!ok()) return; tone(ctx, "triangle", 400, 650, 0.08, 0.16); },
    playMilestone(v)  {
      if (!ok()) return;
      const notes = v >= 2048 ? [523, 659, 784, 1047]
                  : v >= 1024 ? [440, 554, 659]
                  :             [392, 494];
      notes.forEach((f, i) => tone(ctx, "square", f, f, 0.10, 0.14, i * 0.11));
    },
    playWin()         { if (!ok()) return; [523,659,784,1047].forEach((f,i) => tone(ctx,"square",f,f,0.12,0.16,i*0.13)); },
    playGameOver()    { if (!ok()) return; [400,300,200].forEach((f,i) => tone(ctx,"square",f,f*0.7,0.15,0.14,i*0.16)); },
    setMuted(m)       { muted = m; },
  };
}
```

**Step 2: Create `src/games/sudoku/audio.ts`**

```ts
import { tone } from "@/lib/audioUtils";

export interface SudokuAudio {
  playFill: () => void;
  playCorrect: () => void;
  playWrong: () => void;
  playClear: () => void;
  playWin: () => void;
  setMuted: (m: boolean) => void;
}

export function createSudokuAudio(): SudokuAudio {
  const ctx = new AudioContext();
  let muted = false;
  const ok = () => !muted;

  return {
    playFill()    { if (!ok()) return; tone(ctx, "square",   500, 500, 0.04, 0.10); },
    playCorrect() { if (!ok()) return; tone(ctx, "triangle", 800, 800, 0.09, 0.18); },
    playWrong()   { if (!ok()) return; tone(ctx, "sawtooth", 150, 100, 0.12, 0.14); },
    playClear()   { if (!ok()) return; tone(ctx, "square",   600, 200, 0.08, 0.10); },
    playWin()     { if (!ok()) return; [523,659,784,1047].forEach((f,i) => tone(ctx,"triangle",f,f,0.12,0.16,i*0.13)); },
    setMuted(m)   { muted = m; },
  };
}
```

**Step 3: Create `src/games/memory-match/audio.ts`**

```ts
import { tone } from "@/lib/audioUtils";

export interface MemoryAudio {
  playFlip: () => void;
  playMatch: () => void;
  playNoMatch: () => void;
  playCombo: (level: number) => void;
  playWin: () => void;
  setMuted: (m: boolean) => void;
}

export function createMemoryAudio(): MemoryAudio {
  const ctx = new AudioContext();
  let muted = false;
  const ok = () => !muted;

  return {
    playFlip()      { if (!ok()) return; tone(ctx, "square",   600, 600, 0.05, 0.12); },
    playMatch()     { if (!ok()) return; tone(ctx,"triangle",600,900,0.10,0.18,0); tone(ctx,"triangle",900,900,0.10,0.18,0.11); },
    playNoMatch()   { if (!ok()) return; tone(ctx, "sawtooth", 200, 150, 0.10, 0.14); },
    playCombo(lvl)  {
      if (!ok()) return;
      const base = 400 + lvl * 80;
      [base, base * 1.25, base * 1.5].forEach((f, i) => tone(ctx, "square", f, f, 0.08, 0.14, i * 0.09));
    },
    playWin()       { if (!ok()) return; [523,659,784,1047].forEach((f,i) => tone(ctx,"square",f,f,0.12,0.18,i*0.12)); },
    setMuted(m)     { muted = m; },
  };
}
```

**Step 4: Create `src/games/snake/audio.ts`**

```ts
import { tone, noise } from "@/lib/audioUtils";

export interface SnakeAudio {
  playEat: () => void;
  playLevelUp: () => void;
  playDie: () => void;
  setMuted: (m: boolean) => void;
}

export function createSnakeAudio(): SnakeAudio {
  const ctx = new AudioContext();
  let muted = false;
  const ok = () => !muted;

  return {
    playEat()     { if (!ok()) return; tone(ctx, "square",   700, 900, 0.07, 0.16); },
    playLevelUp() { if (!ok()) return; [400,500,650,800].forEach((f,i) => tone(ctx,"square",f,f,0.08,0.14,i*0.08)); },
    playDie()     { if (!ok()) return; tone(ctx,"sawtooth",400,80,0.30,0.18); noise(ctx,0.15,0.10,0.05); },
    setMuted(m)   { muted = m; },
  };
}
```

**Step 5: Create `src/games/tetris/audio.ts`**

```ts
import { tone, noise } from "@/lib/audioUtils";

export interface TetrisAudio {
  playMove: () => void;
  playRotate: () => void;
  playLand: () => void;
  playClear: (lines: number) => void;
  playGameOver: () => void;
  setMuted: (m: boolean) => void;
}

export function createTetrisAudio(): TetrisAudio {
  const ctx = new AudioContext();
  let muted = false;
  const ok = () => !muted;

  return {
    playMove()       { if (!ok()) return; tone(ctx, "square",   400, 400, 0.03, 0.07); },
    playRotate()     { if (!ok()) return; tone(ctx, "square",   600, 400, 0.06, 0.10); },
    playLand()       { if (!ok()) return; tone(ctx,"triangle",300,300,0.08,0.14); noise(ctx,0.04,0.06); },
    playClear(lines) {
      if (!ok()) return;
      if (lines >= 4) {
        [523,659,784,1047,1319].forEach((f,i) => tone(ctx,"square",f,f,0.12,0.18,i*0.10));
      } else {
        tone(ctx, "square", 400 + lines * 100, (400 + lines * 100) * 1.5, 0.15, 0.16);
      }
    },
    playGameOver()   { if (!ok()) return; [400,350,300,200,150].forEach((f,i) => tone(ctx,"sawtooth",f,f*0.8,0.14,0.15,i*0.12)); },
    setMuted(m)      { muted = m; },
  };
}
```

**Step 6: Create `src/games/flappy/audio.ts`**

```ts
import { tone, noise } from "@/lib/audioUtils";

export interface FlappyAudio {
  playFlap: () => void;
  playScore: () => void;
  playDie: () => void;
  setMuted: (m: boolean) => void;
}

export function createFlappyAudio(): FlappyAudio {
  const ctx = new AudioContext();
  let muted = false;
  const ok = () => !muted;

  return {
    playFlap()  { if (!ok()) return; tone(ctx, "square",   400, 600, 0.05, 0.14); },
    playScore() { if (!ok()) return; tone(ctx, "triangle", 800, 800, 0.08, 0.18); },
    playDie()   { if (!ok()) return; noise(ctx,0.20,0.18); tone(ctx,"sawtooth",300,100,0.20,0.14,0.02); },
    setMuted(m) { muted = m; },
  };
}
```

**Step 7: Create `src/games/runner/audio.ts`**

```ts
import { tone, noise } from "@/lib/audioUtils";

export interface RunnerAudio {
  playJump: () => void;
  playLand: () => void;
  playDie: () => void;
  playScore: () => void;
  setMuted: (m: boolean) => void;
}

export function createRunnerAudio(): RunnerAudio {
  const ctx = new AudioContext();
  let muted = false;
  const ok = () => !muted;

  return {
    playJump()  { if (!ok()) return; tone(ctx, "square",   300, 700, 0.10, 0.14); },
    playLand()  { if (!ok()) return; tone(ctx, "triangle", 300, 300, 0.06, 0.12); },
    playDie()   { if (!ok()) return; noise(ctx,0.25,0.18); tone(ctx,"sawtooth",350,80,0.25,0.14,0.02); },
    playScore() { if (!ok()) return; tone(ctx, "triangle", 900, 900, 0.07, 0.16); },
    setMuted(m) { muted = m; },
  };
}
```

**Step 8: Verify TypeScript compiles**

Check dev server — no errors on any game page.

**Step 9: Commit**

```bash
git add src/games/2048/audio.ts src/games/sudoku/audio.ts src/games/memory-match/audio.ts src/games/snake/audio.ts src/games/tetris/audio.ts src/games/flappy/audio.ts src/games/runner/audio.ts
git commit -m "feat(audio): add retro 8-bit audio factories for all 7 games"
```

---

### Task 4: Update Space and Minesweeper to use MuteButton

**Files:**
- Modify: `src/app/games/space/page.tsx`
- Modify: `src/app/games/minesweeper/page.tsx`

**Step 1: Update space/page.tsx**

Add import at top:
```ts
import MuteButton from "@/components/MuteButton";
```

Find the existing inline mute button in the JSX (it looks like):
```tsx
<button
  onClick={() => setMuted((m) => !m)}
  className="font-pixel text-[0.5rem] border border-gray-600 hover:border-neon-blue hover:text-neon-blue px-1.5 py-0.5 transition-colors"
  title={muted ? "Unmute sound" : "Mute sound"}
>
  {muted ? "🔇 OFF" : "🔊 ON"}
</button>
```

Replace with:
```tsx
<MuteButton muted={muted} onToggle={() => setMuted((m) => !m)} color="blue" />
```

**Step 2: Update minesweeper/page.tsx**

Add import at top:
```ts
import MuteButton from "@/components/MuteButton";
```

Find the existing inline mute button in the status bar JSX:
```tsx
<button
  onClick={() => setMuted((m) => !m)}
  className="text-[0.5rem] text-gray-500 hover:text-gray-300 transition-colors"
  title={muted ? "Unmute" : "Mute"}
>
  {muted ? "🔇" : "🔊"}
</button>
```

Replace with:
```tsx
<MuteButton muted={muted} onToggle={() => setMuted((m) => !m)} color="green" />
```

**Step 3: Verify both pages**

- `http://localhost:3000/games/space` — mute button looks identical to new style
- `http://localhost:3000/games/minesweeper` — same button style

**Step 4: Commit**

```bash
git add src/app/games/space/page.tsx src/app/games/minesweeper/page.tsx
git commit -m "refactor(audio): replace inline mute buttons with shared MuteButton component"
```

---

### Task 5: Wire audio into 2048

**Files:**
- Modify: `src/app/games/2048/page.tsx`

**Step 1: Add imports**

```ts
import { create2048Audio } from "@/games/2048/audio";
import type { Audio2048 } from "@/games/2048/audio";
import MuteButton from "@/components/MuteButton";
```

**Step 2: Add state inside component**

After existing `useState` hooks:
```ts
const audioRef = useRef<Audio2048 | null>(null);
const [muted, setMuted] = useState(() =>
  typeof window !== "undefined" && localStorage.getItem("2048-sound-muted") === "1"
);
```

**Step 3: Add lazy-init and sync useEffects**

```ts
useEffect(() => {
  const init = () => {
    if (!audioRef.current) {
      audioRef.current = create2048Audio();
      audioRef.current.setMuted(muted);
    }
  };
  window.addEventListener("pointerdown", init, { once: true });
  window.addEventListener("keydown",     init, { once: true });
  return () => {
    window.removeEventListener("pointerdown", init);
    window.removeEventListener("keydown", init);
  };
}, [muted]);

useEffect(() => {
  audioRef.current?.setMuted(muted);
  localStorage.setItem("2048-sound-muted", muted ? "1" : "0");
}, [muted]);
```

**Step 4: Hook sounds into game events**

Find where `move()` is called (after arrow key press). After the move call, check `isMerged` tiles and play sounds:

```ts
// After: const newState = move(state, direction);
if (newState !== state) {
  // Check for merges
  const mergedTiles = newState.grid.flat().filter(t => t?.isMerged);
  if (mergedTiles.length > 0) {
    const highestMerge = Math.max(...mergedTiles.map(t => t!.value));
    if (highestMerge >= 512) {
      audioRef.current?.playMilestone(highestMerge);
    } else {
      audioRef.current?.playMerge();
    }
  } else {
    audioRef.current?.playMove();
  }
  if (newState.gameOver && !newState.won) audioRef.current?.playGameOver();
  if (newState.won) audioRef.current?.playWin();
}
```

**Step 5: Add MuteButton to JSX**

Find the header row (where BEST score is shown). Add next to it:
```tsx
<MuteButton muted={muted} onToggle={() => setMuted(m => !m)} color="pink" />
```

**Step 6: Verify**

- `http://localhost:3000/games/2048`
- Swipe tiles → hear move blip
- Tiles merge → hear merge pop
- Reach 512 → hear ascending arpeggio
- 🔊/🔇 button toggles sound

**Step 7: Commit**

```bash
git add src/app/games/2048/page.tsx
git commit -m "feat(audio): add retro sounds to 2048 — move, merge, milestone, win, game over"
```

---

### Task 6: Wire audio into Sudoku

**Files:**
- Modify: `src/app/games/sudoku/page.tsx`

**Step 1: Add imports**

```ts
import { createSudokuAudio } from "@/games/sudoku/audio";
import type { SudokuAudio } from "@/games/sudoku/audio";
import MuteButton from "@/components/MuteButton";
```

**Step 2: Add audio state and effects** (same lazy-init pattern as Task 5, with key `"sudoku-sound-muted"`)

**Step 3: Hook sounds**

- Number input → `audioRef.current?.playFill()`
- Correct placement (if game validates on input) → `audioRef.current?.playCorrect()`
- Wrong placement / conflict → `audioRef.current?.playWrong()`
- Clear cell → `audioRef.current?.playClear()`
- Puzzle complete → `audioRef.current?.playWin()`

Read the page.tsx to find where these state changes happen, then add the audio calls.

**Step 4: Add `<MuteButton muted={muted} onToggle={...} color="blue" />` to header**

**Step 5: Verify → Commit**

```bash
git add src/app/games/sudoku/page.tsx
git commit -m "feat(audio): add retro sounds to Sudoku — fill, correct, wrong, clear, win"
```

---

### Task 7: Wire audio into Memory Match

**Files:**
- Modify: `src/app/games/memory-match/page.tsx`

**Step 1: Add imports** (createMemoryAudio, MemoryAudio, MuteButton)

**Step 2: Add audio state and effects** (key: `"memory-sound-muted"`)

**Step 3: Hook sounds**

- Card flip → `audioRef.current?.playFlip()`
- Cards match → `audioRef.current?.playMatch()`
- Cards don't match (flip back) → `audioRef.current?.playNoMatch()`
- Combo increase → `audioRef.current?.playCombo(comboLevel)`
- All matched / win → `audioRef.current?.playWin()`

**Step 4: Add `<MuteButton muted={muted} onToggle={...} color="yellow" />` to header**

**Step 5: Verify → Commit**

```bash
git add src/app/games/memory-match/page.tsx
git commit -m "feat(audio): add retro sounds to Memory Match — flip, match, combo, win"
```

---

### Task 8: Wire audio into Snake

**Files:**
- Modify: `src/app/games/snake/page.tsx`

**Step 1: Add imports** (createSnakeAudio, SnakeAudio, MuteButton)

**Step 2: Add audio state and effects** (key: `"snake-sound-muted"`)

**Step 3: Hook sounds** (Snake likely uses a game loop or setInterval)

- Snake eats food → `audioRef.current?.playEat()`
- Level up / speed increase → `audioRef.current?.playLevelUp()`
- Snake dies (wall or self) → `audioRef.current?.playDie()`

**Step 4: Add `<MuteButton muted={muted} onToggle={...} color="green" />` to header**

**Step 5: Verify → Commit**

```bash
git add src/app/games/snake/page.tsx
git commit -m "feat(audio): add retro sounds to Snake — eat, level up, die"
```

---

### Task 9: Wire audio into Tetris

**Files:**
- Modify: `src/app/games/tetris/page.tsx`

**Step 1: Add imports** (createTetrisAudio, TetrisAudio, MuteButton)

**Step 2: Add audio state and effects** (key: `"tetris-sound-muted"`)

**Step 3: Hook sounds** (Tetris likely has a game loop)

- Piece moves left/right → `audioRef.current?.playMove()`
- Piece rotates → `audioRef.current?.playRotate()`
- Piece lands → `audioRef.current?.playLand()`
- Line(s) cleared → `audioRef.current?.playClear(linesCleared)` — pass count so Tetris (4 lines) plays epic sound
- Game over → `audioRef.current?.playGameOver()`

**Step 4: Add `<MuteButton muted={muted} onToggle={...} color="pink" />` to header**

**Step 5: Verify → Commit**

```bash
git add src/app/games/tetris/page.tsx
git commit -m "feat(audio): add retro sounds to Tetris — move, rotate, land, clear, tetris!, game over"
```

---

### Task 10: Wire audio into Flappy Bird

**Files:**
- Modify: `src/app/games/flappy/page.tsx`

**Step 1: Add imports** (createFlappyAudio, FlappyAudio, MuteButton)

**Step 2: Add audio state and effects** (key: `"flappy-sound-muted"`)

**Step 3: Hook sounds**

- Bird flaps (spacebar/tap) → `audioRef.current?.playFlap()`
- Bird passes through pipe → `audioRef.current?.playScore()`
- Bird dies → `audioRef.current?.playDie()`

**Step 4: Add `<MuteButton muted={muted} onToggle={...} color="yellow" />` to header**

**Step 5: Verify → Commit**

```bash
git add src/app/games/flappy/page.tsx
git commit -m "feat(audio): add retro sounds to Flappy Bird — flap, score, die"
```

---

### Task 11: Wire audio into Runner

**Files:**
- Modify: `src/app/games/runner/page.tsx`

**Step 1: Add imports** (createRunnerAudio, RunnerAudio, MuteButton)

**Step 2: Add audio state and effects** (key: `"runner-sound-muted"`)

**Step 3: Hook sounds**

- Player jumps → `audioRef.current?.playJump()`
- Player lands → `audioRef.current?.playLand()`
- Player dies (obstacle hit) → `audioRef.current?.playDie()`
- Score milestone (every 100/500 points) → `audioRef.current?.playScore()`

**Step 4: Add `<MuteButton muted={muted} onToggle={...} color="green" />` to header**

**Step 5: Verify → Commit**

```bash
git add src/app/games/runner/page.tsx
git commit -m "feat(audio): add retro sounds to Runner — jump, land, die, score"
```

---

## Final Verification Checklist

Visit each game and verify:
- [ ] `http://localhost:3000/games/space` — 🔊 button same style as others
- [ ] `http://localhost:3000/games/minesweeper` — 🔊 button same style
- [ ] `http://localhost:3000/games/2048` — sounds on merge/move/win, 🔊 button present
- [ ] `http://localhost:3000/games/sudoku` — sounds on fill/correct/wrong/win
- [ ] `http://localhost:3000/games/memory-match` — flip/match/combo/win sounds
- [ ] `http://localhost:3000/games/snake` — eat/die/levelup sounds
- [ ] `http://localhost:3000/games/tetris` — move/rotate/land/clear/gameover sounds
- [ ] `http://localhost:3000/games/flappy` — flap/score/die sounds
- [ ] `http://localhost:3000/games/runner` — jump/land/die/score sounds
- [ ] No sound plays on page load (lazy init respected on all games)
- [ ] Mute state persists after refresh on each game
- [ ] No TypeScript errors in terminal
