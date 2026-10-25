// M4's accept tests (PLAN.md 8.8): getting in, getting out and carjacking from all four sides; a locked car's break-in;
// a bike mounted at once; a bail-out at speed; a tow joint stable for 60 s; chained explosions and a burning car's
// countdown; the L's train killing what stands on its track; knockdowns by closing speed; street furniture knocked
// over; a car sinking in deep water; the Loop gap's jump. Headless, through MOTOR's own modules and fixed steps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

const E = engineGlobal();
const M = await import('../../src/motor/index.js');
await import('../../src/game/vehicles/cortez.js');
await import('../../src/game/characters/crew.js');
const { def, get, Fleet, Ped, Combat, boardingFor, exitFor, standInCity, makeIntent, clearIntent, BUS, TUNE, truckParts, bikeParts } = M;
const dt = 1 / 120;
// stand-in content for the classes the fan-out fills (registered once; ids no game file uses)
if (!get('vehicleModels', 't-tow')) {
  def('vehicleModels', 't-tow', { name: 'Test Tow', class: 'tow', length: 80, width: 30, height: 32, ...truckParts({ length: 80, width: 30, height: 32, kind: 'tow' }) });
  def('vehicles', 't-tow', { name: 'Test Tow', model: 't-tow', role: 'service', tool: 'hook', handling: { mass: 2600, top: 200, accel: 90, brake: 420, grip: 380, steer: .45 }, spec: {} });
  def('vehicleModels', 't-bike', { name: 'Test Bike', class: 'bike', length: 30, width: 8, height: 14, ...bikeParts({ length: 30, height: 14 }) });
  def('vehicles', 't-bike', { name: 'Test Bike', model: 't-bike', seats: 1, handling: { mass: 200, top: 280, accel: 160, brake: 520, grip: 440, width: 8 }, spec: {} });
}
/** a flat yard 80 x 60 cells of road (walls round it), a stand-in city over it, a Combat world and a Fleet */
function yard(o = {}) {
  const w = 80, h = 60, map = new E.TileMap({ w, h, types: { 1: { h: 32, top: '#666', side: '#555' } } });
  map.fill(0, 0, w, 1, 1); map.fill(0, h - 1, w, 1, 1); map.fill(0, 0, 1, h, 1); map.fill(w - 1, 0, 1, h, 1);
  const city = standInCity(map, o.surface || (() => 'road')); if (o.props) city.props = o.props;
  const combat = new Combat({ map, city, fire: false }), fleet = new Fleet({ city, map, combat });
  return { map, city, combat, fleet };
}
const ped = (Y, x, y, o = {}) => Y.combat.add(new Ped({ x, y, faction: o.faction || 'crew', look: get('characters', 'dex').outfits[0], ...o }));
const idle = makeIntent();
/** step the world: every ped on an idle intent (or its own), the fleet, combat */
function step(Y, seconds, o = {}) {
  for (let t = 0; t < seconds; t += dt) {
    Y.fleet.update(dt, { intent: v => o.intent ? o.intent(v) : clearIntent(idle), peds: Y.combat.bodies, night: false });
    for (const p of Y.combat.bodies) p.update(dt, o.pedIntent ? o.pedIntent(p) : clearIntent(idle), { map: Y.map, city: Y.city, combat: Y.combat, fleet: Y.fleet });
    Y.combat.update(dt, {});
    if (o.until && o.until()) return t;
  }
  return seconds;
}
const SIDES = { front: [60, 0], rear: [-60, 0], left: [0, -40], right: [0, 40] };

test('getting in from all four sides: the ped walks to the nearest door, opens it, sits at the wheel; and gets out again', () => {
  for (const [side, [lx, ly]] of Object.entries(SIDES)) {
    const Y = yard(), v = Y.fleet.spawn('cortez', 600, 480, 0), [x, y] = v.toWorld(lx, ly), p = ped(Y, x, y);
    const events = []; const off = BUS.on('vehicleEnter', e => events.push(e));
    const plan = boardingFor(p, v, 0); assert.ok(plan, side + ': a plan'); assert.equal(plan.kind, 'enterCar');
    p.board(plan); const t = step(Y, 6, { until: () => v.driver === p });
    off();
    assert.equal(v.driver, p, `${side}: at the wheel (after ${t.toFixed(2)} s)`); assert.equal(p.seat.index, 0);
    assert.equal(events.length, 1, side + ': vehicleEnter once');
    assert.ok(t < 3, `${side}: in within 3 s (${t.toFixed(2)})`);
    // and out: the door's side, standing beside the car
    p.leave(exitFor(p, v)); step(Y, 2, { until: () => !p.boarding });
    assert.equal(v.driver, null, side + ': out of the seat'); assert.equal(p.seat, null);
    const [ex, ey] = v.toLocal(p.x, p.y); assert.ok(Math.abs(ey) > v.hw, `${side}: standing outside the car's side (${ex.toFixed(1)}, ${ey.toFixed(1)})`);
  }
});

test('carjacking from all four sides: the driver is yanked out and thrown down, the jacker takes the wheel; BUS carjack', () => {
  for (const [side, [lx, ly]] of Object.entries(SIDES)) {
    const Y = yard(), v = Y.fleet.spawn('cortez', 600, 480, .3), victim = ped(Y, 600, 480, { faction: 'civilian' }); v.sit(victim, 0);
    const [x, y] = v.toWorld(lx, ly), jacker = ped(Y, x, y), jacks = []; const off = BUS.on('carjack', e => jacks.push(e));
    const plan = boardingFor(jacker, v, 0); assert.equal(plan.kind, 'carjack', side + ': a jack');
    jacker.board(plan);
    let floored = false; const seen = () => { if (victim.floored || victim.vitals.down > 0) floored = true; };
    step(Y, 6, { until: () => { seen(); return v.driver === jacker; } }); step(Y, .1, { until: () => { seen(); return false; } });
    off();
    assert.equal(v.driver, jacker, side + ': the jacker drives'); assert.equal(victim.seat, null, side + ': the victim is out');
    assert.ok(floored, side + ': the victim went down'); assert.equal(jacks.length, 1);
    const [, vy] = v.toLocal(victim.x, victim.y); assert.ok(Math.abs(vy) > v.hw, side + ': the victim lies outside the car');
    step(Y, 3); assert.ok(!victim.floored && victim.vitals.down <= 0, side + ': and gets up');
  }
});

test('a locked police car takes a break-in first (TUNE.breakIn seconds, a crime); a bike is mounted at once', () => {
  const Y = yard(), v = Y.fleet.spawn('cortez', 600, 480, 0, { locked: true }), [x, y] = v.toWorld(0, -v.hw - 8), p = ped(Y, x, y), crimes = [];
  const off = BUS.on('crime', e => crimes.push(e.type));
  const plan = boardingFor(p, v, 0); assert.ok(plan.locked);
  p.board(plan); const t = step(Y, 6, { until: () => v.driver === p }); off();
  assert.equal(v.driver, p); assert.ok(t >= TUNE.breakIn, `slower than the break-in (${t.toFixed(2)} s)`); assert.ok(crimes.includes('breakIn'));
  assert.equal(v.locked, false, 'unlocked after');
  const b = Y.fleet.spawn('t-bike', 300, 300, 0), [bx, by] = b.toWorld(0, -10), r = ped(Y, bx, by), bp = boardingFor(r, b, 0);
  assert.equal(bp.kind, 'mount'); r.board(bp); const tb = step(Y, 3, { until: () => b.driver === r });
  assert.equal(b.driver, r); assert.ok(tb < .8, `mounted in ${tb.toFixed(2)} s`);
});

test('a rider sits at its seat\'s height: up on each bike\'s own saddle, a car\'s at 6, and the same as getting on ends as riding (HANDOFF L2)', async () => {
  await import('../../src/game/vehicles/sparrow.js'); await import('../../src/game/vehicles/vandal.js');
  for (const [id, h] of [['sparrow', 7], ['vandal', 8.2], ['t-bike', 14 * .82 - 3.6], ['cortez', 6]]) {
    const Y = yard(), v = Y.fleet.spawn(id, 300, 300, 0), [x, y] = v.toWorld(0, -(v.hw + 8)), p = ped(Y, x, y);
    p.board(boardingFor(p, v, 0)); let atEnd = null;
    step(Y, 6, { until: () => { if (!p.boarding && atEnd === null) atEnd = p.mover.z; return v.driver === p && !p.boarding; } });
    assert.equal(v.driver, p, id + ': aboard');
    step(Y, .5);
    assert.ok(Math.abs(p.mover.z - (v.z + h)) < 1e-9, `${id}: the rider at ${p.mover.z.toFixed(2)}, its seat ${(v.z + h).toFixed(2)}`);
    assert.ok(Math.abs(atEnd - p.mover.z) < 1e-9, `${id}: getting on ended at ${atEnd.toFixed(2)}, riding at ${p.mover.z.toFixed(2)}`);
  }
});

test('getting out above the bail-out speed is a dive roll: the ped ends clear, the car rolls on and stops by itself', () => {
  const Y = yard(), v = Y.fleet.spawn('cortez', 300, 480, 0), p = ped(Y, 300, 480); v.sit(p, 0);
  v.body.u = 160; const plan = exitFor(p, v); assert.equal(plan.kind, 'bailOut');
  p.leave(plan); step(Y, 1.2, { until: () => !p.boarding });
  assert.equal(p.seat, null); assert.ok(Math.hypot(p.x - v.x, p.y - v.y) > v.hw + 6, 'clear of the car');
  step(Y, 6); assert.ok(v.speed < 1, 'the empty car came to a stop: ' + v.speed.toFixed(1));
});

test('a tow joint stays stable for 60 s of driving round a loop: the link never stretches wild, nothing blows up', () => {
  const Y = yard(), truck = Y.fleet.spawn('t-tow', 300, 480, 0), car = Y.fleet.spawn('cortez', 300 - 40 - 29 - 8, 480, 0), d = ped(Y, 300, 480); truck.sit(d, 0);
  const j = Y.fleet.tow(truck, car); assert.ok(j, 'hooked'); assert.equal(car.body.lifted, 'front');
  const W = [[900, 480], [1000, 300], [700, 160], [300, 200], [200, 600], [600, 820], [1000, 700]]; let wp = 0, maxV = 0, bad = 0;
  const drive = makeIntent();
  step(Y, 60, { intent: v => {
    if (v !== truck) return clearIntent(idle);
    let [tx, ty] = W[wp % W.length]; if (Math.hypot(tx - truck.x, ty - truck.y) < 80) { wp++; [tx, ty] = W[wp % W.length]; }
    const err = Math.atan2(Math.sin(Math.atan2(ty - truck.y, tx - truck.x) - truck.heading), Math.cos(Math.atan2(ty - truck.y, tx - truck.x) - truck.heading));
    const I = clearIntent(drive); I.steer = E.clamp(err * 2, -1, 1); I.throttle = Math.abs(err) > .8 ? .35 : .75; return I;
  }, until: () => { maxV = Math.max(maxV, car.speed); if (!isFinite(car.x) || !isFinite(j.length) || Math.abs(j.length - j.rest) > j.rest * .8 + 12) bad++; return false; } });
  assert.equal(bad, 0, 'the link stayed within its stretch');
  assert.ok(j.on && truck.towing === j, 'still hooked after 60 s');
  assert.ok(maxV < 260, 'the towed car never ran away: ' + maxV.toFixed(1));
  assert.ok(wp >= 3, 'it drove the loop: ' + wp + ' waypoints');
  // the hook lets go on ○
  const tap = makeIntent(); step(Y, dt / 2, { intent: v => { if (v !== truck) return clearIntent(idle); const I = clearIntent(tap); I.tap.fire = true; return I; } });
  assert.equal(truck.towing, null); assert.equal(car.body.lifted, null);
});

test('chained explosions: a car blown up sets off the cars beside it; a burning car goes up TUNE.burnTime later', () => {
  const Y = yard(), cars = [0, 1, 2].map(i => Y.fleet.spawn('cortez', 300 + i * 66, 480, 0)), far = Y.fleet.spawn('cortez', 300, 800, 0), destroyed = [];
  const off = BUS.on('vehicleDestroyed', e => destroyed.push(e.vehicle));
  Y.fleet.explode(cars[0], 'test'); step(Y, 3);
  assert.ok(cars.every(c => c.wrecked), 'all three in a row went up: ' + cars.map(c => c.damage.state).join(' '));
  assert.ok(!far.wrecked, 'the far one did not');
  assert.equal(destroyed.length, 3);
  const c = Y.fleet.spawn('cortez', 900, 300, 0); c.damage.hit(90); assert.equal(c.damage.state, 'burning');
  const t = step(Y, 8, { until: () => c.wrecked }); off();
  assert.ok(c.wrecked && Math.abs(t - TUNE.burnTime) < .1, `it burned ${t.toFixed(2)} s, then went up`);
});

test('the L: a train runs its loop, stops at its stations, and kills a body standing on its track', () => {
  const Y = yard(), line = Y.fleet.addLine({ points: [[200, 300], [1100, 300], [1100, 320], [200, 320]], z: 0, radius: 10, stations: [{ name: 'A', at: [700, 300] }] }, [{ s: 100, cars: 2, carLength: 84, id: 'L1' }]);
  const tr = Y.fleet.trains[0], p = ped(Y, 450, 300, { faction: 'civilian' }); let stopped = false;
  step(Y, 20, { until: () => { if (tr.state === 'stop') stopped = true; return stopped && p.dead; } });
  assert.ok(p.dead, 'the body on the track is dead'); assert.ok(stopped, 'it stopped at the station');
  assert.ok(line.length > 1800);
});

test('a fast car knocks a ped down and hurts it; a slow one pushes it aside unhurt', () => {
  const Y = yard(), fast = Y.fleet.spawn('cortez', 300, 480, 0), a = ped(Y, 420, 480, { faction: 'civilian' }); fast.body.u = 170;
  step(Y, 1.2); assert.ok(a.vitals.health < 100, 'hurt: ' + a.vitals.health.toFixed(0)); assert.ok(a.vitals.down > 0 || a.floored || a.dead, 'knocked down');
  const Z = yard(), slow = Z.fleet.spawn('cortez', 300, 480, 0), b = ped(Z, 350, 480, { faction: 'civilian' }); slow.body.u = 20;
  step(Z, 1.5, { intent: v => { const I = clearIntent(makeIntent()); I.throttle = .1; return I; } });
  assert.equal(b.vitals.health, 100, 'unhurt'); const [, ly] = slow.toLocal(b.x, b.y); assert.ok(b.x > 300 + slow.hl || Math.abs(ly) > slow.hw, 'pushed clear of the car');
});

test('street furniture: a fast car knocks a lamp down and drives on; a hydrant bursts', () => {
  const lamp = { kind: 'lamp', x: 520, y: 480, z: 0 }, hyd = { kind: 'hydrant', x: 520, y: 600, z: 0 };
  const Y = yard({ props: [lamp, hyd] });
  for (const [p, top] of [[lamp, 44], [hyd, 14]]) { const [s] = Y.map.addSolids([{ x: p.x, y: p.y, z: 0, top, hx: 1.5, hy: 1.5, prop: p, breakable: true }]); p.solidRef = s; }
  const v = Y.fleet.spawn('cortez', 360, 480, 0); v.body.u = 160;
  step(Y, 1.6); assert.ok(lamp.broken, 'the lamp is down'); assert.ok(v.x > 530 && v.speed > 50, `the car drove on through it (${v.x.toFixed(0)}, ${v.speed.toFixed(0)} u/s: an empty car coasts on a touch of brake)`);
  assert.ok(lamp.solidRef.top <= 2, 'and no longer stands in the way');
  const w = Y.fleet.spawn('cortez', 360, 600, 0); w.body.u = 120; step(Y, 1.6);
  assert.ok(hyd.broken && hyd.broken.spray > 0, 'the hydrant bursts');
  const slow = yard({ props: [{ kind: 'lamp', x: 520, y: 480, z: 0 }] }), L2 = slow.city.props[0]; const [s2] = slow.map.addSolids([{ x: 520, y: 480, z: 0, top: 44, hx: 1.5, hy: 1.5, prop: L2, breakable: true }]); L2.solidRef = s2;
  const c = slow.fleet.spawn('cortez', 440, 480, 0); c.body.u = 25; step(slow, 1.5);
  assert.ok(!L2.broken, 'a crawling car just stops at the lamp');
});

test('a land vehicle in deep water sinks; its driver swims to the nearest dry ground, and the car goes', () => {
  const Y = yard({ surface: (cx) => cx >= 40 ? 'deep' : 'road' }), v = Y.fleet.spawn('cortez', 40 * 16 + 30, 480, 0), d = ped(Y, 0, 0); v.sit(d, 0);
  step(Y, TUNE.sinkTime + .3); assert.ok(v.sunk, 'sunk'); assert.equal(d.seat, null, 'out'); assert.ok(d.x < 40 * 16, 'on dry ground: ' + d.x.toFixed(0));
  step(Y, 3); assert.ok(!Y.fleet.vehicles.includes(v), 'and the car is gone');
});

test('Lowtown: the Loop gap\'s open end: a car driven off it flies, lands below and keeps going', async () => {
  const { buildCity } = M; await import('../../src/game/districts/lowtown/styles.js'); await import('../../src/game/districts/lowtown/landmarks.js'); await import('../../src/game/districts/lowtown/district.js');
  const city = buildCity('lowtown'), fleet = new Fleet({ city }), v = fleet.spawn('cortez', 27 * 16, 91.5 * 16, Math.PI);   // (on the stub, heading west for its end)
  v.body.z = 64; let air = false, landed = false, minZ = 1e9;
  const drive = makeIntent();
  for (let t = 0; t < 4; t += dt) {
    fleet.update(dt, { intent: () => { const I = clearIntent(drive); I.throttle = 1; return I; }, peds: [] });
    if (v.body.airborne) air = true; if (air && !v.body.airborne) landed = true; minZ = Math.min(minZ, v.body.z);
    if (!v.driver) { const p = new Ped({ x: v.x, y: v.y }); v.sit(p, 0); }
  }
  assert.ok(air, 'it left the deck'); assert.ok(landed, 'and landed'); assert.ok(minZ < 2, 'on the street below: ' + minZ.toFixed(1));
  assert.ok(v.x < 16 * 16, 'beyond the stub\'s end: ' + (v.x / 16).toFixed(1));
});

test('in play, through the real bindings: E at a parked car gets in, W drives it, E gets out; the city\'s cars sleep', async () => {
  const { loadGame, holdCode } = await import('../harness.mjs');
  const { game, gtm, snap } = await loadGame({ hash: 'play', query: { time: 'day', traffic: '0' } });   // (the bindings and the parked cars under test: no traffic)
  game.advance(.2);
  const F = gtm.fleet, p = gtm.crew.ped, v = F.near(p.x, p.y, 3000).find(q => q.cls === 'car');
  assert.ok(F.vehicles.length > 30, 'Lowtown parks its cars: ' + F.vehicles.length);
  const [x, y] = v.toWorld(0, -v.hw - 14); gtm.teleport(x, y); game.advance(1.5);
  assert.ok(F.awake <= 2, 'parked cars sleep: ' + F.awake + ' awake');
  holdCode(game, 'KeyE', 1 / 30); game.advance(1.5);
  const a = snap(), car = p.seat && p.seat.vehicle; assert.ok(car && a.vehicle === car.def.id, 'in a car');
  assert.ok(Math.hypot(car.x - v.x, car.y - v.y) < 140, 'the one beside us (or its neighbour)');
  for (const o of F.near(car.x, car.y, 220)) if (o !== car) F.remove(o);   // (the bindings are under test, not the parking: the road ahead cleared)
  const x0 = car.x, y0 = car.y; holdCode(game, 'KeyW', 1.2);
  assert.ok(Math.hypot(car.x - x0, car.y - y0) > 60, 'it drove: ' + Math.hypot(car.x - x0, car.y - y0).toFixed(0));
  holdCode(game, 'KeyS', 2); game.advance(.5);
  holdCode(game, 'KeyE', 1 / 30); game.advance(1.5);
  assert.equal(snap().vehicle, null, 'out again');
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});

test('Lowtown parks every vehicle wholly on the road, out of the junctions and from under the ramps: none is shoved in play\'s first second', async () => {
  const { loadGame } = await import('../harness.mjs');
  const { game, gtm } = await loadGame({ hash: 'play', query: { time: 'day' } });
  const F = gtm.fleet, city = gtm.city, T = city.T, land = F.vehicles.filter(v => v.body && v.cls !== 'boat' && v.cls !== 'heli');
  const at = new Map(land.map(v => [v, [v.x, v.y]])); game.advance(1);
  for (const v of land) {
    assert.ok(M.onRoad(city, v.x, v.y, v.heading, v.hl, v.hw), `${v.def.id} at (${(v.x / T).toFixed(1)}, ${(v.y / T).toFixed(1)}) stands off the road or in a junction`);
    const [x, y] = at.get(v); assert.ok(Math.hypot(v.x - x, v.y - y) < 1, `${v.def.id} was moved ${Math.hypot(v.x - x, v.y - y).toFixed(0)} u`);
  }
  const medic = land.find(v => v.def.id === 'medic'), H = city.poi('hospital');
  if (medic) assert.ok(Math.hypot(medic.x - H.x, medic.y - H.y) < 20 * T, 'the Medic waits by the hospital');
});

test('a bike crashing into a wall throws its rider; a car rolled over in the air lands on its roof and burns', () => {
  const Y = yard(), b = Y.fleet.spawn('t-bike', 300, 480, Math.PI), r = ped(Y, 300, 480); b.sit(r, 0); b.body.u = 220;   // (west, into the yard's wall)
  step(Y, 2, { intent: v => { const I = clearIntent(makeIntent()); if (v === b) I.throttle = 1; return I; }, until: () => !r.seat });
  assert.equal(r.seat, null, 'thrown off'); assert.ok(r.vitals.health < 100, 'and hurt');
  const Z = yard(), c = Z.fleet.spawn('cortez', 600, 480, 0); c.body.launch(260, 3.6);   // (.87 s in the air: half a turn)
  step(Z, 3, { until: () => c.body.flipped });
  assert.ok(c.body.flipped, 'on its roof'); assert.equal(c.damage.state, 'burning');
  step(Z, TUNE.burnTime + .5); assert.ok(c.wrecked, 'and it went up');
});

test('a car bomb: armed when its fitter gets out; the next driver\'s throttle sets it off; a remote one on detonate()', () => {
  const Y = yard(), v = Y.fleet.spawn('cortez', 600, 480, 0, { mods: { bomb: 'ignition' } }), me = ped(Y, 600, 480), mark = ped(Y, 600, 520, { faction: 'civilian' });
  v.sit(me, 0); me.leave(exitFor(me, v)); step(Y, 1.5, { until: () => !me.boarding });
  assert.ok(v.bombArmed, 'armed on getting out'); me.place(900, 900);
  v.sit(mark, 0); step(Y, 2, { intent: q => { const I = clearIntent(makeIntent()); if (q === v) I.throttle = 1; return I; }, until: () => v.wrecked });
  assert.ok(v.wrecked, 'the ignition set it off'); assert.ok(mark.dead, 'its driver with it');
  const w = Y.fleet.spawn('cortez', 300, 300, 0, { mods: { bomb: 'remote' } }); Y.fleet.armBomb(w, me.id);
  assert.ok(Y.fleet.detonate(w)); step(Y, .5); assert.ok(w.wrecked, 'the remote set it off');
});

test('getting out where the driver\'s door is blocked uses the door across; a boat is only left beside dry ground', () => {
  const Y = yard(), v = Y.fleet.spawn('cortez', 600, 480, 0), p = ped(Y, 600, 480); v.sit(p, 0);
  const left = exitFor(p, v), clearOf = (x, y) => y > 480;   // (everything left of the car "blocked")
  assert.equal(left.door.side, -1, 'the driver\'s own door by default');
  const across = exitFor(p, v, clearOf); assert.equal(across.door.side, 1, 'the door across when the driver\'s is blocked');
  p.leave(across); step(Y, 2, { until: () => !p.boarding }); assert.ok(p.y > 480 + v.hw, 'out on the right: ' + p.y.toFixed(1));
});

test('mods and tools: nitro, an oil slick, a mine, the roof MG, the water cannon, the tow hook on ○', () => {
  const press = (v, f) => q => { const I = clearIntent(makeIntent()); if (q === v) f(I); return I; };
  // nitro: the same launch with a charge burning is quicker to 150
  const t150 = nitro => { const Y = yard(), v = Y.fleet.spawn('cortez', 200, 480, 0, { mods: { nitro: 1 } }), d = ped(Y, 200, 480); v.sit(d, 0); let first = true;
    return step(Y, 6, { intent: press(v, I => { I.throttle = 1; if (nitro && first) { I.tap.nitro = true; first = false; } }), until: () => v.speed >= 150 }); };
  const plain = t150(false), boosted = t150(true);
  assert.ok(boosted < plain * .85, `nitro: ${boosted.toFixed(2)} s against ${plain.toFixed(2)} s to 150`);
  // oil: dropped behind, a following car crossing it loses its grip
  { const Y = yard(), v = Y.fleet.spawn('cortez', 400, 480, 0, { mods: { oil: 1, weapon: 'oil' } }), d = ped(Y, 400, 480); v.sit(d, 0);
    step(Y, dt, { intent: press(v, I => { I.tap.fire = true; }) });
    assert.equal(Y.fleet.slicks.length, 1); const s = Y.fleet.slicks[0];
    assert.ok(Y.fleet.world.surface(s.x, s.y, 0) < .3, 'the slick\'s grip'); assert.equal(v.mods.oil, 0); }
  // a mine: armed after a moment, it goes off under the next car over it
  { const Y = yard(), v = Y.fleet.spawn('cortez', 400, 480, 0, { mods: { mines: 1, weapon: 'mines' } }), d = ped(Y, 400, 480); v.sit(d, 0);
    step(Y, dt, { intent: press(v, I => { I.tap.fire = true; }) }); const m = Y.fleet.mines[0]; assert.ok(m, 'a mine down');
    const victim = Y.fleet.spawn('cortez', m.x - 140, m.y, 0); victim.body.u = 150; step(Y, 3, { until: () => victim.damage.health < victim.damage.max * .5 });
    assert.ok(victim.damage.health < victim.damage.max * .5, 'the mine hurt the car over it: ' + victim.damage.health.toFixed(0)); }
  // the roof MG: bullets out ahead
  { const Y = yard(), v = Y.fleet.spawn('cortez', 300, 480, 0, { mods: { roofMG: true } }), d = ped(Y, 300, 480); v.sit(d, 0); const target = ped(Y, 600, 480, { faction: 'civilian' });
    step(Y, 1.5, { intent: press(v, I => { I.down.fire = true; }) }); assert.ok(target.vitals.health < 100, 'the target ahead was hit'); }
  // the water cannon (a pumper's tool): it knocks a ped over and puts a fire out
  { def('vehicles', 't-pump', { name: 'Test Pumper', model: 't-tow', role: 'fire', tool: 'cannon', handling: { mass: 4000, top: 180, accel: 70 }, spec: {} });
    const Y = yard(); Y.combat.fire = new M.Fire(Y.city); const v = Y.fleet.spawn('t-pump', 300, 480, 0), d = ped(Y, 300, 480); v.sit(d, 0);
    const man = ped(Y, 400, 480, { faction: 'civilian' }); Y.combat.fire.add(460, 480, 12, 1, 6);
    let down = false; step(Y, 1, { intent: press(v, I => { I.down.fire = true; }), until: () => { if (man.vitals.down > 0 || man.floored) down = true; return false; } });
    assert.ok(down, 'knocked over'); assert.ok(Y.combat.fire.heatAt(460, 480) === 0, 'the fire is out'); }
  // the hook: ○ backs onto the car behind
  { const Y = yard(), truck = Y.fleet.spawn('t-tow', 400, 480, 0), d = ped(Y, 400, 480); truck.sit(d, 0); const car = Y.fleet.spawn('cortez', 400 - 40 - 4 - 29 - 6, 480, 0);
    step(Y, dt / 2, { intent: press(truck, I => { I.tap.fire = true; }) });
    assert.ok(truck.towing && truck.towing.car === car, 'hooked on ○'); }
});

test('an empty car broadside across a car\'s way stands its ground on its handbrake; shoved (a driver it blocks shoves it, M8 part 4c), it gives as a pushed car does', () => {
  const run = shove => {
    const Y = yard(), blocker = Y.fleet.spawn('cortez', 40 * 16, 30 * 16, Math.PI / 2), pusher = Y.fleet.spawn('cortez', 40 * 16 - 52, 30 * 16, 0);   // (its flank square across the pusher's nose)
    const me = ped(Y, pusher.x, pusher.y); pusher.sit(me, 0); step(Y, .5);   // (settled: the empty one on its handbrake)
    const x0 = blocker.x, I = makeIntent();
    if (shove) { blocker.shoved = 3; Y.fleet.wake(blocker); }
    step(Y, 3, { intent: v => { clearIntent(I); if (v === pusher) I.throttle = v.speed < 18 ? .5 : 0; return I; } });
    return blocker.x - x0;
  };
  const held = run(false), gave = run(true);
  assert.ok(held < 6, `on its handbrake it barely moves: ${held.toFixed(1)} u`);
  assert.ok(gave > 20, `shoved, it slides out of the way: ${gave.toFixed(1)} u`);
});

test('a helicopter is flown (HANDOFF L4): landed it waits; the climb lifts it, the pedals push it, the stick yaws it; let down it settles; left only on the ground', async () => {
  await import('../../src/game/vehicles/skycam.js');
  const Y = yard(), v = Y.fleet.spawn('skycam', 400, 400, 0), [x, y] = v.toWorld(0, -(v.hw + 8)), p = ped(Y, x, y);
  step(Y, 1); assert.ok(v.body.landed && v.z === 0, 'it stands landed on its pad: z ' + v.z);
  p.board(boardingFor(p, v, 0)); step(Y, 6, { until: () => v.driver === p && !p.boarding }); assert.equal(v.driver, p, 'aboard by its door');
  const fly = f => v2 => { const I = clearIntent(makeIntent()); if (v2 === v) f(I); return I; };
  step(Y, 3, { intent: fly(I => { I.down.handbrake = true; }) });
  assert.ok(!v.body.landed && v.z > 100, 'R1 climbs: z ' + v.z.toFixed(0));
  assert.equal(exitFor(p, v), null, 'never left in the air');
  const z0 = v.z, x0 = v.x, h0 = v.heading; step(Y, 2, { intent: fly(I => { I.throttle = 1; }) });
  assert.ok(v.x - x0 > 100 && Math.abs(v.z - z0) < 1, `R2 pushes it on along its heading at its height: x +${(v.x - x0).toFixed(0)}, z ${v.z.toFixed(0)}`);
  step(Y, 1, { intent: fly(I => { I.steer = 1; }) }); assert.ok(v.heading - h0 > 1, 'the stick yaws it: ' + (v.heading - h0).toFixed(2));
  step(Y, 4); assert.ok(v.speed < 10, 'let go, the air slows it: ' + v.speed.toFixed(1));
  step(Y, 6, { intent: fly(I => { I.down.nitro = true; }), until: () => v.body.landed });
  assert.ok(v.body.landed && v.z === 0, 'L1 lets it down, and it settles: z ' + v.z.toFixed(1));
  const out = exitFor(p, v); assert.ok(out, 'got out on the ground'); p.leave(out); step(Y, 2, { until: () => !p.boarding }); assert.equal(p.seat, null);
  step(Y, 3); assert.ok(v.body.landed && v.z === 0, 'with nobody at the controls it stays put');
});
