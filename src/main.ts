import * as THREE from 'three';
import { GameLoop } from './core/loop';
import { RNG } from './core/prng';
import { Input } from './core/input';
import { TouchControls } from './core/touch';
import { Game } from './core/state';
import { PS1Pipeline } from './render/ps1';
import { makeSkybox } from './world/skybox';
import { Galaxy, SystemDef } from './world/galaxy';
import { StarSystem } from './world/system';
import { Ship } from './ship/ship';
import { HUD } from './ui/hud';
import { Screens } from './ui/title';
import './style.css';

// Raw color pipeline (no sRGB<->linear conversions): colors are written
// as-is, like the PS1 framebuffer.
THREE.ColorManagement.enabled = false;

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ps1 = new PS1Pipeline(canvas);
ps1.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x070910, 500, 12000);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 60000);

const game = new Game();
game.load();
const input = new Input();
const touch = new TouchControls();
const hud = new HUD();
hud.show(false);

function startFlight() {
  if (game.phase !== 'title') return;
  game.phase = 'flying';
  screens.showTitle(false);
  hud.show(true);
  hud.flash('BIENVENUE A BORD');
}
function resume() {
  if (game.phase !== 'paused') return;
  game.phase = 'flying';
  screens.showPause(false);
}
const screens = new Screens(startFlight, resume, input.isTouch ? 'PAYSAGE RECOMMANDÉ' : '');

// --- procedural universe ---
const GALAXY_SEED = 0x5eed1234;
const galaxy = new Galaxy(GALAXY_SEED, 120);
const sky = makeSkybox(new RNG(0xabc123), ps1.snapRes);
scene.add(sky);
scene.add(new THREE.AmbientLight(0x55607a, 0.9));

const ship = new Ship(ps1.snapRes);
scene.add(ship.group);

let system: StarSystem | null = null;

function loadSystem(def: SystemDef) {
  if (system) {
    scene.remove(system.group);
    system.dispose();
  }
  system = new StarSystem(def, ps1.snapRes);
  scene.add(system.group);
  game.systemName = def.name;
  game.player.systemId = def.id;
  ship.reset(new THREE.Vector3(0, 0, 520));
}

loadSystem(galaxy.systems[0]);

window.addEventListener('beforeunload', () => game.save());

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ps1.resize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const tmpF = new THREE.Vector3();
const tmpTo = new THREE.Vector3();
let scanHeld = 0;
let titleT = 0;

const loop = new GameLoop(
  (dt) => {
    const fi = input.flight();
    if (input.isTouch) touch.merge(fi);
    touch.show(input.isTouch && game.phase === 'flying');

    if (game.phase === 'title') {
      titleT += dt;
      if (fi.confirm) startFlight();
      camera.position.set(
        Math.sin(titleT * 0.07) * 500,
        120 + Math.sin(titleT * 0.11) * 50,
        Math.cos(titleT * 0.07) * 500,
      );
      camera.lookAt(0, 0, 0);
    } else if (game.phase === 'flying') {
      if (fi.cam) {
        ship.toggleCam();
        hud.flash(ship.camMode === 'chase' ? 'CAMERA 3e PERSONNE' : 'CAMERA COCKPIT');
      }
      if (fi.back) {
        game.phase = 'paused';
        screens.showPause(true);
        hud.setScan(null);
      }
      if (game.phase === 'flying') {
        ship.setThrottle(fi.throttleIn, dt);
        ship.update(dt, fi);
        ship.getCamera(camera);

        // scan (held) — real scan mechanic arrives in stage 4
        if (fi.scan) scanHeld = Math.min(1, scanHeld + dt / 2.5);
        else scanHeld = 0;
        hud.setScan(fi.scan ? scanHeld : null);

        // target: nearest planet in a ~10 degree cone
        let tName: string | undefined;
        let tDist: number | undefined;
        ship.forward(tmpF);
        if (system) {
          for (const p of system.planets) {
            p.mesh.getWorldPosition(tmpTo).sub(ship.pos);
            const d = tmpTo.length();
            if (d > 4000) continue;
            tmpTo.divideScalar(d);
            if (tmpTo.dot(tmpF) > 0.995 && (tDist === undefined || d < tDist)) {
              tName = p.data.name.toUpperCase();
              tDist = d;
            }
          }
        }

        hud.update({
          system: game.systemName,
          credits: game.player.credits,
          speed: ship.vel.length(),
          throttle: ship.throttle,
          fuel: ship.fuel,
          hull: ship.hull,
          targetName: tName,
          targetDist: tDist,
        });
      }
    } else if (game.phase === 'paused') {
      if (fi.confirm || fi.back) resume();
    }

    if (system) system.update(dt);
    sky.position.copy(ship.pos);
    input.endFrame();
    touch.endFrame();
  },
  () => ps1.render(scene, camera),
);
loop.start();
