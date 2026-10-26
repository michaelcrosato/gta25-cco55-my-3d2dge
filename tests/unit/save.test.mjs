// Saving and loading (PLAN.md 7.8, 8.19): round trips, migrations, damaged saves, the lock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engineGlobal } from '../harness.mjs';

engineGlobal();
const { memoryBackend } = await import('../../src/motor/core/save.js');
const { makeSaves, blankSave, normalizeSave } = await import('../../src/game/save.js');
const fresh = () => { const backend = memoryBackend(); return { backend, saves: makeSaves({ backend }) }; };

test('a save round-trips: the protagonists\' stats, weapons and health, the crew fund and respect come back as written', () => {
  const { saves } = fresh(), d = blankSave();
  d.protagonists.viv.stats.shooting = 63; d.protagonists.gus.weapons.push('slugger'); d.protagonists.dex.health = 41; d.crewFund = 4321; d.respect.rats = -20; d.active = 'gus';
  assert.ok(saves.write('2', d).ok);
  const { data, error } = saves.read('2');
  assert.equal(error, null);
  assert.equal(data.protagonists.viv.stats.shooting, 63); assert.deepEqual([...data.protagonists.gus.weapons], ['fists', 'slugger']);
  assert.equal(data.protagonists.dex.health, 41); assert.equal(data.crewFund, 4321); assert.equal(data.respect.rats, -20); assert.equal(data.active, 'gus');
  assert.deepEqual(saves.list().map(s => s.slot), ['2']);
});

test('every gang\'s respect is kept: Ironside\'s as Lowtown\'s', async () => {
  await import('../../src/game/gangs.js'); const { all } = await import('../../src/motor/index.js');
  const d = blankSave(); for (const [k, g] of all('gangs').entries()) d.respect[g.id] = -90 + k * 7;
  const r = normalizeSave(JSON.parse(JSON.stringify(d))).respect;
  for (const [k, g] of all('gangs').entries()) assert.equal(r[g.id], -90 + k * 7, g.id);
  assert.ok(all('gangs').length >= 5);
});
test('a v0 save (the prototype\'s one hero) migrates to v1', () => {
  const { backend, saves } = fresh();
  backend.set(saves.key('1'), readFileSync(new URL('../fixtures/save-v0.json', import.meta.url), 'utf8'));
  const { data, error, migrated } = saves.read('1');
  assert.equal(error, null); assert.equal(migrated, 0); assert.equal(data.schema, 1);
  assert.deepEqual([...data.protagonists.dex.pos], [296, 760]); assert.equal(data.protagonists.dex.health, 64);
  assert.equal(data.crewFund, 1200); assert.equal(data.clock, 21.5); assert.equal(data.hero, undefined);
  assert.deepEqual([...data.protagonists.viv.weapons], ['fists'], 'the others start fresh');
});
test('a damaged save is backed up and reported, never thrown; wrong fields are fixed on load', () => {
  const { backend, saves } = fresh();
  backend.set(saves.key('3'), '{"schema":1,"protag');
  const r = saves.read('3');
  assert.equal(r.data, null); assert.equal(r.error, 'corrupt');
  assert.equal(backend.get(saves.key('3') + ':bak'), '{"schema":1,"protag', 'kept as :bak'); assert.equal(backend.get(saves.key('3')), null);
  const fixed = normalizeSave({ protagonists: { dex: { health: 'lots', stats: { driving: 400 } } }, active: 'nobody', crewFund: -5 });
  assert.equal(fixed.protagonists.dex.health, 100); assert.equal(fixed.protagonists.dex.stats.driving, 100); assert.equal(fixed.active, 'dex'); assert.equal(fixed.crewFund, 0);
  assert.equal(saves.read('auto').error, null, 'an empty slot is no error');
});
test('locked (the attract mode, the Proving Ground), nothing is written', () => {
  const { backend, saves } = fresh(); saves.locked = true;
  assert.equal(saves.write('1', blankSave()).reason, 'locked'); assert.equal(backend.map.size, 0); assert.equal(saves.writes, 0);
});
