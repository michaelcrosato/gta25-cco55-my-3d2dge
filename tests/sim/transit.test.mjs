// Riding the L (HANDOFF L4, src/motor/world/transit.js): in play, through the real bindings. E at a station's stairs
// climbs to its platform; E by a train stopped there with its doors open boards it; the rider is carried with its car
// (the track's train never kills it) and hidden; E while it runs does nothing, and at the next stop gets off onto that
// station's platform. Every station has stairs on a side, each with a foot on the sidewalk and a top up on the platform.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../harness.mjs';

test('the L: up the stairs at Palm, aboard a stopped train, carried to the next stop, off onto its platform', async () => {
  const { game, gtm } = await loadGame({ hash: 'play', query: { seed: '1', time: 'day', weather: 'clear', traffic: '0' } });
  game.advance(.3);
  const T = gtm.fleet.transit, p = gtm.crew.ped;
  assert.ok(T && T.stations.length === 4, 'Lowtown\'s four stations: ' + (T ? T.stations.map(s => s.name).join(', ') : 'none'));
  for (const st of T.stations) {
    assert.ok(st.sides.length >= 1, st.name + ': stairs on a side');
    for (const s of st.sides) { assert.ok(gtm.city.walkable(Math.floor(s.foot[0] / 16), Math.floor(s.foot[1] / 16)), st.name + ': the foot on the sidewalk'); assert.equal(s.top[2], st.z, st.name + ': the top on the platform'); }
  }
  const palm = T.stations.find(s => s.name === 'Palm'), sd = palm.sides[0];
  gtm.teleport(sd.foot[0], sd.foot[1]); game.advance(.3);
  assert.ok(T.stairsAt(p) && T.stairsAt(p).up, 'at the foot of Palm\'s stairs');
  holdCode(game, 'KeyE'); game.advance(1);
  assert.ok(Math.abs(p.z - palm.z) < 2 && T.sideAt(p), 'up on the platform: z ' + p.z.toFixed(0));
  // (to the platform's edge by the track, level with its middle: where a train's doors come)
  const edge = palm.axis === 'y' ? [sd.side < 0 ? (sd.cells[2] + 1) * 16 - 6 : sd.cells[0] * 16 + 6, sd.platform[1]] : [sd.platform[0], 0];
  p.place(edge[0], edge[1], palm.z); game.advance(.2);
  let t = 0; while (!T.trainAt(p) && t < 120) { game.advance(.25); t += .25; }
  const at = T.trainAt(p); assert.ok(at, 'a train stopped at Palm with its doors open, within reach, in ' + t + ' s');
  holdCode(game, 'KeyE'); assert.ok(p.onTrain && p.onTrain.train === at.train, 'aboard');
  const tr = at.train, first = tr.station;
  t = 0; while (tr.state === 'stop' && t < 30) { game.advance(.25); t += .25; }
  holdCode(game, 'KeyE'); assert.ok(p.onTrain, 'E while it runs: still riding');
  t = 0; while (!(tr.state === 'stop' && tr.station !== first) && t < 120) { game.advance(.25); t += .25; assert.ok(!p.dead, 'the rider is never run over by its own train'); }
  const c = tr.cars[p.onTrain.car]; assert.ok(Math.hypot(p.x - c.x, p.y - c.y) < 1, 'carried with its car');
  const next = tr.station; holdCode(game, 'KeyE');
  assert.equal(p.onTrain, null, 'off at ' + next);
  const here = T.sideAt(p); assert.ok(here && here.station.name === next, 'on ' + next + '\'s platform: ' + (here ? here.station.name : 'none'));
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});
