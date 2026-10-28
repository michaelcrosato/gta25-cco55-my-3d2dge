// The Duster (EXPANSION.md 6, X2): a crop duster off Ironside Airstrip, a yellow biplane with a red belly: slow and
// forgiving, stalling under 70 u/s. It stands on the airstrip's apron by the hangar until flown: R2 the throttle, L2
// the brake, the stick steers it on the ground and banks it in the air, R1 climbs and L1 descends. It lifts off past
// 85 u/s with R1 held, and sets down level, under 125 u/s and gently, on the ground (a street, a yard, the runway).
// Crop Duster's and the Ironside Air Race's; Short Circuit and Blackout fly it.
import { def, planeParts } from '../../motor/index.js';

const YELLOW = '#e8c040', RED = '#c8423a';

def('vehicleModels', 'duster', {
  name: 'Duster', class: 'plane', length: 44, width: 56, height: 16, ...planeParts({ length: 44, width: 56, height: 16, biplane: true, color: YELLOW, wing: '#f0d860' }),
  about: 'A crop-dusting biplane: a yellow fuselage, two wings braced with struts, a tail wheel.',
});

// (handling's width: the fuselage's and the gear's, what it meets things with; its wings pass over a lamp or a car)
def('vehicles', 'duster', {
  name: 'Duster', model: 'duster', class: 'plane', role: 'civilian', seats: 2, radio: 'surf', health: 120, horn: 'none',
  palette: [YELLOW, RED],
  handling: { width: 14, mass: 900, top: 230, accel: 70, brake: 120, stall: 70, vr: 85, climb: 70, bankMax: .7, rollRate: 1.6, turnG: 360, taxiTurn: 1.4, taxiTop: 60, landSpeed: 125, landSink: 75, ceiling: 320, cruiseZ: 200 },
  spec: { top: 230, stall: 70, vr: 85, climb: 70 },
  price: 0, tags: ['plane', 'slow'],
  about: 'The crop duster on Ironside Airstrip\'s apron: the one plane a player flies off a runway.',
});
