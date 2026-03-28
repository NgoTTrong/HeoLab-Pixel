"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import Board from "@/games/minesweeper/Board";
import { createBoard, reveal, toggleFlag } from "@/games/minesweeper/logic";
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
        <div className="flex items-center gap-6 text-[0.55rem] text-gray-400">
          <span>
            &#x1f479; MONSTERS: {monsterCount}
          </span>
          {bestTime !== null && (
            <span>
              BEST: {Math.floor(bestTime / 60)}:{String(bestTime % 60).padStart(2, "0")}
            </span>
          )}
        </div>

        {/* Win/Lose message */}
        {state.gameState === "won" && (
          <p className="text-xs neon-text-green animate-pulse">
            DUNGEON CLEARED!
          </p>
        )}
        {state.gameState === "lost" && (
          <p className="text-xs neon-text-pink animate-pulse">
            THE MONSTERS GOT YOU!
          </p>
        )}

        {/* Board */}
        <div className="overflow-auto max-w-full max-h-[60vh]">
          <Board
            board={state.board}
            gameState={state.gameState}
            onReveal={handleReveal}
            onFlag={handleFlag}
          />
        </div>

        {/* Hint */}
        {state.gameState === "playing" && (
          <p className="text-[0.5rem] text-gray-500">
            RIGHT-CLICK TO PLACE SHIELD
          </p>
        )}
      </div>
    </GameLayout>
  );
}
