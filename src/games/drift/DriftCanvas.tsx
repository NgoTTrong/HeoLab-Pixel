"use client";

import { useRef, useEffect, useCallback } from "react";
import type { GameState, GameAction, Segment } from "./types";
import type { DriftAudio } from "./audio";
import {
  CARS,
  TRACKS,
  SEGMENT_LENGTH,
  VISIBLE_SEGMENTS,
  POWER_UPS,
  BASE_MAX_SPEED,
  SPEED_PER_RATING,
} from "./config";
import { projectSegments, drawSky, drawRoad, drawParallax } from "./road";
import { drawCar, drawSmoke, drawPowerUpBox } from "./sprites";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DriftCanvasProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  audio: DriftAudio | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCENERY_PATTERN: Record<string, "buildings" | "mountains" | "cacti" | "grid"> = {
  city: "buildings",
  mountain: "mountains",
  desert: "cacti",
  cyber: "grid",
};

function positionLabel(pos: number): string {
  switch (pos) {
    case 1: return "1ST";
    case 2: return "2ND";
    case 3: return "3RD";
    default: return `${pos}TH`;
  }
}

function formatTime(ms: number): string {
  const totalSec = ms / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  const frac = Math.floor((totalSec % 1) * 100);
  return `${min}:${sec.toString().padStart(2, "0")}.${frac.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DriftCanvas({ state, dispatch, audio }: DriftCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Previous-value refs for audio change detection
  const prevDriftActiveRef = useRef(false);
  const prevDriftLevelRef = useRef(0);
  const prevBoostActiveRef = useRef(false);
  const prevSpinOutRef = useRef(false);
  const prevLapRef = useRef(1);
  const prevStatusRef = useRef(state.status);
  const prevCountdownRef = useRef(state.countdown);
  const prevPowerUpRef = useRef(state.player.powerUp);

  // -----------------------------------------------------------------------
  // Canvas sizing
  // -----------------------------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      const cssW = Math.min(container.clientWidth, 800);
      const cssH = cssW * 9 / 16;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // -----------------------------------------------------------------------
  // Keyboard input
  // -----------------------------------------------------------------------

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          dispatch({ type: "STEER", direction: -1 });
          break;
        case "ArrowRight":
        case "d":
        case "D":
          dispatch({ type: "STEER", direction: 1 });
          break;
        case "ArrowUp":
        case "w":
        case "W":
          dispatch({ type: "ACCELERATE", pressed: true });
          break;
        case "ArrowDown":
        case "s":
        case "S":
          dispatch({ type: "BRAKE", pressed: true });
          break;
        case " ":
        case "Shift":
          dispatch({ type: "DRIFT_START" });
          break;
        case "e":
        case "E":
          dispatch({ type: "USE_POWERUP" });
          break;
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
        case "ArrowRight":
        case "d":
        case "D":
          dispatch({ type: "STEER", direction: 0 });
          break;
        case "ArrowUp":
        case "w":
        case "W":
          dispatch({ type: "ACCELERATE", pressed: false });
          break;
        case "ArrowDown":
        case "s":
        case "S":
          dispatch({ type: "BRAKE", pressed: false });
          break;
        case " ":
        case "Shift":
          dispatch({ type: "DRIFT_END" });
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [dispatch]);

  // -----------------------------------------------------------------------
  // Render helpers (drawn on canvas)
  // -----------------------------------------------------------------------

  const drawHUD = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, st: GameState) => {
      const fontSize = Math.max(10, Math.round(w * 0.018));
      ctx.font = `${fontSize}px "Press Start 2P", monospace`;
      ctx.textBaseline = "top";

      // ---- Top bar ----
      ctx.textAlign = "left";
      ctx.fillStyle = "#f97316";
      ctx.fillText(`LAP ${st.lap > st.totalLaps ? st.totalLaps : st.lap}/${st.totalLaps}`, w * 0.03, h * 0.04);

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffe600";
      ctx.fillText(positionLabel(st.position), w * 0.5, h * 0.04);

      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(formatTime(st.elapsedMs), w * 0.97, h * 0.04);

      // ---- Bottom left: Speed ----
      const car = CARS[st.carIndex];
      const maxSpeed = BASE_MAX_SPEED + (car.speed - 3) * SPEED_PER_RATING;
      const kmh = Math.round((st.player.speed / maxSpeed) * 300);
      ctx.textAlign = "left";
      ctx.fillStyle = "#39ff14";
      ctx.fillText(`${kmh} km/h`, w * 0.03, h * 0.9);

      // ---- Bottom center: Boost meter ----
      const meterW = w * 0.25;
      const meterH = h * 0.025;
      const meterX = w * 0.5 - meterW / 2;
      const meterY = h * 0.92;

      ctx.fillStyle = "#ffffff22";
      ctx.fillRect(meterX, meterY, meterW, meterH);

      let fill = 0;
      let meterColor = "#f97316";
      if (st.player.boost.active) {
        const maxBoost = 1500; // approximate max duration
        fill = st.player.boost.remainingMs / maxBoost;
        meterColor = "#ff2d95";
      } else if (st.player.drift.active) {
        fill = Math.min(1, st.player.drift.chargeMs / 4000);
        const colors = ["#f97316", "#ffe600", "#39ff14"];
        meterColor = colors[Math.min(st.player.drift.level, 2)];
      }
      fill = Math.max(0, Math.min(1, fill));
      ctx.fillStyle = meterColor;
      ctx.fillRect(meterX, meterY, meterW * fill, meterH);

      ctx.strokeStyle = "#ffffff44";
      ctx.lineWidth = 1;
      ctx.strokeRect(meterX, meterY, meterW, meterH);

      // ---- Bottom right: Power-up slot ----
      ctx.textAlign = "right";
      if (st.player.powerUp) {
        const puDef = POWER_UPS.find((p) => p.type === st.player.powerUp);
        if (puDef) {
          const emojiSize = Math.max(14, Math.round(w * 0.03));
          ctx.font = `${emojiSize}px serif`;
          ctx.fillText(puDef.emoji, w * 0.97, h * 0.88);
        }
      } else {
        ctx.font = `${fontSize}px "Press Start 2P", monospace`;
        ctx.fillStyle = "#ffffff33";
        ctx.fillText("[E]", w * 0.97, h * 0.9);
      }

      // ---- Countdown overlay ----
      if (st.status === "countdown") {
        const cdText = st.countdown > 0 ? `${st.countdown}` : "GO!";
        const cdSize = Math.round(w * 0.12);
        ctx.font = `${cdSize}px "Press Start 2P", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = st.countdown > 0 ? "#ffe600" : "#39ff14";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 20;
        ctx.fillText(cdText, w * 0.5, h * 0.4);
        ctx.shadowBlur = 0;
      }

      // ---- Finished overlay ----
      if (st.status === "finished") {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Semi-transparent backdrop
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, h * 0.25, w, h * 0.5);

        const titleSize = Math.round(w * 0.05);
        ctx.font = `${titleSize}px "Press Start 2P", monospace`;
        ctx.fillStyle = st.position === 1 ? "#ffe600" : "#ff2d95";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 15;
        ctx.fillText(
          st.position === 1 ? "YOU WIN!" : `${positionLabel(st.position)} PLACE`,
          w * 0.5,
          h * 0.38,
        );
        ctx.shadowBlur = 0;

        const infoSize = Math.round(w * 0.02);
        ctx.font = `${infoSize}px "Press Start 2P", monospace`;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`TIME: ${formatTime(st.elapsedMs)}`, w * 0.5, h * 0.5);
        ctx.fillText(`SCORE: ${Math.round(st.score)}`, w * 0.5, h * 0.58);
        ctx.fillText(`DRIFT BONUS: ${Math.round(st.driftScore)}`, w * 0.5, h * 0.64);
      }
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Audio change-detection
  // -----------------------------------------------------------------------

  const handleAudio = useCallback(
    (st: GameState, aud: DriftAudio | null) => {
      if (!aud) return;

      // Engine sound while racing
      if (st.status === "racing") {
        aud.playEngine(st.player.speed);
      }

      // Drift start
      if (st.player.drift.active && !prevDriftActiveRef.current) {
        aud.playDriftStart();
      }
      prevDriftActiveRef.current = st.player.drift.active;

      // Drift level change
      if (st.player.drift.level !== prevDriftLevelRef.current && st.player.drift.level > 0) {
        aud.playDriftLevel(st.player.drift.level);
      }
      prevDriftLevelRef.current = st.player.drift.level;

      // Boost release
      if (st.player.boost.active && !prevBoostActiveRef.current) {
        aud.playBoostRelease();
      }
      prevBoostActiveRef.current = st.player.boost.active;

      // Collision / spin out
      if (st.player.spinOut && !prevSpinOutRef.current) {
        aud.playCollision();
      }
      prevSpinOutRef.current = st.player.spinOut;

      // Power-up pickup (went from null to something)
      if (st.player.powerUp !== null && prevPowerUpRef.current === null) {
        aud.playPowerUp();
      }
      prevPowerUpRef.current = st.player.powerUp;

      // Lap completion
      if (st.lap > prevLapRef.current && st.status === "racing") {
        aud.playLapComplete();
      }
      prevLapRef.current = st.lap;

      // Countdown ticks
      if (st.status === "countdown" && st.countdown !== prevCountdownRef.current) {
        if (st.countdown > 0) {
          aud.playCountdown();
        } else {
          aud.playGo();
        }
      }
      prevCountdownRef.current = st.countdown;

      // Status transitions
      if (st.status !== prevStatusRef.current) {
        if (st.status === "finished") {
          if (st.position === 1) aud.playWin();
          else aud.playLose();
        }
      }
      prevStatusRef.current = st.status;
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Main render loop
  // -----------------------------------------------------------------------

  // Use a ref for state so the RAF callback always sees latest
  const stateRef = useRef(state);
  stateRef.current = state;

  const audioRef = useRef(audio);
  audioRef.current = audio;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    lastTimeRef.current = 0;

    function loop(timestamp: number) {
      const st = stateRef.current;
      const aud = audioRef.current;

      // Delta time
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const rawDt = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      const dt = Math.min(rawDt, 50); // cap at 50ms

      // Dispatch TICK only when racing
      if (st.status === "racing") {
        dispatch({ type: "TICK", dt });
      }

      // Audio change detection
      handleAudio(st, aud);

      // ---- Drawing ----
      const cvs = canvasRef.current!;
      const c = cvs.getContext("2d")!;
      const w = cvs.width;
      const h = cvs.height;

      c.clearRect(0, 0, w, h);

      const track = TRACKS[st.trackIndex];
      const palette = track.palette;

      // 1. Sky
      drawSky(c, w, h, palette);

      // 2. Parallax background
      const parallaxOffset = st.player.z * 0.001;
      const sceneryPattern = SCENERY_PATTERN[track.scenery] ?? "buildings";
      drawParallax(c, w, h * 0.5, h * 0.2, parallaxOffset, palette.sky2 + "88", sceneryPattern);

      // 3. Project segments
      const playerZWorld = st.player.z * SEGMENT_LENGTH;
      projectSegments(st.segments, playerZWorld, st.player.x, w, h);

      // 4. Draw road
      drawRoad(c, st.segments, playerZWorld, w, h, palette);

      // 5. Collect objects to draw sorted by distance (farthest first)
      const cameraSegIdx = Math.floor(playerZWorld / SEGMENT_LENGTH);
      const segCount = st.segments.length;

      // Power-up boxes
      for (const pu of st.powerUps) {
        if (pu.collected) continue;
        const relIdx = ((pu.segmentIndex - cameraSegIdx) % segCount + segCount) % segCount;
        if (relIdx <= 0 || relIdx >= VISIBLE_SEGMENTS) continue;
        const seg = st.segments[pu.segmentIndex % segCount];
        if (!seg.screen || seg.screen.scale <= 0) continue;
        const puDef = POWER_UPS.find((p) => p.type === pu.type);
        if (!puDef) continue;
        const sx = seg.screen.x + pu.lane * seg.screen.w;
        drawPowerUpBox(c, sx, seg.screen.y, seg.screen.scale, puDef.color, puDef.emoji);
      }

      // Oil slicks
      for (const oil of st.oilSlicks) {
        const relIdx = ((oil.segmentIndex - cameraSegIdx) % segCount + segCount) % segCount;
        if (relIdx <= 0 || relIdx >= VISIBLE_SEGMENTS) continue;
        const seg = st.segments[oil.segmentIndex % segCount];
        if (!seg.screen || seg.screen.scale <= 0) continue;
        const sx = seg.screen.x + oil.lane * seg.screen.w;
        const oilSize = Math.max(8 * seg.screen.scale, 2);
        c.fillStyle = "#1a1a2ecc";
        c.beginPath();
        c.ellipse(sx, seg.screen.y, oilSize * 1.5, oilSize * 0.5, 0, 0, Math.PI * 2);
        c.fill();
      }

      // AI cars (sort farthest first)
      const sortedAI = [...st.ai].sort((a, b) => {
        const aDist = ((a.z - st.player.z) % segCount + segCount) % segCount;
        const bDist = ((b.z - st.player.z) % segCount + segCount) % segCount;
        return bDist - aDist; // farthest first
      });

      for (const ai of sortedAI) {
        const aiSegIdx = Math.floor(ai.z) % segCount;
        const relIdx = ((aiSegIdx - cameraSegIdx) % segCount + segCount) % segCount;
        if (relIdx <= 0 || relIdx >= VISIBLE_SEGMENTS) continue;
        const seg = st.segments[aiSegIdx >= 0 ? aiSegIdx : aiSegIdx + segCount];
        if (!seg.screen || seg.screen.scale <= 0) continue;
        const sx = seg.screen.x + ai.x * seg.screen.w;
        const aiCar = CARS[ai.carIndex];
        drawCar(c, sx, seg.screen.y, seg.screen.scale, 0, aiCar, false);
      }

      // Player car (fixed position at ~80% down)
      const playerScreenX = w / 2;
      const playerScreenY = h * 0.8;
      const playerCar = CARS[st.carIndex];
      const playerScale = 1;
      const isDrifting = st.player.drift.active;

      drawCar(c, playerScreenX, playerScreenY, playerScale, st.player.spriteAngle, playerCar, isDrifting);

      // Drift smoke behind player
      if (isDrifting) {
        const smokeIntensity = Math.min(1, st.player.drift.chargeMs / 3000);
        drawSmoke(c, playerScreenX, playerScreenY + 10, playerScale, smokeIntensity);
      }

      // Shield visual indicator
      if (st.player.shieldMs > 0) {
        c.strokeStyle = "#3b82f6aa";
        c.lineWidth = 3;
        c.beginPath();
        c.arc(playerScreenX, playerScreenY - 15, 30, 0, Math.PI * 2);
        c.stroke();
      }

      // Spin-out visual
      if (st.player.spinOut) {
        c.save();
        c.translate(playerScreenX, playerScreenY);
        c.rotate((st.player.spinOutMs / 100) * Math.PI * 0.3);
        c.translate(-playerScreenX, -playerScreenY);
        drawCar(c, playerScreenX, playerScreenY, playerScale, st.player.spriteAngle, playerCar, false);
        c.restore();
      }

      // 6. HUD
      drawHUD(c, w, h, st);

      // Schedule next frame
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dispatch, drawHUD, handleAudio]);

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      className="w-full flex justify-center"
      style={{ maxWidth: 800 }}
    >
      <canvas
        ref={canvasRef}
        className="block border-2 border-[#2a2a4a] rounded bg-black"
        tabIndex={0}
      />
    </div>
  );
}
