# PIXEL CHOMP — SURVIVAL Mode Design

**Date:** 2026-03-30

## Overview

Add a SURVIVAL game mode to PIXEL CHOMP alongside CLASSIC. SURVIVAL combines three mechanics that reinforce each other: Fog of War (tension), Combo System (risk/reward), and Ghost Evolution (adaptive difficulty). Classic mode remains unchanged.

## Mode Selection

- Mode selector in idle overlay: CLASSIC | SURVIVAL
- Settings panel shared between both modes
- Mode stored in component state, passed to START action

## Feature 1: Fog of War

### Visibility
- Pac-Man sees within radius **4 tiles**
- Power Pellet expands vision to **8 tiles** during frightened duration
- Tiles within radius: 100% visible
- Tiles within radius+2: gradient fade (edge softening)
- Visited tiles beyond vision: 20% opacity (memory map)
- Unvisited tiles beyond vision: fully black

### State additions
- `visited: boolean[][]` — tracks every tile Pac-Man has been on
- `visRadius: number` — current visibility radius (4 default, 8 during power)

### Ghost Proximity Audio (proximity sound system)
- Ghost within **8 tiles**: slow heartbeat tone
- Ghost within **5 tiles**: faster heartbeat + faint footstep
- Ghost within **3 tiles**: rapid heartbeat + loud footstep + fog edge flicker
- Distance calculated per-tick, closest ghost determines intensity
- New audio methods: `playHeartbeat(intensity)`, `playFootstep(volume)`

### Render
- Each cell computes distance to Pac-Man
- CSS opacity applied per-cell based on distance vs visRadius
- Fog overlay: dark layer with radial cutout centered on Pac-Man
- Alternative: per-cell opacity is simpler and sufficient for grid rendering

## Feature 2: Combo System

### Combo Counter
- Each dot eaten increments combo: x1, x2, x3...
- Combo resets to 0 when: Pac-Man stands still for 1 tick, or hit by ghost
- Dot score = `SCORE.dot * min(combo, 10)` (x10 cap for dots)
- Ghost eaten during frightened ADDS to combo counter (doesn't reset)

### Milestones

| Combo | Bonus | Effect | Visual |
|-------|-------|--------|--------|
| x10 | +500 | - | Yellow flash |
| x20 | +1000 | Speed boost 3s | Orange flash + "BLAZING!" |
| x50 | +2500 | Vision +2 tiles (5s) | Rainbow flash + "UNSTOPPABLE!" |
| x100 | +5000 | Mini power pellet (3s) | Screen pulse + "LEGENDARY!" |

### State additions
- `combo: number` — current combo count
- `comboTimer: number` — ticks since last dot eaten (reset on eat, combo breaks if > 1)
- `comboEffects: { speedBoost: number; visionBoost: number; miniPower: number }` — remaining ticks for each effect

### UI
- Combo counter next to score: `x15` with color gradient (white < 10, yellow < 20, orange < 50, red 50+)
- Progress bar below score showing progress to next milestone
- Milestone popup: floating text center of board, fades out over 1s

### Audio
- Every 5 combo: ascending pitch tone
- Milestone hit: special jingle
- Combo break: short descending tone

## Feature 3: Ghost Evolution

### Learning System
- Track Pac-Man's turning decisions at intersections during chase
- Key: `"x,y,ghostApproachDir"` → stores array of directions Pac-Man chose
- Data persists across levels within a game session
- On Pac-Man death: discard 10% of oldest history entries (forgetting)

### Evolution Tiers

| Levels | Tier | Prediction | Behavior |
|--------|------|------------|----------|
| 1-2 | BASIC | 0% | Classic ghost AI unchanged |
| 3-4 | AWARE | 40% | At intersections during chase, 40% chance to predict Pac-Man's likely turn |
| 5+ | EVOLVED | 70% | 70% prediction + corridor pincer coordination |

### Prediction Logic
- At intersection, ghost looks up `turnHistory["x,y,approachDir"]`
- Finds most frequent direction Pac-Man chose
- With `predictionChance` probability, ghost targets that predicted tile instead of normal AI target
- If no data for this intersection: fallback to normal AI

### Corridor Pincer (EVOLVED only)
- Detect when Pac-Man is in a corridor (only 2 valid directions)
- If one ghost is chasing from behind, the nearest other ghost targets the opposite end
- Creates "sandwich" trap forcing Pac-Man to find an exit before pincer closes

### Visual Indicators
- BASIC: normal ghost appearance
- AWARE: ghost eyes have subtle glow effect
- EVOLVED: ghost eyes red glow + short movement trail (2-3 faded afterimages)

### State additions
- `turnHistory: Record<string, Direction[]>` — learning data
- `evolutionTier: "basic" | "aware" | "evolved"` — computed from level
- Ghost type additions: no new fields needed (tier is global, prediction is computed)

## Architecture

### Mode branching
- `GameModifiers` gets new field: `gameMode: "classic" | "survival"`
- In `pacmanReducer` TICK handler: if `survival`, run fog/combo/evolution logic; else classic
- All 3 features are self-contained modules that hook into the existing tick pipeline

### New files
- `src/games/pacman/fog.ts` — visibility calculation, visited tracking
- `src/games/pacman/combo.ts` — combo counter, milestone logic, effects
- `src/games/pacman/evolution.ts` — turn history tracking, prediction logic, pincer detection

### Existing file modifications
- `types.ts` — add survival state fields, gameMode to modifiers
- `logic.ts` — integrate fog/combo/evolution into tick pipeline
- `config.ts` — add survival constants (radii, milestones, evolution thresholds)
- `audio.ts` — add proximity sounds, combo sounds
- `page.tsx` — mode selector, fog rendering, combo UI, ghost visual effects
