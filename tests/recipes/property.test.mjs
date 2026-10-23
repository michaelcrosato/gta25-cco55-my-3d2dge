// The property recipe (docs/CONTENT-GUIDE.md, "A property"): a building, its door and the property at it, in one new
// file (fixtures/property.js). Bought once with E at its door (refused for want of cash), it pays its income into its
// till every midnight up to its cap, collected by walking up to the door.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecipe, specWarnings, tap } from './kit.mjs';

test('a property from one new file: bought at its door, paid every midnight up to its cap, collected by walking up', async () => {
  const g = await withRecipe('property', 'properties/suds.js', { hash: '#play/suds', query: { seed: '1', time: 'day', weather: 'clear' } });
  const { game, gtm, M, snap } = g, C = gtm.career, X = C.econ, spec = M.get('properties', 'suds'), A = M.amountOf;
  assert.equal(specWarnings(g, ['suds']).length, 0, specWarnings(g, ['suds']).join('; '));
  const p = gtm.crew.ped, q = gtm.city.poi('suds');
  gtm.crew.fund = 100; assert.equal(X.buyProperty('suds', spec).reason, 'cash', 'refused for want of cash');
  gtm.crew.fund = A(spec.price) + 50; p.place(q.x, q.y); game.advance(.3);
  assert.ok(C.prompt && /BUY {2}SUDS LAUNDROMAT {2}\$3,000/.test(C.prompt.text), 'BUY at its door, its price: ' + (C.prompt && C.prompt.text));
  tap(game, 'KeyE', .1);   // (at $5,000 or less, bought at once; above it, a question first)
  assert.ok(X.owned('suds'), 'bought'); assert.equal(gtm.crew.fund, 50, 'paid its price'); assert.equal(snap().career.card, null);
  p.place(p.x + 300, p.y);   // (away from the door while the nights pass)
  for (let n = 0; n < 2; n++) { gtm.clock.set(23.98); game.advance(3); }
  assert.equal(X.owned('suds').till, 2 * A(spec.income), 'two midnights in the till');
  for (let n = 0; n < 6; n++) { gtm.clock.set(23.98); game.advance(3); }
  assert.equal(X.owned('suds').till, A(spec.cap), 'capped');
  const f0 = gtm.crew.fund; p.place(q.x, q.y); game.advance(.3);
  assert.equal(gtm.crew.fund, f0 + A(spec.cap), 'collected at the door'); assert.equal(X.owned('suds').till, 0);
});
