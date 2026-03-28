# Snake (Neon Serpent) — Fix & Enhance Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to implement this design.

**Goal:** Fix x2 power-up layout bug, redesign snake head/tail/food visuals, add bomb obstacle mechanic.

**Architecture:** All changes in `src/games/snake/config.ts`, `src/games/snake/logic.ts`, and `src/app/games/snake/page.tsx`. No new files needed.

---

## Bug Fix: ×2 Power-Up Layout

**Problem:** `emoji: "×2"` in `config.ts` is a text string, not an emoji. When rendered inside a tiny 1fr grid cell with `fontSize: "0.5rem"`, the "×2" text overflows the cell and breaks layout.

**Fix:** Change `emoji: "×2"` → `emoji: "💰"` in `POWER_UPS` array in `config.ts`.

Also fix the display label in `page.tsx` which currently reads:
```tsx
{activePowerUpDef.type === "scoreDouble"
  ? `×2 ×${state.activePowerUp?.scoreDoubleRemaining}`
  : activePowerUpDef.type.toUpperCase()}
```
Keep this logic — it shows "×2 ×N" remaining count in the HUD indicator, which is fine since that's outside the grid.

---

## Visual Redesign

### Snake Head
In `page.tsx`, the head cell currently renders as a solid color square. Enhance:
- `borderRadius: "4px"` (already slightly rounded — keep)
- Add "eyes": 2 small white `2×2px` dots positioned based on `state.direction`:
  - `RIGHT` → dots at top-right and bottom-right of cell
  - `LEFT` → dots at top-left and bottom-left
  - `UP` → dots at top-left and top-right
  - `DOWN` → dots at bottom-left and bottom-right

Implementation: render the head cell as `position: relative`, add 2 absolute `<span>` dots inside.

Cell size = `calc(100% / GRID_SIZE)` = `calc(100% / 20)` = 5% of container.
With container `min(90vw, 90vh, 500px)` ≈ 500px → cell ≈ 25px.
Eye dots: `2px × 2px`, white, `position: absolute`.

### Snake Tail
The last segment (tail tip) renders slightly smaller: add `transform: scale(0.6)` when `segIdx === state.snake.length - 1`.

### Food
Replace solid pink square with emoji `🍎`:
```tsx
// Instead of backgroundColor for food:
{isFood ? (
  <span style={{ fontSize: "calc(100% / 20 * 0.7)", lineHeight: 1 }}
        className="animate-pulse">🍎</span>
) : ...}
```

Or more practically, use inline style: `fontSize: "70%"` inside the cell div.

---

## New Feature: Bomb Obstacle 💣

### State additions in `logic.ts`

Add to game state:
```ts
bomb: { pos: { x: number; y: number }; spawnedAt: number } | null;
```

### Spawn logic (in `TICK` handler after food eaten)
- Only if `score >= 5`
- 15% chance: `Math.random() < 0.15`
- Only 1 bomb at a time: `if (!state.bomb)`
- Choose random position not occupied by snake, food, or power-up
- Set `bomb = { pos: randomPos, spawnedAt: Date.now() }`

### Expiry logic (in `TICK` handler each frame)
- If `bomb` exists and `Date.now() - bomb.spawnedAt > 6000` → set `bomb = null`

### Collision (in `TICK` handler, head movement)
- If new head position === bomb position → `status = "dead"`

### Rendering in `page.tsx`
- Check `state.bomb?.pos.x === x && state.bomb?.pos.y === y`
- If bomb cell: render `💣` emoji
- **Blink effect**: If `Date.now() - state.bomb.spawnedAt > 4000` (last 2 seconds), add CSS class `animate-pulse` to make it blink

### Config addition
Add to `config.ts`:
```ts
export const BOMB_SCORE_THRESHOLD = 5;
export const BOMB_SPAWN_CHANCE = 0.15;
export const BOMB_LIFETIME_MS = 6000;
export const BOMB_BLINK_MS = 4000; // start blinking at 4s
```

---

## Files

| File | Action |
|------|--------|
| `src/games/snake/config.ts` | Fix `emoji: "×2"` → `"💰"`, add bomb constants |
| `src/games/snake/logic.ts` | Add `bomb` to state, spawn/expiry/collision logic |
| `src/app/games/snake/page.tsx` | Head eyes, tail scale, food emoji, bomb rendering + blink |
