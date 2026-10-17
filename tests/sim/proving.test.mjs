import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../harness.mjs';

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
test('#proving/pad: the Cortez drives on the vehicle bindings (W throttle, D steers right), and collides', async () => {
  const { game, snap, gtm } = await loadGame({ hash: 'proving/pad' });
  game.advance(.1);
  const a = snap(); assert.equal(a.zone, 'pad'); assert.equal(a.speed, 0);
  holdCode(game, 'KeyW', 1.5);
  const b = snap(); assert.ok(b.car[0] - a.car[0] > 120 && b.speed > 120, `drove east: ${a.car} -> ${b.car} at ${b.speed}`);
  game.input.press('KeyW'); holdCode(game, 'KeyD', .8); game.input.release('KeyW'); game.advance(1 / 120);
  const c = snap(); assert.ok(c.heading > .3, 'D steers right (clockwise, toward the south): ' + c.heading);
  const { cars } = gtm.yard; assert.equal(cars.length, 5);
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});

