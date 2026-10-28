// Determinism across runtimes (D33, HANDOFF L1): one seed plays the same game headless in Node and in the built page in
// Chromium. Each scenario runs the same fixed steps both ways (game.advance in chunks, the page's own loop held: its
// requestAnimationFrame runs only the boot, and it draws every quarter second while the headless game never draws) and
// game.stateHash() must match at every checkpoint: free roam in the traffic and the crowd, a mission played by the bot,
// and the attract mode's reels. So it proves drawing never touches the simulation either (D33: a car's explosion drawn
// had stopped the game for a hit-stop at the next frame drawn near it).
//   node tests/e2e/cross-runtime.mjs [--secs 60] [--only <part of a scenario's hash>]
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadGame } from '../harness.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const SECS = +arg('secs', 60), CHUNK = 5, DRAW = .25;   // (the page draws every quarter second, the headless game never)
const ONLY = arg('only', '');
const SCENARIOS = [
  { name: 'free roam in the traffic and the crowd', hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear' } },
  { name: 'Holy Rollers played by the mission bot', hash: '#mission/saints_holy_rollers', query: { seed: '2', bot: '1' } },
  { name: 'the attract mode\'s reels', hash: '#attract', query: { seed: '3' } },
];
const fails = [];
const LIST = ONLY ? SCENARIOS.filter(s => s.hash.includes(ONLY)) : SCENARIOS;
const ok = (what, cond, detail = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + what + (cond ? '' : ': ' + detail)); if (!cond) fails.push(what); };

const headless = async sc => {
  const { game } = await loadGame({ hash: sc.hash, query: sc.query }), out = [];
  for (let t = CHUNK; t <= SECS; t += CHUNK) { game.advance(CHUNK); out.push(JSON.stringify([...game.stateHash()])); }
  return out;
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
const inPage = async sc => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {   // the frames are the test's: the boot's run when pumped, the game loop's never
    const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    window.__pumpBoot = () => {
      for (let i = 0; i < 1000; i++) {
        const g = window.My3D2dge && window.My3D2dge.current;
        if (g && !g._booting && g.scene) return true;
        const cbs = q.splice(0);
        for (const cb of cbs) cb(performance.now());
      }
      return false;
    };
  });
  const qs = new URLSearchParams(sc.query).toString();
  await page.goto(pathToFileURL(resolve('dist/index.html')).href + '?' + qs + sc.hash);
  await page.waitForFunction(() => window.My3D2dge && window.My3D2dge.current, null, { timeout: 20000 });
  const booted = await page.evaluate(() => window.__pumpBoot());
  const out = await page.evaluate(([secs, chunk, DRAW]) => {
    const g = window.My3D2dge.current, r = [];
    for (let t = chunk; t <= secs; t += chunk) { for (let k = 0; k < chunk / DRAW; k++) g.advance(DRAW, { draw: true }); r.push(JSON.stringify([...g.stateHash()])); }
    return r;
  }, [SECS, CHUNK, DRAW]);
  await page.close();
  return { booted, out, errors };
};

for (const sc of LIST) {
  const a = await headless(sc), b = await inPage(sc);
  const first = a.findIndex((h, i) => h !== b.out[i]);
  ok(`${sc.name}: the page booted under the test's frames`, b.booted);
  ok(`${sc.name}: the same hash headless and in Chromium at every ${CHUNK} s for ${SECS} s`, first < 0 && a.length === b.out.length,
    first < 0 ? 'lengths ' + a.length + '/' + b.out.length : `first differs at ${(first + 1) * CHUNK} s: ${a[first].slice(0, 120)} | ${b.out[first].slice(0, 120)}`);
  ok(`${sc.name}: no page errors`, b.errors.length === 0, b.errors.join(' | '));
}
await browser.close();
process.exit(fails.length ? 1 : 0);
