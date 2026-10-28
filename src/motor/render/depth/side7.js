// SIDE-SCROLL MODE 7 (PLAN.md 5.3, 8.5): the engine's "side scrolling with depth" (the stress test's view,
// vendor/my-3d2dge/reference/stress.game.js 615-844) generalized from one hall to a chunked city. A camera on a rail
// (level, its lens shifted to put the horizon where the stress test's 14° pitch puts it, so walls and figures stay
// upright: DECISIONS D8): its heading on an axis (north by default; Auto-rail and a mission's set piece keep it there)
// or, turned by hand, any (D48: off the quarters it draws as the chase camera does, its floor and spans at any
// heading), it follows the focus sideways and keeps it near..far ahead, moving in depth only past those. On foot it
// stands 70 up and keeps the focus 110-260 ahead; in a vehicle 90 up, 160-380 ahead, its field widening with speed
// (rig); Auto-rail turns it to the axis a vehicle has held 1.5 s. The sky above the horizon is the hour's backdrop, its
// skyline turning with the rail. The floor is drawn a screen row at a time from the floor chunks' canvases (Mode 7);
// the TileMap's walls come as box spans, sliced a tile deep along the rail and drawn back to front with the scene's
// actors, each face an exact quad filled with its wall texture under an affine map (a front face, square on to the
// level camera, an upright rectangle on screen: its texture in plain scaled blits); rigs are the engine's own, drawn
// through a View at the scale their distance gives (view7). The engine's own lighting and particles stay off in this
// view; MOTOR draws its own. Each face says where it stands on screen, so the Stage can leave out whatever the nearer
// walls hide (Stage._cull7).
//   Sort keys (depth D along the rail, far first): a side-face slice by its far edge, a front face by its depth, an actor
//   by its own. An actor on the camera's side of a wall then always draws over it, and one beyond is hidden by the
//   nearer slices that cross its line of sight.
import { E } from '../../engine.js';
import { faceTexture, shadeOf, faceColor, FACE_PERIOD } from './textures.js';
import { texturedFace } from './quads.js';

const DEG = Math.PI / 180, TILE = 16, VIEW_STEP = 3;
/** the axes at any heading in degrees (0 north, 90 east): f forward (into the screen), r to the screen's right (at the
 *  quarters, RAIL's) */
export function axesAt(deg) { const t = deg * DEG; return { f: [Math.sin(t), -Math.cos(t)], r: [Math.cos(t), Math.sin(t)] }; }
/** the rail's axes by heading: f forward (into the screen), r to the screen's right; 0 = north (the camera south of the
 *  focus, looking north), 90 east, 180 south, 270 west */
export const RAIL = { 0: { f: [0, -1], r: [1, 0] }, 90: { f: [1, 0], r: [0, 1] }, 180: { f: [0, 1], r: [-1, 0] }, 270: { f: [-1, 0], r: [0, -1] } };
const NEAR_D = 10;   // nothing nearer than this along the rail is drawn
/** the rail's lens on foot and in a vehicle (PLAN.md 5.3): height, the focus kept near..far ahead, the field of view
 *  (widen: degrees more at top speed) */
export const RIGS = { foot: { h: 70, near: 110, far: 260, fov: 50, widen: 0 }, vehicle: { h: 90, near: 160, far: 380, fov: 50, widen: 12 }, indoor: { h: 50, near: 64, far: 190, fov: 58, widen: 0 } };   // (indoor: a room's own, nearer and lower)
const AUTO_RAIL = 1.5, AUTO_SPEED = 40, AUTO_SHARE = .9;   // (s of steady travel along an axis; the least speed; its share along the axis)

export class Side7View {
  /** o: { map (TileMap), floor (FloorChunks), spans (Spans), sky: [colors top to bottom], fog: colour, farClip: 600,
   *  h: 70, pitch: 14, fov: 50, near: 110, far: 260 } */
  constructor(o) {
    Object.assign(this, { id: 'side7', label: 'MODE 7', heading: 0, x: 0, y: 0, h: 70, pitch: 14, fov: 50, near: 110, far: 260, farClip: 600, fogStart: 300,
      sky: ['#07061a', '#1c1438', '#3a2450'], fog: '#2a1f3e', ready: false, zoom: 1, views: new Map(), stats: { rows: 0, quads: 0, actors: 0 } }, o);
    this.fogRGB = E.hex(this.fog); this.mode7 = true;
  }
  /** the heading kept images are keyed by (a body's, a prop's image is redrawn when it moves on): off the quarters, in
   *  steps of 1.5° (turning, each frame's would never be reused) */
  get keyHeading() { return this.aligned ? this.heading : Math.round(this.heading / 1.5) * 1.5; }
  /** is the rail on a quarter (0, 90, 180, 270)? Then it draws with the rail's own fast paths; turned off them by hand
   *  (D48), as at any heading (the chase camera's drawing) */
  get aligned() { return RAIL[this.heading] !== undefined; }
  /** the rail's axes { f, r }: RAIL's on a quarter, else axesAt the heading (kept while it holds) */
  ax() { return RAIL[this.heading] || (this._axOf === this.heading ? this._ax : (this._axOf = this.heading, this._ax = axesAt(this.heading))); }
  /** turn the rail to a heading (0, 90, 180, 270) round the focus, keeping its distance */
  setHeading(deg, fx, fy) {
    deg = ((Math.round(deg / 90) * 90) % 360 + 360) % 360; if (deg === this.heading && this.ready) return;
    const d = (this.near + this.far) / 2, a = RAIL[deg]; this.heading = deg;
    if (fx !== undefined) { this.x = fx - a.f[0] * d; this.y = fy - a.f[1] * d; this.ready = true; }
  }
  /** turn to any heading (degrees) about the focus at (fx, fy), keeping it where it stands on screen (its depth along
   *  the rail and across it): the turn buttons' spin (D48) */
  orbit(deg, fx, fy) {
    const a0 = this.ax(), rx = fx - this.x, ry = fy - this.y, D = rx * a0.f[0] + ry * a0.f[1], L = rx * a0.r[0] + ry * a0.r[1];
    this.heading = ((deg % 360) + 360) % 360; if (!this.ready || fx === undefined) return;
    const a = this.ax(); this.x = fx - a.f[0] * D - a.r[0] * L; this.y = fy - a.f[1] * D - a.r[1] * L;
  }
  /** the lens for where the focus is (in a vehicle or not), how fast (speed01, 0..1 of top speed) and how high (fz: the
   *  lens rides that much higher, on a deck or in the air): eased, so getting in or out moves the camera rather than
   *  cutting it */
  rig(dt, vehicle, speed01 = 0, fz = 0) {
    const R = this.indoor ? RIGS.indoor : vehicle ? RIGS.vehicle : RIGS.foot, k = this.ready ? 1 - Math.exp(-dt * 2.5) : 1, fov = R.fov + R.widen * E.clamp(speed01, 0, 1);
    this.h += (R.h + fz - this.h) * k; this.near += (R.near - this.near) * k; this.far += (R.far - this.far) * k; this.fov += (fov - this.fov) * k;
  }
  /** Auto-rail: given a vehicle's velocity each step, the heading of the axis it has held steady for 1.5 s (going
   *  faster than 40, nine tenths of it along that axis) once it differs from the rail's own, else null */
  autoRail(dt, vx, vy) {
    const sp = Math.hypot(vx, vy), ax = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 90 : 270) : (vy > 0 ? 180 : 0);
    if (sp < AUTO_SPEED || Math.max(Math.abs(vx), Math.abs(vy)) < sp * AUTO_SHARE || ax === this.heading) { this.steadyT = 0; this.steadyAx = null; return null; }
    if (ax !== this.steadyAx) { this.steadyAx = ax; this.steadyT = 0; }
    if ((this.steadyT += dt) < AUTO_RAIL) return null;
    this.steadyT = 0; this.steadyAx = null; return ax;
  }
  /** the camera follows the focus: sideways always (smoothed), in depth only when it comes nearer than near or goes past
   *  far. Presentation only: the simulation never reads it */
  follow(dt, fx, fy) {
    const a = this.ax();
    if (!this.ready) { const d = (this.near + this.far) / 2; this.x = fx - a.f[0] * d; this.y = fy - a.f[1] * d; this.ready = true; return; }
    const rx = fx - this.x, ry = fy - this.y, L = rx * a.r[0] + ry * a.r[1], D = rx * a.f[0] + ry * a.f[1];
    const k = 1 - Math.exp(-dt * 5), want = E.clamp(D, this.near, this.far), mv = (D - want) * Math.min(1, k * 2);
    this.x += a.r[0] * L * k + a.f[0] * mv; this.y += a.r[1] * L * k + a.f[1] * mv;
  }
  /** set up the projection for this frame (r: the engine renderer: its buffer size and sub-pixel offset) */
  frame(r) {
    const sc = r.game.screen, p = this.pitch * DEG, fov = 2 * Math.atan(Math.tan(this.fov * DEG / 2) / (this.zoom || 1)), a = this.ax();
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
  depth(x, y) { const a = this.ax(); return (x - this.x) * a.f[0] + (y - this.y) * a.f[1]; }
  /** a point's depth for sorting a model's parts (bigger is farther; the camera is level, so height breaks ties) */
  depth3(x, y, z = 0) { return this.depth(x, y) - z * 1e-3; }
  /** how far right of the rail's centre line a world point is (its screen-across coordinate, in world units) */
  lateral(x, y) { const a = this.ax(); return (x - this.x) * a.r[0] + (y - this.y) * a.r[1]; }
  /** a direction pushed on screen (x right, y down) -> a ground direction: up the screen is along the rail */
  /** a world offset on screen, linear: across the rail to the right, along it up the screen (foreshortened by the
   *  pitch), height up */
  screenVec(x, y, z = 0) { const a = this.ax(); return [x * a.r[0] + y * a.r[1], -(x * a.f[0] + y * a.f[1]) * .3 - z]; }
  /** the stick's push screenDirToGround reads as the ground direction (x, y): its inverse (screenVec squashes the
   *  depth for the lock-on's cone on screen; a stick pushed up is straight along the rail) */
  groundDirToScreen(x, y) { const a = this.ax(); return [x * a.r[0] + y * a.r[1], -(x * a.f[0] + y * a.f[1])]; }
  screenDirToGround(dx, dy) {
    if (!dx && !dy) return [0, 0];
    const a = this.ax(), gx = a.r[0] * dx - a.f[0] * dy, gy = a.r[1] * dx - a.f[1] * dy, l = Math.hypot(gx, gy) || 1, m = Math.min(1, Math.hypot(dx, dy));
    return [gx / l * m, gy / l * m];
  }
  /** the engine View a rig is drawn with at k pixels per unit (whole 1/16ths, so views are reused), facing the rail */
  view(k) {
    const q = Math.max(1 / 16, Math.round(k * 16) / 16), hd = this.aligned ? this.heading : (Math.round(this.heading / VIEW_STEP) * VIEW_STEP) % 360, key = hd * 1000 + q; let v = this.views.get(key);   // (off the quarters: in 3° steps)
    if (!v) { if (this.views.size > 400) this.views.clear(); v = new E.View('side7', 'Mode 7', (360 - hd) % 360, this.pitch, q, 1); this.views.set(key, v); }
    return v;
  }
  /** the chunk range [i0, j0, i1, j1] the camera's wedge can see (to farClip) */
  wedge(size) {
    const P = this.P, a = this.ax(), half = this.farClip * (P.W / 2) / P.F + 64, fx = this.x + a.f[0] * this.farClip, fy = this.y + a.f[1] * this.farClip;
    const xs = [this.x - a.r[0] * 64 - a.f[0] * 32, fx - a.r[0] * half, fx + a.r[0] * half, this.x + a.r[0] * 64 - a.f[0] * 32];
    const ys = [this.y - a.r[1] * 64 - a.f[1] * 32, fy - a.r[1] * half, fy + a.r[1] * half, this.y + a.r[1] * 64 - a.f[1] * 32];
    return [Math.floor(Math.min(...xs) / size), Math.floor(Math.min(...ys) / size), Math.floor(Math.max(...xs) / size), Math.floor(Math.max(...ys) / size)];
  }
  /** fog 0..1 at depth D */
  fogAt(D) { return E.clamp((D - this.fogStart) / (this.farClip - this.fogStart), 0, 1); }

  /* ---- drawing ---- */
  /** the sky above the horizon (top: its buffer row): the hour's backdrop bd (render/sky.js: its stars, moon and
   *  skyline) drawn through the engine renderer r into the band above it, the skyline turning with the rail (a quarter
   *  turn moves it on a long way, the rail's sideways run a little: the yaw parallax); with none, a gradient */
  drawSky(g, top, bd = null, r = null) {
    const P = this.P;
    if (bd && r) {
      const a = this.ax(), R = this._R && this._Rof === r ? this._R : (this._Rof = r, this._R = Object.create(r));   // (kept: its own caches, the sky's baked strips, last)
      g.fillStyle = this.fog; g.fillRect(0, 0, P.W, P.H);   // (below the band, where no floor row is drawn: the fog's colour)
      const own = { ctx: g, bh: Math.max(4, Math.ceil((top + 2) / 4) * 4), ix: this.heading * 4 + (this.x * a.r[0] + this.y * a.r[1]) * .25, iy: 0 };
      for (const k in own) Object.defineProperty(R, k, { value: own[k], writable: true, configurable: true });   // (own values over the renderer's getters)
      bd.draw(R);
      // (the skyline's foot fades into the haze, as the far streets do: farther is paler, never darker)
      const [fr, fgr, fb] = this.fogRGB, b = own.bh, hz = g.createLinearGradient(0, b * .45, 0, b);
      hz.addColorStop(0, `rgba(${fr},${fgr},${fb},0)`); hz.addColorStop(1, `rgba(${fr},${fgr},${fb},.92)`);
      g.fillStyle = hz; g.fillRect(0, Math.floor(b * .45), P.W, Math.ceil(b * .55) + 1);
      return;
    }
    const gr = g.createLinearGradient(0, 0, 0, Math.max(1, top));
    this.sky.forEach((c, i) => gr.addColorStop(i / Math.max(1, this.sky.length - 1), c));
    g.fillStyle = gr; g.fillRect(0, 0, P.W, P.H);
  }
  /** the floor as one raster (Mode 7 proper): each buffer row's pixels read straight from the floor chunks' texels (a
   *  chunk's pixels read once and kept with it), past the far clip or off the map the fog's colour, and put in with one
   *  putImageData (a drawImage a row a chunk was about 420 calls a frame) */
  drawFloor(g, floor) {
    if (!this.aligned) return this._floorAny(g, floor);
    const P = this.P, W = P.W, H = P.H, top = Math.max(0, Math.ceil(P.hy) + 1); if (top >= H) return;
    let img = this._img; if (!img || img.width !== W || img.height !== H) { img = this._img = g.createImageData(W, H); this._px = new Uint32Array(img.data.buffer); }
    const out = this._px, S = floor.size, pad = floor.pad, n = S + 2 * pad, ns = P.f[0] === 0, s = ns ? P.r[0] : P.r[1];   // s: +1 or -1, the screen's x with or against the world axis
    const along0 = ns ? this.x : this.y, lenA = ns ? floor.W : floor.H, lenF = ns ? floor.H : floor.W, [fr, fg, fb] = this.fogRGB, FOG = ((255 << 24) | (fb << 16) | (fg << 8) | fr) >>> 0;
    let rows = 0;
    for (let by = top; by < H; by++) {
      // the row's world line: C + D f + L r; along x on a north or south rail, along y on east or west, the other fixed
      const D = this.rowDepth(by + .5), o = by * W, fixed = ns ? this.y + P.f[1] * D : this.x + P.f[0] * D;
      if (!D || D > this.farClip || fixed < 0 || fixed >= lenF) { out.fill(FOG, o, o + W); continue; }
      const step = s * D / P.F, cj = Math.floor(fixed / S), t = Math.floor(fixed) - cj * S + pad;   // the texel line across the row, in its chunk
      for (let x = 0; x < W;) {   // a run of pixels a chunk
        let a = along0 + (x + .5 - P.cx) * step;   // (the pixel's centre, along the row)
        if (a < 0 || a >= lenA) { out[o + x++] = FOG; continue; }
        const ci = Math.floor(a / S), lo = ci * S, hi = lo + S, px = ns ? floor.pixels(ci, cj) : floor.pixels(cj, ci);
        if (!px) { for (; x < W && a >= lo && a < hi; x++, a += step) out[o + x] = FOG; continue; }
        if (ns) { const b = t * n + pad - lo; for (; x < W && a >= lo && a < hi; x++, a += step) out[o + x] = px[b + (a | 0)]; }
        else { const b = pad - lo; for (; x < W && a >= lo && a < hi; x++, a += step) out[o + x] = px[(b + (a | 0)) * n + t]; }
      }
      rows++;
    }
    g.putImageData(img, 0, 0, 0, top, W, H - top);
    // the far end fades into the fog: a gradient from the horizon down to where the fog starts
    const yF = this._q(this.fogStart, 0, 0), yE = this._q(this.farClip, 0, 0);
    if (yF && yE) {
      const gr = g.createLinearGradient(0, Math.max(0, top - 2), 0, yF[1]);
      gr.addColorStop(0, `rgba(${fr},${fg},${fb},1)`); gr.addColorStop(Math.max(0, Math.min(1, (yE[1] - top) / Math.max(1, yF[1] - top))), `rgba(${fr},${fg},${fb},.95)`); gr.addColorStop(1, `rgba(${fr},${fg},${fb},0)`);
      g.fillStyle = gr; g.fillRect(0, Math.max(0, top - 2), P.W, yF[1] - top + 2);
    }
    this.stats.rows = rows;
  }
  /** a face in rail space: P(s, t) over the face from D0..D1 and L0..L1 (one of the pairs equal), z from top to foot */
  _face(g, D0, D1, L0, L1, h, cv, u0, color, yMax = Infinity) {
    const fog = this.fogAt(Math.min(D0, D1)), [fr, fg, fb] = this.fogRGB;
    if (fog >= .97) return;
    this.stats.quads += texturedFace(g, (s, t) => this._q(D0 + (D1 - D0) * s, L0 + (L1 - L0) * s, h * (1 - t)), fog < .85 ? cv : null, u0, 0, Math.abs(D1 - D0) + Math.abs(L1 - L0), h, color, fog > .02 ? `rgba(${fr},${fg},${fb},${fog.toFixed(2)})` : null, yMax);
  }
  /** a front face (depth D, across L0..L1): square on to the level camera, so an upright rectangle on screen with its
   *  texture at one scale, drawn as plain scaled blits (a period of the texture each; an affine pattern costs several
   *  times as much a pixel in a software canvas), its visible part only */
  _front(g, D, L0, L1, h, cv, u0, color, yMax = Infinity) {
    const fog = this.fogAt(D); if (fog >= .97) return;
    const P = this.P, k = P.F / D, x0 = P.cx + L0 * k, y0 = P.hy - (h - this.h) * k, X0 = Math.max(0, x0), X1 = Math.min(P.W, P.cx + L1 * k), Y0 = Math.max(0, y0), Y1 = Math.min(P.H, P.hy + this.h * k, Math.ceil(yMax));
    if (X1 <= X0 || Y1 <= Y0) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (cv && fog < .85) {
      const v0 = (Y0 - y0) / k, vh = (Y1 - Y0) / k, end = u0 + (X1 - x0) / k;
      for (let u = u0 + (X0 - x0) / k; u < end - 1e-6;) { const pu = ((u % FACE_PERIOD) + FACE_PERIOD) % FACE_PERIOD, w = Math.min(FACE_PERIOD - pu, end - u); g.drawImage(cv, pu, v0, w, vh, x0 + (u - u0) * k, Y0, w * k, Y1 - Y0); u += w; this.stats.quads++; }
    } else { g.fillStyle = color; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0); this.stats.quads++; }
    if (fog > .02) { const [fr, fg, fb] = this.fogRGB; g.fillStyle = `rgba(${fr},${fg},${fb},${fog.toFixed(2)})`; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0); }
  }
  /** a face's screen box [x0, x1, top] and its top edge as an occluder [xa, ya, xb, yb] (drawn opaque), from its top
   *  corners at depths Da, Db and across La, Lb (null behind the camera) */
  _box(Da, La, Db, Lb, h, item) {
    const a = this._q(Da, La, h), b = this._q(Db, Lb, h); if (!a || !b) return item;
    item.box = [Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1])];
    if (this.fogAt(Math.min(Da, Db)) < .97) item.occ = [a[0], a[1], b[0], b[1]];
    return item;
  }
  /** the draw items of the spans in view, pushed onto items as { k, fn(g) }: side-face slices a tile deep (key: the
   *  slice's far edge), front faces (key: their depth) and the tops of spans lower than the camera. focus: [x, y]; a
   *  span wholly between the camera and the focus, across its line of sight, drops to a stub (its cutH) */
  spanItems(spans, items, focus, night = true) {
    if (!this.aligned) return this._spansAny(spans, items, focus, night);
    const a = this.ax(), P = this.P, T = TILE, PER = FACE_PERIOD, mod = (v, m) => ((v % m) + m) % m;
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
      const cut = focus && Df < fD - 4 && (this.cutAll || (La < fL + 40 && Lb > fL - 40)), h = cut ? Math.min(s.h, s.t.cutH || 8) : s.h;   // (indoors, cutAll: every wall nearer than the focus)
      const v = (Math.floor(s.x0 / 64) * 7 + Math.floor(s.y0 / 64) * 13) & 3;
      // the side face the camera sees: the near-side one of a span off to one side (none while the camera is level with it)
      const side = La > 0 ? La : Lb < 0 ? Lb : null;
      if (side !== null) {
        const nx = La > 0 ? -a.r[0] : a.r[0], ny = La > 0 ? -a.r[1] : a.r[1], sh = shadeOf(nx, ny), cv = faceTexture(s.id, s.t, h, sh, v, night), col = faceColor(s.t, sh);
        for (let b = Dn; b < Df; b += T) {   // tile edges along the rail
          const d0 = Math.max(b, NEAR_D), d1 = Math.min(Df, b + T); if (d1 <= d0) continue; if (d0 > this.farClip) break;
          const u0 = mod(cAlong + b, PER) + (d0 - b);   // the texture's phase: windows stay on their tiles
          const it = { k: d1, m: d0, kind: 'side', fn: g => this._face(g, d0, d1, side, side, h, cv, u0, col, it.clipY) }; items.push(this._box(d0, side, d1, side, h, it));
        }
      }
      if (Dn >= NEAR_D) {   // the front face, toward the camera
        const sh = shadeOf(-a.f[0], -a.f[1]), cv = faceTexture(s.id, s.t, h, sh, v, night), col = faceColor(s.t, sh), u0 = mod(cAcross + La, PER);
        const it = { k: Dn, m: Dn, kind: 'front', fn: g => this._front(g, Dn, La, Lb, h, cv, u0, col, it.clipY) }; items.push(this._box(Dn, La, Dn, Lb, h, it));
      }
      if (this.h > h + 1) {   // the top, seen from above
        const d0 = Math.max(NEAR_D, Dn), cs = [this._q(Df, La, h), this._q(Df, Lb, h), this._q(d0, La, h), this._q(d0, Lb, h)];
        const it = { k: d0, m: d0, kind: 'top', box: cs.every(Boolean) ? [Math.min(...cs.map(c => c[0])), Math.max(...cs.map(c => c[0])), Math.min(...cs.map(c => c[1]))] : null, fn: g => {
          const fog = this.fogAt(d0), [fr, fg, fb] = this.fogRGB;
          this.stats.quads += texturedFace(g, (u, t) => this._q(Df + (d0 - Df) * t, La + (Lb - La) * u, h), null, 0, 0, 1, 1, s.t.top, fog > .02 ? `rgba(${fr},${fg},${fb},${fog.toFixed(2)})` : null, it.clipY);
        } };
        items.push(it);
      }
    }
  }
  /* ---- at any heading (the chase camera's, and MODE 7 turned off its quarters): the drawing generalized where the
   * rail made it simple ---- */
  /** the floor as one raster, each buffer row a line across the world at its depth: its pixels stepped in both axes,
   *  each read from its floor chunk's texels (the last chunk kept while the row stays in it) */
  _floorAny(g, floor) {
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
  _spansAny(spans, items, focus, night = true) {
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
