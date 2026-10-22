// Review (attract mode, PLAN.md 8.20 "It is isolated: a fresh world ... with its own state objects"; D25 "the streams
// are handed back as a boot leaves them (RNG.seed(app.seed)) when the demo ends, so it never shapes a game"; PLAN.md
// 7.3, the simulation deterministic): the demo does shape the next game. Every Actor takes its id from a module counter
// (src/motor/sim/actor.js nextId) that nothing resets: MOTOR exports resetActorIds() and no code calls it. Each reel
// builds a world of hundreds of actors, so after the demo the player's world starts at id ~380 instead of 1, and ids
// steer the simulation: a DriverBrain thinks on alternate steps by `v.id % 2` and breaks gridlock ties by id
// (ai/driver.js), a PedBrain ticks every sixth step from `ped.id % 6` (ai/pedbrain.js). So free roam after watching the
// demo plays differently from free roam after a boot, from the same seed and the same (no) input; the same goes for
// each reel, whose outcome depends on the reels before it (attract.js exit() and the play scene's demo enter() reseed
// the RNG streams only).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

const SECS = 40, DEMO = 25;
async function freeRoam({ demo = false, resetIds = false } = {}) {
  const { game, gtm, snap } = await loadGame();
  game.advance(.5);
  if (demo) {   // (the title left idle into the demo, DEMO seconds of it, then a key back to the title)
    game.advance(11); assert.equal(snap().scene, 'attract');
    game.advance(DEMO); game.input.press('KeyQ'); game.advance(1 / 120); game.input.release('KeyQ'); game.advance(.5);
    assert.equal(snap().scene, 'title');
  }
  if (resetIds) gtm.motor.resetActorIds();
  game.go('play', {}, { fade: 0 }); game.advance(1 / 120); assert.equal(snap().scene, 'play');
  const firstId = gtm.crew.ped.id, hashes = [];
  for (let t = 0; t < SECS; t += 5) { game.advance(5); hashes.push(game.stateHash().join(',')); }
  const s = snap(); return { firstId, hashes, end: { traffic: s.traffic, peds: s.peds, vehicles: s.vehicles } };
}
const firstDiff = (a, b) => a.hashes.findIndex((h, i) => h !== b.hashes[i]);

test('free roam after the demo plays as it does after a boot (the demo never shapes a game)', async () => {
  const boot = await freeRoam(), after = await freeRoam({ demo: true }), control = await freeRoam({ demo: true, resetIds: true });
  assert.equal(firstDiff(boot, control), -1, 'control: with the actor ids reset after the demo, the game is the boot\'s');
  const d = firstDiff(boot, after);
  assert.equal(d, -1, `after ${DEMO} s of the demo the player's world starts at actor id ${after.firstId} (a boot: ${boot.firstId}) and its state hash differs from ` +
    `${(d + 1) * 5} s into free roam (5 s samples); after ${SECS} s: boot ${JSON.stringify(boot.end)}, after the demo ${JSON.stringify(after.end)}; ` +
    `with resetActorIds() after the demo: identical to the boot's`);
});
