// Review (attract mode, PLAN.md 8.20 / 9.11 "Hot Pursuit: a 3★ night chase in the rain, the chopper's spotlight, a
// respray escape"; D25 "Hot Pursuit's three stars run down Motor Avenue ahead of the roadblock 3★ brings"): as the
// shipped page plays it (no ?seed: Lowtown built from its own seed 1999, the demo's worlds from TUNE.attractSeed 2600
// on), the Hot Pursuit reel mostly stalls. Three stars bring a roadblock onto Motor Avenue south of the chase's start
// (a cruiser parked across the southbound lane); the city's traffic queues behind it, and the reel's car, routed down
// the avenue (RUN = C(80, 48), C(80, 72)), waits at the junction before it for an exit that never clears (its brain's
// cause 'exit', creeping a few units a second: too slow for the AutoPlayer's own jam and stall checks, too slow for the
// watchdog's 24 units), until the director's watchdog cuts it. The respray never shows. The soak never sees this: it
// runs with ?seed=1..3, which also rebuilds the city from that seed (scenes/lowtown.js citySeed), so it tests other
// cities than the one players get.
// Measured (review): the reel alone on the show's seeds 2600-2629, 24 of 30 cut (23 stalled, 1 NABBED); the whole
// shipped show for 16 virtual minutes, Hot Pursuit 9 times, 4 cut. Every cut had its roadblock at (1266, 1072), every
// end at y >= 1456. With ?seed=1 (the soak's), 7 of 9 end. This test plays the reel alone (#attract/hot_pursuit: the
// same reel and seeds, 2600 on) for 130 virtual seconds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

async function reels(query, secs) {
  const { game, gtm } = await loadGame({ hash: 'attract/hot_pursuit', query }), blocks = [];
  gtm.BUS.on('roadblock', e => blocks.push({ seed: gtm.director.now && gtm.director.now.seed, at: [Math.round(e.x), Math.round(e.y)] }));
  for (let t = 0; t < secs; t++) game.advance(1);
  const log = gtm.director.log, ended = log.filter(l => l.why === 'end').length, cut = log.filter(l => l.why !== 'end').length;
  return { log, ended, cut, blocks };
}
test('Hot Pursuit, as the shipped page plays it, mostly plays to its end (the watchdog a rare safety net)', async () => {
  const shipped = await reels({}, 130);
  assert.ok(shipped.ended >= shipped.cut,
    `shipped page (no ?seed): ${shipped.ended} ended, ${shipped.cut} cut by the watchdog: ${JSON.stringify(shipped.log)}; roadblocks: ${JSON.stringify(shipped.blocks.slice(0, 8))}`);
});
