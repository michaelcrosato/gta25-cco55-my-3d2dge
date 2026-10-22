// The attract mode's soak (PLAN.md 8.20, M11): the demo left to run, and checked. Headless (the simulation, the director
// and the mission bot in Node, nothing drawn): 30 virtual minutes on each of seeds 1-3. In Chromium (--chromium: the
// built page, every frame drawn): 5 virtual minutes on seed 1, the heap read through performance.memory (the browser
// launched with --enable-precise-memory-info). Each run passes when:
//   - nothing threw (the console's errors, a reel's own, the BUS's listeners');
//   - the entity counts stayed bounded (the fleet, the crowd, the fighters, the BUS's listeners: the last third of the
//     run never above the show's first time round's highest by more than a quarter: each reel's streets differ);
//   - the heap grew less than 10% from the warm-up (the show's first time round: every reel and card once, the caches
//     they fill filled) to the end: the median of the minute after it against the last minute's, each sample read
//     after a full GC (headless: run it with --expose-gc, as the test gate does);
//   - every reel ran at least once; all three views and the bank were shown; a chase reached three stars; there was
//     an explosion and a switch.
// Seed 0 is the shipped page (no ?seed: Lowtown from its own seed, the reels from TUNE.attractSeed), which a ?seed=
// rebuilds: FAN-OUT B found Hot Pursuit stalling there and nowhere else.
//   node --expose-gc tools/attract-soak.mjs [--seeds 0,1,2,3] [--mins 30] [--chromium] [--json report.json]
import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadGame } from '../tests/harness.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; }, has = k => process.argv.includes('--' + k);
const chromium = has('chromium'), seeds = arg('seeds', chromium ? '1' : '0,1,2,3').split(',').map(Number), mins = +arg('mins', chromium ? 5 : 30);   // (seed 0: the shipped page, no ?seed: Lowtown as players get it)
const SAMPLE = 10, HEAP = 20, REELS = ['joyride', 'hot_pursuit', 'turf_war', 'switch', 'heist_tease'];

// the run's samples judged: { ok, fails: [...] }
const median = l => { const q = [...l].sort((a, b) => a - b); return q.length ? q[Math.floor(q.length / 2)] : 0; };
function judge(r) {
  const fails = [], third = Math.floor(r.samples.length / 3), loop1 = r.samples.filter(s => s.t <= r.warmT);
  if (r.errors.length) fails.push(`${r.errors.length} error(s): ${r.errors.slice(0, 3).join(' | ')}`);
  for (const k of Object.keys(r.samples[0] || {}).filter(k => k !== 't')) {
    const a = Math.max(...(loop1.length ? loop1 : r.samples.slice(0, third)).map(s => s[k])), b = Math.max(...r.samples.slice(-third).map(s => s[k]));
    if (b > a * 1.25 + 6) fails.push(`${k} grew: ${a} at most the first time round, ${b} in the last third`);
  }
  const H = r.heaps || [], warm = median(H.filter(h => h.t > r.warmT && h.t <= r.warmT + 60).map(h => h.b)), end = median(H.filter(h => h.t > H[H.length - 1].t - 60).map(h => h.b));
  if (warm && end) { r.heap = { warm, end, growth: +((end - warm) / warm * 100).toFixed(1) }; if (end - warm >= warm * .1) fails.push(`the heap grew ${r.heap.growth}% after the warm-up`); }
  else fails.push('no heap reading after the warm-up (a run too short for the show to go round once and a minute more)');
  const S = r.stats;
  for (const id of REELS) if (!(S.reels[id] > 0)) fails.push(`the reel ${id} never ran`);
  for (const v of ['iso', 'top', 'side7']) if (!S.views.includes(v)) fails.push(`the view ${v} never shown`);
  if (!S.bank) fails.push('the bank never shown');
  if (S.stars < 3) fails.push(`no chase reached three stars (${S.stars})`);
  if (!S.explosions) fails.push('no explosion'); if (!S.switches) fails.push('no switch');
  return { ok: !fails.length, fails };
}

async function headless(seed) {
  const g = await loadGame({ hash: '#attract', query: seed ? { seed: String(seed) } : {} }), { game, gtm, ctx } = g, errors = [];
  ctx.console.error = (...a) => errors.push(a.map(String).join(' ').slice(0, 300));
  const gc = globalThis.gc || null, heap = () => { if (gc) gc(); return process.memoryUsage().heapUsed; };
  const samples = [], heaps = []; let warmT = 0;
  for (let t = 1; t <= mins * 60; t++) {
    game.advance(1);
    if (t % SAMPLE === 0) samples.push(count(gtm, t));
    if (t % HEAP === 0) heaps.push({ t, b: heap() });
    if (!warmT && gtm.director.loop >= 1) warmT = t;   // (the warm-up: once round the show)
  }
  const D = gtm.director, R = gtm.career && gtm.career.R;
  if (R) for (const e of R.errors) errors.push(`${e.mission} ${e.stage}: ${e.err}`);
  for (const e of gtm.BUS.errors || []) errors.push(`BUS ${e.ev}: ${e.err}`);
  return { seed, mins, errors, samples, heaps, warmT, stats: { ...D.stats, views: [...D.stats.views] }, log: D.log };
}
// what the world holds now (the play scene's own, exposed afresh each reel)
function count(gtm, t) {
  const B = gtm.BUS;
  return { t, vehicles: gtm.fleet ? gtm.fleet.vehicles.length : 0, peds: gtm.life && gtm.life.crowd ? gtm.life.crowd.count : 0, bodies: gtm.combat ? gtm.combat.bodies.length : 0,
    listeners: ['crime', 'hit', 'kill', 'explode', 'wanted', 'vehicleEnter', 'stageStart'].reduce((n, ev) => n + B.count(ev), 0) };
}

async function inChromium(seed) {
  const { chromium: C } = await import('playwright');
  const url = pathToFileURL(resolve('dist/index.html')).href + `${seed ? '?seed=' + seed : ''}#attract`;
  if (!existsSync('dist/index.html')) throw new Error('no dist/index.html: node tools/build.mjs first');
  const browser = await C.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--enable-precise-memory-info', '--js-flags=--expose-gc', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 300))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  await page.goto(url); await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 20000 });
  await page.evaluate(() => window.__gtm.game.stop());   // (virtual time: each frame stepped and drawn here)
  const samples = [], heaps = []; let warmT = 0;
  const heap = () => page.evaluate(() => { if (window.gc) window.gc(); return performance.memory ? performance.memory.usedJSHeapSize : 0; });
  for (let t = 1; t <= mins * 60; t++) {
    await page.evaluate(() => { const g = window.__gtm.game; for (let i = 0; i < 30; i++) g.advance(1 / 30, { draw: true }); });
    if (t % SAMPLE === 0) samples.push(await page.evaluate(t => { const G = window.__gtm, B = G.BUS; return { t, vehicles: G.fleet ? G.fleet.vehicles.length : 0, peds: G.life && G.life.crowd ? G.life.crowd.count : 0, bodies: G.combat ? G.combat.bodies.length : 0, listeners: ['crime', 'hit', 'kill', 'explode', 'wanted', 'vehicleEnter', 'stageStart'].reduce((n, ev) => n + B.count(ev), 0) }; }, t));
    if (t % HEAP === 0) heaps.push({ t, b: await heap() });
    if (!warmT && await page.evaluate(() => window.__gtm.director.loop >= 1)) warmT = t;   // (the warm-up: once round the show)
  }
  const out = await page.evaluate(() => { const D = window.__gtm.director, R = window.__gtm.career && window.__gtm.career.R; return { stats: { ...D.stats, views: [...D.stats.views] }, log: D.log, errs: R ? R.errors.map(e => `${e.mission} ${e.stage}: ${e.err}`) : [] }; });
  await browser.close();
  return { seed, mins, chromium: true, errors: [...errors, ...out.errs], samples, heaps, warmT, stats: out.stats, log: out.log };
}

let bad = 0; const report = [];
for (const seed of seeds) {
  const t0 = Date.now(), r = chromium ? await inChromium(seed) : await headless(seed), j = judge(r);
  // (in Chromium a five-minute run need not show every reel's world: the views, the bank and the chase are the
  // headless soak's to prove; drawn, it is the errors, the counts and the heap that matter)
  if (chromium) j.fails = j.fails.filter(f => !/never ran|never shown|three stars|no explosion|no switch/.test(f)), j.ok = !j.fails.length;
  report.push({ ...r, ...j, secs: Math.round((Date.now() - t0) / 1000) }); if (!j.ok) bad++;
  const S = r.stats;
  console.log(`${j.ok ? 'ok  ' : 'FAIL'} seed ${seed}${chromium ? ' (Chromium, drawn)' : ''}: ${mins} min; reels ${Object.entries(S.reels).map(([k, v]) => k + ' ' + v).join(', ')}; ended ${Object.values(S.ended).reduce((a, b) => a + b, 0)}, cut ${Object.values(S.cuts).reduce((a, b) => a + b, 0)}; views ${S.views.join(' ')}; bank ${S.bank}; stars ${S.stars}; explosions ${S.explosions}; switches ${S.switches}; cards ${S.cards}; heap ${r.heap && r.heap.growth !== undefined ? r.heap.growth + '%' : '-'} [${Math.round((Date.now() - t0) / 1000)} s]`);
  for (const f of j.fails) console.log('     ' + f);
}
if (arg('json')) writeFileSync(arg('json'), JSON.stringify(report, null, 1));
console.log(bad ? `\n${bad} run(s) failed` : `\nall ${report.length} run(s) passed`);
process.exit(bad ? 1 : 0);
