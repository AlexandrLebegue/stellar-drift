import { FlightInput } from './input';

// On-screen touch controls: dynamic virtual joystick (left zone) for
// pitch/yaw, thrust +/− buttons, and HYPERSPACE / SCAN (hold) / DOCK /
// camera buttons. Multi-touch by touch identifier; never scrolls/zooms
// the page (touch-action:none + preventDefault).
export class TouchControls {
  root: HTMLElement;
  private joyBase: HTMLElement;
  private joyKnob: HTMLElement;
  private joyId: number | null = null;
  private joyVec = { x: 0, y: 0 };
  private joyActive = false;
  private thrustUp = false;
  private thrustDown = false;
  private scanHeld = false;
  private jumpEdge = false;
  private superEdge = false;
  private camEdge = false;
  private dockEdge = false;
  private dockVisible = false;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'touch-ui';
    this.root.innerHTML = [
      '<div id="joy-base"><div id="joy-knob"></div></div>',
      '<div class="tbtn" id="btn-jump">HYPERSPACE</div>',
      '<div class="tbtn" id="btn-super">S-CRUISE</div>',
      '<div class="tbtn" id="btn-scan">SCAN</div>',
      '<div class="tbtn small" id="btn-up">THR+</div>',
      '<div class="tbtn small" id="btn-down">THR-</div>',
      '<div class="tbtn" id="btn-dock">DOCK</div>',
      '<div class="tbtn small" id="btn-cam">CAM</div>',
    ].join('');
    document.getElementById('ui-root')!.appendChild(this.root);
    this.root.style.display = 'none';

    this.joyBase = document.getElementById('joy-base')!;
    this.joyKnob = document.getElementById('joy-knob')!;

    // Joystick zone = left half of the screen (dynamic origin not needed:
    // knob is relative to the fixed base).
    this.root.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) {
          if (t.clientX < window.innerWidth * 0.45) {
            this.joyId = t.identifier;
            this.joyActive = true;
            this.updateJoy(t);
          }
        }
      },
      { passive: false },
    );
    this.root.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === this.joyId) this.updateJoy(t);
        }
      },
      { passive: false },
    );
    const endJoy = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.joyId) {
          this.joyId = null;
          this.joyActive = false;
          this.joyVec = { x: 0, y: 0 };
          this.joyKnob.style.transform = 'translate(-50%, -50%)';
        }
      }
    };
    this.root.addEventListener('touchend', endJoy);
    this.root.addEventListener('touchcancel', endJoy);

    this.bindHold('btn-up', 'up');
    this.bindHold('btn-down', 'down');
    this.bindHold('btn-scan', 'scan');
    this.bindEdge('btn-jump', 'jump');
    this.bindEdge('btn-super', 'super');
    this.bindEdge('btn-cam', 'cam');
    this.bindEdge('btn-dock', 'dock');
    this.setDockVisible(false);
  }

  private bindHold(id: string, which: 'up' | 'down' | 'scan') {
    const el = document.getElementById(id)!;
    el.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (which === 'up') this.thrustUp = true;
        else if (which === 'down') this.thrustDown = true;
        else this.scanHeld = true;
      },
      { passive: false },
    );
    const release = (e: TouchEvent) => {
      e.stopPropagation();
      if (which === 'up') this.thrustUp = false;
      else if (which === 'down') this.thrustDown = false;
      else this.scanHeld = false;
    };
    el.addEventListener('touchend', release);
    el.addEventListener('touchcancel', release);
  }

  private bindEdge(id: string, which: 'jump' | 'super' | 'cam' | 'dock') {
    const el = document.getElementById(id)!;
    el.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (which === 'jump') this.jumpEdge = true;
        else if (which === 'super') this.superEdge = true;
        else if (which === 'cam') this.camEdge = true;
        else this.dockEdge = true;
      },
      { passive: false },
    );
  }

  private updateJoy(t: Touch) {
    const r = this.joyBase.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const R = 60;
    let dx = t.clientX - cx;
    let dy = t.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    this.joyVec = { x: dx / R, y: dy / R };
    this.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  show(on: boolean) {
    this.root.style.display = on ? 'block' : 'none';
  }

  setDockVisible(b: boolean) {
    this.dockVisible = b;
    document.getElementById('btn-dock')!.style.visibility = b ? 'visible' : 'hidden';
  }

  get dockIsVisible(): boolean {
    return this.dockVisible;
  }

  // Merge result into a keyboard FlightInput (touch overrides when active).
  merge(fi: FlightInput): FlightInput {
    if (this.joyActive) {
      fi.pitch = -this.joyVec.y;
      fi.yaw = -this.joyVec.x;
      fi.roll = 0;
    }
    if (this.thrustUp || this.thrustDown) {
      fi.throttleIn = (this.thrustUp ? 1 : 0) - (this.thrustDown ? 1 : 0);
    }
    if (this.scanHeld) fi.scan = true;
    if (this.jumpEdge) fi.jump = true;
    if (this.superEdge) fi.supercruise = true;
    if (this.camEdge) fi.cam = true;
    if (this.dockEdge) fi.dock = true;
    return fi;
  }

  endFrame() {
    this.jumpEdge = false;
    this.superEdge = false;
    this.camEdge = false;
    this.dockEdge = false;
  }
}
