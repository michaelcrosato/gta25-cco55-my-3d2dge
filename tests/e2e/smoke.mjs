// Browser smoke test (Playwright, headless Chromium): the built page boots to the title, starts play on Enter, the
// protagonist walks, a deep link opens play directly, and the page makes no network requests and throws no errors.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const url = pathToFileURL(resolve('dist/index.html')).href, fails = [];
const ok = (what, cond, detail = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + what + (cond ? '' : ': ' + detail)); if (!cond) fails.push(what); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [], external = [];
async function open(hash = '') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (/^https?:/i.test(r.url())) external.push(r.url()); });
  await page.goto(url + hash); await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 15000 });
  await page.waitForTimeout(600);
  return page;
}
const snap = p => p.evaluate(() => window.__gtm.game.debug.snapshot());
const page = await open();
ok('boots to the title', (await snap(page)).scene === 'title', JSON.stringify(await snap(page)));
await page.keyboard.press('Enter'); await page.waitForTimeout(700);
ok('Enter starts play', (await snap(page)).scene === 'play', JSON.stringify(await snap(page)));
const a = (await snap(page)).hero; await page.keyboard.down('ArrowRight'); await page.waitForTimeout(800); await page.keyboard.up('ArrowRight');
const b = (await snap(page)).hero;
ok('the protagonist walks', Math.hypot(b[0] - a[0], b[1] - a[1]) > 20, `${a} -> ${b}`);
const p2 = await open('#play');
ok('#play opens play directly', (await snap(p2)).scene === 'play', JSON.stringify(await snap(p2)));
ok('no page errors', errors.length === 0, errors.join(' | '));
ok('no network requests', external.length === 0, external.join(' '));
await browser.close();
process.exit(fails.length ? 1 : 0);
