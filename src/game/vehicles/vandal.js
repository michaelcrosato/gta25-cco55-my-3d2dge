// The Vandal 600 (PLAN.md 9.6): a faired sport bike, the fastest thing in Lowtown that isn't a Zephyr, the bike Heist 1
// plants by the Loop. A nose fairing with twin lamps and a smoked screen over the front wheel, gold forks, a tank you
// lie on, a short saddle, the tail kicked up in a hump, a can on the right and a fat rear tyre. It wheelies off the line,
// stops hard, and slides its tail round a handbrake turn if you ask it to.
//   The draw order (render/box-model.js, and sparrow.js says more): the core is drawn in role order, then list order;
//   only the outside roles are sorted by depth, by their middles. The middle is core, bottom up: the engine (a 'wheel'
//   part, drawn first), the side fairings on it, the tank on them. Everything else is outside parts: the front end (the
//   wheel, the forks, the nose, its screen and lamps), and the back (the wheel, the swingarm, the can, the saddle and
//   the hump). An outside part sitting on another sorts over it only if the two share a middle, so the saddle and the
//   hump each sit on a base of their own length.
import { def } from '../../motor/index.js';

const L = 32, W = 8, H = 15;
const r = 4.8, fx = 11, rx = -11;   // the wheels' radius; the front and rear axles (the handling's wheelbase, 22)
const PAINT = '#84d22a', TYRE = '#18181c', DISC = '#a8acb4', SEAT = '#1e1e24', GOLD = '#d0a838', SCREEN = '#2c3642', STEEL = '#b8bcc4', ENGINE = '#3c3c44', ARM = '#4a4a54', PLATE = '#d4d0c0';

const P = (box, color, role = 'body', more) => (more ? { box, color, role, ...more } : { box, color, role });
/** an outside part in the paint */
const T = box => P(box, PAINT, 'trim', { paint: true });
/** a box and its mirror across the centre line: y from a to b (0 <= a < b) on the right, -b to -a on the left */
const pair = (x0, a, z1, x1, b, z2, color, role, more) => [P([x0, -b, z1, x1, -a, z2], color, role, more), P([x0, a, z1, x1, b, z2], color, role, more)];
/** a tyre at x, tw half wide: two boxes crossed (rounder from the side); split (fore and aft of the axle) for the rear
 *  one, so the swingarm beside its front half sorts over it from behind */
const tyre = (x, tw, role, split) => (split ? [[x - r * .55, x], [x, x + r * .55]] : [[x - r * .55, x + r * .55]]).map(([a, b]) => P([a, -tw, 0, b, tw, 2 * r], TYRE, role))
  .concat((split ? [[x - r, x], [x, x + r]] : [[x - r, x + r]]).map(([a, b]) => P([a, -tw, r * .42, b, tw, r * 1.58], TYRE, role)));

def('vehicleModels', 'vandal', {
  name: 'Vandal 600', class: 'bike', length: L, width: W, height: H,
  parts: [
    // the middle, bottom up: the engine (drawn first: a 'wheel' part), the side fairings on it, the tank on them
    P([-2.6, -2.6, 2, 5.6, 2.6, 5.6], ENGINE, 'wheel'),
    P([-3.2, -3.3, 5.6, 6.4, 3.3, 10.4], PAINT),
    P([-3.6, -2.7, 10.4, 4.4, 2.7, 12.2], PAINT),
    // the front: the wheel and its discs, the gold forks either side of it, the mudguard, the nose (in two: the forks
    // stand under its front half, and the screen sits on that half, sharing its middle) with its twin lamps, the
    // mirrors and the clip-on bars behind it
    ...tyre(fx, 1.4, 'trim'),
    ...pair(fx - r * .4, 1.4, r * .6, fx + r * .4, 1.6, r * 1.4, DISC, 'trim'),
    ...pair(fx - .7, 1.6, 2, fx + .7, 2.3, 7.6, GOLD, 'trim'), ...pair(10.2, 1.6, 7.6, 11.4, 2.3, 10.4, GOLD, 'trim'),
    T([8.4, -1.6, 9.6, 14.4, 1.6, 10.2]),
    T([6.4, -3, 10.4, 10.2, 3, 13.2]), T([10.2, -3, 10.4, 13.4, 3, 13.2]),
    ...pair(13.4, .5, 11, 13.8, 2.4, 12.2, '#fff4c8', 'light'),
    P([10.4, -2.2, 13.2, 13.2, 2.2, 14.8], SCREEN, 'trim'),
    ...pair(8.6, 3, 12.4, 9.6, 4.2, 13.2, SEAT, 'trim'),
    ...pair(5.4, 1.4, 11.8, 6.4, 3.4, 12.4, SEAT, 'trim'),
    // the back: the wheel, the swingarm beside it and on to the engine, the can on the right; the saddle and the hump,
    // each on a base of its own length (so each sorts over its base from either end), the tail's tip, its lamp, the plate
    ...tyre(rx, 1.9, 'trim', true),
    ...pair(-11.4, 2.1, 3.4, -6.2, 3, 5.4, ARM, 'trim'), ...pair(-6.2, 1.9, 3.8, -2.8, 2.6, 5.2, ARM, 'trim'),
    P([-12.6, 2.9, 5.4, -6, 4, 7.4], STEEL, 'trim'), P([-13.2, 3, 5.7, -12.6, 3.9, 7.1], SEAT, 'trim'),
    P([-9.6, -1.8, 9.7, -3.6, 1.8, 10.4], SEAT, 'trim'), P([-9.6, -2.2, 10.4, -3.6, 2.2, 11.8], SEAT, 'trim'),
    T([-14.4, -2.2, 9.8, -9.6, 2.2, 10.4]), T([-14.4, -2.1, 10.4, -9.6, 2.1, 12.4]),
    T([-16, -1.4, 10.6, -14.4, 1.4, 12.2]),
    P([-16.3, -1.1, 10.9, -16, 1.1, 11.9], '#8a1a1a', 'tail'),
    P([-16.2, -1.2, 9.8, -15.9, 1.2, 10.6], PLATE, 'trim'),
  ],
  wheels: [{ x: fx, y: 0, r, steer: true }, { x: rx, y: 0, r, steer: false }],
  seats: [{ x: -6.6, y: 0, z: 8.2 }],   // (z: the rider up on the saddle, whose top is 11.8)
  // (side 0: a bike has no door, and a door with a side is drawn swinging open while its rider gets off)
  doors: [{ id: 'l', x: -5, y: -10, side: 0, seat: 0 }, { id: 'r', x: -5, y: 10, side: 0, seat: 0 }],
  lights: { head: [[13.4, -1.4, 11.6], [13.4, 1.4, 11.6]], tail: [[-16, 0, 11.4]], siren: [] },
  about: 'A faired 600 sport bike: a nose with twin lamps, a smoked screen, gold forks, a tail hump and a fat rear tyre.',
});

def('vehicles', 'vandal', {
  name: 'Vandal 600', model: 'vandal', class: 'bike', role: 'civilian', seats: 1, radio: 'off', health: 70, horn: 'bike',
  palette: ['#84d22a', '#d42a2a', '#1c1c22', '#ececf0', '#2a5ad0'],
  // (the model's axles; the rider's weight back and a grippy locked rear, so its handbrake slide at speed stays catchable)
  handling: { mass: 220, top: 320, accel: 140, brake: 700, grip: 475, drift: .82, steer: .45, steerRate: 4, drive: 'rwd', wheelbase: 22, cg: .62, reverseTop: 30, gears: 6 },
  spec: { t200: 2.0, top: 320, brake200: 40 },
  spawn: { zones: ['neon', 'brick'], weight: .5, timeOfDay: ['day', 'night'] }, price: 6000, tags: ['sport', 'bike', 'fast', 'rare'],
  about: 'A 600 sport bike: it wheelies off the line, tops 320 and stops like a car, and it throws you off in a crash.',
});
