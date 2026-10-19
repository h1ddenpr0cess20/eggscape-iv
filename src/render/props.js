import { HAZARD, LANE_WIDTH } from '../core/tuning.js';
import { octahedronEdges, plane } from '../gpu/geometry.js';
import { Group, Lines, Mesh } from '../gpu/graph.js';
import { hash } from './field.js';
import { fade, fill, segments, wire } from './materials.js';
import { THEME } from './theme.js';

const DEPTH = 0.8;
/** How far apart the threads of light run along a deck. */
const THREAD = LANE_WIDTH / 8;
/** And how often light runs off its edges. */
const DRIP = 0.7;

function box(out, x0, x1, y0, y1, z0, z1) {
  const corners = [
    [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
    [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
  ];
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  for (const [a, b] of edges) out.push(...corners[a], ...corners[b]);
}

/**
 * A slab: a bright edge, threads of light combed along its top like water
 * running down a road, and light running off every side of it into the dark.
 * Drawn where it is rather than pooled and scaled, because the threads and the
 * drips have to keep their spacing whatever the length.
 */
export function createSlab(seg) {
  const group = new Group();
  group.name = `slab-${seg.id}`;

  const w = seg.xMax - seg.xMin;
  const l = seg.z1 - seg.z0;

  const frame = [];
  box(frame, -w / 2, w / 2, -DEPTH, 0, -l / 2, l / 2);
  group.add(segments(new Float32Array(frame), wire(THEME.wire, 0.9)));

  /** The lane lines, straight and a little brighter than the threads, so a
   *  lane is still a lane at speed. */
  const lanes = [];
  for (let lane = 1; lane < seg.span; lane++) {
    const x = -w / 2 + lane * LANE_WIDTH;
    lanes.push(x, 0.005, -l / 2, x, 0.005, l / 2);
  }
  if (lanes.length) group.add(segments(new Float32Array(lanes), wire(THEME.dim, 0.7)));

  /** Threads: light running down the road like water, each one wandering a
   *  hand's width either side of its line and brightening and dimming as it
   *  goes, so the deck is a river and not a floor. */
  const threads = [];
  const shine = [];
  const steps = Math.max(2, Math.ceil(l / 1.2));
  for (let k = 1; k * THREAD < w - 0.01; k++) {
    if (k % 8 === 0) continue;
    const x = -w / 2 + k * THREAD;
    const phase = hash(seg.id, k) * 6.28;
    const swing = 0.08 + hash(k, seg.id) * 0.16;
    const bright = 0.12 + hash(seg.id + 5, k) * 0.38;
    let px = x;
    let pz = -l / 2;
    let pb = 0;
    for (let s = 1; s <= steps; s++) {
      const z = -l / 2 + (s / steps) * l;
      const nx = x + Math.sin(z * 0.45 + phase) * swing;
      const nb = bright * (0.35 + 0.65 * Math.sin(z * 0.21 + phase * 2) ** 2);
      threads.push(px, 0.004, pz, nx, 0.004, z);
      shine.push(pb, pb, pb, nb, nb, nb);
      px = nx;
      pz = z;
      pb = nb;
    }
  }
  if (threads.length) group.add(segments(new Float32Array(threads), fade(), new Float32Array(shine)));

  /** Light running off the edges and down, dimmer the further it falls. */
  const drips = [];
  const glow = [];
  const drip = (x, z, i) => {
    const r = hash(seg.id * 31 + i, Math.round(z * 10));
    const length = 0.8 + r * r * 5.5;
    drips.push(x, -DEPTH, z, x, -DEPTH - length, z);
    const b = 0.18 + hash(i, seg.id) * 0.3;
    glow.push(b, b, b, 0, 0, 0);
  };
  let i = 0;
  for (let z = -l / 2 + DRIP / 2; z < l / 2; z += DRIP) {
    drip(-w / 2, z, i++);
    drip(w / 2, z, i++);
  }
  for (let x = -w / 2 + DRIP / 2; x < w / 2; x += DRIP) {
    drip(x, -l / 2, i++);
    drip(x, l / 2, i++);
  }
  group.add(segments(new Float32Array(drips), fade(), new Float32Array(glow)));

  const deck = new Mesh(plane(w, l), fill(THEME.deck, 0.42));
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = -0.01;
  deck.renderOrder = -1;
  group.add(deck);

  group.position.set((seg.xMin + seg.xMax) / 2, seg.y, (seg.z0 + seg.z1) / 2);
  return group;
}

/** Materials are plain data and need no freeing; the geometry is this slab's
 *  own, and its buffers go back to the GPU with it. */
export function disposeSlab(group) {
  group.traverse((node) => node.geometry?.dispose());
}

function rays(count, inner, outer, seed) {
  const out = [];
  for (let i = 0; i < count; i++) {
    /** Spread over the sphere by the golden angle, so no two rays bunch. */
    const y = 1 - ((i + 0.5) / count) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.39996 + seed;
    const reach = inner + (outer - inner) * hash(i, 7);
    out.push(0, 0, 0, Math.cos(a) * r * reach, y * reach, Math.sin(a) * r * reach);
  }
  return new Float32Array(out);
}

function circle(radius, points = 40) {
  const out = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const b = ((i + 1) / points) * Math.PI * 2;
    out.push(Math.cos(a) * radius, 0, Math.sin(a) * radius, Math.cos(b) * radius, 0, Math.sin(b) * radius);
  }
  return new Float32Array(out);
}

/**
 * A bolt: a knot of light that came down out of the storm and is still
 * crackling where it landed. Its glow and its tail are drawn by the view —
 * the tail grows and shrinks as it falls — so this is the hard part of it,
 * and the ring it has burned into the deck.
 */
export function createHazard() {
  const group = new Group();

  const core = segments(rays(16, 0.22, 0.62, 0.4), wire(THEME.bolt, 0.95));
  core.position.y = HAZARD.height / 2;
  group.add(core);

  const shell = new Lines(octahedronEdges(0.36), wire(THEME.bolt, 0.6));
  shell.position.y = HAZARD.height / 2;
  group.add(shell);

  const ring = segments(circle(0.78), wire(THEME.wire, 0.7));
  ring.position.y = 0.03;
  group.add(ring);

  /** Handed over rather than looked up: the view turns these every frame
   *  for every bolt in shot, and a search of the group is a search. */
  group.userData.core = core;
  group.userData.shell = shell;
  group.userData.ring = ring;

  return group;
}

/** A spark: a four-pointed glint, small enough to be worth going for. */
export function createSpark() {
  const out = [
    0, -0.34, 0, 0, 0.34, 0,
    -0.3, 0, 0, 0.3, 0, 0,
    0, 0, -0.3, 0, 0, 0.3,
    -0.12, -0.12, 0, 0.12, 0.12, 0,
    -0.12, 0.12, 0, 0.12, -0.12, 0,
  ];
  const spark = segments(new Float32Array(out), wire(THEME.spark, 0.95));
  spark.name = 'spark';
  return spark;
}
