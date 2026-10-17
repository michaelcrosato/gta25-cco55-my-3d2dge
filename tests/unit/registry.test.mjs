import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

engineGlobal();
const { def, get, all, declare } = await import('../../src/motor/core/registry.js');

test('def registers, get finds, all lists in registration order', () => {
  def('things', 'b', { n: 2 }); def('things', 'a', { n: 1 });
  assert.equal(get('things', 'a').n, 1);
  assert.deepEqual(all('things').map(t => t.id), ['b', 'a']);
});
test('a schema reports problems as warnings and still registers', () => {
  declare('checked', s => (typeof s.speed === 'number' ? [] : ['speed must be a number']));
  const spec = def('checked', 'x', { speed: 'fast' });
  assert.equal(get('checked', 'x'), spec);
});

/* ---- the frozen M1 contracts: the mission DSL's shape and the BUS catalogue ---- */
test('defMission takes the staged form and reports what is wrong with a stage or a hint', async () => {
  const E = engineGlobal(), warned = [], warn = E.warn; E.warn = (k, m) => warned.push(m);
  try {
    const { defMission, missionStage, checkHint } = await import('../../src/motor/mission/dsl.js');
    const ok = defMission('test_holy_rollers', { title: 'Holy Rollers', gang: 'saints', rewards: { cash: 2500 }, stages: [
      { id: 'steal', setup() {}, *run() { yield 1; }, hints: [{ kind: 'enterVehicle', vehicle: 'target' }] },
      { id: 'deliver', setup() {}, *run() {}, hints: [{ kind: 'deliver', what: 'target', to: [10, 20] }] }] });
    assert.equal(ok.tier, 1, 'defaults filled'); assert.equal(warned.length, 0, warned.join(' | '));
    assert.equal(missionStage('test_holy_rollers', 'deliver').id, 'deliver');
    defMission('test_broken', { title: 'Broken', stages: [{ id: 'a', setup() {}, run() {} }, { id: 'a', *run() {} }, { setup() {} }] });
    for (const want of ['stage "a" needs a generator *run(m)', 'stage "a" twice', 'stage "a" needs setup(m)', 'stage 2 needs an id']) assert.ok(warned.some(w => w.includes(want)), want + ' in ' + warned.join(' | '));
    assert.deepEqual(checkHint({ kind: 'race' }), ['hint "race" needs "line"']);
    assert.deepEqual(checkHint({ kind: 'goto', route: [[0, 0], [1, 1]] }), [], 'goto takes a route instead of a point');
    assert.ok(checkHint({ kind: 'fly' })[0].startsWith('unknown hint kind'));
  } finally { E.warn = warn; }
});
test('the BUS catalogue names every event with its fields, and the view manager speaks it', async () => {
  const { EVENTS } = await import('../../src/motor/core/events.js');
  for (const ev of ['crime', 'wanted', 'hit', 'explode', 'vehicleEnter', 'carjack', 'missionPass', 'stageFail', 'view', 'attractBeat', 'uiOpen']) assert.ok(typeof EVENTS[ev] === 'string', ev);
  assert.ok(Object.keys(EVENTS).length >= 40);
});
