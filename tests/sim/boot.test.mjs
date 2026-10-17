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
  assert.deepEqual([...game.views], ['iso', 'top', 'side7'], 'ISO, then TOP-DOWN, then SIDE-SCROLL MODE 7 (R3 cycles them)');
});
test('the view cycles ISO -> TOP-DOWN -> MODE 7 -> ISO on R3 / V, and walking stays screen-relative in each', async () => {
  const { game, snap, gtm } = await loadGame({ hash: 'play' });
  game.advance(.2);
  const seen = [], heard = []; gtm.BUS.on('view', e => heard.push(e.prev + '>' + e.view));
  for (let i = 0; i < 3; i++) { seen.push(snap().view); holdCode(game, 'KeyV'); }
  assert.deepEqual(seen, ['iso', 'top', 'side7']); assert.equal(snap().view, 'iso');
  assert.deepEqual(heard, ['iso>top', 'top>side7', 'side7>iso'], 'the BUS hears each change');
  // in MODE 7 (north rail) pushing up walks north, into the screen
  holdCode(game, 'KeyV'); holdCode(game, 'KeyV'); assert.equal(snap().view, 'side7');
  const a = snap().hero; holdCode(game, 'KeyW', .6); const b = snap().hero;
  assert.ok(b[1] < a[1] - 15 && Math.abs(b[0] - a[0]) < 3, `up the screen is north on the north rail: ${a} -> ${b}`);
  assert.equal(gtm.stage.depth, gtm.stage.side7);
});

test('[ and ] turn the camera a quarter: the ISO yaw, the MODE 7 rail; TOP-DOWN stays north-up; walking turns with it', async () => {
  const { game, snap, gtm } = await loadGame({ hash: 'play' });
  game.advance(.2);
  const walk = () => { const a = snap().hero; holdCode(game, 'KeyW', .4); const b = snap().hero; return [b[0] - a[0], b[1] - a[1]]; };
  const up0 = walk();
  holdCode(game, 'BracketRight'); assert.equal(game.yaw, 90, 'ISO turned a quarter');
  const up1 = walk(), dot = (up0[0] * up1[0] + up0[1] * up1[1]) / (Math.hypot(...up0) * Math.hypot(...up1));
  assert.ok(Math.abs(dot) < .05, `up the screen turned a quarter in the world: ${up0} then ${up1}`);
  holdCode(game, 'BracketLeft'); holdCode(game, 'BracketLeft'); assert.equal(game.yaw, 270, 'and back past north');
  holdCode(game, 'KeyV'); assert.equal(snap().view, 'top'); holdCode(game, 'BracketRight'); assert.equal(game.yaw, 270, 'TOP-DOWN does not turn');
  holdCode(game, 'KeyV'); assert.equal(snap().view, 'side7'); holdCode(game, 'BracketRight'); assert.equal(gtm.stage.side7.heading, 90, 'the MODE 7 rail turns');
});
