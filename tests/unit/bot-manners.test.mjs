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
  const pick = cars => Object.assign(auto([]), { tried: new Set(), fleet: { near: () => cars } })._pickCar({ x: 0, y: 100 });
  assert.equal(pick([v(1, 50, { driver: true }), v(2, 90)]).id, 2, 'the empty one 40 farther');
  assert.equal(pick([v(1, 20, { driver: true }), v(2, 130)]).id, 1, 'the empty one 110 farther: the carjack');
  assert.equal(pick([v(1, 50, { driver: true })]).id, 1, 'only an occupied one: taken');
  assert.equal(pick([v(1, 50, { driver: true }), v(2, 90, { locked: true })]).id, 1, 'a locked one is no choice');
});
