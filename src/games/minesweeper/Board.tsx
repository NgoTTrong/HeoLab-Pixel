"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Cell from "./Cell";
import { CellState, GameState } from "./types";

interface BoardProps {
  board: CellState[][];
  gameState: GameState;
  onReveal: (row: number, col: number) => void;
  onFlag: (row: number, col: number) => void;
  onChord: (row: number, col: number) => void;
  flagMode?: boolean;
}

export default function Board({
  board,
  gameState,
  onReveal,
  onFlag,
  onChord,
  flagMode = false,
}: BoardProps) {
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [cellSize, setCellSize] = useState(32);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rows = board.length;
  const cols = board[0]?.length || 0;

  // Calculate cell size to fit viewport
  useEffect(() => {
    function calcSize() {
      const maxW = window.innerWidth - 32; // padding
      const maxH = window.innerHeight - 280; // header, controls, status
      const sizeByW = Math.floor(maxW / cols);
      const sizeByH = Math.floor(maxH / rows);
      const size = Math.min(sizeByW, sizeByH, 32); // max 32px
      // min 10px so hard mode (30 cols) never overflows on mobile
      setCellSize(Math.max(size, 10));
    }
    calcSize();
    window.addEventListener("resize", calcSize);
    return () => window.removeEventListener("resize", calcSize);
  }, [rows, cols]);

  const handleChord = useCallback(
    (row: number, col: number) => {
      // Collect unrevealed, unflagged neighbors
      const neighbors = new Set<string>();
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const cell = board[nr][nc];
            if (!cell.isRevealed && !cell.isFlagged) {
              neighbors.add(`${nr}-${nc}`);
            }
          }
        }
      }

      if (neighbors.size === 0) return;

      // Show bounce highlight
      setHighlighted(neighbors);

      // Clear previous timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // After bounce animation, clear highlight and attempt chord
      timeoutRef.current = setTimeout(() => {
        setHighlighted(new Set());
        onChord(row, col);
      }, 80);
    },
    [board, rows, cols, onChord]
  );

  return (
    <div className="border border-neon-green/30 p-1 inline-block">
      {board.map((row, r) => (
        <div key={r} className="flex">
          {row.map((cell, c) => (
            <Cell
              key={`${r}-${c}`}
              cell={cell}
              row={r}
              col={c}
              gameState={gameState}
              onReveal={onReveal}
              onFlag={onFlag}
              onChord={handleChord}
              isHighlighted={highlighted.has(`${r}-${c}`)}
              cellSize={cellSize}
              flagMode={flagMode}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
