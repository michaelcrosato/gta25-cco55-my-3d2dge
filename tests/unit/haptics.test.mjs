// The DualSense's triggers and lights (L7, input/haptics.js): R2 and L2 by what the player holds (a car's throttle and
// brake by its weight, the engine coughing when it smokes, a plane's stall; a gun's break, an automatic's buzz, a heavy
// one's long pull; free when empty, unarmed or a passenger), the light bar the character's colour, the police's red and
// blue under stars, a red pulse badly hurt, the player lights the stars; at rest in the demo; the rumble carried in the
// same report; nothing without a device, nothing headless.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

engineGlobal();
const { triggersFor, lightFor, Haptics } = await import('../../src/motor/input/haptics.js');
const { DualSenseHID, OFF } = await import('../../src/motor/input/dualsense-hid.js');
const { Rumble } = await import('../../src/motor/input/rumble.js');
const { BUS } = await import('../../src/motor/core/bus.js');

const gun = (o, mag = 6) => { const s = { slot: 'pistol', projectile: 'bullet', rate: 3, mag: 6, recoil: .3, rumble: .25, ...o }; return { current: 'g', mag: { g: mag }, ammo: { g: 40 }, reloading: 0, spec: () => s }; };
const ped = o => ({ id: 'me', dead: false, vitals: { health: 100, maxHealth: 100, dead: false }, seat: null, inv: gun({}), ...o });
const car = (o = {}) => { const v = { cls: 'car', def: { handling: { mass: o.mass || 1200 } }, body: { airborne: false, stalled: false }, damage: { wrecked: false, smoking: false }, ...o }; return v; };

test('the triggers by what the player holds', () => {
  assert.deepEqual(triggersFor(null), { right: OFF, left: OFF });
  const p = ped(); let T = triggersFor(p);
  assert.equal(T.right.mode, 'weapon', 'a pistol: a break'); assert.equal(T.left.mode, 'feedback', 'and the aim\'s stop');
  const shotgun = triggersFor(ped({ inv: gun({ slot: 'shotgun', rate: 1.1, recoil: .8 }) })).right;
  assert.ok(shotgun.mode === 'weapon' && shotgun.k > T.right.k, 'a shotgun\'s break harder than a pistol\'s');
  const smg = triggersFor(ped({ inv: gun({ slot: 'smg', rate: 11, mag: 30 }) })).right;
  assert.equal(smg.mode, 'vibration'); assert.equal(smg.hz, 28, 'an automatic buzzes at its rate');
  assert.deepEqual(triggersFor(ped({ inv: gun({ slot: 'heavy', projectile: 'rocket', rate: .6, mag: 1 }, 1) })).right, { mode: 'weapon', from: 4, to: 8, k: 8 }, 'the launcher: a long hard pull');
  assert.equal(triggersFor(ped({ inv: gun({}, 0) })).right, OFF, 'empty: free');
  const reloading = gun({}); reloading.reloading = .5; assert.equal(triggersFor(ped({ inv: reloading })).right, OFF, 'reloading: free');
  assert.deepEqual(triggersFor(ped({ inv: gun({ slot: 'melee', projectile: 'melee' }) })), { right: OFF, left: OFF }, 'fists or a bat: both free');
  assert.deepEqual(triggersFor(ped({ inv: gun({ slot: 'special', projectile: 'photo', mag: 0 }) })), { right: OFF, left: OFF }, 'the Snap: free');
  const me = ped(), v = car(); v.driver = me; me.seat = { vehicle: v };
  T = triggersFor(me); assert.deepEqual(T, { right: { mode: 'feedback', from: 1, k: 3 }, left: { mode: 'feedback', from: 3, k: 5 } }, 'a car: the throttle\'s give, the brake firmer');
  v.def.handling.mass = 2200; const heavy = triggersFor(me); assert.ok(heavy.right.k > T.right.k && heavy.left.k > T.left.k, 'a heavy one firmer');
  v.damage.smoking = true; assert.equal(triggersFor(me).right.mode, 'vibration', 'smoking: the engine coughs'); v.damage.smoking = false;
  v.body.airborne = true; assert.deepEqual(triggersFor(me), { right: OFF, left: OFF }, 'off the ground: free'); v.body.airborne = false;
  v.cls = 'plane'; assert.equal(triggersFor(me).right.mode, 'feedback'); v.body.stalled = true; assert.equal(triggersFor(me).right.mode, 'vibration', 'a stall shakes'); v.cls = 'car'; v.body.stalled = false;
  v.driver = { id: 'cabbie' }; assert.deepEqual(triggersFor(me), { right: OFF, left: OFF }, 'a passenger: free');
});

test('the light bar: the character\'s colour, the stars\' red and blue, a hurt red pulse', () => {
  const p = ped();
  assert.deepEqual(lightFor(p, 0, '#ff5a4a', 0), [255, 90, 74], 'Dex\'s red');
  assert.deepEqual(lightFor(p, 0, '#3ad0c8', 0), [58, 208, 200], 'Viv\'s teal');
  const a = lightFor(p, 2, '#ff5a4a', 0), b = lightFor(p, 2, '#ff5a4a', .3); assert.notDeepEqual(a, b, 'stars: it flashes'); assert.ok(a[0] > a[2] && b[2] > b[0], 'red, then blue');
  p.vitals.health = 15; const h1 = lightFor(p, 0, '#3ad0c8', 0), h2 = lightFor(p, 0, '#3ad0c8', .45);
  assert.ok(h1[1] === 0 && h1[2] === 0 && h1[0] !== h2[0], 'badly hurt: a red pulse');
});

test('the presenter: one report a frame through the device; at rest in the demo; the rumble in the same report; none headless', async () => {
  const sent = [], dev = { vendorId: 0x054c, productId: 0x0ce6, opened: true, collections: [{ outputReports: [{ reportId: 2, items: [{ reportSize: 8, reportCount: 63 }] }] }],
    async sendReport(id, data) { sent.push(Uint8Array.from(data)); }, async close() {} };
  const hid = new DualSenseHID({ async getDevices() { return [dev]; }, addEventListener() {} }, { now: () => 0 });
  const game = { headless: false, input: { rumbleScale: 1, rumble: () => { throw new Error('the Gamepad API\'s rumble, with a DualSense open by WebHID'); } }, haptics: hid };
  let demo = false, stars = 0; const me = ped();
  const T = new Haptics(game, { hid, player: () => me, off: () => demo, stars: () => stars, color: () => '#ff9a2a' });
  T.frame(1 / 60); assert.equal(sent.length, 0, 'no device open: nothing');
  await hid.connect(); T.frame(1 / 60); await hid.busy;
  const r = sent[sent.length - 1]; assert.equal(r[10], 0x25, 'R2: the pistol\'s break'); assert.equal(r[21], 0x21, 'L2: the aim\'s stop'); assert.deepEqual([r[44], r[45], r[46]], [255, 154, 42], 'Gus\'s orange');
  const n = sent.length; T.frame(1 / 60); await hid.busy; assert.equal(sent.length, n, 'nothing changed: nothing sent');
  stars = 3; T.frame(1 / 60); await hid.busy; assert.equal(sent[sent.length - 1][43], 0x15, 'three stars, three player lights');
  const R = new Rumble(game, { player: () => me, off: () => demo }).attach();
  BUS.emit('crime', { type: 'shooting', by: 'me' }); T.frame(1 / 60); await hid.busy;
  assert.ok(sent[sent.length - 1][3] > 0, 'a shot\'s rumble through the same report');
  demo = true; T.frame(1 / 60); await hid.busy; const d = sent[sent.length - 1];
  assert.equal(d[10], 0x05); assert.equal(d[21], 0x05); assert.equal(d[43], 0, 'the demo: the triggers free, no player lights');
  const k = sent.length; BUS.emit('crime', { type: 'shooting', by: 'me' }); T.frame(1 / 60); await hid.busy; assert.equal(sent.length, k, 'and no rumble');
  demo = false; game.headless = true; T.frame(1 / 60); await hid.busy; assert.equal(sent.length, k, 'never headless');
  R.dispose();
});
