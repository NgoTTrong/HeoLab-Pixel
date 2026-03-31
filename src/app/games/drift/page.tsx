"use client";

import { useReducer, useRef, useState, useCallback, useEffect } from "react";
import GameLayout from "@/components/GameLayout";
import MuteButton from "@/components/MuteButton";
import PixelButton from "@/components/PixelButton";
import { getHighScore, setHighScore, getBestTime, setBestTime } from "@/lib/scores";
import { gameReducer, initialState } from "@/games/drift/logic";
import { createDriftAudio, type DriftAudio } from "@/games/drift/audio";
import DriftCanvas from "@/games/drift/DriftCanvas";
import Menu from "@/games/drift/Menu";
import type { GameMode } from "@/games/drift/types";
import { POSITION_SCORES, TRACKS } from "@/games/drift/config";
import type { GameHelp } from "@/lib/gameHelp";

const HELP: GameHelp = {
  objective: "Race to the finish line or set the fastest lap time. Master drifting to build boost and unleash speed surges at the right moment.",
  controls: [
    { key: "Up / W", action: "Accelerate" },
    { key: "Down / S", action: "Brake / Reverse" },
    { key: "Left / Right", action: "Steer" },
    { key: "A / D", action: "Steer (alternate)" },
  ],
  scoring: [
    { icon: "🏆", name: "RACE MODE", desc: "Finish position determines score — 1st place scores maximum points." },
    { icon: "⏱", name: "TIME ATTACK", desc: "Beat your best lap time to set a new record. No opponents, pure precision driving." },
  ],
  specials: [
    { icon: "🌀", name: "DRIFT", desc: "Hold a turn while accelerating to enter a drift. The longer you drift, the more boost bar you fill." },
    { icon: "⚡", name: "BOOST", desc: "When the boost bar is full, release the drift for a powerful speed surge." },
    { icon: "👻", name: "GHOST REPLAY", desc: "In Time Attack mode, your best lap is recorded as a ghost car you race against next time." },
  ],
};

const GAME_KEY = "drift";
const MUTE_KEY = "gamestation-drift-muted";
const GHOST_KEY_PREFIX = "gamestation-drift-ghost-";

/** Format milliseconds as M:SS.mmm */
function fmtTime(ms: number): string {
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

const POSITION_LABELS = ["1ST PLACE!", "2ND PLACE!", "3RD PLACE", "4TH PLACE"] as const;

export default function DriftPage() {
  const [phase, setPhase] = useState<"menu" | "playing">("menu");
  const [state, dispatch] = useReducer(gameReducer, initialState("race", 0, 0, null));
  const [highScore, setHS] = useState(0);
  const [muted, setMuted] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem(MUTE_KEY) === "1"
  );

  // Track the best time at race start for comparison (before it gets overwritten)
  const bestTimeAtStart = useRef<number | null>(null);
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

  // Countdown auto-dispatch
  useEffect(() => {
    if (state.status !== "countdown") return;
    const id = setInterval(() => {
      dispatch({ type: "COUNTDOWN_TICK" });
    }, 1000);
    return () => clearInterval(id);
  }, [state.status]);

  // Load ghost replay data from localStorage for Time Attack mode
  const loadGhostZ = useCallback((trackSlug: string): number[] => {
    try {
      const raw = localStorage.getItem(`${GHOST_KEY_PREFIX}${trackSlug}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as number[];
      }
    } catch {
      // ignore malformed data
    }
    return [];
  }, []);

  // Start game from menu
  const handleStart = useCallback(
    (mode: GameMode, carIndex: number, trackIndex: number) => {
      const trackSlug = TRACKS[trackIndex].slug;
      const bt = mode === "timeAttack" ? getBestTime(`${GAME_KEY}-${trackSlug}`) : null;
      const ghostZ = mode === "timeAttack" ? loadGhostZ(trackSlug) : [];
      bestTimeAtStart.current = bt;
      dispatch({ type: "INIT", mode, trackIndex, carIndex, bestTime: bt, ghostZ });
      setPhase("playing");
    },
    [loadGhostZ],
  );

  // Retry with same config
  const handleRetry = useCallback(() => {
    const trackSlug = TRACKS[state.trackIndex].slug;
    const bt = state.mode === "timeAttack" ? getBestTime(`${GAME_KEY}-${trackSlug}`) : null;
    const ghostZ = state.mode === "timeAttack" ? loadGhostZ(trackSlug) : [];
    bestTimeAtStart.current = bt;
    dispatch({ type: "INIT", mode: state.mode, trackIndex: state.trackIndex, carIndex: state.carIndex, bestTime: bt, ghostZ });
  }, [state.mode, state.trackIndex, state.carIndex, loadGhostZ]);

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
      const isNewBest = bestTimeAtStart.current === null || totalTime < bestTimeAtStart.current;
      setBestTime(`${GAME_KEY}-${trackSlug}`, totalTime);

      // Save ghost recording only on new best time
      if (isNewBest && state.ghostRecording.length > 0) {
        try {
          localStorage.setItem(
            `${GHOST_KEY_PREFIX}${trackSlug}`,
            JSON.stringify(state.ghostRecording),
          );
        } catch {
          // localStorage full or unavailable - silently ignore
        }
      }
    }
  }, [state.status, state.mode, state.score, state.trackIndex, state.lapTimes, state.ghostRecording, highScore]);

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

  // Finish overlay helpers
  const totalTime = state.lapTimes.reduce((a, b) => a + b, 0);
  const isNewRecord =
    state.mode === "timeAttack" &&
    state.status === "finished" &&
    (bestTimeAtStart.current === null || totalTime < bestTimeAtStart.current);

  return (
    <GameLayout
      title="PIXEL DRIFT"
      color="orange"
      score={showScore ? state.score : undefined}
      highScore={showScore ? highScore : undefined}
      timer={showTimer ? elapsedSec : undefined}
      onNewGame={phase === "playing" ? handleBackToMenu : undefined}
      actions={<MuteButton muted={muted} onToggle={() => setMuted((m) => !m)} color="orange" />}
      helpContent={HELP}
      gameKey="drift"
    >
      {phase === "menu" ? (
        <Menu onStart={handleStart} />
      ) : (
        <DriftCanvas state={state} dispatch={dispatch} audio={audioRef.current} />
      )}

      {/* Countdown overlay */}
      {phase === "playing" && state.status === "countdown" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div
              key={state.countdown}
              className="text-6xl sm:text-8xl neon-text-orange animate-[countdownPop_0.8s_ease-out]"
              style={{ textShadow: "0 0 30px var(--neon-orange), 0 0 60px var(--neon-orange)" }}
            >
              {state.countdown > 0 ? state.countdown : "GO!"}
            </div>
          </div>
        </div>
      )}

      {/* Finish overlay - Win (Time Attack new record or Race 1st/2nd) */}
      {phase === "playing" && state.status === "finished" && state.mode === "timeAttack" && isNewRecord && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">🏆</div>
            <h2 className="text-lg sm:text-xl neon-text-orange animate-[victoryGlowOrange_1.5s_ease-in-out_infinite]">
              NEW RECORD!
            </h2>
            <p className="text-[0.6rem] text-neon-orange/70">
              TIME: {fmtTime(totalTime)}
              {bestTimeAtStart.current !== null && ` · PREV: ${fmtTime(bestTimeAtStart.current)}`}
            </p>
            <div className="flex gap-3 mt-2">
              <PixelButton color="orange" onClick={handleBackToMenu}>MENU</PixelButton>
              <PixelButton color="orange" onClick={handleRetry}>RETRY</PixelButton>
            </div>
          </div>
        </div>
      )}

      {/* Finish overlay - Time Attack no record */}
      {phase === "playing" && state.status === "finished" && state.mode === "timeAttack" && !isNewRecord && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">🏁</div>
            <h2 className="text-lg sm:text-xl neon-text-orange animate-[victoryGlowOrange_1.5s_ease-in-out_infinite]">
              FINISH!
            </h2>
            <p className="text-[0.6rem] text-neon-orange/70">
              TIME: {fmtTime(totalTime)}
              {bestTimeAtStart.current !== null && ` · BEST: ${fmtTime(bestTimeAtStart.current)}`}
            </p>
            <div className="flex gap-3 mt-2">
              <PixelButton color="orange" onClick={handleBackToMenu}>MENU</PixelButton>
              <PixelButton color="orange" onClick={handleRetry}>RETRY</PixelButton>
            </div>
          </div>
        </div>
      )}

      {/* Finish overlay - Race win (1st/2nd) */}
      {phase === "playing" && state.status === "finished" && state.mode === "race" && state.position <= 2 && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">🏆</div>
            <h2 className="text-lg sm:text-xl neon-text-orange animate-[victoryGlowOrange_1.5s_ease-in-out_infinite]">
              {POSITION_LABELS[state.position - 1]}
            </h2>
            <p className="text-[0.6rem] text-neon-orange/70">
              SCORE: {state.score} · TIME: {fmtTime(totalTime)}
            </p>
            <div className="flex gap-3 mt-2">
              <PixelButton color="orange" onClick={handleBackToMenu}>MENU</PixelButton>
              <PixelButton color="orange" onClick={handleRetry}>RETRY</PixelButton>
            </div>
          </div>
        </div>
      )}

      {/* Finish overlay - Race lose (3rd/4th) */}
      {phase === "playing" && state.status === "finished" && state.mode === "race" && state.position >= 3 && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">💨</div>
            <h2 className="text-lg sm:text-xl neon-text-pink animate-[defeatFlash_1s_ease-in-out_infinite]">
              {POSITION_LABELS[state.position - 1]}
            </h2>
            <p className="text-[0.6rem] text-neon-orange/70">
              SCORE: {state.score} · TIME: {fmtTime(totalTime)}
            </p>
            <div className="flex gap-3 mt-2">
              <PixelButton color="orange" onClick={handleBackToMenu}>MENU</PixelButton>
              <PixelButton color="orange" onClick={handleRetry}>RETRY</PixelButton>
            </div>
          </div>
        </div>
      )}
    </GameLayout>
  );
}
