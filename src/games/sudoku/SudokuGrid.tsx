"use client";

import React from "react";
import SudokuCell from "./SudokuCell";
import { SudokuState } from "./types";

interface SudokuGridProps {
  state: SudokuState;
  onSelect: (row: number, col: number) => void;
}

export default function SudokuGrid({ state, onSelect }: SudokuGridProps) {
  const { board, puzzle, notes, selected, errors, runeMode } = state;

  return (
    <div className="inline-grid grid-cols-9 border-2 border-neon-blue/30">
      {board.map((row, r) =>
        row.map((val, c) => {
          const isSelected = selected !== null && selected[0] === r && selected[1] === c;

          // Highlight same row, col, or 3x3 box
          const isHighlighted =
            !isSelected &&
            selected !== null &&
            (selected[0] === r ||
              selected[1] === c ||
              (Math.floor(selected[0] / 3) === Math.floor(r / 3) &&
                Math.floor(selected[1] / 3) === Math.floor(c / 3)));

          const isOriginal = puzzle[r][c] !== 0;
          const isError = errors.has(`${r},${c}`);

          // Thicker borders for 3x3 box edges
          const borderRight =
            c % 3 === 2 && c !== 8
              ? "border-r-2 border-r-neon-blue/30"
              : "border-r border-r-dark-border/50";
          const borderBottom =
            r % 3 === 2 && r !== 8
              ? "border-b-2 border-b-neon-blue/30"
              : "border-b border-b-dark-border/50";

          return (
            <div key={`${r}-${c}`} className={`${borderRight} ${borderBottom}`}>
              <SudokuCell
                value={val}
                notes={notes[r][c]}
                isOriginal={isOriginal}
                isSelected={isSelected}
                isHighlighted={isHighlighted}
                isError={isError}
                runeMode={runeMode}
                onClick={() => onSelect(r, c)}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
