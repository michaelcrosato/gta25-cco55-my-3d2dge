// A district's fleet (PLAN.md 8.8, 9.6): what stands where when the world loads. def('fleets', id, spec) from the
// game's content:
//   { district, curb: { every (cells between spots), chance, roles, classes },
//     spots: [{ def, near (a point of interest's id) | at: [cx, cy], kit, color, n }],
//     water: [{ def, at: [cx, cy], heading }], rail: [{ deck, def, trains, gauge }],
//     air: [{ def, patrol: [[cx, cy], ...], alt }] }
// Curb parking walks each street's two outer lanes (right-hand traffic: a parked car sits against the curb facing its
// lane's way), every `every` cells, clear of intersections and crosswalks, and parks a definition chosen by weight from
// those whose spawn.zones hold the neighbourhood (a seeded pick: the same city parks the same cars). Spots put the
// landmarks' own vehicles at the curb nearest them (cruisers at the precinct); boats moor on the water; the L's line is
// built from its deck (a loop: down one track, back up the other) with a stop at each station on both; the heli flies
// its patrol with its searchlight sweeping ahead.
//   spawnFleet(fleet, city, get('fleets', 'lowtown'), seed) -> { parked, spots, boats, trains, helis }
import { E } from '../engine.js';
import { declare, all, get } from '../core/registry.js';
import { shape } from '../core/schema.js';

declare('fleets', shape({
  district: { type: 'string', req: true }, curb: { type: 'object', def: {} }, spots: { type: 'array', def: [] },
  water: { type: 'array', def: [] }, rail: { type: 'array', def: [] }, air: { type: 'array', def: [] },
}));
const HEADINGS = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2 };

/** a parked spot on a road's curb lane at cell (cx, cy) of side (-1: the west or north lane, 1: the east or south): a
 *  car of half width hw against the curb, facing its lane's way */
export function laneSpot(road, side, cx, cy, T = 16, hw = 13) {
  if (road.axis === 'y') return { x: side > 0 ? (road.band[2] + 1) * T - hw - 3 : road.band[0] * T + hw + 3, y: (cy + .5) * T, heading: side > 0 ? -Math.PI / 2 : Math.PI / 2, road, side };
  return { x: (cx + .5) * T, y: side > 0 ? (road.band[3] + 1) * T - hw - 3 : road.band[1] * T + hw + 3, heading: side > 0 ? 0 : Math.PI, road, side };
}
/** the curb spot nearest a cell (on any street or avenue) */
export function curbSpot(city, cx, cy, hw = 13) {
  let best = null, bd = Infinity;
  for (const r of city.roads) {
    if (r.kind === 'alley') continue;
    const [x0, y0, x1, y1] = r.band;
    for (const side of [-1, 1]) {
      const lx = r.axis === 'y' ? (side < 0 ? x0 : x1) : E.clamp(cx, x0, x1), ly = r.axis === 'y' ? E.clamp(cy, y0, y1) : (side < 0 ? y0 : y1), d = Math.hypot(lx - cx, ly - cy);
      if (d < bd && !busyNear(city, r, lx, ly)) { bd = d; best = laneSpot(r, side, lx, ly, city.T, hw); }
    }
  }
  return best;
}
// an intersection or a crosswalk within two cells along the road (no parking there)
function busyNear(city, r, cx, cy) {
  for (let k = -2; k <= 2; k++) { const x = r.axis === 'y' ? cx : cx + k, y = r.axis === 'y' ? cy + k : cy; if (city.inside(x, y) && city.busy && city.busy[city.idx(x, y)]) return true; }
  const s = city.surfaceAt(cx, cy); return s === 'bridge' || s === 'water' || s === 'deep';
}

/** park and set going a district's fleet in a Fleet. Returns the counts */
export function spawnFleet(fleet, city, spec, seed = 1) {
  const rng = E.rng(seed * 7919 + 17), out = { parked: 0, spots: 0, boats: 0, trains: 0, helis: 0 }, T = city.T;
  const C = spec.curb || {}, every = C.every || 6, chance = C.chance ?? .3, roles = C.roles || ['civilian'], classes = C.classes || ['car', 'bike'];
  const pool = all('vehicles').filter(d => d.spawn && d.spawn.zones && (d.spawn.weight || 0) > 0 && roles.includes(d.role) && classes.includes(d.class || (get('vehicleModels', d.model) || {}).class));
  const noSpawn = city.zones.filter(z => z.kind === 'noSpawn');
  const pick = hood => { const c = pool.filter(d => d.spawn.zones.includes(hood)); if (!c.length) return null; let w = c.reduce((a, d) => a + d.spawn.weight, 0) * rng(); for (const d of c) { w -= d.spawn.weight; if (w <= 0) return d; } return c[c.length - 1]; };
  const taken = [];   // (the boxes already parked: a new one may not overlap any, with a little room between)
  const free = (x, y, h, hl, hw) => !taken.some(q => { const c = Math.cos(q.h), s = Math.sin(q.h), dx = x - q.x, dy = y - q.y, a = Math.abs(dx * c + dy * s), b = Math.abs(-dx * s + dy * c), same = Math.abs(Math.sin(h - q.h)) < .5;
    return same ? a < q.hl + hl + 6 && b < q.hw + hw + 2 : a < q.hl + hw + 6 && b < q.hw + hl + 6; });
  const size = d => { const m = get('vehicleModels', d.model); return m ? [m.length / 2, m.width / 2] : [29, 13]; };
  // the landmarks' own vehicles first
  for (const sp of spec.spots) {
    const poi = sp.near ? city.poi(sp.near) : null, at = poi ? [Math.floor(poi.x / T), Math.floor(poi.y / T)] : sp.at; if (!at) continue;
    const d = get('vehicles', sp.def); if (!d) continue;
    const [hl, hw] = size(d), base = curbSpot(city, at[0], at[1], hw); if (!base) continue;
    for (let i = 0; i < (sp.n || 1); i++) {
      const L = hl * 2 + 10, x = base.x - Math.cos(base.heading) * L * i, y = base.y - Math.sin(base.heading) * L * i;
      if (!free(x, y, base.heading, hl, hw)) continue;
      fleet.spawn(sp.def, x, y, base.heading, { color: sp.color || d.palette[i % d.palette.length], kit: sp.kit, locked: sp.locked });
      taken.push({ x, y, h: base.heading, hl, hw }); out.spots++;
    }
  }
  // the curbs
  for (const r of city.roads) {
    if (r.kind === 'alley') continue;
    const [x0, y0, x1, y1] = r.band, from = r.axis === 'y' ? y0 : x0, to = r.axis === 'y' ? y1 : x1;
    for (const side of [-1, 1]) for (let k = from + 3; k <= to - 3; k += every) {
      const cx = r.axis === 'y' ? (side < 0 ? x0 : x1) : k, cy = r.axis === 'y' ? k : (side < 0 ? y0 : y1);
      if (rng() >= chance || busyNear(city, r, cx, cy)) continue;
      if (noSpawn.some(z => cx >= z.rect[0] && cx <= z.rect[2] && cy >= z.rect[1] && cy <= z.rect[3])) continue;
      const hood = city.hoodAt(cx, cy), d = pick(hood ? hood.id : ''); if (!d) continue;
      const [hl, hw] = size(d), s = laneSpot(r, side, cx, cy, T, hw);
      if (!free(s.x, s.y, s.heading, hl, hw)) continue;
      fleet.spawn(d.id, s.x, s.y, s.heading, { color: d.palette[Math.floor(rng() * d.palette.length)] });
      taken.push({ x: s.x, y: s.y, h: s.heading, hl, hw }); out.parked++;
    }
  }
  // boats on the water
  for (const w of spec.water) { if (!get('vehicles', w.def)) continue; fleet.spawn(w.def, (w.at[0] + .5) * T, (w.at[1] + .5) * T, typeof w.heading === 'string' ? HEADINGS[w.heading] : w.heading || 0, { color: w.color }); out.boats++; }
  // the L: a loop along its deck, a stop at every station on both tracks
  for (const R of spec.rail) {
    const deck = city.decks.find(d => d.id === R.deck), d = get('vehicles', R.def); if (!deck || !d || !deck.path || deck.path.length < 2) continue;
    const g = R.gauge || 10, pts = deck.path.map(([cx, cy]) => [(cx + .5) * T, (cy + .5) * T]);
    const side = (k, s) => pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [p[0] - dy / l * s * k, p[1] + dx / l * s * k]; });
    const right = side(1, g), left = side(-1, g).reverse(), loop = [...right, ...left];
    const stations = [];
    for (const st of deck.stations || []) { const mx = (st.rect[0] + st.rect[2] + 1) / 2 * T, my = (st.rect[1] + st.rect[3] + 1) / 2 * T; stations.push({ name: st.name, at: nearestOn(right, mx, my) }, { name: st.name, at: nearestOn(left, mx, my) }); }
    const line = fleet.addLine({ points: loop, z: deck.z, radius: g, stations }, []);
    const n = R.trains || 1;
    for (let i = 0; i < n; i++) fleet.addTrains(line, [{ ...d.handling, top: d.spec.top, dwell: d.spec.dwell, s: line.length * i / n + 200, id: R.def + '-' + i }]);
    line.def = d; out.trains += n;
  }
  // the heli: its patrol, the searchlight sweeping the street ahead
  for (const A of spec.air) {
    const d = get('vehicles', A.def); if (!d || !A.patrol || !A.patrol.length) continue;
    const P = A.patrol.map(([cx, cy]) => [(cx + .5) * T, (cy + .5) * T]), v = fleet.spawn(A.def, P[0][0], P[0][1], 0);
    v.body.z = A.alt || v.body.h.hoverZ; let wp = 1, sweep = 0;
    v.ai = (dt, me) => {
      const [tx, ty] = P[wp % P.length]; if (Math.hypot(tx - me.x, ty - me.y) < 60) wp++;
      sweep += dt; const h = me.heading, ahead = 70, s = Math.sin(sweep * .9) * 60;
      return { to: P[wp % P.length], alt: A.alt, spot: [me.x + Math.cos(h) * ahead - Math.sin(h) * s, me.y + Math.sin(h) * ahead + Math.cos(h) * s] };
    };
    out.helis++;
  }
  return out;
}
function nearestOn(pts, x, y) { let best = pts[0], bd = Infinity; for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, f = E.clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l2, 0, 1), p = [a[0] + dx * f, a[1] + dy * f], d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = p; } } return best; }
