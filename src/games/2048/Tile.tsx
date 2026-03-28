import { TileData, MONSTERS } from "./types";

const bgColors: Record<number, string> = {
  2: "bg-neon-green/20",
  4: "bg-neon-green/30",
  8: "bg-neon-yellow/20",
  16: "bg-neon-yellow/30",
  32: "bg-neon-pink/20",
  64: "bg-neon-pink/30",
  128: "bg-neon-blue/20",
  256: "bg-neon-blue/30",
  512: "bg-neon-pink/40",
  1024: "bg-neon-yellow/40",
  2048: "bg-neon-green/50",
  4096: "bg-neon-pink/50",
};

export default function Tile({ tile }: { tile: TileData }) {
  const monster = MONSTERS[tile.value];
  const bg = bgColors[tile.value] || "bg-neon-pink/60";

  return (
    <div
      className={`${bg} w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center rounded pixel-fade-in border border-dark-border`}
    >
      <span className="text-xl sm:text-2xl leading-none">
        {monster ? monster.emoji : "\u{2753}"}
      </span>
      <span className="text-[0.45rem] sm:text-[0.5rem] text-gray-300 mt-0.5">
        {tile.value}
      </span>
    </div>
  );
}
