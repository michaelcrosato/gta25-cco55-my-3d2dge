// X8's city soak (D45): a unit parked at its scene out of the physics (kinematic: emergency.js parks it so) knocked by a
// passing car kept the knock's speed for good, its physics never run to spend it: the drivers behind read it as moving
// off and waited on it (a Medic 22 s behind a parked cruiser, with no cause). Knocked, a parked unit stands.
//   node --test tests/review/traffic/parked-knock.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

test('a unit parked at its scene out of the physics, knocked: it stands, no speed left on it', async () => {
  const { game, gtm } = await loadGame({ hash: '#play', query: { seed: '1999', time: 'day', weather: 'clear' } });
  game.advance(2);
  const T = gtm.life.traffic, c = T.cars.find(q => !q.duty && q.v.body); assert.ok(c, 'a car in the traffic');
  const v = c.v, B = v.body; c.duty = { kind: 'police', out: true, arrived: true }; v.kinematic = true;
  B.u = 54.7; B.v = 10.1;   // (a passing car's knock: the soak's numbers)
  const at = [v.x, v.y]; game.advance(.5);
  assert.deepEqual([+B.vx.toFixed(3), +B.vy.toFixed(3)], [0, 0], 'no speed on it');
  assert.ok(Math.hypot(v.x - at[0], v.y - at[1]) < .01, 'and it stays where it was left');
});
