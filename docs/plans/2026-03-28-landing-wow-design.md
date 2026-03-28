# HeoLab Landing Page — "Wow" Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade landing page from bare-bones to impressive — add sticky navbar, animated hero, all 9 games with filter, stats section, social footer. Fix roadmap and spacing throughout.

**Architecture:** All changes in `src/app/page.tsx` (client component). New `Navbar` component. CSS keyframes added to `globals.css`. No new dependencies.

**Tech Stack:** Next.js 16, Tailwind CSS v4, TypeScript, Press Start 2P + Inter fonts.

---

## Changes Summary

### 1. Sticky Navbar (new component)
- File: `src/components/Navbar.tsx`
- `sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-md border-b border-dark-border`
- Left: `<HeoLab/>` logo (click → `href="/"`)
- Right: `GAMES` link → `/games`, `ABOUT` → `#about`, `▶ PLAY NOW` button → `/games`
- Mobile: hide text links, keep only `▶ PLAY` button
- Import in `src/app/page.tsx` (NOT in layout — game pages don't need navbar)

### 2. Hero Section
- Add 6 floating emojis (💀🐉🔮🐍👾🧱) positioned absolute around logo
- Each emoji has unique `float` animation speed (3s–6s) + delay
- Only visible `md:` and up (hidden on mobile)
- Stats bar below CTA: `9 GAMES · FREE FOREVER · NO DOWNLOAD · NO ACCOUNT`
- Scroll indicator: pulse circle instead of plain `↓`
- New keyframe: `float` (translateY -12px ↔ 12px)

### 3. Games Section
- Show all 9 games (not just 4)
- Add filter tabs: ALL / PUZZLE / CASUAL / ARCADE (client state)
- Grid: `grid-cols-2 md:grid-cols-3`
- Remove "MORE COMING SOON" orphan placeholder
- Add "VIEW ALL GAMES →" button below grid → `/games`

### 4. Stats Section (new, between Games and About)
- 4 stat cards: `9 GAMES` · `∞ PLAYTIME` · `0 DOWNLOADS` · `0 ADS`
- Layout: `grid grid-cols-2 md:grid-cols-4`
- Big number neon-green, label gray pixel font

### 5. About Section
- Unchanged content, reduce `py-24` → `py-16`

### 6. Roadmap Fix
- Replace Snake/Tetris/Flappy Bird (now live) with Phase 3:
  - 🐱 Pac-Man Clone — COMING SOON
  - 🏓 Pong — COMING SOON
  - 💥 Brick Breaker — COMING SOON

### 7. Footer
- Logo row: `< HeoLab />`
- Nav links: `PLAY GAMES` → `/games`, `ABOUT` → `#about`
- Social row: YouTube · Facebook · TikTok · Instagram
  - All `href="#"` placeholder, grayed out (`text-gray-600`)
  - Hover: tooltip "Coming soon" via `title` attribute
  - SVG icons for each platform
- Copyright: `© 2025 HEOLAB · ALL RIGHTS RESERVED · heolab.dev`

### 8. Spacing
- All section `py-24` → `py-16` except hero

---

## CSS additions (globals.css)

```css
@keyframes float {
  0%   { transform: translateY(0px) rotate(0deg); }
  100% { transform: translateY(-16px) rotate(5deg); }
}
```
