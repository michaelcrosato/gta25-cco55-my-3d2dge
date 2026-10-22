// FAN-OUT B, perf and memory: MODE 7 rasterizes skid marks near its lens a pixel step at a time, off the screen.
// VehicleFX draws each skid mark on the floor with E.px.line, which puts down one w x w fillRect per pixel step of the
// segment (up to 2000), w = 1.8 k (render/vehicle-draw.js). In MODE 7 k = F / D grows past 40 as a mark passes under the
// lens, and a floor point that near projects hundreds of pixels below the buffer (the camera stands 70 up): a two-unit
// segment there becomes hundreds of fillRects some 80 pixels square, none of them on the screen, and nothing culls them
// (the marks are picked by world distance, |dx|, |dy| < 600, only). The traffic's own braking leaves such marks at every
// busy junction. The play scene is drawn headless (its own draw through a stand-in renderer over the engine's null
// canvases); the fillRects E.px.line makes in the floor pass are counted, and those wholly off the buffer.
//   node --test tests/review/perf/mode7-floor-marks-offscreen.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

async function walk(view) {
  const { game, gtm, E } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '7', view, time: 'day', weather: 'clear' } });
  const mk = E.mkCanvas;   // (a 2D context with no _info / _r of its own, as a real one)
  E.mkCanvas = (w, h) => { const cv = mk(w, h), g0 = cv.getContext('2d'), g = new Proxy(g0, { get: (t, k) => (typeof k === 'string' && k[0] === '_' && !(k in t) ? undefined : t[k]) }); cv.getContext = () => g; return cv; };
  game.advance(.5);
  const S = game.screen, BW = S.W + 2, BH = S.H + 2, g0 = E.mkCanvas(BW, BH).getContext('2d');
  let inFloor = false, inLine = false, calls = 0, off = 0, onPx = 0;
  const ctx = new Proxy(g0, { get: (t, k) => {
    if (k === 'fillRect') return (x, y, w, h) => { if (!(inFloor && inLine)) return; calls++; const cw = Math.min(BW, x + w) - Math.max(0, x), ch = Math.min(BH, y + h) - Math.max(0, y); if (cw <= 0 || ch <= 0) off++; else onPx += cw * ch; };
    return typeof k === 'string' && k[0] === '_' && !(k in t) ? undefined : t[k];
  } });
  const line = E.px.line; E.px.line = (...a) => { inLine = true; try { return line(...a); } finally { inLine = false; } };
  const st = gtm.stage, ff = st._floorFx.bind(st); st._floorFx = (...a) => { inFloor = true; try { return ff(...a); } finally { inFloor = false; } };
  const r = new Proxy({ ctx, game, W: S.W, H: S.H, bw: BW, bh: BH, ix: 0, iy: 0 }, { get: (t, k) => (k in t ? t[k] : k === 'view' ? game.view : () => {}) });
  // north up the street from the Greasy Spoke, past the junction the traffic brakes at; a frame every 1/60 s
  const p = gtm.crew.ped, x0 = p.x, y0 = p.y, frames = [];
  for (let y = y0 + 300; y > y0 - 500; y -= 2.5) { gtm.teleport(x0 + 20, y); game.advance(1 / 60); calls = off = onPx = 0; game.scene.draw(r); frames.push({ calls, off, onPx }); }
  frames.sort((a, b) => a.calls - b.calls);
  return { skids: gtm.fleet.skids.length, n: frames.length, mean: frames.reduce((s, f) => s + f.calls, 0) / frames.length, p90: frames[Math.floor(frames.length * .9)], worst: frames.at(-1), buffer: BW * BH };
}

test('MODE 7 puts no fillRects off the screen for the skid marks under its lens', { timeout: 240000 }, async () => {
  const m7 = await walk('side7'), top = await walk('top');
  const say = (name, R) => `${name}: ${R.skids} skid marks in the fleet; E.px.line in the floor pass made ${R.mean.toFixed(0)} fillRects a frame on average over ${R.n} frames, ` +
    `p90 ${R.p90.calls}, the worst frame ${R.worst.calls} (${R.worst.off} of them wholly off the buffer; ${(R.worst.onPx / 1e3).toFixed(0)} kpx on it, the buffer being ${(R.buffer / 1e3).toFixed(0)} kpx)`;
  console.log(say('MODE 7', m7)); console.log(say('TOP-DOWN, the same walk', top));
  assert.ok(m7.worst.off <= 200, `MODE 7's worst frame: ${m7.worst.off} fillRects wholly off the buffer for the floor's skid marks (TOP-DOWN's worst: ${top.worst.off})`);
});
