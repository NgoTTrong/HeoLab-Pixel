"use client";

import React from "react";
import { RUNES } from "./types";

interface SudokuCellProps {
  value: number;
  notes: Set<number>;
  isOriginal: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  isError: boolean;
  runeMode: boolean;
  onClick: () => void;
}

export default function SudokuCell({
  value,
  notes,
  isOriginal,
  isSelected,
  isHighlighted,
  isError,
  runeMode,
  onClick,
}: SudokuCellProps) {
  const display = (n: number) => (runeMode ? RUNES[n] : String(n));

  // Background
  let bg = "";
  if (isSelected) {
    bg = "bg-neon-blue/20 ring-1 ring-neon-blue";
  } else if (isHighlighted) {
    bg = "bg-dark-card";
  }

  // Text color
  let textColor = "text-white";
  if (isOriginal) {
    textColor = "text-neon-blue font-bold";
  } else if (isError) {
    textColor = "text-red-500";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xs select-none transition-colors ${bg} ${textColor}`}
    >
      {value !== 0 ? (
        <span className={runeMode ? "text-sm sm:text-base" : ""}>{display(value)}</span>
      ) : notes.size > 0 ? (
        <div className="grid grid-cols-3 grid-rows-3 w-full h-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <span
              key={n}
              className="flex items-center justify-center text-gray-500"
              style={{ fontSize: "5px", lineHeight: 1 }}
            >
              {notes.has(n) ? display(n) : ""}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
