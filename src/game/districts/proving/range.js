// The Proving Ground's combat range (PLAN.md 8.23, M3): a walled yard to try every weapon and to run the combat
// accept tests on. North of the shooter's stand, a lane of target posts at 5, 10, 20 and 30 tiles; west of it, the
// lock-on gallery (three dummies in a fan); a one-storey shed (24 high, so a jump climbs it) for the roof shooter and
// the street target below; low walls (8: cover, vaulted at a run); a grass lawn and a bare apron for fire; barrels
// that blow; a bay for a parked car.
import { E, def } from '../../../motor/index.js';

const T = 16, W = 56, H = 44;
const asphalt = (x, y) => { const v = 48 + (E.noise2(x * .3, y * .3) + 1) * 4 + (E.hash2(x, y) < .06 ? -6 : 0); return [v, v + 1, v + 5]; };
function tile(size, fn) {
  const cv = E.mkCanvas(size, size), g = E.ctx2d(cv), img = g.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const c = fn(x, y), k = (y * size + x) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; }
  g.putImageData(img, 0, 0); return cv;
}

def('maps', 'combat-range', {
  /** the range's TileMap with map.paintFloor, map.surfaceAt (for the Fire grid), map.stand, map.lane (the target
   *  posts), map.gallery, map.roof ({ rect, top: the roof dummy's spot, street: the street target's }), map.barrels,
   *  map.carBay, map.lamps */
  build() {
    const cells = new Array(W * H).fill(0), floor = new Array(W * H).fill('road');
    const rect = (x0, y0, x1, y1, id) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cells[y * W + x] = id; };
    rect(0, 0, W - 1, 0, 1); rect(0, H - 1, W - 1, H - 1, 1); rect(0, 0, 0, H - 1, 1); rect(W - 1, 0, W - 1, H - 1, 1);   // the yard's wall
    rect(30, 6, 37, 11, 2);    // the shed (one storey)
    rect(12, 30, 18, 30, 3); rect(22, 26, 22, 31, 3);   // low walls: cover
    for (let y = 3; y < 15; y++) for (let x = 41; x < 53; x++) floor[y * W + x] = 'grass';   // the lawn
    for (let y = 16; y < 24; y++) for (let x = 41; x < 53; x++) floor[y * W + x] = 'walk';   // the bare apron
    const map = new E.TileMap({ w: W, h: H, cells, floor, types: {
      1: { h: 48, top: '#5a5a62', side: '#7a7a82', face: 'stone', roof: 'plain' },   // (taller than a climb: the yard keeps you in)
      2: { h: 24, top: '#6a5a4a', side: '#a8886a', face: 'plank', roof: 'plain' },
      3: { h: 8, top: '#a8a8b0', side: '#8a8a92', face: 'stone', roof: 'plain' } } });
    map.surfaceAt = (cx, cy) => (cx < 0 || cy < 0 || cx >= W || cy >= H ? 'deep' : cells[cy * W + cx] ? 'lot' : floor[cy * W + cx] === 'grass' ? 'grass' : floor[cy * W + cx] === 'walk' ? 'walk' : 'road');
    map.stand = [8 * T, 38 * T];
    map.lane = [5, 10, 20, 30].map(d => [8 * T + d * T, 38 * T]);
    map.gallery = [[-20, 80], [0, 120], [25, 160]].map(([deg, d]) => { const a = -Math.PI / 2 + deg * Math.PI / 180; return [8 * T + Math.cos(a) * d, 30 * T + Math.sin(a) * d]; });
    map.galleryFrom = [8 * T, 30 * T];
    map.roof = { rect: [30, 6, 37, 11], top: [33.5 * T, 8.5 * T, 24], street: [33.5 * T, 16 * T, 0], climb: [33.5 * T, 13 * T] };
    map.barrels = [[46 * T, 28 * T], [48 * T, 28 * T], [47 * T, 30 * T]];
    map.carBay = [24 * T, 18 * T, 0];
    map.lamps = [[6 * T, 6 * T], [28 * T, 6 * T], [6 * T, 24 * T], [28 * T, 24 * T], [50 * T, 36 * T], [40 * T, 40 * T]];
    map.addSolids(map.lamps.map(([x, y]) => ({ x, y, z: 0, top: 44, hx: 1.5, hy: 1.5 })));
    let pats = null;
    map.paintFloor = (g, x0, y0, x1, y1) => {
      pats ||= { road: g.createPattern(tile(64, asphalt), 'repeat'), grass: g.createPattern(tile(64, (x, y) => E.tex.grass(x, y)), 'repeat'), walk: g.createPattern(tile(64, (x, y) => { const v = 120 + E.hash2(x >> 3, y >> 3) * 14 + ((x & 15) === 0 || (y & 15) === 0 ? -14 : 0); return [v, v - 6, v - 16]; }), 'repeat') };
      for (let cy = Math.max(0, Math.floor(y0 / T)); cy <= Math.min(H - 1, Math.floor((y1 - 1) / T)); cy++) for (let cx = Math.max(0, Math.floor(x0 / T)); cx <= Math.min(W - 1, Math.floor((x1 - 1) / T)); cx++) {
        g.fillStyle = pats[map.floorTags[cy * W + cx]] || pats.road; g.fillRect(cx * T, cy * T, T, T);
      }
      // the stand's box, the lane's distance marks, the gallery's arc, the car's bay
      g.fillStyle = '#e8e8ec'; g.fillRect(map.stand[0] - 14, map.stand[1] - 14, 28, 2); g.fillRect(map.stand[0] - 14, map.stand[1] + 12, 28, 2);
      g.fillStyle = '#d6ac34'; for (const [x, y] of map.lane) g.fillRect(x - 1, y - 18, 3, 36);
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.beginPath(); g.arc(map.galleryFrom[0], map.galleryFrom[1], 100, -Math.PI / 2 - .6, -Math.PI / 2 + .6); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(map.carBay[0] - 34, map.carBay[1] - 18, 68, 36);
    };
    return map;
  },
});
