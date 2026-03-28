"use client";

import React from "react";
import Card from "./Card";
import { MemoryState } from "./types";

interface MatchGridProps {
  state: MemoryState;
  onCardClick: (index: number) => void;
}

export default function MatchGrid({ state, onCardClick }: MatchGridProps) {
  return (
    <div
      className="grid gap-2 p-3"
      style={{ gridTemplateColumns: `repeat(${state.cols}, minmax(0, 1fr))` }}
    >
      {state.cards.map((card, i) => (
        <Card key={card.id} card={card} onClick={() => onCardClick(i)} />
      ))}
    </div>
  );
}
