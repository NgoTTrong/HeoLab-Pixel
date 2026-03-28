# 2048 Milestone Effects & Combo Merges — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to implement this design.

**Goal:** Enhance Monster 2048 with in-board milestone celebrations when tiles reach 512/1024/2048/4096+ and a chain combo bonus system for multi-merges in a single swipe.

**Architecture:** Approach C — CSS tiles + floating DOM text. Extend existing Tile/Grid/page components. No canvas, no popups. No changes to logic.ts or types.ts.

---

## Feature 1: Milestone Visual Effects (In-Board)

### Milestone Definitions

Add to `src/games/2048/constants.ts`:

```ts
export const MILESTONES: Record<number, { name: string; color: string; emoji: string }> = {
  512:  { name: "WYRM",    color: "#39ff14", emoji: "✨" },
  1024: { name: "WYVERN",  color: "#ffe600", emoji: "🔥" },
  2048: { name: "DRAGON",  color: "#ff2d95", emoji: "🐉" },
  4096: { name: "ANCIENT", color: "#00d4ff", emoji: "⭐" },
};
// Values >= 4096 all use the 4096 milestone entry
```

### Three In-Board Effect Layers

**① Tile animation — `tile-milestone` CSS class**

Applied in `Tile.tsx` when `tile.isMerged && tile.value >= 512` instead of the regular `tile-merge` class.

CSS keyframe (in `globals.css`):
```css
@keyframes tileMilestone {
  0%   { transform: scale(0.8); }
  30%  { transform: scale(1.4); }
  70%  { transform: scale(0.95); }
  100% { transform: scale(1); }
}
.tile-milestone { animation: tileMilestone 0.5s ease-out both; }
```

Tile also gets an inline `boxShadow` with the milestone color, e.g.:
`boxShadow: "0 0 24px 8px #ff2d95"` for DRAGON (2048).

**② Floating monster name — DOM floaters**

`Grid.tsx` maintains:
```ts
interface Floater {
  id: number;
  text: string;    // e.g. "🐉 DRAGON!"
  color: string;   // milestone color
  x: number;       // pixel left (center of tile)
  y: number;       // pixel top (center of tile)
  size: "normal" | "large";
}
const [floaters, setFloaters] = useState<Floater[]>([]);
```

Rendered as absolute `<div>` elements inside the grid container, with `onAnimationEnd` cleanup.

CSS keyframe:
```css
@keyframes floatUpFade {
  0%   { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-40px) scale(0.8); opacity: 0; }
}
.floater { animation: floatUpFade 1.2s ease-out forwards; }
```

**③ Grid flash overlay**

`Grid.tsx` maintains `flashColor: string | null`. When set, renders:
```tsx
<div
  className="absolute inset-0 pointer-events-none rounded-sm"
  style={{ background: flashColor ?? "transparent", opacity: 0.15 }}
  onAnimationEnd={() => setFlashColor(null)}
/>
```
With a `gridFlash` CSS animation: opacity 0.15 → 0 over 400ms.

### Triggering from page.tsx

After each `move()`, scan the new grid for milestone tiles:
```ts
newState.grid.flat().forEach(tile => {
  if (!tile || !tile.isMerged) return;
  const ms = MILESTONES[tile.value] ?? (tile.value > 4096 ? MILESTONES[4096] : null);
  if (ms) {
    gridRef.current?.triggerMilestone(tile.value, tile.col, tile.row);
  }
});
```

`Grid` exposes `triggerMilestone` via `useImperativeHandle` on a `forwardRef`.

---

## Feature 2: Combo Merges (Chain Detection + Bonus)

### Chain Detection

After each `move()` in `page.tsx`:
```ts
const mergedCount = newState.grid.flat().filter(t => t?.isMerged).length;
```

### Bonus Score Table

| Merges | Bonus | Label |
|--------|-------|-------|
| 1 | +0 | — |
| 2 | +50 | "2× CHAIN!" |
| 3 | +150 | "3× CHAIN!" |
| 4+ | +300 | "MEGA CHAIN!" |

### Score Tracking

- `state.score` — base score from logic.ts (unchanged)
- `bonusScore: number` — React state in page.tsx
- Display: `state.score + bonusScore`
- Reset `bonusScore` to 0 on new game

### Chain Floater

When `mergedCount >= 2`, call `gridRef.current?.triggerChain(mergedCount)`.

Grid renders a chain floater at grid center:
- Text: `"+50 CHAIN!"` or `"MEGA CHAIN!"`
- Color: neon yellow `#ffe600`
- Size: `"large"` (bigger than milestone floaters)
- Same `floatUpFade` animation but scale 1.3→0.8

For MEGA CHAIN (4+), also trigger a rainbow grid flash:
```css
@keyframes rainbowFlash {
  0%   { filter: hue-rotate(0deg); opacity: 0.2; }
  50%  { filter: hue-rotate(180deg); opacity: 0.2; }
  100% { filter: hue-rotate(360deg); opacity: 0; }
}
```

---

## Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/games/2048/constants.ts` | MODIFY | Add `MILESTONES` map |
| `src/games/2048/Tile.tsx` | MODIFY | `tile-milestone` class + inline glow when `isMerged && value >= 512` |
| `src/games/2048/Grid.tsx` | MODIFY | `floaters` state, `flashColor` state, `forwardRef` + `useImperativeHandle` exposing `triggerMilestone` and `triggerChain` |
| `src/app/games/2048/page.tsx` | MODIFY | Scan for milestones + chain after each move, add `bonusScore` state, update score display |
| `src/app/globals.css` | MODIFY | Add `tileMilestone`, `floatUpFade`, `gridFlash`, `rainbowFlash` keyframes + `.tile-milestone`, `.floater` classes |

**Unchanged:** `logic.ts`, `types.ts`, `useGame.ts` (if any)
