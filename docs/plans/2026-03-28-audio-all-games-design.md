# Audio — All Games Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to implement this design.

**Goal:** Add retro 8-bit Web Audio API sound effects to all 7 remaining games, with a shared `MuteButton` component ensuring consistent UX across all 9 games.

**Architecture:** Hybrid — `src/lib/audioUtils.ts` exports shared `tone()` and `noise()` primitives. Each game has its own `audio.ts` importing those primitives. `src/components/MuteButton.tsx` shared across all games. Mute state is per-game via localStorage. No refactoring of existing `space/audio.ts` or `minesweeper/audio.ts` internals — only replace their inline button with `<MuteButton>`.

**Tech Stack:** Web Audio API, React 18, Next.js 16, TypeScript

---

## Shared Primitives: `src/lib/audioUtils.ts`

```ts
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

---

## Shared Component: `src/components/MuteButton.tsx`

```tsx
"use client";

interface Props {
  muted: boolean;
  onToggle: () => void;
  color?: "green" | "pink" | "blue" | "yellow";
}

const colorMap = {
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

---

## Game Audio Factories

### `src/games/2048/audio.ts` (pink theme)

```ts
import { tone, noise } from "@/lib/audioUtils";

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
  const t = () => { if (muted) return false; return true; };

  return {
    playMove()       { if (!t()) return; tone(ctx, "square",   300, 200, 0.06, 0.08); },
    playMerge()      { if (!t()) return; tone(ctx, "triangle", 400, 650, 0.08, 0.16); },
    playMilestone(v) {
      if (!t()) return;
      const notes = v >= 2048 ? [523, 659, 784, 1047]
                  : v >= 1024 ? [440, 554, 659]
                  :             [392, 494];
      notes.forEach((f, i) => tone(ctx, "square", f, f, 0.1, 0.14, i * 0.11));
    },
    playWin()        { if (!t()) return; [523,659,784,1047].forEach((f,i) => tone(ctx,"square",f,f,0.12,0.16,i*0.13)); },
    playGameOver()   { if (!t()) return; [400,300,200].forEach((f,i) => tone(ctx,"square",f,f*0.7,0.15,0.14,i*0.16)); },
    setMuted(m)      { muted = m; },
  };
}
```

### `src/games/sudoku/audio.ts` (blue theme)

```ts
import { tone, noise } from "@/lib/audioUtils";

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
  const t = () => !muted;

  return {
    playFill()    { if (!t()) return; tone(ctx, "square",   500, 500, 0.04, 0.10); },
    playCorrect() { if (!t()) return; tone(ctx, "triangle", 800, 800, 0.09, 0.18); },
    playWrong()   { if (!t()) return; tone(ctx, "sawtooth", 150, 100, 0.12, 0.14); },
    playClear()   { if (!t()) return; tone(ctx, "square",   600, 200, 0.08, 0.10); },
    playWin()     { if (!t()) return; [523,659,784,1047].forEach((f,i) => tone(ctx,"triangle",f,f,0.12,0.16,i*0.13)); },
    setMuted(m)   { muted = m; },
  };
}
```

### `src/games/memory-match/audio.ts` (yellow theme)

```ts
import { tone, noise } from "@/lib/audioUtils";

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
  const t = () => !muted;

  return {
    playFlip()       { if (!t()) return; tone(ctx, "square",   600, 600, 0.05, 0.12); },
    playMatch()      { if (!t()) return; tone(ctx,"triangle",600,900,0.1,0.18,0); tone(ctx,"triangle",900,900,0.1,0.18,0.11); },
    playNoMatch()    { if (!t()) return; tone(ctx, "sawtooth", 200, 150, 0.10, 0.14); },
    playCombo(level) {
      if (!t()) return;
      const base = 400 + level * 80;
      [base, base*1.25, base*1.5].forEach((f,i) => tone(ctx,"square",f,f,0.08,0.14,i*0.09));
    },
    playWin()        { if (!t()) return; [523,659,784,1047].forEach((f,i) => tone(ctx,"square",f,f,0.12,0.18,i*0.12)); },
    setMuted(m)      { muted = m; },
  };
}
```

### `src/games/snake/audio.ts` (green theme)

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
  const t = () => !muted;

  return {
    playEat()     { if (!t()) return; tone(ctx, "square",   700, 900, 0.07, 0.16); },
    playLevelUp() { if (!t()) return; [400,500,650,800].forEach((f,i) => tone(ctx,"square",f,f,0.08,0.14,i*0.08)); },
    playDie()     { if (!t()) return; tone(ctx,"sawtooth",400,80,0.30,0.18); noise(ctx,0.15,0.10,0.05); },
    setMuted(m)   { muted = m; },
  };
}
```

### `src/games/tetris/audio.ts`

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
  const t = () => !muted;

  return {
    playMove()         { if (!t()) return; tone(ctx,"square",  400,400,0.03,0.07); },
    playRotate()       { if (!t()) return; tone(ctx,"square",  600,400,0.06,0.10); },
    playLand()         { if (!t()) return; tone(ctx,"triangle",300,300,0.08,0.14); noise(ctx,0.04,0.06); },
    playClear(lines)   {
      if (!t()) return;
      if (lines >= 4) {
        // Tetris! Epic fanfare
        [523,659,784,1047,1319].forEach((f,i) => tone(ctx,"square",f,f,0.12,0.18,i*0.10));
      } else {
        const f = 400 + lines * 100;
        tone(ctx,"square",f,f*1.5,0.15,0.16);
      }
    },
    playGameOver()     { if (!t()) return; [400,350,300,200,150].forEach((f,i)=>tone(ctx,"sawtooth",f,f*0.8,0.14,0.15,i*0.12)); },
    setMuted(m)        { muted = m; },
  };
}
```

### `src/games/flappy/audio.ts`

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
  const t = () => !muted;

  return {
    playFlap()  { if (!t()) return; tone(ctx,"square",  400,600,0.05,0.14); },
    playScore() { if (!t()) return; tone(ctx,"triangle",800,800,0.08,0.18); },
    playDie()   { if (!t()) return; noise(ctx,0.20,0.18); tone(ctx,"sawtooth",300,100,0.20,0.14,0.02); },
    setMuted(m) { muted = m; },
  };
}
```

### `src/games/runner/audio.ts`

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
  const t = () => !muted;

  return {
    playJump()  { if (!t()) return; tone(ctx,"square",  300,700,0.10,0.14); },
    playLand()  { if (!t()) return; tone(ctx,"triangle",300,300,0.06,0.12); },
    playDie()   { if (!t()) return; noise(ctx,0.25,0.18); tone(ctx,"sawtooth",350,80,0.25,0.14,0.02); },
    playScore() { if (!t()) return; tone(ctx,"triangle",900,900,0.07,0.16); },
    setMuted(m) { muted = m; },
  };
}
```

---

## Integration Pattern (same for all games)

In each `page.tsx`:

```ts
import { createXxxAudio } from "@/games/xxx/audio";
import type { XxxAudio } from "@/games/xxx/audio";
import MuteButton from "@/components/MuteButton";

// In component:
const audioRef = useRef<XxxAudio | null>(null);
const [muted, setMuted] = useState(() =>
  typeof window !== "undefined" && localStorage.getItem("xxx-sound-muted") === "1"
);

// Lazy init on first gesture:
useEffect(() => {
  const init = () => { if (!audioRef.current) { audioRef.current = createXxxAudio(); audioRef.current.setMuted(muted); } };
  window.addEventListener("pointerdown", init, { once: true });
  window.addEventListener("keydown",     init, { once: true });
  return () => { window.removeEventListener("pointerdown", init); window.removeEventListener("keydown", init); };
}, [muted]);

// Sync muted:
useEffect(() => {
  audioRef.current?.setMuted(muted);
  localStorage.setItem("xxx-sound-muted", muted ? "1" : "0");
}, [muted]);

// In JSX header (next to BEST score):
<MuteButton muted={muted} onToggle={() => setMuted(m => !m)} color="green" />
```

---

## Files Summary

| File | Action |
|------|--------|
| `src/lib/audioUtils.ts` | CREATE — shared `tone()` + `noise()` |
| `src/components/MuteButton.tsx` | CREATE — shared mute button |
| `src/games/2048/audio.ts` | CREATE |
| `src/games/sudoku/audio.ts` | CREATE |
| `src/games/memory-match/audio.ts` | CREATE |
| `src/games/snake/audio.ts` | CREATE |
| `src/games/tetris/audio.ts` | CREATE |
| `src/games/flappy/audio.ts` | CREATE |
| `src/games/runner/audio.ts` | CREATE |
| `src/app/games/space/page.tsx` | MODIFY — replace inline button with `<MuteButton color="blue">` |
| `src/app/games/minesweeper/page.tsx` | MODIFY — replace inline button with `<MuteButton color="green">` |
| `src/app/games/2048/page.tsx` | MODIFY — wire audio + MuteButton |
| `src/app/games/sudoku/page.tsx` | MODIFY — wire audio + MuteButton |
| `src/app/games/memory-match/page.tsx` | MODIFY — wire audio + MuteButton |
| `src/app/games/snake/page.tsx` | MODIFY — wire audio + MuteButton |
| `src/app/games/tetris/page.tsx` | MODIFY — wire audio + MuteButton |
| `src/app/games/flappy/page.tsx` | MODIFY — wire audio + MuteButton |
| `src/app/games/runner/page.tsx` | MODIFY — wire audio + MuteButton |
