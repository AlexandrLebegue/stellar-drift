import * as THREE from 'three';
import type { ScanRecord, Composition, PlanetType } from '../core/types';

export interface ScanTarget {
  id: string;
  name: string;
  type: PlanetType;
  composition: Composition;
  habitability: number;
  scienceValue: number;
  position: THREE.Vector3;
}

// Hold-to-scan mechanic: target must stay in the forward cone and within
// range; progress decays when released or target lost. On completion the
// record is emitted once (first scan) and never again for that planet.
export class Scanner {
  progress = 0;
  target: ScanTarget | null = null;
  private tmpA = new THREE.Vector3();
  private tmpB = new THREE.Vector3();

  constructor(
    private range: number,
    private time: number,
    private onDone: (rec: ScanRecord, target: ScanTarget) => void,
  ) {}

  // re-tune after ship/module changes
  setParams(range: number, time: number) {
    this.range = range;
    this.time = time;
  }

  // targets: candidate planets with world positions; already scanned are skipped
  update(dt: number, holding: boolean, shipPos: THREE.Vector3, shipFwd: THREE.Vector3, targets: ScanTarget[]) {
    this.target = null;
    if (holding) {
      let best: ScanTarget | null = null;
      let bestD = Infinity;
      for (const t of targets) {
        this.tmpA.copy(t.position).sub(shipPos);
        const d = this.tmpA.length();
        if (d > this.range || d < 1) continue;
        this.tmpA.divideScalar(d);
        if (this.tmpA.dot(shipFwd) > 0.99 && d < bestD) {
          best = t;
          bestD = d;
        }
      }
      this.target = best;
      if (best) {
        this.progress = Math.min(1, this.progress + dt / this.time);
        if (this.progress >= 1) {
          this.progress = 0;
          this.onDone(this.makeRecord(best), best);
        }
      } else {
        this.progress = Math.max(0, this.progress - dt / this.time);
      }
    } else {
      this.progress = Math.max(0, this.progress - dt / (this.time / 2));
    }
  }

  // Sell price: science value boosted by rare metals, flat 50% bonus for
  // being the first discoverer (single player: always first).
  makeRecord(t: ScanTarget): ScanRecord {
    const rareBoost = 1 + t.composition.rares / 50;
    const price = Math.round((t.scienceValue * rareBoost * 1.5) / 10) * 10;
    return {
      planetId: t.id,
      systemId: '',
      name: t.name,
      type: t.type,
      composition: { ...t.composition },
      habitability: t.habitability,
      scienceValue: t.scienceValue,
      price,
      scannedAt: Date.now(),
    };
  }
}
