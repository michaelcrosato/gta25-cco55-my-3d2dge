// The L (PLAN.md 9.6): one car of Lowtown's elevated train, AI only (it runs its loop on the deck down the central
// avenue at z 112, stops at Palm, Neon Mile, Brickyard and Harbor, and kills what stands on its track). A train is two
// of these cars. A long stainless box with a band of lit windows in a dark gasket strip (paired narrow windows at the
// two doors each side, a darker panel under them), the line's stripe along its belt and round its ends, a dark roof with
// three ventilators, the same face at both ends (cab windows, the lit door window, the route sign, an anticlimber and a
// coupler; head lamps at the front, tail lamps at the back), equipment boxes under the floor, and a bogie at each end.
//   The paint goes on the stripe, so the palette is the stripe's: silver (the usual, a blue silver that still shows on
//   the steel) and the red-striped alternative. The stainless shell is a fixed colour (a 'cabin' part: drawn in the
//   core like a body, but not in the paint); the lit windows are a fixed warm colour, day and night.
//   The parts are listed by hand (trainParts was the start) for the renderer's draw order (render/box-model.js
//   partOrder): boxes that a plane separates are drawn far one first, in every view, so every box touches the faces it
//   sits on (the roof, stacked, dips .4 into the shell, listed after it): the stripe, the gasket strips, the door
//   panels and the lamps on the shell's faces, the windows on the gaskets, the roof's crown and the ventilators on the
//   roof, the underframe and the bogies under the floor, the wheels on the bogies' sides. The ends' parts stay within
//   the shell's width and the sides' parts outside it (the side stripes stop at the ends), so the order has no cycles
//   in any view, the axis-aligned ones too (a car on a straight east-west track in MODE 7), where boxes apart along
//   the unseen axis are ordered by height alone.
import { def } from '../../motor/index.js';

const L = 84, W = 20, H = 30;   // one car (the definition's carLength, width and height say the same)
const l = L / 2, w = W / 2;
const ZU = 6, ZE = 27.6;   // the shell's underside (the floor) and its eaves
const ZS0 = 11.6, ZS1 = 14;   // the stripe
const ZB0 = 15.2, ZB1 = 23.8;   // the window band's gasket strip
const STEEL = '#ccd2da', ROOF = '#3c4048', CROWN = '#34383f', VENT = '#666c76', GASKET = '#24262c', LIT = '#ffe48c',
  CABGLASS = '#4a5a6c', DOOR = '#a2a8b0', UNDER = '#2a2c32', TRUCK = '#303238', TYRE = '#1c1c20', SIGN = '#f0a83a';
const SILVER = '#8496b4', RED = '#c8323a';   // the stripe's paints (the palette)

const P = (box, color, role = 'body', more) => (more ? { box, color, role, ...more } : { box, color, role });
/** a box and its mirror across the centre line: y from a to b (0 <= a < b) on the right, -b to -a on the left */
const pair = (x0, a, z1, x1, b, z2, color, role, more) => [P([x0, -b, z1, x1, -a, z2], color, role, more), P([x0, a, z1, x1, b, z2], color, role, more)];

// down each side: the windows (two at each end, three between the doors), the doors (a pair of narrow windows over a
// darker panel), all on the gasket strip
const WINDOWS = [[-38.6, -31.4], [-30, -22.8], [-10.8, -4.4], [-3.2, 3.2], [4.4, 10.8], [22.8, 30], [31.4, 38.6]];
const DOORS = [-16, 16];
const SIDE = [
  ...pair(-l + 2.6, w, ZB0, l - 2.6, w + .15, ZB1, GASKET, 'bumper'),
  ...WINDOWS.flatMap(([x0, x1]) => pair(x0, w + .15, 16, x1, w + .35, 23, LIT, 'trim')),
  ...DOORS.flatMap(x => [...pair(x - 3.5, w + .15, ZS1 + .2, x - .3, w + .35, 23.6, LIT, 'trim'), ...pair(x + .3, w + .15, ZS1 + .2, x + 3.5, w + .35, 23.6, LIT, 'trim'),
    ...pair(x - 4, w, ZU + .4, x + 4, w + .15, ZS0, DOOR, 'bumper')])];
/** an end's face (front: +1, back: -1): the cab windows either side of the lit door window, the route sign over them,
 *  the lamps (head or tail), the anticlimber and the coupler under it */
function end(s) {
  const x0 = s > 0 ? l : -l - .3, x1 = s > 0 ? l + .3 : -l, lamp = s > 0 ? ['#fff4c8', 'light'] : ['#8a1a1a', 'tail'];
  return [
    P([x0, -8.6, 16, x1, -3.2, 23.2], CABGLASS, 'trim'), P([x0, -2.4, 15.4, x1, 2.4, 23.8], LIT, 'trim'), P([x0, 3.2, 16, x1, 8.6, 23.2], CABGLASS, 'trim'),
    P([x0, -3.6, 24.6, x1, 3.6, 26.4], SIGN, 'trim'),
    ...pair(x0, 5, 8.2, x1, 8, 10.4, lamp[0], lamp[1]),
    P(s > 0 ? [l, -8.4, ZU, l + 1, 8.4, 7.6] : [-l - 1, -8.4, ZU, -l, 8.4, 7.6], UNDER, 'bumper'),
    P(s > 0 ? [l, -1.2, 4.2, l + 3, 1.2, ZU] : [-l - 3, -1.2, 4.2, -l, 1.2, ZU], UNDER, 'bumper')];
}
/** a bogie at x: its frame under the floor and two wheels each side */
const bogie = x => [P([x - 6, -7.4, 1.6, x + 6, 7.4, ZU], TRUCK, 'trim'),
  ...[-3, 3].flatMap(dx => pair(x + dx - 2, 7.4, 0, x + dx + 2, 8.3, 4, TYRE, 'wheel'))];

def('vehicleModels', 'thel', {
  name: 'The L', class: 'rail', length: L, width: W, height: H,
  parts: [
    // the shell, the roof on it (dipping into it), the crown and the ventilators
    P([-l, -w, ZU, l, w, ZE], STEEL, 'cabin'),
    P([-l + .6, -w + .6, ZE - .4, l - .6, w - .6, 28.8], ROOF, 'cabin'), P([-l + 2.4, -7.6, 28.8, l - 2.4, 7.6, 29.5], CROWN, 'cabin'),
    ...[-27, 0, 27].map(x => P([x - 4, -4.6, 29.5, x + 4, 4.6, 30.3], VENT, 'cabin')),
    // the stripe (the paint) down the sides and round the ends
    ...pair(-l, w, ZS0, l, w + .3, ZS1, SILVER), P([l, -w, ZS0, l + .3, w, ZS1], SILVER), P([-l - .3, -w, ZS0, -l, w, ZS1], SILVER),
    ...SIDE, ...end(1), ...end(-1),
    // under the floor: the equipment boxes and the bogies
    P([-23, -7.4, 3.4, 23, 7.4, ZU], UNDER, 'trim'), ...bogie(32), ...bogie(-32)],
  wheels: [],
  seats: [], doors: [],   // (AI only: never boarded)
  lights: { head: [[l, -6.5, 9.3], [l, 6.5, 9.3]], tail: [[-l, -6.5, 9.3], [-l, 6.5, 9.3]], siren: [] },
  about: 'A car of the L: a stainless box with a band of lit windows, two doors a side and a bogie at each end.',
});

def('vehicles', 'thel', {
  name: 'The L', model: 'thel', class: 'rail', role: 'special', seats: 0, radio: 'off', health: 9999, horn: 'none',
  palette: [SILVER, RED],
  handling: { cars: 2, carLength: 84, gap: 6, accel: 70, brake: 90, width: 20, height: 30 },
  spec: { top: 210, dwell: 5 },
  price: 0, tags: ['rail', 'ai'],
  about: 'Lowtown\'s elevated train: two cars round the loop above the central avenue. It stops for nobody between stations.',
});
