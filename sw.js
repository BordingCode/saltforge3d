// Offline cache. Bump CACHE on every deploy so browsers fetch fresh files.
const CACHE = 'saltforge3d-v2';
const ASSETS = [
  './', './index.html', './manifest.json', './icon.svg',
  './css/style.css',
  './vendor/three.module.js',
  './js/config.js', './js/main.js',
  './js/engine/rng.js', './js/engine/audio.js',
  './js/voxel/world.js', './js/voxel/mesher.js', './js/voxel/chunks.js', './js/voxel/raycast.js',
  './js/world/worldgen.js', './js/world/fog.js',
  './js/player/controls.js',
  './js/combat/projectile.js', './js/combat/destruction.js', './js/combat/combat.js', './js/combat/ballistics.js',
  './js/game/state.js', './js/game/keeps.js',
  './js/ai/rival.js',
  './js/ui/hud.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
