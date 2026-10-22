// The bot's manners (M8 part 4c, D22): the AutoPlayer looks before its unstick moves (it never backs into someone
// behind it or swings into someone ahead) and, at a star or more, pulls away from a cop on foot at its door; the mission
// bot's fighter holds its fire while someone not in the fight stands in its line of fire. Unit-level, with stand-ins.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

engineGlobal();
const { AutoPlayer } = await import('../../src/motor/ai/autoplayer.js');
const { Fighter } = await import('../../src/motor/ai/fighter.js');
const { makeIntent } = await import('../../src/motor/sim/intent.js');

// a car at (100, 100) facing east (+x), stopped; someone standing at (x, y)
const car = () => ({ x: 100, y: 100, z: 0, heading: 0, hl: 28, hw: 13, speed: 0, body: { vx: 0, vy: 0, heading: 0 } });
const someone = (x, y, o = {}) => ({ x, y, z: 0, dead: false, floored: false, seat: null, ...o });
const auto = people => Object.assign(Object.create(AutoPlayer.prototype), { I: makeIntent(), t: 0, _w: { pedsNear: () => people } });

test('the AutoPlayer looks before it unsticks: never backed into someone behind, never swung into someone ahead', () => {
  const v = car(), behind = auto([someone(60, 102)]), ahead = auto([someone(140, 98)]), clear = auto([someone(100, 160)]);
  assert.equal(behind._footIn(v, -1), true); assert.equal(behind._footIn(v, 1), false);
  assert.equal(ahead._footIn(v, 1), true); assert.equal(clear._footIn(v, 1) || clear._footIn(v, -1), false, 'someone off to the side is no matter');
  behind.round = { t: 0, side: 1 }; const b = behind._round(1 / 120, v);
  assert.ok(!(b.brake > 0), 'not backed: someone behind'); assert.ok(behind.round.t >= 1.1, 'on to the swing out instead');
  ahead.round = { t: 1.2, side: 1 }; const a = ahead._round(1 / 120, v);
  assert.ok(!(a.throttle > 0) && a.down.handbrake, 'held: someone ahead'); assert.ok(ahead.round.wait > 0);
  clear.round = { t: 0, side: 1 }; assert.ok(clear._round(1 / 120, v).brake > 0, 'backed off when nobody is there');
  ahead.esc = { to: [400, 100], t: 0, slow: 0, back: 0, side: 1 }; assert.ok(!(ahead._escape(1 / 120, v).throttle > 0), 'the off-road escape holds too');
});

test('the AutoPlayer wanted: a cop on foot in its way is no one to wait for, and with a cop closing on the car nobody is', () => {
  const v = car(), cop = (x, y) => someone(x, y, { faction: 'police' }), at = (people, stars, cops = []) => Object.assign(auto(people), { _w: { pedsNear: () => people, wanted: { stars }, police: { cops: cops.map(ped => ({ ped })) } } });
  assert.equal(at([cop(140, 98)], 0)._footIn(v, 1), true, 'no stars: a cop is someone like anyone');
  assert.equal(at([cop(140, 98)], 1)._footIn(v, 1), false, 'wanted: the cop ahead is not waited for');
  assert.equal(at([someone(140, 98)], 1)._footIn(v, 1), true, 'wanted, nobody closing in: a bystander still is');
  assert.equal(at([someone(140, 98)], 1, [cop(110, 130)])._footIn(v, 1), false, 'a cop 30 off the car: nobody is');
  assert.equal(at([someone(140, 98)], 1, [cop(160, 160)])._footIn(v, 1), true, 'one 85 off: the bystander is');
  const R = at([someone(140, 98)], 1, [cop(110, 130)]); R.round = { t: 1.2, side: 1 };
  assert.ok(R._round(1 / 120, v).throttle > 0, 'the swing out goes on, a cop at the door');
});

test('the AutoPlayer at a star: a cop on foot near its stopped car is found (the pull-away); none, or one in a car, is not', () => {
  const v = car(), A = auto([]), cop = (x, y, o = {}) => ({ ped: someone(x, y, o) });
  assert.ok(A._copAt(v, { cops: [cop(130, 120)] }), 'a cop at the door');
  assert.equal(A._copAt(v, { cops: [cop(400, 400)] }), null, 'one far off');
  assert.equal(A._copAt(v, { cops: [cop(130, 120, { seat: {} })] }), null, 'one at the wheel of his car');
  assert.equal(A._copAt(v, null), null);
});

test('the AutoPlayer pulls away only from a cop coming for the door: close, or closing on it; one holding off at range shooting is not (god mode: backed and swung out round and round, never off)', () => {
  const v = car(), A = auto([]), cop = (x, y, vx = 0, vy = 0) => ({ ped: someone(x, y, { mover: { vx, vy } }) });
  assert.ok(A._copComing(v, { cops: [cop(120, 115)] }), 'at the door (25 off)');
  assert.ok(A._copComing(v, { cops: [cop(160, 140, -30, -20)] }), 'running at the car from 72 off');
  assert.equal(A._copComing(v, { cops: [cop(150, 140)] }), null, 'standing 64 off (shooting): no');
  assert.equal(A._copComing(v, { cops: [cop(150, 140, 30, 20)] }), null, 'backing off: no');
  assert.equal(A._copComing(v, { cops: [cop(200, 200, -40, -40)] }), null, 'beyond 80: no');
  assert.equal(A._copComing(v, null), null);
});

test('the bot\'s fighter holds its fire while someone not in the fight is in the line of fire; a foe there is fair game', () => {
  const me = someone(0, 0), tgt = someone(200, 0);
  const F = people => Object.assign(Object.create(Fighter.prototype), { ped: me, careful: true, pedsNear: () => people });
  assert.equal(F([someone(80, 4)])._peopleIn(tgt), true, 'a bystander in the way');
  assert.equal(F([someone(80, 40)])._peopleIn(tgt), false, 'one off to the side');
  assert.equal(F([someone(-60, 0)])._peopleIn(tgt), false, 'one behind the shooter');
  assert.equal(F([someone(260, 0)])._peopleIn(tgt), false, 'one beyond the target');
  assert.equal(F([someone(80, 4, { hostile: true })])._peopleIn(tgt), false, 'a foe in the way');
  assert.equal(F([someone(80, 4, { dead: true })])._peopleIn(tgt), false);
});

test('the AutoPlayer wedged: 5 s pressed going nowhere with nothing to wait for, then off the road round it; never at a light, in a queue, or moving', () => {
  const run = (b, move = 0, secs = 6) => { const A = auto([]), v = car(); let n = 0; for (let t = 0; t < secs; t += .25) { v.x += move; if (A._wedged(.25, v, b)) n++; } return n; };
  assert.equal(run({ cause: null, leader: null }), 1, 'pressed into a corner: once after 5 s');
  assert.equal(run({ cause: null, leader: null }, 0, 4.5), 0, 'not before');
  assert.equal(run({ cause: null, leader: null }, .5), 1, 'rocking a few units is still wedged');
  assert.equal(run({ cause: null, leader: null }, 3), 0, 'moving on');
  assert.equal(run({ cause: 'signal', leader: null }), 0, 'at a red light');
  assert.equal(run({ cause: null, leader: { gap: 20, speed: 0 } }), 0, 'in a queue');
  const A = auto([]), v = Object.assign(car(), { z: 40 }); let n = 0; for (let t = 0; t < 6; t += .25) if (A._wedged(.25, v, { cause: null, leader: null })) n++;
  assert.equal(n, 0, 'never off a deck');
});

test('the AutoPlayer stalled: 15 s no nearer and no farther on is a stall, counted; the count starts again once the last is left 300 behind', () => {
  const A = auto([]), v = car(); let n = 0;
  for (let t = 0; t < 31; t += .25) if (A._stalled(.25, v, 900)) n++;
  assert.equal(n, 2, 'two stalls in 31 s standing'); assert.equal(A.prog.n, 2);
  for (let k = 0; k < 3; k++) { v.x += 90; A._stalled(.25, v, 900); }
  assert.equal(A.prog.n, 2, 'moving on 270: the same jam still');
  v.x += 90; A._stalled(.25, v, 900);
  assert.equal(A.prog.n, 0, '360 past it: a fresh count');
  const B = auto([]), w = car(); for (let t = 0; t < 16; t += .25) B._stalled(.25, w, 900 - t * 3);
  assert.equal(B.prog.n, 0, 'creeping nearer the goal is no stall');
});

test('the AutoPlayer\'s car: an empty one parked before a carjack, unless the occupied one is much nearer', () => {
  const v = (id, x, o = {}) => ({ id, x, y: 100, z: 0, speed: 0, wrecked: false, locked: false, cls: 'car', owner: null, def: { role: 'civilian' }, seats: [o.driver ? { dead: false } : null], ...o });
  const pick = cars => Object.assign(auto([]), { tried: new Set(), gaveUp: new Map(), fleet: { near: () => cars } })._pickCar({ x: 0, y: 100 });
  assert.equal(pick([v(1, 50, { driver: true }), v(2, 90)]).id, 2, 'the empty one 40 farther');
  assert.equal(pick([v(1, 20, { driver: true }), v(2, 130)]).id, 1, 'the empty one 110 farther: the carjack');
  assert.equal(pick([v(1, 50, { driver: true })]).id, 1, 'only an occupied one: taken');
  assert.equal(pick([v(1, 50, { driver: true }), v(2, 90, { locked: true })]).id, 1, 'a locked one is no choice');
});

test('the mission bot, the Eye up: under a deck out of its sight (the road under a high cell), the stretch away from the police; seen there 3 s, another', async () => {
  const { MissionBot } = await import('../../src/motor/ai/missionbot.js');
  // a deck high over a road at x 20-21 (cells), y 0-60; one low cell (a ramp's foot) and one over a sidewalk too
  const cells = []; for (let cy = 0; cy <= 60; cy++) cells.push({ cx: 20, cy, z0: 64, z1: 64 });
  cells.push({ cx: 30, cy: 5, z0: 10, z1: 20 }, { cx: 40, cy: 5, z0: 64, z1: 64 });
  const city = { T: 16, decks: [{ cells }], surfaceAt: (cx) => (cx === 40 ? 'walk' : 'road') };
  const B = Object.assign(Object.create(MissionBot.prototype), { city, t: 0 });
  const v = { x: 20 * 16, y: 30 * 16, z: 0 }, unit = (x, y) => ({ car: { v: { x, y } } });
  const q = B._cover(v, { wanted: { seen: true }, police: { units: [unit(v.x, v.y - 200)] } });
  assert.equal(B.covers.length, 61, 'the road under the high cells only');
  assert.ok(q && q[1] > v.y, 'the stretch away from the unit to the north');
  B.t = 1; assert.equal(B._cover(v, { wanted: { seen: true }, police: { units: [] } }), q, 'kept while it is driven to');
  const W = { wanted: { seen: true }, police: { units: [unit(v.x, v.y - 200)] } }, at = { x: q[0], y: q[1], z: 0 };
  B.t = 2; B._cover(at, W); B.t = 4; B._cover(at, W); B.t = 6; const r = B._cover(at, W);
  assert.ok(r !== q && Math.hypot(r[0] - q[0], r[1] - q[1]) >= 160, 'seen there 3 s: another stretch, away from it');
});

test('the player\'s fighter, a car in its line of fire: steps aside, and when 3 s of that clear nothing, round it toward the target (two behind a parked truck had kept it stepping to and fro while they shot)', () => {
  const ped = { x: 100, y: 100, z: 0, mover: { facing: 0 }, inv: { current: 'snub38', spec: () => ({ projectile: 'bullet', range: 400, spread: 2 }), select() {}, loaded: () => true, rounds: () => ({ mag: 6, total: 30 }), list: () => ['snub38'] } };
  const tgt = { x: 250, y: 100, z: 0 }, run = careful => {   // (150 off: within the gun's reach, 400 x the profile's .45)
    const F = new Fighter(ped, { careful }); F.gun = 'snub38'; F._lineTo = () => 'car';
    const moves = []; for (let t = 0; t < 4; t += 1 / 60) { const I = F.attack(1 / 60, makeIntent(), tgt); moves.push([I.move[0], I.move[1]]); }
    return moves;
  };
  const toward = m => m[0] > .5 && Math.abs(m[1]) < .5, sideways = m => Math.abs(m[0]) < .2 && Math.abs(m[1]) > .5;
  const c = run(true);
  assert.ok(c.slice(0, 170).every(sideways), 'the first 3 s: steps to one side and the other');
  assert.ok(c.slice(190).every(toward), 'then: round it, toward the target');
  assert.ok(run(false).every(sideways), 'a gang\'s or a cop\'s fighter (not careful) keeps to its steps aside');
});

test('the mission bot to a point to be reached in a vehicle (m.reach inVehicle): it holds the vehicle, never out of it in a jam; on foot or on a plain goto, not', async () => {
  const { MissionBot } = await import('../../src/motor/ai/missionbot.js');
  const B = Object.assign(Object.create(MissionBot.prototype), { t: 0, I: makeIntent() }); B._go = (dt, p, x, y, o) => o;
  const seated = { x: 0, y: 0, seat: { vehicle: {} } }, foot = { x: 0, y: 0, seat: null }, h = o => ({ kind: 'goto', at: [500, 0], radius: 70, ...o });
  assert.equal(B._goto(1 / 60, seated, null, h({ inVehicle: true }), {}).hold, true, 'in a car, to be got there in one: held');
  assert.equal(B._goto(1 / 60, seated, null, h({}), {}).hold, false, 'a plain goto: a car given up in a jam, as before');
  assert.equal(B._goto(1 / 60, foot, null, h({ inVehicle: true }), {}).hold, false, 'on foot: nothing to hold yet');
});

test('the AutoPlayer\'s give-ups outlast a new goal for a minute: a car out of reach is not taken again at once (S1 had walked at one Zephyr by Club Chrome for 40 minutes)', () => {
  const A = Object.assign(Object.create(AutoPlayer.prototype), { t: 0, tried: new Set(), gaveUp: new Map() });
  const near = [{ id: 7, x: 120, y: 100, speed: 0, seats: [], def: { cls: 'car' } }, { id: 8, x: 300, y: 100, speed: 0, seats: [], def: { cls: 'car' } }];
  A.fleet = { near: () => near };
  A._giveUp(7); assert.ok(A.shuns(7));
  A.tried.clear();   // (what goto() does with a new goal)
  assert.ok(A.shuns(7), 'still shunned after the goal changed');
  A.t = 59; assert.ok(A.shuns(7)); A.t = 61; assert.ok(!A.shuns(7), 'free again a minute later');
  A._giveUp(undefined); assert.ok(!A.shuns(undefined), 'no id: nothing');
});

test('the AutoPlayer\'s counts are a trip\'s: boxed in, the unstick moves, the walk to a door, the hops start at nothing with a new goal, car or place (a long-lived one had got out at its first box once three were behind it anywhere, and never walked straight after its first hop)', () => {
  const A = Object.assign(Object.create(AutoPlayer.prototype), { t: 0, I: makeIntent(), tried: new Set(), gaveUp: new Map(), brain: null });
  Object.assign(A, { boxed: 3, boxT: 4, exitHeld: 7, round: { t: 1, side: 1 }, _jam: { to: 5 }, _boardT: 19, skip: 2 });
  A.goto(100, 100, { keep: true });
  assert.deepEqual([A.boxed, A.boxT, A.exitHeld, !!A.round, !!A._jam, A._boardT, A.skip], [3, 4, 7, true, true, 19, 2], 'the same trip (a goal that moved): kept');
  A.goto(500, 100);
  assert.deepEqual([A.boxed, A.boxT, A.exitHeld, A.round, A._jam, A._boardT, A.skip], [0, 0, 0, null, null, 0, 0], 'a new trip: afresh');
  // the walk's clock is the car's: 15 s at one, then another car starts at nothing
  const car = (id, x) => ({ id, x, y: 0, speed: 0, wrecked: false, heading: 0, hw: 8, hl: 20, model: { doors: [] }, seats: [] });
  const p = { x: 0, y: 0, z: 0 }; Object.assign(A, { S: { live: [], nearestNode: () => null }, city: { T: 16, walkable: () => true, map: { solids: [] } }, last: [0, 0], stuck: 0 });
  A.car = car(1, 60); for (let k = 0; k < 60; k++) A._board(.25, p);
  assert.equal(A._boardT, 15);
  A.car = car(2, 80); A._board(.25, p);
  assert.equal(A._boardT, .25, 'another car: its own clock');
  // the hops at one place to walk to are that place's: walking somewhere else, straight there again when the way is open
  Object.assign(A, { skip: 2, stuck: 0, dodge: 0 }); A._walkTo(.25, p, 80, 0, 'car2'); assert.equal(A.skip, 2, 'the same place: the hops kept');
  A.stuck = 0; A._walkTo(.25, p, 200, 0, 'goal'); assert.equal(A.skip, 0, 'another place: afresh');
});
