# HeoLab Phase 2 — New Games Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 new games to HeoLab across 2 new categories (Casual + Arcade), each with unique concept, expandable config system, and impressive visual effects.

**Architecture:** Each game follows existing pattern — `src/games/{game}/logic.ts` for pure logic, `src/app/games/{game}/page.tsx` for UI. Config-driven content via `src/games/{game}/config.ts`. `/games` page gets category filter tabs.

**Tech Stack:** Next.js 16 App Router, TypeScript, React hooks (useState/useReducer/useEffect), Tailwind CSS v4, CSS keyframe animations.

---

## Categories

| Category | Color | Games |
|----------|-------|-------|
| PUZZLE *(existing)* | neon-green `#39ff14` | Minesweeper, 2048, Sudoku, Memory Match |
| CASUAL *(new)* | purple `#a855f7` | Neon Serpent, Pixel Flap, Pixel Dash |
| ARCADE *(new)* | orange `#f97316` | Block Storm, Astro Raid |

---

## Game 1: NEON SERPENT (Snake)

**Route:** `/games/snake`
**Theme:** Cyberpunk underworld. AI hacker snake consuming data packets in a neon network.
**Color:** Cyan `#00d4ff`

### Mechanics
- Classic snake movement on grid (arrow keys + WASD + swipe mobile)
- Snake leaves glowing neon trail behind it
- Each 5 food eaten: level up → speed increases, snake changes color
- **Power-ups** (random spawn, despawn after 5s):
  - 🔵 Speed Boost — +50% speed for 5s
  - 🟣 Ghost Mode — pass through walls for 3s
  - 🟡 Score ×2 — double points for next 10 food
- Lose: snake "crashes" → screen glitch effect + `screenShake` animation
- Win condition: none (endless, high score)

### Config (`src/games/snake/config.ts`)
```ts
export const POWER_UPS = [
  { type: 'speedBoost', color: '#00d4ff', duration: 5000, emoji: '🔵' },
  { type: 'ghost', color: '#a855f7', duration: 3000, emoji: '🟣' },
  { type: 'scoreDouble', color: '#ffe600', duration: null, count: 10, emoji: '🟡' },
];

export const LEVELS = [
  { minScore: 0,  speed: 150, color: '#00d4ff' },
  { minScore: 5,  speed: 130, color: '#39ff14' },
  { minScore: 10, speed: 110, color: '#ff2d95' },
  { minScore: 20, speed: 90,  color: '#a855f7' },
  { minScore: 35, speed: 70,  color: '#ffe600' },
];
```

### Visual Effects
- Trail: each body segment fades opacity based on distance from head
- Power-up collected: `cellBounce` + particle burst (CSS)
- Level up: brief flash of entire snake color
- Death: `screenShake` + glitch flicker on overlay

---

## Game 2: PIXEL FLAP (Flappy Bird)

**Route:** `/games/flappy`
**Theme:** Tiny pixel bird flying through an abandoned retro city.
**Color:** Yellow `#ffe600`

### Mechanics
- Tap/click/spacebar = flap (physics: constant gravity + impulse velocity)
- Pipes appear at random heights, gap = 150px (adjustable by config)
- Score = number of pipes passed
- **Time of day:** auto-detects user's local hour → morning/afternoon/night background
- **Milestone obstacles** (by score):
  - 0–9: Classic pipes
  - 10–19: Building columns
  - 20+: Rocket ships
- **Medal system:** Bronze (score 5+), Silver (10+), Gold (20+), Platinum (40+)
- Death: bird explodes into pixel particles (CSS animation)
- Mobile: tap anywhere = flap + haptic vibration (`navigator.vibrate(20)`)

### Config (`src/games/flappy/config.ts`)
```ts
export const TIME_THEMES = {
  morning: { sky: '#87CEEB', ground: '#8B7355', label: 'DAWN' },
  afternoon: { sky: '#4a90d9', ground: '#8B7355', label: 'DAY' },
  evening: { sky: '#FF7043', ground: '#6D4C41', label: 'DUSK' },
  night: { sky: '#0a0a1a', ground: '#1a1a2e', label: 'NIGHT' },
};

export const OBSTACLE_THEMES = [
  { minScore: 0,  type: 'pipe',     emoji: '🌿', label: 'PIPES' },
  { minScore: 10, type: 'building', emoji: '🏢', label: 'CITY' },
  { minScore: 20, type: 'rocket',   emoji: '🚀', label: 'SPACE' },
];

export const MEDALS = [
  { minScore: 40, label: 'PLATINUM', color: '#00d4ff' },
  { minScore: 20, label: 'GOLD',     color: '#ffe600' },
  { minScore: 10, label: 'SILVER',   color: '#aaaaaa' },
  { minScore: 5,  label: 'BRONZE',   color: '#cd7f32' },
];
```

### Visual Effects
- Canvas-based rendering (requestAnimationFrame) for smooth physics
- Parallax background: 3 layers at different scroll speeds
- Pixel particle explosion on death (CSS keyframes)
- Medal flash animation on new medal achieved

---

## Game 3: BLOCK STORM (Tetris)

**Route:** `/games/tetris`
**Theme:** A pixel castle crumbling — you stack blocks to hold it together.
**Color:** Orange `#f97316`

### Mechanics
- Standard Tetris rules: 7 tetrominoes, rotate (up arrow / Z key), hard drop (spacebar)
- Ghost piece shows landing position
- Hold piece (C key or hold button on mobile)
- Next piece preview
- Score: 1 line=100, 2=300, 3=500, 4(Tetris)=800, combo multiplier
- **Random Events** (trigger every 5 lines cleared):
  - ⚡ Lightning — clears 1 random line
  - 💣 Bomb Block — next piece is a bomb, clears 3×3 area
  - ❄️ Ice Freeze — board freezes 3s, auto-clears bottom row
  - 🔥 Fever — next 30s score ×2
- Game over when blocks reach top

### Config (`src/games/tetris/config.ts`)
```ts
export const RANDOM_EVENTS = [
  { type: 'lightning', emoji: '⚡', label: 'LIGHTNING STRIKE!', color: '#ffe600' },
  { type: 'bomb',      emoji: '💣', label: 'BOMB BLOCK!',       color: '#ff2d95' },
  { type: 'freeze',    emoji: '❄️', label: 'ICE FREEZE!',       color: '#00d4ff' },
  { type: 'fever',     emoji: '🔥', label: 'FEVER TIME!',       color: '#f97316' },
];

export const LEVEL_SPEEDS = [
  { level: 1,  interval: 800 },
  { level: 2,  interval: 700 },
  { level: 5,  interval: 550 },
  { level: 10, interval: 400 },
  { level: 15, interval: 280 },
  { level: 20, interval: 180 },
];
```

### Visual Effects
- Line clear: row flashes white then disappears with `cellReveal` inverse
- Tetris (4 lines): screen flash + `victoryGlowYellow`
- Random event announcement: full-width banner slides in for 2s
- Game over: `screenShake` + blocks rain down

---

## Game 4: PIXEL DASH (Endless Runner / Dino Run)

**Route:** `/games/runner`
**Theme:** Pixel dinosaur escaping a meteor shower in a retro world.
**Color:** Neon-green `#39ff14`

### Mechanics
- Auto-running, spacebar/tap = jump, double-tap = double jump
- Obstacles: cactus, pterodactyl, boulder, lava pit (introduced progressively)
- Speed increases over time
- **Characters** (unlock by reaching score milestones):
  - 🦕 Dino (default)
  - 🤖 Robot (unlock at 500)
  - 🥷 Ninja (unlock at 1000)
- **World themes** change automatically at score milestones:
  - 0–299: Desert (day)
  - 300–599: Dusk desert
  - 600–999: Night storm
  - 1000+: Lava world
- Night mode: score ×1.5 multiplier indicator shown
- Death: character stumbles + `screenShake`

### Config (`src/games/runner/config.ts`)
```ts
export const CHARACTERS = [
  { id: 'dino',  emoji: '🦕', label: 'DINO',  unlockScore: 0    },
  { id: 'robot', emoji: '🤖', label: 'ROBOT', unlockScore: 500  },
  { id: 'ninja', emoji: '🥷', label: 'NINJA', unlockScore: 1000 },
];

export const WORLDS = [
  { minScore: 0,    id: 'desert',    label: 'DESERT',     multiplier: 1.0 },
  { minScore: 300,  id: 'dusk',      label: 'DUSK',       multiplier: 1.2 },
  { minScore: 600,  id: 'storm',     label: 'NIGHT STORM',multiplier: 1.5 },
  { minScore: 1000, id: 'lava',      label: 'LAVA WORLD', multiplier: 2.0 },
];

export const OBSTACLES = [
  { id: 'cactus',      minScore: 0,   emoji: '🌵' },
  { id: 'pterodactyl', minScore: 100, emoji: '🦅' },
  { id: 'boulder',     minScore: 300, emoji: '🪨' },
  { id: 'lava',        minScore: 600, emoji: '🌋' },
];
```

### Visual Effects
- Parallax scrolling background (2 layers)
- Character unlock: flash animation + "UNLOCKED!" overlay
- World transition: brief fade to black, new background fades in
- Canvas or pure CSS animation for scrolling ground

---

## Game 5: ASTRO RAID (Space Invaders)

**Route:** `/games/space`
**Theme:** Solo retro spaceship defending against waves of pixel alien invaders.
**Color:** Purple `#a855f7`

### Mechanics
- Ship moves left/right (arrow keys / A-D / drag on mobile)
- Auto-fire or tap/spacebar to shoot
- Aliens in grid formation, move left→right→step down
- Speed increases as aliens are killed
- **Wave patterns** (rotate each wave):
  - Wave 1: Standard grid march
  - Wave 2: Zigzag movement
  - Wave 3: Spiral formation
  - Wave 4+: Random from all patterns
- **Power-ups** drop from killed aliens (30% chance):
  - 🔫 Triple Shot — 3 bullets side by side, 10s
  - 🛡️ Shield — absorb 1 hit, 15s
  - 💥 Screen Bomb — kills all aliens on screen
- **Boss wave** every 5 waves: giant alien with HP bar, 3 attack phases
- Lives: 3 (shown as ship icons). Game over = 0 lives.

### Config (`src/games/space/config.ts`)
```ts
export const POWER_UPS = [
  { type: 'tripleShot', emoji: '🔫', duration: 10000, color: '#ff2d95', dropChance: 0.2 },
  { type: 'shield',     emoji: '🛡️', duration: 15000, color: '#00d4ff', dropChance: 0.15 },
  { type: 'bomb',       emoji: '💥', duration: null,   color: '#ffe600', dropChance: 0.05 },
];

export const WAVE_PATTERNS = ['march', 'zigzag', 'spiral', 'random'];

export const BOSS_PHASES = [
  { hpThreshold: 1.0, speed: 1, attackPattern: 'single' },
  { hpThreshold: 0.6, speed: 1.5, attackPattern: 'spread' },
  { hpThreshold: 0.3, speed: 2, attackPattern: 'rapid' },
];
```

### Visual Effects
- Pixel explosion on alien death (radial CSS particle)
- Boss HP bar with color gradient (green → yellow → red)
- Shield: pulsing blue glow around ship
- Triple shot: 3 bullets fan out with purple trail
- Wave clear: brief flash + "WAVE N CLEARED" banner

---

## /games Page Updates

### Category Filter Tabs
```
[ALL] [PUZZLE] [CASUAL] [ARCADE]
```
- Client-side filter (no reload)
- Active tab: border-bottom neon-green, text bright
- Inactive: text gray-500

### New Game Cards (Casual/Arcade style)
Same `GameCard` component, new color props for purple/orange.

---

## File Structure

```
src/
  app/
    games/
      snake/        page.tsx + layout.tsx
      flappy/       page.tsx + layout.tsx
      tetris/       page.tsx + layout.tsx
      runner/       page.tsx + layout.tsx
      space/        page.tsx + layout.tsx
  games/
    snake/          logic.ts + config.ts
    flappy/         logic.ts + config.ts
    tetris/         logic.ts + config.ts
    runner/         logic.ts + config.ts
    space/          logic.ts + config.ts
```

---

## Win/Lose Overlay Pattern (apply to ALL new games)

All overlays follow the established HeoLab pattern:
- `fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]`
- Background: `absolute inset-0 bg-dark-bg/30 backdrop-blur-sm`
- Content: floating emoji + pulsing neon title + stat line + PixelButton
- Lose: `animate-[screenShake_0.5s_ease-in-out]` on game board

---

## Implementation Order

1. Add category filter to `/games` page
2. NEON SERPENT (Snake) — simplest logic to start
3. BLOCK STORM (Tetris) — most complex, do while momentum is high
4. PIXEL FLAP (Flappy Bird) — canvas-based
5. PIXEL DASH (Runner) — canvas + character unlocks
6. ASTRO RAID (Space Invaders) — wave system + boss
