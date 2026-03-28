import { tone, noise } from "@/lib/audioUtils";

export interface RunnerAudio {
  playJump: () => void;
  playLand: () => void;
  playDie: () => void;
  playScore: () => void;
  setMuted: (m: boolean) => void;
}

export function createRunnerAudio(): RunnerAudio {
  const ctx = new AudioContext();
  let muted = false;
  const ok = () => !muted;

  return {
    playJump()  { if (!ok()) return; tone(ctx, "square",   300, 700, 0.10, 0.14); },
    playLand()  { if (!ok()) return; tone(ctx, "triangle", 300, 300, 0.06, 0.12); },
    playDie()   { if (!ok()) return; noise(ctx,0.25,0.18); tone(ctx,"sawtooth",350,80,0.25,0.14,0.02); },
    playScore() { if (!ok()) return; tone(ctx, "triangle", 900, 900, 0.07, 0.16); },
    setMuted(m) { muted = m; },
  };
}
