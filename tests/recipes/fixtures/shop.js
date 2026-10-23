// The shop recipe's fixture (docs/CONTENT-GUIDE.md, "A shop"), as src/game/shops/rivet-hardware.js: the building and
// its door (a landmark: the lot, and the point of interest the shop stands at), and the shop and what it sells.
// Walking up to the door offers the shop's card. tests/recipes/shop.test.mjs bundles it in.
import { def } from '../../motor/index.js';

def('landmarks', 'rivet-hardware', { district: 'lowtown', name: 'Rivet Hardware',
  lots: [{ rect: [2, 145, 9, 151], kind: 'building', storeys: 1, look: { side: '#c8a03a', top: '#5a4a3a', face: 'plaster', roof: 'slab', door: { chance: 1 } }, sign: { text: 'RIVET HARDWARE', color: '#ffd23a' } }],
  pois: [{ id: 'rivet-hardware', kind: 'shop', shop: 'hardware', at: [5, 144], label: 'Rivet Hardware' }] });
def('shops', 'rivet-hardware', { name: 'Rivet Hardware', poi: 'rivet-hardware', color: '#ffd23a', items: [
  { id: 'slugger', name: 'Lowtown Slugger', kind: 'weapon', item: 'slugger', amount: 1, price: 80 },
  { id: 'vest', name: 'Work vest', kind: 'armor', price: 150 },
  { id: 'jerky', name: 'Beef jerky', kind: 'snack', amount: 15, price: 5 },
] });
