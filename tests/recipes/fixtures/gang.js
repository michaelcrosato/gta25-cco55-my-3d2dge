// The gang recipe's fixture (docs/CONTENT-GUIDE.md, "A gang"), as src/game/gangs/riveters.js: the Brickyard's own
// gang (it has none), its two archetypes, and its HQ (a landmark: a building and the point of interest at its door).
// Its turf is a neighbourhood's id; its members walk its sidewalks and hang out at its HQ, its cars keep to its turf.
// tests/recipes/gang.test.mjs bundles it in.
import { def } from '../../motor/index.js';

const LOOK = { builds: ['bulky', 'heroic'], outfits: ['coat'], sleeves: ['long'], hairs: ['short', 'bald'], hats: [{ style: 'cap', color: '#3a3a40' }],
  palettes: { cloth: ['#c8a03a'], coat: ['#3a3a40'], pants: ['#2a3048'] } };
def('peds', 'riveter-grunt', { name: 'Riveter', kind: 'gang', faction: 'riveters', weight: 0, weapons: ['slugger'], ...LOOK });
def('peds', 'riveter-enforcer', { name: 'Riveter foreman', kind: 'gang', faction: 'riveters', weight: 0, weapons: ['snub38'], health: 150, ...LOOK });
def('landmarks', 'riveters-hall', { district: 'lowtown', name: 'The Riveters\' Hall',
  lots: [{ rect: [10, 145, 21, 151], kind: 'building', storeys: 2, look: { side: '#7a4a3a', top: '#3a3a40', face: 'brick', roof: 'slab', windows: { lit: .4 }, door: { chance: 1 } }, sign: { text: 'RIVETERS', color: '#e8c040' } }],
  pois: [{ id: 'riveters-hq', kind: 'gang', gang: 'riveters', at: [15, 144], label: 'The Riveters\' Hall' }] });
def('gangs', 'riveters', {
  name: 'Riveters', colors: ['#e8c040', '#3a3a40'], icon: 'triangle', pattern: 'checks', turf: ['brick'], hq: 'riveters-hq',
  vehicles: ['hauler'], weapons: ['slugger', 'snub38'], peds: { grunt: 'riveter-grunt', enforcer: 'riveter-enforcer' },
  thresholds: { hostile: -20, friendly: 40 }, beats: [[30, 100], [60, 130]],
});
