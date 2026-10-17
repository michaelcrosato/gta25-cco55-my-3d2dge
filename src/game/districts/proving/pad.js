// The Proving Ground's vehicle pad (spike S3, PLAN.md 8.8): an open lot of asphalt for the handling suite and for
// driving by hand. A skidpad ring (radius 160), a drag strip with marks every 100 units, jersey barriers to hit,
// a curb strip (3 units: climbed), patches of grass and dirt (less grip), lamp posts (solids) along the strip, and
// bays for parked cars.
import { E, def } from '../../../motor/index.js';

const T = 16, N = 80;
const asphalt = (x, y) => { const v = 46 + (E.noise2(x * .27, y * .27) + 1) * 4 + (E.hash2(x, y) < .07 ? -6 : E.hash2(x + 5, y) > .96 ? 7 : 0); return [v, v + 1, v + 6]; };
function tile(size, fn) {
  const cv = E.mkCanvas(size, size), g = E.ctx2d(cv), img = g.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const c = fn(x, y), k = (y * size + x) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; }
  g.putImageData(img, 0, 0); return cv;
}

def('maps', 'vehicle-pad', {
  /** the pad's TileMap, with map.paintFloor, map.start ([x, y, heading]), map.bays, map.lamps and map.skidpad */
  build() {
    const cells = new Array(N * N).fill(0), floor = new Array(N * N).fill('road');
    const rect = (x0, y0, x1, y1, id) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cells[y * N + x] = id; };
    rect(0, 0, N - 1, 0, 1); rect(0, N - 1, N - 1, N - 1, 1); rect(0, 0, 0, N - 1, 1); rect(N - 1, 0, N - 1, N - 1, 1);   // the outer wall
    rect(44, 8, 45, 13, 2); rect(52, 18, 57, 19, 2); rect(64, 8, 65, 9, 2); rect(48, 28, 49, 29, 2);   // jersey barriers
    rect(14, 48, 30, 48, 3);   // the curb strip
    for (let y = 36; y < 46; y++) for (let x = 50; x < 64; x++) floor[y * N + x] = 'grass';
    for (let y = 36; y < 46; y++) for (let x = 64; x < 78; x++) floor[y * N + x] = 'dirt';
    const map = new E.TileMap({ w: N, h: N, cells, floor, types: {
      1: { h: 24, top: '#6a6a72', side: '#8a8a90', face: 'stone', roof: 'plain' },
      2: { h: 14, top: '#d8d8d0', side: '#c8c8c0', face: 'plaster', roof: 'plain' },
      3: { h: 3, top: '#a8a8b0', side: '#8a8a92', face: 'stone', roof: 'plain' } } });
    map.skidpad = [25 * T, 22 * T, 160];
    map.start = [6 * T, 64 * T, 0];
    map.bays = [[48 * T, 16 * T, Math.PI / 2], [52 * T, 24 * T, 0], [60 * T, 12 * T, .4], [40 * T, 30 * T, Math.PI]];
    map.lamps = []; for (let x = 8; x < 76; x += 6) map.lamps.push([x * T, 60.5 * T], [x * T, 67.5 * T]);
    map.addSolids(map.lamps.map(([x, y]) => ({ x, y, z: 0, top: 44, hx: 1.5, hy: 1.5 })));
    let pats = null;
    map.paintFloor = (g, x0, y0, x1, y1) => {
      pats ||= { road: g.createPattern(tile(64, asphalt), 'repeat'), grass: g.createPattern(tile(64, (x, y) => E.tex.grass(x, y)), 'repeat'), dirt: g.createPattern(tile(64, (x, y) => E.tex.dirt(x, y)), 'repeat') };
      for (let cy = Math.max(0, Math.floor(y0 / T)); cy <= Math.min(N - 1, Math.floor((y1 - 1) / T)); cy++) for (let cx = Math.max(0, Math.floor(x0 / T)); cx <= Math.min(N - 1, Math.floor((x1 - 1) / T)); cx++) {
        g.fillStyle = pats[map.floorTags[cy * N + cx]] || pats.road; g.fillRect(cx * T, cy * T, T, T);
      }
      // the skidpad's ring, the drag strip's edges and its marks every 100 units
      const [sx, sy, sr] = map.skidpad; g.strokeStyle = '#e8e8ec'; g.lineWidth = 3; g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#e8e8ec'; g.fillRect(4 * T, 61.5 * T, 72 * T, 2); g.fillRect(4 * T, 66.5 * T, 72 * T, 2);
      g.fillStyle = '#d6ac34'; for (let x = map.start[0]; x < 76 * T; x += 100) g.fillRect(x - 1, 61.5 * T, 3, 5 * T);
      g.fillStyle = 'rgba(255,255,255,.08)'; for (const [bx, by] of map.bays) g.fillRect(bx - 34, by - 18, 68, 36);
    };
    return map;
  },
});
