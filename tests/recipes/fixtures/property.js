// The property recipe's fixture (docs/CONTENT-GUIDE.md, "A property"), as src/game/properties/suds.js: the building
// and its door (a landmark), and the property: bought once at the door, paying its income into the till every
// midnight up to its cap, collected by walking up. tests/recipes/property.test.mjs bundles it in.
import { def } from '../../motor/index.js';

def('landmarks', 'suds', { district: 'lowtown', name: 'Suds Laundromat',
  lots: [{ rect: [22, 145, 27, 151], kind: 'building', storeys: 1, look: { side: '#a8d8e8', top: '#4a6a7a', face: 'plaster', roof: 'slab', door: { chance: 1 } }, sign: { text: 'SUDS', color: '#5af0ff' } }],
  pois: [{ id: 'suds', kind: 'property', property: 'laundromat', at: [24, 144], label: 'Suds Laundromat' }] });
def('properties', 'suds', { name: 'Suds Laundromat', poi: 'suds', price: 3000, income: 150, cap: 600 });
