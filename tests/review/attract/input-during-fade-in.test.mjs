// Review (attract mode, PLAN.md 8.20 "Any input from any device leaves it"): an input made while the title fades out
// into the demo is lost. At 10 s of idle the title calls game.go('attract'); the engine then holds the title still for
// its fade (game.fadeTime, .22 s: the old scene is not updated while it fades out) and only then enters the attract
// scene, whose enter() takes `t0 = game.input.clock` and wakes only on activity after t0 (wokeBy(input, t0, ...)). A
// key tapped, a mouse moved or a pad button tapped in those .22 s wakes nothing: the demo starts and plays on, and the
// player has to press again.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';
import { pad } from '../../fixtures/pads.mjs';

const STEP = 1 / 120;
// step the title until it has asked for the demo (the engine's fade-out under way), then `then` seconds more
async function toFade(o = {}) {
  const g = await loadGame(o), { game } = g;
  let n = 0;
  while (!(game._fade && game._fade.name === 'attract' && game._fade.out)) { game.advance(STEP); if (++n > 120 * 12) throw new Error('the title never went for the demo'); }
  return { ...g, idleAt: +(n * STEP).toFixed(3) };
}
for (const [what, act, withPad] of [
  ['a key tapped', g => { g.input.press('KeyQ'); g.advance(STEP); g.input.release('KeyQ'); }],
  ['the mouse moved', g => { g.input.raw.activity = g.input.clock; g.input.lastDevice = 'mouse'; g.advance(STEP); }],   // (as the page's pointermove does)
  ['a pad button tapped', (g, P) => { P[0] = pad(0, { pressed: [0] }); g.advance(STEP); P[0] = pad(0); }, true],
]) test(`${what} as the title fades into the demo brings the title back`, async () => {
  const P = withPad ? [pad(0)] : null, { game, snap, idleAt } = await toFade({ pads: P });
  game.advance(.1);   // (a tenth of a second into the .22 s fade-out: the screen darkening)
  const during = { scene: game.sceneName, fading: !!game._fade };
  act(game, P);
  game.advance(.2);   // (the demo entered)
  const entered = snap();
  game.advance(1.5);
  const later = snap();
  assert.equal(later.scene, 'title', `${what} at ${(idleAt + .1).toFixed(2)} s of idle, while ${during.scene} faded out (fading ${during.fading}); ` +
    `after the fade: scene ${entered.scene}, leaving ${entered.leaving}; 1.5 s later: scene ${later.scene}, leaving ${later.leaving}, reel ${later.reel}`);
});
