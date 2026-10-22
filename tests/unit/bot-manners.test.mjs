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
