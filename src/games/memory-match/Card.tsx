"use client";

import React from "react";
import { CardData } from "./types";

interface CardProps {
  card: CardData;
  onClick: () => void;
}

export default function Card({ card, onClick }: CardProps) {
  if (card.isMatched) {
    return (
      <button
        disabled
        className="w-14 h-14 sm:w-16 sm:h-16 bg-neon-yellow/10 border-2 border-neon-yellow/30 rounded-sm flex items-center justify-center opacity-60 cursor-default"
      >
        <span className="text-lg sm:text-xl">{card.emoji}</span>
      </button>
    );
  }

  if (card.isFlipped) {
    return (
      <button
        disabled
        className="w-14 h-14 sm:w-16 sm:h-16 bg-dark-card border-2 border-neon-yellow/50 rounded-sm flex items-center justify-center pixel-fade-in"
      >
        <span className="text-lg sm:text-xl">{card.emoji}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-14 h-14 sm:w-16 sm:h-16 bg-dark-card border-2 border-dark-border rounded-sm flex items-center justify-center hover:scale-105 hover:border-neon-yellow/40 transition-all duration-150 cursor-pointer"
    >
      <span className="text-xs text-gray-500">?</span>
    </button>
  );
}
