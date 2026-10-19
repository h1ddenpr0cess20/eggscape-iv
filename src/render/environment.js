import { prefilterInBackground } from '../gpu/environment.js';
import { DirectionalLight, Group, HemisphereLight } from '../gpu/graph.js';

/**
 * Marc's studio, from src/client/egg/environment.js — a sky, a dark ground,
 * and one soft window in it — with the warmth taken out of the sky, because
 * the only window out here is a storm. The shell keeps its own cream; it is
 * what it reflects that has gone cold.
 */
export function buildEnvironment(scene) {
  try {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 32;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 32);
    g.addColorStop(0, '#eef2f8'); g.addColorStop(0.5, '#8e95a2');
    g.addColorStop(0.56, '#2b2d31'); g.addColorStop(1, '#0f1012');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 32);
    ctx.fillStyle = 'rgba(246,249,255,0.95)'; ctx.beginPath();
    ctx.ellipse(20, 6, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
    scene.environment = prefilterInBackground(c);
  } catch {
  }
}

/**
 * The studio the stage lights Marc with, at the same intensities and from the
 * same directions (three-d-stage.js `_boot`), minus the shadow map, plus one
 * cold light from up ahead: the storm, catching the rim of the shell.
 *
 * The rig travels with the egg, so the light on the shell is the same at 400
 * metres as it is at the start line — until the lightning, which turns every
 * one of them up at once. They are handed over in `userData.lights` for that.
 */
export function buildLights(scene) {
  const rig = new Group();
  rig.name = 'studio';

  const hemi = new HemisphereLight(0xf4f7fc, 0xb8bfcc, 1.0);

  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 7, 5);

  const fill = new DirectionalLight(0xe6ecf6, 0.5);
  fill.position.set(-5, 3, -4);

  const storm = new DirectionalLight(0xdfe8ff, 1.6);
  storm.position.set(-1, 6, 9);

  rig.add(hemi, key, key.target, fill, fill.target, storm, storm.target);
  rig.userData.lights = { hemi, key, fill, storm };
  scene.add(rig);
  return rig;
}
