// Screenshots of the built page in headless Chromium at 1920x1080 (the 10-foot target: a 480x270 buffer at S = 4).
//   node tools/shots.mjs --at '#proving/scale' [--query 'mode=walk'] [--wait 2500] [--out docs/media/x.png]
//                        [--eval 'window.__gtm.view("top")'] [--keys 'KeyD:800,Enter']
// Prints the scene's debug snapshot and any page errors. The screenshot matrix (M13) runs this over views x times.
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };

export async function shot({ at = '', query = '', wait = 2500, out = 'check-output/shot.png', evaluate = null, keys = null, size = [1920, 1080] } = {}) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: size[0], height: size[1] } }), errors = [];
    page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(pathToFileURL(resolve('dist/index.html')).href + (query ? '?' + query : '') + at);
    await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 20000 });
    if (evaluate) await page.evaluate(evaluate);
    for (const k of (keys || '').split(',').filter(Boolean)) { const [code, ms] = k.split(':'); if (ms) { await page.keyboard.down(code); await page.waitForTimeout(+ms); await page.keyboard.up(code); } else await page.keyboard.press(code); }
    await page.waitForTimeout(+wait);
    mkdirSync(dirname(resolve(out)), { recursive: true });
    await page.screenshot({ path: out });
    return { out, snapshot: await page.evaluate(() => window.__gtm.game.debug.snapshot()), errors };
  } finally { await browser.close(); }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await shot({ at: arg('at', ''), query: arg('query', ''), wait: +arg('wait', 2500), out: arg('out', 'check-output/shot.png'), evaluate: arg('eval', null), keys: arg('keys', null) });
  console.log(JSON.stringify(r));
  if (r.errors.length) process.exit(1);
}
