// A district's fleet (PLAN.md 8.8, 9.6): what stands where when the world loads. def('fleets', id, spec) from the
// game's content:
//   { district, curb: { every (cells between spots), chance, roles, classes },
//     spots: [{ def, near (a point of interest's id) | at: [cx, cy], kit, color, n }],
//     water: [{ def, at: [cx, cy], heading }], pads: [{ def, at: [cx, cy], heading }] (a heli landed there), rail: [{ deck, def, trains, gauge }],
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
  water: { type: 'array', def: [] }, pads: { type: 'array', def: [] }, rail: { type: 'array', def: [] }, air: { type: 'array', def: [] }, traffic: { type: 'object', def: {} }, crowd: { type: 'object', def: {} },
}));
const HEADINGS = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2 };

/** a parked spot on a road's curb lane at cell (cx, cy) of side (-1: the west or north lane, 1: the east or south): a
 *  car of half width hw against the curb, facing its lane's way (a street is parked on one side only: curbSides) */
export function laneSpot(road, side, cx, cy, T = 16, hw = 13) {
  const inset = road.kind === 'avenue' ? 3 : 2;   // (from the curb to the car's side)
  if (road.axis === 'y') return { x: side > 0 ? (road.band[2] + 1) * T - hw - inset : road.band[0] * T + hw + inset, y: (cy + .5) * T, heading: side > 0 ? -Math.PI / 2 : Math.PI / 2, road, side };
  return { x: (cx + .5) * T, y: side > 0 ? (road.band[3] + 1) * T - hw - inset : road.band[1] * T + hw + inset, heading: side > 0 ? 0 : Math.PI, road, side };
}
/** does anything stand inside a box parked at (x, y) facing h, up to its height: a lamp, a palm, a bin, a pillar, or the
 *  low end of a ramp it would sit under? (A deck wholly above its roof, or a curb, is no bar) */
export function blockedSpot(city, x, y, h, hl, hw, height = 24) {
  const map = city.map; if (!map || !map.solidsNear) return false;
  const c = Math.cos(h), s = Math.sin(h);
  for (const q of map.solidsNear(x, y, hl + 8)) {
    if (q.z >= height + 2 || q.top <= 4) continue;
    const dx = q.x - x, dy = q.y - y, a = Math.abs(dx * c + dy * s), b = Math.abs(-dx * s + dy * c), r = Math.max(q.hx, q.hy) + 1.5;
    if (a < hl + r && b < hw + r) return true;
  }
  for (const [ox, oy] of [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw], [0, 0]]) { const px = x + ox * c - oy * s, py = y + ox * s + oy * c; if (map.cell(Math.floor(px / city.T), Math.floor(py / city.T)) !== 0) return true; }   // (no corner in a wall)
  return false;
}
/** are a parked box's corners and middle all on the road (not the sidewalk past a road's end, a lot, the water) and out
 *  of the junctions' boxes? */
export function onRoad(city, x, y, h, hl, hw) {
  const c = Math.cos(h), s = Math.sin(h), T = city.T;
  for (const [ox, oy] of [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw], [0, 0], [hl, 0], [-hl, 0]]) {
    const cx = Math.floor((x + ox * c - oy * s) / T), cy = Math.floor((y + ox * s + oy * c) / T);
    if (city.surfaceAt(cx, cy) !== 'road' || (city.busy && city.inside(cx, cy) && city.busy[city.idx(cx, cy)])) return false;
  }
  return true;
}
/** the curbs a road parks on: both of an avenue's (its outer lanes: traffic keeps to the inner ones); a one-way
 *  street's right-hand curb, seen the way it runs (its lane keeps left of the middle, clear of them); a two-way
 *  street's one side, alternating road by road */
export function curbSides(city, r) {
  if (r.kind === 'avenue') return [-1, 1];
  if (r.oneway) return [r.axis === 'y' ? -r.oneway : r.oneway];   // (south-bound: the west curb; east-bound: the south one)
  return [city.roads.indexOf(r) % 2 ? 1 : -1];
}
/** the curb spots nearest a cell, one for each road side that parks, nearest first */
export function curbSpots(city, cx, cy, hw = 13) {
  const out = [];
  for (const r of city.roads) {
    if (r.kind === 'alley') continue;
    const [x0, y0, x1, y1] = r.band;
    for (const side of curbSides(city, r)) {
      const lx = r.axis === 'y' ? (side < 0 ? x0 : x1) : E.clamp(cx, x0, x1), ly = r.axis === 'y' ? E.clamp(cy, y0, y1) : (side < 0 ? y0 : y1);
      if (!busyNear(city, r, lx, ly)) out.push({ d: Math.hypot(lx - cx, ly - cy), spot: laneSpot(r, side, lx, ly, city.T, hw) });
    }
  }
  return out.sort((a, b) => a.d - b.d).map(o => o.spot);
}
/** the curb spot nearest a cell (on any street or avenue's parking side) */
export function curbSpot(city, cx, cy, hw = 13) { return curbSpots(city, cx, cy, hw)[0] || null; }
// an intersection or a crosswalk within two cells along the road (no parking there)
function busyNear(city, r, cx, cy) {
  for (let k = -2; k <= 2; k++) { const x = r.axis === 'y' ? cx : cx + k, y = r.axis === 'y' ? cy + k : cy; if (city.inside(x, y) && city.busy && city.busy[city.idx(x, y)]) return true; }
  const s = city.surfaceAt(cx, cy); return s === 'bridge' || s === 'water' || s === 'deep';
}

/** park and set going a district's fleet in a Fleet. Returns the counts */
export function spawnFleet(fleet, city, spec, seed = 1) {
  const rng = E.rng(seed * 7919 + 17), out = { parked: 0, spots: 0, boats: 0, pads: 0, trains: 0, helis: 0 }, T = city.T;
  const C = spec.curb || {}, every = C.every || 6, chance = C.chance ?? .3, roles = C.roles || ['civilian'], classes = C.classes || ['car', 'bike'];
  const pool = all('vehicles').filter(d => d.spawn && d.spawn.zones && (d.spawn.weight || 0) > 0 && roles.includes(d.role) && classes.includes(d.class || (get('vehicleModels', d.model) || {}).class));
  const noSpawn = city.zones.filter(z => z.kind === 'noSpawn');
  const pick = hood => { const c = pool.filter(d => d.spawn.zones.includes(hood)); if (!c.length) return null; let w = c.reduce((a, d) => a + d.spawn.weight, 0) * rng(); for (const d of c) { w -= d.spawn.weight; if (w <= 0) return d; } return c[c.length - 1]; };
  const taken = [];   // (the boxes already parked: a new one may not overlap any, with a little room between)
  const free = (x, y, h, hl, hw) => !taken.some(q => { const c = Math.cos(q.h), s = Math.sin(q.h), dx = x - q.x, dy = y - q.y, a = Math.abs(dx * c + dy * s), b = Math.abs(-dx * s + dy * c), same = Math.abs(Math.sin(h - q.h)) < .5;
    return same ? a < q.hl + hl + 6 && b < q.hw + hw + 2 : a < q.hl + hw + 6 && b < q.hw + hl + 6; });
  const size = d => { const m = get('vehicleModels', d.model); return m ? [m.length / 2, m.width / 2, m.height] : [29, 13, 22]; };
  const fits = (x, y, h, hl, hw, ht) => free(x, y, h, hl, hw) && onRoad(city, x, y, h, hl, hw) && !blockedSpot(city, x, y, h, hl, hw, ht);
  // the landmarks' own vehicles first
  for (const sp of spec.spots) {
    const poi = sp.near ? city.poi(sp.near) : null, at = poi ? [Math.floor(poi.x / T), Math.floor(poi.y / T)] : sp.at; if (!at) continue;
    const d = get('vehicles', sp.def); if (!d) continue;
    const [hl, hw, ht] = size(d), bases = curbSpots(city, at[0], at[1], hw).slice(0, 4); let i = 0;
    // the nearest curbs in turn, a car's length on from each spot either way (past street furniture, ramps, junctions);
    // the last tried farther along
    for (const [bi, base] of bases.entries()) for (let j = 0; i < (sp.n || 1) && j < (bi === bases.length - 1 ? 15 : 5); j++) {
      const k = j & 1 ? (j + 1) / 2 : -j / 2, L = hl * 2 + 10, x = base.x - Math.cos(base.heading) * L * k, y = base.y - Math.sin(base.heading) * L * k;
      if (!fits(x, y, base.heading, hl, hw, ht)) continue;
      i++;
      fleet.spawn(sp.def, x, y, base.heading, { color: sp.color || d.palette[i % d.palette.length], kit: sp.kit, locked: sp.locked, home: true });
      taken.push({ x, y, h: base.heading, hl, hw }); out.spots++;
    }
  }
  // the curbs
  for (const r of city.roads) {
    if (r.kind === 'alley') continue;
    const [x0, y0, x1, y1] = r.band, from = r.axis === 'y' ? y0 : x0, to = r.axis === 'y' ? y1 : x1;
    for (const side of curbSides(city, r)) for (let k = from + 3; k <= to - 3; k += every) {
      if (rng() >= chance) continue;
      const cx0 = r.axis === 'y' ? (side < 0 ? x0 : x1) : k, cy0 = r.axis === 'y' ? k : (side < 0 ? y0 : y1);
      const hood = city.hoodAt(cx0, cy0), d = pick(hood ? hood.id : ''); if (!d) continue;
      const [hl, hw, ht] = size(d);
      // the spot, or the nearest clear one a few cells either way along the curb (lamps, palms and bins stand at the kerb)
      for (const o of [0, 1, -1, 2, -2, 3, -3]) {
        const cx = r.axis === 'y' ? cx0 : cx0 + o, cy = r.axis === 'y' ? cy0 + o : cy0;
        if (busyNear(city, r, cx, cy) || noSpawn.some(z => cx >= z.rect[0] && cx <= z.rect[2] && cy >= z.rect[1] && cy <= z.rect[3])) continue;
        const s = laneSpot(r, side, cx, cy, T, hw);
        if (!fits(s.x, s.y, s.heading, hl, hw, ht)) continue;
        fleet.spawn(d.id, s.x, s.y, s.heading, { color: d.palette[Math.floor(rng() * d.palette.length)], home: true });
        taken.push({ x: s.x, y: s.y, h: s.heading, hl, hw }); out.parked++; break;
      }
    }
  }
  // boats on the water
  for (const w of spec.water) { if (!get('vehicles', w.def)) continue; fleet.spawn(w.def, (w.at[0] + .5) * T, (w.at[1] + .5) * T, typeof w.heading === 'string' ? HEADINGS[w.heading] : w.heading || 0, { color: w.color }); out.boats++; }
  // helicopters on their pads, landed till flown (home: one left about is set back on its pad, out of sight)
  for (const w of spec.pads) { if (!get('vehicles', w.def)) continue; fleet.spawn(w.def, (w.at[0] + .5) * T, (w.at[1] + .5) * T, typeof w.heading === 'string' ? HEADINGS[w.heading] : w.heading || 0, { color: w.color, home: true }); out.pads++; }
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
