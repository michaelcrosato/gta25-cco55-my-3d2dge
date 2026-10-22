// FAN-OUT B review (traffic and peds): blow up an emergency unit parked at its call and its crew on foot vanish.
// Emergency._run stands a call down ('lost') when its unit is wrecked, and _standDown takes every crew member out of
// Combat and out of onFoot (the only list that draws and steps them) without handing them to anyone: a paramedic
// kneeling by the body a few metres from the player, alive, is simply gone (and so is a dead one's body). Nothing spawns
// or despawns in sight (PLAN.md 7.6, 8.9); the living crew should flee or stand about with the crowd, and a dead one lie
// as a body.
//   node --test tests/review/traffic/unit-crew-vanish.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

test('the paramedics at work beside the player stay in the world when the player blows up their Medic', async () => {
  const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear' } });
  game.advance(3);
  const L = gtm.life, C = L.crowd, S = L.services, P = gtm.crew.ped;
  const m = C.members.filter(q => !q.ped.dead && !q.brain.follow).sort((a, b) => Math.hypot(a.ped.x - P.x, a.ped.y - P.y) - Math.hypot(b.ped.x - P.x, b.ped.y - P.y))[0];
  gtm.combat.hurt(m.ped, { amount: 999, kind: 'bullet', by: null });
  let call = null;
  for (let t = 0; t < 70; t += .25) { game.advance(.25); call = S.calls.find(c => c.kind === 'medic'); if (call && call.crew.length && call.crew.every(f => f.task === 'work')) break; }
  assert.ok(call && call.crew.every(f => f.task === 'work'), 'the paramedics kneel at the body');
  const v = call.unit.v, crew = call.crew.map(f => f.ped);
  // the player shoots the parked Medic until it burns; it goes up a few seconds later
  for (let k = 0; k < 400 && !v.damage.burning && !v.wrecked; k++) { gtm.combat.hurt(v, { amount: 20, kind: 'bullet', by: P.id, at: [v.x, v.y] }); game.advance(.05); }
  for (let t = 0; t < 8 && !v.wrecked; t += .1) game.advance(.1);
  assert.ok(v.wrecked, 'the Medic is a wreck'); game.advance(.25);
  const where = p => ({ id: p.id, dead: p.dead, fromPlayer: Math.round(Math.hypot(p.x - P.x, p.y - P.y)), inWorld: gtm.combat.bodies.includes(p) || S.onFoot.some(f => f.ped === p) || C.members.some(q => q.ped === p) || !!p.seat });
  const state = crew.map(where), gone = state.filter(s => !s.inWorld);
  assert.equal(gone.length, 0, `call ${call.state}/${call.done}: crew members gone from the world (not in Combat, the services' crews, the crowd or a seat): ${JSON.stringify(gone)}`);
});
