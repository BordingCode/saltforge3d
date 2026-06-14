// Tracks each side's gold Keep blocks. HP = blocks still standing. Win/lose = visible destruction.
import * as THREE from 'three';
import { BLOCK } from '../config.js';

export class Keeps {
  constructor(world) {
    this.world = world;
    this.player = [];
    this.enemy = [];
    this.scan();
  }

  scan() {
    const { X, Y, Z } = this.world;
    this.player = []; this.enemy = [];
    for (let y = 0; y < Y; y++)
      for (let z = 0; z < Z; z++)
        for (let x = 0; x < X; x++) {
          if (this.world.blocks[x + z * X + y * X * Z] === BLOCK.KEEP) {
            (z < Z / 2 ? this.player : this.enemy).push([x, y, z]);
          }
        }
    this.playerMax = this.player.length || 1;
    this.enemyMax = this.enemy.length || 1;
    this._pc = this._avg(this.player);
    this._ec = this._avg(this.enemy);
  }

  _avg(cells) {
    const v = new THREE.Vector3();
    for (const [x, y, z] of cells) v.add(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5));
    if (cells.length) v.multiplyScalar(1 / cells.length);
    return v;
  }

  _alive(cells) {
    let n = 0;
    for (const [x, y, z] of cells) if (this.world.get(x, y, z) === BLOCK.KEEP) n++;
    return n;
  }

  playerHP() { return this._alive(this.player); }
  enemyHP() { return this._alive(this.enemy); }
  playerCenter() { return this._pc; }
  enemyCenter() { return this._ec; }

  // Rebuild missing player Keep blocks (repair). Returns how many were rebuilt.
  repairPlayer(max) {
    let done = 0;
    for (const [x, y, z] of this.player) {
      if (done >= max) break;
      if (this.world.get(x, y, z) !== BLOCK.KEEP) { this.world.set(x, y, z, BLOCK.KEEP); done++; }
    }
    return done;
  }
}
