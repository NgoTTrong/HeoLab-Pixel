"use client";

import { useState } from "react";
import Link from "next/link";
import GameCard from "@/components/GameCard";

type Category = "ALL" | "PUZZLE" | "CASUAL" | "ARCADE";

const games = [
  // PUZZLE (existing)
  {
    title: "DUNGEON SWEEP",
    subtitle: "Clear the dungeon without waking the monsters.",
    href: "/games/minesweeper",
    color: "green" as const,
    emoji: "💀",
    tag: "PUZZLE",
    category: "PUZZLE" as Category,
    available: true,
  },
  {
    title: "MONSTER 2048",
    subtitle: "Merge pixel monsters to evolve them. Reach the Dragon!",
    href: "/games/2048",
    color: "pink" as const,
    emoji: "🐉",
    tag: "PUZZLE",
    category: "PUZZLE" as Category,
    available: true,
  },
  {
    title: "RUNE SUDOKU",
    subtitle: "Decode ancient runes in this mystical Sudoku.",
    href: "/games/sudoku",
    color: "blue" as const,
    emoji: "🔮",
    tag: "PUZZLE",
    category: "PUZZLE" as Category,
    available: true,
  },
  {
    title: "PIXEL BESTIARY",
    subtitle: "Match pixel creatures. Build combos for bonus points.",
    href: "/games/memory-match",
    color: "yellow" as const,
    emoji: "🃏",
    tag: "MEMORY",
    category: "PUZZLE" as Category,
    available: true,
  },
  // CASUAL (new)
  {
    title: "NEON SERPENT",
    subtitle: "AI hacker snake consuming data packets in a neon network.",
    href: "/games/snake",
    color: "blue" as const,
    emoji: "🐍",
    tag: "CASUAL",
    category: "CASUAL" as Category,
    available: true,
  },
  {
    title: "PIXEL FLAP",
    subtitle: "Tiny pixel bird flying through an abandoned retro city.",
    href: "/games/flappy",
    color: "yellow" as const,
    emoji: "🐦",
    tag: "CASUAL",
    category: "CASUAL" as Category,
    available: true,
  },
  {
    title: "PIXEL DASH",
    subtitle: "Pixel dinosaur escaping a meteor shower. Unlock new runners!",
    href: "/games/runner",
    color: "green" as const,
    emoji: "🦕",
    tag: "CASUAL",
    category: "CASUAL" as Category,
    available: false,
  },
  // ARCADE (new)
  {
    title: "BLOCK STORM",
    subtitle: "Stack blocks to hold the crumbling castle. Random chaos events!",
    href: "/games/tetris",
    color: "pink" as const,
    emoji: "🧱",
    tag: "ARCADE",
    category: "ARCADE" as Category,
    available: true,
  },
  {
    title: "ASTRO RAID",
    subtitle: "Solo retro spaceship vs pixel alien invaders. Boss every 5 waves!",
    href: "/games/space",
    color: "blue" as const,
    emoji: "👾",
    tag: "ARCADE",
    category: "ARCADE" as Category,
    available: false,
  },
];

const TABS: Category[] = ["ALL", "PUZZLE", "CASUAL", "ARCADE"];

export default function GamesPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("ALL");

  const filtered =
    activeCategory === "ALL"
      ? games
      : games.filter((g) => g.category === activeCategory);

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
        <h1 className="text-2xl md:text-3xl neon-text neon-text-green mb-3">
          ARCADE
        </h1>
        <p className="text-[0.55rem] text-gray-500 tracking-widest">
          CHOOSE YOUR GAME
        </p>
      </header>

      {/* Category filter tabs */}
      <div className="flex gap-1 sm:gap-2">
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

      {/* Game grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {filtered.map((game) =>
          game.available ? (
            <GameCard key={game.href} {...game} />
          ) : (
            <div
              key={game.href}
              className="relative rounded-sm bg-dark-card border border-gray-800 p-5 opacity-60"
            >
              <span className="absolute top-3 right-3 font-pixel text-[0.45rem] px-2 py-0.5 border border-gray-700 text-gray-600">
                {game.tag}
              </span>
              <div className="text-4xl mb-3 grayscale">{game.emoji}</div>
              <h3 className="font-pixel text-[0.55rem] text-gray-500 mb-2">
                {game.title}
              </h3>
              <p className="text-xs text-gray-600">{game.subtitle}</p>
              <span className="mt-3 inline-block font-pixel text-[0.4rem] text-gray-600 border border-gray-800 px-2 py-0.5">
                COMING SOON
              </span>
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <footer className="text-[0.5rem] text-gray-600">
        INSERT COIN TO CONTINUE
      </footer>
    </div>
  );
}
