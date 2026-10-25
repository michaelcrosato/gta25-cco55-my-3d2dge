// The Hookline (PLAN.md 9.6): Lowtown's tow truck, Gus Pilchard's ride, and the chassis of the Drill Rig. A heavy
// conventional truck: a long nose (a narrower bonnet between the fenders, a chrome grille, lamps in chrome bezels), a
// square cab, an exhaust stack up its back corner, a low bed behind on twin rear axles. Its hook is at the back, where
// a towed car's end hangs. Two kits: 'tow' (the Hookline: a dark bed floor between low walls, an orange boom rising
// from the bed back over the tail with the hook on its cable, an amber light bar on the cab) and 'flatbed' (the Drill
// Rig: a long flat steel bed carrying a drilling rig: a yellow frame, a lattice mast, the drill bit behind it).
//   The parts are layered for the renderer's draw order (render/box-model.js): the core (wheels, body, glass, cabin)
//   is drawn in role order and list order, and what is fixed on the outside ('bumper', 'trim', 'light', 'tail') is
//   sorted by depth round it. So the body is a stack, each box on the one below: the chassis nose to tail, the fender
//   line, the cab's lower body and the bonnet, then the cab's glass and roof. What a kit stands on the bed is core too
//   (it must be drawn after the bed it stands on): 'glass' parts (painted ones say so), listed before the kit draws the
//   cab's glass and roof again, so that from ahead the cab still hides what stands behind it; the mast's parts above
//   the roof line are 'cabin' parts after that roof, so from behind the cab never cuts them. Outside parts are kept to
//   the faces (the grille, the lamps, the strips) and to what hangs past the ends (the cable and hook, the drill bit).
import { def } from '../../motor/index.js';

const L = 80, W = 30, H = 32;   // the collision box
const l = L / 2, w = W / 2;
const z0 = 7, zb = 13.5, zf = 17, zh = 21, zw = 21.5, zg = 29.5, zr = 31.5;   // the chassis' underside, the bed (its top), the fender line, the bonnet's top, the window line, the glass's top, the roof
const CX0 = 6, CX1 = 22, HW = 11;   // the cab's back and front; the bonnet's half width
const fx = 26, rx1 = -12, rx2 = -28, r = 7.5;   // the axles (a single front, twin rears: the wheelbase to their middle is the handling's, 46) and the tyres' radius
const PAINT = '#f0c020', CHROME = '#c8ccd4', STEEL = '#5a5e66', DARK = '#26262c', BOX = '#3a3c44', GRILLE = '#1c1c22', GLASS = '#33404e',
  TYRE = '#18181c', HUB = '#8e929a', PLATE = '#d4d0c0', HEAD = '#fff4c8', TAIL = '#8a1a1a';
const GLASS_BOX = [CX0 + 1, -w + 1.2, zw, CX1 - .5, w - 1.2, zg], ROOF = [CX0 + 2, -w + 1.7, zg, CX1 - 3.5, w - 1.7, zr];

const P = (box, color, role = 'body', more) => (more ? { box, color, role, ...more } : { box, color, role });
/** a box and its mirror across the centre line: y from a to b (0 <= a < b) on the right, -b to -a on the left */
const pair = (x0, a, z1, x1, b, z2, color, role, more) => [P([x0, -b, z1, x1, -a, z2], color, role, more), P([x0, a, z1, x1, b, z2], color, role, more)];
/** the cab's glass and roof (each kit draws them again after what it stands on the bed) */
const cab = () => [P(GLASS_BOX, GLASS, 'glass'), P(ROOF, PAINT, 'cabin', { paint: true })];

// the tyres (singles in front, wide twins behind) and the hubs on their outer faces (wheel parts too, so the front ones
// steer with their tyres, about the tyre's centre)
const wheels = [], tyres = [], hubs = [];
for (const [x, steer, inner] of [[fx, true, 4], [rx1, false, 6], [rx2, false, 6]]) for (const s of [-1, 1]) {
  const y0 = s < 0 ? -w - .5 : w - inner, y1 = s < 0 ? -w + inner : w + .5;
  tyres.push(P([x - r, y0, 0, x + r, y1, r * 1.6], TYRE, 'wheel'));
  hubs.push(P([x - 2.6, s < 0 ? -w - .8 : w + .5, 2, x + 2.6, s < 0 ? -w - .5 : w + .8, 6.8], HUB, 'wheel', { pivot: [x, (y0 + y1) / 2] }));
  wheels.push({ x, y: s * (w - inner / 2 + .25), r, steer });
}

// THE TOW KIT: the boom, an orange box beam from its foot on the bed up and back to its tip over the tail, in steps (a
// box can't slant), each a little into the next
const ORANGE = '#ff8a1e', FLOOR = '#2c2e34', AMBER = '#ffae1a', CABLE = '#18181c', BLOCK = '#a8acb4', HOOK = '#5c6068';
const BOOM = [];
{ const n = 9, xa = -9, xb = -45, za = 17.6, zt = 29.2, t = 4, bw = 2.7;
  for (let i = 0; i < n; i++) {
    const x1 = xa + (xb - xa) * i / n, x0 = xa + (xb - xa) * (i + 1) / n - (i < n - 1 ? .5 : 0), zc = za + (zt - za) * (i + .5) / n;
    BOOM.push(P([x0, -bw, zc - t / 2, x1, bw, zc + t / 2], ORANGE, 'glass'));
  } }

// THE FLATBED KIT: the rig's mast, four yellow posts with a collar round them every few units (each piece on the one
// below), a crown and its sheave on top; 'glass' up to the roof line, 'cabin' above it
const DECK = '#8e939b', RIG = '#e8b820', PACK = '#3c4046', BIT = '#b8bcc4', FLUTE = '#565a62';
const MX0 = -39.5, MX1 = -32, MY = 4.5, PT = 2;   // the mast's back and front, its half width, a post's thickness
const posts = (z1, z2, role) => [[MX1 - PT, MX1], [MX0, MX0 + PT]].flatMap(([a, b]) => [P([a, -MY, z1, b, -MY + PT, z2], RIG, role), P([a, MY - PT, z1, b, MY, z2], RIG, role)]);
const collar = (z1, z2, role) => P([MX0, -MY, z1, MX1, MY, z2], RIG, role);
const MAST_LOW = [...posts(zb + 3.6, 22, 'glass'), collar(22, 23.2, 'glass'), ...posts(23.2, 28.5, 'glass'), collar(28.5, 29.7, 'glass')];
const MAST_HIGH = [...posts(29.7, 35, 'cabin'), collar(35, 36.2, 'cabin'), ...posts(36.2, 41.5, 'cabin'),
  P([MX0, -5.5, 41.5, MX1 + 1, 5.5, 43.5], RIG, 'cabin'), P([MX0 + 2, -2, 43.5, MX1 - 1.5, 2, 45.5], BOX, 'cabin')];
// the drill string behind the mast: the head on its carriage, the rod, the bit (steel and dark flutes, a point)
const BIT_PARTS = [P([MX0 - 1.1, -3, 30, MX0, 3, 35.5], DARK, 'trim'), P([MX0 - 3.1, -2.4, 30.6, MX0 - 1.1, 2.4, 35], BOX, 'trim'),
  P([MX0 - 2.6, -.5, 24.6, MX0 - 1.6, .5, 30.6], HUB, 'trim'),
  ...[0, 1, 2, 3, 4].map(i => P([MX0 - 3.3, -1.7, 16.4 + i * 1.64, MX0 - .9, 1.7, 16.4 + (i + 1) * 1.64], i % 2 ? FLUTE : BIT, 'trim')),
  P([MX0 - 2.7, -1, 15.2, MX0 - 1.5, 1, 16.4], FLUTE, 'trim')];

def('vehicleModels', 'hookline', {
  name: 'Hookline', class: 'tow', length: L, width: W, height: H,
  parts: [
    // the bumpers under the ends: a chrome bar across the nose; a steel underride bar and the tow hitch at the back
    P([l - 1, -w, 4.6, l + 3, w, 9.4], CHROME, 'bumper'),
    P([-l - 2, -w + 2, 4.4, -l + 1, w - 2, 7.6], STEEL, 'bumper'), P([-l - 3.4, -1.6, 4.8, -l - 2, 1.6, 7], DARK, 'bumper'),
    // the chassis and the bed's sides: one long box in the paint (the tyres' tops under it)
    P([-l, -w, z0, l, w, zb], PAINT),
    // on its sides a dark rubbing strip nose to tail; under them a chrome fuel tank (right) and a step box (left)
    ...pair(-l + 2, w, 9.6, l - 2, w + .3, 10.8, DARK, 'bumper'),
    P([-3.5, w - 2.6, 2.4, 17, w + .6, z0], CHROME, 'bumper'), P([-3.5, -w - .6, 2.4, 17, -w + 2.6, z0], BOX, 'bumper'),
    // the front: the fender line (full width), the cab's lower body, the narrower bonnet
    P([CX0, -w, zb, l, w, zf], PAINT), P([CX0, -w, zf, CX1, w, zw], PAINT), P([CX1, -HW, zf, l, HW, zh], PAINT),
    // the nose: a chrome grille with a dark core and three bars; the headlamps in chrome bezels on the fenders' ends,
    // their lit parts round on to the fenders' tops
    P([l, -8.5, 12.6, l + .35, 8.5, zh - .3], CHROME, 'bumper'), P([l + .35, -7.4, 13.4, l + .6, 7.4, zh - 1.1], GRILLE, 'bumper'),
    ...[-4.2, 0, 4.2].map(y => P([l + .6, y - .4, 13.4, l + .8, y + .4, zh - 1.1], CHROME, 'bumper')),
    ...pair(l, 10, 13.6, l + .3, 14.4, zf - .2, CHROME, 'bumper'),
    ...pair(l + .3, 10.6, 14.1, l + .55, 13.8, zf - .7, HEAD, 'light'), ...pair(l - 1.4, 10.6, zf, l + .55, 13.8, zf + .2, HEAD, 'light'),
    // the back: the tail lamps and the plate on the chassis' end
    ...pair(-l - .4, 9.4, 9, -l, 13.6, 12.6, TAIL, 'tail'), P([-l - .3, -8.2, 7.8, -l, -2.6, 11], PLATE, 'bumper'),
    // the cab: glass all round, the roof in the paint
    ...cab(),
    // the exhaust stack up the cab's back right corner, a heat shield round its middle
    P([3.8, w + .3, zb, 5.4, w + 1.9, 18], CHROME, 'trim'), P([3.5, w + .1, 18, 5.7, w + 2.1, 26], DARK, 'trim'), P([3.8, w + .3, 26, 5.4, w + 1.9, 33.5], CHROME, 'trim'),
    ...tyres, ...hubs],
  wheels,
  seats: [{ x: 14, y: -5 }, { x: 14, y: 5 }],
  doors: [{ id: 'fl', x: 14, y: -w - 6, side: -1, seat: 0 }, { id: 'fr', x: 14, y: w + 6, side: 1, seat: 1 }],
  lights: { head: [[l + .5, -12.2, 15.4], [l + .5, 12.2, 15.4]], tail: [[-l - .5, -11.5, 10.8], [-l - .5, 11.5, 10.8]], siren: [] },
  hook: [-l - 4, 0],
  kits: {
    // the Hookline: a dark floor between low walls (in the paint), the boom's foot (a winch on a pedestal) and a ram
    // under it, the boom and the sheave at its tip; the cab again, the amber bar on its roof; the cable and the hook
    tow: { parts: [
      P([-l, -12.5, zb, 4, 12.5, zb + .45], FLOOR, 'glass'),
      ...pair(-l, 12.5, zb, 4, w, zb + 3.2, PAINT, 'glass', { paint: true }),
      P([-14.5, -4.2, zb + .45, -7.5, 4.2, 17.6], BOX, 'glass'), P([-27, -1.3, zb + .45, -24, 1.3, 22.5], DARK, 'glass'),
      ...BOOM, P([-47.2, -2.8, 27, -43.6, 2.8, 31], BOX, 'glass'),
      ...cab(),
      P([13.6, -11.5, zr, 18.2, 11.5, zr + .6], DARK, 'cabin'), ...pair(14, 1.2, zr + .6, 17.8, 10.8, zr + 2.4, AMBER, 'cabin'),
      P([14.6, -.8, zr + .6, 17.2, .8, zr + 1.8], CHROME, 'cabin'),
      P([-46, -.6, 16.6, -44.8, .6, 27], CABLE, 'trim'), P([-47.1, -2.1, 13.4, -43.7, 2.1, 16.6], BLOCK, 'trim'),
      P([-46.3, -.8, 10, -44.5, .8, 13.4], HOOK, 'trim'), P([-44.5, -.8, 10, -43.3, .8, 12], HOOK, 'trim')] },
    // the Drill Rig: a steel deck over the whole bed (dark cross members ahead of the rig), the rig's yellow platform, its
    // power pack (a grille on its top), the mast's lower half; the cab again; the mast's upper half and crown; the drill
    // string
    flatbed: { parts: [
      P([-l, -w, zb, 4.5, w, zb + 2], DECK, 'glass'),
      ...[-3.5, -10].map(x => P([x, -w + .6, zb + 2, x + 1.2, w - .6, zb + 2.15], STEEL, 'glass')),
      P([MX0, -11, zb + 2, -16, 11, zb + 3.6], RIG, 'glass'),
      P([-26, -8, zb + 3.6, -17.5, 8, 22.6], PACK, 'glass'), P([-25.6, -7.6, 22.6, -17.9, 7.6, 23.3], GRILLE, 'glass'),
      ...MAST_LOW,
      ...cab(),
      ...MAST_HIGH,
      ...BIT_PARTS] },
  },
  about: 'A heavy conventional tow truck: a long nose, a square cab with a stack, a low bed on twin rear axles.',
});

// The Hookline. Both definitions are four-wheel drive with their weight toward the back (the boom, the rig): the
// truck's power is small for its size, and at full lock on the skidpad it is the front wheels pulling that keep it round.
def('vehicles', 'hookline', {
  name: 'Hookline', model: 'hookline', kit: 'tow', class: 'tow', role: 'service', tool: 'hook', seats: 2, radio: 'wheelz', health: 170, horn: 'truck',
  palette: ['#f0c020', '#dc5e18', '#e8e8ea'],
  handling: { mass: 2600, top: 200, accel: 50.5, brake: 520, grip: 320, drift: .35, steer: .66, steerRate: 2.6, drive: 'awd', wheelbase: 46, cg: .7, cgHeight: .32, rolling: .015, reverseTop: 60, gears: 4 },
  spec: { t100: 2.3, top: 200, brake100: 15 },
  spawn: { zones: ['harbor', 'brick', 'scrapyard'], weight: 1, timeOfDay: ['day', 'night'] }, price: 0, tags: ['tow', 'truck', 'service'],
  about: 'Gus\'s wrecker: slow off the line, heavy in the corners, and the fire button drops the hook on whatever is behind it.',
});

// The Drill Rig: the Hookline's chassis as a flatbed carrying a drilling rig (the Big Drill heist's), white or green.
def('vehicles', 'drillrig', {
  name: 'Drill Rig', model: 'hookline', kit: 'flatbed', class: 'tow', role: 'service', tool: 'hook', seats: 2, radio: 'wheelz', health: 180, horn: 'truck',
  palette: ['#e8e8e4', '#24503a'],
  handling: { mass: 3200, top: 185, accel: 46.8, brake: 500, grip: 300, drift: .32, steer: .68, steerRate: 2.3, drive: 'awd', wheelbase: 46, cg: .76, cgHeight: .38, rolling: .01, reverseTop: 55, gears: 4 },
  spec: { t100: 2.6, top: 185, brake100: 16 },
  price: 0, tags: ['tow', 'truck', 'heist'],
  about: 'A flatbed carrying a drilling rig: a yellow frame, a lattice mast high over the cab, the bit hung behind it. Top-heavy and slow.',
});
