// Review (kiosk and mobile, PLAN.md 8.20: "The menu button (top right) opens a small overlay: sound on/off, volume,
// view style, About"; "No touch controls"): on a phone the kiosk's ABOUT is a dead end. The overlay's ABOUT row opens
// creditsScreen() (MOTOR's docScreen) over the demo. A phone has only taps: the doc screen turns a tap into "the next
// page" (docScreen update: mouse.click -> +1, or nothing on a one-page doc), its BACK is ○ / Esc / Backspace / the right
// mouse button (the menu context's `back`), its legend is drawn, not tapped, and while a screen is open the attract scene
// no longer reads the MENU button (attract.js: `if (app.kiosk && !app.ui.took)`). So nothing a phone can do closes it:
// the About text stays over the dimmed demo for good (an unattended kiosk keeps showing it after the passer-by leaves).
//   node tools/build.mjs && node tests/review/attract/kiosk-about-no-way-back.mjs
// Prints FAIL (exit 1) when no tap gets the phone back from ABOUT.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const url = pathToFileURL(resolve('dist/index.html')).href;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }), page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(String(e)));
await page.goto(url); await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 30000 });
await page.evaluate(() => window.__gtm.game.stop());   // (virtual time: every frame stepped and drawn here)
const frames = secs => page.evaluate(s => { const g = window.__gtm.game; for (let i = 0; i < Math.round(s * 60); i++) g.advance(1 / 60, { draw: true }); }, secs);
const snap = () => page.evaluate(() => window.__gtm.game.debug.snapshot());
// UI pixels to page pixels
const at = (x, y) => page.evaluate(([x, y]) => { const L = window.__gtm.ui.layer, r = document.getElementById('ui').getBoundingClientRect(); return [r.left + x * r.width / L.W, r.top + y * r.height / L.H]; }, [x, y]);
const tap = async (x, y) => { const [px, py] = await at(x, y); await page.touchscreen.tap(px, py); await frames(.05); };
const rowOf = label => page.evaluate(l => { const t = window.__gtm.ui.screens.top, r = t && t.list && t.list.rows.find(q => t.list.items[q.i] && t.list.items[q.i].label === l); return r ? [r.x + r.w / 2, r.y + r.h / 2] : null; }, label);

await frames(1);
let s = await snap();
if (s.scene !== 'attract' || !s.kiosk) { console.log('FAIL setup: not the kiosk demo', JSON.stringify(s)); process.exit(1); }
const b = await page.evaluate(() => window.__gtm.kioskButton());
await tap(b[0] + b[2] / 2, b[1] + b[3] / 2);
s = await snap(); console.log('the MENU button: overlay', s.menu);
const about = await rowOf('ABOUT'); if (!about) { console.log('FAIL setup: no ABOUT row', JSON.stringify(s)); process.exit(1); }
await tap(about[0], about[1]);
s = await snap(); console.log('ABOUT tapped: screen', s.menu);
// every way a phone has: taps all over the screen (the panel, its legend at the foot, the corners, the MENU button)
const W = await page.evaluate(() => [window.__gtm.ui.layer.W, window.__gtm.ui.layer.H]), spots = [];
for (let gy = 1; gy <= 5; gy++) for (let gx = 1; gx <= 2; gx++) spots.push([W[0] * gx / 3, W[1] * gy / 6]);
spots.push([b[0] + b[2] / 2, b[1] + b[3] / 2], [4, 4], [W[0] - 4, W[1] - 4], [W[0] / 2, W[1] - 8]);
// the legend's line ("... TURN THE PAGE   (circle) BACK"), where drawScreen puts it: its panel's foot, less 14
const legendY = await page.evaluate(() => { const L = window.__gtm.ui.layer, [, sy0, , sy1] = L.safe, bodyH = Math.max(60, sy1 - sy0 - 64), h = Math.min(sy1 - sy0, 30 + bodyH + 26), y = Math.max(sy0, Math.min(sy1 - h, Math.round(L.H / 2 - h / 2))); return y + h - 14 + 3; });
for (const dx of [-60, -30, 0, 30, 60, 90]) spots.push([W[0] / 2 + dx, legendY]);
const seen = new Set();
for (const [x, y] of spots) { await tap(x, y); seen.add((await snap()).menu); }
await page.evaluate(() => window.__gtm.game.advance(60)); await frames(.1);   // (and a minute left alone, then a frame drawn)
const end = await snap();
const back = end.menu === null || end.menu === 'kiosk';
console.log(`${back ? 'ok  ' : 'FAIL'} a phone gets back from the kiosk's ABOUT: after ${spots.length} taps all over the screen and a minute alone the top screen is ${end.menu} (screens seen on top meanwhile: ${[...seen].join(', ')}); scene ${end.scene}, reel ${end.reel}${errors.length ? '; page errors: ' + errors.slice(0, 2).join(' | ') : ''}`);
await browser.close();
process.exit(back ? 0 : 1);
