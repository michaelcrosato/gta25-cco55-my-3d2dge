// Lowtown's economy (PLAN.md 8.16, 9.10): the seven shops, the two properties and the completion checklist. Every price
// is a TUNE knob (section 'Prices'); a weapon's default is its Lead Farm price (weapons/arsenal.js), and a weapon with
// an unlock comes onto the shelves with that mission done. The Kwik-Lux chain keeps three stores, each with its till
// for a hold-up.
import { def, get, knob } from '../motor/index.js';
import './weapons/arsenal.js';   // (the guns' names and prices first)

const made = new Set(), P = (id, label, value, max = 50000) => { if (!made.has(id)) { made.add(id); knob('Prices', id, label, value, 0, max, 5, `${label} ($)`); } return id; };
// Lead Farm: the guns, their ammo, the armour
const gun = (w, extra = {}) => { const s = get('weapons', w); return { id: w, name: s.name, kind: 'weapon', item: w, price: P('price_' + w, s.name, s.price), unlock: s.unlock || '', ...extra }; };
const ammo = (w, n) => { const s = get('weapons', w); return { id: 'ammo_' + w, name: `${s.name} ammo x${n}`, kind: 'ammo', item: w, amount: n, price: P('price_ammo_' + w, s.name + ' ammo', Math.round(s.price / 8)) }; };
def('shops', 'lead-farm', { name: 'Lead Farm', poi: 'lead-farm', color: '#ffa23a', items: [
  gun('slugger'), gun('snub38'), ammo('snub38', 36), gun('buzzsaw'), ammo('buzzsaw', 90), gun('persuader'), ammo('persuader', 24),
  gun('partystarter'), gun('pineapple'), gun('hotmess'), gun('boomtube'), gun('zapomatic'),
  gun('nailgun'), ammo('nailgun', 120), gun('teslacoil'),   // (Ironside's, EXPANSION.md 6: on the shelves once the Monks' and the Volt Boys' jobs are done)
  { id: 'armor', name: 'Body armour', kind: 'armor', price: P('price_armor', 'Body armour', 400) },
] });
// Boom Box Garage: drive in for the mods (and Lefty's bombs)
def('shops', 'boom-box', { name: 'Boom Box Garage', poi: 'boom-box', drive: true, color: '#ff5a3a', items: [
  { id: 'mod_armor', name: 'Armour plating', kind: 'mod', item: 'armor', price: P('price_mod_armor', 'Armour plating', 2500) },
  { id: 'mod_nitro', name: 'Nitro x3', kind: 'mod', item: 'nitro', amount: 3, price: P('price_mod_nitro', 'Nitro', 1500) },
  { id: 'mod_oil', name: 'Oil slick x3', kind: 'mod', item: 'oil', amount: 3, price: P('price_mod_oil', 'Oil slick', 800) },
  { id: 'mod_mines', name: 'Mines x3', kind: 'mod', item: 'mines', amount: 3, price: P('price_mod_mines', 'Mines', 1200) },
  { id: 'mod_bomb', name: 'Car bomb', kind: 'mod', item: 'bomb', amount: 'ignition', price: P('price_mod_bomb', 'Car bomb', 2000) },   // (PLAN.md 8.8: set on exit, set off by the next driver's ignition or from the phone)
  { id: 'mod_roofmg', name: 'Roof gun', kind: 'mod', item: 'roofMG', price: P('price_mod_roofmg', 'Roof gun', 6000) },
] });
// Spray & Pray: drive in for a new coat (and, wanted and unseen, the respray that loses the stars: the scene's)
const paint = (id, name, c) => ({ id: 'paint_' + id, name, kind: 'paint', item: c, price: P('price_paint', 'A paint job', 120) });
def('shops', 'spray-pray', { name: 'Spray & Pray', poi: 'spray-pray', drive: true, color: '#ff8af0', items: [
  { id: 'repair', name: 'Fix it up', kind: 'repair', price: P('price_repair', 'A repair', 250) },
  paint('red', 'Hot rod red', '#c8423a'), paint('blue', 'Harbour blue', '#3a6ac8'), paint('green', 'Palm green', '#3a8a5a'), paint('black', 'Midnight black', '#202026'), paint('pink', 'Gnome pink', '#ff8ac8'),
] });
// Threads: the possessed protagonist's three outfits (the item: the outfit's index)
def('shops', 'threads', { name: 'Threads', poi: 'threads', color: '#7af0ff', items: [
  { id: 'outfit0', name: 'The usual', kind: 'outfit', item: 0, price: P('price_outfit0', 'The usual', 100) },
  { id: 'outfit1', name: 'Night out', kind: 'outfit', item: 1, price: P('price_outfit1', 'Night out', 400) },
  { id: 'outfit2', name: 'Beach day', kind: 'outfit', item: 2, price: P('price_outfit2', 'Beach day', 600) },
] });
// the Greasy Spoke: a full plate, full health
def('shops', 'greasy-spoke', { name: 'The Greasy Spoke', poi: 'greasy-spoke', color: '#ff5a5a', items: [
  { id: 'plate', name: 'The blue plate', kind: 'health', price: P('price_plate', 'The blue plate', 30) },
  { id: 'coffee', name: 'Bottomless coffee', kind: 'snack', amount: 10, price: P('price_coffee', 'Coffee', 4) },
] });
// Gas'n'Sip and the Kwik-Lux stores: snacks, a small heal
const snacks = () => [
  { id: 'hotdog', name: 'Hot dog', kind: 'snack', amount: 20, price: P('price_hotdog', 'Hot dog', 8) },
  { id: 'soda', name: 'Neon soda', kind: 'snack', amount: 10, price: P('price_soda', 'Neon soda', 3) },
  { id: 'jerky', name: 'Mystery jerky', kind: 'snack', amount: 30, price: P('price_jerky', 'Mystery jerky', 12) },
];
def('shops', 'gas-n-sip', { name: "Gas'n'Sip", poi: 'gas-n-sip', color: '#ffd23a', items: snacks() });
for (const [id, name] of [['kwik-lux-palm', 'Kwik-Lux (Palm)'], ['kwik-lux-neon', 'Kwik-Lux (Neon)'], ['kwik-lux-harbor', 'Kwik-Lux (Harbor)']])
  def('shops', id, { name, poi: id, chain: 'kwik-lux', holdup: true, color: '#5aff8a', items: snacks() });

// the properties: bought at the door, paying into a till every midnight (collected by walking up)
def('properties', 'car-wash', { name: 'Palm Car Wash', poi: 'car-wash', price: P('price_carwash', 'Palm Car Wash', 15000, 200000), income: P('income_carwash', 'Car wash income', 600, 20000), cap: P('cap_carwash', 'Car wash till', 3000, 100000) });
def('properties', 'pixel-palace', { name: 'Pixel Palace Arcade', poi: 'pixel-palace', price: P('price_arcade', 'Pixel Palace Arcade', 25000, 200000), income: P('income_arcade', 'Arcade income', 900, 20000), cap: P('cap_arcade', 'Arcade till', 4500, 100000) });

// the completion checklist (tenths of a percent: they sum to 1000)
const K = (id, label, kind, weight, order) => def('completion', id, { label, kind, weight, order });
K('missions', 'Missions', 'missions', 420, 1); K('jobs', 'Jobs at level 3', 'jobs', 120, 2); K('races', 'Street races', 'races', 60, 3); K('mayhem', 'MAYHEM', 'mayhem', 80, 4);
K('arcade', 'Arcade high scores', 'arcade', 20, 5);   // (L4: the cabinet in Club Chrome; its tenth from MAYHEM's and the stunts')
K('stunts', 'Unique stunt jumps', 'stunts', 90, 6); K('tokens', 'Moto Tokens', 'tokens', 100, 7); K('properties', 'Properties', 'properties', 110, 8);
