// The street painter (PLAN.md 8.3, 8.4): a CityMap's floor, painted into FloorChunks' world-space canvases. It reads the
// surface grid and the roads, never pixels from elsewhere, so a chunk paints the same every time. The look follows the
// brawler kit's street (vendor reference starter-50-brawler.js 38-62: sidewalks, kerbs, gutters, asphalt, crosswalks,
// lane paint, manholes, puddles) re-made for a whole city: surfaces fill from small repeating tiles in each
// neighbourhood's palette, then lane paint, crosswalks, kerbs, wear and the shade at the foot of walls go on top.
import { E } from '../engine.js';
import { SURFACES } from '../world/citymap.js';

/** the default palettes by surface; a neighbourhood's palette overrides any of them ({ walk: { ... }, ... }) */
export const PALETTE = {
  road: { base: '#2e2e36', var: 6 }, alley: { base: '#34323a', var: 9 }, bridge: { base: '#383840', var: 5 },
  walk: { stones: ['#7a7880', '#74727a', '#807e86'], mortar: '#4a4850', hi: '#8e8c94', lo: '#605e66', speck: '#6a6870' },
  plaza: { stones: ['#9a8a7a', '#94867a', '#a29484'], mortar: '#5a5048', hi: '#b0a090', lo: '#7a6a5e', speck: '#8a7a6a' },
  lot: { base: '#4a4640', dark: '#3e3a36', light: '#56524a' }, yard: { base: '#545058', dark: '#46424a', light: '#5e5a62' },
  grass: { base: '#4a8a42', dark: '#3a7034', light: '#5ea050' }, park: { base: '#4e9046', dark: '#3c7436', light: '#62a852' },
  dirt: { base: '#7a5a3a', dark: '#5e4430', light: '#8e6c48' }, sand: { base: '#c8b07a', dark: '#a8905e', light: '#dcc68e' },
  water: { base: '#1e4a7a', dark: '#163a62', light: '#4a7aaa' }, deep: { base: '#163a62', dark: '#102c4c', light: '#3a6a9a' },
  quay: { base: '#6a6a70', dark: '#58585e', light: '#7a7a80' }, pier: { base: '#7a5a3a', line: '#4a3422' }, rail: { base: '#3a3434', var: 6 },
  paint: { yellow: '#d6ac34', white: '#d8d8dc', kerb: '#9a98a0', kerbDark: '#5a5860' },
};
const TILE = 64;

export class SurfacePainter {
  /** city: a CityMap */
  constructor(city) { this.city = city; this.tiles = new Map(); this.T = city.T; }
  /** a repeating 64-texel tile for a surface in a palette (built once) */
  _tile(g, surf, pal) {
    const key = surf + JSON.stringify(pal); let p = this.tiles.get(key); if (p) return p;
    const cv = E.mkCanvas(TILE, TILE), cg = E.ctx2d(cv), img = cg.createImageData(TILE, TILE), d = img.data, hex = E.hex;
    const put = (x, y, c) => { const k = (y * TILE + x) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; };
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      let c;
      if (surf === 'walk' || surf === 'plaza') { const p2 = { stones: pal.stones.map(hex), mortar: hex(pal.mortar), hi: hex(pal.hi), lo: hex(pal.lo), speck: hex(pal.speck) }; c = E.tex.flagstone(x, y, p2, surf === 'plaza' ? 8 : 16); }
      else if (surf === 'grass' || surf === 'park') c = E.tex.grass(x, y, pal);
      else if (surf === 'dirt' || surf === 'sand' || surf === 'lot' || surf === 'yard' || surf === 'quay') c = E.tex.dirt(x, y, pal);
      else if (surf === 'water' || surf === 'deep') c = E.tex.water(x, y, pal);
      else if (surf === 'pier') c = E.tex.planks(x, y, { base: pal.base, dark: E.shade(pal.base, -.15), line: pal.line });
      else { const b = hex(pal.base || '#2e2e36'), n = (E.noise2(x * .27, y * .27) + 1) * (pal.var || 6) * .5 + (E.hash2(x, y) < .07 ? -6 : E.hash2(x + 5, y) > .96 ? 7 : 0); c = [b[0] + n, b[1] + n, b[2] + n + 2]; }
      put(x, y, c);
    }
    cg.putImageData(img, 0, 0);
    p = g.createPattern(cv, 'repeat'); this.tiles.set(key, p); return p;
  }
  /** a drawbridge leaf's top: its cells painted as the road they are (lane paint, sidewalks), one texel a unit, from
   *  its low corner (made once per leaf) */
  leafTexture(rect) {
    const key = 'leaf:' + rect.join(','); let cv = this.tiles.get(key); if (cv) return cv;
    const T = this.T, w = (rect[2] - rect[0] + 1) * T, h = (rect[3] - rect[1] + 1) * T; cv = E.mkCanvas(w, h);
    const g = E.ctx2d(cv); g.translate(-rect[0] * T, -rect[1] * T); this.paint(g, rect[0] * T, rect[1] * T, (rect[2] + 1) * T, (rect[3] + 1) * T, { raw: true });
    this.tiles.set(key, cv); return cv;
  }
  _pal(surf, hood) { const base = PALETTE[surf] || PALETTE.lot, o = hood && hood.palette && hood.palette[surf]; return o ? { ...base, ...o } : base; }
  /** paint the floor of world rectangle [x0, x1) x [y0, y1) into g (in world coordinates): FloorChunks' paint. A
   *  drawbridge's span paints as the water under it (its leaves draw the road); o.raw paints the road there instead
   *  (the leaves' own texture: leafTexture) */
  paint(g, x0, y0, x1, y1, o = {}) {
    const C = this.city, T = this.T, P = PALETTE.paint, map = C.map, M = !o.raw && C.drawMask ? C.drawMask : null, W0 = SURFACES.indexOf('water');
    const sAt = i => M && M[i] ? W0 : C.surface[i], masked = (cx, cy) => !!M && C.inside(cx, cy) && M[cy * C.w + cx] === 1;
    const c0 = Math.max(0, Math.floor(x0 / T)), c1 = Math.min(C.w - 1, Math.floor((x1 - 1) / T)), r0 = Math.max(0, Math.floor(y0 / T)), r1 = Math.min(C.h - 1, Math.floor((y1 - 1) / T));
    // surfaces: one fill per run of one surface and neighbourhood along a row
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1;) {
      const i = cy * C.w + cx, s = sAt(i), h = C.hood[i]; let e = cx;
      while (e + 1 <= c1 && sAt(i + e + 1 - cx) === s && C.hood[i + e + 1 - cx] === h) e++;
      const surf = SURFACES[s], hood = C.hoods[h];
      g.fillStyle = this._tile(g, surf === 'curb' ? 'walk' : surf, this._pal(surf === 'curb' ? 'walk' : surf, hood)); g.fillRect(cx * T, cy * T, (e - cx + 1) * T, T); cx = e + 1;
    }
    const inRect = r => r[2] >= c0 && r[0] <= c1 && r[3] >= r0 && r[1] <= r1;
    const busy = (cx, cy) => C.inside(cx, cy) && (C.busy[cy * C.w + cx] > 0 || masked(cx, cy));   // an intersection or a crosswalk (or a lifting span): no lane paint
    // lane paint: a street's dashed yellow centre; an avenue's double yellow median and white dashed lanes
    for (const r of C.roads) {
      if (!inRect(r.band) || r.kind === 'alley') continue;
      const ns = r.axis === 'y', a0 = ns ? r.band[1] : r.band[0], a1 = ns ? r.band[3] : r.band[2], across0 = (ns ? r.band[0] : r.band[1]) * T, across1 = ((ns ? r.band[2] : r.band[3]) + 1) * T, mid = (across0 + across1) / 2;
      const line = (pos, w, dashed, color) => {
        g.fillStyle = color;
        for (let k = Math.max(a0, ns ? r0 : c0); k <= Math.min(a1, ns ? r1 : c1); k++) {
          if (busy(ns ? Math.floor(pos / T) : k, ns ? k : Math.floor(pos / T))) continue;
          for (let half = 0; half < 2; half++) { if (dashed && half) continue; const s0 = k * T + half * 8, len = dashed ? 9 : 8; ns ? g.fillRect(pos - w / 2, s0, w, len) : g.fillRect(s0, pos - w / 2, len, w); }
        }
      };
      if (r.median) { line(mid - 3, 2, false, P.yellow); line(mid + 3, 2, false, P.yellow); const lane = (across1 - across0) / 4; line(across0 + lane, 1.5, true, P.white); line(across1 - lane, 1.5, true, P.white); }
      else if (r.oneway) {   // a one-way street: the parking lane's line on the right of the way it runs, arrows down the lane
        const right = r.axis === 'y' ? -r.oneway : r.oneway, lane = mid - right * 10;   // (the lane keeps 10 u left of the middle: a truck passes a parked truck)
        line(mid + right * 11, 1, true, P.white);
        g.fillStyle = P.white;
        for (let k = a0 + 3; k <= a1 - 3; k += 7) {
          if (k < (ns ? r0 : c0) - 1 || k > (ns ? r1 : c1) + 1 || busy(ns ? Math.floor(lane / T) : k, ns ? k : Math.floor(lane / T))) continue;
          const c = (k + .5) * T, d = r.oneway;   // (the arrow points the way the street runs)
          for (let t = -7; t <= 7; t++) {   // shaft 2 wide, then a head that narrows to the tip
            const w = t > 2 ? Math.max(1, Math.round((7 - t) * .9)) : 1, along = c + t * d;
            ns ? g.fillRect(lane - w, along, w * 2, 1) : g.fillRect(along, lane - w, 1, w * 2);
          }
        }
      }
      else line(mid, 2, true, P.yellow);
    }
    // crosswalks: zebra bars across the crossing (bars run with the road), and a stop line before each
    g.fillStyle = P.white;
    for (const w of C.crosswalks) {
      if (!inRect(w.rect)) continue;
      const X0 = w.rect[0] * T, Y0 = w.rect[1] * T, X1 = (w.rect[2] + 1) * T, Y1 = (w.rect[3] + 1) * T;
      if (w.axis === 'y') for (let x = X0 + 2; x < X1 - 2; x += 6) g.fillRect(x, Y0 + 3, 3, Y1 - Y0 - 6);
      else for (let y = Y0 + 2; y < Y1 - 2; y += 6) g.fillRect(X0 + 3, y, X1 - X0 - 6, 3);
    }
    // kerbs: a lit edge where a sidewalk meets a carriageway, a dark gutter on the road side
    const S = SURFACES, isRoad = s => s === 'road' || s === 'bridge' || s === 'alley';
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      const s = S[C.surface[cy * C.w + cx]]; if ((s !== 'walk' && s !== 'plaza' && s !== 'park' && s !== 'grass') || masked(cx, cy)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!C.inside(cx + dx, cy + dy) || masked(cx + dx, cy + dy) || !isRoad(S[C.surface[(cy + dy) * C.w + cx + dx]])) continue;
        const x = cx * T + (dx > 0 ? T - 2 : 0), y = cy * T + (dy > 0 ? T - 2 : 0), w = dx ? 2 : T, h = dy ? 2 : T;
        g.fillStyle = P.kerb; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(10,8,18,.35)'; g.fillRect(dx ? x + dx * 2 : x, dy ? y + dy * 2 : y, dx ? 1 : T, dy ? 1 : T);
      }
    }
    // wear: manholes and drains on roads, oil and cracks, puddles; all hashed per cell, so a chunk repaints the same
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      if (masked(cx, cy)) continue;
      const s = S[C.surface[cy * C.w + cx]], h = E.hash2(cx * 31 + 7, cy * 17 + 3), X = cx * T, Y = cy * T;
      if (s === 'road' && !busy(cx, cy)) {
        if (h < .035) { g.fillStyle = '#1e1c22'; g.beginPath(); g.arc(X + 8, Y + 8, 4.5, 0, 6.3); g.fill(); g.fillStyle = '#3a3840'; g.fillRect(X + 5, Y + 7, 7, 1); g.fillRect(X + 5, Y + 9, 7, 1); }
        else if (h < .09) { g.fillStyle = 'rgba(8,6,14,.28)'; g.beginPath(); g.ellipse(X + 4 + h * 60, Y + 6 + h * 40, 5, 3, h * 9, 0, 6.3); g.fill(); }
        else if (h > .97) { g.fillStyle = 'rgba(70,110,150,.28)'; g.beginPath(); g.ellipse(X + 8, Y + 8, 7, 4, h * 5, 0, 6.3); g.fill(); }
      } else if (s === 'alley' && h < .2) { g.fillStyle = 'rgba(8,6,14,.3)'; g.fillRect(X + h * 40, Y + 3, 5, 9); }
    }
    // the shade at the foot of walls
    if (map) {
      g.fillStyle = 'rgba(8,6,16,.32)';
      for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
        if (map.cell(cx, cy) !== 0 || masked(cx, cy)) continue;
        if (map.cell(cx, cy - 1) > 0) g.fillRect(cx * T, cy * T, T, 4);
        if (map.cell(cx - 1, cy) > 0) g.fillRect(cx * T, cy * T, 4, T);
        if (map.cell(cx + 1, cy) > 0) g.fillRect(cx * T + T - 4, cy * T, 4, T);
        if (map.cell(cx, cy + 1) > 0) g.fillRect(cx * T, cy * T + T - 4, T, 4);
      }
    }
  }
}
