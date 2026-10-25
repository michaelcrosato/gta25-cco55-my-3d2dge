// The dev tools in Chromium (PLAN.md 8.23): the built page from file:// with ?dev=1, every overlay switched on and drawn
// in ISO, TOP-DOWN and MODE 7 without an error; ` opens the dev menu and Escape closes it. --shots <dir>: a picture of
// each view with the overlays (the record's).
import { chromium } from 'playwright';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = k => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : null; }, shots = arg('shots');
const url = pathToFileURL(resolve('dist/index.html')).href + '?seed=1999&time=night&weather=clear&dev=1#play/bank-door', fails = [];
const ok = (what, cond, detail = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + what + (cond ? '' : ': ' + detail)); if (!cond) fails.push(what); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url); await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 20000 });
await page.evaluate(() => { const g = window.__gtm.game; g.stop(); for (let i = 0; i < 60; i++) g.advance(1 / 30); for (const k of Object.keys(window.__gtm.overlays.flags)) window.__gtm.overlays.flags[k] = true; });
for (const v of ['iso', 'top', 'side7', 'chase']) {
  const before = errors.length;
  await page.evaluate(v => { const g = window.__gtm.game; g.setView(v); for (let i = 0; i < 20; i++) g.advance(1 / 30, { draw: true }); }, v);
  ok(`every overlay drawn in ${v}`, errors.length === before, errors.slice(before).join(' | '));
  if (shots) await page.screenshot({ path: join(shots, `overlays-${v}-720p.png`) });
}
await page.evaluate(() => { const g = window.__gtm.game; g.setView('iso'); for (const k of Object.keys(window.__gtm.overlays.flags)) window.__gtm.overlays.flags[k] = false; });
await page.keyboard.down('Backquote'); await page.evaluate(() => { const g = window.__gtm.game; g.advance(1 / 60); }); await page.keyboard.up('Backquote');
await page.evaluate(() => { const g = window.__gtm.game; for (let i = 0; i < 6; i++) g.advance(1 / 60, { draw: true }); });
const top = await page.evaluate(() => (window.__gtm.ui.screens.top ? window.__gtm.ui.screens.top.id : null));
ok('` opens the dev menu', top === 'dev', String(top));
if (shots) await page.screenshot({ path: join(shots, 'dev-menu-720p.png') });
ok('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
await browser.close();
process.exit(fails.length ? 1 : 0);
