# PIXEL CHOMP (Pac-Man) - Design Doc

**Date:** 2026-03-30
**Category:** ARCADE
**Theme Color:** Orange (#f97316)
**Emoji:** `👾`

## Concept

Pac-Man reimagined as a pixel dungeon crawler. The player controls a pixel hero eating rune stones in a dungeon maze, avoiding 4 ghost monsters. Eating a Power Crystal turns the hero into a hunter, allowing them to chase and eat ghosts.

## Core Gameplay

### Movement
- Arrow keys / WASD for desktop
- Touch swipe for mobile
- Pac-Man moves continuously in last input direction
- Smooth cornering at intersections (pre-turn buffer)

### Maze
- Grid-based maze with walls, dots, power pellets, and tunnels
- Wrap-around tunnels on left/right edges
- Ghost house in center with gate

### Entities
- **Pac-Man:** Player character, eats dots, avoids ghosts
- **Dots (Rune Stones):** 10 pts each, must eat all to complete level
- **Power Pellets (Power Crystals):** 50 pts, 4 per maze, triggers frightened mode
- **Fruit Bonus:** Appears at center, increases value per level

### Ghost AI (4 ghosts, each with unique behavior)

| Ghost | Name | Color | Chase Behavior |
|-------|------|-------|----------------|
| Blinky | Shadow | Red (#ff2d55) | Targets Pac-Man's current tile directly |
| Pinky | Speedy | Pink (#ff69b4) | Targets 4 tiles ahead of Pac-Man's facing direction |
| Inky | Bashful | Cyan (#00d4ff) | Uses Blinky's position + Pac-Man's position to calculate target |
| Clyde | Pokey | Orange (#f97316) | Chases when far (>8 tiles), scatters when close |

### Ghost Modes (cycle through)
- **Scatter:** Each ghost targets its home corner
- **Chase:** Each ghost uses its unique targeting
- **Frightened:** All ghosts turn blue, move randomly, can be eaten
- **Eaten:** Ghost eyes return to ghost house, respawn

### Level Progression
- Ghost speed increases per level
- Frightened duration decreases per level
- Scatter/Chase cycle timings change
- Different fruit per level with increasing value

## Gameplay Modifiers (Settings Panel)

| Modifier | Options | Default |
|----------|---------|---------|
| Ghost Speed | Slow / Normal / Fast / Insane | Normal |
| Power Duration | 3s / 5s / 8s / 12s | 8s |
| Maze Style | Classic / Open / Tight / Random | Classic |
| Ghost Count | 1 / 2 / 3 / 4 / 6 | 4 |
| Bonus Frequency | Off / Rare / Normal / Frequent | Normal |
| Lives | 1 / 3 / 5 / Infinite | 3 |
| Speed Ramp | Off / Gradual / Aggressive | Gradual |

## Scoring

- Dot: 10 pts
- Power Pellet: 50 pts
- Ghost combo: 200 -> 400 -> 800 -> 1600 (per power pellet)
- Fruit: 100 -> 300 -> 500 -> 700 -> 1000 (per level)
- High score saved to localStorage

## Audio (Web Audio API, procedural)

- Dot eat: short "waka" tone
- Power pellet: rising power-up sweep
- Ghost eaten: satisfying crunch jingle
- Death: descending sad tone
- Level complete: victory fanfare
- Ghost frightened: ambient low rumble
- Fruit eat: bonus chime

## UI/UX

### Layout
- Uses `GameLayout.tsx` wrapper
- Score + High Score in header
- Level indicator
- Lives display below board (mini pac-man icons)
- Gear icon opens modifier settings panel

### Win/Lose Overlay
- Follows established pattern from MEMORY.md
- Win (level complete): orange neon glow, floating `👾` emoji
- Lose (all lives lost): pink neon flash, screen shake on board

### Responsive
- Board scales to fit viewport
- Touch controls on mobile (swipe gestures)
- Minimum playable size ~300px width

## File Structure

```
src/games/pacman/
  ├── types.ts          # GameState, Ghost, Direction, GhostMode, etc.
  ├── logic.ts          # createGame, move, tick, ghostAI, collision
  ├── mazes.ts          # Maze layouts (classic, open, tight, random generator)
  ├── ghost-ai.ts       # Ghost targeting algorithms per ghost type
  ├── config.ts         # Speed tables, level progression, modifier presets
  ├── audio.ts          # Procedural sounds
  ├── Board.tsx         # Main game board renderer
  ├── Ghost.tsx         # Ghost component with mode-based rendering
  ├── PacMan.tsx        # Pac-Man component with chomp animation
  └── Settings.tsx      # Modifier settings panel

src/app/games/pacman/
  ├── page.tsx          # Game page
  └── layout.tsx        # SEO metadata
```

## Technical Notes

- Game loop via `requestAnimationFrame` or `setInterval` at ~60fps
- State managed with `useReducer` (consistent with other games)
- Ghost AI computed each tick based on mode and individual targeting
- Maze stored as 2D number array (0=path, 1=wall, 2=dot, 3=power, 4=ghost-house, 5=tunnel)
- Collision detection: tile-based (same grid cell)
- Pre-turn buffering: store next desired direction, apply when valid
