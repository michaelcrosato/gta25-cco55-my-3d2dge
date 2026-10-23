// FAN-OUT B (10-foot UI), the browser's side of hud-size-overflow.test.mjs: the real page at 1280 x 720 with SETTINGS,
// DISPLAY, HUD SIZE on Large (the UI layer 320 x 180): the phone's legend and the pause map's legend as drawn.
//   node tools/build.mjs && node tests/review/ui/hud-size-overflow.browser.mjs [--shots dir]   (prints FAIL with the numbers)
import { chromium } from 'playwright';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2), shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
const url = pathToFileURL(resolve('dist/index.html')).href + '?time=day#play';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url); await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 60000 }); await page.waitForTimeout(1000);
await page.evaluate(() => window.__gtm.game.settings.set('hudSize', 1));
const fails = [];
for (const [name, open] of [['phone', 'window.__gtm.career.phone()'], ['pause map', 'window.__gtm.ui.screens.open(window.__gtm.game.scene.pauseScreen("map"))']]) {
  await page.evaluate(src => { window.__gtm.ui.screens.closeAll(); window.__gtm.career.card = null; (0, eval)(src); }, open);
  await page.waitForTimeout(400);
  const R = await page.evaluate(() => window.__gtm.ui.record());
  const legend = R.prompts.filter(q => /\{menu:back\}/.test(q.s)).map(q => ({ s: q.s.replace(/\{menu:(\w+)\}/g, '<$1>'), x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.w), h: q.h }));
  const off = legend.filter(q => q.y + q.h > R.H || q.x < 0 || q.x + q.w > R.W);
  console.log(`${off.length ? 'FAIL' : 'ok  '} ${name}: the UI layer ${R.W}x${R.H} (safe ${R.safe.join(',')}), its legend ${JSON.stringify(legend)}`);
  if (off.length) fails.push(name);
  if (shots) await page.screenshot({ path: join(shots, `hud-large-720p-${name.replace(/ /g, '-')}.png`) });
}
await browser.close();
process.exit(fails.length ? 1 : 0);
