# HeoLab — Master Plan

> Tài liệu tổng hợp toàn bộ chiến lược phát triển HeoLab: sản phẩm, game, marketing.
> Cập nhật lần cuối: 2026-03-28

---

## 1. Tổng quan

**HeoLab** (`heolab.dev`) là một indie game lab — nơi tổng hợp các game browser miễn phí, không cần tài khoản, không cần cài đặt.

**Tech stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
**Deploy:** Vercel
**Domain:** `heolab.dev`
**Ngôn ngữ:** English (toàn bộ UI và content)

---

## 2. Cấu trúc website

```
heolab.dev/              ← Landing page (modern, dark)
heolab.dev/games         ← Arcade listing (filter theo category)
heolab.dev/games/[slug]  ← Từng game
heolab.dev/sitemap.xml   ← Auto-generated SEO
heolab.dev/robots.txt    ← Allow all crawlers
```

### Landing page sections
1. **Hero** — animated dot grid, logo `<HeoLab/>`, tagline *"Play. Explore. Have Fun."*, CTA "Play Now"
2. **Games Showcase** — grid card có hover glow, filter ALL/PUZZLE/CASUAL/ARCADE
3. **About** — *"HeoLab is a tiny indie game lab. Free browser games, no download, no account."*
4. **Roadmap** — các game sắp ra
5. **Footer** — link `/games`, copyright

---

## 3. Games Roadmap

### Phase 1 — Puzzle (DONE ✅)
| Game | Route | Theme | Color |
|------|-------|-------|-------|
| Dungeon Sweep | `/games/minesweeper` | Pixel RPG minesweeper | Green |
| Monster 2048 | `/games/2048` | Merge pixel monsters | Pink |
| Rune Sudoku | `/games/sudoku` | Elder Futhark runes | Blue |
| Pixel Bestiary | `/games/memory-match` | Match pixel creatures | Yellow |

### Phase 2 — Casual + Arcade (IN PROGRESS 🔨)
| Game | Route | Concept | Category | Color |
|------|-------|---------|----------|-------|
| **Neon Serpent** | `/games/snake` | Cyberpunk snake, neon trail, power-ups (Speed Boost, Ghost, ×2 Score) | Casual | Cyan |
| **Pixel Flap** | `/games/flappy` | Flappy Bird, time-of-day themes, medal system, pixel particle death | Casual | Yellow |
| **Pixel Dash** | `/games/runner` | Endless runner, 3 unlockable chars (Dino/Robot/Ninja), 4 worlds | Casual | Green |
| **Block Storm** | `/games/tetris` | Tetris + random chaos events (Lightning/Bomb/Ice/Fever) | Arcade | Orange |
| **Astro Raid** | `/games/space` | Space Invaders, wave patterns, boss every 5 waves, power-ups | Arcade | Purple |

### Phase 3 — Classic Arcade (PLANNED)
- Snake (extended), Pac-Man, Pong, Brick Breaker

### Phase 4 — Card & Word (PLANNED)
- Wordle clone, Hangman, Connections-style

---

## 4. Design System

### Colors
| Token | Hex | Dùng cho |
|-------|-----|---------|
| `neon-green` | `#39ff14` | Puzzle, primary brand |
| `neon-pink` | `#ff2d95` | 2048, lose states |
| `neon-yellow` | `#ffe600` | Memory Match, Pixel Flap |
| `neon-blue` | `#00d4ff` | Sudoku, Snake |
| `neon-purple` | `#a855f7` | Astro Raid, Casual category |
| `neon-orange` | `#f97316` | Block Storm, Arcade category |
| `dark-bg` | `#0a0a0a` | Background |
| `dark-card` | `#1a1a2e` | Cards |

### Fonts
- **Press Start 2P** — game titles, badges, pixel elements
- **Inter** — landing page body, about section, roadmap

### Win/Lose Overlay Pattern (apply to ALL games)
```tsx
// Win overlay
<div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
  <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
  <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
    <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">{emoji}</div>
    <h2 className="text-lg sm:text-xl neon-text-{color} animate-[victoryGlow_1.5s_ease-in-out_infinite]">WIN TEXT</h2>
    <p className="text-[0.6rem] text-neon-{color}/70">STAT LINE</p>
    <PixelButton color="{color}" onClick={onNewGame}>PLAY AGAIN</PixelButton>
  </div>
</div>

// Lose: thêm animate-[screenShake_0.5s_ease-in-out] vào board wrapper
// Lose overlay dùng neon-text-pink + animate-[defeatFlash_1s_ease-in-out_infinite]
```

### CSS Keyframes (globals.css)
`overlayIn`, `victoryGlow`, `victoryGlowBlue`, `victoryGlowYellow`, `defeatFlash`, `floatUp`, `screenShake`, `cellBounce`, `flagPop`, `dotDrift`, `fadeUp`

---

## 5. SEO Strategy

### Global metadata
```
Title:       "HeoLab — Play Free Browser Games"
Description: "HeoLab is an indie game lab with free browser games. Play Minesweeper, 2048, Sudoku and more — no download needed."
OG Image:    /opengraph-image (Next.js ImageResponse, 1200×630)
Canonical:   https://heolab.dev
Lang:        en
```

### Per-game title pattern
```
"{Game Display Name} — Free {Game Type} Game | HeoLab"
```

### Mỗi game có layout.tsx riêng để export metadata (vì page.tsx là "use client")

### Files SEO
- `src/app/sitemap.ts` — auto-generated `/sitemap.xml`
- `src/app/robots.ts` — allow all + point to sitemap
- `src/app/opengraph-image.tsx` — dynamic OG image

---

## 6. Content Expandability

Mỗi game có `src/games/{game}/config.ts` chứa:
- Characters/skins array → thêm nhân vật = thêm 1 object
- Power-ups array → thêm power-up = thêm 1 object
- Level/wave/world configs → thêm stage = thêm 1 entry
- Không cần sửa game logic khi thêm nội dung

---

## 7. Video Marketing Strategy

### Mục tiêu
Kéo traffic organic về `heolab.dev` qua video miễn phí trên 5 platforms.

### Format: "Challenge + Showcase"
Mỗi video = 1 challenge gắn với game cụ thể. Hook → Attempt → Win/Lose → CTA.
Không cần quay mặt, không cần nói — chỉ screen record + text overlay + nhạc.

### Platforms
| Platform | Format | Cách đăng |
|----------|--------|-----------|
| YouTube | Long-form (5-8 phút) + Shorts | Manual upload |
| TikTok | Short (30-60s) | Auto via Repurpose.io |
| Instagram Reels | Short | Auto via Repurpose.io |
| Facebook Reels | Short | Auto via Repurpose.io |
| YouTube Shorts | Auto-clip | Auto via Repurpose.io |

**Workflow:**
```
OBS (record) → CapCut (edit) → YouTube (upload) → Repurpose.io (auto-distribute) → 4 platforms
```

### Tools (tất cả miễn phí)
| Tool | Dùng cho |
|------|---------|
| OBS Studio | Screen recording |
| CapCut PC | Edit, text overlay, nhạc |
| YouTube Audio Library / Pixabay | Nhạc copyright-free |
| Canva | Thumbnail YouTube |
| Repurpose.io | Auto cross-post |
| Buffer | Scheduling |

### Lịch đăng (tuần)
- **Thứ 2** — Short (game mới nhất)
- **Thứ 4** — Short (challenge khác)
- **Thứ 6** — Long-form YouTube

### Title Formulas

**Long-form:**
```
"[Challenge] + [Game Name] + [Keyword]"
→ "I Tried Beating Minesweeper Hard Mode in Under 60 Seconds"
→ "Free Tetris Browser Game With RANDOM CHAOS Events — Block Storm"
```

**Shorts:**
```
"[Hook question] + emoji"
→ "Can I survive wave 10? 👾"
→ "This power-up just broke the game 💣"
```

### Description template
```
Play [Game] for free at heolab.dev — no download, no account needed.

[1-2 câu mô tả]

🎮 Play now: https://heolab.dev/games/[slug]
🕹️ All games: https://heolab.dev/games

#freegames #browsergames #[gamename] #heolab #indiegame
```

### 4 video đầu tiên (launch sequence)
1. **Long:** *"I Built a Free Browser Arcade — Here Are All the Games (HeoLab)"* — tour toàn bộ site
2. **Short:** Best 30s clip từ video trên
3. **Long:** *"Can I Beat Minesweeper Hard Mode in Under 60 Seconds?"*
4. **Short:** *"Minesweeper Hard Mode attempt 👀"*

### Video ideas theo game
| Game | Short Ideas | Long Ideas |
|------|-------------|------------|
| Dungeon Sweep | "Hard mode in 60s?" | "Minesweeper Hard speedrun" |
| Monster 2048 | "Reaching the Dragon 🐉" | "Every merge strategy explained" |
| Neon Serpent | "1000 pts no power-ups" | "All power-ups ranked + tips" |
| Block Storm | "Bomb block clutch save" | "How to use every chaos event" |
| Pixel Flap | "Platinum medal attempt" | "Day vs night mode comparison" |
| Pixel Dash | "Unlocking the Ninja 🥷" | "All 3 worlds + characters guide" |
| Astro Raid | "Boss wave survival" | "Wave 10 boss guide" |
| Rune Sudoku | "Hard mode no hints" | "Rune Sudoku for beginners" |
| Pixel Bestiary | "Max combo chain" | "Memory strategy guide" |

---

## 8. Checklist Launch

### Website
- [ ] Landing page HeoLab live tại `heolab.dev`
- [ ] `/games` có category filter (ALL/PUZZLE/CASUAL/ARCADE)
- [ ] 4 Phase 1 games playable
- [ ] Sitemap + robots.txt + OG image
- [ ] Deploy lên Vercel, bind domain `heolab.dev`

### Phase 2 Games
- [ ] Neon Serpent (Snake)
- [ ] Block Storm (Tetris)
- [ ] Pixel Flap (Flappy Bird)
- [ ] Pixel Dash (Runner)
- [ ] Astro Raid (Space Invaders)

### Marketing
- [ ] Tạo kênh YouTube "HeoLab"
- [ ] Setup Repurpose.io (connect YouTube → TikTok + IG + FB)
- [ ] Record + upload video đầu tiên (site tour)
- [ ] Post theo lịch 3x/tuần

---

## 9. Files tham khảo

| File | Nội dung |
|------|---------|
| `docs/plans/2026-03-28-heolab-landing-design.md` | Landing page design |
| `docs/plans/2026-03-28-heolab-landing-implementation.md` | Landing page implementation plan |
| `docs/plans/2026-03-28-phase2-games-design.md` | 5 game Phase 2 design |
| `docs/plans/2026-03-28-games-category-filter.md` | Category filter plan |
| `docs/plans/2026-03-28-snake-game.md` | Neon Serpent plan |
| `docs/plans/2026-03-28-tetris-game.md` | Block Storm plan |
| `docs/plans/2026-03-28-flappy-game.md` | Pixel Flap plan |
| `docs/plans/2026-03-28-runner-game.md` | Pixel Dash plan |
| `docs/plans/2026-03-28-space-game.md` | Astro Raid plan |
| `docs/plans/2026-03-28-heolab-video-strategy.md` | Video marketing strategy |
