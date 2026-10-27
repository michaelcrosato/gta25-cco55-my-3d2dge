// The city soak (PLAN.md 8.9 and 8.10's acceptance): Lowtown (or another district: EXPANSION.md X1) in play, its traffic, crowd and services running round a
// focus that hops between the city's points of interest every `hop` seconds (as a drive would take it), watched every
// step for:
//   - cars inside each other (centres nearer than OVERLAP at the same level), and the longest any traffic car stands
//     still with no cause (a queue, a light, a ped, a siren to let by, its goal);
//   - red-light runs: a calm driver (no panic, no siren) onto a signalled connector red for half a second (one that
//     committed on amber, with no room to stop, may reach its connector just after the change; one that crossed the
//     line in a panic, ignoring the light as panic does, is committed too: no panic in the last 3 s);
//   - the traffic's mean speed, and spawns nearer the focus than the inner radius of the traffic's annulus or the
//     crowd's ring (the fills when the focus arrives somewhere aside: nothing round it has been seen yet);
//   - peds stuck: wanting to walk and not moving (waiting at a crossing aside), and the longest crossing wait;
//   - the cost of a step.
// Used by tests/sim/city-life.test.mjs (2 minutes) and tests/full/city-soak.mjs (10 minutes).
//   const r = await citySoak({ secs: 120, seed: 1999, time: 'day', weather: 'clear' })
import { loadGame } from './harness.mjs';

const OVERLAP = 14, DT = 1 / 120;
const LEGIT = new Set(['queue', 'ped', 'signal', 'stop', 'yield', 'exit', 'arrived', 'scene']);   // (DriverBrain's causes; 'crash' is no cause to stand; 'scene': behind a unit parked at its call, no way round: reported as its own longest wait)

export async function citySoak({ secs = 120, seed = 1999, time = 'day', weather = 'clear', hop = 20, log = null, watch = null, district = null } = {}) {
  const { game, gtm } = await loadGame({ hash: '#play', query: { seed: String(seed), time, weather, ...(district ? { dev: '1', district } : {}) } });   // (district: another than Lowtown, EXPANSION.md: Ironside)
  const M = gtm.motor, L = gtm.life, T = L.traffic, C = L.crowd, G = L.graph, fp = T.fp, TUNE = M.TUNE;
  const pois = gtm.city.pois.filter(p => p.kind !== 'gang');
  const r = { secs, seed, time, weather, steps: 0, overlaps: 0, overlapAt: null, maxStall: 0, stallAt: null, redRuns: 0, redAt: null, speedSum: 0, speedN: 0,
    carsSeen: 0, spawnsInside: 0, insideAt: null, pedsSeen: 0, pedsInside: 0, worstStuck: 0, stuckAt: null, worstCrossWait: 0, ms: 0, maxCars: 0, maxPeds: 0, maxScene: 0, sceneAt: null };
  const cars = new Map(), peds = new Map();
  let fillsT = T.fills, fillsC = C.fills, filledSince = false;
  // a ped seen for the first time: where it came in (a fill aside: the focus has just arrived)
  const meet = (m, filled, step) => {
    const p = m.ped, d = Math.hypot(p.x - fp.x, p.y - fp.y); peds.set(m, { x: p.x, y: p.y, still: 0, wait: 0 }); r.pedsSeen++;
    if (!filled && !m.adopted && d < TUNE.crowdIn - 40) { r.pedsInside++; r.pedInsideAt ||= { arch: m.arch, state: m.brain.state, d: Math.round(d), troupe: p.troupe || null, t: +(step / 120).toFixed(2) }; }   // (40: what a ped walks in the quarter second before it is seen)
  };
  const t0 = performance.now();
  for (let step = 0; step < secs * 120; step++) {
    if (hop && step % (hop * 120) === hop * 120 - 1) {   // (the peds that came in since the last look are met before the focus moves)
      for (const m of C.members) if (!peds.has(m)) meet(m, filledSince, step);
      const q = pois[(step / (hop * 120) | 0) % pois.length]; gtm.teleport(q.x, q.y);
    }
    game.advance(DT); r.steps++;
    const filledT = T.fills !== fillsT; if (C.fills !== fillsC) filledSince = true; fillsT = T.fills; fillsC = C.fills;
    r.maxCars = Math.max(r.maxCars, T.cars.length); r.maxPeds = Math.max(r.maxPeds, C.members.length);
    for (const c of T.cars) {
      const v = c.v, b = c.brain; let w = cars.get(c);
      if (!w) {
        w = { still: 0, el: null }; cars.set(c, w); r.carsSeen++;
        const d = Math.hypot(v.x - fp.x, v.y - fp.y);
        if (!filledT && d < TUNE.fpSpawnIn - 10) { r.spawnsInside++; r.insideAt ||= { car: v.def.id, d: Math.round(d), t: +(step / 120).toFixed(2) }; }
      }
      if (c.duty && (c.duty.out || c.duty.arrived)) { w.still = 0; continue; }   // (a unit at its scene)
      // a calm driver onto a signalled connector on red, over its stop line on red (one over it before the red, held up on
      // the zebra past it by the people crossing, clears the box after: no red run; nor one over it under its siren, its
      // call over before it was through: a unit held up behind a car pulled over for it had)
      const e = b.here, key = e ? e.k + e.id : '';
      if (b.panic > 0) w.pan = step;
      const nx = e && e.k === 'lane' ? b.path[b.i + 1] : null, nc = nx && nx.k === 'conn' ? G.conns[nx.id] : null;
      if (nc && nc.signals === 'signal' && !(w.line && w.line.id === nc.id) && b.s >= Math.min(G.lanes[nc.from].stopS, nc.fromS - 2)) w.line = { id: nc.id, red: !b.siren && M.lightFor(nc, G, L.t) === 'red' && M.lightFor(nc, G, L.t - .5) === 'red' };
      if (key !== w.el && e && e.k === 'conn' && !(w.line && w.line.id === e.id && !w.line.red) && !b.siren && !(b.panic > 0) && !(w.pan !== undefined && step - w.pan < 360) && v.body && v.body.u > 0) {
        const cn = G.conns[e.id]; if (cn.signals === 'signal' && M.lightFor(cn, G, L.t) === 'red' && M.lightFor(cn, G, L.t - .5) === 'red') {   // (red for half a second: not one committed on amber)
          r.redRuns++; r.redAt ||= { car: v.def.id, at: cn.region, t: +(step / 120).toFixed(2) }; r.lastRed = { c, cn, step }; }
      }
      w.el = key;
      w.still = v.speed < 1 && !LEGIT.has(b.cause) ? w.still + DT : 0;
      w.scene = v.speed < 1 && b.cause === 'scene' ? (w.scene || 0) + DT : 0;
      if (w.scene > r.maxScene) { r.maxScene = w.scene; r.sceneAt = { car: v.def.id, x: Math.round(v.x), y: Math.round(v.y), t: +(step / 120).toFixed(2) }; }
      if (w.still > r.maxStall) { r.maxStall = w.still; r.stallAt = { car: v.def.id, x: Math.round(v.x), y: Math.round(v.y), cause: b.cause, kin: v.kinematic, t: +(step / 120).toFixed(2) }; }
      r.speedSum += v.speed; r.speedN++;
    }
    if (step % 12 === 0) for (const c of T.cars) {   // (ten times a second: a car inside another, any vehicle)
      const a = c.v; if (!a.body) continue;
      for (const o of gtm.fleet.around(a.x, a.y, OVERLAP + 2)) {
        if (o === a || !o.body || o.cls === 'heli' || (o.traffic && o.id < a.id && T.cars.some(q => q.v === o)) || Math.abs(a.z - o.z) > 10) continue;
        if (Math.hypot(a.x - o.x, a.y - o.y) < Math.min(OVERLAP, a.hw + o.hw + 2)) { r.overlaps++; r.overlapAt ||= { a: a.def.id, b: o.def.id, x: Math.round(a.x), y: Math.round(a.y), t: +(step / 120).toFixed(2) }; }   // (two bikes side by side are less than 14 apart, and clear)
      }
    }
    if (step % 30 === 29) { const filledC = filledSince; filledSince = false; for (const m of C.members) {   // (four times a second: the peds; a fill since the last look aside)
      const b = m.brain, p = m.ped, w = peds.get(m);
      if (!w) { meet(m, filledC, step); continue; }
      const moved = Math.hypot(p.x - w.x, p.y - w.y); w.x = p.x; w.y = p.y;
      if (p.dead || p.floored || p.held) { w.still = w.wait = 0; continue; }
      const going = b.state === 'walk' || b.state === 'goto' || b.state === 'flee', crossing = going && b.edge && b.edge.kind === 'cross' && b.a <= 4 && !b.feet, wants = going && !crossing;   // (at a curb waiting to cross; an idle there is no wait)
      w.still = wants && moved < 2 ? w.still + .25 : 0; w.wait = crossing && moved < 2 ? w.wait + .25 : 0;
      if (w.wait > r.worstCrossWait) { r.worstCrossWait = w.wait; r.crossAt = { x: Math.round(p.x), y: Math.round(p.y), edge: b.edge.id, region: b.edge.region ? b.edge.region.id : null, lit: !!(b.edge.region && b.edge.region.signals === 'signal'), t: +(step / 120).toFixed(2) }; r.lastCross = m; }
      if (w.still > r.worstStuck) { r.worstStuck = w.still; r.stuckAt = { state: b.state, feet: b.feet, near: m.near, x: Math.round(p.x), y: Math.round(p.y), edge: b.edge ? b.edge.id : null, t: +(step / 120).toFixed(2) }; r.lastStuck = m; }
    } }
    if (watch) watch(step, gtm, r);   // (a probe's look at the city, each step)
    if (log && step % 2400 === 2399) log(`${(step + 1) / 120}s cars ${T.cars.length} peds ${C.members.length} stall ${r.maxStall.toFixed(1)} stuck ${r.worstStuck.toFixed(1)} overlaps ${r.overlaps} red ${r.redRuns}`);
  }
  r.ms = (performance.now() - t0) / r.steps; r.meanSpeed = r.speedSum / Math.max(1, r.speedN);
  r.stats = L.stats(); r.hash = game.stateHash();
  return r;
}
