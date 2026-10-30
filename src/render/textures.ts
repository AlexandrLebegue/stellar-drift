import * as THREE from 'three';
import { RNG } from '../core/prng';

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

// Equirectangular procedural starfield: dark space, faint nebula blobs,
// a few hundred 1-2px stars with varied colors/brightnesses.
export function makeStarfield(rng: RNG, w = 1024, h = 512): THREE.CanvasTexture {
  const c = canvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#04050c';
  ctx.fillRect(0, 0, w, h);

  const cols = ['rgba(50,70,130,', 'rgba(110,50,110,', 'rgba(40,100,105,', 'rgba(90,60,40,'];
  for (let i = 0; i < 6; i++) {
    const x = rng.range(0, w);
    const y = rng.range(0, h);
    const r = rng.range(60, 220);
    const col = cols[i % cols.length];
    for (const ox of [0, (x < r ? w : 0), (x > w - r ? -w : 0)]) {
      const g = ctx.createRadialGradient(x + ox, y, 0, x + ox, y, r);
      g.addColorStop(0, col + '0.10)');
      g.addColorStop(1, col + '0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }

  const n = Math.floor((w * h) / 900);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rng.f() * w);
    const y = Math.floor(rng.f() * h);
    const b = rng.f();
    const s = b > 0.985 ? 2 : 1;
    const r2 = rng.f();
    let col: string;
    if (r2 < 0.7) col = 'rgba(255,255,255,';
    else if (r2 < 0.85) col = 'rgba(165,190,255,';
    else if (r2 < 0.95) col = 'rgba(255,205,140,';
    else col = 'rgba(255,140,120,';
    ctx.fillStyle = col + (0.3 + b * 0.7).toFixed(2) + ')';
    ctx.fillRect(x, y, s, s);
  }
  const t = toTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// Soft radial glow (sun flare, engine trail...).
export function makeGlow(size = 64, rgb: readonly [number, number, number]): THREE.CanvasTexture {
  const c = canvas(size, size);
  const ctx = c.getContext('2d')!;
  const [r, g, b] = rgb;
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grd.addColorStop(0.25, `rgba(${r},${g},${b},0.55)`);
  grd.addColorStop(0.55, `rgba(${r},${g},${b},0.18)`);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  return toTexture(c);
}

// Small periodic 1D value noise (smooth, wraps).
function make1DNoise(rng: RNG, n = 64): (x: number) => number {
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) g[i] = rng.f();
  return (x: number) => {
    const fx = (((x % 1) + 1) % 1) * n;
    const i0 = Math.floor(fx) % n;
    const i1 = (i0 + 1) % n;
    const t = fx - Math.floor(fx);
    const s = t * t * (3 - 2 * t);
    return g[i0] * (1 - s) + g[i1] * s;
  };
}

// Low-res equirect planet texture (128x64). banded = gas giant style,
// otherwise rocky blotches.
export function makePlanetTexture(
  rng: RNG,
  base: readonly number[],
  accent: readonly number[],
  banded: boolean,
  size = 128,
): THREE.CanvasTexture {
  const w = size;
  const h = size / 2;
  const c = canvas(w, h);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const nA = make1DNoise(rng, 64);
  const nB = make1DNoise(rng, 64);
  const nC = make1DNoise(rng, 32);
  const nD = make1DNoise(rng, 32);
  const fbm = (u: number, v: number) => {
    let val = 0;
    let amp = 0.55;
    let f = 1;
    for (let o = 0; o < 4; o++) {
      val += (nA(u * f + nB(v * f) * 0.35) * 0.5 + nC(v * f) * 0.5) * amp;
      amp *= 0.5;
      f *= 2;
    }
    return val;
  };
  const [r0, g0, b0] = base;
  const [r1, g1, b1] = accent;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      let t: number;
      if (banded) {
        t = fbm(u, 0.15 + v * 0.85 + nD(u) * 0.12);
      } else {
        t = fbm(u, v) + nC(v) * 0.2;
      }
      t = Math.min(1, Math.max(0, (t - 0.32) / 0.4));
      const i = (y * w + x) * 4;
      img.data[i] = r0 + (r1 - r0) * t;
      img.data[i + 1] = g0 + (g1 - g0) * t;
      img.data[i + 2] = b0 + (b1 - b0) * t;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c);
}
