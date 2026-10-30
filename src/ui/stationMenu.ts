import { GOODS, Market } from '../economy/market';
import type { Game } from '../core/state';
import type { StationDef } from '../world/station';

export interface MenuContext {
  game: Game;
  market: Market;
  station: StationDef;
  hold: number;
  fuel: number;
  hull: number;
  onFuel: (pct: number, cost: number) => void;
  onRepair: (pct: number, cost: number) => void;
  onExit: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  hub: 'PORT HUB',
  marche: 'STATION MARCHANDE',
  raffinerie: 'RAFFINERIE',
  'avant-poste': 'AVANT-POSTE',
};

const TABS = ['MARCHÉ', 'CARTOGRAPHIE', 'CARBURANT', 'CHANTIER', 'ÉQUIPEMENT'] as const;
type Tab = (typeof TABS)[number];

// Full-screen station menu: market, cartography (sell scans), fuel/repair,
// shipyard & equipment (filled in stage 7).
export class StationMenu {
  el: HTMLElement;
  ctx: MenuContext;
  private body: HTMLElement;
  private tabbar: HTMLElement;
  private tab: Tab = 'MARCHÉ';

  constructor(ctx: MenuContext) {
    this.ctx = ctx;
    this.el = document.createElement('div');
    this.el.className = 'station-menu';
    this.el.innerHTML = [
      '<div class="sm-head">',
      '  <div class="sm-title" id="sm-title"></div>',
      '  <div class="sm-sub" id="sm-sub"></div>',
      '  <button id="sm-exit" class="tbtninline">UNDOCK — QUITTER</button>',
      '</div>',
      '<div class="sm-tabs" id="sm-tabs"></div>',
      '<div class="sm-body" id="sm-body"></div>',
    ].join('');
    document.getElementById('ui-root')!.appendChild(this.el);
    this.tabbar = this.el.querySelector('#sm-tabs') as HTMLElement;
    this.body = this.el.querySelector('#sm-body') as HTMLElement;
    this.el.querySelector('#sm-exit')!.addEventListener('click', () => this.ctx.onExit());
    this.el.querySelector('#sm-exit')!.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        this.ctx.onExit();
      },
      { passive: false },
    );
    for (const t of TABS) {
      const b = document.createElement('button');
      b.className = 'sm-tab';
      b.textContent = t;
      b.addEventListener('click', () => {
        this.tab = t;
        this.render();
      });
      b.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          this.tab = t;
          this.render();
        },
        { passive: false },
      );
      this.tabbar.appendChild(b);
    }
    this.render();
  }

  show() {
    this.el.style.display = 'block';
    this.render();
  }

  hide() {
    this.el.style.display = 'none';
  }

  private hdr() {
    const { game, station } = this.ctx;
    this.el.querySelector('#sm-title')!.textContent = station.name;
    this.el.querySelector('#sm-sub')!.textContent =
      TYPE_LABEL[station.type] +
      ' — CR ' +
      Math.floor(game.player.credits) +
      ' — SOUTE ' +
      this.cargoCount() +
      '/' +
      this.ctx.hold +
      ' — FUEL ' +
      Math.round(this.ctx.fuel) +
      '% — HULL ' +
      Math.round(this.ctx.hull) +
      '%';
  }

  private cargoCount(): number {
    return Object.values(this.ctx.game.player.cargo).reduce((a, b) => a + b, 0);
  }

  render() {
    this.hdr();
    Array.from(this.tabbar.children).forEach((b, i) => {
      (b as HTMLElement).classList.toggle('active', TABS[i] === this.tab);
    });
    if (this.tab === 'MARCHÉ') this.renderMarket();
    else if (this.tab === 'CARTOGRAPHIE') this.renderCarto();
    else if (this.tab === 'CARBURANT') this.renderFuel();
    else this.renderSoon();
  }

  private row(
    label: string,
    price: number,
    extra: string,
    buyDisabled: boolean,
    onBuy: () => void,
    onSell?: () => void,
  ) {
    const r = document.createElement('div');
    r.className = 'sm-row';
    r.innerHTML =
      '<span class="sm-name">' + label + '</span>' +
      '<span class="sm-price">' + price + ' CR</span>' +
      '<span class="sm-extra">' + extra + '</span>' +
      '<button class="tbtninline' + (buyDisabled ? ' disabled' : '') + '">ACHETER</button>' +
      '<button class="tbtninline' + (onSell ? '' : ' disabled') + '">VENDRE</button>';
    const [b, s] = Array.from(r.querySelectorAll('button'));
    b.addEventListener('click', onBuy);
    b.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onBuy();
    }, { passive: false });
    if (onSell) {
      s.addEventListener('click', onSell);
      s.addEventListener('touchstart', (e) => {
        e.preventDefault();
        onSell();
      }, { passive: false });
    }
    return r;
  }

  private renderMarket() {
    const { game, market, hold } = this.ctx;
    this.body.innerHTML = '';
    const count = this.cargoCount();
    for (const g of GOODS) {
      const held = game.player.cargo[g.id] ?? 0;
      const price = market.prices[g.id];
      const canBuy = game.player.credits >= price && count < hold;
      this.body.appendChild(
        this.row(
          g.name,
          price,
          '×' + held,
          !canBuy,
          () => {
            if (game.player.credits >= price && count < hold) {
              game.player.credits -= price;
              game.player.cargo[g.id] = (game.player.cargo[g.id] ?? 0) + 1;
              game.save();
              this.render();
            }
          },
          held > 0
            ? () => {
                if (game.player.cargo[g.id] > 0) {
                  game.player.cargo[g.id]--;
                  if (game.player.cargo[g.id] === 0) delete game.player.cargo[g.id];
                  game.player.credits += price;
                  game.save();
                  this.render();
                }
              }
            : undefined,
        ),
      );
    }
  }

  private renderCarto() {
    const { game } = this.ctx;
    this.body.innerHTML = '';
    const scans = Object.values(game.player.scans);
    if (scans.length === 0) {
      const p = document.createElement('p');
      p.className = 'sm-empty';
      p.textContent = 'AUCUNE DONNÉE — SCANNER UNE PLANÈTE (ESPACE / SCAN)';
      this.body.appendChild(p);
      return;
    }
    for (const rec of scans) {
      this.body.appendChild(
        this.row(
          rec.name + ' (' + rec.type + ')',
          rec.price,
          'HAB ' + Math.round(rec.habitability * 100) + '%',
          true,
          () => {},
          () => {
            delete game.player.scans[rec.planetId];
            game.player.credits += rec.price;
            game.save();
            this.render();
          },
        ),
      );
    }
  }

  private renderFuel() {
    const { game } = this.ctx;
    this.body.innerHTML = '';
    const makeRow = (label: string, cost: number, cur: number, cb: (cost: number) => void) => {
      const r = document.createElement('div');
      r.className = 'sm-row';
      r.innerHTML =
        '<span class="sm-name">' + label + '</span>' +
        '<span class="sm-extra">' + Math.round(cur) + '%</span>' +
        '<button class="tbtninline">+10% — ' + cost + ' CR</button>';
      const b = r.querySelector('button')!;
      b.addEventListener('click', () => cb(cost));
      b.addEventListener('touchstart', (e) => {
        e.preventDefault();
        cb(cost);
      }, { passive: false });
      this.body.appendChild(r);
    };
    makeRow('CARBURANT', 25, this.ctx.fuel, (c) => {
      if (game.player.credits >= c) {
        game.player.credits -= c;
        this.ctx.onFuel(10, c);
        this.render();
      }
    });
    makeRow('COQUE (RÉPARATION)', 40, this.ctx.hull, (c) => {
      if (game.player.credits >= c) {
        game.player.credits -= c;
        this.ctx.onRepair(10, c);
        this.render();
      }
    });
  }

  private renderSoon() {
    this.body.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'sm-empty';
    p.textContent = this.tab + ' — ÉTAPE 7 : VAISSEAUX ET MODULES';
    this.body.appendChild(p);
  }
}
