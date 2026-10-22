// FAN-OUT B review (traffic and peds): the player takes the Medic parked at its call while its paramedics work.
// PLAN.md 8.8 / 8.10: a car the player gets into is the player's to drive; the emergency unit's crew walks back to it.
// What happens: the parked unit stays kinematic (it won't move under the player's throttle); when the crew climbs back
// in, Emergency._driver() takes whoever sits at the wheel (the player) as the unit's driver and Traffic.release() puts
// the car back in the traffic with the player as its traffic driver; when the player gets out, Traffic's hand-off
// treats it as a carjack of that driver and CityLife hands the PROTAGONIST to the crowd (Crowd.adopt): a PedBrain then
// walks the player's character about on its own.
//   node --test tests/review/traffic/stolen-unit.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

// a body near the player brings the Medic; returns once its paramedics are out and working
async function medicAtWork() {
  const g = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear' } }), { game, gtm } = g;
  game.advance(3);
  const L = gtm.life, C = L.crowd, S = L.services, P = gtm.crew.ped;
  const m = C.members.filter(q => !q.ped.dead && !q.brain.follow).sort((a, b) => Math.hypot(a.ped.x - P.x, a.ped.y - P.y) - Math.hypot(b.ped.x - P.x, b.ped.y - P.y))[0];
  gtm.combat.hurt(m.ped, { amount: 999, kind: 'bullet', by: null });
  let call = null;
  for (let t = 0; t < 70; t += .25) { game.advance(.25); call = S.calls.find(c => c.kind === 'medic'); if (call && call.crew.some(f => f.task === 'work')) break; }
  assert.ok(call && call.crew.some(f => f.task === 'work'), 'the Medic came and its crew is at work');
  return { ...g, call, v: call.unit.v };
}
// the player walks up to the driver's door of v and gets in
function getIn(game, gtm, v) {
  const P = gtm.crew.ped, M = gtm.motor, side = v.toWorld(0, -(v.hw + 10));
  P.place(side[0], side[1], v.z); game.advance(.1);
  P.board(M.boardingFor(P, v, 0));
  for (let t = 0; t < 6 && !P.seat; t += .1) game.advance(.1);
  assert.ok(P.seat && P.seat.vehicle === v && v.driver === P, 'the player sits at the Medic\'s wheel');
}

test('the Medic the player gets into while its crew works drives off under the player\'s throttle', async () => {
  const { game, gtm, v } = await medicAtWork(), M = gtm.motor;
  getIn(game, gtm, v);
  gtm.pilot(() => { const I = M.clearIntent(M.makeIntent()); I.throttle = 1; return I; });   // (the player floors it)
  const x0 = v.x, y0 = v.y;
  game.advance(4);
  const moved = Math.hypot(v.x - x0, v.y - y0);
  assert.ok(moved > 40, `4 s of full throttle moved the stolen Medic ${moved.toFixed(1)} u (kinematic: ${v.kinematic}, duty.out: ${!!(v.duty && v.duty.out)})`);
});

test('getting out of the stolen Medic never hands the protagonist to the crowd, and nothing walks them about', async () => {
  const { game, gtm, call, v } = await medicAtWork(), M = gtm.motor, L = gtm.life, P = gtm.crew.ped;
  getIn(game, gtm, v);
  for (let t = 0; t < 30 && call.state !== 'done'; t += .5) game.advance(.5);   // (the crew comes back: one climbs in beside the player)
  const unit = call.unit;
  const note = `call ${call.state}/${call.done}; the unit still in the traffic: ${L.traffic.cars.includes(unit)}, its driver is the player: ${unit.driver === P}`;
  gtm.pilot(() => M.clearIntent(M.makeIntent()));   // (no input from here on)
  P.leave(M.exitFor(P, v));
  for (let t = 0; t < 3; t += .25) game.advance(.25);
  assert.ok(!P.seat, 'the player is out');
  const handed = Array.from(L.handed.filter(h => h.ped === P).map(h => h.why)), member = L.crowd.members.find(q => q.ped === P);   // (Array.from: the game's arrays are of its own realm, and deepStrictEqual compares prototypes)
  const x0 = P.x, y0 = P.y; game.advance(12); const walked = Math.hypot(P.x - x0, P.y - y0);
  assert.deepEqual({ handed, inCrowd: !!member, walkedWithNoInput: Math.round(walked) }, { handed: [], inCrowd: false, walkedWithNoInput: 0 },
    `the protagonist was handed on as a traffic driver (${handed.join(',')}), adopted by the crowd (brain ${member && member.brain.state}) and walked ${walked.toFixed(0)} u in 12 s with no input; ${note}`);
});
