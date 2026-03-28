# HeoLab Landing Wow — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade landing page with sticky navbar, animated hero, all 9 games with filter tabs, stats section, fixed roadmap, and full social footer.

**Architecture:** New `Navbar` component imported only in `page.tsx`. All landing changes in `src/app/page.tsx`. CSS keyframe added to `globals.css`. No new dependencies.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Press Start 2P + Inter.

---

### Task 1: Add `float` keyframe to globals.css

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add keyframe after existing keyframes**

Find the last `@keyframes` block in `globals.css` and add after it:

```css
@keyframes float {
  0%   { transform: translateY(0px) rotate(0deg); }
  100% { transform: translateY(-16px) rotate(6deg); }
}

@keyframes pulseRing {
  0%   { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.6); opacity: 0; }
}
```

**Step 2: Verify dev server still compiles**

Check browser at `http://localhost:3000` — no errors.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add float and pulseRing keyframes for landing hero"
```

---

### Task 2: Create Navbar component

**Files:**
- Create: `src/components/Navbar.tsx`

**Step 1: Write the component**

```tsx
"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-md border-b border-dark-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
          <span className="font-pixel text-neon-green text-xs">&lt;</span>
          <span className="font-bold text-white text-base tracking-tight">HeoLab</span>
          <span className="font-pixel text-neon-green text-xs">/&gt;</span>
        </Link>

        {/* Right links */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/games"
            className="hidden sm:block font-pixel text-[0.45rem] text-gray-500 hover:text-neon-green transition-colors tracking-widest"
          >
            GAMES
          </Link>
          <Link
            href="#about"
            className="hidden sm:block font-pixel text-[0.45rem] text-gray-500 hover:text-neon-green transition-colors tracking-widest"
          >
            ABOUT
          </Link>
          <Link
            href="/games"
            className="font-pixel text-[0.45rem] px-3 py-1.5 border border-neon-green text-neon-green
              hover:bg-neon-green hover:text-black transition-all duration-200 tracking-widest"
          >
            ▶ PLAY
          </Link>
        </div>
      </div>
    </nav>
  );
}
```

**Step 2: Verify**

Run dev server, navigate to `http://localhost:3000` — navbar not yet visible (not imported yet).

**Step 3: Commit**

```bash
git add src/components/Navbar.tsx
git commit -m "feat: add sticky Navbar component"
```

---

### Task 3: Rewrite landing page (page.tsx)

**Files:**
- Modify: `src/app/page.tsx` (full rewrite)

**Step 1: Replace entire file with the following**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

// ── Data ────────────────────────────────────────────────
type Category = "ALL" | "PUZZLE" | "CASUAL" | "ARCADE";

const allGames = [
  {
    title: "DUNGEON SWEEP",
    subtitle: "Pixel RPG minesweeper. Clear the dungeon without waking the monsters.",
    href: "/games/minesweeper",
    borderColor: "#39ff14",
    emoji: "💀",
    tag: "PUZZLE",
    category: "PUZZLE" as Category,
  },
  {
    title: "MONSTER 2048",
    subtitle: "Merge pixel monsters to evolve them. Can you reach the Dragon?",
    href: "/games/2048",
    borderColor: "#ff2d95",
    emoji: "🐉",
    tag: "PUZZLE",
    category: "PUZZLE" as Category,
  },
  {
    title: "RUNE SUDOKU",
    subtitle: "Decode ancient runes in this mystical take on classic Sudoku.",
    href: "/games/sudoku",
    borderColor: "#00d4ff",
    emoji: "🔮",
    tag: "PUZZLE",
    category: "PUZZLE" as Category,
  },
  {
    title: "PIXEL BESTIARY",
    subtitle: "Match pixel creatures from the bestiary. Build combos for bonus points.",
    href: "/games/memory-match",
    borderColor: "#ffe600",
    emoji: "🃏",
    tag: "MEMORY",
    category: "PUZZLE" as Category,
  },
  {
    title: "NEON SERPENT",
    subtitle: "AI hacker snake consuming data packets in a neon network.",
    href: "/games/snake",
    borderColor: "#00d4ff",
    emoji: "🐍",
    tag: "CASUAL",
    category: "CASUAL" as Category,
  },
  {
    title: "PIXEL FLAP",
    subtitle: "Tiny pixel bird flying through an abandoned retro city.",
    href: "/games/flappy",
    borderColor: "#ffe600",
    emoji: "🐦",
    tag: "CASUAL",
    category: "CASUAL" as Category,
  },
  {
    title: "PIXEL DASH",
    subtitle: "Pixel dinosaur escaping a meteor shower. Unlock new runners!",
    href: "/games/runner",
    borderColor: "#39ff14",
    emoji: "🦕",
    tag: "CASUAL",
    category: "CASUAL" as Category,
  },
  {
    title: "BLOCK STORM",
    subtitle: "Stack blocks to hold the crumbling castle. Random chaos events!",
    href: "/games/tetris",
    borderColor: "#f97316",
    emoji: "🧱",
    tag: "ARCADE",
    category: "ARCADE" as Category,
  },
  {
    title: "ASTRO RAID",
    subtitle: "Solo retro spaceship vs pixel alien invaders. Boss every 5 waves!",
    href: "/games/space",
    borderColor: "#a855f7",
    emoji: "👾",
    tag: "ARCADE",
    category: "ARCADE" as Category,
  },
];

const floatingEmojis = [
  { emoji: "💀", top: "18%", left: "8%",  duration: 3.2, delay: 0 },
  { emoji: "🐉", top: "72%", left: "6%",  duration: 4.1, delay: 0.5 },
  { emoji: "🔮", top: "25%", left: "86%", duration: 5.0, delay: 1.0 },
  { emoji: "🐍", top: "12%", left: "74%", duration: 3.6, delay: 0.3 },
  { emoji: "👾", top: "68%", left: "89%", duration: 4.5, delay: 0.8 },
  { emoji: "🧱", top: "82%", left: "18%", duration: 3.9, delay: 0.2 },
];

const stats = [
  { number: "9",  label: "GAMES" },
  { number: "∞",  label: "PLAYTIME" },
  { number: "0",  label: "DOWNLOADS" },
  { number: "0",  label: "ADS" },
];

const roadmap = [
  { title: "Pac-Man Clone", emoji: "🐱", status: "COMING SOON" },
  { title: "Pong",          emoji: "🏓", status: "COMING SOON" },
  { title: "Brick Breaker", emoji: "💥", status: "COMING SOON" },
];

const socialLinks = [
  {
    label: "YouTube",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
];

const TABS: Category[] = ["ALL", "PUZZLE", "CASUAL", "ARCADE"];

// ── Component ────────────────────────────────────────────
export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Category>("ALL");

  const filtered =
    activeTab === "ALL" ? allGames : allGames.filter((g) => g.category === activeTab);

  return (
    <>
      <Navbar />
      <main className="font-inter">

        {/* ── HERO ──────────────────────────────────────── */}
        <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
          {/* Dot grid */}
          <div className="absolute inset-0 hero-dot-grid opacity-60" />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(88,28,135,0.25)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom-right,rgba(0,212,255,0.08)_0%,transparent_50%)]" />

          {/* Floating emojis — desktop only */}
          <div className="hidden md:block absolute inset-0 pointer-events-none select-none">
            {floatingEmojis.map((item, i) => (
              <div
                key={i}
                className="absolute text-4xl opacity-30"
                style={{
                  top: item.top,
                  left: item.left,
                  animation: `float ${item.duration}s ease-in-out ${item.delay}s infinite alternate`,
                }}
              >
                {item.emoji}
              </div>
            ))}
          </div>

          {/* Content */}
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
              className="mt-2 px-8 py-3 border border-neon-green text-neon-green font-pixel text-[0.6rem]
                hover:bg-neon-green hover:text-black transition-all duration-200 tracking-widest"
            >
              PLAY NOW
            </Link>

            {/* Stats bar */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
              {[
                ["9", "GAMES"],
                ["FREE", "FOREVER"],
                ["0", "DOWNLOADS"],
                ["0", "ADS"],
              ].map(([num, label]) => (
                <span key={label} className="font-pixel text-[0.4rem] text-gray-600 tracking-widest">
                  <span className="text-neon-green">{num}</span> {label}
                </span>
              ))}
            </div>

            {/* Scroll indicator — pulse ring */}
            <div className="mt-6 relative flex items-center justify-center w-8 h-8">
              <div className="absolute inset-0 rounded-full border border-neon-green/40"
                style={{ animation: "pulseRing 2s ease-out infinite" }} />
              <span className="text-gray-600 text-sm">↓</span>
            </div>
          </div>
        </section>

        {/* ── GAMES SHOWCASE ────────────────────────────── */}
        <section id="games" className="py-16 px-4 max-w-6xl mx-auto">
          <h2 className="font-pixel text-neon-green text-center text-xs tracking-widest mb-8 neon-text neon-text-green">
            GAMES
          </h2>

          {/* Filter tabs */}
          <div className="flex justify-center gap-2 mb-8">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`font-pixel text-[0.45rem] px-3 py-1.5 border transition-all duration-150 ${
                  activeTab === tab
                    ? "border-neon-green text-neon-green bg-neon-green/10"
                    : "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Game grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((game) => (
              <Link
                key={game.href}
                href={game.href}
                className="group relative block rounded-sm bg-dark-card p-4 border transition-all duration-300 hover:-translate-y-1"
                style={{ borderColor: `${game.borderColor}33` }}
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
                  className="absolute top-2 right-2 font-pixel text-[0.4rem] px-1.5 py-0.5 border"
                  style={{ color: game.borderColor, borderColor: `${game.borderColor}55` }}
                >
                  {game.tag}
                </span>
                {/* Emoji */}
                <div className="text-3xl mb-3 transition-transform duration-300 group-hover:scale-110 inline-block">
                  {game.emoji}
                </div>
                {/* Title */}
                <h3
                  className="font-pixel text-[0.5rem] mb-2 tracking-wider leading-relaxed"
                  style={{ color: game.borderColor }}
                >
                  {game.title}
                </h3>
                {/* Subtitle */}
                <p className="text-[0.6rem] text-gray-400 leading-relaxed hidden sm:block">
                  {game.subtitle}
                </p>
                {/* Play hint */}
                <p
                  className="mt-3 text-[0.4rem] font-pixel opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ color: game.borderColor }}
                >
                  PLAY NOW →
                </p>
              </Link>
            ))}
          </div>

          {/* View all link */}
          <div className="text-center mt-8">
            <Link
              href="/games"
              className="font-pixel text-[0.5rem] text-neon-green border border-neon-green/40
                px-6 py-2 hover:border-neon-green hover:bg-neon-green/10 transition-all duration-200 tracking-widest"
            >
              VIEW ALL GAMES →
            </Link>
          </div>
        </section>

        {/* ── STATS ─────────────────────────────────────── */}
        <section className="py-16 px-4 max-w-4xl mx-auto border-t border-gray-900">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-dark-card border border-dark-border rounded-sm p-6 text-center
                  hover:border-neon-green/30 transition-colors duration-300"
              >
                <div className="text-3xl md:text-4xl font-bold text-neon-green mb-2 font-inter">
                  {s.number}
                </div>
                <div className="font-pixel text-[0.4rem] text-gray-600 tracking-widest">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── ABOUT ─────────────────────────────────────── */}
        <section id="about" className="py-16 px-4 max-w-2xl mx-auto text-center border-t border-gray-900">
          <div className="text-4xl mb-6">🎮</div>
          <h2 className="text-2xl font-bold text-white mb-4">What is HeoLab?</h2>
          <p className="text-gray-400 leading-relaxed">
            HeoLab is a tiny indie game lab. We build fun, free games you can play right in your
            browser — no download, no account needed. Just pick a game and play.
          </p>
        </section>

        {/* ── ROADMAP ───────────────────────────────────── */}
        <section className="py-16 px-4 max-w-5xl mx-auto border-t border-gray-900">
          <h2 className="font-pixel text-neon-green text-center text-xs tracking-widest mb-10 neon-text neon-text-green">
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
                  <span className="font-pixel text-[0.4rem] text-gray-600 tracking-widest">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────── */}
        <footer className="border-t border-gray-900 py-12 px-4">
          <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="font-pixel text-neon-green text-xs">&lt;</span>
              <span className="font-bold text-white text-lg">HeoLab</span>
              <span className="font-pixel text-neon-green text-xs">/&gt;</span>
            </div>

            {/* Nav links */}
            <div className="flex gap-6 font-pixel text-[0.45rem] text-gray-600">
              <Link href="/games" className="hover:text-neon-green transition-colors tracking-widest">
                PLAY GAMES
              </Link>
              <Link href="#about" className="hover:text-neon-green transition-colors tracking-widest">
                ABOUT
              </Link>
            </div>

            {/* Social icons */}
            <div className="flex gap-5">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  title={s.href === "#" ? `${s.label} — Coming soon` : s.label}
                  aria-label={s.label}
                  className={`transition-colors duration-200 ${
                    s.href === "#"
                      ? "text-gray-700 cursor-not-allowed"
                      : "text-gray-500 hover:text-neon-green"
                  }`}
                  onClick={s.href === "#" ? (e) => e.preventDefault() : undefined}
                >
                  {s.icon}
                </a>
              ))}
            </div>

            {/* Copyright */}
            <p className="font-pixel text-[0.4rem] text-gray-700 tracking-widest text-center">
              © 2025 HEOLAB · ALL RIGHTS RESERVED · HEOLAB.DEV
            </p>
          </div>
        </footer>

      </main>
    </>
  );
}
```

**Step 2: Verify in browser**

- `http://localhost:3000` — check all sections render
- Hero: floating emojis visible on desktop, logo centered
- Stats bar below CTA visible
- Games section: all 9 games shown, filter tabs work
- Stats section: 4 cards
- Roadmap: Pac-Man, Pong, Brick Breaker (NOT Snake/Tetris/Flappy)
- Footer: 4 social icons grayed out, nav links present
- Mobile (resize to 390px): emojis hidden, grid 2-col, navbar shows only `▶ PLAY`

**Step 3: Commit**

```bash
git add src/app/page.tsx src/components/Navbar.tsx
git commit -m "feat: landing page redesign — navbar, animated hero, all 9 games, stats, social footer"
```

---

### Task 4: Verify build passes

**Step 1: Run build**

```bash
cd E:\Personal\GameStation && npm run build
```

Expected: `✓ Compiled successfully` with no TypeScript errors.

If errors: fix them (usually missing types or import issues).

**Step 2: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve build errors after landing redesign"
```
