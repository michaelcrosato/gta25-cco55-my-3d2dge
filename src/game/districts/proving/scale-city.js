// The Proving Ground's scale yard (spike S2, PLAN.md 13): a seeded 160x160 city of plain blocks at Lowtown's scale,
// for measuring the floor chunks and the patched TileMap (GTM-PATCHes 1-3) in ISO. Streets every 22 tiles (5-tile
// roads, 2-tile sidewalks), blocks of 1-8 storey buildings in lots, lamp posts every 4 tiles (over a thousand solids),
// and a lap round the grid for the camera to drive. Lowtown's builder (M2) replaces the layout; the yard stays as the
// scale test.
import { E, def, RNG } from '../../../motor/index.js';

const T = 16, P = 22;   // tile size, street period
/** a cell's place in the street grid along one axis: 'walk' (sidewalk), 'road', or null (inside a block) */
const band = c => { const m = c % P; return m < 2 || (m > 6 && m < 9) ? 'walk' : m < 7 ? 'road' : null; };
const STOREY = 24;

/** wall types: low brick shops to glass towers, the facade options the engine draws (windows, doors, balconies) */
function wallTypes() {
  const out = {}, looks = [
    { side: '#9a6a52', top: '#5a5a66', face: 'brick', roof: 'slab', windows: { lit: .35 }, door: { chance: .3 } },
    { side: '#7a8090', top: '#4a4e5a', face: 'stone', roof: 'plain', windows: { w: 4, h: 10, lit: .4 } },
    { side: '#c8b49a', top: '#6a4a3a', face: 'plaster', roof: 'tiles', windows: { lit: .3 }, shutters: '#2a4a6a', door: { chance: .5 } },
    { side: '#5a6478', top: '#3e4250', face: 'stone', roof: 'plain', windows: { w: 3, h: 12, step: 10, lit: .5 } },
    { side: '#a05a48', top: '#5a4a4a', face: 'brick', roof: 'slab', windows: { lit: .25 }, balcony: { z: 28, color: '#2a2a30' } },
    { side: '#8a6a5a', top: '#4a4652', face: 'brick', roof: 'slab', windows: { lit: .45 }, balcony: { z: 40 } },
  ];
  let id = 1;
  for (let s = 1; s <= 8; s++) for (const look of looks) out[id++] = { ...look, h: s * STOREY, cut: s >= 3, cutH: 8 };
  return out;   // id = (storeys - 1) * 6 + look + 1
}

/** sample a texture function into a small repeating tile (the floor's patterns are anchored to the world) */
function tile(size, fn) {
  const cv = E.mkCanvas(size, size), g = E.ctx2d(cv), img = g.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const c = fn(x, y), k = (y * size + x) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; }
  g.putImageData(img, 0, 0); return cv;
}
const PAVING = { stones: ['#7a7880', '#74727a', '#807e86'].map(E.hex), mortar: E.hex('#4a4850'), hi: E.hex('#8e8c94'), lo: E.hex('#605e66'), speck: E.hex('#6a6870') };
const asphalt = (x, y) => { const v = 44 + (E.noise2(x * .31, y * .31) + 1) * 4 + (E.hash2(x, y) < .08 ? -6 : E.hash2(x + 7, y) > .95 ? 7 : 0); return [v, v + 1, v + 6]; };

/** the floor painter for FloorChunks: surfaces by floor tag, lane paint, crosswalks, curbs and the shade at wall feet */
function painter(map) {
  const N = map.w; let pats = null;
  return (g, x0, y0, x1, y1) => {
    pats ||= { road: g.createPattern(tile(64, asphalt), 'repeat'), walk: g.createPattern(tile(64, (x, y) => E.tex.flagstone(x, y, PAVING)), 'repeat'),
      lot: g.createPattern(tile(32, (x, y) => E.tex.dirt(x, y, { base: '#5a5048', dark: '#4a423c', light: '#6a6058' })), 'repeat') };
    const c0 = Math.max(0, Math.floor(x0 / T)), c1 = Math.min(N - 1, Math.floor((x1 - 1) / T)), r0 = Math.max(0, Math.floor(y0 / T)), r1 = Math.min(N - 1, Math.floor((y1 - 1) / T));
    // surfaces: one fill per run of equal tags along a row
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1;) {
      const tag = map.floorTags[cy * N + cx] || 'lot'; let e = cx; while (e + 1 <= c1 && (map.floorTags[cy * N + e + 1] || 'lot') === tag) e++;
      g.fillStyle = pats[tag] || pats.lot; g.fillRect(cx * T, cy * T, (e - cx + 1) * T, T); cx = e + 1;
    }
    // lane paint: a dashed yellow centre line down each road, broken at crossings, and zebra crossings either side
    g.fillStyle = '#d6ac34';
    for (let k = 0; k * P < N; k++) {
      const mid = (k * P + 4.5) * T;
      if (mid < y0 - 2 || mid > y1 + 2) { /* not this chunk's rows */ } else for (let x = Math.floor(x0 / 32) * 32; x < x1; x += 32) if (band(Math.floor((x + 8) / T)) !== 'road') g.fillRect(x, mid - 1, 16, 2);
      if (mid >= x0 - 2 && mid <= x1 + 2) for (let y = Math.floor(y0 / 32) * 32; y < y1; y += 32) if (band(Math.floor((y + 8) / T)) !== 'road') g.fillRect(mid - 1, y, 2, 16);
    }
    g.fillStyle = '#d8d8dc';
    for (let k = 0; k * P < N; k++) for (let q = 0; q * P < N; q++) {
      const ax = k * P * T, ay = q * P * T;   // the crossing of street k (vertical) and street q (horizontal): roads at tiles 2-6
      if (ax + 9 * T < x0 || ax > x1 || ay + 9 * T < y0 || ay > y1) continue;
      for (let s = 0; s < 5 * T; s += 6) {
        g.fillRect(ax + 2 * T + s, ay + 1.2 * T, 3, 0.7 * T); g.fillRect(ax + 2 * T + s, ay + 7.1 * T, 3, 0.7 * T);
        g.fillRect(ax + 1.2 * T, ay + 2 * T + s, 0.7 * T, 3); g.fillRect(ax + 7.1 * T, ay + 2 * T + s, 0.7 * T, 3);
      }
    }
    // curbs: a lit edge where a sidewalk meets the road
    g.fillStyle = '#9a98a0';
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      if (map.floorTags[cy * N + cx] !== 'walk') continue;
      const road = (x, y) => map.floorTags[y * N + x] === 'road';
      if (cx + 1 < N && road(cx + 1, cy)) g.fillRect(cx * T + T - 2, cy * T, 2, T);
      if (cx > 0 && road(cx - 1, cy)) g.fillRect(cx * T, cy * T, 2, T);
      if (cy + 1 < N && road(cx, cy + 1)) g.fillRect(cx * T, cy * T + T - 2, T, 2);
      if (cy > 0 && road(cx, cy - 1)) g.fillRect(cx * T, cy * T, T, 2);
    }
    // the shade at the foot of walls (the engine's own floor bake does this per pixel: here it is a few strips)
    g.fillStyle = 'rgba(8, 6, 16, .35)';
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      if (map.cell(cx, cy) !== 0) continue;
      if (map.cell(cx, cy - 1) > 0) g.fillRect(cx * T, cy * T, T, 4);
      if (map.cell(cx - 1, cy) > 0) g.fillRect(cx * T, cy * T, 4, T);
      if (map.cell(cx + 1, cy) > 0) g.fillRect(cx * T + T - 4, cy * T, 4, T);
      if (map.cell(cx, cy + 1) > 0) g.fillRect(cx * T, cy * T + T - 4, T, 4);
    }
  };
}

def('maps', 'scale-city', {
  /** the yard's TileMap, N x N cells (160: the scale yard; 64: the view lab's 4 x 4 chunks), with map.paintFloor (for
   *  FloorChunks), map.lamps ([x, y]), map.route (a lap, world points) and map.loops (a sidewalk ring round each block) */
  build(seed = 1, N = 160) {
    const rng = RNG.stream('scale-city').sub(seed), cells = new Array(N * N).fill(0), floor = new Array(N * N).fill(null);
    for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
      const a = band(cx), b = band(cy), i = cy * N + cx;
      floor[i] = a === 'road' || b === 'road' ? 'road' : a || b ? 'walk' : 'lot';
    }
    // each block (13 x 13 tiles inside the sidewalks) is cut into lots, each one building with a gap round some
    for (let by = 0; by * P + 9 < N; by++) for (let bx = 0; bx * P + 9 < N; bx++) {
      const x0 = bx * P + 9, y0 = by * P + 9, x1 = Math.min(N - 1, x0 + 12), y1 = Math.min(N - 1, y0 + 12);
      const split = rng.int(1, 3), cuts = [x0]; for (let s = 1; s < split; s++) cuts.push(x0 + Math.round((x1 - x0 + 1) * s / split));
      cuts.push(x1 + 1);
      for (let s = 0; s < cuts.length - 1; s++) {
        const rows = rng.chance(.5) ? [[y0, y1]] : [[y0, y0 + 5], [y0 + 7, y1]];
        for (const [ya, yb] of rows) {
          const storeys = Math.min(8, 1 + Math.floor(rng.next() ** 1.6 * 8)), look = rng.int(0, 5), id = (storeys - 1) * 6 + look + 1;
          for (let y = ya; y <= yb; y++) for (let x = cuts[s]; x < cuts[s + 1] - (s < cuts.length - 2 ? 1 : 0); x++) cells[y * N + x] = id;
        }
      }
    }
    const map = new E.TileMap({ w: N, h: N, cells, floor, types: wallTypes() });
    map.paintFloor = painter(map);
    // lamp posts every 4 tiles along the outer edge of every sidewalk: one addSolids call (GTM-PATCH 3)
    map.lamps = [];
    for (let k = 0; k * P < N; k++) for (let s = 2; s < N; s += 4) for (const off of [.6, 8.4]) {
      const line = (k * P + off) * T, along = s * T + 8;
      if (band(s) === 'road') continue;
      map.lamps.push([along, line], [line, along]);
    }
    map.addSolids(map.lamps.map(([x, y]) => ({ x, y, z: 0, top: 44, hx: 1.5, hy: 1.5 })));
    // the lap: round the grid on the street centre lines (the inner streets where there are enough), corner to corner
    const K = Math.floor((N - 9) / P), a = K >= 3 ? 1 : 0, b = K >= 3 ? K - 1 : K, at = k => (k * P + 4.5) * T, lo = at(a), hi = at(b), mid = at(Math.min(b, a + 2)), mid1 = at(Math.min(b, a + 1));
    map.route = mid > mid1 && mid < hi ? [[lo, lo], [hi, lo], [hi, hi], [mid, hi], [mid, mid1], [lo, mid1]] : [[lo, lo], [hi, lo], [hi, hi], [lo, hi]];
    // the sidewalk ring round each block (the outer sidewalk's middle), for walkers
    map.loops = [];
    for (let by = 0; by * P + 9 < N; by++) for (let bx = 0; bx * P + 9 < N; bx++) {
      const x0 = (bx * P + 8) * T, y0 = (by * P + 8) * T, x1 = Math.min(N - 1, (bx + 1) * P + 1) * T, y1 = Math.min(N - 1, (by + 1) * P + 1) * T;
      if (x1 - x0 > 64 && y1 - y0 > 64) map.loops.push([x0, y0, x1, y1]);
    }
    return map;
  },
});
