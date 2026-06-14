# Saltforge 3D

A first-person **voxel duel of fortresses**. You wash up on a foggy island across a
narrow strait from a computer rival. Both of you gather, build, and arm — and try to
**pound the other's gold Keep into the sea** with arcing cannon fire. First Keep
destroyed loses.

This is a from-scratch 3D reimagining of the original 2D [Saltforge](../saltforge) —
the war is no longer a hidden grid; it's **destruction you can see**.

**Play:** https://bordingcode.github.io/saltforge3d/ · best on a computer (keyboard + mouse).

## Controls
- **WASD** move · **Space** jump · **mouse** look (click the page to capture the mouse)
- **1 ⛏ Mine** blocks — dig a short shaft for glowing **firesalt** (cannon ammo)
- **2 🧱 Build** walls (1 stone each) · **R** repair your Keep (stand near it)
- **3 🔭 Scout** to lift the fog off the enemy island in stages
- **4 💥 Cannon** — lob shots; the gold arc shows where they'll land (costs firesalt)

The rival arms on a visible **menace** clock and shells you back with **telegraphed
red arcs + a whistle** — fair warning every time. It never peeks at your island.

## Tech
- Vanilla JS ES modules + **Three.js** (vendored in `vendor/`, no build step, works offline)
- Bounded two-island world; chunked face-culled voxel meshing, per-chunk remesh on damage
- Seeded, deterministic world & rival (`js/engine/rng.js`)
- PWA: `manifest.json` + `sw.js` (bump `CACHE` in `sw.js` on every deploy)

## Run locally
```
python3 -m http.server 8099   # then open http://localhost:8099/
```

## Test
```
node test/ore.test.mjs        # headless: ammo is reachable with a short dig
```
