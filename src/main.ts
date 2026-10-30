import * as THREE from 'three';
import { GameLoop } from './core/loop';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100000);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, -100);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const loop = new GameLoop(
  () => {},
  () => {
    renderer.render(scene, camera);
  },
);
loop.start();
