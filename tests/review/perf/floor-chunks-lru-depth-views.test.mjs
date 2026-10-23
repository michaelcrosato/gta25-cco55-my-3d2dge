// FAN-OUT B, perf and memory: the floor chunks' LRU (PLAN.md 8.4: "an LRU of about 48 chunks") never evicts in
// TOP-DOWN or MODE 7. FloorChunks.bake drops the chunks used longest ago, but only those whose `used` frame is not the
// current one, and `frame` only advances in drawIso: the depth views (Stage.end -> floor.canvas / pump, TopView and
// Side7View.drawFloor) never move it, so every chunk they touch counts as used "this frame" forever and none is ever
// dropped. A drive in TOP-DOWN keeps every chunk it passed (all 100 of Lowtown's, 260 x 260 texels each). Back in ISO
// nothing is trimmed either (the LRU runs only on a bake, and every chunk is baked by then), and each kept chunk then
// gains its ISO projection beside it. Players who never pick TOP-DOWN get there too: a crew switch flies its camera in
// TOP-DOWN up to TUNE.switchHeight (2500 u), where the screen spans most of the city, and every chunk it asks for is kept.
// The play scene is drawn headless (its own draw through a stand-in renderer over the engine's null canvases); ISO's
// floor is drawn as the Stage draws it, floor.drawIso(r), with a stand-in renderer centred on a point.
//   node --test tests/review/perf/floor-chunks-lru-depth-views.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

/** the play scene, drawn headless: its own draw through a stand-in renderer over the engine's null canvases (the depth
 *  views need only the buffer's context and size) */
async function drawnPlay(query) {
  const { game, gtm, E } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '7', time: 'day', weather: 'clear', ...query } });
  const mk = E.mkCanvas;   // (a 2D context with no _info / _r of its own, as a real one)
  E.mkCanvas = (w, h) => { const cv = mk(w, h), g0 = cv.getContext('2d'), g = new Proxy(g0, { get: (t, k) => (typeof k === 'string' && k[0] === '_' && !(k in t) ? undefined : t[k]) }); cv.getContext = () => g; return cv; };
  game.advance(.5);
  const S = game.screen, buf = E.mkCanvas(S.W + 2, S.H + 2), ctx = buf.getContext('2d');
  const r = new Proxy({ ctx, game, W: S.W, H: S.H, bw: S.W + 2, bh: S.H + 2, ix: 0, iy: 0 }, { get: (t, k) => (k in t ? t[k] : k === 'view' ? game.view : () => {}) });
  return { game, gtm, E, S, ctx, r };
}

test('a crew switch (its camera in TOP-DOWN, whatever the view) leaves the floor chunks within the LRU\'s cap', { timeout: 120000 }, async () => {
  const { game, gtm, S, ctx, r } = await drawnPlay({ view: 'iso' });
  assert.equal(gtm.views.active, 'iso');
  const floor = gtm.stage.world.floor, crew = gtm.crew, other = crew.order.find(id => id !== crew.active);
  // a second of ISO first, its floor drawn as the Stage draws it (floor.drawIso) round the player
  const v = game.view, p = gtm.crew.ped, q = v.p(p.x, p.y, 0), iso = { view: v, ctx, W: S.W, H: S.H, bw: S.W + 2, bh: S.H + 2, ix: Math.round(q[0] - (S.W + 2) / 2), iy: Math.round(q[1] - (S.H + 2) / 2) };
  for (let k = 0; k < 60; k++) { game.advance(1 / 60); floor.drawIso(iso); }
  const before = floor.chunks.size;
  gtm.career.W.switchTo(other, { vignette: true });   // (the player's own switch: the character wheel's, as a reel asks for it)
  assert.ok(crew.switching, 'the switch is under way');
  let frames = 0, topH = 0; const views = new Set();
  while (crew.switching && frames < 600) { game.advance(1 / 60); views.add(gtm.views.active); if (gtm.stage.depth) { game.scene.draw(r); topH = Math.max(topH, gtm.stage.top.H); } frames++; }
  console.log(`crew switch ${crew.order[0]} -> ${other}: ${frames} frames in ${[...views].join(', ')}, the camera up to ${Math.round(topH)} u; floor chunks kept ${before} before, ${floor.chunks.size} after (cap ${floor.cap}), floor.frame ${floor.frame}`);
  assert.ok(floor.chunks.size <= floor.cap, `after one crew switch: ${floor.chunks.size} floor chunks kept, cap ${floor.cap}`);
});

test('the floor chunks stay within the LRU\'s cap in TOP-DOWN, and in ISO after it', { timeout: 240000 }, async () => {
  const { game, gtm, S, ctx, r } = await drawnPlay({ view: 'top' });
  assert.equal(gtm.views.active, 'top');
  const floor = gtm.stage.world.floor, C = gtm.city, W = C.w * C.T, H = C.h * C.T, total = floor.nx * floor.ny;
  // a drive over the city in TOP-DOWN: rows 256 apart, a frame drawn every 1/60 s, 12 units a frame (720 u/s)
  for (let y = 128; y < H; y += 256) for (let x = 64; x < W; x += 12) { gtm.teleport(x, y); game.advance(1 / 60); game.scene.draw(r); }
  const top = { kept: floor.chunks.size, frame: floor.frame, bakes: floor.stats.bakes };
  // back to ISO: its floor drawn as the Stage draws it, over a lap of the city's middle
  game.setView('iso'); game.advance(1 / 60);
  const v = game.view, iso = { view: v, ctx, W: S.W, H: S.H, bw: S.W + 2, bh: S.H + 2 };
  for (let a = 0; a < Math.PI * 2; a += .01) {
    const x = W / 2 + Math.cos(a) * W * .35, y = H / 2 + Math.sin(a) * H * .35, p = v.p(x, y, 0);
    iso.ix = Math.round(p[0] - iso.bw / 2); iso.iy = Math.round(p[1] - iso.bh / 2);
    for (let k = 0; k < 3; k++) floor.drawIso(iso);   // (a few frames at each spot: the projections are made once the view holds still)
  }
  const chunks = [...floor.chunks.values()], projected = chunks.filter(c => c.iso);
  const px = chunks.reduce((s, c) => s + c.cv.width * c.cv.height + (c.iso ? c.iso.cv.width * c.iso.cv.height : 0), 0);
  console.log(`TOP-DOWN drive: ${top.kept} of the map's ${total} chunks kept (cap ${floor.cap}), floor.frame still ${top.frame} after ${top.bakes} bakes; ` +
    `then ISO: ${floor.chunks.size} kept, ${projected.length} with an ISO projection beside them: ${(px / 1e6).toFixed(1)} Mpx (${(px * 4 / 1048576).toFixed(0)} MB as RGBA) ` +
    `against the cap's ${floor.cap} chunks`);
  assert.ok(top.kept <= floor.cap, `TOP-DOWN: ${top.kept} chunks kept, cap ${floor.cap} (floor.frame ${top.frame}: never advanced outside ISO)`);
  assert.ok(floor.chunks.size <= floor.cap, `ISO after it: ${floor.chunks.size} chunks kept, cap ${floor.cap}`);
});
