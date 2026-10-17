// The depth views' maths (render/depth): spans, the SIDE7 rail projection and its inverse, the rail's directions, the
// TOP lean, and the textured-face splitter. No canvas needed: these are numbers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

const E = engineGlobal();
const { Spans } = await import('../../src/motor/render/depth/spans.js');
const { Side7View, RAIL } = await import('../../src/motor/render/depth/side7.js');
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
