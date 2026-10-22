// The controller's rumble profiles (PLAN.md 8.1, input/rumble.js): a crash by its impact, the player's shots by the
// weapon, a blow the player lands, a blast by its nearness, a heartbeat while badly hurt, a landing by how hard; only
// the player's own; never in the attract mode, never headless. A stand-in input records what would shake.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

engineGlobal();
const { Rumble } = await import('../../src/motor/input/rumble.js');
const { BUS } = await import('../../src/motor/core/bus.js');

test('the rumble profiles: the player\'s crashes, shots, blows, blasts near, a heartbeat, a landing; nobody else\'s; never in the demo', () => {
  const shook = [], game = { headless: false, input: { rumble: (k, s) => { shook.push([+k.toFixed(2), +s.toFixed(2)]); return true; } } };
  const car = { id: 'car', body: { airborne: false, vz: 0 } }, gun = { rumble: .6 };
  const me = { id: 'me', x: 0, y: 0, seat: { vehicle: car }, vitals: { health: 100, maxHealth: 100, dead: false }, inv: { spec: () => gun } };
  let demo = false; const R = new Rumble(game, { player: () => me, off: () => demo }).attach();
  BUS.emit('vehicleDamage', { vehicle: 'car', amount: 30 }); BUS.emit('vehicleDamage', { vehicle: 'other', amount: 30 });
  assert.equal(shook.length, 1, 'a crash: the player\'s car only'); assert.ok(shook[0][0] > .6, 'a hard one, hard: ' + shook[0][0]);
  shook.length = 0; BUS.emit('vehicleDamage', { vehicle: 'car', amount: 4 }); const soft = shook[0][0]; assert.ok(soft < .5, 'a knock, gently: ' + soft);
  shook.length = 0; BUS.emit('crime', { type: 'shooting', by: 'me' }); BUS.emit('crime', { type: 'shooting', by: 'cop' }); BUS.emit('crime', { type: 'assault', by: 'me' });
  assert.deepEqual(shook.map(s => s[0]), [.6], 'a shot of the player\'s, by the weapon\'s rumble');
  shook.length = 0; BUS.emit('hit', { by: 'me', kind: 'melee', damage: 12 }); BUS.emit('hit', { by: 'thug', kind: 'melee', damage: 12 });
  assert.equal(shook.length, 1, 'a blow the player lands');
  shook.length = 0; BUS.emit('explode', { x: 60, y: 0, power: 100 }); BUS.emit('explode', { x: 900, y: 0, power: 100 });
  assert.equal(shook.length, 1, 'a blast near, not one across town'); assert.ok(shook[0][0] > .5);
  shook.length = 0; me.vitals.health = 15; for (let t = 0; t < 2; t += 1 / 60) R.frame(1 / 60);
  assert.ok(shook.length >= 4 && shook.length <= 6, 'badly hurt: a heartbeat, lub-dub (' + shook.length + ')'); me.vitals.health = 100;
  shook.length = 0; car.body.airborne = true; car.body.vz = -40; R.frame(1 / 60); car.body.vz = -220; R.frame(1 / 60); car.body.airborne = false; R.frame(1 / 60);
  assert.equal(shook.length, 1, 'a landing'); assert.ok(shook[0][0] > .7, 'a hard one: ' + shook[0][0]);
  shook.length = 0; car.body.airborne = true; car.body.vz = -20; R.frame(1 / 60); car.body.airborne = false; R.frame(1 / 60);
  assert.equal(shook.length, 0, 'a bump is no landing');
  demo = true; shook.length = 0; BUS.emit('vehicleDamage', { vehicle: 'car', amount: 30 }); BUS.emit('crime', { type: 'shooting', by: 'me' });
  assert.equal(shook.length, 0, 'never in the attract mode'); demo = false;
  game.headless = true; BUS.emit('vehicleDamage', { vehicle: 'car', amount: 30 }); assert.equal(shook.length, 0, 'never headless'); game.headless = false;
  R.dispose(); BUS.emit('vehicleDamage', { vehicle: 'car', amount: 30 }); assert.equal(shook.length, 0, 'gone with its scene');
});
