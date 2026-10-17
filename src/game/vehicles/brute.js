// The Brute (PLAN.md 9.6): a muscle car, broad and low, all bonnet: a scoop, a short cabin set back, twin stripes nose
// to tail, fat rear tyres under flared haunches, a black grille the width of the car, one red bar of tail lamp across
// the back and twin pipes under it. Rear-wheel drive, a big motor and a loose tail (the gangs drive them later).
//   The parts are hand-listed in layers, as the Cortez's are (cortez.js says why): the bumpers and pipes under the
//   body's ends, the body's lower box, the haunches on its sides, its ends again, what sits on them (the lamps' lenses
//   too), the lid over it all, then trim, glass and roof on top, and the lamps' lit parts round the top corners.
import { def } from '../../motor/index.js';

const L = 60, W = 27, H = 19;
const l = L / 2, w = W / 2, cl = L * .36, cx = L * -.13;   // half sizes; the cabin's length and centre (set back)
const z0 = 3, zs = 10, zb = 10.6, gt = H - 1.8;   // the body's underside, where its lid starts, its top; the glass's top
const fx = 19, rx = -18.5, rf = 5.8, rr = 6.6;   // the axles; the front and (fatter) rear tyres' radii
const PAINT = '#e8742a', CHROME = '#c4c8d0', GLASS = '#2e3a48', TYRE = '#141418', STRIPE = '#f2f0e6', BLACK = '#141418', PLATE = '#d4d0c0';
const G0 = cx - cl / 2, G1 = cx + cl / 2, RX0 = G0 + 3, RX1 = G1 - 5, SX0 = 8, SX1 = 20, SZ = zb + 2.4, TX = -l + 1.6;   // the glass's ends, the roof's; the scoop's ends and top; where the tail lamp's top ends

const P = (box, color, role = 'body', more) => (more ? { box, color, role, ...more } : { box, color, role });
/** a box and its mirror across the centre line: y from a to b (0 <= a < b) on the right, -b to -a on the left */
const pair = (x0, a, z1, x1, b, z2, color, role, more) => [P([x0, -b, z1, x1, -a, z2], color, role, more), P([x0, a, z1, x1, b, z2], color, role, more)];
/** the twin stripes over a stretch of the top (x0 to x1) at height z */
const stripes = (x0, x1, z, role = 'trim') => pair(x0, 1.3, z, x1, 3.4, z + .12, STRIPE, role);

const wheels = [], tyres = [];
for (const [x, r, steer, out, inn] of [[fx, rf, true, .5, 3.5], [rx, rr, false, 1.6, 4]]) for (const s of [-1, 1]) {
  tyres.push(P([x - r, s < 0 ? -w - out : w - inn, 0, x + r, s < 0 ? -w + inn : w + out, r * 1.6], TYRE, 'wheel'));
  wheels.push({ x, y: s * (w - 1.5), r, steer });
}

def('vehicleModels', 'brute', {
  name: 'Brute', class: 'car', length: L, width: W, height: H,
  parts: [
    // thin chrome bumpers and the twin pipes under the ends
    P([l - 2.5, -w + .8, 1.2, l + 1.1, w - .8, z0], CHROME, 'bumper'), P([-l - 1.1, -w + .8, 1.2, -l + 2.5, w - .8, z0], CHROME, 'bumper'),
    ...pair(-l - 1.6, 5.4, .9, -l + 2, 7.6, 2.4, '#9a9ea6', 'bumper'),
    P([-l, -w, z0, l, w, zs], PAINT),
    // the haunches over the rear tyres (and a little over the fronts): paint, bulging past the sides
    ...pair(rx - 8.5, w, z0 + 1.2, rx + 8.5, w + 1.3, zs - .3, PAINT), ...pair(fx - 7, w, z0 + 2, fx + 7, w + .5, zs - .6, PAINT),
    // the ends again (thin slabs of paint), and on them the grille and the lamps' lenses in it; the tail lamp's lens
    // across the back, the plate under it
    P([l - .05, -w, z0, l, w, zs], PAINT), P([-l, -w, z0, -l + .05, w, zs], PAINT),
    P([l, -w + 1.2, z0 + 1.4, l + .35, w - 1.2, zs - .4], BLACK, 'bumper'), ...pair(l, 7.4, zb - 3, l + .45, 11.4, zs, '#c8c4b0', 'bumper'),
    P([-l - .35, -w + 1.4, zb - 3.2, -l, w - 1.4, zs], '#8a1a1a', 'bumper'), P([-l - .3, -3.2, 4.2, -l, 3.2, 6.8], PLATE, 'bumper'),
    P([-l, -w, zs, l, w, zb], PAINT),
    // on top: the scoop (paint) with its black mouth; the stripes over the bonnet, the scoop and the boot
    P([SX0, -3.9, zb, SX1, 3.9, SZ], PAINT, 'trim', { paint: true }), P([SX1 - 1.8, -3.3, SZ, SX1, 3.3, SZ + .25], BLACK, 'trim'),
    ...stripes(G1, SX0, zb), ...stripes(SX0, SX1 - 1.8, SZ), ...stripes(SX1, l, zb), ...stripes(TX, G0, zb),
    // the cabin: a short glasshouse, the roof (paint) with the stripes on it
    P([G0, -w + 2.4, zb, G1, w - 2.4, gt], GLASS, 'glass'),
    P([RX0, -w + 2.8, gt, RX1, w - 2.8, H], PAINT, 'cabin', { paint: true }), ...stripes(RX0, RX1, H, 'cabin'),
    // the lamps' lit parts: two square ones in the grille's top corners, the bar across the back
    ...pair(l - 1.3, 7.4, zs, l + .45, 11.4, zb + .15, '#fff4c8', 'light'),
    P([-l - .35, -w + 1.4, zs, TX, w - 1.4, zb + .15], '#8a1a1a', 'tail'),
    ...tyres],
  wheels,
  seats: [{ x: cx + 2, y: -5 }, { x: cx + 2, y: 5 }],
  doors: [{ id: 'fl', x: cx + 3, y: -w - 6, side: -1, seat: 0 }, { id: 'fr', x: cx + 3, y: w + 6, side: 1, seat: 1 }],
  lights: { head: [[l - .5, -9.4, zb - 1.5], [l - .5, 9.4, zb - 1.5]], tail: [[-l + .4, -8.5, zb - 1.5], [-l + .4, 8.5, zb - 1.5]], siren: [] },
  about: 'A two-door muscle car: a big-block under a scooped bonnet, fat tyres at the back, not much in the way of brakes.',
});

def('vehicles', 'brute', {
  name: 'Brute', model: 'brute', class: 'car', role: 'civilian', seats: 2, radio: 'crash', health: 110, horn: 'car',
  palette: ['#e8742a', '#222226', '#8ad02a', '#2a6ae8', '#c41a2a'],
  handling: { mass: 1350, top: 295, accel: 152, brake: 560, grip: 440, drift: .22, steer: .55, drive: 'rwd', wheelbase: 37.5, cg: .46 },
  spec: { t200: 2.0, top: 295, brake200: 45 },
  spawn: { zones: ['harbor', 'brick', 'palm'], weight: 2, timeOfDay: ['day', 'night'] }, price: 0, tags: ['muscle', 'fast'],
  about: 'Loud, fast in a straight line and happiest sideways. The brakes are an afterthought.',
});
