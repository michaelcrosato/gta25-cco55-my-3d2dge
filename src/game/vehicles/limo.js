// The limousine (EXPANSION.md 6, X6): a stretched sedan, one model in two liveries, the Velvet Syndicate's black (their
// HQ's forecourt, The Comp's) and the Limo job's white (X7). A long body on the builder's sedan, its glasshouse
// stretched back over the passengers (a dark divider across it behind the driver), chrome along the sills, a gold
// pinstripe down each side, the rear doors well back.
import { def, carParts } from '../../motor/index.js';

const L = 76, W = 26, H = 20, wheel = 6.5, cabin = .56, cabinAt = -.08;   // (as long as a van, its turning circle a van's: longer, it had run onto an avenue's median turning in off a street, and stuck in Casino Row's turn onto Bluewater Drive)
const base = carParts({ length: L, width: W, height: H, cabin, cabinAt, wheel, style: 'sedan', roof: '#1c1c22', trim: '#c8ccd4' });
const hl = L / 2, hw = W / 2, body = H * .55, cx = L * cabinAt, cl = L * cabin;
const P = (box, color, role = 'body') => ({ box, color, role });

def('vehicleModels', 'limo', {
  name: 'Limousine', class: 'car', length: L, width: W, height: H, ...base,
  parts: [...base.parts,
    // the divider behind the driver, a dark band across the glass; the chrome sills; the gold pinstripe
    P([cx + cl / 2 - 16, -hw + 2.2, body, cx + cl / 2 - 14.6, hw - 2.2, H - 2], '#1c1c22', 'trim'),
    // (the sills between the wheels, the pinstripe over their tops: neither crosses a wheel's box)
    ...[-1, 1].map(s => P([-hl * .62 + wheel + .5, s < 0 ? -hw - .3 : hw, wheel * .9, hl * .62 - wheel - .5, s < 0 ? -hw : hw + .3, wheel * 1.3], '#c8ccd4', 'trim')),
    ...[-1, 1].map(s => P([-hl + 2, s < 0 ? -hw - .3 : hw, wheel * 1.6, hl - 2, s < 0 ? -hw : hw + .3, Math.min(body, wheel * 1.6 + .7)], '#d8b04a', 'trim'))],
  // the driver up front, the passengers well back (a fare's seats: X7's Limo job)
  seats: [{ x: cx + cl / 2 - 9, y: -5 }, { x: cx + cl / 2 - 9, y: 5 }, { x: cx - cl / 2 + 8, y: -5 }, { x: cx - cl / 2 + 8, y: 5 }],
  doors: [{ id: 'fl', x: cx + cl / 2 - 9, y: -hw - 6, side: -1, seat: 0 }, { id: 'fr', x: cx + cl / 2 - 9, y: hw + 6, side: 1, seat: 1 },
    { id: 'rl', x: cx - cl / 2 + 8, y: -hw - 6, side: -1, seat: 2 }, { id: 'rr', x: cx - cl / 2 + 8, y: hw + 6, side: 1, seat: 3 }],
  about: 'A stretched sedan: a long glasshouse with a divider behind the driver, chrome sills, a pinstripe.',
});

const HANDLING = { mass: 2300, top: 250, accel: 44, brake: 640, grip: 270, drift: .3, steer: .7, steerRate: 2, drive: 'rwd', cgHeight: .3, wheelbase: L * .62 };   // (the model's axles)
def('vehicles', 'velvetlimo', {
  name: 'Velvet Limo', model: 'limo', class: 'car', role: 'gang', seats: 4, radio: 'velvet', health: 150, horn: 'car',
  palette: ['#16141c'],
  handling: HANDLING,
  spec: { t100: 2.5, top: 240, brake200: 71 },
  price: 0, tags: ['limo', 'velvet', 'heavy'],
  about: 'The Velvet Syndicate\'s black limousine: a long ride, tinted, and somebody in the back always owes somebody money.',
});
def('vehicles', 'limo', {
  name: 'Limo', model: 'limo', class: 'car', role: 'service', seats: 4, radio: 'velvet', health: 130, horn: 'car',
  palette: ['#f2f0ea'],
  handling: HANDLING,
  spec: { t100: 2.5, top: 240, brake200: 71 },
  price: 0, tags: ['limo', 'heavy'],
  about: 'A white stretch for hire on the Strip: smooth, slow to turn, and the fare minds every bump.',
});
