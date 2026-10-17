// MOTOR's render pieces that run without a screen: the floor chunks' bookkeeping (what is baked, kept, asked for), the
// speed zoom, and the box models' drawing order.
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

// the box models' drawing order, on a long truck where comparing each part with the model's middle went wrong
const { partOrder } = await import('../../src/motor/render/box-model.js');
const TRUCK = { length: 88, width: 30, height: 34, parts: [
  { id: 'wheel', box: [26, 11, 0, 34, 15, 8], role: 'wheel' },
  { id: 'chassis', box: [-44, -15, 4, 44, -1, 12], role: 'body' }, { id: 'chassis2', box: [-44, -1, 4, 44, 15, 12], role: 'body' },
  { id: 'cab', box: [20, -15, 12, 44, 15, 26], role: 'body' }, { id: 'pump', box: [-44, -15, 12, 18, 15, 34], role: 'body' },
  { id: 'head', box: [44, -12, 6, 45, -6, 10], role: 'light' }, { id: 'tail', box: [-45, -12, 16, -44, -6, 20], role: 'tail' },
  { id: 'lockerNearFar', box: [30, -16, 14, 40, -15, 22], role: 'trim' }, { id: 'lockerFarNear', box: [-40, 15, 14, -30, 16, 30], role: 'trim' },
  { id: 'bar', box: [30, -10, 26, 36, 10, 29], role: 'siren' },
  { id: 'lamp', box: [43, 8, 14, 45.5, 13, 17], role: 'light' },   // (sunk into the cab's nose, poking out of the front)
] };
// a projector whose depth grows along d (an orthographic camera looking that way)
const along = d => ({ depth3: (x, y, z) => x * d[0] + y * d[1] + z * d[2] });
const before = (list, a, b) => list.findIndex(p => p.id === a) < list.findIndex(p => p.id === b);

test('box models: parts are ordered by the plane between them, so the far end, the far flank and the far face draw first', () => {
  const behind = partOrder(along([1, 1, -1]), TRUCK, 0, 0, 0, 0);   // from behind and the left (-x, -y), above
  assert.ok(before(behind, 'head', 'chassis') && before(behind, 'lamp', 'cab'), 'the far end\'s lamps before what they sit on');
  assert.ok(before(behind, 'pump', 'tail'), 'the near end\'s tail lamp after the body it sits on');
  assert.ok(before(behind, 'cab', 'lockerNearFar'), 'a locker on the near flank at the far end after the cab');
  assert.ok(before(behind, 'lockerFarNear', 'pump'), 'a locker on the far flank at the near end before the pump body');
  assert.ok(before(behind, 'cab', 'bar') && before(behind, 'bar', 'pump'), 'the cab\'s bar on its roof, and behind the taller pump body');
  const ahead = partOrder(along([-1, -1, -1]), TRUCK, 0, 0, 0, 0);   // from ahead and the right
  assert.ok(before(ahead, 'chassis', 'head') && before(ahead, 'cab', 'lamp') && before(ahead, 'tail', 'pump'), 'from ahead the other way round');
  assert.ok(before(ahead, 'pump', 'cab'), 'the cab nearer than the pump body');
  // turned round, the same camera sees it from ahead
  const turned = partOrder(along([1, 1, -1]), TRUCK, 0, 0, 0, Math.PI);
  assert.ok(before(turned, 'chassis', 'head') && before(turned, 'tail', 'pump'), 'the heading turns the order with it');
});

test('box models: overlapping core parts keep their roles\' order, and a wreck on its roof draws its wheels last', () => {
  const up = partOrder(along([1, 1, -1]), TRUCK, 0, 0, 0, 0), roof = partOrder(along([1, 1, -1]), TRUCK, 0, 0, 0, 0, { roll: Math.PI });
  assert.ok(before(up, 'wheel', 'chassis2'), 'a wheel inside the body before the body');
  assert.ok(before(roof, 'chassis2', 'wheel') && before(roof, 'bar', 'cab'), 'upside down: the body before its wheels, the bar under the cab');
  // an open door is fitted in: on the far side before the body, on the near side after it
  const far = { id: 'door', box: [10, 15, 6, 22, 16.6, 20], role: 'body', turn: -.9, pivot: [22, 15] }, near = { ...far, box: [10, -16.6, 6, 22, -15, 20], turn: .9, pivot: [22, -15] };   // (swung out)
  assert.ok(before(partOrder(along([1, 1, -1]), TRUCK, 0, 0, 0, 0, { extra: [far] }), 'door', 'chassis2'), 'the far door first');
  assert.ok(before(partOrder(along([1, 1, -1]), TRUCK, 0, 0, 0, 0, { extra: [near] }), 'chassis', 'door'), 'the near door last');
});
