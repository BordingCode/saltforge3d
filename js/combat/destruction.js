// Carve voxels in a sphere + fake the collapse with short-lived debris and a smoke puff.
// FAKE collapse (fading cubes), NOT rigid-body physics — that's the browser perf trap.
import * as THREE from 'three';
import { BLOCK, BLOCK_COLOR } from '../config.js';

export function carveSphere(world, center, radius, opts = {}) {
  const { protect = null } = opts;
  const r2 = radius * radius;
  const removed = [];
  let hitKeep = false;
  for (let y = Math.floor(center.y - radius); y <= Math.ceil(center.y + radius); y++)
    for (let z = Math.floor(center.z - radius); z <= Math.ceil(center.z + radius); z++)
      for (let x = Math.floor(center.x - radius); x <= Math.ceil(center.x + radius); x++) {
        const dx = x + 0.5 - center.x, dy = y + 0.5 - center.y, dz = z + 0.5 - center.z;
        if (dx * dx + dy * dy + dz * dz > r2) continue;
        const b = world.get(x, y, z);
        if (b === BLOCK.AIR) continue;
        if (protect && protect(x, y, z, b)) continue;
        if (b === BLOCK.KEEP) hitKeep = true;
        removed.push([x, y, z, b]);
        world.set(x, y, z, BLOCK.AIR);
      }
  return { removed, hitKeep };
}

export class DebrisSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.cube = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    this.puff = new THREE.SphereGeometry(1, 8, 6);
  }

  burst(removed, center) {
    const n = Math.min(removed.length, 16);
    for (let i = 0; i < n; i++) {
      const [x, y, z, b] = removed[Math.floor((i / n) * removed.length)];
      const col = BLOCK_COLOR[b] || [1, 1, 1];
      const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(col[0], col[1], col[2]) });
      const m = new THREE.Mesh(this.cube, mat);
      m.position.set(x + 0.5, y + 0.5, z + 0.5);
      this.scene.add(m);
      this.items.push({
        mesh: m, kind: 'debris', life: 1.1 + Math.random() * 0.5,
        vel: new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 5, (Math.random() - 0.5) * 6),
        spin: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
      });
    }
    // smoke puff
    const pm = new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.6 });
    const puff = new THREE.Mesh(this.puff, pm);
    puff.position.copy(center);
    this.scene.add(puff);
    this.items.push({ mesh: puff, kind: 'smoke', life: 0.6, max: 0.6 });

    // bright additive impact flash — reads even at distance (reuses the puff slot/geometry)
    const fm = new THREE.MeshBasicMaterial({
      color: 0xffa030, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const flash = new THREE.Mesh(this.puff, fm);
    flash.position.copy(center);
    flash.scale.setScalar(2.2);
    this.scene.add(flash);
    this.items.push({ mesh: flash, kind: 'flash', life: 0.15, max: 0.15 });
  }

  update(dt) {
    for (const it of this.items) {
      it.life -= dt;
      if (it.kind === 'debris') {
        it.vel.y -= 18 * dt;
        it.mesh.position.addScaledVector(it.vel, dt);
        it.mesh.rotation.x += it.spin.x * dt;
        it.mesh.rotation.y += it.spin.y * dt;
      } else if (it.kind === 'flash') {
        const t = 1 - it.life / it.max;
        const s = 2.2 + t * 3.5;
        it.mesh.scale.set(s, s, s);
        it.mesh.material.opacity = 0.95 * (1 - t);
      } else {
        const t = 1 - it.life / it.max;
        const s = 1 + t * 3;
        it.mesh.scale.set(s, s, s);
        it.mesh.material.opacity = 0.6 * (1 - t);
      }
    }
    const dead = this.items.filter((it) => it.life <= 0);
    for (const it of dead) { this.scene.remove(it.mesh); it.mesh.material.dispose(); }
    this.items = this.items.filter((it) => it.life > 0);
  }
}
