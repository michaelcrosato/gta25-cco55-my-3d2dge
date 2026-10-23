// Browser smoke test (Playwright, headless Chromium): the built page boots to the title, starts play on Enter, the
// protagonist walks, a deep link opens play directly, and the page makes no network requests and throws no errors.
// Played twice (PLAN.md 15.3): from file://, and from a static server (tools/serve.mjs on a free port), where the page
// itself is its only request (the tab's icon is inline: no favicon.ico asked for).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const fails = [];
const ok = (what, cond, detail = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + what + (cond ? '' : ': ' + detail)); if (!cond) fails.push(what); };
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'inherit'] });
const served = await new Promise((res, rej) => {
  server.stdout.on('data', d => { const m = /http:\/\/localhost:\d+/.exec(String(d)); if (m) res(m[0] + '/'); });
  server.on('exit', c => rej(new Error('tools/serve.mjs exited ' + c)));
});
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  for (const url of [pathToFileURL(resolve('dist/index.html')).href, served]) {
    const from = url.startsWith('file:') ? 'file://' : 'a static server', errors = [], external = [];
    async function open(hash = '') {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text() + ' ' + JSON.stringify(m.location())); });
      page.on('request', r => { const u = r.url().split('#')[0]; if (/^https?:/i.test(u) && u !== url) external.push(u); });
      await page.goto(url + hash); await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 15000 });
      await page.waitForTimeout(600);
      return page;
    }
    const snap = p => p.evaluate(() => window.__gtm.game.debug.snapshot());
    const page = await open();
    ok(`${from}: boots to the title`, (await snap(page)).scene === 'title', JSON.stringify(await snap(page)));
    await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    ok(`${from}: Enter starts play`, (await snap(page)).scene === 'play', JSON.stringify(await snap(page)));
    const a = (await snap(page)).hero; await page.keyboard.down('KeyD'); await page.waitForTimeout(800); await page.keyboard.up('KeyD');
    const b = (await snap(page)).hero;
    ok(`${from}: the protagonist walks`, Math.hypot(b[0] - a[0], b[1] - a[1]) > 20, `${a} -> ${b}`);
    const p2 = await open('#play');
    ok(`${from}: #play opens play directly`, (await snap(p2)).scene === 'play', JSON.stringify(await snap(p2)));
    ok(`${from}: no page errors`, errors.length === 0, errors.join(' | '));
    ok(`${from}: no network requests`, external.length === 0, external.join(' '));
    await page.close(); await p2.close();
  }
} finally { await browser.close(); server.kill(); }
process.exit(fails.length ? 1 : 0);
