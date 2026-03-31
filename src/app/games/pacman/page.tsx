"use client";

import { useReducer, useEffect, useCallback, useRef, useState, memo } from "react";
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
import { getClosestGhostDistance } from "@/games/pacman/fog";
import type {
  Direction,
  GameModifiers,
  CellType,
  PacmanState,
  Ghost,
  Position,
} from "@/games/pacman/types";
import type { GameHelp } from "@/lib/gameHelp";

const HELP: GameHelp = {
  objective: "Eat every dot in the maze to complete the level. Avoid ghosts — getting caught costs a life. Eat power pellets to turn the tables!",
  controls: [
    { key: "Arrow Keys", action: "Move Pixel Chomp" },
    { key: "W A S D", action: "Move (alternate)" },
    { key: "Swipe", action: "Move on mobile" },
  ],
  scoring: [
    { icon: "🔵", name: "DOTS", desc: "Each dot scores 10 points. Clear the whole maze to advance to the next level." },
    { icon: "🍒", name: "FRUIT BONUS", desc: "Fruit appears in the maze center periodically. Each level brings a different fruit worth more points." },
    { icon: "👻", name: "GHOST COMBO", desc: "Eating multiple ghosts in a single power session multiplies: 200 > 400 > 800 > 1600 points." },
  ],
  specials: [
    { icon: "⚡", name: "POWER PELLET", desc: "Eat a large flashing pellet to make all ghosts vulnerable and turn blue — chase and eat them for big points!" },
    { icon: "🌫", name: "FOG OF WAR", desc: "Optional setting that limits your visibility. Listen for audio cues — ghost proximity affects the soundtrack." },
    { icon: "⚙️", name: "SETTINGS", desc: "Adjust ghost speed, power duration, maze layout, and ghost count from the settings panel." },
  ],
};

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
          label="GAME MODE"
          options={[
            { label: "SURVIVAL", value: "survival" as const },
            { label: "CLASSIC", value: "classic" as const },
          ]}
          current={modifiers.gameMode}
          onChange={(v) => update("gameMode", v)}
        />

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
  evolutionTier,
  gameMode,
}: {
  ghost: Ghost;
  tick: number;
  cellSize: number;
  evolutionTier: "basic" | "aware" | "evolved";
  gameMode: "classic" | "survival";
}) {
  const { pos, mode, eatenReturning, color, frightenedTimer } = ghost;
  const size = cellSize * 0.85;
  const offset = (cellSize - size) / 2;

  // Evolution eye styling for survival mode
  const isSurvival = gameMode === "survival";
  const eyeGlow =
    isSurvival && evolutionTier === "evolved"
      ? "drop-shadow(0 0 5px #ff2d55)"
      : isSurvival && evolutionTier === "aware"
        ? "drop-shadow(0 0 3px #ff0)"
        : undefined;
  const pupilColor =
    isSurvival && evolutionTier === "evolved" ? "#ff2d55" : "#00f";

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
            <ellipse cx="14" cy="17" rx="4" ry="5" fill="#fff" style={eyeGlow ? { filter: eyeGlow } : undefined} />
            <ellipse cx="26" cy="17" rx="4" ry="5" fill="#fff" style={eyeGlow ? { filter: eyeGlow } : undefined} />
            <circle cx="15" cy="18" r="2.5" fill={pupilColor} />
            <circle cx="27" cy="18" r="2.5" fill={pupilColor} />
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
// Memoized maze grid — never re-renders unless maze array reference changes
// ---------------------------------------------------------------------------

const StaticMazeGrid = memo(function StaticMazeGrid({
  maze,
  cellSize,
}: {
  maze: CellType[][];
  cellSize: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${MAZE_COLS}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${MAZE_ROWS}, ${cellSize}px)`,
      }}
    >
      {maze.flatMap((row, ry) =>
        row.map((cell, cx) => (
          <MazeCell key={`${ry},${cx}`} cell={cell} cellSize={cellSize} />
        ))
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Canvas-based fog of war overlay
// ---------------------------------------------------------------------------

const FogCanvas = memo(function FogCanvas({
  pacmanX,
  pacmanY,
  visRadius,
  visited,
  cellSize,
  width,
  height,
}: {
  pacmanX: number;
  pacmanY: number;
  visRadius: number;
  visited: boolean[][];
  cellSize: number;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const FOG_FADE = 2; // matches FOG_FADE_RANGE from config
    const VISITED_ALPHA = 0.8; // 1 - visitedOpacity(0.2)

    for (let ry = 0; ry < visited.length; ry++) {
      const row = visited[ry];
      if (!row) continue;
      for (let cx = 0; cx < row.length; cx++) {
        const dx = cx - pacmanX;
        const dy = ry - pacmanY;
        const d = Math.sqrt(dx * dx + dy * dy);

        let fogAlpha: number;
        if (d <= visRadius) {
          fogAlpha = 0;
        } else if (d <= visRadius + FOG_FADE) {
          const t = (d - visRadius) / FOG_FADE;
          fogAlpha = t * VISITED_ALPHA;
        } else if (row[cx]) {
          fogAlpha = VISITED_ALPHA;
        } else {
          fogAlpha = 1.0;
        }

        if (fogAlpha > 0.02) {
          ctx.fillStyle = `rgba(0,0,0,${fogAlpha.toFixed(2)})`;
          ctx.fillRect(cx * cellSize, ry * cellSize, cellSize, cellSize);
        }
      }
    }
  }, [pacmanX, pacmanY, visRadius, visited, cellSize, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 3,
      }}
    />
  );
});

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

  interface PopupEntry {
    id: number;
    text: string;
    color: string;
    x: number;
    y: number;
  }
  const [popups, setPopups] = useState<PopupEntry[]>([]);
  const popupIdRef = useRef(0);
  const prevFruitActiveRef = useRef(false);
  const [evolutionAlert, setEvolutionAlert] = useState<"aware" | "evolved" | null>(null);
  const prevEvolutionTierRef = useRef<"basic" | "aware" | "evolved">("basic");
  const evolutionAlertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  interface BannerEntry {
    text: string;
    color: string;
    duration: number;
  }
  const [activeBanner, setActiveBanner] = useState<BannerEntry | null>(null);
  const [mazeFlashing, setMazeFlashing] = useState(false);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mazeFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMilestoneRef = useRef<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const audioRef = useRef<PacmanAudio | null>(null);
  const prevScoreRef = useRef(0);
  const prevStatusRef = useRef<string>("idle");
  const prevFrightenedRef = useRef(0);
  const prevGhostCountRef = useRef(0);
  const lastProximityRef = useRef(0);
  const prevComboRef = useRef(0);
  const ghostTrailRef = useRef<Record<string, Position[]>>({});

  const spawnPopup = useCallback((text: string, color: string) => {
    const id = ++popupIdRef.current;
    const offsetX = (Math.random() - 0.5) * 20;
    const x = state.pacman.x * cellSize + cellSize / 2 + offsetX;
    const y = state.pacman.y * cellSize;
    setPopups(prev => [...prev, { id, text, color, x, y }]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id));
    }, 800);
  }, [state.pacman, cellSize]);

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

  // Audio + popup: eat ghost
  useEffect(() => {
    const eatenCount = state.ghosts.filter((g) => g.eatenReturning).length;
    if (eatenCount > prevGhostCountRef.current) {
      audioRef.current?.playEatGhost();
      const comboIdx = Math.min(state.ghostCombo - 1, 3);
      const values = [200, 400, 800, 1600];
      const colors = ["#ffffff", "#ffe600", "#f97316", "#ff2d55"];
      spawnPopup(`+${values[Math.max(0, comboIdx)]}`, colors[Math.max(0, comboIdx)]);
    }
    prevGhostCountRef.current = eatenCount;
  }, [state.ghosts, state.ghostCombo, spawnPopup]);

  // Popup: fruit eaten (fruitActive goes from true → false while playing)
  useEffect(() => {
    if (prevFruitActiveRef.current && !state.fruitActive && state.status === "playing") {
      const fruitIndex = Math.min(state.level - 1, 4);
      const values = [100, 300, 500, 700, 1000];
      spawnPopup(`+${values[fruitIndex]}`, "#ffe600");
    }
    prevFruitActiveRef.current = state.fruitActive;
  }, [state.fruitActive, state.status, state.level, spawnPopup]);

  // Ghost evolution announcement
  useEffect(() => {
    if (state.modifiers.gameMode !== "survival") return;
    const prev = prevEvolutionTierRef.current;
    const curr = state.evolutionTier;
    if (prev !== curr && (curr === "aware" || curr === "evolved")) {
      prevEvolutionTierRef.current = curr;
      setEvolutionAlert(curr);
      if (evolutionAlertTimerRef.current) clearTimeout(evolutionAlertTimerRef.current);
      evolutionAlertTimerRef.current = setTimeout(() => setEvolutionAlert(null), 2500);
    } else {
      prevEvolutionTierRef.current = curr;
    }
  }, [state.evolutionTier, state.modifiers.gameMode]);

  // Combo milestone sweep banner
  useEffect(() => {
    if (state.modifiers.gameMode !== "survival") return;
    if (!state.milestonePopup || state.milestonePopup === prevMilestoneRef.current) return;
    if (state.milestonePopupTimer <= 0) return;

    prevMilestoneRef.current = state.milestonePopup;

    const bannerMap: Record<string, BannerEntry> = {
      "BLAZING!":     { text: "BLAZING!",     color: "#ffe600", duration: 1500 },
      "UNSTOPPABLE!": { text: "UNSTOPPABLE!", color: "#f97316", duration: 1500 },
      "LEGENDARY!":   { text: "LEGENDARY!",   color: "#ff2d55", duration: 2000 },
    };

    const banner = bannerMap[state.milestonePopup];
    if (!banner) return;

    setActiveBanner(banner);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setActiveBanner(null), banner.duration);

    if (state.milestonePopup === "LEGENDARY!") {
      setMazeFlashing(true);
      if (mazeFlashTimerRef.current) clearTimeout(mazeFlashTimerRef.current);
      mazeFlashTimerRef.current = setTimeout(() => setMazeFlashing(false), 350);
    }
  }, [state.milestonePopup, state.milestonePopupTimer, state.modifiers.gameMode]);

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

  // Track ghost position history for evolved trail effect
  useEffect(() => {
    if (state.modifiers.gameMode !== "survival" || state.evolutionTier !== "evolved") {
      ghostTrailRef.current = {};
      return;
    }

    const trails = { ...ghostTrailRef.current };
    for (const ghost of state.ghosts) {
      const key = ghost.name;
      const prev = trails[key] || [];
      trails[key] = [ghost.pos, ...prev].slice(0, 3);
    }
    ghostTrailRef.current = trails;
  }, [state.tick]); // eslint-disable-line react-hooks/exhaustive-deps

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
      onNewGame={() => {
        prevMilestoneRef.current = null;
        prevEvolutionTierRef.current = "basic";
        dispatch({ type: "START", modifiers });
      }}
      helpContent={HELP}
      gameKey="pacman"
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
          {state.modifiers.gameMode === "survival" && state.evolutionTier !== "basic" && (
            <span className={`text-[0.45rem] ${
              state.evolutionTier === "evolved" ? "text-red-400" : "text-yellow-400"
            }`}>
              {state.evolutionTier === "aware" ? "AWARE" : "EVOLVED"}
            </span>
          )}
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

      {/* Game content wrapper — must be a single child for GameLayout's flex centering */}
      <div className="flex flex-col items-center gap-2">
      {/* Combo progress bar — always rendered to reserve space, invisible when inactive */}
      <div
        className="flex justify-center"
        style={{ visibility: state.modifiers.gameMode === "survival" && state.combo > 0 ? "visible" : "hidden" }}
      >
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

      {/* Maze board */}
      <div
        className={`relative select-none ${
          state.status === "dead" || evolutionAlert === "evolved"
            ? "animate-[screenShake_0.5s_ease-in-out]"
            : ""
        } ${mazeFlashing ? "maze-flash" : ""}`}
        style={{
          width: boardWidth,
          height: boardHeight,
          backgroundColor: "#000",
          border: "1px solid #1a1aff20",
          position: "relative",
          touchAction: "none",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Maze grid — memoized, no fog computation */}
        <StaticMazeGrid maze={state.maze} cellSize={cellSize} />

        {/* Fog of war overlay (canvas, survival mode only) */}
        {state.modifiers.gameMode === "survival" && (
          <FogCanvas
            pacmanX={state.pacman.x}
            pacmanY={state.pacman.y}
            visRadius={state.visRadius}
            visited={state.visited}
            cellSize={cellSize}
            width={boardWidth}
            height={boardHeight}
          />
        )}

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

        {/* Ghost trails (evolved survival mode) */}
        {state.modifiers.gameMode === "survival" && state.evolutionTier === "evolved" &&
          state.status !== "idle" &&
          state.ghosts.map((ghost) => {
            const dx = ghost.pos.x - state.pacman.x;
            const dy = ghost.pos.y - state.pacman.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > state.visRadius + 2) return null;
            return ghostTrailRef.current[ghost.name]?.map((trailPos, i) => (
              <div
                key={`trail-${ghost.name}-${i}`}
                style={{
                  position: "absolute",
                  left: trailPos.x * cellSize,
                  top: trailPos.y * cellSize,
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: ghost.color,
                  opacity: [0.25, 0.12, 0.05][i] ?? 0,
                  borderRadius: "40% 40% 0 0",
                  zIndex: 4,
                }}
              />
            ));
          })}

        {/* Ghost sprites */}
        {state.status !== "idle" &&
          state.ghosts.map((ghost) => {
            if (state.modifiers.gameMode === "survival") {
              const dx = ghost.pos.x - state.pacman.x;
              const dy = ghost.pos.y - state.pacman.y;
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d > state.visRadius + 2) return null;
            }
            return (
              <div key={ghost.name}>
                <GhostSprite
                  ghost={ghost}
                  tick={state.tick}
                  cellSize={cellSize}
                  evolutionTier={state.evolutionTier}
                  gameMode={state.modifiers.gameMode}
                />
              </div>
            );
          })}

        {/* Fruit */}
        {state.fruitActive && (
          <FruitSprite cellSize={cellSize} level={state.level} />
        )}

        {/* Floating score popups */}
        {popups.map(popup => (
          <div
            key={popup.id}
            className="pointer-events-none select-none"
            style={{
              position: "absolute",
              left: popup.x,
              top: popup.y,
              transform: "translateX(-50%)",
              color: popup.color,
              fontSize: cellSize * 0.7,
              fontFamily: "var(--font-pixel), monospace",
              textShadow: `0 0 6px ${popup.color}`,
              zIndex: 25,
              animation: "popupFloat 0.8s ease-out forwards",
              whiteSpace: "nowrap",
            }}
          >
            {popup.text}
          </div>
        ))}

        {/* Ghost evolution announcement */}
        {evolutionAlert && (
          <div
            className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
            style={evolutionAlert === "evolved"
              ? { animation: "evolvedFlicker 0.6s ease-out" }
              : { animation: "overlayIn 0.3s ease-out" }
            }
          >
            <div
              className="flex flex-col items-center gap-1 px-4 py-3 border"
              style={{
                borderColor: evolutionAlert === "evolved" ? "#ff2d55" : "#ffe600",
                backgroundColor: evolutionAlert === "evolved" ? "#1a000a" : "#1a1a00",
              }}
            >
              <span style={{ fontSize: cellSize * 1.2 }}>
                {evolutionAlert === "evolved" ? "☠️" : "🧠"}
              </span>
              <span
                className="text-[0.55rem] font-bold tracking-wider"
                style={{
                  color: evolutionAlert === "evolved" ? "#ff2d55" : "#ffe600",
                  textShadow: evolutionAlert === "evolved"
                    ? "0 0 10px #ff2d55"
                    : "0 0 10px #ffe600",
                  fontFamily: "var(--font-pixel), monospace",
                }}
              >
                {evolutionAlert === "evolved" ? "GHOSTS EVOLVED" : "GHOSTS ARE LEARNING"}
              </span>
              <span
                className="text-[0.38rem]"
                style={{
                  color: evolutionAlert === "evolved" ? "#ff2d5580" : "#ffe60080",
                  fontFamily: "var(--font-pixel), monospace",
                }}
              >
                {evolutionAlert === "evolved"
                  ? "They know exactly where you're going"
                  : "They're starting to predict your moves"}
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Combo milestone sweep banner */}
      {activeBanner && (
        <div
          className="pointer-events-none overflow-hidden"
          style={{ width: boardWidth, height: cellSize * 2 }}
        >
          <div
            className="flex items-center justify-center h-full"
            style={{
              animation: `bannerSweep ${activeBanner.duration}ms ease-in-out forwards`,
              color: activeBanner.color,
              textShadow: `0 0 12px ${activeBanner.color}, 0 0 24px ${activeBanner.color}`,
              fontFamily: "var(--font-pixel), monospace",
              fontSize: cellSize * 0.9,
              letterSpacing: "0.1em",
              borderTop: `1px solid ${activeBanner.color}40`,
              borderBottom: `1px solid ${activeBanner.color}40`,
              backgroundColor: `${activeBanner.color}08`,
            }}
          >
            {activeBanner.text}
          </div>
        </div>
      )}

      {/* Idle overlay */}
      {state.status === "idle" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">
              👻
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

            {/* Mode buttons — Survival is primary */}
            <div className="flex flex-col items-center gap-2 w-full">
              <button
                onClick={() => setModifiers(m => ({ ...m, gameMode: "survival" }))}
                className="relative px-4 py-2 border text-[0.5rem] uppercase tracking-wider transition-all w-40"
                style={{
                  borderColor: modifiers.gameMode === "survival" ? "#f97316" : "#444",
                  backgroundColor: modifiers.gameMode === "survival" ? "#f9731615" : "transparent",
                  color: modifiers.gameMode === "survival" ? "#f97316" : "#666",
                  fontFamily: "var(--font-pixel), monospace",
                }}
              >
                SURVIVAL
                {modifiers.gameMode === "survival" && (
                  <span
                    className="absolute -top-2 left-1/2 -translate-x-1/2 text-[0.35rem] px-1.5 py-0.5"
                    style={{ backgroundColor: "#f97316", color: "#000" }}
                  >
                    REC
                  </span>
                )}
              </button>
              <button
                onClick={() => setModifiers(m => ({ ...m, gameMode: "classic" }))}
                className="px-4 py-1.5 border text-[0.45rem] uppercase tracking-wider transition-all w-40"
                style={{
                  borderColor: modifiers.gameMode === "classic" ? "#888" : "#333",
                  backgroundColor: "transparent",
                  color: modifiers.gameMode === "classic" ? "#aaa" : "#444",
                  fontFamily: "var(--font-pixel), monospace",
                }}
              >
                CLASSIC
              </button>
            </div>

            {/* Feature badges — only shown for survival */}
            {modifiers.gameMode === "survival" && (
              <div className="flex gap-3 text-[0.4rem] text-gray-500">
                <span>🌫 FOG</span>
                <span>🧠 GHOST AI</span>
                <span>⚡ COMBO</span>
              </div>
            )}

            <PixelButton color="orange" onClick={() => {
              prevMilestoneRef.current = null;
              prevEvolutionTierRef.current = "basic";
              dispatch({ type: "START", modifiers });
            }}>
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
              👻
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
            <PixelButton color="pink" onClick={() => {
              prevMilestoneRef.current = null;
              prevEvolutionTierRef.current = "basic";
              dispatch({ type: "START", modifiers });
            }}>
              TRY AGAIN
            </PixelButton>
          </div>
        </div>
      )}

      {/* Mobile hint */}
      {isTouchDevice() && state.status === "playing" && (
        <p className="text-[0.4rem] text-gray-600 mt-2">SWIPE TO TURN</p>
      )}
      </div>
    </GameLayout>
  );
}
