// The camera's turn (D48): a tap of [ or ] turns every view a quarter, eased round; held, it spins, and let go ISO
// settles on the next of its eight rests ahead (Final Fantasy Tactics' and Xenogears' cameras) while TOP-DOWN and
// MODE 7 stay where they stopped (any heading: MODE 7 then draws as the chase camera does). The turns are made in the
// step, so the stick maps the same headless as in the page, and the simulation never reads them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../harness.mjs';
import { pad } from '../fixtures/pads.mjs';

const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;
const open = async view => { const g = await loadGame({ hash: 'play', query: { view } }); g.game.advance(.5); return g; };
const tap = (game, key) => { holdCode(game, key, 1 / 30); game.advance(1); };   // (a tap, then time to land)
const hold = (game, key, s) => { holdCode(game, key, s); game.advance(1); };

test('ISO: a tap turns a quarter, eased round; held, it spins and lands on the next eighth ahead', async () => {
  const { game, gtm } = await open('iso'), S = gtm.stage;
  tap(game, 'BracketRight'); assert.equal(game.yaw, 90, 'a quarter right'); assert.equal(S.turning, false, 'and landed');
  tap(game, 'BracketRight'); assert.equal(game.yaw, 180);
  tap(game, 'BracketLeft'); assert.equal(game.yaw, 90, 'and back');
  game.input.press('BracketRight'); game.advance(.4); assert.ok(S.turning, 'held: spinning'); const mid = game.yaw;
  assert.ok(mid > 120 && mid % 45 !== 0, `turned on past the quarters while held (${mid})`);
  game.input.release('BracketRight'); game.advance(1);
  assert.ok(game.yaw % 45 === 0 && game.yaw > mid && game.yaw - mid < 45, `let go, on the next eighth ahead (${mid} -> ${game.yaw})`);
});

test('TOP-DOWN: a tap turns it a quarter; held, any heading; a tap from there to the next quarter; the stick maps by it', async () => {
  const { game, gtm } = await open('top'), T = gtm.stage.top, V = gtm.views;
  assert.equal(V.active, 'top'); assert.equal(T.heading, 0, 'north up to begin');
  tap(game, 'BracketRight'); assert.equal(T.heading, 90, 'a quarter: east up');
  hold(game, 'BracketRight', .3); const h = T.heading;
  assert.ok(h > 90 && h < 180 && h % 90 !== 0, `held and let go, it stays where it stopped (${h})`);
  const [ux, uy] = V.screenDirToGround(0, -1), f = [Math.sin(h * Math.PI / 180), -Math.cos(h * Math.PI / 180)];
  assert.ok(near(ux, f[0], 1e-9) && near(uy, f[1], 1e-9), 'the stick pushed up walks the way the top of the screen faces');
  const [sx, sy] = V.screenVec(f[0], f[1]); assert.ok(near(sx, 0) && near(sy, -1), 'and that way is up the screen');
  tap(game, 'BracketLeft'); assert.equal(T.heading, 90, 'a tap from a free heading: the quarter below it');
  tap(game, 'BracketLeft'); assert.equal(T.heading, 0, 'north up again');
});

test('MODE 7: smooth turns to any heading (drawn as at any heading), on a quarter its rail\'s own; a set piece\'s rail holds', async () => {
  const { game, gtm } = await open('side7'), D = gtm.stage.side7, V = gtm.views;
  assert.equal(V.active, 'side7'); assert.ok(D.aligned, 'on a quarter');
  tap(game, 'BracketRight'); assert.equal(D.heading, 90, 'a quarter, eased (no crossfade)'); assert.ok(D.aligned);
  hold(game, 'BracketRight', .3); const h = D.heading;
  assert.ok(!D.aligned && h > 90 && h < 180, `held: any heading (${h})`);
  const a = D.ax(), t = h * Math.PI / 180; assert.ok(near(a.f[0], Math.sin(t)) && near(a.f[1], -Math.cos(t)), 'its axes at that heading');
  const [ux, uy] = V.screenDirToGround(0, -1); assert.ok(near(ux, a.f[0]) && near(uy, a.f[1]), 'the stick pushed up walks into the screen');
  tap(game, 'BracketRight'); assert.equal(D.heading, 180, 'a tap: on to the next quarter'); assert.ok(D.aligned, 'and its rail\'s own drawing again');
  gtm.stage.pointRail(270); assert.equal(D.heading, 270, 'a set piece points the rail');
  assert.equal(gtm.stage.turn(1), false, 'and holds it against a turn');
  hold(game, 'BracketRight', .3); assert.equal(D.heading, 270, 'and against a spin');
  gtm.stage.pointRail(null);
});

test('the turns never touch the simulation: the same run hashes the same turned or not, and the same turns twice alike', async () => {
  const run = async turns => {
    const { game } = await open('iso');
    for (let i = 0; i < 6; i++) hold(game, turns ? (i % 2 ? 'BracketLeft' : 'BracketRight') : 'KeyJ', .25 + i * .05);   // (KeyJ: bound to nothing, the same steps)
    return [...game.stateHash()];   // (a plain array: each game's own is of its own context)
  };
  const plain = await run(false), turned = await run(true);
  assert.deepEqual(turned, plain, 'standing still, turning the camera changes nothing');
  assert.deepEqual(await run(true), turned, 'and the same turns give the same game');
});

test('MODERN, the default scheme (D49): the right stick turns the camera; under L2 it aims and the camera holds; ORIGINAL aims with it', async () => {
  const pads = [pad(0)], { game, gtm } = await loadGame({ hash: 'play', query: { view: 'iso' }, pads }); game.advance(.5);
  const set = o => { pads[0] = pad(0, o); };
  assert.equal(gtm.bindings.scheme, 'modern');
  set({ axes: [0, 0, .9, 0] }); game.advance(1 / 30); set({}); game.advance(1);
  assert.equal(game.yaw, 90, 'a flick of the right stick: a quarter');
  set({ axes: [0, 0, -.9, 0] }); game.advance(.4); assert.ok(gtm.stage.turning, 'held: spinning');
  set({}); game.advance(1); assert.ok(game.yaw % 45 === 0, `let go, on an eighth (${game.yaw})`);
  const yaw = game.yaw;
  set({ values: { 6: 1 }, axes: [0, 0, .9, 0] }); game.advance(.5);
  assert.equal(game.yaw, yaw, 'under L2 the camera holds');
  assert.ok(gtm.human.intent.aim, 'and the stick aims');
  set({}); game.advance(.5);
  const o = await loadGame({ hash: 'play', query: { view: 'iso', controls: 'original' }, pads: [pad(0, { axes: [0, 0, .9, 0] })] }); o.game.advance(1);
  assert.equal(o.gtm.bindings.scheme, 'original'); assert.equal(o.game.yaw, 0, 'ORIGINAL: the stick alone turns nothing');
  assert.ok(o.gtm.human.intent.aim, 'it aims');
});
