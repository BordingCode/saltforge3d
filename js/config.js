// Saltforge 3D — global constants. Bounded world = a feature (focused duel, smooth perf).
export const WORLD = { X: 96, Y: 40, Z: 128 };
export const CHUNK = 16;
export const SEA_LEVEL = 8;

export const BLOCK = {
  AIR: 0, STONE: 1, DIRT: 2, GRASS: 3, SAND: 4, WATER: 5,
  BRICK: 6, WOOD: 7, KEEP: 8, METAL: 9, FIRESALT: 10,
};

// Normalised RGB per block (used as vertex colours; single material).
export const BLOCK_COLOR = {
  1: [0.55, 0.55, 0.58], // stone
  2: [0.46, 0.32, 0.20], // dirt
  3: [0.33, 0.56, 0.24], // grass
  4: [0.84, 0.77, 0.53], // sand
  5: [0.20, 0.43, 0.70], // water (not meshed in M0)
  6: [0.64, 0.35, 0.29], // brick (enemy fort)
  7: [0.50, 0.36, 0.22], // wood
  8: [0.90, 0.74, 0.26], // keep (gold)
  9: [0.34, 0.36, 0.42], // metal (cannons)
  10:[0.97, 0.47, 0.88], // firesalt (glows later)
};

// A block blocks movement / stops shots unless it is air or water.
export const SOLID = (b) => b !== BLOCK.AIR && b !== BLOCK.WATER;

// Physics / combat tuning.
export const GRAVITY = 20;
export const MOVE_SPEED = 6.5;
export const JUMP_SPEED = 8;
export const PROJECTILE_SPEED = 44;
export const BLAST_RADIUS = 3.0;
