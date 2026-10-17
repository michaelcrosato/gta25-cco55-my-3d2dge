// Drawing a CityMap's raised and standing things through the Stage (PLAN.md 8.4, 8.5): deck slabs (the Loop, the L,
// ramps) with their pillars and railings, street props, and the neon signs on the landmarks. One draw path for every
// view: each piece draws through the projector (P.proj), so ISO queues it with the engine (sorted by its own x, y, z:
// a slab hides what is under it from the camera, PLAN.md 8.4), and TOP and SIDE7 sort it with everything else.
//   Everything is bucketed by chunk at load, so a frame looks only at what is near the focus.
import { E } from '../engine.js';
import { texturedFace } from './depth/quads.js';
import { drawBoxModel } from './box-model.js';

const T = 16, CH = 256;
/** the engine's prop sprites for the city's prop kinds (others are box models below) */
const SPRITES = { lamp: 'streetlamp', bin: 'trashcan', hydrant: 'hydrant', palm: 'palm', tree: 'tree' };
/** box models for the props the engine has no sprite for: parts in the prop's own frame (x along its facing) */
const box = (x0, y0, z0, x1, y1, z1, color, role = 'body') => ({ box: [x0, y0, z0, x1, y1, z1], color, role });
export const PROP_MODELS = {
  bench: { parts: [box(-8, -2.5, 4, 8, 2.5, 6, '#7a5a3a'), box(-8, 1.5, 6, 8, 2.5, 12, '#7a5a3a'), box(-7, -2, 0, -6, 2, 4, '#3a3a40', 'wheel'), box(6, -2, 0, 7, 2, 4, '#3a3a40', 'wheel')] },
  newsstand: { parts: [box(-5, -4, 0, 5, 4, 14, '#3a6ac8'), box(-5.5, -4.5, 14, 5.5, 4.5, 16, '#c8423a', 'cabin')] },
  pump: { parts: [box(-3, -2, 0, 3, 2, 18, '#c8423a'), box(-3.5, -2.5, 18, 3.5, 2.5, 21, '#e8e8ec', 'cabin')] },
  fountain: { parts: [box(-18, -18, 0, 18, 18, 6, '#a8a0a0'), box(-15, -15, 5, 15, 15, 6.5, '#3a8ad0', 'glass'), box(-3, -3, 6, 3, 3, 16, '#c8c0c0', 'cabin')] },
  drill: { parts: [box(-10, -8, 0, 10, 8, 10, '#c8a03a'), box(-2, -2, 10, 2, 2, 60, '#5a5a62', 'cabin'), box(-6, -6, 54, 6, 6, 60, '#c8a03a', 'cabin')] },
  mound: { parts: [box(-20, -14, 0, 20, 14, 6, '#7a5a3a'), box(-12, -8, 6, 12, 8, 10, '#8e6c48', 'cabin')] },
  scaffold: { parts: [box(-14, -4, 0, -12, 4, 44, '#8a8a92'), box(12, -4, 0, 14, 4, 44, '#8a8a92'), box(-14, -4, 20, 14, 4, 22, '#c8a03a', 'cabin'), box(-14, -4, 42, 14, 4, 44, '#c8a03a', 'cabin')] },
  crusher: { parts: [box(-20, -14, 0, 20, 14, 8, '#5a5a62'), box(-18, -12, 22, 18, 12, 30, '#c8a03a', 'cabin'), box(-20, -14, 8, -16, 14, 30, '#4a4a52'), box(16, -14, 8, 20, 14, 30, '#4a4a52')] },
  crane: { parts: [box(-6, -6, 0, 6, 6, 110, '#e0b020'), box(-6, -60, 104, 6, 30, 114, '#e0b020', 'cabin'), box(-8, 22, 96, 8, 32, 104, '#5a5a62', 'cabin')] },
  // roofs: an AC unit, a water tank on legs, a vent
  ac: { parts: [box(-6, -5, 0, 6, 5, 7, '#8a8e94'), box(-4.5, -3.5, 7, 4.5, 3.5, 7.6, '#4a4e54', 'cabin')] },
  tank: { parts: [box(-6, -6, 0, -4.5, -4.5, 8, '#3a3028'), box(4.5, -6, 0, 6, -4.5, 8, '#3a3028'), box(-6, 4.5, 0, -4.5, 6, 8, '#3a3028'), box(4.5, 4.5, 0, 6, 6, 8, '#3a3028'),
    box(-7, -7, 8, 7, 7, 22, '#7a5a3a'), box(-7.5, -7.5, 22, 7.5, 7.5, 24, '#5a4430', 'cabin')] },
  vent: { parts: [box(-2.5, -2.5, 0, 2.5, 2.5, 6, '#9a9ea4'), box(-3.5, -3.5, 6, 3.5, 3.5, 7, '#6a6e74', 'cabin')] },
  // yards and quays
  crate: { parts: [box(-5, -5, 0, 5, 5, 9, '#9a7448'), box(-5.2, -1, 0, 5.2, 1, 9.2, '#7a5a36', 'cabin')] },
  pallet: { parts: [box(-7, -5, 0, 7, 5, 2, '#8a6a42'), box(-5, -3, 2, 5, 3, 7, '#c8c0a8', 'cabin')] },
  barrel: { parts: [box(-3, -3, 0, 3, 3, 9, '#4a6a8a'), box(-3.3, -3.3, 3, 3.3, 3.3, 4, '#3a5a7a', 'cabin')] },
  bollard: { parts: [box(-1.5, -1.5, 0, 1.5, 1.5, 5, '#2a2a30'), box(-2, -2, 5, 2, 2, 6, '#3a3a40', 'cabin')] },
};
const CONTAINERS = new Map();
/** a shipping container in a colour (one model per colour) */
function containerModel(color) {
  let m = CONTAINERS.get(color);
  if (!m) { m = { parts: [box(-20, -8, 0, 20, 8, 16, color), box(-19, -7, 16, 19, 7, 16.6, E.shade(color, -.12), 'cabin'), box(20, -8, 0, 20.4, 8, 16, E.shade(color, -.3), 'cabin')] }; CONTAINERS.set(color, m); }   // (a roof panel and the doors' end)
  return m;
}

export class CityRenderer {
  /** city: a CityMap */
  constructor(city) {
    this.city = city; this.props = new Map(); this.deckCells = new Map(); this.signs = []; this.water = new Map();
    const add = (m, x, y, v) => { const k = Math.floor(y / CH) * 64 + Math.floor(x / CH); let a = m.get(k); if (!a) m.set(k, a = []); a.push(v); };
    // the water's glints: a few cells in four, hashed, each with its own phase (the floor chunks hold still water)
    for (let cy = 0; cy < city.h; cy++) for (let cx = 0; cx < city.w; cx++) {
      const s = city.surfaceAt(cx, cy); if (s !== 'water' && s !== 'deep') continue;
      const h = E.hash2(cx * 13 + 1, cy * 7 + 5); if (h < .3) add(this.water, (cx + .5) * T, (cy + .5) * T, [cx, cy, h]);
    }
    for (const p of city.props) if (p.kind !== 'pillar') add(this.props, p.x, p.y, p); else add(this.props, p.x, p.y, p);
    for (const d of city.decks) { const map = d._cellMap(); for (const c of d.cells) add(this.deckCells, (c.cx + .5) * T, (c.cy + .5) * T, { d, c, map }); }
    for (const s of city.signs) this.signs.push(placeSign(city, s));
    this.fadeUnder = null;   // set per frame: [x, y, z] of the player, to fade deck slabs over them
    this.bridges = [];   // the live drawbridges (world/drawbridge.js), set by the scene that steps them
  }
  /** queue what stands within radius (world units) of (fx, fy) */
  queue(stage, fx, fy, radius = 640, night = true, player = null) {
    const ci = Math.floor(fx / CH), cj = Math.floor(fy / CH), n = Math.ceil(radius / CH);
    const under = player && this.city.deckAt(player[0], player[1], 1e9); const fade = under && under.z > (player[2] || 0) + 24 ? player : null;
    const cut7 = stage.depth === stage.side7 && player ? stage.side7 : null, pz = player ? player[2] || 0 : 0, fd = cut7 ? cut7.depth(player[0], player[1]) : 0, fl = cut7 ? cut7.lateral(player[0], player[1]) : 0;
    for (let j = cj - n; j <= cj + n; j++) for (let i = ci - n; i <= ci + n; i++) {
      const k = j * 64 + i;
      for (const p of this.props.get(k) || []) if (stage.onScreen(p.x, p.y, p.z || 0, (p.z || 0) + (p.top || 60), 24) && !(p.roof && cut7 && this._cut7(cut7, p.lot, fd, fl))) this._prop(stage, p, night);
      for (const dc of this.deckCells.get(k) || []) {
        const c = dc.c, z = Math.max(c.z0, c.z1), x = (c.cx + .5) * T, y = (c.cy + .5) * T;
        if (cut7 && z > pz + 24 && cut7.depth(x, y) < fd - 8) continue;   // (MODE 7: a deck overhead between the camera and the player is cut away)
        if (stage.onScreen(x, y, z - dc.d.thickness, z + 8, 12)) this._deck(stage, dc, fade);
      }
    }
    // drawbridges: each leaf a slab turning on its hinge, its top painted as the road; the gates while it is not down
    for (const b of this.bridges) {
      const T = this.city.T, [x0, y0, x1, y1] = b.rect, mx = (x0 + x1 + 1) / 2 * T, my = (y0 + y1 + 1) / 2 * T;
      if (Math.abs(mx - fx) > radius + 160 || Math.abs(my - fy) > radius + 160) continue;
      for (const l of b.leaves) {
        const G = b.leafGeom(l), ns = b.axis === 'y', along = G.a + G.dir * G.c / 2, across = (G.u0 + G.u1) / 2, cx = ns ? across : along, cy = ns ? along : across;
        if (stage.onScreen(cx, cy, 0, G.h + 8, Math.max(G.L, G.u1 - G.u0) / 2)) stage.shape(cx, cy, G.h / 2, (g, P) => drawLeaf(g, P, b, l, this.city.painter.leafTexture(l.rect)));
      }
      if (b.closed) for (const end of [-1, 1]) {
        const ns = b.axis === 'y', gy = ns ? (end < 0 ? y0 * T - 6 : (y1 + 1) * T + 6) : my, gx = ns ? mx : (end < 0 ? x0 * T - 6 : (x1 + 1) * T + 6);
        if (stage.onScreen(gx, gy, 0, 14, 80)) stage.shape(gx, gy, 0, (g, P) => drawGate(g, P, b, gx, gy));
      }
    }
    // the water's glints: blinking highlights on the floor, before anything stands on it
    const glints = []; for (let j = cj - n; j <= cj + n; j++) for (let i = ci - n; i <= ci + n; i++) { const w = this.water.get(j * 64 + i); if (w) glints.push(w); }
    if (glints.length) { const t = stage.game.real; stage.floor((g, P) => drawGlints(g, P, glints, t, stage.r.bw, stage.r.bh)); }
    for (const s of this.signs) if (Math.abs(s.x - fx) < radius && Math.abs(s.y - fy) < radius && stage.onScreen(s.x, s.y, s.z, s.z, 48)) {
      stage.shape(s.x, s.y, s.z, (g, P) => drawSign(g, P, s, night), { bias: .01 });
      if (night) stage.glow(s.x, s.y, s.z, (g, sx, sy, k) => { const cv = signImage(s.text, s.color, Math.max(1, Math.round(k * .75)), true); g.drawImage(cv, Math.round(sx - cv.width / 2), Math.round(sy - cv.height / 2)); }, { iso: true });   // (neon: lit after the dark)
    }
  }
  // does MODE 7 cut this lot's building (in front of the player, across the player's line: its own span rule)?
  _cut7(v, lotIndex, fd, fl) {
    const L = this.city.lots[lotIndex]; if (!L) return false;
    const T = this.city.T, [x0, y0, x1, y1] = L.rect, xs = [x0 * T, (x1 + 1) * T], ys = [y0 * T, (y1 + 1) * T];
    let dMin = 1e9, lMin = 1e9, lMax = -1e9;
    for (const x of xs) for (const y of ys) { dMin = Math.min(dMin, v.depth(x, y)); const l = v.lateral(x, y); lMin = Math.min(lMin, l); lMax = Math.max(lMax, l); }
    return dMin < fd - 4 && lMin < fl + 40 && lMax > fl - 40;
  }
  _prop(stage, p, night) {
    if (p.kind === 'pillar') { stage.shape(p.x, p.y, 0, (g, P) => drawBoxModel(g, P, PILLAR(p.top), p.x, p.y, 0, 0)); return; }
    const spr = SPRITES[p.kind];
    if (spr) {
      const lamp = p.kind === 'lamp'; stage.prop(spr, p.x, p.y, p.z || 0, { light: night && lamp, halo: false, lightRadius: 88, size: p.kind === 'palm' ? 1.3 : 1 });
      if (lamp && night) stage.glow(p.x, p.y, (p.z || 0) + LAMP_HEAD, lampGlow, { reflect: lampSmear });
      return;
    }
    if (p.roof && this.city.cutaway && this.city.cutaway.cut.has(p.lot)) return;   // (a building the cut-away drops takes its roof with it)
    const m = p.kind === 'container' ? containerModel(p.color) : PROP_MODELS[p.kind]; if (m) stage.shape(p.x, p.y, p.z || 0, (g, P) => drawBoxModel(g, P, m, p.x, p.y, p.z || 0, p.facing || 0));
  }
  _deck(stage, { d, c, map }, fade) {
    const x = (c.cx + .5) * T, y = (c.cy + .5) * T, z = Math.max(c.z0, c.z1);
    const near = fade && Math.abs(fade[0] - x) < 72 && Math.abs(fade[1] - y) < 72, a = near ? .3 : 1;
    stage.shape(x, y, z, (g, P) => drawDeckCell(g, P, d, c, map, a), { hides: true });   // (the player shows through it, x-rayed)
    // its railings sort on their own, just outside their edge: drawn with the cell, the next cell's top cut them to teeth
    if (d.railing !== false) for (const e of EDGES) if (!map.has((c.cx + e[0]) + ',' + (c.cy + e[1]))) stage.shape(x + e[0] * T * 1.1, y + e[1] * T * 1.1, z, (g, P) => drawDeckRail(g, P, d, c, e, a), { hides: true });
  }
}
const LAMP_HEAD = 32;   // the streetlamp sprite's lamp, in world units over its foot (its glowAt: .13 of 52 pixels down, at sqrt 2 a unit)
const GLOWS = new Map();
/** a lamp's halo: two soft warm discs, added (one image per size) */
function lampGlow(g, sx, sy, k) {
  const R = Math.max(7, Math.round(12 * k)), key = R; let cv = GLOWS.get(key);
  if (!cv) {
    cv = E.mkCanvas(R * 2 + 2, R * 2 + 2); const c = E.ctx2d(cv), gr = c.createRadialGradient(R + 1, R + 1, 0, R + 1, R + 1, R);
    gr.addColorStop(0, 'rgba(255,252,232,1)'); gr.addColorStop(.18, 'rgba(255,240,190,.9)'); gr.addColorStop(.42, 'rgba(255,226,150,.42)'); gr.addColorStop(.75, 'rgba(255,210,130,.12)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
    c.fillStyle = gr; c.fillRect(0, 0, cv.width, cv.height); GLOWS.set(key, cv);
  }
  const op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter'; g.drawImage(cv, Math.round(sx - R - 1), Math.round(sy - R - 1)); g.globalCompositeOperation = op;
}
/** a lamp's light on a wet street: a broken warm streak down the screen from its foot, the reflection of its head
 *  (rows with gaps, narrowing and fading; one image per size) */
function lampSmear(g, sx, sy, k, wet) {
  const w = Math.max(2, Math.round(2.5 * k)), h = Math.max(10, Math.round(22 * k)), key = 's' + w + 'x' + h; let cv = GLOWS.get(key);
  if (!cv) {
    cv = E.mkCanvas(w * 2 + 1, h); const c = E.ctx2d(cv);
    for (let y = 0; y < h; y++) {
      const f = 1 - y / h, half = Math.max(0, Math.round(w * (.35 + .65 * f) * (E.hash2(y, 7) < .3 ? .5 : 1)));
      if (E.hash2(y * 3, 11) < .22 * (1 - f) + .08) continue;   // (gaps, more of them down the streak)
      c.fillStyle = `rgba(255,${210 + Math.round(30 * f)},${140 + Math.round(60 * f)},${(.5 * f * f + .06).toFixed(3)})`; c.fillRect(w - half, y, half * 2 + 1, 1);
    }
    GLOWS.set(key, cv);
  }
  const op = g.globalCompositeOperation, a = g.globalAlpha; g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, wet);
  g.drawImage(cv, Math.round(sx - w), Math.round(sy + 1)); g.globalCompositeOperation = op; g.globalAlpha = a;
}
/** the water's glints on screen: short bright dashes that blink in and out, each cell on its own phase */
function drawGlints(g, P, lists, t, W, H) {
  g.fillStyle = 'rgba(200,226,255,.55)';
  for (const list of lists) for (const [cx, cy, h] of list) {
    const ph = Math.sin(t * (1.3 + h * 4) + h * 40); if (ph < .55) continue;
    const q = P.proj((cx + h * 2.6) * T, (cy + .3 + h * 1.5) * T, 0); if (!q || q[0] < -4 || q[1] < -4 || q[0] > W + 4 || q[1] > H + 4) continue;
    const len = Math.max(2, Math.round((ph - .4) * 6 * Math.min(2, q[2]))); g.fillRect(Math.round(q[0]), Math.round(q[1]), len, 1);
  }
}
/** a drawbridge leaf: its top (the road, painted) from the hinge out to its tip at the leaf's angle, the underside
 *  where the camera sees that instead, the tip's edge, and a rail along each side */
export function drawLeaf(g, P, b, l, tex) {
  const G = b.leafGeom(l), ns = b.axis === 'y', th = 4, W = G.u1 - G.u0;
  // a point on the leaf: s across the road, tl along it from the leaf's low (north or west) end, dz off its top
  const pt = (s, tl, dz) => { const t = G.dir > 0 ? tl : 1 - tl, u = G.u0 + s * W, v = G.a + G.dir * t * G.c, z = t * G.h + dz; return ns ? P.proj(u, v, z) : P.proj(v, u, z); };
  const xy = (sx, sy, dz) => ns ? pt(sx, sy, dz) : pt(sy, sx, dz);   // (the map's own orientation: sx along x, sy along y)
  const top = (sx, sy) => xy(sx, sy, .6), c = [top(0, 0), top(0, 1), top(1, 1), top(1, 0)];   // (wound to face up, like a deck slab)
  if (!c.every(Boolean)) return;
  if (cross(c) < 0) texturedFace(g, top, tex, 0, 0, tex.width, tex.height, '#3a3a42');
  else quad(g, [xy(0, 0, -th), xy(0, 1, -th), xy(1, 1, -th), xy(1, 0, -th)], '#2a2a32');   // (its underside, from the far side)
  const tip = G.dir > 0 ? 1 : 0;
  if (G.h > .5) { const e = [pt(0, tip, .6), pt(1, tip, .6), pt(1, tip, -th), pt(0, tip, -th)]; if (e.every(Boolean)) quad(g, e, '#5a5a64'); }
  for (const s of [0, 1]) { const r = [pt(s, 0, .6), pt(s, 1, .6), pt(s, 1, 7), pt(s, 0, 7)]; if (r.every(Boolean)) quad(g, r, 'rgba(150,150,160,.8)'); }
  g._c = null;
}
/** a drawbridge's gate: a red and white arm across the road on two posts, closed while the bridge is not down */
function drawGate(g, P, b, x, y) {
  const ns = b.axis === 'y', T = b.T, half = ((ns ? b.rect[2] - b.rect[0] : b.rect[3] - b.rect[1]) + 1) * T / 2 - 4;
  const p = (a, z) => ns ? P.proj(x + a, y, z) : P.proj(x, y + a, z);
  for (const a of [-half, half]) { const q0 = p(a, 0), q1 = p(a, 14); if (q0 && q1) { g.fillStyle = '#2a2a30'; g.fillRect(Math.round(q0[0]) - 1, Math.round(q1[1]), 2, Math.max(1, Math.round(q0[1] - q1[1]))); } }
  const n = 8;
  for (let i = 0; i < n; i++) { const a = p(-half + (2 * half) * i / n, 10), c = p(-half + (2 * half) * (i + 1) / n, 10); if (!a || !c) continue; g.strokeStyle = i % 2 ? '#f0f0f0' : '#d8302a'; g.lineWidth = Math.max(1, Math.round(a[2] * 1.5)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.stroke(); }
  g.lineWidth = 1; g._c = null;
}
const PILLARS = new Map();
function PILLAR(top) { let m = PILLARS.get(top); if (!m) { m = { parts: [box(-3, -3, 0, 3, 3, top, '#7a7a82')] }; PILLARS.set(top, m); } return m; }

const deckTex = new Map();
/** the deck's top: concrete-grey asphalt with expansion joints (a road) or ballast and rails (the L) */
function deckTexture(kind) {
  let cv = deckTex.get(kind); if (cv) return cv;
  cv = E.mkCanvas(64, 64); const g = E.ctx2d(cv), img = g.createImageData(64, 64), d = img.data;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const n = (E.noise2(x * .3, y * .3) + 1) * 4 + (E.hash2(x, y) < .06 ? -6 : 0), k = (y * 64 + x) * 4;
    let c = kind === 'rail' ? [72 + n, 64 + n, 58 + n] : [56 + n, 56 + n, 62 + n];
    if (kind !== 'rail' && (x % 16 === 0)) c = [44, 44, 50];   // a joint every tile
    if (kind === 'rail' && (y % 8 < 2)) c = [96 + n, 74 + n, 52 + n];   // sleepers
    d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  if (kind === 'rail') { g.fillStyle = '#b8b8c0'; g.fillRect(18, 0, 3, 64); g.fillRect(43, 0, 3, 64); }
  deckTex.set(kind, cv); return cv;
}

/** one deck slab: its top (textured), the faces along its open edges, a railing, and its underside where the camera is
 *  below it; alpha fades it (the player under it) */
export function drawDeckCell(g, P, d, c, map, alpha = 1) {
  const x0 = c.cx * T, y0 = c.cy * T, x1 = x0 + T, y1 = y0 + T, th = d.thickness;
  const zAt = (x, y) => c.z0 + (c.z1 - c.z0) * (c.axis === 'x' ? (x - x0) / T : (y - y0) / T);
  if (alpha < 1) g.globalAlpha = alpha;
  // the underside, when it faces the camera (the L seen from the street in MODE 7)
  const u = [P.proj(x0, y0, zAt(x0, y0) - th), P.proj(x1, y0, zAt(x1, y0) - th), P.proj(x1, y1, zAt(x1, y1) - th), P.proj(x0, y1, zAt(x0, y1) - th)];   // (wound to face down)
  if (u.every(Boolean) && cross(u) < 0) quad(g, u, '#2a2a32');
  // the edge faces: where no deck cell continues (a ramp's open foot has none)
  for (const e of EDGES) {
    const [dx, dy, ea, eb] = e; if (map.has((c.cx + dx) + ',' + (c.cy + dy))) continue;
    const A = [x0 + ea[0] * T, y0 + ea[1] * T], B = [x0 + eb[0] * T, y0 + eb[1] * T];
    const za = zAt(...A), zb = zAt(...B), f = [P.proj(A[0], A[1], za - th), P.proj(B[0], B[1], zb - th), P.proj(B[0], B[1], zb), P.proj(A[0], A[1], za)];
    if (!f.every(Boolean) || cross(f) >= 0) continue;
    quad(g, f, dy > 0 || dx > 0 ? '#5a5a64' : '#6e6e78');
  }
  // the top
  const top = (s, t) => { const x = x0 + s * T, y = y0 + t * T; return P.proj(x, y, zAt(x, y)); };
  const corners = [top(0, 0), top(0, 1), top(1, 1), top(1, 0)];   // (wound to face up)
  if (corners.every(Boolean) && cross(corners) < 0) texturedFace(g, top, deckTexture(d.kind), (c.cx * T) % 64, (c.cy * T) % 64, T, T, '#3a3a42');
  g.globalAlpha = 1; g._c = null;
}
const cross = q => (q[1][0] - q[0][0]) * (q[3][1] - q[0][1]) - (q[1][1] - q[0][1]) * (q[3][0] - q[0][0]);
/** a cell's four edges: the neighbour's offset, then the edge's ends in the cell's unit square (wound so the outside
 *  face is front-facing) */
const EDGES = [[0, -1, [1, 0], [0, 0]], [0, 1, [0, 1], [1, 1]], [-1, 0, [0, 0], [0, 1]], [1, 0, [1, 1], [1, 0]]];
/** a deck cell's railing along one open edge (where the camera sees that side): a translucent panel, its top lit */
export function drawDeckRail(g, P, d, c, e, alpha = 1) {
  const x0 = c.cx * T, y0 = c.cy * T, zAt = (x, y) => c.z0 + (c.z1 - c.z0) * (c.axis === 'x' ? (x - x0) / T : (y - y0) / T);
  const [, , ea, eb] = e, A = [x0 + ea[0] * T, y0 + ea[1] * T], B = [x0 + eb[0] * T, y0 + eb[1] * T], za = zAt(...A), zb = zAt(...B);
  const f = [P.proj(A[0], A[1], za - d.thickness), P.proj(B[0], B[1], zb - d.thickness), P.proj(B[0], B[1], zb), P.proj(A[0], A[1], za)];
  if (!f.every(Boolean) || cross(f) >= 0) return;   // (the far side's rail hides behind the slab)
  const r = [P.proj(A[0], A[1], za), P.proj(B[0], B[1], zb), P.proj(B[0], B[1], zb + 7), P.proj(A[0], A[1], za + 7)];
  if (!r.every(Boolean)) return;
  if (alpha < 1) g.globalAlpha = alpha;
  quad(g, r, 'rgba(150,150,160,.85)'); const t = [P.proj(A[0], A[1], za + 6), P.proj(B[0], B[1], zb + 6), r[2], r[3]]; if (t.every(Boolean)) quad(g, t, '#c8c8d0');   // (the rail's lit top, along the slope)
  g.globalAlpha = 1; g._c = null;
}
function quad(g, q, color) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = color; g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) g.lineTo(q[i][0], q[i][1]); g.closePath(); g.fill(); }

/** where a landmark's sign hangs: the middle of the lot's side with the most street beside it, out from the wall */
function placeSign(C, s) {
  const [x0, y0, x1, y1] = s.rect, lot = C.lots[s.lot], h = (C.types[lot.typeId] || { h: 24 }).h;
  const street = (cx, cy) => { const t = C.surfaceAt(cx, cy); return t === 'walk' || t === 'road' || t === 'plaza' || t === 'yard' ? 1 : 0; };
  const sides = [['s', () => { let n = 0; for (let x = x0; x <= x1; x++) n += street(x, y1 + 1); return n; }], ['e', () => { let n = 0; for (let y = y0; y <= y1; y++) n += street(x1 + 1, y); return n; }],
    ['n', () => { let n = 0; for (let x = x0; x <= x1; x++) n += street(x, y0 - 1); return n; }], ['w', () => { let n = 0; for (let y = y0; y <= y1; y++) n += street(x0 - 1, y); return n; }]];
  const best = sides.map(([k, f]) => [k, f()]).sort((a, b) => b[1] - a[1])[0][0];
  const mx = (x0 + x1 + 1) / 2 * T, my = (y0 + y1 + 1) / 2 * T;
  const at = { s: [mx, (y1 + 1) * T + 2], e: [(x1 + 1) * T + 2, my], n: [mx, y0 * T - 2], w: [x0 * T - 2, my] }[best];
  // a shop's sign hangs low over its door; a billboard stands on the roof's street edge; a landmark's halfway up
  const z = s.billboard ? h + 18 : s.low ? Math.min(h - 4, 17) : Math.min(h - 4, Math.max(14, h * .55));
  return { ...s, x: at[0], y: at[1], z, roofZ: h, side: best };
}
/** a neon sign: the name in the pixel font on a dark board, glowing, at the board's projected point (it scales with
 *  the view, never below the font's own size; seen from far higher than any normal view, the switch camera's climb,
 *  it is a stroke of its colour the board's width) */
export function drawSign(g, P, s, night) {
  const p = P.proj(s.x, s.y, s.z); if (!p) return;
  if (p[2] < .5) { const w = Math.max(2, Math.round(s.text.length * 5 * p[2])); g.fillStyle = s.color; g.fillRect(Math.round(p[0] - w / 2), Math.round(p[1]), w, Math.max(1, Math.round(p[2] * 4))); return; }
  const k = Math.max(1, Math.round(p[2] * .75)), cv = signImage(s.text, s.color, k, night && !s.billboard, s.board);
  if (s.billboard) {   // two posts down to the roof
    const q = P.proj(s.x, s.y, s.roofZ); if (q) { g.fillStyle = '#2a2a30'; const top = Math.round(p[1] + cv.height / 2), w = Math.max(1, Math.round(k)); for (const dx of [-cv.width * .3, cv.width * .3]) g.fillRect(Math.round(p[0] + dx), top, w, Math.max(1, Math.round(q[1]) - top)); }
  }
  g.drawImage(cv, Math.round(p[0] - cv.width / 2), Math.round(p[1] - cv.height / 2));
}
const SIGNS = new Map();
/** a sign's board, drawn once per text, colour, size and lighting (the pixel font is slow to draw every frame) */
function signImage(text, color, k, night, board = null) {
  const key = text + '|' + color + '|' + k + '|' + (night ? 1 : 0) + '|' + board; let cv = SIGNS.get(key); if (cv) return cv;
  const w = E.font.width(text, { scale: k }) + 6, h = 7 * k + 4; cv = E.mkCanvas(w + 4, h + 4); const g = E.ctx2d(cv);
  g.fillStyle = board ? '#d8d0c0' : color; g.globalAlpha = board ? 1 : night ? .35 : .15; g.fillRect(0, 0, w + 4, h + 4); g.globalAlpha = 1;   // (a billboard: a pale frame)
  g.fillStyle = board || 'rgba(10,8,20,.85)'; g.clearRect(2, 2, w, h); g.fillRect(2, 2, w, h);
  E.font.text(g, text, 5, 4, night ? color : E.shade(color, -.2), { scale: k });
  if (SIGNS.size > 200) SIGNS.clear();
  SIGNS.set(key, cv); return cv;
}
