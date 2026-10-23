// The shop recipe (docs/CONTENT-GUIDE.md, "A shop"): a building with its door and the shop at it, in one new file
// (fixtures/shop.js). At its door E opens its card, ✕ buys what is focused (paid and applied), the others too, and ○
// backs out; its sign is on the building.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecipe, specWarnings, tap } from './kit.mjs';

test('a shop from one new file: E at its door opens its card, a purchase is paid and applied, ○ backs out', async () => {
  const g = await withRecipe('shop', 'shops/rivet-hardware.js', { hash: '#play/rivet-hardware', query: { seed: '1', time: 'day', weather: 'clear' } });
  const { game, gtm, M, snap } = g;
  assert.equal(specWarnings(g, ['rivet-hardware']).length, 0, specWarnings(g, ['rivet-hardware']).join('; '));
  assert.ok(gtm.city.signs.some(s => s.text === 'RIVET HARDWARE'), 'its sign');
  const C = gtm.career, p = gtm.crew.ped, q = gtm.city.poi('rivet-hardware');
  p.place(q.x, q.y); p.vitals.armor = 0; gtm.crew.fund = 500; game.advance(.3);
  assert.ok(C.prompt && /SHOP/.test(C.prompt.text), 'the prompt at the door: ' + (C.prompt && C.prompt.text));
  tap(game, 'KeyE', .1); assert.equal(snap().career.card, 'shop'); assert.equal(C.card.title, 'RIVET HARDWARE');
  tap(game, 'Enter', .1);
  assert.ok(p.inv.has('slugger'), 'the bat, bought'); assert.equal(gtm.crew.fund, 500 - 80, 'paid');
  C.card.items.find(i => i.label === 'WORK VEST').act(); assert.equal(p.vitals.armor, 100, 'the vest on');
  tap(game, 'Escape', .1); assert.equal(snap().career.card, null, 'backed out');
  assert.equal(M.get('shops', 'rivet-hardware').items.length, 3);
});
