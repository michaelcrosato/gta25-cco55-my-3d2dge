// FAN-OUT B, perf and memory: MODE 7's crowd bodies near the lens. A crowd body is drawn into a kept image of its own
// (Stage._keptDraw, D13) sized for its scale on screen, (30 k + 12) x (52 k + 12), and redrawn whenever that scale
// moves 12% - which, for a body coming toward MODE 7's lens, is every frame. Two things follow:
//   - its canvas is reallocated whenever the body has grown by a pixel (`K.cv.width < w` -> width = w, height = h):
//     the kept shapes round theirs up to steps of 16 ("a canvas is never resized for a pixel", Stage._keptShape), the
//     bodies don't;
//   - near the lens the image is hundreds of pixels a side, cleared and redrawn every frame, never reused: the very
//     cost D20 measured for parked cars ("kept images hundreds of pixels a side, redrawn every few frames: 3.9 million
//     pixels a frame") and fixed for shapes only (KEPT_MAX: kept only while small on screen).
// The play scene is drawn headless (its own draw through a stand-in renderer over the engine's null canvases); each
// kept body image's clearRect (its redraw) and each change of its size is counted.
//   node --expose-gc --test tests/review/perf/mode7-crowd-kept-images.test.mjs   (--expose-gc: the images still held, reported)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

async function walk(sharp) {
  const { game, gtm, E } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '7', view: 'side7', time: 'day', weather: 'clear' } });
  const st = { redraws: 0, px: 0, resizes: 0, bigW: 0, bigH: 0 }, mk = E.mkCanvas, kepts = [];
  let framePx = 0;
  E.mkCanvas = (w, h) => {
    const cv = mk(w, h), g0 = cv.getContext('2d'), kept = /at Stage\._keptDraw \(/.test(new Error().stack);
    let resized = false;   // (its size changed since its last redraw: the redraw found a new canvas)
    const g = new Proxy(g0, { get: (t, k) => {
      if (kept && k === 'clearRect') return (x, y, ww, hh) => { st.redraws++; if (resized) { st.resizes++; resized = false; } st.px += ww * hh; framePx += ww * hh; st.bigW = Math.max(st.bigW, ww); st.bigH = Math.max(st.bigH, hh); };
      return typeof k === 'string' && k[0] === '_' && !(k in t) ? undefined : t[k];   // (a real 2D context has no _info / _r)
    } });
    cv.getContext = () => g;
    if (kept) { kepts.push(new WeakRef(cv)); let W = w, H = h; Object.defineProperty(cv, 'width', { get: () => W, set: v => { if (v !== W) resized = true; W = v; } }); Object.defineProperty(cv, 'height', { get: () => H, set: v => { if (v !== H) resized = true; H = v; } }); }
    return cv;
  };
  game.advance(.5);
  // Sharp MODE 7 (Settings, Display): the buffer at the screen's own resolution, by the very call Stage.sharpSync makes
  // (it does nothing headless, so it is made here; the headless screen is a 1280 x 720 window's)
  if (sharp) { game.screen.setOptions({ res: null, minW: 1e6, minH: 1e6, maxW: 1e6, maxH: 1e6 }); game.advance(1 / 60); }
  assert.equal(gtm.views.active, 'side7');
  const S = game.screen, buf = E.mkCanvas(S.W + 2, S.H + 2), buffer = (S.W + 2) * (S.H + 2);
  const r = new Proxy({ ctx: buf.getContext('2d'), game, W: S.W, H: S.H, bw: S.W + 2, bh: S.H + 2, ix: 0, iy: 0 }, { get: (t, k) => (k in t ? t[k] : k === 'view' ? game.view : () => {}) });
  // north up a long sidewalk (the longest line of streetlamps), the crowd round us; a frame every 1/60 s
  const lines = new Map(); for (const p of gtm.city.props) if (p.kind === 'lamp') { const k = Math.round(p.x); if (!lines.has(k)) lines.set(k, []); lines.get(k).push(p); }
  const [x, line] = [...lines.entries()].sort((a, b) => b[1].length - a[1].length)[0], ys = line.map(p => p.y);
  let frames = 0, over = 0, worst = 0;
  for (let y = Math.max(...ys) + 150; y > Math.min(...ys) - 100; y -= 2.5) {
    gtm.teleport(x - 12, y); game.advance(1 / 60); framePx = 0; game.scene.draw(r); frames++;
    if (framePx > buffer) over++; worst = Math.max(worst, framePx);
  }
  let held = '';
  if (globalThis.gc) {   // (the bodies' images still held once the walk is over: each kept while its body lives, at its last size)
    const tick = () => new Promise(res => setTimeout(res, 0)); await tick(); globalThis.gc(); await tick(); globalThis.gc();
    const live = kepts.map(w => w.deref()).filter(Boolean), px = live.reduce((a, c) => a + c.width * c.height, 0), big = live.filter(c => c.width * c.height > 256 * 256).length;
    held = `; afterwards ${live.length} kept body images held, ${(px / 1e6).toFixed(2)} Mpx (${(px * 4 / 1048576).toFixed(1)} MB as RGBA), ${big} of them over 256x256`;
  }
  console.log(`${sharp ? 'Sharp MODE 7 (' + S.W + 'x' + S.H + ')' : 'MODE 7 (' + S.W + 'x' + S.H + ')'}, ${frames} frames: ${st.redraws} kept-body redraws, ${st.resizes} of them into a canvas just resized (${(st.resizes / frames).toFixed(2)} a frame, ${(100 * st.resizes / st.redraws).toFixed(0)}% of redraws); ` +
    `${(st.px / frames / 1e3).toFixed(0)} kpx a frame cleared and redrawn on average, ${over} frames over a whole buffer's worth (${(buffer / 1e3).toFixed(0)} kpx), the worst ${(worst / 1e6).toFixed(2)} Mpx; ` +
    `the largest kept body image ${st.bigW}x${st.bigH}${held}`);
  return { st, frames, worst, buffer };
}

test('MODE 7: crowd bodies\' kept images are not reallocated a pixel at a time, nor kept at full size by the lens', { timeout: 240000 }, async () => {
  const { st, frames } = await walk(false);
  assert.ok(st.resizes / frames < .25, `kept body canvases resized for ${st.resizes} of ${st.redraws} redraws in ${frames} frames (a canvas should not be reallocated for a pixel)`);
  assert.ok(st.bigW <= 256 && st.bigH <= 256, `a body kept at ${st.bigW}x${st.bigH} (kept images are for bodies small on screen, as D20's KEPT_MAX for shapes)`);
});
test('Sharp MODE 7: no crowd body is drawn into an image many times the screen\'s size', { timeout: 240000 }, async () => {
  const { st, worst, buffer } = await walk(true);
  assert.ok(st.bigW * st.bigH <= buffer, `a body kept at ${st.bigW}x${st.bigH} (${(st.bigW * st.bigH / 1e6).toFixed(1)} Mpx, ${(st.bigW * st.bigH * 4 / 1048576).toFixed(0)} MB) against a ${(buffer / 1e6).toFixed(2)} Mpx buffer; the worst frame cleared and redrew ${(worst / 1e6).toFixed(1)} Mpx of kept body images`);
});
