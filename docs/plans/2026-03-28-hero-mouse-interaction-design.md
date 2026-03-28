# Hero Mouse Interaction — Design Doc

**Date:** 2026-03-28
**Status:** Approved

## Goal

Make the landing page hero section interactive and captivating via mouse cursor effects — custom pixel cursor, emoji scatter with spring physics, and neon particle trail.

## Scope

- `src/app/page.tsx` — hero section mouse logic
- `src/app/globals.css` — add `particleFade` keyframe
- Desktop only (touch/mobile: disabled)
- No new dependencies

## Components

### 1. Custom Pixel Cursor

- `cursor: none` on hero section
- Fixed `<div>` (16×16px green crosshair) follows mouse via `transform: translate(x, y)`
- Uses `useRef` + direct DOM style updates — no re-renders

### 2. Emoji Scatter (Spring Physics)

Each of the 6 floating emojis has: `home` (%, converted to px), `pos` (current px), `vel` (velocity).

Per `requestAnimationFrame`:
1. If `dist(cursor, emoji) < 130px` → repel force proportional to `1/dist`
2. Spring back to home: `F = (home - pos) * 0.08`
3. Damping: `vel *= 0.85`
4. `pos += vel` → apply via `element.style.transform`

### 3. Particle Trail

- Throttle: 1 particle per 40ms on `mousemove`
- Each particle: 3–5px div, random neon color (green/pink/yellow), random ±offset
- CSS `particleFade` keyframe: opacity 1→0 + translateY(-8px), 500ms
- Auto-remove on `animationend`
- Cap: max 25 particles alive at once

## Non-goals

- Canvas rendering (div-based is sufficient)
- Mobile support (disabled on touch screens)
- Physics interactions between emojis
