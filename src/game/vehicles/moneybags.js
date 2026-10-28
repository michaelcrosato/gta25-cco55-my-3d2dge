// Moneybags (EXPANSION.md 6, X6): the Velvet Syndicate's party yacht, anchored offshore, slow and heavy; Overboard's
// target (GY1). Built as the Bilge Rat is (render/box-model.js's draw order: boxes that touch rather than cross): the
// hull a run of sections nose to tail, each narrower, its keel higher, a plum band low down its sides under a gold
// pinstripe and a black rub rail along the sheer, a teak swim platform at the stern; on the deck the saloon, a tier
// over it (the sky lounge, its aft end open: the helm), each wrapped in a band of dark glass under a gold rail, the
// radar arch and its dome over the lounge; sunpads on the foredeck, loungers on the aft deck. Boarded from the swim
// platform (a door aft): whoever is aboard is inside, as in a car.
import { def } from '../../motor/index.js';

const L = 120, W = 36, H = 34;   // the collision box
const l = L / 2, w = W / 2;
const ZK = -2, ZD = 10;   // the keel, the main deck
const WHITE = '#f6f4ee', PLUM = '#5a2a5e', GOLD = '#d8b04a', GLASS = '#26303e', TEAK = '#b08a5a', PAD = '#efe4cc', BLACK = '#1c1c22';

const P = (box, color, role = 'body') => ({ box, color, role });
/** a box and its mirror across the centre line: y from a to b (0 <= a < b) on the right, -b to -a on the left */
const pair = (x0, a, z1, x1, b, z2, color, role) => [P([x0, -b, z1, x1, -a, z2], color, role), P([x0, a, z1, x1, b, z2], color, role)];

// the hull's sections, stern to stem: [x0, x1, half width, keel, deck] (each bow step up .4)
const SECTIONS = [[-l, 26, w, ZK, ZD], [26, 40, 14, -1.2, ZD + .4], [40, 50, 9.6, -.4, ZD + .8], [50, 56.4, 5.4, .3, ZD + 1.2], [56.4, l, 2, 1, ZD + 1.6]];   // (the keel no higher than the band's foot)
const band = (z0, z1, color, d) => [...SECTIONS.flatMap(([x0, x1, hw]) => pair(x0, hw, z0, x1, hw + d, z1, color, 'trim')),
  ...SECTIONS.slice(1).flatMap(([x0, , hw], i) => pair(x0, hw + d, z0, x0 + d, SECTIONS[i][2] + d, z1, color, 'trim')),
  P([l, -SECTIONS[4][2] - d, z0, l + d, SECTIONS[4][2] + d, z1], color, 'trim')];
const RAIL = SECTIONS.slice(0, 4).flatMap(([x0, x1, hw, , top]) => pair(x0, hw, top - 1.2, x1, hw + .8, top, BLACK, 'trim'));
// a tier of the superstructure: its box, then the glass band round it and the gold rail along its top, on its faces
const tier = (x0, x1, hw, z0, z1, gz0, gz1) => [P([x0, -hw, z0, x1, hw, z1], WHITE),
  ...pair(x0 + 3, hw, gz0, x1 - 3, hw + .35, gz1, GLASS, 'glass'), P([x1, -hw + 3, gz0, x1 + .35, hw - 3, gz1], GLASS, 'glass'),
  P([x0 - .35, -hw + 4, gz0, x0, hw - 4, gz1], GLASS, 'glass'),
  ...pair(x0, hw, z1 - .7, x1, hw + .35, z1, GOLD, 'trim')];

def('vehicleModels', 'moneybags', {
  name: 'Moneybags', class: 'boat', length: L, width: W, height: H,
  parts: [
    ...SECTIONS.map(([x0, x1, hw, zk, top]) => P([x0, -hw, zk, x1, hw, top], WHITE)),
    ...band(1, 4, PLUM, .4), ...band(4, 4.8, GOLD, .4), ...RAIL,
    // the stern: the band across it, the tail lamps, the swim platform
    P([-l - .4, -w, 1, -l, w, 4], PLUM, 'trim'),
    ...pair(-l - .4, 12, 6, -l, 15, 7.6, '#8a1a1a', 'tail'),
    P([-l - 5, -14, 2, -l - .4, 14, 3.6], TEAK, 'trim'),
    // the saloon on the main deck, the sky lounge over it (its aft end open, the helm there), the radar arch and dome
    ...tier(-38, 20, 14, ZD, 19, 12.4, 17),
    ...tier(-26, 10, 11, 19, 26, 20.6, 24.6),
    P([-32, -3, 19, -30, 3, 22.4], BLACK, 'trim'), P([-30, -2, 22, -29.4, 2, 23.4], '#9aa0aa', 'trim'),
    P([-20, -9, 26, -16, 9, 30], WHITE), P([-19.4, -2, 30, -16.6, 2, 31.6], '#e8e8ec', 'trim'),
    // the foredeck's sunpads, the aft deck's loungers, a gold cleat at the bow, the bow lamp
    P([27, -7, ZD + .4, 38, 7, ZD + 1.4], PAD, 'trim'),
    ...pair(-56, 4, ZD, -46, 11, ZD + 1.6, PAD, 'trim'),
    P([47, -.8, ZD + .8, 49, .8, ZD + 1.4], GOLD, 'trim'),
    P([57, -.8, ZD + 1.6, 58.6, .8, ZD + 2.2], '#fff4c8', 'light')],
  wheels: [],
  seats: [{ x: -31, y: -4 }, { x: -31, y: 4 }],
  doors: [{ id: 'back', x: -l - 10, y: 0, side: 0, seat: 0 }],
  lights: { head: [[l, 0, ZD + 2]], tail: [[-l, -13.5, 6.8], [-l, 13.5, 6.8]], siren: [] },
  about: 'A party yacht: a long white hull with a plum band, a saloon and a sky lounge wrapped in dark glass, a radar arch.',
});

def('vehicles', 'moneybags', {
  name: 'Moneybags', model: 'moneybags', class: 'boat', role: 'special', seats: 2, radio: 'velvet', health: 420, horn: 'boat',
  palette: ['#f6f4ee'],
  handling: { mass: 7000, top: 126, accel: 24, rolling: .04, brake: 60, rudder: 1.1, keel: 4.6 },
  spec: { t100: 8.4, top: 125 },
  price: 0, tags: ['boat', 'yacht', 'velvet'],
  about: 'The Velvet Syndicate\'s party yacht: a floating casino with the music up, and in no hurry.',
});
