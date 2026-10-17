// MOTOR combat pieces that are pure logic: vitals (health, armour, regeneration, knockdown), weapon specs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

engineGlobal();
const { Vitals } = await import('../../src/motor/combat/vitals.js');
const { sustainedDps } = await import('../../src/motor/combat/weapons.js');

test('vitals: armour soaks most of a hit first; a hard hit knocks down; health creeps back to half out of combat', () => {
  const v = new Vitals({ armor: 50 });
  const r = v.hit({ amount: 20, kind: 'bullet', by: 7 });
  assert.equal(r.armor, 16); assert.equal(r.health, 4); assert.equal(v.armor, 34); assert.equal(v.health, 96); assert.equal(v.lastBy, 7);
  assert.ok(!r.down);
  v.armor = 0; const k = v.hit({ amount: 40, kind: 'melee' }); assert.ok(k.down && v.down > 0 && !v.able, 'knocked down');
  for (let t = 0; t < 1.2; t += 1 / 60) v.update(1 / 60); assert.ok(v.able, 'up again');
  v.health = 20; v.sinceHit = 0; for (let t = 0; t < 4; t += 1 / 60) v.update(1 / 60); assert.equal(v.health, 20, 'no regeneration in combat');
  for (let t = 0; t < 10; t += 1 / 60) v.update(1 / 60); assert.equal(v.health, 50, 'back to half, no more');
  const d = new Vitals({ health: 10 }); assert.ok(d.hit({ amount: 15 }).killed && d.dead && !d.able);
});
test('weapons: the sustained DPS counts the reloads', () => {
  assert.equal(sustainedDps({ damage: 10, rate: 2 }), 20);
  assert.equal(sustainedDps({ damage: 10, rate: 2, mag: 4, reload: 2 }), 10, '4 shots in 2 s, then 2 s of reload');
  assert.equal(sustainedDps({ damage: 9, pellets: 8, rate: 1, mag: 1, reload: 0 }), 72);
});
