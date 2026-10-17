// MOTOR's render pieces that run without a screen: the floor chunks' bookkeeping (what is baked, kept, asked for).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

const E = engineGlobal();
const { FloorChunks } = await import('../../src/motor/render/floor-chunks.js');
/** a FloorChunks over a w x h world that records what it painted */
const make = (o = {}) => { const painted = []; const f = new FloorChunks({ w: 2560, h: 2560, paint: (g, x0, y0, x1, y1) => painted.push([x0, y0, x1, y1]), ...o }); return { f, painted }; };
/** a stand-in renderer at a ground point in the iso view */
const rAt = (view, x, y) => { const p = view.p(x, y, 0); return { view, ix: Math.round(p[0] - 241), iy: Math.round(p[1] - 136), W: 480, H: 270, bw: 482, bh: 272 }; };

test('a chunk is painted over its own square plus the apron, in world coordinates', () => {
  const { f, painted } = make();
  f.bake(2, 3);
  assert.deepEqual(painted[0], [2 * 256 - 2, 3 * 256 - 2, 3 * 256 + 2, 4 * 256 + 2]);
  assert.ok(f.ready(2, 3) && !f.ready(3, 3));
});
test('warm bakes everything near a point at once; a miss asks, and pump bakes the nearest first, two a frame', () => {
  const { f } = make();
  f.warm(1300, 1300, 100);
  assert.deepEqual([...f.chunks.values()].map(c => [c.i, c.j]).sort(), [[4, 4], [4, 5], [5, 4], [5, 5]]);
  assert.equal(f.canvas(9, 9), null); assert.equal(f.canvas(0, 0), null); assert.equal(f.canvas(8, 8), null);
  f.pump(2200, 2200);
  assert.ok(f.ready(8, 8) && f.ready(9, 9) && !f.ready(0, 0), 'the two nearest of three');
  f.pump(0, 0); assert.ok(f.ready(0, 0));
  assert.equal(f.canvas(-1, 0), null); assert.equal(f.wanted.size, 0, 'outside the floor is never asked for');
});
test('the LRU keeps cap chunks, dropping those used longest ago', () => {
  const { f } = make({ cap: 4 });
  for (let i = 0; i < 4; i++) { f.frame++; f.bake(i, 0); }
  f.frame++; f.canvas(0, 0);   // chunk 0 used again
  f.frame++; f.bake(5, 0);
  assert.equal(f.chunks.size, 4);
  assert.ok(f.ready(0, 0) && !f.ready(1, 0) && f.ready(5, 0));
});
test('the chunk range under an iso screen covers the screen corners\' ground, at every yaw and the driving zooms', () => {
  const { f } = make();
  for (const yaw of [45, 135, 225, 315]) for (const z of [1, .65]) {
    const view = new E.View('iso', 'Isometric', yaw, 30, Math.SQRT2 * z, 1), r = rAt(view, 1280, 1280), [i0, j0, i1, j1] = f.rangeIso(r);
    for (const [bx, by] of [[0, 0], [482, 0], [0, 272], [482, 272]]) {
      const [x, y] = view.toGround(bx + r.ix, by + r.iy), i = Math.floor(x / 256), j = Math.floor(y / 256);
      assert.ok(i >= i0 && i <= i1 && j >= j0 && j <= j1, `yaw ${yaw} zoom ${z}: corner chunk ${i},${j} in ${[i0, j0, i1, j1]}`);
    }
    assert.ok((i1 - i0 + 1) * (j1 - j0 + 1) <= 25);
  }
});

const { SpeedZoom } = await import('../../src/motor/render/speed-zoom.js');
test('the speed zoom: 1 on foot, .8 driving, .65 fast; it comes back in only well below (hysteresis), never faster than its dwell', () => {
  const z = new SpeedZoom(), run = (s, driving, speed) => { let l; for (let t = 0; t < s; t += 1 / 60) l = z.update(1 / 60, driving, speed); return l; };
  assert.equal(run(1, false, 0), 1);
  assert.equal(run(1, true, 60), .8, 'in a car');
  assert.equal(run(1, true, 200), .65, 'fast');
  assert.equal(run(2, true, 170), .65, 'between the thresholds: it stays out');
  assert.equal(z.update(1 / 60, true, 120), .8, 'slow again: back in');
  assert.equal(z.update(1 / 60, true, 250), .8, 'not straight after a change: it dwells');
  assert.equal(run(1, true, 250), .65);
});
