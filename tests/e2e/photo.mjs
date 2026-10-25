// Photo mode in Chromium (PLAN.md 8.22's accept): the built page from file://, B opens it (the world holds still), F
// picks the look (NOIR greys the frame), Space takes a photo, which the browser saves as a PNG of the drawn frame (a real download, its bytes a PNG's), and Escape
// puts the game back as it was.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const url = pathToFileURL(resolve('dist/index.html')).href + '?seed=1999&time=day&weather=clear#play/greasy-spoke', fails = [];
const ok = (what, cond, detail = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + what + (cond ? '' : ': ' + detail)); if (!cond) fails.push(what); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true }), page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url); await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 20000 });
await page.waitForTimeout(800);
await page.keyboard.press('KeyB'); await page.waitForTimeout(300);
const s = await page.evaluate(() => ({ on: window.__gtm.photo.active, ctx: window.__gtm.bindings.context, h: JSON.stringify(window.__gtm.game.stateHash()) }));
ok('B opens photo mode', s.on && s.ctx === 'photo', JSON.stringify(s));
await page.waitForTimeout(700);
ok('the world holds still', await page.evaluate(h => JSON.stringify(window.__gtm.game.stateHash()) === h, s.h));
// F (R1) picks the look: NOIR turns the frame grey (each sampled pixel's channels within a few of each other), and back
const grey = () => page.evaluate(() => { const c = window.__gtm.game.r.ctx, d = c.getImageData(0, 0, c.canvas.width, c.canvas.height).data; let n = 0, g = 0; for (let i = 0; i < d.length; i += 4 * 97) { n++; if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) < 6) g++; } return g / n; });
const g0 = await grey(); await page.keyboard.press('KeyF'); await page.waitForTimeout(300);
const look = await page.evaluate(() => window.__gtm.photo.lookNow.id), g1 = await grey();
ok('F picks a look: NOIR greys the frame', look === 'noir' && g1 > .97 && g1 > g0 + .2, `look ${look}, grey share ${g0.toFixed(2)} -> ${g1.toFixed(2)}`);
for (let i = 0; i < 5; i++) { await page.keyboard.press('KeyF'); await page.waitForTimeout(120); }
ok('and round the looks back to the frame as it is', await page.evaluate(() => window.__gtm.photo.lookNow.id) === 'none');
await page.keyboard.press('KeyF'); await page.waitForTimeout(200);   // (the photo in NOIR)
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.keyboard.press('Space')]);
const file = await dl.path(), bytes = file ? readFileSync(file) : Buffer.alloc(0), sig = bytes.subarray(0, 8).toString('hex');
ok('Space takes a photo: a PNG download', /\.png$/.test(dl.suggestedFilename()) && sig === '89504e470d0a1a0a' && bytes.length > 5000, `${dl.suggestedFilename()} ${bytes.length} bytes, ${sig}`);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
const e = await page.evaluate(() => ({ on: window.__gtm.photo.active, ctx: window.__gtm.bindings.context, rig: window.__gtm.stage.rig }));
ok('Escape leaves it: the controls and the camera back', !e.on && e.ctx !== 'photo' && e.rig === null, JSON.stringify(e));
ok('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
await browser.close();
process.exit(fails.length ? 1 : 0);
