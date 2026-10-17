// Perf scenarios in headless Chromium (PLAN.md 7.11, 14): open the built page at a deep link with ?perf=1, let it warm
// up, then read the frames the scene recorded (each frame's game.stats.updateMs and renderMs) and report medians, p90
// and p99. The gates use medians with a 15% tolerance; p99 is reported, not gated (headless timing is noisy).
//   node tools/perf.mjs [--scenario scale-lap] [--seconds 12] [--warm 3] [--json out.json]
// The viewport is 1920x1080, so the buffer is the game's 480x270 at S = 4 (res 'ps1', expand to 560x320).
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';

export const SCENARIOS = {
  'scale-lap': { hash: '#proving/scale', query: 'perf=1', what: 'the 160x160 scale yard in ISO, a lap at 300 u/s (floor chunks + patched walls)' },
  'scale-walk': { hash: '#proving/scale', query: 'perf=1&mode=walk', what: 'the scale yard in ISO, standing at the first corner' },
  'scale-lap-65': { hash: '#proving/scale', query: 'perf=1&zoom=0.65', what: 'the scale yard lap at the widest driving zoom (.65)' },
  'views-iso': { hash: '#proving/views', query: 'perf=1&view=iso', what: 'the view lab (64x64, 40 walkers) in ISO, a lap at 300 u/s' },
  'views-top': { hash: '#proving/views', query: 'perf=1&view=top', what: 'the view lab in TOP-DOWN, a lap at 300 u/s (H at its driving height)' },
  'views-side7': { hash: '#proving/views', query: 'perf=1&view=side7', what: 'the view lab in SIDE-SCROLL MODE 7, a lap at 300 u/s' },
  'scale-side7': { hash: '#proving/scale', query: 'perf=1&view=side7', what: 'the 160x160 scale yard lap in SIDE-SCROLL MODE 7 (no walkers)' },
  'scale-top': { hash: '#proving/scale', query: 'perf=1&view=top', what: 'the 160x160 scale yard lap in TOP-DOWN (no walkers)' },
  'pad-iso': { hash: '#proving/pad', query: 'perf=1&mode=auto&zoom=0.8', what: 'the vehicle pad: the Cortez driving itself, 4 parked cars, ISO at zoom .8' },
  'lowtown-walk': { hash: '#play/bank-door', query: 'perf=1&time=night&weather=clear', what: 'Lowtown at night in ISO, standing at the First Lowtown Bank (Neon Mile)' },
  'lowtown-tour': { hash: '#play', query: 'perf=1&tour=1&time=night&weather=clear', what: 'Lowtown at night in ISO: the tour through all four neighbourhoods at 300 u/s' },
  'lowtown-tour-rain': { hash: '#play', query: 'perf=1&tour=1&time=night&weather=rain', what: 'the Lowtown tour at night in the rain in ISO (drops, splashes, the wet street, the glints)' },
  'lowtown-gate': { hash: '#play', query: 'perf=1&tour=1&time=night&weather=rain&crowd=1', what: 'the gate (PLAN.md 8.4): the Lowtown tour at night in the rain in ISO, with 40 walkers and 20 cars in view (stand-ins until M4 and M5)' },
  'lowtown-gate-top': { hash: '#play', query: 'perf=1&tour=1&time=night&weather=rain&crowd=1&view=top', what: 'the gate in TOP-DOWN' },
  'lowtown-gate-side7': { hash: '#play', query: 'perf=1&tour=1&time=night&weather=rain&crowd=1&view=side7', what: 'the gate in SIDE-SCROLL MODE 7' },
  'lowtown-tour-day': { hash: '#play', query: 'perf=1&tour=1&time=day&weather=clear', what: 'the Lowtown tour by day in ISO (no lighting pass)' },
  'lowtown-tour-top': { hash: '#play', query: 'perf=1&tour=1&time=night&weather=rain&view=top', what: 'the Lowtown tour at night in the rain in TOP-DOWN' },
  'lowtown-tour-side7': { hash: '#play', query: 'perf=1&tour=1&time=night&weather=rain&view=side7', what: 'the Lowtown tour at night in the rain in SIDE-SCROLL MODE 7' },
  'pad-iso-speedzoom': { hash: '#proving/pad', query: 'perf=1&mode=auto', what: 'the vehicle pad lap with the speed zoom stepping between .8 and .65' },
};
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };

export async function measure(name, { seconds = 12, warm = 3 } = {}) {
  const sc = SCENARIOS[name]; if (!sc) throw new Error('unknown scenario ' + name + ': ' + Object.keys(SCENARIOS).join(', '));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(pathToFileURL(resolve('dist/index.html')).href + '?' + sc.query + sc.hash);
    await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 20000 });
    await page.waitForTimeout(warm * 1000);
    const skip = await page.evaluate(() => window.__gtm.perf().frames);
    await page.waitForTimeout(seconds * 1000);
    const p = await page.evaluate(() => window.__gtm.perf()), buf = await page.evaluate(() => [window.__gtm.game.screen.W, window.__gtm.game.screen.H]);
    const upd = p.update.slice(skip), ren = p.render.slice(skip);
    return { scenario: name, what: sc.what, buffer: buf.join('x'), frames: ren.length, fps: +(ren.length / seconds).toFixed(1),
      renderMs: { median: q(ren, .5), p90: q(ren, .9), p99: q(ren, .99), max: Math.max(0, ...ren), over33: ren.filter(v => v > 33).length }, updateMs: { median: q(upd, .5), p90: q(upd, .9), p99: q(upd, .99) },
      floor: p.floor, walls: p.walls, solids: p.solids, errors };
  } finally { await browser.close(); }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const names = arg('scenario', Object.keys(SCENARIOS).join(',')).split(','), out = [];
  for (const n of names) { const r = await measure(n, { seconds: +arg('seconds', 12), warm: +arg('warm', 3) }); out.push(r); console.log(JSON.stringify(r, null, 1)); }
  const file = arg('json', null); if (file) writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
}
