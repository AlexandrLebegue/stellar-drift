import { RNG } from '../core/prng';
import type { StarVisual } from './skybox';

export type StarType = 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

// 1 u ≈ 637 km : rayon Terre = 10 u, rayon Soleil (G) = 109 R⊕ ≈ 1090 u.
export const SUN_RADIUS = 1090;

export interface StarDef {
  type: StarType;
  color: number;
  radius: number; // u, absolu
}

export interface SystemDef {
  id: string;
  name: string;
  x: number;
  z: number;
  star: StarDef;
  seed: number;
}

const STAR_TABLE: Record<StarType, { color: number; rel: [number, number] }> = {
  B: { color: 0x9db4ff, rel: [2.4, 3.0] },
  A: { color: 0xeef2ff, rel: [1.6, 1.9] },
  F: { color: 0xf6f0dc, rel: [1.15, 1.3] },
  G: { color: 0xffdf9e, rel: [0.95, 1.05] },
  K: { color: 0xffb56b, rel: [0.65, 0.8] },
  M: { color: 0xff8a5c, rel: [0.25, 0.35] },
};

// Visual parameters for a star (color/glow/light) derived from its type.
export function starVisual(star: StarDef): StarVisual {
  return {
    color: star.color,
    radius: star.radius,
    glow: [255, 216, 150],
    light: 2.5,
  };
}

const SYL_A = ['ka', 'vel', 'or', 'tha', 'ru', 'en', 'do', 'ma', 'ri', 'xa', 'no', 'ti', 'sa', 'lu', 'vo', 'ba', 'ne', 'ze'];
const SYL_B = ['ar', 'eth', 'un', 'os', 'ix', 'or', 'an', 'il', 'en', 'ur', 'ak', 'os', 'ir', 'am', 'on', 'et', 'ys', 'al'];

// Fuel cost of a jump, in percent, from the map distance.
export function jumpCost(dist: number): number {
  return Math.min(30, 3 + dist * 0.15);
}

export function genName(rng: RNG): string {
  const parts: string[] = [];
  const n = rng.chance(0.5) ? 2 : 3;
  for (let i = 0; i < n; i++) {
    parts.push((i % 2 ? SYL_B : SYL_A)[rng.int(0, i % 2 ? SYL_B.length - 1 : SYL_A.length - 1)]);
  }
  const s = parts.join('');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Deterministic galaxy: N systems on a disc, denser toward the core.
export class Galaxy {
  readonly systems: SystemDef[] = [];

  constructor(public seed: number, count = 120) {
    const rng = new RNG(seed);
    for (let i = 0; i < count; i++) {
      const a = rng.f() * Math.PI * 2;
      const d = Math.pow(rng.f(), 0.6) * 40;
      const types = Object.keys(STAR_TABLE) as StarType[];
      const t = rng.pick(types);
      const st = STAR_TABLE[t];
      this.systems.push({
        id: 'sys' + i,
        name: genName(rng),
        x: Math.cos(a) * d,
        z: Math.sin(a) * d,
        star: {
          type: t,
          color: st.color,
          radius: Math.round(SUN_RADIUS * rng.range(st.rel[0], st.rel[1]) * 10) / 10,
        },
        seed: (seed ^ Math.imul(i + 13, 0x9e3779b9)) >>> 0,
      });
    }
  }

  byId(id: string): SystemDef | undefined {
    return this.systems.find((s) => s.id === id);
  }
}
