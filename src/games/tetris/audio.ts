import { tone, noise } from "@/lib/audioUtils";

export interface TetrisAudio {
  playMove: () => void;
  playRotate: () => void;
  playLand: () => void;
  playClear: (lines: number) => void;
  playGameOver: () => void;
  playEvent: (type: string) => void;
  setMuted: (m: boolean) => void;
}

export function createTetrisAudio(): TetrisAudio {
  const ctx = new AudioContext();
  let muted = false;
  const ok = () => !muted;

  return {
    playMove()       { if (!ok()) return; tone(ctx, "square",   400, 400, 0.03, 0.07); },
    playRotate()     { if (!ok()) return; tone(ctx, "square",   600, 400, 0.06, 0.10); },
    playLand()       { if (!ok()) return; tone(ctx,"triangle",300,300,0.08,0.14); noise(ctx,0.04,0.06); },
    playClear(lines) {
      if (!ok()) return;
      if (lines >= 4) {
        [523,659,784,1047,1319].forEach((f,i) => tone(ctx,"square",f,f,0.12,0.18,i*0.10));
      } else {
        tone(ctx, "square", 400 + lines * 100, (400 + lines * 100) * 1.5, 0.15, 0.16);
      }
    },
    playGameOver()   { if (!ok()) return; [400,350,300,200,150].forEach((f,i) => tone(ctx,"sawtooth",f,f*0.8,0.14,0.15,i*0.12)); },
    playEvent(type) {
      if (!ok()) return;
      if (type === "fever")
        tone(ctx, "square", 880, 1100, 0.12, 0.18);
      else if (type === "freeze")
        tone(ctx, "triangle", 600, 300, 0.10, 0.20);
      else if (type === "lightning") {
        tone(ctx, "sawtooth", 800, 200, 0.15, 0.08);
        noise(ctx, 0.10, 0.08);
      } else if (type === "bomb")
        noise(ctx, 0.18, 0.25);
      else if (type === "whirlwind")
        [400, 500, 600, 500, 400].forEach((f, i) => tone(ctx, "square", f, f, 0.08, 0.10, i * 0.06));
      else if (type === "overdrive")
        [523, 659, 784, 1047].forEach((f, i) => tone(ctx, "square", f, f, 0.12, 0.14, i * 0.07));
      else if (type === "curse")
        [300, 250, 200, 150].forEach((f, i) => tone(ctx, "sawtooth", f, f * 0.8, 0.12, 0.12, i * 0.08));
    },
    setMuted(m)      { muted = m; },
  };
}
