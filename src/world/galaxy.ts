import { RNG } from '../core/prng';

export type StarType = 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

export interface StarDef {
  type: StarType;
  color: number;
  radius: number;
}

export interface SystemDef {
  id: string;
  name: string;
  x: number;
  z: number;
  star: StarDef;
  seed: number;
}

const STAR_TABLE: Record<StarType, { color: number; radius: number }> = {
  B: { color: 0x9db4ff, radius: 1.3 },
  A: { color: 0xeef2ff, radius: 1.15 },
  F: { color: 0xf6f0dc, radius: 1.05 },
  G: { color: 0xffdf9e, radius: 1.0 },
  K: { color: 0xffb56b, radius: 0.95 },
  M: { color: 0xff8a5c, radius: 0.85 },
};

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
        star: { type: t, color: st.color, radius: st.radius },
        seed: (seed ^ Math.imul(i + 13, 0x9e3779b9)) >>> 0,
      });
    }
  }

  byId(id: string): SystemDef | undefined {
    return this.systems.find((s) => s.id === id);
  }
}
