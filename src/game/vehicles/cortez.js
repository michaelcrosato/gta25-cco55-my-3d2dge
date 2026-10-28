// The Cortez (PLAN.md 9.6): Lowtown's everyday sedan, the car a player steals most. Its model carries two kits for its
// variants (the Retiree's wagon back and wood, the Fed Sedan's tinted glass and hidden lights), and its handling is the
// baseline the other cars are tuned against; the spec numbers are what the handling suite holds it to. This file is the
// template the other vehicles follow: a model (sizes, parts, kits), then the definitions that use it.
//   The parts are listed by hand, in layers, because the renderer paints a model's parts in role order (and, within a
//   role, in list order) with no depth sort, so a part drawn after the body looks right only where it sits on top of it
//   (carParts' far bumper and lamps show through the body). So: the bumpers go under the body's ends (listed before
//   it: the body hides the far one); the body is a lower box, then what sits on its sides ('bumper' parts: unpainted,
//   drawn in list order with the body), its end faces again as thin slabs (they hide the far side's from a low view
//   along the car), what sits on its ends, then a thin lid over it all (drawn after them, it hides the far ones);
//   trim, glass and the roof sit on the lid, and what sits on the roof is 'cabin' (drawn after it). A lamp is a lens on
//   the face (a 'bumper' part, under the lid) and its lit part, which spans only the lid and wraps on to the top: it
//   shows from its own end and from above, and from the far end barely pokes past the body.
import { def } from '../../motor/index.js';

const L = 58, W = 26, H = 22;   // the collision box (the baseline: keep it)
const l = L / 2, w = W / 2, cl = L * .45, cx = L * -.08;   // half sizes; the cabin's length and centre
const z0 = 3, zs = 11.4, zb = 12.1;   // the body's underside, where its lid starts, its top
const r = 6, wx = l * .62;   // the wheels' radius, and where they sit (fore and aft)
const PAINT = '#c8423a', STEEL = '#b4b6be', GRILLE = '#24242a', GLASS = '#3a4a5a', TYRE = '#1a1a20', PLATE = '#d4d0c0', RUB = '#2e2e34', RACK = '#8a8a92';
const LID = [-l, -w, zs, l, w, zb], GLASS_BOX = [cx - cl / 2, -w + 2, zb, cx + cl / 2, w - 2, H - 2];

const P = (box, color, role = 'body', more) => (more ? { box, color, role, ...more } : { box, color, role });
/** a box and its mirror across the centre line: y from a to b (0 <= a < b) on the right, -b to -a on the left */
const pair = (x0, a, z1, x1, b, z2, color, role, more) => [P([x0, -b, z1, x1, -a, z2], color, role, more), P([x0, a, z1, x1, b, z2], color, role, more)];
/** a pair of lamps' lenses on the front (or back) face, from z1 up to the lid, and their lit parts over the lid, round
 *  the corner by `deep` */
const lens = (front, a, b, z1, color) => pair(front ? l : -l - .35, a, z1, front ? l + .35 : -l, b, zs, color, 'bumper');
const lamp = (front, a, b, role, deep) => pair(front ? l - deep : -l - .35, a, zs, front ? l + .35 : -l + deep, b, zb + .15, role === 'tail' ? '#8a1a1a' : '#fff4c8', role);

const wheels = [], tyres = [];
for (const [x, steer] of [[wx, true], [-wx, false]]) for (const s of [-1, 1]) {
  tyres.push(P([x - r, s < 0 ? -w - .5 : w - 3.5, 0, x + r, s < 0 ? -w + 3.5 : w + .5, r * 1.6], TYRE, 'wheel'));
  wheels.push({ x, y: s * (w - 1.5), r, steer });
}
// the end faces again (thin slabs of paint: drawn after what sits on the sides, they hide the far side's from a low
// view along the car), and what sits on the ends: the grille, the plate, the lamps' lenses
const CAPS = [P([l - .05, -w, z0, l, w, zs], PAINT), P([-l, -w, z0, -l + .05, w, zs], PAINT)];
const ENDS = [P([l, -5.6, 6.2, l + .35, 5.6, 10.6], GRILLE, 'bumper'), P([-l - .3, -3.2, 5, -l, 3.2, 7.6], PLATE, 'bumper'),
  ...lens(true, 6.6, 10.6, 8.6, '#c8c4b0'), ...lens(false, 6.6, 10.6, 8.6, '#8a1a1a')];

def('vehicleModels', 'cortez', {
  name: 'Cortez', class: 'car', length: L, width: W, height: H,
  parts: [
    // steel bumpers under the ends
    P([l - 3, -w + .6, .9, l + 1.4, w - .6, z0], STEEL, 'bumper'), P([-l - 1.4, -w + .6, .9, -l + 3, w - .6, z0], STEEL, 'bumper'),
    // the body's lower box, the rubbing strips on its sides, its ends and what sits on them, then its lid
    P([-l, -w, z0, l, w, zs], PAINT),
    ...pair(-l + 5, w, 6.4, l - 5, w + .3, 7.2, RUB, 'bumper'),
    ...CAPS, ...ENDS,
    P(LID, PAINT),
    // the tail lamps' tops on the boot (trim: the wagon's glass hides them from the front, as it should)
    ...pair(-l + .6, 6.6, zb, -l + 1.8, 10.6, zb + .15, '#7a1818', 'trim'),
    // the cabin: the glass, and the roof (in the paint), shorter than the glass so it shows ahead and behind from above
    P(GLASS_BOX, GLASS, 'glass'),
    P([cx - cl / 2 + 4, -w + 2.5, H - 2, cx + cl / 2 - 5.5, w - 2.5, H], '#2a2a30', 'cabin', { paint: true }),
    // the lamps' lit parts: the heads round the front corners; the tails barely round the back ones (behind the wagon's
    // tailgate they are hidden from the front, and a lit part is drawn over everything)
    ...lamp(true, 6.6, 10.6, 'light', 1.6), ...lamp(false, 6.6, 10.6, 'tail', .6),
    ...tyres],
  wheels,
  seats: [{ x: cx + 4, y: -5 }, { x: cx + 4, y: 5 }, { x: cx - 8, y: -5 }, { x: cx - 8, y: 5 }],
  doors: [{ id: 'fl', x: cx + L * .12, y: -w - 6, side: -1, seat: 0 }, { id: 'fr', x: cx + L * .12, y: w + 6, side: 1, seat: 1 },
    { id: 'rl', x: cx - L * .22, y: -w - 6, side: -1, seat: 2 }, { id: 'rr', x: cx - L * .22, y: w + 6, side: 1, seat: 3 }],
  lights: { head: [[l - .5, -8.6, zb - 1.6], [l - .5, 8.6, zb - 1.6]], tail: [[-l + .5, -8.6, zb - 1.6], [-l + .5, 8.6, zb - 1.6]], siren: [] },
  kits: {
    // the Retiree: wood down the sides (framed in light wood; the ends and the lid again after it hide the far side's),
    // the glass and the roof running on to the tailgate, a cream top over the whole roof and a rack on it
    wagon: { parts: [
      ...pair(-l + 2.4, w, 4, 10.6, w + .35, 4.6, '#d2b07a', 'bumper'), ...pair(-l + 2.8, w, 4.6, 10.2, w + .3, 10.2, '#8a5a34', 'bumper'),
      ...pair(-l + 2.4, w, 10.2, 10.6, w + .35, 10.8, '#d2b07a', 'bumper'),
      ...CAPS, ...ENDS, P(LID, PAINT),
      P([-l + 2, -w + 2, zb, cx - cl / 2 + .5, w - 2, H - 2], GLASS, 'glass'),
      P([-l + 2.6, -w + 2.5, H - 2, cx - cl / 2 + 4.5, w - 2.5, H], '#2a2a30', 'cabin', { paint: true }),
      P([-l + 2.6, -w + 2.5, H, cx + cl / 2 - 5.5, w - 2.5, H + .35], '#ece6d6', 'cabin'),
      ...pair(-l + 5, w - 4.4, H + .35, cx + cl / 2 - 7.5, w - 3.4, H + 1.5, RACK, 'cabin'),
      P([-l + 7, -w + 3.4, H + .35, -l + 8.2, w - 3.4, H + 1.1], RACK, 'cabin'), P([cx - 2, -w + 3.4, H + .35, cx - .8, w - 3.4, H + 1.1], RACK, 'cabin')] },
    // the Fed Sedan: a red and a blue lamp behind the grille's lip (their lenses, then the lid again), tinted glass, a
    // whip aerial and a beacon on the roof by the driver (a siren with no bar)
    fed: { parts: [
      P([l, -5.2, 8.2, l + .4, -1.6, zs], '#4a1212', 'bumper'), P([l, 1.6, 8.2, l + .4, 5.2, zs], '#12204a', 'bumper'),
      P(LID, PAINT),
      P(GLASS_BOX, '#28323e', 'glass'),
      P([cx - cl / 2 + 5, 6, H, cx - cl / 2 + 5.8, 6.8, H + 8], '#18181c', 'cabin'),
      P([l - 1, -5.2, zs, l + .4, -1.6, zb + .15], '#6a1818', 'siren'), P([l - 1, 1.6, zs, l + .4, 5.2, zb + .15], '#18286a', 'siren'),
      P([cx + .5, -7.2, H, cx + 3.3, -4.4, H + 2.2], '#5a1414', 'siren')],
    lights: { siren: [[l - .5, 0, zb - 1.5]] } },
  },
  about: 'A four-door family sedan: soft springs, a big bench seat, rear-wheel drive.',
});

def('vehicles', 'cortez', {
  name: 'Cortez', model: 'cortez', class: 'car', role: 'civilian', seats: 4, radio: 'neon', health: 100, horn: 'car',
  palette: ['#c8423a', '#3a6ac8', '#d8c8a0', '#3a8a5a', '#2a2a30', '#e0e0e4', '#c88a2a'],
  handling: { mass: 1200, top: 260, accel: 150, brake: 640, grip: 460, drift: .32, steer: .58, drive: 'rwd' },   // (.58: inside the city's turning circle, D17)
  spec: { t200: 2.4, top: 260, brake200: 41 },
  spawn: { zones: ['palm', 'neon', 'brick', 'harbor', 'foundry', 'scrapyard', 'voltage', 'strip', 'hill', 'marina'], weight: 6, timeOfDay: ['day', 'night'] }, price: 0, tags: ['sedan', 'common'],
});

// The Retiree: the Cortez as a pastel family wagon, soft and slow (Nana's car in Bingo Night).
def('vehicles', 'retiree', {
  name: 'Retiree', model: 'cortez', kit: 'wagon', class: 'car', role: 'civilian', seats: 4, radio: 'lowdown', health: 90, horn: 'car',
  palette: ['#9ad8b8', '#a8c8e8', '#f0b898', '#c0a8d8', '#ece2c4'],
  handling: { mass: 1300, top: 225, accel: 145, brake: 560, grip: 400, drift: .36, steer: .58, steerRate: 2.6, cgHeight: .3, drive: 'rwd' },
  spec: { t200: 3.4, top: 225, brake200: 47 },
  spawn: { zones: ['palm', 'brick', 'foundry', 'marina', 'hill'], weight: 3, timeOfDay: ['day'] }, price: 0, tags: ['wagon', 'common'],
  about: 'A pastel station wagon with wood down its sides: soft, slow, and roomy enough for the whole bingo team.',
});

// The Fed Sedan: the Cortez unmarked, for the Feds: quick and planted, locked, with its lights hidden in the grille.
def('vehicles', 'fedsedan', {
  name: 'Fed Sedan', model: 'cortez', kit: 'fed', class: 'car', role: 'police', locked: true, siren: true, seats: 4, radio: 'off', health: 130, toughness: .9, horn: 'car',
  palette: ['#202026', '#3a3c42', '#1c2a4a', '#1e3a2c'],
  handling: { mass: 1350, top: 280, accel: 147, brake: 720, grip: 485, drift: .38, steer: .58, cgHeight: .2, drive: 'rwd' },
  spec: { t200: 2.2, top: 280, brake200: 39 },
  spawn: { zones: ['neon', 'brick', 'voltage', 'strip'], weight: 1, timeOfDay: ['day', 'night'] }, price: 0, tags: ['sedan', 'police', 'unmarked'],
  about: 'An unmarked federal sedan: tinted glass, a big motor, a beacon by the driver and lights behind the grille.',
});
