import { tone, noise } from "@/lib/audioUtils";

export interface TetrisAudio {
  playMove: () => void;
  playRotate: () => void;
  playLand: () => void;
  playClear: (lines: number) => void;
  playGameOver: () => void;
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
    setMuted(m)      { muted = m; },
  };
}
