import type { Galaxy, SystemDef } from '../world/galaxy';
import { jumpCost, starLabel } from '../world/galaxy';

export function distTo(a: SystemDef, b: SystemDef): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function starColor(s: SystemDef, alpha: number): string {
  const c = s.star.color;
  return `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${alpha})`;
}

// Full-screen galaxy map: every system as a dot, jump-range ring around
// the current one, tap/click to select, SAUTER to confirm.
export class GalaxyMapUI {
  el: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  selected: SystemDef | null = null;
  private currentId: string;
  private onJump: (def: SystemDef) => void;
  private onBack: () => void;
  private jumpBtn: HTMLButtonElement;

  constructor(
    private galaxy: Galaxy,
    currentId: string,
    private range: number,
    private fuel: number,
    onJump: (def: SystemDef) => void,
    onBack: () => void,
  ) {
    this.onJump = onJump;
    this.onBack = onBack;
    this.currentId = currentId;
    this.el = document.createElement('div');
    this.el.className = 'galaxy-map';
    this.el.innerHTML = [
      '<div class="gm-head">',
      '  <div class="gm-title">CARTE GALACTIQUE</div>',
      '  <div class="gm-sub" id="gm-sub"></div>',
      '  <div class="gm-sel" id="gm-sel">SÉLECTIONNEZ UN SYSTÈME</div>',
      '  <div class="gm-btns">',
      '    <button id="gm-jump" class="tbtninline">SAUTER</button>',
      '    <button id="gm-back" class="tbtninline">RETOUR</button>',
      '  </div>',
      '</div>',
      '<canvas id="gm-canvas"></canvas>',
    ].join('');
    document.getElementById('ui-root')!.appendChild(this.el);
    this.canvas = this.el.querySelector('#gm-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.jumpBtn = this.el.querySelector('#gm-jump') as HTMLButtonElement;

    const current = galaxy.systems.find((s) => s.id === currentId) ?? galaxy.systems[0];
    this.el.querySelector('#gm-sub')!.textContent =
      'ACTUEL : ' + current.name + ' (' + starLabel(current.star.type) +
      ') — CARBURANT ' + Math.round(fuel) + '% — PORTÉE ' + range;

    this.jumpBtn.addEventListener('click', () => this.selected && this.onJump(this.selected));
    this.jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.selected && this.onJump(this.selected);
    }, { passive: false });
    const back = this.el.querySelector('#gm-back')!;
    back.addEventListener('click', this.onBack);
    back.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.onBack();
    }, { passive: false });

    const pick = (clientX: number, clientY: number) => {
      const r = this.canvas.getBoundingClientRect();
      const px = ((clientX - r.left) / r.width) * this.canvas.width;
      const py = ((clientY - r.top) / r.height) * this.canvas.height;
      let best: SystemDef | null = null;
      let bestD = 24;
      for (const s of this.galaxy.systems) {
        const [sx, sy] = this.toPx(s.x, s.z);
        const d = Math.hypot(sx - px, sy - py);
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
      if (best) {
        this.selected = best;
        this.render();
      }
    };
    this.canvas.addEventListener('click', (e) => pick(e.clientX, e.clientY));
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      pick(t.clientX, t.clientY);
    }, { passive: false });

    this.resize();
    this.render();
  }

  private toPx(x: number, z: number): [number, number] {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const m = 40;
    return [m + ((x + 45) / 90) * (w - 2 * m), m + ((z + 45) / 90) * (h - 2 * m)];
  }

  resize() {
    const r = this.el.getBoundingClientRect();
    this.canvas.width = Math.max(320, Math.floor(r.width));
    this.canvas.height = Math.max(200, Math.floor(r.height - 120));
  }

  show() {
    this.el.style.display = 'block';
    this.resize();
    this.render();
  }

  dispose() {
    this.el.remove();
  }

  render() {
    this.resize();
    const c = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    c.fillStyle = '#04060d';
    c.fillRect(0, 0, w, h);

    const curSys = this.galaxy.systems.find((s) => s.id === this.currentId) ?? this.galaxy.systems[0];
    const [cx, cy] = this.toPx(curSys.x, curSys.z);

    // jump range ring
    const [rx, ry] = this.toPx(curSys.x + this.range, curSys.z);
    c.strokeStyle = 'rgba(255,179,71,0.35)';
    c.setLineDash([6, 6]);
    c.beginPath();
    c.arc(cx, cy, Math.abs(rx - cx), 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);

    for (const s of this.galaxy.systems) {
      const [sx, sy] = this.toPx(s.x, s.z);
      const inRange = Math.hypot(s.x - curSys.x, s.z - curSys.z) <= this.range;
      if (s === this.selected) {
        c.fillStyle = '#ffd27a';
        c.beginPath();
        c.arc(sx, sy, 8, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = 'rgba(255,210,122,0.8)';
        c.beginPath();
        c.arc(sx, sy, 13, 0, Math.PI * 2);
        c.stroke();
      } else if (s === curSys) {
        c.fillStyle = '#ffb347';
        c.beginPath();
        c.arc(sx, sy, 6, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#ffb347';
        c.font = '12px monospace';
        c.fillText(s.name, sx + 10, sy - 8);
      } else if (inRange) {
        c.fillStyle = starColor(s, 0.95);
        c.beginPath();
        c.arc(sx, sy, 3, 0, Math.PI * 2);
        c.fill();
      } else {
        c.fillStyle = starColor(s, 0.4);
        c.beginPath();
        c.arc(sx, sy, 2, 0, Math.PI * 2);
        c.fill();
      }
    }

    // selection info + jump button state
    const sel = this.el.querySelector('#gm-sel')!;
    const jump = this.jumpBtn;
    if (this.selected) {
      const d = Math.hypot(
        this.selected.x - curSys.x,
        this.selected.z - curSys.z,
      );
      const cost = jumpCost(d);
      sel.textContent =
        'DEST : ' + this.selected.name + ' (' + starLabel(this.selected.star.type) +
        ') — ' + d.toFixed(1) + ' KLY — CARBURANT ' + cost.toFixed(1) + '%';
      const ok = d <= this.range && this.fuel >= cost;
      jump.disabled = !ok;
      jump.textContent = ok
        ? 'SAUTER (' + cost.toFixed(1) + '% FUEL)'
        : 'HORS PORTEE / FUEL INSUFFISANT';
    } else {
      sel.textContent = 'SÉLECTIONNEZ UN SYSTÈME EN PORTÉE';
      jump.disabled = true;
      jump.textContent = 'SAUTER';
    }
  }

}
