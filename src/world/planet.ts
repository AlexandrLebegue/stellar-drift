import * as THREE from 'three';
import { RNG } from '../core/prng';
import { applyPS1 } from '../render/ps1';
import { makePlanetTexture, makeRingTexture } from '../render/textures';
import type { PlanetType, Composition } from '../core/types';

export type { PlanetType, Composition };

export interface PlanetData {
  id: string;
  name: string;
  type: PlanetType;
  radius: number;
  composition: Composition;
  habitability: number;
  scienceValue: number;
  hasRings: boolean;
  atmoColor: readonly number[] | null;
}

interface TypeSpec {
  base: readonly number[];
  accent: readonly number[];
  banded: boolean;
  rMin: number;
  rMax: number;
  baseComp: Composition;
  habit: [number, number];
  atmo: readonly number[] | null;
}

const SPECS: Record<PlanetType, TypeSpec> = {
  rocheuse: {
    base: [96, 84, 70], accent: [52, 44, 38], banded: false,
    rMin: 6, rMax: 16,
    baseComp: { fer: 32, silicates: 44, eau: 1, methane: 1, rares: 6, autre: 16 },
    habit: [0.0, 0.15], atmo: null,
  },
  glacee: {
    base: [205, 220, 235], accent: [130, 160, 200], banded: false,
    rMin: 7, rMax: 18,
    baseComp: { fer: 4, silicates: 12, eau: 58, methane: 18, rares: 3, autre: 5 },
    habit: [0.0, 0.1], atmo: [170, 200, 235],
  },
  gazeuse: {
    base: [195, 155, 110], accent: [110, 82, 62], banded: true,
    rMin: 26, rMax: 48,
    baseComp: { fer: 6, silicates: 8, eau: 10, methane: 52, rares: 14, autre: 10 },
    habit: [0.0, 0.02], atmo: [210, 180, 130],
  },
  ocean: {
    base: [42, 92, 160], accent: [130, 180, 215], banded: false,
    rMin: 9, rMax: 18,
    baseComp: { fer: 5, silicates: 10, eau: 76, methane: 3, rares: 4, autre: 2 },
    habit: [0.25, 0.7], atmo: [120, 180, 230],
  },
  lave: {
    base: [52, 34, 30], accent: [210, 92, 28], banded: false,
    rMin: 7, rMax: 14,
    baseComp: { fer: 56, silicates: 28, eau: 1, methane: 2, rares: 9, autre: 4 },
    habit: [0.0, 0.03], atmo: [200, 110, 60],
  },
  terrestre: {
    base: [46, 116, 64], accent: [140, 118, 82], banded: false,
    rMin: 10, rMax: 16,
    baseComp: { fer: 12, silicates: 26, eau: 50, methane: 2, rares: 5, autre: 5 },
    habit: [0.55, 0.95], atmo: [110, 170, 230],
  },
};

const TYPES: PlanetType[] = [
  'rocheuse', 'glacee', 'gazeuse', 'ocean', 'lave', 'terrestre',
];

function jitterComp(rng: RNG, base: Composition): Composition {
  const c: Composition = {
    fer: base.fer, silicates: base.silicates, eau: base.eau,
    methane: base.methane, rares: base.rares, autre: base.autre,
  };
  const keys = Object.keys(c) as (keyof Composition)[];
  for (const k of keys) {
    c[k] = Math.max(0, c[k] * rng.range(0.7, 1.3));
  }
  const sum = keys.reduce((s, k) => s + c[k], 0);
  for (const k of keys) c[k] = Math.round((c[k] / sum) * 100);
  return c;
}

// Deterministic per (system, index): ids stay stable across re-loads so
// saved scan data keeps matching the regenerated planet.
export function makePlanetData(
  rng: RNG,
  systemName: string,
  index: number,
  id: string,
): PlanetData {
  const type = rng.pick(TYPES);
  const spec = SPECS[type];
  const composition = jitterComp(rng, spec.baseComp);
  const radius = Math.round(rng.range(spec.rMin, spec.rMax) * 10) / 10;
  const habitability = Math.round(rng.range(spec.habit[0], spec.habit[1]) * 100) / 100;
  const scienceValue = Math.round(
    (400 + composition.rares * 120 + radius * 15 + rng.range(0, 600)) * (habitability > 0.4 ? 1.5 : 1),
  );
  return {
    id,
    name: systemName + ' ' + String.fromCharCode(65 + (index % 26)),
    type,
    radius,
    composition,
    habitability,
    scienceValue,
    hasRings: type === 'gazeuse' ? rng.chance(0.6) : rng.chance(0.12),
    atmoColor: spec.atmo,
  };
}

// Visual: textured sphere + optional ring + additive atmosphere rim shell.
export function makePlanetMesh(
  rng: RNG,
  data: PlanetData,
  snapRes: THREE.Vector2,
): THREE.Group {
  const spec = SPECS[data.type];
  const g = new THREE.Group();

  const tex = makePlanetTexture(rng, spec.base, spec.accent, spec.banded);
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  applyPS1(mat, snapRes);
  const segs = data.radius > 20 ? 28 : 20;
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(data.radius, segs, segs / 2), mat);
  g.add(sphere);

  if (data.hasRings) {
    const rtex = makeRingTexture(rng, [190, 170, 140]);
    const rmat = new THREE.MeshBasicMaterial({
      map: rtex,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    applyPS1(rmat, snapRes);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(data.radius * 1.4, data.radius * 2.2, 48),
      rmat,
    );
    ring.rotation.x = Math.PI / 2 - rng.range(0.05, 0.3);
    g.add(ring);
  }

  if (data.atmoColor) {
    const am = new THREE.MeshBasicMaterial({
      color: new THREE.Color(
        data.atmoColor[0] / 255,
        data.atmoColor[1] / 255,
        data.atmoColor[2] / 255,
      ),
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(data.radius * 1.07, segs, segs / 2),
      am,
    );
    g.add(shell);
  }

  return g;
}
