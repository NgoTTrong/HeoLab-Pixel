"use client";

import { useReducer, useEffect, useCallback, useState, useRef } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import { tetrisReducer, getAbsCells, ghostRow } from "@/games/tetris/logic";
import { BOARD_COLS, BOARD_ROWS, RANDOM_EVENTS, getSpeed } from "@/games/tetris/config";
import { TETROMINOES, type TetrominoType } from "@/games/tetris/tetrominoes";
import { getHighScore, setHighScore } from "@/lib/scores";
import { createTetrisAudio } from "@/games/tetris/audio";
import type { TetrisAudio } from "@/games/tetris/audio";
import MuteButton from "@/components/MuteButton";
import type { GameHelp } from "@/lib/gameHelp";

const HELP: GameHelp = {
  objective: "Clear horizontal lines by filling them completely with falling pieces. The game ends when pieces stack to the top of the board.",
  controls: [
    { key: "Left / Right", action: "Move piece sideways" },
    { key: "Up / Z", action: "Rotate piece" },
    { key: "Down", action: "Soft drop — faster fall" },
    { key: "Space", action: "Hard drop — instant place" },
  ],
  scoring: [
    { icon: "💥", name: "TETRIS", desc: "Clear 4 lines at once for a massive score bonus — the most efficient way to score." },
    { icon: "🔗", name: "COMBOS", desc: "Clearing lines on consecutive drops multiplies your score." },
  ],
  specials: [
    { icon: "👻", name: "GHOST PIECE", desc: "A faint outline shows exactly where the piece will land, helping you plan placements." },
    { icon: "⏩", name: "SPEED UP", desc: "Every 10 lines cleared increases the drop speed — how long can you last?" },
  ],
};

const GAME_KEY = "tetris";
const CELL_SIZE = 28; // px

function MiniPiece({ type }: { type: TetrominoType }) {
  const t = TETROMINOES[type];
  const cells = t.cells[0];
  const minC = Math.min(...cells.map(([c]) => c));
  const maxC = Math.max(...cells.map(([c]) => c));
  const minR = Math.min(...cells.map(([, r]) => r));
  const maxR = Math.max(...cells.map(([, r]) => r));
  const width = maxC - minC + 1;
  const height = maxR - minR + 1;
  const filled = new Set(cells.map(([c, r]) => `${c - minC},${r - minR}`));
  const S = 7;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${width}, ${S}px)`, gridTemplateRows: `repeat(${height}, ${S}px)`, gap: "1px" }}>
      {Array.from({ length: width * height }, (_, i) => {
        const c = i % width;
        const r = Math.floor(i / width);
        const on = filled.has(`${c},${r}`);
        return <div key={i} style={{ width: S, height: S, backgroundColor: on ? t.color : "transparent", boxShadow: on ? `0 0 3px ${t.color}` : "none" }} />;
      })}
    </div>
  );
}

export default function TetrisPage() {
  const [state, dispatch] = useReducer(tetrisReducer, undefined, () => {
    return {
      board: Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null)),
      active: { type: "I" as const, rotation: 0, col: 3, row: 0 },
      held: null,
      canHold: true,
      bag: [],
      nextPieces: [] as any[],
      score: 0,
      lines: 0,
      level: 1,
      status: "idle" as const,
      activeEvent: null,
      eventEndsAt: null,
      linesUntilEvent: 5,
      combo: 0,
      lastClearWasTetrisOrTSpin: false,
      tSpinType: "none" as const,
      overdriveActive: false,
      lastWasRotation: false,
      lastClearedRows: [],
    };
  });
  const [highScore, setHS] = useState(0);
  const [muted, setMuted] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("tetris-sound-muted") === "1"
  );
  const audioRef = useRef<TetrisAudio | null>(null);
  const prevLinesRef = useRef(0);
  const prevStatusRef = useRef<string>("idle");
  const prevActiveRowRef = useRef(0);

  useEffect(() => { setHS(getHighScore(GAME_KEY)); }, []);

  // Lazy-init audio on first interaction
  useEffect(() => {
    const init = () => {
      if (!audioRef.current) {
        audioRef.current = createTetrisAudio();
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
    localStorage.setItem("tetris-sound-muted", muted ? "1" : "0");
  }, [muted]);

  // Detect line clears
  useEffect(() => {
    const delta = state.lines - prevLinesRef.current;
    if (delta > 0) audioRef.current?.playClear(delta);
    prevLinesRef.current = state.lines;
  }, [state.lines]);

  // Detect game over
  useEffect(() => {
    if (state.status === "over" && prevStatusRef.current !== "over") audioRef.current?.playGameOver();
    prevStatusRef.current = state.status;
  }, [state.status]);

  // Detect piece land (new piece spawned when row drops back to top)
  useEffect(() => {
    const prevRow = prevActiveRowRef.current;
    prevActiveRowRef.current = state.active.row;
    if (state.status === "playing" && prevRow > 3 && state.active.row <= 1) {
      audioRef.current?.playLand();
    }
  }, [state.active.row, state.status]);

  useEffect(() => {
    if (state.status !== "playing") return;
    const ms = getSpeed(state.level);
    const id = setInterval(() => dispatch({ type: "TICK", now: Date.now() }), ms);
    return () => clearInterval(id);
  }, [state.status, state.level]);

  useEffect(() => {
    if (state.status === "over" && state.score > highScore) {
      setHighScore(GAME_KEY, state.score);
      setHS(state.score);
    }
  }, [state.status, state.score, highScore]);

  // Auto-clear event banner after 2s
  useEffect(() => {
    if (!state.activeEvent || state.eventEndsAt === null) return;
    const remaining = state.eventEndsAt - Date.now();
    if (remaining <= 0) { dispatch({ type: "CLEAR_EVENT" }); return; }
    const id = setTimeout(() => dispatch({ type: "CLEAR_EVENT" }), remaining);
    return () => clearTimeout(id);
  }, [state.activeEvent, state.eventEndsAt]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (state.status === "idle" && e.key === " ") { e.preventDefault(); dispatch({ type: "START" }); return; }
    if (state.status !== "playing") return;
    switch (e.key) {
      case "ArrowLeft":  e.preventDefault(); dispatch({ type: "MOVE_LEFT" });  audioRef.current?.playMove(); break;
      case "ArrowRight": e.preventDefault(); dispatch({ type: "MOVE_RIGHT" }); audioRef.current?.playMove(); break;
      case "ArrowDown":  e.preventDefault(); dispatch({ type: "MOVE_DOWN" }); break;
      case "ArrowUp":    e.preventDefault(); dispatch({ type: "ROTATE" });     audioRef.current?.playRotate(); break;
      case " ":          e.preventDefault(); dispatch({ type: "HARD_DROP" }); break;
      case "c": case "C": dispatch({ type: "HOLD" }); break;
    }
  }, [state.status]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Build active piece cell set
  const activeCells = new Set(
    getAbsCells(state.active).map(([c, r]) => `${c},${r}`)
  );
  const ghostR = state.status === "playing" ? ghostRow(state.board, state.active) : state.active.row;
  const ghostCells = new Set(
    getAbsCells({ ...state.active, row: ghostR }).map(([c, r]) => `${c},${r}`)
  );
  const activeColor = TETROMINOES[state.active.type].color;
  const eventDef = state.activeEvent ? RANDOM_EVENTS.find((e) => e.type === state.activeEvent) : null;

  return (
    <GameLayout title="BLOCK STORM" color="pink" score={state.score} highScore={highScore} onNewGame={() => dispatch({ type: "START" })} actions={<MuteButton muted={muted} onToggle={() => setMuted(m => !m)} color="pink" />} helpContent={HELP} gameKey="tetris">
      <div className="flex gap-4 items-start">
        {/* Hold */}
        <div className="flex flex-col gap-2 items-center">
          <span className="font-pixel text-[0.4rem] text-gray-500">HOLD</span>
          <div className="w-16 h-12 bg-dark-card border border-gray-800 flex items-center justify-center">
            {state.held && <MiniPiece type={state.held} />}
          </div>
          <span className="font-pixel text-[0.4rem] text-gray-600">LVL {state.level}</span>
          <span className="font-pixel text-[0.4rem] text-gray-600">LINES {state.lines}</span>
        </div>

        {/* Board */}
        <div
          className="relative border border-gray-800"
          style={{ width: CELL_SIZE * BOARD_COLS, height: CELL_SIZE * BOARD_ROWS }}
        >
          {/* Event banner */}
          {eventDef && (
            <div
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 text-center py-2 font-pixel text-[0.5rem] animate-[overlayIn_0.3s_ease-out]"
              style={{ backgroundColor: eventDef.color + "22", color: eventDef.color, border: `1px solid ${eventDef.color}66` }}
            >
              {eventDef.emoji} {eventDef.label}
            </div>
          )}

          {/* Cells */}
          {Array.from({ length: BOARD_ROWS * BOARD_COLS }, (_, idx) => {
            const c = idx % BOARD_COLS;
            const r = Math.floor(idx / BOARD_COLS);
            const key = `${c},${r}`;
            const boardColor = state.board[r][c];
            const isActive = activeCells.has(key);
            const isGhost = !isActive && ghostCells.has(key);
            const color = isActive ? activeColor : boardColor;

            return (
              <div
                key={key}
                style={{
                  position: "absolute",
                  left: c * CELL_SIZE,
                  top: r * CELL_SIZE,
                  width: CELL_SIZE - 1,
                  height: CELL_SIZE - 1,
                  backgroundColor: color ?? (isGhost ? activeColor + "30" : "#0a0a1a"),
                  border: isGhost ? `1px solid ${activeColor}40` : color ? "1px solid rgba(255,255,255,0.1)" : "1px solid #1a1a2e",
                  boxShadow: isActive ? `0 0 4px ${color}88` : "none",
                }}
              />
            );
          })}
        </div>

        {/* Next pieces */}
        <div className="flex flex-col gap-2 items-center">
          <span className="font-pixel text-[0.4rem] text-gray-500">NEXT</span>
          {state.nextPieces.map((type, i) => (
            <div key={i} className="w-16 h-10 bg-dark-card border border-gray-800 flex items-center justify-center">
              <MiniPiece type={type} />
            </div>
          ))}
          <div className="mt-2 text-[0.4rem] text-gray-600 font-pixel">
            <div>↑ ROTATE</div>
            <div>SPC DROP</div>
            <div>C HOLD</div>
          </div>
        </div>
      </div>

      {/* Idle overlay */}
      {state.status === "idle" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">🧱</div>
            <h2 className="text-sm neon-text-pink animate-[victoryGlow_1.5s_ease-in-out_infinite]">BLOCK STORM</h2>
            <p className="text-[0.5rem] text-gray-500">PRESS SPACE TO START</p>
            <PixelButton color="pink" onClick={() => dispatch({ type: "START" })}>PLAY</PixelButton>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {state.status === "over" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-[overlayIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-dark-bg/30 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">💥</div>
            <h2 className="text-lg sm:text-xl neon-text-pink animate-[defeatFlash_1s_ease-in-out_infinite]">CASTLE FELL!</h2>
            <p className="text-[0.6rem] text-neon-pink/70">SCORE: {state.score} · BEST: {highScore} · LVL {state.level}</p>
            <PixelButton color="pink" onClick={() => dispatch({ type: "START" })}>TRY AGAIN</PixelButton>
          </div>
        </div>
      )}
    </GameLayout>
  );
}
