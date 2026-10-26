// The Zephyr GT (PLAN.md 9.6): the Chrome Saints' sports coupe, the car Heist 1 steals from their showroom. Low and wide
// on big wheels: a long low nose, a short glass canopy on a raised waist, a slatted engine deck and a wing on the tail.
// All-wheel drive and sticky tyres: the quickest car off the line and the shortest stop in the slice.
import { def, carParts } from '../../motor/index.js';

const L = 56, W = 28, H = 17, wheel = 7, cabin = .3, cabinAt = -.06;
const base = carParts({ length: L, width: W, height: H, cabin, cabinAt, wheel, style: 'coupe', trim: '#24242a' });
const hl = L / 2, hw = W / 2, hood = H * .55;   // (the builder's body top: the hood's height)
const nose = hood - 1.75, waist = hood + 1.3, g0 = -11.5, g1 = 3.5;   // the low nose, the raised waist the canopy sits on, the canopy's ends
const fx = hl * .62, PAINT = '#d01c1c', DARK = '#1c1c22', GLASS = '#3a4a5a';
const P = (box, color, role = 'body') => ({ box, color, role });
// The renderer paints boxes in role order, not by depth, so the body is built up in layers, each on top of and inside
// the one below (a layer beside another would show its hidden face). From the builder: the lamps (made slim: a wide
// slit each side ahead, a long strip each side behind), the bumpers (cut down to a splitter and a diffuser), the wheels
// (their tops kept under the nose, the tyres a little proud of the flanks) and the coupe's spoiler, raised on struts
// into a wing.
const kept = base.parts.filter(p => p.role !== 'body' && p.role !== 'glass' && p.role !== 'cabin').map(p => {
  const [x0, y0, z0, x1, y1, z1] = p.box, left = y0 < 0;
  if (p.role === 'light') return { ...p, box: [x0, left ? y0 - .5 : y0, nose - 2.2, x1, left ? y1 : y1 + .5, nose - .4] };
  if (p.role === 'tail') return { ...p, box: [x0, left ? y0 - .5 : 5, nose - 2.2, x1, left ? -5 : y1 + .5, nose - .4] };
  if (p.role === 'bumper') return { ...p, box: [x0, y0, z0, x1, y1, Math.min(z1, nose - 2.6)] };
  if (p.role === 'wheel') return { ...p, box: [x0, left ? y0 - .5 : y0, z0, x1, left ? y1 : y1 + .5, Math.min(z1, nose - .3)] };
  if (p.role === 'trim' && x0 === -hl) return { ...p, box: [x0, y0, waist + 2.2, x1 + .5, y1, waist + 3.4] };   // (the spoiler, raised)
  return p;
});
def('vehicleModels', 'zephyr', {
  name: 'Zephyr GT', class: 'car', length: L, width: W, height: H, ...base,
  parts: [
    P([-hl, -hw, wheel * .5, hl, hw, nose], PAINT),   // the low body, nose to tail
    P([-hl + .5, -hw, nose, hl - 7, hw, hood], PAINT),   // the hood and flanks (the nose stays low ahead of them)
    ...[-1, 1].map(s => P([fx - 7.5, s < 0 ? -hw : hw - 4, hood, hl - 7, s < 0 ? -hw + 4 : hw, hood + .9], PAINT)),   // the front wings, over the wheels
    P([-hl + 2, -hw + 2, hood, g1 + 1, hw - 2, waist], PAINT),   // the raised waist and engine deck
    ...kept,
    P([hl - 6.5, -hw + 4, nose, hl - 1.5, hw - 4, nose + .3], DARK, 'trim'),   // the intake across the nose
    P([-hl + 2, -8.5, waist, -hl + 3.5, -7, waist + 2.2], DARK, 'trim'), P([-hl + 2, 7, waist, -hl + 3.5, 8.5, waist + 2.2], DARK, 'trim'),   // the wing's struts
    ...[-22, -19, -16].map(x => P([x, -7.5, waist, x + 1.4, 7.5, waist + .35], DARK, 'trim')),   // the engine deck's slats
    // a short glass canopy, narrower than the body (wide shoulders round it), and a dark roof panel
    P([g0, -hw + 4, waist, g1, hw - 4, H - 1.8], GLASS, 'glass'),
    P([g0 + 3, -hw + 4.6, H - 1.8, g1 - 4, hw - 4.6, H], DARK, 'cabin'),
  ],
  // two seats under the canopy and a long door each side (the builder's are a four-door's)
  seats: [{ x: -4, y: -5 }, { x: -4, y: 5 }],
  doors: [{ id: 'fl', x: -2, y: -hw - 6, side: -1, seat: 0 }, { id: 'fr', x: -2, y: hw + 6, side: 1, seat: 1 }],
  lights: { head: [[hl - 1, -10, nose - 1.3], [hl - 1, 10, nose - 1.3]], tail: [[-hl + 1, -9, nose - 1.3], [-hl + 1, 9, nose - 1.3]], siren: [] },
  about: 'A two-seat sports coupe: a short glass canopy, a wing on the tail, big wheels, all-wheel drive.',
});

def('vehicles', 'zephyr', {
  name: 'Zephyr GT', model: 'zephyr', class: 'car', role: 'civilian', seats: 2, radio: 'neon', health: 95, horn: 'car',
  palette: ['#d01c1c', '#f0c020', '#ececf0', '#2a5ab0', '#18181c'],
  handling: { mass: 1150, top: 340, accel: 165, brake: 900, grip: 560, drift: .34, steer: .58, drive: 'awd', cgHeight: .2, wheelbase: L * .62 },   // (the model's axles)
  spec: { t200: 1.6, top: 340, brake200: 34 },
  spawn: { zones: ['neon', 'palm', 'strip', 'hill', 'marina'], weight: 1, timeOfDay: ['day', 'night'] }, price: 9000, tags: ['sports', 'fast', 'rare'],
  about: 'The Saints\' showroom coupe: the fastest thing on four wheels in Lowtown, and it stops like it hit a wall.',
});
