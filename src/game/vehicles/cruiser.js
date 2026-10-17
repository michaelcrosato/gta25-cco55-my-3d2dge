// The MPD Cruiser (PLAN.md 9.6): Motopolis PD's patrol car, the car that comes for you at one star. A full-size sedan
// in black and white (the paint is the black; the doors and the roof are white), a light bar on the roof (red on the
// left, blue on the right), a push bar on the nose. Locked: breaking into one takes a moment and raises the heat.
import { def, carParts } from '../../motor/index.js';

const L = 60, W = 27, H = 22, wheel = 6, cabin = .44, cabinAt = -.06;
const WHITE = '#e8e8ec', BAR = '#3a3a44';
const base = carParts({ length: L, width: W, height: H, cabin, cabinAt, wheel, style: 'police', roof: WHITE, trim: '#b8b8c2' });
const hl = L / 2, hw = W / 2, body = H * .55, cl = L * cabin, cx = L * cabinAt;
const P = (box, color, role = 'body') => ({ box, color, role });
// The white doors. The renderer paints boxes in role order, not by depth, so a door is a thin skin on the flank plus a
// strip along the top of the door beside the glass, both kept well inside the glass's length: the glass, drawn after
// them, then covers the far door's inner face whenever the far side is the one in view.
const d0 = cx - cl / 2 + 4, d1 = cx + cl / 2 - 4.5, dz = body - 6;
const doors = [-1, 1].flatMap(s => [
  P([d0, s < 0 ? -hw - .35 : hw, dz, d1, s < 0 ? -hw : hw + .35, body], WHITE, 'trim'),
  P([d0, s < 0 ? -hw : hw - 2, body, d1, s < 0 ? -hw + 2 : hw, body + .25], WHITE, 'trim')]);
// The push bar: a low bar ahead of the bumper, two uprights and a top rail, between the head lamps. Kept low and
// dark, with a dark front bumper behind it: what stands ahead of the nose shows through the hood when the car is seen
// from behind, and dark on the black hood it hardly shows. (The rear bumper stays light: from above, the bright end
// is the back.)
const front = p => p.role === 'bumper' && p.box[0] > 0 ? { ...p, color: '#26262c' } : p;
const push = [P([hl + 1, -8.5, wheel * .4, hl + 3.5, 8.5, wheel * .4 + 2.2], BAR, 'trim'),
  ...[-1, 1].map(s => P([hl + 1.2, s < 0 ? -6.5 : 4, wheel * .4, hl + 3.2, s < 0 ? -4 : 6.5, body - 2.5], BAR, 'trim')),
  P([hl + 1.5, -6.5, body - 4.3, hl + 3.2, 6.5, body - 2.5], BAR, 'trim')];
def('vehicleModels', 'cruiser', {
  name: 'MPD Cruiser', class: 'car', length: L, width: W, height: H, ...base,
  parts: [...base.parts.map(front), ...doors, ...push],
  about: 'Motopolis PD\'s black-and-white: a big sedan with a light bar, a push bar and a locked door.',
});

def('vehicles', 'cruiser', {
  name: 'MPD Cruiser', model: 'cruiser', class: 'car', role: 'police', seats: 4, radio: 'lowdown', health: 150, toughness: .85,
  locked: true, siren: true, horn: 'car',
  palette: ['#1c1c22', '#1a2440'],
  handling: { mass: 1500, top: 305, accel: 140, brake: 760, grip: 500, drift: .3, steer: .52, drive: 'rwd', wheelbase: L * .62 },   // (the model's axles)
  spec: { t200: 2.1, top: 305, brake200: 38 },
  spawn: { zones: ['palm', 'neon', 'brick', 'harbor'], weight: 1, timeOfDay: ['day', 'night'] }, price: 0, tags: ['police', 'sedan'],
  about: 'The MPD patrol car: heavier than a Cortez and faster, with a bar on the nose for pushing you off the road.',
});
