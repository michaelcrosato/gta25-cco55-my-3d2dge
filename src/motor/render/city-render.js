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
};

export class CityRenderer {
  /** city: a CityMap */
  constructor(city) {
    this.city = city; this.props = new Map(); this.deckCells = new Map(); this.signs = [];
    const add = (m, x, y, v) => { const k = Math.floor(y / CH) * 64 + Math.floor(x / CH); let a = m.get(k); if (!a) m.set(k, a = []); a.push(v); };
    for (const p of city.props) if (p.kind !== 'pillar') add(this.props, p.x, p.y, p); else add(this.props, p.x, p.y, p);
    for (const d of city.decks) { const map = d._cellMap(); for (const c of d.cells) add(this.deckCells, (c.cx + .5) * T, (c.cy + .5) * T, { d, c, map }); }
    for (const s of city.signs) this.signs.push(placeSign(city, s));
    this.fadeUnder = null;   // set per frame: [x, y, z] of the player, to fade deck slabs over them
  }
  /** queue what stands within radius (world units) of (fx, fy) */
  queue(stage, fx, fy, radius = 640, night = true, player = null) {
    const ci = Math.floor(fx / CH), cj = Math.floor(fy / CH), n = Math.ceil(radius / CH);
    const under = player && this.city.deckAt(player[0], player[1], 1e9); const fade = under && under.z > (player[2] || 0) + 24 ? player : null;
    for (let j = cj - n; j <= cj + n; j++) for (let i = ci - n; i <= ci + n; i++) {
      const k = j * 64 + i;
      for (const p of this.props.get(k) || []) if (stage.onScreen(p.x, p.y, p.z || 0, (p.z || 0) + (p.top || 60), 24)) this._prop(stage, p, night);
      for (const dc of this.deckCells.get(k) || []) { const c = dc.c, z = Math.max(c.z0, c.z1); if (stage.onScreen((c.cx + .5) * T, (c.cy + .5) * T, z - dc.d.thickness, z + 8, 12)) this._deck(stage, dc, fade); }
    }
    for (const s of this.signs) if (Math.abs(s.x - fx) < radius && Math.abs(s.y - fy) < radius && stage.onScreen(s.x, s.y, s.z, s.z, 48)) {
      stage.shape(s.x, s.y, s.z, (g, P) => drawSign(g, P, s, night), { bias: .01 });
      if (night) stage.glow(s.x, s.y, s.z, (g, sx, sy, k) => { const cv = signImage(s.text, s.color, Math.max(1, Math.round(k * .75)), true); g.drawImage(cv, Math.round(sx - cv.width / 2), Math.round(sy - cv.height / 2)); }, { iso: true });   // (neon: lit after the dark)
    }
  }
  _prop(stage, p, night) {
    if (p.kind === 'pillar') { stage.shape(p.x, p.y, 0, (g, P) => drawBoxModel(g, P, PILLAR(p.top), p.x, p.y, 0, 0)); return; }
    const spr = SPRITES[p.kind];
    if (spr) {
      const lamp = p.kind === 'lamp'; stage.prop(spr, p.x, p.y, p.z || 0, { light: night && lamp, halo: false, lightRadius: 88, size: p.kind === 'palm' ? 1.3 : 1 });
      if (lamp && night) stage.glow(p.x, p.y, (p.z || 0) + LAMP_HEAD, lampGlow);
      return;
    }
    const m = PROP_MODELS[p.kind]; if (m) stage.shape(p.x, p.y, p.z || 0, (g, P) => drawBoxModel(g, P, m, p.x, p.y, p.z || 0, p.facing || 0));
  }
  _deck(stage, { d, c, map }, fade) {
    const x = (c.cx + .5) * T, y = (c.cy + .5) * T, z = Math.max(c.z0, c.z1);
    const near = fade && Math.abs(fade[0] - x) < 72 && Math.abs(fade[1] - y) < 72;
    stage.shape(x, y, z, (g, P) => drawDeckCell(g, P, d, c, map, near ? .3 : 1));
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
  for (const [dx, dy, A, B] of [[0, -1, [x1, y0], [x0, y0]], [0, 1, [x0, y1], [x1, y1]], [-1, 0, [x0, y0], [x0, y1]], [1, 0, [x1, y1], [x1, y0]]]) {
    if (map.has((c.cx + dx) + ',' + (c.cy + dy))) continue;
    const za = zAt(...A), zb = zAt(...B), f = [P.proj(A[0], A[1], za - th), P.proj(B[0], B[1], zb - th), P.proj(B[0], B[1], zb), P.proj(A[0], A[1], za)];
    if (!f.every(Boolean) || cross(f) >= 0) continue;
    quad(g, f, dy > 0 || dx > 0 ? '#5a5a64' : '#6e6e78');
    const r = [P.proj(A[0], A[1], za), P.proj(B[0], B[1], zb), P.proj(B[0], B[1], zb + 7), P.proj(A[0], A[1], za + 7)];   // the railing
    if (r.every(Boolean)) { quad(g, r, 'rgba(150,150,160,.85)'); g.fillStyle = '#c8c8d0'; const a = r[3], b = r[2]; g.fillRect(Math.round(Math.min(a[0], b[0])), Math.round(Math.min(a[1], b[1])), Math.max(1, Math.round(Math.abs(b[0] - a[0]))), 1); }
  }
  // the top
  const top = (s, t) => { const x = x0 + s * T, y = y0 + t * T; return P.proj(x, y, zAt(x, y)); };
  const corners = [top(0, 0), top(0, 1), top(1, 1), top(1, 0)];   // (wound to face up)
  if (corners.every(Boolean) && cross(corners) < 0) texturedFace(g, top, deckTexture(d.kind), (c.cx * T) % 64, (c.cy * T) % 64, T, T, '#3a3a42');
  g.globalAlpha = 1; g._c = null;
}
const cross = q => (q[1][0] - q[0][0]) * (q[3][1] - q[0][1]) - (q[1][1] - q[0][1]) * (q[3][0] - q[0][0]);
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
  return { ...s, x: at[0], y: at[1], z: Math.min(h - 4, Math.max(14, h * .55)), side: best };
}
/** a neon sign: the name in the pixel font on a dark board, glowing, at the board's projected point (it scales with
 *  the view, never below the font's own size) */
export function drawSign(g, P, s, night) {
  const p = P.proj(s.x, s.y, s.z); if (!p) return;
  const k = Math.max(1, Math.round(p[2] * .75)), cv = signImage(s.text, s.color, k, night);
  g.drawImage(cv, Math.round(p[0] - cv.width / 2), Math.round(p[1] - cv.height / 2));
}
const SIGNS = new Map();
/** a sign's board, drawn once per text, colour, size and lighting (the pixel font is slow to draw every frame) */
function signImage(text, color, k, night) {
  const key = text + '|' + color + '|' + k + '|' + (night ? 1 : 0); let cv = SIGNS.get(key); if (cv) return cv;
  const w = E.font.width(text, { scale: k }) + 6, h = 7 * k + 4; cv = E.mkCanvas(w + 4, h + 4); const g = E.ctx2d(cv);
  g.fillStyle = color; g.globalAlpha = night ? .35 : .15; g.fillRect(0, 0, w + 4, h + 4); g.globalAlpha = 1;
  g.fillStyle = 'rgba(10,8,20,.85)'; g.clearRect(2, 2, w, h); g.fillRect(2, 2, w, h);
  E.font.text(g, text, 5, 4, night ? color : E.shade(color, -.2), { scale: k });
  if (SIGNS.size > 200) SIGNS.clear();
  SIGNS.set(key, cv); return cv;
}
