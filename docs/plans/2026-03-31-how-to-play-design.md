# How-to-Play Panel — Design Doc

**Date:** 2026-03-31
**Feature:** In-game instructions modal with controls, objectives, scoring, and special mechanics

---

## Overview

Add a consistent, retro-styled help modal to every game in GameStation. The modal shows:
- Game objective
- Controls (keyboard + touch)
- Scoring mechanics
- Special skills / unique mechanics per game

**Trigger mechanism:** Auto-opens on first visit (localStorage flag per game). A persistent `?` button in the GameLayout top bar reopens it anytime.

---

## Architecture

### Approach: `helpContent` + `gameKey` props on `GameLayout`

`GameLayout` owns all modal state and renders the `?` button. Each game page passes its help data as a prop. No game page needs to manage modal open/close state.

```
GameLayout
  props: helpContent?: GameHelp, gameKey?: string
  state: helpOpen (internal)
  ? button -> top bar, right side (next to timer)
  useEffect -> auto-open on first visit via localStorage
  <HelpModal> -> rendered when helpOpen === true
```

---

## Data Types (`src/lib/gameHelp.ts`)

```ts
export interface HelpControl {
  key: string;    // e.g. "Arrow Keys", "Space / Tap", "Right Click"
  action: string; // e.g. "Move", "Jump", "Flag cell"
}

export interface HelpSpecial {
  name: string;   // e.g. "DRIFT BOOST"
  icon: string;   // emoji e.g. "..."
  desc: string;   // short description, 1-2 sentences
}

export interface GameHelp {
  objective: string;
  controls: HelpControl[];
  scoring?: HelpSpecial[];
  specials?: HelpSpecial[];
}
```

---

## Component: `HelpModal` (`src/components/HelpModal.tsx`)

**Visual style:** Consistent with existing win/lose overlays.

- Overlay: `fixed inset-0 z-50 flex items-center justify-center`
- Backdrop: `absolute inset-0 bg-dark-bg/80 backdrop-blur-sm` — click to close
- Card: `relative w-[92vw] max-w-md max-h-[82vh] overflow-y-auto border border-{color}/40 p-4 flex flex-col gap-4 bg-[#0d0d1a]`
- Font: Press Start 2P throughout

**Sections (in order):**

1. **Header** — "HOW TO PLAY" title, close button top-right (X)
2. **OBJECTIVE** — single paragraph, `text-[0.5rem] text-gray-300 leading-relaxed`
3. **CONTROLS** — 2-col table: key pill (neon color border) | action label
4. **SCORING** (optional) — list of HelpSpecial items with icon + name + desc
5. **SPECIAL MECHANICS** (optional) — same format as scoring

**Key pill style:** `inline-block px-1.5 py-0.5 border border-{color}/60 text-{color} text-[0.45rem]`

**Section headers:** `text-[0.45rem] text-gray-500 uppercase tracking-widest border-b border-{color}/20 pb-1`

---

## `GameLayout` Changes

### New props
```ts
helpContent?: GameHelp;
gameKey?: string; // localStorage key: `gamestation-{gameKey}-help-seen`
```

### Top bar layout (revised)
```
[<- BACK]    [TITLE]    [TIMER  ?]
```
Right slot becomes a flex row: timer display + small `?` button side by side.

### Auto-open logic
```tsx
useEffect(() => {
  if (!helpContent || !gameKey) return;
  const key = `gamestation-${gameKey}-help-seen`;
  if (!localStorage.getItem(key)) {
    setHelpOpen(true);
    localStorage.setItem(key, "1");
  }
}, []);
```

---

## Per-Game Help Content

### Minesweeper — "Dungeon Explorer" (green)
- **Objective:** Reveal all safe cells without triggering a mine. Use number clues to deduce mine locations.
- **Controls:** Click=Reveal, Right-click/Long-press=Flag, Middle-click/Double-tap=Chord
- **Specials:**
  - CHORD CLICK — Click a revealed number when adjacent flags equal the number to auto-reveal remaining neighbors
  - FLAG MODE — Toggle on mobile to switch between reveal and flag tap
  - DIFFICULTY — Easy/Medium/Hard changes grid size and mine density

### 2048 — "Pixel Monsters" (pink)
- **Objective:** Slide tiles to merge matching numbers. Reach 2048 to win, but keep going for higher scores!
- **Controls:** Arrow Keys / Swipe to slide all tiles
- **Specials:**
  - EVOLUTION — Tiles evolve into pixel monsters at power-of-2 milestones
  - MERGE SCORING — Each merge scores the resulting tile value

### Sudoku — "Rune Puzzle" (blue)
- **Objective:** Fill every row, column, and 3x3 box with each rune exactly once.
- **Controls:** Click cell then click rune or press 1-9. Backspace to clear.
- **Specials:**
  - HINTS — Limited hints reveal a correct cell
  - AUTO-CHECK — Wrong placements highlighted in real time

### Memory Match — "Pixel Bestiary" (yellow)
- **Objective:** Flip cards to find matching pairs. Match all pairs before time runs out.
- **Controls:** Click / Tap to flip cards
- **Specials:**
  - COMBO — Consecutive matches multiply your score
  - TIME BONUS — Faster matches earn bonus points

### Tetris (blue)
- **Objective:** Clear horizontal lines by filling them completely. Survive as long as possible.
- **Controls:** Left/Right=Move, Up/Z=Rotate, Down=Soft drop, Space=Hard drop
- **Specials:**
  - TETRIS — Clear 4 lines at once for massive bonus
  - GHOST PIECE — Shows where the piece will land
  - SPEED — Game speeds up every 10 lines cleared

### Snake (green)
- **Objective:** Eat food to grow your snake. Don't hit walls or yourself!
- **Controls:** Arrow Keys / WASD / Swipe to change direction
- **Specials:**
  - SPEED RAMP — Snake gets faster as it grows
  - FOOD SCORING — Each food scores based on current speed tier

### Flappy (yellow)
- **Objective:** Fly through pipes without crashing. Each pipe passed scores 1 point.
- **Controls:** Space / Click / Tap to flap
- **Specials:**
  - SHRINKING GAPS — Pipe gaps narrow the longer you survive
  - HIGH SCORE — Personal best saved automatically

### Runner (orange)
- **Objective:** Run as far as possible jumping over obstacles. Score increases with distance.
- **Controls:** Space / Click / Tap to jump; double-tap for double jump
- **Specials:**
  - WORLDS — Different themes unlock as you progress
  - FLYING OBSTACLES — Some obstacles fly at mid-height — time your jump carefully
  - SPEED RAMP — Game accelerates over time

### Space Raid (blue)
- **Objective:** Shoot down alien waves and defeat bosses before they reach the bottom.
- **Controls:** Left/Right / A D to move, Space to shoot
- **Specials:**
  - RAPID FIRE — Power-up that shoots faster
  - SHIELD — Blocks one hit
  - BOMB — Clears all bullets on screen
  - BOSS WAVES — Every few waves: Spreader, Summoner, or Sniper bosses with unique patterns
  - ALIEN TYPES — Zigzag, Kamikaze-dive, and Shielded aliens require different tactics

### Pixel Drift (orange)
- **Objective:** Race or set the fastest lap time. Use drifting and boost to gain an edge.
- **Controls:** Up/W=Accelerate, Down/S=Brake, Left/Right/A/D=Steer
- **Specials:**
  - DRIFT — Hold a turn while accelerating to fill the boost bar
  - BOOST — Boost bar depletes for a speed surge; refill by drifting again
  - GHOST REPLAY — Time Attack records your best lap as a ghost to race against
  - GAME MODES — Race vs AI (score by finish position) or Time Attack (fastest lap)

### Pixel Chomp / Pacman (orange)
- **Objective:** Eat all dots to clear the maze. Avoid ghosts unless powered up!
- **Controls:** Arrow Keys / WASD / Swipe to move
- **Specials:**
  - POWER PELLET — Turns ghosts vulnerable; eat them for big bonus points
  - COMBO KILL — Eating multiple ghosts in one power session multiplies score (200->400->800->1600)
  - FOG OF WAR — Optional setting: visibility is limited, use sound cues to detect ghosts
  - FRUIT BONUS — Fruit appears periodically in the maze center for bonus points; changes each level

---

## Files Changed / Created

| File | Change |
|------|--------|
| `src/lib/gameHelp.ts` | New — TypeScript interfaces |
| `src/components/HelpModal.tsx` | New — modal component |
| `src/components/GameLayout.tsx` | Add helpContent, gameKey props + ? button + auto-open |
| `src/app/games/minesweeper/page.tsx` | Add helpContent + gameKey |
| `src/app/games/2048/page.tsx` | Add helpContent + gameKey |
| `src/app/games/sudoku/page.tsx` | Add helpContent + gameKey |
| `src/app/games/memory-match/page.tsx` | Add helpContent + gameKey |
| `src/app/games/tetris/page.tsx` | Add helpContent + gameKey |
| `src/app/games/snake/page.tsx` | Add helpContent + gameKey |
| `src/app/games/flappy/page.tsx` | Add helpContent + gameKey |
| `src/app/games/runner/page.tsx` | Add helpContent + gameKey |
| `src/app/games/space/page.tsx` | Add helpContent + gameKey (custom layout — inject HelpModal directly) |
| `src/app/games/drift/page.tsx` | Add helpContent + gameKey |
| `src/app/games/pacman/page.tsx` | Add helpContent + gameKey |

---

## Edge Cases

- **Space + Runner**: These use custom layouts (not GameLayout). HelpModal injected directly into those pages with their own helpOpen state.
- **Drift**: Help accessible from menu phase; GameLayout wraps the playing phase so ? button appears there too.
- **Mobile**: Modal card is `max-h-[82vh] overflow-y-auto` — scrollable for long content.
- **SSR safety**: localStorage access guarded with `typeof window !== 'undefined'`.
