"use client";

import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import MuteButton from "@/components/MuteButton";
import { pacmanReducer, createInitialState } from "@/games/pacman/logic";
import { createPacmanAudio, type PacmanAudio } from "@/games/pacman/audio";
import { getHighScore, setHighScore } from "@/lib/scores";
import { getComboColor } from "@/games/pacman/combo";
import {
  COMBO_MILESTONES,
  DEFAULT_MODIFIERS,
  GHOST_COLORS,
  CELL_SIZE,
  TICK_MS,
  PROXIMITY_FAR,
  PROXIMITY_MID,
  PROXIMITY_NEAR,
} from "@/games/pacman/config";
import { getCellOpacity, getClosestGhostDistance } from "@/games/pacman/fog";
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
// Settings Panel
// ---------------------------------------------------------------------------

interface SettingOption<T> {
  label: string;
  value: T;
}

interface SettingRowProps<T> {
  label: string;
  options: SettingOption<T>[];
  current: T;
  onChange: (v: T) => void;
}

function SettingRow<T extends string | number>({
  label,
  options,
  current,
  onChange,
}: SettingRowProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.45rem] text-gray-400 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className="px-2 py-1 text-[0.45rem] border uppercase transition-all duration-150"
            style={{
              borderColor:
                current === opt.value ? "#f97316" : "#2a2a4a",
              backgroundColor:
                current === opt.value ? "#f9731620" : "transparent",
              color: current === opt.value ? "#f97316" : "#888",
              fontFamily: "var(--font-pixel), monospace",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({
  modifiers,
  onChange,
  onClose,
}: {
  modifiers: GameModifiers;
  onChange: (m: GameModifiers) => void;
  onClose: () => void;
}) {
  const update = <K extends keyof GameModifiers>(
    key: K,
    value: GameModifiers[K],
  ) => {
    onChange({ ...modifiers, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-[overlayIn_0.3s_ease-out]">
      <div
        className="absolute inset-0 bg-dark-bg/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-[90vw] max-w-sm max-h-[85vh] overflow-y-auto border border-neon-orange/30 p-4 flex flex-col gap-3"
        style={{ backgroundColor: "#0d0d1a" }}
      >
        <h3 className="text-[0.55rem] neon-text-orange text-center tracking-wider">
          SETTINGS
        </h3>

        <SettingRow
          label="GHOST SPEED"
          options={[
            { label: "SLOW", value: "slow" as const },
            { label: "NORMAL", value: "normal" as const },
            { label: "FAST", value: "fast" as const },
            { label: "INSANE", value: "insane" as const },
          ]}
          current={modifiers.ghostSpeed}
          onChange={(v) => update("ghostSpeed", v)}
        />

        <SettingRow
          label="POWER TIME"
          options={[
            { label: "3S", value: 3 as const },
            { label: "5S", value: 5 as const },
            { label: "8S", value: 8 as const },
            { label: "12S", value: 12 as const },
          ]}
          current={modifiers.powerDuration}
          onChange={(v) => update("powerDuration", v)}
        />

        <SettingRow
          label="MAZE"
          options={[
            { label: "CLASSIC", value: "classic" as const },
            { label: "OPEN", value: "open" as const },
            { label: "TIGHT", value: "tight" as const },
          ]}
          current={modifiers.mazeStyle}
          onChange={(v) => update("mazeStyle", v)}
        />

        <SettingRow
          label="GHOSTS"
          options={[
            { label: "1", value: 1 as const },
            { label: "2", value: 2 as const },
            { label: "3", value: 3 as const },
            { label: "4", value: 4 as const },
          ]}
          current={modifiers.ghostCount}
          onChange={(v) => update("ghostCount", v)}
        />

        <SettingRow
          label="BONUS"
          options={[
            { label: "OFF", value: "off" as const },
            { label: "RARE", value: "rare" as const },
            { label: "NORMAL", value: "normal" as const },
            { label: "FREQUENT", value: "frequent" as const },
          ]}
          current={modifiers.bonusFrequency}
          onChange={(v) => update("bonusFrequency", v)}
        />

        <SettingRow
          label="LIVES"
          options={[
            { label: "1", value: 1 as const },
            { label: "3", value: 3 as const },
            { label: "5", value: 5 as const },
            { label: "99", value: 99 as const },
          ]}
          current={modifiers.lives}
          onChange={(v) => update("lives", v)}
        />

        <SettingRow
          label="SPEED RAMP"
          options={[
            { label: "OFF", value: "off" as const },
            { label: "GRADUAL", value: "gradual" as const },
            { label: "AGGRESSIVE", value: "aggressive" as const },
          ]}
          current={modifiers.speedRamp}
          onChange={(v) => update("speedRamp", v)}
        />

        <div className="flex justify-center pt-2">
          <PixelButton color="orange" onClick={onClose}>
            CLOSE
          </PixelButton>
        </div>
      </div>
    </div>
  );
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
            style={{
              width: Math.max(4, cellSize * 0.5),
              height: Math.max(4, cellSize * 0.5),
              borderRadius: "50%",
              backgroundColor: "#ffb8ff",
              animation: "pelletGlow 1.2s ease-in-out infinite",
            }}
          />
        </div>
      );
    case 4: // ghost house
      return <div style={{ ...base, backgroundColor: "#0a0a1a" }} />;
    case 5: // tunnel
      return <div style={{ ...base, backgroundColor: "#050510" }} />;
    case 6: // ghost gate - thin line
      return (
        <div style={{ ...base, backgroundColor: "transparent", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "10%",
              right: "10%",
              height: Math.max(2, cellSize * 0.15),
              backgroundColor: "#ff69b4",
              transform: "translateY(-50%)",
              borderRadius: 1,
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
  // Smooth chomp: cycle through mouth angles for fluid animation
  const chompPhase = tick % 8;
  const mouthAngles = [5, 15, 30, 40, 45, 40, 30, 15];
  const mouthAngle = mouthAngles[chompPhase];

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
          {/* Eye - positioned in the upper-right area, looking in movement direction */}
          <circle cx={25} cy={11} r={3.2} fill="#0a0a0a" />
          <circle cx={25.8} cy={10.2} r={1.2} fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
}

function GhostSprite({
  ghost,
  tick,
  cellSize,
}: {
  ghost: Ghost;
  tick: number;
  cellSize: number;
}) {
  const { pos, mode, eatenReturning, color, frightenedTimer } = ghost;
  const size = cellSize * 0.85;
  const offset = (cellSize - size) / 2;

  let bodyColor = color;

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

  // Frightened mode: blue, with flashing blue/white when timer is low
  let isFlashing = false;
  if (mode === "frightened") {
    bodyColor = "#00d4ff";
    const flashThreshold = Math.round((2 * 1000) / TICK_MS);
    if (frightenedTimer > 0 && frightenedTimer < flashThreshold) {
      isFlashing = true;
      // Alternate blue/white every 3 ticks
      bodyColor = tick % 6 < 3 ? "#00d4ff" : "#ffffff";
    }
  }

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
      }}
    >
      <svg viewBox="0 0 40 40" width={size} height={size}>
        {/* Ghost body */}
        <path
          d="M4,40 L4,18 A16,16 0 0,1 36,18 L36,40 L30,34 L24,40 L18,34 L12,40 L4,40 Z"
          fill={bodyColor}
          style={
            isFlashing
              ? { animation: "ghostFrightenedFlash 0.25s steps(1) infinite" }
              : undefined
          }
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
            <circle cx="14" cy="17" r="2.5" fill={isFlashing && tick % 6 >= 3 ? "#333" : "#fff"} />
            <circle cx="26" cy="17" r="2.5" fill={isFlashing && tick % 6 >= 3 ? "#333" : "#fff"} />
            <path
              d="M10,28 L14,25 L18,28 L22,25 L26,28 L30,25"
              stroke={isFlashing && tick % 6 >= 3 ? "#333" : "#fff"}
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

function getComboProgress(combo: number): number {
  let prev = 0;
  for (const m of COMBO_MILESTONES) {
    if (combo < m.combo) {
      return ((combo - prev) / (m.combo - prev)) * 100;
    }
    prev = m.combo;
  }
  return 100;
}

export default function PacmanPage() {
  const [gameMode, setGameMode] = useState<"classic" | "survival">("classic");
  const [modifiers, setModifiers] = useState<GameModifiers>(DEFAULT_MODIFIERS);
  const [state, dispatch] = useReducer(pacmanReducer, undefined, () =>
    createInitialState(DEFAULT_MODIFIERS),
  );

  const [highScore, setHS] = useState(0);
  const [muted, setMuted] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("pacman-sound-muted") === "1",
  );
  const [cellSize, setCellSize] = useState(CELL_SIZE);
  const [showSettings, setShowSettings] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const audioRef = useRef<PacmanAudio | null>(null);
  const prevScoreRef = useRef(0);
  const prevStatusRef = useRef<string>("idle");
  const prevFrightenedRef = useRef(0);
  const prevGhostCountRef = useRef(0);
  const lastProximityRef = useRef(0);
  const prevComboRef = useRef(0);

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

  // Proximity audio for survival mode
  useEffect(() => {
    if (state.modifiers.gameMode !== "survival" || state.status !== "playing") return;
    const now = Date.now();
    if (now - lastProximityRef.current > 500) {
      const dist = getClosestGhostDistance(state.pacman, state.ghosts);
      if (dist <= PROXIMITY_NEAR) {
        audioRef.current?.playHeartbeat("near");
        audioRef.current?.playFootstep(0.8);
      } else if (dist <= PROXIMITY_MID) {
        audioRef.current?.playHeartbeat("mid");
        audioRef.current?.playFootstep(0.4);
      } else if (dist <= PROXIMITY_FAR) {
        audioRef.current?.playHeartbeat("far");
      }
      lastProximityRef.current = now;
    }
  }, [state.tick, state.modifiers.gameMode, state.status, state.pacman, state.ghosts]);

  // Track combo changes for audio
  useEffect(() => {
    if (state.modifiers.gameMode !== "survival") return;

    if (state.combo > prevComboRef.current && state.combo > 0) {
      audioRef.current?.playComboTick(state.combo);
    }

    // Check if milestone was just reached
    if (state.milestonePopup && state.milestonePopupTimer > 0) {
      audioRef.current?.playMilestone();
    }

    // Combo break
    if (state.combo === 0 && prevComboRef.current > 5) {
      audioRef.current?.playComboBreak();
    }

    prevComboRef.current = state.combo;
  }, [state.combo, state.milestonePopup, state.milestonePopupTimer, state.modifiers.gameMode]);

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
      // Don't capture keys while settings is open
      if (showSettings) return;

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
    [state.status, modifiers, showSettings],
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
          <button
            onClick={() => setShowSettings(true)}
            className="text-sm hover:scale-110 transition-transform"
            title="Settings"
            style={{ lineHeight: 1 }}
          >
            ⚙️
          </button>
          {state.modifiers.gameMode === "survival" && state.combo > 0 && (
            <span style={{ color: getComboColor(state.combo) }} className="text-[0.55rem] font-bold">
              x{state.combo}
            </span>
          )}
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
      {/* Settings panel */}
      {showSettings && (
        <SettingsPanel
          modifiers={modifiers}
          onChange={setModifiers}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Combo progress bar */}
      {state.modifiers.gameMode === "survival" && state.combo > 0 && (
        <div className="flex justify-center">
          <div className="w-40 h-1 bg-gray-800 overflow-hidden">
            <div
              className="h-full transition-all duration-100"
              style={{
                width: `${getComboProgress(state.combo)}%`,
                backgroundColor: getComboColor(state.combo),
              }}
            />
          </div>
        </div>
      )}

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
            row.map((cell, cx) => {
              const opacity = state.modifiers.gameMode === "survival"
                ? getCellOpacity(cx, ry, state.pacman, state.visRadius, state.visited, 0.2)
                : 1;
              return (
                <div key={`${cx},${ry}`} style={{ opacity }}>
                  <MazeCell cell={cell} cellSize={cellSize} />
                </div>
              );
            }),
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
          state.ghosts.map((ghost) => {
            const ghostOpacity = state.modifiers.gameMode === "survival"
              ? getCellOpacity(ghost.pos.x, ghost.pos.y, state.pacman, state.visRadius, state.visited, 0)
              : 1;
            if (ghostOpacity === 0) return null;
            return (
              <div key={ghost.name} style={{ opacity: ghostOpacity }}>
                <GhostSprite
                  ghost={ghost}
                  tick={state.tick}
                  cellSize={cellSize}
                />
              </div>
            );
          })}

        {/* Fruit */}
        {state.fruitActive && (
          <FruitSprite cellSize={cellSize} level={state.level} />
        )}

        {/* Milestone popup */}
        {state.modifiers.gameMode === "survival" && state.milestonePopup && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <span
              className="text-sm sm:text-base font-bold animate-[floatUp_1.5s_ease-out_forwards]"
              style={{ color: getComboColor(state.combo), textShadow: `0 0 10px ${getComboColor(state.combo)}` }}
            >
              {state.milestonePopup}
            </span>
          </div>
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
            <p
              className="text-[0.5rem] text-neon-orange/60"
              style={{ animation: "idleBlink 1.2s step-end infinite" }}
            >
              {isTouchDevice() ? "SWIPE TO START" : "PRESS SPACE OR ARROW TO START"}
            </p>
            {/* Mode selector */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => { setGameMode("classic"); setModifiers(m => ({...m, gameMode: "classic"})); }}
                className={`text-[0.5rem] px-3 py-1 border ${
                  gameMode === "classic"
                    ? "border-neon-orange text-neon-orange neon-text-orange"
                    : "border-gray-600 text-gray-500"
                } transition-colors`}
              >
                CLASSIC
              </button>
              <button
                onClick={() => { setGameMode("survival"); setModifiers(m => ({...m, gameMode: "survival"})); }}
                className={`text-[0.5rem] px-3 py-1 border ${
                  gameMode === "survival"
                    ? "border-neon-orange text-neon-orange neon-text-orange"
                    : "border-gray-600 text-gray-500"
                } transition-colors`}
              >
                SURVIVAL
              </button>
            </div>
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
