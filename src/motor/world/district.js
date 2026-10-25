// Districts and interiors (PLAN.md 8.3): def('districts', id, spec) from the game's content; landmarks register on their
// own (def('landmarks', id, { district, lots, pois, props })) so each one lives in its own file. buildCity(id, seed)
// gathers them and runs the builder: a CityMap with its street painter.
import { declare, get, all } from '../core/registry.js';
import { shape } from '../core/schema.js';
import { buildDistrict, buildInterior as buildRooms } from './builder.js';
import { SurfacePainter } from '../render/surface-paint.js';

declare('districts', shape({
  name: { type: 'string', req: true }, size: { type: 'array', req: true }, seed: { type: 'number', def: 1 }, storey: { type: 'number', def: 24 },
  hoods: { type: 'object', req: true }, hoodMap: { type: 'array', def: [] }, styles: { type: 'object', def: {} },
  water: { type: 'array', def: [] }, roads: { type: 'array', req: true }, decks: { type: 'array', def: [] }, walls: { type: 'array', def: [] },
  lots: { type: 'array', def: [] }, props: { type: 'object', def: {} }, propList: { type: 'array', def: [] }, pois: { type: 'array', def: [] }, zones: { type: 'array', def: [] },
  tour: { type: 'array', def: [] }, drawbridges: { type: 'array', def: [] },
  /** pickups placed in the district: [{ kind, item, amount, at: [cx, cy], respawn }] (each lands on the nearest open cell) */
  pickups: { type: 'array', def: [] },
}));
/** an interior (PLAN.md 5.4, 8.21): its rooms as block ASCII (builder.js buildInterior), the doors it is entered by
 *  (doors: [{ id, from (the city's door poi), at: [cx, cy] (the cell inside it, where one comes in) }]), its guards
 *  ([{ arch, at, route: [[cx, cy]...], facing }]), its CCTV ([{ at, z, facing, sweep, period, range, fov }]), its lights
 *  ([{ at, radius, color }]), its music, its patrons (bodies posed where they stand: [{ arch, at, clip, pose, facing }]: a
 *  club's dancers) and its spots (a marked cell the player does something at: [{ id, mark, label }]: a club's arcade
 *  cabinet) */
declare('interiors', shape({
  name: { type: 'string', req: true }, blocks: { type: 'array', req: true }, legend: { type: 'object', req: true }, types: { type: 'object', req: true },
  floor: { type: 'string', def: 'concrete' }, rooms: { type: 'array', def: [] }, pois: { type: 'array', def: [] }, doors: { type: 'array', def: [] },
  guards: { type: 'array', def: [] }, cameras: { type: 'array', def: [] }, lights: { type: 'array', def: [] }, music: { type: 'string', def: '' }, seed: { type: 'number', def: 1 },
  patrons: { type: 'array', def: [] }, spots: { type: 'array', def: [] },
}));
declare('landmarks', shape({ district: { type: 'string', req: true }, name: { type: 'string', req: true }, lots: { type: 'array', def: [] }, pois: { type: 'array', def: [] }, props: { type: 'array', def: [] }, decks: { type: 'array', def: [] } }));

/** build district id (its landmarks folded in) with a seed: a CityMap, with city.painter (a SurfacePainter) */
export function buildCity(id, seed) {
  const spec = get('districts', id); if (!spec) throw new Error('MOTOR: unknown district "' + id + '"');
  const marks = all('landmarks').filter(l => l.district === id);
  const full = { ...spec, lots: [...spec.lots, ...marks.flatMap(m => m.lots.map(l => ({ landmark: m.id, ...l })))], pois: [...spec.pois, ...marks.flatMap(m => m.pois.map(p => ({ landmark: m.id, ...p })))], propList: [...spec.propList, ...marks.flatMap(m => m.props)], decks: [...spec.decks, ...marks.flatMap(m => m.decks || [])] };   // (a landmark's decks after the district's own: a stunt's ramps)
  const city = buildDistrict(full, { seed: seed ?? spec.seed });
  city.painter = new SurfacePainter(city);
  city.pickupSpots = spec.pickups.map(p => { const [cx, cy] = city.nearestWalkable(p.at[0], p.at[1]); return { ...p, x: (cx + .5) * city.T, y: (cy + .5) * city.T }; });
  return city;
}

/** build interior id: a CityMap, with city.painter (a SurfacePainter), its doors and marks */
export function buildInterior(id, seed) {
  const spec = get('interiors', id); if (!spec) throw new Error('MOTOR: unknown interior "' + id + '"');
  const C = buildRooms(spec, { seed: seed ?? spec.seed });
  C.painter = new SurfacePainter(C);
  return C;
}
