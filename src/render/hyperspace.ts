import * as THREE from 'three';
import { applyPS1 } from './ps1';

// Light-speed tunnel: radial line streaks flowing past the camera,
// stretched with speed (0..1). Rendered through the PS1 pipeline so it
// gets vertex snapping + dithering like everything else.
export class HyperspaceTunnel {
  group = new THREE.Group();
  private lines: THREE.LineSegments;
  private n = 140;
  private pos: Float32Array;
  private x = new Float32Array(this.n);
  private y = new Float32Array(this.n);
  private z = new Float32Array(this.n);
  private zMin = -400;
  private zMax = 10;

  constructor(snapRes: THREE.Vector2) {
    this.pos = new Float32Array(this.n * 6);
    for (let i = 0; i < this.n; i++) this.reseed(i);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xbfd8ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    applyPS1(mat, snapRes);
    this.lines = new THREE.LineSegments(geo, mat);
    this.lines.frustumCulled = false;
    this.group.add(this.lines);
  }

  private reseed(i: number) {
    const a = Math.random() * Math.PI * 2;
    const r = 14 + Math.random() * 60;
    this.x[i] = Math.cos(a) * r;
    this.y[i] = Math.sin(a) * r;
    this.z[i] = this.zMin + Math.random() * (this.zMax - this.zMin);
  }

  update(dt: number, speed: number) {
    const v = 250 + 1800 * speed;
    for (let i = 0; i < this.n; i++) {
      this.z[i] += v * dt;
      if (this.z[i] > this.zMax) {
        this.reseed(i);
        this.z[i] = this.zMin;
      }
      const stretch = 1 + 2.5 * speed;
      const tail = 6 + 40 * speed;
      const o = i * 6;
      this.pos[o] = this.x[i];
      this.pos[o + 1] = this.y[i];
      this.pos[o + 2] = this.z[i];
      this.pos[o + 3] = this.x[i] * stretch;
      this.pos[o + 4] = this.y[i] * stretch;
      this.pos[o + 5] = this.z[i] - tail;
    }
    (this.lines.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.lines.material as THREE.LineBasicMaterial).opacity = 0.35 + 0.55 * speed;
  }

  dispose() {
    this.lines.geometry.dispose();
    (this.lines.material as THREE.Material).dispose();
  }
}
