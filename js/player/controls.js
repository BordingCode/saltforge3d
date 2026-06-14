// First-person controller: pointer-lock mouse-look + WASD, gravity, jump, AABB voxel collision.
import * as THREE from 'three';
import { GRAVITY, JUMP_SPEED, MOVE_SPEED } from '../config.js';

export class Player {
  constructor(world, camera, dom) {
    this.world = world; this.camera = camera; this.dom = dom;
    this.pos = new THREE.Vector3(0, 30, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.radius = 0.3; this.height = 1.7; this.eye = 1.55;
    this.onGround = false;
    this.locked = false;
    this.sens = 0.0022;
    this.keys = {};
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    camera.rotation.order = 'YXZ';
    this._bind();
  }

  spawn(x, y, z) { this.pos.set(x, y, z); this.vel.set(0, 0, 0); }

  _bind() {
    addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * this.sens;
      this.pitch -= e.movementY * this.sens;
      const lim = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
    });
  }

  // Full look direction (heading + elevation) — used for aiming the cannon.
  lookDir(out) {
    out.set(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    return out;
  }

  update(dt) {
    this._fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this._right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    let ix = 0, iz = 0;
    if (this.keys['KeyW']) iz += 1;
    if (this.keys['KeyS']) iz -= 1;
    if (this.keys['KeyD']) ix += 1;
    if (this.keys['KeyA']) ix -= 1;
    const move = new THREE.Vector3()
      .addScaledVector(this._fwd, iz)
      .addScaledVector(this._right, ix);
    if (move.lengthSq() > 0) move.normalize();
    this.vel.x = move.x * MOVE_SPEED;
    this.vel.z = move.z * MOVE_SPEED;
    this.vel.y -= GRAVITY * dt;
    if (this.keys['Space'] && this.onGround) { this.vel.y = JUMP_SPEED; this.onGround = false; }

    this._moveAxis('x', this.vel.x * dt);
    this._moveAxis('y', this.vel.y * dt);
    this._moveAxis('z', this.vel.z * dt);

    this.camera.position.set(this.pos.x, this.pos.y + this.eye, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  _moveAxis(axis, amt) {
    if (amt === 0) return;
    this.pos[axis] += amt;
    if (this._collides()) {
      this.pos[axis] -= amt;
      if (axis === 'y') { if (amt < 0) this.onGround = true; this.vel.y = 0; }
      else this.vel[axis] = 0;
    } else if (axis === 'y' && amt < 0) {
      this.onGround = false;
    }
  }

  _collides() {
    const r = this.radius;
    const minX = Math.floor(this.pos.x - r), maxX = Math.floor(this.pos.x + r);
    const minY = Math.floor(this.pos.y), maxY = Math.floor(this.pos.y + this.height);
    const minZ = Math.floor(this.pos.z - r), maxZ = Math.floor(this.pos.z + r);
    for (let y = minY; y <= maxY; y++)
      for (let z = minZ; z <= maxZ; z++)
        for (let x = minX; x <= maxX; x++)
          if (this.world.isSolid(x, y, z)) return true;
    return false;
  }
}
