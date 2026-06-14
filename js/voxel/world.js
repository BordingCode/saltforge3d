// Voxel data store for a bounded world. Flat Uint8Array; chunk-dirty tracking for remeshing.
import { WORLD, CHUNK, BLOCK } from '../config.js';

const { X, Y, Z } = WORLD;
export const SIZE = X * Y * Z;
export const idx = (x, y, z) => x + z * X + y * X * Z;
export const inBounds = (x, y, z) => x >= 0 && x < X && y >= 0 && y < Y && z >= 0 && z < Z;

export class World {
  constructor() {
    this.X = X; this.Y = Y; this.Z = Z;
    this.blocks = new Uint8Array(SIZE);
    this.cx = Math.ceil(X / CHUNK);
    this.cy = Math.ceil(Y / CHUNK);
    this.cz = Math.ceil(Z / CHUNK);
    this.dirty = new Set();
  }

  get(x, y, z) {
    if (!inBounds(x, y, z)) return BLOCK.AIR;
    return this.blocks[idx(x, y, z)];
  }

  isSolid(x, y, z) {
    const b = this.get(x, y, z);
    return b !== BLOCK.AIR && b !== BLOCK.WATER;
  }

  chunkKey(cx, cy, cz) { return cx + ',' + cy + ',' + cz; }

  markDirty(x, y, z) {
    const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK), cz = Math.floor(z / CHUNK);
    this.dirty.add(this.chunkKey(cx, cy, cz));
    // Border blocks affect the neighbouring chunk's exposed faces too.
    if (x % CHUNK === 0) this.dirty.add(this.chunkKey(cx - 1, cy, cz));
    if (x % CHUNK === CHUNK - 1) this.dirty.add(this.chunkKey(cx + 1, cy, cz));
    if (y % CHUNK === 0) this.dirty.add(this.chunkKey(cx, cy - 1, cz));
    if (y % CHUNK === CHUNK - 1) this.dirty.add(this.chunkKey(cx, cy + 1, cz));
    if (z % CHUNK === 0) this.dirty.add(this.chunkKey(cx, cy, cz - 1));
    if (z % CHUNK === CHUNK - 1) this.dirty.add(this.chunkKey(cx, cy, cz + 1));
  }

  set(x, y, z, b) {
    if (!inBounds(x, y, z)) return false;
    const i = idx(x, y, z);
    if (this.blocks[i] === b) return false;
    this.blocks[i] = b;
    this.markDirty(x, y, z);
    return true;
  }
}
