# Pixel Drift — Full Polish Design

**Date:** 2026-03-31
**Scope:** Full arcade polish pass — car sprite, drift mechanics, visual effects, AI, HUD, road/scenery

---

## 1. Car Sprite Redesign

**Style:** Cyber racing, rear 3/4 perspective (matching pseudo-3D road renderer).

**Structure:**
```
       ╔════════╗        ← cabin/roof (dark tinted windows)
      ╔══════════════╗   ← main body (trapezoidal, wider at bottom)
      ║  [SPOILER]   ║   ← thin spoiler bar above rear
      ╠══════════════╣
  [●] ║   ████████   ║ [●]  ← rear wheels (protruding sides)
      ╚══════════════╝
    ══════════════════    ← neon underglow strip
```

**Underglow color = drift charge level feedback:**
- No drift → car accent color, dim
- Level 1 (0–2s) → white, bright
- Level 2 (2–4s) → yellow, pulsing
- Level 3 (4s+) → orange-red, intense flicker

**Per-car proportions (recognizable silhouettes):**
| Car | Body ratio | Distinguishing feature |
|---|---|---|
| Neon Striker | Standard | Medium profile |
| Drift Phantom | Low & wide | Widest spoiler |
| Thunder Bolt | Tall & narrow | Tallest cabin |
| Pixel Tank | Very wide & low | Bulky rear |
| Ghost Racer | Sleek & long | Smallest cabin |

**Implementation:** Rewrite `sprites.ts` `drawCar()` using layered canvas draws — underglow glow shadow first, then body, cabin, spoiler, wheels, taillights.

---

## 2. Drift Mechanics Fix

### Bug Fix
Remove `steerDir === 0` guard from `DRIFT_START`. Drift activates whenever Space is pressed and speed > 20% max. Direction = current steerDir, or last steer direction if currently 0 (tracked via `lastSteerDir` in state).

### Rebalanced Numbers

| Constant | Old | New |
|---|---|---|
| Drift boost L1 | 1.3× / 500ms | 1.4× / 1000ms |
| Drift boost L2 | 1.6× / 1000ms | 1.7× / 1800ms |
| Drift boost L3 | 2.0× / 1500ms | 2.2× / 2800ms |
| Nitro power-up | 1.5× / 500ms | 1.8× / 2500ms |

### Screen Feedback on Boost Release
- Level 1 → small white "BOOST!" flash
- Level 2 → yellow flash + light camera shake
- Level 3 → large orange-red "MAX BOOST!" + strong shake

Implemented via refs in `DriftCanvas.tsx` — `boostFlashRef` (opacity, color, text, duration) and `shakeRef` (magnitude, remainingMs).

---

## 3. Visual Effects System (Particle Refs)

All effects stored in React refs — no game state, no re-renders.

### Skid Marks (`skidMarksRef`)
```ts
type SkidMark = { x: number; y: number; w: number; alpha: number }
```
- Spawn each frame at both rear wheel screen positions while drifting
- Alpha starts 0.6, decreases by 0.003/frame (~2s fade at 60fps)
- Max 200 marks; oldest removed when full
- Color: dark grey/brown, 2px height, width = car width at that scale

### Smoke Particles (`smokeParticlesRef`)
```ts
type SmokeParticle = { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }
```
- Spawn 4–6/frame at rear wheel positions while drifting
- Velocity: spread sideways + upward
- Size grows over lifetime; alpha fades to 0 in ~40 frames
- Color: white (L1) → yellow (L2) → orange-red (L3)
- Max 150 particles

### Speed Lines (`speedLinesRef`)
```ts
type SpeedLine = { angle: number; length: number; x: number; y: number }
```
- 24 lines generated once on boost start, evenly spaced radially
- Drawn from screen edges converging toward horizon point (center, 40% height)
- Opacity = `boost.remainingMs / totalBoostMs`
- Color = track rumble color

### Draw Order
```
sky → parallax/scenery → road → skid marks → powerups/oil →
AI cars → ghost car → player car → smoke → speed lines → HUD
```

---

## 4. Tiered AI

| | Weak (index 0) | Medium (index 1) | Strong (index 2) |
|---|---|---|---|
| Base speed | 72% maxSpeed | 85% maxSpeed | 95% maxSpeed |
| Rubber band cap | 82% | 95% | 108% |
| Drift on curves | Never | curve > 0.5 (30% chance) | curve > 0.3 (70% chance) |
| Starting position | z = −8 | z = −5 | z = −3 |

**Rubber band logic fix:**
- Gap > 20 segments behind → accelerate toward rubber band cap
- Gap < 5 segments behind → decelerate slightly (no teleport cheating)
- Strong AI can temporarily lead the player

**AI drift visual:** Strong and medium AI produce skid marks + smoke when drifting through curves.

---

## 5. HUD Redesign

### Speedometer (bottom-left)
- Semi-circular arc gauge replacing plain text
- Needle angle = speed / maxSpeed
- Arc color gradient: green → yellow → orange-red
- km/h number inside arc

### Drift Charge Bar (bottom-center)
- Wider bar with 3 level markers (vertical dashes)
- Flash + "LV2!" / "LV3!" popup text on level-up
- Color transitions: orange → yellow → green

### Position Badge (top-left)
- Large neon text: "1ST" gold, "2ND" white, "3RD"/"4TH" dim red
- Scale-pop animation on position change

### Lap Notification (center, transient)
- "LAP 2/3" slides in from top, holds 1.5s, fades out
- Current lap time vs best lap: green if faster, red if slower

### Power-up Indicator (bottom-right)
- Larger emoji icon with pulsing border when held
- Full-screen flash (20% opacity, power-up color) on use

---

## 6. Road & Scenery Polish

### Road
- Lane markings: brighter, longer dashes (opacity 0.5 → 0.7)
- Rumble strips: thicker, more contrast
- Depth fog: distant segments blend toward sky color using linear interpolation by segment index

### Scenery Objects (per track, drawn on road sides)
Each object is a small pixel-art shape drawn in `road.ts` `drawParallax()`, scaled by segment distance.

| Track | Left side | Right side |
|---|---|---|
| Neon City | Pixel buildings (rectangles + lit windows) | Billboard rectangles |
| Mountain Pass | Pine trees (triangles) | Rock boulders |
| Desert Storm | Cacti (cross shape) | Rock clusters |
| Cyber Highway | Neon grid pillars | Power line poles |

Objects placed at fixed segment intervals (every 15 segments), alternating sides. No randomness per frame.

### Sky
- 3-stop gradient (top → mid → horizon)
- Star dots for night tracks (Neon City, Cyber Highway): 40–60 fixed points

---

## Files Changed

| File | Changes |
|---|---|
| `src/games/drift/sprites.ts` | Full rewrite of `drawCar()`, update `drawSmoke()` |
| `src/games/drift/logic.ts` | Fix `DRIFT_START`, add `lastSteerDir`, tiered AI, rebalanced physics |
| `src/games/drift/config.ts` | Updated boost/nitro values, new AI tier constants |
| `src/games/drift/road.ts` | Depth fog, better lane marks, scenery objects |
| `src/games/drift/DriftCanvas.tsx` | Particle refs, speed lines, HUD redesign, boost flash, screen shake |
