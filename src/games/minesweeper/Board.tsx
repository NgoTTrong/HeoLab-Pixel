"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Cell from "./Cell";
import { CellState, GameState } from "./types";

interface BoardProps {
  board: CellState[][];
  gameState: GameState;
  onReveal: (row: number, col: number) => void;
  onFlag: (row: number, col: number) => void;
  onChord: (row: number, col: number) => void;
  flagMode?: boolean;
  rotated?: boolean; // portrait mode for hard on mobile
}

const H_OVERHEAD = 50;  // GameLayout p-4×2 (32) + board border+padding (10) + buffer (8)
const V_OVERHEAD = 220; // top bar + bottom controls

function calcCellSize(
  rows: number,
  cols: number,
  winW: number,
  winH: number,
  rotated: boolean
): number {
  // When rotated, board renders as cols×rows (tall portrait)
  const effectiveCols = rotated ? rows : cols;
  const effectiveRows = rotated ? cols : rows;
  const sizeByW = Math.floor((winW - H_OVERHEAD) / effectiveCols);
  const sizeByH = Math.floor((winH - V_OVERHEAD) / effectiveRows);
  return Math.max(Math.min(sizeByW, sizeByH, 32), 8);
}

export default function Board({
  board,
  gameState,
  onReveal,
  onFlag,
  onChord,
  flagMode = false,
  rotated = false,
}: BoardProps) {
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rows = board.length;
  const cols = board[0]?.length || 0;

  const [winW, setWinW] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const [winH, setWinH] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 800
  );

  useEffect(() => {
    const onResize = () => {
      setWinW(window.innerWidth);
      setWinH(window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const cellSize = useMemo(
    () => calcCellSize(rows, cols, winW, winH, rotated),
    [rows, cols, winW, winH, rotated]
  );

  const handleChord = useCallback(
    (row: number, col: number) => {
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
      setHighlighted(neighbors);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setHighlighted(new Set());
        onChord(row, col);
      }, 80);
    },
    [board, rows, cols, onChord]
  );

  // Normal render: outer=rows, inner=cols → board[r][c]
  // Rotated render: outer=cols, inner=rows → board[r][c] with r/c swapped
  // Coordinates passed to handlers always use original (row, col) from logic
  const renderRows = rotated ? cols : rows;
  const renderCols = rotated ? rows : cols;

  return (
    <div className="border border-neon-green/30 p-1 inline-block">
      {Array.from({ length: renderRows }, (_, visualR) => (
        <div key={visualR} className="flex">
          {Array.from({ length: renderCols }, (_, visualC) => {
            // Map visual position back to logical (row, col)
            const logicR = rotated ? visualC : visualR;
            const logicC = rotated ? visualR : visualC;
            const cell = board[logicR][logicC];
            return (
              <Cell
                key={`${logicR}-${logicC}`}
                cell={cell}
                row={logicR}
                col={logicC}
                gameState={gameState}
                onReveal={onReveal}
                onFlag={onFlag}
                onChord={handleChord}
                isHighlighted={highlighted.has(`${logicR}-${logicC}`)}
                cellSize={cellSize}
                flagMode={flagMode}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
