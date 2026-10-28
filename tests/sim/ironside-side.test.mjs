// Ironside's side content (EXPANSION.md 5, X4): its Kwik-Lux's hold-up (the till, two stars), its two properties
// (bought at their doors there, never in Lowtown), its three stunt jumps on their ramps and the Flyover's spur (no lane
// on it: the traffic never takes it), and its 15 Moto Tokens laid out in Ironside alone. Crop Duster, the Air Race and
// its MAYHEM are the mission bot's to play (tools/bot.mjs), the tokens, stunts and properties the campaign's too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../harness.mjs';

const Q = { seed: '1', time: 'day', weather: 'clear', dev: '1', district: 'ironside' };
async function at(poi, q = Q) { const g = await loadGame({ hash: '#play/' + poi, query: q }); g.game.advance(.5); return g; }

test('the Ironside Kwik-Lux: a gun held on the clerk empties the till at the counter, and the silent alarm brings two stars', async () => {
  const { game, gtm } = await at('kwik-lux-ironside'), C = gtm.career, p = gtm.crew.ped, T = gtm.TUNE;
  game.advance(.5); const s = C.holdups.stores.get('kwik-lux-ironside'); assert.ok(s, 'the clerk at the counter');
  const c = s.clerk; p.place(c.x + Math.cos(c.mover.facing) * 50, c.y + Math.sin(c.mover.facing) * 50); p.inv.select('snub38');
  const cash0 = gtm.combat.pickups.list.filter(k => k.kind === 'cash').length, I = gtm.motor.makeIntent();
  gtm.pilot(() => { gtm.motor.clearIntent(I); const d = Math.hypot(c.x - p.x, c.y - p.y); I.down.aim = true; I.aim = [(c.x - p.x) / d, (c.y - p.y) / d]; I.aimPoint = [c.x, c.y, 0]; return I; });
  game.advance(T.holdupTime + 1); gtm.pilot(null);
  assert.ok(gtm.combat.pickups.list.filter(k => k.kind === 'cash').length > cash0, 'the till dropped at the counter');
  assert.ok(gtm.life.wanted.stars >= 2, 'two stars: ' + gtm.life.wanted.stars);
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});

test('Sudsy\'s Launderette and the Airstrip: Ironside\'s, bought at their doors there, paying at midnight; Lowtown has neither door', async () => {
  const { game, gtm } = await at('launderette'), C = gtm.career, X = C.econ, M = gtm.motor, A = M.amountOf;
  for (const id of ['launderette', 'airstrip']) {
    const spec = M.get('properties', id); assert.equal(spec.district, 'ironside', id + ' is Ironside\'s');
    const q = gtm.city.poi(spec.poi); assert.ok(q, id + '\'s door in Ironside');
    gtm.crew.fund = A(spec.price) + 10; gtm.crew.ped.place(q.x, q.y); game.advance(.3);
    assert.ok(C.prompt && /BUY/.test(C.prompt.text), id + ': BUY at its door: ' + (C.prompt && C.prompt.text));
    assert.equal(X.buyProperty(id, spec).ok, true, id + ' bought');
  }
  const p = gtm.crew.ped; p.place(p.x + 400, p.y); gtm.clock.set(23.98); game.advance(3);
  assert.equal(X.owned('launderette').till, A(M.get('properties', 'launderette').income), 'a midnight in the till');
  const L = await loadGame({ hash: '#play', query: { seed: '1', time: 'day' } });
  for (const id of ['launderette', 'airstrip']) assert.equal(L.gtm.city.poi(M.get('properties', id).poi), null, id + ': no door in Lowtown');
});

test('the three stunts: Ironside\'s, on their ramps and the Flyover\'s spur, which the traffic never takes', async () => {
  const { gtm } = await at('slag-tip'), M = gtm.motor, C = gtm.city, T = C.T;
  const mine = M.all('stunts').filter(s => s.district === 'ironside').map(s => s.id).sort();
  assert.equal(mine.join(), 'crusher-yard,flyover-end,slag-heap');
  for (const id of ['slag-kicker', 'slag-landing', 'crusher-kicker', 'flyover-end']) assert.ok(C.decks.some(d => d.id === id), 'the deck ' + id);
  // (each kicker's lip 32 up at its takeoff end, the end of its ramp's first cell; the spur 64 up over the Monks' yard)
  const g = (x, y, z) => C.map.groundAt(x, y, 0, z);
  assert.ok(Math.abs(g(79.5 * T, 21.1 * T, 40) - 32) < 3, 'the Slag Heap\'s kicker lip: ' + g(79.5 * T, 21.1 * T, 40)); assert.ok(Math.abs(g(55 * T, 75 * T, 70) - 64) < 1, 'the spur: ' + g(55 * T, 75 * T, 70));
  assert.ok(Math.abs(g(23.5 * T, 89.9 * T, 40) - 32) < 3, 'the Crusher Yard\'s kicker lip: ' + g(23.5 * T, 89.9 * T, 40));
  // (the spur's lanes join none of the Flyover's, and the road graph keeps no lane on it: the traffic never takes it)
  const G = M.roadsOf(C).graph, on = l => [l.a, l.b].some(q => (q[2] || 0) > 50 && Math.abs(q[1] - 75.5 * T) < 40 && q[0] < 59 * T);
  assert.ok(!G.lanes.some(on), 'no lane on the spur: ' + G.lanes.filter(on).map(l => l.a.map(Math.round) + '>' + l.b.map(Math.round)).join(' | '));
});

test('Ironside\'s 15 Moto Tokens: laid out in Ironside alone (Lowtown lays out its 25)', async () => {
  const { gtm } = await at('safehouse'), M = gtm.motor;
  const ids = M.get('collectibles', 'moto-tokens-ironside').spots.map(s => s.id);
  assert.equal(ids.length, 15);
  const placed = gtm.career.tokens.placed.map(t => t.id || t.spot || t);
  assert.equal(gtm.career.tokens.placed.length, 15, 'Ironside lays out its own 15');
  const L = await loadGame({ hash: '#play', query: { seed: '1', time: 'day' } });
  assert.equal(L.gtm.career.tokens.placed.length, 25, 'Lowtown its 25');
  assert.ok(placed.length === 15);
});
