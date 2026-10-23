// The Saint (PLAN.md 9.6): a chrome luxury saloon, long and heavy, the car the Chrome Saints bless and Holy Rollers has
// you steal. A long bonnet with a chrome strip and a mascot, chrome bumpers, side spears and belt lines, a big chrome
// grille between quad lamps, a cream vinyl roof over a formal back window, tail fins with tall lamps, whitewalls.
//   The parts are hand-listed in layers, as the Cortez's are (cortez.js says why): the bumpers under the body's ends,
//   the body's lower box, what sits on its sides, its ends again, what sits on them (the lamps' lenses too), the lid
//   over it all, then trim, glass and roof on top, and the lamps' lit parts round the top corners.
import { def } from '../../motor/index.js';

const L = 66, W = 27, H = 22;
const l = L / 2, w = W / 2, cl = L * .4, cx = L * -.12;   // half sizes; the cabin's length and centre (set back: the long bonnet)
const z0 = 4, zs = 11.6, zb = 12.4, gt = H - 2.2, fin = zb + 2.4;   // the underside, the lid's bottom, the top; the glass's top; the fins' tops
const r = 6.5, fx = 21.5, rx = -21.5;   // the wheels: radius, front and rear axles
const PAINT = '#16161a', CHROME = '#e4e8ef', GLASS = '#34404e', TYRE = '#18181c', WALL = '#e8e6e0', VINYL = '#e2d9c4', DARK = '#33363e', PLATE = '#d4d0c0';
const RX0 = cx - cl / 2 + 2.5, RX1 = cx + cl / 2 - 6;   // the roof's ends: a narrow back window, a broad windscreen

const P = (box, color, role = 'body', more) => (more ? { box, color, role, ...more } : { box, color, role });
/** a box and its mirror across the centre line: y from a to b (0 <= a < b) on the right, -b to -a on the left */
const pair = (x0, a, z1, x1, b, z2, color, role, more) => [P([x0, -b, z1, x1, -a, z2], color, role, more), P([x0, a, z1, x1, b, z2], color, role, more)];

// the tyres, then their whitewalls (wheel parts too, so the front ones steer with them, about the tyre's centre)
const wheels = [], tyres = [], walls = [];
for (const [x, steer] of [[fx, true], [rx, false]]) for (const s of [-1, 1]) {
  const y0 = s < 0 ? -w - .5 : w - 3.8, y1 = s < 0 ? -w + 3.8 : w + .5;
  tyres.push(P([x - r, y0, 0, x + r, y1, r * 1.6], TYRE, 'wheel'));
  walls.push(P([x - r + 1.6, s < 0 ? -w - .65 : w + .5, .9, x + r - 1.6, s < 0 ? -w - .5 : w + .65, 3.7], WALL, 'wheel', { pivot: [x, (y0 + y1) / 2] }));
  wheels.push({ x, y: s * (w - 1.6), r, steer });
}

def('vehicleModels', 'saint', {
  name: 'Saint', class: 'car', length: L, width: W, height: H,
  parts: [
    // chrome bumpers under the ends
    P([l - 3, -w + .3, 1, l + 1.8, w - .3, z0], CHROME, 'bumper'), P([-l - 1.8, -w + .3, 1, -l + 3, w - .3, z0], CHROME, 'bumper'),
    P([-l, -w, z0, l, w, zs], PAINT),
    // on the sides the chrome spears; the ends again (thin slabs of paint: they hide the far spear from a low view along
    // the car); on the ends the grille (a chrome frame, dark slots, three bars), the quad lamps' and the fin lamps'
    // lenses, a chrome band and the plate at the back
    ...pair(-l + 3, w, 7.3, l - 3, w + .3, 8.1, CHROME, 'bumper'),
    P([l - .05, -w, z0, l, w, zs], PAINT), P([-l, -w, z0, -l + .05, w, zs], PAINT),
    P([l, -5.4, 5.2, l + .4, 5.4, zs - .2], CHROME, 'bumper'), P([l, -4.4, 6.1, l + .5, 4.4, zs - 1.1], DARK, 'bumper'),
    ...[-2.4, 0, 2.4].map(y => P([l, y - .35, 6.1, l + .6, y + .35, zs - 1.1], CHROME, 'bumper')),
    ...pair(l, 6.3, zb - 3, l + .35, 9.1, zs, '#c8c4b0', 'bumper'), ...pair(l, 9.7, zb - 3, l + .35, 12.5, zs, '#c8c4b0', 'bumper'),
    ...pair(-l - .35, w - 1.5, zb - 3.4, -l, w, zs, '#8a1a1a', 'bumper'),
    P([-l - .4, -10.2, 9.2, -l, 10.2, 10.4], CHROME, 'bumper'), P([-l - .3, -3.4, 5.4, -l, 3.4, 8.2], PLATE, 'bumper'),
    P([-l, -w, zs, l, w, zb], PAINT),
    // on top: chrome belt lines along the edges, a chrome strip up the bonnet to the mascot, the fins (paint) capped in chrome
    ...pair(-l + 10, w - .7, zb, l - .8, w, zb + .25, CHROME, 'trim'),
    P([cx + cl / 2 + .5, -.45, zb, l - 3.4, .45, zb + .2], CHROME, 'trim'), P([l - 3.4, -.55, zb, l - 2.2, .55, zb + 2], CHROME, 'trim'),
    ...pair(-l, w - 1.5, zb, -l + 10.5, w, fin, PAINT, 'trim', { paint: true }),
    ...pair(-l + 1, w - 1.2, fin, -l + 10.5, w - .3, fin + .25, CHROME, 'trim'),
    // the cabin: glass, the vinyl roof, chrome drip rails along its edges
    P([cx - cl / 2, -w + 2.2, zb, cx + cl / 2, w - 2.2, gt], GLASS, 'glass'),
    P([RX0, -w + 2.6, gt, RX1, w - 2.6, H], VINYL, 'cabin'),
    ...pair(RX0, w - 2.9, H, RX1, w - 2.6, H + .2, CHROME, 'cabin'),
    // the lamps' lit parts: the quads round the front corners, the tall ones up the ends of the fins
    ...pair(l - 1.4, 6.3, zs, l + .35, 9.1, zb + .2, '#fff4c8', 'light'), ...pair(l - 1.4, 9.7, zs, l + .35, 12.5, zb + .2, '#fff4c8', 'light'),
    ...pair(-l - .35, w - 1.5, zs, -l + 1, w, fin + .1, '#8a1a1a', 'tail'),
    ...tyres, ...walls],
  wheels,
  seats: [{ x: cx + 5, y: -5 }, { x: cx + 5, y: 5 }, { x: cx - 7, y: -5 }, { x: cx - 7, y: 5 }],
  doors: [{ id: 'fl', x: cx + 6, y: -w - 6, side: -1, seat: 0 }, { id: 'fr', x: cx + 6, y: w + 6, side: 1, seat: 1 },
    { id: 'rl', x: cx - 6, y: -w - 6, side: -1, seat: 2 }, { id: 'rr', x: cx - 6, y: w + 6, side: 1, seat: 3 }],
  lights: { head: [[l - .5, -9.4, zb - 1.4], [l - .5, 9.4, zb - 1.4]], tail: [[-l + .4, -w + .8, zb], [-l + .4, w - .8, zb]], siren: [] },
  about: 'A chrome-laden luxury saloon: a bonnet like a runway, fins, whitewalls and a ride like a sofa.',
});

def('vehicles', 'saint', {
  name: 'Saint', model: 'saint', class: 'car', role: 'civilian', seats: 4, radio: 'neon', health: 120, horn: 'car',
  palette: ['#16161a', '#ece8de', '#6a1c2a', '#c8a24a', '#a8acb4'],
  handling: { mass: 1700, top: 285, accel: 119, brake: 640, grip: 470, drift: .34, steer: .62, steerRate: 2.8, drive: 'rwd', wheelbase: 43 },   // (.62: it turns inside the city's junction arcs, D17)
  spec: { t200: 2.7, top: 285, brake200: 40 },
  spawn: { zones: ['neon', 'palm'], weight: 2, timeOfDay: ['day', 'night'] }, price: 0, tags: ['luxury', 'saints'],
  about: 'The Chrome Saints\' favourite: long, heavy and blessed. Floats over bumps, wallows in corners, never hurries.',
});
