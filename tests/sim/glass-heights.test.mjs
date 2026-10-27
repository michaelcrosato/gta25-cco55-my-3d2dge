// Glass Heights, District 3 (EXPANSION.md 2.3, X5), and the Loop Causeway between it and Lowtown. The Causeway shut on a
// new game (the sea wall across Loop Avenue's east end, its notice up) and open as soon as Blackout is done; a drive over
// it and back in each view, the district, the vehicle (its paint and damage), the fund, the hour, the stars and the view
// carried, the same twice; a walk over it and back in each view; Glass Heights validating and playing with its
// traffic, crowd and doors, its hospital, the Gull at its moorings, and a save made there loading there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../harness.mjs';

const Q = { seed: '1999', time: 'day', weather: 'clear' }, T = 16;
// the pilot: at the wheel, full throttle along heading h, the wheel holding the line; on foot, the stick along it
const along = (gtm, h) => {
  const M = gtm.motor, I = M.makeIntent();
  return (dt, p) => {
    M.clearIntent(I); const v = p.seat && p.seat.vehicle;
    if (v) { let d = h - v.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); I.throttle = Math.abs(d) > 1.2 ? .5 : 1; I.steer = Math.max(-1, Math.min(1, d * 2.5)); }
    else { I.move[0] = Math.cos(h); I.move[1] = Math.sin(h); }
    return I;
  };
};
// at the wheel of a fresh car of def at cell (cx, cy), heading h
function seat(gtm, def, cx, cy, h) {
  const p = gtm.crew.ped, v = gtm.fleet.spawn(def, (cx + .5) * T, (cy + .5) * T, h, { owner: 'world' });
  v.sit(p, 0); p.place(v.x, v.y, 0); gtm.fleet.wake(v); return v;
}
// run until the district is `to` (or `secs` pass): the steps it took
function until(g, to, secs) { let n = 0; while (g.snap().district !== to && n < secs * 120) { g.game.advance(1 / 120); n++; } return n; }

test('the Loop Causeway: shut on a new game (the sea wall across Loop Avenue\'s east end, its notice up); open as soon as Blackout is done', async () => {
  const g = await loadGame({ hash: '#play', query: { ...Q, dev: '1' } }); g.game.advance(.5);
  const { gtm } = g, C = gtm.city, X = gtm.crossings.get('causeway');
  assert.equal(g.snap().district, 'lowtown'); assert.equal(X.open, false, 'shut');
  assert.ok([74, 78, 82].every(y => C.map.cell(154, y) > 0), 'the sea wall across it'); assert.ok(['water', 'deep'].includes(C.surfaceAt(155, 78)), 'the bay beyond');
  assert.ok(C.signs.some(s => /CAUSEWAY CLOSED/.test(s.text)), 'its notice');
  // (driven at, the sea wall stops the car: still Lowtown)
  seat(gtm, 'cortez', 149, 80, 0); gtm.pilot(along(gtm, 0)); until(g, 'glass-heights', 4); gtm.pilot(null);
  assert.equal(g.snap().district, 'lowtown', 'the sea wall holds'); assert.ok(gtm.crew.ped.x < 154 * T, 'short of the gate');
  // (Blackout done: the scene enters again where it stands, the sea wall's column cut as the Causeway's first span)
  gtm.career.save.missions.done.push('heist_blackout'); g.game.advance(1);
  const D = g.gtm.city, Y = g.gtm.crossings.get('causeway');
  assert.equal(Y.open, true, 'open'); assert.ok([74, 78, 82].every(y => D.map.cell(154, y) === 0 && D.surfaceAt(154, y) === 'bridge'), 'the way through');
  assert.ok(D.map.cell(154, 85) > 0, 'the rest of the sea wall standing'); assert.equal(D.surfaceAt(159, 78), 'bridge', 'the deck out over the bay'); assert.ok(!D.signs.some(s => /CAUSEWAY CLOSED/.test(s.text)), 'the notice gone');
  assert.equal(g.gtm.crossings.get('west-bridge').open, false, 'the west bridge as it was');
  assert.equal((g.game.errors || []).length, 0, JSON.stringify(g.game.errors));
});

for (const view of ['iso', 'top', 'side7', 'chase']) {
  test(`over the Causeway and back by car in ${view}: the district, the car, its paint and damage, the fund, the hour, the stars and the view carried`, async () => {
    const g = await loadGame({ hash: '#play', query: { ...Q, dev: '1', bridges: 'open', view } }); g.game.advance(.5);
    let { gtm } = g; const v = seat(gtm, 'zephyr', 150, 80, 0);   // (east of Seawall Drive's junction: its traffic)
    v.color = '#3affd8'; v.damage.health = v.damage.max * .6; gtm.crew.fund = 4321; gtm.life.wanted.set(1, 'test');
    const hour = gtm.clock.hour;
    gtm.pilot(along(gtm, 0)); const n = until(g, 'glass-heights', 8);
    gtm = g.gtm; const s = g.snap(), p = gtm.crew.ped, w = p.seat && p.seat.vehicle;
    assert.equal(s.district, 'glass-heights', `over the Causeway (${(n / 120).toFixed(1)} s)`); assert.equal(s.view, view, 'the view kept');
    assert.ok(w && w.def.id === 'zephyr' && w.driver === p, 'in the car'); assert.equal(w.color, '#3affd8', 'its paint');
    assert.ok(Math.abs(w.damage.health / w.damage.max - .6) < .02, 'its damage'); assert.equal(gtm.crew.fund, 4321, 'the fund');
    assert.ok(Math.abs(gtm.clock.hour - hour) < .25, 'the hour'); assert.equal(s.stars, 1, 'the stars');
    const a = gtm.crossings.arrival('causeway-west'); assert.ok(Math.hypot(w.x - a.x, w.y - a.y) < 140, 'at the Heights end of the Causeway');
    assert.equal(gtm.career.save.district, 'glass-heights'); assert.equal(gtm.city.surfaceAt(4, 56), 'bridge', 'on the Causeway over the bay');
    // (and back: the stars cleared, the car turned about on the Causeway, west to Lowtown's sea wall)
    gtm.life.wanted.clear(); { const b = w.body; b.x = 6.5 * T; b.y = 54.5 * T; b.heading = Math.PI; b.u = b.v = b.w = 0; }
    gtm.pilot(along(gtm, Math.PI)); const m = until(g, 'lowtown', 8); gtm.pilot(null);
    gtm = g.gtm; const b = gtm.crew.ped, bv = b.seat && b.seat.vehicle;
    assert.equal(g.snap().district, 'lowtown', `back (${(m / 120).toFixed(1)} s)`); assert.ok(bv && bv.color === '#3affd8', 'the same car back');
    assert.ok(b.x > 146 * T && Math.abs(b.y - 78.5 * T) < 7 * T, 'at Loop Avenue\'s east end');
    assert.equal((g.game.errors || []).length, 0, JSON.stringify(g.game.errors));
  });
}

test('a crossing of the Causeway is the same each time: two runs from one seed hash the same after it', async () => {
  const run = async () => {
    const g = await loadGame({ hash: '#play', query: { ...Q, dev: '1', bridges: 'open' } }); g.game.advance(.5);
    seat(g.gtm, 'cortez', 150, 80, 0); g.gtm.pilot(along(g.gtm, 0)); until(g, 'glass-heights', 8); g.game.advance(3);
    return { d: g.snap().district, h: g.game.stateHash().join(',') };
  };
  const a = await run(), b = await run();
  assert.equal(a.d, 'glass-heights'); assert.equal(a.h, b.h);
});

for (const view of ['iso', 'top', 'side7', 'chase']) {
  test(`on foot over the Causeway and back in ${view}: the walker set down at each end`, async () => {
    const g = await loadGame({ hash: '#play', query: { ...Q, dev: '1', bridges: 'open', view } }); g.game.advance(.5);
    g.gtm.crew.ped.place(151.5 * T, 73.5 * T, 0); g.gtm.pilot(along(g.gtm, 0)); const n = until(g, 'glass-heights', 6);
    let p = g.gtm.crew.ped; const a = g.gtm.crossings.arrival('causeway-west');
    assert.equal(g.snap().district, 'glass-heights', `walked over (${(n / 120).toFixed(1)} s)`); assert.equal(g.snap().view, view);
    assert.ok(!p.seat, 'on foot'); assert.ok(Math.hypot(p.x - a.x, p.y - a.y) < 40, 'at the arrival');
    p.place(5.5 * T, 51.5 * T, 0); g.gtm.pilot(along(g.gtm, Math.PI)); const m = until(g, 'lowtown', 6); g.gtm.pilot(null);
    p = g.gtm.crew.ped; const b = g.gtm.crossings.arrival('causeway');
    assert.equal(g.snap().district, 'lowtown', `and back (${(m / 120).toFixed(1)} s)`); assert.ok(Math.hypot(p.x - b.x, p.y - b.y) < 40, 'at Lowtown\'s end');
    assert.equal((g.game.errors || []).length, 0, JSON.stringify(g.game.errors));
  });
}

test('Glass Heights: it validates, plays with its traffic and crowd, has its doors and the Gull at its moorings, offers Lowtown\'s and Ironside\'s jobs nowhere, and a save made there loads there', async () => {
  const g = await loadGame({ hash: '#play', query: { ...Q, dev: '1' } }); g.game.advance(.5);
  holdCode(g.game, 'Backquote'); const dev = g.gtm.ui.screens.top; dev.show('go');
  dev.list.items.find(r => r.label === 'GO TO GLASS HEIGHTS').act(); g.game.advance(6);
  const { gtm } = g, C = gtm.city, s = g.snap();
  assert.equal(s.district, 'glass-heights'); assert.equal(C.w, 128); assert.equal(C.h, 112);
  const V = gtm.motor.validateCity(C); assert.equal(V.errors.length, 0, V.errors.join('; ')); assert.equal(V.warnings.length, 0, V.warnings.join('; '));
  const twice = g.warns.filter(w => /registered twice|MOTOR: .*"glass-heights"/.test(w)); assert.equal(twice.length, 0, twice.join('; '));   // (its landmarks' ids its own: one named as Lowtown's had taken that one's place)
  assert.ok(s.traffic > 0 && s.peds > 0, `its traffic (${s.traffic}) and crowd (${s.peds})`);
  for (const id of ['safehouse', 'hospital', 'precinct', 'glass-tower', 'st-chrome', 'velvet-casino', 'yacht-club', 'observatory', 'marina']) assert.ok(C.poi(id), 'its ' + id);
  const home = C.poi('safehouse'); assert.ok(Math.hypot(gtm.crew.ped.x - home.x, gtm.crew.ped.y - home.y) < 80, 'at its safehouse');
  assert.ok(['Cathedral Hill', 'The Strip', 'Marina Heights'].includes(s.hood), 'in one of its neighbourhoods: ' + s.hood);
  assert.equal(gtm.career.available().length, 0, 'none of the other districts\' missions on offer');
  assert.equal(gtm.career.startable().map(a => a.spec.id).sort().join(), 'mayhem_flare_limos,race_heights_regatta', 'nor their activities: the Heights\' own alone (X7)');
  assert.equal(gtm.crossings.get('causeway-west').open, true, 'the Causeway open');
  const gull = gtm.fleet.vehicles.find(v => v.def.id === 'gull'), pier = C.poi('club-pier');
  assert.ok(gull && gull.body.landed && Math.hypot(gull.x - pier.x, gull.y - pier.y) < 12 * T && ['water', 'deep'].includes(C.surfaceAt(Math.floor(gull.x / T), Math.floor(gull.y / T))), 'the Gull afloat off the Club\'s pier');
  // (WRECKED here: Heights General)
  gtm.combat.hurt(gtm.crew.ped, { amount: 999, kind: 'bullet', by: null }); g.game.advance(6);
  const H = C.poi('hospital'); assert.ok(Math.hypot(gtm.crew.ped.x - H.x, gtm.crew.ped.y - H.y) < 6 * T, 'back at Heights General');
  // (a save here: its district Glass Heights, and loaded, Glass Heights again)
  gtm.career.saves.backend = gtm.motor.memoryBackend(); assert.equal(gtm.career.write('3').ok, true);
  g.game.go('play', { load: '3' }); g.game.advance(1);
  assert.equal(g.snap().district, 'glass-heights', 'loaded in Glass Heights');
  assert.equal((g.game.errors || []).length, 0, JSON.stringify(g.game.errors));
});
