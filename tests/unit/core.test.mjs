// MOTOR's core: schemas, the BUS, TUNE, RNG streams, intents, the footprint.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

engineGlobal();
const { shape } = await import('../../src/motor/core/schema.js');
const { BUS } = await import('../../src/motor/core/bus.js');
const { TUNE, knob, tuneSet, knobs, tuningMarkdown } = await import('../../src/motor/core/tune.js');
const { RNG, hash32 } = await import('../../src/motor/core/rng.js');
const { makeIntent, clearIntent, tapButton } = await import('../../src/motor/sim/intent.js');
const { Footprint } = await import('../../src/motor/sim/footprint.js');

test('schemas fill defaults (copied, never shared) and report problems', () => {
  const check = shape({ speed: { type: 'number', req: true, min: 0 }, tags: { type: 'array', def: [] }, kind: { oneOf: ['a', 'b'], def: 'a' } });
  const s1 = {}, s2 = { speed: -1, kind: 'c' };
  assert.deepEqual(check(s1), ['is missing "speed"']);
  assert.equal(s1.kind, 'a'); assert.notEqual(s1.tags, check.rules.tags.def);
  assert.equal(check(s2).length, 2);
});
test('the BUS calls listeners in order, isolates a failing one, and clears by scope', () => {
  BUS.reset(); const seen = [];
  BUS.on('hit', d => seen.push('a' + d.n)); BUS.on('hit', () => { throw new Error('boom'); }, 'mission'); BUS.on('hit', d => seen.push('c' + d.n), 'mission');
  const orig = console.error; console.error = () => {};
  BUS.emit('hit', { n: 1 }); console.error = orig;
  assert.deepEqual(seen, ['a1', 'c1']); assert.equal(BUS.errors.length, 1);
  BUS.clear('mission'); assert.equal(BUS.count('hit'), 1); BUS.reset();
});
test('TUNE knobs clamp, step and document themselves', () => {
  knob('Test', 'tTest', 'A test knob', 10, 0, 20, 5, 'For tests');
  assert.equal(TUNE.tTest, 10); assert.equal(tuneSet('tTest', 99), 20); assert.equal(tuneSet('tTest', 7), 5);
  assert.ok(knobs('Test').length === 1 && tuningMarkdown().includes('`tTest`'));
});
test('RNG streams are deterministic per seed and independent of each other', () => {
  RNG.seed(42); const a1 = [RNG.stream('traffic').next(), RNG.stream('traffic').next()];
  RNG.seed(42); RNG.stream('peds').next(); RNG.stream('peds').next();   // another stream's draws don't shift traffic's
  const a2 = [RNG.stream('traffic').next(), RNG.stream('traffic').next()];
  assert.deepEqual(a1, a2);
  RNG.seed(43); assert.notEqual(RNG.stream('traffic').next(), a1[0]);
  assert.equal(hash32('a', 'b'), hash32('a', 'b')); assert.notEqual(hash32('ab'), hash32('a', 'b'));
  const r = RNG.stream('x'); for (let i = 0; i < 200; i++) { const v = r.int(2, 4); assert.ok(v >= 2 && v <= 4); }
});
test('intents reset to rest, and a tap holds a button for one step', () => {
  const i = makeIntent(); tapButton(i, 'jump'); i.move[0] = 1;
  assert.ok(i.down.jump && i.tap.jump);
  clearIntent(i); assert.ok(!i.down.jump && !i.tap.jump && i.move[0] === 0);
});
test('the footprint rings are world units around the focus, not the view', () => {
  const f = new Footprint().update(1000, 1000);
  assert.equal(f.lod(1100, 1000), 0); assert.equal(f.lod(1000 + TUNE.fpFull + 10, 1000), 1); assert.equal(f.lod(1000 + TUNE.fpActivity + 10, 1000), 2);
  assert.ok(!f.canSpawn(1100, 1000) && f.canSpawn(1000 + (TUNE.fpSpawnIn + TUNE.fpSpawnOut) / 2, 1000));
  assert.ok(f.shouldDespawn(1000 + TUNE.fpSpawnOut + 1, 1000));
});
