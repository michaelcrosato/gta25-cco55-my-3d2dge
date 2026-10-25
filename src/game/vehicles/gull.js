// The Gull (EXPANSION.md 6, X2): the Yacht Club's seaplane, white with a navy stripe, on floats: it takes off from the
// water and sets down on it, and on dry land its floats barely slide. Faster than the Duster and less forgiving
// (stalling under 80). Its moorings are the Yacht Club's pier in Glass Heights (X5); The Gull and House Edge fly it.
import { def, planeParts } from '../../motor/index.js';

const WHITE = '#eceef2', NAVY = '#1e2a5c';

def('vehicleModels', 'gull', {
  name: 'Gull', class: 'plane', length: 50, width: 64, height: 18, ...planeParts({ length: 50, width: 64, height: 18, floats: true, high: true, color: WHITE, wing: NAVY }),
  about: 'A high-winged seaplane on two floats: white, a navy wing.',
});

// (handling's width: the fuselage's and the gear's, what it meets things with; its wings pass over a lamp or a car)
def('vehicles', 'gull', {
  name: 'Gull', model: 'gull', class: 'plane', role: 'special', seats: 2, radio: 'velvet', health: 140, horn: 'none',
  palette: [WHITE, NAVY],
  handling: { width: 16, mass: 1300, top: 260, accel: 62, brake: 80, stall: 80, vr: 95, climb: 65, bankMax: .6, rollRate: 1.3, turnG: 340, taxiTurn: 1.1, taxiTop: 50, landSpeed: 140, landSink: 70, ceiling: 320, cruiseZ: 200, water: true },
  spec: { top: 260, stall: 80, vr: 95, climb: 65 },
  price: 0, tags: ['plane', 'seaplane'],
  about: 'The Yacht Club\'s seaplane: off and onto the water only.',
});
