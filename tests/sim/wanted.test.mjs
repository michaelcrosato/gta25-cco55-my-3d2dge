// M6's acceptance for the wanted level and the police (PLAN.md 8.13), headless on Lowtown in play: crimes with and
// without witnesses (a witness killed first: no call), a cop's own eyes, the stars at their thresholds and the response
// each brings on time, the Eye at 3 stars, roadblocks and spike strips ahead in the annulus, hiding out the evade time,
// the respray, every way of being nabbed, and the NABBED and WRECKED respawns.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../harness.mjs';

const play = async (poi, q = {}) => { const g = await loadGame({ hash: '#play/' + poi, query: { seed: '1999', time: 'day', weather: 'clear', ...q } }); g.game.advance(2); return g; };
const listen = (BUS, names) => { const log = []; for (const n of names) BUS.on(n, e => log.push({ n, ...e }), 'world'); return log; };
// nobody about within r of (x, y): the crowd's peds there taken away
const clearAround = (gtm, x, y, r) => { const C = gtm.life.crowd; for (const m of [...C.members]) if (Math.hypot(m.ped.x - x, m.ped.y - y) < r) C._drop(m); };
// an officer of the MPD put down at (x, y) (at height z), facing (x0, y0)
const cop = (gtm, x, y, face, z = 0) => { const P = gtm.life.police, ped = P._newCop(gtm.motor.get('peds', 'mpd'), x, y, z); ped.mover.facing = Math.atan2(face.y - y, face.x - x); return P._addCop(ped, {}); };
// a crime of the player's where they stand
const crime = (gtm, type, victim = null) => { const P = gtm.crew.ped; gtm.BUS.emit('crime', { type, x: P.x, y: P.y, by: P.id, victim, severity: 1 }); };

test('a crime nobody sees earns nothing; one witnesses see is phoned in and earns its heat; killing the witnesses first, nothing', async () => {
  { const { game, gtm } = await play('greasy-spoke'), P = gtm.crew.ped, W = gtm.life.wanted, log = listen(gtm.BUS, ['report']);
    clearAround(gtm, P.x, P.y, 600); crime(gtm, 'murder'); game.advance(8);
    assert.equal(log.length, 0, 'no report'); assert.equal(W.heat, 0, 'no heat'); assert.equal(W.stars, 0, 'no stars'); }
  for (const kill of [false, true]) {
    const { game, gtm } = await play('greasy-spoke'), P = gtm.crew.ped, W = gtm.life.wanted, C = gtm.life.crowd, log = listen(gtm.BUS, ['report']);
    clearAround(gtm, P.x, P.y, 600);
    // four onlookers on the sidewalks 50-90 u off, facing the player
    const arch = gtm.motor.get('peds', 'office'), ms = C.group({ n: 4, arch: ['office'], rIn: 0, where: q => { const d = Math.hypot(q.x - P.x, q.y - P.y); return d > 50 && d < 90; } });
    assert.ok(arch && ms.length >= 3, 'onlookers put down: ' + ms.length);
    for (const m of ms) { m.ped.mover.facing = Math.atan2(P.y - m.ped.y, P.x - m.ped.x); m.brain.traits.phone = 1; m.brain.traits.brave = 1; }   // (they stay to phone it in)
    crime(gtm, 'murder'); game.advance(1);
    const wit = ms.filter(m => m.brain.state === 'witness' || m.brain.state === 'phone'); assert.ok(wit.length, 'someone saw it');
    if (kill) for (const m of ms) gtm.combat.hurt(m.ped, { amount: 999, kind: 'bullet', by: null });   // (dead before the call goes through)
    game.advance(8);
    if (kill) { assert.equal(log.length, 0, 'no report'); assert.equal(W.stars, 0, 'no stars'); }
    else { assert.ok(log.length >= 1, 'phoned in'); assert.equal(W.stars, 1, 'a murder phoned in: one star'); assert.equal(Math.round(W.heat), 45); assert.equal(W.log[0].how, 'report'); }
  }
});

test('a cop who sees a crime files it at once, with more heat than a report; traffic offences count only in a cop\'s sight', async () => {
  { const { game, gtm } = await play('greasy-spoke'), P = gtm.crew.ped, W = gtm.life.wanted;
    clearAround(gtm, P.x, P.y, 600); cop(gtm, P.x + 60, P.y, P); game.advance(.5);
    crime(gtm, 'assault', 4242); game.advance(1);
    assert.equal(W.log[0] && W.log[0].how, 'cop', 'filed by the cop: ' + JSON.stringify(W.log));
    assert.equal(Math.round(W.heat * 10) / 10, 22.5, 'an assault (15) seen by a cop: half again'); assert.equal(W.stars, 1); }
  { const { game, gtm } = await play('greasy-spoke'), P = gtm.crew.ped, W = gtm.life.wanted, F = gtm.fleet;
    clearAround(gtm, P.x, P.y, 600);
    const v = F.spawn('cortez', P.x, P.y, 0); v.sit(P, 0);
    for (let i = 0; i < 60; i++) { v.body.setVelocity(260, 0); v.body.x = P.x; game.advance(1 / 120); }
    assert.equal(W.heat, 0, 'speeding with nobody to see it: nothing');
    cop(gtm, v.x + 50, v.y + 30, v); game.advance(.25);
    for (let i = 0; i < 120; i++) { v.body.setVelocity(260, 0); game.advance(1 / 120); }
    assert.ok(W.log.some(l => l.type === 'speeding' && l.how === 'cop'), 'speeding past a cop: ' + JSON.stringify(W.log)); }
});

test('the stars come at 20 / 60 / 150 / 300 / 600 heat, and each tier\'s response is sent at once: a cruiser, more, the Eye, SWAT, the Feds', async () => {
  const { gtm } = await play('greasy-spoke'), W = gtm.life.wanted, T = gtm.TUNE, P = gtm.crew.ped, log = listen(gtm.BUS, ['wanted', 'dispatch']);
  assert.deepEqual([1, 2, 3, 4, 5].map(k => T['star' + k]), [20, 60, 150, 300, 600]);
  let n = 0; const add = (type, cop) => W.crime({ type, x: P.x, y: P.y, by: P.id, victim: ++n }, { cop });
  add('assault', false); assert.equal(W.stars, 0, '15 heat');
  add('assault', false); assert.equal(W.stars, 1, '30 heat');
  add('murder', true); assert.equal(W.stars, 2, '97.5 heat');
  add('copMurder', false); assert.equal(W.stars, 3, '257.5 heat');
  add('copAssault', true); assert.equal(W.stars, 4, '347.5 heat');
  add('copMurder', true); assert.equal(W.stars, 4, '587.5 heat');
  add('murder', false); assert.equal(W.stars, 5, '632.5 heat');
  assert.deepEqual(log.filter(e => e.n === 'wanted').map(e => e.stars), [1, 2, 3, 4, 5], 'one star at a time');
  // the response, tier by tier, each within 4 s of its stars
  for (const [stars, tier] of [[1, 'cruiser'], [2, 'cruiser'], [3, 'chopper'], [4, 'swat'], [5, 'fed']]) {
    const g = await play('greasy-spoke'), L = listen(g.gtm.BUS, ['dispatch']); g.gtm.life.wanted.set(stars); g.game.advance(4);
    assert.ok(L.some(e => e.tier === tier), `${stars} stars: ${tier} sent within 4 s: ` + JSON.stringify(L.map(e => e.tier)));
    if (stars < 3) assert.ok(!L.some(e => e.tier === 'chopper'), 'no Eye below 3 stars');
    if (stars < 4) assert.ok(!L.some(e => e.tier === 'swat' || e.tier === 'fed'), 'no SWAT nor Feds below 4 stars');
  }
});

test('at 3 stars the MPD Eye comes and stays over the player, its searchlight on them at night', async () => {
  const { game, gtm } = await play('greasy-spoke', { time: 'night' }), P = gtm.crew.ped, Pol = gtm.life.police;
  gtm.life.wanted.set(3); let over = false;
  for (let t = 0; t < 30 && !over; t += .5) { game.advance(.5); const h = Pol.heli && Pol.heli.v; over = !!h && Math.hypot(h.x - P.x, h.y - P.y) < 200; }
  assert.ok(over, 'the Eye over the player within 30 s');
  game.advance(3); const b = Pol.heli.v.body;
  assert.ok(b.spot && Math.hypot(b.spot[0] - P.x, b.spot[1] - P.y) < 40, 'its light on them: ' + JSON.stringify(b.spot));
  gtm.life.wanted.set(2); game.advance(2);
  assert.equal(Pol.heli, null, 'at 2 stars it goes back to its patrol');
});

test('a chase: roadblocks and spike strips go down ahead of the player\'s car, inside the annulus; a tyre over a strip goes flat', async () => {
  const { game, gtm, snap } = await loadGame({ hash: '#play/safehouse', query: { seed: '1999', time: 'night', weather: 'clear', auto: 'rats-hq' } });
  const Pol = gtm.life.police, fp = gtm.life.fp, T = gtm.TUNE, put = [];
  gtm.BUS.on('roadblock', e => put.push({ ...e, kind: 'roadblock', d: fp.d(e.x, e.y), car: { ...pick(gtm.crew.ped.seat.vehicle) } }), 'world');
  gtm.BUS.on('spikes', e => put.push({ ...e, kind: 'spikes', d: fp.d(e.x, e.y), car: { ...pick(gtm.crew.ped.seat.vehicle) } }), 'world');
  for (let t = 0; t < 30 && !snap().vehicle; t += .5) game.advance(.5);
  assert.ok(snap().vehicle, 'the AutoPlayer drives');
  gtm.life.wanted.set(4);
  for (let t = 0; t < 30 && !(put.some(p => p.kind === 'roadblock') && put.some(p => p.kind === 'spikes')); t += .5) game.advance(.5);
  for (const k of ['roadblock', 'spikes']) {
    const p = put.find(q => q.kind === k); assert.ok(p, k + ' put down');
    assert.ok(p.d >= T.fpSpawnIn - 1 && p.d <= T.fpSpawnOut + 1, `${k} inside the annulus: ${p.d.toFixed(0)} u`);
    assert.ok((p.x - p.car.x) * Math.cos(p.car.heading) + (p.y - p.car.y) * Math.sin(p.car.heading) > 0, k + ' ahead of the car');
  }
  // a car driven over a strip: its tyres burst, and it grips and pulls less (the traffic cleared off its stretch of road
  // first: a car coming over the strip the other way had met it head on)
  const s = Pol.spikes[0];
  for (const o of [...gtm.fleet.vehicles]) if (o.traffic && o.owner === 'world' && Math.hypot(o.x - s.x, o.y - s.y) < 160) gtm.fleet.remove(o);
  const v = gtm.fleet.spawn('cortez', s.x - 60, s.y, 0);
  v.body.heading = Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]) + Math.PI / 2; v.body.x = s.x - Math.cos(v.body.heading) * 60; v.body.y = s.y - Math.sin(v.body.heading) * 60;
  for (let i = 0; i < 240 && !v.flats; i++) { v.body.setVelocity(Math.cos(v.body.heading) * 120, Math.sin(v.body.heading) * 120); game.advance(1 / 120); }
  assert.equal(v.flats, 1, 'flat');
});
const pick = v => ({ x: v.x, y: v.y, heading: v.heading });

test('hiding: out of every unit\'s sight, the stars clear after the evade time (15 s at 2 stars), the search area widening meanwhile', async () => {
  const { game, gtm } = await play('greasy-spoke'), P = gtm.crew.ped, W = gtm.life.wanted, T = gtm.TUNE, log = listen(gtm.BUS, ['search', 'evaded']);
  clearAround(gtm, P.x, P.y, 600); cop(gtm, P.x + 50, P.y, P);
  W.set(2); game.advance(.6); assert.ok(W.seen, 'seen at first');
  // away and out of sight (a jump out of the cop's view: it never sees them again)
  const cops = gtm.life.police.cops; for (const c of cops) c.ped.mover.facing += Math.PI;
  const hide = gtm.city.poi('rats-hq'); P.place(hide.x, hide.y); const t0 = gtm.life.police.t;   // (far off: the search is round where they last saw them)
  let cleared = null; for (let t = 0; t < 30 && cleared === null; t += .1) { game.advance(.1); if (!W.stars) cleared = gtm.life.police.t - t0; }
  assert.ok(cleared !== null, 'the stars cleared');
  assert.ok(cleared >= T.evade2 - .3 && cleared <= T.evade2 + 1, `in the evade time: ${cleared.toFixed(1)} s (${T.evade2})`);
  const rs = log.filter(e => e.n === 'search').map(e => e.r); assert.ok(rs.length > 5 && rs.at(-1) > rs[0], 'the search widens: ' + rs.join(','));
  assert.ok(log.some(e => e.n === 'evaded' && e.stars === 2), 'evaded');
});

test('an alley halves a unit\'s sight, a deck over the player blinds the Eye', async () => {
  const { gtm } = await play('greasy-spoke'), Pol = gtm.life.police, C = gtm.city;
  // a straight run of alley (7 cells, either way): the player at one end, a unit 96 u along it, within its 160 but past
  // half
  let alley = null, dir = null;
  for (let cy = 0; cy < C.h && !alley; cy++) for (let cx = 0; cx < C.w && !alley; cx++) for (const [dx, dy] of [[0, 1], [1, 0]]) {
    let ok = true; for (let k = 0; k <= 6 && ok; k++) ok = C.surfaceAt(cx + dx * k, cy + dy * k) === 'alley' && C.walkable(cx + dx * k, cy + dy * k);
    if (ok && !alley) { alley = { x: (cx + .5) * 16, y: (cy + .5) * 16, z: 0 }; dir = [dx, dy]; }
  }
  assert.ok(alley, 'a straight alley');
  const unit = { x: alley.x + dir[0] * 96, y: alley.y + dir[1] * 96, z: 0, facing: Math.atan2(-dir[1], -dir[0]), fov: 7, range: 160, eye: 14, kind: 'car' };
  assert.equal(Pol._sees(unit, alley), false, 'along the alley, 96 u off: not seen');
  const surf = C.surfaceAtPoint; C.surfaceAtPoint = () => 'road';
  try { assert.equal(Pol._sees(unit, alley), true, 'the same line on a street: seen'); } finally { C.surfaceAtPoint = surf; }
  const deck = C.decks.find(d => d.kind !== 'rail' && d.z >= 40 && d.cells.length), c = deck.cells[Math.floor(deck.cells.length / 2)], under = { x: (c.cx + .5) * 16, y: (c.cy + .5) * 16, z: 0 };
  const eye = q => ({ x: q.x + 40, y: q.y + 40, z: 220, facing: 0, fov: 7, range: 520, eye: 0, kind: 'heli' });
  assert.equal(Pol._sees(eye(under), under), false, 'the Eye sees nothing under the Loop');
  const open = gtm.crew.ped; assert.equal(Pol._sees(eye(open), open), true, 'and the player out in the open');
});

test('the respray: in a car at Spray & Pray, out of sight, the stars go for a fee and the paint changes; not while a cop watches', async () => {
  for (const watched of [false, true]) {
    const { game, gtm, snap } = await play('greasy-spoke'), P = gtm.crew.ped, W = gtm.life.wanted, shop = gtm.city.poi('spray-pray'), log = listen(gtm.BUS, ['respray']);
    clearAround(gtm, shop.x, shop.y, 600);
    const v = gtm.fleet.spawn('cortez', shop.x, shop.y + 10, 0), color = v.color; P.place(v.x, v.y - 30); game.advance(.5);
    if (watched) cop(gtm, v.x + 50, v.y + 20, v);
    W.set(2); game.advance(.5);   // (the stars and, watched, the cop's eyes on them before they drive in)
    const fund = snap().fund; v.sit(P, 0); game.advance(1);
    if (watched) { assert.equal(W.stars, 2, 'not while they watch'); assert.equal(snap().fund, fund, 'no charge'); assert.equal(log.length, 0); }
    else { assert.equal(W.stars, 0, 'stars gone'); assert.equal(snap().fund, fund - gtm.TUNE.resprayFee, 'the fee'); assert.notEqual(v.color, color, 'another colour'); assert.equal(log.length, 1); }
  }
});

test('the respray from the street: a car pulled up on Canal Street in front of Spray & Pray is in its bay, and the bot losing a star drives in there', async () => {
  { const { game, gtm } = await play('spray-pray'), P = gtm.crew.ped, W = gtm.life.wanted, shop = gtm.city.poi('spray-pray'), log = listen(gtm.BUS, ['respray']);
    clearAround(gtm, shop.x, shop.y, 600);
    const G = gtm.motor.roadsOf(gtm.city).graph, n = G.nearestLane(shop.x, shop.y, null, 0, 200), q = G.pointOn(n.lane, n.s);
    assert.ok(Math.hypot(q[0] - shop.x, q[1] - shop.y) > 60, 'the door stands back from the street');
    const v = gtm.fleet.spawn('cortez', q[0], q[1], n.lane.dir ? Math.atan2(n.lane.dir[1], n.lane.dir[0]) : 0); v.sit(P, 0); W.set(1); game.advance(1.5);
    assert.equal(log.length, 1, 'resprayed at the curb'); assert.equal(W.stars, 0); }
  { const { game, gtm } = await play('spray-pray'), P = gtm.crew.ped, W = gtm.life.wanted, M = gtm.motor, shop = gtm.city.poi('spray-pray'), log = listen(gtm.BUS, ['respray']);
    clearAround(gtm, shop.x, shop.y, 600);
    const G = M.roadsOf(gtm.city).graph, n = G.nearestLane(shop.x + 180, shop.y, null, 0, 200), q = G.pointOn(n.lane, n.s);
    const v = gtm.fleet.spawn('cortez', q[0], q[1], Math.atan2(n.lane.dir[1], n.lane.dir[0])); v.sit(P, 0); game.advance(.2); W.set(1);
    const B = new M.MissionBot({ city: gtm.city, roads: M.roadsOf(gtm.city), fleet: gtm.fleet, junctions: gtm.life.junctions });
    gtm.pilot((dt, p) => B.evade(dt, p, { t: gtm.life.t, pedsNear: (x, y, r) => gtm.life.pedsNear(x, y, r), wanted: W, police: gtm.life.police, respray: gtm.career._respray() }));
    for (let t = 0; t < 60 && !log.length; t += .25) game.advance(.25);
    assert.equal(log.length, 1, 'the bot\'s evade drove into the bay'); gtm.pilot(null); }
});

test('NABBED: cuffed on foot when slow or unarmed (not when quick and armed), at the door of a stopped car (not a moving one, nor from the street under the deck it stands on), never at no stars; then the precinct, bail, the guns gone', async () => {
  const DECK = [1600, 1267, 64];   // (the Loop's north leg, up on its deck over the street)
  const nab = async (o) => {
    const { game, gtm } = await play('greasy-spoke'), P = gtm.crew.ped, W = gtm.life.wanted, log = listen(gtm.BUS, ['busted']);
    clearAround(gtm, P.x, P.y, 600); if (o.deck) clearAround(gtm, DECK[0], DECK[1], 300);
    let v = null; if (o.car) { v = gtm.fleet.spawn('cortez', o.deck ? DECK[0] : P.x, o.deck ? DECK[1] : P.y, 0); if (o.deck) v.body.z = DECK[2]; v.sit(P, 0); if (o.deck) game.advance(.5); }
    if (o.armed) P.inv.select('snub38'); else P.inv.select('fists');
    const at = v ? gtm.motor.doorOf(v) : [P.x + 8, P.y], c = cop(gtm, at[0], at[1], P, o.deck === 'up' ? v.z : 0);
    if (o.stars) W.set(o.stars);
    const x0 = P.x, y0 = P.y;
    for (let i = 0; i < 360 && !log.length; i++) {   // (3 s)
      if (o.fast && !v) { P.place(x0, y0); P.mover.vx = 90; P.mover.vy = 0; c.ped.place(x0 + 8, y0); }
      if (o.fast && v) { v.body.setVelocity(50, 0); v.body.x = x0; v.body.y = y0; }
      if (!o.fast && !v) c.ped.place(x0 + 8, y0);
      game.advance(1 / 120);
    }
    return { log, game, gtm };
  };
  assert.equal((await nab({ stars: 1, armed: true })).log[0]?.how, 'cuffed', 'standing still, armed: cuffed');
  assert.equal((await nab({ stars: 1, armed: false, fast: true })).log[0]?.how, 'cuffed', 'running, unarmed: cuffed');
  assert.equal((await nab({ stars: 1, armed: true, fast: true })).log.length, 0, 'running and armed: not');
  assert.equal((await nab({ stars: 1, car: true })).log[0]?.how, 'door', 'in a stopped car, a cop at the door 1.5 s');
  assert.equal((await nab({ stars: 1, car: true, fast: true })).log.length, 0, 'in a moving car: not');
  { const r = await nab({ stars: 1, car: true, deck: 'up' }), v = r.gtm.crew.ped.seat.vehicle;
    assert.ok(v.z > 50, 'the car up on the deck: ' + v.z); assert.equal(r.log[0]?.how, 'door', 'on the deck, a cop at the door up there'); }
  assert.equal((await nab({ stars: 1, car: true, deck: 'under' })).log.length, 0, 'on the deck, a cop on the street under the door: not');
  assert.equal((await nab({ stars: 0, armed: false })).log.length, 0, 'no stars: never');
  // the arrest played out: the precinct, bail, the guns taken (a job's tool kept), the stars gone
  const { game, gtm } = await nab({ stars: 2, armed: false }), P = gtm.crew.ped;
  P.inv.give('snap', 1, true); const fund = gtm.crew.fund;
  game.advance(gtm.TUNE.cardTime + .5);
  const pre = gtm.city.poi('precinct');
  assert.ok(Math.hypot(P.x - pre.x, P.y - pre.y) < 40, 'at the precinct');
  assert.equal(gtm.crew.fund, fund - Math.min(fund, gtm.TUNE.bailFee), 'bail');
  assert.deepEqual([...P.inv.list()], ['fists', 'snap'], 'the guns gone, the camera kept');   // (copied out of the game's realm)
  assert.equal(gtm.life.wanted.stars, 0, 'the stars cleared');
});

test('WRECKED: dead while wanted, the card, then the hospital, its bill, and no stars', async () => {
  const { game, gtm, snap } = await play('greasy-spoke'), P = gtm.crew.ped, W = gtm.life.wanted;
  W.set(3); game.advance(.5); const fund = gtm.crew.fund;
  gtm.combat.hurt(P, { amount: 9999, kind: 'bullet', by: null }); game.advance(1);
  assert.equal(snap().down, 'wrecked', 'the card');
  game.advance(gtm.TUNE.cardTime);
  const H = gtm.city.poi('hospital');
  assert.ok(!P.dead && Math.hypot(P.x - H.x, P.y - H.y) < 40, 'up at the hospital');
  assert.equal(gtm.crew.fund, fund - Math.min(fund, gtm.TUNE.hospitalFee), 'the bill');
  assert.equal(W.stars, 0, 'the stars cleared');
});

test('a chase is the same in every view: 3 stars and the Saints hostile for 20 s hash alike in ISO, TOP-DOWN and MODE 7', async () => {
  const run = async view => {
    const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'night', weather: 'clear', view } });
    game.advance(2); gtm.life.wanted.set(3); gtm.life.gangs.respect.saints = -20; game.advance(20);
    return [...game.stateHash(), ...gtm.life.police.hash(), ...gtm.life.gangs.hash()];
  };
  const iso = await run('iso');
  assert.deepEqual(await run('top'), iso, 'TOP-DOWN');
  assert.deepEqual(await run('side7'), iso, 'MODE 7');
});
