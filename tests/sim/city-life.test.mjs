// M5's acceptance (PLAN.md 8.9, 8.10 and the AutoPlayer core of 8.20) on Lowtown in play: the traffic, the crowd, the
// emergency services and the Marching Mimes, headless. The 10-minute soaks run in test:full (tests/full/city-soak.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../harness.mjs';
import { citySoak } from '../city-soak.mjs';

const play = async (poi, q = {}) => { const g = await loadGame({ hash: '#play/' + poi, query: { seed: '1999', time: 'day', weather: 'clear', ...q } }); g.game.advance(3); return g; };
const nearest = (C, P, n, f = () => true) => C.members.filter(m => !m.ped.dead && f(m)).sort((a, b) => Math.hypot(a.ped.x - P.x, a.ped.y - P.y) - Math.hypot(b.ped.x - P.x, b.ped.y - P.y)).slice(0, n);
const listen = (BUS, names) => { const log = []; for (const n of names) BUS.on(n, e => log.push({ n, ...e }), 'world'); return log; };

test('90 s of Lowtown by day, the focus hopping its sights: no car in another, none stalled 20 s without a cause, no red run, the mean speed in its band, nothing spawned in sight, no ped stuck 15 s', async () => {
  const r = await citySoak({ secs: 90, seed: 1999, time: 'day', weather: 'clear' });
  assert.equal(r.overlaps, 0, 'cars inside each other: ' + JSON.stringify(r.overlapAt));
  assert.ok(r.maxStall < 20, `the longest stall without a cause: ${r.maxStall.toFixed(1)} s ${JSON.stringify(r.stallAt)}`);
  assert.equal(r.redRuns, 0, 'a calm driver on red: ' + JSON.stringify(r.redAt));
  assert.ok(r.meanSpeed > 20 && r.meanSpeed < 90, `the traffic's mean speed ${r.meanSpeed.toFixed(1)} u/s`);
  assert.equal(r.spawnsInside, 0, 'a car spawned inside the annulus: ' + JSON.stringify(r.insideAt));
  assert.equal(r.pedsInside, 0, 'peds spawned inside the annulus');
  assert.ok(r.worstStuck <= 15, `the longest a ped stood stuck: ${r.worstStuck} s ${JSON.stringify(r.stuckAt)}`);
  assert.ok(r.worstCrossWait <= 30, `the longest wait at a crossing: ${r.worstCrossWait} s (a signal's cycle is 30 s)`);
  assert.ok(r.maxCars >= 25 && r.maxPeds >= 80, `at the target densities: ${r.maxCars} cars, ${r.maxPeds} peds`);
});

test('the same seed gives the same city: traffic, crowd and services hash alike after 20 s, in ISO, TOP-DOWN and MODE 7', async () => {
  const run = async view => { const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear', view } }); game.advance(10); gtm.BUS.emit('crime', { type: 'shooting', x: gtm.crew.ped.x, y: gtm.crew.ped.y, by: gtm.crew.ped.id, victim: null, severity: 1 }); game.advance(10); return [...game.stateHash()]; };
  const iso = await run('iso');
  assert.deepEqual(await run('iso'), iso, 'the same run twice');
  assert.deepEqual(await run('top'), iso, 'TOP-DOWN');
  assert.deepEqual(await run('side7'), iso, 'MODE 7');
});

test('a shot: the peds round it run away from it (of ten on the sidewalks 30-110 u off, those that flee are all farther off 2 s later, on average by 60 u and more)', async () => {
  const { game, gtm } = await play('greasy-spoke'), C = gtm.life.crowd, P = gtm.crew.ped, S = gtm.life.walks;
  const near = nearest(C, P, 10, m => !m.brain.follow);
  near.forEach((m, i) => { const a = i / near.length * Math.PI * 2, r = 30 + (i % 3) * 40, n = S.nearestEdge(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, 200); const [x, y] = S.along(n.e, n.d, 0); m.ped.place(x, y); m.brain.feet = !m.brain.rejoin(); });
  game.advance(.25);
  const d0 = new Map(near.map(m => [m, Math.hypot(m.ped.x - P.x, m.ped.y - P.y)]));
  gtm.BUS.emit('crime', { type: 'shooting', x: P.x, y: P.y, by: P.id, victim: null, severity: 1 });
  game.advance(.25);
  const fleeing = near.filter(m => m.brain.state === 'flee');
  assert.ok(fleeing.length >= 8, `${fleeing.length} of ${near.length} flee (the rest may stand back and phone it in)`);
  game.advance(1.75);
  const gain = fleeing.map(m => Math.hypot(m.ped.x - P.x, m.ped.y - P.y) - d0.get(m));
  assert.ok(gain.every(g => g > 10), 'every one is farther off: ' + gain.map(g => g.toFixed(0)));
  assert.ok(gain.reduce((a, g) => a + g, 0) / gain.length > 60, `on average ${(gain.reduce((a, g) => a + g, 0) / gain.length).toFixed(0)} u farther`);
});

test('a witness: an assault seen is phoned in (a report, then the police sent); killing or scaring the witnesses first cancels the call', async () => {
  { const { game, gtm } = await play('greasy-spoke'), P = gtm.crew.ped, log = listen(gtm.BUS, ['report', 'dispatch', 'onScene']);
    gtm.BUS.emit('crime', { type: 'assault', x: P.x, y: P.y, by: P.id, victim: null, severity: 1 });
    const crime = gtm.life.crowd.crimes.at(-1); game.advance(1);
    assert.ok(gtm.life.crowd.members.some(m => m.brain.crime === crime), 'someone saw it');
    game.advance(9);
    const rep = log.find(e => e.n === 'report'), dis = log.find(e => e.n === 'dispatch' && e.kind === 'police');
    assert.ok(rep && crime.reported, 'the report: ' + JSON.stringify(log));
    assert.ok(dis && dis.unit, 'the police sent: ' + JSON.stringify(log));
    game.advance(40); assert.ok(log.some(e => e.n === 'onScene' && e.kind === 'police'), 'the police on the scene'); }
  for (const how of ['kill', 'scare']) {
    const { game, gtm } = await play('greasy-spoke'), P = gtm.crew.ped, C = gtm.life.crowd, log = listen(gtm.BUS, ['report']);
    gtm.BUS.emit('crime', { type: how === 'kill' ? 'assault' : 'breakIn', x: P.x, y: P.y, by: P.id, victim: null, severity: 1 });
    const crime = C.crimes.at(-1); game.advance(1);
    const wit = C.members.filter(m => m.brain.crime === crime); assert.ok(wit.length, 'witnesses');
    for (const m of wit) gtm.combat.hurt(m.ped, { amount: how === 'kill' ? 999 : 1, kind: how === 'kill' ? 'bullet' : 'melee', by: P.id });
    game.advance(10);   // (what they saw is not phoned in; the killing of a witness is another crime, and may be)
    assert.ok(!log.some(e => e.crime === crime.type && e.x === crime.x && e.y === crime.y), `${how}: no report of it`); assert.ok(crime.cancelled && !crime.reported, `${how}: the call cancelled`);
  }
});

test('the services: a body brings the Medic (its paramedics kneel at it); a fire brings the Pumper, whose cannon puts cells out', async () => {
  { const { game, gtm } = await play('greasy-spoke'), P = gtm.crew.ped, S = gtm.life.services, log = listen(gtm.BUS, ['dispatch', 'onScene']);
    const m = nearest(gtm.life.crowd, P, 1)[0]; gtm.combat.hurt(m.ped, { amount: 999, kind: 'bullet', by: null });
    let knelt = false;
    for (let t = 0; t < 70 && !knelt; t += .5) { game.advance(.5); knelt = S.onFoot.some(f => f.task === 'work' && f.ped.clip === 'Fixing_Kneeling' && Math.hypot(f.ped.x - m.ped.x, f.ped.y - m.ped.y) < 20); }
    assert.ok(log.some(e => e.n === 'dispatch' && e.kind === 'medic' && e.unit), 'the Medic sent: ' + JSON.stringify(log));
    assert.ok(log.some(e => e.n === 'onScene' && e.kind === 'medic'), 'on the scene');
    assert.ok(knelt, 'a paramedic kneels at the body');
    game.advance(20); assert.ok(S.calls.every(c => c.kind !== 'medic' || c.state === 'done' || c.state === 'leaving'), 'and leaves: ' + JSON.stringify(S.stats())); }
  { const { game, gtm } = await play('greasy-spoke'), P = gtm.crew.ped, F = gtm.combat.fire, log = listen(gtm.BUS, ['dispatch', 'onScene']);
    let doused = 0; const douse = F.douse.bind(F); F.douse = (...a) => { const n = douse(...a); doused += n; return n; };
    F.add(P.x - 60, P.y + 40, 16, 1, 30, .5);
    for (let t = 0; t < 70 && !doused; t += .5) game.advance(.5);
    assert.ok(log.some(e => e.n === 'dispatch' && e.kind === 'fire' && e.unit), 'the Pumper sent: ' + JSON.stringify(log));
    assert.ok(log.some(e => e.n === 'onScene' && e.kind === 'fire'), 'on the scene');
    assert.ok(doused > 0, 'its cannon puts fire out'); }
});

test('the Marching Mimes: six in single file; hurt one and they all go for you; flatten all six with a vehicle: ENCORE!', async () => {
  const { game, gtm } = await play('palm-park'), C = gtm.life.crowd, t = C.troupes[0], P = gtm.crew.ped, log = listen(gtm.BUS, ['encore']);
  assert.equal(t.members.length, 6, 'six of them');
  game.advance(3);
  const ps = t.members.map(m => m.ped), gaps = ps.slice(1).map((p, i) => Math.hypot(p.x - ps[i].x, p.y - ps[i].y));
  assert.ok(gaps.every(g => g > t.gap * .6 && g < t.gap * 1.6), `single file, ${t.gap} apart: ${gaps.map(g => g.toFixed(0))}`);
  assert.ok(t.members.slice(1).every(m => m.brain.follow), 'each follows the one ahead');
  P.place(ps[2].x + 30, ps[2].y + 20); gtm.combat.hurt(ps[2], { amount: 5, kind: 'melee', by: P.id, dir: [1, 0] }); game.advance(.5);
  assert.ok(t.members.every(m => m.brain.state === 'fight' && m.brain.target === P), 'all six fight: ' + t.members.map(m => m.brain.state));
  for (const p of ps) gtm.combat.hurt(p, { amount: 999, kind: 'vehicle', by: P.id, dir: [1, 0] });
  game.advance(.5);
  assert.equal(log.length, 1, 'ENCORE once'); assert.equal(log[0].troupe, t.id);
});

test('the AutoPlayer core: it walks a short way on the sidewalks, and drives a long one (taking a car, the GPS route, out at the end)', async () => {
  { const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear', auto: 'safehouse' } }), A = gtm.auto, goal = gtm.city.poi('safehouse');
    const states = new Set(); for (let t = 0; t < 40 && !A.arrived; t += .25) { game.advance(.25); states.add(A.state); }
    assert.ok(A.arrived, `walked there: ${A.state}, ${Math.hypot(gtm.crew.ped.x - goal.x, gtm.crew.ped.y - goal.y).toFixed(0)} u off`);
    assert.ok(!states.has('drive'), 'on foot all the way'); }
  { const { game, gtm } = await loadGame({ hash: '#play/safehouse', query: { seed: '1999', time: 'day', weather: 'clear', auto: 'precinct' } }), A = gtm.auto, goal = gtm.city.poi('precinct');
    const states = new Set(); for (let t = 0; t < 180 && !A.arrived; t += .25) { game.advance(.25); states.add(A.state); }   // (M6: the gangs' fights and the police's calls slow the streets: D19)
    assert.ok(states.has('board') && states.has('drive'), 'took a car and drove: ' + [...states]);
    assert.ok(A.arrived, `got there: ${A.state}, ${Math.hypot(gtm.crew.ped.x - goal.x, gtm.crew.ped.y - goal.y).toFixed(0)} u off`); }
});
