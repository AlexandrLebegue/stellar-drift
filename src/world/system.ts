import * as THREE from 'three';
import { RNG } from '../core/prng';
import { SystemDef, StarType, starVisual } from './galaxy';
import { makePlanetData, makePlanetMesh, PlanetData } from './planet';
import { makeStationData, makeStationMesh, StationDef } from './station';
import { makeSun, StarVisual } from './skybox';
import { makeBlackHole, makeWormhole, makeWreck, updateAnomaly } from './anomaly';

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

// Orbital layout: real distances are unplayable (1 AU = 215 R⊙), so they are
// compressed. Innermost orbit = 3.2 × the star radius (the star looks huge
// from there); each next orbit grows ~(1 + 0.55·i)^1.6 × the first, so the
// outer orbits sit 10-50 × the star radius (the star looks tiny from there).
// `skip`: orbits reserved (empty) before the first planet — red giants
// have no inner planets. `minInner`: floor for tiny stars (WD, pulsar).
const LAYOUT: Record<StarType, { inner: number; minInner: number; skip: number; planets: [number, number] }> = {
  BD: { inner: 1.5, minInner: 350, skip: 0, planets: [2, 6] },
  M: { inner: 3.2, minInner: 1400, skip: 0, planets: [2, 8] },
  K: { inner: 3.2, minInner: 0, skip: 0, planets: [2, 8] },
  G: { inner: 3.2, minInner: 0, skip: 0, planets: [2, 8] },
  F: { inner: 3.2, minInner: 0, skip: 0, planets: [2, 8] },
  A: { inner: 3.2, minInner: 0, skip: 0, planets: [2, 8] },
  B: { inner: 3.2, minInner: 0, skip: 0, planets: [3, 8] },
  O: { inner: 3.2, minInner: 0, skip: 0, planets: [3, 8] },
  RG: { inner: 3.2, minInner: 0, skip: 2, planets: [1, 4] },
  WD: { inner: 3.2, minInner: 800, skip: 0, planets: [2, 8] },
  PS: { inner: 3.2, minInner: 800, skip: 0, planets: [2, 8] },
};

export const ORBIT_CAP = 1500000;

export function orbitRadius(starR: number, type: StarType, i: number): number {
  const L = LAYOUT[type];
  const r0 = Math.max(L.inner * starR, L.minInner);
  return Math.min(ORBIT_CAP, r0 * Math.pow(1 + 0.55 * (i + L.skip), 1.6));
}

// One playable star system: star + orbiting planets + 1-2 stations.
export class StarSystem {
  group = new THREE.Group();
  star: THREE.Group;
  starRadius: number;
  planets: PlanetBody[] = [];
  stations: StationBody[] = [];
  name: string;
  def: SystemDef;
  outermost = 1000;
  fogNear = 800;
  fogFar = 200000;
  // rare phenomenon (black hole / wormhole / alien wreck), if any
  anomaly: THREE.Group | null = null;
  private anomalyT = 0;

  constructor(def: SystemDef, snapRes: THREE.Vector2) {
    this.def = def;
    this.name = def.name;
    const rng = new RNG(def.seed);
    this.starRadius = def.star.radius;
    // a black hole replaces the star entirely
    if (def.anomaly?.kind === 'trou-noir') {
      this.star = makeBlackHole(snapRes);
    } else {
      this.star = makeSun(snapRes, starVisual(def.star));
    }
    this.group.add(this.star);

    const nPlanets = rng.int(...LAYOUT[def.star.type].planets);
    const orbitRs: number[] = [];
    for (let i = 0; i < nPlanets; i++) {
      const r = orbitRadius(def.star.radius, def.star.type, i);
      orbitRs.push(r);
      const data = makePlanetData(rng, def.name, i, def.id + '-' + i);
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
    }

    // Stations hug a planet orbit (×3 scale to stay a believable size).
    const nStations = rng.int(1, 2);
    for (let i = 0; i < nStations; i++) {
      const d = makeStationData(rng, def.name);
      const sm = makeStationMesh(rng, d, snapRes);
      sm.group.scale.multiplyScalar(3);
      const orbit = new THREE.Group();
      orbit.rotation.x = rng.range(-0.1, 0.1);
      const orbitR = orbitRs[rng.int(0, orbitRs.length - 1)] * rng.range(1.06, 1.3);
      orbitRs.push(orbitR);
      sm.group.position.set(orbitR, 0, 0);
      orbit.add(sm.group);
      this.group.add(orbit);
      this.stations.push({
        orbit,
        mesh: sm.group,
        def: d,
        ring: sm.ring,
        pad: sm.pad,
        orbitRadius: orbitR,
        orbitSpeed: (Math.PI * 2) / rng.range(600, 2400),
      });
    }

    this.outermost = Math.max(...orbitRs);
    this.fogNear = Math.max(500, this.starRadius * 1.05 + 100);
    this.fogFar = Math.min(2500000, this.outermost * 2.2 + 20000);

    // rare phenomena: the wormhole sits outside the outermost orbit, the
    // alien wreck drifts among the inner orbits
    if (def.anomaly?.kind === 'trou-de-ver') {
      this.anomaly = makeWormhole(snapRes);
      const a = rng.range(0, Math.PI * 2);
      const d = this.outermost * 1.5 + 2000;
      this.anomaly.position.set(Math.cos(a) * d, rng.range(-800, 800), Math.sin(a) * d);
      this.group.add(this.anomaly);
    } else if (def.anomaly?.kind === 'epave') {
      this.anomaly = makeWreck(snapRes, rng);
      const a = rng.range(0, Math.PI * 2);
      const d = Math.max(1500, this.starRadius * 2.5);
      this.anomaly.position.set(Math.cos(a) * d, rng.range(-500, 500), Math.sin(a) * d);
      this.group.add(this.anomaly);
    }
  }

  // Safe hyperspace-arrival / spawn distance: well outside the star,
  // looking at it.
  get spawnDist(): number {
    return Math.max(1200, this.starRadius * 8);
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
    const beams = this.star.userData.beams as THREE.Group[] | undefined;
    if (beams) for (const b of beams) b.rotation.y += dt * 2;
    if (this.anomaly) {
      this.anomalyT += dt;
      updateAnomaly(this.anomaly, dt, this.anomalyT);
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
