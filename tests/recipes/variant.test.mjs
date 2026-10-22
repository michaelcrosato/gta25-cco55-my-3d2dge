// The variant recipe (docs/CONTENT-GUIDE.md, "A variant of a model"): a new definition on an existing model in one new
// file (fixtures/variant.js). It shares the model, its handling is within its own spec (quicker than the Cortez it
// is built on), and the fleet spawns it in play, driven off like the rest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecipe, holdCode, tap } from './kit.mjs';

test('a variant from one new file: the Cortez\'s model, its own handling within its spec, quicker than the Cortez; driven in play', async () => {
  const { game, gtm, M, snap } = await withRecipe('variant', 'vehicles/cortez-gt.js', { hash: 'play', query: { seed: '1', time: 'day', traffic: '0' } });
  const d = M.get('vehicles', 'cortez-gt'); assert.equal(d.model, 'cortez');
  const m = M.measureHandling('cortez-gt'), bad = M.handlingChecks('cortez-gt', m).filter(c => !c.ok);
  assert.equal(bad.length, 0, bad.map(c => `${c.check}: ${c.value} (want ${c.want})`).join('; '));
  assert.ok(m.tTo < M.measureHandling('cortez').tTo, 'quicker to 200 than the Cortez');
  game.advance(.2);
  const F = gtm.fleet, p = gtm.crew.ped, old = F.near(p.x, p.y, 3000).find(q => q.cls === 'car');
  const v = F.spawn('cortez-gt', old.x, old.y, old.heading, { owner: 'world', color: d.palette[0] }); F.remove(old);
  for (const o of F.near(v.x, v.y, 260)) if (o !== v) F.remove(o);
  assert.equal(v.model.name, 'Cortez', 'on the Cortez\'s model');
  const [x, y] = v.toWorld(0, -v.hw - 14); gtm.teleport(x, y); game.advance(.5);
  tap(game, 'KeyE', 1.5); assert.equal(snap().vehicle, 'cortez-gt');
  const x0 = v.x, y0 = v.y; holdCode(game, 'KeyW', 1.2);
  assert.ok(Math.hypot(v.x - x0, v.y - y0) > 50, 'it drove');
});
