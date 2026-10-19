import { Geometry } from '../gpu/geometry.js';
import { Lines } from '../gpu/graph.js';
import { LineMaterial } from '../gpu/material.js';

/**
 * A buffer of one-pixel lines rebuilt every frame, each fading from a bright
 * end to nothing at the other — rain, sparks, the sea. Vertex colours carry
 * the fade, and the black end adds nothing, so a streak is a streak and not a
 * stick.
 */
export function createStreaks(capacity, { fog = true, name = 'streaks' } = {}) {
  const position = new Float32Array(capacity * 6);
  const color = new Float32Array(capacity * 6);
  const geometry = new Geometry({ position, color });
  const lines = new Lines(geometry, new LineMaterial({
    vertexColors: true,
    transparent: true,
    blending: 'additive',
    depthWrite: false,
    fog,
  }));
  lines.name = name;
  lines.frustumCulled = false;
  lines.renderOrder = 1;

  let used = 0;

  return {
    object: lines,
    get used() { return used; },

    begin() { used = 0; },

    /** From (x0, y0, z0) at brightness a to (x1, y1, z1) at brightness b. */
    add(x0, y0, z0, a, x1, y1, z1, b) {
      if (used >= capacity) return;
      const p = used * 6;
      position[p] = x0; position[p + 1] = y0; position[p + 2] = z0;
      position[p + 3] = x1; position[p + 4] = y1; position[p + 5] = z1;
      color[p] = a; color[p + 1] = a; color[p + 2] = a;
      color[p + 3] = b; color[p + 4] = b; color[p + 5] = b;
      used += 1;
    },

    end() {
      position.fill(0, used * 6);
      color.fill(0, used * 6);
      geometry.needsUpdate = true;
    },
  };
}
