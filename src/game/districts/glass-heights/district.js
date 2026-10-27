// Glass Heights, District 3 (EXPANSION.md 2.3, X5): 128 x 112 tiles, the money, east of Lowtown across the bay.
// Cathedral Hill along the north, the Strip either side of Loop Avenue through the middle, Marina Heights above the sea
// along the south; the bay down the west edge (Lowtown beyond it) and the open sea on the east and the south. Loop
// Avenue comes in over the bay from Lowtown on the Loop Causeway and runs east through the Strip; Heights Avenue runs
// north to south from the hill to the marina. The streets are one-way, as Lowtown's: Summit Road, Bluewater Drive,
// Marina Drive and Bayshore Drive make a clockwise ring, and the streets inside it alternate.
// Landmarks are in landmarks.js, the neighbourhoods' looks in styles.js, what is parked where in fleet.js.
import { def } from '../../../motor/index.js';
import { STYLES, HOODS } from './styles.js';

const NS = (at, from, to, kind = 'street', name = '', oneway) => ({ axis: 'y', at, from, to, kind, name, oneway });
const EW = (at, from, to, kind = 'street', name = '', oneway) => ({ axis: 'x', at, from, to, kind, name, oneway });
const EMBANKMENT = { h: 32, top: '#5a7a5a', side: '#b8b4aa', face: 'stone', roof: 'grass' };

def('districts', 'glass-heights', {
  name: 'Glass Heights', size: [128, 112], seed: 2031, storey: 24, career: true,
  beyond: '#163a62',   // (the open sea past its edges: TOP's ground beyond the map, X7)
  hoods: HOODS, styles: STYLES,
  hoodMap: [[0, 0, 127, 31, 'hill'], [0, 32, 127, 78, 'strip'], [0, 79, 127, 111, 'marina']],
  water: [{ rect: [0, 0, 7, 111], kind: 'sea' }, { rect: [122, 0, 127, 111], kind: 'sea' }, { rect: [8, 105, 121, 111], kind: 'sea' }],
  roads: [
    NS(12, 2, 102, 'street', 'Bayshore Drive', 'N'), NS(38, 2, 102, 'street', 'Velvet Row', 'S'), NS(64, 2, 102, 'avenue', 'Heights Avenue'),
    NS(92, 2, 102, 'street', 'Chapel Hill Road', 'N'), NS(117, 2, 102, 'street', 'Bluewater Drive', 'S'),
    EW(6, 8, 119, 'street', 'Summit Road', 'E'), EW(30, 8, 119, 'street', 'Observatory Lane', 'W'), EW(56, 0, 119, 'avenue', 'Loop Avenue'),
    EW(80, 8, 119, 'street', 'Casino Row', 'E'), EW(100, 8, 119, 'street', 'Marina Drive', 'W'),
  ],
  walls: [{ rect: [8, 0, 121, 1], type: EMBANKMENT }],
  props: { lampEvery: 6, clutter: .2 },
  // the signs the Heights put up on lots with no landmark of their own
  shopNames: ['MAISON LUXE', 'THE GILDED LILY', 'CARAT & CO.', 'BELLEVUE SPA', 'CHEZ VELOUR', 'SUNSET BOUTIQUE', 'THE OYSTER BAR', 'GOLD LEAF GALLERY', 'PLATINUM MOTORS', 'CAFE RIVIERA', 'THE MARBLE ROOM', 'YACHT & SAIL', 'HIGH ROLLER CIGARS', 'PEARL PAWN', 'SILK ROAD TAILORS', 'CHAMPAGNE BAR'],
  billboards: ['LIVE RICH', 'THE VELVET CASINO: FEEL LUCKY', 'GLASS TOWER: LEASING NOW', 'YACHT CLUB REGATTA', 'ZAPPO COLA: NOW IN GOLD', 'HEIGHTS REALTY', 'YOU DESERVE THIS', 'ST. CHROME\'S: ALL WELCOME'],
  // the Loop Causeway (EXPANSION.md 2.1): Loop Avenue in over the bay from Lowtown, its gate the first two columns at
  // the map's edge; one comes in from Lowtown eastbound, on the Causeway
  crossings: [{ id: 'causeway-west', label: 'The Loop Causeway: to Lowtown', to: 'lowtown', via: 'causeway', gate: [0, 50, 1, 62], dir: 'W', arrive: [4, 58] }],
  pickups: [
    { kind: 'health', amount: 50, at: [80, 84], respawn: 60 }, { kind: 'health', amount: 50, at: [30, 26], respawn: 60 },
    { kind: 'armor', amount: 50, at: [104, 50], respawn: 90 }, { kind: 'armor', amount: 50, at: [24, 96], respawn: 90 },
    { kind: 'weapon', item: 'snub38', amount: 24, at: [56, 26], respawn: 120 }, { kind: 'weapon', item: 'buzzsaw', amount: 60, at: [110, 76], respawn: 180 },
    { kind: 'ammo', item: 'snub38', amount: 24, at: [20, 50], respawn: 60 }, { kind: 'cash', amount: 150, at: [72, 74], respawn: 300 },
    { kind: 'bribe', at: [44, 84], respawn: 120 }, { kind: 'bribe', at: [100, 26], respawn: 120 }, { kind: 'bribe', at: [70, 96], respawn: 120 },
  ],
  tour: [[38, 30], [92, 30], [92, 80], [38, 80]],
  zones: [
    { kind: 'patrol', rect: [8, 0, 127, 31], name: 'Hill beat' }, { kind: 'patrol', rect: [8, 32, 127, 78], name: 'Strip beat' }, { kind: 'patrol', rect: [8, 79, 127, 104], name: 'Marina beat' },
    { kind: 'noSpawn', rect: [0, 0, 7, 111] }, { kind: 'noSpawn', rect: [122, 0, 127, 111] }, { kind: 'noSpawn', rect: [8, 105, 121, 111] }, { kind: 'noSpawn', rect: [8, 50, 11, 62] },   // (the water; the Causeway's end)
  ],
});
