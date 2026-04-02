# Tetris Enhancement Design — 2026-04-02

## Goal
Enhance Block Storm (Tetris) with visual spectacle + gameplay depth for video content. Ship everything in one session.

## Approach
Parallel layers: config.ts → logic.ts → page.tsx in one sweep.

---

## Section 1: Events (7 total)

| Event | Type | Effect |
|---|---|---|
| ⚡ LIGHTNING STRIKE | Good | Clears 1 random filled row |
| ❄️ ICE FREEZE | Good | Pauses auto-drop for 3s |
| 🔥 FEVER TIME | Good | 2x score for 30s |
| 💣 BOMB BLAST | Bad | FIXED — adds 2 garbage rows from bottom, each with 1 random gap |
| 🌪️ WHIRLWIND | Chaos | Shifts every locked cell left or right by 1-2 randomly |
| ⭐ OVERDRIVE | Risk/Reward | Pieces fall 2x faster, score 3x for 15s |
| 💀 CURSE | Bad | Adds 3 garbage rows from bottom |

Trigger: every 5 lines cleared, 1 random event fires.

---

## Section 2: Gameplay Mechanics

### Combo System
Consecutive drops that clear >= 1 line increment combo counter. Resets on no-clear lock.

| Combo | Bonus |
|---|---|
| 1 | +50 |
| 2 | +100 |
| 3 | +200 |
| 4+ | +400 |

### Back-to-Back Bonus
If previous clear was Tetris/T-Spin AND current clear is also Tetris/T-Spin: 1.5x score multiplier.
Banner: "BACK TO BACK!"

### T-Spin Detection
After T-piece locks via rotation: check 3/4 corner cells occupied = T-Spin confirmed.

| T-Spin | Lines | Score |
|---|---|---|
| T-Spin Mini | 1 | +400 |
| T-Spin Single | 1 | +800 |
| T-Spin Double | 2 | +1200 |
| T-Spin Triple | 3 | +1600 |

### State Additions (TetrisState)
```ts
combo: number
lastClearWasTetrisOrTSpin: boolean
tSpinType: "none" | "mini" | "full"
overdriveActive: boolean  // OVERDRIVE event speed multiplier flag
```

### Config Additions
- Add OVERDRIVE, WHIRLWIND, CURSE to EventType
- OVERDRIVE_SPEED_MULT = 2, OVERDRIVE_SCORE_MULT = 3, OVERDRIVE_DURATION = 15000
- COMBO_BONUSES = [0, 50, 100, 200, 400]
- TSPIN_SCORES = { mini: 400, single: 800, double: 1200, triple: 1600 }
- BACK_TO_BACK_MULT = 1.5

---

## Section 3: Visual Effects

### Line Clear Flash
Rows flash white (150ms) before disappearing. Board pauses piece spawn during flash.
Visual-only: handled in page.tsx with `clearingRows: number[]` state.

### Particles
On line clear: 4-6 pixel particles per cell, fly outward with gravity, fade out.
Tetris = bigger burst. Stored in `particles: Particle[]` page state.

### Screen Shake
Implemented via CSS transform on board wrapper.

| Trigger | Intensity | Duration |
|---|---|---|
| Hard drop | 3px | 150ms |
| Line clear 1-3 | 4px | 200ms |
| Tetris / T-Spin | 8px | 300ms |
| Game over | 12px | 500ms |
| Bomb / Curse | 10px | 400ms |

### Event Visual Overlays
| Event | Overlay |
|---|---|
| Fever | Orange/red vignette on board edges + fire particles rising |
| Freeze | Blue frost vignette + board tinted ice-blue |
| Lightning | Yellow full-screen flash (100ms) on trigger |
| Bomb | Red screen flash + heavy shake on trigger |
| Whirlwind | Board CSS skew/warp briefly |
| Overdrive | Purple neon pulse on board border |
| Curse | Dark red vignette creeping from bottom |

### Storm Intensity (level-based)
- Level 10+: Lightning crack decorations on board edges (CSS animated)
- Level 15+: Board border flickers/glitches
- Level 20+: Occasional full-screen lightning flash ~every 10s

### Score & Combo Popups (page state only)
- Floating `+800` text rises from cleared row position, fades out
- `COMBO x3` popup appears center-board, fades
- `T-SPIN!` / `BACK TO BACK!` banners reuse existing event banner style

---

## Files to Modify
1. `src/games/tetris/config.ts` — add new EventTypes, new constants
2. `src/games/tetris/logic.ts` — add combo, back-to-back, T-spin, new event effects
3. `src/app/games/tetris/page.tsx` — add all visual effects, overlays, popups, particles, shake
