import GameCard from "@/components/GameCard";

const games = [
  {
    title: "DUNGEON SWEEP",
    subtitle:
      "Clear the dungeon without waking the monsters. Classic minesweeper with a pixel RPG twist.",
    href: "/games/minesweeper",
    color: "green" as const,
    emoji: "\uD83D\uDC80",
    tag: "PUZZLE",
  },
  {
    title: "MONSTER 2048",
    subtitle:
      "Merge pixel monsters to evolve them. Can you reach the legendary Dragon?",
    href: "/games/2048",
    color: "pink" as const,
    emoji: "\uD83D\uDC09",
    tag: "PUZZLE",
  },
  {
    title: "RUNE SUDOKU",
    subtitle:
      "Decode ancient runes in this mystical take on the classic number puzzle.",
    href: "/games/sudoku",
    color: "blue" as const,
    emoji: "\uD83D\uDD2E",
    tag: "PUZZLE",
  },
  {
    title: "PIXEL BESTIARY",
    subtitle:
      "Match pixel creatures from the bestiary. Build combos for bonus points.",
    href: "/games/memory-match",
    color: "yellow" as const,
    emoji: "\uD83C\uDCCF",
    tag: "MEMORY",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-12 gap-10">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-2xl md:text-3xl neon-text neon-text-green glow-pulse mb-3">
          GAMESTATION
        </h1>
        <p className="text-[0.55rem] text-gray-500 tracking-widest">
          RETRO PUZZLE ARCADE
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
