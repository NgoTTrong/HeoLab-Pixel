"use client";

import React, { useState } from "react";
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
  onChord: (row: number, col: number) => void;
  isHighlighted?: boolean;
  cellSize: number;
  flagMode?: boolean;
}

export default function Cell({
  cell,
  row,
  col,
  gameState,
  onReveal,
  onFlag,
  onChord,
  isHighlighted = false,
  cellSize,
  flagMode = false,
}: CellProps) {
  const [pressing, setPressing] = useState(false);
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = React.useRef(false);

  const handleClick = () => {
    if (gameState !== "playing" || cell.isRevealed) return;
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    if (flagMode) {
      if (!cell.isRevealed) onFlag(row, col);
    } else {
      if (!cell.isFlagged) onReveal(row, col);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (gameState !== "playing" || cell.isRevealed) return;
    onFlag(row, col);
  };

  const handleTouchStart = () => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      if (gameState === "playing" && !cell.isRevealed) {
        onFlag(row, col);
      }
    }, 300);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const sizeStyle = { width: cellSize, height: cellSize };
  const fontSize = cellSize <= 22 ? "text-[9px]" : "text-xs";
  const emojiSize = cellSize <= 22 ? "text-xs" : "text-sm";

  // Stagger delay
  const delay = cell.revealOrder >= 0 ? Math.min(cell.revealOrder * 12, 200) : 0;

  // Unrevealed cell
  if (!cell.isRevealed) {
    return (
      <button
        className={`flex items-center justify-center ${fontSize} font-bold
          bg-dark-card border border-gray-700 transition-all duration-150
          ${cell.isFlagged ? "border-neon-yellow/50" : "hover:border-neon-green/50 hover:bg-dark-card/80"}
          ${pressing ? "scale-90 brightness-75" : ""}
          ${isHighlighted ? "animate-[cellBounce_0.12s_ease-in-out] border-neon-green/70 bg-neon-green/10" : ""}
          ${gameState === "playing" ? "cursor-pointer" : "cursor-default"}`}
        style={sizeStyle}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseDown={() => setPressing(true)}
        onMouseUp={() => setPressing(false)}
        onMouseLeave={() => setPressing(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {cell.isFlagged && (
          <span className={`${emojiSize} animate-[flagPop_0.3s_ease-out]`}>&#x1f6e1;&#xfe0f;</span>
        )}
      </button>
    );
  }

  // Mine revealed
  if (cell.isMine) {
    return (
      <div
        className={`flex items-center justify-center ${fontSize} font-bold
          border border-gray-700 animate-[mineReveal_0.4s_ease-out_both]
          ${gameState === "lost" ? "bg-red-900/60" : "bg-dark-card"}`}
        style={{ ...sizeStyle, animationDelay: `${delay}ms` }}
      >
        <span className={emojiSize}>&#x1f479;</span>
      </div>
    );
  }

  // Number or empty revealed
  const hasNumber = cell.adjacentMines > 0;
  return (
    <button
      className={`flex items-center justify-center ${fontSize} font-bold
        border border-gray-800 animate-[cellReveal_0.3s_ease-out_both]
        ${NUMBER_COLORS[cell.adjacentMines] || ""}
        ${hasNumber && gameState === "playing" ? "cursor-pointer hover:bg-neon-green/10" : "cursor-default"}
        bg-dark-bg`}
      style={{ ...sizeStyle, animationDelay: `${delay}ms` }}
      onClick={() => hasNumber && onChord(row, col)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {hasNumber ? cell.adjacentMines : ""}
    </button>
  );
}
