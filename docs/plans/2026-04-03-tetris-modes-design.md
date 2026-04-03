# Tetris 3-Mode Design

## Overview

Split the current "Block Storm" Tetris game into 3 selectable modes on the idle screen. A single page, single reducer, `mode` field in state.

## Modes

### Classic
- Standard Tetris: combo, T-spin, back-to-back, streak counter
- No random events
- Standard `LEVEL_SPEEDS`
- Standard 7-bag piece randomizer
- Sidebar shows `STREAK` (consecutive clears, resets on empty drop)
- High score key: `tetris-classic`
- Theme color: blue

### Zen
- Combo-focused, easier, satisfying feel
- No random events
- `ZEN_LEVEL_SPEEDS` — ~30% slower than standard
- Weighted bag: I/O/L/J weighted higher, S/Z lower (`createWeightedBag()` in tetrominoes.ts)
- Rainbow active piece color: shifts hue based on combo count (combo 0 = original color, combo 3+ = hue cycling)
- Slow-motion on multi-line clear (2+ lines): tick interval temporarily 2x slower for 400ms
- Particles: size x1.5, count x1.5, higher velocity
- Game over still exists
- High score key: `tetris-zen`
- Theme color: green

### Storm (current)
- All random events: lightning, bomb, freeze, fever, whirlwind, overdrive, curse
- Standard `LEVEL_SPEEDS`
- Standard 7-bag
- All existing visuals and effects unchanged
- High score key: `tetris` (unchanged, preserves existing scores)
- Theme color: pink

## Architecture

### State change
```ts
// TetrisState gains:
mode: "classic" | "zen" | "storm";

// START action gains:
{ type: "START"; mode: GameMode }
```

### Logic branching (logic.ts)
1. Event trigger: only fires when `mode === "storm"`
2. Speed lookup: Zen uses `ZEN_LEVEL_SPEEDS`, others use `LEVEL_SPEEDS`
3. Bag creation: Zen calls `createWeightedBag()`, others call `createBag()`

### Config additions (config.ts)
- `export type GameMode = "classic" | "zen" | "storm"`
- `ZEN_LEVEL_SPEEDS` — slower speed table
- `ZEN_PIECE_WEIGHTS` — weight map per piece type

### Tetrominoes additions (tetrominoes.ts)
- `createWeightedBag(weights)` — generates a bag respecting weights

### Page changes (page.tsx)
- `selectedMode` React state (default null)
- Idle overlay: step 1 = 3 mode cards, step 2 = PLAY button after selection
- Pass mode to `START` dispatch
- Zen: rainbow color computed from combo, `slowMo` ref for tick override, larger particles
- Classic: streak counter in sidebar
- High score key switches based on mode

## UI — Mode Selector

Two-step idle overlay:

**Step 1 — Pick mode:**
```
[CLASSIC]   [ZEN]   [STORM]
 blue        green    pink
```

**Step 2 — Confirm (after pick):**
- Mode name + short description
- PLAY button
- Back link to re-pick

## Scoring

| Feature          | Classic | Zen | Storm |
|------------------|---------|-----|-------|
| Line scores      | yes     | yes | yes   |
| Combo bonus      | yes     | yes | yes   |
| T-Spin           | yes     | yes | yes   |
| Back-to-back     | yes     | yes | yes   |
| Fever 2x mult    | no      | no  | yes   |
| Overdrive 3x mult| no      | no  | yes   |
| Streak counter   | yes     | no  | no    |
| Hard drop bonus  | yes     | yes | yes   |
