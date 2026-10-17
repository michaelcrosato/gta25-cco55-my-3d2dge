// The MPD Eye (PLAN.md 9.6, 3★ heat): the Motopolis Police Department's helicopter, AI only in the slice: it flies its
// patrol over Lowtown and, when the heat rises, hangs over the chase with its searchlight on the street. A rounded
// navy cabin (white belt line, white roof and engine fairing, a red and blue light bar), a big glass bubble at the front,
// the searchlight under the chin, skids on their cross tubes, a tail boom with its fin, stabilizer (running lights at
// its tips) and a small tail rotor, and the main rotor, which the renderer spins and draws twice, crossed.
//   The parts are listed by hand (heliParts was the start) for the renderer's draw order (render/box-model.js
//   partOrder): boxes that a plane separates are drawn far one first, in every view, so each box here touches its
//   neighbours rather than crossing them: the cabin is a stack (the lower body, then the rear cabin and the glass on
//   it, the roof on them, the fairing and the mast on the roof), rounded at the nose by smaller steps of glass and chin;
//   the boom runs back from the cabin's back face in two tapering pieces, the fin standing on its end; the
//   stabilizer's halves meet the boom's sides. The order has no cycles in any view (the axis-aligned ones too, where
//   boxes apart along the unseen axis are ordered by height alone): so the tail rotor's horizontal blade shares the
//   roof's height band and its hub keeps clear of the mast's width.
//   The main rotor turns about the model's origin (render/box-model.js), so the mast stands at x = 0, y = 0; 'rotor'
//   parts are drawn last, in list order (the blade, its tips, then the hub over them). The tail rotor is trim on the
//   fin's left side (only the main rotor spins).
import { def } from '../../motor/index.js';

const L = 60, W = 16, H = 18;   // the collision box
const w = W / 2;
const ZB = 4, ZG = 9, ZT = 13.4, ZR = 14.2, ZF = 15.8, ZM = 17.2;   // the belly, the belt line (the glass's foot), the glass's top, the roof's top, the fairing's top, the mast's top
const XT = -7, XG = 3, XN = 14;   // the cabin's back, where the glass starts, where the nose starts
const CW = 5.8;   // the cabin's half width
const NAVY = '#1e2a5c', WHITE = '#e8eaee', GLASS = '#5d7f9c', DARK = '#3a3c44', BLADE = '#2c2e36', TUBE = '#4a4c54';

const P = (box, color, role = 'body', more) => (more ? { box, color, role, ...more } : { box, color, role });
/** a box and its mirror across the centre line: y from a to b (0 <= a < b) on the right, -b to -a on the left */
const pair = (x0, a, z1, x1, b, z2, color, role, more) => [P([x0, -b, z1, x1, -a, z2], color, role, more), P([x0, a, z1, x1, b, z2], color, role, more)];
/** a skid strut: posts up from both skids and a cross tube under the belly, at x */
const strut = x => [...pair(x - .6, 6.8, 1.1, x + .6, 7.6, ZB - .8, TUBE, 'trim'), P([x - .6, -7.6, ZB - .8, x + .6, 7.6, ZB], TUBE, 'trim')];

def('vehicleModels', 'eye', {
  name: 'MPD Eye', class: 'heli', length: L, width: W, height: H,
  parts: [
    // the cabin: the lower body to the belt line (a white stripe along it), the rear cabin (a window each side) and the
    // glass on it, the nose stepped round in glass over a navy chin, the roof (white) over the rear cabin and the glass's
    // back
    P([XT, -CW, ZB, XN, CW, ZG], NAVY),
    ...pair(XT, CW, 7.6, XN, CW + .3, 8.6, WHITE, 'trim'),
    P([XT, -CW, ZG, XG, CW, ZT], NAVY), ...pair(-4.6, CW, 9.8, 1.4, CW + .25, 12.6, GLASS, 'glass'),
    P([XG, -CW, ZG, XN, CW, ZT], GLASS, 'glass'),
    P([XN, -4.8, 5, 17.6, 4.8, 8.4], NAVY), P([XN, -4.8, 8.4, 17.6, 4.8, 12.4], GLASS, 'glass'),
    P([17.6, -3.2, 5.8, 19.8, 3.2, 7.6], NAVY), P([17.6, -3.2, 7.6, 19.8, 3.2, 10.8], GLASS, 'glass'),
    P([19.8, -1.8, 6.6, 21, 1.8, 9.4], GLASS, 'glass'),
    P([XT, -5.4, ZT, 9, 5.4, ZR], WHITE, 'cabin'),
    // on the roof: the light bar (red to port, blue to starboard), the engine fairing with its exhaust, the mast
    P([6.6, -3.6, ZR, 8.6, -.1, ZR + .7], '#c82a2a', 'siren'), P([6.6, .1, ZR, 8.6, 3.6, ZR + .7], '#2a5ac8', 'siren'),
    P([-9, -3.8, ZR, 4, 3.8, ZF], WHITE, 'cabin'), P([-10.2, -1.6, ZR + .2, -9, 1.6, ZF - .4], DARK, 'cabin'),
    P([-.6, -.6, ZF, .6, .6, ZM], DARK, 'cabin'),
    // the searchlight under the chin: its housing and the lamp facing forward
    P([XN, -1.8, 3, 16.6, 1.8, 5], DARK, 'trim'), P([16.6, -1.4, 3.3, 17.2, 1.4, 4.7], '#c8c4b0', 'light'),
    // the skids (their tips turned up) on two struts
    ...pair(-9, 6.6, 0, 12, w - .1, 1.1, TUBE, 'trim'), ...pair(12, 6.6, 1.1, 13.6, w - .1, 2.5, TUBE, 'trim'),
    ...strut(-4.5), ...strut(7.5),
    // the tail: the boom back from the cabin (tapering), the fin and the ventral fin at its end, the stabilizer's
    // halves with the running lights at their tips, the anti-collision lamp on the fin, the tail rotor on its left
    P([-17, -1.9, 9.4, XT, 1.9, 12.4], NAVY), P([-29.6, -1.4, 9.8, -17, 1.4, 12], NAVY),
    P([-29.6, -.6, 12, -25.8, .6, 17.2], NAVY), P([-29.2, -.5, 7, -26.4, .5, 9.8], NAVY),
    ...pair(-23, 1.4, 10.4, -20, 5.4, 11.2, NAVY), P([-22.6, -5.9, 10.4, -20.4, -5.4, 11.2], '#d8302c', 'trim'), P([-22.6, 5.4, 10.4, -20.4, 5.9, 11.2], '#2ec860', 'trim'),
    P([-28.6, -.5, 17.2, -26.8, .5, 17.7], '#8a1a1a', 'tail'),
    P([-31, -2.1, 13.5, -24.6, -1.6, 14.1], '#a4a6ae', 'trim'), P([-28.1, -2.1, 10.6, -27.5, -1.6, 17], '#a4a6ae', 'trim'),
    P([-28.5, -2.4, 13.1, -27.1, -.6, 14.5], DARK, 'trim'),
    // the main rotor: the blade, its white tips, the hub over them
    P([-27, -1.2, ZM + .2, 27, 1.2, ZM + .6], BLADE, 'rotor'),
    P([23.6, -1.2, ZM + .2, 27, 1.2, ZM + .65], WHITE, 'rotor'), P([-27, -1.2, ZM + .2, -23.6, 1.2, ZM + .65], WHITE, 'rotor'),
    P([-2.2, -2.2, ZM, 2.2, 2.2, H], DARK, 'rotor')],
  wheels: [],
  seats: [{ x: 10, y: -2.8 }, { x: 10, y: 2.8 }],
  doors: [],   // (AI only: never boarded)
  // (no head lamps: the searchlight's shaft and pool are the heli's own, render/vehicle-draw.js drawHeliExtras, and a
  // car's beam from the nose would hang in the air at its altitude; the tail: the fin's anti-collision lamp; the siren:
  // the light bar)
  lights: { head: [], tail: [[-27.7, 0, 17.6]], siren: [[7.6, 0, ZR + .7]] },
  about: 'The police helicopter: a navy bubble with a searchlight under its chin, the eye in the sky at three stars.',
});

def('vehicles', 'eye', {
  name: 'MPD Eye', model: 'eye', class: 'heli', role: 'police', seats: 2, radio: 'off', health: 200, horn: 'none',
  palette: ['#1e2a5c', '#e8eaee'],
  handling: { mass: 2200, top: 240, accel: 160, climb: 90, yawRate: 1.4, hoverZ: 140 },
  spec: { top: 240, climb: 90 },
  price: 0, tags: ['heli', 'police', 'ai'],
  about: 'The MPD Eye: AI only. It patrols over Lowtown, and at three stars it follows the chase with its searchlight.',
});
