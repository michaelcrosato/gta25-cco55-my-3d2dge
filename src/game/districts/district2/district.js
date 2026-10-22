// District 2 (PLAN.md M12's stub): the block behind Lowtown's closed bridge, loaded only with ?dev=1 (the dev menu's
// GO, or ?dev=1&district=district2). Loop Avenue carries on west from the bridge, which the Gnomes have closed: a
// barricade and a picket at the canal's edge. One block of the Brickyard's warehouses between four streets, and the
// three doors the play scene needs (the safehouse to start at, a clinic and a precinct after WRECKED or NABBED).
// Free roam alone: the career offers nothing outside Lowtown. Nothing in MOTOR knows it: it proves a new district is
// content (the district recipe, docs/CONTENT-GUIDE.md, adds another the same way).
import { def } from '../../../motor/index.js';
import { STYLES, HOODS } from '../lowtown/styles.js';

const EW = (at, from, to, kind, name) => ({ axis: 'x', at, from, to, kind, name });
const NS = (at, from, to, kind, name) => ({ axis: 'y', at, from, to, kind, name });
const EMBANKMENT = { h: 32, top: '#5a6a4a', side: '#7a7468', face: 'stone', roof: 'grass' };
const PARAPET = { h: 8, top: '#8a8478', side: '#6a645a', face: 'stone', roof: 'plain' }, HOARDING = { h: 24, top: '#5a4a3a', side: '#8a6a4a', face: 'plank', roof: 'plain' };

def('districts', 'district2', {
  name: 'District 2', size: [48, 40], seed: 2, storey: 24,
  hoods: { district2: { ...HOODS.brick, name: 'District 2', gang: null, rects: [[0, 0, 47, 39]] } }, styles: STYLES,
  hoodMap: [[0, 0, 47, 39, 'district2']],
  water: [{ rect: [44, 0, 47, 39], kind: 'canal' }],   // (the canal the bridge crosses, on the east: Lowtown beyond it)
  roads: [EW(8, 2, 42, 'avenue', 'Loop Avenue'), EW(31, 2, 42, 'street', 'Strike Street'), NS(6, 2, 37, 'street', 'Picket Row'), NS(38, 2, 37, 'street', 'Bridge Street')],
  walls: [
    { rect: [0, 0, 43, 1], type: EMBANKMENT }, { rect: [0, 2, 1, 39], type: EMBANKMENT }, { rect: [2, 38, 43, 39], type: EMBANKMENT },
    { rect: [43, 2, 43, 3], type: EMBANKMENT }, { rect: [43, 13, 43, 37], type: EMBANKMENT },   // (the canal's bank, open where the bridge leaves it)
    { rect: [44, 4, 46, 4], type: PARAPET }, { rect: [44, 12, 46, 12], type: PARAPET },   // (the bridge's parapets)
    { rect: [47, 4, 47, 12], type: HOARDING },   // (the strikers' hoarding across it, mid-canal: Lowtown beyond)
  ],
  lots: [
    { rect: [43, 4, 47, 12], kind: 'pier', surface: 'road' },   // (the bridge's west span, over the canal to Lowtown: closed)
    { rect: [40, 2, 42, 3], kind: 'building', storeys: 1, look: { side: '#7a5a3a', top: '#3a3a40', face: 'brick', roof: 'plain' }, sign: { text: 'BRIDGE CLOSED: GNOMES ON STRIKE', color: '#ff5a3a', low: true } },
  ],
  props: { lampEvery: 6, clutter: .3 },
  propList: [
    ...[4, 6, 8, 10, 12].map(y => ({ kind: 'barrel', at: [42.5, y + .5], paint: '#d8a020', solid: { hx: 5, hy: 5, top: 9 } })),   // (the barricade across Loop Avenue)
    { kind: 'barrel', at: [41.2, 5.2], paint: '#3a3a40', solid: { hx: 5, hy: 5, top: 9 } }, { kind: 'barrel', at: [41.4, 11.6], paint: '#3a3a40', solid: { hx: 5, hy: 5, top: 9 } },   // (the picket's braziers)
  ],
  pois: [
    { id: 'safehouse', kind: 'safehouse', at: [20, 13], label: 'The safehouse' }, { id: 'hospital', kind: 'hospital', at: [30, 27], label: 'The clinic' },
    { id: 'precinct', kind: 'police', at: [12, 27], label: 'The precinct' }, { id: 'picket', kind: 'landmark', at: [40, 8], label: 'The Gnomes\' picket' },
  ],
});
