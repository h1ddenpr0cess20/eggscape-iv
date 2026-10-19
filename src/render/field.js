/**
 * The wind, as a stream function: a few sines laid over each other until they
 * stop looking like sines. Air that follows the curl of it never piles up or
 * thins out — it only goes round — so whatever is carried on it is pulled
 * into the long threads and slow whorls of smoke in water. The sky, the sea
 * and the rain all read the same air.
 */
export function stream(x, y, t) {
  return Math.sin(x * 1.3 + t * 0.21) * Math.cos(y * 1.1 - t * 0.15)
    + 0.6 * Math.sin(x * 2.7 - y * 1.9 + t * 0.3)
    + 0.35 * Math.cos(x * 4.1 + y * 3.3 - t * 0.25)
    + 0.2 * Math.sin(x * 7.3 - y * 6.1 + t * 0.4);
}

/**
 * Which way the air is going at (x, y), as a unit vector written into `out`:
 * the curl of `stream`, differentiated by hand, because this is asked tens of
 * thousands of times a frame and four calls to `stream` for each is a phone's
 * whole budget.
 */
export function curl(out, x, y, t) {
  const a = x * 1.3 + t * 0.21;
  const b = y * 1.1 - t * 0.15;
  const c = x * 2.7 - y * 1.9 + t * 0.3;
  const d = x * 4.1 + y * 3.3 - t * 0.25;
  const e = x * 7.3 - y * 6.1 + t * 0.4;
  const cc = Math.cos(c);
  const sd = Math.sin(d);
  const ce = Math.cos(e);
  const px = 1.3 * Math.cos(a) * Math.cos(b) + 1.62 * cc - 1.435 * sd + 1.46 * ce;
  const py = -1.1 * Math.sin(a) * Math.sin(b) - 1.14 * cc - 1.155 * sd - 1.22 * ce;
  const len = Math.hypot(px, py) || 1;
  out.x = py / len;
  out.y = -px / len;
  out.speed = len;
  return out;
}

/** A cheap, stable hash of an integer pair onto [0, 1). */
export function hash(i, j) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
