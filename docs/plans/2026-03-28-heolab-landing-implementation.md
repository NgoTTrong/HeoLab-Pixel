# HeoLab Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebrand GameStation → HeoLab with a modern landing page at `/`, move arcade to `/games`, and add full SEO for public launch at `heolab.dev`.

**Architecture:** New server-component landing page at `src/app/page.tsx`. Arcade listing moves to `src/app/games/page.tsx`. Game pages unchanged except for a layout.tsx per game that exports metadata. Inter font added alongside existing Press Start 2P.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Inter + Press Start 2P (next/font/google).

---

### Task 1: Add Inter font + update global metadata + CSS utility

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: Update layout.tsx**

Replace entire file:

```tsx
import type { Metadata } from "next";
import { Press_Start_2P, Inter } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-press-start",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://heolab.dev"),
  title: "HeoLab — Play Free Browser Games",
  description:
    "HeoLab is an indie game lab with free browser games. Play Minesweeper, 2048, Sudoku and more — no download needed.",
  openGraph: {
    type: "website",
    url: "https://heolab.dev",
    title: "HeoLab — Play Free Browser Games",
    description:
      "HeoLab is an indie game lab with free browser games. Play Minesweeper, 2048, Sudoku and more — no download needed.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "HeoLab" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HeoLab — Play Free Browser Games",
    description: "Free browser games, crafted with care.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${pressStart.variable} ${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col font-pixel">
        <div className="scanline-overlay" />
        {children}
      </body>
    </html>
  );
}
```

**Step 2: Add font-inter utility + hero animations to globals.css**

Add after the existing `@theme inline` block:

```css
/* Inter font utility */
.font-inter {
  font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}

/* Hero dot grid background */
.hero-dot-grid {
  background-image: radial-gradient(circle, rgba(57, 255, 20, 0.12) 1px, transparent 1px);
  background-size: 28px 28px;
  animation: dotDrift 25s linear infinite;
}

@keyframes dotDrift {
  0% { background-position: 0 0; }
  100% { background-position: 28px 28px; }
}

/* Section fade-up entrance */
@keyframes fadeUp {
  0% { opacity: 0; transform: translateY(24px); }
  100% { opacity: 1; transform: translateY(0); }
}

.fade-up {
  animation: fadeUp 0.6s ease-out forwards;
}
```

**Step 3: Verify dev server compiles**

Run: `npm run dev`
Expected: No errors in terminal, `http://localhost:3000` loads.

**Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: add Inter font, HeoLab global metadata, CSS utilities"
```

---

### Task 2: Move arcade listing to /games/page.tsx

**Files:**
- Create: `src/app/games/page.tsx`

**Step 1: Create /games/page.tsx**

This is the current homepage content, moved and lightly updated:

```tsx
import Link from "next/link";
import GameCard from "@/components/GameCard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Games — HeoLab",
  description: "Browse all free browser games on HeoLab. Minesweeper, 2048, Sudoku, Memory Match and more.",
};

const games = [
  {
    title: "DUNGEON SWEEP",
    subtitle: "Clear the dungeon without waking the monsters. Classic minesweeper with a pixel RPG twist.",
    href: "/games/minesweeper",
    color: "green" as const,
    emoji: "\uD83D\uDC80",
    tag: "PUZZLE",
  },
  {
    title: "MONSTER 2048",
    subtitle: "Merge pixel monsters to evolve them. Can you reach the legendary Dragon?",
    href: "/games/2048",
    color: "pink" as const,
    emoji: "\uD83D\uDC09",
    tag: "PUZZLE",
  },
  {
    title: "RUNE SUDOKU",
    subtitle: "Decode ancient runes in this mystical take on the classic number puzzle.",
    href: "/games/sudoku",
    color: "blue" as const,
    emoji: "\uD83D\uDD2E",
    tag: "PUZZLE",
  },
  {
    title: "PIXEL BESTIARY",
    subtitle: "Match pixel creatures from the bestiary. Build combos for bonus points.",
    href: "/games/memory-match",
    color: "yellow" as const,
    emoji: "\uD83C\uDCCF",
    tag: "MEMORY",
  },
];

export default function GamesPage() {
  return (
    <div className="flex flex-col items-center min-h-screen px-3 sm:px-4 py-8 sm:py-12 gap-6 sm:gap-10">
      {/* Header */}
      <header className="text-center">
        <Link
          href="/"
          className="text-[0.5rem] text-neon-green/60 hover:text-neon-green transition-colors mb-4 block"
        >
          &larr; HEOLAB
        </Link>
        <h1 className="text-2xl md:text-3xl neon-text neon-text-green glow-pulse mb-3">
          ARCADE
        </h1>
        <p className="text-[0.55rem] text-gray-500 tracking-widest">
          CHOOSE YOUR GAME
        </p>
      </header>

      {/* Game grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {games.map((game) => (
          <GameCard key={game.href} {...game} />
        ))}
      </div>

      {/* Footer */}
      <footer className="text-[0.5rem] text-gray-600 glow-pulse">
        INSERT COIN TO CONTINUE
      </footer>
    </div>
  );
}
```

**Step 2: Verify**

Navigate to `http://localhost:3000/games` — should show the 4 game cards.

**Step 3: Commit**

```bash
git add src/app/games/page.tsx
git commit -m "feat: move arcade listing to /games"
```

---

### Task 3: Update GameLayout back link + per-game metadata

**Files:**
- Modify: `src/components/GameLayout.tsx` (line 41)
- Create: `src/app/games/minesweeper/layout.tsx`
- Create: `src/app/games/2048/layout.tsx`
- Create: `src/app/games/sudoku/layout.tsx`
- Create: `src/app/games/memory-match/layout.tsx`

**Step 1: Fix back link in GameLayout.tsx**

Change line 41–44:
```tsx
// OLD
href="/"
// NEW
href="/games"
```

**Step 2: Create per-game layout files**

`src/app/games/minesweeper/layout.tsx`:
```tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dungeon Sweep — Free Minesweeper Game | HeoLab",
  description:
    "Play Dungeon Sweep, a pixel RPG minesweeper. Clear the dungeon without waking the monsters. Free, no download needed.",
  openGraph: {
    title: "Dungeon Sweep — Free Minesweeper Game | HeoLab",
    description: "Clear the dungeon without waking the monsters.",
    url: "https://heolab.dev/games/minesweeper",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

`src/app/games/2048/layout.tsx`:
```tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Monster 2048 — Free 2048 Game | HeoLab",
  description:
    "Play Monster 2048, merge pixel monsters to evolve them into a legendary Dragon. Free browser game, no download needed.",
  openGraph: {
    title: "Monster 2048 — Free 2048 Game | HeoLab",
    description: "Merge pixel monsters to evolve them. Can you reach the Dragon?",
    url: "https://heolab.dev/games/2048",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

`src/app/games/sudoku/layout.tsx`:
```tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rune Sudoku — Free Sudoku Game | HeoLab",
  description:
    "Play Rune Sudoku, a mystical take on classic Sudoku with Elder Futhark runes. Free browser game, no download needed.",
  openGraph: {
    title: "Rune Sudoku — Free Sudoku Game | HeoLab",
    description: "Decode ancient runes in this mystical Sudoku game.",
    url: "https://heolab.dev/games/sudoku",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

`src/app/games/memory-match/layout.tsx`:
```tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pixel Bestiary — Free Memory Match Game | HeoLab",
  description:
    "Play Pixel Bestiary, a memory match game with pixel creatures. Build combos for bonus points. Free browser game, no download needed.",
  openGraph: {
    title: "Pixel Bestiary — Free Memory Match Game | HeoLab",
    description: "Match pixel creatures and build combos for bonus points.",
    url: "https://heolab.dev/games/memory-match",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

**Step 3: Verify**

- Click any game from `/games` — back button should now say `← BACK` and go to `/games`
- Check browser tab title on minesweeper: "Dungeon Sweep — Free Minesweeper Game | HeoLab"

**Step 4: Commit**

```bash
git add src/components/GameLayout.tsx src/app/games/minesweeper/layout.tsx src/app/games/2048/layout.tsx src/app/games/sudoku/layout.tsx src/app/games/memory-match/layout.tsx
git commit -m "feat: update back links to /games, add per-game SEO metadata"
```

---

### Task 4: Add sitemap + robots + OG image

**Files:**
- Create: `src/app/sitemap.ts`
- Create: `src/app/robots.ts`
- Create: `src/app/opengraph-image.tsx`

**Step 1: Create sitemap.ts**

```ts
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://heolab.dev";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/games`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/games/minesweeper`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/games/2048`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/games/sudoku`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/games/memory-match`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];
}
```

**Step 2: Create robots.ts**

```ts
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://heolab.dev/sitemap.xml",
  };
}
```

**Step 3: Create OG image (opengraph-image.tsx)**

Next.js automatically serves this as `/og-image.png` and uses it for OG:

```tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "HeoLab — Play Free Browser Games";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Dot grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle, rgba(57,255,20,0.1) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "#39ff14", fontSize: "48px" }}>&lt;</span>
          <span style={{ fontSize: "96px", fontWeight: "bold", color: "white" }}>
            HeoLab
          </span>
          <span style={{ color: "#39ff14", fontSize: "48px" }}>/&gt;</span>
        </div>
        {/* Tagline */}
        <div style={{ fontSize: "36px", color: "#39ff14" }}>
          Play. Explore. Have Fun.
        </div>
        {/* Sub */}
        <div style={{ fontSize: "22px", color: "#666" }}>
          Free browser games · heolab.dev
        </div>
      </div>
    ),
    { ...size }
  );
}
```

**Step 4: Verify**

- `http://localhost:3000/sitemap.xml` — shows XML with all 6 URLs
- `http://localhost:3000/robots.txt` — shows allow all + sitemap link
- `http://localhost:3000/opengraph-image` — shows the OG image preview

**Step 5: Commit**

```bash
git add src/app/sitemap.ts src/app/robots.ts src/app/opengraph-image.tsx
git commit -m "feat: add sitemap, robots.txt, OG image"
```

---

### Task 5: Build the landing page

**Files:**
- Modify: `src/app/page.tsx` (full rewrite)

**Step 1: Write the new landing page**

```tsx
import Link from "next/link";

const games = [
  {
    title: "DUNGEON SWEEP",
    subtitle: "Pixel RPG minesweeper. Clear the dungeon without waking the monsters.",
    href: "/games/minesweeper",
    color: "neon-green",
    borderColor: "#39ff14",
    emoji: "💀",
    tag: "PUZZLE",
  },
  {
    title: "MONSTER 2048",
    subtitle: "Merge pixel monsters to evolve them. Can you reach the Dragon?",
    href: "/games/2048",
    color: "neon-pink",
    borderColor: "#ff2d95",
    emoji: "🐉",
    tag: "PUZZLE",
  },
  {
    title: "RUNE SUDOKU",
    subtitle: "Decode ancient runes in this mystical take on classic Sudoku.",
    href: "/games/sudoku",
    color: "neon-blue",
    borderColor: "#00d4ff",
    emoji: "🔮",
    tag: "PUZZLE",
  },
  {
    title: "PIXEL BESTIARY",
    subtitle: "Match pixel creatures from the bestiary. Build combos for bonus points.",
    href: "/games/memory-match",
    color: "neon-yellow",
    borderColor: "#ffe600",
    emoji: "🃏",
    tag: "MEMORY",
  },
];

const roadmap = [
  { title: "Snake", emoji: "🐍", status: "COMING SOON" },
  { title: "Tetris", emoji: "🧱", status: "COMING SOON" },
  { title: "Flappy Bird", emoji: "🐦", status: "COMING SOON" },
];

export default function HomePage() {
  return (
    <main className="font-inter">
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        {/* Animated dot grid */}
        <div className="absolute inset-0 hero-dot-grid opacity-60" />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(88,28,135,0.25)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom-right,rgba(0,212,255,0.08)_0%,transparent_50%)]" />

        <div className="relative z-10 flex flex-col items-center gap-6 fade-up">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="font-pixel text-neon-green text-xl">&lt;</span>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-white">
              HeoLab
            </h1>
            <span className="font-pixel text-neon-green text-xl">/&gt;</span>
          </div>

          {/* Tagline */}
          <p className="text-2xl md:text-3xl font-semibold text-gray-300 tracking-wide">
            Play. Explore. Have Fun.
          </p>
          <p className="text-sm text-gray-500 max-w-sm">
            Free browser games, crafted with care. No download. No account.
          </p>

          {/* CTA */}
          <Link
            href="#games"
            className="mt-4 px-8 py-3 border border-neon-green text-neon-green font-pixel text-[0.6rem]
              hover:bg-neon-green hover:text-black transition-all duration-200 tracking-widest"
          >
            PLAY NOW
          </Link>

          {/* Scroll indicator */}
          <div className="mt-8 text-gray-600 text-lg animate-bounce select-none">↓</div>
        </div>
      </section>

      {/* ── GAMES SHOWCASE ───────────────────────────────── */}
      <section id="games" className="py-24 px-4 max-w-5xl mx-auto">
        <h2 className="font-pixel text-neon-green text-center text-xs tracking-widest mb-12 neon-text neon-text-green">
          GAMES
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {games.map((game) => (
            <Link
              key={game.href}
              href={game.href}
              className="group relative block rounded-sm bg-dark-card p-6 border transition-all duration-300
                hover:-translate-y-1 hover:shadow-lg"
              style={{
                borderColor: `${game.borderColor}33`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${game.borderColor}99`;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${game.borderColor}22`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${game.borderColor}33`;
                (e.currentTarget as HTMLElement).style.boxShadow = "";
              }}
            >
              {/* Tag */}
              <span
                className="absolute top-3 right-3 font-pixel text-[0.45rem] px-2 py-0.5 border"
                style={{ color: game.borderColor, borderColor: `${game.borderColor}55` }}
              >
                {game.tag}
              </span>

              {/* Emoji */}
              <div className="text-5xl mb-4 transition-transform duration-300 group-hover:scale-110 inline-block">
                {game.emoji}
              </div>

              {/* Title */}
              <h3
                className="font-pixel text-[0.6rem] mb-3 tracking-wider"
                style={{ color: game.borderColor }}
              >
                {game.title}
              </h3>

              {/* Subtitle */}
              <p className="text-xs text-gray-400 leading-relaxed">{game.subtitle}</p>

              {/* Play hint */}
              <p
                className="mt-4 text-[0.5rem] font-pixel opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ color: game.borderColor }}
              >
                PLAY NOW →
              </p>
            </Link>
          ))}

          {/* Coming soon placeholder */}
          <div className="relative block rounded-sm bg-dark-card/40 p-6 border border-gray-800 border-dashed flex items-center justify-center min-h-[180px]">
            <p className="font-pixel text-[0.5rem] text-gray-600 tracking-widest">MORE COMING SOON...</p>
          </div>
        </div>
      </section>

      {/* ── ABOUT ────────────────────────────────────────── */}
      <section className="py-24 px-4 max-w-2xl mx-auto text-center border-t border-gray-900">
        <div className="text-4xl mb-6">🎮</div>
        <h2 className="text-2xl font-bold text-white mb-4">What is HeoLab?</h2>
        <p className="text-gray-400 leading-relaxed">
          HeoLab is a tiny indie game lab. We build fun, free games you can play right in your
          browser — no download, no account needed. Just pick a game and play.
        </p>
      </section>

      {/* ── ROADMAP ──────────────────────────────────────── */}
      <section className="py-24 px-4 max-w-5xl mx-auto border-t border-gray-900">
        <h2 className="font-pixel text-neon-green text-center text-xs tracking-widest mb-12 neon-text neon-text-green">
          WHAT&apos;S NEXT
        </h2>

        <div className="flex flex-wrap justify-center gap-4">
          {roadmap.map((item) => (
            <div
              key={item.title}
              className="bg-dark-card border border-gray-800 px-6 py-4 rounded-sm flex items-center gap-3 min-w-[180px]"
            >
              <span className="text-2xl">{item.emoji}</span>
              <div>
                <p className="text-white text-sm font-semibold">{item.title}</p>
                <span className="font-pixel text-[0.4rem] text-gray-600 tracking-widest">{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="border-t border-gray-900 py-10 px-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-neon-green text-xs">&lt;</span>
            <span className="font-bold text-white text-lg">HeoLab</span>
            <span className="font-pixel text-neon-green text-xs">/&gt;</span>
          </div>
          <div className="flex gap-6 text-[0.5rem] font-pixel text-gray-600">
            <Link href="/games" className="hover:text-neon-green transition-colors">PLAY GAMES</Link>
          </div>
          <p className="text-[0.45rem] text-gray-700 font-pixel">© 2025 HEOLAB · ALL RIGHTS RESERVED</p>
        </div>
      </footer>
    </main>
  );
}
```

> **Note:** The game cards use inline `onMouseEnter/Leave` for dynamic border colors since Tailwind can't use runtime color values. This requires `"use client"` only if those handlers don't compile server-side — if Next.js complains, add `"use client"` at top of the file and remove the `export const metadata` (it's already in layout.tsx).

**Step 2: Verify**

- `http://localhost:3000` — shows HeoLab hero, games grid, about, roadmap, footer
- Click "PLAY NOW" → smooth scrolls to games section
- Click a game card → goes to game
- Mobile: resize to < 768px, check layout

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: HeoLab landing page with hero, games showcase, about, roadmap, footer"
```

---

### Task 6: Fix client/server split for landing page (if needed)

> **Only do this task if Task 5 Step 2 shows a hydration error or "use client" conflict.**

The landing page has `onMouseEnter/Leave` handlers (client-side). If Next.js errors, split into:

**Option A (simpler):** Add `"use client"` to `src/app/page.tsx` — metadata comes from `layout.tsx` (global), which is fine for the homepage.

**Option B (cleaner):** Extract the game card grid into `src/components/GameShowcase.tsx` as a client component, keep `page.tsx` as server component.

Use Option A for speed. Add `"use client"` at line 1 if needed.

**Commit:**
```bash
git add src/app/page.tsx
git commit -m "fix: add use client to landing page for hover handlers"
```

---

### Task 7: Update project name in package.json

**Files:**
- Modify: `package.json`

**Step 1: Change name field**

```json
{
  "name": "heolab",
  ...
}
```

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore: rename project to heolab"
```

---

## Verification Checklist (after all tasks)

- [ ] `http://localhost:3000` shows HeoLab landing page
- [ ] `http://localhost:3000/games` shows arcade listing with 4 games
- [ ] Each game page has correct `<title>` in browser tab
- [ ] Back button in each game goes to `/games` (not `/`)
- [ ] `http://localhost:3000/sitemap.xml` shows all 6 URLs
- [ ] `http://localhost:3000/robots.txt` shows allow + sitemap
- [ ] `http://localhost:3000/opengraph-image` renders OG preview
- [ ] Mobile layout looks good at 390px width
- [ ] `npm run build` completes with no errors
