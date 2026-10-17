// Vehicle definitions (PLAN.md 8.8, 9.6): def('vehicles', id, spec) from the game's content. A definition names its
// model (a 'vehicleModels' id) and, for a variant, the model's kit; its class (the model's by default); its handling
// (HANDLING overrides for the class's body); its paint, role, health and seats; and the numbers its class's handling
// test holds it to (spec). Variants (the Retiree, the Fed Sedan) are definitions that reuse a model with their own kit,
// paint, handling and role. M4 changed `model` from a size object to a model id (DECISIONS D15).
//   spec, by class: car, truck, tow, bike { t200 (s, 0 to 200 u/s; or t100 for the slow ones), top (u/s), brake200 (u,
//   dry, from 200; brake100 from 100) }; boat { t100, top } on water; heli { climb (u/s), top }; rail { top, dwell }.
import { declare, get, all } from '../../core/registry.js';
import { shape } from '../../core/schema.js';
import { VehicleBody } from './body.js';
import { CLASSES, vehicleModel, modelWithKit } from './model.js';
import { BoatBody } from './boat.js';
import { HeliBody } from './heli.js';

export const ROLES = ['civilian', 'police', 'medic', 'fire', 'gang', 'service', 'special'];
declare('vehicles', shape({
  name: { type: 'string', req: true },
  model: { type: 'string', req: true }, kit: { type: 'string', def: '' },
  class: { type: 'string', oneOf: CLASSES, def: null },
  handling: { type: 'object', def: {} },
  palette: { type: 'array', def: ['#c8423a'] },
  role: { oneOf: ROLES, def: 'civilian' },
  health: { type: 'number', def: 100, min: 1 },
  /** a factor on the damage it takes (armour: the Strongbox's .4; the Boom Box's armour mod multiplies health) */
  toughness: { type: 'number', def: 1, min: .05, max: 4 },
  seats: { type: 'number', def: 0, min: 0, max: 8 },
  radio: { type: 'string', def: 'neon' },
  /** locked: breaking in takes a moment and raises heat (police cars) */
  locked: { type: 'boolean', def: false },
  siren: { type: 'boolean', def: false },
  horn: { oneOf: ['car', 'truck', 'bike', 'boat', 'none'], def: 'car' },
  /** a turret or tool it carries: 'cannon' (the Pumper's water cannon) | 'hook' (the Hookline) | '' */
  tool: { type: 'string', def: '' },
  spec: { type: 'object', def: {} },
  /** where it spawns parked or in traffic (M5): { zones: [hood ids], weight, timeOfDay: ['day' | 'night' ...] } */
  spawn: { type: 'object', def: {} },
  price: { type: 'number', def: 0, min: 0 },
  tags: { type: 'array', def: [] },
  about: { type: 'string', def: '' },
}));

/** a vehicle definition by id (throws on an unknown one: content asks for real vehicles) */
export function vehicleDef(id) { const d = get('vehicles', id); if (!d) throw new Error('MOTOR: unknown vehicle "' + id + '": ' + all('vehicles').map(v => v.id).join(', ')); return d; }
/** a definition's class: its own, else its model's */
export function classOf(d) { return d.class || vehicleModel(d.model).class; }
/** a definition's model with its kit folded in */
export function modelOf(d) { return modelWithKit(d.model, d.kit); }
/** a body for a definition: the class's body (cars, trucks, tow trucks and bikes share the tyre model; boats, helis
 *  their own), with the model's sizes and the definition's handling. Rail cars are placed by their line (rail.js) */
export function makeBody(id, x, y, heading = 0) {
  const d = vehicleDef(id), m = vehicleModel(d.model), cls = classOf(d);
  const spec = Object.assign({ length: m.length, width: m.width, height: m.height }, d.handling);
  const B = cls === 'boat' ? BoatBody : cls === 'heli' ? HeliBody : VehicleBody;
  const b = new B(spec, x, y, heading); b.def = d; b.cls = cls; return b;
}
export { CLASSES };
