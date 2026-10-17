// The district validator (PLAN.md 8.3): what a built CityMap must hold. Errors fail the build's tests; warnings are
// things a later milestone fills in (a door whose interior is not built yet).
//   - every point of interest stands on a walkable cell, reachable on foot from the safehouse and by car (over roads,
//     bridges and alleys, mounting a kerb into a forecourt, a yard or a pier);
//   - walkable ground the safehouse can't reach on foot (a courtyard walled in) is listed;
//   - every road deck has a way up (a ramp), unless it is a stub (an open end) or a railway;
//   - every door names an interior.
import { get } from '../core/registry.js';

export function validateCity(C, o = {}) {
  const errors = [], warnings = [], W = C.w, H = C.h, I = (x, y) => y * W + x;
  const start = C.poi(o.from || 'safehouse') || C.pois[0];
  if (!start) return { errors: ['no points of interest'], warnings };
  const cellOf = p => [Math.floor(p.x / C.T), Math.floor(p.y / C.T)];
  // on foot: every walkable cell from the start
  const foot = flood(C, cellOf(start), (x, y) => C.walkable(x, y));
  // by road: the carriageways (and bridges, alleys, yards a car can enter) from the road nearest the start
  const DRIVE = new Set(['road', 'bridge', 'alley', 'yard', 'plaza', 'quay', 'rail', 'walk', 'pier', 'lot', 'dirt']);   // a car mounts the kerb to reach a forecourt
  const roadOk = (x, y) => C.walkable(x, y) && DRIVE.has(C.surfaceAt(x, y));
  const r0 = nearest(C, cellOf(start), roadOk, 12), road = r0 ? flood(C, r0, roadOk) : new Uint8Array(W * H);
  for (const p of C.pois) {
    const [cx, cy] = cellOf(p);
    if (!C.walkable(cx, cy)) { errors.push(`poi ${p.id} at ${cx},${cy} is on a blocked cell (${C.surfaceAt(cx, cy)}${C.map.cell(cx, cy) > 0 ? ', a wall' : ''})`); continue; }
    if (!foot[I(cx, cy)]) errors.push(`poi ${p.id} at ${cx},${cy} can't be reached on foot`);
    if (p.kind !== 'payphone' && p.kind !== 'landmark') { const r = nearest(C, [cx, cy], roadOk, 10); if (!r || !road[I(r[0], r[1])]) errors.push(`poi ${p.id} at ${cx},${cy} can't be reached by road`); }
    if (p.kind === 'door' && !get('interiors', p.interior)) warnings.push(`door ${p.id} names interior "${p.interior}", not built yet`);
  }
  let shut = 0; const shutAt = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (C.walkable(x, y) && !foot[I(x, y)]) { shut++; if (shutAt.length < 6) shutAt.push(x + ',' + y); }
  if (shut) warnings.push(`${shut} walkable cells can't be reached on foot from ${start.id} (e.g. ${shutAt.join(' ')})`);
  for (const d of C.decks) if (d.kind === 'road' && !d.ramps.length && !(C.spec.decks || []).find(s => s.id === d.id && s.openEnd)) errors.push(`deck ${d.id} has no ramp`);
  return { errors, warnings, reach: { foot, road } };
}
function flood(C, [x0, y0], ok) {
  const W = C.w, seen = new Uint8Array(W * C.h), q = [[x0, y0]]; if (!ok(x0, y0)) return seen; seen[y0 * W + x0] = 1;
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!C.inside(nx, ny) || seen[ny * W + nx] || !ok(nx, ny)) continue; seen[ny * W + nx] = 1; q.push([nx, ny]); } }
  return seen;
}
function nearest(C, [x0, y0], ok, R) {
  for (let r = 0; r <= R; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (C.inside(x0 + dx, y0 + dy) && ok(x0 + dx, y0 + dy)) return [x0 + dx, y0 + dy]; }
  return null;
}
