# HeoLab Landing Page Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebrand GameStation to HeoLab with a modern landing page at `/`, move game arcade to `/games`, and add full SEO metadata for public launch at `heolab.dev`.

**Architecture:** New modern landing page at `/` (Inter font, dark + gradient hero, animated game cards). Existing pixel arcade moves to `/games`. Individual game pages unchanged. SEO metadata added globally and per-game.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Inter font (new), Press Start 2P (existing for game elements).

---

## Pages & Routes

```
/                        ← New landing page (modern)
/games                   ← Arcade listing (moved from /)
/games/minesweeper       ← Unchanged
/games/2048              ← Unchanged
/games/sudoku            ← Unchanged
/games/memory-match      ← Unchanged
/sitemap.xml             ← Auto-generated
/robots.txt              ← Allow all crawlers
```

---

## Landing Page Sections (in order)

### 1. Hero
- Full-screen (`min-h-screen`)
- Animated dot-grid background (CSS, no library)
- Logo: "HeoLab" — Inter bold, large, white
- Pixel accent: small neon-green `<` `>` brackets around logo
- Tagline: *"Play. Explore. Have Fun."* — Inter, gray-300
- Sub-text: *"Free browser games, crafted with care."* — smaller, gray-500
- CTA: "Play Now" button → smooth scroll to games section
- Scroll indicator: small bouncing chevron at bottom

### 2. Games Showcase
- Section title: "GAMES" — Press Start 2P, neon-green
- Grid: 2-col on desktop, 1-col on mobile
- Each card:
  - Dark background (`#1a1a2e`), border gradient matching game color
  - Emoji large (top), game title (Press Start 2P), subtitle (Inter), tag badge
  - Hover: `translateY(-4px)`, glow border intensifies
  - Click → navigates to game
- "More coming soon..." placeholder at end

### 3. About HeoLab
- Simple layout: centered text block
- Headline: "What is HeoLab?" — Inter bold
- Body: "HeoLab is a tiny indie game lab. We build fun, free games you can play right in your browser — no download, no account needed."
- Small pixel icon decoration

### 4. Roadmap
- Section title: "WHAT'S NEXT" — Press Start 2P
- Horizontal scroll cards on mobile, grid on desktop
- Each card: game name + status badge (IN PROGRESS / COMING SOON)
- Phase 2 placeholder games: Snake, Tetris, Flappy Bird

### 5. Footer
- Dark, minimal: "© 2025 HeoLab"
- Link: `/games` (Play Games)
- YouTube link placeholder (hidden until channel exists)

---

## SEO

### Global (layout.tsx)
```
title: "HeoLab — Play Free Browser Games"
description: "HeoLab is an indie game lab with free browser games. Play Minesweeper, 2048, Sudoku and more — no download needed."
metadataBase: https://heolab.dev
openGraph:
  type: website
  url: https://heolab.dev
  title: "HeoLab — Play Free Browser Games"
  description: ...
  image: /og-image.png (1200×630)
twitter:
  card: summary_large_image
canonical: https://heolab.dev
lang: en
```

### Per game page
Pattern: `"{Game Name} — Free Browser Game | HeoLab"`
- Minesweeper: "Dungeon Sweep — Free Minesweeper Game | HeoLab"
- 2048: "Monster 2048 — Free 2048 Game | HeoLab"
- Sudoku: "Rune Sudoku — Free Sudoku Game | HeoLab"
- Memory Match: "Pixel Bestiary — Free Memory Match Game | HeoLab"

### sitemap.xml
Auto-generated via Next.js `app/sitemap.ts` — lists `/`, `/games`, all 4 game pages.

### robots.txt
Auto-generated via Next.js `app/robots.ts` — allow all, point to sitemap.

---

## Visual Design

**Fonts:**
- Inter (new): hero text, about, body copy, roadmap — `next/font/google`
- Press Start 2P (existing): section titles, game titles, tags, badges

**Colors:** Existing palette kept:
- `--dark-bg: #0a0a0a`
- `--dark-card: #1a1a2e`
- Neon green/pink/blue/yellow for game accents
- Hero gradient accent: `from-purple-900/30 via-transparent to-neon-blue/10`

**Animations:**
- Hero dot-grid: CSS animated, subtle drift
- Game cards: CSS transform on hover, no JS animation lib
- Scroll indicator: `animate-bounce`
- Section entrance: `pixel-fade-in` (existing keyframe)

---

## File Changes

**New files:**
- `src/app/page.tsx` — new landing page (replaces current)
- `src/app/games/page.tsx` — arcade listing (moved from current `src/app/page.tsx`)
- `src/app/sitemap.ts` — Next.js sitemap
- `src/app/robots.ts` — Next.js robots
- `public/og-image.png` — OG image (simple generated, can be improved later)

**Modified files:**
- `src/app/layout.tsx` — add Inter font, update metadata, add `hreflang`
- `src/app/globals.css` — add Inter as secondary font variable
- `src/components/GameLayout.tsx` — update back link to `/games` (was `/`)
- Each game page — add per-page `export const metadata`
