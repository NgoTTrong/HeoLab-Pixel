# Runner Visual Polish + Speed Rebalance — Design

**Date:** 2026-03-28
**Status:** Approved
**Scope:** `src/games/runner/config.ts`, `src/app/games/runner/page.tsx`

---

## Problem

- Start speed (5 px/frame) is too high — players die before learning mechanics
- Emoji characters/obstacles have zero contrast against light desert sky (#87CEEB)
- World transitions are instant (jarring color cuts)
- Flat sky fills look bland and have scan-line artifacts at scale

---

## Solution Overview

Seven targeted improvements, all within the existing canvas + React architecture. No new files needed. Config changes in `config.ts`, visual/rendering changes in `page.tsx`.

---

## 1. Speed Curve

**File:** `config.ts`

| | Before | After |
|---|---|---|
| BASE_SPEED | 5 | 3 |
| Formula | `5 + score/300` | `3 + score/600` |
| MAX_SPEED | 12 | 12 |
| Hits MAX at score | ~2100 | ~5400 |

Much more forgiving ramp. Advanced worlds still feel fast.

---

## 2. Emoji Shadow (Visual Clarity)

**File:** `page.tsx` — every emoji draw call

Wrap all emoji renders with:
```ts
ctx.shadowBlur = 10;
ctx.shadowColor = "rgba(0,0,0,0.85)";
// draw emoji
ctx.shadowBlur = 0;
```

Applies to: character, obstacles, dead-state character.

---

## 3. Gradient Sky

**File:** `config.ts` — add `skyColorBottom` to `World` interface
**File:** `page.tsx` — replace flat `fillRect` with `createLinearGradient`

Each world gets two sky stops:
- Desert: `#87CEEB` → `#c8eaf9`
- Dusk: `#c0392b` → `#f39c12`
- Night Storm: `#0d0d1a` → `#1a1a2e`
- Lava: `#1a0500` → `#3d0a00`

---

## 4. Smooth World Transitions

**File:** `page.tsx` — `gameRef` + `draw()`

Fields added to `gameRef`:
```ts
fromSkyTop: string, fromSkyBot: string, fromGround: string,
toSkyTop: string,   toSkyBot: string,   toGround: string,
transitionT: number,  // 0→1
lastWorldId: string,
```

Helper: `lerpColor(a: string, b: string, t: number): string` — parses hex, lerps each channel, returns hex.

On each frame: if `transitionT < 1`, increment by `1/120` (~2s). Blend all three color pairs. Sky gradient uses lerped stops; ground uses lerped color.

---

## 5. Parallax Clouds

**File:** `page.tsx` — `gameRef.clouds[]` + `draw()`

```ts
interface Cloud { x: number; y: number; r: number; speed: number; }
```

- 4 clouds initialized with random x (0–W), y (20–120), r (20–45), speed (0.2–0.35 of groundSpeed)
- Draw: 3 overlapping filled circles per cloud, white, `globalAlpha` = `0.55 * cloudAlpha`
- `cloudAlpha`: 1.0 in Desert/Dusk, lerp down to 0.1 in Night Storm/Lava (via `transitionT`)
- Wrap: when `cloud.x + cloud.r < 0`, reset to `x = W + cloud.r`

---

## 6. Stars

**File:** `page.tsx` — `gameRef.stars[]` + `draw()`

```ts
interface Star { x: number; y: number; phase: number; }
```

- 40 stars with random positions (top 70% of sky area) and random phase (0–2π)
- Draw only when `worldId` is `"storm"` or `"lava"`, fading in with `transitionT`
- Per-star opacity: `0.4 + 0.4 * Math.sin(g.frame * 0.05 + star.phase)`
- Size: 1.5px white `fillRect`

---

## 7. Ground Visual Upgrade

**File:** `config.ts` — add `groundStripeColor` to `World`
**File:** `page.tsx` — replace simple ground fill with two-band fill + detail

Ground structure:
1. Main fill (existing `groundColor`)
2. Top stripe (3px, `groundStripeColor`) — lighter band at ground edge
3. Existing detail lines kept, stroke color tuned per world

Per world:
- Desert: stripe `#d4a96a` (light sand)
- Dusk: stripe `#8d6e63`
- Night Storm: stripe `#3a3a5a`
- Lava: stripe `#7f1d1d` with orange crack lines (`#f97316`, 3 diagonal strokes per tile)

---

## Files Changed

| File | Changes |
|---|---|
| `src/games/runner/config.ts` | `BASE_SPEED` 5→3, add `skyColorBottom` + `groundStripeColor` to World interface and data |
| `src/app/games/runner/page.tsx` | Gradient sky, lerp transitions, clouds, stars, shadow on emojis, ground detail, speed formula |

---

## Out of Scope

- No new assets or image files
- No changes to obstacle/character data
- No changes to audio
- No changes to scoring or game mechanics
