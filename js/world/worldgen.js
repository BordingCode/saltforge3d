// Two islands + a strait, each with a destructible fort & gold Keep. Deep firesalt = ammo.
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

export const PLAYER_ISLAND = { cx: X * 0.5, cz: Z * 0.24, r: 22 };
export const ENEMY_ISLAND = { cx: X * 0.5, cz: Z * 0.79, r: 22 };

export function generate(world, seedStr = 'saltforge') {
  const rng = mulberry32(hashSeed(seedStr));
  const phase = rng() * 6.28;

  const heightAt = (x, z) => {
    let h = SEA_LEVEL - 3;
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

  // Firesalt ore veins deep under the PLAYER island only — you must dig for ammo.
  scatterOre(world, PLAYER_ISLAND, rng);

  buildFort(world, PLAYER_ISLAND, +1); // player cannons face +z (toward enemy)
  buildFort(world, ENEMY_ISLAND, -1);  // enemy cannons face -z (toward player)
}

// Firesalt veins a SHORT dig under the surface — a few blocks down reliably finds ammo.
function scatterOre(world, isl, rng) {
  const cx = Math.floor(isl.cx), cz = Math.floor(isl.cz);
  const ore = (x, y, z) => { if (world.blocks[idx(x, y, z)] === BLOCK.STONE) setRaw(world, x, y, z, BLOCK.FIRESALT); };
  let placed = 0, tries = 0;
  while (placed < 60 && tries < 8000) {
    tries++;
    const ang = rng() * Math.PI * 2, rad = rng() * (isl.r - 3);
    const x = Math.round(cx + Math.cos(ang) * rad), z = Math.round(cz + Math.sin(ang) * rad);
    const surf = topY(world, x, z);
    const y = surf - (3 + Math.floor(rng() * 8)); // 3–10 blocks under the surface
    if (y < 1 || world.blocks[idx(x, y, z)] !== BLOCK.STONE) continue;
    ore(x, y, z);
    if (rng() < 0.6) ore(x + 1, y, z);
    if (rng() < 0.6) ore(x, y - 1, z);
    if (rng() < 0.4) ore(x, y, z + 1);
    placed++;
  }
}

function buildFort(world, isl, side) {
  const cx = Math.floor(isl.cx), cz = Math.floor(isl.cz);
  const R = 8, H = 5;
  for (let a = 0; a < 360; a += 3) {
    const x = Math.round(cx + Math.cos((a * Math.PI) / 180) * R);
    const z = Math.round(cz + Math.sin((a * Math.PI) / 180) * R);
    const g = topY(world, x, z) + 1;
    for (let y = 0; y < H; y++) setRaw(world, x, g + y, z, BLOCK.BRICK);
    if (a % 12 === 0) setRaw(world, x, g + H, z, BLOCK.BRICK);
  }
  const g = topY(world, cx, cz) + 1;
  for (let y = 0; y < 6; y++)
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        setRaw(world, cx + dx, g + y, cz + dz, BLOCK.KEEP);
  // cannon emplacements on the side facing the strait
  for (const ox of [-4, 4]) {
    const x = cx + ox, z = cz + side * R;
    const gy = topY(world, x, z) + 1;
    setRaw(world, x, gy, z, BLOCK.METAL);
    setRaw(world, x, gy, z + side, BLOCK.METAL);
  }
}
