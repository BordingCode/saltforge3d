// A dome of fog over the enemy island. Scouting fades it: silhouette -> walls -> clear.
import * as THREE from 'three';

export class EnemyFog {
  constructor(scene, isl, seaLevel) {
    const geo = new THREE.SphereGeometry(isl.r + 7, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xb9ccd8, transparent: true, opacity: 0.96,
      side: THREE.DoubleSide, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(isl.cx, seaLevel - 3, isl.cz);
    scene.add(this.mesh);
  }

  setReveal(r) {
    this.mesh.material.opacity = 0.96 * (1 - r);
    this.mesh.visible = r < 0.995;
  }
}
