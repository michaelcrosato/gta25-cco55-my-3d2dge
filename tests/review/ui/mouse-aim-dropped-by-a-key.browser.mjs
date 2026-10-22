// FAN-OUT B (10-foot UI), the browser's side of mouse-aim-dropped-by-a-key.test.mjs: the real page in Chromium, a real
// mouse and keyboard. Right mouse held, the pointer north of the player: the intent aims at the pointer. One tap of D
// (a strafe step), the pointer swung east: the intent's aim is null and the body still faces the old point.
//   node tools/build.mjs && node tests/review/ui/mouse-aim-dropped-by-a-key.browser.mjs   (prints FAIL with the numbers)
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const url = pathToFileURL(resolve('dist/index.html')).href + '?time=day&traffic=0#play';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on('pageerror', e => errors.push(String(e)));
await page.goto(url); await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 60000 }); await page.waitForTimeout(1200);
await page.evaluate(() => { const p = window.__gtm.crew.ped; p.inv.give('snub38', 48, true); p.inv.select('snub38'); });
// where the player is on the page: the canvas's middle (the camera follows them); the pointer 200 px above, then 250 px right
const box = await page.evaluate(() => { const r = document.querySelector('canvas#screen, canvas').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
const read = () => page.evaluate(() => {
  const G = window.__gtm, p = G.crew.ped, I = G.game.input, m = G.views.mouseGround(), a = G.human.intent.aim, d = m ? [m[0] - p.x, m[1] - p.y] : null, l = d ? Math.hypot(d[0], d[1]) : 0;
  const want = d && l ? [d[0] / l, d[1] / l] : null, dot = (u, v) => (u && v ? +(u[0] * v[0] + u[1] * v[1]).toFixed(2) : null);
  return { lastDevice: I.lastDevice, aimSource: I.aimSource, aim: a ? a.map(v => +v.toFixed(2)) : null, toPointer: want && want.map(v => +v.toFixed(2)), aimVsPointer: dot(a, want), bodyVsPointer: dot(p.aimer.dir, want) };
});
await page.mouse.move(box[0], box[1] - 200, { steps: 4 }); await page.waitForTimeout(200);
await page.mouse.down({ button: 'right' }); await page.waitForTimeout(400);
const before = await read();
await page.keyboard.down('KeyD'); await page.waitForTimeout(150); await page.keyboard.up('KeyD'); await page.waitForTimeout(100);
await page.mouse.move(box[0] + 250, box[1], { steps: 6 }); await page.waitForTimeout(500);
const after = await read();
await page.mouse.up({ button: 'right' });
console.log('right mouse held, pointer above the player:', JSON.stringify(before));
console.log('one tap of D, pointer swung right:        ', JSON.stringify(after));
const ok = before.aimVsPointer > .9 && after.aim && after.aimVsPointer > .9;
console.log(ok ? 'ok   the mouse kept aiming' : `FAIL the mouse stopped aiming after a key: intent.aim ${JSON.stringify(after.aim)}, the body's aim against the pointer's direction ${after.bodyVsPointer} (1 = on it)`);
if (errors.length) console.log('page errors:', errors.slice(0, 3).join(' | '));
await browser.close();
process.exit(ok ? 0 : 1);
