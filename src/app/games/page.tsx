"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePixelSound } from "@/hooks/usePixelSound";

type Category = "ALL" | "PUZZLE" | "CASUAL" | "ARCADE";

const COLOR_HEX: Record<string, string> = {
  green:  "#39ff14",
  pink:   "#ff2d95",
  yellow: "#ffe600",
  blue:   "#00d4ff",
};

const games = [
  {
    title: "DUNGEON SWEEP",
    subtitle: "Clear the dungeon without waking the monsters.",
    href: "/games/minesweeper",
    color: "green",
    emoji: "💀",
    tag: "PUZZLE",
    category: "PUZZLE" as Category,
    available: true,
  },
  {
    title: "MONSTER 2048",
    subtitle: "Merge pixel monsters to evolve them. Reach the Dragon!",
    href: "/games/2048",
    color: "pink",
    emoji: "🐉",
    tag: "PUZZLE",
    category: "PUZZLE" as Category,
    available: true,
  },
  {
    title: "RUNE SUDOKU",
    subtitle: "Decode ancient runes in this mystical Sudoku.",
    href: "/games/sudoku",
    color: "blue",
    emoji: "🔮",
    tag: "PUZZLE",
    category: "PUZZLE" as Category,
    available: true,
  },
  {
    title: "PIXEL BESTIARY",
    subtitle: "Match pixel creatures. Build combos for bonus points.",
    href: "/games/memory-match",
    color: "yellow",
    emoji: "🃏",
    tag: "MEMORY",
    category: "PUZZLE" as Category,
    available: true,
  },
  {
    title: "NEON SERPENT",
    subtitle: "AI hacker snake consuming data packets in a neon network.",
    href: "/games/snake",
    color: "blue",
    emoji: "🐍",
    tag: "CASUAL",
    category: "CASUAL" as Category,
    available: true,
  },
  {
    title: "PIXEL FLAP",
    subtitle: "Tiny pixel bird flying through an abandoned retro city.",
    href: "/games/flappy",
    color: "yellow",
    emoji: "🐦",
    tag: "CASUAL",
    category: "CASUAL" as Category,
    available: true,
  },
  {
    title: "PIXEL DASH",
    subtitle: "Pixel dinosaur escaping a meteor shower. Unlock new runners!",
    href: "/games/runner",
    color: "green",
    emoji: "🦕",
    tag: "CASUAL",
    category: "CASUAL" as Category,
    available: true,
  },
  {
    title: "BLOCK STORM",
    subtitle: "Stack blocks to hold the crumbling castle. Random chaos events!",
    href: "/games/tetris",
    color: "pink",
    emoji: "🧱",
    tag: "ARCADE",
    category: "ARCADE" as Category,
    available: true,
  },
  {
    title: "ASTRO RAID",
    subtitle: "Solo retro spaceship vs pixel alien invaders. Boss every 5 waves!",
    href: "/games/space",
    color: "blue",
    emoji: "👾",
    tag: "ARCADE",
    category: "ARCADE" as Category,
    available: true,
  },
];

const TABS: Category[] = ["ALL", "PUZZLE", "CASUAL", "ARCADE"];

export default function GamesPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("ALL");
  const [searchQuery, setSearchQuery]       = useState("");
  const [flashCard, setFlashCard]           = useState<string | null>(null);
  const [searchFocused, setSearchFocused]   = useState(false);
  const sounds   = usePixelSound();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = games.filter((g) => {
    const matchCategory = activeCategory === "ALL" || g.category === activeCategory;
    const matchSearch   = g.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="flex flex-col items-center min-h-screen px-3 sm:px-4 py-8 sm:py-12 gap-6 sm:gap-8">

      {/* Header */}
      <header className="text-center">
        <Link
          href="/"
          className="text-[0.5rem] text-neon-green/60 hover:text-neon-green transition-colors mb-4 block"
        >
          &larr; HEOLAB
        </Link>
        <h1 className="text-2xl md:text-3xl neon-text neon-text-green mb-3">
          ARCADE
        </h1>
        <p className="text-[0.55rem] text-gray-500 tracking-widest">
          CHOOSE YOUR GAME
        </p>
      </header>

      {/* ── Search bar ─────────────────────────────────────── */}
      <div
        className="relative w-full max-w-sm cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Glow border */}
        <div
          className="absolute inset-0 transition-all duration-300 pointer-events-none"
          style={{
            border: `1px solid ${searchFocused ? "#39ff14cc" : "#39ff1433"}`,
            boxShadow: searchFocused
              ? "0 0 18px #39ff1430, inset 0 0 12px #39ff1408"
              : "none",
          }}
        />

        <div className="relative flex items-center gap-2 bg-dark-card px-4 py-3">
          {/* Terminal prompt */}
          <span
            className="font-pixel text-xs shrink-0 transition-colors duration-200 select-none"
            style={{ color: searchFocused ? "#39ff14" : "#39ff1466" }}
          >
            &gt;
          </span>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="SEARCH GAME..."
            spellCheck={false}
            className="flex-1 bg-transparent font-pixel text-[0.55rem] tracking-widest text-neon-green
              placeholder:text-gray-600 outline-none caret-neon-green"
          />

          {/* Clear button */}
          {searchQuery && (
            <button
              onMouseDown={(e) => { e.preventDefault(); setSearchQuery(""); }}
              className="font-pixel text-[0.45rem] text-gray-600 hover:text-neon-green transition-colors shrink-0"
            >
              [X]
            </button>
          )}

          {/* Scanline sweep on focus */}
          {searchFocused && (
            <div
              className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/40 to-transparent pointer-events-none"
              style={{ animation: "scanlineSwipe 3s linear infinite" }}
            />
          )}
        </div>

        {/* Result count */}
        <div className="absolute -bottom-5 right-0 font-pixel text-[0.38rem] text-gray-700 tracking-widest">
          {filtered.length} GAME{filtered.length !== 1 ? "S" : ""} FOUND
        </div>
      </div>

      {/* ── Category tabs ───────────────────────────────────── */}
      <div className="flex gap-1 sm:gap-2 mt-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveCategory(tab)}
            className={`font-pixel text-[0.45rem] sm:text-[0.5rem] px-3 py-1.5 border transition-all duration-150 ${
              activeCategory === tab
                ? "border-neon-green text-neon-green bg-neon-green/10"
                : "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Game grid ───────────────────────────────────────── */}
      {filtered.length === 0 ? (
        /* No results */
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-4xl">📡</span>
          <p className="font-pixel text-[0.5rem] text-neon-green/50 tracking-widest">
            &gt; NO SIGNAL
          </p>
          <p className="font-pixel text-[0.4rem] text-gray-700 tracking-widest">
            "{searchQuery}" NOT FOUND IN DATABASE
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl">
          {filtered.map((game) => {
            const hex = COLOR_HEX[game.color] ?? "#39ff14";
            return game.available ? (
              <Link
                key={game.href}
                href={game.href}
                className="group relative block rounded-sm bg-dark-card p-5 border transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]"
                style={{ borderColor: `${hex}33` }}
                onMouseEnter={(e) => {
                  sounds.onMouseEnter();
                  (e.currentTarget as HTMLElement).style.borderColor = `${hex}cc`;
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    `0 0 30px ${hex}40, 0 0 60px ${hex}15`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${hex}33`;
                  (e.currentTarget as HTMLElement).style.boxShadow = "";
                }}
                onClick={() => {
                  sounds.onClick();
                  setFlashCard(game.href);
                  setTimeout(() => setFlashCard(null), 250);
                }}
              >
                {/* Select flash overlay */}
                {flashCard === game.href && (
                  <div
                    className="card-flash absolute inset-0 rounded-sm pointer-events-none z-10"
                    style={{ background: hex }}
                  />
                )}

                {/* Tag */}
                <span
                  className="absolute top-3 right-3 font-pixel text-[0.4rem] px-1.5 py-0.5 border"
                  style={{ color: hex, borderColor: `${hex}55` }}
                >
                  {game.tag}
                </span>

                {/* Emoji */}
                <div className="text-4xl mb-4 transition-transform duration-300 group-hover:scale-110 inline-block">
                  {game.emoji}
                </div>

                {/* Title with ► cursor */}
                <h3
                  className="font-pixel text-[0.55rem] mb-2 tracking-wider leading-relaxed flex items-center gap-2"
                  style={{ color: hex }}
                >
                  <span className="cursor-blink opacity-0 group-hover:opacity-100">►</span>
                  {game.title}
                </h3>

                <p className="text-[0.6rem] text-gray-400 leading-relaxed mb-3">
                  {game.subtitle}
                </p>

                <p
                  className="text-[0.4rem] font-pixel opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ color: hex }}
                >
                  PLAY NOW →
                </p>
              </Link>
            ) : (
              /* Coming soon card */
              <div
                key={game.href}
                className="relative rounded-sm bg-dark-card border border-gray-800 p-5 opacity-50"
              >
                <span className="absolute top-3 right-3 font-pixel text-[0.45rem] px-2 py-0.5 border border-gray-700 text-gray-600">
                  {game.tag}
                </span>
                <div className="text-4xl mb-3 grayscale">{game.emoji}</div>
                <h3 className="font-pixel text-[0.55rem] text-gray-500 mb-2">{game.title}</h3>
                <p className="text-[0.6rem] text-gray-600 mb-3">{game.subtitle}</p>
                <span className="inline-block font-pixel text-[0.4rem] text-gray-600 border border-gray-800 px-2 py-0.5">
                  COMING SOON
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <footer className="text-[0.5rem] text-gray-600 mt-4">
        INSERT COIN TO CONTINUE
      </footer>
    </div>
  );
}
