import * as THREE from 'three';
import { GameLoop } from './core/loop';
import { RNG, hashStr } from './core/prng';
import { Input } from './core/input';
import { TouchControls } from './core/touch';
import { Game } from './core/state';
import { PS1Pipeline } from './render/ps1';
import { makeSkybox } from './world/skybox';
import { Galaxy, SystemDef, jumpCost, starLabel, anomalyLabel } from './world/galaxy';
import { StarSystem, StationBody } from './world/system';
import { Scanner, ScanTarget } from './world/scan';
import { BH_HORIZON, BH_DAMAGE, BH_PULL, WORM_ENTRY } from './world/anomaly';
import { HyperspaceTunnel } from './render/hyperspace';
import { Market } from './economy/market';
import { MusicPlayer } from './audio/music';
import { sfx } from './audio/sfx';
import { Ship } from './ship/ship';
import { SHIPS, ShipClass, ModuleType, MODULES, moduleCost } from './ship/shipdefs';
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
scene.fog = new THREE.Fog(0x070910, 800, 200000);
// far plane 4 M u + logarithmic depth (renderer flag): no z-fighting
// across 100 000+ u systems.
const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 4000000);

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
  sfx.ui();
  hud.flash('BIENVENUE A BORD');
}
function resume() {
  if (game.phase !== 'paused') return;
  game.phase = 'flying';
  screens.showPause(false);
  sfx.ui();
}
const screens = new Screens(
  startFlight,
  resume,
  input.isTouch ? 'PAYSAGE RECOMMANDÉ' : '',
  () => {
    Game.clearSave();
    location.reload();
  },
);

// --- hyperspace ---
let mapUI: GalaxyMapUI | null = null;
let jumpT = 0;
const JUMP_DUR = 2.8;
let jumpDest: SystemDef | null = null;

function openMap() {
  if (game.phase !== 'flying') return;
  game.phase = 'map';
  hud.setScan(null);
  sfx.ui();
  mapUI = new GalaxyMapUI(
    galaxy,
    game.player.systemId,
    ship.jumpRange,
    (ship.fuel / ship.fuelCap) * 100,
    startJump,
    closeMap,
    game.player.visited ?? [],
    game.player.sensed ?? [],
    () => save(),
  );
  mapUI.show();
}
function closeMap() {
  if (game.phase !== 'map') return;
  mapUI?.dispose();
  mapUI = null;
  game.phase = 'flying';
  sfx.ui();
}
function startJump(dest: SystemDef) {
  if (game.phase !== 'map') return;
  const cur = galaxy.byId(game.player.systemId);
  if (!cur) return closeMap();
  const d = distTo(cur, dest);
  const cost = jumpCost(d);
  const havePct = (ship.fuel / ship.fuelCap) * 100;
  if (d > ship.jumpRange + 0.01 || havePct < cost) return;
  ship.fuel -= (cost / 100) * ship.fuelCap;
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
  sfx.jump();
  hud.flash('SAUT HYPERSPATIAL…');
  save();
}

// wormhole entry: free teleport to the linked distant system (no fuel)
function wormholeJump() {
  const sys = system;
  if (!sys || !sys.def.anomaly?.target) return;
  const dest = galaxy.byId(sys.def.anomaly.target);
  if (!dest || dest.id === sys.def.id) return;
  if (sys.anomaly) sys.anomaly.visible = false;
  scene.remove(sys.group);
  sys.dispose();
  system = null;
  ship.group.visible = false;
  scene.add(tunnel.group);
  jumpDest = dest;
  jumpT = 0;
  game.phase = 'hyperspace';
  sfx.jump();
  hud.flash('TROU DE VER — TRAJET SANS CARBURANT…');
  save();
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
let heatWarned = false;

function loadSystem(def: SystemDef) {
  if (system) {
    scene.remove(system.group);
    system.dispose();
  }
  system = new StarSystem(def, ps1.snapRes);
  scene.add(system.group);
  game.systemName = def.name;
  game.player.systemId = def.id;
  scene.fog = new THREE.Fog(0x070910, system.fogNear, system.fogFar);
  heatWarned = false;
  // visiting a system reveals its anomaly on the map ("???")
  const visited = game.player.visited ?? (game.player.visited = []);
  if (!visited.includes(def.id)) visited.push(def.id);
  // safe arrival: well outside the star, facing it
  ship.reset(new THREE.Vector3(0, 0, system.spawnDist));
}

loadSystem(galaxy.byId(game.player.systemId) ?? galaxy.systems[0]);

// --- station menu ---
const menuCtx: MenuContext = {
  game,
  market: null as unknown as Market,
  station: null as never,
  hold: ship.hold,
  fuel: (ship.fuel / ship.fuelCap) * 100,
  hull: (ship.hull / ship.hullMax) * 100,
  ships: [],
  modules: [],
  paint: '#b8bec8',
  onFuel: (pct) => {
    ship.fuel = Math.min(ship.fuelCap, ship.fuel + (ship.fuelCap * pct) / 100);
    menuCtx.fuel = (ship.fuel / ship.fuelCap) * 100;
    save();
  },
  onRepair: (pct) => {
    ship.hull = Math.min(ship.hullMax, ship.hull + (ship.hullMax * pct) / 100);
    menuCtx.hull = (ship.hull / ship.hullMax) * 100;
    save();
  },
  onBuyShip: buyShip,
  onBuyModule: buyModule,
  onPaint: paintShip,
  onExit: () => undock(),
};
let stationMenu: StationMenu | null = null;

// persist fuel/hull/position with the rest of the save
function save() {
  game.player.fuel = ship.fuel;
  game.player.hull = ship.hull;
  game.player.pos = [ship.pos.x, ship.pos.y, ship.pos.z];
  game.player.quat = [ship.quat.x, ship.quat.y, ship.quat.z, ship.quat.w];
  game.save();
}

function reconfigureScanner() {
  scanner.setParams(ship.scanRange, ship.scanTime);
}

// apply saved ship/modules/paint/fuel/hull (at boot and after purchases)
function applyLoadout() {
  const cls = game.player.currentShip as ShipClass;
  if (cls in SHIPS) ship.setShip(cls);
  ship.setPaint(game.player.paint);
  ship.recompute(game.player.modules as Record<ModuleType, number>);
  ship.fuel = Math.min(game.player.fuel, ship.fuelCap);
  ship.hull = Math.min(game.player.hull, ship.hullMax);
  // restore saved position for the system we actually loaded
  if (
    system &&
    game.player.systemId === system.def.id &&
    Array.isArray(game.player.pos) &&
    game.player.pos.length === 3
  ) {
    ship.pos.set(game.player.pos[0], game.player.pos[1], game.player.pos[2]);
    if (Array.isArray(game.player.quat) && game.player.quat.length === 4) {
      ship.quat
        .set(
          game.player.quat[0],
          game.player.quat[1],
          game.player.quat[2],
          game.player.quat[3],
        )
        .normalize();
    }
    // migration: old saves used a compact scale — a stored position can now
    // be inside the (much bigger) star or far outside the system.
    const d = ship.pos.length();
    if (d < system.starRadius * 1.35 || d > system.outermost * 2.5 || d < 60) {
      const dir = d > 1 ? ship.pos.clone().normalize() : new THREE.Vector3(0, 0, 1);
      ship.pos.copy(dir).multiplyScalar(system.spawnDist);
    }
    ship.updateCamera(0.1);
  }
  reconfigureScanner();
}

function refreshMenuCtx() {
  if (!stationMenu) return;
  menuCtx.hold = ship.hold;
  menuCtx.fuel = (ship.fuel / ship.fuelCap) * 100;
  menuCtx.hull = (ship.hull / ship.hullMax) * 100;
  menuCtx.paint = game.player.paint;
  menuCtx.ships = (['sparrow', 'mule', 'falcon'] as ShipClass[]).map((cls) => {
    const d = SHIPS[cls];
    return {
      cls,
      name: d.name.toUpperCase(),
      desc: d.desc,
      price: d.price,
      stats:
        'VIT ' + Math.round(d.maxSpeed) +
        ' — SOUTE ' + d.hold +
        ' — SAUT ' + d.jumpRange +
        ' — SCAN ' + d.scanRange,
      owned: game.player.shipsOwned.includes(cls),
      current: game.player.currentShip === cls,
    };
  });
  menuCtx.modules = MODULES.map((m) => ({
    type: m.type,
    name: m.name,
    level: game.player.modules[m.type] ?? 0,
    max: m.max,
    cost: moduleCost(m, game.player.modules[m.type] ?? 0),
  }));
  stationMenu.render();
}

function buyShip(cls: ShipClass) {
  const d = SHIPS[cls];
  if (d.price === 0) return;
  const owned = game.player.shipsOwned.includes(cls);
  if (!owned && game.player.credits < d.price) return;
  if (!owned) {
    game.player.credits -= d.price;
    game.player.shipsOwned.push(cls);
  }
  game.player.currentShip = cls;
  ship.setShip(cls);
  ship.setPaint(game.player.paint);
  ship.recompute(game.player.modules as Record<ModuleType, number>);
  reconfigureScanner();
  save();
  refreshMenuCtx();
}

function buyModule(t: ModuleType) {
  const def = MODULES.find((m) => m.type === t);
  if (!def) return;
  const lvl = game.player.modules[t] ?? 0;
  if (lvl >= def.max) return;
  const cost = moduleCost(def, lvl);
  if (game.player.credits < cost) return;
  game.player.credits -= cost;
  game.player.modules[t] = lvl + 1;
  ship.recompute(game.player.modules as Record<ModuleType, number>);
  reconfigureScanner();
  save();
  refreshMenuCtx();
}

function paintShip(c: string) {
  game.player.paint = c;
  ship.setPaint(c);
  save();
  refreshMenuCtx();
}

let dockTarget: StationBody | null = null;
let dockCooldown = 0;
let dockPrompted = false;
let dockOrbitT = 0;

function openMenu(st: StationBody) {
  menuCtx.market = new Market(hashStr(st.def.id), st.def.type);
  menuCtx.station = st.def;
  if (!stationMenu) stationMenu = new StationMenu(menuCtx);
  stationMenu.ctx = menuCtx;
  refreshMenuCtx();
  stationMenu.show();
}

function undock() {
  if (!dockTarget) return;
  const center = dockTarget.mesh.getWorldPosition(posPool[10]);
  const padPos = dockTarget.pad.getWorldPosition(posPool[11]);
  const dir = tmpA.copy(padPos).sub(center).normalize();
  ship.pos.copy(padPos).addScaledVector(dir, 120);
  ship.vel.copy(dir).multiplyScalar(15);
  ship.quat.copy(dockTarget.mesh.getWorldQuaternion(tmpQ));
  ship.group.visible = true;
  ship.cameraPos.copy(ship.pos).addScaledVector(dir, 60);
  dockTarget = null;
  if (stationMenu) stationMenu.hide();
  game.phase = 'flying';
  hud.flash('AMARRAGE LIBÉRÉ');
  save();
}

window.addEventListener('beforeunload', () => save());

// Distance to the nearest body surface (star, planets, stations) in u.
// Drives the supercruise auto-brake.
function computeClearance(): number {
  if (!system) return 1e9;
  let best = ship.pos.length() - system.starRadius;
  for (const p of system.planets) {
    p.mesh.getWorldPosition(tmpA);
    best = Math.min(best, tmpA.distanceTo(ship.pos) - p.data.radius);
  }
  for (const s of system.stations) {
    s.mesh.getWorldPosition(tmpA);
    best = Math.min(best, tmpA.distanceTo(ship.pos) - 160);
  }
  return Math.max(0, best);
}

// Ship destroyed (swallowed by the star): respawn at safe distance,
// hull restored, credits penalized.
function crashShip(reason: string) {
  if (!system) return;
  game.player.credits = Math.floor(game.player.credits * 0.85);
  sfx.crash();
  hud.flash(reason + ' — RÉCUPÉRATION, -15% CR');
  ship.reset(new THREE.Vector3(0, 0, system.spawnDist));
  ship.hull = ship.hullMax;
  heatWarned = false;
  save();
}

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
let lastFuelP = 100;
let lastHullP = 100;
let autoT = 0;
let bootT = 0;
let qTimer = 0;
let fpsAcc = 0;
let fpsN = 0;
let qualityH = 240;
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const posPool: THREE.Vector3[] = Array.from({ length: 12 }, () => new THREE.Vector3());
let titleT = 0;

const scanner = new Scanner(2500, 3, (rec) => {
  if (system) rec.systemId = system.def.id;
  game.player.scans[rec.planetId] = rec;
  sfx.scanDone();
  if (rec.planetId.startsWith('wreck-')) {
    // alien wreck: one-shot loot + lore (persisted in the save)
    const sysId = rec.planetId.slice('wreck-'.length);
    const loot = game.player.loot ?? (game.player.loot = []);
    if (!loot.includes(sysId)) {
      loot.push(sysId);
      game.player.credits += 5000;
      hud.flash(
        'ÉPAVE EXTRATERRESTRE — « LE NAVIRE QUI NE REVIENDRA PAS » +5000 CR',
        6000,
      );
    } else {
      hud.flash('ÉPAVE VIDE — RIEN À RÉCUPÉRER');
    }
  } else {
    hud.flash('SCAN « ' + rec.name + ' » — ' + rec.price + ' CR (VENDABLE EN STATION)');
  }
  save();
});

applyLoadout();

// test/inspection hook: `?dbg=1` exposes game internals on window
if (new URLSearchParams(location.search).has('dbg')) {
  (window as any).__dbg = {
    game,
    galaxy,
    ship,
    THREE,
    get system() {
      return system;
    },
  };
}

// --- audio: unlock on first interaction, mute persisted ---
const music = new MusicPlayer([
  'audio/01-observing-the-star.mp3',
  'audio/02-starfield-romance.mp3',
  'audio/03-scifi-ambient.mp3',
  'audio/04-drifting-beyond-the-stars.mp3',
  'audio/05-beyond-the-stars.mp3',
]);
const AUDIO_KEY = 'stellar-drift.audio';
const audioMuted = () => localStorage.getItem(AUDIO_KEY) === '1';

function setAudio(m: boolean) {
  sfx.setMuted(m);
  music.setMuted(m);
  localStorage.setItem(AUDIO_KEY, m ? '1' : '0');
  const b = document.getElementById('hud-mute');
  if (b) b.textContent = m ? 'SON: OFF' : 'SON: ON';
}

setAudio(audioMuted());

const unlock = () => {
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
  sfx.ui();
  music.start();
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

const muteBtn = document.getElementById('hud-mute');
if (muteBtn) {
  muteBtn.addEventListener('click', () => setAudio(!audioMuted()));
  muteBtn.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      setAudio(!audioMuted());
    },
    { passive: false },
  );
}

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
    if (d < 500 && d < bestD) {
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
      const r = Math.min(90000, Math.max(5000, (system?.starRadius ?? 1000) * 14));
      camera.position.set(
        Math.sin(titleT * 0.07) * r,
        r * 0.2 + Math.sin(titleT * 0.11) * r * 0.08,
        Math.cos(titleT * 0.07) * r,
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
        if (fi.supercruise) {
          const on = ship.toggleSupercruise();
          sfx.ui();
          hud.flash(on ? 'SUPER-CRUISE — VITESSE ×65 LOIN DES CORPS' : 'MODE CRUISE — VITESSE NORMALE');
        }
        ship.setThrottle(fi.throttleIn, dt);
        ship.update(dt, fi, computeClearance());
        ship.getCamera(camera);
        ship.forward(tmpF);

        // star exclusion zone: heat damage near the surface, death inside
        if (system) {
          const dStar = ship.pos.length();
          const R = system.starRadius;
          if (system.def.anomaly?.kind === 'trou-noir') {
            // black hole: gravity well, tidal damage, event horizon
            if (dStar < BH_PULL) {
              const a = Math.min(4000, 80 * Math.pow(BH_PULL / Math.max(1, dStar), 1.5));
              tmpB.copy(ship.pos).multiplyScalar(-1 / dStar);
              ship.vel.addScaledVector(tmpB, a * dt);
            }
            if (dStar < BH_DAMAGE) {
              const depth = 1 - dStar / BH_DAMAGE;
              ship.hull = Math.max(0, ship.hull - (6 + 50 * depth * depth) * dt);
              if (!heatWarned) {
                heatWarned = true;
                hud.flash('ATTENTION — TROU NOIR : MARÉE LÉTALE, ÉCARTER-VOUS');
              }
            } else if (heatWarned) {
              heatWarned = false;
            }
            if (dStar < BH_HORIZON) crashShip('ASPIRÉ PAR LE TROU NOIR');
          } else {
            if (dStar < R * 1.25) {
              const depth = 1 - dStar / (R * 1.25);
              ship.hull = Math.max(0, ship.hull - (6 + 50 * depth * depth) * dt);
              if (!heatWarned) {
                heatWarned = true;
                hud.flash('ATTENTION — CHALEUR STELLAIRE, ÉCARTER-VOUS');
              }
            } else if (heatWarned) {
              heatWarned = false;
            }
            if (dStar < R) crashShip('DÉTRUIT PAR LA CHALEUR DE L\'ÉTOILE');
          }

          // wormhole: entering the portal teleports to the linked system
          if (system.anomaly && system.def.anomaly?.kind === 'trou-de-ver' && system.anomaly.visible) {
            system.anomaly.getWorldPosition(tmpA);
            if (tmpA.distanceTo(ship.pos) < WORM_ENTRY) wormholeJump();
          }
        }

        if (fi.scan) sfx.scanTick(scanner.progress);

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
          // alien wreck: scannable, one-shot loot
          if (
            system.anomaly &&
            system.def.anomaly?.kind === 'epave' &&
            !(game.player.loot ?? []).includes(system.def.id)
          ) {
            system.anomaly.getWorldPosition(posPool[i++]);
            targets.push({
              id: 'wreck-' + system.def.id,
              name: 'ÉPAVE EXTRATERRESTRE',
              type: 'epave',
              composition: { fer: 0, silicates: 0, eau: 0, methane: 0, rares: 100, autre: 0 },
              habitability: 0,
              scienceValue: 40,
              position: posPool[i - 1],
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
            if (d > 40000) continue;
            tmpA.divideScalar(d);
            if (tmpA.dot(tmpF) > 0.995 && (tDist === undefined || d < tDist)) {
              tName = p.data.name.toUpperCase() + (game.player.scans[p.data.id] ? ' [SCANNÉE]' : '');
              tDist = d;
            }
          }
          if (system.anomaly && system.def.anomaly?.kind === 'epave') {
            system.anomaly.getWorldPosition(tmpA).sub(ship.pos);
            const d = tmpA.length();
            if (d > 1 && d < 40000) {
              tmpA.divideScalar(d);
              if (tmpA.dot(tmpF) > 0.995 && (tDist === undefined || d < tDist)) {
                tName =
                  'ÉPAVE EXTRATERRESTRE' +
                  ((game.player.loot ?? []).includes(system.def.id) ? ' [VIDÉE]' : '');
                tDist = d;
              }
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
            sfx.dock();
          } else {
            ship.hull = Math.max(0, ship.hull - 15);
            ship.vel.addScaledVector(tmpB, 18);
            dockCooldown = 2;
            sfx.crash();
            hud.flash(
              speed >= 10
                ? 'AMARRAGE ÉCHOUÉ — TROP RAPIDE (COQUE -15)'
                : 'AMARRAGE ÉCHOUÉ — MAL ALIGNÉ (COQUE -15)',
            );
          }
        }

        hud.update({
          system: game.systemName,
          starType: system
            ? system.def.anomaly
              ? anomalyLabel(system.def.anomaly.kind).toUpperCase()
              : 'ÉTOILE ' + starLabel(system.def.star.type)
            : undefined,
          credits: game.player.credits,
          speed: ship.vel.length(),
          throttle: ship.throttle,
          fuel: (ship.fuel / ship.fuelCap) * 100,
          hull: (ship.hull / ship.hullMax) * 100,
          targetName: tName,
          targetDist: tDist,
          supercruise: ship.supercruise,
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
          save();
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
          c.x + Math.cos(dockOrbitT) * 320,
          c.y + 110,
          c.z + Math.sin(dockOrbitT) * 320,
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
        save();
      }
    } else if (game.phase === 'paused') {
      if (fi.confirm || fi.back) resume();
    }

    if (system) system.update(dt);
    sky.position.copy(ship.pos);
    sfx.engine(game.phase === 'flying' ? ship.throttle : 0, game.phase === 'flying');

    // periodic autosave while playing
    autoT += dt;
    if (autoT >= 10 && (game.phase === 'flying' || game.phase === 'docked')) {
      autoT = 0;
      save();
    }

    // low fuel / low hull warnings (flash on threshold crossing)
    const fuelP = (ship.fuel / ship.fuelCap) * 100;
    if (fuelP < 10 && lastFuelP >= 10) hud.flash('CARBURANT BAS — RAFRAÎCHIR EN STATION');
    lastFuelP = fuelP;
    const hullP = (ship.hull / ship.hullMax) * 100;
    if (hullP < 20 && lastHullP >= 20) hud.flash('COQUE ENDOMMAGÉE — RÉPARER EN STATION');
    lastHullP = hullP;

    // adaptive low-res frame height (mobile perf, hysteresis 45/57 fps)
    bootT += dt;
    qTimer += dt;
    fpsAcc += dt;
    fpsN++;
    if (qTimer >= 2) {
      const fps = fpsAcc > 0 ? fpsN / fpsAcc : 60;
      if (bootT > 5 && fps < 45 && qualityH > 160) {
        qualityH = qualityH === 240 ? 200 : 160;
        ps1.setQuality(qualityH);
      } else if (fps > 57 && qualityH < 240) {
        qualityH = Math.min(240, qualityH + 40);
        ps1.setQuality(qualityH);
      }
      fpsAcc = 0;
      fpsN = 0;
      qTimer = 0;
    }

    input.endFrame();
    touch.endFrame();
  },
  () => ps1.render(scene, camera),
);
loop.start();
