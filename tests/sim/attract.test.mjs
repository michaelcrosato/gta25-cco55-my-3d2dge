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

// M11 (PLAN.md 8.20, 9.11): every kind of input leaves within one step (in Node the mouse's move and the wheel are the
// activity clock moving, as the page's events move it: tests/e2e/attract.mjs drives the real ones); the title's menus
// go to the demo too, never while a rebind waits; the kiosk; the demo writes nothing and hands back the streams; the
// show itself.
const STEP = 1 / 120;
for (const [what, act, withPads] of [
  ['a key', g => g.input.press('Enter')],
  ['an unbound key', g => g.input.press('KeyP')],
  ['a click', g => g.input.press('Mouse0')],
  ['a mouse move', g => { g.input.raw.activity = g.input.clock; g.input.lastDevice = 'mouse'; }],
  ['the wheel', g => { g.input.raw.activity = g.input.clock; }],
  ['a pad button', (g, P) => { P[0] = pad(0, { pressed: [0] }); }, true],
  ['a stick', (g, P) => { P[0] = pad(0, { axes: [.6, 0, 0, 0] }); }, true],
  ['a trigger', (g, P) => { P[0] = pad(0, { values: { 7: .5 } }); }, true],
]) test(`the demo leaves within one step: ${what}`, async () => {
  const P = withPads ? [pad(0)] : null, { game, snap } = await loadGame({ hash: 'attract', pads: P });
  game.advance(1); assert.equal(snap().scene, 'attract'); assert.equal(snap().leaving, null);
  act(game, P); game.advance(STEP);
  assert.ok(snap().leaving, 'leaving after one step: ' + JSON.stringify(snap()));
  game.advance(.5); assert.equal(snap().scene, 'title');
});

test('a menu opened from the title goes to the demo after 10 s too; a rebind waiting for its button never does', async () => {
  const a = await loadGame(); a.game.advance(.5);
  const app = g => ({ ui: g.gtm.ui, game: g.game, bindings: g.gtm.bindings, views: g.gtm.views });
  a.gtm.ui.screens.open(a.gtm.motor.settingsScreen(app(a))); a.game.advance(10.5);
  assert.equal(a.snap().scene, 'attract', 'from the settings');
  const b = await loadGame(); b.game.advance(5);   // (five seconds idle, then a rebind waiting: its own eight seconds at most)
  const R = b.gtm.motor.rebindScreen(app(b), 'onFoot'); b.gtm.ui.screens.open(R); R.list.current.act(); b.game.advance(1 / 60);
  assert.equal(R.capturing, true, 'waiting for its button'); b.game.advance(6.5);
  assert.equal(R.capturing, true); assert.equal(b.snap().scene, 'title', 'eleven and a half seconds idle, still the title: ' + JSON.stringify(b.snap()));
});

test('the kiosk: taps stay in the demo (the menu button opens its overlay; elsewhere BEST WITH A CONTROLLER, once in 30 s); a pad connecting opens the title', async () => {
  const pads = [], { game, gtm, snap } = await loadGame({ hash: 'attract', query: { kiosk: '1' }, pads });
  game.advance(1); assert.equal(snap().kiosk, true);
  const tap = (x, y) => { gtm.ui.layer.tapAt(x, y); game.input.lastDevice = 'touch'; game.input.raw.activity = game.input.clock; game.advance(STEP * 2); };
  tap(40, 120); assert.equal(snap().note, 'BEST WITH A CONTROLLER'); assert.equal(snap().leaving, null, 'a tap never leaves');
  game.advance(4); tap(60, 140); assert.equal(snap().note, null, 'not again within 30 s');
  const b = gtm.kioskButton(); tap(b[0] + b[2] / 2, b[1] + b[3] / 2);
  assert.equal(snap().menu, 'kiosk', 'the menu button: its overlay'); assert.equal(snap().scene, 'attract');
  game.advance(2); assert.equal(snap().scene, 'attract', 'the demo goes on under it');
  gtm.ui.screens.closeAll(); game.advance(1);
  pads[0] = pad(0); game.advance(STEP * 2);
  assert.equal(snap().leaving, 'pad', 'a controller connecting'); game.advance(.5); assert.equal(snap().scene, 'title');
  const k = await loadGame({ hash: 'attract', query: { kiosk: '1' } }); k.game.advance(1); k.input.press('Space'); k.game.advance(STEP);
  assert.equal(k.snap().leaving, 'key', 'a hardware key');
});

test('the demo writes nothing (no save, autosave or settings), keeps the rumble off, and hands the streams back as a boot leaves them', async () => {
  const { game, gtm, snap } = await loadGame({ hash: 'attract' }), M = gtm.motor; let saves = 0;
  const un = M.BUS.on('save', () => { saves++; });
  game.advance(45); assert.equal(snap().scene, 'attract'); assert.equal(game.input.rumbleScale, 0, 'the rumble off');
  assert.equal(gtm.career.write('1').ok, false, 'the demo\'s career never writes');
  game.input.press('KeyQ'); game.advance(.5);
  assert.equal(snap().scene, 'title'); assert.equal(saves, 0, 'nothing saved'); assert.ok(game.input.rumbleScale > 0, 'the rumble back');
  assert.equal(M.RNG.worldSeed, gtm.seed, 'the world streams from the app\'s seed again'); un();
});

test('the show: the reels in turn with a card between, the camera plan\'s three views and the bank, and no errors (two and a half minutes)', async () => {
  const { game, gtm, ctx } = await loadGame({ hash: 'attract' }), errs = [];
  ctx.console.error = (...a) => errs.push(a.join(' '));
  for (let t = 0; t < 150; t++) game.advance(1);
  const S = gtm.director.stats;
  assert.ok(Object.keys(S.reels).length >= 4, 'reels: ' + JSON.stringify(S.reels)); assert.ok(S.cards >= 1, 'a card');
  assert.deepEqual([...S.views].sort(), ['iso', 'side7', 'top']); assert.equal(S.errors, 0); assert.deepEqual(errs, []);
});
