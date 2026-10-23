// The district recipe's fixture (docs/CONTENT-GUIDE.md, "A district"), as src/game/districts/millpond/district.js: a
// small district of its own (its size, a neighbourhood, its roads, water, walls and lots, and the three doors the
// play scene needs: the safehouse to start at, a clinic and a precinct after WRECKED or NABBED). Loaded with
// ?dev=1&district=millpond (or the dev menu's GO). tests/recipes/district.test.mjs bundles it in.
import { def } from '../../../motor/index.js';
import { STYLES, HOODS } from '../lowtown/styles.js';

const EW = (at, name) => ({ axis: 'x', at, from: 2, to: 37, kind: 'street', name });
const NS = (at, name) => ({ axis: 'y', at, from: 2, to: 37, kind: 'street', name });
const BANK = { h: 32, top: '#5a6a4a', side: '#7a7468', face: 'stone', roof: 'grass' };
def('districts', 'millpond', {
  name: 'Millpond', size: [40, 40], seed: 40, storey: 24,
  hoods: { millpond: { ...HOODS.palm, name: 'Millpond', gang: null, rects: [[0, 0, 39, 39]] } }, styles: STYLES,
  hoodMap: [[0, 0, 39, 39, 'millpond']],
  roads: [EW(8, 'Weir Street'), EW(30, 'Sluice Street'), NS(8, 'Wheel Row'), NS(30, 'Race Row')],
  water: [{ rect: [15, 15, 23, 23], kind: 'pond' }],
  walls: [{ rect: [0, 0, 39, 1], type: BANK }, { rect: [0, 2, 1, 39], type: BANK }, { rect: [38, 2, 39, 39], type: BANK }, { rect: [2, 38, 37, 39], type: BANK }],
  lots: [{ rect: [13, 13, 25, 25], kind: 'park', surface: 'park' }],
  props: { lampEvery: 6, clutter: .3 },
  pois: [
    { id: 'safehouse', kind: 'safehouse', at: [11, 11], label: 'The mill house' }, { id: 'hospital', kind: 'hospital', at: [27, 27], label: 'The clinic' },
    { id: 'precinct', kind: 'police', at: [11, 27], label: 'The constable' }, { id: 'pond', kind: 'landmark', at: [19, 12], label: 'The millpond' },
  ],
});
