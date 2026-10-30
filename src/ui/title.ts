// Full-screen DOM overlays: title and pause.
export class Screens {
  private titleEl: HTMLElement;
  private pauseEl: HTMLElement;

  constructor(
    onStart: () => void,
    onResume: () => void,
    extra = '',
    onNewGame?: () => void,
  ) {
    const ui = document.getElementById('ui-root')!;
    this.titleEl = this.mk(
      ui,
      'STELLAR DRIFT',
      'JEU SPATIAL — RENDU PS1',
      'APPUYEZ ENTRÉE — TOUCHEZ L\u2019ÉCRAN',
      onStart,
      extra,
    );
    this.pauseEl = this.mk(ui, 'PAUSE', '', 'ENTRÉE — REPRENDRE', onResume);
    this.pauseEl.style.display = 'none';
    if (onNewGame) {
      const b = document.createElement('button');
      b.className = 'tbtninline';
      b.textContent = 'NOUVEAU JEU';
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        onNewGame();
      });
      b.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          onNewGame();
        },
        { passive: false },
      );
      this.pauseEl.appendChild(b);
    }
  }

  private mk(
    ui: HTMLElement,
    h1: string,
    sub: string,
    blink: string,
    cb: () => void,
    extra = '',
  ): HTMLElement {
    const el = document.createElement('div');
    el.className = 'screen';
    el.innerHTML = [
      '<h1>' + h1 + '</h1>',
      sub ? '<p>' + sub + '</p>' : '',
      blink ? '<p class="blink">' + blink + '</p>' : '',
      extra ? '<p class="tiny">' + extra + '</p>' : '',
      '<p class="tiny">v0.1 — prototype</p>',
    ].join('');
    el.addEventListener('click', cb);
    el.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        cb();
      },
      { passive: false },
    );
    ui.appendChild(el);
    return el;
  }

  showTitle(on: boolean) {
    this.titleEl.style.display = on ? 'flex' : 'none';
  }

  showPause(on: boolean) {
    this.pauseEl.style.display = on ? 'flex' : 'none';
  }
}
