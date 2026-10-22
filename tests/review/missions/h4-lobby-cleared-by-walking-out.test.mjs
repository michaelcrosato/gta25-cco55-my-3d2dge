// FAN-OUT B (missions and activities). The Big Withdrawal's LOUD lobby (src/game/missions/h4-big-withdrawal.js):
// "Take out the guards" waits for guardsUp(m) to be empty, and guardsUp reads m.inside, which is null outdoors, so it
// is empty the moment Viv steps back out of the bank's door. In and straight out again, not a guard touched, and the
// job says "Lobby's clear", skips "Hold the lobby", and drives off to the getaway: PLAN.md 9.4's "a shoot-out in the
// bank lobby" is skipped by a player retreating out of the door under fire.
//   node --test tests/review/missions/h4-lobby-cleared-by-walking-out.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

test('LOUD: stepping back out of the bank does not clear the lobby\'s guards', async () => {
  const { game, gtm } = await loadGame({ hash: '#mission/heist_big_withdrawal/lobby', query: { seed: '1', time: 'day', weather: 'clear' } });
  game.advance(1);
  const C = gtm.career, R = C.R, W = C.W;
  for (let i = 0; i < 60 && !(gtm.crew.active === 'viv' && R.objective && /Storm/.test(R.objective.text)); i++) game.advance(.25);
  assert.equal(R.objective && R.objective.text, 'Storm the bank');
  // in by the front door (as △ at the door does), the fight on
  W.enter('bank', 'front');
  for (let i = 0; i < 20 && !(R.objective && /guards/.test(R.objective.text)); i++) game.advance(.25);
  assert.equal(R.objective && R.objective.text, 'Take out the guards');
  const run = W.inside().run, up = run.watch().guards.filter(g => !g.down).length, t0 = R.t;
  // and straight back out by the same door
  W.leave();
  for (let i = 0; i < 60 && R.stage && R.stage.id === 'lobby'; i++) game.advance(.25);
  assert.equal(R.stage && R.stage.id, 'lobby',
    `${up} of the bank's guards up and untouched as Viv stepped out; ${(R.t - t0).toFixed(1)} s later the job is at "${R.stage && R.stage.id}" ("${R.objective && R.objective.text}")`);
});
