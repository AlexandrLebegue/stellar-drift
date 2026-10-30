import * as THREE from 'three';
import { GameLoop } from './core/loop';
import { RNG } from './core/prng';
import { Input } from './core/input';
import { Game } from './core/state';
import { PS1Pipeline } from './render/ps1';
import { makeSkybox, makeSun, makePlaceholderPlanet } from './world/skybox';
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
const hud = new HUD();
hud.show(false);

function startFlight() {
  if (game.phase !== 'title') return;
  game.phase = 'flying';
  screens.showTitle(false);
  hud.show(true);
  hud.flash('BIENVENUE A BORD — M : CARTE (BIENTOT)');
}
function resume() {
  if (game.phase !== 'paused') return;
  game.phase = 'flying';
  screens.showPause(false);
}
const screens = new Screens(startFlight, resume);

// --- temporary star system (replaced by the procedural generator in stage 2) ---
const rng = new RNG(0x5eed1234);
const sky = makeSkybox(rng, ps1.snapRes);
scene.add(sky);
scene.add(makeSun(ps1.snapRes));
const planets = [
  makePlaceholderPlanet(rng, ps1.snapRes, 14, new THREE.Vector3(300, 0, 0)),
  makePlaceholderPlanet(rng, ps1.snapRes, 26, new THREE.Vector3(560, 0, 0)),
];
planets.forEach((p) => scene.add(p));
scene.add(new THREE.AmbientLight(0x55607a, 0.9));

const ship = new Ship(ps1.snapRes);
scene.add(ship.group);

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

    if (game.phase === 'title') {
      titleT += dt;
      if (fi.confirm) startFlight();
      camera.position.set(
        Math.sin(titleT * 0.07) * 480,
        90 + Math.sin(titleT * 0.11) * 40,
        Math.cos(titleT * 0.07) * 480,
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

        // placeholder target: nearest planet in a ~10 degree cone
        let tName: string | undefined;
        let tDist: number | undefined;
        ship.forward(tmpF);
        for (const p of planets) {
          tmpTo.copy(p.position).sub(ship.pos);
          const d = tmpTo.length();
          if (d > 3000) continue;
          tmpTo.divideScalar(d);
          if (tmpTo.dot(tmpF) > 0.995 && (tDist === undefined || d < tDist)) {
            tName = 'PLANÈTE';
            tDist = d;
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

    planets[0].rotation.y += dt * 0.15;
    planets[1].rotation.y += dt * 0.08;
    sky.position.copy(ship.pos);
    input.endFrame();
  },
  () => ps1.render(scene, camera),
);
loop.start();
