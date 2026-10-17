// The vendored engine's patches (vendor/my-3d2dge/PATCHES.md), each tested where it lives.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { ENGINE } from '../../tools/build.mjs';

/** the engine in a fresh context whose navigator reports these gamepads */
function engineWithPads(pads) {
  const ctx = { console: { log() {}, warn() {}, error() {} }, navigator: { getGamepads: () => pads } };
  vm.createContext(ctx); vm.runInContext(readFileSync(ENGINE, 'utf8'), ctx, { filename: 'my-3d2dge.js' });
  return ctx.My3D2dge;
}
const pad = (index, o = {}) => ({ index, id: o.id || 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', connected: true, mapping: 'standard',
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: !!(o.pressed || []).includes(i), value: (o.values || {})[i] || ((o.pressed || []).includes(i) ? 1 : 0) })),
  axes: o.axes || [0, 0, 0, 0] });

test('GTM-PATCH(4): every pad is read raw, with analog trigger values', () => {
  const pads = [pad(0), pad(2, { values: { 7: .5 } })], E = engineWithPads(pads), game = new E.Game({ headless: true }).start({ update() {}, draw() {} });
  game.advance(1 / 60);
  const raw = game.input.raw;
  assert.equal(raw.pads.length, 2);
  assert.equal(raw.pads[1].index, 2);
  assert.equal(raw.pads[1].buttons[7].value, .5);
  assert.equal(raw.active, 2, 'the pad with input is the active one');
  assert.ok(raw.activity >= 0, 'a trigger counts as activity');
  assert.equal(game.input.padIndex, 2, 'the engine follows the pad in use, not pad 0');
});
test('GTM-PATCH(4): a resting pad is no activity; a stick past the dead zone is', () => {
  const pads = [pad(0)], E = engineWithPads(pads), game = new E.Game({ headless: true }).start({ update() {}, draw() {} });
  game.advance(.5);
  assert.equal(game.input.raw.activity, -1, 'nothing happened yet');
  pads[0] = pad(0, { axes: [.6, 0, 0, 0] }); game.advance(1 / 60);
  assert.ok(game.input.raw.activity > 0);
});
test('GTM-PATCH(4): scripted presses count as activity, and clear() empties raw.keys', () => {
  const E = engineWithPads([]), game = new E.Game({ headless: true }).start({ update() {}, draw() {} });
  game.advance(.25); game.input.press('KeyQ');
  assert.ok(game.input.raw.activity > 0);
  game.input.raw.keys.add('KeyQ'); game.input.clear();
  assert.equal(game.input.raw.keys.size, 0);
});
test('GTM-PATCH(4): a press shorter than a step shows in raw.pressed for exactly one step', () => {
  const E = engineWithPads([]), game = new E.Game({ headless: true }).start({ update() {}, draw() {} });
  game.advance(1 / 60);
  game.input.press('KeyE'); game.input.release('KeyE');   // down and up between two steps
  game.advance(1 / 120); assert.ok(game.input.raw.pressed.has('KeyE'), 'seen in the next step');
  game.advance(1 / 120); assert.ok(!game.input.raw.pressed.has('KeyE'), 'and only that one');
});
test('GTM-PATCH(4): clear() still resets the engine\'s own edge state (no line lost to the patch)', () => {
  const E = engineWithPads([]), game = new E.Game({ headless: true }).start({ update() {}, draw() {} });
  game.advance(1 / 60); game.input.press('Enter'); game.advance(1 / 120);
  game.input.clear(); game.advance(1 / 120);
  assert.ok(!game.input.down('confirm') && !game.input.released('confirm') && game.input.padMove[0] === 0);
});

/* ---- GTM-PATCHes 1-3: TileMap at city scale ---- */
/** a seeded w x h map of walls (types 1-6, heights 24-192), roads between blocks */
function cityMap(E, w = 160, h = 160, seed = 7) {
  const rnd = E.rng(seed), cells = new Array(w * h).fill(0);
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) if (cx % 22 > 4 && cy % 22 > 4 && rnd() < .8) cells[cy * w + cx] = 1 + Math.floor(rnd() * 6);
  const types = {}; for (let i = 1; i <= 6; i++) types[i] = { h: [24, 48, 72, 96, 144, 192][i - 1], top: '#666', side: '#555', cut: i === 1 };
  return new E.TileMap({ w, h, cells, types });
}
/** a stand-in for the renderer: the view, the camera offset and a queue that records what is queued */
function fakeR(E, view, ix, iy, frame = 1) {
  return { view, ix, iy, W: 480, H: 270, bw: 482, bh: 272, _frameNo: frame, items: [],
    w(x, y, z = 0) { return [view.ax * x + view.ay * y - this.ix, view.bx * x + view.by * y + view.bz * z - this.iy]; },
    queue(x, y, z, fn, o) { this.items.push({ x, y, z, fn, o }); }, _faceMat() {}, _infoCol() {} };   // (headless canvases take the info path)
}
/** what the patched cull keeps, by brute force over every cell */
function wallsByBruteForce(map, r) {
  const out = [], T = map.T, view = r.view;
  for (let cy = 0; cy < map.h; cy++) for (let cx = 0; cx < map.w; cx++) {
    const id = map.cell(cx, cy); if (id <= 0) continue;
    const t = map.types[id], h = map._isFront(cx, cy, view) ? (t.cutH || 6) : t.h, [sx, sy] = r.w(cx * T + T / 2, cy * T + T / 2, 0);
    if (sx < -40 || sx > r.W + 40 || sy < -20 || sy > r.H + Math.max(90, 20 - view.bz * h)) continue;
    out.push(cy * map.w + cx);
  }
  return out;
}
const camAt = (view, x, y, r) => { const p = view.p(x, y, 0); return [Math.round(p[0] - r.W / 2), Math.round(p[1] - r.H / 2)]; };

test('GTM-PATCH(1): queueWalls scans only the visible window and loses no wall the full scan keeps', () => {
  const E = engineWithPads([]), map = cityMap(E), rnd = E.rng(3);
  for (const scale of [1, .8, .65]) for (const yaw of [45, 135, 225, 315]) {
    const view = new E.View('iso', 'Isometric', yaw, 30, Math.SQRT2 * scale, 1);
    for (let n = 0; n < 6; n++) {
      const r = fakeR(E, view, 0, 0), [ix, iy] = camAt(view, rnd() * 2560, rnd() * 2560, r); r.ix = ix; r.iy = iy;
      map.queueWalls(r);
      const got = r.items.map(it => Math.floor(it.y / 16) * map.w + Math.floor(it.x / 16));
      assert.deepEqual(got, wallsByBruteForce(map, r), `yaw ${yaw}, scale ${scale}`);
      const win = map._window(r, 20 - view.bz * 192), cellsScanned = (win[2] - win[0] + 1) * (win[3] - win[1] + 1);
      assert.ok(cellsScanned < map.w * map.h / 3, `scans ${cellsScanned} cells, not all ${map.w * map.h}`);
    }
  }
});
test('GTM-PATCH(1): a tall wall whose foot is below the screen is kept while its top reaches into view', () => {
  const E = engineWithPads([]), map = new E.TileMap({ w: 64, h: 64, types: { 1: { h: 192, top: '#666', side: '#555' } } });
  map.fill(30, 30, 1, 1, 1);
  const view = E.VIEWS.iso, r = fakeR(E, view, 0, 0), [, sy0] = r.w(30 * 16 + 8, 30 * 16 + 8, 0);
  r.iy = Math.round(sy0 - (r.H + 150));   // its foot is 150 px under the bottom edge; its top at 192 rises ~235 px
  map.queueWalls(r);
  assert.equal(r.items.length, 1, 'the tower is queued (the old 90-pixel margin dropped it)');
});
test('GTM-PATCH(1): map.cutAt decides the cut-away first; null leaves it to the engine\'s rule', () => {
  const E = engineWithPads([]), map = new E.TileMap({ w: 16, h: 16, types: { 1: { h: 64, cutH: 8, top: '#666', side: '#555' }, 2: { h: 64, cut: true, top: '#666', side: '#555' } } });
  map.fill(4, 4, 1, 1, 1); map.fill(8, 8, 1, 1, 2);
  const view = E.VIEWS.iso;
  assert.equal(map._isFront(4, 4, view), false);
  assert.equal(map._isFront(8, 8, view), true, 'the engine\'s rule: a cut type with floor toward the camera');
  map.cutAt = (cx, cy) => (cx === 4 && cy === 4 ? true : cx === 8 ? false : null);
  assert.equal(map._isFront(4, 4, view), true, 'cut by the hook');
  assert.equal(map._isFront(8, 8, view), false, 'kept whole by the hook');
  const r = fakeR(E, view, 0, 0), [ix, iy] = camAt(view, 6 * 16, 6 * 16, r); r.ix = ix; r.iy = iy;
  map.queueWalls(r); const it = r.items.find(q => Math.floor(q.x / 16) === 4);
  let drawnH = null; const box = map._box; map._box = (g, rr, cx, cy, t, h) => { drawnH = h; };
  it.fn({ drawImage() {} }); map._box = box;
  assert.equal(drawnH, 8, 'the hook\'s cut height is what is baked');
});
test('GTM-PATCH(1): a block re-bakes when a neighbour\'s drawn height changes, and only then', () => {
  const E = engineWithPads([]), map = new E.TileMap({ w: 16, h: 16, types: { 1: { h: 64, top: '#666', side: '#555' } } });
  map.fill(5, 5, 2, 1, 1);   // two blocks side by side: (5, 5) and (6, 5)
  const view = E.VIEWS.iso; let bakes = 0; const box = map._box; map._box = function (...a) { bakes++; return box.apply(this, a); };
  const frame = n => { const r = fakeR(E, view, 0, 0, n), [ix, iy] = camAt(view, 90, 90, r); r.ix = ix; r.iy = iy; map.queueWalls(r); for (const it of r.items) it.fn({ drawImage() {} }); };
  frame(1); assert.equal(bakes, 2); frame(2); assert.equal(bakes, 2, 'cached');
  map.cutAt = (cx, cy) => cx === 6 ? true : null; frame(3);
  assert.equal(bakes, 4, 'the cut block and its neighbour (its east face is uncovered) both re-bake');
  frame(4); assert.equal(bakes, 4);
});
test('GTM-PATCH(2): the wall cache stays inside map.wallCacheMax on a long drive, across views', () => {
  const E = engineWithPads([]), map = cityMap(E); map.wallCacheMax = 4e6;   // about 1.5 frames of blocks at 480 x 270
  let baked = 0; const bake = map._box; map._box = function (g, r, cx, cy, t, h) { const e = this._wcs.get(r.view.id + ':' + r.view.yawDeg + ':' + r.view.pitchDeg + ':' + r.view.scale).m.get(cy * this.w + cx); baked += e.w * e.hh; return bake.call(this, g, r, cx, cy, t, h); };
  const views = [E.VIEWS.iso, new E.View('iso', 'Isometric', 135, 30, Math.SQRT2, 1), new E.View('iso', 'Isometric', 45, 30, Math.SQRT2 * .65, 1)];
  let frame = 0, peak = 0;
  for (let i = 0; i < 90; i++) {
    const view = views[Math.floor(i / 30)], r = fakeR(E, view, 0, 0, ++frame), [ix, iy] = camAt(view, 200 + i * 24, 300 + i * 20, r); r.ix = ix; r.iy = iy;
    map.queueWalls(r); for (const it of r.items) it.fn({ drawImage() {} });
    peak = Math.max(peak, map.wallCache().px);
    for (const it of r.items) { const c = map._wcs.get(view.id + ':' + view.yawDeg + ':' + view.pitchDeg + ':' + view.scale), idx = Math.floor(it.y / 16) * map.w + Math.floor(it.x / 16); assert.ok(c && c.m.has(idx), 'what this frame drew is still cached'); }
  }
  assert.ok(peak <= map.wallCacheMax, `peak ${peak} px`);
  assert.ok(baked > 3 * map.wallCacheMax, `the drive baked ${baked} px in all, so blocks were dropped`);
  assert.ok(map.wallCache().views >= 1);
});
test('GTM-PATCH(3): addSolids adds many solids with one version bump (shapes or ready boxes)', () => {
  const E = engineWithPads([]), map = new E.TileMap({ w: 32, h: 32 }), shape = Object.keys(E.SHAPES)[0], v = map.version;
  const out = map.addSolids([{ id: shape, x: 40, y: 40 }, { x: 100, y: 100, z: 64, top: 70, hx: 48, hy: 8 }, { id: 'no-such-shape', x: 0, y: 0 }]);
  assert.equal(map.version, v + 1);
  assert.equal(out.length, 2, 'an unknown shape is skipped');
  assert.equal(map.solids.length, 2);
  assert.deepEqual([out[1].c, out[1].s, out[1].px, out[1].shape], [1, 0, 100, null]);
  assert.equal(map.groundAt(100, 100, 4, 80), 70, 'a ready box is a deck to stand on');
});
test('GTM-PATCH(3): bucketed collide, groundAt, heightAt and the render lift match the full scan exactly', () => {
  const E = engineWithPads([]), rnd = E.rng(11), list = [];
  for (let i = 0; i < 600; i++) {
    const a = rnd() * Math.PI, z = rnd() < .3 ? Math.floor(rnd() * 3) * 20 : 0;
    list.push({ x: rnd() * 1000, y: rnd() * 1000, z, top: z + 4 + rnd() * 40, hx: 2 + rnd() * 30, hy: 2 + rnd() * 12, c: Math.cos(a), s: Math.sin(a) });
  }
  const fast = new E.TileMap({ w: 64, h: 64 }), slow = new E.TileMap({ w: 64, h: 64 });
  fast.addSolids(list.map(q => ({ ...q }))); slow.addSolids(list.map(q => ({ ...q })));
  slow._solidsNear = function () { return this.solids; };   // the engine's original loops
  const view = E.VIEWS.iso;
  for (let n = 0; n < 3000; n++) {
    const x = rnd() * 1000, y = rnd() * 1000, z = rnd() < .5 ? 0 : rnd() * 70, r = 3 + rnd() * 10;
    const b1 = { x, y, z, r }, b2 = { x, y, z, r };
    assert.equal(fast.collide(b1), slow.collide(b2)); assert.deepEqual([b1.x, b1.y], [b2.x, b2.y]);
    assert.equal(fast.groundAt(x, y, r, z), slow.groundAt(x, y, r, z));
    assert.equal(fast.heightAt(x, y), slow.heightAt(x, y));
    assert.equal(fast._liftSolids(view, x, y, z, 0), slow._liftSolids(view, x, y, z, 0));
  }
  fast.solids[0].x += 500; fast.solidsMoved(); slow.solids[0].x += 500;
  for (let n = 0; n < 300; n++) { const x = rnd() * 1000, y = rnd() * 1000; assert.equal(fast.heightAt(x, y), slow.heightAt(x, y)); }
});
test('GTM-PATCH(3): solidsNear is the public query, a fresh array each call', () => {
  const E = engineWithPads([]), map = new E.TileMap({ w: 64, h: 64 }), list = [];
  for (let i = 0; i < 100; i++) list.push({ x: (i % 10) * 90 + 20, y: Math.floor(i / 10) * 90 + 20, top: 40, hx: 2, hy: 2 });
  map.addSolids(list);
  const a = map.solidsNear(20, 20, 4), b = map.solidsNear(830, 830, 4);
  assert.equal(a.length >= 1 && a[0].x === 20 && a[0].y === 20, true);
  assert.notEqual(a, b); assert.ok(b.some(s => s.x === 830 && s.y === 830));
  assert.ok(!a.some(s => s.x === 830), 'nothing far away');
});

