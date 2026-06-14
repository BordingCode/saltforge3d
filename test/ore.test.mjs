// Headless check: is firesalt ammo findable with a SHORT dig? (no browser / no three.js)
import { World } from '../js/voxel/world.js';
import { generate, PLAYER_ISLAND } from '../js/world/worldgen.js';
import { BLOCK, WORLD } from '../js/config.js';

const w = new World();
generate(w, 'saltforge');
const { X, Y, Z } = WORLD;
const at = (x, y, z) => w.blocks[x + z * X + y * X * Z];

let total = 0;
for (let i = 0; i < w.blocks.length; i++) if (w.blocks[i] === BLOCK.FIRESALT) total++;

// Sample columns around the player island; for each, find shallowest ore depth below surface.
const cx = Math.floor(PLAYER_ISLAND.cx), cz = Math.floor(PLAYER_ISLAND.cz);
const depths = [];
for (let dx = -18; dx <= 18; dx += 2) {
  for (let dz = -18; dz <= 18; dz += 2) {
    const x = cx + dx, z = cz + dz;
    if (x < 0 || x >= X || z < 0 || z >= Z) continue;
    let surf = 0;
    for (let y = Y - 1; y >= 0; y--) { if (at(x, y, z)) { surf = y; break; } }
    for (let y = surf; y >= 0; y--) {
      if (at(x, y, z) === BLOCK.FIRESALT) { depths.push(surf - y); break; }
    }
  }
}
depths.sort((a, b) => a - b);
const reachable = depths.filter((d) => d <= 10).length;

console.log('total firesalt blocks:', total);
console.log('columns with ore:', depths.length, '/ sampled grid');
console.log('shallowest ore depths (blocks under surface):', depths.slice(0, 12).join(', '));
console.log('columns where ore is within a 10-block dig:', reachable);

const ok = total > 80 && reachable >= 8 && depths[0] <= 10;
console.log(ok ? 'PASS: ammo is reachable with a short dig' : 'FAIL: ammo too sparse/deep');
process.exit(ok ? 0 : 1);
