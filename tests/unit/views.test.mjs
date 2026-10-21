// M7's view manager (PLAN.md 8.2, 5.5): the views remembered on foot and in a vehicle, Auto, and the switch's
// crossfade timing; headless, on a stand-in game (the engine's setView recorded) and the engine's null canvases.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

const E = engineGlobal();
const { ViewManager } = await import('../../src/motor/render/view-manager.js');
const { CrossFade } = await import('../../src/motor/render/crossfade.js');
const { TUNE } = await import('../../src/motor/core/tune.js');
const fakeGame = () => { const g = { set: [], setView(id) { g.set.push(id); return g; }, view: {}, mouseGround: () => null }; return g; };
const make = (open = null) => { const g = fakeGame(), V = new ViewManager(g); V.addView({ id: 'top', label: 'TOP-DOWN' }); V.addView({ id: 'side7', label: 'MODE 7' }); if (open) g.setView(open); return { g, V }; };

test('memory: the view chosen on foot and the one in a vehicle are each brought back on getting out and in', () => {
  const { V } = make(); TUNE.camMemory = 1; TUNE.camAuto = 0;
  V.context('foot'); assert.equal(V.active, 'iso');
  V.next(); assert.equal(V.active, 'top', 'R3 on foot: TOP-DOWN');
  V.context('vehicle'); assert.equal(V.active, 'iso', 'in a car: its own view (ISO, none chosen yet)');
  V.next(); V.next(); assert.equal(V.active, 'side7', 'R3 twice in the car: MODE 7');
  V.context('foot'); assert.equal(V.active, 'top', 'out: TOP-DOWN again');
  V.context('vehicle'); assert.equal(V.active, 'side7', 'in again: MODE 7');
  TUNE.camMemory = 0; V.context('foot'); assert.equal(V.active, 'side7', 'memory off: one view for both');
  TUNE.camMemory = 1;
});

test('memory: the view the scene opens in (a deep link\'s) stays on getting in and out until the player picks another', () => {
  const { V } = make('top');
  V.context('foot'); V.context('vehicle'); assert.equal(V.active, 'top', 'in a car: still TOP-DOWN');
  V.context('foot'); assert.equal(V.active, 'top');
});

test('Auto: ISO on foot, TOP-DOWN at speed in a vehicle and back below it; the player\'s own switch holds until they get out', () => {
  const { V } = make(); TUNE.camAuto = 1;
  V.context('foot'); assert.equal(V.active, 'iso');
  V.context('vehicle', .2); assert.equal(V.active, 'iso', 'slow: ISO');
  V.context('vehicle', .6); assert.equal(V.active, 'top', 'fast: TOP-DOWN');
  V.context('vehicle', .4); assert.equal(V.active, 'top', 'a little slower: still TOP-DOWN (hysteresis)');
  V.context('vehicle', .2); assert.equal(V.active, 'iso', 'slow again: ISO');
  V.next(); assert.equal(V.active, 'top'); V.context('vehicle', .1); assert.equal(V.active, 'top', 'the player\'s own choice holds');
  V.context('foot'); assert.equal(V.active, 'iso', 'out: ISO');
  TUNE.camAuto = 0;
});

test('a switch is seen through the crossfade: the old frame is gone within 0.35 s, and with the fade at 0 it is a cut', () => {
  const X = new CrossFade(), g = E.mkCanvas(8, 8).getContext('2d'), src = E.mkCanvas(64, 36);
  X.start(src); assert.ok(X.active, 'the old frame showing');
  let t = 0; while (X.active && t < 1) { X.draw(g, 1 / 60); t += 1 / 60; }
  assert.ok(!X.active, 'it ends');
  assert.ok(t <= TUNE.viewFade + 1e-9, `within the fade's ${TUNE.viewFade} s: ${t.toFixed(3)} s`);
  assert.ok(t >= TUNE.viewFade * .8, `but a dissolve, not a cut: ${t.toFixed(3)} s`);
  const was = TUNE.viewFade; TUNE.viewFade = 0; X.start(src); assert.ok(!X.active, 'viewFade 0: a cut'); TUNE.viewFade = was;
});

test('a stick pushed the way groundDirToScreen says is read back as that ground direction, in every view and on every rail (the pad pass aims true)', async () => {
  const { Side7View } = await import('../../src/motor/render/depth/side7.js');
  const { TopView } = await import('../../src/motor/render/depth/top.js');
  const views = [];
  for (const h of [0, 90, 180, 270]) { const v = new Side7View({}); v.setHeading(h); views.push(['side7 ' + h, v]); }
  views.push(['top', new TopView({})]);
  for (const [name, v] of views) {
    const V = { spec: { groundDirToScreen: v.groundDirToScreen ? (x, y) => v.groundDirToScreen(x, y) : null }, screenVec: (x, y, z) => v.screenVec(x, y, z) };
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2 + .1, w = [Math.cos(a), Math.sin(a)];
      const s = ViewManager.prototype.groundDirToScreen.call(V, w[0], w[1]), back = v.screenDirToGround(s[0], s[1]), l = Math.hypot(back[0], back[1]);
      assert.ok(Math.abs(back[0] / l - w[0]) < 1e-9 && Math.abs(back[1] / l - w[1]) < 1e-9, `${name}: ${a.toFixed(2)} rad comes back as ${Math.atan2(back[1], back[0]).toFixed(2)}`);
    }
  }
});
