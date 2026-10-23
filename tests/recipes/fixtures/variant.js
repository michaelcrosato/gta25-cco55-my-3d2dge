// The variant recipe's fixture (docs/CONTENT-GUIDE.md, "A variant of a model"), as src/game/vehicles/cortez-gt.js: a
// new definition on an existing model (the Cortez's, with no kit), tuned and painted its own way.
// tests/recipes/variant.test.mjs bundles it in.
import { def } from '../../motor/index.js';

def('vehicles', 'cortez-gt', {
  name: 'Cortez GT', model: 'cortez', class: 'car', role: 'civilian', seats: 4, radio: 'crash', health: 100, horn: 'car',
  palette: ['#1e1e24', '#c8c8d0'],
  handling: { mass: 1250, top: 285, accel: 165, brake: 700, grip: 490, drift: .3, steer: .58, drive: 'rwd' },
  spec: { t200: 2.0, top: 285, brake200: 38 },
  spawn: { zones: ['neon'], weight: 1, timeOfDay: ['night'] }, price: 0, tags: ['sedan', 'rare'],
  about: 'The Cortez with the big motor and the stiff springs: black or silver, and never at the lights for long.',
});
