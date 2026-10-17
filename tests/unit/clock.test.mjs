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

const { Weather } = await import('../../src/motor/world/weather.js');
const { RNG } = await import('../../src/motor/core/rng.js');
const run = (w, minutes, step = 1 / 60) => { for (let t = 0; t < minutes - 1e-9; t += step) w.update(step, step / 60); return w; };   // (minutes of game time: a game minute a real second)
test('the weather: held when fixed; rain soaks the streets and they dry after; a storm flashes; grip falls to 0.8', () => {
  RNG.seed(1);
  const rain = new Weather({ state: 'rain', fixed: true });
  assert.equal(rain.wet, 1, 'it starts soaked'); rain.wet = 0; run(rain, 10);
  assert.ok(rain.wet > .2 && rain.wet < .5, `ten minutes of rain: ${rain.wet.toFixed(2)}`);
  run(rain, 30); assert.equal(rain.wet, 1); assert.ok(Math.abs(rain.grip - .8) < 1e-9);
  rain.state = 'clear'; run(rain, 60); assert.ok(rain.wet > .3 && rain.wet < .7, `an hour after the rain: ${rain.wet.toFixed(2)}`);
  const storm = new Weather({ state: 'storm', fixed: true }); let flashes = 0, was = 0;
  for (let t = 0; t < 60; t += 1 / 60) { storm.update(1 / 60, 1 / 3600); if (storm.flash > 0 && !was) flashes++; was = storm.flash; }
  assert.ok(flashes >= 3 && flashes <= 16, `lightning in a minute: ${flashes}`);
  const fog = new Weather({ state: 'fog', fixed: true }); run(fog, 5); assert.ok(fog.fog > .99 && fog.rain < .01 && !fog.raining);
});
test('the weather changes every 1-3 game hours, the same way for the same world seed', () => {
  const states = () => { RNG.seed(7); const w = new Weather(), seen = [w.state]; for (let h = 0; h < 24 * 4; h++) { run(w, 15, 1 / 4); if (w.state !== seen[seen.length - 1]) seen.push(w.state); } return seen; };
  const a = states();
  assert.deepEqual(a, states());
  assert.ok(a.length >= 6, `a day's weathers: ${a.join(' ')}`);
});
