"use client";

import React from "react";
import { CellState, GameState } from "./types";

const NUMBER_COLORS: Record<number, string> = {
  1: "text-neon-blue",
  2: "text-neon-green",
  3: "text-neon-pink",
  4: "text-purple-400",
  5: "text-red-400",
  6: "text-cyan-400",
  7: "text-neon-yellow",
  8: "text-gray-300",
};

interface CellProps {
  cell: CellState;
  row: number;
  col: number;
  gameState: GameState;
  onReveal: (row: number, col: number) => void;
  onFlag: (row: number, col: number) => void;
}

export default function Cell({
  cell,
  row,
  col,
  gameState,
  onReveal,
  onFlag,
}: CellProps) {
  const handleClick = () => {
    if (gameState !== "playing" || cell.isRevealed || cell.isFlagged) return;
    onReveal(row, col);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (gameState !== "playing" || cell.isRevealed) return;
    onFlag(row, col);
  };

  // Unrevealed cell
  if (!cell.isRevealed) {
    return (
      <button
        className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-bold
          bg-dark-card border border-gray-700 hover:border-neon-green/50 transition-colors
          ${cell.isFlagged ? "border-neon-yellow/50" : ""}
          ${gameState === "playing" ? "cursor-pointer" : "cursor-default"}`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {cell.isFlagged && <span className="text-sm">&#x1f6e1;&#xfe0f;</span>}
      </button>
    );
  }

  // Mine revealed
  if (cell.isMine) {
    return (
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-bold
          ${gameState === "lost" ? "bg-red-900/60" : "bg-dark-card"} border border-gray-700`}
      >
        <span className="text-sm">&#x1f479;</span>
      </div>
    );
  }

  // Number or empty revealed
  return (
    <div
      className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-bold
        bg-dark-bg border border-gray-800 ${NUMBER_COLORS[cell.adjacentMines] || ""}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {cell.adjacentMines > 0 ? cell.adjacentMines : ""}
    </div>
  );
}
