"use client";

import React from "react";
import { CardData } from "./types";

interface CardProps {
  card: CardData;
  onClick: () => void;
}

export default function Card({ card, onClick }: CardProps) {
  const isRevealed = card.isFlipped || card.isMatched;

  return (
    <div
      className="w-14 h-14 sm:w-16 sm:h-16"
      style={{ perspective: "400px" }}
      onClick={!isRevealed ? onClick : undefined}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 0.35s ease",
          transform: isRevealed ? "rotateY(180deg)" : "rotateY(0deg)",
          cursor: isRevealed ? "default" : "pointer",
        }}
      >
        {/* Back face — "?" */}
        <div
          style={{ backfaceVisibility: "hidden" }}
          className="absolute inset-0 bg-dark-card border-2 border-dark-border rounded-sm flex items-center justify-center hover:border-neon-yellow/40 transition-colors duration-150"
        >
          <span className="text-xs text-gray-500">?</span>
        </div>

        {/* Front face — emoji */}
        <div
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          className={`absolute inset-0 rounded-sm flex items-center justify-center ${
            card.isMatched
              ? "bg-neon-yellow/10 border-2 border-neon-yellow/30 opacity-60"
              : "bg-dark-card border-2 border-neon-yellow/50"
          }`}
        >
          <span className="text-lg sm:text-xl">{card.emoji}</span>
        </div>
      </div>
    </div>
  );
}
