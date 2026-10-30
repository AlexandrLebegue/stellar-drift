// Procedural sound effects, all synthesized in WebAudio (no samples).
// The AudioContext is created lazily on first playback, which always
// follows a user gesture (click / touch / key).
class SfxImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private lastBlip = 0;
  muted = false;

  private ensure(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private out(): GainNode | null {
    const c = this.ensure();
    return c ? this.master : null;
  }

  private noise(ctx: AudioContext, dur: number): AudioBuffer {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
    if (m) this.stopEngine();
  }

  // short UI click
  ui() {
    const c = this.ensure();
    if (!c || !this.master) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(700, t);
    o.frequency.exponentialRampToValueAtTime(320, t + 0.05);
    const g = c.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.08);
  }

  // repeating blip while a scan is in progress (called every frame)
  scanTick(progress: number) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    if (t - this.lastBlip < 0.13) return;
    this.lastBlip = t;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(400 + progress * 800, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.1);
  }

  // bright two-tone chime when a scan completes
  scanDone() {
    const c = this.ensure();
    if (!c || !this.master) return;
    const t = c.currentTime;
    [880, 1320].forEach((f, i) => {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.15, t + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.35);
      o.connect(g).connect(this.master!);
      o.start(t + i * 0.09);
      o.stop(t + i * 0.09 + 0.4);
    });
  }

  // hyperspace jump: rising noise whoosh over ~2.5 s
  jump() {
    const c = this.ensure();
    if (!c || !this.master) return;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noise(c, 2.6);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(120, t);
    bp.frequency.exponentialRampToValueAtTime(3200, t + 1.8);
    bp.frequency.exponentialRampToValueAtTime(200, t + 2.6);
    const g = c.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 1.0);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 2.6);
  }

  // docking: low thump + metallic tick
  dock() {
    const c = this.ensure();
    if (!c || !this.master) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
    const g = c.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.3);
    const n = c.createBufferSource();
    n.buffer = this.noise(c, 0.08);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.15, t + 0.12);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    n.connect(hp).connect(g2).connect(this.master);
    n.start(t + 0.12);
  }

  // failed docking: crunch
  crash() {
    const c = this.ensure();
    if (!c || !this.master) return;
    const t = c.currentTime;
    const n = c.createBufferSource();
    n.buffer = this.noise(c, 0.4);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3000, t);
    lp.frequency.exponentialRampToValueAtTime(150, t + 0.4);
    const g = c.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    n.connect(lp).connect(g).connect(this.master);
    n.start(t);
  }

  // continuous engine hum, pitch/volume follow throttle
  engine(throttle: number, active: boolean) {
    const c = this.ensure();
    if (!c || !this.master) return;
    if (active && !this.muted) {
      if (!this.engineOsc) {
        this.engineOsc = c.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc2 = c.createOscillator();
        this.engineOsc2.type = 'triangle';
        this.engineFilter = c.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.value = 300;
        this.engineGain = c.createGain();
        this.engineGain.gain.value = 0;
        this.engineOsc.connect(this.engineFilter);
        this.engineOsc2.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain).connect(this.master);
        this.engineOsc.start();
        this.engineOsc2.start();
      }
      const t = c.currentTime;
      const f = 40 + throttle * 90;
      this.engineOsc.frequency.setTargetAtTime(f, t, 0.1);
      this.engineOsc2!.frequency.setTargetAtTime(f * 1.007, t, 0.1);
      this.engineFilter!.frequency.setTargetAtTime(200 + throttle * 900, t, 0.1);
      this.engineGain!.gain.setTargetAtTime(0.02 + throttle * 0.08, t, 0.1);
    } else if (this.engineGain) {
      this.engineGain.gain.setTargetAtTime(0, c.currentTime, 0.1);
    }
  }

  stopEngine() {
    if (this.engineGain && this.ctx) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    if (this.engineOsc && this.ctx) {
      const o = this.engineOsc;
      const o2 = this.engineOsc2;
      setTimeout(() => {
        try {
          o.stop();
          o2?.stop();
        } catch {
          /* already stopped */
        }
      }, 300);
      this.engineOsc = null;
      this.engineOsc2 = null;
    }
  }
}

// shared singleton so UI modules can play one-shot effects
export const sfx = new SfxImpl();
