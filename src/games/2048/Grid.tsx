"use client";

import { forwardRef, useImperativeHandle, useState, useCallback } from "react";
import { GridState, TileData } from "./types";
import Tile from "./Tile";
import { TILE_SIZE, GAP, PADDING, CONTAINER_SIZE, getMilestone } from "./constants";

export interface GridHandle {
  triggerMilestone: (value: number, col: number, row: number) => void;
  triggerChain: (mergeCount: number) => void;
}

interface Floater {
  id: number;
  text: string;
  color: string;
  x: number;  // px left (center of source tile or grid center)
  y: number;  // px top
  large: boolean;
}

interface FlashState {
  id: number;
  rainbow: boolean;
}

let nextFloaterId = 0;
let nextFlashId = 0;

const Grid = forwardRef<GridHandle, { grid: GridState }>(function Grid({ grid }, ref) {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [flash, setFlash] = useState<FlashState | null>(null);

  const removeFloater = useCallback((id: number) => {
    setFloaters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  useImperativeHandle(ref, () => ({
    triggerMilestone(value: number, col: number, row: number) {
      const ms = getMilestone(value);
      if (!ms) return;
      const tileCenterX = PADDING + col * (TILE_SIZE + GAP) + TILE_SIZE / 2;
      const tileCenterY = PADDING + row * (TILE_SIZE + GAP) + TILE_SIZE / 2;
      setFloaters((prev) => [
        ...prev,
        {
          id: nextFloaterId++,
          text: `${ms.emoji} ${ms.name}!`,
          color: ms.color,
          x: tileCenterX,
          y: tileCenterY,
          large: false,
        },
      ]);
      setFlash({ id: nextFlashId++, rainbow: value >= 4096 });
    },
    triggerChain(mergeCount: number) {
      const label =
        mergeCount >= 4 ? "MEGA CHAIN!" : `${mergeCount}× CHAIN!`;
      const bonus =
        mergeCount >= 4 ? "+300" : mergeCount === 3 ? "+150" : "+50";
      const gridCenter = CONTAINER_SIZE / 2;
      setFloaters((prev) => [
        ...prev,
        {
          id: nextFloaterId++,
          text: `${bonus} ${label}`,
          color: "#ffe600",
          x: gridCenter,
          y: gridCenter,
          large: true,
        },
      ]);
      if (mergeCount >= 4) {
        setFlash({ id: nextFlashId++, rainbow: true });
      }
    },
  }), []);

  const tiles = grid
    .flatMap((row) => row)
    .filter((cell): cell is TileData => cell !== null);

  return (
    <div
      className="relative border border-neon-pink/30 rounded bg-dark-bg/80 overflow-hidden"
      style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
      suppressHydrationWarning
    >
      {/* Empty cell backgrounds */}
      {Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => (
          <div
            key={`bg-${r}-${c}`}
            className="absolute bg-dark-card/50 rounded border border-dark-border/30"
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              left: PADDING + c * (TILE_SIZE + GAP),
              top: PADDING + r * (TILE_SIZE + GAP),
            }}
          />
        ))
      )}

      {/* Tiles */}
      {tiles.map((tile) => (
        <Tile key={tile.id} tile={tile} />
      ))}

      {/* Flash overlay */}
      {flash && (
        <div
          key={flash.id}
          className={`absolute inset-0 pointer-events-none ${flash.rainbow ? "grid-flash-rainbow" : "grid-flash"}`}
          style={{ backgroundColor: flash.rainbow ? "#ffe600" : undefined }}
          onAnimationEnd={() => setFlash(null)}
        />
      )}

      {/* Floating text */}
      {floaters.map((f) => (
        <div
          key={f.id}
          className="floater absolute font-pixel whitespace-nowrap"
          style={{
            left: f.x,
            top: f.y,
            color: f.color,
            fontSize: f.large ? "0.55rem" : "0.45rem",
            textShadow: `0 0 8px ${f.color}`,
            transform: "translateX(-50%)",
            zIndex: 20,
          }}
          onAnimationEnd={() => removeFloater(f.id)}
        >
          {f.text}
        </div>
      ))}
    </div>
  );
});

export default Grid;
