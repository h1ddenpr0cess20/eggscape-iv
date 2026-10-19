import { Geometry } from '../gpu/geometry.js';
import { Mesh } from '../gpu/graph.js';
import { BasicMaterial } from '../gpu/material.js';
import { glowTexture } from './glow.js';

/**
 * Hundreds of glowing points in one draw: a buffer of quads rebuilt every
 * frame, each turned to face the camera and added onto whatever is behind it.
 * A quad nobody asked for this frame is folded to nothing rather than taken
 * out, so the buffers never change size.
 */
export function createSprites(capacity) {
  const position = new Float32Array(capacity * 12);
  const color = new Float32Array(capacity * 12);
  const uv = new Float32Array(capacity * 8);
  const index = new Uint32Array(capacity * 6);
  for (let i = 0; i < capacity; i++) {
    uv.set([0, 1, 1, 1, 1, 0, 0, 0], i * 8);
    const v = i * 4;
    index.set([v, v + 2, v + 1, v, v + 3, v + 2], i * 6);
  }

  const geometry = new Geometry({ position, color, uv, index });
  const mesh = new Mesh(geometry, new BasicMaterial({
    map: glowTexture(),
    vertexColors: true,
    transparent: true,
    blending: 'additive',
    depthWrite: false,
    side: 'double',
  }));
  mesh.name = 'sprites';
  /** The quads are everywhere at once; a bounding sphere would be the sky. */
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;

  let used = 0;
  let rx = 1, ry = 0, rz = 0, ux = 0, uy = 1, uz = 0;

  return {
    object: mesh,

    /** Take the camera's right and up, so every quad squares up to it. */
    begin(camera) {
      const b = camera.basis;
      rx = b[0]; ry = b[1]; rz = b[2];
      ux = b[3]; uy = b[4]; uz = b[5];
      used = 0;
    },

    /** A point of light `size` metres across, `bright` from 0 to 1. */
    add(x, y, z, size, bright) {
      if (used >= capacity) return;
      const h = size / 2;
      const ax = (rx + ux) * h, ay = (ry + uy) * h, az = (rz + uz) * h;
      const bx = (rx - ux) * h, by = (ry - uy) * h, bz = (rz - uz) * h;
      const p = used * 12;
      position[p] = x - bx; position[p + 1] = y - by; position[p + 2] = z - bz;
      position[p + 3] = x + ax; position[p + 4] = y + ay; position[p + 5] = z + az;
      position[p + 6] = x + bx; position[p + 7] = y + by; position[p + 8] = z + bz;
      position[p + 9] = x - ax; position[p + 10] = y - ay; position[p + 11] = z - az;
      color.fill(bright, p, p + 12);
      used += 1;
    },

    end() {
      position.fill(0, used * 12);
      color.fill(0, used * 12);
      geometry.needsUpdate = true;
    },
  };
}
