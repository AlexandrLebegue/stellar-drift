import * as THREE from 'three';
import { FlightInput } from '../core/input';
import { buildShipModel } from './models';
import { SHIPS, ShipClass, ShipDef, ModuleType } from './shipdefs';

// Low-poly arcade ship. Forward = -Z, up = +Y. Stats = ship class +
// owned modules; paint recolors the hull in place.
export class Ship {
  group = new THREE.Group();
  pos = new THREE.Vector3(0, 0, 400);
  vel = new THREE.Vector3();
  quat = new THREE.Quaternion();
  throttle = 0.25;
  hull = 100;
  fuel = 100;
  camMode: 'chase' | 'cockpit' = 'chase';

  cls: ShipClass = 'prototype';
  def: ShipDef = SHIPS.prototype;
  paint = '#b8bec8';

  // effective stats (recomputed by recompute())
  maxSpeed = 150;
  maxThrust = 60;
  turnMult = 1;
  hold = 16;
  jumpRange = 10;
  scanRange = 900;
  scanTime = 3;
  fuelCap = 100;
  hullMax = 100;

  private snapRes: THREE.Vector2;
  private model: THREE.Group | null = null;
  private camPos = new THREE.Vector3(0, 10, 430);
  private camLook = new THREE.Vector3();
  private camDesire = new THREE.Vector3();
  private tmpLook = new THREE.Vector3();
  private fwd = new THREE.Vector3();
  private up = new THREE.Vector3();
  private tmpE = new THREE.Euler();
  private tmpQ = new THREE.Quaternion();

  constructor(snapRes: THREE.Vector2) {
    this.snapRes = snapRes;
    this.setShip('prototype');
  }

  setShip(cls: ShipClass) {
    this.cls = cls;
    this.def = SHIPS[cls];
    if (this.model) {
      this.model.traverse((o) => {
        const n = o as unknown as {
          geometry?: THREE.BufferGeometry;
          material?: THREE.Material | THREE.Material[];
        };
        n.geometry?.dispose();
        const mats = Array.isArray(n.material) ? n.material : n.material ? [n.material] : [];
        for (const x of mats) {
          const tex = (x as THREE.SpriteMaterial).map;
          if (tex) tex.dispose();
          x.dispose();
        }
      });
      this.group.remove(this.model);
    }
    this.model = buildShipModel(cls, this.paint, this.snapRes);
    this.group.add(this.model);
    this.recompute({});
  }

  setPaint(paint: string) {
    this.paint = paint;
    if (this.model) {
      (this.model.userData.hullMat as THREE.MeshLambertMaterial).color.set(paint);
    }
  }

  recompute(mods: Partial<Record<ModuleType, number>>) {
    const d = this.def;
    const l = (t: ModuleType) => mods?.[t] ?? 0;
    this.maxSpeed = d.maxSpeed * (1 + 0.2 * l('moteur'));
    this.maxThrust = d.maxThrust * (1 + 0.25 * l('moteur'));
    this.turnMult = d.turn * (1 + 0.1 * l('moteur'));
    this.hold = d.hold + 8 * l('soute');
    this.jumpRange = d.jumpRange + 2 * l('fsd');
    this.scanRange = d.scanRange + 1000 * l('scanner');
    this.scanTime = Math.max(1, d.scanTime - 0.4 * l('scanner'));
    this.fuelCap = d.fuelCap + 50 * l('reservoir');
    this.hullMax = d.hullMax + 50 * l('coque');
    this.fuel = Math.min(this.fuel, this.fuelCap);
    this.hull = Math.min(this.hull, this.hullMax);
  }

  toggleCam() {
    this.camMode = this.camMode === 'chase' ? 'cockpit' : 'chase';
    this.group.visible = this.camMode !== 'cockpit';
  }

  // Supercruise: max speed/thrust grow with the distance to the nearest
  // body (clearance); near a planet or station the ship auto-brakes back
  // to plain cruise speed.
  supercruise = false;

  toggleSupercruise(): boolean {
    this.supercruise = !this.supercruise;
    return this.supercruise;
  }

  // reset to a fresh spawn (used on system load); optional saved orientation
  reset(pos: THREE.Vector3, quat?: THREE.Quaternion) {
    this.pos.copy(pos);
    this.vel.set(0, 0, 0);
    if (quat) this.quat.copy(quat).normalize();
    else this.quat.identity();
    this.fwd.set(0, 0, -1).applyQuaternion(this.quat);
    this.up.set(0, 1, 0).applyQuaternion(this.quat);
    this.camPos
      .copy(this.pos)
      .addScaledVector(this.fwd, -10)
      .addScaledVector(this.up, 2.2);
    this.tmpLook.copy(this.pos).addScaledVector(this.fwd, 30);
    this.camLook.copy(this.tmpLook);
    this.group.visible = this.camMode !== 'cockpit';
    this.camMode = 'chase';
  }

  setThrottle(delta: number, dt: number) {
    if (delta !== 0) {
      this.throttle = Math.min(1, Math.max(0, this.throttle + delta * dt * 0.8));
    }
  }

  update(dt: number, fi: FlightInput, clearance = 1e9) {
    // local-space attitude change (YXZ: yaw, pitch, roll)
    this.tmpE.set(
      fi.pitch * 1.5 * this.turnMult * dt,
      fi.yaw * 1.1 * this.turnMult * dt,
      -fi.roll * 2.2 * this.turnMult * dt,
      'YXZ',
    );
    this.tmpQ.setFromEuler(this.tmpE);
    this.quat.multiply(this.tmpQ).normalize();

    this.fwd.set(0, 0, -1).applyQuaternion(this.quat);
    this.up.set(0, 1, 0).applyQuaternion(this.quat);

    // supercruise ramp 0..1 over 1200→4000 u of clearance
    const s = this.supercruise ? Math.min(1, Math.max(0, (clearance - 1200) / 2800)) : 0;
    const vMax = this.maxSpeed * (1 + 64 * s);
    const thrust = this.maxThrust * (1 + 128 * s);

    // thrust along forward, light inertial drag (auto-brake near bodies)
    this.vel.addScaledVector(this.fwd, this.throttle * thrust * dt);
    const drag = this.supercruise ? 0.45 + 18 * (1 - s) : 0.45;
    this.vel.multiplyScalar(Math.exp(-drag * dt));
    const sp = this.vel.length();
    if (sp > vMax) this.vel.multiplyScalar(vMax / sp);
    this.pos.addScaledVector(this.vel, dt);

    this.group.position.copy(this.pos);
    this.group.quaternion.copy(this.quat);
    if (this.model) {
      const glow = this.model.userData.glow as THREE.Sprite;
      const gs = 0.4 + this.throttle * 1.6 + (this.supercruise ? 0.9 : 0);
      glow.scale.set(gs, gs, 1);
    }

    this.updateCamera(dt);
  }

  // camera: chase (smoothed) or cockpit (snapped)
  updateCamera(dt: number) {
    this.fwd.set(0, 0, -1).applyQuaternion(this.quat);
    this.up.set(0, 1, 0).applyQuaternion(this.quat);
    if (this.camMode === 'chase') {
      this.camDesire
        .copy(this.pos)
        .addScaledVector(this.fwd, -10)
        .addScaledVector(this.up, 2.2);
      this.camPos.lerp(this.camDesire, 1 - Math.exp(-8 * dt));
      this.tmpLook.copy(this.pos).addScaledVector(this.fwd, 30);
      this.camLook.lerp(this.tmpLook, 1 - Math.exp(-10 * dt));
    } else {
      this.camPos
        .copy(this.pos)
        .addScaledVector(this.fwd, 1.3)
        .addScaledVector(this.up, -0.7);
      this.tmpLook.copy(this.pos).addScaledVector(this.fwd, 50);
      this.camLook.copy(this.tmpLook);
    }
  }

  // camera pose for the frame
  getCamera(camera: THREE.PerspectiveCamera) {
    camera.position.copy(this.camPos);
    camera.lookAt(this.camLook);
  }

  get cameraPos() {
    return this.camPos;
  }

  get cameraLook() {
    return this.camLook;
  }

  forward(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.fwd);
  }
}
