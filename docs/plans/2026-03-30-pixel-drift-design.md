# Pixel Drift - Neon Racing Game Design

## Overview

**Name:** Pixel Drift
**Tag:** ARCADE
**Theme color:** Neon Orange (#ff6b35)
**Concept:** Pseudo-3D arcade racing game with drift-boost mechanics, 5 unique cars, 4 themed tracks, and power-ups. Canvas 2D rendering with OutRun-style perspective projection.

## Rendering Engine

### Pseudo-3D Road Projection (Canvas 2D)

Road is divided into **segments** (horizontal strips). Each segment has:
- `worldZ` (distance), `curve` (horizontal bend), `hill` (vertical slope)
- Projected to screen via: `screenX = worldX * (cameraDepth / z)`

Curves accumulate X-shift per segment for smooth bends. Hills shift Y. ~300 segments rendered per frame using painter's algorithm (far to near).

### Visual Layers (back to front)

1. **Sky gradient** - changes per track theme
2. **Background parallax** - pixel art scenery (buildings, mountains, trees), 2-3 layers at different scroll speeds
3. **Road segments** - alternating light/dark stripes, lane markings, rumble strips at edges
4. **Roadside objects** - trees, signs, barriers as scaled sprites
5. **Other cars** - AI opponents as scaled sprites with direction frames
6. **Player car + effects** - drift smoke, sparks, tire marks on road surface
7. **HUD overlay** - speed, position, lap, boost meter, power-up slot

## Drift System (Core Mechanic)

### Flow

```
Normal driving → Hold drift key + steer → Drift charges boost (3 levels) →
Release drift → Turbo burst proportional to charge level
```

### Drift Levels

| Level | Time | Sparks | Boost |
|-------|------|--------|-------|
| 1 | 0-2s | Orange | Mini boost (~1.2x speed, 0.5s) |
| 2 | 2-4s | Yellow | Medium boost (~1.5x speed, 1s) |
| 3 | 4s+ | White | Mega boost (~2x speed, 1.5s) |

### Risk/Reward

- Drifting near barriers risks collision (speed loss + spin-out)
- Short drifts give minimal boost
- Sweet spot: sustain drift through entire curve for max charge
- Drift angle affects steering responsiveness (committed drift = harder to adjust)

### Visual Feedback

- Car sprite swaps to angled frame (8 angles total)
- Tire smoke particles trail behind car
- Sparks emit from rear wheels (color matches drift level)
- Tire marks rendered on road surface
- Slight screen shake during drift
- Speed lines at screen edges during boost
- Boost meter glows and fills progressively

### Audio Feedback

- Tire screech (bandpass noise oscillator) on drift enter
- Pitch rises with drift level
- "Whoosh" + engine roar on boost release
- Click/chime on level-up transitions

## Cars (5 Types)

| Car | Speed | Drift | Boost | Handling | Character |
|-----|-------|-------|-------|----------|-----------|
| **Neon Striker** | 3 | 3 | 3 | 3 | Balanced starter car |
| **Drift Phantom** | 2 | 5 | 4 | 2 | Long drifts, fast charge |
| **Thunder Bolt** | 5 | 2 | 2 | 3 | Top speed, harder to drift |
| **Pixel Tank** | 2 | 3 | 5 | 4 | Massive boost power, slow base |
| **Ghost Racer** | 4 | 4 | 2 | 5 | Agile, great handling |

Each car has a unique pixel sprite sheet with 8 rotation frames for drift animation.

### Stat Effects

- **Speed:** Max speed on straights
- **Drift:** How fast drift charge builds + drift stability
- **Boost:** Multiplier and duration of turbo bursts
- **Handling:** Steering responsiveness, curve grip without drifting

## Tracks (4 Themed Circuits)

| Track | Theme | Palette | Features | Difficulty |
|-------|-------|---------|----------|------------|
| **Neon City** | Night city, neon signs, skyscrapers | Orange/purple | Short frequent curves, narrow lanes | Easy |
| **Mountain Pass** | Forest, cliffs, waterfalls | Green/brown | Long sweeping curves + hills | Medium |
| **Desert Storm** | Sunset desert, cacti, mesas | Orange/amber | Wide high-speed curves, sand particles | Medium |
| **Cyber Highway** | Futuristic, neon grid, holograms | Cyan/magenta | Sharp hairpins + steep hills | Hard |

Each track defines:
- Segment data (curve/hill sequences)
- Color palette (road, grass/sand, sky gradient)
- Background parallax layers
- Roadside object set
- Track length (number of segments per lap)

## Power-ups

Appear as glowing pixel item boxes on the road surface. Player can hold 1 power-up at a time.

| Power-up | Visual | Effect | Notes |
|----------|--------|--------|-------|
| **Nitro Canister** | Fire icon, red glow | Instant speed burst | Like a free mini-boost |
| **Shield** | Shield icon, blue glow | Blocks 1 collision | Lasts 5s or until hit |
| **Slick Oil** | Oil drum, purple glow | Drops oil behind car; AI hitting it slows down | Oil lasts 3s on road |
| **Magnet** | Magnet icon, yellow glow | Auto-attracts nearby power-ups | Lasts 8s |

### Rules

- 1-2 power-ups spawn per lap at fixed positions
- Picking up a new one replaces the current one
- Activated via dedicated button (E key / touch button)
- AI can also pick up and use power-ups

## Game Modes

### Time Attack

- Solo run, 3 laps
- Ghost car replays best time
- Best time saved per track per car to localStorage
- No AI opponents, no power-ups (pure skill)

### Race

- Player + 3 AI opponents
- 3 laps per race
- AI has rubber-banding (speeds up when behind, slows when far ahead)
- Finish position determines score
- Power-ups active
- AI uses basic racing line + drift at curves

## Controls

### Keyboard

| Key | Action |
|-----|--------|
| Left/Right or A/D | Steer |
| Up or W | Accelerate |
| Down or S | Brake |
| Space or Shift | Drift (hold + steer) |
| E | Use power-up |

### Touch (Mobile)

- Left/Right steer buttons (bottom corners)
- Auto-accelerate (always moving forward)
- Drift button (bottom center-left)
- Power-up button (bottom center-right)
- Tap brake area to slow down

## HUD Layout

```
┌─────────────────────────────────────┐
│  LAP 2/3      1ST/4     01:23.45    │  ← Top bar (lap, position, time)
│                                     │
│                                     │
│           [CANVAS ROAD]             │  ← Main game area
│                                     │
│                                     │
│  ┌──────┐   [BOOST████░░]  [🛡️]   │  ← Bottom HUD
│  │ 180  │                           │
│  │ km/h │   ████████░░░░  RPM bar   │
│  └──────┘                           │
└─────────────────────────────────────┘
```

## Scoring & Persistence

- **Time Attack:** Best time per track per car → localStorage
- **Race:** Points per finish position (1st=100, 2nd=70, 3rd=40, 4th=10)
- **High score:** Cumulative race points → localStorage
- **Drift score bonus:** Extra points for drift chains in Race mode

## Audio Design

All procedural via Web Audio API (no audio files):

- **Engine:** Low-frequency oscillator, pitch scales with speed
- **Tire screech:** Bandpass-filtered noise, triggered on drift
- **Boost whoosh:** Frequency sweep upward + white noise burst
- **Collision:** Short noise burst + low thud
- **Power-up pickup:** Rising arpeggio (3 quick tones)
- **Level chime:** Single tone at drift level transitions
- **Win/Lose:** Victory fanfare / defeat sound (matching GameStation patterns)

## Integration with GameStation

- Route: `/games/drift`
- Game logic: `src/games/drift/`
- Page: `src/app/games/drift/page.tsx`
- Uses `GameLayout` wrapper with orange color variant
- Uses `scores.ts` for high score persistence
- Uses `usePixelSound` for menu sounds
- Added to homepage game grid with ARCADE tag
- Win/lose overlays follow established pattern (see MEMORY.md)

## Technical Considerations

- Canvas renders at 60fps via `requestAnimationFrame`
- Road segment data pre-generated per track (not runtime)
- Sprite sheets for cars and roadside objects
- Pixel art drawn directly on canvas (no image assets needed - can generate programmatically)
- Game state managed via reducer pattern (consistent with other games)
- Mobile: canvas scales to container, touch zones overlay
