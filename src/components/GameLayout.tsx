"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PixelButton from "./PixelButton";
import HelpModal from "./HelpModal";
import type { GameHelp } from "@/lib/gameHelp";

type GameColor = "green" | "pink" | "yellow" | "blue" | "orange";

interface GameLayoutProps {
  title: string;
  color: GameColor;
  score?: number;
  highScore?: number;
  timer?: number;
  onNewGame?: () => void;
  children: React.ReactNode;
  controls?: React.ReactNode;
  actions?: React.ReactNode;
  helpContent?: GameHelp;
  gameKey?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function GameLayout({
  title,
  color,
  score,
  highScore,
  timer,
  onNewGame,
  children,
  controls,
  actions,
  helpContent,
  gameKey,
}: GameLayoutProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!helpContent || !gameKey) return;
    if (typeof window === "undefined") return;
    const key = `gamestation-${gameKey}-help-seen`;
    if (!localStorage.getItem(key)) {
      setHelpOpen(true);
      localStorage.setItem(key, "1");
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen p-4 gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-1 sm:gap-2">
        <Link
          href="/games"
          className={`text-[0.5rem] sm:text-[0.6rem] neon-text-${color} hover:opacity-80 transition-opacity`}
        >
          &larr; BACK
        </Link>
        <h1 className={`text-[0.6rem] sm:text-xs md:text-sm neon-text neon-text-${color} text-center`}>
          {title}
        </h1>
        <div className="flex items-center gap-2">
          {timer !== undefined && (
            <span className="text-[0.5rem] sm:text-[0.6rem] text-gray-400">{formatTime(timer)}</span>
          )}
          {helpContent && (
            <button
              onClick={() => setHelpOpen(true)}
              className={`text-[0.5rem] sm:text-[0.6rem] neon-text-${color} hover:opacity-80 transition-opacity border border-current px-1.5 py-0.5`}
              aria-label="How to play"
            >
              ?
            </button>
          )}
          {!helpContent && timer === undefined && <span />}
        </div>
      </div>

      {/* Score bar */}
      {(score !== undefined || highScore !== undefined || actions) && (
        <div className="flex justify-center items-center gap-8 text-[0.55rem] text-gray-400">
          {score !== undefined && <span>SCORE: {score}</span>}
          {highScore !== undefined && <span>BEST: {highScore}</span>}
          {actions}
        </div>
      )}

      {/* Game area */}
      <div className="flex-1 flex items-center justify-center">{children}</div>

      {/* Bottom bar */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 flex-wrap">
        {onNewGame && (
          <PixelButton color={color} onClick={onNewGame}>
            NEW GAME
          </PixelButton>
        )}
        {controls}
      </div>

      {/* Help Modal */}
      {helpOpen && helpContent && (
        <HelpModal
          help={helpContent}
          color={color}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </div>
  );
}
