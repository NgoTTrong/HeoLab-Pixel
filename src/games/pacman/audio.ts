import { tone, noise } from "@/lib/audioUtils";

export interface PacmanAudio {
  playWaka: () => void;
  playPower: () => void;
  playEatGhost: () => void;
  playDeath: () => void;
  playLevelComplete: () => void;
  playFruit: () => void;
  setMuted: (m: boolean) => void;
}

export function createPacmanAudio(): PacmanAudio {
  const ctx = new AudioContext();
  let muted = false;
  const ok = () => !muted;

  return {
    playWaka() {
      if (!ok()) return;
      tone(ctx, "square", 200, 300, 0.05, 0.12);
      tone(ctx, "square", 300, 200, 0.05, 0.12, 0.06);
    },
    playPower() {
      if (!ok()) return;
      tone(ctx, "sine", 200, 800, 0.3, 0.15);
    },
    playEatGhost() {
      if (!ok()) return;
      [300, 500, 700, 900].forEach((f, i) =>
        tone(ctx, "square", f, f + 100, 0.06, 0.12, i * 0.05)
      );
    },
    playDeath() {
      if (!ok()) return;
      tone(ctx, "sawtooth", 600, 100, 0.5, 0.18);
      noise(ctx, 0.2, 0.08, 0.3);
    },
    playLevelComplete() {
      if (!ok()) return;
      [400, 500, 600, 800, 1000].forEach((f, i) =>
        tone(ctx, "square", f, f, 0.1, 0.14, i * 0.1)
      );
    },
    playFruit() {
      if (!ok()) return;
      tone(ctx, "sine", 500, 900, 0.12, 0.15);
      tone(ctx, "sine", 900, 500, 0.12, 0.15, 0.12);
    },
    setMuted(m) { muted = m; },
  };
}
