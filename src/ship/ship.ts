import * as THREE from 'three';
import { FlightInput } from '../core/input';
import { applyPS1 } from '../render/ps1';
import { makeGlow } from '../render/textures';

// Low-poly arcade ship. Forward = -Z, up = +Y.
export class Ship {
  group = new THREE.Group();
  pos = new THREE.Vector3(0, 0, 400);
  vel = new THREE.Vector3();
  quat = new THREE.Quaternion();
  throttle = 0.25;
  hull = 100;
  fuel = 100;
  camMode: 'chase' | 'cockpit' = 'chase';

  maxSpeed = 150;
  maxThrust = 60;
  hold = 16;
  drag = 0.45;
  turnPitch = 1.5;
  turnYaw = 1.1;
  turnRoll = 2.2;

  private camPos = new THREE.Vector3(0, 10, 430);
  private camLook = new THREE.Vector3();
  private camDesire = new THREE.Vector3();
  private tmpLook = new THREE.Vector3();
  private engineGlow: THREE.Sprite;
  private fwd = new THREE.Vector3();
  private up = new THREE.Vector3();
  private tmpE = new THREE.Euler();
  private tmpQ = new THREE.Quaternion();

  constructor(snapRes: THREE.Vector2) {
    const hull = new THREE.MeshLambertMaterial({ color: 0xb8bec8 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x6f7886 });
    const glass = new THREE.MeshLambertMaterial({ color: 0x1c2b46 });
    applyPS1(hull, snapRes);
    applyPS1(dark, snapRes);
    applyPS1(glass, snapRes);

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 3.4), hull);
    this.group.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 4), hull);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -2.4;
    this.group.add(nose);
    const wings = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 1.2), dark);
    wings.position.z = 0.9;
    this.group.add(wings);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.9), dark);
    fin.position.set(0, 0.75, 1.4);
    this.group.add(fin);
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.9), glass);
    cockpit.position.set(0, 0.55, -0.5);
    this.group.add(cockpit);

    this.engineGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlow(64, [255, 140, 60]),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        fog: false,
      }),
    );
    this.engineGlow.position.z = 2.1;
    this.engineGlow.scale.set(1.6, 1.6, 1);
    this.group.add(this.engineGlow);
  }

  toggleCam() {
    this.camMode = this.camMode === 'chase' ? 'cockpit' : 'chase';
    this.group.visible = this.camMode !== 'cockpit';
  }

  // reset to a fresh spawn (used on system load)
  reset(pos: THREE.Vector3) {
    this.pos.copy(pos);
    this.vel.set(0, 0, 0);
    this.quat.identity();
    this.camPos.copy(pos).add(new THREE.Vector3(0, 8, 30));
    this.camLook.copy(pos);
    this.group.visible = true;
    this.camMode = 'chase';
  }

  setThrottle(delta: number, dt: number) {
    if (delta !== 0) {
      this.throttle = Math.min(1, Math.max(0, this.throttle + delta * dt * 0.8));
    }
  }

  update(dt: number, fi: FlightInput) {
    // local-space attitude change (YXZ: yaw, pitch, roll)
    this.tmpE.set(
      fi.pitch * this.turnPitch * dt,
      fi.yaw * this.turnYaw * dt,
      -fi.roll * this.turnRoll * dt,
      'YXZ',
    );
    this.tmpQ.setFromEuler(this.tmpE);
    this.quat.multiply(this.tmpQ).normalize();

    this.fwd.set(0, 0, -1).applyQuaternion(this.quat);
    this.up.set(0, 1, 0).applyQuaternion(this.quat);

    // thrust along forward, light inertial drag
    this.vel.addScaledVector(this.fwd, this.throttle * this.maxThrust * dt);
    this.vel.multiplyScalar(Math.exp(-this.drag * dt));
    const sp = this.vel.length();
    if (sp > this.maxSpeed) this.vel.multiplyScalar(this.maxSpeed / sp);
    this.pos.addScaledVector(this.vel, dt);

    this.group.position.copy(this.pos);
    this.group.quaternion.copy(this.quat);
    const glow = 0.4 + this.throttle * 1.6;
    this.engineGlow.scale.set(glow, glow, 1);

    this.updateCamera(dt);
  }

  // camera: chase (smoothed) or cockpit (snapped) — called by update()
  // and standalone during docking
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
