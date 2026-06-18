# Saltforge 3D — project guide for Claude

A vanilla **ES-module** PWA: a **first-person voxel duel-of-fortresses** (gather, dig ammo,
scout fog, bombard the enemy Keep vs a fair AI rival). Built on **Three.js, vendored** —
**no bundler, no build step**. Repo: `BordingCode/saltforge3d` (branch **master**), GitHub
Pages (`bordingcode.github.io/saltforge3d`).

## Before working
Read the shared game-dev knowledge base: **`~/cc/gamedev-kb/INDEX.md`** (lowercase `cc`).
Especially `patterns/canvas-engine-games.md`, `patterns/mobile-ios-safari.md`, and
`checklists/ship-checklist.md`.

## Architecture
- `js/main.js` — boot, camera/input, exposes `window.__sf`.
- `js/voxel/world.js` — voxel `World` (block array); `js/world/worldgen.js` — `generate()`.
- `js/config.js` — `BLOCK`, `WORLD` dims and tuning.
- `vendor/three.module.js` — vendored Three.js (imported as an ES module; do not add npm/bundler).

## Deploy convention — every change MUST
- **Bump the SW `CACHE` string** in `sw.js` (e.g. `saltforge3d-v3`→`v4`) and add any new file
  to the `ASSETS` array. **No `?v=` scheme** (ES modules) — the cache bump is the only busting
  mechanism, so it is mandatory on any js/css/vendor edit.
- Be **committed and pushed** to `master`.

## Tests
- Headless engine check (no browser, no three.js): `node test/ore.test.mjs`.
- Test hook `window.__sf` exposes `world, player, combat, rival, keeps, fog, state, chunks,
  scene, THREE` plus actions `scout/fire/mine/build/repair/fireDir`. Verify in a real browser
  (local server + Playwright) for the 3D/render path.

## Notes
- Phone-first; pointer look + on-screen controls; audio on first gesture.
