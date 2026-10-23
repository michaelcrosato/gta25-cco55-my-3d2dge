// The CityMap (PLAN.md 7.6): everything the builder makes from a district definition, around one engine TileMap.
//   - map: the TileMap (walls, heights, wall types, floor tags, blocked water; collision, sight, ISO walls). Its
//     whole-map floor bake is never used: FloorChunks paints the floor from the surface grid.
//   - surface: one surface per cell (SURFACES: asphalt, sidewalk, grass, water...); hood: one neighbourhood per cell;
//     lot: the building lot of each wall cell (the cut-away lowers a lot at a time).
//   - roads (with their bands and intersections), lots, decks (the Loop, the L, bridges' raised parts), props (lamps,
//     hydrants, trees...), pois, zones: the data every system reads (traffic, peds, police, missions, the radar).
// Plain data and lookups: it runs headless, and the simulation may read all of it.
export const SURFACES = ['lot', 'road', 'walk', 'curb', 'grass', 'dirt', 'water', 'deep', 'plaza', 'sand', 'alley', 'quay', 'pier', 'park', 'yard', 'rail', 'bridge',
  'marble', 'carpet', 'steel', 'concrete', 'sewer',   // (interiors' floors: PLAN.md 8.21)
  'wet', 'oil', 'ice'];   // (the Proving Ground's handling strips: PLAN.md 8.23)
export const SURF = Object.fromEntries(SURFACES.map((s, i) => [s, i]));
/** surfaces nobody walks on */
export const BLOCKING = new Set(['water', 'deep', 'sewer']);

export class CityMap {
  /** w, h: cells; T: the tile size (16) */
  constructor(w, h, T = 16) {
    this.w = w; this.h = h; this.T = T;
    this.surface = new Uint8Array(w * h); this.hood = new Uint8Array(w * h); this.lot = new Int32Array(w * h).fill(-1);
    this.hoods = []; this.roads = []; this.intersections = []; this.lots = []; this.decks = []; this.props = []; this.pois = []; this.zones = []; this.signs = [];
    this.map = null; this.seed = 0; this.id = '';
  }
  inside(cx, cy) { return cx >= 0 && cy >= 0 && cx < this.w && cy < this.h; }
  idx(cx, cy) { return cy * this.w + cx; }
  /** the surface name at a cell (or 'deep' outside) */
  surfaceAt(cx, cy) { return this.inside(cx, cy) ? SURFACES[this.surface[this.idx(cx, cy)]] : 'deep'; }
  /** the surface name under a world point */
  surfaceAtPoint(x, y) { return this.surfaceAt(Math.floor(x / this.T), Math.floor(y / this.T)); }
  setSurface(cx, cy, name) { if (this.inside(cx, cy)) this.surface[this.idx(cx, cy)] = SURF[name]; }
  /** fill a cell rectangle (inclusive) with a surface */
  fillSurface(x0, y0, x1, y1, name) { for (let y = Math.max(0, y0); y <= Math.min(this.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(this.w - 1, x1); x++) this.surface[y * this.w + x] = SURF[name]; }
  /** the neighbourhood spec at a cell, or null */
  hoodAt(cx, cy) { return this.inside(cx, cy) ? this.hoods[this.hood[this.idx(cx, cy)]] || null : null; }
  hoodAtPoint(x, y) { return this.hoodAt(Math.floor(x / this.T), Math.floor(y / this.T)); }
  /** a point of interest by id */
  poi(id) { return this.pois.find(p => p.id === id) || null; }
  /** the zones holding a world point */
  zonesAt(x, y) { const cx = x / this.T, cy = y / this.T; return this.zones.filter(z => cx >= z.rect[0] && cy >= z.rect[1] && cx < z.rect[2] + 1 && cy < z.rect[3] + 1); }
  /** the deck surface under (x, y) a body at height z can stand on (the highest deck top at or below z + step), or null */
  deckAt(x, y, z = 1e9, step = 6) {
    let best = null;
    for (const d of this.decks) { const s = d.heightAt(x, y); if (s !== null && s <= z + step && (!best || s > best.z)) best = { deck: d, z: s }; }
    return best;
  }
  /** is the cell walkable on foot at street level (no wall, no water)? */
  walkable(cx, cy) { return this.inside(cx, cy) && this.map.cell(cx, cy) === 0 && !BLOCKING.has(this.surfaceAt(cx, cy)); }
  /** the nearest cell walkable at street level to (cx, cy), searched outward ring by ring (itself if it is) */
  nearestWalkable(cx, cy, max = 12) {
    for (let r = 0; r <= max; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (this.walkable(cx + dx, cy + dy)) return [cx + dx, cy + dy];
    }
    return [cx, cy];
  }
  /** is the cell drivable at street level? Every open cell is (a car mounts the sidewalk and crosses the park, as in
   *  GTA2); traffic keeps to its lanes */
  drivable(cx, cy) { return this.walkable(cx, cy); }
}

/** a raised deck (an elevated road, a bridge's raised leaf, the L's track): slabs a tile square, each with its height
 *  at both ends (ramps slope), plus pillars. cells: [{ cx, cy, z0, z1, axis }]: the top runs from z0 at the cell's low
 *  edge along axis ('x' or 'y') to z1 at its high edge */
export class Deck {
  constructor(o) { Object.assign(this, { id: '', kind: 'road', width: 6, cells: [], pillars: [], thickness: 6, railing: true, lanes: 2 }, o); this._index = null; }
  _cellMap() {
    if (this._index) return this._index;
    const m = new Map(); for (const c of this.cells) m.set(c.cx + ',' + c.cy, c); return (this._index = m);
  }
  /** the deck's top under a world point, or null (off the deck) */
  heightAt(x, y) {
    const T = 16, cx = Math.floor(x / T), cy = Math.floor(y / T), c = this._cellMap().get(cx + ',' + cy); if (!c) return null;
    const f = c.axis === 'x' ? (x / T - cx) : (y / T - cy);
    return c.z0 + (c.z1 - c.z0) * f;
  }
}

/** a small stand-in for a CityMap over a plain TileMap (the Proving Ground's yards): the surface lookups, no decks,
 *  props or roads, so the systems that read a city (Fire, the Fleet) run on it. surfaceAt(cx, cy) -> a surface name */
export function standInCity(map, surfaceAt = () => 'road') {
  const T = map.T, w = map.w, h = map.h;
  const C = { w, h, T, map, decks: [], props: [], pois: [], zones: [], roads: [], lots: [], signs: [], hoods: [],
    surfaceAt: (cx, cy) => (cx < 0 || cy < 0 || cx >= w || cy >= h ? 'deep' : surfaceAt(cx, cy)),
    surfaceAtPoint: (x, y) => C.surfaceAt(Math.floor(x / T), Math.floor(y / T)),
    deckAt: () => null, hoodAt: () => null, hoodAtPoint: () => null, poi: () => null, zonesAt: () => [],
    inside: (cx, cy) => cx >= 0 && cy >= 0 && cx < w && cy < h,
    walkable: (cx, cy) => C.inside(cx, cy) && map.cell(cx, cy) === 0 && !BLOCKING.has(C.surfaceAt(cx, cy)),
    nearestWalkable: (cx, cy, max = 12) => { for (let r = 0; r <= max; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && C.walkable(cx + dx, cy + dy)) return [cx + dx, cy + dy]; return [cx, cy]; } };
  return C;
}
