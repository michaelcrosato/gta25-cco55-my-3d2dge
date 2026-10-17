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
