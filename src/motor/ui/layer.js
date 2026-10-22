// The UI layer (PLAN.md 7.7, 8.18): the HUD and every menu draw into a canvas of their own over the game's (#ui in the
// page: pointer-events none, the mouse read through the game's canvas), at a whole-number scale of its own chosen by
// the HUD size: Standard is the game's (its S device pixels to a UI pixel), Large S + 1 and Huge S + 2, never so big
// that 320 x 180 UI pixels no longer fit. Text drawn on it is whole-pixel crisp at any of them, and the 5 x 7 font at
// scale 1 is 7 S device pixels tall: 28 at 1080p. What a frame drew is recorded (ui/record.js) for tools/ui-audit.mjs.
// Headless there is no page: the layer keeps a null canvas, so menus still lay out, take input and record in Node.
//   const L = new UILayer(game);  each frame: const g = L.frame();  each step: const p = L.poll() -> { x, y, click, wheel,
//   tap } (a finger's tap is a click where it landed: the menus answer a phone's taps)
import { E } from '../engine.js';
import { UIRecord } from './record.js';

/** the safe area's margin on each side, a share of the screen (PLAN.md 8.18: 5%) */
export const SAFE = .05;
/** the least UI the screen must hold at the largest HUD size */
export const MIN_W = 320, MIN_H = 180;

export class UILayer {
  /** game: the E.Game; o.id: the page's UI canvas (#ui); o.base(): the game's own scale where its buffer is not at it
   *  now (Sharp MODE 7 draws the world at the screen's resolution: the UI keeps the game's scale) */
  constructor(game, o = {}) {
    this.game = game; this.rec = new UIRecord(); this.k = 4; this.W = 480; this.H = 270; this.t = 0; this.base = o.base || null;
    this.wheel = 0; this._down = false; this._clicked = false; this.cv = null; this.page = false; this._tap = null;
    if (!game.headless && typeof document !== 'undefined') {
      this.cv = document.getElementById(o.id || 'ui'); this.page = !!this.cv;
      const el = game.screen && game.screen.canvas;
      if (el && el.addEventListener) el.addEventListener('wheel', e => { this.wheel += e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0; }, { passive: true });
      if (this.page) window.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') this._tap = this._at(e.clientX, e.clientY); }, { passive: true });   // (a finger's tap: a click on the menus, PLAN.md 8.20)
    }
    if (!this.cv) this.cv = E.mkCanvas(this.W, this.H);
    this.g = this.cv.getContext('2d');
  }
  /** the HUD size setting: 0 Standard, 1 Large, 2 Huge (game.settings.hudSize) */
  get hudSize() { const S = this.game.settings; return Math.max(0, Math.min(2, (S && S.hudSize) | 0)); }
  /** the device pixels the game's canvas holds, and its own scale (S) */
  _device() {
    const sc = this.game.screen, c = sc && sc.canvas;
    const base = this.base && this.base();
    return c && c.width ? { w: c.width, h: c.height, S: base || Math.max(1, Math.floor(sc.S || 1)), dpr: sc.dpr || 1 } : { w: 1920, h: 1080, S: 4, dpr: 1 };
  }
  /** fit the UI to the screen: its scale by the HUD size, its size in UI pixels, the canvas over the game's */
  layout() {
    const D = this._device(), most = Math.max(1, Math.floor(Math.min(D.w / MIN_W, D.h / MIN_H)));
    const k = Math.max(1, Math.min(most, D.S + this.hudSize)), W = Math.floor(D.w / k), H = Math.floor(D.h / k);
    this.k = k; this.dev = D;
    if (W !== this.W || H !== this.H || !this._sized) {
      this.W = W; this.H = H; this._sized = true;
      this.cv.width = W; this.cv.height = H; this.g = this.cv.getContext('2d'); this.g.imageSmoothingEnabled = false;
      if (this.page && this.cv.style) {   // (whole device pixels a UI pixel, centred: the remainder is under k pixels)
        const s = this.cv.style, cw = W * k / D.dpr, ch = H * k / D.dpr;
        s.width = cw + 'px'; s.height = ch + 'px'; s.left = Math.floor((D.w - W * k) / 2) / D.dpr + 'px'; s.top = Math.floor((D.h - H * k) / 2) / D.dpr + 'px';
      }
    }
    return this;
  }
  /** the safe area in UI pixels: [x0, y0, x1, y1] */
  get safe() { const mx = Math.round(this.W * SAFE), my = Math.round(this.H * SAFE); return [mx, my, this.W - mx, this.H - my]; }
  /** start a frame: laid out, cleared, a fresh record; returns the context to draw with */
  frame(dt = 0) {
    this.t += dt; this.layout();
    const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, this.W, this.H); g._c = null;
    this.rec.begin(this.W, this.H, this.safe);
    return g;
  }
  /** the mouse in UI pixels (null before it has moved over the game), whether it moved, a click this step (a fresh left
   *  press), the left button held (down) and let go (up), and the wheel's notches since the last poll (down positive);
   *  call once a step */
  poll() {
    const tap = this._tap; this._tap = null;
    if (tap) { const wheel = this.wheel; this.wheel = 0; this._last = tap; return { x: tap.x, y: tap.y, moved: true, click: true, down: false, up: true, wheel, tap: true }; }   // (a tap: a click where it landed)
    const I = this.game.input, down = !!(I && I.held && I.held.has('Mouse0'));
    const click = down && !this._down, up = !down && this._down; this._down = down;
    const wheel = this.wheel, p = this.pointer(), last = this._last; this.wheel = 0;
    const moved = !!p && (!last || Math.abs(p.x - last.x) + Math.abs(p.y - last.y) > .5); this._last = p;   // (hover takes the focus only when the mouse moves: a still pointer leaves the pad's and the keys' choice)
    return { x: p ? p.x : null, y: p ? p.y : null, moved, click, down, up, wheel };
  }
  /** the mouse's position in UI pixels, or null */
  pointer() {
    const I = this.game.input, m = I && I.mouse; if (!m || !m.active || !this.page) return null;
    return this._at(m.cx, m.cy);
  }
  /** a tap at (x, y) in UI pixels, as a finger's would be (the tests') */
  tapAt(x, y) { this._tap = { x, y }; }
  // a point on the page in UI pixels, or null
  _at(cx, cy) {
    if (!this.cv.getBoundingClientRect) return null;
    const r = this.cv.getBoundingClientRect(); if (!r.width || !r.height) return null;
    return { x: (cx - r.left) * this.W / r.width, y: (cy - r.top) * this.H / r.height };
  }
}
