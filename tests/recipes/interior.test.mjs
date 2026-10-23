// The interior recipe (docs/CONTENT-GUIDE.md, "An interior"): an interior and its city door in one new file
// (fixtures/interior.js). It validates (its door walkable and marked, every room reached), and in play E at the city
// door goes in (its guard on its round), E at its door comes out where it went in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecipe, specWarnings, holdCode, tap } from './kit.mjs';

test('an interior from one new file: it validates; in by its city door and out again', async () => {
  const g = await withRecipe('interior', 'interiors/pawnshop.js', { hash: '#play/pawnshop-door', query: { seed: '1', time: 'day', weather: 'clear' } });
  const { game, gtm, M, snap } = g;
  assert.equal(specWarnings(g, ['pawnshop', 'lucky-pawn']).length, 0, specWarnings(g, ['pawnshop', 'lucky-pawn']).join('; '));
  const v = M.validateInterior(M.buildInterior('pawnshop'));
  assert.equal(v.errors.length, 0, [...v.errors].join('; '));
  assert.deepEqual([...v.reach.front].sort(), ['the back room', 'the shop', 'the stockroom'], 'every room through the front door');
  game.advance(1);
  const h0 = snap().hero; assert.equal(snap().door, 'pawnshop-door', 'the prompt at the door');
  tap(game, 'KeyE', .8);
  assert.equal(snap().interior, 'pawnshop', 'inside'); assert.equal(snap().door, 'front');
  assert.equal(gtm.interior().run.guards.length, 1, 'its guard');
  holdCode(game, 'KeyW', .6); game.advance(1); holdCode(game, 'KeyS', .6); game.advance(.5);
  assert.equal(snap().door, 'front', 'back at the door');
  tap(game, 'KeyE', .8);
  assert.equal(snap().interior, null, 'out again'); assert.deepEqual(snap().hero, h0, 'where it went in');
});
