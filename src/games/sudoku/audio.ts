import { tone } from "@/lib/audioUtils";

export interface SudokuAudio {
  playFill: () => void;
  playCorrect: () => void;
  playWrong: () => void;
  playClear: () => void;
  playWin: () => void;
  setMuted: (m: boolean) => void;
}

export function createSudokuAudio(): SudokuAudio {
  const ctx = new AudioContext();
  let muted = false;
  const ok = () => !muted;

  return {
    playFill()    { if (!ok()) return; tone(ctx, "square",   500, 500, 0.04, 0.10); },
    playCorrect() { if (!ok()) return; tone(ctx, "triangle", 800, 800, 0.09, 0.18); },
    playWrong()   { if (!ok()) return; tone(ctx, "sawtooth", 150, 100, 0.12, 0.14); },
    playClear()   { if (!ok()) return; tone(ctx, "square",   600, 200, 0.08, 0.10); },
    playWin()     { if (!ok()) return; [523,659,784,1047].forEach((f,i) => tone(ctx,"triangle",f,f,0.12,0.16,i*0.13)); },
    setMuted(m)   { muted = m; },
  };
}
