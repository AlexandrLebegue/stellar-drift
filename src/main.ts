import * as THREE from 'three';
import { GameLoop } from './core/loop';
import { RNG } from './core/prng';
import { PS1Pipeline } from './render/ps1';
import { makeSkybox, makeSun, makePlaceholderPlanet } from './world/skybox';

// Raw color pipeline (no sRGB<->linear conversions): colors are written
// as-is, like the PS1 framebuffer.
THREE.ColorManagement.enabled = false;

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ps1 = new PS1Pipeline(canvas);
ps1.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x070910, 500, 12000);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 60000);

const rng = new RNG(0x5eed1234);
scene.add(makeSkybox(rng, ps1.snapRes));
scene.add(makeSun(ps1.snapRes));
const planets = [
  makePlaceholderPlanet(rng, ps1.snapRes, 14, new THREE.Vector3(300, 0, 0)),
  makePlaceholderPlanet(rng, ps1.snapRes, 26, new THREE.Vector3(560, 0, 0)),
];
planets.forEach((p) => scene.add(p));
scene.add(new THREE.AmbientLight(0x55607a, 0.9));

camera.position.set(0, 60, 420);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ps1.resize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let t = 0;
const loop = new GameLoop(
  (dt) => {
    t += dt;
    planets[0].rotation.y += dt * 0.15;
    planets[1].rotation.y += dt * 0.08;
    camera.position.x = Math.sin(t * 0.05) * 500;
    camera.position.z = Math.cos(t * 0.05) * 500 + 200;
    camera.lookAt(0, 0, 0);
  },
  () => ps1.render(scene, camera),
);
loop.start();
