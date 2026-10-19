import { approach, clamp, spring } from '../core/motion.js';
import { HAZARD, laneX, PLAYER } from '../core/tuning.js';
import { Vec3 } from '../gpu/math.js';
import { createEgg, createShadow, EGG_SCALE } from './egg.js';
import { createHazard, createSlab, createSpark, disposeSlab } from './props.js';
import { focus as aimAt, rigFor, seat } from './rig.js';
import { createSprites } from './sprites.js';
import { createStreaks } from './streaks.js';
import { createWeather } from './weather.js';

const CHASE = 6;
const DRAW = { behind: 12, ahead: 130 };
/** How hard the shell rocks while it runs, and how fast. */
const ROCK = { amount: 0.075, speed: 11, lean: 0.12, spin: 0.5 };

/**
 * The squash spring, and the step it is integrated at. It is explicit Euler,
 * so a long frame does not slow it down — it blows it up: one 250ms hitch and
 * the shell pins at its limits and stays there, wobbling between a pancake and
 * a capsule. Sub-stepping is the whole fix, and it matters because the
 * silhouette is the asset.
 */
const SQUASH = { k: 190, c: 11, step: 1 / 120, max: 0.4, stretch: -0.08 };

/**
 * A bolt is down by the time the egg is this many metres off — long before it
 * matters — and above that it is still falling, faster the further off it is.
 * It is only ever a picture: the run has had it on the deck all along.
 */
const FALL = { land: 40, rate: 1.5, tail: 16 };

/** Light thrown off by a break, a spark, a landing. */
const BURST = { capacity: 420, drag: 2.2, gravity: 9 };

/** Where a bolt is drawn, `dz` metres ahead of the egg. */
export function fallHeight(dz) {
  return Math.max(0, dz - FALL.land) * FALL.rate;
}

function createPool(scene, make) {
  const items = [];
  let cursor = 0;

  return {
    begin() { cursor = 0; },
    take() {
      let item = items[cursor];
      if (!item) {
        item = make();
        items[cursor] = item;
        scene.add(item);
      }
      item.visible = true;
      cursor += 1;
      return item;
    },
    end() { for (let i = cursor; i < items.length; i++) items[i].visible = false; },
  };
}

/**
 * The one place that knows both the game and the scene graph. Everything it
 * draws is derived from a snapshot — it holds no state the run depends on, so
 * a restart is a `reset()` and nothing more. The bursts of light are its own,
 * and are scenery: nothing in the run waits on them.
 */
export function createView({ scene, camera, studio }) {
  const egg = createEgg();
  const shadow = createShadow();
  scene.add(egg.object, shadow);

  const weather = createWeather({ scene, studio });
  const glows = createSprites(BURST.capacity + 220);
  const trails = createStreaks(BURST.capacity + 120, { name: 'trails' });
  scene.add(trails.object, glows.object);

  const slabs = new Map();
  const bolts = createPool(scene, createHazard);
  const sparks = createPool(scene, createSpark);
  /** Bolts already seen to come down, so each one lands exactly once. */
  let landed = new WeakSet();
  const motes = [];

  const squash = { p: 0, v: 0 };
  const target = new Vec3();
  const aim = new Vec3();

  let level = 0;
  let placed = false;
  let tumble = 0;
  let shake = 0;

  function burst(x, y, z, { count = 24, speed = 7, up = 0.4, life = 0.7, size = 0.2 } = {}) {
    for (let i = 0; i < count && motes.length < BURST.capacity; i++) {
      const a = Math.random() * Math.PI * 2;
      const lift = Math.random() * 2 - 1 + up;
      const s = speed * (0.35 + Math.random() * 0.65);
      motes.push({
        x, y, z,
        vx: Math.cos(a) * s,
        vy: lift * s,
        vz: Math.sin(a) * s,
        life: life * (0.5 + Math.random() * 0.5),
        max: life,
        size: size * (0.6 + Math.random() * 0.8),
      });
    }
  }

  function syncSlabs(course) {
    const live = new Set();
    for (const seg of course.segments) {
      live.add(seg.id);
      if (slabs.has(seg.id)) continue;
      const slab = createSlab(seg);
      slabs.set(seg.id, slab);
      scene.add(slab);
    }
    for (const [id, slab] of slabs) {
      if (live.has(id)) continue;
      scene.remove(slab);
      disposeSlab(slab);
      slabs.delete(id);
    }
  }

  function syncBolts(course, player, time) {
    const slant = 0.06;
    bolts.begin();
    for (const hazard of course.hazards) {
      if (hazard.hit || hazard.z < player.z - DRAW.behind) continue;
      if (hazard.z > player.z + DRAW.ahead) break;
      const dz = hazard.z - player.z;
      const h = fallHeight(dz);
      const down = h === 0;
      const mesh = bolts.take();
      mesh.position.set(hazard.x, hazard.y + h, hazard.z);
      const { core, shell, ring } = mesh.userData;
      core.rotation.set(time * 2.1, time * 3.3 + hazard.z, 0);
      shell.rotation.set(-time * 0.9, time * 1.4, 0);
      /** The ring is where it is going to land: there on the deck before the
       *  bolt is, and tightening as it comes. */
      ring.position.y = 0.03 - h;
      ring.scale.setScalar(down ? 1 + 0.08 * Math.sin(time * 9 + hazard.z) : 1 + Math.min(2, h * 0.04));

      if (down && !landed.has(hazard)) {
        landed.add(hazard);
        /** Only a bolt seen falling gets a splash — not one that was down
         *  before anybody was looking. */
        if (dz > FALL.land - 2) {
          burst(hazard.x, hazard.y + 0.2, hazard.z, { count: 26, speed: 9, up: 0.9, life: 0.6, size: 0.18 });
        }
      }

      const cy = hazard.y + h + HAZARD.height / 2;
      const crackle = 0.8 + 0.2 * Math.sin(time * 37 + hazard.z * 3);
      glows.add(hazard.x, cy, hazard.z, down ? 2.3 : 3, (down ? 0.85 : 1) * crackle);
      glows.add(hazard.x, cy, hazard.z, 0.7, 1);

      /** The tail: long while it falls, and burning down once it has landed. */
      const settle = clamp((dz - (FALL.land - 8)) / 8, 0, 1);
      const tail = down ? 1.2 + settle * 4 : Math.min(FALL.tail, 5 + h * 0.4);
      trails.add(hazard.x, cy, hazard.z, 1, hazard.x - slant * tail, cy + tail, hazard.z, 0);
      trails.add(hazard.x + 0.12, cy, hazard.z, 0.5, hazard.x + 0.12 - slant * tail, cy + tail * 0.7, hazard.z, 0);
    }
    bolts.end();
  }

  function syncSparks(course, player, time) {
    sparks.begin();
    for (const spark of course.sparks) {
      if (spark.taken || spark.z < player.z - DRAW.behind) continue;
      if (spark.z > player.z + DRAW.ahead) break;
      const mesh = sparks.take();
      const y = spark.y + Math.sin(time * 2.6 + spark.z) * 0.12;
      mesh.position.set(spark.x, y, spark.z);
      mesh.rotation.set(0, time * 1.9 + spark.z, Math.sin(time * 1.3 + spark.z) * 0.3);
      glows.add(spark.x, y, spark.z, 1.1, 0.55 + 0.3 * Math.sin(time * 6 + spark.z * 2));
    }
    sparks.end();
  }

  function syncMotes(dt) {
    const drag = Math.exp(-BURST.drag * dt);
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.life -= dt;
      if (m.life <= 0) {
        motes[i] = motes[motes.length - 1];
        motes.pop();
        continue;
      }
      m.vx *= drag;
      m.vy = m.vy * drag - BURST.gravity * dt;
      m.vz *= drag;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.z += m.vz * dt;
      const k = m.life / m.max;
      trails.add(m.x, m.y, m.z, k, m.x - m.vx * 0.06, m.y - m.vy * 0.06, m.z - m.vz * 0.06, 0);
      glows.add(m.x, m.y, m.z, m.size, k);
    }
  }

  function syncEgg(snapshot, dt, time) {
    const { player, state, invulnerable } = snapshot;

    for (let left = Math.min(dt, 0.25); left > 0; left -= SQUASH.step) {
      spring(squash, SQUASH.k, SQUASH.c, Math.min(SQUASH.step, left), 0);
    }
    /**
     * Squash freely, stretch barely. The rebound of a landing used to pull the
     * shell into a capsule, and a stretched egg is not an egg — the silhouette
     * is the asset, so the spring is only allowed to flatten it.
     */
    const s = clamp(squash.p, SQUASH.stretch, SQUASH.max);

    egg.object.position.set(player.x, player.y + PLAYER.height / 2, player.z);
    /** The studio travels with the shell, so the light on it never drifts. */
    studio?.position.set(player.x, player.y, player.z);
    egg.object.scale.set(1 + s * 0.4, 1 - s, 1 + s * 0.4);
    egg.object.scale.multiplyScalar(EGG_SCALE);

    /**
     * The shell stays upright. An egg tumbling end over end is a shape you
     * cannot read — half the time it is pointing at you — and the silhouette,
     * fat end down, is the whole asset. So it rocks and it turns on the spot,
     * the way Marc does, and leans into the lane it is moving to.
     */
    const running = state === 'running';
    const rock = running && player.grounded ? Math.sin(time * ROCK.speed) * ROCK.amount : 0;
    const drift = clamp((laneX(player.lane) - player.x) * -0.4, -0.35, 0.35);

    egg.object.rotation.set(
      running ? ROCK.lean + (player.grounded ? 0 : -0.1) : 0,
      egg.object.rotation.y + (running ? dt * ROCK.spin : 0),
      rock + drift,
    );

    if (state === 'ready') {
      /** Nothing is running yet, so the egg does what Marc does: it rocks. */
      egg.object.position.y += Math.sin(time * 1.4) * 0.05;
      egg.object.rotation.z = Math.sin(time * 0.9) * 0.09;
      egg.object.rotation.y = time * 0.35;
    }

    if (state === 'over') {
      tumble += dt;
      egg.object.position.y -= tumble * tumble * 4;
      egg.object.rotation.z += tumble * 2.2;
    } else {
      tumble = 0;
    }

    /** Invulnerable is a blink, not a tint — the materials are shared. */
    egg.body.visible = invulnerable <= 0 || Math.floor(time * 16) % 2 === 0;
  }

  function syncShadow(course, player) {
    const ground = course.groundAt(player.x, player.z);
    shadow.visible = Boolean(ground);
    if (!ground) return;
    const height = Math.max(0, player.y - ground.y);
    shadow.position.set(player.x, ground.y + 0.02, player.z);
    shadow.scale.setScalar(clamp(1 - height * 0.1, 0.4, 1.05));
  }

  return {
    weather,

    /** A landing, a pickup and a hit all read as a kick in the springs. */
    kick(force) { squash.v += force; },
    jolt(force) { shake = Math.min(1, shake + force); },

    /** A bolt broken by a slam goes up in a shower of light. */
    shatter(hazard) {
      burst(hazard.x, hazard.y + HAZARD.height / 2, hazard.z, { count: 70, speed: 13, up: 0.5, life: 0.9, size: 0.26 });
    },

    /** A spark taken comes apart in the egg's hands. */
    collect(spark) {
      burst(spark.x, spark.y, spark.z, { count: 14, speed: 4.5, up: 0.3, life: 0.4, size: 0.14 });
    },

    /** And the egg, struck, throws light off itself. */
    struck(player) {
      burst(player.x, player.y + PLAYER.height / 2, player.z, { count: 50, speed: 10, up: 0.6, life: 0.7, size: 0.22 });
    },

    reset() {
      for (const [id, slab] of slabs) {
        scene.remove(slab);
        disposeSlab(slab);
        slabs.delete(id);
      }
      squash.p = 0;
      squash.v = 0;
      tumble = 0;
      shake = 0;
      level = 0;
      placed = false;
      landed = new WeakSet();
      motes.length = 0;
      weather.reset();
    },

    /**
     * Cut to the egg rather than chase it. A respawn puts it down metres
     * further on, and a camera that eases after it spends a second with the
     * egg off the top of the frame — running blind, on a course that is not
     * waiting.
     */
    snap() { placed = false; },

    sync(snapshot, dt, time) {
      const { course, player } = snapshot;

      syncSlabs(course);
      syncEgg(snapshot, dt, time);
      syncShadow(course, player);

      if (player.grounded) level = approach(level, player.y, 6, dt);
      shake = approach(shake, 0, 6, dt);

      const rig = rigFor(camera.aspect);
      seat(target, player, level, rig, shake);
      if (placed) camera.position.lerp(target, 1 - Math.exp(-dt * CHASE));
      else {
        camera.position.copy(target);
        placed = true;
      }
      camera.lookAt(aimAt(aim, player, level, rig));

      /** Everything that faces the camera is laid out after it has moved. */
      glows.begin(camera);
      trails.begin();
      syncBolts(course, player, time);
      syncSparks(course, player, time);
      syncMotes(Math.min(dt, 0.1));
      glows.end();
      trails.end();

      weather.update(dt, player, camera, snapshot.distance / 1400, snapshot.state === 'running' ? player.speed : 0);
    },
  };
}
