// The weapon recipe's fixture (docs/CONTENT-GUIDE.md, "A weapon"), as src/game/weapons/nailgun.js: the weapon, and
// Lead Farm's shelf for it (an item pushed onto the shop's list: this file loads after src/game/economy.js, by path).
// tests/recipes/weapon.test.mjs bundles it in.
import { def, get } from '../../motor/index.js';

def('weapons', 'nailgun', {
  name: 'Nail Gun', slot: 'pistol', projectile: 'bullet', damage: 12, rate: 5, mag: 20, reload: 1.5, spread: 3, range: 260,
  speed: 900, ammo: 100, model: 'pistol', sound: 'pistol', recoil: .15, rumble: .15, price: 400,
});
get('shops', 'lead-farm').items.push({ id: 'nailgun', name: 'Nail Gun', kind: 'weapon', item: 'nailgun', amount: 40, price: 400 });
