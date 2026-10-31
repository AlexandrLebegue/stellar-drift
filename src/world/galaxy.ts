import { RNG } from '../core/prng';
import type { StarVisual } from './skybox';

export type StarType = 'BD' | 'M' | 'K' | 'G' | 'F' | 'A' | 'B' | 'O' | 'RG' | 'WD' | 'PS';

// 1 u ≈ 637 km : rayon Terre = 10 u, rayon Soleil (G) = 109 R⊕ ≈ 1090 u.
export const SUN_RADIUS = 1090;

export interface StarDef {
  type: StarType;
  color: number;
  radius: number; // u, absolu
}

export type AnomalyKind = 'trou-noir' | 'trou-de-ver' | 'epave';

export interface AnomalyDef {
  kind: AnomalyKind;
  // wormhole only: id of the (distant, deterministic) destination system
  target?: string;
}

export function anomalyLabel(kind: AnomalyKind): string {
  return kind === 'trou-noir'
    ? 'Trou noir'
    : kind === 'trou-de-ver'
      ? 'Trou de ver'
      : 'Épave extraterrestre';
}

export interface SystemDef {
  id: string;
  name: string;
  x: number;
  z: number;
  star: StarDef;
  seed: number;
  // rare phenomena (~2 % of systems each), deterministic per galaxy seed
  anomaly?: AnomalyDef;
}

// Spectral types with real radius ratios (Sun = 1), plausible colors,
// relative luminosity, and population weights (red dwarfs most common,
// giants and compact objects rare).
interface StarSpec {
  color: number;
  rel: [number, number];
  lum: number;
  light: number;
  glow: [number, number, number];
  glowScale: number;
  weight: number;
  label: string;
}

const STAR_TABLE: Record<StarType, StarSpec> = {
  BD: { color: 0x8a4258, rel: [0.08, 0.12], lum: 0.02, light: 0.9, glow: [200, 90, 120], glowScale: 9, weight: 3, label: 'Naine brune' },
  M: { color: 0xff8a5c, rel: [0.15, 0.6], lum: 0.03, light: 1.4, glow: [255, 138, 92], glowScale: 6, weight: 40, label: 'Naine rouge' },
  K: { color: 0xffb56b, rel: [0.65, 0.85], lum: 0.08, light: 1.8, glow: [255, 181, 107], glowScale: 5, weight: 22, label: 'Naine orange' },
  G: { color: 0xffdf9e, rel: [0.95, 1.05], lum: 1, light: 2.5, glow: [255, 223, 158], glowScale: 4.2, weight: 14, label: 'Naine jaune (type Soleil)' },
  F: { color: 0xf6f0dc, rel: [1.15, 1.4], lum: 1.6, light: 3, glow: [246, 240, 220], glowScale: 4.2, weight: 8, label: 'Naine F' },
  A: { color: 0xeef2ff, rel: [1.6, 2.0], lum: 3.5, light: 3.4, glow: [238, 242, 255], glowScale: 4, weight: 6, label: 'Naine A' },
  B: { color: 0x9db4ff, rel: [2.4, 3.5], lum: 10, light: 4, glow: [157, 180, 255], glowScale: 4, weight: 3, label: 'Étoile B' },
  O: { color: 0x86a8ff, rel: [10, 15], lum: 500, light: 6, glow: [134, 168, 255], glowScale: 3.5, weight: 0.8, label: 'Géante bleue (O)' },
  RG: { color: 0xff6a4a, rel: [25, 80], lum: 1500, light: 7, glow: [255, 106, 74], glowScale: 3, weight: 2, label: 'Géante rouge' },
  WD: { color: 0xd8ecff, rel: [0.009, 0.013], lum: 0.03, light: 3, glow: [216, 236, 255], glowScale: 30, weight: 1, label: 'Naine blanche' },
  PS: { color: 0xffffff, rel: [0.0025, 0.004], lum: 1, light: 2.5, glow: [255, 255, 255], glowScale: 60, weight: 1.2, label: 'Pulsar' },
};

const STAR_TYPES = Object.keys(STAR_TABLE) as StarType[];

function pickStarType(rng: RNG): StarType {
  let total = 0;
  for (const t of STAR_TYPES) total += STAR_TABLE[t].weight;
  let r = rng.f() * total;
  for (const t of STAR_TYPES) {
    r -= STAR_TABLE[t].weight;
    if (r <= 0) return t;
  }
  return 'G';
}

export function starLabel(t: StarType): string {
  return STAR_TABLE[t].label;
}

// Visual parameters for a star (color/glow/light) derived from its type.
export function starVisual(star: StarDef): StarVisual {
  const spec = STAR_TABLE[star.type];
  return {
    color: star.color,
    radius: star.radius,
    glow: spec.glow,
    light: spec.light,
    glowScale: spec.glowScale,
    beams: star.type === 'PS',
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
      const t = pickStarType(rng);
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
    // guarantee: rare types must exist in a 120-system galaxy (small sample)
    for (const t of ['BD', 'O', 'RG', 'WD', 'PS'] as StarType[]) {
      const n = 1 + (rng.chance(0.5) ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const i = rng.int(0, count - 1);
        const st = STAR_TABLE[t];
        this.systems[i].star = {
          type: t,
          color: st.color,
          radius: Math.round(SUN_RADIUS * rng.range(st.rel[0], st.rel[1]) * 10) / 10,
        };
      }
    }
    // rare phenomena: ~2 % of systems each carry one (black hole, wormhole,
    // alien wreck), rolled on an RNG independent of the main galaxy stream
    // so existing systems stay stable; guarantee each kind exists once.
    const arng = new RNG((seed ^ 0xa11ce5) >>> 0);
    for (const s of this.systems) {
      if (arng.f() < 0.02) s.anomaly = { kind: 'trou-noir' };
      else if (arng.f() < 0.02) s.anomaly = { kind: 'trou-de-ver' };
      else if (arng.f() < 0.02) s.anomaly = { kind: 'epave' };
    }
    for (const kind of ['trou-noir', 'trou-de-ver', 'epave'] as AnomalyKind[]) {
      if (!this.systems.some((s) => s.anomaly?.kind === kind)) {
        const i = arng.int(0, count - 1);
        this.systems[i].anomaly = { kind };
      }
    }
    // wormholes bridge to a distant system (>= 12 KLY when possible),
    // deterministically
    for (const s of this.systems) {
      if (s.anomaly?.kind !== 'trou-de-ver') continue;
      const far = this.systems
        .filter((c) => c.id !== s.id)
        .sort(
          (a, b) =>
            Math.hypot(b.x - s.x, b.z - s.z) - Math.hypot(a.x - s.x, a.z - s.z),
        );
      const pool = far.filter((c) => Math.hypot(c.x - s.x, c.z - s.z) >= 12);
      const list = pool.length ? pool : far;
      s.anomaly.target = list[arng.int(0, list.length - 1)].id;
    }
  }

  byId(id: string): SystemDef | undefined {
    return this.systems.find((s) => s.id === id);
  }
}
