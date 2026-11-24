/**
 * Entirely procedural WebAudio: no audio files, no network, tiny footprint.
 * The filter opens as the world's time accelerates, so the mix itself
 * responds to the core mechanic.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneGain: GainNode | null = null;
  private started = false;
  private musicTimer: number | null = null;
  private stepIndex = 0;
  private intensity = 0;
  muted = false;

  init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.72;
    this.master.connect(ctx.destination);

    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.85;
    this.sfx.connect(this.master);

    this.music = ctx.createGain();
    this.music.gain.value = 0.13;
    this.music.connect(this.master);

    // shared white noise
    const len = Math.floor(ctx.sampleRate * 1.2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.72, this.ctx.currentTime, 0.03);
    }
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    slideTo?: number,
    delay = 0,
    dest?: AudioNode,
  ): void {
    if (!this.ctx || !this.sfx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest ?? this.sfx);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(
    dur: number,
    gain: number,
    freq: number,
    type: BiquadFilterType = 'lowpass',
    delay = 0,
    q = 0.8,
  ): void {
    if (!this.ctx || !this.sfx || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfx);
    src.start(t0, Math.random() * 0.4);
    src.stop(t0 + dur + 0.02);
  }

  private ready(): boolean {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return true;
  }

  shoot(): void {
    if (!this.ready()) return;
    this.noise(0.07, 0.2, 2600, 'highpass', 0, 0.7);
    this.tone(320, 0.09, 'square', 0.09, 90);
    this.tone(120, 0.07, 'sine', 0.12, 50);
  }

  enemyShoot(): void {
    if (!this.ready()) return;
    this.noise(0.06, 0.1, 1600, 'bandpass');
    this.tone(190, 0.12, 'sawtooth', 0.05, 70);
  }

  empty(): void {
    if (!this.ready()) return;
    this.tone(1400, 0.025, 'square', 0.05, 900);
    this.noise(0.03, 0.05, 3000, 'highpass');
  }

  parry(): void {
    if (!this.ready()) return;
    this.tone(880, 0.18, 'triangle', 0.12, 1750);
    this.tone(1320, 0.22, 'sine', 0.07, 2400, 0.02);
    this.noise(0.13, 0.08, 4200, 'highpass');
  }

  dash(): void {
    if (!this.ready()) return;
    this.noise(0.16, 0.13, 900, 'bandpass', 0, 1.4);
    this.tone(160, 0.14, 'sawtooth', 0.04, 420);
  }

  slash(hit = false): void {
    if (!this.ready()) return;
    this.noise(0.18, 0.12, 1900, 'bandpass', 0, 1.2);
    this.tone(440, 0.16, 'triangle', 0.05, 120);
    if (hit) {
      this.noise(0.12, 0.18, 760, 'lowpass', 0.01);
      this.tone(170, 0.22, 'sawtooth', 0.08, 46);
      this.tone(1318, 0.18, 'sine', 0.04, 1720, 0.01);
    }
  }

  special(): void {
    if (!this.ready()) return;
    this.tone(180, 0.5, 'sawtooth', 0.08, 780);
    this.tone(90, 0.6, 'sine', 0.2, 40, 0.06);
    this.noise(0.45, 0.18, 1300, 'bandpass', 0.02, 1.4);
    this.tone(1568, 0.5, 'triangle', 0.05, 2350, 0.12);
    this.tone(2093, 0.4, 'sine', 0.04, 2637, 0.2);
  }

  perfect(): void {
    if (!this.ready()) return;
    this.tone(1046, 0.16, 'triangle', 0.08, 1568);
    this.tone(1568, 0.22, 'sine', 0.06, 2093, 0.03);
    this.noise(0.15, 0.06, 5000, 'highpass');
  }

  impact(): void {
    if (!this.ready()) return;
    this.noise(0.05, 0.08, 2400, 'bandpass', 0, 2);
    this.tone(520, 0.05, 'square', 0.035, 240);
  }

  spawn(): void {
    if (!this.ready()) return;
    this.tone(72, 0.45, 'sine', 0.16, 34);
    this.tone(145, 0.3, 'sawtooth', 0.035, 60, 0.04);
    this.noise(0.35, 0.08, 500, 'lowpass', 0, 1.5);
  }

  kill(): void {
    if (!this.ready()) return;
    this.noise(0.2, 0.24, 1100);
    this.tone(140, 0.28, 'sine', 0.22, 38);
    this.tone(260, 0.1, 'square', 0.05, 120);
  }

  hit(): void {
    if (!this.ready()) return;
    this.tone(90, 0.5, 'sine', 0.4, 26);
    this.noise(0.35, 0.3, 500);
    this.tone(220, 0.22, 'sawtooth', 0.08, 55);
  }

  coin(): void {
    if (!this.ready()) return;
    this.tone(1046, 0.07, 'square', 0.05);
    this.tone(1568, 0.1, 'square', 0.04, undefined, 0.06);
  }

  step(): void {
    if (!this.ready()) return;
    this.noise(0.045, 0.035, 420, 'bandpass', 0, 1.2);
  }

  ui(): void {
    if (!this.ready()) return;
    this.tone(780, 0.035, 'square', 0.035, 560);
  }

  win(): void {
    if (!this.ready()) return;
    const notes = [392, 523.25, 659.25, 783.99];
    notes.forEach((n, i) => {
      this.tone(n, 0.32, 'triangle', 0.08, undefined, i * 0.1);
      this.tone(n / 2, 0.3, 'sine', 0.05, undefined, i * 0.1);
    });
    this.noise(0.4, 0.04, 5000, 'highpass', 0.1);
  }

  lose(): void {
    if (!this.ready()) return;
    this.tone(196, 0.5, 'sawtooth', 0.07, 98);
    this.tone(130, 0.8, 'sine', 0.12, 40, 0.15);
    this.noise(0.4, 0.1, 700, 'lowpass', 0.05);
  }

  purchase(): void {
    if (!this.ready()) return;
    this.tone(988, 0.08, 'square', 0.05);
    this.tone(1319, 0.12, 'square', 0.05, undefined, 0.08);
    this.tone(1760, 0.18, 'triangle', 0.06, undefined, 0.16);
    this.noise(0.25, 0.03, 6000, 'highpass', 0.12);
  }

  setIntensity(value: number): void {
    this.intensity = value;
    if (this.ctx && this.droneFilter) {
      const cutoff = 160 + value * 900;
      this.droneFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.18);
    }
    if (this.ctx && this.music) {
      const g = 0.1 + value * 0.06;
      this.music.gain.setTargetAtTime(g, this.ctx.currentTime, 0.25);
    }
  }

  startMusic(): void {
    if (!this.ready() || !this.ctx || !this.music) return;
    if (this.started) return;
    this.started = true;
    const ctx = this.ctx;
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 180;
    this.droneFilter.Q.value = 3.5;
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.075;
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.music);

    const freqs = [55, 82.41, 110.0];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? 'triangle' : 'sawtooth';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.25 : 0.5;
      osc.connect(g);
      g.connect(this.droneFilter!);
      osc.start();
    });

    // sparse pulse; intentionally simple so it never fights the game audio
    this.stepIndex = 0;
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || !this.music || !this.sfx) return;
      const t = this.ctx.currentTime;
      const beat = this.stepIndex % 8;
      if (beat % 2 === 0) {
        // kick
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.exponentialRampToValueAtTime(38, t + 0.14);
        g.gain.setValueAtTime(0.16, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        osc.connect(g);
        g.connect(this.music);
        osc.start(t);
        osc.stop(t + 0.24);
      }
      if (beat === 3 || beat === 7) {
        const src = this.ctx.createBufferSource();
        if (this.noiseBuffer) {
          src.buffer = this.noiseBuffer;
          const f = this.ctx.createBiquadFilter();
          f.type = 'highpass';
          f.frequency.value = 6500;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.035, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
          src.connect(f);
          f.connect(g);
          g.connect(this.music);
          src.start(t, Math.random() * 0.2);
          src.stop(t + 0.09);
        }
      }
      if (beat === 0 || beat === 6) {
        const scale = [220, 261.63, 329.63, 392, 440];
        const note = scale[(this.stepIndex + 2) % scale.length];
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = note;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.055, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        osc.connect(g);
        g.connect(this.music);
        osc.start(t);
        osc.stop(t + 0.6);
      }
      this.stepIndex++;
    }, 500);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.started = false;
    if (this.droneGain && this.ctx) {
      this.droneGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    }
  }
}

export const audio = new AudioEngine();
