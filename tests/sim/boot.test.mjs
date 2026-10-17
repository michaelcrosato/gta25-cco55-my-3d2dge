import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../harness.mjs';

test('the game boots headless to the title and starts play on ✕ / Enter', async () => {
  const { game, snap } = await loadGame();
  game.advance(.5);
  assert.equal(snap().scene, 'title');
  holdCode(game, 'Enter'); game.advance(.5);
  assert.equal(snap().scene, 'play');
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});
test('#play opens play directly, and the protagonist walks on D (screen right, through the view)', async () => {
  const { game, snap } = await loadGame({ hash: 'play' });
  game.advance(.3);
  const a = snap().hero;
  holdCode(game, 'KeyD', 1);
  const b = snap().hero;
  assert.equal(snap().scene, 'play');
  assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) > 30, `moved from ${a} to ${b}`);
});
test('the console handle and the view list are in place', async () => {
  const { gtm, game } = await loadGame();
  assert.ok(gtm && gtm.game === game && gtm.views && gtm.bindings && gtm.activity);
  assert.deepEqual([...game.views], ['iso']);
});
