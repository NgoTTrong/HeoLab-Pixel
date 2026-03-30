import { tone, noise } from "@/lib/audioUtils";

export interface PacmanAudio {
  playWaka: () => void;
  playPower: () => void;
  playEatGhost: () => void;
  playDeath: () => void;
  playLevelComplete: () => void;
  playFruit: () => void;
  playHeartbeat: (intensity: "far" | "mid" | "near") => void;
  playFootstep: (volume: number) => void;
  playComboTick: (combo: number) => void;
  playMilestone: () => void;
  playComboBreak: () => void;
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
    playHeartbeat(intensity) {
      if (!ok()) return;
      // Two-beat heartbeat pattern, speed varies by intensity
      const gaps = { far: 0.12, mid: 0.08, near: 0.04 };
      const gap = gaps[intensity];
      tone(ctx, "sine", 60, 40, 0.08, 0.10);
      tone(ctx, "sine", 55, 35, 0.08, 0.08, gap);
    },
    playFootstep(volume) {
      if (!ok()) return;
      noise(ctx, 0.04, volume * 0.08);
    },
    playComboTick(combo) {
      if (!ok()) return;
      if (combo % 5 !== 0 || combo === 0) return;
      // Rising pitch every 5 combo
      const pitch = 300 + Math.min(combo, 100) * 5;
      tone(ctx, "square", pitch, pitch + 100, 0.04, 0.08);
    },
    playMilestone() {
      if (!ok()) return;
      // Ascending fanfare
      [500, 700, 900, 1100, 1300].forEach((f, i) =>
        tone(ctx, "square", f, f + 50, 0.08, 0.16, i * 0.06)
      );
    },
    playComboBreak() {
      if (!ok()) return;
      // Short descending sad tone
      tone(ctx, "sawtooth", 300, 150, 0.12, 0.08);
    },
    setMuted(m) { muted = m; },
  };
}
