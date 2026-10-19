// The road network's accept tests (PLAN.md 8.7), on Lowtown: every lane reachable and none a dead end but the marked
// ones, only the one-way stubs at the network's edges dropped; connectors leaving and joining their lanes where they
// say, turns as arcs a car's turning circle fits; the Loop reached by its ramps; the junction conflicts; A* matching
// Dijkstra on 1,000 random pairs; a route across the city under 2 ms; the signals' timing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

engineGlobal();
const M = await import('../../src/motor/index.js');
for (const f of ['styles', 'landmarks', 'district']) await import('../../src/game/districts/lowtown/' + f + '.js');
const { RoadGraph, GPS, Junctions, signalAt, cycleLength, TUNE, LANES } = M;
const city = M.buildCity('lowtown'), G = new RoadGraph(city), gps = new GPS(G);
const TURNING_CIRCLE = 60;   // every road vehicle turns inside this at full lock (DECISIONS D17): a turn's arc no tighter (D18: the one-way lanes 10 u left of the middle)
const rand = (() => { let s = 12345; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) + 7 >>> 0) / 4294967296); })();

test('the lane graph: every lane can be driven to and on from, but the marked dead ends; only the edges\' stubs dropped', () => {
  const st = G.stats(); assert.ok(st.lanes > 90, 'lanes: ' + st.lanes);
  // (one-way streets leave a short stub where they run off the network: into the canal, the sea, the embankments)
  assert.ok(st.dropped <= 30, 'dropped: ' + st.dropped);
  let kept = 0, lost = 0; for (const l of G.lanes) kept += l.len; for (const d of G.droppedLanes) { lost += Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]); assert.ok(d.kind !== 'deck', 'no deck lane is dropped: ' + d.strip); }
  assert.ok(lost / (kept + lost) < .1, `less than a tenth of the road is unreachable: ${(lost / (kept + lost) * 100).toFixed(1)}%`);
  for (const l of G.lanes) if (!l.out.length) assert.ok(l.deadEnd === 'jump', `lane ${l.id} on ${l.strip} goes nowhere`);
  const seen = new Set([0]), q = [0]; while (q.length) { const i = q.pop(); for (const c of G.lanes[i].out) { const j = G.conns[c].to; if (!seen.has(j)) { seen.add(j); q.push(j); } } }
  assert.equal(seen.size, G.lanes.length, 'every lane reachable from lane 0');
  // one-way streets run one way; the avenues and the decks both ways
  for (const l of G.lanes) if (l.kind === 'oneway') assert.ok(G.lanes.every(o => o.strip !== l.strip || o.dir[0] * l.dir[0] + o.dir[1] * l.dir[1] > 0), 'a one-way street has no lane against it: ' + l.strip);
  assert.ok(G.lanes.some(l => l.kind === 'avenue' && l.dir[0] > .9) && G.lanes.some(l => l.kind === 'avenue' && l.dir[0] < -.9), 'the avenues run both ways');
});

test('connectors leave and join their lanes where they say; turns are arcs a turning circle fits; the Loop by its ramps', () => {
  for (const c of G.conns) {
    const a = G.lanes[c.from], b = G.lanes[c.to], pa = G.pointOn(a, c.fromS), pb = G.pointOn(b, c.toS);
    assert.ok(Math.hypot(c.p0[0] - pa[0], c.p0[1] - pa[1]) < .6 && Math.hypot(c.p2[0] - pb[0], c.p2[1] - pb[1]) < .6, `connector ${c.id} meets its lanes`);
    assert.ok(c.fromS > 0 && c.fromS <= a.len + .01 && c.toS >= 0 && c.toS < b.len, `connector ${c.id} leaves and joins within its lanes`);
    if (c.kind === 'left' || c.kind === 'right') assert.ok(c.radius >= TURNING_CIRCLE - 1e-6, `turn ${c.id} in ${c.region} is an arc of ${c.radius}`);
    if (c.kind === 'right') assert.equal(a.index, LANES[a.kind].offs.length - 1, 'a right turn leaves from the outer lane');
    if (c.kind === 'left') assert.equal(a.index, 0, 'a left turn leaves from the inner lane');
  }
  const ground = G.lanes.find(l => l.strip === 'street1'), deck = G.lanes.find(l => l.kind === 'deck');
  const r = gps.route(ground.id, deck.id); assert.ok(r, 'a route from a street onto the Loop');
  assert.ok(r.lanes.some(i => G.lanes[i].kind === 'ramp'), 'by a ramp');
  // a crosswalk before a junction moves its stop line back
  assert.ok(G.lanes.some(l => l.atEnd && l.stopS < l.len - 20), 'stop lines short of the crosswalks');
});

test('junctions: crossing and merging connectors conflict, one lane\'s connectors don\'t; first come, first served', () => {
  const J = new Junctions(G), st = J.stats(); assert.ok(st.conflicts > 50, 'conflicts: ' + st.conflicts);
  for (const [a, set] of J.conflicts) for (const b of set) { assert.ok(J.conflict(b, a), 'symmetric'); assert.notEqual(G.conns[a].from, G.conns[b].from, 'one lane\'s connectors never conflict'); }
  // two drivers on conflicting connectors: the first ready goes, the second waits until the first lets go
  const [a, set] = [...J.conflicts].find(([, s]) => s.size), b = [...set][0], ca = G.conns[a], cb = G.conns[b];
  const A = { id: 1 }, B = { id: 2 };
  assert.equal(J.ask(A, ca, 0, true), true, 'the first ready goes');
  assert.equal(J.ask(B, cb, .01, true), false, 'the other waits');
  assert.equal(J.ask(A, ca, .02, true), true, 'a holder keeps it');
  J.release(A, ca.region); assert.equal(J.ask(B, cb, .03, true), true, 'then the waiter goes');
  // a waiter that isn't ready blocks nobody; one ready longer goes first
  const C = { id: 3 }, D = { id: 4 }; J.release(B, cb.region);
  assert.equal(J.ask(C, ca, 1, false), false); assert.equal(J.ask(D, cb, 1.01, true), true, 'not ready blocks nobody');
});

test('A* finds what Dijkstra finds on 1,000 random pairs, and a route across the city takes under 2 ms', () => {
  const n = G.lanes.length; let both = 0;
  for (let k = 0; k < 1000; k++) {
    const a = Math.floor(rand() * n), b = Math.floor(rand() * n), x = gps.route(a, b), y = gps.dijkstra(a, b);
    assert.equal(!!x, !!y); if (!x) continue; both++;
    assert.ok(Math.abs(x.cost - y.cost) < 1e-6, `pair ${a} -> ${b}: A* ${x.cost} against Dijkstra ${y.cost}`);
  }
  assert.ok(both > 950, 'nearly every pair routes: ' + both);
  // the two lanes farthest apart
  let far = null, best = -1; const mid = l => [(l.a[0] + l.b[0]) / 2, (l.a[1] + l.b[1]) / 2];
  for (const p of G.lanes) for (const q of G.lanes) { const [ax, ay] = mid(p), [bx, by] = mid(q), d = Math.hypot(ax - bx, ay - by); if (d > best) { best = d; far = [p, q]; } }
  assert.ok(best > 2500, 'lanes far apart: ' + best.toFixed(0));
  const times = []; for (let k = 0; k < 200; k++) { const t0 = performance.now(); assert.ok(gps.route(far[0].id, far[1].id)); times.push(performance.now() - t0); }
  times.sort((p, q) => p - q); assert.ok(times[100] < 2, `median ${times[100].toFixed(3)} ms`);
});

test('the signals: NS and EW are never open together; each phase lasts its time; junctions are offset; stop signs stay stop', () => {
  const sig = G.regions.filter(r => r.signals === 'signal'), stop = G.regions.find(r => r.signals === 'stop');
  assert.ok(sig.length >= 4, 'signalled junctions: ' + sig.length);
  const R = sig[0], dt = .05, L = cycleLength(); let green = 0, amber = 0, runs = new Set();
  for (let t = 0; t < L; t += dt) {
    const s = signalAt(R, t); assert.ok(s.ns === 'red' || s.ew === 'red', 'never both open at ' + t.toFixed(2));
    if (s.ns === 'green') green += dt; if (s.ns === 'amber') amber += dt; runs.add(s.ns + s.ew);
    if (s.ns === 'amber') assert.ok(M.amberLeft(R, t, 'ns') > 0 && M.amberLeft(R, t, 'ns') <= TUNE.signalAmber + 1e-6, 'amber counts down');
  }
  assert.ok(Math.abs(green - TUNE.signalGreen) < .11 && Math.abs(amber - TUNE.signalAmber) < .11, `green ${green.toFixed(2)}, amber ${amber.toFixed(2)}`);
  assert.ok(runs.has('redred'), 'an all-red clearance');
  assert.ok(new Set(sig.map(r => signalAt(r, 0).ns + signalAt(r, 0).ew)).size > 1, 'not all in step');
  assert.deepEqual(signalAt(stop, 3), { ns: 'stop', ew: 'stop' });
});
