// FAN-OUT B, perf and memory: image caches keyed by a size on screen that MODE 7 makes continuous, never let go.
//   - The streetlamps' halos (render/city-render.js lampGlow, the module's GLOWS map) are cached by their radius on
//     screen, R = max(7, round(12 k)). In ISO and TOP-DOWN k takes a handful of values; in MODE 7 k = F / D runs from
//     about 1 far down the rail to 40+ as a lamp passes the lens, so walking one lamp-lined street at night makes a new
//     canvas for nearly every whole radius from 7 up to several hundred pixels, each (2R + 2)^2 pixels, kept for good:
//     the map is module-level, so leaving to the title (or the attract mode's next reel) keeps them all.
//   - A pickup's token (render/combat-fx.js CombatFX._token, this._tokens) is cached the same way by kind, item and
//     radius (round(3.4 k)): the same walk makes hundreds, kept for the rest of the session.
// Every other per-size cache in the renderer is bounded (the depth light's discs: 32; signs: 200; MODE 7's rig views:
// 400). The play scene is drawn headless here: its own draw, through a stand-in renderer over the engine's null
// canvases (MODE 7 needs only the buffer's context and size); canvases are counted where E.mkCanvas makes them.
//   node --expose-gc --test tests/review/perf/mode7-lamp-glow-cache.test.mjs
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

const tick = () => new Promise(r => setTimeout(r, 0));   // (WeakRefs made in this job keep their targets until it ends)
async function retained(list) {
  await tick(); globalThis.gc(); await tick(); globalThis.gc();
  const live = list.filter(m => m.ref.deref());
  return { n: live.length, px: live.reduce((s, m) => s + m.w * m.h, 0), big: live.reduce((a, m) => Math.max(a, m.w), 0) };
}
const mb = px => (px * 4 / 1048576).toFixed(0) + ' MB';

describe('MODE 7 at night, one lamp-lined street walked', { timeout: 240000 }, () => {
  const made = { lampGlow: [], token: [] }, res = {};
  let lamps = 0;
  before(async () => {
    assert.ok(globalThis.gc, 'run with node --expose-gc');
    const { game, gtm, E } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '7', view: 'side7', time: 'night', weather: 'clear' } });
    // every canvas made, by who made it (the bundle keeps function names); the engine's null canvas stands in for each,
    // with a 2D context that, like a real one, has no _info / _r of its own
    const mk = E.mkCanvas;
    E.mkCanvas = (w, h) => {
      const cv = mk(w, h), g0 = cv.getContext('2d'), g = new Proxy(g0, { get: (t, k) => (typeof k === 'string' && k[0] === '_' && !(k in t) ? undefined : t[k]) });
      cv.getContext = () => g;
      const st = new Error().stack;
      if (/at lampGlow \(/.test(st)) made.lampGlow.push({ ref: new WeakRef(cv), w, h });
      else if (/at CombatFX\._token \(/.test(st)) made.token.push({ ref: new WeakRef(cv), w, h });
      return cv;
    };
    game.advance(.5);
    assert.equal(gtm.views.active, 'side7');
    const S = game.screen, buf = E.mkCanvas(S.W + 2, S.H + 2);
    // each halo's radius, and whether it was on the buffer at all where it was drawn (Stage._glowAt: q = [sx, sy, k])
    const st = gtm.stage, ga = st._glowAt.bind(st), on = new Set(), off = new Set();
    st._glowAt = (g, draw, q) => { if (draw.name === 'lampGlow') { const R = Math.max(7, Math.round(12 * q[2])); (q[0] + R >= 0 && q[0] - R <= S.W + 2 && q[1] + R >= 0 && q[1] - R <= S.H + 2 ? on : off).add(R); } return ga(g, draw, q); };
    const r = new Proxy({ ctx: buf.getContext('2d'), game, W: S.W, H: S.H, bw: S.W + 2, bh: S.H + 2, ix: 0, iy: 0 }, { get: (t, k) => (k in t ? t[k] : k === 'view' ? game.view : () => {}) });
    // the longest north-south line of streetlamps; north up its sidewalk on both sides, a frame drawn every 1/60 s
    const lines = new Map(); for (const p of gtm.city.props) if (p.kind === 'lamp') { const k = Math.round(p.x); if (!lines.has(k)) lines.set(k, []); lines.get(k).push(p); }
    const [x, line] = [...lines.entries()].sort((a, b) => b[1].length - a[1].length)[0], ys = line.map(p => p.y); lamps = line.length;
    for (const dx of [-12, 12]) for (let y = Math.max(...ys) + 150; y > Math.min(...ys) - 100; y -= 2.5) { gtm.teleport(x + dx, y); game.advance(1 / 60); game.scene.draw(r); }
    res.glow = await retained(made.lampGlow); res.token = await retained(made.token);
    const unseen = [...off].filter(R => !on.has(R)); res.radii = `${on.size + unseen.length} radii; on the buffer up to ${Math.max(...on)} px, ${unseen.length} of them (${Math.min(...unseen)}-${Math.max(...unseen)} px) only ever drawn wholly off it`;
    // out to the title and back into play: the module's halo cache outlives the scene
    game.go('title'); game.advance(1.5); game.go('play'); game.advance(1.5);
    res.glowAfter = await retained(made.lampGlow);
    console.log(`${lamps} lamps walked past in MODE 7 at night: lampGlow made ${made.lampGlow.length} canvases, ${res.glow.n} held (${(res.glow.px / 1e6).toFixed(1)} Mpx, ${mb(res.glow.px)} as RGBA, ` +
      `the largest ${res.glow.big}x${res.glow.big}; ${res.radii}), ${res.glowAfter.n} still held after the title and back; CombatFX._token made ${made.token.length}, ${res.token.n} held (${(res.token.px / 1e6).toFixed(2)} Mpx, ${mb(res.token.px)})`);
  });
  it('keeps the lamp halo images a bounded cache (like the depth light\'s 32 discs)', () => {
    assert.ok(res.glow.n <= 32 && res.glow.px <= 1e6, `lampGlow: ${res.glow.n} images, ${(res.glow.px / 1e6).toFixed(1)} Mpx held (${mb(res.glow.px)}), the largest ${res.glow.big}x${res.glow.big}`);
  });
  it('lets the halo images go with the scene', () => {
    assert.ok(res.glowAfter.n < res.glow.n || res.glow.n <= 32, `after the title and back into play: ${res.glowAfter.n} of ${res.glow.n} still held`);
  });
  it('keeps the pickup tokens a bounded cache', () => {
    assert.ok(res.token.n <= 64, `CombatFX._token: ${res.token.n} images held (${(res.token.px / 1e6).toFixed(2)} Mpx), one per pickup kind, item and whole radius on screen`);
  });
});
