// FAN-OUT B (missions and activities). A random event ends "by its own stages, or when the player leaves it
// TUNE.eventLeave behind for 10 s, or a job starts" (src/motor/mission/ambient.js; D21: "a job starting quits one").
// The career hands AmbientEvents free = !R.active && !inside && !this.card, and a running event quits ('busy') the step
// free is false: any career card ends it on the spot, the phone (d-pad up: a cab, the contacts, the texts), a shop's
// card at a door or a drive-in (Spray & Pray mid police chase), a property's confirm, or a giver's JOB card the
// player walks into and answers NOT NOW. The purse snatcher is gone the moment the phone comes out, and stays gone.
//   node --test tests/review/missions/event-ends-when-phone-opens.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

test('a random event goes on while the player looks at the phone', async () => {
  const { game, gtm } = await loadGame({ hash: '#play/safehouse', query: { seed: '1', time: 'day', weather: 'clear' } });
  game.advance(2);
  const M = gtm.motor, C = gtm.career, A = C.events, p = gtm.crew.ped, spec = M.get('activities', 'event_purse_snatcher');
  // the ambient runtime's own start, on the sidewalk ahead of the player (as AmbientEvents.update does)
  let at = null; for (let k = 0; k < 40 && !at; k++) { p.mover.facing = k * .3; at = spec.where(C.W, p); }
  assert.ok(at, 'a spot for the purse snatcher');
  A.R.start('event_purse_snatcher', { activity: true, data: { at } });
  game.advance(1);
  assert.ok(A.active, 'the purse snatcher is on');
  const ends = []; gtm.BUS.on('activityEnd', e => ends.push(e), 'global');
  C.phone(); game.advance(.1);   // (d-pad up)
  const during = { card: C.card && C.card.id, active: A.active, result: A.R.result && A.R.result.reason };
  C.close(); game.advance(.5);   // (hung up)
  assert.ok(during.active && A.active, `with the phone out: ${JSON.stringify(during)}; hung up, the event is on: ${A.active}; activityEnd ${JSON.stringify(ends)}`);
});
