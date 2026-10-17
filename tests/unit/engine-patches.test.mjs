// The vendored engine's patches (vendor/my-3d2dge/PATCHES.md), each tested where it lives.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { ENGINE } from '../../tools/build.mjs';

/** the engine in a fresh context whose navigator reports these gamepads */
function engineWithPads(pads) {
  const ctx = { console: { log() {}, warn() {}, error() {} }, navigator: { getGamepads: () => pads } };
  vm.createContext(ctx); vm.runInContext(readFileSync(ENGINE, 'utf8'), ctx, { filename: 'my-3d2dge.js' });
  return ctx.My3D2dge;
}
const pad = (index, o = {}) => ({ index, id: o.id || 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', connected: true, mapping: 'standard',
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: !!(o.pressed || []).includes(i), value: (o.values || {})[i] || ((o.pressed || []).includes(i) ? 1 : 0) })),
  axes: o.axes || [0, 0, 0, 0] });

test('GTM-PATCH(4): every pad is read raw, with analog trigger values', () => {
  const pads = [pad(0), pad(2, { values: { 7: .5 } })], E = engineWithPads(pads), game = new E.Game({ headless: true }).start({ update() {}, draw() {} });
  game.advance(1 / 60);
  const raw = game.input.raw;
  assert.equal(raw.pads.length, 2);
  assert.equal(raw.pads[1].index, 2);
  assert.equal(raw.pads[1].buttons[7].value, .5);
  assert.equal(raw.active, 2, 'the pad with input is the active one');
  assert.ok(raw.activity >= 0, 'a trigger counts as activity');
  assert.equal(game.input.padIndex, 2, 'the engine follows the pad in use, not pad 0');
});
test('GTM-PATCH(4): a resting pad is no activity; a stick past the dead zone is', () => {
  const pads = [pad(0)], E = engineWithPads(pads), game = new E.Game({ headless: true }).start({ update() {}, draw() {} });
  game.advance(.5);
  assert.equal(game.input.raw.activity, -1, 'nothing happened yet');
  pads[0] = pad(0, { axes: [.6, 0, 0, 0] }); game.advance(1 / 60);
  assert.ok(game.input.raw.activity > 0);
});
test('GTM-PATCH(4): scripted presses count as activity, and clear() empties raw.keys', () => {
  const E = engineWithPads([]), game = new E.Game({ headless: true }).start({ update() {}, draw() {} });
  game.advance(.25); game.input.press('KeyQ');
  assert.ok(game.input.raw.activity > 0);
  game.input.raw.keys.add('KeyQ'); game.input.clear();
  assert.equal(game.input.raw.keys.size, 0);
});
test('GTM-PATCH(4): a press shorter than a step shows in raw.pressed for exactly one step', () => {
  const E = engineWithPads([]), game = new E.Game({ headless: true }).start({ update() {}, draw() {} });
  game.advance(1 / 60);
  game.input.press('KeyE'); game.input.release('KeyE');   // down and up between two steps
  game.advance(1 / 120); assert.ok(game.input.raw.pressed.has('KeyE'), 'seen in the next step');
  game.advance(1 / 120); assert.ok(!game.input.raw.pressed.has('KeyE'), 'and only that one');
});
test('GTM-PATCH(4): clear() still resets the engine\'s own edge state (no line lost to the patch)', () => {
  const E = engineWithPads([]), game = new E.Game({ headless: true }).start({ update() {}, draw() {} });
  game.advance(1 / 60); game.input.press('Enter'); game.advance(1 / 120);
  game.input.clear(); game.advance(1 / 120);
  assert.ok(!game.input.down('confirm') && !game.input.released('confirm') && game.input.padMove[0] === 0);
});
