// Two islands + a strait + a destructible enemy fort. Deterministic from a seed.
import { WORLD, BLOCK, SEA_LEVEL } from '../config.js';
import { mulberry32, hashSeed } from '../engine/rng.js';

const { X, Y, Z } = WORLD;
const idx = (x, y, z) => x + z * X + y * X * Z;
const setRaw = (world, x, y, z, b) => {
  if (x < 0 || x >= X || y < 0 || y >= Y || z < 0 || z >= Z) return;
  world.blocks[idx(x, y, z)] = b;
};
const topY = (world, x, z) => {
  for (let y = Y - 1; y >= 0; y--) if (world.blocks[idx(x, y, z)]) return y;
  return 0;
};

export const PLAYER_ISLAND = { cx: X * 0.5, cz: Z * 0.25, r: 22 };
export const ENEMY_ISLAND = { cx: X * 0.5, cz: Z * 0.78, r: 22 };

export function generate(world, seedStr = 'saltforge') {
  const rng = mulberry32(hashSeed(seedStr));
  const phase = rng() * 6.28;

  const heightAt = (x, z) => {
    let h = SEA_LEVEL - 3; // sea floor
    for (const isl of [PLAYER_ISLAND, ENEMY_ISLAND]) {
      const dx = x - isl.cx, dz = z - isl.cz;
      const d = Math.sqrt(dx * dx + dz * dz);
      const t = Math.max(0, 1 - d / isl.r);
      h = Math.max(h, SEA_LEVEL - 1 + Math.pow(t, 1.5) * 10);
    }
    h += Math.sin(x * 0.28 + phase) * 0.7 + Math.cos(z * 0.25) * 0.7;
    return h;
  };

  for (let z = 0; z < Z; z++) {
    for (let x = 0; x < X; x++) {
      const h = Math.floor(heightAt(x, z));
      for (let y = 0; y <= h && y < Y; y++) {
        let b;
        if (y === h) b = h <= SEA_LEVEL + 1 ? BLOCK.SAND : BLOCK.GRASS;
        else if (y > h - 3) b = BLOCK.DIRT;
        else b = BLOCK.STONE;
        setRaw(world, x, y, z, b);
      }
    }
  }

  buildFort(world, ENEMY_ISLAND, true);
}

// A ring wall with battlements, a gold Keep, and two cannon stubs — the thing you blow apart.
function buildFort(world, isl, enemy) {
  const cx = Math.floor(isl.cx), cz = Math.floor(isl.cz);
  const R = 8, H = 5;
  for (let a = 0; a < 360; a += 3) {
    const x = Math.round(cx + Math.cos((a * Math.PI) / 180) * R);
    const z = Math.round(cz + Math.sin((a * Math.PI) / 180) * R);
    const g = topY(world, x, z) + 1;
    for (let y = 0; y < H; y++) setRaw(world, x, g + y, z, BLOCK.BRICK);
    if (a % 12 === 0) setRaw(world, x, g + H, z, BLOCK.BRICK); // battlement
  }
  // Keep: 3x3 gold tower in the centre.
  const g = topY(world, cx, cz) + 1;
  for (let y = 0; y < 6; y++)
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        setRaw(world, cx + dx, g + y, cz + dz, BLOCK.KEEP);
  // Two cannon emplacements on the wall facing the strait (toward -z = the player).
  for (const ox of [-4, 4]) {
    const x = cx + ox, z = cz - R;
    const gy = topY(world, x, z) + 1;
    setRaw(world, x, gy, z, BLOCK.METAL);
    setRaw(world, x, gy, z - 1, BLOCK.METAL);
  }
}
