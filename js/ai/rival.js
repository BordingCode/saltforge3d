// The rival: a SEEN clock. Arms on a fixed seeded schedule (never peeks at you), shells your
// Keep with telegraphed arcs that "walk in" toward the last impact — reads as a gunner, not an oracle.
import * as THREE from 'three';
import { PROJECTILE_SPEED, BLAST_RADIUS, GRAVITY, BLOCK } from '../config.js';
import { mulberry32, hashSeed } from '../engine/rng.js';
import { solveArc } from '../combat/ballistics.js';
import { Projectile } from '../combat/projectile.js';
import { carveSphere } from '../combat/destruction.js';
import { ENEMY_ISLAND } from '../world/worldgen.js';

export class Rival {
  constructor(world, scene, keeps, audio) {
    this.world = world; this.scene = scene; this.keeps = keeps; this.audio = audio;
    this.rng = mulberry32(hashSeed('saltforge-rival-v1'));
    this.menace = 0;            // 0..100 visible armament
    this.mode = 'idle';
    this.timer = 18;           // grace before first shot — time to gather & dig
    this.chargeT = 0;
    this.projectiles = [];
    this.lastImpact = null;
    this.firedCount = 0;
    this.pendingVel = null;
    this.pendingFrom = null;
    this.onMessage = null;     // (text) => void
    this._speed = PROJECTILE_SPEED + 8;

    // ---- Visible, SEEN menace: the rival physically arms its fort on a fixed seeded clock. ----
    // Growth never peeks at the player — it is driven purely by the menace meter crossing
    // pre-baked thresholds, so a scout reveals a fort that has honestly changed (taller wall
    // courses, cannon emplacements glowing molten-orange). All voxel edits go through world.set,
    // reusing the remesh-dirty path.
    this._buildGrowthPlan();

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(80 * 3), 3));
    this.telGeo = g;
    this.tel = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xff5a3c, transparent: true, opacity: 0 }));
    this.tel.frustumCulled = false;
    scene.add(this.tel);
  }

  // Pre-bake an ordered list of growth steps the fort performs as menace rises. Positions are
  // derived from the enemy island geometry (same formula buildFort used), so they land on the
  // REAL fort. Each step is {at: menaceThreshold, fn}. Honest + seeded: no player state read.
  _buildGrowthPlan() {
    const w = this.world;
    const cx = Math.floor(ENEMY_ISLAND.cx), cz = Math.floor(ENEMY_ISLAND.cz);
    const R = 8, side = -1; // enemy fort faces the player (lower z)
    const topY = (x, z) => { for (let y = w.Y - 1; y >= 0; y--) if (w.isSolid(x, y, z)) return y; return 0; };

    this.growth = [];

    // 1) Brighten the two existing cannon emplacements to a glowing "armed" state.
    for (const ox of [-4, 4]) {
      const x = cx + ox, z = cz + side * R;
      const gy = topY(x, z); // emplacement METAL sits at top of the wall column
      this.growth.push({
        cannon: true,
        fn: () => {
          // turn whatever METAL caps this column molten-orange (skip if already destroyed)
          for (let yy = gy; yy <= gy + 1; yy++) {
            if (w.get(x, yy, z) === BLOCK.METAL) w.set(x, yy, z, BLOCK.METAL_HOT);
            if (w.get(x, yy, z + side) === BLOCK.METAL) w.set(x, yy, z + side, BLOCK.METAL_HOT);
          }
        },
      });
    }

    // 2) Raise NEW cannon blocks on the facing wall — a visible new gun emplacement.
    for (const ox of [-1, 1, 0]) {
      const x = cx + ox * 3, z = cz + side * R;
      const gy = topY(x, z);
      this.growth.push({
        cannon: true,
        fn: () => { if (w.get(x, gy + 1, z) === BLOCK.AIR) w.set(x, gy + 1, z, BLOCK.METAL_HOT); },
      });
    }

    // 3) Raise the facing wall a course taller (kiln-bright brick) — the silhouette grows.
    // Walk the ring across the player-facing arc (angles centred on the strait side) and add a
    // brick on top of the existing wall column; remesh shows a taller fort once it's scouted.
    const faceAng = side < 0 ? 270 : 90; // degrees toward the strait
    for (let da = -42; da <= 42; da += 14) {
      const rad = ((faceAng + da) * Math.PI) / 180;
      const x = Math.round(cx + Math.cos(rad) * R);
      const z = Math.round(cz + Math.sin(rad) * R);
      const gy = topY(x, z);
      this.growth.push({
        fn: () => { if (w.get(x, gy + 1, z) === BLOCK.AIR) w.set(x, gy + 1, z, BLOCK.BRICK_HOT); },
      });
    }

    // Spread the steps evenly across the menace clock (first one early so growth is felt fast).
    const n = this.growth.length;
    this.growth.forEach((s, i) => { s.at = 8 + (88 * i) / Math.max(1, n - 1); });
    this._grownCount = 0;
  }

  // Fire any growth steps whose threshold the (fixed-clock) menace has now crossed.
  _tickGrowth() {
    while (this._grownCount < this.growth.length && this.menace >= this.growth[this._grownCount].at) {
      const step = this.growth[this._grownCount];
      step.fn();
      this._grownCount++;
      if (this.onMessage) {
        this.onMessage(step.cannon
          ? '⚒ Their forge-smoke thickens — a new cannon glows on the far wall.'
          : '⚒ Across the strait, their wall climbs another course.');
      }
    }
  }

  update(dt, t) {
    this.menace = Math.min(100, this.menace + dt * 1.25); // fully armed in ~80s
    this._tickGrowth();

    if (this.mode === 'idle') {
      this.timer -= dt;
      if (this.timer <= 0) this._beginCharge();
    } else if (this.mode === 'charge') {
      this.chargeT -= dt;
      this.tel.material.opacity = 0.45 + 0.4 * Math.abs(Math.sin(t * 9));
      if (this.chargeT <= 0) this._launch();
    }

    for (const p of this.projectiles) {
      if (!p.alive) continue;
      const hit = p.update(dt, this.world);
      if (hit) {
        const { removed, hitKeep } = carveSphere(this.world, hit, BLAST_RADIUS);
        if (this.audio) this.audio.crunch();
        this.lastImpact = hit.clone();
        if (hitKeep && this.onMessage) this.onMessage('⚠ Your Keep is taking hits!');
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  _beginCharge() {
    const pc = this.keeps.playerCenter();
    const ec = this.keeps.enemyCenter();
    // Walk shots in: scatter shrinks as menace rises; bias from last impact toward the Keep.
    const spread = Math.max(1.0, 9 - this.menace * 0.075);
    const base = this.lastImpact || pc;
    const tx = base.x + (this.rng() * 2 - 1) * spread + (pc.x - base.x) * 0.45;
    const tz = base.z + (this.rng() * 2 - 1) * spread + (pc.z - base.z) * 0.45;
    const from = new THREE.Vector3(ec.x, ec.y + 4, ec.z);
    const target = new THREE.Vector3(tx, pc.y, tz);
    const vel = solveArc(from, target, this._speed, GRAVITY, true);
    if (!vel) { this.timer = 1.5; return; }
    this.pendingFrom = from; this.pendingVel = vel;
    this._drawArc(from, vel);
    this.mode = 'charge';
    this.chargeT = 1.4;
    if (this.audio) this.audio.whistle();
    if (this.firedCount === 0 && this.onMessage) this.onMessage('Their guns now range your shores!');
  }

  _drawArc(from, vel) {
    const pos = from.clone(), v = vel.clone();
    const arr = this.telGeo.attributes.position.array;
    const dt = 0.06; let c = 0;
    for (let i = 0; i < 80; i++) {
      arr[c * 3] = pos.x; arr[c * 3 + 1] = pos.y; arr[c * 3 + 2] = pos.z; c++;
      v.y -= GRAVITY * dt; pos.addScaledVector(v, dt);
      if (this.world.isSolid(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z)) || pos.y < -3) break;
    }
    this.telGeo.setDrawRange(0, c);
    this.telGeo.attributes.position.needsUpdate = true;
  }

  _launch() {
    this.projectiles.push(new Projectile(this.scene, this.pendingFrom, this.pendingVel, 0xff3a1a));
    this.firedCount++;
    this.tel.material.opacity = 0;
    if (this.audio) this.audio.boom();
    this.mode = 'idle';
    this.timer = Math.max(2.4, 8 - this.menace * 0.055); // fires faster as it arms
  }
}
