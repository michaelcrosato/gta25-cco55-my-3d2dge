// The Regatta (EXPANSION.md 6, X6): the Yacht Club's speedboat, moored along the Club's pier. Longer and lower than
// the Bilge Rat and built as it is (render/box-model.js's draw order: boxes that touch rather than cross, the hull a
// run of sections nose to tail, each narrower, its keel higher, the cockpit's deck standing on the main section's lower
// box): white, a navy band low down its sides under a gold pinstripe and a navy rub rail along the sheer; an open
// cockpit behind a low tinted windscreen, two white bucket seats and a bench across the back, the Club's pennant on a
// staff at the stern, two outboards hung on the transom.
import { def } from '../../motor/index.js';

const L = 64, W = 20, H = 12;   // the collision box
const l = L / 2, w = W / 2;
const ZK = -1.2, ZF = 3.4, ZD = 6.8;   // the keel, the cockpit's floor, the deck
const XA = -20, XW = 2;   // the cockpit's ends: the aft deck's front edge, the foredeck's back edge (the windscreen)
const IN = 7;   // the cockpit's half width (the gunwales are 3 thick)
const WHITE = '#f4f4f0', NAVY = '#1e2a5c', GOLD = '#d8b04a', FLOOR = '#5a6070', SEAT = '#f0eee6', GLASS = '#2e4254',
  BLACK = '#1c1c22', CHROME = '#c8ccd4';

const P = (box, color, role = 'body') => ({ box, color, role });
/** a box and its mirror across the centre line: y from a to b (0 <= a < b) on the right, -b to -a on the left */
const pair = (x0, a, z1, x1, b, z2, color, role) => [P([x0, -b, z1, x1, -a, z2], color, role), P([x0, a, z1, x1, b, z2], color, role)];

// the bow's sections, aft to the stem: [x0, x1, half width, keel, deck] (each step up .2: the rails' bands overlap)
const BOW = [[10, 18, 7.6, -.5, 7], [18, 25, 5.2, -.1, 7.2], [25, 29.6, 3, .2, 7.4], [29.6, l, 1.2, .4, 7.6]];   // (the keel no higher than the band's foot)
const SECTIONS = [[-l, 10, w, ZK, ZD], ...BOW];
// down each section's sides: the navy band low, the gold pinstripe over it (sharing the cockpit floor's height, as
// the Bilge Rat's stripe does), the rub rail along the sheer; round each step of the bow and across the stem
const band = (z0, z1, color, d) => [...SECTIONS.flatMap(([x0, x1, hw]) => pair(x0, hw, z0, x1, hw + d, z1, color, 'trim')),
  ...BOW.flatMap(([x0, , hw], i) => pair(x0, hw + d, z0, x0 + d, SECTIONS[i][2] + d, z1, color, 'trim')),
  P([l, -BOW[3][2] - d, z0, l + d, BOW[3][2] + d, z1], color, 'trim')];
const BAND = band(.4, 2.8, NAVY, .35), PIN = band(2.8, 3.4, GOLD, .35);
const RAIL = SECTIONS.slice(0, 4).flatMap(([x0, x1, hw, , top]) => pair(x0, hw, top - .8, x1, hw + .7, top, NAVY, 'trim'));

def('vehicleModels', 'regatta', {
  name: 'Regatta', class: 'boat', length: L, width: W, height: H,
  parts: [
    // the hull: the main section's lower box, the deck standing on it round the open cockpit, the cockpit's floor, the
    // bow's sections
    P([-l, -w, ZK, 10, w, ZF], WHITE),
    P([-l, -w, ZF - .4, XA, w, ZD], WHITE), ...pair(XA, IN, ZF - .4, XW, w, ZD, WHITE), P([XW, -w, ZF - .4, 10, w, ZD], WHITE),
    P([XA, -IN, ZF, XW - 1.6, IN, ZF + .2], FLOOR, 'trim'),
    ...BOW.map(([x0, x1, hw, zk, top]) => P([x0, -hw, zk, x1, hw, top], WHITE)),
    ...BAND, ...PIN, ...RAIL,
    // across the transom the band again and the tail lamps
    P([-l - .35, -w, .4, -l, w, 2.8], NAVY, 'trim'),
    ...pair(-l - .35, 7.6, 4, -l, 9.2, 5.2, '#8a1a1a', 'tail'),
    // the foredeck: a hatch, the running lights (red to port, green to starboard), a cleat, the bow lamp
    P([3.6, -3.6, ZD, 8.4, 3.6, ZD + .3], '#c4c8cc', 'trim'),
    P([20.4, -5, BOW[1][4], 21.6, -4, BOW[1][4] + .5], '#d8302c', 'trim'), P([20.4, 4, BOW[1][4], 21.6, 5, BOW[1][4] + .5], '#2ec860', 'trim'),
    P([26.4, -.5, BOW[2][4], 27.6, .5, BOW[2][4] + .4], CHROME, 'trim'),
    P([30, -.6, BOW[3][4], 31.4, .6, BOW[3][4] + .5], '#fff4c8', 'light'),
    // the cockpit: the dash with the wheel (the driver to port), two bucket seats, the bench across the back
    P([XW - 1.6, -IN + .4, ZF, XW, IN - .4, ZD], WHITE),
    P([XW - 2.4, -5, 5.8, XW - 1.6, -2.6, 8.2], BLACK, 'trim'),
    ...pair(-6, 1.4, ZF + .2, -1, 6, 5.6, SEAT, 'trim'), ...pair(-7.6, 1.4, ZF + .2, -6, 6, 9.8, SEAT, 'trim'),
    P([XA, -IN, ZF + .2, XA + 4, IN, 5.8], SEAT, 'trim'), P([XA, -IN, 5.8, XA + 1.6, IN, 9.4], SEAT, 'trim'),
    // (the windscreen low and raked, as wide as the cockpit, its wings on the gunwales, a chrome rail along its top)
    P([XW - .4, -IN, ZD, XW + .8, IN, 8.6], GLASS, 'glass'), P([XW - 1.4, -IN, 8.6, XW - .2, IN, 10.2], GLASS, 'glass'),
    ...pair(XW - 3.2, IN + .2, ZD, XW - .4, IN + .8, 8.6, GLASS, 'glass'),
    P([XW - 1.5, -IN, 10.2, XW - .1, IN, 10.5], CHROME, 'trim'),
    // the Club's pennant on its staff at the stern, to port
    P([-l + 1, -8.6, ZD, -l + 1.6, -8, ZD + 10], CHROME, 'trim'), P([-l + 1.6, -8.45, ZD + 6.6, -l + 5.6, -8.15, ZD + 10], NAVY, 'trim'),
    // the outboards: each a bracket on the transom, its leg, the cowling (white, a navy band, a grey cap)
    ...[-5, 5].flatMap(y => [
      P([-l - 1.6, y - 1.6, 3.6, -l, y + 1.6, ZD - .8], '#3c3e44', 'trim'),
      P([-l - 4.2, y - .8, -1.6, -l - 2.6, y + .8, 5.2], '#3c3e44', 'trim'),
      P([-l - 5.8, y - 2.6, 5.2, -l - 1.6, y + 2.6, 8.6], WHITE, 'trim'), P([-l - 5.8, y - 2.6, 8.6, -l - 1.6, y + 2.6, 9.3], NAVY, 'trim'),
      P([-l - 5.8, y - 2.6, 9.3, -l - 1.6, y + 2.6, 10.8], WHITE, 'trim'), P([-l - 5.4, y - 2.2, 10.8, -l - 2, y + 2.2, H], '#9aa0aa', 'trim')])],
  wheels: [],
  seats: [{ x: -3.6, y: -3.7 }, { x: -3.6, y: 3.7 }],
  doors: [{ id: 'l', x: -4, y: -w - 6, side: -1, seat: 0 }, { id: 'r', x: -4, y: w + 6, side: 1, seat: 1 }],
  lights: { head: [[31.4, 0, 8]], tail: [[-l, -8.4, 4.6], [-l, 8.4, 4.6]], siren: [] },
  about: 'A long, low speedboat: an open cockpit behind a raked windscreen, two outboards, the Club\'s pennant.',
});

def('vehicles', 'regatta', {
  name: 'Regatta', model: 'regatta', class: 'boat', role: 'gang', seats: 2, radio: 'velvet', health: 110, horn: 'boat',
  palette: ['#f4f4f0'],
  handling: { mass: 900, top: 280, accel: 52, rolling: .03, brake: 180, rudder: 2.5, keel: 3.4 },
  spec: { t100: 2.1, top: 280 },
  price: 0, tags: ['boat', 'speedboat', 'yacht-club'],
  about: 'The Yacht Club\'s speedboat: the quickest thing on the water, and it knows it.',
});
