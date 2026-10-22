// The ped recipe (docs/CONTENT-GUIDE.md, "A ped"): a crowd archetype in one new file (fixtures/ped.js). It registers
// with no warning, each look comes from its palettes, it fits the Brickyard alone, and the Brickyard's crowd walks it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecipe, specWarnings } from './kit.mjs';

test('a ped from one new file: its looks from its palettes; the Brickyard\'s crowd picks it by its weight', async () => {
  const g = await withRecipe('ped', 'peds/knife-grinder.js', { hash: '#play/spray-pray', query: { seed: '1', time: 'day', weather: 'clear' } });
  const { game, gtm, M } = g, spec = M.get('peds', 'knife-grinder');
  assert.equal(specWarnings(g, ['knife-grinder']).length, 0, specWarnings(g, ['knife-grinder']).join('; '));
  for (const k of [0, .5, .99]) {
    const look = M.pedLook(spec, { next: () => k });
    assert.ok(spec.builds.includes(look.build) && spec.palettes.cloth.includes(look.colors.cloth) && look.outfit === 'coat', JSON.stringify(look));
  }
  assert.ok(M.pedFits(spec, 'brick', false) && !M.pedFits(spec, 'neon', false), 'the Brickyard\'s, nobody else\'s');
  game.advance(15);
  const grinders = gtm.life.crowd.members.filter(q => q.arch === 'knife-grinder');
  assert.ok(grinders.length > 0, 'grinders on the Brickyard\'s sidewalks: ' + gtm.life.crowd.members.length + ' in the crowd');
  assert.ok(grinders.every(q => spec.palettes.cloth.includes(q.ped.rig.look.colors.cloth)), 'each dressed from its palettes');
});
