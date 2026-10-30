export interface HudSnapshot {
  system: string;
  credits: number;
  speed: number;
  throttle: number;
  fuel: number;
  hull: number;
  targetName?: string;
  targetDist?: number;
}

// DOM-based retro-futurist HUD (amber on dark, monospace, scanlines).
export class HUD {
  private root: HTMLElement;
  private el: Record<string, HTMLElement> = {};
  private msgTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.root = document.getElementById('hud')!;
    this.root.innerHTML = [
      '<div class="panel tl">',
      '  <div class="lbl" id="hud-syslbl">SYSTÈME</div><div id="hud-sys">—</div>',
      '  <div id="hud-cred">CR 0</div>',
      '</div>',
      '<div class="panel tr">',
      '  <div class="lbl">CIBLE</div><div id="hud-tgt">—</div><div id="hud-dist">—</div>',
      '</div>',
      '<div class="panel bl">',
      '  <div>SPD <b id="hud-spd">000</b></div>',
      '  <div>THR <b id="hud-thr">00</b>%</div>',
      '  <div>FUEL <span class="bar"><i id="hud-fuel"></i></span></div>',
      '  <div>HULL <span class="bar"><i id="hud-hull"></i></span></div>',
      '</div>',
      '<div id="hud-reticle"><i></i><i></i><i></i><i></i></div>',
      '<div id="hud-scanbar"><i></i></div>',
      '<div id="hud-msg"></div>',
      '<button id="hud-mute" class="tbtninline">SON: ON</button>',
    ].join('\n');
    for (const id of [
      'hud-sys', 'hud-cred', 'hud-tgt', 'hud-dist',
      'hud-spd', 'hud-thr', 'hud-fuel', 'hud-hull', 'hud-msg',
    ]) {
      this.el[id] = document.getElementById(id)!;
    }
  }

  show(on: boolean) {
    this.root.style.display = on ? '' : 'none';
  }

  update(s: HudSnapshot) {
    this.el['hud-sys'].textContent = s.system;
    this.el['hud-cred'].textContent = 'CR ' + Math.floor(s.credits).toString().padStart(6, '0');
    this.el['hud-spd'].textContent = Math.round(s.speed).toString().padStart(3, '0');
    this.el['hud-thr'].textContent = Math.round(s.throttle * 100).toString().padStart(2, '0');
    (this.el['hud-fuel'] as HTMLElement).style.width = Math.max(0, Math.min(100, s.fuel)) + '%';
    (this.el['hud-hull'] as HTMLElement).style.width = Math.max(0, Math.min(100, s.hull)) + '%';
    this.el['hud-tgt'].textContent = s.targetName ?? '—';
    this.el['hud-dist'].textContent =
      s.targetDist !== undefined ? Math.round(s.targetDist).toString().padStart(5, '0') + ' u' : '—';
  }

  // scan progress 0..1, or null to hide
  setScan(p: number | null) {
    const bar = document.getElementById('hud-scanbar')!;
    if (p === null) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'block';
    (bar.firstElementChild as HTMLElement).style.width = Math.round(p * 100) + '%';
  }

  flash(msg: string, ms = 3000) {
    const el = this.el['hud-msg'];
    el.textContent = msg;
    if (this.msgTimer) clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => (el.textContent = ''), ms);
  }
}
