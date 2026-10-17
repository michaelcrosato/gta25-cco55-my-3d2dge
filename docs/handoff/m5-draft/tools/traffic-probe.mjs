// A headless traffic probe for the M5 draft (restore it to tools/ with the draft): N cars on random street and avenue
// lanes of Lowtown, each driven by a DriverBrain, for S seconds; prints crash steps, the longest stall and the stuck cars.
//   node tools/traffic-probe.mjs 30 120
import { engineGlobal } from '../tests/harness.mjs';
engineGlobal();
const M = await import('../src/motor/index.js');
for (const f of ['styles', 'landmarks', 'district']) await import('../src/game/districts/lowtown/' + f + '.js');
await import('../src/game/vehicles/cortez.js');
const { RoadGraph } = await import('../src/motor/nav/roadgraph.js');
const { DriverBrain } = await import('../src/motor/ai/driver.js');
const city = M.buildCity('lowtown'), G = new RoadGraph(city), fleet = new M.Fleet({ city });
M.RNG.seed(7);
const rng = M.RNG.stream('traffic'), cars = [];
for (let k = 0; k < Number(process.argv[2] || 1); k++) {
  const lane = G.lanes[Math.floor(rng.next() * G.lanes.length)]; if (lane.kind !== 'street' && lane.kind !== 'avenue') { k--; continue; }
  const p = G.pointOn(lane, lane.len * .3), v = fleet.spawn('cortez', p[0], p[1], Math.atan2(lane.dir[1], lane.dir[0])), d = new M.Ped({ x: p[0], y: p[1] }); v.sit(d, 0);
  cars.push({ v, brain: new DriverBrain(v, G, { rng, lane: lane.id, s: lane.len * .3 }) });
}
const dt = 1 / 120; let t = 0, crashes = 0, maxStill = 0;
for (const c of cars) c.still = 0;
for (; t < Number(process.argv[3] || 60); t += dt) {
  const intents = new Map(cars.map(c => [c.v, c.brain.update(dt, { fleet, t })]));
  fleet.update(dt, { intent: v => intents.get(v) || null, peds: [] });
  for (const c of cars) { if (c.v.body.felt.hit > 2000) crashes++; c.still = c.v.speed < 1 ? c.still + dt : 0; maxStill = Math.max(maxStill, c.still); }
  if (Math.round(t * 120) % 1200 === 0 && cars.length === 1) { const c = cars[0], b = c.v.body, e = c.brain.here; console.log(t.toFixed(1), 'pos', b.x.toFixed(0), b.y.toFixed(0), 'v', c.v.speed.toFixed(0), 'on', e.k, G[e.k === 'lane' ? 'lanes' : 'conns'][e.id].strip || G.conns[e.id].kind, 'dmg', c.v.damage.health.toFixed(0)); }
}
const avg = cars.reduce((a, c) => a + c.v.damage.health, 0) / cars.length;
console.log('cars', cars.length, 'crash steps', crashes, 'max still', maxStill.toFixed(1), 'avg health', avg.toFixed(1), 'speeds', cars.map(c => c.v.speed.toFixed(0)).join(' '));
for (const c of cars) if (c.v.speed < 3) {
  const e = c.brain.here, el = e.k === 'lane' ? G.lanes[e.id] : G.conns[e.id], L = c.brain._leader(fleet, 100);
  const reg = e.k === 'conn' ? el.region : el.atEnd && el.atEnd.id;
  console.log('stuck', c.v.id, [c.v.x, c.v.y].map(Math.round), 'h', c.v.heading.toFixed(2), e.k, e.k === 'lane' ? el.strip : el.kind, 'region', reg, 'leader', L ? [Math.round(L.gap), Math.round(L.speed), L.v.id] : '-', 'hit', Math.round(c.v.body.felt.hit), 'dmg', Math.round(c.v.damage.health), 'still', c.still.toFixed(0));
}
