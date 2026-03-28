# GameStation - Retro Puzzle Arcade Design

## Overview

A retro pixel-art themed website hosting multiple browser games, starting with 4 puzzle games. Deployed on Vercel.

## Tech Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- Game logic: React state management (`useReducer`)
- Styling: Tailwind CSS + custom pixel art CSS
- Storage: localStorage for high scores
- Deployment: Vercel

## Visual Style

- **Theme**: Retro / Pixel Art / 8-bit arcade
- **Background**: Dark (#0a0a0a)
- **Accent colors**: Neon green (#39ff14), neon pink (#ff2d95), neon yellow (#ffe600)
- **Font**: Pixel/monospace font (e.g., Press Start 2P from Google Fonts)
- **Effects**: CRT scanline overlay, neon glow, pixel transitions

## Project Structure

```
src/app/
├── layout.tsx              # Root layout, pixel font, retro theme
├── page.tsx                # Homepage - game gallery
└── games/
    ├── minesweeper/page.tsx
    ├── 2048/page.tsx
    ├── sudoku/page.tsx
    └── memory-match/page.tsx

src/components/
├── GameCard.tsx            # Card on homepage
├── GameLayout.tsx          # Shared game page layout (header, score, back)
└── PixelButton.tsx         # Reusable retro button

src/games/
├── minesweeper/            # Game logic + components
├── 2048/
├── sudoku/
└── memory-match/

public/fonts/               # Pixel fonts (if self-hosted)
```

## Homepage - Game Gallery

- Grid of GameCards with pixel art thumbnails
- Each card: game name, category tag, neon glow hover effect
- Header: "GAMESTATION" neon arcade sign style
- CRT scanline overlay for retro monitor feel

## Shared Game Layout

Each game page includes:
- **Top bar**: Back button, game name, score/timer
- **Game area**: Centered, responsive
- **Bottom bar**: New Game, Difficulty selector (if applicable), Best Score
- **Win/Lose**: Pixel confetti, screen shake animations
- **Persistence**: High scores in localStorage

## Game Designs (Phase 1 - Puzzle)

### 1. Minesweeper - "Dungeon Explorer"
- Cells are dungeon floor tiles
- Mines are monsters, flags are shields
- Pixel art reveal animations when opening cells
- 3 difficulty levels: Easy (9x9, 10), Medium (16x16, 40), Hard (30x16, 99)

### 2. 2048 - "Pixel Monsters"
- Each tile value is a pixel monster that evolves:
  - 2=Slime, 4=Bat, 8=Skeleton, 16=Ghost, 32=Goblin, 64=Orc, 128=Demon, 256=Golem, 512=Vampire, 1024=Wizard, 2048=Dragon
- Merge animations showing monster evolution
- Swipe/arrow key controls

### 3. Sudoku - "Rune Puzzle"
- Numbers replaced with pixel art rune symbols
- Toggle between rune mode and number mode
- Features: pencil marks, hint system (limited hints)
- 3 difficulty levels: Easy, Medium, Hard
- Validation highlighting for conflicts

### 4. Memory Match - "Pixel Bestiary"
- Cards feature pixel monster illustrations
- Combo system: consecutive correct matches = score bonus
- Timer challenge mode
- Grid sizes: 4x4 (Easy), 6x6 (Hard)
- Flip animation with pixel art style

## Responsive Design

- Desktop: game area 600-800px centered
- Tablet: adaptive grid
- Mobile: full width, touch-friendly tap targets (min 44px)

## Future Phases

- Phase 2: Classic Arcade (Snake, Tetris, Flappy Bird)
- Phase 3: Card & Board (Tic-Tac-Toe, Chess)
- Phase 4: Action & Casual (Fruit Ninja, Dino Runner)
