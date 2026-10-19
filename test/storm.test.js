import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { curl, hash } from '../src/render/field.js';
import { createSprites } from '../src/render/sprites.js';
import { createStreaks } from '../src/render/streaks.js';
import { fallHeight } from '../src/render/view.js';
import { flicker } from '../src/render/weather.js';

describe('storm', () => {
  it('has every bolt down on the deck long before the egg can reach it', () => {
    for (let dz = -12; dz <= 30; dz += 0.5) assert.equal(fallHeight(dz), 0, `a bolt still falling ${dz}m out`);
    let last = 0;
    for (let dz = 30; dz <= 130; dz += 1) {
      const h = fallHeight(dz);
      assert.ok(h >= last, 'a bolt further off was drawn lower');
      last = h;
    }
    assert.ok(last > 60, 'a bolt at the edge of sight is not up in the sky');
  });

  it('flickers a strike and then lets it go', () => {
    assert.equal(flicker(-0.1), 0);
    assert.equal(flicker(0.02), 1);
    assert.ok(flicker(0.08) < 0.3, 'no gap between the stroke and the return stroke');
    assert.ok(flicker(0.15) > 0.5);
    assert.ok(flicker(0.4) < flicker(0.25), 'the fade went the wrong way');
    assert.equal(flicker(1), 0);
  });

  it('blows the same way at the same place and time, and always somewhere', () => {
    const a = curl({}, 1.3, -0.7, 4.2);
    const b = curl({}, 1.3, -0.7, 4.2);
    assert.deepEqual(a, b);
    for (let i = 0; i < 200; i++) {
      const air = curl({}, i * 0.37 - 30, i * 0.21 - 20, i * 0.1);
      assert.ok(Math.abs(Math.hypot(air.x, air.y) - 1) < 1e-9, 'the wind is not a direction');
    }
  });

  it('hashes onto [0, 1), and the same pair onto the same number', () => {
    for (let i = -50; i < 50; i++) {
      const h = hash(i, i * 7 - 3);
      assert.ok(h >= 0 && h < 1);
      assert.equal(h, hash(i, i * 7 - 3));
    }
  });

  it('folds away the sprites nobody asked for this frame, and never overruns', () => {
    const sprites = createSprites(3);
    const camera = { basis: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
    const { geometry } = sprites.object;

    sprites.begin(camera);
    for (let i = 0; i < 5; i++) sprites.add(i, 0, 10, 1, 0.5);
    sprites.end();
    assert.equal(geometry.position.length, 3 * 12, 'the buffer grew');
    assert.equal(geometry.position[0], -0.5, 'a quad is not centred on its point');

    const version = geometry.version;
    sprites.begin(camera);
    sprites.add(0, 0, 0, 1, 1);
    sprites.end();
    assert.ok(geometry.version > version, 'the change was never uploaded');
    assert.ok(geometry.position.slice(12).every((v) => v === 0), 'a stale quad was left standing');
    assert.ok(geometry.color.slice(12).every((v) => v === 0));
  });

  it('draws a streak from its bright end to its dark one', () => {
    const streaks = createStreaks(2);
    streaks.begin();
    streaks.add(0, 0, 0, 0.8, 0, 5, 0, 0);
    streaks.end();
    assert.equal(streaks.used, 1);
    const { color, position } = streaks.object.geometry;
    assert.deepEqual([...color.slice(0, 6)].map((v) => Math.round(v * 10) / 10), [0.8, 0.8, 0.8, 0, 0, 0]);
    assert.equal(position[4], 5);
    assert.ok(position.slice(6).every((v) => v === 0));
  });
});
