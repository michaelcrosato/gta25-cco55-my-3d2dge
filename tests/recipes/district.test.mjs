// The district recipe (docs/CONTENT-GUIDE.md, "A district"): a district in one new file (fixtures/district.js). It
// validates (every walkable cell and road reached from its safehouse), ?dev=1&district=<id> plays it (the player at
// its safehouse, its traffic and its crowd about), and without ?dev=1 the game is Lowtown's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecipe, specWarnings } from './kit.mjs';

test('a district from one new file: it validates; ?dev=1&district=<id> plays it, with traffic and a crowd; Lowtown otherwise', async () => {
  const q = { seed: '1', time: 'day', weather: 'clear' };
  const g = await withRecipe('district', 'districts/millpond/district.js', { hash: '#play', query: { ...q, dev: '1', district: 'millpond' } });
  const { game, gtm, M, snap } = g;
  assert.equal(specWarnings(g, ['millpond']).length, 0, specWarnings(g, ['millpond']).join('; '));
  const v = M.validateCity(M.buildCity('millpond', 40)); assert.equal(v.errors.length, 0, [...v.errors].join('; '));
  game.advance(8);
  const s = snap(), C = gtm.city, home = C.poi('safehouse');
  assert.equal(s.hood, 'Millpond'); assert.equal(C.w, 40); assert.equal(C.h, 40);
  assert.ok(s.traffic > 0 && s.peds > 0, `its traffic (${s.traffic}) and its crowd (${s.peds})`);
  assert.ok(Math.hypot(gtm.crew.ped.x - home.x, gtm.crew.ped.y - home.y) < 80, 'the player at its safehouse');
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
  const lowtown = await withRecipe('district', 'districts/millpond/district.js', { hash: '#play', query: { ...q, district: 'millpond' } });
  lowtown.game.advance(.5); assert.equal(lowtown.gtm.city.w, 160, 'without ?dev=1: Lowtown');
});
