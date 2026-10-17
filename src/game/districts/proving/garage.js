// The Proving Ground's garage (PLAN.md 8.8, 8.23): a showroom lot for every vehicle definition. Bays in rows on the
// asphalt (cars and bikes, trucks at the back), a basin of water for the boats, a pad for the heli, a length of track
// for the L's cars. The garage zone parks the fleet here, and the model sheet shoots each vehicle alone at the centre.
import { E, def } from '../../../motor/index.js';

const T = 16, W = 72, H = 52;
const asphalt = (x, y) => { const v = 50 + (E.noise2(x * .3, y * .3) + 1) * 4 + (E.hash2(x, y) < .05 ? -6 : 0); return [v, v + 1, v + 6]; };
const water = (x, y) => { const v = E.noise2(x * .12 + 3, y * .2) * 10; return [22 + v, 58 + v, 92 + v * 1.4]; };
function tile(size, fn) {
  const cv = E.mkCanvas(size, size), g = E.ctx2d(cv), img = g.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const c = fn(x, y), k = (y * size + x) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; }
  g.putImageData(img, 0, 0); return cv;
}

def('maps', 'garage', {
  /** the garage's TileMap with map.paintFloor, map.surfaceAt, map.center, map.basin (cells), map.heliPad, map.track */
  build() {
    const cells = new Array(W * H).fill(0), floor = new Array(W * H).fill('road');
    const rect = (x0, y0, x1, y1, id) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cells[y * W + x] = id; };
    rect(0, 0, W - 1, 0, 1); rect(0, H - 1, W - 1, H - 1, 1); rect(0, 0, 0, H - 1, 1); rect(W - 1, 0, W - 1, H - 1, 1);
    const basin = [50, 30, 68, 48]; for (let y = basin[1]; y <= basin[3]; y++) for (let x = basin[0]; x <= basin[2]; x++) floor[y * W + x] = 'water';
    const map = new E.TileMap({ w: W, h: H, cells, floor, types: { 1: { h: 20, top: '#5a5a62', side: '#7a7a82', face: 'stone', roof: 'plain' } } });
    map.surfaceAt = (cx, cy) => (cx < 0 || cy < 0 || cx >= W || cy >= H ? 'deep' : cells[cy * W + cx] ? 'lot' : floor[cy * W + cx] === 'water' ? 'water' : 'road');
    map.center = [26 * T, 26 * T]; map.basin = basin; map.heliPad = [60 * T, 12 * T]; map.track = [[6 * T, 46 * T], [44 * T, 46 * T]];
    map.boatSpot = [59 * T, 39 * T];
    let pats = null;
    map.paintFloor = (g, x0, y0, x1, y1) => {
      pats ||= { road: g.createPattern(tile(64, asphalt), 'repeat'), water: g.createPattern(tile(64, water), 'repeat') };
      for (let cy = Math.max(0, Math.floor(y0 / T)); cy <= Math.min(H - 1, Math.floor((y1 - 1) / T)); cy++) for (let cx = Math.max(0, Math.floor(x0 / T)); cx <= Math.min(W - 1, Math.floor((x1 - 1) / T)); cx++) {
        g.fillStyle = pats[map.floorTags[cy * W + cx]] || pats.road; g.fillRect(cx * T, cy * T, T, T);
      }
      // bay lines, the heli pad's H, the track's rails and sleepers, the basin's quay edge
      g.fillStyle = 'rgba(240,240,232,.5)';
      for (let r = 0; r < 4; r++) for (let c = 0; c <= 6; c++) g.fillRect((4 + c * 6) * T - 1, (5 + r * 9) * T, 2, 5 * T);
      g.strokeStyle = 'rgba(240,240,232,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(map.heliPad[0], map.heliPad[1], 40, 0, Math.PI * 2); g.stroke();
      g.fillStyle = 'rgba(240,240,232,.7)'; g.fillRect(map.heliPad[0] - 14, map.heliPad[1] - 16, 5, 32); g.fillRect(map.heliPad[0] + 9, map.heliPad[1] - 16, 5, 32); g.fillRect(map.heliPad[0] - 10, map.heliPad[1] - 2, 20, 4);
      const [[ax, ay], [bx]] = map.track;
      g.fillStyle = '#4a3a2a'; for (let x = ax; x < bx; x += 10) g.fillRect(x, ay - 12, 4, 24);
      g.fillStyle = '#8a8a92'; g.fillRect(ax, ay - 9, bx - ax, 2); g.fillRect(ax, ay + 7, bx - ax, 2);
      g.fillStyle = '#9a9488'; g.fillRect(basin[0] * T - 4, basin[1] * T - 4, (basin[2] - basin[0] + 1) * T + 8, 4); g.fillRect(basin[0] * T - 4, basin[1] * T, 4, (basin[3] - basin[1] + 1) * T);
    };
    return map;
  },
});
