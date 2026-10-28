// TOP-DOWN (PLAN.md 5.2, 8.5): GTA2's perspective. A camera straight above the focus at height H looking down, north
// up (or turned by hand to any heading, about the screen's centre: D48): a point at height z lands at centre +
// (ortho(x, y) - centre) * k(z), k(z) = H / (H - z). The floor (z = 0) is a
// plain overhead view at s = F / H pixels per unit, blitted from the floor chunks; everything taller leans outward
// from the centre, roofs growing with height. H climbs with speed (about 320 on foot to 640 flat out), the GTA2 climb.
//   Order: the floor, then spans and actors by their nearest distance from the centre, farthest first (a box nearer
// the centre covers what stands beyond it; one farther out leans away from the centre and never covers it). A span
// draws the faces that face the centre (k is not linear in z, so a tall face is cut into bands),
// then its roof; textured faces are cut where an affine map would miss (render/depth/quads.js).
import { E } from '../../engine.js';
import { faceTexture, shadeOf, faceColor, FACE_PERIOD } from './textures.js';
import { texturedFace } from './quads.js';
import { axesAt } from './side7.js';

const VIEW_STEP = 3;   // (degrees: rigs are drawn through views at the heading in these steps, kept and reused)

export class TopView {
  /** o: { H: 320 (on foot), Hmax: 640, F: 352 (so s = 1.1 px/unit at H 320), lead: .35 } */
  constructor(o = {}) {
    Object.assign(this, { id: 'top', label: 'TOP-DOWN', x: 0, y: 0, H: 320, Hfoot: 320, Hmax: 640, F: 352, lead: .35, ready: false, zoom: 1, heading: 0,
      views: new Map(), stats: { quads: 0, chunks: 0, actors: 0 } }, o);
  }
  /** follow the focus, leading along its velocity; H eases up with speed (0..1 of top speed). While hold is set
   *  ({ x, y, H }: the switch camera) the camera is exactly there */
  follow(dt, fx, fy, vx = 0, vy = 0, speed01 = 0) {
    if (this.hold) { this.x = this.hold.x; this.y = this.hold.y; this.H = this.hold.H; this.ready = true; return; }
    const wantH = this.Hfoot + (this.Hmax - this.Hfoot) * E.clamp(speed01, 0, 1), k = 1 - Math.exp(-dt * 3);
    const lx = fx + vx * this.lead * (this.H / this.F), ly = fy + vy * this.lead * (this.H / this.F);
    if (!this.ready) { this.x = lx; this.y = ly; this.H = wantH; this.ready = true; return; }
    this.x += (lx - this.x) * (1 - Math.exp(-dt * 6)); this.y += (ly - this.y) * (1 - Math.exp(-dt * 6)); this.H += (wantH - this.H) * k;
  }
  /** the screen's axes on the ground at the heading (0 north up, 90 east up): r to the screen's right, f up it */
  ax() { if (this._axOf !== this.heading) { this._ax = axesAt(this.heading); this._axOf = this.heading; } return this._ax; }
  /** the heading kept images are keyed by (north up: 0; turned, in steps of 1.5°) */
  get keyHeading() { return Math.round(this.heading / 1.5) * 1.5; }
  frame(r) {
    const sc = r.game.screen;
    this.P = { cx: r.W / 2 + (sc.fx || 0), cy: r.H / 2 + (sc.fy || 0), s: this.F * (this.zoom || 1) / this.H, W: r.bw, H: r.bh };
    return this.P;
  }
  /** world (x, y, z) -> [buffer x, buffer y, pixels per unit there], or null at or above the camera */
  proj(x, y, z = 0) {
    const P = this.P; if (z >= this.H - 1) return null; const k = this.H / (this.H - z), s = P.s * k, rx = x - this.x, ry = y - this.y;
    if (!this.heading) return [P.cx + rx * s, P.cy + ry * s, s];
    const a = this.ax(); return [P.cx + (rx * a.r[0] + ry * a.r[1]) * s, P.cy - (rx * a.f[0] + ry * a.f[1]) * s, s];
  }
  /** the ground point under a buffer pixel */
  toGround(bx, by) {
    const P = this.P, u = (bx - P.cx) / P.s, v = (by - P.cy) / P.s; if (!this.heading) return [this.x + u, this.y + v];
    const a = this.ax(); return [this.x + a.r[0] * u - a.f[0] * v, this.y + a.r[1] * u - a.f[1] * v];
  }
  /** the draw order key: distance from the centre (bigger is drawn first) */
  depth(x, y) { return Math.hypot(x - this.x, y - this.y); }
  /** a point's depth for sorting a model's parts (bigger is farther): from nearly straight above, height decides what
   *  covers what (a bumper sticking out below a bonnet still shows its edge), the distance off the centre breaks ties */
  depth3(x, y, z = 0) { return -z + Math.hypot(x - this.x, y - this.y) * 1e-3; }
  /** a world offset on screen, linear (at the heading; height leans out from the centre, so it is left out) */
  screenVec(x, y) { if (!this.heading) return [x, y]; const a = this.ax(); return [x * a.r[0] + y * a.r[1], -(x * a.f[0] + y * a.f[1])]; }
  screenDirToGround(dx, dy) {
    if (!dx && !dy) return [0, 0];
    const a = this.ax(), gx = a.r[0] * dx - a.f[0] * dy, gy = a.r[1] * dx - a.f[1] * dy, l = Math.hypot(gx, gy) || 1, m = Math.min(1, Math.hypot(dx, dy));
    return [gx / l * m, gy / l * m];
  }
  /** the engine View a rig is drawn with from straight above at k pixels per unit (whole 1/16ths), at the heading in
   *  3° steps (reused) */
  view(k) {
    const q = Math.max(1 / 16, Math.round(k * 16) / 16), hd = (Math.round(this.heading / VIEW_STEP) * VIEW_STEP) % 360, key = hd * 1000 + q; let v = this.views.get(key);
    if (!v) { if (this.views.size > 400) this.views.clear(); v = new E.View('top', 'Top-down', (360 - hd) % 360, 89, q, 1); this.views.set(key, v); }
    return v;
  }
  /** the chunk range the screen covers at the floor, with margin units for leaning tops (turned: the box round the
   *  screen's four ground corners) */
  range(size, margin = 160) {
    const P = this.P; let x0, y0, x1, y1;
    if (!this.heading) { x0 = this.x - P.cx / P.s; x1 = this.x + (P.W - P.cx) / P.s; y0 = this.y - P.cy / P.s; y1 = this.y + (P.H - P.cy) / P.s; }
    else {
      x0 = y0 = Infinity; x1 = y1 = -Infinity;
      for (const [bx, by] of [[0, 0], [P.W, 0], [0, P.H], [P.W, P.H]]) { const [gx, gy] = this.toGround(bx, by); x0 = Math.min(x0, gx); x1 = Math.max(x1, gx); y0 = Math.min(y0, gy); y1 = Math.max(y1, gy); }
    }
    return [Math.floor((x0 - margin) / size), Math.floor((y0 - margin) / size), Math.floor((x1 + margin) / size), Math.floor((y1 + margin) / size)];
  }
  /** the floor: each chunk on screen scaled into place, edges rounded to whole pixels so neighbours meet exactly; turned,
   *  each drawn with its apron under the view's own ground transform (the overlap is the same floor: no seam shows) */
  drawFloor(g, floor) {
    const P = this.P, S = floor.size, [i0, j0, i1, j1] = this.range(S, 0); let n = 0;
    g.imageSmoothingEnabled = false;
    if (this.heading) {
      const a = this.ax(), s = P.s, A = a.r[0] * s, B = -a.f[0] * s, C = a.r[1] * s, D = -a.f[1] * s, p = floor.pad;
      g.save();
      for (let j = Math.max(0, j0); j <= Math.min(floor.ny - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(floor.nx - 1, i1); i++) {
        const cv = floor.canvas(i, j), x0 = i * S - (cv ? p : 0) - this.x, y0 = j * S - (cv ? p : 0) - this.y;
        g.setTransform(A, B, C, D, P.cx + A * x0 + C * y0, P.cy + B * x0 + D * y0);
        if (cv) { g.drawImage(cv, 0, 0); n++; } else { g.fillStyle = floor.base; g.fillRect(0, 0, S, S); }
      }
      g.restore(); g._c = null; this.stats.chunks = n; return;
    }
    for (let j = Math.max(0, j0); j <= Math.min(floor.ny - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(floor.nx - 1, i1); i++) {
      const X0 = Math.round(P.cx + (i * S - this.x) * P.s), X1 = Math.round(P.cx + ((i + 1) * S - this.x) * P.s), Y0 = Math.round(P.cy + (j * S - this.y) * P.s), Y1 = Math.round(P.cy + ((j + 1) * S - this.y) * P.s);
      const cv = floor.canvas(i, j);
      if (cv) { g.drawImage(cv, floor.pad, floor.pad, S, S, X0, Y0, X1 - X0, Y1 - Y0); n++; } else { g.fillStyle = floor.base; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0); }
    }
    this.stats.chunks = n;
  }
  /** the draw items of the spans near the screen: { k: nearest distance from the centre, fn(g) } */
  spanItems(spans, items, night = true) {
    const mod = (v, m) => ((v % m) + m) % m, X = this.x, Y = this.y;
    for (const s of spans) {
      const h = s.h; if (h >= this.H - 8) continue;
      const nx = E.clamp(X, s.x0, s.x1), ny = E.clamp(Y, s.y0, s.y1), key = Math.hypot(nx - X, ny - Y), v = (Math.floor(s.x0 / 64) * 7 + Math.floor(s.y0 / 64) * 13) & 3;
      items.push({ k: key, fn: g => {
        // faces toward the centre: [outward normal, the edge's two ends (left to right as seen from outside), texture phase]
        const faces = [];
        if (Y > s.y1) faces.push([0, 1, [s.x0, s.y1], [s.x1, s.y1], s.x0]);
        if (Y < s.y0) faces.push([0, -1, [s.x1, s.y0], [s.x0, s.y0], -s.x1]);
        if (X > s.x1) faces.push([1, 0, [s.x1, s.y1], [s.x1, s.y0], -s.y1]);
        if (X < s.x0) faces.push([-1, 0, [s.x0, s.y0], [s.x0, s.y1], s.y0]);
        for (const [fx, fy, A, B, along] of faces) {
          const sh = shadeOf(fx, fy), cv = faceTexture(s.id, s.t, h, sh, v, night), col = faceColor(s.t, sh), u0 = mod(along, FACE_PERIOD), len = Math.hypot(B[0] - A[0], B[1] - A[1]);
          this.stats.quads += texturedFace(g, (s2, t) => this.proj(A[0] + (B[0] - A[0]) * s2, A[1] + (B[1] - A[1]) * s2, h * (1 - t)), cv, u0, 0, len, h, col);
        }
        if (this.heading) { this._roof(g, s, h); return; }
        const a = this.proj(s.x0, s.y0, h), b = this.proj(s.x1, s.y1, h); if (!a || !b) return;
        const rx = Math.round(a[0]), ry = Math.round(a[1]), rw = Math.round(b[0]) - rx, rh = Math.round(b[1]) - ry;
        g.fillStyle = s.t.top; g.fillRect(rx, ry, rw, rh);
        g.fillStyle = E.shade(s.t.top, .18); g.fillRect(rx, ry, rw, 1); g.fillRect(rx, ry, 1, rh);
        g.fillStyle = E.shade(s.t.top, -.22); g.fillRect(rx, ry + rh - 1, rw, 1); g.fillRect(rx + rw - 1, ry, 1, rh);
      } });
    }
  }
  /** a span's roof turned with the view: its four corners at height h filled, each edge lit or shaded as north-up's
   *  bevel (the edges facing up or left on screen lighter, the others darker) */
  _roof(g, s, h) {
    const C = [[s.x0, s.y0], [s.x1, s.y0], [s.x1, s.y1], [s.x0, s.y1]].map(([x, y]) => this.proj(x, y, h)); if (C.some(q => !q)) return;
    g.beginPath(); g.moveTo(C[0][0], C[0][1]); for (let i = 1; i < 4; i++) g.lineTo(C[i][0], C[i][1]); g.closePath(); g.fillStyle = s.t.top; g.fill();
    g.lineWidth = 1; const lit = E.shade(s.t.top, .18), dim = E.shade(s.t.top, -.22);
    for (const [i, nx, ny] of [[0, 0, -1], [1, 1, 0], [2, 0, 1], [3, -1, 0]]) {   // (each edge from corner i, its outward normal)
      const [sx, sy] = this.screenVec(nx, ny), A = C[i], B = C[(i + 1) % 4];
      g.strokeStyle = sx + sy < 0 ? lit : dim; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
    }
  }
}
