"use client";

import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import MuteButton from "@/components/MuteButton";
import { pacmanReducer, createInitialState } from "@/games/pacman/logic";
import { createPacmanAudio, type PacmanAudio } from "@/games/pacman/audio";
import { getHighScore, setHighScore } from "@/lib/scores";
import {
  DEFAULT_MODIFIERS,
  GHOST_COLORS,
  CELL_SIZE,
  TICK_MS,
} from "@/games/pacman/config";
import type {
  Direction,
  GameModifiers,
  CellType,
  PacmanState,
  Ghost,
} from "@/games/pacman/types";

const GAME_KEY = "pacman";
const MAZE_COLS = 28;
const MAZE_ROWS = 31;

// Fruit emojis per level
const FRUIT_EMOJIS = ["🍒", "🍓", "🍊", "🍎", "🍇", "🍈", "🔔", "🔑"];

function isTouchDevice() {
  return typeof window !== "undefined" && "ontouchstart" in window;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MazeCell({
  cell,
  cellSize,
}: {
  cell: CellType;
  cellSize: number;
}) {
  const base: React.CSSProperties = {
    width: cellSize,
    height: cellSize,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  switch (cell) {
    case 1: // wall
      return (
        <div
          style={{
            ...base,
            backgroundColor: "#0a0a2e",
            border: "1px solid #1a1aff40",
            borderRadius: "2px",
          }}
        />
      );
    case 2: // dot
      return (
        <div style={{ ...base, backgroundColor: "transparent" }}>
          <div
            style={{
              width: Math.max(2, cellSize * 0.15),
              height: Math.max(2, cellSize * 0.15),
              borderRadius: "50%",
              backgroundColor: "#ffb8ff",
            }}
          />
        </div>
      );
    case 3: // power pellet
      return (
        <div style={{ ...base, backgroundColor: "transparent" }}>
          <div
            className="animate-pulse"
            style={{
              width: Math.max(4, cellSize * 0.5),
              height: Math.max(4, cellSize * 0.5),
              borderRadius: "50%",
              backgroundColor: "#ffb8ff",
              boxShadow: "0 0 6px #ff69b4, 0 0 12px #ff69b480",
            }}
          />
        </div>
      );
    case 4: // ghost house
      return <div style={{ ...base, backgroundColor: "#0a0a1a" }} />;
    case 5: // tunnel
      return <div style={{ ...base, backgroundColor: "#050510" }} />;
    case 6: // ghost gate
      return (
        <div style={{ ...base, backgroundColor: "transparent", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: Math.max(2, cellSize * 0.2),
              backgroundColor: "#ff69b4",
            }}
          />
        </div>
      );
    default: // path (0)
      return <div style={{ ...base, backgroundColor: "transparent" }} />;
  }
}

function PacManSprite({
  x,
  y,
  dir,
  tick,
  cellSize,
}: {
  x: number;
  y: number;
  dir: Direction;
  tick: number;
  cellSize: number;
}) {
  // Chomp animation: mouth angle alternates every few ticks
  const mouthOpen = tick % 6 < 3;
  const mouthAngle = mouthOpen ? 40 : 5;

  // Rotation based on direction
  const rotations: Record<Direction, number> = {
    RIGHT: 0,
    DOWN: 90,
    LEFT: 180,
    UP: 270,
  };
  const rotation = rotations[dir];

  const size = cellSize * 0.85;
  const offset = (cellSize - size) / 2;

  return (
    <div
      style={{
        position: "absolute",
        left: x * cellSize + offset,
        top: y * cellSize + offset,
        width: size,
        height: size,
        transition: "left 0.08s linear, top 0.08s linear",
        zIndex: 10,
      }}
    >
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <g transform={`rotate(${rotation} 20 20)`}>
          <path
            d={`M20,20 L${20 + 18 * Math.cos((mouthAngle * Math.PI) / 180)},${
              20 - 18 * Math.sin((mouthAngle * Math.PI) / 180)
            } A18,18 0 1,0 ${20 + 18 * Math.cos((mouthAngle * Math.PI) / 180)},${
              20 + 18 * Math.sin((mouthAngle * Math.PI) / 180)
            } Z`}
            fill="#ffe600"
          />
        </g>
      </svg>
    </div>
  );
}

function GhostSprite({
  ghost,
  cellSize,
}: {
  ghost: Ghost;
  cellSize: number;
}) {
  const { pos, mode, eatenReturning, color, frightenedTimer, name } = ghost;
  const size = cellSize * 0.85;
  const offset = (cellSize - size) / 2;

  let bodyColor = color;
  let isFlashing = false;

  if (eatenReturning || mode === "eaten") {
    // Eaten: just eyes
    return (
      <div
        style={{
          position: "absolute",
          left: pos.x * cellSize + offset,
          top: pos.y * cellSize + offset,
          width: size,
          height: size,
          transition: "left 0.08s linear, top 0.08s linear",
          zIndex: 9,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: size * 0.12,
        }}
      >
        <div
          style={{
            width: size * 0.22,
            height: size * 0.28,
            backgroundColor: "#fff",
            borderRadius: "50%",
            position: "relative",
          }}
        >
          <div
            style={{
              width: size * 0.12,
              height: size * 0.14,
              backgroundColor: "#00f",
              borderRadius: "50%",
              position: "absolute",
              bottom: 1,
              left: "50%",
              transform: "translateX(-50%)",
            }}
          />
        </div>
        <div
          style={{
            width: size * 0.22,
            height: size * 0.28,
            backgroundColor: "#fff",
            borderRadius: "50%",
            position: "relative",
          }}
        >
          <div
            style={{
              width: size * 0.12,
              height: size * 0.14,
              backgroundColor: "#00f",
              borderRadius: "50%",
              position: "absolute",
              bottom: 1,
              left: "50%",
              transform: "translateX(-50%)",
            }}
          />
        </div>
      </div>
    );
  }

  if (mode === "frightened") {
    bodyColor = "#00d4ff";
    // Flash when timer is low (< 2 seconds worth of ticks)
    const flashThreshold = Math.round((2 * 1000) / TICK_MS);
    if (frightenedTimer > 0 && frightenedTimer < flashThreshold) {
      isFlashing = true;
    }
  }

  return (
    <div
      className={isFlashing ? "animate-pulse" : ""}
      style={{
        position: "absolute",
        left: pos.x * cellSize + offset,
        top: pos.y * cellSize + offset,
        width: size,
        height: size,
        transition: "left 0.08s linear, top 0.08s linear",
        zIndex: 9,
      }}
    >
      <svg viewBox="0 0 40 40" width={size} height={size}>
        {/* Ghost body */}
        <path
          d="M4,40 L4,18 A16,16 0 0,1 36,18 L36,40 L30,34 L24,40 L18,34 L12,40 L4,40 Z"
          fill={bodyColor}
        />
        {/* Eyes */}
        {mode !== "frightened" ? (
          <>
            <ellipse cx="14" cy="17" rx="4" ry="5" fill="#fff" />
            <ellipse cx="26" cy="17" rx="4" ry="5" fill="#fff" />
            <circle cx="15" cy="18" r="2.5" fill="#00f" />
            <circle cx="27" cy="18" r="2.5" fill="#00f" />
          </>
        ) : (
          <>
            {/* Frightened face */}
            <circle cx="14" cy="17" r="2.5" fill="#fff" />
            <circle cx="26" cy="17" r="2.5" fill="#fff" />
            <path
              d="M10,28 L14,25 L18,28 L22,25 L26,28 L30,25"
              stroke="#fff"
              strokeWidth="1.5"
              fill="none"
            />
          </>
        )}
      </svg>
    </div>
  );
}

function FruitSprite({
  cellSize,
  level,
}: {
  cellSize: number;
  level: number;
}) {
  const fruitIdx = Math.min(level - 1, FRUIT_EMOJIS.length - 1);
  const emoji = FRUIT_EMOJIS[fruitIdx];
  const size = cellSize * 0.85;
  const offset = (cellSize - size) / 2;

  return (
    <div
      className="animate-pulse"
      style={{
        position: "absolute",
        left: 13 * cellSize + offset,
        top: 17 * cellSize + offset,
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.75,
        lineHeight: 1,
        zIndex: 8,
      }}
    >
      {emoji}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PacmanPage() {
  const [state, dispatch] = useReducer(pacmanReducer, undefined, () =>
    createInitialState(DEFAULT_MODIFIERS),
  );

  const [highScore, setHS] = useState(0);
  const [muted, setMuted] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("pacman-sound-muted") === "1",
  );
  const [cellSize, setCellSize] = useState(CELL_SIZE);
  const [modifiers, setModifiers] = useState<GameModifiers>(DEFAULT_MODIFIERS);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const audioRef = useRef<PacmanAudio | null>(null);
  const prevScoreRef = useRef(0);
  const prevStatusRef = useRef<string>("idle");
  const prevFrightenedRef = useRef(0);
  const prevGhostCountRef = useRef(0);

  // Load high score on mount
  useEffect(() => {
    setHS(getHighScore(GAME_KEY));
  }, []);

  // Responsive cell sizing
  useEffect(() => {
    function updateSize() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(
        Math.floor((vw - 32) / MAZE_COLS),
        Math.floor((vh - 200) / MAZE_ROWS),
        16,
      );
      setCellSize(Math.max(6, s));
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Lazy-init audio on first interaction
  useEffect(() => {
    const init = () => {
      if (!audioRef.current) {
        audioRef.current = createPacmanAudio();
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
    localStorage.setItem("pacman-sound-muted", muted ? "1" : "0");
  }, [muted]);

  // Audio: waka on dot eaten (score change)
  useEffect(() => {
    if (state.score > prevScoreRef.current) audioRef.current?.playWaka();
    prevScoreRef.current = state.score;
  }, [state.score]);

  // Audio: power pellet
  useEffect(() => {
    if (state.frightenedTimeLeft > 0 && prevFrightenedRef.current === 0) {
      audioRef.current?.playPower();
    }
    prevFrightenedRef.current = state.frightenedTimeLeft;
  }, [state.frightenedTimeLeft]);

  // Audio: eat ghost (ghost combo increases)
  useEffect(() => {
    const eatenCount = state.ghosts.filter((g) => g.eatenReturning).length;
    if (eatenCount > prevGhostCountRef.current) {
      audioRef.current?.playEatGhost();
    }
    prevGhostCountRef.current = eatenCount;
  }, [state.ghosts]);

  // Audio: death or level complete
  useEffect(() => {
    if (state.status === "dead" && prevStatusRef.current !== "dead") {
      audioRef.current?.playDeath();
    }
    if (state.status === "won" && prevStatusRef.current !== "won") {
      audioRef.current?.playLevelComplete();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  // Game loop
  useEffect(() => {
    if (state.status !== "playing") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      dispatch({ type: "TICK" });
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.status]);

  // Update high score on death
  useEffect(() => {
    if (state.status === "dead" && state.score > highScore) {
      setHighScore(GAME_KEY, state.score);
      setHS(state.score);
    }
  }, [state.status, state.score, highScore]);

  // Keyboard controls
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: "UP",
        ArrowDown: "DOWN",
        ArrowLeft: "LEFT",
        ArrowRight: "RIGHT",
        w: "UP",
        s: "DOWN",
        a: "LEFT",
        d: "RIGHT",
        W: "UP",
        S: "DOWN",
        A: "LEFT",
        D: "RIGHT",
      };
      if (map[e.key]) {
        e.preventDefault();
        if (state.status === "idle") dispatch({ type: "START", modifiers });
        dispatch({ type: "SET_DIR", dir: map[e.key] });
      }
      if (e.key === " " && state.status === "idle") {
        e.preventDefault();
        dispatch({ type: "START", modifiers });
      }
    },
    [state.status, modifiers],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Touch swipe controls
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (state.status === "idle") dispatch({ type: "START", modifiers });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) return;
    if (absDx > absDy) {
      dispatch({ type: "SET_DIR", dir: dx > 0 ? "RIGHT" : "LEFT" });
    } else {
      dispatch({ type: "SET_DIR", dir: dy > 0 ? "DOWN" : "UP" });
    }
    touchStartRef.current = null;
  };

  // Board dimensions
  const boardWidth = MAZE_COLS * cellSize;
  const boardHeight = MAZE_ROWS * cellSize;

  // Lives display
  const livesArray = Array.from({ length: Math.min(state.lives, 5) });

  return (
    <GameLayout
      title="PIXEL CHOMP"
      color="orange"
      score={state.score}
      highScore={highScore}
      onNewGame={() => dispatch({ type: "START", modifiers })}
      actions={
        <>
          <MuteButton muted={muted} onToggle={() => setMuted((m) => !m)} color="orange" />
          <span className="text-[0.5rem] text-gray-400">
            LVL {state.level}
          </span>
          <span className="text-[0.5rem] text-neon-orange/70 flex gap-0.5">
            {livesArray.map((_, i) => (
              <span key={i} style={{ fontSize: "0.6rem" }}>
                &#9679;
              </span>
            ))}
          </span>
        </>
      }
    >
      {/* Maze board */}
      <div
        className={`relative select-none ${
          state.status === "dead" ? "animate-[screenShake_0.5s_ease-in-out]" : ""
        }`}
        style={{
          width: boardWidth,
          height: boardHeight,
          backgroundColor: "#000",
          border: "1px solid #1a1aff20",
          position: "relative",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Maze grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${MAZE_COLS}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${MAZE_ROWS}, ${cellSize}px)`,
          }}
        >
          {state.maze.flatMap((row, ry) =>
            row.map((cell, cx) => (
              <MazeCell key={`${cx},${ry}`} cell={cell} cellSize={cellSize} />
            )),
          )}
        </div>

        {/* Pac-Man sprite */}
        {state.status !== "idle" && (
          <PacManSprite
            x={state.pacman.x}
            y={state.pacman.y}
            dir={state.pacDir}
            tick={state.tick}
            cellSize={cellSize}
          />
        )}

        {/* Ghost sprites */}
        {state.status !== "idle" &&
          state.ghosts.map((ghost) => (
            <GhostSprite key={ghost.name} ghost={ghost} cellSize={cellSize} />
          ))}

        {/* Fruit */}
        {state.fruitActive && (
          <FruitSprite cellSize={cellSize} level={state.level} />
        )}
      </div>

      {/* Idle overlay */}
      {state.status === "idle" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">
              👾
            </div>
            <h2 className="text-sm neon-text-orange animate-[victoryGlowOrange_1.5s_ease-in-out_infinite]">
              PIXEL CHOMP
            </h2>
            <p className="text-[0.5rem] text-neon-orange/60">
              {isTouchDevice() ? "SWIPE TO START" : "PRESS SPACE OR ARROW TO START"}
            </p>
            <PixelButton color="orange" onClick={() => dispatch({ type: "START", modifiers })}>
              PLAY
            </PixelButton>
          </div>
        </div>
      )}

      {/* Won overlay (level complete) */}
      {state.status === "won" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">
              👾
            </div>
            <h2 className="text-lg sm:text-xl neon-text-orange animate-[victoryGlowOrange_1.5s_ease-in-out_infinite]">
              LEVEL CLEAR!
            </h2>
            <p className="text-[0.6rem] text-neon-orange/70">
              SCORE: {state.score} · BEST: {highScore}
            </p>
            <PixelButton color="orange" onClick={() => dispatch({ type: "NEXT_LEVEL" })}>
              NEXT LEVEL
            </PixelButton>
          </div>
        </div>
      )}

      {/* Dead overlay */}
      {state.status === "dead" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">
              💀
            </div>
            <h2 className="text-lg sm:text-xl neon-text-pink animate-[defeatFlash_1s_ease-in-out_infinite]">
              GAME OVER
            </h2>
            <p className="text-[0.6rem] text-neon-pink/70">
              SCORE: {state.score} · BEST: {highScore}
            </p>
            <PixelButton color="pink" onClick={() => dispatch({ type: "START", modifiers })}>
              TRY AGAIN
            </PixelButton>
          </div>
        </div>
      )}

      {/* Mobile hint */}
      {isTouchDevice() && state.status === "playing" && (
        <p className="text-[0.4rem] text-gray-600 mt-2">SWIPE TO TURN</p>
      )}
    </GameLayout>
  );
}
