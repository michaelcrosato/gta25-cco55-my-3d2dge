// FAN-OUT B (missions and activities: the economy, PLAN.md 8.16). An outfit bought at Threads is written to the save
// (protagonists.<id>.outfit), but a loaded save never puts it back on: the play scene dresses every protagonist in
// outfits[0] (spawnCrew), Career._apply restores where they stand, health, armour, guns and ammo but not the outfit,
// and the crew member's outfit stays unset, so the next save (the autosave after any job, or the safehouse's) writes
// outfit 0 over it. The $600 Beach day is gone after one load.
//   node --test tests/review/missions/threads-outfit-lost-on-load.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

test('an outfit bought at Threads is still worn after a load, and stays in the next save', async () => {
  const { game, gtm } = await loadGame({ hash: '#play/threads', query: { seed: '1', time: 'day', weather: 'clear' } });
  game.advance(1);
  const M = gtm.motor;
  let C = gtm.career;
  C.saves.backend = M.memoryBackend();   // (no localStorage headless: a save in memory, as tools/bot.mjs does)
  gtm.crew.fund = 5000;
  const shop = M.get('shops', 'threads'), item = shop.items.find(i => i.id === 'outfit2'), dex = M.get('characters', 'dex');
  C._buy(shop, item, { ped: gtm.crew.ped }); C.close();   // (✕ on BEACH DAY)
  assert.equal(gtm.crew.ped.rig.look, dex.outfits[2], 'Dex wears the Beach day');
  assert.equal(gtm.crew.fund, 5000 - C.econ.price(item), 'paid for (the price is a TUNE knob)');
  assert.ok(C.write('1').ok);
  const saved = JSON.parse(C.saves.backend.get(C.saves.key('1'))).protagonists.dex.outfit;
  // LOAD, slot 1 (the title's: the play scene entered with the slot to load)
  const C0 = C; game.go('play', { route: ['play', 'safehouse'], load: '1' });
  for (let i = 0; i < 60 && gtm.career === C0; i++) game.advance(.05);
  game.advance(.5); C = gtm.career;
  const worn = gtm.crew.member('dex').ped.rig.look === dex.outfits[2], member = gtm.crew.member('dex').outfit;
  assert.ok(C.write('2').ok);   // (the next save: the autosave after a job, or the safehouse's)
  const resaved = JSON.parse(C.saves.backend.get(C.saves.key('2'))).protagonists.dex.outfit;
  assert.deepEqual({ worn, resaved }, { worn: true, resaved: 2 },
    `saved with outfit ${saved}; after the load Dex wears the Beach day: ${worn} (the crew member's outfit: ${member}); the next save writes outfit ${resaved}`);
});
