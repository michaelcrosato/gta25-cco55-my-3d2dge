// The Channel 6 SkyCam (PLAN.md 19's backlog, HANDOFF L4): the helicopter a player flies. The MPD Eye's airframe
// (eye.js) in the station's colours, cream with an orange belt, roof and boom, its light bar gone and its searchlight a
// camera ball under the chin, and a door each side for the pilot and the camera operator. It stands landed on Marquee
// Plaza's pad by the Hotel Marquee until flown: the stick yaws it, the pedals push it on and back, the shoulders climb
// (R1 / Space) and descend (L1 / Shift); let down slow over a street or a roof it settles there, and only on the ground is
// it got out of.
import { def, get } from '../../motor/index.js';
import './eye.js';

const NAVY = '#1e2a5c', WHITE = '#e8eaee', CREAM = '#ece6d6', ORANGE = '#ff7a1e', DARK = '#3a3c44';
const eye = get('vehicleModels', 'eye');
// (the Eye's parts recoloured: its navy body cream, its white trim orange; the light bar off the roof; the searchlight's
// lamp a dark lens)
const parts = eye.parts.filter(p => p.role !== 'siren').map(p => {
  const color = p.color === NAVY ? CREAM : p.color === WHITE && p.role !== 'rotor' ? ORANGE : p.role === 'light' ? DARK : p.color;
  return { ...p, color, role: p.role === 'light' ? 'trim' : p.role };
});
const w = eye.width / 2;

def('vehicleModels', 'skycam', {
  name: 'Channel 6 SkyCam', class: 'heli', length: eye.length, width: eye.width, height: eye.height, parts,
  wheels: [], seats: eye.seats,
  doors: [{ id: 'l', x: 6, y: -w - 6, side: -1, seat: 0 }, { id: 'r', x: 6, y: w + 6, side: 1, seat: 1 }],
  lights: { head: [], tail: eye.lights.tail, siren: [] },
  about: 'The news helicopter: the Eye\'s airframe in Channel 6\'s cream and orange, a camera ball under its chin.',
});

def('vehicles', 'skycam', {
  name: 'SkyCam', model: 'skycam', class: 'heli', role: 'civilian', seats: 2, radio: 'neon', health: 160, horn: 'none',
  palette: [CREAM, ORANGE],
  handling: { mass: 1700, top: 210, accel: 150, climb: 80, yawRate: 1.7, hoverZ: 120, ceiling: 300, landSpeed: 40, parked: true },
  spec: { top: 210, climb: 80 },
  price: 0, tags: ['heli', 'news'],
  about: 'Channel 6\'s helicopter, on the pad at Marquee Plaza: the one a player flies. It sets down on any street or roof.',
});
