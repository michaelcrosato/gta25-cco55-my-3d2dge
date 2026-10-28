// The weapon recipe's fixture (docs/CONTENT-GUIDE.md, "A weapon"), as src/game/weapons/staplegun.js: the weapon, and
// Lead Farm's shelf for it (an item pushed onto the shop's list: this file loads after src/game/economy.js, by path).
// tests/recipes/weapon.test.mjs bundles it in. (A Staple Gun: the Nail Gun is Ironside's own since X3.)
import { def, get } from '../../motor/index.js';

def('weapons', 'staplegun', {
  name: 'Staple Gun', slot: 'pistol', projectile: 'bullet', damage: 12, rate: 5, mag: 20, reload: 1.5, spread: 3, range: 260,
  speed: 900, ammo: 100, model: 'pistol', sound: 'pistol', recoil: .15, rumble: .15, price: 400,
});
get('shops', 'lead-farm').items.push({ id: 'staplegun', name: 'Staple Gun', kind: 'weapon', item: 'staplegun', amount: 40, price: 400 });
