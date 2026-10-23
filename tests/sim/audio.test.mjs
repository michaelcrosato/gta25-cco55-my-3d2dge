// The sound in play, headless (PLAN.md 8.17): nothing of it reaches the simulation. A headless game has no sound (the
// director never starts), a job's score cue is the runtime's to set and its end to clear, and the radio's words come
// from the station tuned in at the radio clock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../harness.mjs';

test('a job\'s score: set by m.music, cleared with the job; the director silent headless', async () => {
  const { game, gtm } = await loadGame({ hash: 'play' });
  game.advance(.3);
  assert.equal(gtm.sound.stats(), null, 'no sound headless: nothing built');
  const R = gtm.career.R, m0 = gtm.motor.all('missions')[0];
  gtm.career.startMission(m0.id); game.advance(.2); assert.equal(R.state, 'running');
  R.m.music('chase'); assert.equal(R.music, 'chase', 'm.music sets the cue'); R.quit('test'); assert.equal(R.music, null, 'the job\'s end lets it go');
});
test('the radio\'s words: the station tuned in, at the play clock', async () => {
  const { game, gtm } = await loadGame({ hash: 'play' });
  game.advance(.3);
  const R = gtm.radio, T = R.timelines.get('crash'), dj = T.segs.find(s => s.kind === 'dj');
  assert.ok(T.length > 100, 'CRASH FM\'s timeline: its songs, its DJ, its ads, its jingle');
  const ln = R.line('crash', dj.t0 + .5); assert.equal(ln.name, 'Captain Static');
  assert.deepEqual(R.timelines.get('lowdown').segs.filter(s => s.kind === 'talk').length, 6, 'LOWDOWN TALK\'s six segments');
});
