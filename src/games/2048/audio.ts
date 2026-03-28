import { tone } from "@/lib/audioUtils";

export interface Audio2048 {
  playMove: () => void;
  playMerge: () => void;
  playMilestone: (value: number) => void;
  playWin: () => void;
  playGameOver: () => void;
  setMuted: (m: boolean) => void;
}

export function create2048Audio(): Audio2048 {
  const ctx = new AudioContext();
  let muted = false;
  const ok = () => !muted;

  return {
    playMove()        { if (!ok()) return; tone(ctx, "square",   300, 200, 0.06, 0.08); },
    playMerge()       { if (!ok()) return; tone(ctx, "triangle", 400, 650, 0.08, 0.16); },
    playMilestone(v)  {
      if (!ok()) return;
      const notes = v >= 2048 ? [523, 659, 784, 1047]
                  : v >= 1024 ? [440, 554, 659]
                  :             [392, 494];
      notes.forEach((f, i) => tone(ctx, "square", f, f, 0.10, 0.14, i * 0.11));
    },
    playWin()         { if (!ok()) return; [523,659,784,1047].forEach((f,i) => tone(ctx,"square",f,f,0.12,0.16,i*0.13)); },
    playGameOver()    { if (!ok()) return; [400,300,200].forEach((f,i) => tone(ctx,"square",f,f*0.7,0.15,0.14,i*0.16)); },
    setMuted(m)       { muted = m; },
  };
}
