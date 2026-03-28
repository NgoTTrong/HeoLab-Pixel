"use client";

import React from "react";
import Cell from "./Cell";
import { CellState, GameState } from "./types";

interface BoardProps {
  board: CellState[][];
  gameState: GameState;
  onReveal: (row: number, col: number) => void;
  onFlag: (row: number, col: number) => void;
}

export default function Board({
  board,
  gameState,
  onReveal,
  onFlag,
}: BoardProps) {
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
            />
          ))}
        </div>
      ))}
    </div>
  );
}
