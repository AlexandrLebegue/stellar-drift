import * as THREE from 'three';
import { RNG } from '../core/prng';
import { makeStarfield, makeGlow } from '../render/textures';
import { applyPS1 } from '../render/ps1';

// Giant inverted sphere with the procedural starfield. Follows the camera.
export function makeSkybox(rng: RNG, snapRes: THREE.Vector2): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    map: makeStarfield(rng),
    side: THREE.BackSide,
    fog: false,
  });
  applyPS1(mat, snapRes);
  const m = new THREE.Mesh(new THREE.SphereGeometry(300000, 24, 12), mat);
  m.frustumCulled = false;
  return m;
}

export interface StarVisual {
  color: number;
  radius: number; // u
  glow: readonly [number, number, number];
  light: number;
  glowScale?: number;
  beams?: boolean;
}

// Star: bright core + additive glow sprite + point light (no falloff).
export function makeSun(snapRes: THREE.Vector2, v: StarVisual): THREE.Group {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(1, v.radius), 24, 16),
    new THREE.MeshBasicMaterial({ color: v.color, fog: false }),
  );
  applyPS1(core.material, snapRes);
  g.add(core);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlow(128, v.glow),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      fog: false,
    }),
  );
  const s = Math.max(240, v.radius * (v.glowScale ?? 4.2));
  glow.scale.set(s, s, 1);
  g.add(glow);

  g.add(new THREE.PointLight(v.color, v.light, 0, 0));
  return g;
}
