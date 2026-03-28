"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import Board from "@/games/minesweeper/Board";
import { createBoard, reveal, toggleFlag, chord } from "@/games/minesweeper/logic";
import { Difficulty, MinesweeperState, DIFFICULTIES } from "@/games/minesweeper/types";
import { getBestTime, setBestTime } from "@/lib/scores";

export default function MinesweeperPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [state, setState] = useState<MinesweeperState>(() =>
    createBoard("easy")
  );
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [bestTime, setBest] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [flagMode, setFlagMode] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const gameKey = `minesweeper-${difficulty}`;

  useEffect(() => {
    setBest(getBestTime(gameKey));
  }, [gameKey, state.gameState]);

  useEffect(() => {
    if (timerActive) {
      intervalRef.current = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerActive]);

  const handleNewGame = useCallback(
    (diff?: Difficulty) => {
      const d = diff ?? difficulty;
      setState(createBoard(d));
      setTimer(0);
      setTimerActive(false);
      if (diff) setDifficulty(d);
    },
    [difficulty]
  );

  const handleReveal = useCallback(
    (row: number, col: number) => {
      setState((prev) => {
        if (prev.gameState !== "playing") return prev;

        // Start timer on first click
        if (prev.firstClick) {
          setTimerActive(true);
        }

        const next = reveal(prev, row, col);

        if (next.gameState === "won") {
          setTimerActive(false);
          // We need timer+1 because the state update is async.
          // Use a timeout to read the latest timer value.
          setTimeout(() => {
            setTimer((t) => {
              setBestTime(gameKey, t);
              setBest(getBestTime(gameKey));
              return t;
            });
          }, 0);
        } else if (next.gameState === "lost") {
          setTimerActive(false);
        }

        return next;
      });
    },
    [gameKey]
  );

  const handleFlag = useCallback((row: number, col: number) => {
    setState((prev) => toggleFlag(prev, row, col));
  }, []);

  const handleChord = useCallback(
    (row: number, col: number) => {
      setState((prev) => {
        const next = chord(prev, row, col);

        if (next.gameState === "won") {
          setTimerActive(false);
          setTimeout(() => {
            setTimer((t) => {
              setBestTime(gameKey, t);
              setBest(getBestTime(gameKey));
              return t;
            });
          }, 0);
        } else if (next.gameState === "lost") {
          setTimerActive(false);
        }

        return next;
      });
    },
    [gameKey]
  );

  const monsterCount = state.mines - state.flagCount;

  const difficultyButtons = (
    <div className="flex gap-2">
      {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
        <PixelButton
          key={d}
          color="green"
          className={difficulty !== d ? "opacity-40" : ""}
          onClick={() => handleNewGame(d)}
        >
          {d.toUpperCase()}
        </PixelButton>
      ))}
    </div>
  );

  return (
    <GameLayout
      title="DUNGEON SWEEP"
      color="green"
      timer={timer}
      onNewGame={() => handleNewGame()}
      controls={difficultyButtons}
    >
      <div className="flex flex-col items-center gap-3">
        {/* Status bar */}
        <div className="flex items-center gap-4 sm:gap-6 text-[0.55rem] text-gray-400 flex-wrap justify-center">
          <span>
            &#x1f479; MONSTERS: {monsterCount}
          </span>
          {isTouchDevice && state.gameState === "playing" && (
            <button
              type="button"
              onClick={() => setFlagMode((f) => !f)}
              className={`px-2 py-1 border text-[0.5rem] transition-all duration-150 ${
                flagMode
                  ? "border-neon-yellow text-neon-yellow bg-neon-yellow/10"
                  : "border-neon-green text-neon-green bg-neon-green/10"
              }`}
            >
              {flagMode ? "\uD83D\uDEE1\uFE0F FLAG" : "\u26CF\uFE0F DIG"}
            </button>
          )}
          {bestTime !== null && (
            <span>
              BEST: {Math.floor(bestTime / 60)}:{String(bestTime % 60).padStart(2, "0")}
            </span>
          )}
        </div>

        {/* Board */}
        <div className={`relative transition-all duration-500
          ${state.gameState === "lost" ? "animate-[screenShake_0.5s_ease-in-out]" : ""}`}>
          <Board
            board={state.board}
            gameState={state.gameState}
            onReveal={handleReveal}
            onFlag={handleFlag}
            onChord={handleChord}
            flagMode={flagMode}
          />
        </div>

        {/* Win overlay */}
        {state.gameState === "won" && (
          <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
            <div className="absolute inset-0 bg-neon-green/5" />
            <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
              <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">
                ⚔️
              </div>
              <h2 className="text-lg sm:text-xl neon-text-green animate-[victoryGlow_1.5s_ease-in-out_infinite]">
                DUNGEON CLEARED!
              </h2>
              <p className="text-[0.6rem] text-neon-green/70">
                TIME: {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
              </p>
              <PixelButton color="green" onClick={() => handleNewGame()}>
                PLAY AGAIN
              </PixelButton>
            </div>
          </div>
        )}

        {/* Lose overlay */}
        {state.gameState === "lost" && (
          <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
            <div className="absolute inset-0 bg-red-900/20" />
            <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
              <div className="text-5xl animate-[floatUp_1.5s_ease-in-out_infinite_alternate]">
                💀
              </div>
              <h2 className="text-lg sm:text-xl neon-text-pink animate-[defeatFlash_1s_ease-in-out_infinite]">
                THE MONSTERS GOT YOU!
              </h2>
              <p className="text-[0.6rem] text-neon-pink/70">
                SURVIVED: {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
              </p>
              <PixelButton color="pink" onClick={() => handleNewGame()}>
                TRY AGAIN
              </PixelButton>
            </div>
          </div>
        )}

        {/* Hint */}
        {state.gameState === "playing" && (
          <p className="text-[0.5rem] text-gray-500">
            {isTouchDevice ? "TAP TO DIG / HOLD TO FLAG" : "RIGHT-CLICK TO PLACE SHIELD"}
          </p>
        )}
      </div>
    </GameLayout>
  );
}
