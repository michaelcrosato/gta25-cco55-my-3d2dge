// The pixel-array context a crowd body's redraw is drawn into (L3, D35): opaque whole-pixel rectangles in '#rrggbb'
// written straight into its array, the box they cover kept, and anything else a draw asks for a bail (the canvas draws
// that body instead). Node has no ImageData: a minimal one stands in.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.ImageData ??= class { constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); } };
const { PixelCtx } = await import('../../src/motor/render/pixel-ctx.js');
const px = (P, x, y) => P.px[y * P.canvas.width + x];

test('rectangles fill the array in their colour, clipped to it, later over earlier, and the box is what they cover', () => {
  const P = new PixelCtx(); P.begin(8, 6);
  P.fillStyle = '#ff0000'; P.fillRect(1, 1, 3, 2);
  P.fillStyle = '#00ff80'; P.fillRect(2, 2, 10, 1);   // (runs off the right edge)
  P.fillRect(-3, 5, 2, 4);                              // (wholly off: nothing)
  assert.equal(px(P, 1, 1), 0xff0000ff, 'red, as little-endian ABGR');
  assert.equal(px(P, 2, 2), 0xff80ff00, 'the later fill over the earlier');
  assert.equal(px(P, 7, 2), 0xff80ff00, 'clipped at the edge, not wrapped');
  assert.equal(px(P, 0, 0), 0, 'untouched is clear');
  assert.deepEqual(P.box, [1, 1, 8, 3], 'the covered box (x0, y0, x1, y1)');
  assert.equal(P.bailed, false);
  P.begin(8, 6); assert.equal(px(P, 1, 1), 0, 'begin clears it'); assert.deepEqual(P.box, [8, 6, 0, 0], 'and empties the box');
});
test('a negative width or height draws from the other side, as a canvas does', () => {
  const P = new PixelCtx(); P.begin(6, 6); P.fillStyle = '#123456'; P.fillRect(4, 4, -2, -1);
  assert.equal(px(P, 2, 3), 0xff563412); assert.equal(px(P, 3, 3), 0xff563412); assert.equal(px(P, 4, 4), 0);
});
test('anything a pixel array cannot do exactly bails: a path, an image, a transform, alpha, another colour form, a fractional edge', () => {
  const cases = [P => P.beginPath(), P => P.drawImage({}, 0, 0), P => P.translate(1, 0), P => P.save(), P => { P.globalAlpha = .5; },
    P => { P.globalCompositeOperation = 'lighter'; }, P => { P.fillStyle = 'rgba(0,0,0,.5)'; }, P => { P.fillStyle = '#abc'; }, P => P.fillRect(.5, 0, 2, 2), P => P.reset()];
  for (const f of cases) { const P = new PixelCtx(); P.begin(4, 4); f(P); assert.equal(P.bailed, true, String(f)); }
  const P = new PixelCtx(); P.begin(4, 4); P.globalAlpha = 1; P.globalCompositeOperation = 'source-over'; P.imageSmoothingEnabled = false; P._c = '#fff';
  assert.equal(P.bailed, false, 'the defaults set again, and the engine\'s colour cache, are no bail');
});
