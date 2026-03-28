# HeoLab Social Media Banners — Design Doc

**Goal:** Create 4 API routes generating PNG banners for Facebook, YouTube, TikTok, and Instagram, with a shared retro pixel-art style and per-platform small decorative elements.

---

## Shared Design System

- **Background:** `#0a0a0a` + dot grid `rgba(57,255,20,0.10)` 24px spacing
- **Wordmark:** `< HeoLab />` — brackets `#39ff14`, text white
- **Tagline:** "Play. Explore. Have Fun." in `#39ff14`
- **Font:** `sans-serif` (ImageResponse default)
- **Accent colors:** neon-green `#39ff14`, neon-pink `#ff2d95`, neon-blue `#00d4ff`, neon-yellow `#ffe600`

---

## Per-Platform Specs

### Facebook Page Cover
- **Route:** `/api/banner/facebook.png`
- **Size:** 820×312 px
- **Layout:** centered column — wordmark + tagline
- **Small elements:** 🎮 🕹️ 🎲 emoji row above wordmark + "Free Browser Games" subtitle below tagline in `#666`

### YouTube Channel Art
- **Route:** `/api/banner/youtube.png`
- **Size:** 2560×1440 px (safe zone ~1546×423 center)
- **Layout:** centered column — wordmark + tagline, all content within center 60% width
- **Small elements:** `▶` pixel play button (neon green square + white triangle) left of wordmark row + "Watch · Play · Explore" subtitle in `#666`

### TikTok Profile Banner
- **Route:** `/api/banner/tiktok.png`
- **Size:** 1500×500 px
- **Layout:** centered column
- **Small elements:** `#HeoLab` hashtag pill (neon-pink bg) above wordmark + 🕹️ emoji + gradient border strip at top (pink→blue 4px)

### Instagram (Square)
- **Route:** `/api/banner/instagram.png`
- **Size:** 1080×1080 px
- **Layout:** centered column
- **Small elements:** 2×2 neon pixel squares (one per corner, 40px, colors: green/pink/blue/yellow) + "Play in your browser" subtitle in `#666`

---

## Architecture

All 4 routes follow the same pattern as `src/app/api/logo.png/route.tsx`:
- `export const runtime = "edge"`
- `ImageResponse` from `next/og`
- No query params needed (fixed size per platform)

**Files to create:**
- `src/app/api/banner/facebook.png/route.tsx`
- `src/app/api/banner/youtube.png/route.tsx`
- `src/app/api/banner/tiktok.png/route.tsx`
- `src/app/api/banner/instagram.png/route.tsx`
