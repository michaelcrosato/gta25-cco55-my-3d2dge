// The Proving Ground's handling ground (PLAN.md 8.23's handling zone): a district of its own beside the town (town.js),
// 96 x 64, on one open apron of asphalt:
//   - the slalom (along the north side): five barrels in a line, to weave round one side then the other, that runs on
//     to the kicker: a deck with a ramp up to it and an open end (the car flies off it, as off the Loop's gap);
//   - the skidpad (the south-west corner): a ring of bollards (radius 128) to drive round at 160;
//   - six surface strips side by side, in grip order: dry, wet, grass, sand, oil, ice (SURFACE_GRIP's);
//   - the boat basin, a quay round it;
//   - a street along the south edge with the three doors the play scene needs (the safehouse to start at, the clinic
//     and the precinct after WRECKED or NABBED).
// Nothing in it is MOTOR's: lots, a deck, water and props, as Lowtown is made. The zone (proving/lab-zones.js) reads
// the layout from TRACK.
import { def } from '../../../motor/index.js';
import { STYLES, HOODS } from '../lowtown/styles.js';

const T = 16, WALL = { h: 32, top: '#4a4a56', side: '#6a6a74', face: 'stone', roof: 'plain' };
/** the layout in world units: the skidpad's centre and radius; the slalom's barrels and its line (y); the kicker's ramp
 *  foot, its open end and its height; the strips' surfaces (in grip order), their first row and their x span; the
 *  basin's centre */
export const TRACK = {
  skidpad: { x: 16 * T, y: 40 * T, r: 160, inner: 128 },
  slalom: { y: 12 * T + 8, barrels: [11, 22, 33, 44, 55].map(x => [x * T + 8, 12 * T + 8]) },   // (on the line, 176 apart: round them one side, then the other)
  kicker: { foot: 65 * T, end: 78 * T, z: 16 },
  strips: { surfaces: ['road', 'wet', 'grass', 'sand', 'oil', 'ice'], row: 26, rows: 3, x0: 34 * T, x1: 91 * T },
  basin: { x: 77 * T, y: 48 * T },
};
const S = TRACK.strips, ring = (n, r) => Array.from({ length: n }, (_, k) => [(TRACK.skidpad.x + Math.cos(k * 2 * Math.PI / n) * r) / T, (TRACK.skidpad.y + Math.sin(k * 2 * Math.PI / n) * r) / T]);

def('districts', 'proving-track', {
  name: 'The Proving Ground\'s handling ground', size: [96, 64], seed: 96, storey: 24,
  hoods: { 'proving-track': { ...HOODS.neon, name: 'The handling ground', gang: null, music: 'neon', rects: [[0, 0, 95, 63]] } }, styles: STYLES,
  hoodMap: [[0, 0, 95, 63, 'proving-track']],
  roads: [{ axis: 'x', at: 56, from: 2, to: 93, kind: 'street', name: 'Pit Lane' }],
  water: [{ rect: [64, 45, 90, 50], kind: 'harbour' }],
  decks: [{ id: 'kicker', kind: 'road', z: TRACK.kicker.z, width: 4, lanes: 2, path: [[73, 12], [76, 12]], ramps: [{ at: [73, 12], dir: 'W', length: 6 }], openEnd: true, pillarEvery: 3 }],
  walls: [{ rect: [0, 0, 95, 1], type: WALL }, { rect: [0, 2, 1, 63], type: WALL }, { rect: [94, 2, 95, 63], type: WALL }, { rect: [2, 61, 93, 63], type: WALL }],
  lots: [
    { rect: [2, 2, 93, 51], kind: 'apron', surface: 'road' },   // (first: the strips and the quay paint over it)
    ...S.surfaces.map((surface, k) => ({ rect: [S.x0 / T, S.row + S.rows * k, S.x1 / T - 1, S.row + S.rows * k + S.rows - 1], kind: 'strip', surface })),
    { rect: [62, 44, 92, 44], kind: 'quay', surface: 'quay' }, { rect: [62, 45, 63, 51], kind: 'quay', surface: 'quay' },
    { rect: [91, 45, 92, 51], kind: 'quay', surface: 'quay' }, { rect: [64, 51, 90, 51], kind: 'quay', surface: 'quay' },
  ],
  props: { lampEvery: 6, clutter: 0 },
  propList: [
    ...ring(16, TRACK.skidpad.inner).map(at => ({ kind: 'bollard', at, solid: { hx: 2, hy: 2, top: 6 } })),
    ...TRACK.slalom.barrels.map(([x, y]) => ({ kind: 'barrel', at: [x / T, y / T], color: '#ff7a1a', solid: { hx: 5, hy: 5, top: 9 } })),
    ...[6, 14, 22, 30, 38, 46, 54, 62, 78, 86].map(x => ({ kind: 'lamp', at: [x, 2.6], solid: { hx: 1.5, hy: 1.5, top: 44 }, facing: Math.PI / 2 })),
    ...[27, 33, 39].map(y => ({ kind: 'lamp', at: [31, y], solid: { hx: 1.5, hy: 1.5, top: 44 } })),
  ],
  pois: [
    { id: 'safehouse', kind: 'safehouse', at: [8, 53], label: 'The safehouse' }, { id: 'hospital', kind: 'hospital', at: [40, 53], label: 'The clinic' },
    { id: 'precinct', kind: 'police', at: [86, 53], label: 'The precinct' },
    { id: 'skidpad', kind: 'landmark', at: [16, 28], label: 'The skidpad' }, { id: 'strips', kind: 'landmark', at: [33, 34], label: 'The surface strips' },
    { id: 'slalom', kind: 'landmark', at: [4, 14], label: 'The slalom and the kicker' }, { id: 'basin', kind: 'landmark', at: [61, 47], label: 'The boat basin' },
  ],
});
