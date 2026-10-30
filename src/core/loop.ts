export type Tick = (dt: number) => void;

// requestAnimationFrame loop with a clamped delta-time.
export class GameLoop {
  private raf = 0;
  private last = 0;
  private running = false;

  constructor(
    private update: Tick,
    private render: () => void,
  ) {}

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const step = (t: number) => {
      if (!this.running) return;
      let dt = (t - this.last) / 1000;
      this.last = t;
      if (dt > 0.1) dt = 0.1;
      if (dt < 0) dt = 0;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
