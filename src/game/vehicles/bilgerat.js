// The Bilge Rat (PLAN.md 9.6): Lowtown's cheap speedboat, the Harbor Rats' runabout, moored in the marina's slip. A
// fibreglass hull with a pointed bow (stepped in, its keel raked up toward the stem, its deck rising a little), a red
// stripe round it and a black rub rail along the sides, an open cockpit (a dark floor) behind a raked wrap-round
// windscreen with two cream bucket seats, a wheel and a red fuel can, and an outboard motor hung on the transom.
//   The parts are listed by hand (boatParts was the start) for the renderer's draw order (render/box-model.js
//   partOrder): two boxes that a plane between them separates are drawn far one first, in every view, while boxes that
//   overlap fall back to their roles' order and the list's. So every box touches its neighbours rather than crossing
//   them: the hull is a run of sections nose to tail, each narrower, its keel higher; the cockpit's deck (the aft deck,
//   the gunwales, the foredeck) stands on the main section's lower box (the one overlap: a stacked block dips .4 into
//   the one below, listed after it, so no seam shows; the camera is always above); the stripes, rails, lamps and
//   fittings sit on the faces they show on; the outboard is a stack of slices hung off a bracket.
//   The order must also have no cycles (a cycle is broken somewhere, and that pair is drawn wrong), in the exactly
//   axis-aligned views too (MODE 7 on a boat moored at a cardinal heading), where boxes apart along the unseen axis are
//   still ordered by height. Hence: nothing runs the full width across an end (no rail across the transom), the
//   stripe's band shares the cockpit floor's height, the dash stands from the floor to the deck, and the bow's deck
//   steps up only .2 a section (so the rails' bands overlap).
import { def } from '../../motor/index.js';

const L = 56, W = 22, H = 12;   // the collision box
const l = L / 2, w = W / 2;
const ZK = -1.2, ZF = 3.6, ZD = 7.2;   // the keel (a little under the waterline), the cockpit's floor, the deck
const XA = -21, XW = -1;   // the cockpit's ends: the aft deck's front edge, the foredeck's back edge (the windscreen)
const IN = 8;   // the cockpit's half width (the gunwales are 3 thick)
const PAINT = '#ecece8', RED = '#c8282a', RUB = '#26262c', FLOOR = '#4c5058', SEAT = '#e2d6ba', GLASS = '#466274',
  BLACK = '#1c1c22', DARK = '#3c3e44', CHROME = '#c8ccd4';

const P = (box, color, role = 'body', more) => (more ? { box, color, role, ...more } : { box, color, role });
/** a box and its mirror across the centre line: y from a to b (0 <= a < b) on the right, -b to -a on the left */
const pair = (x0, a, z1, x1, b, z2, color, role, more) => [P([x0, -b, z1, x1, -a, z2], color, role, more), P([x0, a, z1, x1, b, z2], color, role, more)];

// the bow's sections, aft to the stem: [x0, x1, half width, keel, deck]
const BOW = [[8, 15, 9, -.8, 7.4], [15, 21, 6.6, 0, 7.6], [21, 25.2, 4, .9, 7.8], [25.2, l, 1.8, 2, 8]];
const SECTIONS = [[-l, 8, w, ZK, ZD], ...BOW];
// down each section's sides: the red stripe low, the black rub rail along the sheer (it outlines the hull from above)
const ZS0 = 2.6, ZS1 = 3.8;   // the stripe's band (it shares the cockpit floor's height: see the draw order above)
const STRIPE = [...SECTIONS.flatMap(([x0, x1, hw]) => pair(x0, hw, ZS0, x1, hw + .35, ZS1, RED, 'trim')),
  // (and round each step of the bow, and across the stem)
  ...BOW.flatMap(([x0, , hw], i) => pair(x0, hw + .35, ZS0, x0 + .35, SECTIONS[i][2] + .35, ZS1, RED, 'trim')),
  P([l, -BOW[3][2] - .35, ZS0, l + .35, BOW[3][2] + .35, ZS1], RED, 'trim')];
const RAIL = SECTIONS.slice(0, 4).flatMap(([x0, x1, hw, , top]) => pair(x0, hw, top - .8, x1, hw + .7, top, RUB, 'trim'));

def('vehicleModels', 'bilgerat', {
  name: 'Bilge Rat', class: 'boat', length: L, width: W, height: H,
  parts: [
    // the hull: the main section's lower box (keel to the cockpit's floor), the deck standing on it round the open
    // cockpit, the cockpit's dark floor, then the bow's sections
    P([-l, -w, ZK, 8, w, ZF], PAINT),
    P([-l, -w, ZF - .4, XA, w, ZD], PAINT), ...pair(XA, IN, ZF - .4, XW, w, ZD, PAINT), P([XW, -w, ZF - .4, 8, w, ZD], PAINT),
    P([XA, -IN, ZF, XW - 1.6, IN, ZF + .2], FLOOR, 'trim'),
    ...BOW.map(([x0, x1, hw, zk, top]) => P([x0, -hw, zk, x1, hw, top], PAINT)),
    // on the sides the stripe and the rail; across the transom the stripe again and the tail lamps
    ...STRIPE, ...RAIL,
    P([-l - .35, -w, ZS0, -l, w, ZS1], RED, 'trim'),
    ...pair(-l - .35, 7.8, 4.4, -l, 9.6, 5.8, '#8a1a1a', 'tail'),
    // on the bow: the foredeck's hatch, the running lights (red to port, green to starboard), a cleat, the bow lamp
    P([1.6, -3.4, ZD, 6.4, 3.4, ZD + .3], '#c4c8cc', 'trim'),
    P([17.4, -6.3, BOW[1][4], 18.6, -5.3, BOW[1][4] + .5], '#d8302c', 'trim'), P([17.4, 5.3, BOW[1][4], 18.6, 6.3, BOW[1][4] + .5], '#2ec860', 'trim'),
    P([22.2, -.5, BOW[2][4], 23.4, .5, BOW[2][4] + .4], CHROME, 'trim'),
    P([26.4, -.8, BOW[3][4], 27.8, .8, BOW[3][4] + .5], '#fff4c8', 'light'),
    // the cockpit: the dash against the foredeck with the wheel on it (the driver sits to port), the two bucket seats,
    // a red fuel can in the back corner; the windscreen on the foredeck's edge, its wings on the gunwales, its rail
    P([XW - 1.6, -IN + .4, ZF, XW, IN - .4, ZD], PAINT),
    P([XW - 2.4, -5.6, 6.2, XW - 1.6, -3, 8.6], BLACK, 'trim'),
    ...pair(-9, 1.6, ZF + .2, -3.6, 6.8, 6, SEAT, 'trim'), ...pair(-10.6, 1.6, ZF + .2, -9, 6.8, 10.6, SEAT, 'trim'),
    P([XA + .6, 3.6, ZF + .2, XA + 3.4, 6.8, 6.8], '#c42a22', 'trim'), P([XA + 1.4, 4.6, 6.8, XA + 2.4, 5.6, 7.4], BLACK, 'trim'),
    // (the windscreen raked back in two panes, the upper one set aft of the lower, as wide as the cockpit; the wings
    // stand on the gunwales)
    P([XW - .4, -IN, ZD, XW + .8, IN, 9.6], GLASS, 'glass'), P([XW - 1.4, -IN, 9.6, XW - .2, IN, 11.6], GLASS, 'glass'),
    ...pair(XW - 3.6, IN + .2, ZD, XW - .4, IN + .8, 9.6, GLASS, 'glass'),
    P([XW - 1.5, -IN, 11.6, XW - .1, IN, 11.95], BLACK, 'trim'),
    // the outboard: a bracket on the transom, the cowling (black, a red band round it, a grey cap) on its leg
    P([-l - 1.6, -1.8, 4, -l, 1.8, ZD - .8], DARK, 'trim'),
    P([-l - 4.4, -.9, -1.6, -l - 2.6, .9, 5.6], DARK, 'trim'),
    P([-l - 6, -3, 5.6, -l - 1.6, 3, 9.2], BLACK, 'trim'), P([-l - 6, -3, 9.2, -l - 1.6, 3, 9.9], RED, 'trim'),
    P([-l - 6, -3, 9.9, -l - 1.6, 3, 11.6], BLACK, 'trim'), P([-l - 5.6, -2.6, 11.6, -l - 2, 2.6, H], '#2e2e34', 'trim')],
  wheels: [],
  seats: [{ x: -6.2, y: -4.2 }, { x: -6.2, y: 4.2 }],
  doors: [{ id: 'l', x: -6, y: -w - 6, side: -1, seat: 0 }, { id: 'r', x: -6, y: w + 6, side: 1, seat: 1 }],
  lights: { head: [[27.8, 0, 8.6]], tail: [[-l, -8.7, 5.1], [-l, 8.7, 5.1]], siren: [] },
  about: 'A cheap fibreglass runabout: a pointed bow, an open cockpit for two and a big outboard hung on the back.',
});

def('vehicles', 'bilgerat', {
  name: 'Bilge Rat', model: 'bilgerat', class: 'boat', role: 'civilian', seats: 2, radio: 'crash', health: 90, horn: 'boat',
  palette: ['#ecece8', '#e8c030', '#2a9a96'],
  handling: { mass: 800, top: 230, accel: 42.5, rolling: .03, brake: 170, rudder: 2.4, keel: 3.2 },
  spec: { t100: 2.6, top: 230 },
  price: 0, tags: ['boat', 'speedboat', 'harbor-rats'],
  about: 'The Harbor Rats\' speedboat: slow off the mark, then flat out across the harbour with its bow in the air.',
});
