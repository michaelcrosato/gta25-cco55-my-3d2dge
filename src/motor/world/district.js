// Districts and interiors (PLAN.md 8.3): def('districts', id, spec) from the game's content; landmarks register on their
// own (def('landmarks', id, { district, lots, pois, props })) so each one lives in its own file. buildCity(id, seed)
// gathers them and runs the builder: a CityMap with its street painter.
import { declare, get, all } from '../core/registry.js';
import { shape } from '../core/schema.js';
import { buildDistrict } from './builder.js';
import { SurfacePainter } from '../render/surface-paint.js';

declare('districts', shape({
  name: { type: 'string', req: true }, size: { type: 'array', req: true }, seed: { type: 'number', def: 1 }, storey: { type: 'number', def: 24 },
  hoods: { type: 'object', req: true }, hoodMap: { type: 'array', def: [] }, styles: { type: 'object', def: {} },
  water: { type: 'array', def: [] }, roads: { type: 'array', req: true }, decks: { type: 'array', def: [] }, walls: { type: 'array', def: [] },
  lots: { type: 'array', def: [] }, props: { type: 'object', def: {} }, propList: { type: 'array', def: [] }, pois: { type: 'array', def: [] }, zones: { type: 'array', def: [] },
}));
declare('landmarks', shape({ district: { type: 'string', req: true }, name: { type: 'string', req: true }, lots: { type: 'array', def: [] }, pois: { type: 'array', def: [] }, props: { type: 'array', def: [] } }));

/** build district id (its landmarks folded in) with a seed: a CityMap, with city.painter (a SurfacePainter) */
export function buildCity(id, seed) {
  const spec = get('districts', id); if (!spec) throw new Error('MOTOR: unknown district "' + id + '"');
  const marks = all('landmarks').filter(l => l.district === id);
  const full = { ...spec, lots: [...spec.lots, ...marks.flatMap(m => m.lots.map(l => ({ landmark: m.id, ...l })))], pois: [...spec.pois, ...marks.flatMap(m => m.pois.map(p => ({ landmark: m.id, ...p })))], propList: [...spec.propList, ...marks.flatMap(m => m.props)] };
  const city = buildDistrict(full, { seed: seed ?? spec.seed });
  city.painter = new SurfacePainter(city);
  return city;
}
