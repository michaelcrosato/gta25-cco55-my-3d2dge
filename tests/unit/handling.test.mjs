// The handling suite (PLAN.md 8.8 Accept), for every vehicle definition the game registers: each against its own spec,
// by its class (sim/vehicle/handling.js: acceleration, top speed, braking dry and wet, skidpad, handbrake drift, no
// tunnelling at 400 u/s; boats on water, the heli in the air, the L on a test loop). Headless: plain arithmetic.
//   node --test tests/unit/handling.test.mjs   (GTM_VEHICLES=cortez,saint narrows it to some definitions)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { engineGlobal } from '../harness.mjs';

engineGlobal();
await import('../../src/motor/index.js');
for (const f of readdirSync(new URL('../../src/game/vehicles/', import.meta.url)).filter(f => f.endsWith('.js')).sort()) await import('../../src/game/vehicles/' + f);
const { all } = await import('../../src/motor/core/registry.js');
const { measureHandling, handlingChecks } = await import('../../src/motor/sim/vehicle/handling.js');
const { checkModel, modelWithKit } = await import('../../src/motor/sim/vehicle/model.js');
const only = (process.env.GTM_VEHICLES || '').split(',').filter(Boolean);
const defs = all('vehicles').filter(d => !only.length || only.includes(d.id));

for (const d of defs) {
  test(`${d.id} (${d.name}): handling within its spec`, () => {
    const m = measureHandling(d.id), checks = handlingChecks(d.id, m), bad = checks.filter(c => !c.ok);
    assert.equal(bad.length, 0, bad.map(c => `${c.check}: ${c.value} (want ${c.want})`).join('; '));
  });
  test(`${d.id} (${d.name}): its model's data is sound`, () => {
    const m = modelWithKit(d.model, d.kit), problems = checkModel(m);
    assert.deepEqual(problems, []);
    assert.ok(m.class === (d.class || m.class), 'the definition\'s class matches its model\'s');
    assert.ok(d.palette.length >= 1 && d.palette.every(c => /^#[0-9a-f]{6}$/i.test(c)), 'a palette of #rrggbb colours');
  });
}
test('the registry holds the fleet once A1 has landed (16 models, 22 definitions: L4\'s SkyCam, X2\'s Duster and Gull)', { skip: only.length > 0 || all('vehicles').length < 19 }, () => {
  assert.equal(all('vehicleModels').length, 16); assert.equal(all('vehicles').length, 22);
});
