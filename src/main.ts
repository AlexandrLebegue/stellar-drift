import * as THREE from 'three';
import { GameLoop } from './core/loop';
import { RNG, hashStr } from './core/prng';
import { Input } from './core/input';
import { TouchControls } from './core/touch';
import { Game } from './core/state';
import { PS1Pipeline } from './render/ps1';
import { makeSkybox } from './world/skybox';
import { Galaxy, SystemDef, jumpCost } from './world/galaxy';
import { StarSystem, StationBody } from './world/system';
import { Scanner, ScanTarget } from './world/scan';
import { HyperspaceTunnel } from './render/hyperspace';
import { Market } from './economy/market';
import { Ship } from './ship/ship';
import { HUD } from './ui/hud';
import { Screens } from './ui/title';
import { StationMenu, MenuContext } from './ui/stationMenu';
import { GalaxyMapUI, distTo } from './ui/galaxyMap';
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

// --- hyperspace ---
let mapUI: GalaxyMapUI | null = null;
let jumpT = 0;
const JUMP_DUR = 2.8;
let jumpDest: SystemDef | null = null;

function openMap() {
  if (game.phase !== 'flying') return;
  game.phase = 'map';
  hud.setScan(null);
  mapUI = new GalaxyMapUI(
    galaxy,
    game.player.systemId,
    ship.jumpRange,
    ship.fuel,
    startJump,
    closeMap,
  );
  mapUI.show();
}
function closeMap() {
  if (game.phase !== 'map') return;
  mapUI?.dispose();
  mapUI = null;
  game.phase = 'flying';
}
function startJump(dest: SystemDef) {
  if (game.phase !== 'map') return;
  const cur = galaxy.byId(game.player.systemId);
  if (!cur) return closeMap();
  const d = distTo(cur, dest);
  const cost = jumpCost(d);
  if (d > ship.jumpRange + 0.01 || ship.fuel < cost) return;
  ship.fuel -= cost;
  mapUI?.dispose();
  mapUI = null;
  if (system) {
    scene.remove(system.group);
    system.dispose();
  }
  system = null;
  ship.group.visible = false;
  scene.add(tunnel.group);
  jumpDest = dest;
  jumpT = 0;
  game.phase = 'hyperspace';
  hud.flash('SAUT HYPERSPATIAL…');
  game.save();
}

// --- procedural universe ---
const GALAXY_SEED = 0x5eed1234;
const galaxy = new Galaxy(GALAXY_SEED, 120);
const sky = makeSkybox(new RNG(0xabc123), ps1.snapRes);
scene.add(sky);
scene.add(new THREE.AmbientLight(0x55607a, 0.9));

const ship = new Ship(ps1.snapRes);
scene.add(ship.group);

const tunnel = new HyperspaceTunnel(ps1.snapRes);

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

// --- station menu ---
const menuCtx: MenuContext = {
  game,
  market: null as unknown as Market,
  station: null as never,
  hold: ship.hold,
  fuel: ship.fuel,
  hull: ship.hull,
  onFuel: (pct) => {
    ship.fuel = Math.min(100, ship.fuel + pct);
    menuCtx.fuel = ship.fuel;
    game.save();
  },
  onRepair: (pct) => {
    ship.hull = Math.min(100, ship.hull + pct);
    menuCtx.hull = ship.hull;
    game.save();
  },
  onExit: () => undock(),
};
let stationMenu: StationMenu | null = null;

let dockTarget: StationBody | null = null;
let dockCooldown = 0;
let dockPrompted = false;
let dockOrbitT = 0;

function openMenu(st: StationBody) {
  menuCtx.market = new Market(hashStr(st.def.id), st.def.type);
  menuCtx.station = st.def;
  menuCtx.fuel = ship.fuel;
  menuCtx.hull = ship.hull;
  if (!stationMenu) stationMenu = new StationMenu(menuCtx);
  stationMenu.ctx = menuCtx;
  stationMenu.show();
}

function undock() {
  if (!dockTarget) return;
  const center = dockTarget.mesh.getWorldPosition(posPool[10]);
  const padPos = dockTarget.pad.getWorldPosition(posPool[11]);
  const dir = tmpA.copy(padPos).sub(center).normalize();
  ship.pos.copy(padPos).addScaledVector(dir, 30);
  ship.vel.copy(dir).multiplyScalar(10);
  ship.quat.copy(dockTarget.mesh.getWorldQuaternion(tmpQ));
  ship.group.visible = true;
  ship.cameraPos.copy(ship.pos).addScaledVector(dir, 20);
  dockTarget = null;
  if (stationMenu) stationMenu.hide();
  game.phase = 'flying';
  hud.flash('AMARRAGE LIBÉRÉ');
  game.save();
}

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
const tmpU = new THREE.Vector3();
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const posPool: THREE.Vector3[] = Array.from({ length: 12 }, () => new THREE.Vector3());
let titleT = 0;

const scanner = new Scanner(900, 3, (rec) => {
  if (system) rec.systemId = system.def.id;
  game.player.scans[rec.planetId] = rec;
  hud.flash('SCAN « ' + rec.name + ' » — ' + rec.price + ' CR (VENDABLE EN STATION)');
  game.save();
});

// nearest station within docking range of its pad
function findStation(): { st: StationBody; pad: THREE.Vector3; d: number } | null {
  if (!system) return null;
  let best: StationBody | null = null;
  let bestD = Infinity;
  let bi = 10;
  for (let i = 0; i < system.stations.length; i++) {
    const st = system.stations[i];
    st.pad.getWorldPosition(posPool[i]);
    const d = posPool[i].distanceTo(ship.pos);
    if (d < 260 && d < bestD) {
      best = st;
      bestD = d;
      bi = i;
    }
  }
  if (!best) return null;
  return { st: best, pad: posPool[bi], d: bestD };
}

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
      if (game.phase === 'flying' && (fi.map || fi.jump)) openMap();
      if (game.phase === 'flying') {
        ship.setThrottle(fi.throttleIn, dt);
        ship.update(dt, fi);
        ship.getCamera(camera);
        ship.forward(tmpF);

        // scan (held): must stay on target, in range, not already scanned
        if (system) {
          const targets: ScanTarget[] = [];
          let i = 0;
          for (const p of system.planets) {
            if (game.player.scans[p.data.id]) continue;
            targets.push({
              id: p.data.id,
              name: p.data.name,
              type: p.data.type,
              composition: p.data.composition,
              habitability: p.data.habitability,
              scienceValue: p.data.scienceValue,
              position: p.mesh.getWorldPosition(posPool[i++]),
            });
          }
          scanner.update(dt, fi.scan, ship.pos, tmpF, targets);
        }
        hud.setScan(fi.scan ? scanner.progress : null);

        // HUD target: nearest planet in a ~10 degree cone
        let tName: string | undefined;
        let tDist: number | undefined;
        if (system) {
          for (const p of system.planets) {
            p.mesh.getWorldPosition(tmpA).sub(ship.pos);
            const d = tmpA.length();
            if (d > 4000) continue;
            tmpA.divideScalar(d);
            if (tmpA.dot(tmpF) > 0.995 && (tDist === undefined || d < tDist)) {
              tName = p.data.name.toUpperCase() + (game.player.scans[p.data.id] ? ' [SCANNÉE]' : '');
              tDist = d;
            }
          }
        }

        // docking approach
        dockCooldown = Math.max(0, dockCooldown - dt);
        const near = findStation();
        touch.setDockVisible(!!near);
        if (near && !dockPrompted) {
          dockPrompted = true;
          hud.flash('STATION EN VUE — VITESSE < 10, ALIGNÉ, PUIS K / DOCK');
        }
        if (!near && dockPrompted) dockPrompted = false;
        if (fi.dock && near && dockCooldown <= 0) {
          tmpB.copy(near.pad).sub(ship.pos);
          const d = tmpB.length();
          tmpB.divideScalar(d);
          const speed = ship.vel.length();
          const aligned = tmpB.dot(tmpF) > 0.9;
          if (speed < 10 && aligned) {
            dockTarget = near.st;
            game.phase = 'docking';
            hud.setScan(null);
          } else {
            ship.hull = Math.max(0, ship.hull - 15);
            ship.vel.addScaledVector(tmpB, 18);
            dockCooldown = 2;
            hud.flash(
              speed >= 10
                ? 'AMARRAGE ÉCHOUÉ — TROP RAPIDE (COQUE -15)'
                : 'AMARRAGE ÉCHOUÉ — MAL ALIGNÉ (COQUE -15)',
            );
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
    } else if (game.phase === 'docking') {
      if (!dockTarget || !system) {
        game.phase = 'flying';
      } else {
        const padPos = dockTarget.pad.getWorldPosition(posPool[10]);
        const k = 1 - Math.exp(-3 * dt);
        ship.pos.lerp(padPos, k);
        dockTarget.mesh.getWorldQuaternion(tmpQ);
        ship.quat.slerp(tmpQ, k);
        ship.vel.multiplyScalar(Math.exp(-4 * dt));
        ship.group.position.copy(ship.pos);
        ship.group.quaternion.copy(ship.quat);
        ship.updateCamera(dt);
        ship.getCamera(camera);
        if (ship.pos.distanceTo(padPos) < 4) {
          ship.pos.copy(padPos);
          ship.group.visible = false;
          dockOrbitT = 0;
          game.phase = 'docked';
          hud.setScan(null);
          openMenu(dockTarget);
          game.save();
        }
      }
    } else if (game.phase === 'docked') {
      if (!dockTarget) {
        game.phase = 'flying';
      } else {
        // slow cinematic orbit around the station
        dockOrbitT += dt * 0.15;
        const c = dockTarget.mesh.getWorldPosition(posPool[10]);
        camera.position.set(
          c.x + Math.cos(dockOrbitT) * 130,
          c.y + 45,
          c.z + Math.sin(dockOrbitT) * 130,
        );
        camera.lookAt(c);
      }
    } else if (game.phase === 'map') {
      if (fi.back) closeMap();
    } else if (game.phase === 'hyperspace') {
      jumpT += dt;
      const t = Math.min(1, jumpT / JUMP_DUR);
      const s = Math.sin(Math.PI * t);
      tunnel.update(dt, s);
      camera.position.set(0, 0, 0);
      camera.quaternion.identity();
      camera.fov = 62 + 38 * s;
      camera.updateProjectionMatrix();
      if (t >= 1) {
        scene.remove(tunnel.group);
        if (jumpDest) loadSystem(jumpDest);
        jumpDest = null;
        game.phase = 'flying';
        camera.fov = 62;
        camera.updateProjectionMatrix();
        hud.flash('BIENVENUE À ' + game.systemName.toUpperCase());
        game.save();
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
