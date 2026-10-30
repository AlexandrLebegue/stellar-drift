import * as THREE from 'three';
import { RNG } from '../core/prng';
import { applyPS1 } from '../render/ps1';

export type StationType = 'hub' | 'marche' | 'raffinerie' | 'avant-poste';

export interface StationDef {
  id: string;
  name: string;
  type: StationType;
}

const STATION_TYPES: StationType[] = [
  'hub', 'marche', 'raffinerie', 'avant-poste',
];

export function makeStationData(rng: RNG, systemName: string): StationDef {
  const t = rng.pick(STATION_TYPES);
  return {
    id: 'st' + rng.int(1000, 9999),
    name: systemName + ' STATION',
    type: t,
  };
}

// Low-poly rotating station: hub core + rotating ring + dock arm with pad.
export function makeStationMesh(
  rng: RNG,
  def: StationDef,
  snapRes: THREE.Vector2,
): { group: THREE.Group; ring: THREE.Object3D; pad: THREE.Mesh } {
  const hull = new THREE.MeshLambertMaterial({ color: 0x9aa3b2 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x4a5262 });
  const light = new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false });
  applyPS1(hull, snapRes);
  applyPS1(dark, snapRes);

  const group = new THREE.Group();

  const core = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 26, 8), hull);
  group.add(core);
  const capA = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), hull);
  capA.position.y = 13;
  group.add(capA);
  const capB = capA.clone();
  capB.rotation.x = Math.PI;
  capB.position.y = -13;
  group.add(capB);

  const ring = new THREE.Group();
  const torus = new THREE.Mesh(new THREE.TorusGeometry(14, 1.6, 6, 20), dark);
  ring.add(torus);
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 14), dark);
    spoke.rotation.y = (i / 4) * Math.PI;
    ring.add(spoke);
  }
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 11), light);
  win.position.set(0, 0, 0);
  ring.add(win);
  group.add(ring);

  // docking arm + pad
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 16), dark);
  arm.position.set(0, 6, 14);
  group.add(arm);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 8), hull);
  pad.position.set(0, 6, 22);
  group.add(pad);
  const padLight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 6.5), light);
  padLight.position.set(0, 6.45, 22);
  group.add(padLight);

  group.rotation.z = rng.range(0, Math.PI);
  group.scale.setScalar(rng.range(0.9, 1.3));

  return { group, ring, pad };
}
