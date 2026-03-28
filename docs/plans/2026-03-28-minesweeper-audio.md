# Minesweeper Audio Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add retro 8-bit Web Audio API sound effects to Dungeon Sweep minesweeper.

**Architecture:** New `audio.ts` factory with procedural sounds, lazy-init on first gesture, `pendingAudioRef` pattern to safely trigger audio after React setState updaters, mute toggle persisted to localStorage.

**Tech Stack:** Web Audio API, React 18, Next.js 16, TypeScript

---

### Task 1: Create `src/games/minesweeper/audio.ts`

**Files:**
- Create: `src/games/minesweeper/audio.ts`

**Step 1: Create the audio factory file**

```ts
// src/games/minesweeper/audio.ts

export interface MinesweeperAudio {
  playReveal: () => void;
  playCascade: () => void;
  playFlag: () => void;
  playUnflag: () => void;
  playChord: () => void;
  playMine: () => void;
  playWin: () => void;
  setMuted: (m: boolean) => void;
}

export function createMinesweeperAudio(): MinesweeperAudio {
  const ctx = new AudioContext();
  let muted = false;

  function tone(
    type: OscillatorType,
    freqStart: number,
    freqEnd: number,
    duration: number,
    gainPeak = 0.18,
    startDelay = 0,
  ) {
    if (muted) return;
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

  function noise(duration: number, gainPeak = 0.12, startDelay = 0) {
    if (muted) return;
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

  return {
    // Short blip when revealing a single cell
    playReveal() {
      tone("square", 440, 620, 0.055, 0.14);
    },

    // Ascending sweep when cascade opens many cells
    playCascade() {
      tone("square", 280, 900, 0.18, 0.16);
    },

    // Metallic ping when placing a shield/flag
    playFlag() {
      tone("triangle", 700, 700, 0.075, 0.2);
    },

    // Lower ping when removing a shield/flag
    playUnflag() {
      tone("triangle", 440, 440, 0.055, 0.15);
    },

    // Two quick blips for chord reveal
    playChord() {
      tone("square", 500, 500, 0.04, 0.12, 0);
      tone("square", 620, 620, 0.04, 0.12, 0.055);
    },

    // Noise burst + low rumble when hitting a mine
    playMine() {
      noise(0.38, 0.22);
      tone("sine", 80, 40, 0.38, 0.25);
    },

    // C4→E4→G4→C5 victory arpeggio
    playWin() {
      const notes = [261.63, 329.63, 392.0, 523.25];
      notes.forEach((freq, i) => {
        tone("square", freq, freq, 0.11, 0.15, i * 0.12);
      });
    },

    setMuted(m: boolean) {
      muted = m;
    },
  };
}
```

**Step 2: Verify TypeScript compiles**

Check terminal — no TypeScript errors. Visit `http://localhost:3000/games/minesweeper` — page still loads.

**Step 3: Commit**

```bash
git add src/games/minesweeper/audio.ts
git commit -m "feat(minesweeper): add retro 8-bit Web Audio factory"
```

---

### Task 2: Wire audio into `page.tsx`

**Files:**
- Modify: `src/app/games/minesweeper/page.tsx`

**Step 1: Add imports at the top of the file**

After the existing imports (line 9), add:

```ts
import { createMinesweeperAudio } from "@/games/minesweeper/audio";
import type { MinesweeperAudio } from "@/games/minesweeper/audio";
```

**Step 2: Add audioRef, muted state, and pendingAudioRef inside the component**

After the existing `const intervalRef = useRef(...)` line (~line 20), add:

```ts
const audioRef = useRef<MinesweeperAudio | null>(null);
const pendingAudioRef = useRef<string | null>(null);
const [muted, setMuted] = useState(() =>
  typeof window !== "undefined" && localStorage.getItem("minesweeper-sound-muted") === "1"
);
```

**Step 3: Add lazy-init useEffect**

After the existing `useEffect` that sets `isTouchDevice` (~line 23), add:

```ts
// Lazy-init audio on first user gesture (required by browser autoplay policy)
useEffect(() => {
  const init = () => {
    if (!audioRef.current) {
      audioRef.current = createMinesweeperAudio();
      audioRef.current.setMuted(muted);
    }
  };
  window.addEventListener("pointerdown", init, { once: true });
  window.addEventListener("keydown", init, { once: true });
  return () => {
    window.removeEventListener("pointerdown", init);
    window.removeEventListener("keydown", init);
  };
}, [muted]);

// Sync muted state to audio instance and localStorage
useEffect(() => {
  audioRef.current?.setMuted(muted);
  localStorage.setItem("minesweeper-sound-muted", muted ? "1" : "0");
}, [muted]);

// Consume pending audio after each state update
useEffect(() => {
  if (!pendingAudioRef.current) return;
  const key = pendingAudioRef.current;
  pendingAudioRef.current = null;
  const a = audioRef.current;
  if (!a) return;
  if (key === "mine") a.playMine();
  else if (key === "win") a.playWin();
  else if (key === "cascade") a.playCascade();
  else if (key === "chord") a.playChord();
  else a.playReveal();
}, [state]);
```

**Step 4: Update `handleReveal` to schedule pending audio**

Replace the `handleReveal` callback (lines 58–89) with:

```ts
const handleReveal = useCallback(
  (row: number, col: number) => {
    setState((prev) => {
      if (prev.gameState !== "playing") return prev;

      if (prev.firstClick) {
        setTimerActive(true);
      }

      const next = reveal(prev, row, col);

      // Count revealed cells to detect cascade
      const prevRevealed = prev.board.flat().filter((c) => c.revealed).length;
      const nextRevealed = next.board.flat().filter((c) => c.revealed).length;
      const delta = nextRevealed - prevRevealed;

      // Schedule audio (consumed by useEffect after re-render)
      if (next.gameState === "lost") pendingAudioRef.current = "mine";
      else if (next.gameState === "won") pendingAudioRef.current = "win";
      else if (delta >= 3) pendingAudioRef.current = "cascade";
      else pendingAudioRef.current = "reveal";

      if (next.gameState === "won") {
        setTimerActive(false);
        setTimeout(() => {
          setTimer((t) => {
            setBestTime(gameKey, t);
            setBest(getBestTime(gameKey));
            return t;
          });
        }, 0);
      } else if (next.gameState === "lost") {
        setTimerActive(false);
      }

      return next;
    });
  },
  [gameKey]
);
```

**Step 5: Update `handleFlag` to play audio directly**

Replace `handleFlag` (lines 91–93) with:

```ts
const handleFlag = useCallback((row: number, col: number) => {
  setState((prev) => {
    const next = toggleFlag(prev, row, col);
    // Safe to call directly — audioRef is a stable ref, not React state
    if (next.flagCount > prev.flagCount) audioRef.current?.playFlag();
    else audioRef.current?.playUnflag();
    return next;
  });
}, []);
```

**Step 6: Update `handleChord` to schedule pending audio**

Replace `handleChord` (lines 95–117) with:

```ts
const handleChord = useCallback(
  (row: number, col: number) => {
    setState((prev) => {
      const next = chord(prev, row, col);

      if (next.gameState === "lost") pendingAudioRef.current = "mine";
      else if (next.gameState === "won") pendingAudioRef.current = "win";
      else pendingAudioRef.current = "chord";

      if (next.gameState === "won") {
        setTimerActive(false);
        setTimeout(() => {
          setTimer((t) => {
            setBestTime(gameKey, t);
            setBest(getBestTime(gameKey));
            return t;
          });
        }, 0);
      } else if (next.gameState === "lost") {
        setTimerActive(false);
      }

      return next;
    });
  },
  [gameKey]
);
```

**Step 7: Add mute toggle button to the status bar**

In the JSX, find the status bar `<div>` that contains `MONSTERS: {monsterCount}` (~line 146). Add the mute button after the MONSTERS span:

```tsx
<button
  onClick={() => setMuted((m) => !m)}
  className="text-[0.5rem] text-gray-500 hover:text-gray-300 transition-colors"
  title={muted ? "Unmute" : "Mute"}
>
  {muted ? "🔇" : "🔊"}
</button>
```

**Step 8: Verify in browser**

1. Open `http://localhost:3000/games/minesweeper`
2. Click a cell → hear short blip
3. Click near an open area → hear cascade sweep (multiple cells reveal)
4. Right-click a cell → hear metallic ping (flag placed)
5. Right-click flagged cell → hear lower ping (flag removed)
6. Hit a mine → hear explosion rumble
7. Clear board → hear victory arpeggio
8. Click 🔊 → icon becomes 🔇, no more sounds
9. Refresh page → muted state persists

**Step 9: Commit**

```bash
git add src/app/games/minesweeper/page.tsx
git commit -m "feat(minesweeper): wire retro audio — reveal, cascade, flag, mine, win sounds"
```

---

## Verification Checklist

- [ ] Single cell reveal → short blip
- [ ] Cascade (3+ cells) → ascending sweep
- [ ] Flag placed → metallic ping
- [ ] Flag removed → lower ping
- [ ] Chord click → double blip
- [ ] Mine hit → noise + rumble
- [ ] Win → 4-note arpeggio
- [ ] 🔊/🔇 toggle works
- [ ] Mute state persists across page refresh (localStorage)
- [ ] No TypeScript errors in terminal
- [ ] No audio on page load (lazy init respected)
