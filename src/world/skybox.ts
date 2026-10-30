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
  const m = new THREE.Mesh(new THREE.SphereGeometry(30000, 24, 12), mat);
  m.frustumCulled = false;
  return m;
}

// Star: bright core + additive glow sprite + point light (no falloff).
export function makeSun(
  snapRes: THREE.Vector2,
  color = 0xffdf9e,
  radiusScale = 1,
): THREE.Group {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(80 * radiusScale, 20, 14),
    new THREE.MeshBasicMaterial({ color, fog: false }),
  );
  applyPS1(core.material, snapRes);
  g.add(core);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlow(128, [255, 220, 150]),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      fog: false,
    }),
  );
  const s = 700 * radiusScale;
  glow.scale.set(s, s, 1);
  g.add(glow);

  g.add(new THREE.PointLight(0xffd9a0, 2.5, 0, 0));
  return g;
}
