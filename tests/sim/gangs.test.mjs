// M6's acceptance for the gangs (PLAN.md 8.14), headless on Lowtown in play: the respect maths, the hostile and
// friendly thresholds switching what members do, gang cars keeping to their turf, and a turf war breaking out by itself
// within 10 minutes on seed 1. The 5-minute gang sim with no errors is tests/full/gang-soak.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../harness.mjs';

// the game at the road cell nearest tile (tx, ty) (out in the open: sight lines both ways along the street)
const at = async (tx, ty, q = {}) => {
  const g = await loadGame({ hash: '#play/safehouse', query: { seed: '1', time: 'day', weather: 'clear', ...q } }), C = g.gtm.city; g.game.advance(1);
  let best = null; for (let r = 0; r < 20 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r && !best; dx++) if (C.surfaceAt(tx + dx, ty + dy) === 'road' && C.walkable(tx + dx, ty + dy)) best = [tx + dx, ty + dy];
  g.gtm.teleport((best[0] + .5) * 16, (best[1] + .5) * 16); g.game.advance(2); return g;
};
const listen = (BUS, names) => { const log = []; for (const n of names) BUS.on(n, e => log.push({ n, ...e }), 'world'); return log; };
// a gang member put down on the sidewalks about d from the player, facing them
const member = (gtm, gang, d = 70) => {
  const C = gtm.life.crowd, g = gtm.motor.get('gangs', gang), P = gtm.crew.ped;
  const [m] = C.group({ n: 1, arch: [g.peds.grunt], rIn: 0, where: q => Math.abs(Math.hypot(q.x - P.x, q.y - P.y) - d) < 25 && gtm.city.map.ray({ x: q.x, y: q.y, z: 0 }, P, { eye: 18, target: 18 }).clear, tag: ped => { ped.gang = gang; } });
  assert.ok(m, 'a ' + gang + ' member put down'); m.ped.mover.facing = Math.atan2(P.y - m.ped.y, P.x - m.ped.x); return m.ped;
};
const quiet = gtm => { const C = gtm.life.crowd; for (const m of [...C.members]) C._drop(m); gtm.TUNE.gangHangout = 0; gtm.TUNE.gangPatrol = 0; gtm.TUNE.crowdDensity = 0; gtm.TUNE.gangCars = 0; };

test('respect: a member killed -5 with its gang and +1 with the gang whose rival it was; a gang car damaged -2 (once a while); a mission\'s ±; -100..100', async () => {
  const { game, gtm } = await at(120, 60), G = gtm.life.gangs, P = gtm.crew.ped, log = listen(gtm.BUS, ['respect']);
  quiet(gtm); game.advance(.5);
  assert.deepEqual({ ...G.respect }, { saints: 0, rats: 0, gnomes: 0, monks: 0, volts: 0, velvet: 0, yacht: 0 }, 'all neutral at first');   // (Ironside's two and Glass Heights' two as well: EXPANSION.md 3)
  const s = member(gtm, 'saints'), r = member(gtm, 'rats');
  gtm.combat.hurt(s, { amount: 999, kind: 'bullet', by: P.id });
  assert.equal(G.get('saints'), -5, 'a Saint killed: -5 with the Saints'); assert.equal(G.get('gnomes'), 1, '+1 with the Gnomes (the Saints are their rival)'); assert.equal(G.get('rats'), 0);
  gtm.combat.hurt(r, { amount: 999, kind: 'bullet', by: P.id });
  assert.equal(G.get('rats'), -5); assert.equal(G.get('saints'), -4, '+1 with the Saints (the Rats are theirs)');
  gtm.combat.hurt(member(gtm, 'gnomes'), { amount: 999, kind: 'bullet', by: null });
  assert.equal(G.get('gnomes'), 1, 'killed by someone else: nothing');
  const v = gtm.fleet.spawn('hauler', P.x + 120, P.y, 0); v.gang = 'rats';
  gtm.combat.hurt(v, { amount: 20, kind: 'bullet', by: P.id }); assert.equal(G.get('rats'), -7, 'a Rats car shot: -2');
  gtm.combat.hurt(v, { amount: 20, kind: 'bullet', by: P.id }); assert.equal(G.get('rats'), -7, 'again at once: no more');
  game.advance(gtm.TUNE.respectCar ? 10.5 : 10.5);
  gtm.combat.hurt(v, { amount: 20, kind: 'bullet', by: P.id }); assert.equal(G.get('rats'), -9, 'a while later: -2 again');
  assert.equal(G.add('saints', 500, 'mission'), 100, 'capped at 100'); assert.equal(G.add('saints', -500, 'mission'), -100, 'and -100');
  assert.ok(log.length >= 7 && log.every(e => e.gang && typeof e.delta === 'number'), 'each change on the BUS');
});

test('hostility: at -19 a Saint in Neon lets the player be; at -20 it and its mates come for them; outside the turf they don\'t', async () => {
  for (const [resp, tx, ty, want] of [[-19, 120, 60, false], [-20, 120, 60, true], [-40, 60, 60, false]]) {
    const { game, gtm } = await at(tx, ty), G = gtm.life.gangs, P = gtm.crew.ped;
    quiet(gtm); game.advance(.5);
    G.respect.saints = resp; member(gtm, 'saints', 70); member(gtm, 'saints', 90);
    game.advance(2);
    const on = G.fighters.filter(f => f.target === P);
    if (want) assert.ok(on.length >= 2, `${resp}: both come for the player`); else assert.equal(on.length, 0, `${resp} at ${tx},${ty}: nobody comes (${G.turfAt(P.x, P.y)})`);
  }
});

test('a truce (a job\'s): hostile members already coming for the player stand down, and none start; lifted, they come again (D27)', async () => {
  const { game, gtm } = await at(120, 60), G = gtm.life.gangs, P = gtm.crew.ped;
  quiet(gtm); game.advance(.5);
  G.respect.saints = -60; member(gtm, 'saints', 70); member(gtm, 'saints', 90);
  game.advance(2);
  assert.ok(G.fighters.filter(f => f.target === P && !f.done).length >= 2, 'hostile: they come for the player');
  G.allies.add('saints'); game.advance(1);
  assert.equal(G.fighters.filter(f => f.target === P && !f.done && !f.gone).length, 0, 'the truce: they stand down');
  member(gtm, 'saints', 70); game.advance(2);
  assert.equal(G.fighters.filter(f => f.target === P && !f.done && !f.gone).length, 0, 'and none start');
  G.allies.clear(); member(gtm, 'saints', 70); game.advance(2);
  assert.ok(G.fighters.some(f => f.target === P && !f.done), 'lifted: hostile again');
});

test('crossfire: a gang that isn\'t after the player holds its fire while the player stands where its shots could go; a hostile one fires through them (D27)', async () => {
  for (const [rats, want] of [[0, false], [-60, true]]) {
    const { game, gtm } = await at(120, 60), G = gtm.life.gangs, P = gtm.crew.ped, C = gtm.life.crowd, map = gtm.city.map;
    quiet(gtm); game.advance(.5);
    G.respect.rats = rats;
    // a Saint, and a Rat across open ground from it (100-180 away, a clear line), the player standing halfway between
    const s = member(gtm, 'saints', 70);
    const [m] = C.group({ n: 1, arch: [gtm.motor.get('gangs', 'rats').peds.enforcer], rIn: 0, where: q => { const d = Math.hypot(q.x - s.x, q.y - s.y); return d > 100 && d < 180 && map.ray({ x: s.x, y: s.y, z: 0 }, { x: q.x, y: q.y, z: 0 }, { eye: 18, target: 18 }).clear; }, tag: ped => { ped.gang = 'rats'; } });
    assert.ok(m, 'a Rat across the way'); const r = m.ped;
    gtm.teleport((s.x + r.x) / 2, (s.y + r.y) / 2); game.advance(.1);
    const log = listen(gtm.BUS, ['hit']);
    G._fight(r, s, null); G._fight(s, r, null);
    for (let k = 0; k < 50; k++) { game.advance(.1); if (P.health < P.maxHealth * .5) break; }
    const onP = log.filter(e => e.target === P.id && e.damage > 0).length;
    if (want) { assert.ok(onP > 0, `rats ${rats} (hostile): the Rat's fire goes through the player (${onP} hits)`); continue; }
    assert.equal(onP, 0, `rats ${rats}: nobody's fire reaches the player`);
    assert.ok(G.fighters.some(f => f.ped === s && !f.done) && G.fighters.some(f => f.ped === r && !f.done), 'still in their fight, holding their fire');
    // the player steps out of it (well off the line between them): the shots fly
    const mx = (s.x + r.x) / 2, my = (s.y + r.y) / 2, L = Math.hypot(r.x - s.x, r.y - s.y), nx = -(r.y - s.y) / L, ny = (r.x - s.x) / L, T = gtm.city.T;
    const off = [160, -160, 220, -220, 130, -130].map(k => [mx + nx * k, my + ny * k]).find(([x, y]) => gtm.city.walkable(Math.floor(x / T), Math.floor(y / T)));
    assert.ok(off, 'somewhere off the line to stand'); gtm.teleport(off[0], off[1]);
    for (let k = 0; k < 80 && !log.some(e => (e.target === s.id || e.target === r.id) && e.damage > 0); k++) game.advance(.1);
    assert.ok(log.some(e => (e.target === s.id || e.target === r.id) && e.damage > 0), 'out of the way: the fight goes on');
    assert.equal(log.filter(e => e.target === P.id && e.damage > 0).length, 0, 'and still nothing reaches the player');
  }
});

test('friendly: at 40 a Saint lets one punch go, not two, and its gang goes for whoever goes for the player; at 39 the first punch starts a fight', async () => {
  for (const resp of [40, 39]) {
    const { game, gtm } = await at(120, 60), G = gtm.life.gangs, P = gtm.crew.ped;
    quiet(gtm); game.advance(.5); G.respect.saints = resp;
    const s = member(gtm, 'saints', 30); game.advance(.2);
    gtm.combat.hurt(s, { amount: 3, kind: 'melee', by: P.id }); game.advance(.5);
    const after1 = G.fighters.some(f => f.ped === s && f.target === P);
    if (resp >= 40) {
      assert.equal(after1, false, '40: the first punch let go');
      gtm.combat.hurt(s, { amount: 3, kind: 'melee', by: P.id }); game.advance(.5);
      assert.ok(G.fighters.some(f => f.ped === s && f.target === P), '40: the second one not');
      // a Rat going for the player: the Saints near go for it (the friend's own fight called off first)
      G.fighters.length = 0; const s2 = member(gtm, 'saints', 60), r = member(gtm, 'rats', 40);
      gtm.combat.hurt(P, { amount: 3, kind: 'melee', by: r.id }); game.advance(.5);
      assert.ok(G.fighters.some(f => f.ped === s2 && f.target === r), 'the Saint goes for the Rat');
    } else assert.equal(after1, true, '39: the first punch starts a fight');
  }
});

test('gang cars: in its turf a share of the traffic is the gang\'s, driven by its members, and keeps to that turf', async () => {
  const { game, gtm } = await at(120, 40), G = gtm.life.gangs, T = gtm.life.traffic;
  let seen = 0, out = 0; const cars = new Set();
  for (let t = 0; t < 60; t += 1) {
    game.advance(1);
    for (const c of T.cars) { if (!c.gang) continue; cars.add(c.v.id); seen++; const h = gtm.city.hoodAtPoint(c.v.x, c.v.y); if (!h || !gtm.motor.get('gangs', c.gang).turf.includes(h.id)) out++; assert.equal(c.driver.gang, c.gang, 'a member at the wheel'); }
  }
  assert.ok(cars.size >= 3, 'gang cars about: ' + cars.size);
  assert.ok(out / Math.max(1, seen) < .05, `in their turf: ${out} of ${seen} samples out`);
  void G;
});

test('a turf war breaks out by itself within 10 minutes on seed 1 (by the Neon / Harbor line), and ends', async () => {
  const { game, gtm } = await at(120, 76), log = listen(gtm.BUS, ['turfWar', 'turfWarEnd']);
  for (let t = 0; t < 600 && !log.some(e => e.n === 'turfWarEnd'); t += 5) game.advance(5);
  const war = log.find(e => e.n === 'turfWar'); assert.ok(war, 'a turf war');
  assert.deepEqual([...war.gangs].sort(), ['rats', 'saints'], 'the Saints and the Rats');
  assert.ok(log.some(e => e.n === 'turfWarEnd'), 'and its end');
});
