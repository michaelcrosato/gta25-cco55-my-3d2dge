// A drawing context that is only a pixel array (L3, D35): what a crowd body's redraw is made of, opaque whole-pixel
// rectangles in '#rrggbb' colours (the engine's pixel-art rigs: a body's limbs as scanlines), written straight into a
// Uint32Array and put into the body's kept image with one putImageData, instead of a hundred-odd fillRect calls on a
// canvas that must then be rasterised before the frame can use it. Anything else a draw asks of it (a path, an image,
// a transform, alpha, a colour in another form, a fractional rectangle) marks it bailed, and the caller draws that
// body on the real canvas instead: the same pixels either way.
//   const P = new PixelCtx();  P.begin(w, h);  draw(P, ...);  if (!P.bailed) g.putImageData(P.image, 0, 0, ...P.box as x, y, w, h)
const CTX_METHODS = ['arc', 'arcTo', 'beginPath', 'bezierCurveTo', 'clearRect', 'clip', 'closePath', 'createImageData', 'createLinearGradient',
  'createPattern', 'createRadialGradient', 'drawImage', 'ellipse', 'fill', 'fillText', 'getImageData', 'getLineDash', 'getTransform', 'isPointInPath',
  'isPointInStroke', 'lineTo', 'measureText', 'moveTo', 'putImageData', 'quadraticCurveTo', 'rect', 'reset', 'resetTransform', 'restore', 'rotate',
  'roundRect', 'save', 'scale', 'setLineDash', 'setTransform', 'stroke', 'strokeRect', 'strokeText', 'transform', 'translate'];

export class PixelCtx {
  constructor() {
    this.canvas = { width: 0, height: 0 }; this.images = new Map(); this.colors = new Map();
    this.bailed = false; this.px = null; this.image = null; this._fill = 0xff000000; this._fs = '#000000'; this._c = null;
    for (const m of CTX_METHODS) this[m] = () => { this.bailed = true; return null; };
  }
  /** a clear w x h picture to draw into (its array kept for that size; not reset(): a canvas's own, a bail here) */
  begin(w, h) {
    const key = w * 65536 + h; let im = this.images.get(key);
    if (!im) { im = { image: new ImageData(w, h) }; im.px = new Uint32Array(im.image.data.buffer); this.images.set(key, im); }
    this.image = im.image; this.px = im.px; this.px.fill(0); this.canvas.width = w; this.canvas.height = h;
    this.bailed = false; this._fill = 0xff000000; this._fs = '#000000'; this._c = null; this.box = [w, h, 0, 0];
  }
  get fillStyle() { return this._fs; }
  set fillStyle(v) {
    let c = this.colors.get(v);
    if (c === undefined) {
      c = typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? (0xff000000 | (parseInt(v.slice(5, 7), 16) << 16) | (parseInt(v.slice(3, 5), 16) << 8) | parseInt(v.slice(1, 3), 16)) >>> 0 : null;
      if (this.colors.size < 4096) this.colors.set(v, c);
    }
    if (c === null) { this.bailed = true; return; }
    this._fill = c; this._fs = v;
  }
  get globalAlpha() { return 1; }
  set globalAlpha(v) { if (v !== 1) this.bailed = true; }
  get globalCompositeOperation() { return 'source-over'; }
  set globalCompositeOperation(v) { if (v !== 'source-over') this.bailed = true; }
  get imageSmoothingEnabled() { return false; }
  set imageSmoothingEnabled(v) {}
  fillRect(x, y, w, h) {
    if (this.bailed) return;
    if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; }
    if (x !== (x | 0) || y !== (y | 0) || w !== (w | 0) || h !== (h | 0)) { this.bailed = true; return; }   // (a fractional edge is a canvas's to blend)
    const W = this.canvas.width, H = this.canvas.height, x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
    if (x1 <= x0 || y1 <= y0) return;
    const px = this.px, c = this._fill, b = this.box;
    for (let r = y0; r < y1; r++) px.fill(c, r * W + x0, r * W + x1);
    if (x0 < b[0]) b[0] = x0; if (y0 < b[1]) b[1] = y0; if (x1 > b[2]) b[2] = x1; if (y1 > b[3]) b[3] = y1;   // (what it covers: put and drawn, not the margin round it)
  }
}
