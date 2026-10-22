// What FAN-OUT A2's heist-finale and gnomes workers found missing in MOTOR (docs/handoff/m8-a2/motor-requests.md,
// DECISIONS D22), each fix checked here on a fixture mission in Lowtown: a car spawned on the Loop's deck stands up
// there; a crew with no orders sits on its handbrake; a seated mission ped rides with its vehicle; the deliver hint
// keeps its tow and the kill hint its done; a blast on the street never chains into the deck's cars; a deck slab
// blocks the aim's line of sight; m.adopt lends a world car to a job and gives it back; the bank's CCTV on a loop;
// wanted.clear lifts the heat before the cap; m.hour, m.blast, m.shoo, m.truce, m.fund, m.pay, m.eta, m.byId; MODE 7's
// rail held by m.view; a racer's checkpoint with a height counted up there; a driver chasing a tagged actor; and the
// boathouse and the lighthouse standing on their piers. And the jobs' and extras' workers' requests: a route's point off
// the lanes, a goal's height, a seat moved over, a cruiser's siren, a kill hint's vehicle, a fire that never spreads, a
// ped the lock-on passes over, a landmark's ramps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, engineGlobal } from '../harness.mjs';
engineGlobal();
const { within } = await import('../../src/motor/mission/actors.js');

const DECK = [1960, 1240, 64];   // (the Loop's north leg, on the deck: H4's ON_DECK)
async function world(q = {}) {
  const g = await loadGame({ hash: '#play/safehouse', query: { seed: '1999', time: 'day', weather: 'clear', ...q } }); g.game.advance(1);
  const M = g.gtm.motor, C = g.gtm.career, R = C.R, P = () => g.gtm.crew.ped;
  // a fixture mission of one stage: setup(m) and a run that waits; the context back
  const fixture = (id, setup = () => {}, run = function* (m) { yield m.wait(600); }) => { M.defMission(id, { title: 'Fixture: ' + id, stages: [{ id: 's', setup, run }] }); C.startMission(id); g.game.advance(1 / 120); return R.m; };
  return { ...g, M, C, R, P, fixture };
}

test('a car spawned at a deck\'s point stands on the deck; a crew with no orders sits on its handbrake; a seated mission ped rides along', async () => {
  const g = await world(), { R } = g;
  const m = g.fixture('fx_deck', mm => {
    const v = mm.spawn.vehicle('cortez', mm.lane([DECK[0], DECK[1]], Math.PI, DECK[2]), { tag: 'up', heading: Math.PI, driver: 'saint-grunt' });
    mm.place(mm.spawn.ped('rat-grunt', [v.x, v.y], { tag: 'rider' }), { in: v, seat: 1 });
    mm.spawn.vehicle('cortez', mm.curb('greasy-spoke'), { tag: 'go', driver: 'saint-grunt', drive: { to: 'gnomes-hq', style: 'calm' } });
    mm.place(mm.spawn.ped('rat-grunt', mm.at('greasy-spoke'), { tag: 'passenger' }), { in: mm.one('go'), seat: 1 });
  });
  g.game.advance(2);
  const up = m.one('up');
  assert.ok(up.z > 56, 'on the deck (z ' + up.z.toFixed(1) + ')');
  assert.equal(R.actors.intentFor(up).down.handbrake, true, 'no orders: the handbrake on');
  const go = m.one('go'), p = m.one('passenger'); g.game.advance(6);
  assert.ok(Math.hypot(go.x - m.at('greasy-spoke')[0], go.y - m.at('greasy-spoke')[1]) > 40, 'the car drove off');
  assert.ok(Math.hypot(p.x - go.x, p.y - go.y) < go.hl + 8, 'its passenger with it (' + Math.round(Math.hypot(p.x - go.x, p.y - go.y)) + ' u)');
  assert.ok(Math.abs(p.z - (go.z + 6)) < 2, 'at a seated height');
});

test('the deliver hint keeps its tow, the kill hint its done; done counts a target before it dies', async () => {
  const g = await world(), { R } = g;
  let killed = false;
  const m = g.fixture('fx_hints', mm => { mm.spawn.vehicle('saint', mm.curb('greasy-spoke'), { tag: 'mark' }); mm.spawn.vehicle('hookline', mm.curb('safehouse'), { tag: 'truck' }); }, function* (mm) {
    yield mm.first([mm.deliver({ what: 'mark', to: 'gnomes-hq', tow: 'truck' }), mm.wait(.5)]);
    yield mm.kill('mark', { done: a => !!a.smashed }); killed = true; yield mm.wait(600);
  });
  assert.equal(R.objective.hint.kind, 'deliver'); assert.equal(R.objective.hint.tow, 'truck', 'the tow tag in the hint');
  g.game.advance(1);
  assert.equal(R.objective.hint.kind, 'kill'); assert.equal(typeof R.objective.hint.done, 'function', 'the done predicate in the hint');
  m.one('mark').smashed = true; g.game.advance(.1);
  assert.ok(killed, 'the target counted once done said so (alive and unburnt)');
});

test('a blast on the street never chains into the deck\'s cars over it; a deck slab blocks the aim\'s line from up there to the street', async () => {
  const g = await world(), { M } = g, F = g.gtm.fleet, city = g.gtm.city;
  const top = F.spawn('cortez', DECK[0], DECK[1], Math.PI), low = F.spawn('cortez', DECK[0] + 40, DECK[1], Math.PI);
  top.body.z = 64; F.wake(top); F.wake(low);
  g.gtm.combat.explosives.blast({ x: DECK[0] + 10, y: DECK[1], z: 6, damage: 80, splash: 56, by: null, source: 'test' });
  g.game.advance(1 / 60);
  assert.ok(low.chainT >= 0 || low.wrecked, 'the street car is set off');
  assert.ok(!(top.chainT >= 0) && !top.wrecked, 'the deck car is not');
  const deck = city.decks.find(d => d.heightAt(DECK[0], DECK[1]) !== null), shooter = { x: DECK[0], y: DECK[1] - 30, z: 64 }, below = { x: DECK[0], y: DECK[1] + 30, z: 0 };
  assert.ok(deck, 'the Loop is under the shooter');
  assert.equal(M.losClear(city.map, shooter, below), true, 'the walls alone let it through');
  assert.equal(M.losClear(city.map, shooter, below, city.decks), false, 'the deck\'s slab between');
});

test('m.adopt lends a world car to a job under a tag, never released by a retry, the world\'s again when it ends', async () => {
  const g = await world(), { C, R } = g, F = g.gtm.fleet;
  const car = F.vehicles.find(v => v.owner === 'world' && v.body && !v.seats.some(Boolean) && v.cls === 'car');
  const m = g.fixture('fx_adopt', mm => { mm.adopt(car, 'lent'); mm.failIf(mm2 => mm2.stageTime > .5, 'fixture'); });
  assert.equal(m.one('lent'), car); assert.equal(car.owner, 'mission');
  g.game.advance(1); assert.equal(R.state, 'failed'); C.retry ? C.retry() : R.retry(); g.game.advance(.1);
  assert.equal(R.actors.tagged('lent')[0], car, 'kept through the retry'); assert.ok(F.vehicles.includes(car));
  C.quit ? C.quit() : R.quit(); g.game.advance(.1);
  assert.equal(car.owner, 'world', 'the world\'s again'); assert.ok(F.vehicles.includes(car), 'and still in it');
});

test('the bank\'s CCTV on a loop sees nothing; m.wanted.clear drops the heat before it lifts the cap', async () => {
  const g = await world(), { M } = g;
  const m = g.fixture('fx_cctv', mm => { mm.interior('bank', 'front'); });
  g.game.advance(.5);
  const run = m.inside.run; run.loopCameras(true);
  for (const c of run.cameras) { const P = g.P(); P.place(c.x + Math.cos(c.base) * 40, c.y + Math.sin(c.base) * 40); }
  g.game.advance(2);
  assert.ok(run.cameras.every(c => !c.sees && c.mind.state === 'calm'), 'every camera blind');
  assert.equal(run.alarm, null, 'no alarm');
  m.outside(); g.game.advance(.5);
  m.wanted.cap(0); m.wanted.set(3);
  const stars = []; const un = g.gtm.BUS.on('wanted', e => stars.push(e.stars), 'global');
  m.wanted.clear(); g.game.advance(.1); un();
  assert.equal(m.stars, 0); assert.ok(!stars.some(s => s > 0), 'no star showed on the way out');
  assert.ok(M);
});

test('m.hour, m.blast, m.shoo, m.truce, m.fund and m.pay, m.eta, m.byId', async () => {
  const g = await world(), { R } = g;
  const m = g.fixture('fx_bits');
  m.time(21.5); assert.ok(Math.abs(m.hour - 21.5) < .01, 'the hour');
  const fund = m.fund; m.pay(-200, 'bribe'); assert.equal(m.fund, Math.max(0, fund - 200), 'paid out'); m.pay(200, 'refund');
  const eta = m.eta('greasy-spoke'); assert.ok(eta > 0 && eta < 120, 'the road\'s time to the diner (' + eta + ' s)');
  const b = m.blast([m.player.x + 200, m.player.y], { source: 'drum' }); assert.ok(b, 'a blast'); assert.equal(b.by, null, 'nobody\'s');
  m.truce('rats'); m.ally('gnomes'); assert.ok(g.gtm.life.gangs.allies.has('rats') && g.gtm.life.gangs.allies.has('gnomes'), 'the Rats sit it out, the Gnomes on side');
  const C = g.gtm.life.crowd, q = C.members.find(c => !c.ped.gang && !c.ped.patrol && !c.ped.dead);
  assert.ok(q, 'a passer-by'); assert.equal(m.byId(q.ped.id), q.ped, 'found by its id');
  assert.equal(m.shoo(q.ped.id), true, 'sent running');
  assert.equal(R.actors.count >= 0, true);
});

test('m.view(\'side7\', { heading }) holds MODE 7\'s rail that way, Auto-rail and the turns held off, till it is let go', async () => {
  const g = await world(), S = g.gtm.stage;
  const m = g.fixture('fx_rail');
  m.view('side7', { heading: 'east' });
  assert.equal(g.gtm.views.active, 'side7');
  assert.equal(S.side7.heading, 90, 'looking east');
  for (let i = 0; i < 400; i++) S.update(1 / 120, { vehicle: true, vel: [0, -200] });   // (driving north for over 3 s)
  assert.equal(S.side7.heading, 90, 'Auto-rail held off');
  assert.equal(S.turn(1), false, 'and the player\'s turn');
  m.view('side7');
  for (let i = 0; i < 400; i++) S.update(1 / 120, { vehicle: true, vel: [0, -200] });
  assert.equal(S.side7.heading, 0, 'let go: Auto-rail turns it north');
  m.view('side7', { heading: 270 }); g.C.quit ? g.C.quit() : g.R.quit(); g.game.advance(.1);
  assert.equal(S.railHold, null, 'the job\'s end lets it go');
});

test('a racer\'s checkpoint with a height counts up there; a driver chases a tagged actor', async () => {
  const g = await world(), { R } = g;
  const m = g.fixture('fx_race', mm => {
    const start = mm.lane([DECK[0], DECK[1]], Math.PI, 64);   // (westbound on the Loop's north leg, over Loop Avenue)
    mm.spawn.vehicle('zephyr', start, { tag: 'racer', heading: start.heading, driver: 'saint-grunt', drive: { race: [[1700, 1240, 64], [1400, 1240, 64]], laps: 1, style: 'race' } });
    const t = mm.spawn.vehicle('cortez', mm.lane([1000, 862], 0), { tag: 'quarry', driver: 'office', drive: { to: 'pixel-palace', style: 'calm' } });
    mm.spawn.vehicle('brute', mm.lane([760, 862], 0), { tag: 'hunter', driver: 'rat-grunt', drive: { chase: 'quarry' } });
    return t;
  });
  const racer = m.one('racer'), e = R.actors.list.find(q => q.a === racer);
  g.game.advance(30);
  assert.ok(racer.z > 56, 'the racer kept to the deck');
  assert.equal(e.drive.cp, 2, 'both checkpoints counted up there');
  assert.equal(within([1000, 1240, 64], 1000, 1236, 0, 48), false, 'a checkpoint on the deck is not passed on the avenue under it');
  assert.equal(within([1000, 1240, 64], 1000, 1236, 64, 48), true, 'up there it is');
  assert.equal(within([1000, 1240], 1000, 1236, 64, 48), true, 'one with no height counts at any');
  const hunter = m.one('hunter'), quarry = m.one('quarry');
  assert.ok(Math.hypot(hunter.x - quarry.x, hunter.y - quarry.y) < 260, 'the hunter on the quarry\'s tail (' + Math.round(Math.hypot(hunter.x - quarry.x, hunter.y - quarry.y)) + ' u)');
});

test('the boathouse and the lighthouse stand on their piers', async () => {
  const g = await world(), city = g.gtm.city, map = city.map;
  for (const id of ['boathouse', 'lighthouse']) {
    const lots = city.lots.filter(l => l.landmark && l.kind === 'building' && city.lots.some(p => p.kind === 'pier' && p.rect[0] <= l.rect[0] && p.rect[2] >= l.rect[2] && p.rect[1] <= l.rect[1] && p.rect[3] >= l.rect[3]));
    const near = lots.find(l => id === 'boathouse' ? l.rect[0] >= 144 && l.rect[1] < 140 : l.rect[1] >= 146);
    assert.ok(near, id + ': a building lot on its pier');
    const [x0, y0, x1, y1] = near.rect; let walls = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (map.heightAt((x + .5) * 16, (y + .5) * 16) > 20) walls++;
    assert.ok(walls >= (x1 - x0 + 1) * (y1 - y0 + 1) * .8, id + ': its walls stand (' + walls + ' cells)');
  }
});

test('a calm driver held by people about a crossing gives up its wide berth after TUNE.pedPatience, never a body\'s width (D22)', async () => {
  const g = await world(), M = g.M, T = M.TUNE;
  const v = g.gtm.fleet.vehicles.find(q => q.brain && !q.brain.parked && q.brain.p.calm && q.cls === 'car'), b = v.brain;
  assert.ok(v, 'a calm driver in the traffic');
  const S = [{ d: v.hl + 30, p: [v.x + 100, v.y, v.z || 0], j: 0, s: 0 }];
  const near = x => ({ pedsNear: () => [{ x: S[0].p[0], y: S[0].p[1] + x, z: 0 }] });
  b._onCross = () => true;   // (the sample on a zebra)
  b.pedT = 0;
  assert.notEqual(b._peds(near(v.hw + 10), S), null, 'patient: one 10 u beside its way on a crossing holds it');
  b.pedT = T.pedPatience * b.p.patience + .1;
  assert.equal(b._peds(near(v.hw + 10), S), null, 'out of patience: edged past');
  assert.notEqual(b._peds(near(v.hw + 3), S), null, 'but never past one in its way');
});

test('a fighter stuck on its way (a parked car between it and the sidewalk route) steps aside on its second try, one way then the other (D22)', async () => {
  const g = await world(), { M } = g, p = g.P();
  const F = new M.Fighter(p, { walks: M.roadsOf(g.gtm.city).walks, map: g.gtm.city.map, fleet: g.gtm.fleet });
  const I = M.makeIntent(), tx = p.x + 300, ty = p.y + 200, dt = 1 / 120;
  const hold = s => { let out = null; for (let t = 0; t < s; t += dt) out = F._go(dt, M.clearIntent(I), tx, ty, true, 'fx'); return out; };   // (the ped never moves: stuck)
  hold(.85); assert.ok(!(F.aside > 0), 'stuck once: a route by the sidewalks');
  hold(.85); assert.ok(F.aside > 0, 'stuck again: a step aside');
  const way = F.path && F.pi < F.path.length ? F.S.nodes[F.path[F.pi]] : { x: tx, y: ty }, d = [way.x - p.x, way.y - p.y], l = Math.hypot(d[0], d[1]);
  const m = F._go(dt, M.clearIntent(I), tx, ty, true, 'fx').move, k = F.asideK;
  assert.ok(Math.abs((m[0] * d[0] + m[1] * d[1]) / l) < 1e-6, 'square to its way');
  hold(.75); let t = 0; while (!(F.aside > 0) && t < 3) { hold(dt); t += dt; }   // (still stuck after the step: a route, then the next step aside)
  assert.ok(F.aside > 0 && F.asideK === -k, 'the next time the other way');
});

test('a police car whose crew is out on foot is parked to the traffic: drivers go round it, never queue behind it for good (D22)', async () => {
  const g = await world(), L = g.gtm.life, P = L.police;
  g.fixture('fx_cops'); L.wanted.set(1);
  let u = null; for (let t = 0; t < 40 && !u; t += .25) { g.game.advance(.25); u = P.units.find(q => q.car && q.car.brain && !q.gone); }
  assert.ok(u, 'a unit sent');
  P._crewOut(u);
  assert.equal(u.car.brain.parked, true, 'parked once its crew is out');
  assert.equal(u.car.v.brain, u.car.brain, 'the brain the traffic reads');
  const other = g.gtm.fleet.vehicles.find(v => v.brain && v !== u.car.v && !v.brain.parked);
  u.car.brain.cause = 'queue';   // (whatever it last stopped for)
  assert.equal(other.brain._queued(u.car.v), false, 'not a queue to wait in');
});

test('a leashed enemy gives up past its leash from where it was put and walks back; a fresh hurt turns it again (D22)', async () => {
  const g = await world(), { R, P } = g;
  const m = g.fixture('fx_leash', mm => { const q = mm.player; mm.spawn.ped('saint-grunt', [q.x + 420, q.y], { tag: 'b', role: 'enemy', attack: true, leash: 150, weapons: ['fists'] }); });
  const b = m.one('b'), e = R.actors.entry(b), home = [b.x, b.y], far = () => Math.hypot(b.x - home[0], b.y - home[1]);
  assert.ok(e.alerted, 'it comes for the player');
  let most = 0; for (let t = 0; t < 8; t += .1) { g.game.advance(.1); most = Math.max(most, far()); }
  assert.ok(most > 120 && most < 200, 'it came, as far as its leash (' + Math.round(most) + ' u)');
  g.game.advance(10);
  assert.ok(far() < 24 && !e.alerted, 'back at its post, calm (' + Math.round(far()) + ' u)');
  b.vitals.hit({ amount: 5, kind: 'test' }); g.game.advance(.2);
  assert.ok(e.alerted, 'hurt: it turns again'); assert.ok(P());
});

// (FAN-OUT A2's jobs and extras workers, DECISIONS D22: the rest checked here)
test('a route\'s point off the lanes counts once the driver stops as near as the lanes go; a goal with no height is the ground\'s, from up on the deck too (D22)', async () => {
  const g = await world(), { R } = g, G = g.M.roadsOf(g.gtm.city).graph, lane = id => G.lanes.find(L => L.id === id);
  const m = g.fixture('fx_offlane', mm => {
    const at = mm.lane('greasy-spoke'), c = Math.cos(at.heading), s = Math.sin(at.heading);   // (up the lane past the diner, 160 u short of it)
    mm.spawn.vehicle('cortez', { x: at.x - c * 160, y: at.y - s * 160, heading: at.heading }, { tag: 'tour', heading: at.heading, driver: 'saint-grunt', drive: { route: ['greasy-spoke', 'pixel-palace'], style: 'calm' } });
    const up = mm.lane([DECK[0], DECK[1]], Math.PI, DECK[2]);
    mm.spawn.vehicle('cortez', up, { tag: 'down', heading: up.heading, driver: 'saint-grunt', drive: { to: mm.curb('greasy-spoke') } });
  });
  const diner = m.at('greasy-spoke'), tour = R.actors.entry(m.one('tour')), down = R.actors.entry(m.one('down'));
  g.game.advance(.2);
  const goal = lane(down.brain.goal.lane);
  assert.ok(goal.ground, 'routed down to the street (' + goal.strip + '), not along the deck over it');
  let near = 1e9; for (let t = 0; t < 20 && tour.drive.cp < 1; t += .5) { g.game.advance(.5); near = Math.min(near, Math.hypot(diner[0] - m.one('tour').x, diner[1] - m.one('tour').y)); }
  assert.ok(tour.drive.cp >= 1 && near > 40, 'the diner\'s point counted from the lane outside it (' + Math.round(near) + ' u off at the nearest)');
  g.game.advance(3); assert.equal(tour.brain.arrived, false, 'and on to the next');
});

test('m.place moves a ped to another seat of the car it sits in; a scripted cruiser\'s siren; a kill hint\'s vehicle; m.fire that never spreads; a ped the lock-on passes over (D22)', async () => {
  const g = await world(), { R } = g, F = g.gtm.combat.fire;
  const m = g.fixture('fx_bits2', mm => {
    mm.spawn.vehicle('cortez', mm.curb('greasy-spoke'), { tag: 'car', driver: 'saint-grunt' });
    mm.spawn.vehicle('cruiser', mm.curb('pixel-palace'), { tag: 'cops', driver: 'mpd', drive: { to: 'safehouse', siren: true } });
    mm.spawn.ped('office', mm.at('safehouse'), { tag: 'victim', aimable: false });
  }, function* (mm) { yield mm.kill('car', { vehicle: 'cops' }); });
  const car = m.one('car'), d = car.driver;
  m.place(d, { in: car, seat: 1 });
  assert.equal(car.seats[1], d); assert.equal(car.seats[0], null); assert.equal(d.seat.index, 1, 'moved over to the passenger seat');
  g.game.advance(.5);
  const cops = m.one('cops');
  assert.equal(cops.siren, true, 'the siren on'); assert.equal(R.actors.entry(cops).brain.siren, true, 'and the brain drives as one');
  assert.equal(R.objective.hint.kind, 'kill'); assert.equal(R.objective.hint.vehicle, 'cops', 'the job\'s to be done from that one');
  const park = m.at('palm-park'), n0 = (m.fire(park, 16, 12, { spread: false }), F.count);
  let most = 0; for (let i = 0; i < 40; i++) { g.game.advance(.25); most = Math.max(most, F.count); }
  assert.ok(n0 > 0 && most <= n0, 'it burned where it was set, no further (' + n0 + ' cells, at most ' + most + ')');
  m.fire(park, 16, 12); let grew = 0; for (let i = 0; i < 40; i++) { g.game.advance(.25); grew = Math.max(grew, F.count); }
  assert.ok(grew > n0, 'the grass took the fire set the usual way (' + grew + ' cells)');
  const v = m.one('victim'), { pickLock } = await import('../../src/motor/combat/aim.js');
  assert.equal(v.aimable, false);
  const s = { x: v.x - 60, y: v.y, z: 0 }, thief = { x: v.x + 60, y: v.y, z: 0, hostile: false };
  assert.equal(pickLock(s, [1, 0], [v, thief], { toScreen: (x, y) => [x, y], range: 300 }), thief, 'the lock-on passes her over');
});

test('a landmark\'s ramps are terrain: folded into its district\'s decks, no lanes on them, nothing piled on them (D22)', async () => {
  const g = await world(), city = g.gtm.city, G = g.M.roadsOf(city).graph;
  const ramps = city.decks.filter(d => d.kind === 'ramp');
  assert.deepEqual([...ramps.map(d => d.id)], ['container-kicker', 'container-landing', 'car-park']);
  const strips = new Set(G.lanes.map(L => String(L.strip).split(':')[0]));
  for (const d of ramps) assert.ok(!strips.has(d.id), d.id + ': no lanes');
  const top = city.decks.find(d => d.id === 'car-park'), x = 16.5 * city.T, y = 95.5 * city.T, q = city.deckAt(x, y);
  assert.ok(q && q.deck === top && Math.abs(q.z - 48) < 1, 'a car can stand on the car park\'s top deck (' + (q ? q.deck.id + ' z ' + q.z : 'none') + ')');
});

test('a gang\'s own job: its members leave the player be while it runs, however they stand with the player; lifted when it ends (D27)', async () => {
  const g = await world(), { M, C, R } = g, G = g.gtm.life.gangs;
  G.add('saints', -80 - G.get('saints'), 'a test');
  M.defMission('fx_saints_job', { title: 'Fixture: a Saints job', gang: 'saints', stages: [{ id: 's', setup() {}, *run(m) { yield m.wait(600); } }] });
  C.startMission('fx_saints_job'); g.game.advance(1 / 120);
  assert.equal(G.stance('saints'), 'hostile', 'the Saints hate the player');
  assert.ok(G.allies.has('saints'), 'but not during their own job');
  assert.ok(!G.allies.has('rats') && !G.allies.has('gnomes'), 'the other gangs as they were');
  R.quit(); g.game.advance(1 / 120);
  assert.ok(!G.allies.has('saints'), 'the truce lifted when the job ends');
});

test('m.standDown: the city\'s own service of a kind takes no calls while the job runs (Firefighter\'s engine on call), again once it ends (D27)', async () => {
  const g = await world(), { R } = g, S = g.gtm.life.services, P = g.P();
  g.fixture('fx_standdown', mm => mm.standDown('fire'));
  assert.ok(S.held.has('fire'), 'stood down');
  assert.equal(S.call('fire', P.x + 120, P.y), null, 'a fire nearby: no engine sent');
  R.quit(); g.game.advance(1 / 120);
  assert.ok(!S.held.has('fire'), 'on duty again when the job ends');
  assert.ok(S.call('fire', P.x + 120, P.y), 'and an engine comes');
});

test('m.clearTraffic: the traffic within r of a point taken off the road at once (a race\'s grid), never a unit on a call (D27)', async () => {
  const g = await world(), T = g.gtm.life.traffic, P = g.P();
  T.fill(30, { focus: [P.x, P.y] }); g.game.advance(.5);
  const near = () => T.cars.filter(c => Math.hypot(c.v.x - P.x, c.v.y - P.y) < 400);
  assert.ok(near().length > 0, 'traffic about (' + near().length + ')');
  const unit = near()[0]; unit.duty = { kind: 'police' };
  const m = g.fixture('fx_cleartraffic');
  const n = m.clearTraffic([P.x, P.y], 400);
  assert.ok(n > 0, n + ' taken off');
  assert.ok(near().length === 1 && near()[0] === unit, 'none left but the unit on its call');
  assert.ok(!g.gtm.fleet.vehicles.some(v => v.traffic && v !== unit.v && Math.hypot(v.x - P.x, v.y - P.y) < 400), 'gone from the city, not parked');
});

test('m.clearSpot: a car left standing on a spot (nobody in it, not the job\'s) towed at once; one with someone in it, the job\'s own and one off the spot stay (D27)', async () => {
  const g = await world(), F = g.gtm.fleet, P = g.P(), A = [P.x + 120, P.y], B = [P.x - 120, P.y];
  const left = F.spawn('cortez', A[0] + 4, A[1], .3), off = F.spawn('cortez', A[0], A[1] + 60, 0), held = F.spawn('cortez', B[0] + 2, B[1] + 2, 0);
  held.sit(new g.M.Ped({ x: held.x, y: held.y }), 0);
  let own = null;
  const m = g.fixture('fx_clearspot', mm => { own = mm.spawn.vehicle('cortez', [B[0], B[1] + 36], { tag: 'own', heading: 0 }); });
  g.game.advance(.5); m.place(own, [B[0] - 4, B[1] + 20], { heading: 0 }); g.game.advance(.1);
  assert.equal(m.clearSpot(A, 10), 1, 'one towed'); assert.ok(!F.vehicles.includes(left), 'the one left on the spot: gone'); assert.ok(F.vehicles.includes(off), 'one off the spot: stays');
  assert.equal(m.clearSpot(B, 14), 0, 'none towed'); assert.ok(F.vehicles.includes(held), 'someone at the wheel: stays'); assert.ok(F.vehicles.includes(own), 'the job\'s own: stays');
});
