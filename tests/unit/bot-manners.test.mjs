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

test('the mission bot, the Eye up: under a deck out of its sight (a lane under a high stretch), the stretch away from the police; under any deck, held there; seen there 3 s, another, away from there', async () => {
  const { MissionBot } = await import('../../src/motor/ai/missionbot.js');
  // a deck high over x 320-352, y 0-976, and a low one (a ramp's foot) at x 480-496; lanes north-south under each and in the open
  const decks = [{ heightAt: (x, y) => (x >= 320 && x < 352 && y >= 0 && y < 976 ? 64 : x >= 480 && x < 496 && y >= 64 && y < 96 ? 15 : null) }];
  const lane = (id, x, len) => ({ id, x, len }), lanes = [lane(0, 336, 976), lane(1, 488, 160), lane(2, 600, 976)];
  const roads = { graph: { lanes, pointOn: (L, s) => [L.x, s, 0], nearestLane: () => null } };   // (no lane near: by the crow's way)
  const B = Object.assign(Object.create(MissionBot.prototype), { city: { T: 16, decks }, roads, t: 0, I: makeIntent() });
  const v = { x: 336, y: 480, z: 0 }, unit = (x, y) => ({ car: { v: { x, y } } });
  const K = B._cover(v, { wanted: { seen: true }, police: { units: [unit(v.x, v.y - 200)] } });
  assert.equal(B.covers.length, 37, 'every 24 along the lane under the high stretch only, 48 in from its ends (stopped short, still under it)');
  assert.ok(B.covers.every(q => q[0] === 336 && q[1] >= 48 && q[1] <= 928), 'on that lane');
  assert.ok(K && K.at[1] > v.y && !K.hid, 'the stretch away from the unit to the north');
  B.t = 1; assert.equal(B._cover({ x: 600, y: 480, z: 0 }, { wanted: { seen: false }, police: { units: [] } }), K, 'kept while it is driven to');
  assert.equal(K.hid, false, 'in the open: not hidden');
  const at = { x: 336, y: 300, z: 0 }; B.t = 2; B._cover(at, { wanted: { seen: false }, police: { units: [] } });
  assert.equal(K.hid, true, 'under the deck short of the spot: hidden there');
  const car = { ...at, speed: 0, body: { vx: 0, vy: 0, heading: 0 } }, p = { seat: { vehicle: car } };
  const I = B._evade(1 / 60, p, null, { wanted: { stars: 3, seen: false }, police: { units: [], heli: {} } });
  assert.ok(I.down.handbrake && !I.throttle, 'and held there (the Eye sees nothing under a deck)');
  B.t = 60; B._cover(at, { wanted: { seen: false }, police: { units: [] } }); assert.equal(B.cover, K, 'hidden: kept past a minute');
  const W = { wanted: { seen: true }, police: { units: [unit(at.x, at.y - 200)] } };
  B.t = 61; B._cover(at, W); B.t = 63; const R = B._cover(at, W);
  assert.ok(R !== K && Math.hypot(R.at[0] - at.x, R.at[1] - at.y) >= 160, 'seen there 3 s: another stretch, away from it');
  B.t = 64; B._cover(at, W); assert.equal(R.hid, false, 'where it was seen is no hiding place: on to the next');
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

test('the mission bot to a vehicle off its level (up on a deck over it): far, driven to its level first, never out on the deck (S1\'s bot got out on the Loop over the Gnomes\' Brute below and walked the deck for good)', async () => {
  const { MissionBot } = await import('../../src/motor/ai/missionbot.js');
  const calls = [], A = { goal: null, state: 'drive', board(v) { calls.push(['board', v.id]); this.goal = { board: v }; return this; }, update: () => makeIntent() };
  const B = Object.assign(Object.create(MissionBot.prototype), { t: 0, I: makeIntent(), auto: A }); B._go = (dt, p, x, y, o) => { calls.push(['go', o.z]); return makeIntent(); };
  const brute = { id: 9, x: 712, y: 1144, z: 6 }, car = z => ({ x: 729, y: 1180, z }), p = z => ({ x: 729, y: 1180, z: z - 6, seat: { vehicle: car(z) } });
  B._board(1 / 60, p(70), brute, {});
  assert.deepEqual(calls, [['go', 6]], 'on the deck 40 u over it: driven to its level, not boarded');
  calls.length = 0; B.boardFor = null; B._board(1 / 60, p(6), brute, {});
  assert.deepEqual(calls, [['board', 9]], 'on its level, as near: to its door');
});

test('the AutoPlayer boxed in a fourth time gets out at street level only: up on a deck it goes round again (out there, a walk has no way down)', () => {
  const run = z => {
    const p = { x: 0, y: 0, z }, v = { id: 4, x: 0, y: 0, z, speed: 0, heading: 0, hw: 8, hl: 20, body: { vx: 0, vy: 0 } }; v.driver = p;
    const A = Object.assign(Object.create(AutoPlayer.prototype), { t: 0, I: makeIntent(), tried: new Set(), gaveUp: new Map(), boxed: 3, boxT: 4.9 });
    A.goal = { x: 2000, y: 0, z: null, stay: false, hold: false };
    A.brain = { v, cause: null, leader: { gap: 5, speed: 0, v: null }, pass: null, lost: false, arrived: false, dispose() {} };
    A._drive(.25, p, v, {}); return A;
  };
  assert.equal(run(0).state, 'exit', 'in the street: out, another car or on foot');
  const D = run(64); assert.notEqual(D.state, 'exit'); assert.ok(D.round, 'on the Loop: round it again');
});

test('the AutoPlayer pinned on foot (a pocket of cars it gave up on, a wall, peds in the gap) starts over after 20 s: the cars taken again, the walk from the nearest node (D31: it cycled its start nodes there for good)', () => {
  const A = Object.assign(Object.create(AutoPlayer.prototype), { t: 0, I: makeIntent(), tried: new Set([4]), gaveUp: new Map([[4, 0], [5, 0]]), brain: null, skip: 3, last: [0, 0], stuck: 0, dodge: 0 });
  Object.assign(A, { S: { live: [], nearestNode: () => null }, city: { T: 16, walkable: () => true, map: { solids: [] } }, goal: { x: 900, y: 0, foot: true } });
  const p = { x: 0, y: 0, z: 0 };
  for (let k = 0; k < 79; k++) A._walk(.25, p);
  assert.ok(A.shuns(4) && A.shuns(5), '19.75 s: still given up on');
  A._walk(.5, p);
  assert.ok(!A.shuns(4) && !A.shuns(5), '20 s pinned: taken again');
  assert.equal(A.pin.t, 0, 'and the clock starts again');
  // moving on is no pocket: 30 s of walking, 15 a step's quarter second
  const B = Object.assign(Object.create(AutoPlayer.prototype), { t: 0, I: makeIntent(), tried: new Set([4]), gaveUp: new Map([[4, 0]]), brain: null, skip: 0, last: [0, 0], stuck: 0, dodge: 0, S: A.S, city: A.city, goal: { x: 9000, y: 0, foot: true } });
  const q = { x: 0, y: 0, z: 0 };
  for (let k = 0; k < 120; k++) { q.x += 15; B._walk(.25, q); }
  assert.ok(B.shuns(4), 'walking on: still given up on');
});
