// The activity recipe (docs/CONTENT-GUIDE.md, "An activity"): a job of two levels in one new file
// (fixtures/activity.js). It registers with no warning, the bot passes each level (a drop more at level 2) and is
// paid by the level, and the career starts it at the safehouse.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecipe, specWarnings } from './kit.mjs';
import { botRun } from '../../tools/bot.mjs';

const extra = [{ file: 'tests/recipes/fixtures/activity.js', as: 'activities/job-leaflets.js' }];
test('an activity from one new file: the bot passes both levels; it starts at the safehouse', async () => {
  for (const level of [1, 2]) {
    const r = await botRun({ id: 'job_leaflets', seed: 1, level, secs: 400, extra });
    assert.ok(r.passed, `level ${level}: ${r.stage}: ${r.failures.join('; ')} ${r.errors.join('; ')}`);
  }
  const g = await withRecipe('activity', 'activities/job-leaflets.js', { hash: '#play/safehouse', query: { seed: '1', time: 'day', weather: 'clear' } });
  assert.equal(specWarnings(g, ['job_leaflets']).length, 0, specWarnings(g, ['job_leaflets']).join('; '));
  const spec = g.M.get('activities', 'job_leaflets');
  assert.deepEqual([1, 2].map(l => spec.rewardsFor(l).cash), [100, 200], 'paid by the level');
  g.game.advance(.5);
  const s = g.gtm.career.startable().find(a => a.spec.id === 'job_leaflets'), q = g.gtm.city.poi('safehouse');
  assert.ok(s && Math.hypot(s.at[0] - q.x, s.at[1] - q.y) < 1, 'started at the safehouse');
});
