// Ironside's gangs (EXPANSION.md 3, X3): the Rust Monks and the Volt Boys, written to the gang recipe, and the Lawn
// Gnomes there too: each holds its turf, its members hang out at its HQ in the district (the Gnomes' Union Hall), its
// rivals are the district's (the Gnomes' the Monks here, the Saints in Lowtown), and once hostile they go for the
// player on sight. Their cars (the Scrapper, the Bucket) keep to their turf in the traffic, and their guns (the Nail
// Gun, the Tesla Coil) are theirs and Lead Farm's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../harness.mjs';

const Q = { seed: '1', time: 'day', weather: 'clear', dev: '1', district: 'ironside' };
const T = 16;
const hood = (gtm, id) => gtm.city.hoods.find(h => h.id === id);

test('the Monks, the Volt Boys and the Gnomes in Ironside: specs clean, turf, HQs, rivals by district', async () => {
  const g = await loadGame({ hash: '#play', query: Q }), { game, gtm } = g, M = gtm.motor, G = gtm.life.gangs;
  for (const id of ['monks', 'volts', 'monk-grunt', 'monk-enforcer', 'volt-grunt', 'volt-enforcer', 'scrapper', 'bucket', 'nailgun', 'teslacoil', 'power-station'])
    assert.ok(M.get('gangs', id) || M.get('peds', id) || M.get('vehicles', id) || M.get('weapons', id) || M.get('interiors', id), id);
  const ids = ['monks', 'volts', 'gnomes', 'monk-grunt', 'monk-enforcer', 'volt-grunt', 'volt-enforcer', 'scrapper', 'bucket', 'nailgun', 'teslacoil', 'power-station'];
  const warn = (g.warns || []).filter(w => /MOTOR: /.test(w) && ids.some(id => w.includes(`"${id}"`)));
  assert.deepEqual([...warn], []);
  const at = (h) => { const q = hood(gtm, h); return q; };
  assert.ok(at('scrapyard') && at('voltage') && at('foundry'), 'Ironside\'s three neighbourhoods');
  const pt = (cx, cy) => [(cx + .5) * T, (cy + .5) * T];
  assert.equal(G.turfAt(...pt(20, 80)), 'monks', 'Scrapyard Flats: the Monks\'');
  assert.equal(G.turfAt(...pt(100, 40)), 'volts', 'Voltage Row: the Volt Boys\'');
  assert.equal(G.turfAt(...pt(20, 20)), 'gnomes', 'the Foundry: the Gnomes\'');
  assert.equal(G.rival('gnomes'), 'monks'); assert.equal(G.rival('monks'), 'volts'); assert.equal(G.rival('volts'), 'gnomes');
  const kinds = new Set(G.groups.map(q => q.gang + ':' + q.kind));
  for (const g of ['gnomes', 'monks', 'volts']) assert.ok(kinds.has(g + ':hangout') && kinds.has(g + ':patrol'), g + ': ' + [...kinds]);
  assert.ok(!kinds.has('saints:hangout') && !kinds.has('rats:hangout'), 'no Lowtown HQ\'s hangout in Ironside');
  // (in Lowtown the Gnomes' rival is the Saints, and no Ironside gang hangs out)
  const L = await loadGame({ hash: '#play', query: { ...Q, district: 'lowtown' } }), GL = L.gtm.life.gangs;
  assert.equal(GL.rival('gnomes'), 'saints');
  assert.ok(!GL.groups.some(q => q.gang === 'monks' || q.gang === 'volts'), 'no Ironside gang in Lowtown');
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});

test('the Monks at the Scrap Cathedral: members hang out there; hostile, they go for the player on sight', async () => {
  const { game, gtm } = await loadGame({ hash: '#play', query: Q }), G = gtm.life.gangs, p = gtm.crew.ped, hq = gtm.city.poi('scrap-cathedral');
  gtm.teleport(hq.x + 140, hq.y + 60); game.advance(10);   // (across Crusher Lane: the hangout put down out of the crowd's inner ring)
  const members = () => gtm.life.crowd.members.filter(m => m.ped.gang === 'monks');
  assert.ok(members().some(m => Math.hypot(m.ped.x - hq.x, m.ped.y - hq.y) < 200), 'Monks hang out at the Cathedral: ' + members().length);
  assert.ok(members().every(m => ['monk-grunt', 'monk-enforcer'].includes(m.ped.archetype)), 'in their robes');
  G.add('monks', -50, 'test'); assert.equal(G.stance('monks'), 'hostile');
  const m = members().find(q => Math.hypot(q.ped.x - hq.x, q.ped.y - hq.y) < 200), f = m.ped.mover.facing;
  p.place(m.ped.x + Math.cos(f) * 50, m.ped.y + Math.sin(f) * 50);
  let came = false; for (let t = 0; t < 3 && !came; t += .25) { game.advance(.25); came = G.fighters.some(q => q.gang === 'monks' && q.target === p); }   // (within 3 s: four of them can have shot the player down by then)
  assert.ok(came, 'hostile: they go for the player');
});

test('the Volt Boys\' Buckets and the Monks\' Scrappers keep to their turf in the traffic', async () => {
  const { game, gtm } = await loadGame({ hash: '#play', query: Q }), T0 = gtm.life.traffic, seen = { scrapper: 0, bucket: 0 }; let out = 0;
  for (const at of [[20, 80], [100, 40], [20, 92], [100, 70]]) {
    gtm.teleport((at[0] + .5) * T, (at[1] + .5) * T); game.advance(20);
    for (const c of T0.cars) {
      if (!c.gang || !['monks', 'volts'].includes(c.gang)) continue;
      seen[c.v.def.id] = (seen[c.v.def.id] || 0) + 1;
      const h = gtm.city.hoodAtPoint(c.v.x, c.v.y); if (!h || !gtm.motor.get('gangs', c.gang).turf.includes(h.id)) out++;
    }
  }
  assert.ok(seen.scrapper > 0 && seen.bucket > 0, 'both on the streets: ' + JSON.stringify(seen));
  assert.ok(out <= 1, 'out of their turf: ' + out);
});

test('the Nail Gun and the Tesla Coil: Lead Farm\'s once their jobs are done; the coil\'s arc jumps body to body', async () => {
  const { game, gtm } = await loadGame({ hash: '#play', query: Q }), M = gtm.motor;
  const shelf = M.get('shops', 'lead-farm').items;
  assert.equal(shelf.find(i => i.item === 'nailgun' && i.kind === 'weapon').unlock, 'monks_holy_scrap');
  assert.equal(shelf.find(i => i.item === 'teslacoil').unlock, 'volts_short_circuit');
  const coil = M.get('weapons', 'teslacoil'), zap = M.get('weapons', 'zapomatic'), nail = M.get('weapons', 'nailgun'), saw = M.get('weapons', 'buzzsaw');
  assert.ok(coil.chain > zap.chain && coil.damage > zap.damage, 'the coil: the Zap-O-Matic\'s arc, bigger');
  assert.ok(nail.range < saw.range && nail.rate >= saw.rate, 'the nail gun: faster and shorter than the Buzzsaw');
  // (the coil on the combat range, at a row of dummies: one pull, and the arc chains down the line)
  const map = M.get('maps', 'combat-range').build(), city = { w: map.w, h: map.h, T: map.T, surfaceAt: map.surfaceAt, decks: [], map };
  M.RNG.seed(11);
  const C = new M.Combat({ map, city }), idle = M.makeIntent(), DT = 1 / 120;
  const W = { map, combat: C, aim: { candidates: C.bodies, toScreen: (x, y, z) => [x, y - z], los: (a, b) => M.losClear(map, a, b), level: 'standard' } };
  const step = (secs, drive = () => {}) => { for (let t = 0; t < secs; t += DT) { drive(); for (const b of C.bodies) b.update(DT, b.intent || M.clearIntent(idle), W); C.update(DT); } };
  const ped = o => { const q = C.add(new M.Ped({ look: { build: 'heroic', style: 'classic' }, ...o })); q.intent = M.makeIntent(); return q; };
  const y = 38 * T, me = ped({ x: 6 * T, y, faction: 'crew', weapons: ['teslacoil'], ammo: { teslacoil: 30 }, current: 'teslacoil', facing: 0 });
  const row = [0, 1, 2, 3, 4].map(i => ped({ x: 10 * T + i * 28, y: y + (i % 2 ? 10 : -10), faction: 'range', anchored: true, maxHealth: 1000 }));
  me.inv.select('teslacoil'); me.inv.cool = 0; step(.3); let first = true;
  step(1 / 60, () => { const I = me.intent; M.clearIntent(I); I.down.aim = true; I.aim = [1, 0]; I.tap.attack = first; I.down.attack = true; first = false; }); M.clearIntent(me.intent);
  const hit = row.filter(q => q.health < 1000).length;
  assert.ok(hit >= 4, 'the arc jumped down the row: ' + hit + ' of 5 hit');
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});
