import { tone, noise } from "@/lib/audioUtils";

export interface SnakeAudio {
  playEat: () => void;
  playLevelUp: () => void;
  playDie: () => void;
  setMuted: (m: boolean) => void;
}

export function createSnakeAudio(): SnakeAudio {
  const ctx = new AudioContext();
  let muted = false;
  const ok = () => !muted;

  return {
    playEat()     { if (!ok()) return; tone(ctx, "square",   700, 900, 0.07, 0.16); },
    playLevelUp() { if (!ok()) return; [400,500,650,800].forEach((f,i) => tone(ctx,"square",f,f,0.08,0.14,i*0.08)); },
    playDie()     { if (!ok()) return; tone(ctx,"sawtooth",400,80,0.30,0.18); noise(ctx,0.15,0.10,0.05); },
    setMuted(m)   { muted = m; },
  };
}
