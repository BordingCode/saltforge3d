// Saltforge 3D — a first-person voxel duel of fortresses. Gather, build, scout, bombard.
import * as THREE from 'three';
import { WORLD, SEA_LEVEL, BLOCK } from './config.js';
import { World } from './voxel/world.js';
import { ChunkManager } from './voxel/chunks.js';
import { raycastVoxel } from './voxel/raycast.js';
import { generate, PLAYER_ISLAND, ENEMY_ISLAND } from './world/worldgen.js';
import { EnemyFog } from './world/fog.js';
import { Player } from './player/controls.js';
import { CombatSystem } from './combat/combat.js';
import { Audio } from './engine/audio.js';
import { GameState, TOOL } from './game/state.js';
import { Keeps } from './game/keeps.js';
import { Rival } from './ai/rival.js';
import { initHUD, setTool, updateHUD, toast, showEnd, hitMarker } from './ui/hud.js';

// ---- Renderer / scene ----
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
const sky = new THREE.Color(0x9fb8c8);
scene.background = sky;
scene.fog = new THREE.Fog(sky, 70, 260);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 600);
scene.add(new THREE.HemisphereLight(0xdcefff, 0x4a4030, 1.0));
const sun = new THREE.DirectionalLight(0xfff3d0, 0.7);
sun.position.set(50, 90, 30);
scene.add(sun);

const seaMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD.X * 4, WORLD.Z * 4),
  new THREE.MeshLambertMaterial({ color: 0x2a6fb0, transparent: true, opacity: 0.8 })
);
seaMesh.rotation.x = -Math.PI / 2;
seaMesh.position.set(WORLD.X / 2, SEA_LEVEL + 0.35, WORLD.Z / 2);
scene.add(seaMesh);

// ---- World ----
const world = new World();
generate(world, 'saltforge');
const chunks = new ChunkManager(world, scene, new THREE.MeshLambertMaterial({ vertexColors: true }));
const meshCount = chunks.buildAll();

const keeps = new Keeps(world);
const fog = new EnemyFog(scene, ENEMY_ISLAND, SEA_LEVEL + 11);

// ---- Player ----
const audio = new Audio();
const player = new Player(world, camera, canvas);
const sx = Math.floor(PLAYER_ISLAND.cx), sz = Math.floor(PLAYER_ISLAND.cz - 13);
let sy = WORLD.Y - 1;
while (sy > 0 && !world.isSolid(sx, sy, sz)) sy--;
player.spawn(sx + 0.5, sy + 1, sz + 0.5);
player.yaw = Math.PI;     // face +z toward the enemy island
player.pitch = -0.1;

// ---- Systems ----
const state = new GameState();
const combat = new CombatSystem(scene, world, audio);
const rival = new Rival(world, scene, keeps, audio);
const hud = initHUD();
rival.onMessage = (m) => toast(hud, m, 2800);
// Player landed a shell on the enemy Keep — the core payoff: sound + hit-marker + punchy bar + toast.
combat.onKeepHit = (n) => {
  audio.keepHit();
  hitMarker(hud, keeps);
  toast(hud, `Direct hit on their Keep! −${n}`, 1600);
};
setTool(hud, state.tool);

// ---- Interaction ----
const _dir = new THREE.Vector3(), _org = new THREE.Vector3();
function aim() { player.lookDir(_dir); _org.copy(camera.position); return { o: _org, d: _dir }; }

function doMine() {
  const { o, d } = aim();
  const hit = raycastVoxel(world, o, d, 6);
  if (!hit) return;
  if (hit.block === BLOCK.KEEP) { toast(hud, 'You can’t mine your own Keep.'); return; }
  if (hit.block === BLOCK.FIRESALT) { state.firesalt += 1; toast(hud, '+1 firesalt (cannon ammo!)'); }
  else state.stone += 1;
  combat.debris.burst([[hit.x, hit.y, hit.z, hit.block]], new THREE.Vector3(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5));
  world.set(hit.x, hit.y, hit.z, BLOCK.AIR);
  audio.tap();
}

function doBuild() {
  if (state.stone <= 0) { toast(hud, 'No stone — mine some first (press 1).'); return; }
  const { o, d } = aim();
  const hit = raycastVoxel(world, o, d, 6);
  if (!hit) return;
  const px = hit.x + hit.nx, py = hit.y + hit.ny, pz = hit.z + hit.nz;
  if (world.get(px, py, pz) !== BLOCK.AIR) return;
  // don't seal yourself inside a block
  const within = px === Math.floor(player.pos.x) && pz === Math.floor(player.pos.z) &&
    py >= Math.floor(player.pos.y) && py <= Math.floor(player.pos.y + player.height);
  if (within) return;
  world.set(px, py, pz, BLOCK.STONE);
  state.stone -= 1;
  audio.tap();
}

let scoutCd = 0;
function doScout() {
  if (scoutCd > 0) return;
  scoutCd = 0.35;
  if (state.reveal >= 1) { toast(hud, 'The enemy fort is fully scouted.'); return; }
  state.reveal = Math.min(1, state.reveal + 0.17);
  audio.ping();
  if (state.reveal >= 1) toast(hud, 'Enemy fort fully revealed — aim for the gold Keep!');
  else if (state.reveal >= 0.6) toast(hud, 'Their walls and cannons come into view…');
  else toast(hud, 'A silhouette emerges through the fog…');
}

function doFire() {
  if (state.firesalt <= 0) { toast(hud, 'Out of firesalt! Dig deep under your island (press 1).'); return; }
  state.firesalt -= 1;
  state.shotsFired += 1;
  const { o, d } = aim();
  _org.copy(o).addScaledVector(d, 1.2);
  combat.fire(_org, d);
}

function doRepair() {
  const pc = keeps.playerCenter();
  if (camera.position.distanceTo(pc) > 16) { toast(hud, 'Stand by your Keep to repair it.'); return; }
  // Rate cap: repair has a cooldown and a small per-use limit, so a fully-armed rival out-paces
  // pure turtling — the deepest-ammo offence valve still wins. Honest, not a hidden multiplier.
  if (state.repairCd > 0) { toast(hud, `Crew still working — repair ready in ${state.repairCd.toFixed(1)}s.`); return; }
  const missing = keeps.playerMax - keeps.playerHP();
  if (missing <= 0) { toast(hud, 'Your Keep is intact.'); return; }
  const n = Math.min(missing, Math.floor(state.stone / 3), 2);
  if (n <= 0) { toast(hud, 'Need 3 stone per Keep block.'); return; }
  keeps.repairPlayer(n);
  state.stone -= n * 3;
  state.repairCd = 3.5;
  toast(hud, `Repaired ${n} Keep block${n > 1 ? 's' : ''} — answer their fire, don't just turtle.`);
  audio.tap();
}

// ---- Input ----
const overlay = document.getElementById('overlay');
canvas.addEventListener('click', () => { canvas.requestPointerLock(); audio.resume(); });
document.addEventListener('pointerlockchange', () => {
  overlay.style.display = document.pointerLockElement === canvas ? 'none' : 'flex';
});
addEventListener('keydown', (e) => {
  if (e.code === 'Digit1') { state.tool = TOOL.MINE; setTool(hud, state.tool); }
  else if (e.code === 'Digit2') { state.tool = TOOL.BUILD; setTool(hud, state.tool); }
  else if (e.code === 'Digit3') { state.tool = TOOL.SCOUT; setTool(hud, state.tool); }
  else if (e.code === 'Digit4') { state.tool = TOOL.CANNON; setTool(hud, state.tool); }
  else if (e.code === 'KeyR') doRepair();
});
canvas.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== canvas || e.button !== 0 || state.over) return;
  audio.resume();
  if (state.tool === TOOL.MINE) doMine();
  else if (state.tool === TOOL.BUILD) doBuild();
  else if (state.tool === TOOL.SCOUT) doScout();
  else if (state.tool === TOOL.CANNON) doFire();
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function endGame(won) {
  if (state.over) return;
  state.over = true; state.won = won;
  showEnd(hud, won, {
    destroyed: combat.destroyed,
    enemyHP: keeps.enemyHP(), enemyMax: keeps.enemyMax,
    playerHP: keeps.playerHP(), playerMax: keeps.playerMax,
    firesalt: state.firesalt,
    shotsFired: state.shotsFired,
    rivalFired: rival.firedCount,
  });
  audio.fanfare(won);
  if (document.pointerLockElement === canvas) document.exitPointerLock();
}

// ---- Loop ----
let last = performance.now(), acc = 0, frames = 0;
const fpsEl = document.getElementById('fps');
function loop(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05;
  const t = now / 1000;

  if (!state.over) {
    player.update(dt);
    rival.update(dt, t);
    if (scoutCd > 0) scoutCd -= dt;
    if (state.repairCd > 0) state.repairCd = Math.max(0, state.repairCd - dt);
  }
  const { o, d } = aim();
  if (state.tool === TOOL.CANNON && !state.over) {
    _org.copy(o).addScaledVector(d, 1.2);
    combat.updatePreview(_org, d);
    combat.preview.visible = true;
  } else {
    combat.preview.visible = false;
  }
  combat.update(dt);
  fog.setReveal(state.reveal);
  chunks.processDirty(8);
  renderer.render(scene, camera);

  if (!state.over) {
    if (keeps.enemyHP() <= 0) endGame(true);
    else if (keeps.playerHP() <= 0) endGame(false);
  }

  frames++; acc += dt;
  if (acc >= 0.4) {
    fpsEl.textContent = Math.round(frames / acc) + ' fps';
    updateHUD(hud, state, keeps, rival);
    frames = 0; acc = 0;
  }
  requestAnimationFrame(loop);
}
updateHUD(hud, state, keeps, rival);
requestAnimationFrame(loop);

// Debug hooks for headless verification.
window.__sf = {
  world, player, combat, rival, keeps, fog, state, chunks, scene, THREE, meshCount,
  scout: doScout, fire: doFire, mine: doMine, build: doBuild, repair: doRepair,
  fireDir: (yc) => { const dir = new THREE.Vector3(0, yc, Math.sqrt(Math.max(0, 1 - yc * yc))).normalize();
    const org = camera.position.clone().addScaledVector(dir, 1.2); combat.fire(org, dir); },
};

// Offline app support.
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
