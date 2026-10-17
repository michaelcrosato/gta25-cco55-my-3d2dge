// Lowtown, Motopolis (PLAN.md 9.1): 160 x 160 tiles. Palm Terraces (north-west) and Neon Mile (north-east) above the
// Loop's avenue; Brickyard (west) and Harborfront (east) below it, down to the canal and across it to the sea. The L
// runs down the central avenue at z 100; the Loop rings the middle at z 64, with a ramp off each corner and an
// unfinished stub over the construction site (the Loop gap). Three bridges cross the canal; the eastern one draws up.
// Landmarks are in landmarks.js; the neighbourhoods' looks in styles.js.
import { def } from '../../../motor/index.js';
import { STYLES, HOODS } from './styles.js';

const NS = (at, from, to, kind = 'street', name = '') => ({ axis: 'y', at, from, to, kind, name });
const EW = (at, from, to, kind = 'street', name = '') => ({ axis: 'x', at, from, to, kind, name });

def('districts', 'lowtown', {
  name: 'Lowtown', size: [160, 160], seed: 1999, storey: 24,
  hoods: HOODS, styles: STYLES,
  hoodMap: [[0, 0, 79, 76, 'palm'], [80, 0, 159, 76, 'neon'], [0, 77, 79, 159, 'brick'], [80, 77, 159, 159, 'harbor']],
  water: [
    { rect: [0, 152, 159, 159], kind: 'sea' }, { rect: [154, 0, 159, 151], kind: 'sea' },
    { rect: [140, 108, 153, 151], kind: 'harbour' }, { rect: [0, 124, 139, 131], kind: 'canal' },
  ],
  roads: [
    // north to south
    NS(6, 2, 122, 'street', 'Gnome Row'), NS(32, 2, 151, 'street', 'Chapel Street'), NS(56, 2, 122, 'street', 'Palm Walk'),
    NS(80, 2, 151, 'avenue', 'Motor Avenue'), NS(104, 2, 122, 'street', 'Marquee Street'), NS(128, 2, 151, 'street', 'Dock Road'),
    NS(149, 2, 104, 'street', 'Seawall Drive'),
    // west to east
    EW(6, 2, 151, 'street', 'Terrace Road'), EW(30, 2, 151, 'street', 'Sunset Strip'), EW(54, 2, 151, 'street', 'Lantern Lane'),
    EW(78, 2, 153, 'avenue', 'Loop Avenue'), EW(102, 2, 151, 'street', 'Brick Lane'), EW(118, 2, 137, 'street', 'Canal Street'),
    EW(140, 2, 137, 'street', 'Wharf Street'),
  ],
  decks: [
    { id: 'loop', kind: 'road', z: 64, width: 6, lanes: 4, closed: true, path: [[32, 78], [128, 78], [128, 102], [32, 102]], pillarEvery: 4,
      ramps: [{ at: [32, 78], dir: 'W', length: 16 }, { at: [128, 78], dir: 'E', length: 14 }, { at: [32, 102], dir: 'W', length: 16 }, { at: [128, 102], dir: 'E', length: 14 }] },
    { id: 'loop-gap', kind: 'road', z: 64, width: 4, lanes: 2, path: [[29, 91], [16, 91]], pillarEvery: 4, openEnd: true },
    { id: 'L', kind: 'rail', z: 100, width: 3, lanes: 2, path: [[80, 3], [80, 150]], pillarEvery: 4,
      stations: [{ name: 'Palm', rect: [76, 12, 84, 23] }, { name: 'Neon Mile', rect: [76, 38, 84, 49] }, { name: 'Brickyard', rect: [76, 86, 84, 97] }, { name: 'Harbor', rect: [76, 136, 84, 147] }] },
  ],
  walls: [
    // the embankments round the north and west edges, and the west end of Loop Avenue: the closed bridge
    { rect: [0, 0, 159, 1], type: { h: 32, top: '#5a6a4a', side: '#7a7468', face: 'stone', roof: 'grass' } },
    { rect: [0, 2, 1, 151], type: { h: 32, top: '#5a6a4a', side: '#7a7468', face: 'stone', roof: 'grass' } },
  ],
  props: { lampEvery: 6, clutter: .3 },
  // Dock Road's bridge over the canal lifts for the boats (PLAN.md 9.1): its span, sidewalks and all
  drawbridges: [{ id: 'dock', rect: [124, 124, 132, 131], axis: 'y' }],
  // a loop through all four neighbourhoods on the streets, under the Loop twice (perf runs, the attract camera)
  // pickups (PLAN.md 8.12): health by the hospital and the safehouse, armour by the precinct and the marina, and
  // weapons where their kind of trouble lives (Molotovs at the gas station, grenades on the container yard...)
  pickups: [
    { kind: 'health', amount: 50, at: [21, 74], respawn: 60 }, { kind: 'health', amount: 50, at: [24, 50], respawn: 60 },
    { kind: 'armor', amount: 50, at: [94, 74], respawn: 90 }, { kind: 'armor', amount: 50, at: [136, 118], respawn: 90 },
    { kind: 'weapon', item: 'partystarter', amount: 3, at: [44, 20], respawn: 120 }, { kind: 'weapon', item: 'pineapple', amount: 3, at: [112, 100], respawn: 120 },
    { kind: 'weapon', item: 'buzzsaw', amount: 60, at: [30, 100], respawn: 120 }, { kind: 'weapon', item: 'slugger', amount: 1, at: [46, 75], respawn: 120 },
    { kind: 'weapon', item: 'persuader', amount: 12, at: [96, 98], respawn: 150 }, { kind: 'weapon', item: 'hotmess', amount: 100, at: [15, 94], respawn: 180 },
    { kind: 'weapon', item: 'zapomatic', amount: 30, at: [92, 54], respawn: 180 }, { kind: 'weapon', item: 'boomtube', amount: 3, at: [148, 145], respawn: 240 },
    { kind: 'ammo', item: 'snub38', amount: 24, at: [58, 32], respawn: 60 }, { kind: 'cash', amount: 75, at: [82, 80], respawn: 300 },
  ],
  tour: [[32, 30], [128, 30], [128, 118], [32, 118]],
  zones: [
    { kind: 'patrol', rect: [80, 0, 159, 76], name: 'Neon Mile beat' }, { kind: 'patrol', rect: [0, 0, 79, 76], name: 'Palm beat' },
    { kind: 'patrol', rect: [0, 77, 159, 151], name: 'Docks beat' },
    { kind: 'noSpawn', rect: [140, 108, 159, 159] }, { kind: 'noSpawn', rect: [0, 124, 139, 131] },
  ],
});
