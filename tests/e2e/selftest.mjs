// The Proving Ground's self-tests (PLAN.md 8.23): each zone that has one is opened with ?selftest=1 in headless
// Chromium; its script runs over drawn frames and publishes { ok, checks } as __gtm.selftest(). Every zone must pass,
// with no page errors. More zones join as their systems land (M12: all eight).
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ZONES = ['range', 'views'];
const url = pathToFileURL(resolve('dist/index.html')).href, fails = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const zone of ZONES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
    page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url + `?selftest=1#proving/${zone}`);
    await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 15000 });
    let r = null;
    try { await page.waitForFunction(() => window.__gtm.selftest && window.__gtm.selftest(), null, { timeout: 60000, polling: 250 }); r = await page.evaluate(() => window.__gtm.selftest()); } catch (e) { r = { ok: false, checks: [{ check: 'finished in 60 s', ok: false }] }; }
    const bad = (r.checks || []).filter(c => !c.ok);
    console.log(`${r.ok && !errors.length ? 'ok  ' : 'FAIL'} ${zone}: ${(r.checks || []).map(c => `${c.check}${c.ok ? '' : ' (FAILED)'}${c.value !== undefined ? ' = ' + c.value : ''}`).join('; ')}${errors.length ? ' | page errors: ' + errors.join(' | ') : ''}`);
    if (!r.ok || errors.length || bad.length) fails.push(zone);
    await page.close();
  }
} finally { await browser.close(); }
process.exit(fails.length ? 1 : 0);
