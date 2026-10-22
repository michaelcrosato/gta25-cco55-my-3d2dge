// FAN-OUT B review (traffic and peds): the city's traffic and crowd never learn that Dock Road's drawbridge is up.
// PLAN.md 9.1 / 8.7: the drawbridge rises every 3 game hours (every 3 real minutes) and "closes its gates"; while it is
// not down "its cells are blocked (no one walks into the canal)" (world/drawbridge.js), the road graph marks the span's
// lane "closed while it is up" (nav/roadgraph.js), the GPS has an `avoid` for "a raised drawbridge" (nav/gps.js) and the
// spawner reads ctx.bridgeUp (ai/traffic.js). None of it is wired: CityLife.update never passes bridgeUp, DriverBrain has
// no notion of the gate, GPS.route is never given an avoid, and the gliding peds ignore the blocked cells.
// What happens: a calm driver halts at the stop sign before the span, then drives up the fully raised (72 degree) leaf
// and is flung ~180 u into the air over the canal; a far (kinematic) car rolls across the open water at z 0 and sinks;
// peds stroll across the open span at street level.
//   node --test tests/review/traffic/drawbridge.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

// Lowtown with the drawbridge up, the focus at (fx, fy); a traffic car put on Dock Road north of the span (lane 41),
// driving the GPS's route south over it (41 -> 42, the span -> 90): the route any driver headed that way gets
async function carToBridge(fx, fy, kinematic) {
  const { game, gtm } = await loadGame({ hash: '#play/marina', query: { seed: '7', time: 'day', weather: 'clear', bridge: 'up' } });
  const B = gtm.bridges[0], L = gtm.life, T = L.traffic, G = L.graph, F = gtm.fleet;
  gtm.teleport(fx, fy); game.advance(1);
  assert.equal(B.phase, 'up'); assert.equal(G.lanes[42].bridge, 'dock', 'lane 42 is the span');
  const r = L.gps.route(41, 90, { s: 20 });
  const c = T.cars.find(q => !q.duty && q.v.cls === 'car'), lane = G.lanes[41], p = G.pointOn(lane, 20);
  for (const o of [...F.vehicles]) if (o !== c.v && Math.abs(o.x - 2066) < 40 && o.y > 1650 && o.y < 2250) F.remove(o);   // (the street to itself)
  const b = c.v.body; b.x = p[0]; b.y = p[1]; b.z = 0; b.heading = Math.atan2(lane.dir[1], lane.dir[0]); b.setVelocity(0, 60);
  c.brain.reset(lane, 20); c.brain.setRoute(r.lanes, { lane: 90, s: 60 }); c.brain.speed = 60; c.v.kinematic = kinematic;
  let on = null, maxZ = 0;
  for (let step = 0; step < 14 * 120 && B.phase === 'up'; step++) {
    game.advance(1 / 120);
    if (B.contains(c.v.x, c.v.y)) { on = on || { t: +(step / 120).toFixed(2), lift: B.lift, kinematic: c.v.kinematic, speed: Math.round(c.v.speed) }; maxZ = Math.max(maxZ, c.v.z); }
  }
  return { route: r.lanes, on, maxZ, sunk: !!c.v.sunk, car: c.v.def.id };
}

test('a calm driver near the player never drives onto the raised drawbridge (it waits at the gate, or goes another way)', async () => {
  const r = await carToBridge(1960, 1800, false);
  assert.equal(r.on, null, `GPS route ${r.route.join('>')} goes over the raised span; the ${r.car} drove onto it ${JSON.stringify(r.on)} and was flung to z ${r.maxZ.toFixed(0)} over the canal`);
});

test('a far (kinematic) traffic car never rolls onto the raised drawbridge\'s open span', async () => {
  const r = await carToBridge(1520, 1960, true);
  assert.equal(r.on, null, `the ${r.car} rolled onto the open span ${JSON.stringify(r.on)} at z ${r.maxZ.toFixed(0)} (on the water); sunk: ${r.sunk}`);
});

test('no ped walks onto the raised drawbridge (its cells are blocked: "no one walks into the canal")', async () => {
  const { game, gtm } = await loadGame({ hash: '#play/marina', query: { seed: '7', time: 'day', weather: 'clear', bridge: 'up' } });
  const B = gtm.bridges[0], C = gtm.life.crowd, map = gtm.city.map;
  gtm.teleport(1960, 1900); game.advance(1);
  assert.equal(map.blocked[(B.rect[1] + 3) * map.w + B.rect[0] + 1], 1, 'the span\'s cells are blocked while it is up');
  const on = new Map();
  for (let step = 0; step < 18 * 120 && B.phase === 'up'; step++) {
    game.advance(1 / 120);
    if (step % 12) continue;
    for (const m of C.members) { const p = m.ped; if (!p.dead && B.contains(p.x, p.y) && !on.has(p.id)) on.set(p.id, { t: +(step / 120).toFixed(1), x: Math.round(p.x), y: Math.round(p.y), z: +p.z.toFixed(1), gliding: p.gliding }); }
  }
  assert.equal(on.size, 0, `${on.size} peds walked onto the raised span, e.g. ${JSON.stringify([...on.values()].slice(0, 3))}`);
});
