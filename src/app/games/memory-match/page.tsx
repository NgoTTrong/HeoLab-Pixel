"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import GameLayout from "@/components/GameLayout";
import MatchGrid from "@/games/memory-match/MatchGrid";
import { createMemory, flipCard, checkMatch } from "@/games/memory-match/logic";
import { MemoryState, GridSize } from "@/games/memory-match/types";
import { getHighScore, setHighScore } from "@/lib/scores";
import PixelButton from "@/components/PixelButton";

const GAME_KEY = "memory-match";

export default function MemoryMatchPage() {
  const [size, setSize] = useState<GridSize>("easy");
  const [state, setState] = useState<MemoryState>(() => createMemory("easy"));
  const [highScore, setHigh] = useState(0);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setHigh(getHighScore(GAME_KEY));
  }, []);

  // Timer
  useEffect(() => {
    if (state.completed) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    if (state.moves > 0 && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.moves, state.completed]);

  // Auto-check match after delay
  useEffect(() => {
    if (state.processing && state.flipped.length === 2) {
      const timeout = setTimeout(() => {
        setState((prev) => checkMatch(prev));
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [state.processing, state.flipped]);

  // Save high score on completion
  useEffect(() => {
    if (state.completed && state.score > 0) {
      if (state.score > highScore) {
        setHigh(state.score);
        setHighScore(GAME_KEY, state.score);
      }
    }
  }, [state.completed, state.score, highScore]);

  const handleCardClick = useCallback((index: number) => {
    setState((prev) => flipCard(prev, index));
  }, []);

  const handleNewGame = useCallback(() => {
    setState(createMemory(size));
    setTimer(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [size]);

  const handleSizeChange = useCallback((newSize: GridSize) => {
    setSize(newSize);
    setState(createMemory(newSize));
    setTimer(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <GameLayout
      title="PIXEL BESTIARY"
      color="yellow"
      score={state.score}
      highScore={highScore}
      timer={timer}
      onNewGame={handleNewGame}
      controls={
        <div className="flex items-center gap-2">
          <PixelButton
            color="yellow"
            onClick={() => handleSizeChange("easy")}
            className={size === "easy" ? "opacity-100" : "opacity-40"}
          >
            4x4
          </PixelButton>
          <PixelButton
            color="yellow"
            onClick={() => handleSizeChange("hard")}
            className={size === "hard" ? "opacity-100" : "opacity-40"}
          >
            6x6
          </PixelButton>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4">
        {/* Stats bar */}
        <div className="flex justify-center gap-6 text-[0.55rem] text-gray-400">
          <span>MOVES: {state.moves}</span>
          <span>
            PAIRS: {state.matched}/{state.total}
          </span>
          <span
            className={
              state.combo > 1
                ? "neon-text neon-text-yellow glow-pulse"
                : ""
            }
          >
            COMBO: x{state.combo}
          </span>
        </div>

        {/* Grid */}
        <MatchGrid state={state} onCardClick={handleCardClick} />

        {/* Hint */}
        {!state.completed && state.moves === 0 && (
          <p className="text-[0.5rem] text-gray-500">
            MATCH ALL CREATURE PAIRS
          </p>
        )}

        {/* Win overlay */}
        {state.completed && (
          <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
            <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
            <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
              <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">
                🏆
              </div>
              <h2 className="text-lg sm:text-xl neon-text-yellow animate-[victoryGlowYellow_1.5s_ease-in-out_infinite]">
                BESTIARY COMPLETE!
              </h2>
              <p className="text-[0.6rem] text-neon-yellow/70">
                SCORE: {state.score} &nbsp;|&nbsp; MOVES: {state.moves}
              </p>
              <PixelButton color="yellow" onClick={handleNewGame}>
                PLAY AGAIN
              </PixelButton>
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  );
}
