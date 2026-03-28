// src/games/minesweeper/audio.ts

export interface MinesweeperAudio {
  playReveal: () => void;
  playCascade: () => void;
  playFlag: () => void;
  playUnflag: () => void;
  playChord: () => void;
  playMine: () => void;
  playWin: () => void;
  setMuted: (m: boolean) => void;
}

export function createMinesweeperAudio(): MinesweeperAudio {
  const ctx = new AudioContext();
  let muted = false;

  function tone(
    type: OscillatorType,
    freqStart: number,
    freqEnd: number,
    duration: number,
    gainPeak = 0.18,
    startDelay = 0,
  ) {
    if (muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    const t = ctx.currentTime + startDelay;
    osc.frequency.setValueAtTime(freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(gainPeak, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  function noise(duration: number, gainPeak = 0.12, startDelay = 0) {
    if (muted) return;
    const bufSize = Math.ceil(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    src.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime + startDelay;
    gain.gain.setValueAtTime(gainPeak, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.start(t);
    src.stop(t + duration + 0.01);
  }

  return {
    // Short blip when revealing a single cell
    playReveal() {
      tone("square", 440, 620, 0.055, 0.14);
    },

    // Ascending sweep when cascade opens many cells
    playCascade() {
      tone("square", 280, 900, 0.18, 0.16);
    },

    // Metallic ping when placing a shield/flag
    playFlag() {
      tone("triangle", 700, 700, 0.075, 0.2);
    },

    // Lower ping when removing a shield/flag
    playUnflag() {
      tone("triangle", 440, 440, 0.055, 0.15);
    },

    // Two quick blips for chord reveal
    playChord() {
      tone("square", 500, 500, 0.04, 0.12, 0);
      tone("square", 620, 620, 0.04, 0.12, 0.055);
    },

    // Noise burst + low rumble when hitting a mine
    playMine() {
      noise(0.38, 0.22);
      tone("sine", 80, 40, 0.38, 0.25);
    },

    // C4→E4→G4→C5 victory arpeggio
    playWin() {
      const notes = [261.63, 329.63, 392.0, 523.25];
      notes.forEach((freq, i) => {
        tone("square", freq, freq, 0.11, 0.15, i * 0.12);
      });
    },

    setMuted(m: boolean) {
      muted = m;
    },
  };
}
