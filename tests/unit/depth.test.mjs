// The depth views' maths (render/depth): spans, the SIDE7 rail projection and its inverse, the rail's directions, the
// TOP lean, and the textured-face splitter. No canvas needed: these are numbers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

const E = engineGlobal();
const { Spans } = await import('../../src/motor/render/depth/spans.js');
const SIDE7 = await import('../../src/motor/render/depth/side7.js'), { Side7View, RAIL } = SIDE7;
const { TopView } = await import('../../src/motor/render/depth/top.js');
const { texturedFace } = await import('../../src/motor/render/depth/quads.js');
const fakeR = { W: 480, H: 270, bw: 482, bh: 272, game: { screen: { fx: 0, fy: 0 } } };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test('spans merge equal cells into rectangles, never across a chunk edge, and cover every wall cell once', () => {
  const types = { 1: { h: 48, top: '#666', side: '#555' }, 2: { h: 96, top: '#666', side: '#555' } }, map = new E.TileMap({ w: 40, h: 40, types });
  map.fill(2, 2, 6, 4, 1); map.fill(10, 2, 8, 8, 2); map.fill(12, 12, 10, 3, 1);   // the last crosses the chunk edge at x = 16
  const spans = new Spans(map, 256), all = spans.range(0, 0, 2, 2), covered = new Map();
  for (const s of all) for (let y = s.y0; y < s.y1; y += 16) for (let x = s.x0; x < s.x1; x += 16) { const k = x / 16 + ',' + y / 16; covered.set(k, (covered.get(k) || 0) + 1); assert.equal(map.cell(x / 16, y / 16), s.id); }
  let walls = 0; for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) if (map.cell(x, y) > 0) { walls++; assert.equal(covered.get(x + ',' + y), 1, `cell ${x},${y} once`); }
  assert.equal(covered.size, walls);
  assert.ok(all.some(s => s.x0 === 2 * 16 && s.y0 === 2 * 16 && s.x1 === 8 * 16 && s.y1 === 6 * 16), 'the first block is one span');
  assert.ok(all.every(s => Math.floor(s.x0 / 256) === Math.floor((s.x1 - 1) / 256)), 'no span crosses a chunk edge');
  map.set(3, 3, 0); assert.ok(spans.chunk(0, 0).length > 1, 'a change rebuilds the chunk');
});
test('MODE 7: the floor row inverse matches the projection, at every rail heading', () => {
  for (const hd of [0, 90, 180, 270]) {
    const v = new Side7View({}); v.setHeading(hd, 500, 500); v.follow(1 / 60, 500, 500); v.frame(fakeR);
    for (const [x, y] of [[520, 380], [470, 300], [500, 200]].map(([dx, dy]) => { const a = RAIL[hd]; const L = dx - 500, D = 500 - dy; return [500 + a.r[0] * L + a.f[0] * D, 500 + a.r[1] * L + a.f[1] * D]; })) {
      const p = v.proj(x, y, 0); assert.ok(p, `heading ${hd}: in front of the camera`);
      const q = v.toGround(p[0], p[1]); assert.ok(near(q[0], x, 1e-6) && near(q[1], y, 1e-6), `heading ${hd}: ${x},${y} -> ${p} -> ${q}`);
    }
  }
});
test('MODE 7: farther is smaller and higher on screen; up the screen is the rail\'s forward', () => {
  const v = new Side7View({}); v.follow(1 / 60, 500, 500); v.frame(fakeR);
  const a = v.proj(500, 400, 0), b = v.proj(500, 200, 0);
  assert.ok(b[2] < a[2] && b[1] < a[1], 'the farther point is smaller and nearer the horizon');
  assert.ok(v.depth(500, 200) > v.depth(500, 400));
  assert.deepEqual(v.screenDirToGround(0, -1).map(n => Math.round(n * 1e6) / 1e6), [0, -1]);
  v.setHeading(90, 500, 500); assert.deepEqual(v.screenDirToGround(0, -1).map(n => Math.round(n * 1e6) / 1e6), [1, 0], 'east rail: up is east');
  assert.deepEqual(v.screenDirToGround(1, 0).map(n => Math.round(n * 1e6) / 1e6), [0, 1], 'and right is south');
});
test('MODE 7: the rail follows sideways and keeps the focus between near and far', () => {
  const v = new Side7View({}); v.follow(1 / 60, 500, 500);
  for (let i = 0; i < 600; i++) v.follow(1 / 60, 500 + i, 500 - i * 2);   // the focus runs north-east, 60 u/s sideways
  let L = (500 + 599) - v.x; const D = v.y - (500 - 599 * 2);
  assert.ok(L > 0 && L < 13, 'trailing sideways by about speed / 5 (the smoothing): ' + L);
  assert.ok(D >= v.near - 15 && D <= v.far + 15, 'between near and far, give or take the smoothing (120 u/s ahead): ' + D);
  for (let i = 0; i < 180; i++) v.follow(1 / 60, 500 + 599, 500 - 599 * 2);   // it stops
  L = (500 + 599) - v.x; assert.ok(Math.abs(L) < .5, 'centred once it stops: ' + L);
  const D2 = v.y - (500 - 599 * 2); assert.ok(D2 >= v.near - .5 && D2 <= v.far + .5, 'and back between near and far: ' + D2);
});
test('TOP: the lean is k(z) = H / (H - z) about the centre, and the floor inverts exactly', () => {
  const v = new TopView({ H: 320 }); v.follow(1 / 60, 1000, 1000); v.frame(fakeR);
  const f = v.proj(1100, 1000, 0), t = v.proj(1100, 1000, 160);
  assert.ok(near((t[0] - v.P.cx) / (f[0] - v.P.cx), 2, 1e-9), 'a roof at H/2 sits twice as far out');
  const q = v.toGround(f[0], f[1]); assert.ok(near(q[0], 1100) && near(q[1], 1000));
  assert.equal(v.proj(0, 0, 330), null, 'nothing at or above the camera');
});
test('a textured face is cut finer near the camera and left whole far away', () => {
  const v = new Side7View({}); v.follow(1 / 60, 500, 500); v.frame(fakeR);
  const calls = { n: 0 }, g = new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { calls.n++; }, set: (o, k, val) => { o[k] = val; return true; } });
  const cv = E.mkCanvas(64, 96), face = D0 => (s, t) => v._q(D0 + 16 * s, 40, 96 * (1 - t));
  const nearQuads = texturedFace(g, face(14), cv, 0, 0, 16, 96, '#888'), farQuads = texturedFace(g, face(500), cv, 0, 0, 16, 96, '#888');
  assert.ok(nearQuads > 1 && farQuads === 1, `near ${nearQuads}, far ${farQuads}`);
});

test('MODE 7: the rail\'s lens on foot and in a vehicle (h 70 / 90, the focus 110-260 / 160-380 ahead), its field widening with speed, eased', () => {
  const { RIGS } = SIDE7, v = new Side7View({}); v.ready = true;
  v.rig(1 / 60, false); assert.deepEqual([v.h, v.near, v.far, v.fov], [RIGS.foot.h, RIGS.foot.near, RIGS.foot.far, RIGS.foot.fov], 'on foot as the stress test');
  v.rig(1 / 60, true, 0); assert.ok(v.h > 70 && v.h < 90, `getting in eases, never cuts: h ${v.h.toFixed(1)}`);
  for (let i = 0; i < 600; i++) v.rig(1 / 60, true, 0);
  assert.deepEqual([v.h, v.near, v.far].map(Math.round), [90, 160, 380], 'in a vehicle');
  const slow = v.fov; for (let i = 0; i < 600; i++) v.rig(1 / 60, true, 1);
  assert.ok(near(slow, 50, .01) && near(v.fov, 62, .01), `the field widens with speed: ${slow.toFixed(1)} -> ${v.fov.toFixed(1)} degrees`);
});

test('MODE 7: Auto-rail turns the rail to the axis a vehicle has held 1.5 s, not to a wobble, a crawl or the way it already faces', () => {
  const v = new Side7View({}); v.ready = true;
  const hold = (vx, vy, secs) => { let got = null; for (let t = 0; t < secs && got === null; t += 1 / 120) got = v.autoRail(1 / 120, vx, vy); return got; };
  assert.equal(hold(150, 0, 1.4), null, 'east for 1.4 s: not yet');
  assert.equal(hold(150, 0, .2), 90, 'east for 1.5 s: the rail faces east');
  v.heading = 90; assert.equal(hold(150, 0, 3), null, 'already facing east');
  assert.equal(hold(0, -150, 2), 0, 'north');
  assert.equal(hold(-30, 0, 3), null, 'too slow');
  assert.equal(hold(100, 80, 3), null, 'diagonal: no axis held');
  assert.equal(hold(0, 150, 2), 180, 'south');
});

test('TOP: the climb is continuous: H rises smoothly with speed and comes back down, no step bigger than a frame\'s ease', () => {
  const v = new TopView({}); v.follow(1 / 60, 0, 0, 0, 0, 0);
  let last = v.H, maxStep = 0, rising = true;
  for (let i = 0; i < 240; i++) { const sp = Math.min(1, i / 120); v.follow(1 / 60, 0, 0, 0, 0, sp); maxStep = Math.max(maxStep, Math.abs(v.H - last)); if (v.H < last - 1e-9) rising = false; last = v.H; }
  assert.ok(rising, 'speeding up: H only rises'); assert.ok(last > 600, `flat out it climbs toward ${v.Hmax}: ${last.toFixed(0)}`);
  assert.ok(maxStep < 10, `no jump: the biggest step ${maxStep.toFixed(2)} u a frame`);
  for (let i = 0; i < 600; i++) v.follow(1 / 60, 0, 0, 0, 0, 0);
  assert.ok(v.H < v.Hfoot + 1, 'stopped: back down to ' + v.Hfoot);
});

test('the camera rig holds the depth views on its point and zoom, MODE 7 at its heading, and lets them follow the focus again', async () => {
  const { ViewManager } = await import('../../src/motor/render/view-manager.js'), { Stage } = await import('../../src/motor/render/stage.js');
  const game = { real: 0, screen: { fx: 0, fy: 0 }, setView() { return game; }, view: {}, mouseGround: () => null, input: {} }, V = new ViewManager(game), S = new Stage(game, V);
  const R = { ...fakeR, game, ctx: null }, frames = (o, n = 240) => { for (let i = 0; i < n; i++) { game.real += 1 / 60; S.begin(R, o); } };
  game.setView('top'); frames({ focus: [100, 100] });
  assert.ok(near(S.top.x, 100, .5) && near(S.top.y, 100, .5), 'TOP follows the focus');
  S.setRig({ x: 900, y: 400, zoom: 1.5 }); frames({ focus: [100, 100] });
  assert.ok(near(S.top.x, 900, .5) && near(S.top.y, 400, .5) && S.top.zoom === 1.5, `TOP held on the rig: ${S.top.x.toFixed(1)}, ${S.top.y.toFixed(1)}`);
  game.setView('side7'); S.setRig({ x: 900, y: 400, heading: 90 }); frames({ focus: [100, 100] });
  assert.equal(S.side7.heading, 90, 'MODE 7 at the rig\'s heading');
  assert.ok(near(S.side7.lateral(900, 400), 0, 1) && S.side7.depth(900, 400) >= S.side7.near - 1, 'MODE 7 framing the rig point');
  S.setRig(null); frames({ focus: [100, 100] });
  assert.ok(near(S.side7.lateral(100, 100), 0, 1), 'let go: following the focus again');
});
