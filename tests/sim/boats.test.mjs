// Boats (EXPANSION.md 6, 7, X6): Glass Heights' fleet afloat at its moorings (the Club's Regatta along its pier, the
// marina's Splashes between theirs, the Gull alongside the Club's pier), and the AutoPlayer sailing a boat home round
// what lies moored in its way (the cells under it the shore's, to its course): the Regatta in from the open sea past
// the Gull, never pushing at it, to its berth. The Heights Regatta clearing its course of what was left standing on it
// (the moorings beside it kept) and lining a boat up bow south on its line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../harness.mjs';

const T = 16, Q = { seed: '1', time: 'day', weather: 'clear', dev: '1', district: 'glass-heights' };

test('Glass Heights\' boats afloat at their moorings; the AutoPlayer sails the Regatta round the moored Gull to its berth', async () => {
  const g = await loadGame({ hash: '#play', query: Q }); g.game.advance(.5);
  const { game, gtm } = g, M = gtm.motor, F = gtm.fleet, C = gtm.city, wet = v => ['water', 'deep'].includes(C.surfaceAt(Math.floor(v.x / T), Math.floor(v.y / T)));
  const of = id => F.vehicles.filter(v => v.def.id === id);
  assert.equal(of('splash').length, 2, 'the marina\'s two Splashes'); assert.ok(of('splash').every(wet), 'afloat');
  const reg = of('regatta')[0], gull = of('gull')[0];
  assert.ok(reg && wet(reg) && gull && wet(gull), 'the Club\'s Regatta and the Gull afloat');
  const berth = [reg.x, reg.y], g0 = [gull.x, gull.y];
  // (the Regatta out in the open sea off the Heights' south-east point, the player at its wheel)
  const p = gtm.crew.ped; reg.body.x = 122 * T; reg.body.y = 100 * T; reg.body.heading = Math.PI / 2; reg.sit(p, 0); p.place(reg.x, reg.y, 0); F.wake(reg);
  const A = new M.AutoPlayer({ city: C, roads: M.roadsOf(C), fleet: F, junctions: gtm.life.junctions });
  A.goto(berth[0], berth[1], { stay: true, radius: 40 }); gtm.pilot((dt, q) => A.update(dt, q, {}));
  game.advance(1 / 120);
  const cell = v => Math.floor(v.y / T) * C.w + Math.floor(v.x / T);
  assert.ok(A.moored && A.moored.set.has(cell(gull)) && !A.moored.set.has(cell(reg)), 'the course counts the Gull\'s cells as the shore, never its own');
  let s = 0; for (; s < 90 * 120 && A.state !== 'arrived'; s++) game.advance(1 / 120);
  gtm.pilot(null);
  assert.equal(A.state, 'arrived', `home at its berth (${(s / 120).toFixed(0)} s)`);
  assert.ok(Math.hypot(gull.x - g0[0], gull.y - g0[1]) < 6, `the Gull never pushed (${Math.hypot(gull.x - g0[0], gull.y - g0[1]).toFixed(1)} u)`);
  assert.ok(!reg.wrecked && !reg.damage.burning, 'the Regatta whole');
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});

test('the Heights Regatta clears its course of what was left standing on it, and lines a boat up bow south on its line', async () => {
  const g = await loadGame({ hash: '#play', query: Q }); g.game.advance(.5);
  const { game, gtm } = g, F = gtm.fleet;
  // (a Gull set down across the south shore's line, as The Gull and House Edge leave it; the Club's own at its moorings)
  const afloat = F.vehicles.filter(v => ['boat', 'plane'].includes(v.cls)), left = F.spawn('gull', 668, 1752, -Math.PI / 2, { owner: 'world' });
  gtm.career.startMission('race_heights_regatta', { activity: true, level: 1 }); game.advance(.5);
  assert.equal(gtm.career.R.state, 'running');
  assert.ok(!F.vehicles.includes(left), 'the Gull left on the course is gone');
  assert.ok(afloat.length >= 4 && afloat.every(v => F.vehicles.includes(v)), 'the boats and the Gull at their moorings stay: ' + afloat.filter(v => !F.vehicles.includes(v)).map(v => v.def.id).join());
  const b = gtm.crew.ped.seat && gtm.crew.ped.seat.vehicle;
  assert.ok(b && b.cls === 'boat' && Math.abs(Math.atan2(Math.sin(b.heading - Math.PI / 2), Math.cos(b.heading - Math.PI / 2))) < .1, 'at the helm on the line, bow south');
});
