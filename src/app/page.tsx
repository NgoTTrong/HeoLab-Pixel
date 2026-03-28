"use client";

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
