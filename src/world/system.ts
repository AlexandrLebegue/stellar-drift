import * as THREE from 'three';
import { RNG } from '../core/prng';
import { SystemDef } from './galaxy';
import { makePlanetData, makePlanetMesh, PlanetData } from './planet';
import { makeStationData, makeStationMesh, StationDef } from './station';
import { makeSun } from './skybox';

export interface PlanetBody {
  orbit: THREE.Group;
  mesh: THREE.Group;
  data: PlanetData;
  spin: number;
  orbitRadius: number;
  orbitSpeed: number;
}

export interface StationBody {
  orbit: THREE.Group;
  mesh: THREE.Group;
  def: StationDef;
  ring: THREE.Object3D;
  pad: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
}

// One playable star system: star + orbiting planets + 1-2 stations.
export class StarSystem {
  group = new THREE.Group();
  star: THREE.Group;
  planets: PlanetBody[] = [];
  stations: StationBody[] = [];
  name: string;
  def: SystemDef;

  constructor(def: SystemDef, snapRes: THREE.Vector2) {
    this.def = def;
    this.name = def.name;
    const rng = new RNG(def.seed);
    this.star = makeSun(snapRes, def.star.color, def.star.radius);
    this.group.add(this.star);

    const nPlanets = rng.int(2, 8);
    let r = rng.range(220, 320);
    for (let i = 0; i < nPlanets; i++) {
      const data = makePlanetData(rng, def.name);
      const orbit = new THREE.Group();
      orbit.rotation.x = rng.range(-0.12, 0.12);
      orbit.rotation.z = rng.range(-0.12, 0.12);
      const mesh = makePlanetMesh(rng, data, snapRes);
      mesh.position.set(r, 0, 0);
      orbit.add(mesh);
      this.group.add(orbit);
      this.planets.push({
        orbit,
        mesh,
        data,
        spin: rng.range(0.05, 0.25) * (rng.chance(0.5) ? -1 : 1),
        orbitRadius: r,
        orbitSpeed: (Math.PI * 2) / rng.range(240, 1500),
      });
      r += rng.range(140, 380);
    }

    const nStations = rng.int(1, 2);
    for (let i = 0; i < nStations; i++) {
      const d = makeStationData(rng, def.name);
      const sm = makeStationMesh(rng, d, snapRes);
      const orbit = new THREE.Group();
      orbit.rotation.x = rng.range(-0.1, 0.1);
      sm.group.position.set(r + 130, 0, 0);
      orbit.add(sm.group);
      this.group.add(orbit);
      this.stations.push({
        orbit,
        mesh: sm.group,
        def: d,
        ring: sm.ring,
        pad: sm.pad,
        orbitRadius: r + 130,
        orbitSpeed: (Math.PI * 2) / rng.range(600, 2400),
      });
      r += rng.range(120, 200);
    }
  }

  update(dt: number) {
    for (const p of this.planets) {
      p.orbit.rotation.y += p.orbitSpeed * dt;
      p.mesh.rotation.y += p.spin * dt;
    }
    for (const s of this.stations) {
      s.orbit.rotation.y += s.orbitSpeed * dt;
      s.ring.rotation.z += dt * 0.3;
    }
  }

  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) mat.dispose();
    });
  }
}
