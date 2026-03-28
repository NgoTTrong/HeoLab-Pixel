"use client";

import { GridState } from "./types";
import Tile from "./Tile";

export default function Grid({ grid }: { grid: GridState }) {
  return (
    <div className="inline-grid grid-cols-4 gap-2 p-3 border border-neon-pink/30 rounded bg-dark-bg/80">
      {grid.flatMap((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <Tile key={cell.id} tile={cell} />
          ) : (
            <div
              key={`empty-${r}-${c}`}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-dark-card/50 rounded border border-dark-border/30"
            />
          )
        )
      )}
    </div>
  );
}
