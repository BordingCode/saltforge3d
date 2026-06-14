// Face-culled mesher: one BufferGeometry per chunk, only exposed faces, vertex-coloured.
import * as THREE from 'three';
import { CHUNK, BLOCK, BLOCK_COLOR } from '../config.js';

// Canonical voxel face table (outward winding; index pattern 0,1,2, 2,1,3).
const FACES = [
  { dir: [-1, 0, 0], corners: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]] },
  { dir: [1, 0, 0],  corners: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]] },
  { dir: [0, -1, 0], corners: [[1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0]] },
  { dir: [0, 1, 0],  corners: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]] },
  { dir: [0, 0, -1], corners: [[1, 1, 0], [1, 0, 0], [0, 1, 0], [0, 0, 0]] },
  { dir: [0, 0, 1],  corners: [[0, 1, 1], [0, 0, 1], [1, 1, 1], [1, 0, 1]] },
];

export function buildChunkGeometry(world, cx, cy, cz) {
  const positions = [], normals = [], colors = [], indices = [];
  const ox = cx * CHUNK, oy = cy * CHUNK, oz = cz * CHUNK;

  for (let y = 0; y < CHUNK; y++) {
    for (let z = 0; z < CHUNK; z++) {
      for (let x = 0; x < CHUNK; x++) {
        const wx = ox + x, wy = oy + y, wz = oz + z;
        const b = world.get(wx, wy, wz);
        if (b === BLOCK.AIR) continue;
        const col = BLOCK_COLOR[b] || [1, 0, 1];
        for (const { dir, corners } of FACES) {
          const nb = world.get(wx + dir[0], wy + dir[1], wz + dir[2]);
          if (nb !== BLOCK.AIR) continue; // neighbour solid (or water) → hide face
          const base = positions.length / 3;
          for (const c of corners) {
            positions.push(wx + c[0], wy + c[1], wz + c[2]);
            normals.push(dir[0], dir[1], dir[2]);
            // slight per-face shade so cubes read in 3D even on flat light
            const shade = dir[1] > 0 ? 1.0 : dir[1] < 0 ? 0.6 : 0.82;
            colors.push(col[0] * shade, col[1] * shade, col[2] * shade);
          }
          indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
        }
      }
    }
  }

  if (positions.length === 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  return geo;
}
