// M5's acceptance (PLAN.md 8.9, 8.10 and the AutoPlayer core of 8.20) on Lowtown in play: the traffic, the crowd, the
// emergency services and the Marching Mimes, headless. The 10-minute soaks run in test:full (tests/full/city-soak.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, engineGlobal } from '../harness.mjs';
import { citySoak } from '../city-soak.mjs';

const play = async (poi, q = {}) => { const g = await loadGame({ hash: '#play/' + poi, query: { seed: '1999', time: 'day', weather: 'clear', ...q } }); g.game.advance(3); return g; };
const nearest = (C, P, n, f = () => true) => C.members.filter(m => !m.ped.dead && f(m)).sort((a, b) => Math.hypot(a.ped.x - P.x, a.ped.y - P.y) - Math.hypot(b.ped.x - P.x, b.ped.y - P.y)).slice(0, n);
const listen = (BUS, names) => { const log = []; for (const n of names) BUS.on(n, e => log.push({ n, ...e }), 'world'); return log; };

test('90 s of Lowtown by day, the focus hopping its sights: no car in another, none stalled 20 s without a cause, no red run, the mean speed in its band, nothing spawned in sight, no ped stuck 15 s', async () => {
  const r = await citySoak({ secs: 90, seed: 1999, time: 'day', weather: 'clear' });
  assert.equal(r.overlaps, 0, 'cars inside each other: ' + JSON.stringify(r.overlapAt));
  assert.ok(r.maxStall < 20, `the longest stall without a cause: ${r.maxStall.toFixed(1)} s ${JSON.stringify(r.stallAt)}`);
  assert.equal(r.redRuns, 0, 'a calm driver on red: ' + JSON.stringify(r.redAt));
  assert.ok(r.meanSpeed > 20 && r.meanSpeed < 90, `the traffic's mean speed ${r.meanSpeed.toFixed(1)} u/s`);
  assert.equal(r.spawnsInside, 0, 'a car spawned inside the annulus: ' + JSON.stringify(r.insideAt));
  assert.equal(r.pedsInside, 0, 'peds spawned inside the annulus');
  assert.ok(r.worstStuck <= 15, `the longest a ped stood stuck: ${r.worstStuck} s ${JSON.stringify(r.stuckAt)}`);
  assert.ok(r.worstCrossWait <= 30, `the longest wait at a crossing: ${r.worstCrossWait} s (a signal's cycle is 30 s)`);
  assert.ok(r.maxCars >= 25 && r.maxPeds >= 80, `at the target densities: ${r.maxCars} cars, ${r.maxPeds} peds`);
});

test('the same seed gives the same city: traffic, crowd and services hash alike after 20 s, in ISO, TOP-DOWN and MODE 7', async () => {
  const run = async view => { const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear', view } }); game.advance(10); gtm.BUS.emit('crime', { type: 'shooting', x: gtm.crew.ped.x, y: gtm.crew.ped.y, by: gtm.crew.ped.id, victim: null, severity: 1 }); game.advance(10); return [...game.stateHash()]; };
  const iso = await run('iso');
  assert.deepEqual(await run('iso'), iso, 'the same run twice');
  assert.deepEqual(await run('top'), iso, 'TOP-DOWN');
  assert.deepEqual(await run('side7'), iso, 'MODE 7');
});

test('switching views mid-run (R3\'s cycle) and turning the camera leave the sim hash unchanged: the AutoPlayer driving across Lowtown', async () => {
  const seen = new Set(), run = async switches => {
    const { game, gtm, snap } = await loadGame({ hash: '#play/safehouse', query: { seed: '1999', time: 'day', weather: 'clear', auto: 'rats-hq' } });
    const p0 = [gtm.crew.ped.x, gtm.crew.ped.y];
    for (let t = 0; t < 24; t += .5) {
      if (switches && t % 4 === 2) seen.add(gtm.views.next());   // (ISO, TOP-DOWN, MODE 7, CHASE, ISO...)
      if (switches && t % 6 === 3) gtm.stage.turn(1);   // (ISO's yaw, MODE 7's rail)
      game.advance(.5);
    }
    const s = snap(), at = s.vehicle ? s.car || s.hero : s.hero;
    assert.ok(s.vehicle && Math.hypot(at[0] - p0[0], at[1] - p0[1]) > 300, `the AutoPlayer drove: ${JSON.stringify(p0)} -> ${JSON.stringify(at)} (${s.vehicle})`);
    return [...game.stateHash()];
  };
  assert.deepEqual(await run(true), await run(false));
  assert.deepEqual([...seen].sort(), ['chase', 'iso', 'side7', 'top'], 'every view was switched to');
});

test('a shot: the peds round it run away from it (of ten on the sidewalks 30-110 u off, those that flee are all farther off 2 s later, on average by 60 u and more)', async () => {
  const { game, gtm } = await play('greasy-spoke'), C = gtm.life.crowd, P = gtm.crew.ped, S = gtm.life.walks;
  const near = nearest(C, P, 10, m => !m.brain.follow);
  near.forEach((m, i) => { const a = i / near.length * Math.PI * 2, r = 30 + (i % 3) * 40, n = S.nearestEdge(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, 200); const [x, y] = S.along(n.e, n.d, 0); m.ped.place(x, y); m.brain.feet = !m.brain.rejoin(); });
  game.advance(.25);
  const d0 = new Map(near.map(m => [m, Math.hypot(m.ped.x - P.x, m.ped.y - P.y)]));
  gtm.BUS.emit('crime', { type: 'shooting', x: P.x, y: P.y, by: P.id, victim: null, severity: 1 });
  game.advance(.25);
  const fleeing = near.filter(m => m.brain.state === 'flee');
  assert.ok(fleeing.length >= 8, `${fleeing.length} of ${near.length} flee (the rest may stand back and phone it in)`);
  game.advance(1.75);
  const gain = fleeing.map(m => Math.hypot(m.ped.x - P.x, m.ped.y - P.y) - d0.get(m));
  assert.ok(gain.every(g => g > 10), 'every one is farther off: ' + gain.map(g => g.toFixed(0)));
  assert.ok(gain.reduce((a, g) => a + g, 0) / gain.length > 60, `on average ${(gain.reduce((a, g) => a + g, 0) / gain.length).toFixed(0)} u farther`);
});

test('a witness: an assault seen is phoned in (a report, then the police sent); killing or scaring the witnesses first cancels the call', async () => {
  { const { game, gtm } = await play('greasy-spoke'), P = gtm.crew.ped, log = listen(gtm.BUS, ['report', 'dispatch', 'onScene']);
    gtm.BUS.emit('crime', { type: 'assault', x: P.x, y: P.y, by: P.id, victim: null, severity: 1 });
    const crime = gtm.life.crowd.crimes.at(-1); game.advance(1);
    assert.ok(gtm.life.crowd.members.some(m => m.brain.crime === crime), 'someone saw it');
    game.advance(9);
    const rep = log.find(e => e.n === 'report'), dis = log.find(e => e.n === 'dispatch' && e.kind === 'police');
    assert.ok(rep && crime.reported, 'the report: ' + JSON.stringify(log));
    assert.ok(dis && dis.unit, 'the police sent: ' + JSON.stringify(log));
    game.advance(40); assert.ok(log.some(e => e.n === 'onScene' && e.kind === 'police'), 'the police on the scene'); }
  for (const how of ['kill', 'scare']) {
    const { game, gtm } = await play('greasy-spoke'), P = gtm.crew.ped, C = gtm.life.crowd, log = listen(gtm.BUS, ['report']);
    gtm.BUS.emit('crime', { type: how === 'kill' ? 'assault' : 'breakIn', x: P.x, y: P.y, by: P.id, victim: null, severity: 1 });
    const crime = C.crimes.at(-1); game.advance(1);
    const wit = C.members.filter(m => m.brain.crime === crime); assert.ok(wit.length, 'witnesses');
    for (const m of wit) gtm.combat.hurt(m.ped, { amount: how === 'kill' ? 999 : 1, kind: how === 'kill' ? 'bullet' : 'melee', by: P.id });
    game.advance(10);   // (what they saw is not phoned in; the killing of a witness is another crime, and may be)
    assert.ok(!log.some(e => e.crime === crime.type && e.x === crime.x && e.y === crime.y), `${how}: no report of it`); assert.ok(crime.cancelled && !crime.reported, `${how}: the call cancelled`);
  }
});

test('the services: a body brings the Medic (its paramedics kneel at it); a fire brings the Pumper, whose cannon puts cells out', async () => {
  { const { game, gtm } = await play('greasy-spoke'), P = gtm.crew.ped, S = gtm.life.services, log = listen(gtm.BUS, ['dispatch', 'onScene']);
    const m = nearest(gtm.life.crowd, P, 1)[0]; gtm.combat.hurt(m.ped, { amount: 999, kind: 'bullet', by: null });
    let knelt = false;
    for (let t = 0; t < 70 && !knelt; t += .5) { game.advance(.5); knelt = S.onFoot.some(f => f.task === 'work' && f.ped.clip === 'Fixing_Kneeling' && Math.hypot(f.ped.x - m.ped.x, f.ped.y - m.ped.y) < 20); }
    assert.ok(log.some(e => e.n === 'dispatch' && e.kind === 'medic' && e.unit), 'the Medic sent: ' + JSON.stringify(log));
    assert.ok(log.some(e => e.n === 'onScene' && e.kind === 'medic'), 'on the scene');
    assert.ok(knelt, 'a paramedic kneels at the body');
    game.advance(20); assert.ok(S.calls.every(c => c.kind !== 'medic' || c.state === 'done' || c.state === 'leaving'), 'and leaves: ' + JSON.stringify(S.stats())); }
  { const { game, gtm } = await play('greasy-spoke'), P = gtm.crew.ped, F = gtm.combat.fire, log = listen(gtm.BUS, ['dispatch', 'onScene']);
    let doused = 0; const douse = F.douse.bind(F); F.douse = (...a) => { const n = douse(...a); doused += n; return n; };
    F.add(P.x - 60, P.y + 40, 16, 1, 30, .5);
    for (let t = 0; t < 70 && !doused; t += .5) game.advance(.5);
    assert.ok(log.some(e => e.n === 'dispatch' && e.kind === 'fire' && e.unit), 'the Pumper sent: ' + JSON.stringify(log));
    assert.ok(log.some(e => e.n === 'onScene' && e.kind === 'fire'), 'on the scene');
    assert.ok(doused > 0, 'its cannon puts fire out'); }
});

test('a unit at its call stands with a car\'s room behind it, clear of the junction and the zebra; a driver enters a junction only with room past the zebra beyond it; a ped held at a curb goes another way', async () => {
  const { game, gtm } = await play('greasy-spoke'), T = gtm.life.traffic, G = gtm.life.graph, F = gtm.fleet, P = gtm.crew.ped, C = gtm.life.crowd;
  const far = (x, y) => Math.hypot(x - P.x, y - P.y), byNear = (a, b) => far(...a.a) - far(...b.a);
  // a call at a junction's mouth: the unit stops on a lane, its tail a car's length and more past where the lane is clear
  const L = G.lanes.filter(l => l.ground && l.clearS >= 30 && l.len > 250).sort(byNear)[0];
  const c = T.dispatch('cruiser', L.a[0], L.a[1], { kind: 'police', crew: ['mpd', 'mpd'], stop: 0 }); assert.ok(c, 'a unit sent');
  for (let t = 0; t < 60 && !c.duty.arrived; t += .25) game.advance(.25);
  assert.ok(c.duty.arrived, 'it gets there');
  const h = c.brain.here, lane = G.lanes[h.id], s = (h.s0 || 0) + c.brain.s;
  assert.equal(h.k, 'lane', 'it stands on a lane, not on a connector');
  assert.ok(s - c.v.hl >= lane.clearS + 60, `a car's room behind it: its tail ${(s - c.v.hl).toFixed(0)} u along, the lane clear of the junction from ${lane.clearS.toFixed(0)}`);
  assert.ok(lane.len - s > c.v.hl + 79, 'room ahead of it to go round it');
  // a car standing just past a lane's zebra, too near it for one more behind it: a driver at the line waits for room
  const cn = G.conns.filter(k => k.kind !== 'change' && k.region !== null && G.lanes[k.to].ground && G.lanes[k.to].clearS >= 30 && Math.hypot(G.lanes[k.to].a[0] - c.v.x, G.lanes[k.to].a[1] - c.v.y) > 400).sort((a, b) => byNear(G.lanes[a.to], G.lanes[b.to]))[0], X = G.lanes[cn.to];
  for (const o of [...F.vehicles]) if (o !== c.v && Math.hypot(o.x - X.a[0], o.y - X.a[1]) < 260) F.remove(o);
  // (a car in a queue there, someone at its wheel: a parked one, nobody's, is gone round, never waited for at the line)
  const put = s => { const q = G.pointOn(X, s), v = F.spawn('cortez', q[0], q[1], Math.atan2(X.dir[1], X.dir[0])); v.body.z = q[2]; v.ai = () => ({ throttle: 0, brake: 1, steer: 0, handbrake: true }); game.advance(1 / 120); return v; };
  const room = X.clearS + 2 * c.v.hl + 16, w = { fleet: F };   // (from the lane's start: where the tail of the car ahead must be)
  let v = put(room + 29 - 10); assert.ok(c.brain._exitFull(w, cn), `its tail ${(room - 10).toFixed(0)} u along: no room for a car clear of the zebra (${X.clearS.toFixed(0)}) behind it`);
  F.remove(v); v = put(room + 29 + 10); assert.ok(!c.brain._exitFull(w, cn), `its tail ${(room + 10).toFixed(0)} u along: room`);
  F.remove(v);
  // a car left standing on a crossing: a ped at its curb waits, then goes another way (no light is red 20 s)
  const e = gtm.life.walks.edges.filter(q => q.kind === 'cross' && !(q.region && q.region.signals === 'signal')).sort((a, b) => far(...[gtm.life.walks.nodes[a.a].x, gtm.life.walks.nodes[a.a].y]) - far(...[gtm.life.walks.nodes[b.a].x, gtm.life.walks.nodes[b.a].y]))[0];
  const A = gtm.life.walks.nodes[e.a], B = gtm.life.walks.nodes[e.b];
  for (const o of [...F.vehicles]) if (Math.hypot(o.x - (A.x + B.x) / 2, o.y - (A.y + B.y) / 2) < 120) F.remove(o);
  const car = F.spawn('cortez', (A.x + B.x) / 2, (A.y + B.y) / 2, Math.atan2(B.x - A.x, -(B.y - A.y)));   // (across the zebra's middle, along the road)
  const m = nearest(C, P, 1, q => !q.brain.follow && !q.ped.gang && q.ped.faction !== 'police')[0], b = m.brain;
  m.ped.place(A.x, A.y, 0); b.state = 'walk'; b.place(e, 0, 0, 1);
  b.react = () => false;   // (deaf to the street for this check: a crime seen nearby would send it off on its own)
  let waited = 0; for (; waited < 30 && b.edge === e && b.a <= 4; waited += .25) game.advance(.25);
  assert.ok(b.edge !== e, `it goes another way (still at the curb after ${waited} s)`);
  assert.ok(waited >= 1.5, `after a moment (${waited} s): a car standing still on the zebra is not waited for the full 20 s (D29: the curb stand-off)`);
  assert.ok(Math.hypot(car.x - (A.x + B.x) / 2, car.y - (A.y + B.y) / 2) < 4, 'the car still on the crossing');
});

test('the Marching Mimes: six in single file; hurt one and they all go for you; flatten all six with a vehicle: ENCORE!', async () => {
  const { game, gtm } = await play('palm-park'), C = gtm.life.crowd, t = C.troupes[0], P = gtm.crew.ped, log = listen(gtm.BUS, ['encore']);
  assert.equal(t.members.length, 6, 'six of them');
  game.advance(3);
  const ps = t.members.map(m => m.ped), gaps = ps.slice(1).map((p, i) => Math.hypot(p.x - ps[i].x, p.y - ps[i].y));
  assert.ok(gaps.every(g => g > t.gap * .6 && g < t.gap * 1.6), `single file, ${t.gap} apart: ${gaps.map(g => g.toFixed(0))}`);
  assert.ok(t.members.slice(1).every(m => m.brain.follow), 'each follows the one ahead');
  P.place(ps[2].x + 30, ps[2].y + 20); gtm.combat.hurt(ps[2], { amount: 5, kind: 'melee', by: P.id, dir: [1, 0] }); game.advance(.5);
  assert.ok(t.members.every(m => m.brain.state === 'fight' && m.brain.target === P), 'all six fight: ' + t.members.map(m => m.brain.state));
  for (const p of ps) gtm.combat.hurt(p, { amount: 999, kind: 'vehicle', by: P.id, dir: [1, 0] });
  game.advance(.5);
  assert.equal(log.length, 1, 'ENCORE once'); assert.equal(log[0].troupe, t.id);
});

test('the AutoPlayer core: it walks a short way on the sidewalks, and drives a long one (taking a car, the GPS route, out at the end)', async () => {
  { const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear', auto: 'safehouse' } }), A = gtm.auto, goal = gtm.city.poi('safehouse');
    const states = new Set(); for (let t = 0; t < 40 && !A.arrived; t += .25) { game.advance(.25); states.add(A.state); }
    assert.ok(A.arrived, `walked there: ${A.state}, ${Math.hypot(gtm.crew.ped.x - goal.x, gtm.crew.ped.y - goal.y).toFixed(0)} u off`);
    assert.ok(!states.has('drive'), 'on foot all the way'); }
  { const { game, gtm } = await loadGame({ hash: '#play/safehouse', query: { seed: '1999', time: 'day', weather: 'clear', auto: 'precinct' } }), A = gtm.auto, goal = gtm.city.poi('precinct');
    const states = new Set(); for (let t = 0; t < 180 && !A.arrived; t += .25) { game.advance(.25); states.add(A.state); }   // (M6: the gangs' fights and the police's calls slow the streets: D19)
    assert.ok(states.has('board') && states.has('drive'), 'took a car and drove: ' + [...states]);
    assert.ok(A.arrived, `got there: ${A.state}, ${Math.hypot(gtm.crew.ped.x - goal.x, gtm.crew.ped.y - goal.y).toFixed(0)} u off`); }
});

test('a gridlock: a ring of stopped drivers each waiting on the next is found, and the one with the lowest id creeps on (D22)', async () => {
  engineGlobal(); const { DriverBrain } = await import('../../src/motor/ai/driver.js');
  const ring = ids => { const cs = ids.map(id => ({ id, speed: 0, brain: null })); cs.forEach((c, k) => { c.brain = Object.assign(Object.create(DriverBrain.prototype), { v: c, id: c.id, leader: { v: cs[(k + 1) % cs.length] } }); }); return cs; };
  const [a] = ring([9, 4]); assert.equal(a.brain._ring(a.brain.leader), 4, 'two nose to nose: the lower id');
  const [x] = ring([5, 3, 7]); assert.equal(x.brain._ring(x.brain.leader), 3, 'three round a box');
  const [p, q] = ring([2, 6]); q.speed = 5; assert.equal(p.brain._ring(p.brain.leader), null, 'one of them moving: no gridlock');
  const [s, u] = ring([1, 8]); u.brain.leader = null; assert.equal(s.brain._ring(s.brain.leader), null, 'a queue that ends (at a light): no ring');
  const { TUNE } = await import('../../src/motor/core/tune.js'); assert.equal(TUNE.gridlock, 4, 'the knob');
});

test('a car nobody drives in the lane: a pass round it may run on through the box, and with none it is shoved aside (M8 part 4b)', async () => {
  engineGlobal(); const { DriverBrain } = await import('../../src/motor/ai/driver.js'), { TUNE } = await import('../../src/motor/core/tune.js');
  const brain = o => Object.assign(Object.create(DriverBrain.prototype), { siren: false, pass: null, blocked: 0, creepT: 0, ...o });
  const abandoned = { brain: null, driver: null }, driven = { brain: null, driver: {} }, unit = { brain: { parked: true }, driver: {}, duty: { out: true } };
  const b = brain({});
  assert.equal(b._throughBox(abandoned), true, 'round an abandoned car, through the box');
  assert.equal(b._throughBox(driven), false, 'not round a car somebody drives (the player stopped at a light)');
  assert.equal(b._throughBox(unit), false, 'a calm driver waits for a unit at its scene');
  assert.equal(brain({ siren: true })._throughBox(unit), true, 'an assertive one goes round it');
  const L = v => ({ v }), long = TUNE.gridlock * 4 + .1;
  assert.equal(brain({ blocked: long })._shoves(L(abandoned), true), true, 'stuck behind an abandoned car long enough: shoved');
  assert.equal(brain({ blocked: long })._shoves(L(driven), true), false, 'never a car somebody drives');
  assert.equal(brain({ blocked: 1 })._shoves(L(abandoned), true), false, 'not at once');
  assert.equal(brain({ blocked: long, pass: {} })._shoves(L(abandoned), true), false, 'not while going round it');
  assert.equal(brain({ blocked: long })._shoves(L({ ...abandoned, owner: 'mission' }), true), false, 'never a job\'s car (H4\'s roadblock: D27)');
});


test('a far car knocked off its line and wedged there is put back on its path after 8 s, and goes over to the far LOD (a truck turned across Dock Road had held a queue a thousand units long, for good)', async () => {
  const { game, gtm } = await play('greasy-spoke'), T = gtm.life.traffic, M = gtm.motor, fp = T.fp;
  const c = T.cars.find(q => q.v.kinematic && !q.duty && q.brain.path.length && q.brain.speed > 20 && !q.brain.leader && fp.d(q.v.x, q.v.y) > M.TUNE.fpFull + 80 && fp.d(q.v.x, q.v.y) < M.TUNE.fpSpawnIn - 60);
  assert.ok(c, 'a far car on the move, nobody ahead');
  const v = c.v, b = v.body, idle = M.makeIntent(); c.brain.update = () => M.clearIntent(idle);   // (its driver does nothing: wedged)
  v.kinematic = false; b.x -= Math.sin(b.heading) * 36; b.y += Math.cos(b.heading) * 36; b.heading += 1.3; b.u = b.v = 0;
  const off = () => { const e = c.brain.here, p = c.brain._point(e, c.brain._project(e, v.x, v.y)); return Math.hypot(p[0] - v.x, p[1] - v.y); };
  assert.ok(off() > 30, 'knocked 36 off its line');
  game.advance(6);
  assert.ok(!v.kinematic && off() > 30, 'still wedged at 6 s: no faster than WEDGED');
  game.advance(4);
  assert.ok(v.kinematic, 'back in the far LOD');
  assert.ok(off() < 2, `on its line again (${off().toFixed(1)} off)`);
});

test('a car the player got out of is towed once out of sight: one parked when the world was made back to its curb, another away; never a job\'s (the campaign\'s bot had left the Pumper across the courier\'s road for good)', async () => {
  const { game, gtm } = await play('greasy-spoke'), T = gtm.life.traffic, M = gtm.motor, F = gtm.fleet, P = gtm.crew.ped, BUS = gtm.BUS;
  const parked = F.vehicles.filter(v => v.home && v.cls === 'car' && !v.driver && Math.hypot(v.x - P.x, v.y - P.y) < 600).sort((a, b) => a.id - b.id)[0];
  assert.ok(parked, 'a car parked at a curb near the start');
  const home = { ...parked.home };
  const leave = (v, x, y) => { v.body.x = x; v.body.y = y; BUS.emit('vehicleExit', { vehicle: v.id, actor: P.id, seat: 0 }); };   // (driven there, and the player out of it)
  leave(parked, home.x + 60, home.y + 60);
  const loose = F.spawn('cortez', home.x + 140, home.y, 0); leave(loose, loose.x, loose.y);   // (no curb of its own: traffic's, a jacked one)
  const job = F.spawn('cortez', home.x + 220, home.y, 0, { owner: 'mission' }); leave(job, job.x, job.y);
  game.advance(4); assert.ok(F.vehicles.includes(loose) && Math.hypot(parked.x - home.x, parked.y - home.y) > 50, 'in sight: left where it stands');
  const far = M.roadsOf(gtm.city).walks.nearestNode(home.x + 1400, home.y, 600) || M.roadsOf(gtm.city).walks.nearestNode(home.x - 1400, home.y, 600);
  gtm.teleport(far.x, far.y); game.advance(14);
  assert.ok(Math.hypot(parked.x - home.x, parked.y - home.y) < 1 && F.vehicles.includes(parked), 'the parked one back at its curb');
  assert.ok(!F.vehicles.includes(loose), 'the other one towed away');
  assert.ok(F.vehicles.includes(job), 'a job\'s car stays');
  assert.ok(T.homed >= 1 && T.towed >= 1);
  const again = F.vehicles.filter(v => v.home && v !== parked && !v.driver)[0]; BUS.emit('vehicleExit', { vehicle: again.id, actor: P.id, seat: 0 }); BUS.emit('vehicleEnter', { vehicle: again.id, actor: P.id, seat: 0 });
  assert.equal(again.leftT, undefined, 'got back into: the tow\'s clock off');
});

test('a far car that runs past its goal on its way\'s last lane stops there, arrived: it never stands at the lane\'s end with its speed running on (a Medic braking for its stop behind a car had, and the soak\'s queue behind it stood for good)', async () => {
  const { game, gtm } = await play('greasy-spoke'), T = gtm.life.traffic, M = gtm.motor, fp = T.fp, G = gtm.life.graph;
  const c = T.cars.find(q => q.v.kinematic && !q.duty && q.brain.here && q.brain.here.k === 'lane' && G.lanes[q.brain.here.id].len > 200 && q.brain.s > 60 && q.brain.s < G.lanes[q.brain.here.id].len - 120 && fp.d(q.v.x, q.v.y) > M.TUNE.fpFull + 80 && fp.d(q.v.x, q.v.y) < M.TUNE.fpSpawnIn - 60);
  assert.ok(c, 'a far car mid-lane');
  const b = c.brain, lane = b.here.id, L = G.lanes[lane], s0 = b.s;
  b.reset(L, s0); b.setRoute([lane], { lane, s: s0 - 20 }); b.speed = 80;   // (its stop 20 behind it, the lane the end of its way)
  for (let k = 0; k < 6 * 120; k++) game.advance(1 / 120);
  assert.ok(b.arrived, 'arrived');
  assert.ok(c.v.speed < 1 && b.speed < 1, `stopped (${b.speed.toFixed(1)})`);
  assert.ok(b.s <= L.len + .01, `not run off its lane (${b.s.toFixed(0)} of ${L.len.toFixed(0)})`);
});

test('a traffic car despawned takes its crew with it: none left standing as a body nobody moves (a unit\'s crew, back to the traffic, had been; one pushed along Dock Road stood on the drawbridge, which never lifted again)', async () => {
  const { gtm } = await play('greasy-spoke'), T = gtm.life.traffic, CB = gtm.combat;
  const c = T.cars.find(q => !q.duty && q.driver && q.v.cls === 'car'); assert.ok(c, 'a traffic car');
  CB.add(c.driver);   // (as a released unit's crew are: combat bodies riding in it)
  assert.equal(T.clear(c.v.x, c.v.y, 4), 1, 'despawned');
  assert.ok(!CB.bodies.includes(c.driver), 'its driver gone with it');
});

test('a car its driver left on the drawbridge\'s span is towed, in sight too, once the gate has shut for a lift and it has stood there a minute; one the player left is not (one left there had held the bridge down for good, a stunt over it waiting)', async () => {
  const { game, gtm } = await play('greasy-spoke'), F = gtm.fleet, T = gtm.life.traffic, M = gtm.motor, B = gtm.bridges[0], BUS = gtm.BUS, P = gtm.crew.ped;
  const cx = (B.rect[0] + B.rect[2] + 1) * 8, cy = (B.rect[1] + B.rect[3] + 1) * 8, n = M.roadsOf(gtm.city).walks.nearestNode(cx + 160, cy + 160, 400);
  gtm.teleport(n.x, n.y); game.advance(1);
  assert.ok(Math.hypot(P.x - cx, P.y - cy) < 400, 'the bridge in sight');
  const mine = F.spawn('cortez', cx, cy, 0); BUS.emit('vehicleExit', { vehicle: mine.id, actor: P.id, seat: 0 });
  B.wait = 0; game.advance(80);
  assert.ok(F.vehicles.includes(mine) && B.phase === 'down' && B.gate, 'the player\'s own: left there, the bridge waiting on it');
  F.remove(mine);
  const left = F.spawn('cortez', cx, cy, 0); left.abandonT = T.t;   // (as traffic leaves one whose driver ran)
  game.advance(30); assert.ok(F.vehicles.includes(left) && B.phase === 'down', 'not yet a minute: there still');
  game.advance(40); assert.ok(!F.vehicles.includes(left), 'a minute on, the gate shut: towed');
  let t = 0; while (t < 30 && B.phase === 'down') { game.advance(1); t++; }
  assert.notEqual(B.phase, 'down', 'the span clear: the bridge lifts');
});
