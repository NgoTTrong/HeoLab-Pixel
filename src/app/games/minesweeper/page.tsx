"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import Board from "@/games/minesweeper/Board";
import { createBoard, reveal, toggleFlag, chord } from "@/games/minesweeper/logic";
import { Difficulty, MinesweeperState, DIFFICULTIES } from "@/games/minesweeper/types";
import { getBestTime, setBestTime } from "@/lib/scores";
import { createMinesweeperAudio } from "@/games/minesweeper/audio";
import MuteButton from "@/components/MuteButton";
import type { MinesweeperAudio } from "@/games/minesweeper/audio";

export default function MinesweeperPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [state, setState] = useState<MinesweeperState>(() =>
    createBoard("easy")
  );
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [bestTime, setBest] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<MinesweeperAudio | null>(null);
  const pendingAudioRef = useRef<string | null>(null);
  const [muted, setMuted] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("minesweeper-sound-muted") === "1"
  );
  const [flagMode, setFlagMode] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
    setIsMobile(window.innerWidth < 768);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lazy-init audio on first user gesture (required by browser autoplay policy)
  useEffect(() => {
    const init = () => {
      if (!audioRef.current) {
        audioRef.current = createMinesweeperAudio();
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

  // Sync muted state to audio instance and localStorage
  useEffect(() => {
    audioRef.current?.setMuted(muted);
    localStorage.setItem("minesweeper-sound-muted", muted ? "1" : "0");
  }, [muted]);

  // Consume pending audio after each state update
  useEffect(() => {
    if (!pendingAudioRef.current) return;
    const key = pendingAudioRef.current;
    pendingAudioRef.current = null;
    const a = audioRef.current;
    if (!a) return;
    if (key === "mine") a.playMine();
    else if (key === "win") a.playWin();
    else if (key === "cascade") a.playCascade();
    else if (key === "chord") a.playChord();
    else a.playReveal();
  }, [state]);

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

        if (prev.firstClick) {
          setTimerActive(true);
        }

        const next = reveal(prev, row, col);

        // Count revealed cells to detect cascade
        const prevRevealed = prev.board.flat().filter((c) => c.isRevealed).length;
        const nextRevealed = next.board.flat().filter((c) => c.isRevealed).length;
        const delta = nextRevealed - prevRevealed;

        // Schedule audio (consumed by useEffect after re-render)
        if (next.gameState === "lost") pendingAudioRef.current = "mine";
        else if (next.gameState === "won") pendingAudioRef.current = "win";
        else if (delta >= 3) pendingAudioRef.current = "cascade";
        else pendingAudioRef.current = "reveal";

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

  const handleFlag = useCallback((row: number, col: number) => {
    setState((prev) => {
      const next = toggleFlag(prev, row, col);
      // Safe to call directly — audioRef is a stable ref, not React state
      if (next.flagCount > prev.flagCount) audioRef.current?.playFlag();
      else audioRef.current?.playUnflag();
      return next;
    });
  }, []);

  const handleChord = useCallback(
    (row: number, col: number) => {
      setState((prev) => {
        const next = chord(prev, row, col);

        if (next.gameState === "lost") pendingAudioRef.current = "mine";
        else if (next.gameState === "won") pendingAudioRef.current = "win";
        else pendingAudioRef.current = "chord";

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
          <MuteButton muted={muted} onToggle={() => setMuted((m) => !m)} color="green" />
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

        {/* Board — hard mode rotates to portrait on mobile */}
        <div className="w-full overflow-x-auto flex justify-center">
          <div className={`relative transition-all duration-500
            ${state.gameState === "lost" ? "animate-[screenShake_0.5s_ease-in-out]" : ""}`}>
            <Board
              board={state.board}
              gameState={state.gameState}
              onReveal={handleReveal}
              onFlag={handleFlag}
              onChord={handleChord}
              flagMode={flagMode}
              rotated={difficulty === "hard" && isMobile}
            />
          </div>
        </div>

        {/* Win overlay */}
        {state.gameState === "won" && (
          <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
            <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
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
            <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
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
