// The vehicle recipe (docs/CONTENT-GUIDE.md, "A vehicle"): a model and its definition in one new file under
// src/game/vehicles/ (fixtures/vehicle.js). Its model's data is sound, its handling is within the spec it states, and
// in play it is a car like any other: E gets in at its door, W drives it away.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecipe, holdCode, tap } from './kit.mjs';

test('a vehicle from one new file: registered, its model sound, its handling within its own spec; in play E gets in and W drives it', async () => {
  const { game, gtm, M, snap } = await withRecipe('vehicle', 'vehicles/pug.js', { hash: 'play', query: { seed: '1', time: 'day', traffic: '0' } });
  assert.ok(M.get('vehicleModels', 'pug') && M.get('vehicles', 'pug'), 'registered');
  const problems = M.checkModel(M.modelWithKit('pug')); assert.equal(problems.length, 0, 'its model\'s data: ' + problems.join('; '));
  const bad = M.handlingChecks('pug').filter(c => !c.ok);
  assert.equal(bad.length, 0, bad.map(c => `${c.check}: ${c.value} (want ${c.want})`).join('; '));
  game.advance(.2);
  const F = gtm.fleet, p = gtm.crew.ped, old = F.near(p.x, p.y, 3000).find(q => q.cls === 'car');
  const v = F.spawn('pug', old.x, old.y, old.heading, { owner: 'world' }); F.remove(old);   // (parked where a parked car was)
  for (const o of F.near(v.x, v.y, 260)) if (o !== v) F.remove(o);
  const [x, y] = v.toWorld(0, -v.hw - 14); gtm.teleport(x, y); game.advance(.5);
  tap(game, 'KeyE', 1.5);
  assert.equal(snap().vehicle, 'pug', 'in the Pug');
  const x0 = v.x, y0 = v.y; holdCode(game, 'KeyW', 1.2);
  assert.ok(Math.hypot(v.x - x0, v.y - y0) > 50, 'it drove: ' + Math.hypot(v.x - x0, v.y - y0).toFixed(0));
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});
