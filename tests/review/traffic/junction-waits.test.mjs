// FAN-OUT B review (traffic and peds): junction waits that never clear. PLAN.md 8.9: "no deadlock"; drivers yield to
// peds in crosswalks, and units answer their calls (8.10). Two ways a driver stands at a junction for good, both with a
// "legit" cause, so the city soak (which only flags stalls with no cause) never sees them:
//   1. the curb stand-off. DriverBrain._peds stops a calm driver for any body within its half-width + 5 u of its path
//      (TUNE.pedPatience only drops a crossing's wider berth), so a ped standing at a crosswalk's curb (a <= 4 on a
//      'cross' edge: not yet in the road) beside a turn's arc holds the car; PedBrain._carsClear keeps that ped at the
//      curb while any car's box is within 9 u of the crossing, "moving or not": the very car that stopped for it. Each
//      ped gives up after 20 s (GIVE_UP), but at a busy corner the next ones arrive meanwhile, and every one that comes
//      round that corner stands on the same spot (their own offsets are lost at the corner: a 0, o -11 for all of them:
//      up to 7 bodies stacked on one point). The car holds the junction's reservation all the while (the box is shut to
//      every conflicting move). Found in the wild: a Pumper on a fire call stood 3+ minutes in j14's box this way, its
//      call stood down 'late';
//   2. the abandoned car in the exit. DriverBrain._junction asks _exitFull (D19: enter only with room past the exit
//      lane's clearS), which counts any vehicle slower than 30 u/s there, a parked car nobody drives too. A wanderer
//      reroutes after TUNE.exitWait, but only `!this.route`: a unit sent by the GPS (and any mission driver on a route)
//      waits at the line for a car that will never move (nobody is let in behind it to go round or shove it; the tow
//      takes it only out of every view's sight). Found in the wild (seed 2, focus by the Loop's NE corner): a Pumper
//      stood 56 s at j29 behind an abandoned hauler 51 u inside Loop Avenue until its call was stood down 'late'.
//   node --test tests/review/traffic/junction-waits.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

const play = async () => { const g = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear' } }); g.game.advance(3); return g; };
// a traffic driver of definition defId put on lane laneId (s0 along it) with the given route (and goal), as Traffic does
function driver(gtm, defId, laneId, s0, route, goal, siren) {
  const M = gtm.motor, L = gtm.life, T = L.traffic, G = L.graph, F = gtm.fleet, lane = G.lanes[laneId], p = G.pointOn(lane, s0), h = Math.atan2(lane.dir[1], lane.dir[0]);
  for (const o of [...F.vehicles]) if (Math.hypot(o.x - p[0], o.y - p[1]) < 60) F.remove(o);
  for (const c of [...T.cars]) if (!F.vehicles.includes(c.v)) T.cars.splice(T.cars.indexOf(c), 1);
  const v = F.spawn(defId, p[0], p[1], h); v.body.z = 0; v.traffic = true; v.siren = !!siren && v.hasSiren; if (siren) v.owner = 'service';
  const drv = new M.Ped({ x: p[0], y: p[1], faction: 'civilian', lazyRig: true }); v.sit(drv, 0);
  const brain = new M.DriverBrain(v, G, { junctions: L.junctions, rng: M.RNG.stream('review'), lane: laneId, s: s0, siren: v.siren, personality: siren ? { speed: 1.15, gap: .9, patience: 1.4, calm: true } : { speed: 1, gap: 1, patience: 1, calm: true } });
  brain.setRoute(route, goal); brain.speed = 40; v.brain = brain; v.kinematic = false; v.body.setVelocity(Math.cos(h) * 40, Math.sin(h) * 40);
  T.cars.push({ v, driver: drv, brain, tough: 1, out: null });
  return { v, brain };
}

// a car turning left at j14 (conn 39: lane 55 into lane 12); as it starts its turn, one passer-by stands at the curb of
// crossing 135 beside its arc (where the peds coming round that corner stand); the street's own crowd does the rest
async function curb(defId, secs, siren = false) {
  const { game, gtm } = await play(), G = gtm.life.graph, C = gtm.life.crowd, W = gtm.life.walks, conn = 39;
  assert.equal(G.regions.find(r => r.id === G.conns[conn].region).signals, 'stop', 'j14 is an all-way stop');
  const { v, brain } = driver(gtm, defId, 55, 120, [55, 12], null, siren);
  const e = W.edges[135], [x0, y0] = W.along(e, e.len, 11);
  let put = false, through = null, stood = 0, maxStood = 0, maxStack = 0, held = 0;
  for (let t = 0; t < secs && through === null; t += .25) {
    game.advance(.25);
    if (!put && brain.here.k === 'conn' && brain.here.id === conn) {
      put = true;
      const m = C.members.filter(q => !q.ped.dead && !q.brain.follow && !q.brain.busy && !q.ped.gang && q.ped.faction === 'civilian').sort((a, b) => Math.hypot(a.ped.x - x0, a.ped.y - y0) - Math.hypot(b.ped.x - x0, b.ped.y - y0))[0];
      m.ped.place(x0, y0, 0); m.brain.state = 'walk'; m.brain.place(e, e.len, 11, -1); m.brain.feet = false;
    }
    if (brain.here.k === 'lane' && brain.here.id === 12) through = t;
    stood = brain.cause === 'ped' && v.speed < 1 ? stood + .25 : 0; maxStood = Math.max(maxStood, stood);
    if (brain.held && brain.held.conn.id === conn) held += .25;
    maxStack = Math.max(maxStack, C.members.filter(m => !m.ped.dead && Math.hypot(m.ped.x - x0, m.ped.y - y0) < 1).length);
  }
  return { through, maxStood, maxStack, held, at: [Math.round(x0), Math.round(y0)], siren: v.siren && brain.siren };
}

test('the curb stand-off: a calm Cortez turning left at j14 past the peds at the crosswalk\'s curb gets through within 30 s', async () => {
  const r = await curb('cortez', 90);
  assert.ok(r.through !== null && r.through < 30, `the Cortez never got through j14 in 90 s: it stood ${r.maxStood} s for the peds at the curb ${JSON.stringify(r.at)} (up to ${r.maxStack} of them stacked on that one point), holding the junction's box ${r.held} s`);
});

test('the curb stand-off: a Pumper with its siren on turning there gets through within 30 s', async () => {
  const r = await curb('pumper', 60, true);
  assert.ok(r.siren, 'its siren on');
  assert.ok(r.through !== null && r.through < 30, `the Pumper never got through j14 in 60 s: it stood ${r.maxStood} s for the peds at the curb ${JSON.stringify(r.at)} (up to ${r.maxStack} stacked on that point)`);
});

test('the abandoned car in the exit: a siren unit routed into a street with a car nobody drives at its mouth gets in within 30 s', async () => {
  const { game, gtm } = await play(), T = gtm.life.traffic, G = gtm.life.graph, F = gtm.fleet;
  const X = G.lanes[13], cn = G.conns[41], box = G.regions.find(r => r.id === cn.region).box;
  assert.equal(cn.to, X.id); assert.equal(cn.kind, 'straight');
  // the junction (j15) and the street past it empty; a hauler left 51 u inside the street (its driver ran off)
  for (const c of [...T.cars]) { const v = c.v; if (v.x > box[0] - 200 && v.x < box[2] + 200 && v.y > box[1] - 200 && v.y < box[3] + 320) T._drop(c, false, true); }
  for (const o of [...F.vehicles]) if (!o.traffic && Math.hypot(o.x - X.a[0], o.y - X.a[1]) < 120) F.remove(o);
  const q = G.pointOn(X, X.clearS + 19), left = F.spawn('hauler', q[0], q[1], Math.atan2(X.dir[1], X.dir[0]));
  // a Pumper on a call, its siren on, routed down that street (as Traffic.dispatch routes a unit by the GPS)
  const lane = G.lanes[cn.from], { v, brain } = driver(gtm, 'pumper', lane.id, Math.max(10, lane.len - 160), [lane.id, X.id], { lane: X.id, s: X.len - 60 }, true);
  let entered = null, atLine = 0, firstStop = null;
  for (let t = 0; t < 60 && entered === null; t += .25) {
    game.advance(.25);
    if (brain.here.k === 'conn' && brain.here.id === cn.id) entered = t;
    if (v.speed < 1 && brain.here.k === 'lane' && brain.here.id === lane.id) { atLine += .25; firstStop ??= t; }
  }
  assert.ok(entered !== null && entered < 30, `the Pumper (siren ${brain.siren}) stood ${atLine} s at ${cn.region}'s line (from ${firstStop} s, cause '${brain.cause}') and was not in after 60 s; the hauler it waits behind moved ${Math.hypot(left.x - q[0], left.y - q[1]).toFixed(0)} u`);
});
