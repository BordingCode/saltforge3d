// Solve a launch velocity from P to land on T at a fixed speed (used by the rival's gunner).
import * as THREE from 'three';
import { GRAVITY } from '../config.js';

export function solveArc(P, T, speed, g = GRAVITY, high = true) {
  const dx = T.x - P.x, dz = T.z - P.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.001) return null;
  const y = T.y - P.y;
  const v2 = speed * speed;
  const disc = v2 * v2 - g * (g * d * d + 2 * y * v2);
  if (disc < 0) return null; // out of range
  const root = Math.sqrt(disc);
  const tan = (v2 + (high ? root : -root)) / (g * d);
  const theta = Math.atan(tan);
  const horiz = Math.cos(theta) * speed;
  const vy = Math.sin(theta) * speed;
  const inv = 1 / d;
  return new THREE.Vector3(dx * inv * horiz, vy, dz * inv * horiz);
}
