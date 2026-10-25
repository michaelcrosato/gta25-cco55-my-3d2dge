// Ironside, District 2 (EXPANSION.md 2.2, X1; grown from PLAN.md M12's stub): 128 x 112 tiles, the city's works, west of
// Lowtown across the canal. The Foundry (north-west), Scrapyard Flats (south-west) and Voltage Row (the east half);
// the canal down the east edge (Lowtown beyond it) and the river along the south. Loop Avenue comes over the canal from
// Lowtown on the east bridge and runs west through the middle; Ironside Avenue runs north to south, carried over the
// works on the Flyover (z 64) between Union Street and Crusher Lane. The streets are one-way, as Lowtown's: Smelter
// Street, Canal Street, River Road and Picket Row make a clockwise ring, and the streets inside it alternate.
// Landmarks are in landmarks.js, the neighbourhoods' looks in styles.js, what is parked where in fleet.js.
import { def } from '../../../motor/index.js';
import { STYLES, HOODS } from './styles.js';

const NS = (at, from, to, kind = 'street', name = '', oneway) => ({ axis: 'y', at, from, to, kind, name, oneway });
const EW = (at, from, to, kind = 'street', name = '', oneway) => ({ axis: 'x', at, from, to, kind, name, oneway });
const EMBANKMENT = { h: 32, top: '#4a5040', side: '#6a645a', face: 'stone', roof: 'grass' };

def('districts', 'ironside', {
  name: 'Ironside', size: [128, 112], seed: 2027, storey: 24, career: true,
  hoods: HOODS, styles: STYLES,
  hoodMap: [[0, 0, 63, 56, 'foundry'], [0, 57, 63, 111, 'scrapyard'], [64, 0, 127, 111, 'voltage']],
  water: [{ rect: [122, 0, 127, 111], kind: 'canal' }, { rect: [0, 105, 121, 111], kind: 'canal' }],
  roads: [
    NS(6, 2, 102, 'street', 'Picket Row', 'N'), NS(32, 2, 102, 'street', 'Forge Street', 'S'), NS(64, 2, 102, 'avenue', 'Ironside Avenue'),
    NS(92, 2, 82, 'street', 'Pylon Street', 'N'), NS(117, 2, 102, 'street', 'Canal Street', 'S'),
    EW(6, 2, 119, 'street', 'Smelter Street', 'E'), EW(30, 2, 119, 'street', 'Union Street', 'W'), EW(56, 2, 127, 'avenue', 'Loop Avenue'),
    EW(80, 2, 119, 'street', 'Crusher Lane', 'E'), EW(100, 2, 119, 'street', 'River Road', 'W'),
  ],
  decks: [
    // the Flyover: Ironside Avenue up over the works from Union Street to Crusher Lane, a ramp down each end
    { id: 'flyover', kind: 'road', z: 64, width: 6, lanes: 4, path: [[64, 28], [64, 82]], pillarEvery: 4,
      ramps: [{ at: [64, 28], dir: 'N', length: 14 }, { at: [64, 82], dir: 'S', length: 12 }] },
  ],
  walls: [{ rect: [0, 0, 121, 1], type: EMBANKMENT }, { rect: [0, 2, 1, 104], type: EMBANKMENT }],
  props: { lampEvery: 6, clutter: .3 },
  // the signs the works put up on lots with no landmark of their own (Lowtown's are the builder's own)
  shopNames: ['WELD WORLD', 'SPARKS', 'THE BOLT BAR', 'GREASE PIT DINER', 'RIVET ROOM', 'HARD HAT HABERDASHER', "SOOTY PETE'S", 'UNION CAFE', 'SCRAP & SON', 'CRANK CASE', 'VOLTAGE VIDEO', 'SMELTERS ARMS', 'THE ANVIL', 'NIGHT SHIFT', 'PAWN & PISTON', 'LUNCH BUCKET'],
  billboards: ['BUY IRONSIDE STEEL', 'UNION STRONG', 'POWER TO THE PEOPLE', 'ZAPPO COLA', 'SAFETY FIRST', 'MOTOPOLIS WORKS', 'HIRING: NIGHT SHIFT', 'GET SPARKY!'],
  // the east bridge (EXPANSION.md 2.1): Loop Avenue over the canal to Lowtown, its gate the last two columns at the
  // map's edge; one comes in from Lowtown westbound, on the bridge
  crossings: [{ id: 'east-bridge', label: 'The east bridge: to Lowtown', to: 'lowtown', via: 'west-bridge', gate: [126, 50, 127, 62], dir: 'E', arrive: [123, 54] }],
  pickups: [
    { kind: 'health', amount: 50, at: [24, 26], respawn: 60 }, { kind: 'health', amount: 50, at: [38, 50], respawn: 60 },
    { kind: 'armor', amount: 50, at: [26, 76], respawn: 90 }, { kind: 'armor', amount: 50, at: [86, 50], respawn: 90 },
    { kind: 'weapon', item: 'slugger', amount: 1, at: [56, 26], respawn: 120 }, { kind: 'weapon', item: 'partystarter', amount: 3, at: [30, 96], respawn: 120 },
    { kind: 'weapon', item: 'zapomatic', amount: 30, at: [96, 50], respawn: 180 }, { kind: 'ammo', item: 'snub38', amount: 24, at: [70, 76], respawn: 60 },
    { kind: 'cash', amount: 75, at: [112, 62], respawn: 300 },
    { kind: 'bribe', at: [10, 62], respawn: 120 }, { kind: 'bribe', at: [96, 26], respawn: 120 }, { kind: 'bribe', at: [70, 96], respawn: 120 },
  ],
  tour: [[32, 30], [92, 30], [92, 80], [32, 80]],
  zones: [
    { kind: 'patrol', rect: [0, 0, 63, 56], name: 'Foundry beat' }, { kind: 'patrol', rect: [0, 57, 63, 104], name: 'Scrapyard beat' }, { kind: 'patrol', rect: [64, 0, 121, 104], name: 'Voltage beat' },
    { kind: 'noSpawn', rect: [122, 0, 127, 111] }, { kind: 'noSpawn', rect: [0, 105, 121, 111] }, { kind: 'noSpawn', rect: [118, 50, 121, 62] },   // (the water; the east bridge's end)
  ],
});
