"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import SudokuGrid from "@/games/sudoku/SudokuGrid";
import { createSudoku, placeNumber, toggleNote, useHint } from "@/games/sudoku/logic";
import { Difficulty, RUNES, SudokuState } from "@/games/sudoku/types";
import { getBestTime, setBestTime } from "@/lib/scores";
import { createSudokuAudio } from "@/games/sudoku/audio";
import type { SudokuAudio } from "@/games/sudoku/audio";
import MuteButton from "@/components/MuteButton";
import type { GameHelp } from "@/lib/gameHelp";

const HELP: GameHelp = {
  objective: "Fill every row, column, and 3x3 box with each rune (1-9) exactly once. No rune may repeat in the same row, column, or box.",
  controls: [
    { key: "Click cell", action: "Select a cell" },
    { key: "1 - 9", action: "Place rune in selected cell" },
    { key: "Click rune", action: "Place rune on touch" },
    { key: "Backspace / Del", action: "Clear selected cell" },
  ],
  specials: [
    { icon: "💡", name: "HINTS", desc: "Use limited hints to reveal the correct rune for a cell. Spend wisely!" },
    { icon: "✅", name: "AUTO-CHECK", desc: "Wrong placements are highlighted in red in real time so you can correct them immediately." },
  ],
};

export default function SudokuPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [state, setState] = useState<SudokuState>(() => createSudoku("easy"));
  const [notesMode, setNotesMode] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [bestTime, setBest] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<SudokuAudio | null>(null);
  const [muted, setMuted] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("sudoku-sound-muted") === "1"
  );

  const gameKey = `sudoku-${difficulty}`;

  // Lazy-init audio on first interaction
  useEffect(() => {
    const init = () => {
      if (!audioRef.current) {
        audioRef.current = createSudokuAudio();
        audioRef.current.setMuted(muted);
      }
    };
    window.addEventListener("pointerdown", init, { once: true });
    window.addEventListener("keydown", init, { once: true });
    return () => {
      window.removeEventListener("pointerdown", init);
      window.removeEventListener("keydown", init);
    };
  }, [muted]);

  useEffect(() => {
    audioRef.current?.setMuted(muted);
    localStorage.setItem("sudoku-sound-muted", muted ? "1" : "0");
  }, [muted]);

  // Load best time
  useEffect(() => {
    setBest(getBestTime(gameKey));
  }, [gameKey, state.completed]);

  // Timer
  useEffect(() => {
    if (timerActive) {
      intervalRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerActive]);

  // Start timer on first cell selection
  const startTimerIfNeeded = useCallback(() => {
    if (!timerActive && !state.completed) {
      setTimerActive(true);
    }
  }, [timerActive, state.completed]);

  const handleNewGame = useCallback(
    (diff?: Difficulty) => {
      const d = diff ?? difficulty;
      setState(createSudoku(d));
      setTimer(0);
      setTimerActive(false);
      setNotesMode(false);
      if (diff) setDifficulty(d);
    },
    [difficulty]
  );

  const handleSelect = useCallback(
    (row: number, col: number) => {
      startTimerIfNeeded();
      setState((prev) => ({ ...prev, selected: [row, col] }));
    },
    [startTimerIfNeeded]
  );

  const handleNumber = useCallback(
    (num: number) => {
      startTimerIfNeeded();
      setState((prev) => {
        const next = notesMode ? toggleNote(prev, num) : placeNumber(prev, num);
        if (next === prev) return prev;
        if (notesMode) {
          audioRef.current?.playFill();
        } else if (next.completed && !prev.completed) {
          audioRef.current?.playWin();
          setTimerActive(false);
          setTimeout(() => {
            setTimer((t) => {
              setBestTime(gameKey, t);
              setBest(getBestTime(gameKey));
              return t;
            });
          }, 0);
        } else if (prev.selected) {
          const [r, c] = prev.selected;
          const key = `${r},${c}`;
          if (next.errors.has(key)) {
            audioRef.current?.playWrong();
          } else {
            audioRef.current?.playCorrect();
          }
        }
        return next;
      });
    },
    [notesMode, gameKey, startTimerIfNeeded]
  );

  const handleDelete = useCallback(() => {
    setState((prev) => {
      const next = placeNumber(prev, 0);
      if (next !== prev) audioRef.current?.playClear();
      return next;
    });
  }, []);

  const handleHint = useCallback(() => {
    setState((prev) => {
      const next = useHint(prev);
      if (next.completed && !prev.completed) {
        setTimerActive(false);
        setTimeout(() => {
          setTimer((t) => {
            setBestTime(gameKey, t);
            setBest(getBestTime(gameKey));
            return t;
          });
        }, 0);
      }
      return next;
    });
  }, [gameKey]);

  const toggleRuneMode = useCallback(() => {
    setState((prev) => ({ ...prev, runeMode: !prev.runeMode }));
  }, []);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        e.preventDefault();
        handleNumber(num);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNumber, handleDelete]);

  // Controls in bottom bar
  const difficultyButtons = (
    <div className="flex gap-2">
      {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
        <PixelButton
          key={d}
          color="blue"
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
      title="RUNE SUDOKU"
      color="blue"
      timer={timer}
      onNewGame={() => handleNewGame()}
      actions={<MuteButton muted={muted} onToggle={() => setMuted(m => !m)} color="blue" />}
      controls={difficultyButtons}
      helpContent={HELP}
      gameKey="sudoku"
    >
      <div className="flex flex-col items-center gap-3">
        {/* Status bar */}
        <div className="flex items-center gap-2 sm:gap-4 text-[0.45rem] sm:text-[0.55rem] text-gray-400 flex-wrap justify-center">
          <PixelButton
            color="blue"
            onClick={toggleRuneMode}
            className="!text-[0.5rem] !px-2 !py-0.5"
          >
            {state.runeMode ? "NUMBERS" : "RUNES"}
          </PixelButton>
          <PixelButton
            color="blue"
            onClick={() => setNotesMode((p) => !p)}
            className={`!text-[0.5rem] !px-2 !py-0.5 ${notesMode ? "" : "opacity-40"}`}
          >
            NOTES {notesMode ? "ON" : "OFF"}
          </PixelButton>
          <PixelButton
            color="blue"
            onClick={handleHint}
            disabled={state.hintsLeft <= 0 || state.completed}
            className="!text-[0.5rem] !px-2 !py-0.5"
          >
            HINT ({state.hintsLeft})
          </PixelButton>
          {bestTime !== null && (
            <span>
              BEST: {Math.floor(bestTime / 60)}:{String(bestTime % 60).padStart(2, "0")}
            </span>
          )}
        </div>

        {/* Grid */}
        <div className="overflow-auto max-w-full">
          <SudokuGrid state={state} onSelect={handleSelect} />
        </div>

        {/* Number pad */}
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-1 max-w-xs">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleNumber(n)}
              disabled={state.completed}
              className="w-11 h-11 sm:w-10 sm:h-10 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0
                border border-neon-blue/30 text-neon-blue
                hover:bg-neon-blue/10 transition-colors disabled:opacity-30 text-sm sm:text-sm"
            >
              {state.runeMode ? RUNES[n] : n}
            </button>
          ))}
          <button
            type="button"
            onClick={handleDelete}
            disabled={state.completed}
            className="w-11 h-11 sm:w-10 sm:h-10 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0
              border border-neon-blue/30 text-gray-400
              hover:bg-neon-blue/10 transition-colors disabled:opacity-30 text-[0.5rem]"
          >
            DEL
          </button>
        </div>

        {/* Hint text */}
        {!state.completed && (
          <p className="text-[0.5rem] text-gray-500">
            {notesMode ? "NOTES MODE - CLICK NUMBERS TO PENCIL MARK" : "SELECT A CELL, THEN PRESS A NUMBER"}
          </p>
        )}

        {/* Win overlay */}
        {state.completed && (
          <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
            <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
            <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
              <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">
                ✨
              </div>
              <h2 className="text-lg sm:text-xl neon-text-blue animate-[victoryGlowBlue_1.5s_ease-in-out_infinite]">
                RUNES DECODED!
              </h2>
              <p className="text-[0.6rem] text-neon-blue/70">
                TIME: {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
              </p>
              <PixelButton color="blue" onClick={() => handleNewGame()}>
                PLAY AGAIN
              </PixelButton>
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  );
}
