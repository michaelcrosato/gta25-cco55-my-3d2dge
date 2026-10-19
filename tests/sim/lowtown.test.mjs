import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../harness.mjs';

const motor = async () => { const { gtm, E } = await loadGame({ hash: 'title' }); return { M: gtm.motor, E }; };

test('Lowtown builds headless in under 1.5 s: 160x160, its four neighbourhoods, its landmarks and decks', async () => {
  const { M } = await motor();
  M.buildCity('lowtown', 1999);   // (the first build warms the JIT; the budget is for a build in play)
  const t0 = performance.now(), C = M.buildCity('lowtown', 1999), ms = performance.now() - t0;
  assert.ok(ms < 1500, `built in ${ms.toFixed(0)} ms`);
  assert.equal(C.w, 160); assert.equal(C.h, 160);
  assert.deepEqual([...C.hoods.map(h => h.id)], ['palm', 'neon', 'brick', 'harbor']);
  for (const id of ['safehouse', 'bank-door', 'hospital', 'gnomes-hq', 'marina']) assert.ok(C.poi(id), 'point of interest ' + id);
  assert.deepEqual([...C.decks.map(d => d.id)], ['loop', 'loop-gap', 'L']);
  assert.ok(C.lots.filter(l => l.kind === 'building').length > 150, C.lots.length + ' lots');
  assert.ok(C.map.solids.length > 1000, C.map.solids.length + ' solids');
});

test('the same seed builds the same Lowtown; another seed refills the blocks round the same landmarks', async () => {
  const { M } = await motor();
  const a = M.buildCity('lowtown', 1999), b = M.buildCity('lowtown', 1999), c = M.buildCity('lowtown', 7);
  assert.deepEqual([...a.map.cells], [...b.map.cells]); assert.deepEqual([...a.surface], [...b.surface]); assert.deepEqual([...a.lot], [...b.lot]);
  assert.notDeepEqual([...a.map.cells], [...c.map.cells]);
  for (const p of a.pois) { const q = c.poi(p.id); assert.ok(q && q.x === p.x && q.y === p.y, 'landmark points stay put: ' + p.id); }
});

test('the validator finds no errors: every point of interest stands on open ground, reachable on foot and by road', async () => {
  const { M } = await motor();
  for (const seed of [1999, 7, 42]) {
    const C = M.buildCity('lowtown', seed), v = M.validateCity(C);
    assert.deepEqual([...v.errors], [], `seed ${seed}`);
    for (const p of C.pois) assert.equal(v.reach.foot[Math.floor(p.y / 16) * C.w + Math.floor(p.x / 16)], 1, `${p.id} on foot (seed ${seed})`);
  }
});

test('the cut-away drops the building hiding the player in ISO (all of it), keeps it behind them, and never cuts in TOP-DOWN', async () => {
  const { M, E } = await motor();
  const C = M.buildCity('lowtown', 1999), cut = new M.CutAway(C), bank = C.lots.find(l => l.landmark === 'bank' && l.kind === 'building');
  const bankCells = []; for (let i = 0; i < C.w * C.h; i++) if (C.lot[i] === bank.index) bankCells.push([i % C.w, Math.floor(i / C.w)]);
  const iso = E.VIEWS.iso;
  cut.update(iso, 1864, 552, 0);   // on the pavement north of the tower: it stands between the camera and the player
  assert.ok(cut.cut.has(bank.index), 'behind the bank: it is cut');
  assert.ok(bankCells.every(([x, y]) => C.map._isFront(x, y, iso)), 'the whole building drops, never a hole in it');
  cut.update(iso, 1864, 820, 0);   // south of it, in front: the tower is behind the player
  assert.ok(!cut.cut.has(bank.index), 'in front of the bank: it stands');
  assert.ok(bankCells.every(([x, y]) => !C.map._isFront(x, y, iso)));
  cut.update(iso, 1864, 552, 0); cut.update(E.VIEWS.overhead, 1864, 552, 0);   // (an engine view from straight above)
  assert.equal(cut.cut.size, 0, 'TOP-DOWN needs no cut-away');
  assert.ok(bankCells.every(([x, y]) => !C.map._isFront(x, y, E.VIEWS.overhead)));
});

test('the decks: the Loop is level at z 64, its ramps climb from the street, the L runs at z 112 over Motor Avenue (D17)', async () => {
  const { M } = await motor();
  const C = M.buildCity('lowtown', 1999), T = C.T, at = (cx, cy) => [(cx + .5) * T, (cy + .5) * T];
  const loop = C.decks.find(d => d.id === 'loop'), L = C.decks.find(d => d.id === 'L');
  assert.equal(loop.heightAt(...at(56, 78)), 64, 'on the Loop over Loop Avenue');
  assert.equal(L.heightAt(...at(80, 60)), 112, 'on the L');
  const ramp = loop.cells.filter(c => c.z0 !== c.z1);
  assert.ok(ramp.length >= 4 * 10, ramp.length + ' ramp cells');
  assert.ok(ramp.some(c => Math.min(c.z0, c.z1) === 0), 'a ramp reaches the street');
  assert.equal(C.deckAt(...at(56, 78), 0), null, 'from the street, the Loop is overhead, not underfoot');
  assert.equal(C.deckAt(...at(56, 78), 64).z, 64, 'from the deck, it is underfoot');
});

test('the drawbridge: it lifts every 3 game hours unless someone is on it, blocks its span while not down, and is a ramp half raised', async () => {
  const { M, E } = await motor();
  const C = M.buildCity('lowtown', 1999), b = new M.Drawbridge(C.drawbridges[0], C), T = C.T, [x0, y0, x1, y1] = b.rect;
  const mid = [(x0 + x1 + 1) / 2 * T, (y0 + y1 + 1) / 2 * T], walkable = () => C.map.walkable(Math.floor(mid[0] / T), Math.floor(mid[1] / T));
  assert.equal(b.phase, 'down'); assert.ok(walkable(), 'down: the span is a street');
  assert.equal(C.surfaceAt(x0 + 4, y0 + 2), 'bridge');
  const step = (s, busy) => { for (let t = 0; t < s; t += 1 / 60) b.update(1 / 60, 1 / 3600, busy); };   // (a game minute a real second)
  step(180 - 5); assert.equal(b.phase, 'down', 'not before three game hours (180 real seconds)');
  step(10, () => true); assert.equal(b.phase, 'down', 'it waits while someone stands on it');
  step(1 / 30); assert.equal(b.phase, 'raising'); assert.ok(!walkable(), 'the span is blocked as the gates close');
  step(3); const h = b.heightAt(mid[0], y0 * T + 24), tip = b.leafGeom(b.leaves[0]);
  assert.ok(h > 5 && h < tip.h, `half raised, the north leaf is a ramp: ${h.toFixed(1)} of ${tip.h.toFixed(1)}`);
  step(6); assert.equal(b.phase, 'up'); assert.equal(b.heightAt(mid[0], mid[1]), null, 'fully up: open water at the middle of the span');
  step(20 + 8.5); assert.equal(b.phase, 'down'); assert.ok(walkable(), 'down again: open to traffic');
  // on foot: a walker pushed south down Dock Road stops at the gates while it is up
  b.raiseNow();
  const m = new E.Mover({ x: mid[0], y: (y0 - 3) * T });
  for (let t = 0; t < 3; t += 1 / 120) m.update(1 / 120, C.map, { move: [0, 1] });
  assert.ok(m.y < y0 * T, `stopped at the edge of the lifted span: y ${m.y.toFixed(0)} < ${y0 * T}`);
});

test('fire: a Molotov on the grass of Palm Park spreads and burns out; on asphalt it burns its petrol and dies; rain puts it out sooner', async () => {
  const { M } = await motor();
  const C = M.buildCity('lowtown', 1999), park = C.poi('palm-park'), T = C.T;
  // a grass cell inside the park, and a road cell on Sunset Strip
  let gx = 0, gy = 0; outer: for (let cy = 12; cy < 25; cy++) for (let cx = 62; cx < 73; cx++) if (C.surfaceAt(cx, cy) === 'park') { gx = (cx + .5) * T; gy = (cy + .5) * T; break outer; }
  void park;
  const burn = (x, y, wet, secs) => { M.RNG.seed(3); const f = new M.Fire(C); f.add(x, y, 40, 1, 4); const splash = f.count; let most = 0; for (let t = 0; t < secs; t += 1 / 30) { f.update(1 / 30, wet); most = Math.max(most, f.count); } return { splash, most, left: f.count, f }; };
  const grass = burn(gx, gy, 0, 12);
  assert.ok(grass.most > grass.splash * 1.5, `grass spreads: ${grass.splash} cells splashed, ${grass.most} at most`);
  const road = burn(56.5 * T, 30.5 * T, 0, 12);
  assert.ok(road.most <= road.splash + 6 && road.left === 0, `asphalt: the petrol burns (${road.splash} splashed, ${road.most} at most) and goes out`);
  const out = burn(gx, gy, 0, 90), rain = burn(gx, gy, 1, 12);
  assert.equal(out.left, 0, 'it all burns out in time');
  assert.ok(rain.most < grass.most, `rain damps the spread: ${rain.most} < ${grass.most}`);
  const g2 = burn(gx, gy, 0, 12); assert.equal(g2.f.hash(), grass.f.hash(), 'the same throw burns the same way');
});
