// Saltforge 3D — Milestone 0: stand in a blocky world, lob arced cannon shots, blow real holes.
import * as THREE from 'three';
import { WORLD, SEA_LEVEL } from './config.js';
import { World } from './voxel/world.js';
import { ChunkManager } from './voxel/chunks.js';
import { generate, PLAYER_ISLAND } from './world/worldgen.js';
import { Player } from './player/controls.js';
import { CombatSystem } from './combat/combat.js';
import { Audio } from './engine/audio.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
const skyColor = new THREE.Color(0x9fb8c8);
scene.background = skyColor;
scene.fog = new THREE.Fog(skyColor, 60, 240);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 600);

scene.add(new THREE.HemisphereLight(0xdcefff, 0x4a4030, 1.0));
const sun = new THREE.DirectionalLight(0xfff3d0, 0.7);
sun.position.set(50, 90, 30);
scene.add(sun);

// Sea plane
const sea = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD.X * 4, WORLD.Z * 4),
  new THREE.MeshLambertMaterial({ color: 0x2a6fb0, transparent: true, opacity: 0.8 })
);
sea.rotation.x = -Math.PI / 2;
sea.position.set(WORLD.X / 2, SEA_LEVEL + 0.35, WORLD.Z / 2);
scene.add(sea);

// World
const world = new World();
generate(world, 'saltforge');
const chunks = new ChunkManager(world, scene, new THREE.MeshLambertMaterial({ vertexColors: true }));
const t0 = performance.now();
const meshCount = chunks.buildAll();
const meshMs = Math.round(performance.now() - t0);

// Player
const audio = new Audio();
const player = new Player(world, camera, canvas);
const sx = Math.floor(PLAYER_ISLAND.cx), sz = Math.floor(PLAYER_ISLAND.cz);
let sy = WORLD.Y - 1;
while (sy > 0 && !world.isSolid(sx, sy, sz)) sy--;
player.spawn(sx + 0.5, sy + 1, sz + 0.5);
player.yaw = Math.PI;      // look toward +z (the enemy island)
player.pitch = -0.12;

const combat = new CombatSystem(scene, world, audio);

// HUD
const overlay = document.getElementById('overlay');
const fpsEl = document.getElementById('fps');
const destEl = document.getElementById('destroyed');
document.getElementById('meshinfo').textContent = `${meshCount} chunks meshed in ${meshMs}ms`;

canvas.addEventListener('click', () => { canvas.requestPointerLock(); audio.resume(); });
document.addEventListener('pointerlockchange', () => {
  overlay.style.display = document.pointerLockElement === canvas ? 'none' : 'flex';
});

const _dir = new THREE.Vector3(), _org = new THREE.Vector3();
canvas.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== canvas || e.button !== 0) return;
  audio.resume();
  player.lookDir(_dir);
  _org.copy(camera.position).addScaledVector(_dir, 1.2);
  combat.fire(_org, _dir);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Loop
let last = performance.now(), acc = 0, frames = 0;
function loop(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05;

  player.update(dt);
  player.lookDir(_dir);
  _org.copy(camera.position).addScaledVector(_dir, 1.2);
  combat.updatePreview(_org, _dir);
  combat.update(dt);
  chunks.processDirty(6);
  renderer.render(scene, camera);

  frames++; acc += dt;
  if (acc >= 0.5) {
    fpsEl.textContent = Math.round(frames / acc) + ' fps';
    destEl.textContent = combat.destroyed + ' blocks destroyed';
    frames = 0; acc = 0;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// expose for debugging / headless checks
window.__sf = { world, player, combat, chunks, THREE };
