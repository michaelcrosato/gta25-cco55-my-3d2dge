// Glass Heights' gangs (EXPANSION.md 3, X6): the Velvet Syndicate and the Yacht Club, written to the gang recipe, and
// the Chrome Saints uptown: each holds its turf (the Strip, Marina Heights, Cathedral Hill), its members hang out at
// its HQ in the district (the Saints' St. Chrome's), its rivals are the district's (the Saints' the Yacht Club here, the
// Rats in Lowtown), and once hostile they go for the player on sight. Their cars (the Velvet limo, the Club's Zephyrs)
// keep to their turf in the traffic, and the Club's gun, the Flare Gun, is theirs and Lead Farm's: a flare sets what it
// hits burning. A job's peace holds the district's turf wars off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../harness.mjs';

const Q = { seed: '1', time: 'day', weather: 'clear', dev: '1', district: 'glass-heights' };
const T = 16, DT = 1 / 120;
const pt = (cx, cy) => [(cx + .5) * T, (cy + .5) * T];

test('the Velvet Syndicate, the Yacht Club and the Saints in Glass Heights: specs clean, turf, HQs, rivals by district', async () => {
  const g = await loadGame({ hash: '#play', query: Q }), { game, gtm } = g, M = gtm.motor, G = gtm.life.gangs;
  const ids = ['velvet', 'yacht', 'velvet-grunt', 'velvet-enforcer', 'yacht-grunt', 'yacht-enforcer', 'velvetlimo', 'regatta', 'flaregun', 'velvet-casino'];
  for (const id of ids) assert.ok(M.get('gangs', id) || M.get('peds', id) || M.get('vehicles', id) || M.get('weapons', id) || M.get('interiors', id), id);
  const warn = (g.warns || []).filter(w => /MOTOR: /.test(w) && ids.some(id => w.includes(`"${id}"`)));
  assert.deepEqual([...warn], []);
  assert.equal(G.turfAt(...pt(50, 65)), 'velvet', 'the Strip: the Syndicate\'s');
  assert.equal(G.turfAt(...pt(104, 96)), 'yacht', 'Marina Heights: the Club\'s');
  assert.equal(G.turfAt(...pt(30, 30)), 'saints', 'Cathedral Hill: the Saints\'');
  assert.equal(G.rival('saints'), 'yacht'); assert.equal(G.rival('velvet'), 'saints'); assert.equal(G.rival('yacht'), 'velvet');
  const kinds = new Set(G.groups.map(q => q.gang + ':' + q.kind));
  for (const k of ['saints', 'velvet', 'yacht']) assert.ok(kinds.has(k + ':hangout') && kinds.has(k + ':patrol'), k + ': ' + [...kinds]);
  for (const id of ['velvet-casino', 'yacht-club', 'st-chrome', 'phone-velvet', 'phone-yacht', 'phone-chrome', 'casino-door', 'casino-back', 'club-pier', 'heights-board']) assert.ok(gtm.city.poi(id), id);
  // (in Lowtown the Saints' rival is the Rats, and no Glass Heights gang hangs out there)
  const L = await loadGame({ hash: '#play', query: { ...Q, district: 'lowtown' } }), GL = L.gtm.life.gangs;
  assert.equal(GL.rival('saints'), 'rats');
  assert.ok(!GL.groups.some(q => q.gang === 'velvet' || q.gang === 'yacht'), 'no Glass Heights gang in Lowtown');
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});

test('the Syndicate at the Velvet Casino: members hang out there; hostile, they go for the player on sight', async () => {
  const { game, gtm } = await loadGame({ hash: '#play', query: Q }), G = gtm.life.gangs, p = gtm.crew.ped, hq = gtm.city.poi('velvet-casino');
  gtm.teleport(hq.x + 120, hq.y + 80); game.advance(10);
  const members = () => gtm.life.crowd.members.filter(m => m.ped.gang === 'velvet');
  assert.ok(members().some(m => Math.hypot(m.ped.x - hq.x, m.ped.y - hq.y) < 240), 'the Syndicate hang out at the casino: ' + members().length);
  assert.ok(members().every(m => ['velvet-grunt', 'velvet-enforcer'].includes(m.ped.archetype)), 'in their velvet');
  G.add('velvet', -50, 'test'); assert.equal(G.stance('velvet'), 'hostile');
  const m = members().find(q => Math.hypot(q.ped.x - hq.x, q.ped.y - hq.y) < 240 && G.turfAt(q.ped.x, q.ped.y) === 'velvet'), f = m.ped.mover.facing;
  p.place(m.ped.x + Math.cos(f) * 50, m.ped.y + Math.sin(f) * 50);
  let went = false; for (let k = 0; k < 12 && !went; k++) { game.advance(.25); went = G.fighters.some(q => q.gang === 'velvet' && q.target === p); }   // (within 3 s: at 3 s itself, a fight may have broken off)
  assert.ok(went, 'hostile: they go for the player');
});

test('the Velvet limos keep to the Strip and the Club\'s Zephyrs to Marina Heights in the traffic', async () => {
  const { game, gtm } = await loadGame({ hash: '#play', query: Q }), T0 = gtm.life.traffic, seen = { velvet: 0, yacht: 0 }; let out = 0;
  for (const at of [[50, 56], [90, 70], [64, 100], [104, 90], [30, 60]]) {
    gtm.teleport(...pt(...at)); game.advance(20);
    for (const c of T0.cars) {
      if (!c.gang || !['velvet', 'yacht'].includes(c.gang)) continue;
      seen[c.gang]++;
      const h = gtm.city.hoodAtPoint(c.v.x, c.v.y); if (!h || !gtm.motor.get('gangs', c.gang).turf.includes(h.id)) out++;
    }
  }
  assert.ok(seen.velvet > 0 && seen.yacht > 0, 'both on the streets: ' + JSON.stringify(seen));
  assert.ok(out <= 1, 'out of their turf: ' + out);
});

test('the Flare Gun: Lead Farm\'s once Overboard is done; a flare sets a car burning and leaves a pool of fire where it lands', async () => {
  const { game, gtm } = await loadGame({ hash: '#play', query: Q }), M = gtm.motor;
  const shelf = M.get('shops', 'lead-farm').items;
  assert.equal(shelf.find(i => i.item === 'flaregun' && i.kind === 'weapon').unlock, 'yacht_overboard');
  assert.ok(shelf.find(i => i.item === 'flaregun' && i.kind === 'ammo'), 'and its flares');
  assert.equal(M.get('weapons', 'flaregun').projectile, 'flare');
  // (on the combat range: one flare at a car's flank)
  const map = M.get('maps', 'combat-range').build(), city = { w: map.w, h: map.h, T: map.T, surfaceAt: map.surfaceAt, decks: [], map };
  M.RNG.seed(11);
  const C = new M.Combat({ map, city }), idle = M.makeIntent();
  const W = { map, combat: C, aim: { candidates: C.bodies, toScreen: (x, y, z) => [x, y - z], los: (a, b) => M.losClear(map, a, b), level: 'standard' } };
  const step = (secs, drive = () => {}) => { for (let t = 0; t < secs; t += DT) { drive(); for (const b of C.bodies) b.update(DT, b.intent || M.clearIntent(idle), W); C.update(DT); } };
  const y = 38 * T, car = M.makeBody('cortez', 14 * T, y, Math.PI / 2); car.id = 'car-1'; let lit = 0;
  C.boxes.push({ id: car.id, get x() { return car.x; }, get y() { return car.y; }, z: 0, get heading() { return car.heading; }, hl: car.hl, hw: car.hw, height: 20, hurt: () => ({ health: 1, armor: 0 }), catchFire: () => { lit++; } });
  const me = C.add(new M.Ped({ look: { build: 'heroic', style: 'classic' }, x: 6 * T, y, faction: 'crew', weapons: ['flaregun'], ammo: { flaregun: 6 }, current: 'flaregun', facing: 0 })); me.intent = M.makeIntent();
  me.inv.select('flaregun'); me.inv.cool = 0; step(.3); let first = true;
  let pool = 0;
  step(1.2, () => { const I = me.intent; M.clearIntent(I); I.down.aim = true; I.aim = [1, 0]; I.tap.attack = first; I.down.attack = first; first = false; pool = Math.max(pool, C.fire.live.size); });
  assert.equal(lit, 1, 'the car set burning');
  assert.ok(pool > 0, 'and a pool of fire where it struck');
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});

test('a job\'s peace: rival members who meet start no turf war while it holds; lifted, they do', async () => {
  const { game, gtm } = await loadGame({ hash: '#play', query: Q }), G = gtm.life.gangs, hq = gtm.city.poi('velvet-casino');
  gtm.teleport(hq.x + 120, hq.y + 80); game.advance(6);
  const v = gtm.life.crowd.members.find(m => m.ped.gang === 'velvet'); assert.ok(v, 'a Syndicate hood about');
  const n0 = G.warCount;
  G.peace = true; G._war('velvet', 'saints', v.ped.x, v.ped.y); assert.equal(G.warCount, n0, 'no war in the peace');
  G.peace = false;
  const s = gtm.life.crowd.members.find(m => m.ped.gang === 'saints') || null;
  if (s) { s.ped.place(v.ped.x + 30, v.ped.y); G._war('velvet', 'saints', v.ped.x + 15, v.ped.y); assert.equal(G.warCount, n0 + 1, 'and one once it is lifted'); }
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});
