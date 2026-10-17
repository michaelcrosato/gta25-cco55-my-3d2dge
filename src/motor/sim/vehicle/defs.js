// Vehicle definitions (PLAN.md 8.8, 9.6): def('vehicles', id, spec) from the game's content. A definition names its
// class, its handling (HANDLING overrides for the body), its model (carModel's sizes and colours), and the numbers its
// handling tests hold it to (spec: t200, the seconds from 0 to 200 u/s; top, u/s; brake200, the stopping distance from
// 200 u/s on dry asphalt, units). Variants (the Retiree, the Fed Sedan) are definitions that reuse a model with their
// own paint, handling and role.
import { declare, get, all } from '../../core/registry.js';
import { shape } from '../../core/schema.js';
import { VehicleBody } from './body.js';

declare('vehicles', shape({
  name: { type: 'string', req: true },
  class: { oneOf: ['car', 'truck', 'tow', 'bike', 'boat', 'heli', 'rail'], def: 'car' },
  handling: { type: 'object', def: {} },
  model: { type: 'object', def: {} },
  palette: { type: 'array', def: ['#c8423a'] },
  role: { oneOf: ['civilian', 'police', 'medic', 'fire', 'gang', 'service', 'special'], def: 'civilian' },
  health: { type: 'number', def: 100, min: 1 },
  seats: { type: 'number', def: 4, min: 1, max: 8 },
  radio: { type: 'string', def: 'neon' },
  spec: { type: 'object', def: {} },
  tags: { type: 'array', def: [] },
}));

/** a vehicle definition by id (throws on an unknown one: content asks for real vehicles) */
export function vehicleDef(id) { const d = get('vehicles', id); if (!d) throw new Error('MOTOR: unknown vehicle "' + id + '": ' + all('vehicles').map(v => v.id).join(', ')); return d; }
/** a body for a definition: its handling, the sizes from its model */
export function makeBody(id, x, y, heading = 0) {
  const d = vehicleDef(id), m = d.model;
  const b = new VehicleBody(Object.assign({}, m.length && { length: m.length }, m.width && { width: m.width }, m.height && { height: m.height }, d.handling), x, y, heading);
  b.def = d; return b;
}
