// Where a frame's draw time goes (dev tool): wraps the renderer's parts in the page and reports the mean ms of each over
// a few seconds. node tools/profile-frame.mjs [--at '#proving/scale'] [--query perf=1] [--seconds 6] [--eval 'js run first']
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(resolve('dist/index.html')).href + '?' + arg('query', 'perf=1') + arg('at', '#proving/scale'));
await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 20000 });
if (arg('eval', null)) await page.evaluate(arg('eval', null));
await page.waitForTimeout(2500);
const out = await page.evaluate(async seconds => {
  const G = window.__gtm.game, Y = window.__gtm.yard, acc = {}, n = { frames: 0 };
  const wrap = (obj, name, label) => { const f = obj[name]; obj[name] = function (...a) { const t = performance.now(); try { return f.apply(this, a); } finally { acc[label] = (acc[label] || 0) + performance.now() - t; } }; };
  const proto = Object.getPrototypeOf(G.r);
  if (Y) { wrap(Y.floor, 'drawIso', 'floor.drawIso'); wrap(Y.floor, 'bake', 'floor.bake'); wrap(Y.map, 'queueWalls', 'map.queueWalls'); wrap(Y.map, '_box', 'wall bake (_box)'); if (Y.map.prebakeWalls) wrap(Y.map, 'prebakeWalls', 'map.prebakeWalls (incl. its bakes)'); wrap(Y.map, '_boxCached', 'wall blocks (_boxCached, incl. bakes)'); }
  wrap(G.screen, '_present', 'screen._present'); wrap(G.r, '_flush', 'r._flush (sort + queued draws)'); wrap(G.lights, 'render', 'lights.render');
  if (Y && Y.bg) wrap(Y.bg, 'draw', 'backdrop.draw');
  if (G.scene && G.scene.draw) wrap(G.scene, 'draw', 'scene.draw (queueing)'); wrap(G.r, '_finish', 'r._finish (sort+flush+present)'); wrap(G, '_frame', 'game._frame (all draw)');
  void proto;
  const t0 = performance.now(); await new Promise(res => { const tick = () => { n.frames++; if (performance.now() - t0 < seconds * 1000) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
  const per = {}; for (const [k, v] of Object.entries(acc)) per[k] = +(v / n.frames).toFixed(3); return { frames: n.frames, msPerFrame: per };
}, +arg('seconds', 6));
console.log(JSON.stringify(out, null, 1));
await browser.close();
