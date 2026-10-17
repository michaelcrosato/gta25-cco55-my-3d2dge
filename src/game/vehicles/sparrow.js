// The Sparrow (PLAN.md 9.6): Lowtown's step-through moped, the courier's bike Dex Moreno starts with. A little front
// wheel under a mudguard, a tall leg shield behind it, a flat floor to put your feet on, a bulbous cowl over the engine
// with the saddle on top, a small courier's box on a rack at the back, a round lamp in the handlebar cowl. Light, slow
// and nimble: it turns in its own length and stops on a coin, and it will never outrun anything.
//   The draw order (render/box-model.js): the core (wheel, body, glass, cabin parts) is drawn in role order, then list
//   order, with no depth sort; only the outside roles (bumper, trim, light, tail) are sorted by depth, those beyond the
//   model's middle before the core and the near ones after it. So what sits on top of something is core, after it (the
//   cowl's belly, its top, the saddle); what stands beside the middle at either end is outside (the shield and the front
//   wheel, the handlebar, the box); and what the middle encloses or carries low is a 'wheel' part, drawn first, under
//   everything: the rear tyre inside the cowl, and the floor (in the paint) with its mat and ribs on it. Bikes never
//   steer their wheel parts (vehicle-draw), so a 'wheel' part is just a part drawn first.
import { def } from '../../motor/index.js';

const L = 28, W = 8, H = 14;
const r = 3.8, fx = 9.6, rx = -7.3;   // the wheels' radius; the front and rear axles (16.9 apart: the handling's wheelbase)
const PAINT = '#f2a7c3', TYRE = '#1a1a20', RIM = '#a8a8b0', MAT = '#5c5c64', SEAT = '#2a2a30', CHROME = '#c8ccd4', BOX = '#ece6d6', LID = '#d2cab6', RACK = '#4a4a52';

const P = (box, color, role = 'body', more) => (more ? { box, color, role, ...more } : { box, color, role });
/** an outside part in the paint */
const T = box => P(box, PAINT, 'trim', { paint: true });
/** a box and its mirror across the centre line: y from a to b (0 <= a < b) on the right, -b to -a on the left */
const pair = (x0, a, z1, x1, b, z2, color, role, more) => [P([x0, -b, z1, x1, -a, z2], color, role, more), P([x0, a, z1, x1, b, z2], color, role, more)];
/** a wheel at x, tw half wide, its parts of a role: the tyre as two boxes crossed (rounder from the side), a hub on
 *  either face */
const wheel = (x, tw, role) => [P([x - r * .55, -tw, 0, x + r * .55, tw, 2 * r], TYRE, role), P([x - r, -tw, r * .42, x + r, tw, r * 1.58], TYRE, role),
  ...pair(x - r * .38, tw, r * .62, x + r * .38, tw + .2, r * 1.38, RIM, role)];

def('vehicleModels', 'sparrow', {
  name: 'Sparrow', class: 'bike', length: L, width: W, height: H,
  parts: [
    // drawn first: the rear wheel (inside the cowl), then the floor (in the paint), its rubber mat and the mat's ribs
    ...wheel(rx, 1.5, 'wheel'),
    P([-3.4, -2.9, 2.4, 4.4, 2.9, 3.4], PAINT, 'wheel', { paint: true }),
    P([-3.2, -2.5, 3.4, 4.2, 2.5, 3.6], MAT, 'wheel'),
    ...[-1.6, 0, 1.6].map(y => P([-2.8, y - .35, 3.6, 3.8, y + .35, 3.75], SEAT, 'wheel')),
    // the middle, bottom up: the cowl's belly, its narrower top (it bulges), the saddle
    P([-11.2, -3.6, 4, -3.4, 3.6, 8], PAINT),
    P([-10.9, -3.1, 8, -3.6, 3.1, 9.2], PAINT),
    P([-9.8, -2.6, 9.2, -3.8, 2.6, 10.6], SEAT, 'cabin'),
    // the front: the wheel and its mudguard, the steering column, the leg shield (in two, so its top sorts over the
    // column behind it), the handlebar cowl and its lamp, the bars and their grips
    ...wheel(fx, 1.3, 'trim'),
    T([7.2, -1.7, 2 * r - .5, fx + 3.4, 1.7, 2 * r + .8]),
    P([5.8, -.8, 2 * r - .2, 7.1, .8, 11.6], SEAT, 'trim'),
    T([4.4, -3.4, 2.4, 5.8, 3.4, 7]), T([4.4, -3.6, 7, 5.8, 3.6, 11.6]),
    T([5.4, -2, 11.6, 9.4, 2, 13.4]),
    P([9.4, -1.2, 11.9, 9.8, 1.2, 13.1], '#fff4c8', 'light'),
    ...pair(6.4, 2, 12.3, 7.6, 3.7, 13, CHROME, 'trim'),
    ...pair(6.3, 3.7, 12.2, 7.7, 4.7, 13.1, TYRE, 'trim'),
    // the back, behind the cowl: the rack, the box and its lid, the lamp on the box's back
    P([-14, -2.4, 8.6, -11.2, 2.4, 9], RACK, 'trim'),
    P([-14, -2.8, 9, -11.3, 2.8, 12.3], BOX, 'trim'),
    P([-14.1, -2.9, 12.3, -11.2, 2.9, 12.7], LID, 'trim'),
    P([-14.4, -1.4, 9.8, -14, 1.4, 10.8], '#8a1a1a', 'tail'),
  ],
  wheels: [{ x: fx, y: 0, r, steer: true }, { x: rx, y: 0, r, steer: false }],
  seats: [{ x: -6.8, y: 0 }],
  // (side 0: a bike has no door, and a door with a side is drawn swinging open while its rider gets off)
  doors: [{ id: 'l', x: -5, y: -10, side: 0, seat: 0 }, { id: 'r', x: -5, y: 10, side: 0, seat: 0 }],
  lights: { head: [[9.6, 0, 12.5]], tail: [[-14.2, 0, 10.3]], siren: [] },
  about: 'A step-through moped: a leg shield, a flat floor, a saddle over the engine and a courier\'s box on the back.',
});

def('vehicles', 'sparrow', {
  name: 'Sparrow', model: 'sparrow', class: 'bike', role: 'civilian', seats: 1, radio: 'off', health: 60, horn: 'bike',
  palette: ['#f2a7c3', '#a8e6cf', '#f2e6c8', '#8ccbf0', '#1e1e24'],
  // (the model's axles; the engine and the rider over the rear wheel, so a handbrake pull slides it round instead of
  // spinning it; little rolling loss, as it has little power to spend holding a corner)
  handling: { mass: 140, top: 150, accel: 62, brake: 520, grip: 360, drift: .58, steer: .7, steerRate: 4, drive: 'rwd', wheelbase: 16.9, cg: .66, rolling: .015, reverseTop: 25, gears: 1 },
  spec: { t100: 2.4, top: 150, brake100: 13 },
  // (parked at the curbs where the couriers work: the Brickyard, the docks, the Neon Mile; its own spot is the Gas'n'Sip)
  spawn: { zones: ['brick', 'harbor', 'neon'], weight: 1, timeOfDay: ['day', 'night'] }, price: 0, tags: ['moped', 'bike', 'common'],
  about: 'A pastel step-through moped with a courier\'s box: slow and light, it slips through traffic and turns on a dime.',
});
