import { tone, noise } from "@/lib/audioUtils";

export interface FlappyAudio {
  playFlap: () => void;
  playScore: () => void;
  playDie: () => void;
  setMuted: (m: boolean) => void;
}

export function createFlappyAudio(): FlappyAudio {
  const ctx = new AudioContext();
  let muted = false;
  const ok = () => !muted;

  return {
    playFlap()  { if (!ok()) return; tone(ctx, "square",   400, 600, 0.05, 0.14); },
    playScore() { if (!ok()) return; tone(ctx, "triangle", 800, 800, 0.08, 0.18); },
    playDie()   { if (!ok()) return; noise(ctx,0.20,0.18); tone(ctx,"sawtooth",300,100,0.20,0.14,0.02); },
    setMuted(m) { muted = m; },
  };
}
