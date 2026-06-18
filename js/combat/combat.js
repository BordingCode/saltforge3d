// Fires cannonballs, applies destruction on impact, and draws a live aim trajectory.
import * as THREE from 'three';
import { GRAVITY, PROJECTILE_SPEED, BLAST_RADIUS, BLOCK } from '../config.js';
import { Projectile } from './projectile.js';
import { carveSphere, DebrisSystem } from './destruction.js';

export class CombatSystem {
  constructor(scene, world, audio) {
    this.scene = scene; this.world = world; this.audio = audio;
    this.projectiles = [];
    this.debris = new DebrisSystem(scene);
    this.destroyed = 0;
    this.onKeepHit = null;

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(64 * 3), 3));
    this.previewGeo = g;
    this.preview = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.75 }));
    this.preview.frustumCulled = false;
    scene.add(this.preview);
  }

  fire(origin, dir) {
    const vel = dir.clone().normalize().multiplyScalar(PROJECTILE_SPEED);
    this.projectiles.push(new Projectile(this.scene, origin, vel));
    if (this.audio) this.audio.boom();
  }

  updatePreview(origin, dir) {
    const pos = origin.clone();
    const vel = dir.clone().normalize().multiplyScalar(PROJECTILE_SPEED);
    const arr = this.previewGeo.attributes.position.array;
    const dt = 0.05, N = 64;
    let count = 0;
    let blocked = false; // arc ends on an enemy WALL (shot wasted) vs the Keep / open ground
    for (let i = 0; i < N; i++) {
      arr[count * 3] = pos.x; arr[count * 3 + 1] = pos.y; arr[count * 3 + 2] = pos.z;
      count++;
      vel.y -= GRAVITY * dt;
      pos.addScaledVector(vel, dt);
      const bx = Math.floor(pos.x), by = Math.floor(pos.y), bz = Math.floor(pos.z);
      if (this.world.isSolid(bx, by, bz)) {
        arr[count * 3] = pos.x; arr[count * 3 + 1] = pos.y; arr[count * 3 + 2] = pos.z; count++;
        const b = this.world.get(bx, by, bz);
        // Landing inside the blast radius of any Keep block counts as "on target". Otherwise, if
        // it terminates on enemy fort masonry, the shot is wasted on the wall — telegraph it red.
        const onTarget = b === BLOCK.KEEP || this._keepNearby(pos, BLAST_RADIUS);
        blocked = !onTarget && (b === BLOCK.BRICK || b === BLOCK.BRICK_HOT ||
                                b === BLOCK.METAL || b === BLOCK.METAL_HOT);
        break;
      }
      if (pos.y < -3) break;
    }
    this.previewGeo.setDrawRange(0, count);
    this.previewGeo.attributes.position.needsUpdate = true;
    // gold = good shot; red = the arc dies on their wall (in-verb "why do my shots do nothing?")
    this.preview.material.color.setHex(blocked ? 0xff4a2a : 0xffe08a);
  }

  // Is any Keep block within r of point p? (so grazing the wall but bursting the Keep stays gold)
  _keepNearby(p, r) {
    const r2 = r * r;
    for (let y = Math.floor(p.y - r); y <= Math.ceil(p.y + r); y++)
      for (let z = Math.floor(p.z - r); z <= Math.ceil(p.z + r); z++)
        for (let x = Math.floor(p.x - r); x <= Math.ceil(p.x + r); x++) {
          if (this.world.get(x, y, z) !== BLOCK.KEEP) continue;
          const dx = x + 0.5 - p.x, dy = y + 0.5 - p.y, dz = z + 0.5 - p.z;
          if (dx * dx + dy * dy + dz * dz <= r2) return true;
        }
    return false;
  }

  update(dt) {
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      const hit = p.update(dt, this.world);
      if (hit) {
        const { removed, hitKeep } = carveSphere(this.world, hit, BLAST_RADIUS);
        this.destroyed += removed.length;
        this.debris.burst(removed, hit);
        if (this.audio) this.audio.crunch();
        if (hitKeep && this.onKeepHit) this.onKeepHit(removed.length);
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
    this.debris.update(dt);
  }
}
