import { Texture } from '../gpu/texture.js';
import { curl } from './field.js';

/** The long side and the short side. The sky is painted the way up the
 *  window is, or a phone held upright squeezes every whorl into a pillar. */
const LONG = 1024;
const SHORT = 640;
const TICK = 1 / 24;
/** Threads of smoke, each carried on the curl of the wind and drawn as one
 *  faint step a tick onto a canvas that forgets slowly — so where many of
 *  them have been, the sky is bright, and where none have, it is black. */
const THREADS = 2000;
const DROPS = 260;
/** The far rain falls away from a point above the top of the frame, the way
 *  rain does when you are looking up into it — as a share of the frame. */
const VANISH = { x: 0.5, y: -0.55 };

/**
 * The far sky, painted on a canvas and stretched behind everything. It is two
 * canvases: the smoke lives on one that is only ever darkened a little at a
 * time, so every thread it has drawn hangs there and thins; the rain is drawn
 * fresh over a copy of it each tick, because rain that left a trail would be
 * a curtain.
 */
export function createSky({ random = Math.random, aspect = 1.6 } = {}) {
  if (typeof document === 'undefined') return null;

  const smoke = document.createElement('canvas');
  const haze = smoke.getContext('2d');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!haze || !ctx) return null;

  let width = 0;
  let height = 0;
  let tall = null;

  /** Smoke is thickest low down, where the sea throws it up, and in a swathe
   *  across the middle of the sky. */
  function band() {
    const r = random();
    if (r < 0.45) return height * (0.62 + random() * 0.4);
    if (r < 0.75) return height * (0.25 + random() * 0.3);
    return random() * height;
  }

  /** Four brightnesses, so a tick is four strokes and not thousands. */
  const LEVELS = [0.06, 0.1, 0.17, 0.28];
  let threads = [];
  /**
   * Most new threads start where an old one already is, a hair to one side —
   * so they follow it, and the sky gathers into ribbons with black between
   * them instead of filling in evenly grey.
   */
  const thread = (t = {}) => {
    const from = threads.length && random() < 0.68 ? threads[(random() * threads.length) | 0] : null;
    return Object.assign(t, {
      x: from ? from.x + (random() - 0.5) * 6 : random() * width,
      y: from ? from.y + (random() - 0.5) * 4 : band(),
      life: 80 + random() * 260,
      level: random() < 0.55 ? 0 : random() < 0.6 ? 1 : random() < 0.7 ? 2 : 3,
    });
  };

  const drop = (top = false) => {
    const d = {
      x: random() * width * 1.3 - width * 0.15,
      y: top ? -random() * height * 0.2 : random() * height,
      speed: 10 + random() * 26,
      length: 30 + random() * 120,
      bright: 0.06 + random() * random() * 0.5,
    };
    /** Each falls along its own line out of the vanishing point. */
    const dx = d.x - VANISH.x * width;
    const dy = d.y - VANISH.y * height;
    const len = Math.hypot(dx, dy);
    d.ux = dx / len;
    d.uy = dy / len;
    return d;
  };
  let drops = [];

  const texture = new Texture(canvas);
  const air = { x: 0, y: 0, speed: 0 };

  let carry = 0;
  let time = random() * 100;

  function drawSmoke() {
    haze.globalCompositeOperation = 'source-over';
    haze.fillStyle = 'rgba(0, 0, 0, 0.034)';
    haze.fillRect(0, 0, width, height);
    haze.globalCompositeOperation = 'lighter';
    haze.lineWidth = 1;
    for (let level = 0; level < LEVELS.length; level++) {
      haze.strokeStyle = `rgba(228, 234, 244, ${LEVELS[level]})`;
      haze.beginPath();
      for (const t of threads) {
        if (t.level !== level) continue;
        curl(air, t.x / 300, t.y / 260, time * 0.5);
        const nx = t.x + air.x * 2.4 + 0.5;
        const ny = t.y + air.y * 1.7;
        haze.moveTo(t.x, t.y);
        haze.lineTo(nx, ny);
        t.x = nx;
        t.y = ny;
        t.life -= 1;
        if (t.life <= 0 || t.x < -10 || t.x > width + 10 || t.y < -10 || t.y > height + 10) thread(t);
      }
      haze.stroke();
    }
    haze.globalCompositeOperation = 'source-over';
  }

  function drawRain(flash) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(smoke, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      d.x += d.ux * d.speed;
      d.y += d.uy * d.speed;
      if (d.y - d.length * d.uy > height) drops[i] = drop(true);
      const tx = d.x - d.ux * d.length;
      const ty = d.y - d.uy * d.length;
      const g = ctx.createLinearGradient(tx, ty, d.x, d.y);
      g.addColorStop(0, 'rgba(230, 236, 246, 0)');
      g.addColorStop(1, `rgba(230, 236, 246, ${d.bright})`);
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, d.bright * 2)})`;
      ctx.fillRect(d.x - 1, d.y - 1, 2, 2);
    }
    if (flash > 0.01) {
      /** The whole sky lit from inside for a moment, brightest up top. */
      const g = ctx.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, `rgba(210, 220, 236, ${0.55 * flash})`);
      g.addColorStop(0.7, `rgba(160, 170, 190, ${0.2 * flash})`);
      g.addColorStop(1, `rgba(120, 130, 150, ${0.08 * flash})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Size the canvases for a window `aspect` wide, and start the weather on
   * them over. A few hundred ticks of smoke go down up front, so the first
   * frame is already weather rather than a black sky filling in.
   */
  function fit(aspect) {
    const want = aspect < 1;
    if (want === tall) return;
    tall = want;
    width = tall ? SHORT : LONG;
    height = tall ? LONG : SHORT;
    for (const each of [smoke, canvas]) {
      each.width = width;
      each.height = height;
    }
    haze.fillStyle = '#000';
    haze.fillRect(0, 0, width, height);
    threads = [];
    for (let i = 0; i < THREADS; i++) threads.push(thread());
    drops = Array.from({ length: DROPS }, () => drop());
    for (let i = 0; i < 160; i++) {
      drawSmoke();
      time += TICK;
    }
    drawRain(0);
    texture.needsUpdate = true;
  }

  fit(aspect);

  return {
    texture,

    /** Once a frame. `aspect` is the window's, width over height. */
    update(dt, flash = 0, aspect = 1.6) {
      fit(aspect);
      carry += dt;
      if (carry < TICK) return;
      /** Spend a tick and keep the remainder, so the sky moves at the same
       *  speed on every display. */
      carry = Math.min(carry - TICK, TICK);
      time += TICK;
      drawSmoke();
      drawRain(flash);
      texture.needsUpdate = true;
    },
  };
}
