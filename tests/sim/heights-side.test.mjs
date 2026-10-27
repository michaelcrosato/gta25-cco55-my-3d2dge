// Glass Heights' side content (EXPANSION.md 5, X7; D44): the Strip's Kwik-Lux's hold-up (the till, two stars), its two
// properties (bought at their doors there, never in Lowtown), its three stunt jumps on their kickers, the Villa's pool
// water under the first, its 15 Moto Tokens laid out in Glass Heights alone (every token's id its own across the
// districts), and the Grand Palms' white limo for hire at its curb (and back there after a fire, the wrecks towed out
// of sight: X8). Limo, the Regatta and Flare the Limos are the mission bot's to play (tools/bot.mjs), the tokens, stunts
// and properties the campaign's too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../harness.mjs';

const Q = { seed: '1', time: 'day', weather: 'clear', dev: '1', district: 'glass-heights' };
async function at(poi, q = Q) { const g = await loadGame({ hash: '#play/' + poi, query: q }); g.game.advance(.5); return g; }

test('the Strip\'s Kwik-Lux: a gun held on the clerk empties the till at the counter, and the silent alarm brings two stars', async () => {
  const { game, gtm } = await at('kwik-lux-strip'), C = gtm.career, p = gtm.crew.ped, T = gtm.TUNE;
  game.advance(.5); const s = C.holdups.stores.get('kwik-lux-strip'); assert.ok(s, 'the clerk at the counter');
  const c = s.clerk; p.place(c.x + Math.cos(c.mover.facing) * 50, c.y + Math.sin(c.mover.facing) * 50); p.inv.select('snub38');
  const cash0 = gtm.combat.pickups.list.filter(k => k.kind === 'cash').length, I = gtm.motor.makeIntent();
  gtm.pilot(() => { gtm.motor.clearIntent(I); const d = Math.hypot(c.x - p.x, c.y - p.y); I.down.aim = true; I.aim = [(c.x - p.x) / d, (c.y - p.y) / d]; I.aimPoint = [c.x, c.y, 0]; return I; });
  game.advance(T.holdupTime + 1); gtm.pilot(null);
  assert.ok(gtm.combat.pickups.list.filter(k => k.kind === 'cash').length > cash0, 'the till dropped at the counter');
  assert.ok(gtm.life.wanted.stars >= 2, 'two stars: ' + gtm.life.wanted.stars);
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});

test('the Glass Tower penthouse and the Marina berth: the Heights\', bought at their doors there, paying at midnight; Lowtown has neither door', async () => {
  const { game, gtm } = await at('penthouse'), C = gtm.career, X = C.econ, M = gtm.motor, A = M.amountOf;
  for (const id of ['penthouse', 'berth']) {
    const spec = M.get('properties', id); assert.equal(spec.district, 'glass-heights', id + ' is the Heights\'');
    const q = gtm.city.poi(spec.poi); assert.ok(q, id + '\'s door in Glass Heights');
    gtm.crew.fund = A(spec.price) + 10; gtm.crew.ped.place(q.x, q.y); game.advance(.3);
    assert.ok(C.prompt && /BUY/.test(C.prompt.text), id + ': BUY at its door: ' + (C.prompt && C.prompt.text));
    assert.equal(X.buyProperty(id, spec).ok, true, id + ' bought');
  }
  const p = gtm.crew.ped; p.place(p.x + 400, p.y); gtm.clock.set(23.98); game.advance(3);
  assert.equal(X.owned('penthouse').till, A(M.get('properties', 'penthouse').income), 'a midnight in the till');
  const L = await loadGame({ hash: '#play', query: { seed: '1', time: 'day' } });
  for (const id of ['penthouse', 'berth']) assert.equal(L.gtm.city.poi(M.get('properties', id).poi), null, id + ': no door in Lowtown');
});

test('the three stunts: the Heights\', on their kickers, the Villa Pool\'s over water to a landing past it', async () => {
  const { gtm } = await at('grand-palms'), M = gtm.motor, C = gtm.city, T = C.T;
  const mine = M.all('stunts').filter(s => s.district === 'glass-heights').map(s => s.id).sort();
  assert.equal(mine.join(), 'palms-newsstand,velvet-fountain,villa-pool');
  for (const id of ['villa-kicker', 'villa-landing', 'fountain-kicker', 'palms-kicker']) assert.ok(C.decks.some(d => d.id === id), 'the deck ' + id);
  // (each kicker's lip at the top of its climb, the run-up's end; the Villa's landing lower, past the pool)
  const g = (x, y, z) => C.map.groundAt(x, y, 0, z), near = (v, want, tol, what) => assert.ok(Math.abs(v - want) < tol, what + ': ' + v);
  near(g(76 * T, 91.5 * T, 40), 31, 3, 'the Villa Pool\'s kicker lip'); near(g(83.25 * T, 91.5 * T, 20), 11, 3, 'its landing');
  near(g(55.25 * T, 64.5 * T, 40), 26, 3, 'the Velvet Fountain\'s kicker lip'); near(g(110.25 * T, 74.5 * T, 40), 26, 3, 'the Palms Newsstand\'s kicker lip');
  assert.equal(C.surfaceAtPoint(79.5 * T, 91.5 * T), 'water', 'the Villa\'s pool between the kicker and the landing');
  // (each takeoff past its kicker's lip, each approach behind it along the run-up)
  for (const id of mine) { const s = M.get('stunts', id); assert.ok(Math.hypot(s.takeoff[0] - s.approach[0], s.takeoff[1] - s.approach[1]) > 80, id + '\'s run-up'); }
});

test('the Heights\' 15 Moto Tokens: laid out in Glass Heights alone, every token\'s id its own across the districts', async () => {
  const { gtm } = await at('safehouse'), M = gtm.motor;
  assert.equal(M.get('collectibles', 'moto-tokens-heights').spots.length, 15);
  assert.equal(gtm.career.tokens.placed.length, 15, 'Glass Heights lays out its own 15');
  const ids = M.all('collectibles').flatMap(c => c.spots.map(s => s.id)), dup = ids.filter((id, k) => ids.indexOf(id) !== k);
  assert.equal(dup.length, 0, 'a token id two districts share counts both: ' + dup.join());   // (the Heights' marina's had been Lowtown's mt-marina-pier)
  const L = await loadGame({ hash: '#play', query: { seed: '1', time: 'day' } });
  assert.equal(L.gtm.career.tokens.placed.length, 25, 'Lowtown its 25');
});

test('the Grand Palms\' white limo for hire stands at its curb, and the Limo job lends one there to a player on foot', async () => {
  const { gtm } = await at('grand-palms'), q = gtm.city.poi('grand-palms');
  const v = gtm.fleet.vehicles.find(o => o.def.id === 'limo' && Math.hypot(o.x - q.x, o.y - q.y) < 320);
  assert.ok(v, 'the white limo by the Grand Palms');
  assert.equal(gtm.motor.get('activities', 'job_limo').levels, 3);
});

test('the white limo burnt at its curb with a car beside it: both towed once out of sight, and a fresh limo parked there', async () => {
  const { game, gtm } = await at('grand-palms'), F = gtm.fleet, K = F.keepers.find(k => k.def === 'limo'), v = K.v;
  const other = F.spawn('cortez', K.home.x + 55, K.home.y, K.home.heading); game.advance(.1);
  v.damage.explode(); other.damage.explode(); game.advance(.2);
  gtm.crew.ped.place(K.home.x - 1400, K.home.y - 900);
  for (let s = 0; s < 40 && K.v === v; s += 2) game.advance(2);
  assert.notEqual(K.v, v, 'a fresh limo');   // (a wreck by its home had kept it from coming back for good: X8's campaign)
  assert.ok(!K.v.wrecked && Math.hypot(K.v.x - K.home.x, K.v.y - K.home.y) < 1, 'at its curb');
  assert.equal(F.near(K.home.x, K.home.y, 120).filter(o => o.wrecked).length, 0, 'the wrecks towed');
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});
