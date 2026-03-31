"use client";

import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import { snakeReducer, type Direction } from "@/games/snake/logic";
import { GRID_SIZE, LEVELS, POWER_UPS, BOMB_BLINK_MS } from "@/games/snake/config";
import { getHighScore, setHighScore } from "@/lib/scores";
import { createSnakeAudio } from "@/games/snake/audio";
import type { SnakeAudio } from "@/games/snake/audio";
import MuteButton from "@/components/MuteButton";
import type { GameHelp } from "@/lib/gameHelp";

const HELP: GameHelp = {
  objective: "Eat food to grow your snake and score points. Avoid hitting walls or your own tail — one wrong move ends the game!",
  controls: [
    { key: "Arrow Keys", action: "Change direction" },
    { key: "W A S D", action: "Change direction (alternate)" },
    { key: "Swipe", action: "Change direction on mobile" },
  ],
  scoring: [
    { icon: "🍎", name: "FOOD SCORE", desc: "Each food item scores points based on your current speed tier — faster snake means bigger rewards." },
  ],
  specials: [
    { icon: "⚡", name: "SPEED RAMP", desc: "The snake accelerates as it grows longer, making tight spaces increasingly dangerous." },
  ],
};

const GAME_KEY = "snake";

function isTouchDevice() {
  return typeof window !== "undefined" && "ontouchstart" in window;
}

export default function SnakePage() {
  const [state, dispatch] = useReducer(snakeReducer, {
    snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
    direction: "RIGHT",
    pendingDir: "RIGHT",
    food: { x: 15, y: 10 },
    spawnedPowerUp: null,
    activePowerUp: null,
    bomb: null,
    score: 0,
    level: 0,
    status: "idle",
  });

  const [highScore, setHS] = useState(0);
  const [muted, setMuted] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("snake-sound-muted") === "1"
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const audioRef = useRef<SnakeAudio | null>(null);
  const prevScoreRef = useRef(0);
  const prevLevelRef = useRef(0);
  const prevStatusRef = useRef<string>("idle");

  const level = LEVELS[state.level] ?? LEVELS[LEVELS.length - 1];

  useEffect(() => {
    setHS(getHighScore(GAME_KEY));
  }, []);

  // Lazy-init audio on first interaction
  useEffect(() => {
    const init = () => {
      if (!audioRef.current) {
        audioRef.current = createSnakeAudio();
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
    localStorage.setItem("snake-sound-muted", muted ? "1" : "0");
  }, [muted]);

  // Audio events based on state changes
  useEffect(() => {
    if (state.score > prevScoreRef.current) audioRef.current?.playEat();
    prevScoreRef.current = state.score;
  }, [state.score]);

  useEffect(() => {
    if (state.level > prevLevelRef.current) audioRef.current?.playLevelUp();
    prevLevelRef.current = state.level;
  }, [state.level]);

  useEffect(() => {
    if (state.status === "dead" && prevStatusRef.current !== "dead") audioRef.current?.playDie();
    prevStatusRef.current = state.status;
  }, [state.status]);

  // Game loop
  useEffect(() => {
    if (state.status !== "playing") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    // Speed boost halves interval
    const speedMult = state.activePowerUp?.type === "speedBoost" ? 0.5 : 1;
    const ms = Math.round(level.intervalMs * speedMult);

    intervalRef.current = setInterval(() => {
      dispatch({ type: "TICK", now: Date.now() });
    }, ms);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.status, state.level, state.activePowerUp?.type, level.intervalMs]);

  // Update high score on death
  useEffect(() => {
    if (state.status === "dead" && state.score > highScore) {
      setHighScore(GAME_KEY, state.score);
      setHS(state.score);
    }
  }, [state.status, state.score, highScore]);

  // Keyboard controls
  const handleKey = useCallback((e: KeyboardEvent) => {
    const map: Record<string, Direction> = {
      ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
      w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT",
      W: "UP", S: "DOWN", A: "LEFT", D: "RIGHT",
    };
    if (map[e.key]) {
      e.preventDefault();
      if (state.status === "idle") dispatch({ type: "START" });
      dispatch({ type: "SET_DIR", dir: map[e.key] });
    }
    if (e.key === " " && state.status === "idle") {
      e.preventDefault();
      dispatch({ type: "START" });
    }
  }, [state.status]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Touch swipe controls
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (state.status === "idle") dispatch({ type: "START" });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) return; // too small
    if (absDx > absDy) {
      dispatch({ type: "SET_DIR", dir: dx > 0 ? "RIGHT" : "LEFT" });
    } else {
      dispatch({ type: "SET_DIR", dir: dy > 0 ? "DOWN" : "UP" });
    }
    touchStartRef.current = null;
  };

  const headPos = state.snake[0];
  const snakeColor = level.color;

  const activePowerUpDef = state.activePowerUp
    ? POWER_UPS.find((p) => p.type === state.activePowerUp!.type)
    : null;
  const spawnedDef = state.spawnedPowerUp
    ? POWER_UPS.find((p) => p.type === state.spawnedPowerUp!.type)
    : null;

  const now = Date.now();
  const bombBlinking = state.bomb
    ? now - state.bomb.spawnedAt > BOMB_BLINK_MS
    : false;

  return (
    <GameLayout
      title="NEON SERPENT"
      color="blue"
      score={state.score}
      highScore={highScore}
      onNewGame={() => dispatch({ type: "START" })}
      actions={<MuteButton muted={muted} onToggle={() => setMuted(m => !m)} color="green" />}
      helpContent={HELP}
      gameKey="snake"
    >
      {/* Active power-up indicator */}
      {activePowerUpDef && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 font-pixel text-[0.5rem] px-3 py-1 border animate-pulse z-10"
          style={{ color: activePowerUpDef.color, borderColor: activePowerUpDef.color + "80" }}
        >
          {activePowerUpDef.emoji} {activePowerUpDef.type === "scoreDouble"
            ? `×2 ×${state.activePowerUp?.scoreDoubleRemaining}`
            : activePowerUpDef.type.toUpperCase()}
        </div>
      )}

      {/* Level badge */}
      <div
        className="absolute top-16 right-4 font-pixel text-[0.45rem] px-2 py-0.5 border"
        style={{ color: snakeColor, borderColor: snakeColor + "60" }}
      >
        {level.label}
      </div>

      {/* Grid */}
      <div
        className={`relative select-none ${state.status === "dead" ? "animate-[screenShake_0.5s_ease-in-out]" : ""}`}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
          width: "min(90vw, 90vh, 500px)",
          aspectRatio: "1",
          border: `1px solid ${snakeColor}33`,
          background: "#0a0a1a",
          backgroundImage: `linear-gradient(to right, ${snakeColor}12 1px, transparent 1px), linear-gradient(to bottom, ${snakeColor}12 1px, transparent 1px)`,
          backgroundSize: `calc(100% / ${GRID_SIZE}) calc(100% / ${GRID_SIZE})`,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, idx) => {
          const x = idx % GRID_SIZE;
          const y = Math.floor(idx / GRID_SIZE);
          const key = `${x},${y}`;
          const isFood = state.food.x === x && state.food.y === y;
          const isSpawnedPowerUp = state.spawnedPowerUp?.pos.x === x && state.spawnedPowerUp?.pos.y === y;
          const isHead = headPos.x === x && headPos.y === y;

          // Find snake segment index at this position
          const segIdx = state.snake.findIndex((s) => s.x === x && s.y === y);
          const isSnake = segIdx !== -1;
          const opacity = isSnake ? Math.max(0.2, 1 - segIdx * 0.05) : 1;
          const isTail = segIdx === state.snake.length - 1 && state.snake.length > 1;
          const isBomb = state.bomb?.pos.x === x && state.bomb?.pos.y === y;

          // Pixel art taper: head slightly smaller than full, body shrinks per segment, tail = tiny dot
          const segScale = isHead
            ? 0.92
            : isTail
            ? 0.3
            : isSnake
            ? Math.max(0.5, 0.88 - (segIdx - 1) * 0.04)
            : 1;

          return (
            <div
              key={key}
              style={{
                backgroundColor: isHead
                  ? snakeColor
                  : isSnake
                  ? `${snakeColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`
                  : "transparent",
                boxShadow: isHead ? `0 0 8px ${snakeColor}, 0 0 14px ${snakeColor}50` : "none",
                borderRadius: "2px",
                transform: isSnake ? `scale(${segScale})` : undefined,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 0.05s",
                position: "relative" as const,
              }}
            >
              {/* Snake head eyes */}
              {isHead && (
                <>
                  <span style={{
                    position: "absolute",
                    width: "3px", height: "3px",
                    background: "#000",
                    borderRadius: "50%",
                    top: state.direction === "DOWN" ? "auto" : "22%",
                    bottom: state.direction === "DOWN" ? "22%" : "auto",
                    left: state.direction === "RIGHT" ? "auto" : state.direction === "LEFT" ? "18%" : "18%",
                    right: state.direction === "RIGHT" ? "18%" : "auto",
                  }} />
                  <span style={{
                    position: "absolute",
                    width: "3px", height: "3px",
                    background: "#000",
                    borderRadius: "50%",
                    top: state.direction === "DOWN" ? "auto" : "22%",
                    bottom: state.direction === "DOWN" ? "22%" : "auto",
                    left: state.direction === "RIGHT" ? "auto" : state.direction === "LEFT" ? "18%" : "58%",
                    right: state.direction === "RIGHT" ? "18%" : state.direction === "UP" ? "auto" : "auto",
                  }} />
                </>
              )}
              {/* Food */}
              {isFood && <span style={{ fontSize: "80%", lineHeight: 1, display: "flex" }}>🍎</span>}
              {/* Power-up */}
              {!isFood && isSpawnedPowerUp && (
                <span style={{ fontSize: "80%", lineHeight: 1, display: "flex" }}>{spawnedDef?.emoji}</span>
              )}
              {/* Bomb */}
              {isBomb && (
                <span style={{ fontSize: "80%", lineHeight: 1, display: "flex" }} className={bombBlinking ? "animate-pulse" : ""}>💣</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Idle overlay */}
      {state.status === "idle" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">🐍</div>
            <h2 className="text-sm neon-text-blue animate-[victoryGlowBlue_1.5s_ease-in-out_infinite]">NEON SERPENT</h2>
            <p className="text-[0.5rem] text-neon-blue/60">
              {isTouchDevice() ? "SWIPE TO START" : "PRESS SPACE OR ARROW TO START"}
            </p>
            <PixelButton color="blue" onClick={() => dispatch({ type: "START" })}>PLAY</PixelButton>
          </div>
        </div>
      )}

      {/* Dead overlay */}
      {state.status === "dead" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">💥</div>
            <h2 className="text-lg sm:text-xl neon-text-pink animate-[defeatFlash_1s_ease-in-out_infinite]">SYSTEM CRASH!</h2>
            <p className="text-[0.6rem] text-neon-pink/70">SCORE: {state.score} · BEST: {highScore}</p>
            <PixelButton color="pink" onClick={() => dispatch({ type: "START" })}>TRY AGAIN</PixelButton>
          </div>
        </div>
      )}

      {/* Mobile D-pad hint */}
      {isTouchDevice() && state.status === "playing" && (
        <p className="text-[0.4rem] text-gray-600 mt-2">SWIPE TO TURN</p>
      )}
    </GameLayout>
  );
}
