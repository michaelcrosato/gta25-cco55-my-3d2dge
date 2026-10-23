// FAN-OUT B (10-foot UI): with a real browser's gamepad, R2 at half travel is full throttle.
// PLAN.md 8.1: "Analog: triggers 0..1 from button.value" and its Accept: "R2 at 0.5 gives throttle 0.5". A browser
// reports an analog trigger as pressed from about an eighth of its travel (Chromium: 30/255; tests/unit/input.test.mjs
// says so itself). The engine's Input.tick then presses 'Pad7' into input.held, and Bindings.codeValue
// (src/motor/input/bindings.js) returns Math.max(button.value, input.held.has('Pad7') ? 1 : 0): 1 for any trigger past
// that eighth. The unit test passes because its stand-in input's held set is always empty, and the harness's fake pad
// calls a button pressed only above .5, so nothing ever saw it: on a DualSense in a browser the throttle (and L2's brake)
// is on or off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';
import { pad } from '../../fixtures/pads.mjs';

test('R2 at half travel, reported as a browser does (pressed, value .5), gives throttle .5 in a car', async () => {
  const pads = [pad(0)];
  const { game, gtm } = await loadGame({ hash: 'play', query: { time: 'day', traffic: '0' }, pads });
  game.advance(.5);
  const p = gtm.crew.ped, v = gtm.fleet.near(p.x, p.y, 3000).find(q => q.cls === 'car');
  const [x, y] = v.toWorld(0, -v.hw - 14); gtm.teleport(x, y); game.advance(.5);
  pads[0] = pad(0, { pressed: [3] }); game.advance(1 / 30); pads[0] = pad(0); game.advance(1.5);
  assert.ok(p.seat && p.seat.vehicle, 'set-up: at the wheel');
  const trigger = (n, value, pressed) => { const q = pad(0); q.buttons[n] = { pressed, value }; pads[0] = q; game.advance(.1); return { held: game.input.held.has('Pad' + n), intent: gtm.human.intent }; };
  const seen = [];
  for (const [value, pressed] of [[.5, true], [.25, true], [.15, true]]) {
    const r = trigger(7, value, pressed); seen.push(`R2 ${value}: throttle ${r.intent.throttle} (engine held Pad7: ${r.held})`);
    trigger(7, 0, false);
  }
  const r = trigger(6, .3, true); seen.push(`L2 .3: brake ${r.intent.brake} (engine held Pad6: ${r.held})`);
  trigger(6, 0, false);
  // (the repo's own fixture, which calls a button pressed above half: R2 at three quarters)
  pads[0] = pad(0, { values: { 7: .75 } }); game.advance(.1); seen.push(`fixture pad(0, { values: { 7: .75 } }): throttle ${gtm.human.intent.throttle}`);
  trigger(7, 0, false);
  const half = trigger(7, .5, true).intent.throttle;
  assert.ok(Math.abs(half - .5) < .01, `the triggers are on or off: ${seen.join('; ')}`);
});
