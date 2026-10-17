// The world clock and what each hour looks like (render/sky.js): pure functions of the hour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

engineGlobal();
const { WorldClock, TIMES } = await import('../../src/motor/world/clock.js');
const { skyAt } = await import('../../src/motor/render/sky.js');

test('the clock: ?time= names and hours, a game minute a real second, the day rolls over', () => {
  assert.equal(new WorldClock('dusk').hour, TIMES.dusk);
  assert.equal(new WorldClock('7.25').hour, 7.25);
  assert.equal(new WorldClock('nonsense').hour, TIMES.night, 'unknown values keep the start');
  const c = new WorldClock(23.5); for (let i = 0; i < 60 * 60; i++) c.update(1 / 60);   // a real minute
  assert.ok(Math.abs(c.hour - 0.5) < 1e-6 && c.day === 1, `an hour later, past midnight: ${c.hour} day ${c.day}`);
  assert.equal(new WorldClock(19.5).label(), '19:30');
});
test('the sky: night is dark with the lamps on, noon is full light with them off, and dusk eases between', () => {
  const night = skyAt(23), noon = skyAt(12), dusk = skyAt(19), late = skyAt(20);
  assert.ok(night.ambient < .5 && night.lamps && night.night && night.phase === 'night');
  assert.ok(noon.ambient === 1 && !noon.lamps && !noon.night && noon.phase === 'day');
  assert.ok(dusk.ambient > night.ambient && dusk.ambient < noon.ambient && dusk.lamps, 'the lamps are on by dusk');
  assert.ok(late.ambient < dusk.ambient, 'darker after');
  let prev = 1; for (let h = 17.5; h <= 20.5; h += .25) { const a = skyAt(h).ambient; assert.ok(a <= prev + 1e-9, 'evening only darkens: ' + h); prev = a; }
  assert.deepEqual(skyAt(24).dark, skyAt(0).dark, 'the day wraps');
  assert.match(night.sky[0], /^#[0-9a-f]{6}$/);
});
