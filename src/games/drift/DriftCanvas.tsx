"use client";

import { useRef, useEffect, useCallback, useState } from "react";
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
  DRIFT_BOOST_DURATIONS,
} from "./config";
import { projectSegments, drawSky, drawRoad, drawParallax, drawScenery } from "./road";
import { drawCar, drawPowerUpBox } from "./sprites";

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
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Ghost replay frame index (increments each tick in Time Attack)
  const ghostFrameRef = useRef(0);
  const prevRacingRef = useRef(false);

  // Previous-value refs for audio change detection
  const prevDriftActiveRef = useRef(false);
  const prevDriftLevelRef = useRef(0);
  const prevBoostActiveRef = useRef(false);
  const prevSpinOutRef = useRef(false);
  const prevLapRef = useRef(1);
  const prevStatusRef = useRef(state.status);
  const prevCountdownRef = useRef(state.countdown);
  const prevPowerUpRef = useRef(state.player.powerUp);

  // ---- Visual effect refs (never enter game state) ----
  type SkidMark   = { x: number; y: number; w: number; alpha: number };
  type SmokePart  = { x: number; y: number; vx: number; vy: number; size: number; maxSize: number; alpha: number; color: string };
  type SpeedLine  = { x1: number; y1: number; x2: number; y2: number };
  type BoostFlash = { alpha: number; color: string; text: string };
  type Notif      = { text: string; subText: string; subColor: string; slideY: number; alpha: number };
  type LvlNotif   = { text: string; alpha: number; color: string };

  const skidMarksRef    = useRef<SkidMark[]>([]);
  const smokePartsRef   = useRef<SmokePart[]>([]);
  const speedLinesRef   = useRef<SpeedLine[]>([]);
  const boostFlashRef   = useRef<BoostFlash | null>(null);
  const shakeRef        = useRef<{ mag: number; remaining: number } | null>(null);
  const lapNotifRef     = useRef<Notif | null>(null);
  const lvlNotifRef     = useRef<LvlNotif | null>(null);
  const puFlashRef      = useRef<{ alpha: number; color: string } | null>(null);
  const prevLapNotifRef = useRef(0);

  // State/audio refs — declared here so keyboard/touch handlers can access them
  const stateRef = useRef(state);
  stateRef.current = state;
  const audioRef = useRef(audio);
  audioRef.current = audio;

  // -----------------------------------------------------------------------
  // Touch device detection & auto-accelerate
  // -----------------------------------------------------------------------

  useEffect(() => {
    const touch = navigator.maxTouchPoints > 0;
    setIsTouchDevice(touch);
    if (touch) {
      dispatch({ type: "ACCELERATE", pressed: true });
    }
  }, [dispatch]);

  // -----------------------------------------------------------------------
  // Touch event handlers
  // -----------------------------------------------------------------------

  const onSteerLeft = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      dispatch({ type: "STEER", direction: -1 });
    },
    [dispatch],
  );

  const onSteerLeftEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      dispatch({ type: "STEER", direction: 0 });
    },
    [dispatch],
  );

  const onSteerRight = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      dispatch({ type: "STEER", direction: 1 });
    },
    [dispatch],
  );

  const onSteerRightEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      dispatch({ type: "STEER", direction: 0 });
    },
    [dispatch],
  );

  const onDriftStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      dispatch({ type: "DRIFT_START" });
      dispatch({ type: "ACCELERATE", pressed: true });
    },
    [dispatch],
  );

  const onDriftEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      dispatch({ type: "DRIFT_END" });
    },
    [dispatch],
  );

  const onUsePowerUp = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (stateRef.current.player.powerUp) {
        const puDef = POWER_UPS.find(p => p.type === stateRef.current.player.powerUp);
        if (puDef) puFlashRef.current = { alpha: 0.22, color: puDef.color };
      }
      dispatch({ type: "USE_POWERUP" });
    },
    [dispatch],
  );

  // -----------------------------------------------------------------------
  // Canvas sizing
  // -----------------------------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const c = canvas; // capture for closure
    const ct = container;
    function resize() {
      const cssW = Math.min(ct.clientWidth, 800);
      const cssH = Math.round(cssW * 9 / 16);
      const dpr = window.devicePixelRatio || 1;
      const newW = Math.round(cssW * dpr);
      const newH = Math.round(cssH * dpr);
      if (c.width !== newW || c.height !== newH) {
        c.style.width = `${cssW}px`;
        c.style.height = `${cssH}px`;
        c.width = newW;
        c.height = newH;
      }
    }

    // Size once on mount, then listen for window resize only
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
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
          if (stateRef.current.player.powerUp) {
            const puDef = POWER_UPS.find(p => p.type === stateRef.current.player.powerUp);
            if (puDef) puFlashRef.current = { alpha: 0.22, color: puDef.color };
          }
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
      const car       = CARS[st.carIndex];
      const maxSpeed  = BASE_MAX_SPEED + (car.speed - 3) * SPEED_PER_RATING;
      const speedFrac = Math.max(0, Math.min(1, st.player.speed / maxSpeed));
      const fs        = Math.max(9, Math.round(w * 0.017));

      ctx.font = `${fs}px "Press Start 2P", monospace`;
      ctx.textBaseline = "top";

      // Top bar
      ctx.textAlign = "left";
      ctx.fillStyle = "#f97316";
      ctx.fillText(`LAP ${Math.min(st.lap, st.totalLaps)}/${st.totalLaps}`, w * 0.03, h * 0.04);

      ctx.textAlign = "center";
      const posColors = ["#ffe600", "#cccccc", "#ff6666", "#ff6666"];
      ctx.fillStyle = posColors[Math.min(st.position - 1, 3)];
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.fillText(positionLabel(st.position), w * 0.5, h * 0.04);
      ctx.shadowBlur = 0;

      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(formatTime(st.elapsedMs), w * 0.97, h * 0.04);

      // Speedometer arc (bottom-left)
      const arcX = w * 0.10;
      const arcY = h * 0.91;
      const arcR = Math.min(w * 0.065, h * 0.085);
      const startA = Math.PI * 0.80;
      const sweepA = Math.PI * 1.40;
      const currA  = startA + sweepA * speedFrac;

      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = arcR * 0.22;
      ctx.beginPath();
      ctx.arc(arcX, arcY, arcR, startA, startA + sweepA);
      ctx.stroke();

      const arcColor = speedFrac < 0.5 ? "#39ff14" : speedFrac < 0.8 ? "#ffe600" : "#f97316";
      ctx.strokeStyle = arcColor;
      ctx.shadowColor = arcColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(arcX, arcY, arcR, startA, currA);
      ctx.stroke();
      ctx.shadowBlur = 0;

      const kmh = Math.round(speedFrac * 300);
      ctx.font = `${Math.max(7, Math.round(arcR * 0.44))}px "Press Start 2P", monospace`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${kmh}`, arcX, arcY);

      // Drift charge bar (bottom-center)
      const barW = w * 0.28;
      const barH = Math.max(h * 0.022, 6);
      const barX = w / 2 - barW / 2;
      const barY = h * 0.935;

      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(barX, barY, barW, barH);

      let fill = 0;
      let barColor = "#f97316";
      if (st.player.boost.active) {
        fill = st.player.boost.remainingMs / DRIFT_BOOST_DURATIONS[2];
        barColor = "#ff2d95";
      } else if (st.player.drift.active) {
        fill = Math.min(1, st.player.drift.chargeMs / 4000);
        barColor = st.player.drift.level >= 3 ? "#ff6600" : st.player.drift.level >= 2 ? "#ffe600" : "#ffffff";
      }
      fill = Math.max(0, Math.min(1, fill));
      if (fill > 0) {
        ctx.shadowColor = barColor;
        ctx.shadowBlur = 6;
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, barW * fill, barH);
        ctx.shadowBlur = 0;
      }
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1.5;
      for (const frac of [0.5, 0.75]) {
        ctx.beginPath();
        ctx.moveTo(barX + barW * frac, barY - 1);
        ctx.lineTo(barX + barW * frac, barY + barH + 1);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);

      ctx.font = `${Math.max(6, Math.round(w * 0.013))}px "Press Start 2P", monospace`;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("DRIFT", w / 2, barY - 2);

      // Power-up slot (bottom-right)
      if (st.player.powerUp) {
        const puDef = POWER_UPS.find(p => p.type === st.player.powerUp);
        if (puDef) {
          const pulse  = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
          const slotX  = w * 0.90;
          const slotY  = h * 0.91;
          const slotR  = Math.min(w * 0.04, h * 0.055);
          ctx.strokeStyle = puDef.color;
          ctx.lineWidth   = 2 + pulse * 2;
          ctx.shadowColor = puDef.color;
          ctx.shadowBlur  = 8 + pulse * 6;
          ctx.beginPath();
          ctx.arc(slotX, slotY, slotR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.font = `${Math.max(14, Math.round(slotR * 1.2))}px serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(puDef.emoji, slotX, slotY);
          ctx.font = `${Math.max(6, Math.round(w * 0.012))}px "Press Start 2P", monospace`;
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.textBaseline = "top";
          ctx.fillText("[E]", slotX, slotY + slotR + 2);
        }
      } else {
        ctx.font = `${Math.max(6, Math.round(w * 0.013))}px "Press Start 2P", monospace`;
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText("[E]", w * 0.97, h * 0.97);
      }

      // Countdown
      if (st.status === "countdown") {
        const cdText = st.countdown > 0 ? `${st.countdown}` : "GO!";
        ctx.font = `${Math.round(w * 0.11)}px "Press Start 2P", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle   = st.countdown > 0 ? "#ffe600" : "#39ff14";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur  = 25;
        ctx.fillText(cdText, w / 2, h * 0.38);
        ctx.shadowBlur = 0;
      }

      // Finished
      if (st.status === "finished") {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, h * 0.25, w, h * 0.5);
        ctx.font = `${Math.round(w * 0.048)}px "Press Start 2P", monospace`;
        ctx.fillStyle   = st.position === 1 ? "#ffe600" : "#ff2d95";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur  = 15;
        ctx.fillText(
          st.position === 1 ? "YOU WIN!" : `${positionLabel(st.position)} PLACE`,
          w / 2, h * 0.38,
        );
        ctx.shadowBlur = 0;
        ctx.font = `${Math.round(w * 0.02)}px "Press Start 2P", monospace`;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`TIME: ${formatTime(st.elapsedMs)}`, w / 2, h * 0.50);
        ctx.fillText(`SCORE: ${Math.round(st.score)}`, w / 2, h * 0.58);
        ctx.fillText(`DRIFT BONUS: ${Math.round(st.driftScore)}`, w / 2, h * 0.64);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    lastTimeRef.current = 0;

    function loop(timestamp: number) {
      const st  = stateRef.current;
      const aud = audioRef.current;

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const rawDt = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      const dt = Math.min(rawDt, 50);

      if (st.status === "racing") {
        dispatch({ type: "TICK", dt });
        if (st.mode === "timeAttack" && st.ghostZ.length > 0) {
          ghostFrameRef.current = Math.min(ghostFrameRef.current + 1, st.ghostZ.length - 1);
        }
      }
      if (st.status === "racing" && !prevRacingRef.current) ghostFrameRef.current = 0;
      prevRacingRef.current = st.status === "racing";

      handleAudio(st, aud);

      const cvs = canvasRef.current!;
      const c   = cvs.getContext("2d")!;
      const w   = cvs.width;
      const h   = cvs.height;

      // Screen shake
      let shakeX = 0, shakeY = 0;
      if (shakeRef.current) {
        shakeRef.current.remaining -= dt;
        if (shakeRef.current.remaining <= 0) {
          shakeRef.current = null;
        } else {
          const mag = shakeRef.current.mag * (shakeRef.current.remaining / 300);
          shakeX = (Math.random() - 0.5) * mag;
          shakeY = (Math.random() - 0.5) * mag;
        }
      }

      c.clearRect(0, 0, w, h);
      if (shakeX !== 0 || shakeY !== 0) { c.save(); c.translate(shakeX, shakeY); }

      const track   = TRACKS[st.trackIndex];
      const palette = track.palette;

      // 1. Sky
      drawSky(c, w, h, palette, track.scenery);

      // 2. Parallax
      const parallaxOffset = st.player.z * 0.001;
      const sceneryPattern = SCENERY_PATTERN[track.scenery] ?? "buildings";
      drawParallax(c, w, h * 0.5, h * 0.2, parallaxOffset, palette.sky2 + "88", sceneryPattern);

      // 3. Road
      const playerZWorld = st.player.z * SEGMENT_LENGTH;
      projectSegments(st.segments, playerZWorld, st.player.x, w, h);
      drawRoad(c, st.segments, playerZWorld, w, h, palette);

      // 4. Roadside scenery
      drawScenery(c, st.segments, playerZWorld, w, h, track.scenery as "city"|"mountain"|"desert"|"cyber");

      // 5. Skid marks (update + draw)
      skidMarksRef.current = skidMarksRef.current
        .map(m => ({ ...m, alpha: m.alpha - 0.0025 }))
        .filter(m => m.alpha > 0);
      for (const m of skidMarksRef.current) {
        c.fillStyle = `rgba(30,20,10,${m.alpha})`;
        c.fillRect(m.x - m.w / 2, m.y - 1.5, m.w, 3);
      }

      // 6. Power-ups + oil slicks
      const cameraSegIdx = Math.floor(playerZWorld / SEGMENT_LENGTH);
      const segCount     = st.segments.length;

      for (const pu of st.powerUps) {
        if (pu.collected) continue;
        const relIdx = ((pu.segmentIndex - cameraSegIdx) % segCount + segCount) % segCount;
        if (relIdx <= 0 || relIdx >= VISIBLE_SEGMENTS) continue;
        const seg = st.segments[pu.segmentIndex % segCount];
        if (!seg.screen || seg.screen.scale <= 0) continue;
        const puDef = POWER_UPS.find(p => p.type === pu.type);
        if (!puDef) continue;
        drawPowerUpBox(c, seg.screen.x + pu.lane * seg.screen.w, seg.screen.y, seg.screen.scale, puDef.color, puDef.emoji);
      }

      for (const oil of st.oilSlicks) {
        const relIdx = ((oil.segmentIndex - cameraSegIdx) % segCount + segCount) % segCount;
        if (relIdx <= 0 || relIdx >= VISIBLE_SEGMENTS) continue;
        const seg = st.segments[oil.segmentIndex % segCount];
        if (!seg.screen || seg.screen.scale <= 0) continue;
        const oilSize = Math.max(8 * seg.screen.scale, 2);
        c.fillStyle = "#1a1a2ecc";
        c.beginPath();
        c.ellipse(seg.screen.x + oil.lane * seg.screen.w, seg.screen.y, oilSize * 1.5, oilSize * 0.5, 0, 0, Math.PI * 2);
        c.fill();
      }

      // 7. AI cars (farthest first)
      const sortedAI = [...st.ai].sort((a, b) => {
        const aDist = ((a.z - st.player.z) % segCount + segCount) % segCount;
        const bDist = ((b.z - st.player.z) % segCount + segCount) % segCount;
        return bDist - aDist;
      });
      for (const ai of sortedAI) {
        const aiSegIdx = Math.floor(ai.z) % segCount;
        const relIdx   = ((aiSegIdx - cameraSegIdx) % segCount + segCount) % segCount;
        if (relIdx <= 0 || relIdx >= VISIBLE_SEGMENTS) continue;
        const seg = st.segments[aiSegIdx >= 0 ? aiSegIdx : aiSegIdx + segCount];
        if (!seg.screen || seg.screen.scale <= 0) continue;
        drawCar(c, seg.screen.x + ai.x * seg.screen.w, seg.screen.y, seg.screen.scale, 0, CARS[ai.carIndex], false);
      }

      // 8. Ghost car
      if (st.mode === "timeAttack" && st.ghostZ.length > 0) {
        const gFrame    = Math.min(ghostFrameRef.current, st.ghostZ.length - 1);
        const ghostZPos = st.ghostZ[gFrame];
        const ghostSeg  = ((Math.floor(ghostZPos) % segCount) + segCount) % segCount;
        const relIdx    = ((ghostSeg - cameraSegIdx) % segCount + segCount) % segCount;
        if (relIdx > 0 && relIdx < VISIBLE_SEGMENTS) {
          const seg = st.segments[ghostSeg];
          if (seg.screen && seg.screen.scale > 0) {
            c.save();
            c.globalAlpha = 0.28;
            drawCar(c, seg.screen.x, seg.screen.y, seg.screen.scale, 0, CARS[st.carIndex], false);
            c.restore();
          }
        }
      }

      // 9. Player car
      const px = w / 2;
      const py = h * 0.80;
      const playerCar  = CARS[st.carIndex];
      const isDrifting = st.player.drift.active;

      // Spawn skid marks while drifting
      if (isDrifting && st.status === "racing") {
        const wOffset = 56 * 1.8 * 0.40;
        skidMarksRef.current.push({ x: px - wOffset, y: py - 56 * 0.12, w: 5, alpha: 0.55 });
        skidMarksRef.current.push({ x: px + wOffset, y: py - 56 * 0.12, w: 5, alpha: 0.55 });
        if (skidMarksRef.current.length > 220) skidMarksRef.current.splice(0, 2);
      }

      // Spawn smoke particles while drifting
      if (isDrifting && st.status === "racing") {
        const charge = st.player.drift.chargeMs;
        const color  = charge > 4000 ? "#ff5500" : charge > 2000 ? "#ffdd00" : "#cccccc";
        const count  = charge > 4000 ? 5 : charge > 2000 ? 4 : 3;
        for (let i = 0; i < count; i++) {
          smokePartsRef.current.push({
            x: px + (Math.random() - 0.5) * 30,
            y: py + 5,
            vx: (Math.random() - 0.5) * 1.2,
            vy: -(0.4 + Math.random() * 0.8),
            size: 4 + Math.random() * 4,
            maxSize: 18 + Math.random() * 14,
            alpha: 0.45 + Math.random() * 0.2,
            color,
          });
        }
        if (smokePartsRef.current.length > 160) smokePartsRef.current.splice(0, 4);
      }

      // Update + draw smoke
      smokePartsRef.current = smokePartsRef.current
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, size: Math.min(p.size + 0.35, p.maxSize), alpha: p.alpha - 0.012 }))
        .filter(p => p.alpha > 0);
      for (const p of smokePartsRef.current) {
        const rgb = p.color === "#cccccc" ? "200,200,200" : p.color === "#ffdd00" ? "255,221,0" : "255,85,0";
        c.beginPath();
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        c.fillStyle = `rgba(${rgb},${p.alpha})`;
        c.fill();
      }

      // Draw player car
      if (st.player.spinOut) {
        c.save();
        c.translate(px, py);
        c.rotate((st.player.spinOutMs / 100) * Math.PI * 0.3);
        c.translate(-px, -py);
        drawCar(c, px, py, 1, st.player.spriteAngle, playerCar, false, 0);
        c.restore();
      } else {
        drawCar(c, px, py, 1, st.player.spriteAngle, playerCar, isDrifting, st.player.drift.chargeMs);
      }

      // Shield ring
      if (st.player.shieldMs > 0) {
        c.strokeStyle = "#3b82f6aa";
        c.lineWidth = 3;
        c.shadowColor = "#3b82f6";
        c.shadowBlur = 10;
        c.beginPath();
        c.arc(px, py - 20, 36, 0, Math.PI * 2);
        c.stroke();
        c.shadowBlur = 0;
      }

      // 10. Speed lines on boost
      if (st.player.boost.active && !prevBoostActiveRef.current) {
        const hx = w / 2, hy = h * 0.4;
        speedLinesRef.current = Array.from({ length: 22 }, (_, i) => {
          const angle = (i / 22) * Math.PI * 2;
          const dist  = Math.hypot(w, h);
          return { x1: hx + Math.cos(angle) * dist, y1: hy + Math.sin(angle) * dist, x2: hx, y2: hy };
        });
        const mul = st.player.boost.multiplier;
        if (mul >= 2.2) {
          boostFlashRef.current = { alpha: 0.55, color: "#ff6600", text: "MAX BOOST!" };
          shakeRef.current = { mag: 14, remaining: 300 };
        } else if (mul >= 1.7) {
          boostFlashRef.current = { alpha: 0.4,  color: "#ffe600", text: "BOOST!" };
          shakeRef.current = { mag: 7, remaining: 200 };
        } else {
          boostFlashRef.current = { alpha: 0.25, color: "#ffffff", text: "BOOST" };
        }
      }
      if (!st.player.boost.active) speedLinesRef.current = [];

      if (speedLinesRef.current.length > 0 && st.player.boost.remainingMs > 0) {
        const alpha = Math.min(0.45, (st.player.boost.remainingMs / DRIFT_BOOST_DURATIONS[2]) * 0.5);
        c.save();
        c.strokeStyle = `rgba(255,200,80,${alpha})`;
        c.lineWidth = 1.5;
        for (const l of speedLinesRef.current) {
          c.beginPath(); c.moveTo(l.x1, l.y1); c.lineTo(l.x2, l.y2); c.stroke();
        }
        c.restore();
      }

      // 11. Boost flash overlay
      if (boostFlashRef.current) {
        const bf = boostFlashRef.current;
        const hexAlpha = Math.round(bf.alpha * 255).toString(16).padStart(2, "0");
        c.fillStyle = bf.color + hexAlpha;
        c.fillRect(0, 0, w, h);
        if (bf.alpha > 0.1) {
          const fs = Math.round(w * 0.055);
          c.font = `${fs}px "Press Start 2P", monospace`;
          c.textAlign = "center";
          c.textBaseline = "middle";
          c.fillStyle = "#ffffff";
          c.shadowColor = bf.color;
          c.shadowBlur = 20;
          c.fillText(bf.text, w / 2, h * 0.35);
          c.shadowBlur = 0;
        }
        boostFlashRef.current = { ...bf, alpha: bf.alpha - 0.022 };
        if (boostFlashRef.current.alpha <= 0) boostFlashRef.current = null;
      }

      // Power-up use flash
      if (puFlashRef.current) {
        const hexAlpha = Math.round(puFlashRef.current.alpha * 255).toString(16).padStart(2,"0");
        c.fillStyle = puFlashRef.current.color + hexAlpha;
        c.fillRect(0, 0, w, h);
        puFlashRef.current = { ...puFlashRef.current, alpha: puFlashRef.current.alpha - 0.05 };
        if (puFlashRef.current.alpha <= 0) puFlashRef.current = null;
      }

      // 12. Lap notification
      if (st.lap > prevLapNotifRef.current && st.lap > 1 && st.status === "racing") {
        const lapNum = Math.min(st.lap - 1, st.totalLaps);
        const lapMs  = st.lapTimes[st.lapTimes.length - 1] ?? 0;
        lapNotifRef.current = {
          text: `LAP ${lapNum}/${st.totalLaps}`,
          subText: formatTime(lapMs),
          subColor: "#ffffff",
          slideY: -60,
          alpha: 1,
        };
      }
      prevLapNotifRef.current = st.lap;

      if (lapNotifRef.current) {
        const n = lapNotifRef.current;
        n.slideY = Math.min(n.slideY + 3, h * 0.22);
        const fs = Math.round(w * 0.038);
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.font = `${fs}px "Press Start 2P", monospace`;
        c.fillStyle = `rgba(255,200,50,${n.alpha})`;
        c.shadowColor = "#f97316";
        c.shadowBlur = 12;
        c.fillText(n.text, w / 2, n.slideY);
        c.font = `${Math.round(fs * 0.65)}px "Press Start 2P", monospace`;
        const subHex = Math.round(n.alpha * 255).toString(16).padStart(2,"0");
        c.fillStyle = n.subColor + subHex;
        c.fillText(n.subText, w / 2, n.slideY + fs * 1.4);
        c.shadowBlur = 0;
        lapNotifRef.current = { ...n, alpha: n.alpha - 0.008 };
        if (lapNotifRef.current.alpha <= 0) lapNotifRef.current = null;
      }

      // Drift level notification
      if (st.player.drift.level > prevDriftLevelRef.current && st.player.drift.level > 0) {
        const colors = ["", "#ffffff", "#ffe600", "#ff6600"];
        lvlNotifRef.current = { text: `LV${st.player.drift.level}!`, alpha: 1.0, color: colors[st.player.drift.level] };
      }
      if (lvlNotifRef.current) {
        const lv = lvlNotifRef.current;
        c.font = `${Math.round(w * 0.032)}px "Press Start 2P", monospace`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        const lvHex = Math.round(lv.alpha * 255).toString(16).padStart(2,"0");
        c.fillStyle = lv.color + lvHex;
        c.shadowColor = lv.color;
        c.shadowBlur = 10;
        c.fillText(lv.text, w / 2, h * 0.72);
        c.shadowBlur = 0;
        lvlNotifRef.current = { ...lv, alpha: lv.alpha - 0.025 };
        if (lvlNotifRef.current.alpha <= 0) lvlNotifRef.current = null;
      }

      if (shakeX !== 0 || shakeY !== 0) c.restore();

      // 13. HUD (drawn after restore, doesn't shake)
      drawHUD(c, w, h, st);

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
      className="relative w-full flex flex-col items-center"
      style={{ maxWidth: 800 }}
    >
      <canvas
        ref={canvasRef}
        className="block border-2 border-[#2a2a4a] rounded bg-black"
        tabIndex={0}
      />

      {/* Touch controls overlay – only rendered on touch devices */}
      {isTouchDevice && (
        <div
          className="pointer-events-none w-full flex"
          style={{ height: 72 }}
        >
          {/* Left steer zone */}
          <button
            type="button"
            className="pointer-events-auto flex-1 flex items-center justify-center select-none
                       bg-black/50 border-2 border-[#f97316]/60 rounded-bl active:bg-[#f97316]/30"
            style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 11, color: "#f97316", minHeight: 60 }}
            onTouchStart={onSteerLeft}
            onTouchEnd={onSteerLeftEnd}
          >
            ◀ LEFT
          </button>

          {/* Center zone: Drift + Power-up */}
          <div className="pointer-events-auto flex flex-1 gap-0">
            <button
              type="button"
              className="flex-1 flex items-center justify-center select-none
                         bg-black/50 border-2 border-[#f97316]/60 border-l-0 active:bg-[#f97316]/30"
              style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: "#ffe600", minHeight: 60 }}
              onTouchStart={onDriftStart}
              onTouchEnd={onDriftEnd}
            >
              DRIFT
            </button>
            <button
              type="button"
              className="flex-1 flex items-center justify-center select-none
                         bg-black/50 border-2 border-[#f97316]/60 border-l-0 active:bg-[#f97316]/30"
              style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 14, minHeight: 60 }}
              onTouchStart={onUsePowerUp}
              onTouchEnd={(e) => e.preventDefault()}
            >
              🎁
            </button>
          </div>

          {/* Right steer zone */}
          <button
            type="button"
            className="pointer-events-auto flex-1 flex items-center justify-center select-none
                       bg-black/50 border-2 border-[#f97316]/60 border-l-0 rounded-br active:bg-[#f97316]/30"
            style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 11, color: "#f97316", minHeight: 60 }}
            onTouchStart={onSteerRight}
            onTouchEnd={onSteerRightEnd}
          >
            RIGHT ▶
          </button>
        </div>
      )}
    </div>
  );
}
