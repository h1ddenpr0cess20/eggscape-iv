import { Texture } from '../gpu/texture.js';

const SIZE = 64;

let shared = null;

/**
 * A point of light, painted once: a hard white core and a halo that falls
 * away fast, the way a bright thing looks through wet air. Every glowing head
 * in the storm is this one texture on a quad, added onto the black.
 */
export function glowTexture() {
  if (shared || typeof document === 'undefined') return shared;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.1, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.22, 'rgba(240,244,250,0.42)');
  g.addColorStop(0.45, 'rgba(220,228,240,0.1)');
  g.addColorStop(1, 'rgba(220,228,240,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);

  shared = new Texture(canvas);
  return shared;
}
