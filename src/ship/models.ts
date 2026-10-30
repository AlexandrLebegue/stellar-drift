import * as THREE from 'three';
import { applyPS1 } from '../render/ps1';
import { makeGlow } from '../render/textures';
import type { ShipClass } from './shipdefs';

// Distinct low-poly hulls. The main hull material is exposed on
// userData.hullMat so the paint job can recolor it in place.
export function buildShipModel(
  cls: ShipClass,
  paint: string,
  snapRes: THREE.Vector2,
): THREE.Group {
  const hull = new THREE.MeshLambertMaterial({ color: paint });
  const dark = new THREE.MeshLambertMaterial({ color: 0x3c4454 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1c2b46 });
  applyPS1(hull, snapRes);
  applyPS1(dark, snapRes);
  applyPS1(glass, snapRes);

  const g = new THREE.Group();
  const B = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    g.add(b);
    return b;
  };

  if (cls === 'sparrow') {
    // slim fast fighter: needle nose, narrow body, small delta wings
    B(0.8, 0.7, 3.0, hull);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 4), hull);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -2.5;
    g.add(nose);
    B(2.6, 0.1, 0.9, dark, 0, 0, 0.7);
    B(0.08, 0.9, 0.8, dark, 0, 0.6, 1.2);
    B(0.4, 0.3, 0.7, glass, 0, 0.4, -0.7);
  } else if (cls === 'mule') {
    // boxy hauler: big square body, stubby wings, flat nose
    B(2.2, 1.6, 3.6, hull);
    B(2.2, 1.2, 0.8, dark, 0, 0, -2.2);
    B(4.4, 0.16, 1.6, dark, 0, 0.4, 0.8);
    B(0.1, 1.0, 1.4, dark, 0, 0.8, 1.4);
    B(0.6, 0.4, 0.8, glass, 0, 0.9, -1.6);
    B(0.5, 0.5, 0.3, dark, -0.7, -0.2, -2.7);
    B(0.5, 0.5, 0.3, dark, 0.7, -0.2, -2.7);
  } else if (cls === 'falcon') {
    // long sleek explorer: swept wings, sensor mast, big single engine
    B(0.9, 0.8, 4.2, hull);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.8, 6), hull);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -3.0;
    g.add(nose);
    const wingL = B(2.2, 0.08, 1.6, dark, -1.1, 0, 0.6);
    wingL.rotation.z = 0.25;
    const wingR = B(2.2, 0.08, 1.6, dark, 1.1, 0, 0.6);
    wingR.rotation.z = -0.25;
    B(0.08, 1.2, 1.0, dark, 0, 0.8, 1.3);
    B(0.5, 0.35, 1.0, glass, 0, 0.5, -0.9);
    const mast = B(0.05, 0.5, 0.05, dark, 0, 1.6, -2.6);
    mast.rotation.z = 0.5;
  } else {
    // prototype: the original blocky test ship
    B(1.0, 0.9, 3.4, hull);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 4), hull);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -2.4;
    g.add(nose);
    B(3.6, 0.12, 1.2, dark, 0, 0, 0.9);
    B(0.1, 1.1, 0.9, dark, 0, 0.75, 1.4);
    B(0.55, 0.45, 0.9, glass, 0, 0.55, -0.5);
  }

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlow(64, [255, 140, 60]),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      fog: false,
    }),
  );
  glow.position.z = 2.4;
  glow.scale.set(1.6, 1.6, 1);
  g.add(glow);

  g.userData.hullMat = hull;
  g.userData.glow = glow;
  return g;
}
