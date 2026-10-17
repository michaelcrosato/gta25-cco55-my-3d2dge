// The hello block: a 32x32 test map for M0 (a crossroads, sidewalks and nine buildings with modern facades). Lowtown
// replaces it in M2; it stays as the smallest map the tests can load.
import { E, def } from '../../../motor/index.js';

const CONCRETE = { stones: ['#6e6c72', '#68666c', '#74727a'].map(E.hex), mortar: E.hex('#3a3840'), hi: E.hex('#85838c'), lo: E.hex('#55535a'), speck: E.hex('#5e5c64') };
const T = 16;

/** asphalt with a yellow dashed centre line on each road; the full surface painter arrives with the district builder */
function asphalt(x, y) {
  const n = (E.noise2(x * .31, y * .31) + 1) * 5 + ((Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663)) & 3);
  const onX = Math.abs(x - 16 * T) < 1.2 && (y % 32) < 16, onY = Math.abs(y - 16 * T) < 1.2 && (x % 32) < 16;
  if ((onX && !(y > 14 * T && y < 18 * T)) || (onY && !(x > 14 * T && x < 18 * T))) return [214, 172, 52];
  const v = 46 + n; return [v, v + 1, v + 6];
}

def('maps', 'hello', {
  build() {
    const W = 32, H = 32, g = Array.from({ length: H }, () => Array(W).fill('.'));
    const rect = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch; };
    rect(0, 0, W - 1, 0, '#'); rect(0, H - 1, W - 1, H - 1, '#'); rect(0, 0, 0, H - 1, '#'); rect(W - 1, 0, W - 1, H - 1, '#');
    rect(14, 1, 17, H - 2, 'r'); rect(1, 14, W - 2, 17, 'r');
    rect(3, 3, 7, 7, 'A'); rect(9, 3, 11, 9, 'B'); rect(3, 9, 7, 11, 'C');
    rect(20, 3, 28, 6, 'D'); rect(20, 8, 24, 11, 'E'); rect(26, 8, 28, 11, 'F');
    rect(3, 20, 6, 28, 'G'); rect(8, 20, 11, 24, 'H'); rect(8, 26, 11, 28, 'I');
    rect(20, 20, 28, 28, 'J');
    g[12][12] = '@';
    return new E.TileMap({
      rows: g.map(r => r.join('')),
      legend: { '#': 1, r: { floor: 'road' }, A: 2, B: 3, C: 4, D: 5, E: 6, F: 7, G: 8, H: 9, I: 10, J: 11, '@': 'hero' },
      types: {
        1: { h: 10, top: '#4a4852', side: '#5c5a66', face: 'stone', roof: 'plain' },
        2: { h: 64, top: '#5a5a66', side: '#9a6a52', face: 'brick', roof: 'slab', windows: { lit: .35 }, door: { chance: .3 } },
        3: { h: 96, top: '#4a4e5a', side: '#7a8090', face: 'stone', roof: 'plain', windows: { w: 4, h: 10, lit: .4 }, cut: true, cutH: 8 },
        4: { h: 40, top: '#6a4a3a', side: '#c8b49a', face: 'plaster', roof: 'tiles', windows: { lit: .3 }, shutters: '#2a4a6a', door: { chance: .5 } },
        5: { h: 120, top: '#3e4250', side: '#5a6478', face: 'stone', roof: 'plain', windows: { w: 3, h: 12, step: 10, lit: .5 }, cut: true, cutH: 8 },
        6: { h: 48, top: '#5a4a4a', side: '#a05a48', face: 'brick', roof: 'slab', windows: { lit: .25 }, balcony: { z: 28, color: '#2a2a30' } },
        7: { h: 32, top: '#4a5a4a', side: '#b0a890', face: 'plaster', roof: 'slab', door: { chance: .6, color: '#3a2a22' } },
        8: { h: 56, top: '#5a5060', side: '#8a7a6a', face: 'brick', roof: 'slab', windows: { lit: .3 } },
        9: { h: 24, top: '#7a4a32', side: '#d0c0a0', face: 'plaster', roof: 'tiles', door: { chance: .6 }, windows: { from: 10, lit: .4 } },
        10: { h: 36, top: '#4a4a52', side: '#6a7088', face: 'stone', roof: 'plain', windows: true },
        11: { h: 80, top: '#4a4652', side: '#8a6a5a', face: 'brick', roof: 'slab', windows: { lit: .45 }, balcony: { z: 40 }, cut: true, cutH: 8 },
      },
      floorTex: (x, y, tag) => tag === 'road' ? asphalt(x, y) : E.tex.flagstone(x, y, CONCRETE),
    });
  },
});
