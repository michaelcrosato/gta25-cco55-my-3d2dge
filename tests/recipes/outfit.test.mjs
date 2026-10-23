// The outfit recipe (docs/CONTENT-GUIDE.md, "An outfit"): a fourth look for each of the crew and Threads' rail for it,
// in one new file (fixtures/outfit.js). Each character has it, Threads' card sells it, and buying it puts it on
// whoever is played (and on the others when they are played).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecipe } from './kit.mjs';

test('an outfit from one new file: every protagonist has it, Threads sells it, and buying it dresses the one played', async () => {
  const { game, gtm, M } = await withRecipe('outfit', 'outfits/track-suit.js', { hash: '#play/threads', query: { seed: '1', time: 'day', weather: 'clear' } });
  for (const id of ['dex', 'viv', 'gus']) { const ch = M.get('characters', id); assert.equal(ch.outfits.length, 4, id); assert.equal(ch.outfitNames[3], 'Track Suit'); }
  game.advance(.5);
  const C = gtm.career, p = gtm.crew.ped; gtm.crew.fund = 2000;
  C._shopCard(M.get('shops', 'threads'), { ped: p });
  const row = C.card.items.find(i => i.label === 'TRACK SUIT'); assert.ok(row && !row.disabled, 'on Threads\' card');
  row.act();
  assert.equal(gtm.crew.fund, 2000 - 750, 'paid');
  assert.equal(gtm.crew.ped.rig.look.colors.cloth, '#2a8a5a', 'wearing it');
  assert.equal(gtm.crew.member(gtm.crew.active).outfit, 3, 'kept as the one worn');
});
