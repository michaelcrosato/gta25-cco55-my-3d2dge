// The economy (PLAN.md 8.16) in Lowtown: purchases (paid, applied, refused for the cash, full, locked until the mission
// that stocks it), the confirm above $5,000, the properties (bought once, paid into their till every midnight up to
// its cap, collected by walking up), the cab skip, the Kwik-Lux hold-up (the till, two stars), stunt jumps (first and
// again), Moto Tokens surviving a save, and the completion checklist summing to exactly 100.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../harness.mjs';

async function at(poi, q = {}) {
  const g = await loadGame({ hash: '#play/' + poi, query: { seed: '1999', time: 'day', weather: 'clear', ...q } }); g.game.advance(.5);
  return { ...g, M: g.gtm.motor, C: g.gtm.career, P: () => g.gtm.crew.ped };
}
const item = (M, shop, id) => M.get('shops', shop).items.find(i => i.id === id);

test('Lead Farm: a purchase is paid and applied; refused for want of cash, at full armour, and for a gun its mission has not stocked yet', async () => {
  const { M, C, P, gtm } = await at('lead-farm'), X = C.econ, p = P();
  gtm.crew.fund = 1000;
  const ammo = item(M, 'lead-farm', 'ammo_snub38'), r0 = p.inv.rounds('snub38').total, price = X.price(ammo);
  assert.equal(X.buy('lead-farm', ammo, { ped: p }).ok, true); assert.equal(gtm.crew.fund, 1000 - price); assert.equal(p.inv.rounds('snub38').total, r0 + 36);
  const armor = item(M, 'lead-farm', 'armor'); assert.equal(X.buy('lead-farm', armor, { ped: p }).ok, true); assert.equal(p.vitals.armor, 100);
  assert.equal(X.check(armor, { ped: p }).reason, 'full', 'at full armour: refused');
  gtm.crew.fund = 5; assert.equal(X.check(ammo, { ped: p }).reason, 'cash');
  // the card: the Buzzsaw off the shelves until Holy Rollers is done
  gtm.crew.fund = 10000; C._shopCard(M.get('shops', 'lead-farm'), { ped: p });
  assert.ok(!C.card.items.some(i => i.label === 'BUZZSAW'), 'the Buzzsaw locked'); C.close();
  C.save.missions.done.push('saints_holy_rollers'); C._shopCard(M.get('shops', 'lead-farm'), { ped: p });
  assert.ok(C.card.items.some(i => i.label === 'BUZZSAW'), 'stocked after Holy Rollers');
  // above $5,000 a purchase asks first
  assert.equal(X.check(item(M, 'boom-box', 'mod_roofmg'), { vehicle: { mods: {}, damage: { share: 1 } } }).confirm, true);
  assert.equal(X.check(ammo, { ped: p }).confirm, false);
});

test('the shop card at the door: △ opens it, ✕ buys the focused item, ○ backs out; at most six items a page', async () => {
  const { game, gtm, snap, input } = await at('greasy-spoke'), C = gtm.career, p = gtm.crew.ped;
  const q = gtm.city.poi('greasy-spoke'); p.place(q.x, q.y); p.vitals.health = 40; gtm.crew.fund = 100; game.advance(.2);
  assert.ok(C.prompt && /SHOP/.test(C.prompt.text), 'the prompt at the door: ' + (C.prompt && C.prompt.text));
  input.press('KeyE'); game.advance(1 / 30); input.release('KeyE'); game.advance(.1);
  assert.equal(snap().career.card, 'shop');
  input.press('Enter'); game.advance(1 / 30); input.release('Enter'); game.advance(.1);
  assert.equal(p.vitals.health, 100, 'the blue plate: full health'); assert.ok(gtm.crew.fund < 100, 'paid');
  input.press('Escape'); game.advance(1 / 30); input.release('Escape'); game.advance(.1);
  assert.equal(snap().career.card, null, 'backed out');
  for (const s of gtm.motor.all('shops')) assert.ok(s.items.length > 0, s.id + ' sells something');
});

test('the properties: bought once at the door, paying into the till each midnight up to its cap, collected by walking up', async () => {
  const { game, gtm, C } = await at('car-wash'), X = C.econ, spec = gtm.motor.get('properties', 'car-wash'), A = gtm.motor.amountOf;
  gtm.crew.fund = 100; assert.equal(X.buyProperty('car-wash', spec).reason, 'cash');
  gtm.crew.fund = A(spec.price) + 50; assert.equal(X.buyProperty('car-wash', spec).ok, true); assert.equal(gtm.crew.fund, 50);
  assert.equal(X.buyProperty('car-wash', spec).reason, 'have', 'bought once');
  const p = gtm.crew.ped; p.place(p.x + 300, p.y);   // (away from the door while the nights pass)
  for (let n = 0; n < 2; n++) { gtm.clock.set(23.98); game.advance(3); }
  assert.equal(X.owned('car-wash').till, 2 * A(spec.income), 'two midnights in the till');
  for (let n = 0; n < 10; n++) { gtm.clock.set(23.98); game.advance(3); }
  assert.equal(X.owned('car-wash').till, A(spec.cap), 'capped');
  const q = gtm.city.poi('car-wash'), f0 = gtm.crew.fund; p.place(q.x, q.y); game.advance(.3);
  assert.equal(gtm.crew.fund, f0 + A(spec.cap), 'collected at the door'); assert.equal(X.owned('car-wash').till, 0);
});

test('the cab skip: the phone\'s Lowtown Cabs, a fade, the fare, and there on foot; not while wanted', async () => {
  const { game, gtm, C } = await at('safehouse'), p = gtm.crew.ped, q = gtm.city.poi('marina');
  gtm.crew.fund = 500; const fee = C.cabFee(p, q);
  assert.ok(C.cab(q)); game.advance(1);
  assert.ok(Math.hypot(p.x - q.x, p.y - q.y) < 2, 'there'); assert.equal(gtm.crew.fund, 500 - fee);
  gtm.life.wanted.set(2); C.phone(); C.card.items.find(i => i.label === 'CONTACTS').act();
  const cabs = C.card.items.find(i => i.label === 'LOWTOWN CABS');
  assert.ok(/WANTED/.test(cabs.sub), 'said under CONTACTS'); cabs.act();
  assert.ok(C.card.id === 'cabs' && C.card.items.length && C.card.items.every(i => i.disabled), 'every ride refused while wanted'); C.close();
});

test('a Kwik-Lux hold-up: a gun held on the clerk for the hold-up\'s time empties the till at the counter, and the silent alarm brings two stars', async () => {
  const { game, gtm, C } = await at('kwik-lux-palm'), p = gtm.crew.ped, T = gtm.TUNE;
  game.advance(.5); const s = C.holdups.stores.get('kwik-lux-palm'); assert.ok(s, 'the clerk at the counter');
  const c = s.clerk; p.place(c.x + Math.cos(c.mover.facing) * 50, c.y + Math.sin(c.mover.facing) * 50); p.inv.select('snub38');
  const cash0 = gtm.combat.pickups.list.filter(k => k.kind === 'cash').length, I = gtm.motor.makeIntent();
  gtm.pilot(() => { gtm.motor.clearIntent(I); const d = Math.hypot(c.x - p.x, c.y - p.y); I.down.aim = true; I.aim = [(c.x - p.x) / d, (c.y - p.y) / d]; I.aimPoint = [c.x, c.y, 0]; return I; });   // (the gun held on the clerk)
  game.advance(T.holdupTime + 1); gtm.pilot(null);
  assert.ok(gtm.combat.pickups.list.filter(k => k.kind === 'cash').length > cash0, 'the till dropped at the counter');
  assert.ok(gtm.life.wanted.stars >= 2, 'two stars: ' + gtm.life.wanted.stars);
});

test('a stunt jump: off within its takeoff circle and landed past its distance counts once as unique (paid), then again for points', async () => {
  const { gtm } = await at('safehouse'), M = gtm.motor;
  M.def('stunts', 'fx_jump', { name: 'Fixture jump', takeoff: [0, 0], r: 40, minDist: 100, minAir: .3, reward: 700 });
  const S = new M.StuntJumps({ save: { stunts: [] } }), b = { x: 10, y: 0, z: 10, airborne: true, rollA: 0, flipped: false }, v = { body: b, wrecked: false };
  const fly = () => { b.x = 10; b.airborne = true; let out = null; for (let t = 0; t < 1; t += .1) { b.x += 15; out = S.update(.1, v) || out; } b.airborne = false; return S.update(.1, v) || out; };
  const a = fly(); assert.ok(a && a.ok && a.first && a.reward === 700, JSON.stringify(a));
  const c = fly(); assert.ok(c && c.ok && !c.first && !c.reward, 'again: points only');
  b.x = 500; b.airborne = true; S.update(.1, v); b.airborne = false; assert.equal(S.update(.1, v), null, 'off anywhere else: nothing');
});

test('Moto Tokens survive a save: taken, written, loaded, the found one stays found and is not laid out again', async () => {
  const { game, gtm } = await at('safehouse'), C = gtm.career, M = gtm.motor;
  M.def('collectibles', 'fx_tokens', { name: 'Fixture tokens', reward: 50, spots: [{ id: 'fx1', at: [gtm.crew.ped.x + 30, gtm.crew.ped.y, 0] }, { id: 'fx2', at: [gtm.crew.ped.x + 900, gtm.crew.ped.y, 0] }] });
  C.saves.backend = M.memoryBackend(); C.tokens.place();
  const f0 = gtm.crew.fund, p = gtm.crew.ped; p.place(p.x + 30, p.y); game.advance(.3);
  assert.ok(C.save.collectibles.includes('fx1'), 'found'); assert.equal(gtm.crew.fund, f0 + 50);
  assert.equal(C.write('1').ok, true);
  const back = C.saves.backend; game.go('play', { load: '1' }); game.advance(.5);
  const C2 = gtm.career; assert.notEqual(C2, C);
  assert.ok(C2.save.collectibles.includes('fx1'), 'kept after the load'); assert.equal(C2.saves.backend, back);
  assert.ok(!gtm.combat.pickups.list.some(k => k.id === 'fx1'), 'not laid out again'); assert.ok(gtm.combat.pickups.list.some(k => k.id === 'fx2'), 'the other still there');
});

test('the completion checklist: the weights sum to exactly 100%, and a save with all of it done reads exactly 100', async (t) => {
  const { gtm } = await at('safehouse'), M = gtm.motor, c0 = M.completion(gtm.career.save);
  assert.equal(c0.weights, 1000, 'the categories\' weights: 1000 tenths');
  const empty = c0.items.filter(i => !i.of).map(i => i.kind);
  if (empty.length) { t.skip('content still to come: ' + empty.join(', ')); return; }
  const S = JSON.parse(JSON.stringify(gtm.career.save));
  S.missions.done = M.all('missions').map(m => m.id);
  for (const a of M.all('activities')) S.activities[a.id] = a.levels || 1;
  S.stunts = M.all('stunts').map(s => s.id); S.collectibles = M.all('collectibles').flatMap(c => c.spots.map(s => s.id)); S.properties = M.all('properties').map(p => ({ id: p.id, till: 0 }));
  assert.equal(M.completion(S).pct, 100);
});
