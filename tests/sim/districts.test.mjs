// Districts in play (EXPANSION.md 2.1, X1): Ironside, District 2, and the west bridge between it and Lowtown. The
// bridge closed on a new game and open as soon as The Big Withdrawal is done; a drive over it and back in each view, the
// district, the vehicle (its paint and damage), the fund, the hour, the stars and the view carried, the same twice; a
// walk over it and back in each view; a job holding it; Ironside validating and playing with its traffic, crowd and
// doors; a save made there loading there.
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

test('the west bridge: closed on a new game (the embankment across the avenue\'s end, its notice up); open as soon as The Big Withdrawal is done', async () => {
  const g = await loadGame({ hash: '#play', query: { ...Q, dev: '1' } }); g.game.advance(.5);
  const { gtm } = g, C = gtm.city, X = gtm.crossings.get('west-bridge');
  assert.equal(g.snap().district, 'lowtown'); assert.equal(X.open, false, 'closed');
  assert.ok(C.map.cell(0, 78) > 0 && C.map.cell(1, 78) > 0, 'the embankment across it');
  assert.ok(C.signs.some(s => /BRIDGE CLOSED/.test(s.text)), 'its notice');
  // (driven at, the embankment stops the car: still Lowtown)
  seat(gtm, 'cortez', 4, 76, Math.PI); gtm.pilot(along(gtm, Math.PI)); until(g, 'ironside', 4); gtm.pilot(null);
  assert.equal(g.snap().district, 'lowtown', 'the embankment holds'); assert.ok(gtm.crew.ped.x > 2 * T, 'short of the gate');
  // (The Big Withdrawal done: the scene enters again where it stands, the way through cut and the notice gone)
  gtm.career.save.missions.done.push('heist_big_withdrawal'); g.game.advance(1);
  const D = g.gtm.city, Y = g.gtm.crossings.get('west-bridge');
  assert.equal(Y.open, true, 'open'); assert.ok(D.map.cell(0, 78) === 0 && D.map.cell(1, 78) === 0, 'the way through');
  assert.ok(!D.signs.some(s => /BRIDGE CLOSED/.test(s.text)), 'the notice gone');
  assert.ok(g.gtm.crew.ped.x < 8 * T && Math.abs(g.gtm.crew.ped.y - 76.5 * T) < 3 * T, 'where it stood');
  assert.equal((g.game.errors || []).length, 0, JSON.stringify(g.game.errors));
});

for (const view of ['iso', 'top', 'side7', 'chase']) {
  test(`over the west bridge and back by car in ${view}: the district, the car, its paint and damage, the fund, the hour, the stars and the view carried`, async () => {
    const g = await loadGame({ hash: '#play', query: { ...Q, dev: '1', bridges: 'open', view } }); g.game.advance(.5);
    let { gtm } = g; const v = seat(gtm, 'cortez', 3, 76, Math.PI);   // (west of Gnome Row's junction: its traffic)
    v.color = '#ff3aa8'; v.damage.health = v.damage.max * .7; gtm.crew.fund = 1234; gtm.life.wanted.set(2, 'test');
    const hour = gtm.clock.hour;
    gtm.pilot(along(gtm, Math.PI)); const n = until(g, 'ironside', 8);
    gtm = g.gtm; const s = g.snap(), p = gtm.crew.ped, w = p.seat && p.seat.vehicle;
    assert.equal(s.district, 'ironside', `over the bridge (${(n / 120).toFixed(1)} s)`); assert.equal(s.view, view, 'the view kept');
    assert.ok(w && w.def.id === 'cortez' && w.driver === p, 'in the car'); assert.equal(w.color, '#ff3aa8', 'its paint');
    assert.ok(Math.abs(w.damage.health / w.damage.max - .7) < .02, 'its damage'); assert.equal(gtm.crew.fund, 1234, 'the fund');
    assert.ok(Math.abs(gtm.clock.hour - hour) < .25, 'the hour'); assert.equal(s.stars, 2, 'the stars');
    const a = gtm.crossings.arrival('east-bridge'); assert.ok(Math.hypot(w.x - a.x, w.y - a.y) < 140, 'at the far end of the same bridge');
    assert.equal(gtm.career.save.district, 'ironside');
    // (and back: the stars cleared, the car turned about on the bridge, east to Lowtown's west end)
    gtm.life.wanted.clear(); { const b = w.body; b.x = 121.5 * T; b.y = 58.5 * T; b.heading = 0; b.u = b.v = b.w = 0; }
    gtm.pilot(along(gtm, 0)); const m = until(g, 'lowtown', 8); gtm.pilot(null);
    gtm = g.gtm; const b = gtm.crew.ped, bv = b.seat && b.seat.vehicle;
    assert.equal(g.snap().district, 'lowtown', `back (${(m / 120).toFixed(1)} s)`); assert.ok(bv && bv.color === '#ff3aa8', 'the same car back');
    assert.ok(b.x < 6 * T && Math.abs(b.y - 78.5 * T) < 7 * T, 'at Lowtown\'s west end');
    assert.equal((g.game.errors || []).length, 0, JSON.stringify(g.game.errors));
  });
}

test('a crossing is the same each time: two runs from one seed hash the same after it', async () => {
  const run = async () => {
    const g = await loadGame({ hash: '#play', query: { ...Q, dev: '1', bridges: 'open' } }); g.game.advance(.5);
    seat(g.gtm, 'cortez', 3, 76, Math.PI); g.gtm.pilot(along(g.gtm, Math.PI)); until(g, 'ironside', 8); g.game.advance(3);
    return { d: g.snap().district, h: g.game.stateHash().join(',') };
  };
  const a = await run(), b = await run();
  assert.equal(a.d, 'ironside'); assert.equal(a.h, b.h);
});

for (const view of ['iso', 'top', 'side7', 'chase']) {
  test(`on foot over the west bridge and back in ${view}: the walker set down at each end`, async () => {
    const g = await loadGame({ hash: '#play', query: { ...Q, dev: '1', bridges: 'open', view } }); g.game.advance(.5);
    g.gtm.crew.ped.place(5 * T, 73 * T, 0); g.gtm.pilot(along(g.gtm, Math.PI)); const n = until(g, 'ironside', 6);
    let p = g.gtm.crew.ped; const a = g.gtm.crossings.arrival('east-bridge');
    assert.equal(g.snap().district, 'ironside', `walked over (${(n / 120).toFixed(1)} s)`); assert.equal(g.snap().view, view);
    assert.ok(!p.seat, 'on foot'); assert.ok(Math.hypot(p.x - a.x, p.y - a.y) < 40, 'at the arrival');
    p.place(121.5 * T, 51.5 * T, 0); g.gtm.pilot(along(g.gtm, 0)); const m = until(g, 'lowtown', 6); g.gtm.pilot(null);
    p = g.gtm.crew.ped; const b = g.gtm.crossings.arrival('west-bridge');
    assert.equal(g.snap().district, 'lowtown', `and back (${(m / 120).toFixed(1)} s)`); assert.ok(Math.hypot(p.x - b.x, p.y - b.y) < 40, 'at Lowtown\'s end');
    assert.equal((g.game.errors || []).length, 0, JSON.stringify(g.game.errors));
  });
}

test('a job holds the bridge: no crossing mid-job', async () => {
  const g = await loadGame({ hash: '#play', query: { ...Q, dev: '1', bridges: 'open' } }); g.game.advance(.5);
  const { gtm } = g; gtm.career.startMission('saints_holy_rollers'); g.game.advance(.5);
  assert.equal(gtm.career.R.state, 'running');
  seat(gtm, 'cortez', 3, 76, Math.PI); gtm.pilot(along(gtm, Math.PI)); until(g, 'ironside', 5); gtm.pilot(null);
  assert.equal(g.snap().district, 'lowtown', 'still Lowtown'); assert.equal(g.gtm.career.R.id, 'saints_holy_rollers');
});

test('Ironside: it validates, plays with its traffic and crowd, has its doors, offers Lowtown\'s jobs nowhere, and a save made there loads there', async () => {
  const g = await loadGame({ hash: '#play', query: { ...Q, dev: '1' } }); g.game.advance(.5);
  holdCode(g.game, 'Backquote'); const dev = g.gtm.ui.screens.top; dev.show('go');
  dev.list.items.find(r => r.label === 'GO TO IRONSIDE').act(); g.game.advance(6);
  const { gtm } = g, C = gtm.city, s = g.snap();
  assert.equal(s.district, 'ironside'); assert.equal(C.w, 128); assert.equal(C.h, 112);
  assert.equal(gtm.motor.validateCity(C).errors.length, 0, gtm.motor.validateCity(C).errors.join('; '));
  assert.ok(s.traffic > 0 && s.peds > 0, `its traffic (${s.traffic}) and crowd (${s.peds})`);
  for (const id of ['safehouse', 'hospital', 'precinct']) assert.ok(C.poi(id), 'its ' + id);
  const home = C.poi('safehouse'); assert.ok(Math.hypot(gtm.crew.ped.x - home.x, gtm.crew.ped.y - home.y) < 80, 'at its safehouse');
  assert.ok(['The Foundry', 'Scrapyard Flats', 'Voltage Row'].includes(s.hood), 'in one of its neighbourhoods: ' + s.hood);
  assert.equal(gtm.career.available().length, 0, 'none of Lowtown\'s missions on offer'); assert.equal(gtm.career.startable().length, 0, 'nor its activities');
  assert.equal(gtm.crossings.get('east-bridge').open, true, 'the east bridge open');
  // (WRECKED here: St. Sooty's)
  gtm.combat.hurt(gtm.crew.ped, { amount: 999, kind: 'bullet', by: null }); g.game.advance(6);
  const H = C.poi('hospital'); assert.ok(Math.hypot(gtm.crew.ped.x - H.x, gtm.crew.ped.y - H.y) < 6 * T, 'back at St. Sooty\'s');
  // (a save here: its district Ironside, and loaded, Ironside again)
  gtm.career.saves.backend = gtm.motor.memoryBackend(); assert.equal(gtm.career.write('3').ok, true);
  g.game.go('play', { load: '3' }); g.game.advance(1);
  assert.equal(g.snap().district, 'ironside', 'loaded in Ironside');
  assert.equal((g.game.errors || []).length, 0, JSON.stringify(g.game.errors));
});
