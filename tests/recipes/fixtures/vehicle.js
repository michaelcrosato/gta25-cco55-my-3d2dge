// The vehicle recipe's fixture (docs/CONTENT-GUIDE.md, "A vehicle"), as src/game/vehicles/pug.js: a model of its own
// and the definition that drives it. Nothing else is edited: the build finds the file, the fleet spawns it, the
// handling suite measures it against its own spec. tests/recipes/vehicle.test.mjs bundles it in.
import { def, carParts } from '../../motor/index.js';

const L = 50, W = 24, H = 20;
def('vehicleModels', 'pug', {
  name: 'Pug', class: 'car', length: L, width: W, height: H,
  ...carParts({ length: L, width: W, height: H, cabin: .5, cabinAt: -.12, wheel: 5.5, style: 'coupe' }),
  about: 'A short two-door hatchback.',
});
def('vehicles', 'pug', {
  name: 'Pug', model: 'pug', class: 'car', role: 'civilian', seats: 4, radio: 'neon', health: 90, horn: 'car',
  palette: ['#e0b020', '#3a8a5a', '#c8423a'],
  handling: { mass: 950, top: 230, accel: 150, brake: 620, grip: 450, drift: .3, steer: .6, drive: 'fwd' },
  spec: { t200: 3.1, top: 230, brake200: 42 },   // (measured: what the handling suite holds it to)
  spawn: { zones: ['palm', 'brick'], weight: 2, timeOfDay: ['day', 'night'] }, price: 0, tags: ['hatch'],
  about: 'A two-door hatchback the size of a shopping trolley: it parks anywhere and outruns nothing.',
});
