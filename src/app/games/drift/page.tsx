"use client";

import { useReducer, useRef, useState, useCallback, useEffect } from "react";
import GameLayout from "@/components/GameLayout";
import MuteButton from "@/components/MuteButton";
import { getHighScore, setHighScore, getBestTime, setBestTime } from "@/lib/scores";
import { gameReducer, initialState } from "@/games/drift/logic";
import { createDriftAudio, type DriftAudio } from "@/games/drift/audio";
import DriftCanvas from "@/games/drift/DriftCanvas";
import Menu from "@/games/drift/Menu";
import type { GameMode } from "@/games/drift/types";
import { POSITION_SCORES, TRACKS } from "@/games/drift/config";

const GAME_KEY = "drift";
const MUTE_KEY = "gamestation-drift-muted";

export default function DriftPage() {
  const [phase, setPhase] = useState<"menu" | "playing">("menu");
  const [state, dispatch] = useReducer(gameReducer, initialState("race", 0, 0, null));
  const [highScore, setHS] = useState(0);
  const [muted, setMuted] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem(MUTE_KEY) === "1"
  );

  const audioRef = useRef<DriftAudio | null>(null);

  // Load high score on mount
  useEffect(() => {
    setHS(getHighScore(GAME_KEY));
  }, []);

  // Lazy-init audio on first interaction
  useEffect(() => {
    const init = () => {
      if (!audioRef.current) {
        audioRef.current = createDriftAudio();
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

  // Sync mute state
  useEffect(() => {
    audioRef.current?.setMuted(muted);
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  }, [muted]);

  // Start game from menu
  const handleStart = useCallback(
    (mode: GameMode, trackIndex: number, carIndex: number) => {
      const trackSlug = TRACKS[trackIndex].slug;
      const bt = mode === "timeAttack" ? getBestTime(`${GAME_KEY}-${trackSlug}`) : null;
      dispatch({ type: "INIT", mode, trackIndex, carIndex, bestTime: bt });
      setPhase("playing");
    },
    [],
  );

  // Save scores when race finishes
  useEffect(() => {
    if (state.status !== "finished") return;

    if (state.mode === "race") {
      const finalScore = state.score;
      if (finalScore > highScore) {
        setHighScore(GAME_KEY, finalScore);
        setHS(finalScore);
      }
    }

    if (state.mode === "timeAttack") {
      const trackSlug = TRACKS[state.trackIndex].slug;
      const totalTime = state.lapTimes.reduce((a, b) => a + b, 0);
      setBestTime(`${GAME_KEY}-${trackSlug}`, totalTime);
    }
  }, [state.status, state.mode, state.score, state.trackIndex, state.lapTimes, highScore]);

  // Return to menu
  const handleBackToMenu = useCallback(() => {
    audioRef.current?.stopEngine();
    setPhase("menu");
  }, []);

  // Compute display values
  const isRaceMode = state.mode === "race";
  const elapsedSec = Math.floor(state.elapsedMs / 1000);
  const showScore = phase === "playing" && isRaceMode;
  const showTimer = phase === "playing" && (state.status === "racing" || state.status === "finished" || state.status === "countdown");

  return (
    <GameLayout
      title="PIXEL DRIFT"
      color="orange"
      score={showScore ? state.score : undefined}
      highScore={showScore ? highScore : undefined}
      timer={showTimer ? elapsedSec : undefined}
      onNewGame={phase === "playing" ? handleBackToMenu : undefined}
      actions={<MuteButton muted={muted} onToggle={() => setMuted((m) => !m)} color="orange" />}
    >
      {phase === "menu" ? (
        <Menu onStart={handleStart} />
      ) : (
        <DriftCanvas state={state} dispatch={dispatch} audio={audioRef.current} />
      )}
    </GameLayout>
  );
}
