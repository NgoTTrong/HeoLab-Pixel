import { TileData, MONSTERS } from "./types";
import { TILE_SIZE, GAP, PADDING, getMilestone } from "./constants";

const bgColors: Record<number, string> = {
  2:    "rgba(57,255,20,0.15)",
  4:    "rgba(57,255,20,0.25)",
  8:    "rgba(255,230,0,0.15)",
  16:   "rgba(255,230,0,0.25)",
  32:   "rgba(255,45,149,0.15)",
  64:   "rgba(255,45,149,0.28)",
  128:  "rgba(0,212,255,0.18)",
  256:  "rgba(0,212,255,0.30)",
  512:  "rgba(255,45,149,0.35)",
  1024: "rgba(255,230,0,0.35)",
  2048: "rgba(57,255,20,0.40)",
  4096: "rgba(255,45,149,0.50)",
};

export default function Tile({ tile }: { tile: TileData }) {
  const monster = MONSTERS[tile.value];
  const bg = bgColors[tile.value] ?? "rgba(255,45,149,0.6)";
  const ms = getMilestone(tile.value);

  const x = PADDING + tile.col * (TILE_SIZE + GAP);
  const y = PADDING + tile.row * (TILE_SIZE + GAP);

  // Milestone tiles get a more dramatic animation than regular merge
  const animClass = tile.isNew
    ? "tile-spawn"
    : tile.isMerged
    ? (ms ? "tile-milestone" : "tile-merge")
    : "";

  // Glow only when newly merged into a milestone value
  const boxShadow =
    tile.isMerged && ms
      ? `0 0 28px 8px ${ms.glowColor}, 0 0 8px 2px ${ms.color}`
      : undefined;

  return (
    <div
      className={`absolute flex flex-col items-center justify-center rounded border border-dark-border select-none ${animClass}`}
      style={{
        width: TILE_SIZE,
        height: TILE_SIZE,
        left: x,
        top: y,
        backgroundColor: bg,
        transition: "left 110ms ease, top 110ms ease",
        zIndex: tile.isMerged ? 10 : 5,
        boxShadow,
      }}
    >
      <span className="text-2xl leading-none">
        {monster ? monster.emoji : "❓"}
      </span>
      <span className="text-[0.45rem] text-gray-300 mt-1 font-pixel">
        {tile.value}
      </span>
    </div>
  );
}
