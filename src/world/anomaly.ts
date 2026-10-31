import * as THREE from 'three';
import { RNG } from '../core/prng';
import { makeGlow } from '../render/textures';
import { applyPS1 } from '../render/ps1';

// Étape 12 rareties (~2 % of systems each): black hole, wormhole, alien
// wreck. All low-poly + sprites to stay inside the PS1 budget.

// --- black hole -----------------------------------------------------------
// The black hole replaces the star at the system origin. Radii in u.
export const BH_HORIZON = 100; // event horizon: inside = spaghettified
export const BH_DAMAGE = 400; // inside: hull takes tidal damage
export const BH_PULL = 20000; // inside: gravity well tugs the ship

export function makeBlackHole(snapRes: THREE.Vector2): THREE.Group {
  const g = new THREE.Group();

  // event horizon: pure black occluder
  const horizon = new THREE.Mesh(
    new THREE.SphereGeometry(BH_HORIZON, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, fog: false }),
  );
  g.add(horizon);

  // accretion disk: two tilted, counter-rotating additive rings
  const diskA = new THREE.Group();
  const ringA = new THREE.Mesh(
    new THREE.RingGeometry(BH_HORIZON * 1.35, BH_HORIZON * 4.5, 48, 1),
    new THREE.MeshBasicMaterial({
      color: 0xffa94d,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  applyPS1(ringA.material, snapRes);
  ringA.rotation.x = Math.PI / 2;
  diskA.add(ringA);
  diskA.rotation.x = 0.12;
  g.add(diskA);

  const diskB = new THREE.Group();
  const ringB = new THREE.Mesh(
    new THREE.RingGeometry(BH_HORIZON * 1.2, BH_HORIZON * 1.9, 40, 1),
    new THREE.MeshBasicMaterial({
      color: 0xfff3c4,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  applyPS1(ringB.material, snapRes);
  ringB.rotation.x = Math.PI / 2;
  diskB.add(ringB);
  diskB.rotation.x = -0.1;
  g.add(diskB);

  // photon ring: thin bright torus hugging the horizon
  const photon = new THREE.Mesh(
    new THREE.TorusGeometry(BH_HORIZON * 1.12, BH_HORIZON * 0.06, 8, 32),
    new THREE.MeshBasicMaterial({
      color: 0xcfe8ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  applyPS1(photon.material, snapRes);
  g.add(photon);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlow(128, [255, 169, 77]),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      fog: false,
    }),
  );
  glow.scale.set(3600, 3600, 1);
  g.add(glow);
  g.add(new THREE.PointLight(0xffa94d, 3.2, 0, 0));

  g.userData.diskA = diskA;
  g.userData.diskB = diskB;
  g.userData.photon = photon;
  return g;
}

// --- wormhole -------------------------------------------------------------
export const WORM_R = 120; // portal radius
export const WORM_ENTRY = 160; // inside: teleport

function makeSwirl(size: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const r = 6 + t * (size / 2 - 8);
    const a0 = t * 9;
    ctx.strokeStyle = `rgba(${140 + i * 3},${120 + i * 3},255,${(0.9 - t * 0.6).toFixed(2)})`;
    ctx.lineWidth = 2.5 - t * 1.5;
    ctx.beginPath();
    ctx.arc(cx, cx, r, a0, a0 + 1.2 + t * 1.4);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

export function makeWormhole(snapRes: THREE.Vector2): THREE.Group {
  const g = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(WORM_R, 16, 10, 36),
    new THREE.MeshBasicMaterial({
      color: 0x7a5cff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  applyPS1(ring.material, snapRes);
  g.add(ring);

  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(WORM_R * 1.3, 7, 8, 36),
    new THREE.MeshBasicMaterial({
      color: 0x37d5ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  applyPS1(ring2.material, snapRes);
  ring2.rotation.x = 0.6;
  g.add(ring2);

  const portal = new THREE.Mesh(
    new THREE.CircleGeometry(WORM_R * 0.92, 24),
    new THREE.MeshBasicMaterial({
      map: makeSwirl(128),
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  applyPS1(portal.material, snapRes);
  g.add(portal);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlow(128, [122, 92, 255]),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      fog: false,
    }),
  );
  glow.scale.set(1600, 1600, 1);
  g.add(glow);

  g.userData.portal = portal;
  g.userData.ring = ring;
  g.userData.ring2 = ring2;
  return g;
}

// --- alien wreck ------------------------------------------------------------
export const WRECK_R = 140; // scan/interaction radius

// Non-humanoid derelict: asymmetric shards + a severed bow, blinking lights.
export function makeWreck(snapRes: THREE.Vector2, rng: RNG): THREE.Group {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshLambertMaterial({ color: 0x4a5560 });
  applyPS1(hullMat, snapRes);
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x2e343c });
  applyPS1(darkMat, snapRes);

  const hull = new THREE.Mesh(new THREE.CylinderGeometry(18, 46, 260, 6), hullMat);
  hull.rotation.z = Math.PI / 2.3;
  g.add(hull);

  const bow = new THREE.Mesh(new THREE.CylinderGeometry(14, 30, 90, 6), darkMat);
  bow.rotation.z = Math.PI / 2.6;
  bow.position.set(190, 25, 60);
  g.add(bow);

  for (let i = 0; i < 4; i++) {
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(rng.range(14, 34), rng.range(8, 16), rng.range(40, 90)),
      i % 2 ? hullMat : darkMat,
    );
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(60, 130);
    plate.position.set(Math.cos(a) * r, rng.range(-40, 40), Math.sin(a) * r);
    plate.rotation.set(rng.range(-1, 1), rng.range(0, Math.PI * 2), rng.range(-1, 1));
    g.add(plate);
  }

  const lights: THREE.Sprite[] = [];
  const cols: [number, number, number][] = [
    [255, 120, 40],
    [255, 60, 90],
  ];
  for (let i = 0; i < 3; i++) {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlow(64, cols[i % 2]),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        fog: false,
      }),
    );
    sp.scale.set(46, 46, 1);
    const a = rng.range(0, Math.PI * 2);
    sp.position.set(
      Math.cos(a) * rng.range(30, 90),
      rng.range(-30, 30),
      Math.sin(a) * rng.range(30, 90),
    );
    g.add(sp);
    lights.push(sp);
  }

  g.userData.lights = lights;
  return g;
}

// Per-frame animation of a live anomaly group (disk spin / portal swirl /
// blinking wreck lights). t = seconds since the system loaded.
export function updateAnomaly(g: THREE.Group, dt: number, t: number) {
  const u = g.userData;
  if (u.diskA) {
    u.diskA.rotation.y += dt * 0.7;
    u.diskB.rotation.y -= dt * 1.1;
    u.photon.rotation.y += dt * 0.4;
  } else if (u.portal) {
    u.portal.rotation.z += dt * 2.2;
    u.ring.rotation.x += dt * 0.5;
    u.ring2.rotation.x -= dt * 0.8;
    u.ring2.rotation.y += dt * 0.4;
  } else if (u.lights) {
    for (let i = 0; i < u.lights.length; i++) {
      u.lights[i].visible = Math.sin(t * (2 + i * 1.7) + i * 2.1) > -0.2;
    }
  }
}
