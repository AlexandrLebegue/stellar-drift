// Génère les icônes Android (launcher + adaptive foreground) et les splash
// de Stellar Drift, sans dépendance externe (encodeur PNG minimal + zlib).
// Usage : node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RES = join(import.meta.dirname, '..', 'android', 'app', 'src', 'main', 'res');

// --- encodeur PNG (RGBA, filtre 0) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function pngSize(path) {
  const b = readFileSync(path);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

// --- dessin ---
// Étoile à 4 branches (superellipse 4) avec décroissance exponentielle.
function sparkle(nx, ny, k) {
  const d = Math.pow(Math.pow(Math.abs(nx), 4) + Math.pow(Math.abs(ny), 4), 0.25);
  if (d <= 0.16) return 1;
  return Math.exp(-(d - 0.16) * k);
}

function render(w, h, { transparent = false, round = false, starScale = 1, dots = true } = {}) {
  const px = Buffer.alloc(w * h * 4);
  const bgC = [26, 34, 84];
  const bgE = [3, 4, 11];
  const core = [255, 246, 226];
  const amber = [255, 171, 60];
  const dotList = [
    { x: 0.34, y: -0.36, s: 0.17, c: [255, 214, 140], a: 0.9 },
    { x: -0.42, y: 0.38, s: 0.13, c: [190, 205, 255], a: 0.7 },
  ];
  for (let y = 0; y < h; y++) {
    const ny = ((y + 0.5) / h) * 2 - 1;
    for (let x = 0; x < w; x++) {
      const nx = ((x + 0.5) / w) * 2 - 1;
      let r, g, b, a;
      if (transparent) {
        r = g = b = 0;
        a = 0;
      } else {
        const d = Math.min(1, Math.hypot(nx, ny) * 0.72);
        const t = 1 - d;
        r = bgE[0] + (bgC[0] - bgE[0]) * t;
        g = bgE[1] + (bgC[1] - bgE[1]) * t;
        b = bgE[2] + (bgC[2] - bgE[2]) * t;
        a = 255;
      }
      if (dots) {
        for (const d0 of dotList) {
          const i = sparkle((nx - d0.x) / d0.s, (ny - d0.y) / d0.s, 6) * d0.a;
          if (i > 0.003) {
            r = r + (d0.c[0] - r) * i;
            g = g + (d0.c[1] - g) * i;
            b = b + (d0.c[2] - b) * i;
            if (transparent) a = Math.max(a, 255 * i);
          }
        }
      }
      const i = sparkle(nx / starScale, ny / starScale, 6);
      if (i > 0.003) {
        const w2 = i * i;
        const cr = amber[0] + (core[0] - amber[0]) * w2;
        const cg = amber[1] + (core[1] - amber[1]) * w2;
        const cb = amber[2] + (core[2] - amber[2]) * w2;
        r = r * (1 - i) + cr * i;
        g = g * (1 - i) + cg * i;
        b = b * (1 - i) + cb * i;
        if (transparent) a = Math.max(a, 255 * i);
      }
      if (round) {
        const rr = Math.hypot(nx, ny);
        a *= Math.max(0, Math.min(1, (1.0 - rr) / 0.06));
      }
      const p = (y * w + x) * 4;
      px[p] = Math.round(r);
      px[p + 1] = Math.round(g);
      px[p + 2] = Math.round(b);
      px[p + 3] = Math.round(a);
    }
  }
  return px;
}

// --- launcher (carré + rond) ---
const mip = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};
for (const [dir, s] of Object.entries(mip)) {
  writeFileSync(join(RES, dir, 'ic_launcher.png'), encodePng(s, s, render(s, s)));
  writeFileSync(join(RES, dir, 'ic_launcher_round.png'), encodePng(s, s, render(s, s, { round: true })));
  const fs = s * 2.25;
  writeFileSync(
    join(RES, dir, 'ic_launcher_foreground.png'),
    encodePng(fs, fs, render(fs, fs, { transparent: true, starScale: 0.62, dots: false })),
  );
}

// --- splash : mêmes dimensions que l'existant, fond + étoile ---
const splashDirs = ['drawable', 'drawable-land-mdpi', 'drawable-land-hdpi', 'drawable-land-xhdpi', 'drawable-land-xxhdpi', 'drawable-land-xxxhdpi', 'drawable-port-mdpi', 'drawable-port-hdpi', 'drawable-port-xhdpi', 'drawable-port-xxhdpi', 'drawable-port-xxxhdpi'];
for (const dir of splashDirs) {
  const p = join(RES, dir, 'splash.png');
  const [w, h] = pngSize(p);
  writeFileSync(p, encodePng(w, h, render(w, h, { starScale: 0.8 })));
}

console.log('icônes + splash régénérées');
