// The Proving Ground's town (PLAN.md 8.23: the `proving` district, 64 x 64), for the zones that need a whole city's
// simulation (the traffic and crowd lab, the wanted sandbox, the mission bench, the stress pad): three avenues each way,
// so nine signalled junctions in a 3 x 3 grid, four blocks of Neon Mile's buildings, and the three doors the play scene
// comes back to (the safehouse to start at, the hospital and the precinct after WRECKED or NABBED). Walled all round.
// Just another districts entry: nothing in MOTOR knows it (the handling ground beside it is another: track.js).
import { def } from '../../../motor/index.js';
import { STYLES, HOODS } from '../lowtown/styles.js';

const NS = (at, name) => ({ axis: 'y', at, from: 2, to: 61, kind: 'avenue', name });
const EW = (at, name) => ({ axis: 'x', at, from: 2, to: 61, kind: 'avenue', name });
const WALL = { h: 32, top: '#4a4a56', side: '#6a6a74', face: 'stone', roof: 'plain' };

def('districts', 'proving', {
  name: 'The Proving Ground', size: [64, 64], seed: 64, storey: 24,
  hoods: { proving: { ...HOODS.neon, name: 'The Proving Ground', gang: null, music: 'neon', rects: [[0, 0, 63, 63]] } }, styles: STYLES,
  hoodMap: [[0, 0, 63, 63, 'proving']],
  roads: [NS(8, 'West Avenue'), NS(31, 'Middle Avenue'), NS(54, 'East Avenue'), EW(8, 'North Avenue'), EW(31, 'Centre Avenue'), EW(54, 'South Avenue')],
  walls: [{ rect: [0, 0, 63, 1], type: WALL }, { rect: [0, 2, 1, 63], type: WALL }, { rect: [61, 2, 63, 63], type: WALL }, { rect: [2, 61, 60, 63], type: WALL }],
  props: { lampEvery: 6, clutter: .3 },
  // the grid's four corners: somewhere to run to (the mission bot's evade drives to the point of interest farthest from
  // the police, and the three doors are all in the middle)
  pois: [['north-west', 10, 10], ['north-east', 52, 10], ['south-west', 10, 52], ['south-east', 52, 52]].map(([id, x, y]) => ({ id: 'corner-' + id, kind: 'landmark', at: [x, y], label: 'The ' + id + ' corner' })),
});

const look = (side, top, o = {}) => ({ side, top, face: 'stone', roof: 'plain', windows: { lit: .5, w: 4 }, ...o });
const L = (id, name, lots, pois) => def('landmarks', id, { district: 'proving', name, lots, pois });
L('proving-safehouse', 'The Proving Ground\'s safehouse', [{ rect: [16, 16, 23, 22], kind: 'building', storeys: 2, look: look('#6a5a7a', '#3a3446', { door: { chance: 1 } }), sign: { text: 'SAFE', color: '#ffe066' } }],
  [{ id: 'safehouse', kind: 'safehouse', at: [19, 25], label: 'The safehouse' }]);
L('proving-clinic', 'The Proving Ground\'s clinic', [{ rect: [39, 16, 46, 22], kind: 'building', storeys: 3, look: look('#d8d8e0', '#8a8a94'), sign: { text: 'CLINIC', color: '#ff5a4a' } }],
  [{ id: 'hospital', kind: 'hospital', at: [42, 25], label: 'The clinic' }]);
L('proving-precinct', 'The Proving Ground\'s precinct', [{ rect: [16, 40, 23, 46], kind: 'building', storeys: 3, look: look('#5a6a8a', '#3a4458'), sign: { text: 'MPD', color: '#5a8aff' } }],
  [{ id: 'precinct', kind: 'police', at: [19, 37], label: 'The precinct' }]);
