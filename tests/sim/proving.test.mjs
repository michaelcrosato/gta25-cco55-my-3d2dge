import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../harness.mjs';

test('#proving/scale builds the 160x160 yard headless with its solids, and the lap drives round it', async () => {
  const { game, snap, gtm } = await loadGame({ hash: 'proving/scale' });
  game.advance(.1);
  const a = snap(); assert.equal(a.scene, 'proving'); assert.equal(a.zone, 'scale');
  const { map } = gtm.yard; assert.equal(map.w, 160); assert.ok(map.solids.length > 800, map.solids.length + ' solids');
  game.advance(6);
  const b = snap(); assert.ok(Math.hypot(b.hero[0] - a.hero[0], b.hero[1] - a.hero[1]) > 1000 || b.leg !== a.leg, JSON.stringify([a, b]));
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});
test('the yard is the same city for the same seed, and another for another', async () => {
  const cells = async seed => [...(await loadGame({ hash: 'proving/scale', query: { seed } })).gtm.yard.map.cells];
  const a = await cells('5');
  assert.deepEqual(a, await cells('5'));
  assert.notDeepEqual(a, await cells('6'));
});
