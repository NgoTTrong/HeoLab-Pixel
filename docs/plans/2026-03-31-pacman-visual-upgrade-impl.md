# Pac-Man Visual Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Pixel Chomp's Survival mode the star of the show with floating score popups, ghost evolution announcements, and milestone sweep banners.

**Architecture:** All changes are purely in the render layer — no logic.ts or types.ts touched. New visual state (popups, evolution alert, banner) lives in page.tsx local state/refs. CSS keyframes added to globals.css.

**Tech Stack:** React (useRef, useState, useEffect), Tailwind v4, CSS keyframes in globals.css

---

## Task 1: Survival as Default + New CSS Keyframes

**Files:**
- Modify: `src/games/pacman/config.ts:6`
- Modify: `src/app/globals.css` (append to end)

**Step 1: Change default gameMode to survival**

In `src/games/pacman/config.ts`, change line 6:
```ts
// Before:
  gameMode: "classic",
// After:
  gameMode: "survival",
```

**Step 2: Add new keyframes to globals.css**

Append to the end of `src/app/globals.css`:

```css
/* ── Pac-Man: Floating score popup ───────────────────── */
@keyframes popupFloat {
  0%   { transform: translateY(0)     scale(1);    opacity: 1; }
  60%  { transform: translateY(-28px) scale(1.05); opacity: 1; }
  100% { transform: translateY(-48px) scale(0.9);  opacity: 0; }
}

/* ── Pac-Man: Maze white flash (LEGENDARY combo) ─────── */
@keyframes mazeFlash {
  0%   { box-shadow: inset 0 0 0 9999px rgba(255, 255, 255, 0.18); }
  100% { box-shadow: inset 0 0 0 9999px rgba(255, 255, 255, 0); }
}
.maze-flash { animation: mazeFlash 0.35s ease-out forwards; }

/* ── Pac-Man: Milestone sweep banner ─────────────────── */
@keyframes bannerSweep {
  0%   { transform: translateX(-110%); opacity: 0; }
  15%  { opacity: 1; }
  50%  { transform: translateX(0%);    opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translateX(110%);  opacity: 0; }
}

/* ── Pac-Man: Evolution overlay flicker (evolved tier) ── */
@keyframes evolvedFlicker {
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
  20%, 22%, 24%, 55%                      { opacity: 0.4; }
}
```

**Step 3: Verify in browser**

Run `npm run dev`, open Pac-Man game. The game should now start in Survival mode by default (fog of war visible immediately). No visual errors.

**Step 4: Commit**

```bash
git add src/games/pacman/config.ts src/app/globals.css
git commit -m "feat(pacman): survival default + visual upgrade CSS keyframes"
```

---

## Task 2: Idle Screen Reframe

**Files:**
- Modify: `src/app/games/pacman/page.tsx` (idle overlay section, around lines 1016-1059)

**Step 1: Replace the idle overlay**

Find the `{/* Idle overlay */}` comment block (around line 1015). Replace the entire block with:

```tsx
{/* Idle overlay */}
{state.status === "idle" && (
  <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
    <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
    <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
      <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">
        👻
      </div>
      <h2 className="text-sm neon-text-orange animate-[victoryGlowOrange_1.5s_ease-in-out_infinite]">
        PIXEL CHOMP
      </h2>
      <p
        className="text-[0.5rem] text-neon-orange/60"
        style={{ animation: "idleBlink 1.2s step-end infinite" }}
      >
        {isTouchDevice() ? "SWIPE TO START" : "PRESS SPACE OR ARROW TO START"}
      </p>

      {/* Mode buttons — Survival is primary */}
      <div className="flex flex-col items-center gap-2 w-full">
        <button
          onClick={() => setModifiers(m => ({ ...m, gameMode: "survival" }))}
          className="relative px-4 py-2 border text-[0.5rem] uppercase tracking-wider transition-all w-40"
          style={{
            borderColor: modifiers.gameMode === "survival" ? "#f97316" : "#444",
            backgroundColor: modifiers.gameMode === "survival" ? "#f9731615" : "transparent",
            color: modifiers.gameMode === "survival" ? "#f97316" : "#666",
            fontFamily: "var(--font-pixel), monospace",
          }}
        >
          SURVIVAL
          {modifiers.gameMode === "survival" && (
            <span
              className="absolute -top-2 left-1/2 -translate-x-1/2 text-[0.35rem] px-1.5 py-0.5"
              style={{ backgroundColor: "#f97316", color: "#000" }}
            >
              REC
            </span>
          )}
        </button>
        <button
          onClick={() => setModifiers(m => ({ ...m, gameMode: "classic" }))}
          className="px-4 py-1.5 border text-[0.45rem] uppercase tracking-wider transition-all w-40"
          style={{
            borderColor: modifiers.gameMode === "classic" ? "#888" : "#333",
            backgroundColor: "transparent",
            color: modifiers.gameMode === "classic" ? "#aaa" : "#444",
            fontFamily: "var(--font-pixel), monospace",
          }}
        >
          CLASSIC
        </button>
      </div>

      {/* Feature badges — only shown for survival */}
      {modifiers.gameMode === "survival" && (
        <div className="flex gap-3 text-[0.4rem] text-gray-500">
          <span>🌫 FOG</span>
          <span>🧠 GHOST AI</span>
          <span>⚡ COMBO</span>
        </div>
      )}

      <PixelButton color="orange" onClick={() => dispatch({ type: "START", modifiers })}>
        PLAY
      </PixelButton>
    </div>
  </div>
)}
```

**Step 2: Verify in browser**

Open the game. Idle screen should show SURVIVAL as the highlighted primary mode with "REC" badge, and 3 feature icons below it. Switching to CLASSIC should hide the feature badges and dim the button.

**Step 3: Commit**

```bash
git add src/app/games/pacman/page.tsx
git commit -m "feat(pacman): survival-first idle screen with feature badges"
```

---

## Task 3: Simplify Game Over Overlay

**Files:**
- Modify: `src/app/games/pacman/page.tsx` (dead overlay, around lines 1106-1146)

**Step 1: Replace the dead overlay**

Find `{/* Dead overlay */}` (around line 1105). Replace entire block with:

```tsx
{/* Dead overlay */}
{state.status === "dead" && (
  <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
    <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
    <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
      <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">
        💀
      </div>
      <h2 className="text-lg sm:text-xl neon-text-pink animate-[defeatFlash_1s_ease-in-out_infinite]">
        GAME OVER
      </h2>
      <p className="text-[0.6rem] text-neon-pink/70">
        SCORE: {state.score} · BEST: {highScore}
      </p>
      <PixelButton color="pink" onClick={() => dispatch({ type: "START", modifiers })}>
        TRY AGAIN
      </PixelButton>
    </div>
  </div>
)}
```

**Step 2: Also simplify the Won overlay** (around lines 1062-1103) — remove the mode toggle buttons, keep just the Next Level button:

```tsx
{/* Won overlay (level complete) */}
{state.status === "won" && (
  <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
    <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
    <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
      <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">
        👻
      </div>
      <h2 className="text-lg sm:text-xl neon-text-orange animate-[victoryGlowOrange_1.5s_ease-in-out_infinite]">
        LEVEL CLEAR!
      </h2>
      <p className="text-[0.6rem] text-neon-orange/70">
        SCORE: {state.score} · BEST: {highScore}
      </p>
      <PixelButton color="orange" onClick={() => dispatch({ type: "NEXT_LEVEL" })}>
        NEXT LEVEL
      </PixelButton>
    </div>
  </div>
)}
```

**Step 3: Verify in browser**

Play until game over and level complete. Both overlays should be clean — no mode toggle buttons, just restart/next actions.

**Step 4: Commit**

```bash
git add src/app/games/pacman/page.tsx
git commit -m "feat(pacman): simplify game over and level clear overlays"
```

---

## Task 4: Floating Score Popups

**Files:**
- Modify: `src/app/games/pacman/page.tsx`

**Step 1: Add PopupEntry type and state near the top of PacmanPage**

After the existing `const [showSettings, setShowSettings] = useState(false);` line, add:

```tsx
interface PopupEntry {
  id: number;
  text: string;
  color: string;
  x: number;  // pixel x on board
  y: number;  // pixel y on board
}

const [popups, setPopups] = useState<PopupEntry[]>([]);
const popupIdRef = useRef(0);
const prevGhostComboRef = useRef(0);
const prevFruitActiveRef = useRef(false);
```

**Step 2: Add spawnPopup helper**

After the refs block (after `const prevComboRef = useRef(0);`), add:

```tsx
const spawnPopup = useCallback((text: string, color: string) => {
  const id = ++popupIdRef.current;
  const offsetX = (Math.random() - 0.5) * 20;
  const x = state.pacman.x * cellSize + cellSize / 2 + offsetX;
  const y = state.pacman.y * cellSize;
  setPopups(prev => [...prev, { id, text, color, x, y }]);
  setTimeout(() => {
    setPopups(prev => prev.filter(p => p.id !== id));
  }, 800);
}, [state.pacman, cellSize]);
```

**Step 3: Add useEffect to detect ghost eaten**

After the existing ghost audio useEffect (around line 668), add:

```tsx
// Popups: ghost eaten
useEffect(() => {
  const eatenCount = state.ghosts.filter((g) => g.eatenReturning).length;
  if (eatenCount > prevGhostCountRef.current) {
    const comboIdx = Math.min(state.ghostCombo - 1, 3);
    const values = [200, 400, 800, 1600];
    const colors = ["#ffffff", "#ffe600", "#f97316", "#ff2d55"];
    spawnPopup(`+${values[comboIdx]}`, colors[comboIdx]);
  }
  prevGhostCountRef.current = eatenCount;
}, [state.ghosts, state.ghostCombo, spawnPopup]);

// Popups: fruit eaten
useEffect(() => {
  if (prevFruitActiveRef.current && !state.fruitActive && state.status === "playing") {
    const fruitIndex = Math.min(state.level - 1, 4);
    const values = [100, 300, 500, 700, 1000];
    spawnPopup(`+${values[fruitIndex]}`, "#ffe600");
  }
  prevFruitActiveRef.current = state.fruitActive;
}, [state.fruitActive, state.status, state.level, spawnPopup]);

// Popups: dot combo (only when combo >= 10 and increasing)
useEffect(() => {
  if (
    state.modifiers.gameMode === "survival" &&
    state.combo >= 10 &&
    state.combo > prevComboRef.current
  ) {
    spawnPopup(`+10 x${state.combo}`, getComboColor(state.combo));
  }
  prevComboRef.current = state.combo;
}, [state.combo, state.modifiers.gameMode, spawnPopup]);
```

**Step 4: Remove the old combo tracking useEffect**

The existing `useEffect` around line 739 that tracks combo for audio also sets `prevComboRef.current`. Now that we have a dedicated popup useEffect for combo, the audio useEffect must NOT also update `prevComboRef`. Find the audio combo useEffect and remove the `prevComboRef.current = state.combo;` line from it (it's now handled by the popup useEffect above).

**Step 5: Render the popups overlay**

Inside the maze board `<div>` (the `relative select-none` div), add after the `{/* Fruit */}` block:

```tsx
{/* Floating score popups */}
{popups.map(popup => (
  <div
    key={popup.id}
    className="pointer-events-none select-none"
    style={{
      position: "absolute",
      left: popup.x,
      top: popup.y,
      transform: "translateX(-50%)",
      color: popup.color,
      fontSize: cellSize * 0.7,
      fontFamily: "var(--font-pixel), monospace",
      textShadow: `0 0 6px ${popup.color}`,
      zIndex: 25,
      animation: "popupFloat 0.8s ease-out forwards",
      whiteSpace: "nowrap",
    }}
  >
    {popup.text}
  </div>
))}
```

**Step 6: Verify in browser**

Play in Survival mode. When eating a ghost, a `+200` / `+400` etc. popup should float up from Pac-Man's position. Eating fruit shows `+100`. When combo >= 10, `+10 x12` etc. should appear on each dot.

**Step 7: Commit**

```bash
git add src/app/games/pacman/page.tsx
git commit -m "feat(pacman): floating score popups for ghost/fruit/combo"
```

---

## Task 5: Ghost Evolution Announcement

**Files:**
- Modify: `src/app/games/pacman/page.tsx`

**Step 1: Add evolutionAlert state and prevEvolutionTierRef**

After the `popups` state line, add:

```tsx
const [evolutionAlert, setEvolutionAlert] = useState<"aware" | "evolved" | null>(null);
const prevEvolutionTierRef = useRef<"basic" | "aware" | "evolved">("basic");
const evolutionAlertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

**Step 2: Add useEffect to detect tier changes**

After the combo popup useEffect (Task 4), add:

```tsx
// Ghost evolution announcement
useEffect(() => {
  if (state.modifiers.gameMode !== "survival") return;
  const prev = prevEvolutionTierRef.current;
  const curr = state.evolutionTier;
  if (prev !== curr && (curr === "aware" || curr === "evolved")) {
    prevEvolutionTierRef.current = curr;
    setEvolutionAlert(curr);
    if (evolutionAlertTimerRef.current) clearTimeout(evolutionAlertTimerRef.current);
    evolutionAlertTimerRef.current = setTimeout(() => setEvolutionAlert(null), 2500);
  } else {
    prevEvolutionTierRef.current = curr;
  }
}, [state.evolutionTier, state.modifiers.gameMode]);
```

**Step 3: Render the evolution announcement overlay**

After the milestone popup block inside the maze board div, add:

```tsx
{/* Ghost evolution announcement */}
{evolutionAlert && (
  <div
    className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none animate-[overlayIn_0.3s_ease-out]"
    style={evolutionAlert === "evolved" ? { animation: "evolvedFlicker 0.6s ease-out" } : undefined}
  >
    <div
      className="flex flex-col items-center gap-1 px-4 py-3 border"
      style={{
        borderColor: evolutionAlert === "evolved" ? "#ff2d55" : "#ffe600",
        backgroundColor: evolutionAlert === "evolved" ? "#1a000a" : "#1a1a00",
      }}
    >
      <span style={{ fontSize: cellSize * 1.2 }}>
        {evolutionAlert === "evolved" ? "☠️" : "🧠"}
      </span>
      <span
        className="text-[0.55rem] font-bold tracking-wider"
        style={{
          color: evolutionAlert === "evolved" ? "#ff2d55" : "#ffe600",
          textShadow: evolutionAlert === "evolved"
            ? "0 0 10px #ff2d55"
            : "0 0 10px #ffe600",
          fontFamily: "var(--font-pixel), monospace",
        }}
      >
        {evolutionAlert === "evolved" ? "GHOSTS EVOLVED" : "GHOSTS ARE LEARNING"}
      </span>
      <span
        className="text-[0.38rem]"
        style={{ color: evolutionAlert === "evolved" ? "#ff2d5580" : "#ffe60080", fontFamily: "var(--font-pixel), monospace" }}
      >
        {evolutionAlert === "evolved"
          ? "They know exactly where you're going"
          : "They're starting to predict your moves"}
      </span>
    </div>
  </div>
)}
```

**Step 4: Add screenShake to maze when evolved tier triggers**

Find the maze board wrapper div (`className={...relative select-none...}`). The existing condition is `state.status === "dead"`. Extend it:

```tsx
// Before:
className={`relative select-none ${
  state.status === "dead" ? "animate-[screenShake_0.5s_ease-in-out]" : ""
}`}

// After:
className={`relative select-none ${
  state.status === "dead"
    ? "animate-[screenShake_0.5s_ease-in-out]"
    : evolutionAlert === "evolved"
      ? "animate-[screenShake_0.5s_ease-in-out]"
      : ""
}`}
```

**Step 5: Verify in browser**

Play Survival mode until level 3. At level 3, a yellow overlay should appear inside the maze showing "GHOSTS ARE LEARNING" for 2.5s while the game continues. At level 5, a red flicker overlay shows "GHOSTS EVOLVED" with a brief screen shake.

**Step 6: Commit**

```bash
git add src/app/games/pacman/page.tsx
git commit -m "feat(pacman): ghost evolution announcement overlay"
```

---

## Task 6: Combo Milestone Sweep Banner

**Files:**
- Modify: `src/app/games/pacman/page.tsx`

**Step 1: Add banner state and maze flash state**

After the `evolutionAlert` state line, add:

```tsx
interface BannerEntry {
  text: string;
  color: string;
  duration: number; // ms
}
const [activeBanner, setActiveBanner] = useState<BannerEntry | null>(null);
const [mazeFlashing, setMazeFlashing] = useState(false);
const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const prevMilestoneRef = useRef<string | null>(null);
```

**Step 2: Add useEffect to detect new milestones**

After the evolution announcement useEffect, add:

```tsx
// Combo milestone sweep banner
useEffect(() => {
  if (state.modifiers.gameMode !== "survival") return;
  if (!state.milestonePopup || state.milestonePopup === prevMilestoneRef.current) return;
  if (state.milestonePopupTimer <= 0) return;

  prevMilestoneRef.current = state.milestonePopup;

  const bannerMap: Record<string, BannerEntry> = {
    "BLAZING!":      { text: "BLAZING!",      color: "#ffe600", duration: 1500 },
    "UNSTOPPABLE!":  { text: "UNSTOPPABLE!",  color: "#f97316", duration: 1500 },
    "LEGENDARY!":    { text: "LEGENDARY!",    color: "#ff2d55", duration: 2000 },
  };

  const banner = bannerMap[state.milestonePopup];
  if (!banner) return;

  setActiveBanner(banner);
  if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
  bannerTimerRef.current = setTimeout(() => setActiveBanner(null), banner.duration);

  if (state.milestonePopup === "LEGENDARY!") {
    setMazeFlashing(true);
    setTimeout(() => setMazeFlashing(false), 350);
  }
}, [state.milestonePopup, state.milestonePopupTimer, state.modifiers.gameMode]);
```

**Step 3: Reset prevMilestoneRef on game restart**

In the "Start new game" button handler (the `onNewGame` prop on `<GameLayout>`), also reset the ref. Find:

```tsx
onNewGame={() => dispatch({ type: "START", modifiers })}
```

Change to:

```tsx
onNewGame={() => {
  prevMilestoneRef.current = null;
  dispatch({ type: "START", modifiers });
}}
```

**Step 4: Add mazeFlash class to maze board div**

Find the maze board wrapper div. Add the `maze-flash` class conditionally:

```tsx
className={`relative select-none ${
  state.status === "dead"
    ? "animate-[screenShake_0.5s_ease-in-out]"
    : evolutionAlert === "evolved"
      ? "animate-[screenShake_0.5s_ease-in-out]"
      : ""
} ${mazeFlashing ? "maze-flash" : ""}`}
```

**Step 5: Render the sweep banner**

The banner must be rendered **outside** the maze board div to avoid overflow clipping. Place it just after the closing `</div>` of the maze board, still inside the outer `<div className="flex flex-col items-center gap-2">`:

```tsx
{/* Combo milestone sweep banner */}
{activeBanner && (
  <div
    className="pointer-events-none overflow-hidden"
    style={{ width: boardWidth, height: cellSize * 2 }}
  >
    <div
      className="flex items-center justify-center h-full"
      style={{
        animation: `bannerSweep ${activeBanner.duration}ms ease-in-out forwards`,
        color: activeBanner.color,
        textShadow: `0 0 12px ${activeBanner.color}, 0 0 24px ${activeBanner.color}`,
        fontFamily: "var(--font-pixel), monospace",
        fontSize: cellSize * 0.9,
        letterSpacing: "0.1em",
        borderTop: `1px solid ${activeBanner.color}40`,
        borderBottom: `1px solid ${activeBanner.color}40`,
        backgroundColor: `${activeBanner.color}08`,
      }}
    >
      {activeBanner.text}
    </div>
  </div>
)}
```

**Step 6: Remove old milestone popup render from inside the maze board**

Find `{/* Milestone popup */}` block inside the maze board (around line 1002-1012) and **delete it entirely** — it's now replaced by the banner.

**Step 7: Verify in browser**

Play Survival mode and build a combo to 10, 20, and 100. Each milestone should trigger a banner that sweeps across the screen. LEGENDARY should also flash the maze white briefly.

**Step 8: Commit**

```bash
git add src/app/games/pacman/page.tsx
git commit -m "feat(pacman): milestone sweep banner + maze flash for LEGENDARY"
```

---

## Final Check

After all tasks complete:

1. Start game → lands on Survival mode by default
2. Eat a ghost → floating `+200` popup rises from Pac-Man
3. Eat fruit → floating `+100` popup
4. Build combo to 10 → `+10 x10` dots appear, "BLAZING!" sweeps
5. Reach level 3 → "GHOSTS ARE LEARNING" overlay appears mid-game
6. Reach level 5 → "GHOSTS EVOLVED" overlay + screen shake
7. Game over → clean overlay, no mode toggle clutter

```bash
git log --oneline -6
```

Should show 6 commits from this feature.
