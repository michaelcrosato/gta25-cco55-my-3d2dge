// The Ironside Power Station (EXPANSION.md 2.2, 7, X3): it validates, its front door is the city's power-door; the
// corridor's east aisle is out of its guard's sight his whole round (the wall down the corridor's middle); the control
// room's camera raises the alarm on one standing in its sweep, never on one under the plans in its blind corner; and △
// at a turbine's valve is heard on the BUS (Blackout's turbines).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../harness.mjs';

const T = 16;
async function station(query = {}) {
  const g = await loadGame({ hash: '#interior/power-station', query: { seed: '1', time: 'night', weather: 'clear', dev: '1', district: 'ironside', ...query } }); g.game.advance(.3);
  const R = g.gtm.interior().run, P = g.gtm.crew.ped;
  const at = (cx, cy, facing = 0) => { P.place((cx + .5) * T, (cy + .5) * T, 0); P.mover.facing = facing; P.mover.vx = P.mover.vy = 0; };
  return { ...g, R, P, at };
}

test('the Power Station validates; its door is Ironside\'s power-door; the lobby reaches every room', async () => {
  const { gtm } = await loadGame(), M = gtm.motor, C = M.buildInterior('power-station'), v = M.validateInterior(C);
  assert.deepEqual([...v.errors], []);
  for (const room of ['the lobby', 'the corridor', 'the control room', 'the turbine hall', 'the switchyard']) assert.ok(v.reach.front.includes(room), room + ': ' + v.reach.front);
  const city = M.buildCity('ironside', 2027), p = city.poi('power-door');
  assert.ok(p && p.kind === 'door' && p.interior === 'power-station', 'the city\'s door');
});

test('the Power Station: the corridor\'s east aisle is out of the guard\'s sight his whole round', async () => {
  const { game, R, at } = await station();
  assert.equal(R.guards.length, 3); assert.equal(R.cameras.length, 4);
  for (const [cx, cy] of [[6, 13], [6, 10], [6, 8]]) {
    at(cx, cy); let worst = 'calm';
    for (let t = 0; t < 12; t += .1) { game.advance(.1); if (R.guards[0].mind.state !== 'calm') worst = R.guards[0].mind.state; }
    assert.equal(worst, 'calm', `at (${cx}, ${cy}) the guard ${worst}`);
    assert.equal(R.alarm, null);
  }
});

test('the Power Station: its control room camera sees one in its sweep and raises the alarm; under the plans it never does', async () => {
  const { game, R, at } = await station();
  at(1, 5, -Math.PI / 2);   // (under the plans: the camera's blind corner)
  for (let t = 0; t < 14; t += .1) game.advance(.1);
  assert.equal(R.alarm, null, 'the blind corner');
  at(4, 4);   // (the room's middle: in its sweep)
  let t = 0; for (; t < 14 && !R.alarm; t += .1) game.advance(.1);
  assert.ok(R.alarm && R.alarm.by === 'camera', 'the camera\'s alarm, in ' + t.toFixed(1) + ' s');
});

test('the Power Station: △ at a turbine\'s valve is told on the BUS', async () => {
  const { game, gtm, at } = await station(), seen = [];
  gtm.BUS.on('spot', e => seen.push(e), 'test');
  at(12, 15, -Math.PI / 2); game.advance(.2);
  holdCode(game, 'KeyE'); game.advance(.3);
  assert.equal(seen.length, 1, 'one spot'); assert.equal(seen[0].spot, 'valve1'); assert.equal(seen[0].interior, 'power-station');
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});
