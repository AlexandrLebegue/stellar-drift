// Ambient music: 5 tracks played in random order with a 2 s crossfade.
// Uses two HTMLAudioElements (low memory, mobile friendly) mixed through
// a WebAudio master gain for mute/volume. Start is deferred until the
// first user gesture (browser autoplay policy).
export class MusicPlayer {
  private els: HTMLAudioElement[] = [];
  private cur = 0;
  private queue: number[] = [];
  private pos = 0;
  private master: GainNode | null = null;
  private ctx: AudioContext | null = null;
  private started = false;
  private advancing = false;
  private timer: number | null = null;
  muted = false;
  volume = 0.5;

  constructor(private sources: string[]) {
    for (let i = 0; i < 2; i++) {
      const el = new Audio();
      el.preload = 'auto';
      el.loop = true;
      this.els.push(el);
    }
  }

  start() {
    if (this.started) return;
    this.started = true;
    const AC =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume * 0.6;
      this.master.connect(this.ctx.destination);
      for (const el of this.els) this.ctx.createMediaElementSource(el).connect(this.master);
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    }
    this.watch();
    this.next(false);
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.applyGain();
  }

  setVolume(v: number) {
    this.volume = v;
    this.applyGain();
  }

  private applyGain() {
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume * 0.6;
  }

  private setQueue() {
    this.queue = this.sources.map((_, i) => i);
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
    this.pos = 0;
  }

  // advance to the next random track (fadeIn = true → crossfade)
  private next(fadeIn: boolean) {
    if (!this.sources.length) return;
    if (this.pos >= this.queue.length) this.setQueue();
    const src = this.sources[this.queue[this.pos++]];

    const out = this.els[this.cur];
    const inn = this.els[1 - this.cur];
    this.cur = 1 - this.cur;

    inn.src = src;
    try {
      void inn.play();
    } catch {
      /* not ready yet */
    }
    if (fadeIn) {
      this.ramp(inn, 0, 1, 2);
      this.ramp(out, 1, 0, 2);
      window.setTimeout(() => out.pause(), 2100);
    } else {
      inn.volume = 1;
      out.pause();
      out.volume = 1;
    }
  }

  private ramp(el: HTMLAudioElement, from: number, to: number, dur: number) {
    el.volume = from;
    const t0 = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / (dur * 1000));
      el.volume = from + (to - from) * t;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // watch the playing element and start a crossfade ~2 s before it loops
  private watch() {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => {
      const el = this.els[this.cur];
      if (!el.paused && el.duration > 0 && el.currentTime > el.duration - 2.2 && !this.advancing) {
        this.advancing = true;
        this.next(true);
        window.setTimeout(() => {
          this.advancing = false;
        }, 2400);
      }
    }, 400);
  }
}
