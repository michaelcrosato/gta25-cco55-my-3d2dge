// The floor, baked per chunk (PLAN.md 8.4). The city floor is painted into world-space canvases, one per chunk (256
// units, 1 texel per unit), each baked once when it first comes near the screen and kept in an LRU. ISO draws every
// visible chunk with one affine drawImage, the view's own ground projection set as the canvas transform, so a zoom or
// a turn never re-paints; and once the view has held still two frames, each chunk's projected image is kept beside it
// (a few a frame) and copied into place pixel for pixel: the turned blit, about half a millisecond a chunk on a
// GPU-less machine, became a plain copy (a quarter turn or a zoom step projects them afresh, the affine blit meanwhile).
// TOP blits the same canvases scaled and SIDE7 reads them row by row (render/depth). The
// engine's whole-map floor bake (map.drawFloor) is never used at city scale: at 160x160 cells it is a ~20M-pixel
// canvas per view, baked in one multi-second stall.
//   Seams: a turned drawImage antialiases its edges, so each chunk is baked with an apron (pad texels of its
//   neighbours' floor on every side) and drawn overlapping them; the overlap is the same floor, so no edge shows.
import { E } from '../engine.js';

const ISO_BAKES = 3;   // chunks projected for ISO a frame at most

export class FloorChunks {
  /** o: { w, h: the floor's size in world units; paint(g, x0, y0, x1, y1): draws the floor of that world rectangle into
   *  g, in world coordinates (g is translated for it); size: 256; pad: 2 texels of apron; cap: 48 chunks kept;
   *  perFrame: 2 bakes a frame at most; base: the colour shown while a chunk bakes } */
  constructor(o) {
    this.W = o.w; this.H = o.h; this.paint = o.paint; this.size = o.size || 256; this.pad = o.pad ?? 2; this.cap = o.cap || 48;
    this.perFrame = o.perFrame ?? 2; this.base = o.base || '#2c2c34';
    this.nx = Math.ceil(this.W / this.size); this.ny = Math.ceil(this.H / this.size);
    this.chunks = new Map(); this.wanted = new Map(); this.frame = 0;
    /** bakes: chunks baked so far; bakeMs: the time they took (draw-side profiling only, never read by the sim) */
    this.stats = { bakes: 0, bakeMs: 0, drawn: 0, waiting: 0, projected: 0 }; this._isoTag = ''; this._still = 0;
  }
  _key(i, j) { return j * this.nx + i; }
  /** is chunk (i, j) baked? */
  ready(i, j) { return this.chunks.has(this._key(i, j)); }
  /** the baked canvas of chunk (i, j), or null; a miss asks for the chunk (it bakes in a later pump) */
  canvas(i, j) {
    if (i < 0 || j < 0 || i >= this.nx || j >= this.ny) return null;
    const k = this._key(i, j), c = this.chunks.get(k);
    if (c) { c.used = this.frame; return c.cv; }
    this.wanted.set(k, [i, j]); return null;
  }
  /** chunk (i, j)'s texels as 32-bit pixels (its canvas read once and kept with it: a chunk is never painted again), or
   *  null while it is not baked (it is asked for): MODE 7 reads the floor from them */
  pixels(i, j) {
    const cv = this.canvas(i, j); if (!cv) return null;
    const c = this.chunks.get(this._key(i, j));
    return c.px || (c.px = new Uint32Array(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data.buffer));
  }
  /** a new frame in a view that is not ISO (drawIso counts its own): the chunks it asks for from now are this frame's,
   *  and the cap evicts only the others */
  tick() { this.frame++; }
  /** bake chunk (i, j) now (and evict the chunks used longest ago past the cap) */
  bake(i, j) {
    const S = this.size, p = this.pad, n = S + 2 * p, x0 = i * S - p, y0 = j * S - p, cv = E.mkCanvas(n, n), g = E.ctx2d(cv);
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    g.fillStyle = this.base; g.fillRect(0, 0, n, n);
    g.setTransform(1, 0, 0, 1, -x0, -y0);
    this.paint(g, x0, y0, x0 + n, y0 + n);
    g.setTransform(1, 0, 0, 1, 0, 0);
    const k = this._key(i, j); this.chunks.set(k, { i, j, cv, used: this.frame }); this.wanted.delete(k);
    this.stats.bakes++; if (t0) this.stats.bakeMs += performance.now() - t0;
    if (this.chunks.size > this.cap) {
      const old = [...this.chunks.entries()].filter(([, c]) => c.used !== this.frame).sort((a, b) => a[1].used - b[1].used);
      for (const [kk] of old.slice(0, this.chunks.size - this.cap)) this.chunks.delete(kk);
    }
    return cv;
  }
  /** bake every chunk within rad world units of (x, y) now: a scene start or a teleport shows no baking floor */
  warm(x, y, rad = 300) {
    const S = this.size;
    for (let j = Math.max(0, Math.floor((y - rad) / S)); j <= Math.min(this.ny - 1, Math.floor((y + rad) / S)); j++)
      for (let i = Math.max(0, Math.floor((x - rad) / S)); i <= Math.min(this.nx - 1, Math.floor((x + rad) / S)); i++) if (!this.ready(i, j)) this.bake(i, j);
  }
  /** bake up to perFrame of the chunks asked for, nearest to world point (x, y) first */
  pump(x, y) {
    if (!this.wanted.size) return;
    const S = this.size, list = [...this.wanted.values()].sort((a, b) => Math.hypot((a[0] + .5) * S - x, (a[1] + .5) * S - y) - Math.hypot((b[0] + .5) * S - x, (b[1] + .5) * S - y));
    for (const [i, j] of list.slice(0, this.perFrame)) this.bake(i, j);
    this.stats.waiting = this.wanted.size;
  }
  /** the chunks [i0, j0, i1, j1] under the buffer in an engine view, its edges pushed out by margin world units */
  rangeIso(r, margin = 0) {
    const v = r.view; if (!v.inv) return [0, 0, this.nx - 1, this.ny - 1];
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [bx, by] of [[0, 0], [r.bw, 0], [0, r.bh], [r.bw, r.bh]]) { const q = v.toGround(bx + r.ix, by + r.iy); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    const S = this.size;
    return [Math.max(0, Math.floor((x0 - margin) / S)), Math.max(0, Math.floor((y0 - margin) / S)), Math.min(this.nx - 1, Math.floor((x1 + margin) / S)), Math.min(this.ny - 1, Math.floor((y1 + margin) / S))];
  }
  /** draw the floor in the engine's view (ISO): first in draw, after the sky. Chunks half a chunk beyond the screen
   *  are asked for too, so a moving camera finds them baked */
  drawIso(r) {
    const v = r.view, g = r.ctx, S = this.size, p = this.pad, cam = v.toGround ? v.toGround(r.ix + r.bw / 2, r.iy + r.bh / 2) : null;
    this.frame++;
    const pre = this.rangeIso(r, S / 2);
    for (let j = pre[1]; j <= pre[3]; j++) for (let i = pre[0]; i <= pre[2]; i++) this.canvas(i, j);
    if (cam) this.pump(cam[0], cam[1]);
    const [i0, j0, i1, j1] = this.rangeIso(r, 0), tag = v.ax + ',' + v.bx + ',' + v.ay + ',' + v.by;
    this._still = tag === this._isoTag ? this._still + 1 : 0; this._isoTag = tag;   // (frames the projection has held)
    g.save(); g.imageSmoothingEnabled = false; let drawn = 0, baked = 0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const cv = this.canvas(i, j), c = cv && this.chunks.get(this._key(i, j));
      if (c) {
        if ((!c.iso || c.iso.tag !== tag) && this._still >= 2 && baked < ISO_BAKES) { c.iso = this._project(c, v, tag); baked++; }
        if (c.iso && c.iso.tag === tag) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c.iso.cv, c.iso.X - r.ix, c.iso.Y - r.iy); drawn++; continue; }
      }
      const x0 = i * S - (cv ? p : 0), y0 = j * S - (cv ? p : 0);
      g.setTransform(v.ax, v.bx, v.ay, v.by, v.ax * x0 + v.ay * y0 - r.ix, v.bx * x0 + v.by * y0 - r.iy);
      if (cv) { g.drawImage(cv, 0, 0); drawn++; } else { g.fillStyle = this.base; g.fillRect(0, 0, S, S); }
    }
    g.restore(); g._c = null;   // (E.px caches the fill colour on the context)
    this.stats.drawn = drawn; this.stats.projected = baked;
  }
  // a chunk as ISO's view v projects it, at its own whole-pixel place: the same pixels its affine blit would put down
  // (the camera's offset is whole pixels), kept until the projection changes
  _project(c, v, tag) {
    const S = this.size, p = this.pad, n = S + 2 * p, x0 = c.i * S - p, y0 = c.j * S - p, tx = v.ax * x0 + v.ay * y0, ty = v.bx * x0 + v.by * y0;
    let X0 = 1e9, Y0 = 1e9, X1 = -1e9, Y1 = -1e9;
    for (const [a, b] of [[0, 0], [n, 0], [0, n], [n, n]]) { const X = v.ax * a + v.ay * b + tx, Y = v.bx * a + v.by * b + ty; X0 = Math.min(X0, X); X1 = Math.max(X1, X); Y0 = Math.min(Y0, Y); Y1 = Math.max(Y1, Y); }
    const X = Math.floor(X0), Y = Math.floor(Y0), w = Math.ceil(X1) - X + 1, h = Math.ceil(Y1) - Y + 1;
    let cv = c.iso && c.iso.cv; if (!cv || cv.width !== w || cv.height !== h) cv = E.mkCanvas(w, h);
    const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.imageSmoothingEnabled = false;
    g.setTransform(v.ax, v.bx, v.ay, v.by, tx - X, ty - Y); g.drawImage(c.cv, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0);
    return { tag, cv, X, Y };
  }
  /** forget every baked chunk (the floor changed) */
  clear() { this.chunks.clear(); this.wanted.clear(); }
}

/** a FloorChunks painter for a TileMap's own floor (its floorTex, by floor tag; MOTOR's maps paint with floorTex, not
 *  floor materials), one texel per world unit, with the engine's soft shade where the floor meets a wall: small maps
 *  and interiors, and the side-by-side check of the chunked floor against the engine's own bake (PLAN.md 8.4) */
const FLAT = { id: 'chunk', scale: 1 };   // (a floor texture asks for the view: the chunk's texels are world units)
export function paintTileMapFloor(map) {
  return (g, x0, y0, x1, y1) => {
    const w = x1 - x0, h = y1 - y0, img = g.createImageData(w, h), d = img.data, T = map.T, W = map.w * T, H = map.h * T, R = map.ao;
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const gx = x0 + px + .5, gy = y0 + py + .5; if (gx < 0 || gy < 0 || gx >= W || gy >= H) continue;
      const cx = Math.floor(gx / T), cy = Math.floor(gy / T); if (map.cell(cx, cy) !== 0) continue;
      const tag = map.floorTags ? map.floorTags[cy * map.w + cx] : null;
      let c = map.floorTex(gx, gy, tag, FLAT); if (!c) continue;
      if (R) {
        const lx = gx - cx * T, ly = gy - cy * T, wall = (dx, dy) => map.cell(cx + dx, cy + dy) > 0; let ao = 0;
        if (wall(-1, 0)) ao = Math.max(ao, 1 - lx / R); if (wall(1, 0)) ao = Math.max(ao, 1 - (T - lx) / R);
        if (wall(0, -1)) ao = Math.max(ao, 1 - ly / R); if (wall(0, 1)) ao = Math.max(ao, 1 - (T - ly) / R);
        if (wall(-1, -1)) ao = Math.max(ao, 1 - Math.hypot(lx, ly) / R); if (wall(1, -1)) ao = Math.max(ao, 1 - Math.hypot(T - lx, ly) / R);
        if (wall(-1, 1)) ao = Math.max(ao, 1 - Math.hypot(lx, T - ly) / R); if (wall(1, 1)) ao = Math.max(ao, 1 - Math.hypot(T - lx, T - ly) / R);
        if (ao > 0) { const k = 1 - .4 * Math.round(ao * 5) / 5; c = [c[0] * k, c[1] * k * .98, c[2] * k * 1.02]; }
      }
      const k = (py * w + px) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
    }
    // putImageData ignores the transform: g is translated by (-x0, -y0), so its pixel (0, 0) is world (x0, y0)
    g.putImageData(img, 0, 0);
  };
}
