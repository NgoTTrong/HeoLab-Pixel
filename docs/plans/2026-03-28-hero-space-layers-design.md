# Hero Space Layers — Design Doc

**Date:** 2026-03-28
**Status:** Approved

## Goal

Add 3 animated space layers to the hero section: slow-drifting planets (CSS), flying meteors (JS/RAF), and a mini space battle with lasers (JS/RAF). Desktop only.

## Scope

- `src/app/globals.css` — add `planetDrift` keyframe
- `src/app/page.tsx` — add space layer data, refs, and RAF logic

## Layer 1: Planets (CSS-driven)

- 2 planets: 🪐 top-right (~85%, 8%), 🌍 bottom-left (~10%, 78%)
- Size: `text-6xl`, opacity: `0.12`
- Animation: `planetDrift` keyframe, 60s alternate infinite, biên độ ±20px Y ±10px X
- No JS needed

## Layer 2: Meteors (JS/RAF)

- 5 meteors: ☄️ emoji
- Each has: `x, y, vx, vy, speed` — starts at a random screen edge
- Per frame: `x += vx`, `y += vy`, apply `transform + rotate(angle)`
- When off-screen: respawn at new random edge position with new angle
- Respawn logic: pick random edge (top/right/left), aim toward opposite quadrant ±30° jitter
- All managed inside existing `useEffect` RAF tick

## Layer 3: Space Battle (JS/RAF)

- 3 ships: 🚀, each following a parametric path (sin/cos orbital)
- Each ship: `{ cx, cy, radius, speed, angle, element }` — orbital center + current angle
- Per frame: `angle += speed`, `x = cx + cos(angle)*rx`, `y = cy + sin(angle)*ry` (elliptical)
- Ship `rotate` matches tangent direction of orbit
- Laser system:
  - Each ship has `laserCooldown` counter (random 2–4s between shots)
  - On fire: spawn a `<div>` laser (2×24px neon color, rotated in ship's travel direction)
  - Laser travels forward at high speed, removed when off-screen or after 1s
- Max 6 lasers alive at once

## Non-goals

- Hit detection / damage system
- Mobile support
- Collision between meteors and ships
