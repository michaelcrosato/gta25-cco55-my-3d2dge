// The attract loop (PLAN.md 8.20): 10 s of title idle starts the demo; any input from any device returns at once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../harness.mjs';
import { pad } from '../fixtures/pads.mjs';

test('9.9 s of idle stays on the title; 10.0 s starts the attract mode', async () => {
  const { game, snap } = await loadGame();
  game.advance(.05); const t0 = snap().t;
  game.advance(9.85 - t0 - .05);
  assert.equal(snap().scene, 'title', 'still the title just before 10 s: ' + JSON.stringify(snap()));
  game.advance(.2 + .25);   // the switch starts at 10.0 s; the engine's fade-out (game.fadeTime, .22 s) holds the old scene
  assert.equal(snap().scene, 'attract', JSON.stringify(snap()));
});
for (const [what, act] of [
  ['a bound key (Enter)', g => holdCode(g, 'Enter')],
  ['an unbound key (KeyP)', g => holdCode(g, 'KeyP')],
  ['a mouse button', g => holdCode(g, 'Mouse0')],
]) test(`any input returns to the title: ${what}`, async () => {
  const { game, snap } = await loadGame({ hash: 'attract' });
  game.advance(2);
  assert.equal(snap().scene, 'attract');
  act(game); game.advance(.4);
  assert.equal(snap().scene, 'title', JSON.stringify(snap()));
});
test('a stick nudge alone, on a DualSense that is not pad 0, returns to the title', async () => {
  const pads = [null, pad(1)];
  const { game, snap } = await loadGame({ hash: 'attract', pads });
  game.advance(2);
  assert.equal(snap().scene, 'attract');
  pads[1] = pad(1, { axes: [0, 0, .7, 0] }); game.advance(1 / 60); pads[1] = pad(1); game.advance(.4);
  assert.equal(snap().scene, 'title', JSON.stringify(snap()));
});
test('the title idle timer restarts after the demo, and the demo loops back again', async () => {
  const { game, snap } = await loadGame({ hash: 'attract' });
  game.advance(1); holdCode(game, 'KeyQ'); game.advance(.4);
  assert.equal(snap().scene, 'title');
  game.advance(5); assert.equal(snap().scene, 'title', 'not straight back into the demo');
  game.advance(6); assert.equal(snap().scene, 'attract');
});
