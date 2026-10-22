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

test('the simulation never reads the view: the same drive gives the same state hash in ISO, TOP-DOWN and MODE 7', async () => {
  const drive = async view => {
    const { game } = await loadGame({ hash: 'proving/pad', query: { view } });
    game.advance(.1); game.input.press('KeyW'); game.advance(1); holdCode(game, 'KeyD', .5); holdCode(game, 'Space', .3); game.input.release('KeyW'); game.advance(.5);
    return [...game.stateHash()];   // (into this realm's arrays: each game runs in its own vm context)
  };
  const iso = await drive('iso');
  assert.deepEqual(await drive('top'), iso);
  assert.deepEqual(await drive('side7'), iso);
});
test('every Proving Ground zone loads by deep link headless (PLAN.md 8.23), and the two districts are content', async () => {
  const { gtm } = await loadGame({ hash: 'proving/scale' }), zones = gtm.zones, M = gtm.motor;
  for (const id of ['handling', 'traffic', 'range', 'wanted', 'views', 'ui', 'bench', 'stress']) assert.ok(zones.includes(id), 'PLAN\'s zone ' + id);
  assert.ok(M.get('districts', 'proving') && M.get('districts', 'proving-track'), 'the Proving Ground\'s town and handling ground are districts entries');
  for (const id of zones) {
    const { game, snap } = await loadGame({ hash: 'proving/' + id, query: { time: 'day', weather: 'clear' } });
    game.advance(1);
    assert.equal(snap().zone, id, id); assert.equal((game.errors || []).length, 0, id + ': ' + JSON.stringify(game.errors));
  }
});
test('the handling ground (#proving/handling?selftest=1): the stops lengthen dry to ice, the skidpad, the slalom, the kicker, the boat', async () => {
  const { game, gtm } = await loadGame({ hash: 'proving/handling', query: { time: 'day', weather: 'clear', selftest: '1' } });
  const Z = gtm.yard.zone;
  for (let t = 0; t < 120 && Z.i < Z.list.length; t += .5) game.advance(.5);
  const R = Object.fromEntries(Z.results.map(r => [r.id, r])), stops = Z.results.filter(r => r.surface).map(r => r.value);
  assert.equal(stops.length, 6); assert.ok(stops.every((d, i) => !i || d > stops[i - 1]), 'each stop longer than the last: ' + stops.join(' < '));
  for (const id of ['skidpad', 'slalom', 'kicker', 'boat']) assert.ok(R[id] && R[id].ok, id + ': ' + JSON.stringify(R[id]));
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});
