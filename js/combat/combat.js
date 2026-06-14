// Fires cannonballs, applies destruction on impact, and draws a live aim trajectory.
import * as THREE from 'three';
import { GRAVITY, PROJECTILE_SPEED, BLAST_RADIUS } from '../config.js';
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
    for (let i = 0; i < N; i++) {
      arr[count * 3] = pos.x; arr[count * 3 + 1] = pos.y; arr[count * 3 + 2] = pos.z;
      count++;
      vel.y -= GRAVITY * dt;
      pos.addScaledVector(vel, dt);
      if (this.world.isSolid(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z))) {
        arr[count * 3] = pos.x; arr[count * 3 + 1] = pos.y; arr[count * 3 + 2] = pos.z; count++;
        break;
      }
      if (pos.y < -3) break;
    }
    this.previewGeo.setDrawRange(0, count);
    this.previewGeo.attributes.position.needsUpdate = true;
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
