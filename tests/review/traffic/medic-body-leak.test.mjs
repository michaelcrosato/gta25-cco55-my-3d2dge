// FAN-OUT B review (traffic and peds): a body the Medic attended but did not bring back is never taken away.
// PLAN.md 8.10: "dead: the body lies for 60 s" (TUNE.bodyTime); the crowd drops a member beyond its ring.
// Emergency._watch sets m.attended = true when it sends the Medic; only Crowd.revive (the 60% branch: TUNE.reviveChance
// .6) and Emergency._standDown ('late' / 'lost') reset it. A call that ends normally ('answered') without the revive
// leaves attended true for good, and Crowd.update keeps every attended member: the body is never dropped, neither after
// bodyTime nor when the player is across town. Each such body stays a crowd member and a Combat body forever (it
// counts against the crowd's target, so the living crowd round the player thins as they pile up).
//   node --test tests/review/traffic/medic-body-leak.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

test('a body the Medic attended and did not revive goes after TUNE.bodyTime, and when the player is far away (default knobs)', async () => {
  const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear' } });
  game.advance(3);
  const L = gtm.life, C = L.crowd, S = L.services, P = gtm.crew.ped, TUNE = gtm.TUNE;
  assert.equal(TUNE.reviveChance, .6, 'the default revive chance');
  TUNE.reviveChance = 0;   // (the unrevived case, every call: with the default a run of revives could take all six bodies)
  // bodies one at a time near the player until a Medic call ends with no revive (40% of calls at the default knob)
  let body = null, tDeath = 0, tries = 0;
  while (!body && tries < 6) {
    tries++;
    const m = C.members.filter(q => !q.ped.dead && !q.brain.follow && !q.ped.gang && q.ped.faction !== 'police').sort((a, b) => Math.hypot(a.ped.x - P.x, a.ped.y - P.y) - Math.hypot(b.ped.x - P.x, b.ped.y - P.y))[0];
    gtm.combat.hurt(m.ped, { amount: 999, kind: 'bullet', by: null });
    const t0 = C.t, n0 = S.calls.length, rev0 = S.revived; let call = null;
    for (let t = 0; t < 150; t += .5) { game.advance(.5); call = call || S.calls.find(c => c.kind === 'medic' && c.target === m); if (call && call.state === 'done') break; }
    assert.ok(call && call.state === 'done', `the Medic came for body ${tries} and left (${n0} calls before)`);
    if (call.done === 'answered' && S.revived === rev0 && m.ped.dead) { body = m; tDeath = t0; }
  }
  assert.ok(body, `a Medic call ended without a revive within ${tries} bodies`);
  assert.equal(body.attended, true, 'the unrevived body is still marked attended');
  for (let t = 0; t < 70; t += .5) game.advance(.5);
  const afterTime = { member: C.members.includes(body), combat: gtm.combat.bodies.includes(body.ped), age: Math.round(C.t - tDeath) };
  gtm.teleport(2200, 1848); game.advance(10);
  const away = Math.round(Math.hypot(P.x - body.ped.x, P.y - body.ped.y)), afterFar = { member: C.members.includes(body), combat: gtm.combat.bodies.includes(body.ped) };
  assert.deepEqual({ afterTime, afterFar }, { afterTime: { member: false, combat: false, age: afterTime.age }, afterFar: { member: false, combat: false } },
    `the body (call answered, not revived, after ${tries} bodies) is still a crowd member and a Combat body ${afterTime.age} s after its death (bodyTime ${TUNE.bodyTime}), and still with the player ${away} u away (the crowd's ring ends at ${TUNE.crowdOut + 60})`);
});
