import { RNG } from '../core/prng';
import type { StationType } from '../world/station';

export interface Good {
  id: string;
  name: string;
  base: number;
}

// 12 trade goods. Prices per station derive from a deterministic roll
// (station seed + type) plus a per-docking random walk (supply/demand).
export const GOODS: Good[] = [
  { id: 'cacao', name: 'Cacao', base: 60 },
  { id: 'cafe', name: 'Café', base: 75 },
  { id: 'vin', name: 'Vin', base: 110 },
  { id: 'fer', name: 'Minerai de fer', base: 45 },
  { id: 'silicates', name: 'Silicates', base: 40 },
  { id: 'eau', name: 'Eau glacée', base: 35 },
  { id: 'methane', name: 'Méthane liquide', base: 90 },
  { id: 'or', name: 'Or', base: 420 },
  { id: 'diamants', name: 'Diamants', base: 680 },
  { id: 'rares', name: 'Liant rare', base: 380 },
  { id: 'meds', name: 'Médicaments', base: 240 },
  { id: 'artefacts', name: 'Artefacts archéo', base: 540 },
];

const TYPE_MOD: Record<StationType, number> = {
  hub: 1.0,
  marche: 1.15,
  raffinerie: 0.85,
  'avant-poste': 0.95,
};

export class Market {
  prices: Record<string, number> = {};

  constructor(stationSeed: number, type: StationType) {
    const rng = new RNG(stationSeed ^ 0x5ec11);
    for (const g of GOODS) {
      let p = g.base * rng.range(0.7, 1.4) * TYPE_MOD[type];
      // supply/demand random walk, clamped 50%..180% of base
      const drift = 1 + (rng.f() - 0.5) * 0.24;
      p = Math.max(g.base * 0.5, Math.min(g.base * 1.8, p * drift));
      this.prices[g.id] = Math.round(p / 5) * 5;
    }
  }

  // called on every docking: prices drift a bit
  drift() {
    const rng = new RNG((Date.now() ^ 0xbeef) >>> 0);
    for (const g of GOODS) {
      const d = 1 + (rng.f() - 0.5) * 0.12;
      this.prices[g.id] = Math.max(
        Math.round(g.base * 0.5 / 5) * 5,
        Math.min(Math.round(g.base * 1.8 / 5) * 5, Math.round((this.prices[g.id] * d) / 5) * 5),
      );
    }
  }
}
