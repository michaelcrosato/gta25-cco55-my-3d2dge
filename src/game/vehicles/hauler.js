// The Hauler (PLAN.md 9.6): Lowtown's box van, and the chassis under three services that are kits on it: the Medic
// (an ambulance), the MPD Rhino (the SWAT truck) and the Strongbox (the bank's armoured car).
//   The parts are listed by hand (not vanParts) because the renderer paints boxes in role order, with no depth sort,
//   and a van's low cab beside its tall box needs that order to fall right from every side:
//   - the chassis (the cab's lower body and the box's floor, one block to the belt line) first;
//   - then the box below the cab's roof line together with the cab's solid back ('trim' in the paint: one block, so
//     no face between them), drawn before the cab's glass, so from the front the cab hides it;
//   - the glass, the mirrors and the cab roof next, then the box above the roof line ('glass' in the paint) after
//     them, so from behind the box hides the cab;
//   - the box's skin last ('cabin' in the paint: its top, its front above the cab, the back doors), so whatever a kit
//     puts on the far side of the box stays hidden behind it, while the near side shows;
//   - the lamps are 'bumper' parts (drawn early, hidden behind the body from the other end; the night's light comes
//     from `lights`), and one 'tail' part high on the back doors shows the brakes.
//   Kits slot in between: things on the chassis ('bumper'), on the box below the roof line ('trim'), on the box above
//   it ('glass'; the back doors leave the stripe line open for the Medic's), on the roof ('cabin'), and 'siren' lamps.
import { def } from '../../motor/index.js';

const L = 74, W = 30, H = 34, hl = L / 2, hw = W / 2;
const ZF = 5, ZB = 15, ZG = 26.5, ZC = 28;   // the chassis's underside and its top (the belt line), the cab glass's top, the cab roof's top
const XB = 13, XG = 25, XR = 32, XW = 36;    // the box's front face, the glass's back edge, the cab roof's front edge, the windscreen
const S0 = 29.6, S1 = 32;                    // the stripe line high on the box (the Medic's red, the Strongbox's gold)
const FX = 22.5, RX = -20.5, R = 7;          // the axles (a 43 wheelbase: the handling's) and the wheels' radius
const PAINT = '#e8e8e4', WHEEL = '#1a1a20', GLASS = '#3a4a5a', DARK = '#2a2a30', RED = '#cc2a2a', BLUE = '#2a5ac8';
const P = (box, color, role = 'body', paint = false) => (paint ? { box, color, role, paint } : { box, color, role });
/** a part on the right side (y0..y1, y0 >= 0) and its mirror on the left */
const both = (x0, y0, z0, x1, y1, z1, color, role, paint) => [P([x0, -y1, z0, x1, -y0, z1], color, role, paint), P([x0, y0, z0, x1, y1, z1], color, role, paint)];

const wheels = [], wheelParts = [];
for (const [x, steer] of [[FX, true], [RX, false]]) for (const s of [-1, 1]) {
  wheelParts.push(P([x - R, s < 0 ? -hw - .5 : hw - 4, 0, x + R, s < 0 ? -hw + 4 : hw + .5, R * 1.6], WHEEL, 'wheel'));
  wheels.push({ x, y: s * (hw - 1.5), r: R, steer });
}

def('vehicleModels', 'hauler', {
  name: 'Hauler', class: 'truck', length: L, width: W, height: H,
  parts: [
    ...wheelParts,
    P([-hl, -hw, ZF, hl, hw, ZB], PAINT),                                    // the chassis
    P([hl, -14, 2.5, hl + 1.5, 14, 8.5], '#8a8c92', 'bumper'),               // the front bumper
    P([-hl - 1.5, -14, 2.5, -hl, 14, 6.5], DARK, 'bumper'),                  // the back step
    P([hl, -7.5, 8.5, hl + .4, 7.5, 13.5], '#2c2e34', 'bumper'),              // the grille
    ...both(hl, 9, 9, hl + .5, 13, 13, '#f2eacc', 'bumper'),                 // head lamps
    ...both(-hl - .5, 10, 8, -hl, 14, 12.5, '#8a1a1a', 'bumper'),            // tail lamps
    P([-hl, -hw, ZB - .4, XG, hw, ZC], PAINT, 'trim', true),                 // the box below the cab's roof line and the cab's solid back (each stacked block dips .4 into the one below: no seam where pixels round)
    ...both(XB - .4, hw - .2, ZB, XB + .4, hw + .1, ZC - .4, '#3a3c42', 'trim'),   // the gap between the cab and the box
    P([XG, -14, ZB, XW, 14, ZG], GLASS, 'glass'),                            // the windscreen and the door windows
    P([XW - .3, -13.4, ZG - 3.2, XW + .15, 13.4, ZG - .6], '#6c86a0', 'glass'),   // the sky in the windscreen (before the roof, so the box hides it from behind)
    ...both(32, 14, 17.5, 34.5, 17.5, 21, DARK, 'glass'),                    // mirrors
    P([XB, -14.5, ZG, XR, 14.5, ZC], PAINT, 'glass', true),                  // the cab roof (the windscreen shows ahead of it from above)
    P([-hl, -hw, ZC - .4, XB, hw, H], PAINT, 'glass', true),                 // the box, above the cab's roof line
    P([-hl - .2, -.5, ZB + .5, -hl + .2, .5, H - .5], '#18181e', 'glass'),     // the back doors' seam (it shows between them)
    P([-hl, -hw, H - 1, XB, hw, H], PAINT, 'cabin', true),                   // the box's skin: its top,
    P([XB - .5, -hw, ZC, XB, hw, H], PAINT, 'cabin', true),                  // its front above the cab,
    ...[[ZB, S0], [S1, H]].flatMap(([z0, z1]) => both(-hl, .35, z0, -hl + .5, hw, z1, PAINT, 'cabin', true)),   // the back doors (open along the stripe line)
    ...[-29, -19, -9, 1].map(x => P([x - .6, -14.5, H, x + .6, 14.5, H + .5], '#b4b6bc', 'cabin')),     // roof ribs
    ...[-12, 0, 12].map(y => P([10.8, y - 1, H, 12.4, y + 1, H + .8], '#e89a30', 'cabin')),            // clearance lamps, amber ahead,
    ...[-12, 12].map(y => P([-hl + .6, y - 1, H, -hl + 2.2, y + 1, H + .8], '#c03028', 'cabin')),       // red behind
    P([-hl - .4, -3, H - 3, -hl, 3, H - 1.5], '#8a1a1a', 'tail'),           // the high brake lamp
  ],
  wheels,
  seats: [{ x: 28, y: -6 }, { x: 28, y: 6 }, { x: -16, y: 0 }],
  doors: [{ id: 'fl', x: 27, y: -hw - 6, side: -1, seat: 0 }, { id: 'fr', x: 27, y: hw + 6, side: 1, seat: 1 }, { id: 'back', x: -hl - 6, y: 0, side: 0, seat: 2 }],
  lights: { head: [[hl + .5, -11, 11], [hl + .5, 11, 11]], tail: [[-hl - .5, -12, 10.25], [-hl - .5, 12, 10.25]], siren: [] },
  kits: {
    // the Medic: a red cross on each side and on the roof, a red stripe along the box and round the back, light bars
    medic: { parts: [
      ...both(-17.5, hw, 20.2, -6.5, hw + .3, 23.8, RED, 'trim'), ...both(-13.8, hw, 16.5, -10.2, hw + .3, 27.5, RED, 'trim'),
      ...both(-hl + .7, hw, S0, XB - .7, hw + .3, S1, RED, 'glass'), P([-hl - .3, -14.6, S0, -hl, 14.6, S1], RED, 'glass'),
      P([-23, -3.6, H, -1, 3.6, H + .7], RED, 'cabin'), P([-15.6, -11, H, -8.4, 11, H + .7], RED, 'cabin'),
      P([25.5, -11.5, ZC, 31, 11.5, ZC + .7], DARK, 'cabin'), P([25.8, -11, ZC + .7, 30.7, 0, ZC + 2.8], RED, 'siren'), P([25.8, 0, ZC + .7, 30.7, 11, ZC + 2.8], BLUE, 'siren'),
      P([-hl + .3, -9, H, -hl + 3, 9, H + .6], DARK, 'cabin'), P([-hl + .5, -8.5, H + .6, -hl + 2.8, 0, H + 2.2], RED, 'siren'), P([-hl + .5, 0, H + .6, -hl + 2.8, 8.5, H + 2.2], BLUE, 'siren'),
    ], lights: { siren: [[28.2, 0, ZC + 2.8], [-hl + 1.6, 0, H + 2.2]] } },
    // the MPD Rhino: a ram on the front, armour skirts and plates down the sides, small barred windows, a light bar
    // on the box's front edge and the roof number the helicopter reads
    swat: { parts: [
      P([hl + .8, -14, 5, hl + 2.6, 14, 9], DARK, 'bumper'), P([hl + .8, -11.5, 12, hl + 2.4, 11.5, 14.5], DARK, 'bumper'),
      ...both(hl + .8, 8, 2.5, hl + 2.5, 11.5, 14.5, DARK, 'bumper'),
      ...both(-12.5, hw, 6, 14.5, hw + .9, 14.2, '#3e444f', 'bumper'),
      ...[-35.5, -24.5, -13.5, -2.5].flatMap(x => both(x, hw, 16, x + 9.5, hw + 1, 26.6, '#3e444f', 'trim')),
      ...[-30, -12].flatMap(x => [...both(x, hw, 28.8, x + 6, hw + .25, 32, '#141820', 'glass'),
        ...[1.3, 2.7, 4.1].flatMap(dx => both(x + dx, hw + .25, 28.6, x + dx + .55, hw + .5, 32.2, '#9aa0aa', 'glass'))]),
      P([8.8, -11, H, 12.6, 11, H + .6], DARK, 'cabin'), P([9, -10.5, H + .6, 12.4, 0, H + 2.6], RED, 'siren'), P([9, 0, H + .6, 12.4, 10.5, H + 2.6], BLUE, 'siren'),
      P([-24, -7, H, -8, 7, H + .5], '#e8e8ec', 'cabin'),
    ], lights: { siren: [[10.7, 0, H + 2.6]] } },
    // the Strongbox: a steel block for a bumper, heavy plates with gun ports, a small roof hatch; no light bar
    armored: { parts: [
      P([hl + .5, -15.5, 2, hl + 2.6, 15.5, 8.8], '#4a4f58', 'bumper'), P([hl + .4, -15.5, 8.8, hl + 1.2, 15.5, 9.6], DARK, 'bumper'),
      ...both(-12.5, hw, 5.5, 14.5, hw + 1.4, 14.6, '#4a4f58', 'bumper'),
      ...both(-35.8, hw, 15.6, -12, hw + 1.4, 27.4, '#4a4f58', 'trim'), ...both(-10.8, hw, 15.6, 12, hw + 1.4, 27.4, '#4a4f58', 'trim'),
      ...[-30, -18.5, -5, 6].flatMap(x => both(x, hw + 1.4, 20.5, x + 3, hw + 1.7, 22, '#121418', 'trim')),
      ...both(-hl + .7, hw, S0, XB - .7, hw + .3, S0 + 1.8, '#c8a040', 'glass'),   // the bank's gold stripe
      P([-14, -5, H, -4, 5, H + 1.5], '#4a4f58', 'cabin'), P([-8.5, -1.5, H + 1.5, -6.5, 1.5, H + 2.2], DARK, 'cabin'),
    ] },
    // the Bucket (EXPANSION.md 6, X3: the Volt Boys' cherry picker): black hazard bands down the lower box (the paint
    // safety yellow between), a black stripe along the top, on the roof the lift's turntable at the back, its boom laid
    // forward along the roof and over the cab, the bucket (a basket, open on top) at its tip over the windscreen, and an
    // amber beacon each end
    bucket: { parts: [
      ...[-34, -26, -18, -10, -2, 6].flatMap(x => both(x, hw, ZB + .5, x + 4, hw + .3, ZC - 1, DARK, 'trim')),
      ...both(-hl + .7, hw, S0, XB - .7, hw + .3, S1, DARK, 'glass'), P([-hl - .3, -14.6, S0, -hl, 14.6, S1], DARK, 'glass'),
      P([-31, -7, H, -19, 7, H + 2.5], DARK, 'cabin'), P([-29, -5, H + 2.5, -21, 5, H + 5], '#8a8c92', 'cabin'),
      P([-27, -2.4, H + 5, 21, 2.4, H + 8.2], '#e8e8ec', 'cabin'), P([19, -3, H + 1, 22, 3, H + 8.6], '#8a8c92', 'cabin'),
      P([22, -6.5, H - 1.5, 33, 6.5, H + 6.5], '#ffd23a', 'cabin'), P([23, -5.5, H + 6, 32, 5.5, H + 6.6], '#3a3a40', 'cabin'),
      P([26, -11.5, ZC, 30, -6, ZC + 2], '#e89a30', 'cabin'), P([-hl + .6, 7, H, -hl + 3, 11, H + 2], '#e89a30', 'cabin'),
    ] },
  },
  about: 'A box van: a cab up front, a tall box behind with two back doors; the chassis under the Medic, the Rhino, the Strongbox and the Bucket.',
});

// one chassis, so they share a wheelbase and front-wheel drive with the weight over the back (the box, loaded); the
// slow ones steer slower and, to hold a skidpad at a crawl, a little more lock; every van turns inside the city's
// junction arcs (TURN_R 72) at a van's pace: .62 of lock on this wheelbase (D17)
const VAN = { wheelbase: 43, drive: 'fwd', cg: .65, brake: 640, steerFade: .45 };
def('vehicles', 'hauler', {
  name: 'Hauler', model: 'hauler', class: 'truck', role: 'civilian', seats: 3, radio: 'wheelz', health: 160, horn: 'truck',
  palette: ['#e8e8e4', '#d8c8a0', '#8e9198', '#8ec0e8'],
  handling: { ...VAN, mass: 2600, top: 201, accel: 54, grip: 306, drift: .48, steer: .62, steerRate: 2.4, cgHeight: .35, rolling: .008 },
  spec: { t100: 2.2, top: 195, brake100: 15 },
  spawn: { zones: ['harbor', 'brick', 'foundry', 'scrapyard', 'voltage'], weight: 2, timeOfDay: ['day'] }, tags: ['van', 'box', 'delivery'],
  about: 'A delivery box van: slow off the line, heavy in a hit, a wide turning circle.',
});
def('vehicles', 'medic', {
  name: 'Medic', model: 'hauler', kit: 'medic', class: 'truck', role: 'medic', siren: true, seats: 3, radio: 'off', health: 140, horn: 'truck',
  palette: ['#f0f0ee'],
  handling: { ...VAN, mass: 2500, top: 215, accel: 57, grip: 336, drift: .48, steer: .62, steerRate: 2.4, cgHeight: .35, rolling: .01 },
  spec: { t100: 2.0, top: 210, brake100: 14 }, tags: ['van', 'ambulance', 'emergency'],
  about: 'The ambulance: the Hauler with a stronger engine, better brakes and the lights.',
});
def('vehicles', 'rhino', {
  name: 'MPD Rhino', model: 'hauler', kit: 'swat', class: 'truck', role: 'police', locked: true, siren: true, seats: 3, radio: 'lowdown', health: 260, toughness: .6, horn: 'truck',
  palette: ['#1e2a4a', '#18181e'],
  handling: { ...VAN, mass: 3400, top: 197, accel: 45, grip: 290, drift: .45, steer: .62, steerRate: 1.6, cgHeight: .4, rolling: .008 },
  spec: { t100: 2.6, top: 190, brake100: 16 }, tags: ['van', 'police', 'swat', 'armored'],
  about: 'The SWAT truck: armour plates and a ram, slow to get going and hard to stop.',
});
def('vehicles', 'strongbox', {
  name: 'Strongbox', model: 'hauler', kit: 'armored', class: 'truck', role: 'special', locked: true, seats: 2, radio: 'off', health: 400, toughness: .4, horn: 'truck',
  palette: ['#7e868e', '#2f5e44'],
  handling: { ...VAN, mass: 4200, top: 176, accel: 43, grip: 272, drift: .42, steer: .62, steerRate: 1.2, cgHeight: .4, rolling: .006 },
  spec: { t100: 3.0, top: 170, brake100: 17 }, tags: ['van', 'armored', 'bank'],
  about: 'The bank\'s armoured car: the heaviest thing on four wheels in Lowtown, and the slowest.',
});
// The Bucket (EXPANSION.md 6, X3): the Volt Boys' cherry-picker van, the Hauler with the lift on its roof; the Hauler's
// handling (the lift's weight is the box's load)
def('vehicles', 'bucket', {
  name: 'Bucket', model: 'hauler', kit: 'bucket', class: 'truck', role: 'gang', seats: 3, radio: 'wheelz', health: 170, horn: 'truck',
  palette: ['#ffd23a', '#f0c020'],
  handling: { ...VAN, mass: 2600, top: 201, accel: 54, grip: 306, drift: .48, steer: .62, steerRate: 2.4, cgHeight: .35, rolling: .008 },
  spec: { t100: 2.2, top: 195, brake100: 15 },
  tags: ['van', 'gang', 'lift'],
  about: 'The Volt Boys\' cherry picker: safety yellow, hazard bands, a bucket on a boom over the cab. A Hauler underneath.',
});
