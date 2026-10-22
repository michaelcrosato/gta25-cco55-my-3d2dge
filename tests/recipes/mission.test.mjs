// The mission recipe (docs/CONTENT-GUIDE.md, "A mission"): a mission in one new file (fixtures/mission.js), after the
// template. It registers with no warning, the mission bot plays it from its hints alone (as tools/bot.mjs does: on
// a seed, and through a gamepad), a deep link starts its second stage, and the career offers it at its giver once
// what it requires is done.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecipe, specWarnings } from './kit.mjs';
import { botRun } from '../../tools/bot.mjs';

const extra = [{ file: 'tests/recipes/fixtures/mission.js', as: 'missions/x1-pizza-run.js' }];
test('a mission from one new file: the bot passes it (and through a pad, and from its second stage); offered at its giver', async () => {
  for (const o of [{}, { pad: true }, { stage: 'deliver' }]) {
    const r = await botRun({ id: 'pizza_run', seed: 1, secs: 600, extra, ...o });
    assert.ok(r.passed, `${JSON.stringify(o)}: ${r.stage}: ${r.failures.join('; ')} ${r.errors.join('; ')}`);
  }
  const g = await withRecipe('mission', 'missions/x1-pizza-run.js', { hash: '#play/greasy-spoke', query: { seed: '1', time: 'day', weather: 'clear' } });
  assert.equal(specWarnings(g, ['pizza_run']).length, 0, specWarnings(g, ['pizza_run']).join('; '));
  const C = g.gtm.career; g.game.advance(.5);
  C.save.missions.done = C.save.missions.done.filter(id => id !== 'prologue');
  assert.ok(!C.available().some(m => m.id === 'pizza_run'), 'not before the prologue');
  C.save.missions.done.push('prologue');
  assert.ok(C.available().some(m => m.id === 'pizza_run'), 'on offer once the prologue is done');
  const at = C.giverOf(g.M.get('missions', 'pizza_run')), q = g.gtm.city.poi('greasy-spoke');
  assert.ok(at && Math.hypot(at[0] - q.x, at[1] - q.y) < 40, 'its giver at the Greasy Spoke');
});
