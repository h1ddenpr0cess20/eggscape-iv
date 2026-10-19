import { clamp } from '../core/motion.js';
import { curl, hash } from './field.js';
import { createSky } from './sky.js';
import { createSprites } from './sprites.js';
import { createStreaks } from './streaks.js';

/**
 * The rain: a box of falling light that travels with the egg. It is driven
 * at the egg as well as down — `wind` is how hard — and every streak is drawn
 * as the path it makes past the egg rather than past the ground, so on screen
 * they all fan out of one point high above the course, the way rain does when
 * you are looking up into it.
 */
const RAIN = {
  count: 2800, half: 50, behind: 6, ahead: 150, top: 52, floor: -9,
  fall: [34, 52], wind: 26, trail: [0.18, 0.55],
};
/** The sea of light the rain falls into, far under the course. */
const SEA = { y: -7.5, cell: 5, half: 56, behind: 12, ahead: 124, steps: 14, step: 1.25 };
/** Lightning: how long a strike lasts, and how long the sky waits between. */
const STRIKE = { life: 0.5, quiet: [3.5, 11] };

/** How bright a strike is, `t` seconds in: a stroke, a gap, a return stroke
 *  and the long fade — the flicker is what makes it lightning and not a lamp. */
export function flicker(t) {
  if (t < 0) return 0;
  if (t < 0.06) return 1;
  if (t < 0.11) return 0.12;
  if (t < 0.19) return 0.85;
  if (t < STRIKE.life) return 0.85 * Math.exp(-(t - 0.19) * 11);
  return 0;
}

/** A forked path of light from the sky to the sea, by midpoint displacement. */
function fork(random, x, top, z) {
  const out = [];
  function split(ax, ay, az, bx, by, bz, spread, depth, bright) {
    if (depth === 0) {
      out.push([ax, ay, az, bx, by, bz, bright]);
      return;
    }
    const mx = (ax + bx) / 2 + (random() - 0.5) * spread;
    const my = (ay + by) / 2 + (random() - 0.5) * spread * 0.25;
    const mz = (az + bz) / 2 + (random() - 0.5) * spread * 0.5;
    split(ax, ay, az, mx, my, mz, spread / 2, depth - 1, bright);
    split(mx, my, mz, bx, by, bz, spread / 2, depth - 1, bright);
    if (depth >= 3 && depth <= 5 && random() < 0.4) {
      const len = (ay - by) * (0.5 + random() * 0.6);
      split(mx, my, mz, mx + (random() - 0.5) * len * 1.2, my - len, mz + (random() - 0.5) * len * 0.4,
        spread / 2.4, depth - 2, bright * 0.5);
    }
  }
  split(x, top, z, x + (random() - 0.5) * 14, SEA.y, z + (random() - 0.5) * 6, 18, 7, 1);
  return out;
}

/**
 * Everything in the sky and under the course: the rain of light, the sea it
 * falls into, the smoke behind it all, and the lightning. None of it touches
 * the run. It follows the egg, the way weather follows anybody out in it.
 */
export function createWeather({ scene, studio, random = Math.random }) {
  const sky = createSky({ random, aspect: globalThis.innerWidth / globalThis.innerHeight || 1.6 });
  if (sky) {
    scene.background = sky.texture;
    scene.backgroundIntensity = 1;
  }

  const rain = createStreaks(RAIN.count, { name: 'rain' });
  const columns = Math.ceil((SEA.half * 2) / SEA.cell);
  const rows = Math.ceil((SEA.ahead + SEA.behind) / SEA.cell) + 1;
  const sea = createStreaks(columns * rows * SEA.steps * 3, { name: 'sea' });
  const heads = createSprites(RAIN.count + columns * rows + 300);
  const bolt = createStreaks(400, { fog: false, name: 'lightning' });
  scene.add(sea.object, rain.object, bolt.object, heads.object);

  const lights = studio?.userData.lights;
  const base = lights && Object.fromEntries(Object.entries(lights).map(([k, light]) => [k, light.intensity]));

  const drops = [];
  function drop(d, focus, top) {
    d.x = (random() * 2 - 1) * RAIN.half;
    d.z = focus - RAIN.behind + random() * (RAIN.behind + RAIN.ahead);
    d.y = top ? RAIN.top + random() * 10 : RAIN.floor + random() * (RAIN.top - RAIN.floor);
    d.fall = RAIN.fall[0] + random() * (RAIN.fall[1] - RAIN.fall[0]);
    d.trail = RAIN.trail[0] + random() * random() * (RAIN.trail[1] - RAIN.trail[0]);
    d.bright = 0.12 + random() * random() * 0.95;
    d.head = random() < 0.7;
    /** One in forty is near enough, or bright enough, to bloom. */
    d.bloom = random() < 0.025;
    return d;
  }

  const air = { x: 0, y: 0, speed: 0 };
  let time = random() * 100;
  let placed = false;
  let quiet = 2 + random() * 3;
  let strike = null;
  let flash = 0;
  const listeners = [];

  function lightning(near, focus) {
    const side = random() < 0.5 ? -1 : 1;
    const x = near ? side * (9 + random() * 10) : side * (14 + random() * 36);
    const z = focus.z + (near ? 28 + random() * 14 : 55 + random() * 50);
    strike = { t: 0, path: fork(random, x, 58, z), near };
    const distance = Math.hypot(x - focus.x, z - focus.z);
    for (const fn of listeners) fn({ distance, near });
  }

  function updateRain(dt, focus, fury, speed) {
    const gust = Math.sin(time * 0.23) * 4;
    const live = Math.floor(RAIN.count * (0.7 + 0.3 * fury));
    if (!placed) {
      drops.length = 0;
      for (let i = 0; i < RAIN.count; i++) drops.push(drop({}, focus.z, false));
      placed = true;
    }
    /** Past the egg, the rain also comes at it as fast as it is running. */
    const pass = RAIN.wind + speed;
    for (let i = 0; i < live; i++) {
      const d = drops[i];
      d.y -= d.fall * dt;
      d.x += gust * dt;
      d.z -= RAIN.wind * dt;
      if (d.x > RAIN.half) d.x -= RAIN.half * 2;
      if (d.x < -RAIN.half) d.x += RAIN.half * 2;
      if (d.y < RAIN.floor || d.z < focus.z - RAIN.behind) drop(d, focus.z + RAIN.wind * 0.6, true);
      rain.add(d.x, d.y, d.z, d.bright,
        d.x - gust * d.trail, d.y + d.fall * d.trail, d.z + pass * d.trail, 0);
      if (d.head) heads.add(d.x, d.y, d.z, d.bloom ? 1.1 : 0.22 + d.bright * 0.45, Math.min(1, 0.35 + d.bright * 1.6));
    }
  }

  /**
   * The sea: threads seeded on a grid fixed to the world, so it does not slide
   * along with the egg, each one carried a dozen steps on the curl of the
   * wind. Mostly they run across the course, the way the waves at the bottom
   * of the picture do, and a slow swell rolls bright bands through them.
   */
  function updateSea(focus) {
    const t = time * 0.4;
    const i0 = Math.floor(-SEA.half / SEA.cell);
    const j0 = Math.floor((focus.z - SEA.behind) / SEA.cell);
    for (let j = j0; j < j0 + rows; j++) {
      for (let i = i0; i < i0 + columns; i++) {
        let x = (i + hash(i, j)) * SEA.cell;
        let z = (j + hash(j, i)) * SEA.cell;
        const strength = 0.25 + 0.75 * hash(i + 17, j - 5);
        const swell = 0.4 + 0.6 * Math.sin(z * 0.05 - time * 0.9 + x * 0.03) ** 2;
        const glint = hash(i - 3, j + 11) < 0.6 ? (hash(i, j + 1) * SEA.steps) | 0 : -1;
        let y = level(x, z, t);
        for (let k = 0; k < SEA.steps; k++) {
          curl(air, x * 0.045, z * 0.045, t);
          const nx = x + (air.x * 0.55 + 0.75) * SEA.step;
          const nz = z + air.y * SEA.step * 0.55;
          const ny = level(nx, nz, t);
          const env = Math.sin((Math.PI * (k + 0.5)) / SEA.steps);
          const b = Math.min(1, strength * swell * env * 1.7);
          sea.add(x, y, z, b, nx, ny, nz, b * 0.85);
          /** A second thread a hand's width off the first, so the sea is
           *  silk and not string. */
          sea.add(x, y + 0.15, z + 0.35, b * 0.6, nx, ny + 0.15, nz + 0.35, b * 0.5);
          sea.add(x, y - 0.1, z - 0.3, b * 0.4, nx, ny - 0.1, nz - 0.3, b * 0.3);
          if (k === glint) heads.add(x, y + 0.1, z, 0.4 + b * 0.7, Math.min(1, b * 1.5));
          x = nx;
          y = ny;
          z = nz;
        }
      }
    }
  }

  function level(x, z, t) {
    return SEA.y + 1.1 * Math.sin(x * 0.11 + t * 1.3) * Math.cos(z * 0.09 - t)
      + 0.5 * Math.sin(z * 0.23 + x * 0.05 + t * 1.7);
  }

  function updateStrike(dt) {
    flash = 0;
    if (!strike) return;
    strike.t += dt;
    const k = flicker(strike.t);
    if (strike.t > STRIKE.life) {
      strike = null;
      return;
    }
    flash = k * (strike.near ? 1 : 0.7);
    for (const [ax, ay, az, bx, by, bz, b] of strike.path) {
      bolt.add(ax, ay, az, b * k, bx, by, bz, b * k);
      heads.add(ax, ay, az, 5 * b, 0.12 * b * k);
    }
  }

  function updateLights() {
    if (!lights) return;
    for (const [k, light] of Object.entries(lights)) light.intensity = base[k] * (1 + flash * 1.4);
    scene.backgroundIntensity = 1 + flash * 0.5;
  }

  return {
    get flash() { return flash; },
    get sky() { return sky; },

    /** Called with { distance, near } every time lightning strikes. */
    onStrike(fn) { listeners.push(fn); },

    /** Lightning now — close by when the egg has just been hit. */
    strike(focus, near = true) { lightning(near, focus); },

    reset() { placed = false; },

    /**
     * Once a frame, after the camera has moved. `focus` is where the egg is,
     * `speed` how fast it is going, and `fury` from 0 to 1 how deep into the
     * storm it has got: more rain, and the lightning closer together.
     */
    update(dt, focus, camera, fury = 0, speed = 0) {
      time += dt;
      const f = clamp(fury, 0, 1);
      quiet -= dt;
      if (quiet <= 0 && !strike) {
        lightning(false, focus);
        quiet = (STRIKE.quiet[0] + random() * (STRIKE.quiet[1] - STRIKE.quiet[0])) * (1 - f * 0.45);
      }

      rain.begin();
      heads.begin(camera);
      sea.begin();
      bolt.begin();
      updateRain(dt, focus, f, speed);
      updateSea(focus);
      updateStrike(dt);
      rain.end();
      heads.end();
      sea.end();
      bolt.end();

      updateLights();
      sky?.update(dt, flash, camera.aspect);
    },
  };
}
