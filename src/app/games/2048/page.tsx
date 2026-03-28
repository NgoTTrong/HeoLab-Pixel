"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import Grid from "@/games/2048/Grid";
import { createGame, move, Direction } from "@/games/2048/logic";
import { GameState2048 } from "@/games/2048/types";
import { getHighScore, setHighScore } from "@/lib/scores";

const GAME_KEY = "2048";

export default function Game2048Page() {
  const [state, setState] = useState<GameState2048 | null>(null);
  const [highScore, setHigh] = useState(0);
  const [showWon, setShowWon] = useState(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  // Init on client only — avoids SSR/CSR hydration mismatch from Math.random()
  useEffect(() => {
    setState(createGame());
    setHigh(getHighScore(GAME_KEY));
  }, []);

  useEffect(() => {
    if (!state) return;
    if (state.score > highScore) {
      setHigh(state.score);
      setHighScore(GAME_KEY, state.score);
    }
  }, [state?.score, highScore]);

  useEffect(() => {
    if (state?.won && !showWon) {
      setShowWon(true);
    }
  }, [state?.won, showWon]);

  const handleMove = useCallback(
    (dir: Direction) => {
      setState((prev) => prev ? move(prev, dir) : prev);
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
      score={state?.score ?? 0}
      highScore={highScore}
      onNewGame={handleNewGame}
      controls={
        <span className="text-[0.5rem] text-gray-500">
          ARROW KEYS / WASD / SWIPE
        </span>
      }
    >
      <div className="flex flex-col items-center gap-4">
        {state && <Grid grid={state.grid} />

        }
        {/* Win overlay */}
        {showWon && !state?.gameOver && (
          <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
            <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
            <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
              <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">
                🐉
              </div>
              <h2 className="text-lg sm:text-xl neon-text-green animate-[victoryGlow_1.5s_ease-in-out_infinite]">
                DRAGON EVOLVED!
              </h2>
              <p className="text-[0.6rem] text-neon-green/70">SCORE: {state?.score}</p>
              <div className="flex gap-3">
                <PixelButton color="green" onClick={() => setShowWon(false)}>
                  KEEP GOING
                </PixelButton>
                <PixelButton color="pink" onClick={handleNewGame}>
                  NEW GAME
                </PixelButton>
              </div>
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {state?.gameOver && (
          <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
            <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
            <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
              <div className="text-5xl animate-[floatUp_1.5s_ease-in-out_infinite_alternate]">
                💀
              </div>
              <h2 className="text-lg sm:text-xl neon-text-pink animate-[defeatFlash_1s_ease-in-out_infinite]">
                NO MORE MOVES!
              </h2>
              <p className="text-[0.6rem] text-neon-pink/70">SCORE: {state.score}</p>
              <PixelButton color="pink" onClick={handleNewGame}>
                TRY AGAIN
              </PixelButton>
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  );
}
