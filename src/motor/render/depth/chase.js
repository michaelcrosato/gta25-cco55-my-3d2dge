// THE CHASE CAMERA (PLAN.md 19's backlog, HANDOFF L4): MODE 7 with its rail let go. The same level camera with its lens
// shifted (walls and figures upright, the floor receding as from a pitched one), but behind the focus at any heading,
// turning after it as a kart game's does: in a vehicle it swings round behind the bonnet with the car's heading, on
// foot it eases round behind the player while they walk on ahead of it, and the turn buttons swing it a quarter
// round. Everything MODE 7 draws it draws too, generalized where the rail made it simple: the floor raster steps across
// each buffer row in both world axes; a span shows whichever of its four faces look toward the camera, each cut a
// tile wide (sorted by its far end, as MODE 7's side slices) and filled through the same affine quads; a top seen from
// above is cut at the near plane. Rigs are drawn through views at the heading in 3° steps (kept and reused).
// Presentation only, as every view: the simulation never reads it.
import { E } from '../../engine.js';
import { Side7View } from './side7.js';
import { faceTexture, shadeOf, faceColor, FACE_PERIOD } from './textures.js';
import { texturedFace } from './quads.js';

const DEG = Math.PI / 180, NEAR_D = 10, TILE = 16, VIEW_STEP = 3;
/** the chase lens: height, how far behind the focus, the field of view (widen: degrees more at top speed) and how fast
 *  the camera swings round after the focus's heading (turn: 1/s) */
export const CHASE = {
  foot: { h: 66, back: 130, fov: 54, widen: 0, turn: 1.2 },
  vehicle: { h: 78, back: 175, fov: 56, widen: 10, turn: 3.2 },
  indoor: { h: 50, back: 80, fov: 60, widen: 0, turn: 1.5 },
};
const FOOT_CONE = 60;   // (degrees: on foot the camera comes round only while the player walks within this of its forward)

/** the axes at a heading in degrees (0 north, 90 east): f forward (into the screen), r to the screen's right */
export function axesAt(deg) { const t = deg * DEG; return { f: [Math.sin(t), -Math.cos(t)], r: [Math.cos(t), Math.sin(t)] }; }
/** a world direction (x, y) as a heading in degrees, 0..360 */
export function headingOf(x, y) { return ((Math.atan2(x, -y) / DEG) % 360 + 360) % 360; }
const turnTo = (a, b) => ((b - a + 540) % 360) - 180;   // (the shortest signed turn from a to b, degrees)

export class ChaseView extends Side7View {
  /** o: as Side7View's ({ sky, fog, farClip, ... }) */
  constructor(o = {}) {
    super({ id: 'chase', label: 'CHASE', back: CHASE.foot.back, turn: CHASE.foot.turn, h: CHASE.foot.h, fov: CHASE.foot.fov, ...o });
    this._ax = axesAt(this.heading); this._axOf = this.heading; this.mode7 = true; this.swing = 0;
  }
  /** kept images are keyed by the heading in steps of 1.5° (it turns all the time: each frame's would never be reused) */
  get keyHeading() { return Math.round(this.heading / 1.5) * 1.5; }
  ax() { if (this._axOf !== this.heading) { this._ax = axesAt(this.heading); this._axOf = this.heading; } return this._ax; }
  /** face a heading (any, in degrees) round the focus at the lens's distance behind it */
  setHeading(deg, fx, fy) {
    this.heading = ((deg % 360) + 360) % 360; this.swing = 0;
    if (fx !== undefined) { const a = this.ax(); this.x = fx - a.f[0] * this.back; this.y = fy - a.f[1] * this.back; this.ready = true; }
  }
  /** the turn buttons: a quarter round, eased in by follow (dir -1 left, 1 right) */
  turnBy(dir) { this.swing += 90 * dir; }
  /** the lens for where the focus is, how fast and how high: eased as MODE 7's */
  rig(dt, vehicle, speed01 = 0, fz = 0) {
    const R = this.indoor ? CHASE.indoor : vehicle ? CHASE.vehicle : CHASE.foot, k = this.ready ? 1 - Math.exp(-dt * 2.5) : 1, fov = R.fov + R.widen * E.clamp(speed01, 0, 1);
    this.h += (R.h + fz - this.h) * k; this.back += (R.back - this.back) * k; this.fov += (fov - this.fov) * k;
    this.near = this.back * .8; this.far = this.back * 1.25;   // (MODE 7's keys, for whatever reads them)
  }
  /** each simulation step (the heading maps the stick, so it turns in the step, never in a frame drawn: the same game
   *  headless and in the page): after the focus's heading h (degrees, or null: hold), in a vehicle while it moves, on
   *  foot while it walks on ahead (moving: past a stroll), and the turn buttons' swing eased in */
  steer(dt, h = null, moving = false, vehicle = false) {
    this.inVehicle = !!vehicle; this.turn = (this.indoor ? CHASE.indoor : vehicle ? CHASE.vehicle : CHASE.foot).turn;
    if (this.swing) { const s = Math.abs(this.swing) < .05 ? this.swing : this.swing * Math.min(1, dt * 6); this.swing -= s; this.heading = ((this.heading + s) % 360 + 360) % 360; return; }
    if (h === null || !moving || (!vehicle && Math.abs(turnTo(this.heading, h)) >= FOOT_CONE)) return;
    this.heading = ((this.heading + turnTo(this.heading, h) * Math.min(1, dt * this.turn)) % 360 + 360) % 360;
  }
  /** behind the focus at (fx, fy) at the heading steer keeps (presentation only: where it stands is never read) */
  follow(dt, fx, fy) {
    if (!this.ready) { this.setHeading(this.heading, fx, fy); return; }
    // a wall taller than the lens between the focus and where the camera would stand: it comes in to this side of it at
    // once (never inside a building looking at its wall), and back out eased once clear
    const a = this.ax(), clear = this._clear(fx, fy, -a.f[0], -a.f[1], this.back);
    this.dist = this.dist === undefined || clear < this.dist ? clear : this.dist + (clear - this.dist) * Math.min(1, dt * 2);
    const k = 1 - Math.exp(-dt * 6), tx = fx - a.f[0] * this.dist, ty = fy - a.f[1] * this.dist;
    if (clear < this.back - 1) { this.x = tx + (this.x - tx) * (1 - k); this.y = ty + (this.y - ty) * (1 - k); const dx = this.x - fx, dy = this.y - fy, d = Math.hypot(dx, dy); if (d > this.dist) { this.x = fx + dx / d * this.dist; this.y = fy + dy / d * this.dist; } }
    else { this.x += (tx - this.x) * k; this.y += (ty - this.y) * k; }
  }
  /** how far from (fx, fy) along (dx, dy) the camera may stand, up to max: short of the first wall cell taller than the
   *  lens (the map's, when it has one) */
  _clear(fx, fy, dx, dy, max) {
    const M = this.map; if (!M) return max;
    const T = M.T;
    for (let d = 8; d <= max; d += 6) {
      const id = M.cell(Math.floor((fx + dx * d) / T), Math.floor((fy + dy * d) / T));
      if (id > 0 && (M.types[id].h || 0) > this.h - 8) return Math.max(60, d - 12);   // (no nearer than 60: the walls still between are cut to their stubs)
    }
    return max;
  }
  autoRail() { return null; }   // (it turns by itself all the time)
  /** MODE 7's projection, the horizon raised while the camera is in short of a wall: the focus's feet stay on the screen
   *  row they stand on at the lens's full distance (the lens shifted further, so walls stay upright) */
  frame(r) {
    const P = super.frame(r);
    if (this.dist !== undefined && this.dist < this.back - 1) P.hy -= this.h * P.F * (1 / this.dist - 1 / this.back);
    return P;
  }
  /** the engine View a rig is drawn with at k pixels per unit, at the heading in 3° steps (whole 1/16ths of scale) */
  view(k) {
    const q = Math.max(1 / 16, Math.round(k * 16) / 16), hd = (Math.round(this.heading / VIEW_STEP) * VIEW_STEP) % 360, key = hd * 1000 + q; let v = this.views.get(key);
    if (!v) { if (this.views.size > 600) this.views.clear(); v = new E.View('chase', 'Chase', (360 - hd) % 360, this.pitch, q, 1); this.views.set(key, v); }
    return v;
  }
  /** the floor as one raster, each buffer row a line across the world at its depth: its pixels stepped in both axes,
   *  each read from its floor chunk's texels (the last chunk kept while the row stays in it) */
  drawFloor(g, floor) {
    const P = this.P, W = P.W, H = P.H, top = Math.max(0, Math.ceil(P.hy) + 1); if (top >= H) return;
    let img = this._img; if (!img || img.width !== W || img.height !== H) { img = this._img = g.createImageData(W, H); this._px = new Uint32Array(img.data.buffer); }
    const out = this._px, S = floor.size, pad = floor.pad, n = S + 2 * pad, a = this.ax(), [fr, fg, fb] = this.fogRGB, FOG = ((255 << 24) | (fb << 16) | (fg << 8) | fr) >>> 0;
    const MW = floor.W, MH = floor.H; let rows = 0;
    for (let by = top; by < H; by++) {
      const D = this.rowDepth(by + .5), o = by * W;
      if (!D || D > this.farClip) { out.fill(FOG, o, o + W); continue; }
      const step = D / P.F, sx = a.r[0] * step, sy = a.r[1] * step, L0 = (.5 - P.cx) * step;
      let x = this.x + a.f[0] * D + a.r[0] * L0, y = this.y + a.f[1] * D + a.r[1] * L0, ci = -1, cj = -1, px = null, ox = 0, oy = 0;
      for (let i = 0; i < W; i++, x += sx, y += sy) {
        if (x < 0 || y < 0 || x >= MW || y >= MH) { out[o + i] = FOG; continue; }
        const ti = Math.floor(x / S), tj = Math.floor(y / S);
        if (ti !== ci || tj !== cj) { ci = ti; cj = tj; px = floor.pixels(ci, cj); ox = pad - ci * S; oy = pad - cj * S; }
        out[o + i] = px ? px[((y | 0) + oy) * n + (x | 0) + ox] : FOG;
      }
      rows++;
    }
    g.putImageData(img, 0, 0, 0, top, W, H - top);
    const yF = this._q(this.fogStart, 0, 0), yE = this._q(this.farClip, 0, 0);   // (the far end into the fog, as MODE 7's)
    if (yF && yE) {
      const gr = g.createLinearGradient(0, Math.max(0, top - 2), 0, yF[1]);
      gr.addColorStop(0, `rgba(${fr},${fg},${fb},1)`); gr.addColorStop(Math.max(0, Math.min(1, (yE[1] - top) / Math.max(1, yF[1] - top))), `rgba(${fr},${fg},${fb},.95)`); gr.addColorStop(1, `rgba(${fr},${fg},${fb},0)`);
      g.fillStyle = gr; g.fillRect(0, Math.max(0, top - 2), P.W, yF[1] - top + 2);
    }
    this.stats.rows = rows;
  }
  /** a world point in rail space: [depth along the forward axis, across to the right] */
  _dl(x, y) { const a = this.ax(), rx = x - this.x, ry = y - this.y; return [rx * a.f[0] + ry * a.f[1], rx * a.r[0] + ry * a.r[1]]; }
  /** a wall slice from (xa, ya) to (xb, yb), h tall, in rail space from (Da, La) to (Db, Lb): its texture tw wide from
   *  phase u0 */
  _slice(g, Da, La, Db, Lb, h, cv, u0, tw, color) {
    const fog = this.fogAt(Math.min(Da, Db)), [fr, fg, fb] = this.fogRGB; if (fog >= .97) return;
    this.stats.quads += texturedFace(g, (s, t) => this._q(Da + (Db - Da) * s, La + (Lb - La) * s, h * (1 - t)), fog < .85 ? cv : null, u0, 0, tw, h, color, fog > .02 ? `rgba(${fr},${fg},${fb},${fog.toFixed(2)})` : null);
  }
  /** the draw items of the spans in view: each face looking toward the camera cut a tile wide (key: the slice's far end;
   *  the part nearer than the near plane cut off), and the tops of spans lower than the camera. focus: [x, y]; a span
   *  wholly between the camera and the focus, across its line of sight, drops to a stub (its cutH) */
  spanItems(spans, items, focus, night = true) {
    const P = this.P, PER = FACE_PERIOD, mod = (v, m) => ((v % m) + m) % m, [fD, fL] = focus ? this._dl(focus[0], focus[1]) : [0, 0];
    for (const s of spans) {
      const C = [[s.x0, s.y0], [s.x1, s.y0], [s.x1, s.y1], [s.x0, s.y1]].map(([x, y]) => this._dl(x, y));
      const Dn = Math.min(...C.map(c => c[0])), Df = Math.max(...C.map(c => c[0])); if (Df < NEAR_D || Dn > this.farClip) continue;
      const La = Math.min(...C.map(c => c[1])), Lb = Math.max(...C.map(c => c[1]));
      if ((La > 0 ? La : Lb < 0 ? -Lb : 0) * P.F / Math.max(6, Df) > P.W / 2 + 8) continue;   // wholly off to a side, even at its far end
      const cut = focus && Df < fD - 4 && (this.cutAll || (La < fL + 40 && Lb > fL - 40)), h = cut ? Math.min(s.h, s.t.cutH || 8) : s.h, hc = Math.min(s.h, s.t.cutH || 8);
      const v = (Math.floor(s.x0 / 64) * 7 + Math.floor(s.y0 / 64) * 13) & 3;
      // the four faces, each its corners [a, b] round the span and its outward normal
      for (const [ia, ib, nx, ny] of [[0, 1, 0, -1], [1, 2, 1, 0], [2, 3, 0, 1], [3, 0, -1, 0]]) {
        const ax = ia === 0 || ia === 3 ? s.x0 : s.x1, ay = ia < 2 ? s.y0 : s.y1;
        if ((this.x - ax) * nx + (this.y - ay) * ny <= 0) continue;   // (facing away)
        const bx = ib === 0 || ib === 3 ? s.x0 : s.x1, by = ib < 2 ? s.y0 : s.y1, len = Math.hypot(bx - ax, by - ay);
        const sh = shadeOf(nx, ny), cv = faceTexture(s.id, s.t, h, sh, v, night), col = faceColor(s.t, sh), along = nx ? 1 : 0;   // (an x face runs along y)
        for (let u = 0; u < len - 1e-6; u += TILE) {
          const u1 = Math.min(len, u + TILE), p0 = [ax + (bx - ax) * u / len, ay + (by - ay) * u / len], p1 = [ax + (bx - ax) * u1 / len, ay + (by - ay) * u1 / len];
          let [Da, La2] = this._dl(p0[0], p0[1]), [Db, Lb2] = this._dl(p1[0], p1[1]), w0 = 0, w1 = 1;
          if (Math.max(Da, Db) < NEAR_D || Math.min(Da, Db) > this.farClip) continue;
          if (Da < NEAR_D || Db < NEAR_D) {   // (cut at the near plane: the part behind it is not drawn)
            const t = (NEAR_D - Da) / (Db - Da); if (Da < NEAR_D) { La2 += (Lb2 - La2) * t; Da = NEAR_D; w0 = t; } else { Lb2 = La2 + (Lb2 - La2) * t; Db = NEAR_D; w1 = t; }
          }
          const tw = (u1 - u) * (w1 - w0), u0 = mod((along ? p0[1] : p0[0]) + (u1 - u) * w0, PER), DA = Da, DB = Db, LA = La2, LB = Lb2;
          // (a slice between the camera and the focus, across its line of sight, drops to its stub: a building's corner
          // turned toward the lens had hidden the player behind it)
          const hs = focus && Math.max(DA, DB) < fD - 4 && Math.min(LA, LB) < fL + 40 && Math.max(LA, LB) > fL - 40 ? hc : h, sv = hs === h ? cv : faceTexture(s.id, s.t, hs, sh, v, night);
          items.push(this._box(DA, LA, DB, LB, hs, { k: Math.max(DA, DB), m: Math.min(DA, DB), kind: 'side', fn: g => this._slice(g, DA, LA, DB, LB, hs, sv, u0, tw, col) }));
        }
      }
      if (this.h > h + 1) {   // the top, seen from above: the rectangle cut at the near plane, filled flat
        const poly = this._nearCut(C); if (poly.length < 3) continue;
        const pts = poly.map(([D, L]) => this._q(D, L, h)); if (pts.some(q => !q)) continue;
        const d0 = Math.max(NEAR_D, Dn), top = s.t.top;
        items.push({ k: d0, m: d0, kind: 'top', box: [Math.min(...pts.map(q => q[0])), Math.max(...pts.map(q => q[0])), Math.min(...pts.map(q => q[1]))], fn: g => {
          const fog = this.fogAt(d0), [fr, fg, fb] = this.fogRGB;
          g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath();
          g.fillStyle = top; g.fill(); if (fog > .02) { g.fillStyle = `rgba(${fr},${fg},${fb},${fog.toFixed(2)})`; g.fill(); } this.stats.quads++;
        } });
      }
    }
  }
  /** a convex polygon in rail space [[D, L]] cut to D >= the near plane */
  _nearCut(C) {
    const out = [];
    for (let i = 0; i < C.length; i++) {
      const p = C[i], q = C[(i + 1) % C.length], pi = p[0] >= NEAR_D, qi = q[0] >= NEAR_D;
      if (pi) out.push(p);
      if (pi !== qi) { const t = (NEAR_D - p[0]) / (q[0] - p[0]); out.push([NEAR_D, p[1] + (q[1] - p[1]) * t]); }
    }
    return out;
  }
}
