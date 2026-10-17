// TOP-DOWN (PLAN.md 5.2, 8.5): GTA2's perspective. A camera straight above the focus at height H looking down, north
// up: a point at height z lands at centre + (ortho(x, y) - centre) * k(z), k(z) = H / (H - z). The floor (z = 0) is a
// plain overhead view at s = F / H pixels per unit, blitted from the floor chunks; everything taller leans outward
// from the centre, roofs growing with height. H climbs with speed (about 320 on foot to 640 flat out), the GTA2 climb.
//   Order: the floor, then spans and actors by their nearest distance from the centre, farthest first (a box nearer
// the centre covers what stands beyond it; one farther out leans away from the centre and never covers it). A span
// draws the faces that face the centre (k is not linear in z, so a tall face is cut into bands),
// then its roof; textured faces are cut where an affine map would miss (render/depth/quads.js).
import { E } from '../../engine.js';
import { faceTexture, shadeOf, faceColor, FACE_PERIOD } from './textures.js';
import { texturedFace } from './quads.js';

export class TopView {
  /** o: { H: 320 (on foot), Hmax: 640, F: 352 (so s = 1.1 px/unit at H 320), lead: .35 } */
  constructor(o = {}) {
    Object.assign(this, { id: 'top', label: 'TOP-DOWN', x: 0, y: 0, H: 320, Hfoot: 320, Hmax: 640, F: 352, lead: .35, ready: false, zoom: 1,
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
  frame(r) {
    const sc = r.game.screen;
    this.P = { cx: r.W / 2 + (sc.fx || 0), cy: r.H / 2 + (sc.fy || 0), s: this.F * (this.zoom || 1) / this.H, W: r.bw, H: r.bh };
    return this.P;
  }
  /** world (x, y, z) -> [buffer x, buffer y, pixels per unit there], or null at or above the camera */
  proj(x, y, z = 0) { const P = this.P; if (z >= this.H - 1) return null; const k = this.H / (this.H - z), s = P.s * k; return [P.cx + (x - this.x) * s, P.cy + (y - this.y) * s, s]; }
  /** the ground point under a buffer pixel */
  toGround(bx, by) { const P = this.P; return [this.x + (bx - P.cx) / P.s, this.y + (by - P.cy) / P.s]; }
  /** the draw order key: distance from the centre (bigger is drawn first) */
  depth(x, y) { return Math.hypot(x - this.x, y - this.y); }
  /** a point's depth for sorting a model's parts (bigger is farther): from nearly straight above, height decides what
   *  covers what (a bumper sticking out below a bonnet still shows its edge), the distance off the centre breaks ties */
  depth3(x, y, z = 0) { return -z + Math.hypot(x - this.x, y - this.y) * 1e-3; }
  /** a world offset on screen, linear (north up; height leans out from the centre, so it is left out) */
  screenVec(x, y) { return [x, y]; }
  screenDirToGround(dx, dy) { if (!dx && !dy) return [0, 0]; const l = Math.hypot(dx, dy) || 1, m = Math.min(1, l); return [dx / l * m, dy / l * m]; }
  /** the engine View a rig is drawn with from straight above at k pixels per unit (whole 1/16ths, reused) */
  view(k) {
    const q = Math.max(1 / 16, Math.round(k * 16) / 16); let v = this.views.get(q);
    if (!v) { if (this.views.size > 400) this.views.clear(); v = new E.View('top', 'Top-down', 0, 89, q, 1); this.views.set(q, v); }
    return v;
  }
  /** the chunk range the screen covers at the floor, with margin units for leaning tops */
  range(size, margin = 160) {
    const P = this.P, x0 = this.x - P.cx / P.s - margin, x1 = this.x + (P.W - P.cx) / P.s + margin, y0 = this.y - P.cy / P.s - margin, y1 = this.y + (P.H - P.cy) / P.s + margin;
    return [Math.floor(x0 / size), Math.floor(y0 / size), Math.floor(x1 / size), Math.floor(y1 / size)];
  }
  /** the floor: each chunk on screen scaled into place, edges rounded to whole pixels so neighbours meet exactly */
  drawFloor(g, floor) {
    const P = this.P, S = floor.size, [i0, j0, i1, j1] = this.range(S, 0); let n = 0;
    g.imageSmoothingEnabled = false;
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
        const a = this.proj(s.x0, s.y0, h), b = this.proj(s.x1, s.y1, h); if (!a || !b) return;
        const rx = Math.round(a[0]), ry = Math.round(a[1]), rw = Math.round(b[0]) - rx, rh = Math.round(b[1]) - ry;
        g.fillStyle = s.t.top; g.fillRect(rx, ry, rw, rh);
        g.fillStyle = E.shade(s.t.top, .18); g.fillRect(rx, ry, rw, 1); g.fillRect(rx, ry, 1, rh);
        g.fillStyle = E.shade(s.t.top, -.22); g.fillRect(rx, ry + rh - 1, rw, 1); g.fillRect(rx + rw - 1, ry, 1, rh);
      } });
    }
  }
}
