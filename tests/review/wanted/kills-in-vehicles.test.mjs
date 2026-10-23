// FAN-OUT B (M13), wanted and gangs: killings of people sitting in vehicles go unrecognised. Gangs._kill and
// Police._classify look the victim up in combat.bodies, and the traffic's drivers (a gang car's member at its wheel) and
// a police unit's crew riding in its car are never in it (Traffic makes them without Combat; police.js adds a crew only
// once it gets out). So a Saint killed when the player blows up his car costs the Saints nothing (PLAN.md 8.14: a
// member killed -5) and earns the Gnomes nothing (+1 for their rival's), and two officers killed in their cruiser are
// filed as plain murders (45 heat each) instead of the murder of an officer (D19's copMurder, 160: "a dead cop three
// stars"), with Police.fought (the police shoot back) never set.
//   node --test tests/review/wanted/kills-in-vehicles.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

const at = async (tx, ty, q = {}) => {
  const g = await loadGame({ hash: '#play/safehouse', query: { seed: '1', time: 'day', weather: 'clear', ...q } }), C = g.gtm.city; g.game.advance(1);
  let best = null; for (let r = 0; r < 20 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r && !best; dx++) if (C.surfaceAt(tx + dx, ty + dy) === 'road' && C.walkable(tx + dx, ty + dy)) best = [tx + dx, ty + dy];
  g.gtm.teleport((best[0] + .5) * 16, (best[1] + .5) * 16); g.game.advance(2); return g;
};

test('a Saint at the wheel of his gang\'s car, killed when the player blows the car up: -5 with the Saints (as well as the car\'s -2), +1 with the Gnomes', async () => {
  const { game, gtm } = await at(120, 40), G = gtm.life.gangs, T = gtm.life.traffic, P = gtm.crew.ped, F = gtm.fleet;
  const C = gtm.life.crowd; for (const m of [...C.members]) C._drop(m); gtm.TUNE.crowdDensity = 0; gtm.TUNE.gangHangout = 0; gtm.TUNE.gangPatrol = 0;   // (nobody on foot: only the car's driver to count)
  let c = null; for (let t = 0; t < 90 && !c; t += .5) { game.advance(.5); c = T.cars.find(q => q.gang === 'saints' && !q.v.kinematic && q.driver && q.driver.seat && Math.hypot(q.v.x - P.x, q.v.y - P.y) < 400); }
  assert.ok(c, 'a Saints car with a Saint at the wheel');
  const log = []; gtm.BUS.on('kill', e => log.push({ n: 'kill', ...e }), 'world'); gtm.BUS.on('respect', e => log.push({ n: 'respect', ...e }), 'world');
  const before = { ...G.respect }, inBodies = gtm.combat.bodies.includes(c.driver);
  F.explode(c.v, P.id);   // (blown up by the player: what a rocket's or a burning wreck's chain does, Fleet.explode(v, by))
  game.advance(.5);
  const driverKilled = log.find(e => e.n === 'kill' && e.target === c.driver.id);
  console.log(JSON.stringify({ driver: c.driver.id, driverInCombatBodiesWhenKilled: inBodies, driverKilled, before, after: { ...G.respect }, respect: log.filter(e => e.n === 'respect') }));
  assert.ok(driverKilled && driverKilled.by === P.id, 'the player killed the driver');
  assert.equal(G.get('saints'), before.saints - 2 - 5, 'the Saints: -2 for the car and -5 for their member');
  assert.equal(G.get('gnomes'), before.gnomes + 1, 'the Gnomes: +1 (the Saints are their rival)');
});

test('two officers killed in their cruiser, in front of a third: the murder of an officer (copMurder), not a plain murder', async () => {
  const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear' } }); game.advance(2);
  const P = gtm.crew.ped, W = gtm.life.wanted, Pol = gtm.life.police, F = gtm.fleet;
  W.set(1);
  let u = null; for (let t = 0; t < 60 && !u; t += .25) { game.advance(.25); u = Pol.units.find(q => !q.out && Math.hypot(q.car.v.x - P.x, q.car.v.y - P.y) < 260 && q.car.crew.every(k => k && k.seat)); }
  assert.ok(u, 'the 1-star cruiser has come, its crew aboard');
  const crew = u.car.crew.map(k => k.id);
  // an officer on foot 60 u off, looking at the player (tests/sim/wanted.test.mjs's cop())
  const w = Pol._newCop(gtm.motor.get('peds', 'mpd'), P.x - 60, P.y + 10, 0); w.mover.facing = Math.atan2(P.y - w.y, P.x - w.x); Pol._addCop(w, {});
  game.advance(.3);
  const n0 = W.log.length, crimes = [], inBodies = u.car.crew.map(k => gtm.combat.bodies.includes(k)); gtm.BUS.on('crime', e => { if (crew.includes(e.victim)) crimes.push(e.type); }, 'world');
  F.explode(u.car.v, P.id);   // (the player's rocket: Fleet.explode(v, by))
  game.advance(.6);
  const filed = W.log.slice(n0);
  console.log(JSON.stringify({ crew, inCombatBodiesWhenKilled: inBodies, dead: u.car.crew.map(k => k.dead), crimes, filed, stars: W.stars, fought: Pol.fought }));
  assert.ok(u.car.crew.every(k => k.dead), 'both officers dead');
  assert.equal(filed.filter(l => l.type === 'copMurder').length, 2, 'filed as the murder of an officer, twice: ' + JSON.stringify(filed));
  assert.equal(Pol.fought, true, 'and the police shoot back from now on');
});
