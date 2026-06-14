// A gravity-arced cannonball. Sub-steps its motion so fast shots can't tunnel through walls.
import * as THREE from 'three';
import { GRAVITY } from '../config.js';

let _geo = null;
function ball() {
  if (!_geo) _geo = new THREE.SphereGeometry(0.35, 10, 8);
  return _geo;
}

export class Projectile {
  constructor(scene, pos, vel) {
    this.scene = scene;
    this.pos = pos.clone();
    this.vel = vel.clone();
    this.alive = true;
    this.life = 9;
    this.mesh = new THREE.Mesh(ball(), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
  }

  // Returns the impact point (Vector3) on the frame it hits, else null.
  update(dt, world) {
    this.vel.y -= GRAVITY * dt;
    const steps = 5, sdt = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.pos.addScaledVector(this.vel, sdt);
      if (world.isSolid(Math.floor(this.pos.x), Math.floor(this.pos.y), Math.floor(this.pos.z))) {
        return this._die(true);
      }
    }
    this.life -= dt;
    if (this.pos.y < -3 || this.life <= 0) { this._die(false); return null; }
    this.mesh.position.copy(this.pos);
    return null;
  }

  _die(impact) {
    this.alive = false;
    this.scene.remove(this.mesh);
    this.mesh.material.dispose();
    return impact ? this.pos.clone() : null;
  }
}
