// A headless traffic probe: N cars on random lanes of Lowtown, each driven by a DriverBrain through the Junctions, for S
// seconds; prints overlaps (cars inside each other), the longest stall without a cause, red-light runs by calm
// drivers, the mean speed, and the stuck cars with what holds them. --kin drives them all kinematically (the far LOD).
//   node tools/traffic-probe.mjs [cars 30] [seconds 120] [--kin] [--seed 7]
import { engineGlobal } from '../tests/harness.mjs';
engineGlobal();
const M = await import('../src/motor/index.js');
for (const f of ['styles', 'landmarks', 'district']) await import('../src/game/districts/lowtown/' + f + '.js');
for (const f of ['cortez', 'hauler', 'sparrow', 'brute', 'saint', 'zephyr']) await import('../src/game/vehicles/' + f + '.js');
const { DriverBrain } = await import('../src/motor/ai/driver.js');
const { Junctions } = await import('../src/motor/nav/junctions.js');
const args = process.argv.slice(2).filter(a => !a.startsWith('--')), kin = process.argv.includes('--kin'), seedI = process.argv.indexOf('--seed');
const N = Number(args[0] || 30), SECS = Number(args[1] || 120), SEED = seedI > 0 ? +process.argv[seedI + 1] : 7;
const city = M.buildCity('lowtown'), G = new M.RoadGraph(city), J = new Junctions(G), fleet = new M.Fleet({ city });
M.RNG.seed(SEED);
const rng = M.RNG.stream('traffic'), cars = [], defs = ['cortez', 'cortez', 'cortez', 'hauler', 'brute', 'saint', 'zephyr', 'sparrow'];
const spawnable = G.lanes.filter(l => !l.deadEnd && l.out.length && l.kind !== 'stub' && l.len > 90);
for (let k = 0, tries = 0; k < N && tries < 5000; tries++) {
  const lane = spawnable[Math.floor(rng.next() * spawnable.length)], s = 30 + rng.next() * (lane.len - 60), p = G.pointOn(lane, s);
  if (cars.some(c => Math.hypot(c.v.x - p[0], c.v.y - p[1]) < 80)) continue;
  const v = fleet.spawn(defs[k % defs.length], p[0], p[1], Math.atan2(lane.dir[1], lane.dir[0])); v.body.z = p[2];
  const d = new M.Ped({ x: p[0], y: p[1] }); v.sit(d, 0);
  const brain = new DriverBrain(v, G, { junctions: J, rng, lane: lane.id, s, personality: { speed: .9 + rng.next() * .2, gap: .9 + rng.next() * .3, patience: .8 + rng.next() * .5 } });
  v.brain = brain; v.kinematic = kin; cars.push({ v, brain, still: 0, maxStill: 0, why: null }); k++;
}
const dt = 1 / 120; let t = 0, overlaps = 0, maxStill = 0, red = 0, speedSum = 0, speedN = 0, worst = null;
const prevEl = new Map();
for (; t < SECS; t += dt) {
  const W = { fleet, t };
  const intents = new Map();
  for (const c of cars) { if (c.v.kinematic) c.brain.step(dt, W); else intents.set(c.v, c.brain.update(dt, W)); }
  fleet.update(dt, { intent: v => intents.get(v) || null, peds: [] });
  for (const c of cars) {
    const b = c.brain, e = b.here;
    // red-light runs: a calm driver moving onto a signalled connector while its light is red
    const key = e ? e.k + e.id : ''; if (prevEl.get(c) !== key && e && e.k === 'conn') { const cn = G.conns[e.id]; if (cn.signals === 'signal' && M.lightFor(cn, G, t) === 'red' && b.panic <= 0 && c.v.body.u > 0) { red++; if (red < 6) console.log('RED', c.v.id, cn.region, t.toFixed(1)); } }
    prevEl.set(c, key);
    const legit = b.cause && b.cause !== 'crash';
    c.still = c.v.speed < 1 && !legit ? c.still + dt : 0; if (c.still > c.maxStill) { c.maxStill = c.still; } if (c.still > maxStill) { maxStill = c.still; worst = c; }
    speedSum += c.v.speed; speedN++;
  }
  // cars inside each other (more than a little: a touch is a collision the physics settles)
  if (Math.round(t * 120) % 12 === 0) for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) { const a = cars[i].v, bb = cars[j].v; if (Math.abs(a.z - bb.z) < 10 && Math.hypot(a.x - bb.x, a.y - bb.y) < 14) { overlaps++; if (overlaps < 4) console.log('OVERLAP', a.id, a.def.id, bb.id, bb.def.id, [a.x, a.y, a.z].map(Math.round), [bb.x, bb.y, bb.z].map(Math.round), t.toFixed(1)); } }
}
const avgHealth = cars.reduce((a, c) => a + c.v.damage.health, 0) / cars.length;
console.log(`cars ${cars.length} (${kin ? 'kinematic' : 'physical'}) ${SECS}s seed ${SEED}: overlaps ${overlaps}, red runs ${red}, max stall without cause ${maxStill.toFixed(1)}s, mean speed ${(speedSum / speedN).toFixed(1)}, avg health ${avgHealth.toFixed(1)}`);
console.log('junctions', JSON.stringify(J.stats()));
for (const c of cars) if (c.v.speed < 3) {
  const b = c.brain, e = b.here, el = e && (e.k === 'lane' ? G.lanes[e.id] : G.conns[e.id]), L = b.leader;
  console.log('slow', c.v.id, c.v.def.id, [c.v.x, c.v.y].map(Math.round), e && e.k, e && (e.k === 'lane' ? el.strip : el.kind + ' ' + el.region), 'cause', b.cause, 'leader', L ? [Math.round(L.gap), Math.round(L.speed), L.v.id] : '-', 'held', b.held ? b.held.conn.region : '-', 'still', c.still.toFixed(1), 'max', c.maxStill.toFixed(1), 'pass', !!b.pass, 'hp', Math.round(c.v.damage.health));
}
if (worst) {
  console.log('worst', worst.v.id, 'max still', worst.maxStill.toFixed(1));
  // the chain of who waits on whom from the worst one
  let c = worst, seen = new Set();
  while (c && !seen.has(c)) { seen.add(c); const b = c.brain, e = b.here, el = e && (e.k === 'lane' ? G.lanes[e.id] : G.conns[e.id]), L = b.leader;
    console.log('  ', c.v.id, c.v.def.id, [c.v.x, c.v.y, c.v.z].map(Math.round), 'h', c.v.heading.toFixed(2), 'u', c.v.body.u.toFixed(0), e && e.k, e && (e.k === 'lane' ? el.strip + ' s' + b.s.toFixed(0) : el.kind + ' ' + el.region), 'cause', b.cause, 'blocked', b.blocked.toFixed(1), 'pass', b.pass ? Math.round(b.pass.off) : '-', 'leader', L ? [Math.round(L.gap), Math.round(L.speed), L.v.id] : '-', 'I', JSON.stringify([+b.I.throttle.toFixed(2), +b.I.brake.toFixed(2), +b.I.steer.toFixed(2)]));
    c = L ? cars.find(q => q.v === L.v) : null; }
}
