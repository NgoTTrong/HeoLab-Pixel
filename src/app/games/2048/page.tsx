"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import GameLayout from "@/components/GameLayout";
import Grid from "@/games/2048/Grid";
import { createGame, move, Direction } from "@/games/2048/logic";
import { GameState2048 } from "@/games/2048/types";
import { getHighScore, setHighScore } from "@/lib/scores";

const GAME_KEY = "2048";

export default function Game2048Page() {
  const [state, setState] = useState<GameState2048>(createGame);
  const [highScore, setHigh] = useState(0);
  const [showWon, setShowWon] = useState(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setHigh(getHighScore(GAME_KEY));
  }, []);

  useEffect(() => {
    if (state.score > highScore) {
      setHigh(state.score);
      setHighScore(GAME_KEY, state.score);
    }
  }, [state.score, highScore]);

  useEffect(() => {
    if (state.won && !showWon) {
      setShowWon(true);
    }
  }, [state.won, showWon]);

  const handleMove = useCallback(
    (dir: Direction) => {
      setState((prev) => move(prev, dir));
    },
    []
  );

  const handleNewGame = useCallback(() => {
    setState(createGame());
    setShowWon(false);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const keyMap: Record<string, Direction> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      W: "up",
      s: "down",
      S: "down",
      a: "left",
      A: "left",
      d: "right",
      D: "right",
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        handleMove(dir);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleMove]);

  // Touch/swipe controls
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchRef.current.x;
      const dy = touch.clientY - touchRef.current.y;
      const minSwipe = 30;

      if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        handleMove(dx > 0 ? "right" : "left");
      } else {
        handleMove(dy > 0 ? "down" : "up");
      }
      touchRef.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [handleMove]);

  return (
    <GameLayout
      title="MONSTER 2048"
      color="pink"
      score={state.score}
      highScore={highScore}
      onNewGame={handleNewGame}
      controls={
        <span className="text-[0.5rem] text-gray-500">
          ARROW KEYS / WASD / SWIPE
        </span>
      }
    >
      <div className="flex flex-col items-center gap-4">
        {/* Won overlay */}
        {showWon && !state.gameOver && (
          <div className="text-center pixel-fade-in">
            <p className="text-[0.6rem] neon-text neon-text-green mb-1">
              DRAGON EVOLVED!
            </p>
            <p className="text-[0.5rem] text-gray-400">KEEP GOING?</p>
          </div>
        )}

        {/* Game over overlay */}
        {state.gameOver && (
          <div className="text-center pixel-fade-in">
            <p className="text-[0.6rem] neon-text neon-text-pink">
              NO MORE MOVES!
            </p>
          </div>
        )}

        <Grid grid={state.grid} />
      </div>
    </GameLayout>
  );
}
