import { PerspectiveCamera, Scene } from '../gpu/graph.js';
import { createRenderer } from '../gpu/renderer.js';
import { buildEnvironment, buildLights } from './environment.js';
import { THEME } from './theme.js';

/**
 * Renderer, camera, fog — and the one studio's worth of light in here, which
 * exists for the egg alone. Everything else is light on black and would look
 * the same in the dark; the weather is the view's, since it follows the egg.
 */
export function createScene(canvas) {
  const renderer = createRenderer(canvas, { clearColor: THEME.void, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new Scene();
  scene.fog = { color: THEME.void, near: 34, far: 132 };

  /** 52°, not wider: a wide lens stretches whatever sits away from the
   *  middle of the frame, and what sits there is the egg. */
  const camera = new PerspectiveCamera(52, 1, 0.1, 260);
  camera.position.set(0, 3.2, -8.4);

  const studio = buildLights(scene);
  buildEnvironment(scene);

  function resize() {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    /** A tall window needs a taller lens, or the course shrinks to a thread. */
    camera.fov = camera.aspect < 1 ? 64 : 52;
    camera.updateProjectionMatrix();
  }

  resize();
  addEventListener('resize', resize);

  return {
    renderer,
    scene,
    camera,
    studio,
    resize,
    render() { renderer.render(scene, camera); },
  };
}
