# Minesweeper Audio Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to implement this design.

**Goal:** Add retro 8-bit Web Audio API sound effects to Dungeon Sweep minesweeper.

**Architecture:** New `src/games/minesweeper/audio.ts` factory (same pattern as `space/audio.ts`). Lazy-init on first user gesture. `pendingAudioRef` pattern to safely schedule audio from inside React setState updaters. Mute toggle 🔊/🔇 in status bar, persisted to localStorage.

---

## Sound Events

| Event | Function | Sound Design |
|-------|----------|-------------|
| Reveal 1 cell | `playReveal()` | Square wave 440→620Hz, 55ms |
| Cascade reveal (≥3 cells) | `playCascade()` | Ascending sweep 280→900Hz, 180ms |
| Place shield/flag | `playFlag()` | Triangle 700Hz, 75ms |
| Remove shield/flag | `playUnflag()` | Triangle 440Hz, 55ms |
| Chord click | `playChord()` | Two quick blips 500+620Hz, 90ms |
| Hit mine | `playMine()` | Noise burst + low sine 80Hz, 380ms |
| Win | `playWin()` | C4→E4→G4→C5 arpeggio, 480ms |

All sounds procedurally generated — no audio files.

---

## Audio Factory API

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
export function createMinesweeperAudio(): MinesweeperAudio
```

---

## Integration Pattern in page.tsx

**Lazy init** (same as Astro Raid):
```ts
const audioRef = useRef<MinesweeperAudio | null>(null);
const [muted, setMuted] = useState(() =>
  typeof window !== "undefined" && localStorage.getItem("minesweeper-sound-muted") === "1"
);

useEffect(() => {
  const init = () => { if (!audioRef.current) audioRef.current = createMinesweeperAudio(); };
  window.addEventListener("pointerdown", init, { once: true });
  window.addEventListener("keydown", init, { once: true });
  return () => { window.removeEventListener("pointerdown", init); window.removeEventListener("keydown", init); };
}, []);

useEffect(() => {
  audioRef.current?.setMuted(muted);
  localStorage.setItem("minesweeper-sound-muted", muted ? "1" : "0");
}, [muted]);
```

**pendingAudioRef** — schedules audio from inside setState updater (avoids side-effect-in-setState issues):
```ts
const pendingAudioRef = useRef<string | null>(null);

// Inside handleReveal setState updater:
const prevCount = prev.board.flat().filter(c => c.revealed).length;
const nextCount = next.board.flat().filter(c => c.revealed).length;
if (next.gameState === "lost")      pendingAudioRef.current = "mine";
else if (next.gameState === "won")  pendingAudioRef.current = "win";
else if (nextCount - prevCount >= 3) pendingAudioRef.current = "cascade";
else                                 pendingAudioRef.current = "reveal";

// useEffect consumes pending audio after state update:
useEffect(() => {
  if (!pendingAudioRef.current) return;
  const key = pendingAudioRef.current;
  pendingAudioRef.current = null;
  const a = audioRef.current;
  if (!a) return;
  if (key === "mine") a.playMine();
  else if (key === "win") a.playWin();
  else if (key === "cascade") a.playCascade();
  else if (key === "reveal") a.playReveal();
}, [state]);
```

**Flag audio** — called directly from handleFlag (flag toggle is always instant, no cascade):
```ts
// Inside handleFlag setState updater:
const next = toggleFlag(prev, row, col);
if (next.flagCount > prev.flagCount) audioRef.current?.playFlag();
else audioRef.current?.playUnflag();
return next;
```

**Chord audio** — same pendingAudio pattern in handleChord:
```ts
pendingAudioRef.current = next.gameState === "lost" ? "mine"
  : next.gameState === "won" ? "win"
  : "chord";
```

**Mute toggle** — add to status bar next to MONSTERS count:
```tsx
<button onClick={() => setMuted(m => !m)} title={muted ? "Unmute" : "Mute"}>
  {muted ? "🔇" : "🔊"}
</button>
```

---

## Files

| File | Action |
|------|--------|
| `src/games/minesweeper/audio.ts` | CREATE |
| `src/app/games/minesweeper/page.tsx` | MODIFY |
