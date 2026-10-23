// The view's crossfade (PLAN.md 5.5, 8.2): a switch of view, or a turn of MODE 7's rail, shows the old frame dissolving
// into the live new one over TUNE.viewFade seconds (.35), through an ordered dither: each frame punches more of the old
// frame's pixels out, in a 4x4 Bayer order, until none are left. Its cost is a copy of the frame when it starts, then a
// pattern fill and one blit a frame. Presentation only: the simulation never reads it.
//   const X = new CrossFade();  X.start(bufferCanvas);  X.draw(g, dt) (after the world, before the HUD)
import { E } from '../engine.js';
import { TUNE, knob } from '../core/tune.js';

knob('Camera', 'viewFade', 'View switch fade', .35, 0, 1, .05, 'Seconds the old view takes to dissolve into the new one (0: a cut)');
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export class CrossFade {
  constructor() { this.cv = null; this.t = 0; this.dur = 0; this.level = 0; this.tiles = []; }
  /** is the old frame still showing? */
  get active() { return !!this.cv; }
  /** the old frame: a copy of the buffer as it is now (the last frame drawn) */
  start(src) {
    if (!src || !(TUNE.viewFade > 0)) { this.cv = null; return; }
    const w = src.width, h = src.height;
    if (!this._cv || this._cv.width !== w || this._cv.height !== h) this._cv = E.mkCanvas(w, h);
    const g = this._cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h); g.drawImage(src, 0, 0);
    this.cv = this._cv; this.t = 0; this.dur = TUNE.viewFade; this.level = 0;
  }
  /** what is left of the old frame, drawn over this one, dt seconds on (its last call clears it) */
  draw(g, dt) {
    if (!this.cv) return;
    this.t += dt; const want = Math.min(16, Math.floor(this.t / this.dur * 17));
    if (want >= 16) { this.cv = null; return; }
    if (want > this.level) {   // (the next ranks punched out of the copy: it only ever loses pixels)
      const cg = this.cv.getContext('2d'); cg.globalCompositeOperation = 'destination-out';
      for (let l = this.level; l < want; l++) { cg.fillStyle = cg.createPattern(this._tile(l), 'repeat'); cg.fillRect(0, 0, this.cv.width, this.cv.height); }
      cg.globalCompositeOperation = 'source-over'; this.level = want;
    }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = false;
    if (g.canvas && (g.canvas.width !== this.cv.width || g.canvas.height !== this.cv.height)) g.drawImage(this.cv, 0, 0, g.canvas.width, g.canvas.height); else g.drawImage(this.cv, 0, 0);   // (the buffer resized under it: Sharp MODE 7 came or went)
    g.restore(); g._c = null;
  }
  // a 4x4 tile with the one pixel of Bayer rank l
  _tile(l) {
    let t = this.tiles[l]; if (t) return t;
    t = this.tiles[l] = E.mkCanvas(4, 4); const tg = t.getContext('2d'); tg.fillStyle = '#000';
    for (let i = 0; i < 16; i++) if (BAYER[i] === l) tg.fillRect(i % 4, i >> 2, 1, 1);
    return t;
  }
}
