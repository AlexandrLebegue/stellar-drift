// Keyboard + mouse input, keyed by physical position (event.code) so
// QWERTY WASD and AZERTY ZQSD both work, and Q/E (physical) are free
// for roll on both layouts.
export interface FlightInput {
  pitch: number;
  yaw: number;
  roll: number;
  throttleIn: number;
  scan: boolean;
  jump: boolean;
  map: boolean;
  cam: boolean;
  confirm: boolean;
  back: boolean;
}

export class Input {
  private keys = new Set<string>();
  private justPressed = new Set<string>();
  private mouseDown = false;
  touchCount = 0;
  readonly isTouch =
    'ontouchstart' in window || navigator.maxTouchPoints > 0;

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (!e.repeat) this.justPressed.add(e.code);
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });
    window.addEventListener('mousedown', () => (this.mouseDown = true));
    window.addEventListener('mouseup', () => (this.mouseDown = false));
  }

  down(...codes: string[]): boolean {
    return codes.some((c) => this.keys.has(c));
  }

  pressed(...codes: string[]): boolean {
    return codes.some((c) => this.justPressed.has(c));
  }

  endFrame() {
    this.justPressed.clear();
  }

  get mouseHeld(): boolean {
    return this.mouseDown;
  }

  flight(): FlightInput {
    let pitch = 0;
    let yaw = 0;
    let roll = 0;
    if (this.down('KeyW')) pitch += 1;
    if (this.down('KeyS')) pitch -= 1;
    if (this.down('KeyA')) yaw += 1;
    if (this.down('KeyD')) yaw -= 1;
    if (this.down('KeyQ')) roll += 1;
    if (this.down('KeyE')) roll -= 1;
    return {
      pitch,
      yaw,
      roll,
      throttleIn:
        (this.down('ShiftLeft', 'ShiftRight') ? 1 : 0) -
        (this.down('ControlLeft', 'ControlRight') ? 1 : 0),
      scan: this.down('Space') || this.mouseDown,
      jump: this.pressed('KeyJ'),
      map: this.pressed('KeyM'),
      cam: this.pressed('KeyC'),
      confirm: this.pressed('Enter'),
      back: this.pressed('Escape'),
    };
  }
}
