"use client";

import { useReducer, useEffect, useCallback, useState, useRef } from "react";
import GameLayout from "@/components/GameLayout";
import PixelButton from "@/components/PixelButton";
import { tetrisReducer, getAbsCells, ghostRow } from "@/games/tetris/logic";
import { BOARD_COLS, BOARD_ROWS, RANDOM_EVENTS, getSpeed, getZenSpeed, OVERDRIVE_SPEED_MULT } from "@/games/tetris/config";
import type { GameMode } from "@/games/tetris/config";
import { TETROMINOES, type TetrominoType } from "@/games/tetris/tetrominoes";
import { getHighScore, setHighScore } from "@/lib/scores";
import { createTetrisAudio } from "@/games/tetris/audio";
import type { TetrisAudio } from "@/games/tetris/audio";
import MuteButton from "@/components/MuteButton";
import type { GameHelp } from "@/lib/gameHelp";

const HELP: GameHelp = {
  objective: "Clear horizontal lines by filling them completely with falling pieces. Survive chaos events and reach the highest score before pieces stack to the top.",
  controls: [
    { key: "Left / Right", action: "Move piece sideways" },
    { key: "Up / Z",       action: "Rotate piece" },
    { key: "Down",         action: "Soft drop — faster fall" },
    { key: "Space",        action: "Hard drop — instant place" },
    { key: "C",            action: "Hold piece" },
  ],
  scoring: [
    { icon: "💥", name: "TETRIS",       desc: "Clear 4 lines at once for 800 pts — the most efficient scoring move." },
    { icon: "🔗", name: "COMBO",        desc: "Clear lines on consecutive drops to earn bonus points (50→100→200→400+)." },
    { icon: "⤴️", name: "BACK TO BACK", desc: "Two Tetris or T-Spin clears in a row gives 1.5× score on the second." },
    { icon: "🌀", name: "T-SPIN",       desc: "Lock a T-piece via rotation with 3+ corners occupied for big bonus points." },
  ],
  specials: [
    { icon: "⚡", name: "LIGHTNING",   desc: "Clears one random filled row — a free gift from the storm." },
    { icon: "❄️", name: "ICE FREEZE",  desc: "Pauses auto-drop for 3 seconds — use the time wisely." },
    { icon: "🔥", name: "FEVER",       desc: "2× score multiplier for 30 seconds." },
    { icon: "💣", name: "BOMB BLAST",  desc: "Adds 2 garbage rows from the bottom. Deal with it." },
    { icon: "🌪️", name: "WHIRLWIND",   desc: "Scrambles all locked cells sideways. Chaos." },
    { icon: "⭐", name: "OVERDRIVE",   desc: "Pieces fall 2× faster — but score 3× for 15 seconds." },
    { icon: "💀", name: "CURSE",       desc: "Adds 3 garbage rows from the bottom. Much worse than a bomb." },
    { icon: "👻", name: "GHOST PIECE", desc: "Faint outline shows where the piece will land." },
    { icon: "⏩", name: "SPEED UP",    desc: "Every 10 lines increases fall speed. At level 15 the board starts glitching." },
  ],
};

interface Particle {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  life: number;  // 1.0 → 0.0
  size: number;
}

interface Popup {
  id: number;
  text: string;
  color: string;
  y: number;
  type: "score" | "combo" | "special";
}

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
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [state, dispatch] = useReducer(tetrisReducer, undefined, () => {
    return {
      board: Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null)),
      active: { type: "I" as const, rotation: 0, col: 3, row: 0 },
      held: null,
      canHold: true,
      bag: [],
      nextPieces: [] as TetrominoType[],
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
      mode: "storm" as const,
      streak: 0,
    };
  });
  const [highScore, setHS] = useState(0);
  const [muted, setMuted] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("tetris-sound-muted") === "1"
  );
  const [shakeAnim, setShakeAnim] = useState("");
  const [flashRows, setFlashRows] = useState<number[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [eventFlash, setEventFlash] = useState<string | null>(null);
  const [popups, setPopups] = useState<Popup[]>([]);
  const popupIdRef = useRef(0);
  const prevScoreRef = useRef(0);
  const audioRef = useRef<TetrisAudio | null>(null);
  const prevLinesRef = useRef(0);
  const prevStatusRef = useRef<string>("idle");
  const prevActiveRowRef = useRef(0);
  const particleIdRef  = useRef(0);
  const particleRafRef = useRef<number | null>(null);
  const prevEventRef = useRef<string | null>(null);
  const prevB2BRef = useRef(false);
  const [slowMo, setSlowMo] = useState(false);

  const gameKey = state.mode === "classic" ? "tetris-classic"
    : state.mode === "zen" ? "tetris-zen"
    : "tetris";

  const triggerShake = useCallback((intensity: "light" | "medium" | "heavy") => {
    const cls = {
      light:  "animate-[screenShake_0.2s_ease-out]",
      medium: "animate-[screenShake_0.3s_ease-out]",
      heavy:  "animate-[screenShake_0.5s_ease-out]",
    }[intensity];
    setShakeAnim("");
    requestAnimationFrame(() => requestAnimationFrame(() => setShakeAnim(cls)));
  }, []);

  const addPopup = useCallback((text: string, color: string, y: number, type: Popup["type"] = "score") => {
    const id = ++popupIdRef.current;
    setPopups(prev => [...prev, { id, text, color, y, type }]);
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== id)), 1200);
  }, []);

  const spawnParticles = useCallback((rows: number[]) => {
    if (rows.length === 0) return;
    const newParticles: Particle[] = [];
    const isTetris = rows.length >= 4;
    for (const r of rows) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const count = isTetris ? 5 : 3;
        for (let i = 0; i < count; i++) {
          const colors = ["#39ff14","#ff2d95","#ffe600","#00d4ff","#a855f7","#f97316"];
          newParticles.push({
            id: ++particleIdRef.current,
            x:  c * CELL_SIZE + CELL_SIZE / 2,
            y:  r * CELL_SIZE + CELL_SIZE / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.9) * 7,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 1.0,
            size: Math.random() * 4 + 2,
          });
        }
      }
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  useEffect(() => { setHS(getHighScore(gameKey)); }, [gameKey]);

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

  const hasParticles = particles.length > 0;
  useEffect(() => {
    if (!hasParticles) {
      if (particleRafRef.current !== null) {
        cancelAnimationFrame(particleRafRef.current);
        particleRafRef.current = null;
      }
      return;
    }
    const tick = () => {
      setParticles(prev => {
        const next = prev
          .map(p => ({
            ...p,
            x:    p.x + p.vx,
            y:    p.y + p.vy,
            vy:   p.vy + 0.3,
            life: p.life - 0.04,
          }))
          .filter(p => p.life > 0);
        return next;
      });
      particleRafRef.current = requestAnimationFrame(tick);
    };
    particleRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (particleRafRef.current !== null) {
        cancelAnimationFrame(particleRafRef.current);
        particleRafRef.current = null;
      }
    };
  }, [hasParticles]);

  // Detect line clears
  useEffect(() => {
    const delta = state.lines - prevLinesRef.current;
    if (delta > 0) {
      setFlashRows(state.lastClearedRows);
      setTimeout(() => setFlashRows([]), 150);
      spawnParticles(state.lastClearedRows);
      triggerShake(delta >= 4 ? "medium" : "light");
      audioRef.current?.playClear(delta);

      // Popups
      const topRow = state.lastClearedRows.length > 0
        ? Math.min(...state.lastClearedRows) * CELL_SIZE
        : 0;
      const scoreDelta = state.score - prevScoreRef.current;
      if (scoreDelta > 0) addPopup(`+${scoreDelta}`, "#ffe600", topRow, "score");
      if (state.combo >= 2) addPopup(`COMBO ×${state.combo}`, "#ff2d95", topRow + 20, "combo");
      if (state.tSpinType !== "none") {
        const label = state.tSpinType === "mini"
          ? "T-SPIN MINI!"
          : `T-SPIN ${["","SINGLE","DOUBLE","TRIPLE"][Math.min(delta,3)]}!`;
        addPopup(label, "#a855f7", topRow + 40, "special");
      }
      if (delta === 4) addPopup("TETRIS!", "#ffe600", topRow + 40, "special");
      if (prevB2BRef.current && (delta === 4 || state.tSpinType !== "none")) {
        addPopup("BACK TO BACK!", "#00d4ff", topRow + 60, "special");
      }
      if (state.mode === "zen" && delta >= 2) {
        setSlowMo(true);
        setTimeout(() => setSlowMo(false), 400);
      }
    }
    prevLinesRef.current = state.lines;
    prevScoreRef.current = state.score;
    prevB2BRef.current = state.lastClearWasTetrisOrTSpin;
  }, [state.lines, state.lastClearedRows, state.score, state.combo, state.tSpinType, state.lastClearWasTetrisOrTSpin, triggerShake, spawnParticles, addPopup]);

  // Detect game over
  useEffect(() => {
    if (state.status === "over" && prevStatusRef.current !== "over") {
      triggerShake("heavy");
      audioRef.current?.playGameOver();
    }
    prevStatusRef.current = state.status;
  }, [state.status, triggerShake]);

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
    const speedFn = state.mode === "zen" ? getZenSpeed : getSpeed;
    const baseMsVal = speedFn(state.level);
    const ms = Math.max(
      50,
      Math.floor((slowMo ? baseMsVal * 2 : baseMsVal) / (state.overdriveActive ? OVERDRIVE_SPEED_MULT : 1))
    );
    const id = setInterval(() => dispatch({ type: "TICK", now: Date.now() }), ms);
    return () => clearInterval(id);
  }, [state.status, state.level, state.overdriveActive, state.mode, slowMo]);

  useEffect(() => {
    if (state.status === "over" && state.score > highScore) {
      setHighScore(gameKey, state.score);
      setHS(state.score);
    }
  }, [state.status, state.score, highScore, gameKey]);

  // Auto-clear event banner after 2s
  useEffect(() => {
    if (!state.activeEvent || state.eventEndsAt === null) return;
    const remaining = state.eventEndsAt - Date.now();
    if (remaining <= 0) { dispatch({ type: "CLEAR_EVENT" }); return; }
    const id = setTimeout(() => dispatch({ type: "CLEAR_EVENT" }), remaining);
    return () => clearTimeout(id);
  }, [state.activeEvent, state.eventEndsAt]);

  useEffect(() => {
    const cur = state.activeEvent;
    if (cur && cur !== prevEventRef.current) {
      audioRef.current?.playEvent(cur);
      if (cur === "lightning")  setEventFlash("yellow");
      else if (cur === "bomb")  setEventFlash("red");
      else if (cur === "whirlwind") setEventFlash("purple");
      else if (cur === "curse") setEventFlash("green");
      setTimeout(() => setEventFlash(null), 180);
    }
    prevEventRef.current = cur;
  }, [state.activeEvent]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (state.status === "idle" && e.key === " ") {
      e.preventDefault();
      if (selectedMode) dispatch({ type: "START", mode: selectedMode });
      return;
    }
    if (state.status !== "playing") return;
    switch (e.key) {
      case "ArrowLeft":  e.preventDefault(); dispatch({ type: "MOVE_LEFT" });  audioRef.current?.playMove(); break;
      case "ArrowRight": e.preventDefault(); dispatch({ type: "MOVE_RIGHT" }); audioRef.current?.playMove(); break;
      case "ArrowDown":  e.preventDefault(); dispatch({ type: "MOVE_DOWN" }); break;
      case "ArrowUp":
      case "z":
      case "Z":
        e.preventDefault(); dispatch({ type: "ROTATE" });     audioRef.current?.playRotate(); break;
      case " ":          e.preventDefault(); dispatch({ type: "HARD_DROP" }); triggerShake("light"); break;
      case "c": case "C": dispatch({ type: "HOLD" }); break;
    }
  }, [state.status, triggerShake, selectedMode]);

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
  const zenColors = ["#39ff14","#00d4ff","#a855f7","#ff2d95","#ffe600","#f97316","#39ff14"];
  const activeColor =
    state.mode === "zen" && state.combo >= 1
      ? zenColors[state.combo % zenColors.length]
      : TETROMINOES[state.active.type].color;
  const eventDef = state.activeEvent ? RANDOM_EVENTS.find((e) => e.type === state.activeEvent) : null;

  return (
    <GameLayout title="BLOCK STORM" color="pink" score={state.score} highScore={highScore} onNewGame={() => { setSelectedMode(null); dispatch({ type: "RESET" }); }} actions={<MuteButton muted={muted} onToggle={() => setMuted(m => !m)} color="pink" />} helpContent={HELP} gameKey="tetris">
      <div className="flex gap-4 items-start">
        {/* Hold */}
        <div className="flex flex-col gap-2 items-center">
          <span className="font-pixel text-[0.4rem] text-gray-500">HOLD</span>
          <div className="w-16 h-12 bg-dark-card border border-gray-800 flex items-center justify-center">
            {state.held && <MiniPiece type={state.held} />}
          </div>
          <span className="font-pixel text-[0.4rem] text-gray-600">LVL {state.level}</span>
          <span className="font-pixel text-[0.4rem] text-gray-600">LINES {state.lines}</span>
          {state.mode === "classic" && (
            <span className="font-pixel text-[0.4rem] text-neon-blue/80">
              STREAK {state.streak}
            </span>
          )}
        </div>

        {/* Board */}
        <div className="relative">
        <div
          className={`relative border transition-colors duration-1000 ${shakeAnim} ${
            state.level >= 20 ? "border-yellow-300/80" :
            state.level >= 15 ? "border-pink-500/60"   :
            state.level >= 10 ? "border-purple-500/40" :
            "border-gray-800"
          }`}
          style={{
            width:  CELL_SIZE * BOARD_COLS,
            height: CELL_SIZE * BOARD_ROWS,
            animation: state.level >= 15 && state.status === "playing"
              ? "borderGlitch 4s ease-in-out infinite" : undefined,
          }}
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

          {/* Line clear flash */}
          {flashRows.map((r) => (
            <div
              key={r}
              className="absolute inset-x-0 pointer-events-none z-10"
              style={{
                top: r * CELL_SIZE,
                height: CELL_SIZE,
                background: "rgba(255,255,255,0.85)",
                animation: "overlayIn 0.15s ease-out forwards",
              }}
            />
          ))}

          {/* Particles */}
          {particles.map(p => (
            <div
              key={p.id}
              className="pointer-events-none absolute"
              style={{
                left:            p.x - p.size / 2,
                top:             p.y - p.size / 2,
                width:           p.size,
                height:          p.size,
                backgroundColor: p.color,
                opacity:         p.life,
                boxShadow:       `0 0 ${p.size * 2}px ${p.color}`,
                borderRadius:    "1px",
                zIndex:          15,
              }}
            />
          ))}

          {/* Event visual overlays */}
          {state.activeEvent === "fever" && (
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
              <div className="absolute inset-0"
                style={{ background: "radial-gradient(ellipse at bottom, rgba(249,115,22,0.35) 0%, transparent 70%)" }} />
              <div className="absolute inset-0 border-2 border-orange-500/60"
                style={{ animation: "pulseRing 1s ease-out infinite" }} />
            </div>
          )}

          {state.activeEvent === "freeze" && (
            <div className="absolute inset-0 pointer-events-none z-20">
              <div className="absolute inset-0"
                style={{ background: "rgba(0,212,255,0.08)", border: "2px solid rgba(0,212,255,0.3)" }} />
              <div className="absolute inset-0"
                style={{ background: "radial-gradient(ellipse at top, rgba(0,212,255,0.15) 0%, transparent 60%)" }} />
            </div>
          )}

          {state.activeEvent === "overdrive" && (
            <div className="absolute inset-0 pointer-events-none z-20">
              <div className="absolute inset-0 border-2 border-yellow-300/70"
                style={{ animation: "pulseRing 0.6s ease-out infinite" }} />
              <div className="absolute inset-0"
                style={{ background: "radial-gradient(ellipse at center, rgba(255,230,0,0.06) 0%, transparent 70%)" }} />
            </div>
          )}

          {state.activeEvent === "curse" && (
            <div className="absolute inset-0 pointer-events-none z-20">
              <div className="absolute inset-x-0 bottom-0 h-1/3"
                style={{ background: "linear-gradient(to top, rgba(57,255,20,0.2), transparent)" }} />
              <div className="absolute inset-0 border border-neon-green/30" />
            </div>
          )}

          {/* One-shot flash on event trigger */}
          {eventFlash && (
            <div
              className="absolute inset-0 pointer-events-none z-30"
              style={{
                backgroundColor:
                  eventFlash === "yellow" ? "rgba(255,230,0,0.35)" :
                  eventFlash === "red"    ? "rgba(255,45,149,0.35)" :
                  eventFlash === "purple" ? "rgba(168,85,247,0.35)" :
                  "rgba(57,255,20,0.25)",
                animation: "overlayIn 0.18s ease-out forwards",
              }}
            />
          )}

          {/* Score / combo / special popups */}
          {popups.map(p => (
            <div
              key={p.id}
              className="absolute pointer-events-none font-pixel"
              style={{
                left:       "50%",
                top:        p.y,
                transform:  "translateX(-50%)",
                color:      p.color,
                fontSize:   p.type === "special" ? "0.55rem" : "0.5rem",
                textShadow: `0 0 8px ${p.color}`,
                animation:  "floatUp 1.2s ease-out forwards",
                whiteSpace: "nowrap",
                zIndex:     25,
              }}
            >{p.text}</div>
          ))}

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

        {/* Storm intensity: edge decorations level 10+ */}
        {state.level >= 10 && state.status === "playing" && (
          <div
            className="absolute pointer-events-none overflow-hidden"
            style={{
              left: 0,
              top: 0,
              width:  CELL_SIZE * BOARD_COLS,
              height: CELL_SIZE * BOARD_ROWS,
              zIndex: -1,
            }}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-0.5"
              style={{
                background: `linear-gradient(to bottom, transparent, ${
                  state.level >= 20 ? "#ffe600" : state.level >= 15 ? "#ff2d95" : "#a855f7"
                }88, transparent)`,
                animation: "scanlineSwipe 3s linear infinite",
              }}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-0.5"
              style={{
                background: `linear-gradient(to bottom, transparent, ${
                  state.level >= 20 ? "#ffe600" : state.level >= 15 ? "#ff2d95" : "#a855f7"
                }88, transparent)`,
                animation: "scanlineSwipe 3s linear 1.5s infinite",
              }}
            />
          </div>
        )}
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
          <div className="relative flex flex-col items-center gap-5 pointer-events-auto">
            <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">🧱</div>
            <h2 className="text-sm neon-text-pink animate-[victoryGlow_1.5s_ease-in-out_infinite]">BLOCK STORM</h2>

            {!selectedMode ? (
              <>
                <p className="text-[0.45rem] text-gray-400 font-pixel">SELECT MODE</p>
                <div className="flex gap-3">
                  {(
                    [
                      { mode: "classic" as const, label: "CLASSIC", emoji: "🕹️", desc: ["Clean Tetris", "Combo + T-Spin"], color: "#00d4ff" },
                      { mode: "zen"     as const, label: "ZEN",     emoji: "😌", desc: ["Chill vibes",  "Easy combos"],    color: "#39ff14" },
                      { mode: "storm"   as const, label: "STORM",   emoji: "⚡", desc: ["Chaos events", "Lightning/Bombs"], color: "#ff2d95" },
                    ]
                  ).map(({ mode, label, emoji, desc, color }) => (
                    <button
                      key={mode}
                      onClick={() => setSelectedMode(mode)}
                      className="flex flex-col items-center gap-1 px-3 py-2 border font-pixel transition-all hover:scale-105"
                      style={{
                        borderColor: color + "66",
                        backgroundColor: color + "11",
                        color,
                        minWidth: "72px",
                      }}
                    >
                      <span className="text-xl">{emoji}</span>
                      <span className="text-[0.45rem]">{label}</span>
                      {desc.map((line, i) => (
                        <span key={i} className="text-[0.35rem] opacity-60">{line}</span>
                      ))}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p
                  className="text-[0.45rem] font-pixel"
                  style={{
                    color:
                      selectedMode === "classic" ? "#00d4ff" :
                      selectedMode === "zen"     ? "#39ff14" :
                      "#ff2d95",
                  }}
                >
                  {selectedMode === "classic" ? "CLASSIC MODE" :
                   selectedMode === "zen"     ? "ZEN MODE"     :
                   "STORM MODE"}
                </p>
                <p className="text-[0.4rem] text-gray-500 font-pixel">PRESS SPACE TO START</p>
                <PixelButton
                  color={selectedMode === "classic" ? "blue" : selectedMode === "zen" ? "green" : "pink"}
                  onClick={() => dispatch({ type: "START", mode: selectedMode })}
                >PLAY</PixelButton>
                <button
                  onClick={() => setSelectedMode(null)}
                  className="text-[0.35rem] text-gray-600 font-pixel hover:text-gray-400 underline"
                >CHANGE MODE</button>
              </>
            )}
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
            <PixelButton color="pink" onClick={() => dispatch({ type: "START", mode: selectedMode ?? "storm" })}>TRY AGAIN</PixelButton>
          </div>
        </div>
      )}
    </GameLayout>
  );
}
