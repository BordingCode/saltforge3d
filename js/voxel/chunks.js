// Owns one THREE.Mesh per non-empty chunk; remeshes only dirty chunks (never the world).
import * as THREE from 'three';
import { buildChunkGeometry } from './mesher.js';

export class ChunkManager {
  constructor(world, scene, material) {
    this.world = world; this.scene = scene; this.material = material;
    this.meshes = new Map();
  }

  buildAll() {
    for (let cy = 0; cy < this.world.cy; cy++)
      for (let cz = 0; cz < this.world.cz; cz++)
        for (let cx = 0; cx < this.world.cx; cx++)
          this.rebuild(cx, cy, cz);
    this.world.dirty.clear();
    return this.meshes.size;
  }

  rebuild(cx, cy, cz) {
    const key = this.world.chunkKey(cx, cy, cz);
    const geo = buildChunkGeometry(this.world, cx, cy, cz);
    let mesh = this.meshes.get(key);
    if (!geo) {
      if (mesh) { this.scene.remove(mesh); mesh.geometry.dispose(); this.meshes.delete(key); }
      return;
    }
    if (mesh) { mesh.geometry.dispose(); mesh.geometry = geo; }
    else { mesh = new THREE.Mesh(geo, this.material); this.scene.add(mesh); this.meshes.set(key, mesh); }
  }

  // Remesh a bounded number of dirty chunks per frame to avoid hitches.
  processDirty(limit = 6) {
    if (this.world.dirty.size === 0) return;
    let n = 0;
    for (const key of this.world.dirty) {
      this.world.dirty.delete(key);
      const [cx, cy, cz] = key.split(',').map(Number);
      if (cx < 0 || cy < 0 || cz < 0 || cx >= this.world.cx || cy >= this.world.cy || cz >= this.world.cz) continue;
      this.rebuild(cx, cy, cz);
      if (++n >= limit) break;
    }
  }
}
