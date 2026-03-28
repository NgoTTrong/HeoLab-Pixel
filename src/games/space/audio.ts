export interface SpaceAudio {
  playShoot(): void;
  playExplosion(): void;
  playHit(): void;
  playPowerUp(): void;
  playBossDie(): void;
  playExtraLife(): void;
  playComboUp(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}

export function createSpaceAudio(): SpaceAudio {
  let ctx: AudioContext | null = null;
  let muted = false;

  function getCtx(): AudioContext {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq: number, endFreq: number, dur: number, type: OscillatorType = "square", vol = 0.18, delay = 0) {
    if (muted) return;
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = type;
      const t = c.currentTime + delay;
      osc.frequency.setValueAtTime(freq, t);
      if (endFreq !== freq) osc.frequency.linearRampToValueAtTime(endFreq, t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      osc.start(t); osc.stop(t + dur);
    } catch { /* ignore AudioContext errors */ }
  }

  function noise(dur: number, vol = 0.2, delay = 0) {
    if (muted) return;
    try {
      const c = getCtx();
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      const gain = c.createGain();
      src.connect(gain); gain.connect(c.destination);
      const t = c.currentTime + delay;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      src.start(t);
    } catch { /* ignore */ }
  }

  return {
    playShoot()    { tone(700, 300, 0.08, "square", 0.12); },
    playExplosion(){ noise(0.18, 0.22); tone(120, 40, 0.18, "sawtooth", 0.14); },
    playHit()      { tone(180, 70, 0.13, "square", 0.17); },
    playPowerUp()  { [261, 330, 392, 523].forEach((f, i) => tone(f, f, 0.09, "sine", 0.18, i * 0.075)); },
    playBossDie()  { noise(0.5, 0.32); [180, 130, 90, 55].forEach((f, i) => tone(f, f * 0.5, 0.14, "sawtooth", 0.24, i * 0.1)); },
    playExtraLife(){ [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.09, "sine", 0.2, i * 0.08)); },
    playComboUp()  { tone(500, 850, 0.09, "square", 0.13); },
    setMuted(m)    { muted = m; },
    isMuted()      { return muted; },
  };
}
