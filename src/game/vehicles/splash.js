// The Splash (EXPANSION.md 6, X6): a jet-ski for hire at Glass Heights' marina, quick and light, a passenger behind
// the rider. A short hull stepped in toward the bow (a run of sections nose to tail, each narrower and its keel higher,
// as the Bilge Rat's: boxes that touch rather than cross, for the renderer's draw order), a stripe low down its sides
// and a black rub rail along the sheer; on the deck a long black saddle, the console ahead of it with its handlebars
// and a little visor, the footrests' mats either side of the saddle, the jet's nozzle under the stern.
import { def } from '../../motor/index.js';

const L = 30, W = 12, H = 10;   // the collision box
const l = L / 2, w = W / 2;
const PAINT = '#f2f2ee', STRIPE = '#e84a8a', RUB = '#26262c', BLACK = '#1c1c22', MAT = '#3c3e44', GLASS = '#466274';

const P = (box, color, role = 'body') => ({ box, color, role });
/** a box and its mirror across the centre line: y from a to b (0 <= a < b) on the right, -b to -a on the left */
const pair = (x0, a, z1, x1, b, z2, color, role) => [P([x0, -b, z1, x1, -a, z2], color, role), P([x0, a, z1, x1, b, z2], color, role)];

// the hull's sections, stern to stem: [x0, x1, half width, keel, deck] (each bow step up .2: the rails' bands overlap)
const SECTIONS = [[-l, 5, w, -1, 4.4], [5, 10, 4.6, -.2, 4.6], [10, 13.4, 3, .6, 4.8], [13.4, l, 1.4, 1.4, 5]];
const ZS0 = 1.4, ZS1 = 2.4;   // the stripe's band
const STRIPES = [...SECTIONS.flatMap(([x0, x1, hw]) => pair(x0, hw, ZS0, x1, hw + .35, ZS1, STRIPE, 'trim')),
  ...SECTIONS.slice(1).flatMap(([x0, , hw], i) => pair(x0, hw + .35, ZS0, x0 + .35, SECTIONS[i][2] + .35, ZS1, STRIPE, 'trim')),
  P([l, -SECTIONS[3][2] - .35, ZS0, l + .35, SECTIONS[3][2] + .35, ZS1], STRIPE, 'trim')];
const RAILS = SECTIONS.slice(0, 3).flatMap(([x0, x1, hw, , top]) => pair(x0, hw, top - .7, x1, hw + .5, top, RUB, 'trim'));

def('vehicleModels', 'splash', {
  name: 'Splash', class: 'boat', length: L, width: W, height: H,
  parts: [
    ...SECTIONS.map(([x0, x1, hw, zk, top]) => P([x0, -hw, zk, x1, hw, top], PAINT)),
    ...STRIPES, ...RAILS,
    // the stern: the stripe across it, the tail lamps, the jet's nozzle under it
    P([-l - .35, -w, ZS0, -l, w, ZS1], STRIPE, 'trim'),
    ...pair(-l - .35, 3.4, 3, -l, 4.8, 3.9, '#8a1a1a', 'tail'),
    P([-l - 1.8, -1.3, -.4, -l, 1.3, 1.4], BLACK, 'trim'),
    // the deck: the footrests' mats, the saddle, the console with its visor and handlebars, the bow lamp
    ...pair(-11, 2.4, 4.4, 0, 5.4, 4.7, MAT, 'trim'),
    P([-12, -2.4, 4.4, 0, 2.4, 7.2], BLACK, 'trim'),
    P([0, -3.2, 4.4, 5, 3.2, 7.4], PAINT),
    P([3.4, -2.6, 7.4, 5, 2.6, 9], GLASS, 'glass'),
    P([1, -5.4, 7.4, 2.2, 5.4, 8.4], BLACK, 'trim'),
    P([13.6, -.6, 5, 14.6, .6, 5.4], '#fff4c8', 'light')],
  wheels: [],
  // (both astride the saddle, the passenger behind: z the saddle's top less a seated hip's height, as a bike's rider)
  seats: [{ x: -3.4, y: 0, z: 3.6 }, { x: -9, y: 0, z: 3.6 }],
  doors: [{ id: 'l', x: -5, y: -w - 6, side: -1, seat: 0 }, { id: 'r', x: -5, y: w + 6, side: 1, seat: 1 }],
  lights: { head: [[l, 0, 5.2]], tail: [[-l, -4.1, 3.4], [-l, 4.1, 3.4]], siren: [] },
  about: 'A jet-ski: a short stepped hull, a long saddle for two and handlebars on a console.',
});

def('vehicles', 'splash', {
  name: 'Splash', model: 'splash', class: 'boat', role: 'civilian', seats: 2, radio: 'velvet', health: 60, horn: 'boat',
  palette: ['#f2f2ee', '#ffd23a', '#7af0ff'],
  handling: { mass: 320, top: 250, accel: 70, rolling: .03, brake: 210, rudder: 3.3, keel: 2.6 },
  spec: { t100: 1.6, top: 250 },
  price: 0, tags: ['boat', 'jetski'],
  about: 'A jet-ski for hire at the marina: off the mark like a shot and round a buoy on its own length.',
});
