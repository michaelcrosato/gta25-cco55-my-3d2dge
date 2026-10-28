// The weapon recipe (docs/CONTENT-GUIDE.md, "A weapon"): the weapon and its shelf at Lead Farm in one new file
// (fixtures/weapon.js). The range bench measures the DPS it states (within 10%), Lead Farm's card sells it, and in
// play the bought gun is drawn and fired into a target, which it hurts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecipe } from './kit.mjs';

test('a weapon from one new file: its DPS on the range bench, sold at Lead Farm, fired in play', async () => {
  const { game, gtm, M } = await withRecipe('weapon', 'weapons/staplegun.js', { hash: '#play/lead-farm', query: { seed: '1', time: 'day', weather: 'clear' } });
  const r = M.measureDps('staplegun');
  assert.ok(r.ratio >= .9 && r.ratio <= 1.1, `${r.dps} DPS against ${r.spec}`);
  game.advance(.5);
  const C = gtm.career, p = gtm.crew.ped, shop = M.get('shops', 'lead-farm');
  gtm.crew.fund = 1000; C._shopCard(shop, { ped: p });
  assert.ok(C.card.items.some(i => i.label === 'STAPLE GUN'), 'on Lead Farm\'s card'); C.close();
  assert.equal(C.econ.buy('lead-farm', shop.items.find(i => i.id === 'staplegun'), { ped: p }).ok, true);
  assert.ok(p.inv.has('staplegun') && p.inv.rounds('staplegun').total >= 40, 'bought with its rounds');
  const target = gtm.combat.add(new M.Ped({ x: p.x + 60, y: p.y, faction: 'range', anchored: true, look: { build: 'heroic' } }));
  p.inv.select('staplegun'); const I = M.makeIntent(), h0 = target.vitals.health;
  gtm.pilot(() => { M.clearIntent(I); const d = Math.hypot(target.x - p.x, target.y - p.y); I.down.aim = true; I.aim = [(target.x - p.x) / d, (target.y - p.y) / d]; I.aimPoint = [target.x, target.y, 0]; I.down.attack = true; I.tap.attack = true; return I; });
  game.advance(1.5); gtm.pilot(null);
  assert.ok(target.vitals.health < h0, `it hurt the target: ${h0} -> ${target.vitals.health}`);
});
