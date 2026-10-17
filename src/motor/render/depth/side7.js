// SIDE-SCROLL MODE 7 (PLAN.md 5.3, 8.5): the engine's "side scrolling with depth" (the stress test's view,
// vendor/my-3d2dge/reference/stress.game.js 615-844) generalized from one hall to a chunked city. A camera on a rail
// (level, its lens shifted to put the horizon where the stress test's 14° pitch puts it, so walls and figures stay
// upright: DECISIONS D8): heading locked to an axis (north by default; 90° steps), it follows the focus sideways and keeps it near..far
// ahead, moving in depth only past those. The floor is drawn a screen row at a time from the floor chunks' canvases
// (Mode 7); the TileMap's walls come as box spans, sliced a tile deep along the rail and drawn back to front with the
// scene's actors, each face an exact quad filled with its wall texture under an affine map; rigs are the engine's own,
// drawn through a View at the scale their distance gives (view7). The engine's own lighting and particles stay off in
// this view; MOTOR draws its own.
//   Sort keys (depth D along the rail, far first): a side-face slice by its far edge, a front face by its depth, an actor
//   by its own. An actor on the camera's side of a wall then always draws over it, and one beyond is hidden by the
//   nearer slices that cross its line of sight.
import { E } from '../../engine.js';
import { faceTexture, shadeOf, faceColor, FACE_PERIOD } from './textures.js';
import { texturedFace } from './quads.js';

const DEG = Math.PI / 180;
/** the rail's axes by heading: f forward (into the screen), r to the screen's right; 0 = north (the camera south of the
 *  focus, looking north), 90 east, 180 south, 270 west */
export const RAIL = { 0: { f: [0, -1], r: [1, 0] }, 90: { f: [1, 0], r: [0, 1] }, 180: { f: [0, 1], r: [-1, 0] }, 270: { f: [-1, 0], r: [0, -1] } };
const NEAR_D = 10;   // nothing nearer than this along the rail is drawn

export class Side7View {
  /** o: { map (TileMap), floor (FloorChunks), spans (Spans), sky: [colors top to bottom], fog: colour, farClip: 600,
   *  h: 70, pitch: 14, fov: 50, near: 110, far: 260 } */
  constructor(o) {
    Object.assign(this, { id: 'side7', label: 'MODE 7', heading: 0, x: 0, y: 0, h: 70, pitch: 14, fov: 50, near: 110, far: 260, farClip: 600, fogStart: 300,
      sky: ['#07061a', '#1c1438', '#3a2450'], fog: '#2a1f3e', ready: false, zoom: 1, views: new Map(), stats: { rows: 0, quads: 0, actors: 0 } }, o);
    this.fogRGB = E.hex(this.fog);
  }
  /** turn the rail to a heading (0, 90, 180, 270) round the focus, keeping its distance */
  setHeading(deg, fx, fy) {
    deg = ((Math.round(deg / 90) * 90) % 360 + 360) % 360; if (deg === this.heading && this.ready) return;
    const d = (this.near + this.far) / 2, a = RAIL[deg]; this.heading = deg;
    if (fx !== undefined) { this.x = fx - a.f[0] * d; this.y = fy - a.f[1] * d; this.ready = true; }
  }
  /** the camera follows the focus: sideways always (smoothed), in depth only when it comes nearer than near or goes past
   *  far. Presentation only: the simulation never reads it */
  follow(dt, fx, fy) {
    const a = RAIL[this.heading];
    if (!this.ready) { const d = (this.near + this.far) / 2; this.x = fx - a.f[0] * d; this.y = fy - a.f[1] * d; this.ready = true; return; }
    const rx = fx - this.x, ry = fy - this.y, L = rx * a.r[0] + ry * a.r[1], D = rx * a.f[0] + ry * a.f[1];
    const k = 1 - Math.exp(-dt * 5), want = E.clamp(D, this.near, this.far), mv = (D - want) * Math.min(1, k * 2);
    this.x += a.r[0] * L * k + a.f[0] * mv; this.y += a.r[1] * L * k + a.f[1] * mv;
  }
  /** set up the projection for this frame (r: the engine renderer: its buffer size and sub-pixel offset) */
  frame(r) {
    const sc = r.game.screen, p = this.pitch * DEG, fov = 2 * Math.atan(Math.tan(this.fov * DEG / 2) / (this.zoom || 1)), a = RAIL[this.heading];
    // a level camera with its lens shifted down (the horizon where a camera pitched this.pitch would see it): the floor
    // recedes as from the pitched camera, but walls and figures stay upright, as in the SNES games (no leaning towers)
    const F = r.H / 2 / Math.tan(fov / 2), cy = r.H / 2 + (sc.fy || 0);
    this.P = { F, cx: r.W / 2 + (sc.fx || 0), cy, hy: cy - F * Math.tan(p), f: a.f, r: a.r, W: r.bw, H: r.bh };
    return this.P;
  }
  /** world (x, y, z) -> [buffer x, buffer y, pixels per unit there], or null at or behind the camera */
  proj(x, y, z = 0) {
    const P = this.P, rx = x - this.x, ry = y - this.y, D = rx * P.f[0] + ry * P.f[1]; if (D < 6) return null;
    const k = P.F / D; return [P.cx + (rx * P.r[0] + ry * P.r[1]) * k, P.hy - (z - this.h) * k, k];
  }
  /** (D, L, z) in rail space -> [buffer x, buffer y] (null behind the camera) */
  _q(D, L, z) { if (D < 6) return null; const P = this.P, k = P.F / D; return [P.cx + L * k, P.hy - (z - this.h) * k, k]; }
  /** a buffer row's floor distance along the rail (the inverse of proj on the floor), or 0 at and above the horizon */
  rowDepth(by) { const d = by - this.P.hy; return d <= 1e-3 ? 0 : this.h * this.P.F / d; }
  /** the ground point under a buffer pixel, or null above the horizon */
  toGround(bx, by) {
    const P = this.P, D = this.rowDepth(by); if (!D) return null;
    const L = (bx - P.cx) * D / P.F;
    return [this.x + P.f[0] * D + P.r[0] * L, this.y + P.f[1] * D + P.r[1] * L];
  }
  /** depth along the rail of a world point: the draw order key (bigger is farther) */
  depth(x, y) { const a = RAIL[this.heading]; return (x - this.x) * a.f[0] + (y - this.y) * a.f[1]; }
  /** how far right of the rail's centre line a world point is (its screen-across coordinate, in world units) */
  lateral(x, y) { const a = RAIL[this.heading]; return (x - this.x) * a.r[0] + (y - this.y) * a.r[1]; }
  /** a direction pushed on screen (x right, y down) -> a ground direction: up the screen is along the rail */
  screenDirToGround(dx, dy) {
    if (!dx && !dy) return [0, 0];
    const a = RAIL[this.heading], gx = a.r[0] * dx - a.f[0] * dy, gy = a.r[1] * dx - a.f[1] * dy, l = Math.hypot(gx, gy) || 1, m = Math.min(1, Math.hypot(dx, dy));
    return [gx / l * m, gy / l * m];
  }
  /** the engine View a rig is drawn with at k pixels per unit (whole 1/16ths, so views are reused), facing the rail */
  view(k) {
    const q = Math.max(1 / 16, Math.round(k * 16) / 16), key = this.heading * 1000 + q; let v = this.views.get(key);
    if (!v) { if (this.views.size > 400) this.views.clear(); v = new E.View('side7', 'Mode 7', (360 - this.heading) % 360, this.pitch, q, 1); this.views.set(key, v); }
    return v;
  }
  /** the chunk range [i0, j0, i1, j1] the camera's wedge can see (to farClip) */
  wedge(size) {
    const P = this.P, a = RAIL[this.heading], half = this.farClip * (P.W / 2) / P.F + 64, fx = this.x + a.f[0] * this.farClip, fy = this.y + a.f[1] * this.farClip;
    const xs = [this.x - a.r[0] * 64 - a.f[0] * 32, fx - a.r[0] * half, fx + a.r[0] * half, this.x + a.r[0] * 64 - a.f[0] * 32];
    const ys = [this.y - a.r[1] * 64 - a.f[1] * 32, fy - a.r[1] * half, fy + a.r[1] * half, this.y + a.r[1] * 64 - a.f[1] * 32];
    return [Math.floor(Math.min(...xs) / size), Math.floor(Math.min(...ys) / size), Math.floor(Math.max(...xs) / size), Math.floor(Math.max(...ys) / size)];
  }
  /** fog 0..1 at depth D */
  fogAt(D) { return E.clamp((D - this.fogStart) / (this.farClip - this.fogStart), 0, 1); }

  /* ---- drawing ---- */
  /** the sky above the horizon: a gradient (the backdrop with yaw parallax comes with M7's sky) */
  drawSky(g, top) {
    const P = this.P, gr = g.createLinearGradient(0, 0, 0, Math.max(1, top));
    this.sky.forEach((c, i) => gr.addColorStop(i / Math.max(1, this.sky.length - 1), c));
    g.fillStyle = gr; g.fillRect(0, 0, P.W, P.H);
  }
  /** the floor, a buffer row at a time, from the floor chunks (one drawImage per row per chunk it crosses) */
  drawFloor(g, floor) {
    const P = this.P, S = floor.size, pad = floor.pad, ns = P.f[0] === 0, top = Math.max(0, Math.ceil(P.hy) + 1);
    let rows = 0;
    for (let by = top; by < P.H; by++) {
      const D = this.rowDepth(by + .5); if (!D || D > this.farClip) continue;
      const u = D / P.F, L0 = -P.cx * u, L1 = (P.W - P.cx) * u;
      // the row's world line: C + D f + L r, L in [L0, L1]; along x on a north or south rail, along y on east or west
      const lx = this.x + P.f[0] * D, ly = this.y + P.f[1] * D;
      const a0 = (ns ? lx : ly) + L0 * (ns ? P.r[0] : P.r[1]), a1 = (ns ? lx : ly) + L1 * (ns ? P.r[0] : P.r[1]), lo = Math.min(a0, a1), hi = Math.max(a0, a1);
      const fixed = ns ? ly : lx, cj = Math.floor(fixed / S); if (fixed < 0 || fixed >= (ns ? floor.H : floor.W)) continue;
      const s = ns ? P.r[0] : P.r[1];   // +1 or -1: the screen's x runs with or against the world axis
      for (let ci = Math.max(0, Math.floor(lo / S)); ci <= Math.min((ns ? floor.nx : floor.ny) - 1, Math.floor(hi / S)); ci++) {
        const cv = ns ? floor.canvas(ci, cj) : floor.canvas(cj, ci); if (!cv) continue;
        const o0 = ci * S - pad, oF = cj * S - pad, t = Math.floor(fixed) - oF;   // the chunk's origin along the row, across it; the texel line
        const ta = Math.max(0, Math.floor(lo) - o0 - 1), tb = Math.min(S + 2 * pad, Math.ceil(hi) - o0 + 1); if (tb <= ta) continue;
        // texel (along, t) -> screen x = cx + (o0 + along - C.axis) * s / u, screen y = by
        const e = P.cx + ((o0 - (ns ? this.x : this.y)) * s) / u;
        if (ns) { g.setTransform(s / u, 0, 0, 1, e, by - t); g.drawImage(cv, ta, t, tb - ta, 1, ta, t, tb - ta, 1); }
        else { g.setTransform(0, 1, s / u, 0, e, by - t); g.drawImage(cv, t, ta, 1, tb - ta, t, ta, 1, tb - ta); }
        rows++;
      }
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    // the far end fades into the fog: a gradient from the horizon down to where the fog starts
    const yF = this._q(this.fogStart, 0, 0), yE = this._q(this.farClip, 0, 0), [fr, fg, fb] = this.fogRGB;
    if (yF && yE) {
      const gr = g.createLinearGradient(0, Math.max(0, top - 2), 0, yF[1]);
      gr.addColorStop(0, `rgba(${fr},${fg},${fb},1)`); gr.addColorStop(Math.max(0, Math.min(1, (yE[1] - top) / Math.max(1, yF[1] - top))), `rgba(${fr},${fg},${fb},.95)`); gr.addColorStop(1, `rgba(${fr},${fg},${fb},0)`);
      g.fillStyle = gr; g.fillRect(0, Math.max(0, top - 2), P.W, yF[1] - top + 2);
    }
    this.stats.rows = rows;
  }
  /** a face in rail space: P(s, t) over the face from D0..D1 and L0..L1 (one of the pairs equal), z from top to foot */
  _face(g, D0, D1, L0, L1, h, cv, u0, color) {
    const fog = this.fogAt(Math.min(D0, D1)), [fr, fg, fb] = this.fogRGB;
    if (fog >= .97) return;
    this.stats.quads += texturedFace(g, (s, t) => this._q(D0 + (D1 - D0) * s, L0 + (L1 - L0) * s, h * (1 - t)), fog < .85 ? cv : null, u0, 0, Math.abs(D1 - D0) + Math.abs(L1 - L0), h, color, fog > .02 ? `rgba(${fr},${fg},${fb},${fog.toFixed(2)})` : null);
  }
  /** the draw items of the spans in view, pushed onto items as { k, fn(g) }: side-face slices a tile deep (key: the
   *  slice's far edge), front faces (key: their depth) and the tops of spans lower than the camera. focus: [x, y]; a
   *  span wholly between the camera and the focus, across its line of sight, drops to a stub (its cutH) */
  spanItems(spans, items, focus, night = true) {
    const a = RAIL[this.heading], P = this.P, T = 16, PER = FACE_PERIOD, mod = (v, m) => ((v % m) + m) % m;
    const fD = focus ? this.depth(focus[0], focus[1]) : 0, fL = focus ? (focus[0] - this.x) * a.r[0] + (focus[1] - this.y) * a.r[1] : 0;
    const cAlong = this.x * a.f[0] + this.y * a.f[1], cAcross = this.x * a.r[0] + this.y * a.r[1];   // the camera's own coordinates along and across the rail
    for (const s of spans) {
      let Dn = 1e9, Df = -1e9, La = 1e9, Lb = -1e9;
      for (const [x, y] of [[s.x0, s.y0], [s.x1, s.y0], [s.x0, s.y1], [s.x1, s.y1]]) {
        const rx = x - this.x, ry = y - this.y, D = rx * a.f[0] + ry * a.f[1], L = rx * a.r[0] + ry * a.r[1];
        Dn = Math.min(Dn, D); Df = Math.max(Df, D); La = Math.min(La, L); Lb = Math.max(Lb, L);
      }
      if (Df < NEAR_D || Dn > this.farClip) continue;
      if ((La > 0 ? La : Lb < 0 ? -Lb : 0) * P.F / Math.max(6, Df) > P.W / 2 + 8) continue;   // wholly off to a side, even at its far end
      const cut = focus && Df < fD - 4 && La < fL + 40 && Lb > fL - 40, h = cut ? Math.min(s.h, s.t.cutH || 8) : s.h;
      const v = (Math.floor(s.x0 / 64) * 7 + Math.floor(s.y0 / 64) * 13) & 3;
      // the side face the camera sees: the near-side one of a span off to one side (none while the camera is level with it)
      const side = La > 0 ? La : Lb < 0 ? Lb : null;
      if (side !== null) {
        const nx = La > 0 ? -a.r[0] : a.r[0], ny = La > 0 ? -a.r[1] : a.r[1], sh = shadeOf(nx, ny), cv = faceTexture(s.id, s.t, h, sh, v, night), col = faceColor(s.t, sh);
        for (let b = Dn; b < Df; b += T) {   // tile edges along the rail
          const d0 = Math.max(b, NEAR_D), d1 = Math.min(Df, b + T); if (d1 <= d0) continue; if (d0 > this.farClip) break;
          const u0 = mod(cAlong + b, PER) + (d0 - b);   // the texture's phase: windows stay on their tiles
          items.push({ k: d1, fn: g => this._face(g, d0, d1, side, side, h, cv, u0, col) });
        }
      }
      if (Dn >= NEAR_D) {   // the front face, toward the camera
        const sh = shadeOf(-a.f[0], -a.f[1]), cv = faceTexture(s.id, s.t, h, sh, v, night), col = faceColor(s.t, sh), u0 = mod(cAcross + La, PER);
        items.push({ k: Dn, fn: g => this._face(g, Dn, Dn, La, Lb, h, cv, u0, col) });
      }
      if (this.h > h + 1) {   // the top, seen from above
        const d0 = Math.max(NEAR_D, Dn);
        items.push({ k: d0, fn: g => {
          const fog = this.fogAt(d0), [fr, fg, fb] = this.fogRGB;
          this.stats.quads += texturedFace(g, (u, t) => this._q(Df + (d0 - Df) * t, La + (Lb - La) * u, h), null, 0, 0, 1, 1, s.t.top, fog > .02 ? `rgba(${fr},${fg},${fb},${fog.toFixed(2)})` : null);
        } });
      }
    }
  }
}
