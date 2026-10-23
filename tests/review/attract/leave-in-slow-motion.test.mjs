// Review (attract mode, PLAN.md 8.20 "On that input: input.consumeAll(), then game.go('title') in the same step, with a
// fade <= 0.2 s"): leaving during Joyride's slow-motion jump takes half a second. The reel's jump sets m.slowmo(.3), so
// game.timeScale is .3; attract.js leave() asks for a .15 s fade but leaves game.timeScale as it is (only exit(), after
// the fade, puts it back to 1), and the engine runs a fade in game time (each step's dt is the step times
// timeScale). So the title comes 3.3 times later than asked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

const STEP = 1 / 120;
test('a key in Joyride\'s slow motion brings the title within .2 s', async () => {
  const { game, snap } = await loadGame({ hash: 'attract/joyride' });
  let n = 0; while (game.timeScale > .99 && n < 120 * 90) { game.advance(STEP); n++; }
  assert.ok(game.timeScale < .99, 'the jump\'s slow motion came');
  const at = snap(), scale = game.timeScale;
  game.input.press('KeyQ'); game.advance(STEP); game.input.release('KeyQ');
  const woke = snap().leaving;
  let k = 1; while (snap().scene !== 'title' && k < 240) { game.advance(STEP); k++; }
  const secs = k * STEP;
  assert.ok(secs <= .2 + 1e-9, `pressed at ${at.t} s of the demo (${at.reel}, stage ${at.stage}, game.timeScale ${scale}); leaving after one step: ${woke}; the title after ${k} steps = ${secs.toFixed(3)} s of real time (fade asked: .15 s, PLAN: <= .2 s)`);
});
