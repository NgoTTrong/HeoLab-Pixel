// src/games/drift/audio.ts
import { tone, noise } from "@/lib/audioUtils";

export interface DriftAudio {
  playEngine: (speed: number) => void;  // continuous engine hum
  stopEngine: () => void;
  playDriftStart: () => void;
  playDriftLevel: (level: number) => void;
  playBoostRelease: () => void;
  playCollision: () => void;
  playPowerUp: () => void;
  playCountdown: () => void;
  playGo: () => void;
  playLapComplete: () => void;
  playWin: () => void;
  playLose: () => void;
  setMuted: (m: boolean) => void;
  dispose: () => void;
}

export function createDriftAudio(): DriftAudio {
  const ctx = new AudioContext();
  let muted = false;
  let engineOsc: OscillatorNode | null = null;
  let engineGain: GainNode | null = null;

  function startEngine() {
    if (engineOsc) return;
    engineOsc = ctx.createOscillator();
    engineGain = ctx.createGain();
    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = 80;
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain).connect(ctx.destination);
    engineOsc.start();
  }

  return {
    playEngine(speed: number) {
      if (muted) return;
      startEngine();
      if (engineOsc && engineGain) {
        // Pitch scales with speed (80-300 Hz)
        engineOsc.frequency.setTargetAtTime(80 + speed * 2.2, ctx.currentTime, 0.1);
        engineGain.gain.setTargetAtTime(0.03 + speed * 0.0002, ctx.currentTime, 0.1);
      }
    },
    stopEngine() {
      if (engineOsc) {
        engineOsc.stop();
        engineOsc.disconnect();
        engineOsc = null;
      }
      if (engineGain) {
        engineGain.disconnect();
        engineGain = null;
      }
    },
    playDriftStart() {
      if (muted) return;
      noise(ctx, 0.3, 0.08, 0); // tire screech
    },
    playDriftLevel(level: number) {
      if (muted) return;
      const freq = 500 + level * 200;
      tone(ctx, "square", freq, freq + 100, 0.06, 0.1, 0);
    },
    playBoostRelease() {
      if (muted) return;
      // Rising sweep + noise burst
      tone(ctx, "sawtooth", 200, 800, 0.15, 0.3, 0);
      noise(ctx, 0.2, 0.15, 0.05);
    },
    playCollision() {
      if (muted) return;
      noise(ctx, 0.15, 0.2, 0);
      tone(ctx, "square", 150, 50, 0.1, 0.2, 0);
    },
    playPowerUp() {
      if (muted) return;
      [600, 800, 1000].forEach((f, i) => tone(ctx, "square", f, f, 0.06, 0.08, i * 0.06));
    },
    playCountdown() {
      if (muted) return;
      tone(ctx, "square", 440, 440, 0.08, 0.15, 0);
    },
    playGo() {
      if (muted) return;
      tone(ctx, "square", 880, 880, 0.08, 0.2, 0);
    },
    playLapComplete() {
      if (muted) return;
      [500, 600, 700, 900].forEach((f, i) => tone(ctx, "square", f, f, 0.06, 0.1, i * 0.07));
    },
    playWin() {
      if (muted) return;
      [523, 659, 784, 1047].forEach((f, i) => tone(ctx, "square", f, f, 0.1, 0.15, i * 0.12));
    },
    playLose() {
      if (muted) return;
      tone(ctx, "sawtooth", 400, 100, 0.25, 0.2, 0);
    },
    setMuted(m: boolean) { muted = m; },
    dispose() {
      this.stopEngine();
      ctx.close();
    },
  };
}
