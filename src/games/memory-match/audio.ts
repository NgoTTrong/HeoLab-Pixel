import { tone } from "@/lib/audioUtils";

export interface MemoryAudio {
  playFlip: () => void;
  playMatch: () => void;
  playNoMatch: () => void;
  playCombo: (level: number) => void;
  playWin: () => void;
  setMuted: (m: boolean) => void;
}

export function createMemoryAudio(): MemoryAudio {
  const ctx = new AudioContext();
  let muted = false;
  const ok = () => !muted;

  return {
    playFlip()      { if (!ok()) return; tone(ctx, "square",   600, 600, 0.05, 0.12); },
    playMatch()     { if (!ok()) return; tone(ctx,"triangle",600,900,0.10,0.18,0); tone(ctx,"triangle",900,900,0.10,0.18,0.11); },
    playNoMatch()   { if (!ok()) return; tone(ctx, "sawtooth", 200, 150, 0.10, 0.14); },
    playCombo(lvl)  {
      if (!ok()) return;
      const base = 400 + lvl * 80;
      [base, base * 1.25, base * 1.5].forEach((f, i) => tone(ctx, "square", f, f, 0.08, 0.14, i * 0.09));
    },
    playWin()       { if (!ok()) return; [523,659,784,1047].forEach((f,i) => tone(ctx,"square",f,f,0.12,0.18,i*0.12)); },
    setMuted(m)     { muted = m; },
  };
}
