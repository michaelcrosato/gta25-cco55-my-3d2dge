// FAN-OUT B (vehicles and physics): a car left on Dock Road's drawbridge when it lifts. The Fleet skips a sleeping
// vehicle (at rest, nobody at it: fleet.js) "until something touches it", and the drawbridge rising under it is not such
// a touch, nor is the span turning to water (fleet.js world.water: a bridge cell with lift > .9). The bridge waits only
// for a protagonist standing on it (play.js: crew.order...contains). So a car the player leaves on the span stays at
// z 0 while the leaf swings up through it (its surface 40 u above the car's wheels), then sits on the open canal for
// the 20 s the leaves are up without sinking (vehicle.js sinks a land vehicle in water only when it is stepped), and a
// boat can pass the span through it (boats meet only boats).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

test('a car left parked on the drawbridge rides its leaf as it lifts (never buried in it) and does not float on the open canal while the bridge is up', async () => {
  const { game, gtm } = await loadGame({ hash: 'play', query: { time: 'day', traffic: '0', seed: '7' } });
  game.advance(.5);
  const F = gtm.fleet, T = 16, br = gtm.bridges[0], [x0, y0, x1, y1] = br.rect;
  assert.equal(br.id, 'dock'); assert.equal(br.phase, 'down');
  const cx = (x0 + x1 + 1) / 2 * T - 10, cars = [(y0 + 1.5) * T, (y1 - 1) * T].map(y => F.spawn('cortez', cx, y, Math.PI / 2));   // (one on each leaf, as a player leaves a car)
  game.advance(2); assert.ok(cars.every(c => c.asleep && c.z === 0), 'parked and asleep');
  br.open();
  let buried = 0, worst = null, floatT = 0, t = 0;
  while (br.phase !== 'down' || t < 2) {
    game.advance(.25); t += .25;
    for (const c of cars) {
      const g = F.world.ground(c.x, c.y, c.z), under = g - c.z;
      if (under > buried) { buried = under; worst = { t, lift: br.lift.toFixed(2), z: c.z, g: g.toFixed(1), asleep: c.asleep }; }
      if (br.phase === 'up' && F.world.water(Math.floor(c.x / T), Math.floor(c.y / T)) && !c.sunk && !c.sinking) floatT += .25 / cars.length;
    }
    if (t > 60) break;
  }
  assert.ok(buried <= 8 && floatT < 3, `the leaf's surface stood ${buried.toFixed(1)} u above a parked car's wheels (at ${JSON.stringify(worst)}: the leaf passed through it); with the bridge up the cars sat on the open canal ${floatT.toFixed(1)} s each, unsunk; asleep throughout: ${cars.map(c => c.asleep).join(' ')}`);
});
