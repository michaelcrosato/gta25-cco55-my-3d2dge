// MOTOR input: per-context bindings over raw state, chords, conflicts, prompts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';
import { pad } from '../fixtures/pads.mjs';

const E = engineGlobal();
const { Bindings } = await import('../../src/motor/input/bindings.js');
const { parsePrompt, codeFor } = await import('../../src/motor/input/prompts.js');

/** an Input-like object: held codes, raw keys and pads, as GTM-PATCH(4) shapes them */
const fakeInput = (pads = []) => ({ held: new Set(), raw: { keys: new Set(), pads, active: pads[0] ? pads[0].index : null, activity: -1 }, deadzone: .18 });
const step = (b, n = 1) => { for (let i = 0; i < n; i++) b.update(1 / 120); };

test('a key taps for one step and stays down while held', () => {
  const I = fakeInput(), b = new Bindings(I); b.setContext('onFoot');
  I.held.add('KeyE'); step(b);
  assert.ok(b.tap('interact') && b.down('interact'));
  step(b); assert.ok(!b.tap('interact') && b.down('interact'));
});
test('a held button survives a context switch (the engine use() trap) and does not re-tap', () => {
  const I = fakeInput([pad(0)]), b = new Bindings(I);
  I.raw.pads[0] = pad(0, { values: { 7: 1 } }); b.setContext('onFoot'); step(b);
  assert.ok(b.down('attack'));
  b.setContext('vehicle'); step(b);
  assert.equal(b.value('throttle'), 1, 'R2 held while getting in keeps the throttle');
  assert.ok(!b.tap('throttle'));
});
test('analog triggers: half an R2 is half throttle', () => {
  const I = fakeInput([pad(0, { values: { 7: .5 } })]), b = new Bindings(I); b.setContext('vehicle'); step(b);
  assert.equal(b.value('throttle'), .5);
  // a browser calls a trigger pressed from about an eighth of its travel (Chromium: 30/255): its value still counts
  I.raw.pads[0].buttons[7] = { pressed: true, value: .3 }; step(b);
  assert.equal(b.value('throttle'), .3, 'a pressed trigger keeps its travel');
  I.raw.pads[0].buttons[7] = { pressed: true, value: 0 }; step(b);
  assert.equal(b.value('throttle'), 1, 'a press that reports no value is a full one');
});
test('L3 + R3 together is the ability; L3 alone is crouch after the chord window', () => {
  const I = fakeInput([pad(0)]), b = new Bindings(I); b.setContext('onFoot');
  I.raw.pads[0] = pad(0, { pressed: [10, 11] }); step(b);
  assert.ok(b.tap('ability'));
  let crouched = false; for (let i = 0; i < 30; i++) { step(b); crouched ||= b.tap('crouch') || b.tap('view'); }
  assert.ok(!crouched, 'the chord halves did not also fire');
  I.raw.pads[0] = pad(0); step(b, 2); I.raw.pads[0] = pad(0, { pressed: [10] });
  let c = false; for (let i = 0; i < 30; i++) { step(b); c ||= b.tap('crouch'); }
  assert.ok(c, 'L3 alone crouches');
});
test('R3 is the view button on release; held, a right-stick flick turns the camera instead', () => {
  const I = fakeInput([pad(0)]), b = new Bindings(I); b.setContext('onFoot');
  const run = (n, fn) => { let hit = false; for (let i = 0; i < n; i++) { step(b); hit ||= fn(); } return hit; };
  I.raw.pads[0] = pad(0, { pressed: [11] });
  assert.ok(!run(20, () => b.tap('view')), 'not while R3 is held (the chord window and the release window)');
  I.raw.pads[0] = pad(0); step(b);
  assert.ok(b.tap('view'), 'let go: the view cycles');
  I.raw.pads[0] = pad(0, { pressed: [11] }); step(b, 4);
  I.raw.pads[0] = pad(0, { pressed: [11], axes: [0, 0, -.9, 0] }); step(b);
  assert.ok(b.tap('turnLeft') && !b.tap('turnRight'), 'R3 held, the right stick flicked left: a turn');
  assert.ok(b.modifierHeld(), 'the right stick is spoken for (no aiming)');
  I.raw.pads[0] = pad(0, { pressed: [11] }); step(b, 2); I.raw.pads[0] = pad(0); step(b);
  assert.ok(!b.tap('view'), 'R3 spent on a turn: no view change as it is let go');
  I.raw.pads[0] = pad(0, { pressed: [11] }); step(b, 90); I.raw.pads[0] = pad(0); step(b);
  assert.ok(!b.tap('view'), 'held past the release window: no view change');
});
test('[ and ] turn the camera; V cycles the view; each in both contexts', () => {
  const I = fakeInput(), b = new Bindings(I);
  for (const ctx of ['onFoot', 'vehicle']) {
    b.setContext(ctx);
    I.held.add('BracketLeft'); step(b); assert.ok(b.tap('turnLeft'), ctx); I.held.delete('BracketLeft'); step(b);
    I.held.add('BracketRight'); step(b); assert.ok(b.tap('turnRight'), ctx); I.held.delete('BracketRight'); step(b);
    I.held.add('KeyV'); step(b); assert.ok(b.tap('view'), ctx); I.held.delete('KeyV'); step(b);
  }
});
test('movement comes from the stick and WASD, never the d-pad', () => {
  const I = fakeInput([pad(0, { pressed: [12] })]), b = new Bindings(I); b.setContext('onFoot'); step(b);
  assert.deepEqual(b.direction('onFoot'), [0, 0]);
  assert.ok(b.tap('phone'), 'd-pad up opens the phone');
});
test('rebinding refuses a conflict in the same context and a locked code', () => {
  const b = new Bindings(fakeInput());
  assert.equal(b.rebind('onFoot', 'jump', 'KeyE').reason, 'conflict');
  assert.equal(b.rebind('onFoot', 'jump', 'Escape').reason, 'locked');
  assert.ok(b.rebind('vehicle', 'horn', 'KeyJ').ok);
  assert.ok(b.rebind('onFoot', 'jump', 'KeyJ').ok, 'the same key in another context is fine');
});
test('prompts resolve to the device in use', () => {
  const b = new Bindings(fakeInput());
  assert.equal(codeFor(b, 'interact', 'gamepad', 'onFoot'), 'Pad3');
  assert.equal(codeFor(b, 'interact', 'keyboard', 'onFoot'), 'KeyE');
  assert.deepEqual(parsePrompt('{onFoot:interact} Steal', b, 'gamepad').map(p => p.code || p.text), ['Pad3', ' Steal']);
  void E;
});
