// FAN-OUT B review, determinism and saves (PLAN.md 7.3: the same seed and the same Intent script give the same hash;
// D25: the demo's streams are handed back "as a boot leaves them (RNG.seed(app.seed)) when the demo ends, so it never
// shapes a game"). Two pieces of state outlive a world: the actor id counter (sim/actor.js nextId; resetActorIds is
// exported and never called), which numbers every ped and car and seeds each PedRig's phase (where a shot leaves the
// hand) and every lowest-id tie-break; and the RNG streams, which only the app (once, at boot) and the demo reseed:
// PLAY.enter does not, and the save's rngSeed is written as 1 and never read. So a NEW GAME after the attract mode has
// run, or a second NEW GAME in one session, is another city from the same seed.
// Run: node --test tests/review/determinism/world-shaped-by-history.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../../harness.mjs';

const Q = { seed: '7', time: 'day', weather: 'clear' };
const newGame = (game, gtm) => { gtm.ui.screens.top.list.items.find(i => i.label === 'NEW GAME').act(); game.advance(.6); };
// fifteen seconds of a new game's world: the protagonist's id, the traffic and crowd round it, and the sim hash
function sample(game, gtm) {
  const id = gtm.crew.ped.id; game.advance(15);
  return { heroId: id, cars: gtm.life.traffic.count, peds: gtm.life.crowd.count, hash: [...game.stateHash()].join(',') };
}

test('the attract mode never shapes a game: NEW GAME after the demo has played is the NEW GAME of a fresh boot', async () => {
  const fresh = await loadGame({ hash: '', query: Q }); fresh.game.advance(.5);
  newGame(fresh.game, fresh.gtm); const A = sample(fresh.game, fresh.gtm);
  const after = await loadGame({ hash: '', query: Q }); after.game.advance(.5);
  after.game.advance(11); assert.equal(after.snap().scene, 'attract', 'idle on the title: the demo');
  after.game.advance(30);
  holdCode(after.game, 'Enter'); after.game.advance(.5); assert.equal(after.snap().scene, 'title', 'a key: back to the title');
  newGame(after.game, after.gtm); const B = sample(after.game, after.gtm);
  assert.equal(after.gtm.motor.RNG.worldSeed, 7, 'the streams were handed back');
  assert.deepEqual({ ...B, hash: B.hash === A.hash ? 'same' : 'differs' }, { ...A, hash: 'same' }, `fresh boot ${JSON.stringify({ ...A, hash: undefined })}, after 30 s of the demo ${JSON.stringify({ ...B, hash: undefined })}`);
});

test('a second NEW GAME in one session is the same world as the first', async () => {
  const { game, gtm, snap } = await loadGame({ hash: '', query: Q }); game.advance(.5);
  newGame(game, gtm); const A = sample(game, gtm);
  game.go('title'); game.advance(.6); assert.equal(snap().scene, 'title');   // (the pause's QUIT TO TITLE)
  newGame(game, gtm); const B = sample(game, gtm);
  assert.deepEqual({ ...B, hash: B.hash === A.hash ? 'same' : 'differs' }, { ...A, hash: 'same' }, `first ${JSON.stringify({ ...A, hash: undefined })}, second ${JSON.stringify({ ...B, hash: undefined })}`);
});
