// The Cortez (PLAN.md 9.6): Lowtown's everyday sedan, the car a player steals most. Its model carries two kits for its
// variants (the Retiree's wagon roof, the Fed Sedan's hidden lights), and its handling is the baseline the other cars
// are tuned against; the spec numbers are what the handling suite holds it to. This file is the template the other
// vehicles follow: a model (sizes, parts from a builder, kits), then the definitions that use it.
import { def, carParts } from '../../motor/index.js';

const L = 58, W = 26, H = 22, cabin = .45, cabinAt = -.08;
const base = carParts({ length: L, width: W, height: H, cabin, cabinAt, style: 'sedan', wheel: 6 });
const body = H * .55, cl = L * cabin, cx = L * cabinAt;
def('vehicleModels', 'cortez', {
  name: 'Cortez', class: 'car', length: L, width: W, height: H, ...base,
  kits: {
    // the Retiree: the glass and roof run on to the tailgate (a wagon), a roof rack
    wagon: { parts: [
      { box: [-L / 2 + 2, -W / 2 + 2, body, cx - cl / 2 + .5, W / 2 - 2, H], color: '#3a4a5a', role: 'glass' },
      { box: [-L / 2 + 3, -W / 2 + 3, H - 1, cx - cl / 2 + 2, W / 2 - 3, H + .5], color: '#d8d0c0', role: 'cabin' },
      { box: [-L / 2 + 6, -W / 2 + 4, H + .5, cx + cl / 2 - 6, -W / 2 + 5, H + 2], color: '#8a8a92', role: 'trim' },
      { box: [-L / 2 + 6, W / 2 - 5, H + .5, cx + cl / 2 - 6, W / 2 - 4, H + 2], color: '#8a8a92', role: 'trim' }] },
    // the Fed Sedan: lights behind the grille and the windscreen (a siren with no bar), a whip aerial, steel wheels
    fed: { parts: [
      { box: [cx + cl / 2 - 3, -6, body + 1, cx + cl / 2 - 1, -1, body + 3], color: '#c82a2a', role: 'siren' },
      { box: [cx + cl / 2 - 3, 1, body + 1, cx + cl / 2 - 1, 6, body + 3], color: '#2a5ac8', role: 'siren' },
      { box: [-L / 2 + 4, W / 2 - 4, H - 1, -L / 2 + 5, W / 2 - 3, H + 9], color: '#1a1a20', role: 'trim' }],
    lights: { siren: [[cx + cl / 2 - 2, 0, body + 2]] } },
  },
  about: 'A four-door family sedan: soft springs, a big bench seat, rear-wheel drive.',
});

def('vehicles', 'cortez', {
  name: 'Cortez', model: 'cortez', class: 'car', role: 'civilian', seats: 4, radio: 'neon', health: 100, horn: 'car',
  palette: ['#c8423a', '#3a6ac8', '#d8c8a0', '#3a8a5a', '#2a2a30', '#e0e0e4', '#c88a2a'],
  handling: { mass: 1200, top: 260, accel: 150, brake: 640, grip: 460, drift: .32, steer: .55, drive: 'rwd' },
  spec: { t200: 2.4, top: 260, brake200: 41 },
  spawn: { zones: ['palm', 'neon', 'brick', 'harbor'], weight: 6, timeOfDay: ['day', 'night'] }, price: 0, tags: ['sedan', 'common'],
});
