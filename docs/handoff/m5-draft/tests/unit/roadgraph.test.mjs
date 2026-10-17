// The road network's accept tests (PLAN.md 8.7), on Lowtown: every lane reachable and none a dead end but the marked
// ones; connectors joining their lanes end to start; the Loop reached by its ramps; A* matching Dijkstra on 1,000
// random pairs; a route across the city under 2 ms; the signals' timing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

engineGlobal();
const M = await import('../../src/motor/index.js');
for (const f of ['styles', 'landmarks', 'district']) await import('../../src/game/districts/lowtown/' + f + '.js');
const { RoadGraph } = await import('../../src/motor/nav/roadgraph.js');
const { GPS } = await import('../../src/motor/nav/gps.js');
const { signalAt, cycleLength } = await import('../../src/motor/nav/signals.js');
const { TUNE } = M;
const city = M.buildCity('lowtown'), G = new RoadGraph(city), gps = new GPS(G);
const rand = (() => { let s = 12345; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) + 7 >>> 0) / 4294967296); })();

test('the lane graph: every lane can be driven to and on from, but the marked dead ends; only a handful dropped', () => {
  const st = G.stats(); assert.ok(st.lanes > 200, 'lanes: ' + st.lanes); assert.ok(st.dropped <= 3, 'dropped: ' + st.dropped);
  for (const l of G.lanes) if (!l.out.length) assert.ok(l.deadEnd === 'jump', `lane ${l.id} on ${l.strip} goes nowhere`);
  // everything reachable from one lane (a breadth-first search over the connectors)
  const seen = new Set([0]), q = [0]; while (q.length) { const i = q.pop(); for (const c of G.lanes[i].out) { const j = G.conns[c].to; if (!seen.has(j)) { seen.add(j); q.push(j); } } }
  assert.equal(seen.size, G.lanes.length, 'every lane reachable from lane 0');
});

test('connectors join their lanes end to start; turns keep to their lanes; the Loop is reached by its ramps', () => {
  for (const c of G.conns) {
    const a = G.lanes[c.from], b = G.lanes[c.to];
    if (c.kind === 'change') { assert.ok(a.strip === b.strip && Math.abs(a.index - b.index) === 1, 'a lane change is to the next lane'); continue; }
    assert.ok(Math.hypot(c.p0[0] - a.b[0], c.p0[1] - a.b[1]) < .5 && Math.hypot(c.p2[0] - b.a[0], c.p2[1] - b.a[1]) < .5, `connector ${c.id} meets its lanes`);
    if (c.kind === 'right') assert.equal(a.index, LANES(a) - 1, 'a right turn leaves from the outer lane');
    if (c.kind === 'left') assert.equal(a.index, 0, 'a left turn leaves from the inner lane');
  }
  const ground = G.lanes.find(l => l.strip === 'street1'), deck = G.lanes.find(l => l.kind === 'deck');
  const r = gps.route(ground.id, deck.id); assert.ok(r, 'a route from a street onto the Loop');
  assert.ok(r.lanes.some(i => G.lanes[i].kind === 'ramp'), 'by a ramp');
});
function LANES(l) { return { street: 1, avenue: 2, alley: 1, deck: 2, ramp: 2, stub: 1 }[l.kind]; }

test('A* finds what Dijkstra finds on 1,000 random pairs, and a route across the city takes under 2 ms', () => {
  const n = G.lanes.length; let both = 0;
  for (let k = 0; k < 1000; k++) {
    const a = Math.floor(rand() * n), b = Math.floor(rand() * n), x = gps.route(a, b), y = gps.dijkstra(a, b);
    assert.equal(!!x, !!y); if (!x) continue; both++;
    assert.ok(Math.abs(x.cost - y.cost) < 1e-6, `pair ${a} -> ${b}: A* ${x.cost} against Dijkstra ${y.cost}`);
  }
  assert.ok(both > 950, 'nearly every pair routes: ' + both);
  const far = [G.nearestLane(64, 64), G.nearestLane(2300, 2350)]; assert.ok(far[0] && far[1]);
  const times = []; for (let k = 0; k < 200; k++) { const t0 = performance.now(); gps.route(far[0].lane.id, far[1].lane.id); times.push(performance.now() - t0); }
  times.sort((p, q) => p - q); assert.ok(times[100] < 2, `median ${times[100].toFixed(3)} ms`);
});

test('the signals: NS and EW are never open together; each phase lasts its time; junctions are offset; stop signs stay stop', () => {
  const sig = G.regions.filter(r => r.signals === 'signal'), stop = G.regions.find(r => r.signals === 'stop');
  assert.ok(sig.length >= 4, 'signalled junctions: ' + sig.length);
  const R = sig[0], dt = .05, L = cycleLength(); let green = 0, amber = 0, runs = new Set();
  for (let t = 0; t < L; t += dt) {
    const s = signalAt(R, t); assert.ok(s.ns === 'red' || s.ew === 'red', 'never both open at ' + t.toFixed(2));
    if (s.ns === 'green') green += dt; if (s.ns === 'amber') amber += dt; runs.add(s.ns + s.ew);
  }
  assert.ok(Math.abs(green - TUNE.signalGreen) < .11 && Math.abs(amber - TUNE.signalAmber) < .11, `green ${green.toFixed(2)}, amber ${amber.toFixed(2)}`);
  assert.ok(runs.has('redred'), 'an all-red clearance');
  assert.ok(new Set(sig.map(r => signalAt(r, 0).ns + signalAt(r, 0).ew)).size > 1, 'not all in step');
  assert.deepEqual(signalAt(stop, 3), { ns: 'stop', ew: 'stop' });
});
