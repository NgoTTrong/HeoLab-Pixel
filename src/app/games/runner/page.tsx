"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import PixelButton from "@/components/PixelButton";
import {
  CHARACTERS, GROUND_HEIGHT, GRAVITY, JUMP_IMPULSE, BASE_SPEED, MAX_SPEED,
  getWorld, getAvailableObstacles,
} from "@/games/runner/config";
import { getHighScore, setHighScore } from "@/lib/scores";
import { createRunnerAudio } from "@/games/runner/audio";
import type { RunnerAudio } from "@/games/runner/audio";
import MuteButton from "@/components/MuteButton";

const GAME_KEY = "runner";
const W = 600;
const H = 380;
const CHAR_X = 90;
const CHAR_SIZE = 40;

type GameStatus = "select" | "idle" | "playing" | "dead";

interface ObstacleObj {
  x: number;
  emoji: string;
  width: number;
  height: number;
  isFlying: boolean;
  flyY: number;
}

function lerpColor(a: string, b: string, t: number): string {
  const ah = a.replace("#", "");
  const bh = b.replace("#", "");
  const ar = parseInt(ah.slice(0, 2), 16);
  const ag = parseInt(ah.slice(2, 4), 16);
  const ab2 = parseInt(ah.slice(4, 6), 16);
  const br = parseInt(bh.slice(0, 2), 16);
  const bg = parseInt(bh.slice(2, 4), 16);
  const bb2 = parseInt(bh.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * t).toString(16).padStart(2, "0");
  const g2 = Math.round(ag + (bg - ag) * t).toString(16).padStart(2, "0");
  const b3 = Math.round(ab2 + (bb2 - ab2) * t).toString(16).padStart(2, "0");
  return `#${r}${g2}${b3}`;
}

export default function RunnerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedChar, setSelectedChar] = useState(0);
  const [highScore, setHS] = useState(0);
  const [unlockedChars, setUnlocked] = useState<number[]>([0]);
  const [uiStatus, setUiStatus] = useState<GameStatus>("select");
  const [uiScore, setUiScore] = useState(0);
  const [newUnlock, setNewUnlock] = useState<string | null>(null);

  const gameRef = useRef({
    status: "idle" as GameStatus,
    charY: H - GROUND_HEIGHT - CHAR_SIZE,
    charVY: 0,
    jumpsLeft: 2,
    obstacles: [] as ObstacleObj[],
    score: 0,
    frame: 0,
    speed: BASE_SPEED,
    groundOffset: 0,
    inAir: false,
    lastHundreds: 0,
    scorePopTimer: 0,
    scorePopY: 0,
    isSliding: false,
    slideTimer: 0,
    fromSkyTop: "#87CEEB",
    fromSkyBot: "#c8eaf9",
    fromGround: "#c2965a",
    toSkyTop: "#87CEEB",
    toSkyBot: "#c8eaf9",
    toGround: "#c2965a",
    transitionT: 1,
    lastWorldId: "desert",
  });
  const rafRef = useRef<number>(0);
  const audioRef = useRef<RunnerAudio | null>(null);
  const [muted, setMuted] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("runner-sound-muted") === "1"
  );

  // Lazy-init audio on first interaction
  useEffect(() => {
    const init = () => {
      if (!audioRef.current) {
        audioRef.current = createRunnerAudio();
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
    localStorage.setItem("runner-sound-muted", muted ? "1" : "0");
  }, [muted]);

  useEffect(() => {
    const hs = getHighScore(GAME_KEY);
    setHS(hs);
    const unlocked = CHARACTERS.reduce<number[]>((acc, c, i) => {
      if (hs >= c.unlockScore) acc.push(i);
      return acc;
    }, []);
    setUnlocked(unlocked);
  }, []);

  const jump = useCallback(() => {
    const g = gameRef.current;
    if (g.status !== "playing") return;
    if (g.jumpsLeft > 0) {
      g.charVY = JUMP_IMPULSE;
      g.jumpsLeft--;
      audioRef.current?.playJump();
    }
  }, []);

  const slide = useCallback(() => {
    const g = gameRef.current;
    if (g.status !== "playing") return;
    if (!g.inAir) { // only slide on ground
      g.isSliding = true;
      g.slideTimer = 36; // ~600ms at 60fps
    }
  }, []);

  const startGame = useCallback(() => {
    const g = gameRef.current;
    g.status = "playing";
    g.charY = H - GROUND_HEIGHT - CHAR_SIZE;
    g.charVY = 0;
    g.jumpsLeft = 2;
    g.obstacles = [];
    g.score = 0;
    g.frame = 0;
    g.speed = BASE_SPEED;
    g.groundOffset = 0;
    g.inAir = false;
    g.lastHundreds = 0;
    g.isSliding = false;
    g.slideTimer = 0;
    const startWorld = getWorld(0);
    g.fromSkyTop = startWorld.skyColor;
    g.fromSkyBot = startWorld.skyColorBottom;
    g.fromGround = startWorld.groundColor;
    g.toSkyTop = startWorld.skyColor;
    g.toSkyBot = startWorld.skyColorBottom;
    g.toGround = startWorld.groundColor;
    g.transitionT = 1;
    g.lastWorldId = startWorld.id;
    setUiStatus("playing");
    setUiScore(0);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const char = CHARACTERS[selectedChar];

    function draw() {
      const g = gameRef.current;
      if (document.hidden) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // When dead: keep rendering world + falling character (no game logic)
      if (g.status === "dead") {
        const world = getWorld(Math.floor(g.score));
        // Sky (gradient) — intentionally separate from playing branch;
        // playing branch will use lerped transition colors in a later task
        const deadSkyGrad = ctx.createLinearGradient(0, 0, 0, H - GROUND_HEIGHT);
        deadSkyGrad.addColorStop(0, world.skyColor);
        deadSkyGrad.addColorStop(1, world.skyColorBottom);
        ctx.fillStyle = deadSkyGrad;
        ctx.fillRect(0, 0, W, H - GROUND_HEIGHT);
        // Ground
        ctx.fillStyle = world.groundColor;
        ctx.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(0, H - GROUND_HEIGHT, W, 3);
        // Falling character (gravity applied)
        g.charVY = (g.charVY ?? 0) + GRAVITY;
        g.charY = Math.min(g.charY + g.charVY, H - GROUND_HEIGHT - CHAR_SIZE);
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.font = `${CHAR_SIZE}px serif`;
        ctx.textBaseline = "top";
        ctx.fillText(char.emoji, CHAR_X - CHAR_SIZE / 2, g.charY);
        ctx.shadowBlur = 0;
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      g.frame++;
      const world = getWorld(Math.floor(g.score));
      g.speed = Math.min(MAX_SPEED, BASE_SPEED + g.score / 600);
      g.groundOffset = (g.groundOffset + g.speed) % 40;

      // World transition detection
      if (world.id !== g.lastWorldId) {
        g.fromSkyTop = lerpColor(g.fromSkyTop, g.toSkyTop, g.transitionT);
        g.fromSkyBot = lerpColor(g.fromSkyBot, g.toSkyBot, g.transitionT);
        g.fromGround = lerpColor(g.fromGround, g.toGround, g.transitionT);
        g.toSkyTop = world.skyColor;
        g.toSkyBot = world.skyColorBottom;
        g.toGround = world.groundColor;
        g.transitionT = 0;
        g.lastWorldId = world.id;
      }
      if (g.transitionT < 1) g.transitionT = Math.min(1, g.transitionT + 1 / 120);

      const effSkyTop = lerpColor(g.fromSkyTop, g.toSkyTop, g.transitionT);
      const effSkyBot = lerpColor(g.fromSkyBot, g.toSkyBot, g.transitionT);
      const effGround = lerpColor(g.fromGround, g.toGround, g.transitionT);

      // Physics
      g.charVY += GRAVITY;
      g.charY += g.charVY;
      const groundY = H - GROUND_HEIGHT - CHAR_SIZE;
      if (g.charY >= groundY) {
        if (g.inAir) { audioRef.current?.playLand(); g.inAir = false; }
        g.charY = groundY;
        g.charVY = 0;
        g.jumpsLeft = 2;
      } else {
        g.inAir = true;
      }

      // Slide timer countdown
      if (g.isSliding) {
        g.slideTimer--;
        if (g.slideTimer <= 0) g.isSliding = false;
      }
      // Cancel slide if in air
      if (g.inAir) g.isSliding = false;

      // Spawn obstacles
      const availObs = getAvailableObstacles(Math.floor(g.score));
      const minInterval = Math.max(50, 100 - Math.floor(g.score / 100));
      if (g.frame % minInterval === 0 && availObs.length > 0) {
        const def = availObs[Math.floor(Math.random() * availObs.length)];
        const flyY = def.isFlying
          ? H - GROUND_HEIGHT - def.height - Math.floor(Math.random() * 60 + 20)
          : H - GROUND_HEIGHT - def.height;
        g.obstacles.push({ x: W + 10, emoji: def.emoji, width: def.width, height: def.height, isFlying: def.isFlying, flyY });
      }

      // Move obstacles + score
      g.obstacles = g.obstacles.filter((o) => o.x + o.width > -20);
      for (const o of g.obstacles) { o.x -= g.speed; }
      g.score += 0.1 * world.multiplier;
      const hundreds = Math.floor(g.score / 100);
      if (hundreds > g.lastHundreds) {
        audioRef.current?.playScore();
        g.lastHundreds = hundreds;
        g.scorePopTimer = 30;
        g.scorePopY = H - GROUND_HEIGHT - CHAR_SIZE - 20;
      }
      setUiScore(Math.floor(g.score));

      // Collision
      for (const o of g.obstacles) {
        const oY = o.flyY;
        const slideOffset = g.isSliding ? CHAR_SIZE * 0.55 : 0;
        const charTop = g.charY + slideOffset + 8;
        const charBottom = g.charY + CHAR_SIZE - 8;
        if (
          CHAR_X + CHAR_SIZE - 8 > o.x + 4 &&
          CHAR_X + 8 < o.x + o.width - 4 &&
          charBottom > oY + 4 &&
          charTop < oY + o.height - 4
        ) {
          g.status = "dead";
          audioRef.current?.playDie();
          const hs = getHighScore(GAME_KEY);
          const finalScore = Math.floor(g.score);
          if (finalScore > hs) setHighScore(GAME_KEY, finalScore);
          const newChars = CHARACTERS.filter((c, i) => finalScore >= c.unlockScore && !unlockedChars.includes(i));
          if (newChars.length > 0) setNewUnlock(newChars[0].label);
          setHS(Math.max(finalScore, hs));
          setUiStatus("dead");
          rafRef.current = requestAnimationFrame(draw);
          return;
        }
      }

      // Draw sky (gradient)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H - GROUND_HEIGHT);
      skyGrad.addColorStop(0, effSkyTop);
      skyGrad.addColorStop(1, effSkyBot);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H - GROUND_HEIGHT);

      // Draw ground
      ctx.fillStyle = effGround;
      ctx.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, H - GROUND_HEIGHT, W, 3);

      // Ground detail lines
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      for (let x = -g.groundOffset; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, H - GROUND_HEIGHT + 8);
        ctx.lineTo(x + 20, H - GROUND_HEIGHT + 8);
        ctx.stroke();
      }

      // Score milestone popup
      if (g.scorePopTimer > 0) {
        ctx.globalAlpha = g.scorePopTimer / 30;
        ctx.fillStyle = "#ffe600";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ffe600";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`+${Math.floor(g.score / 100) * 100}!`, CHAR_X + 40, g.scorePopY);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.textAlign = "left";
        g.scorePopY -= 1.2;
        g.scorePopTimer--;
      }

      // Draw obstacles
      ctx.textBaseline = "top";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      for (const o of g.obstacles) {
        ctx.font = `${o.height}px serif`;
        ctx.fillText(o.emoji, o.x, o.flyY);
      }
      ctx.shadowBlur = 0;

      // Draw character (crouched when sliding)
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      if (g.isSliding) {
        ctx.translate(CHAR_X, g.charY + CHAR_SIZE);
        ctx.scale(1, 0.5);
        ctx.font = `${CHAR_SIZE}px serif`;
        ctx.textBaseline = "bottom";
        ctx.fillText(char.emoji, -CHAR_SIZE / 2, 0);
      } else {
        ctx.font = `${CHAR_SIZE}px serif`;
        ctx.textBaseline = "top";
        ctx.fillText(char.emoji, CHAR_X - CHAR_SIZE / 2, g.charY);
      }
      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [selectedChar, unlockedChars]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.code === "Space" || e.key === "ArrowUp") && uiStatus === "playing") {
        e.preventDefault();
        jump();
      }
      if ((e.key === "ArrowDown" || e.key === "s" || e.key === "S") && uiStatus === "playing") {
        e.preventDefault();
        slide();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [jump, slide, uiStatus]);

  const char = CHARACTERS[selectedChar];

  return (
    <div className="flex flex-col items-center p-4 gap-3 w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between w-full max-w-lg">
        <Link href="/games" className="text-[0.5rem] neon-text-green hover:opacity-80">← BACK</Link>
        <h1 className="text-[0.6rem] sm:text-xs neon-text neon-text-green">PIXEL DASH</h1>
        <div className="flex items-center gap-2">
          <span className="text-[0.5rem] text-gray-400">BEST: {highScore}</span>
          <MuteButton muted={muted} onToggle={() => setMuted(m => !m)} color="green" />
        </div>
      </div>

      {/* Score HUD — shown during play */}
      {(uiStatus === "playing" || uiStatus === "dead") && (
        <div className="flex justify-between w-full px-1">
          <span
            className="font-pixel text-[0.5rem]"
            style={{ color: CHARACTERS[selectedChar].color }}
          >
            {/* world label shown inline */}
          </span>
          <span className="font-pixel text-[0.55rem] text-white tabular-nums">
            {uiScore}
          </span>
        </div>
      )}

      {/* Canvas always rendered — character select shown as overlay */}
      <div
        className="relative cursor-pointer w-full"
        onClick={() => { if (uiStatus === "playing") jump(); }}
        onTouchStart={(e) => { e.preventDefault(); if (uiStatus === "playing") jump(); }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="border border-neon-green/20 rounded-sm w-full"
          style={{ imageRendering: "pixelated", touchAction: "none", maxWidth: `${W}px` }}
        />

        {/* Character select overlay */}
        {uiStatus === "select" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-bg/85 backdrop-blur-sm animate-[overlayIn_0.5s_ease-out]">
            <div className="flex flex-col items-center gap-6">
              <h2 className="font-pixel text-[0.6rem] text-neon-green">SELECT RUNNER</h2>
              <div className="flex gap-4">
                {CHARACTERS.map((c, i) => {
                  const unlocked = unlockedChars.includes(i);
                  return (
                    <button
                      key={c.id}
                      onClick={() => unlocked && setSelectedChar(i)}
                      className={`flex flex-col items-center gap-2 p-4 border transition-all ${
                        selectedChar === i ? "border-neon-green bg-neon-green/10" : "border-gray-700"
                      } ${!unlocked ? "opacity-40 cursor-not-allowed" : "hover:border-gray-500"}`}
                    >
                      <span className="text-4xl">{c.emoji}</span>
                      <span className="font-pixel text-[0.4rem]" style={{ color: c.color }}>{c.label}</span>
                      {!unlocked && (
                        <span className="font-pixel text-[0.35rem] text-gray-600">UNLOCK {c.unlockScore}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <PixelButton color="green" onClick={startGame}>
                RUN!
              </PixelButton>
            </div>
          </div>
        )}

        {/* Dead overlay */}
        {uiStatus === "dead" && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-bg/30 backdrop-blur-sm animate-[overlayIn_0.5s_ease-out]">
            <div className="flex flex-col items-center gap-3 pointer-events-auto">
              <div className="text-5xl animate-[floatUp_1s_ease-out_infinite_alternate]">💥</div>
              <h2 className="text-lg font-pixel neon-text-pink animate-[defeatFlash_1s_ease-in-out_infinite]">WIPED OUT!</h2>
              {newUnlock && (
                <p className="font-pixel text-[0.5rem] text-neon-yellow animate-pulse">🔓 {newUnlock} UNLOCKED!</p>
              )}
              <p className="text-[0.6rem] font-pixel text-neon-pink/70">SCORE: {uiScore} · BEST: {highScore}</p>
              <div className="flex gap-3">
                <PixelButton color="pink" onClick={() => { setNewUnlock(null); startGame(); }}>TRY AGAIN</PixelButton>
                <PixelButton color="green" onClick={() => { setNewUnlock(null); setUiStatus("select"); }}>CHANGE</PixelButton>
              </div>
            </div>
          </div>
        )}
      </div>

      {uiStatus === "playing" && (
        <p className="text-[0.45rem] font-pixel text-gray-600">SPACE / ↑ JUMP · ↓ SLIDE · DOUBLE JUMP AVAILABLE</p>
      )}
    </div>
  );
}
