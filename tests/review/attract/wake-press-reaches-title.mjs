// Review (attract mode, PLAN.md 8.20 "The input that woke it never triggers a title action"): the press that wakes the
// demo is handed on to the title's menu. The UI layer (src/motor/ui/layer.js) keeps its own pointer state (a finger's
// pending tap `_tap`, the left button's last-seen state `_down`, the wheel's notches `wheel`) and only poll() reads and
// clears it; the non-kiosk attract mode never polls, and leaving it (attract.js leave(): U.closeAll +
// input.consumeAll) clears none of it. So the title's first poll after the .15 s fade sees the waking tap, or a left
// button still held, as a fresh click where the pointer is, and activates the title menu's row under it (NEW GAME
// here: the prologue starts); a wheel notch moves the menu's selection (onto LOAD, disabled with no save).
// The click lands when a frame is drawn between the title's enter and its first update (the list's rows are laid out
// in its draw): every time on a display at 120 Hz or more (one step a frame), sometimes at 60 Hz (two steps a frame,
// by how the frames' steps fall). A phone's kiosk polls in the demo, so it is the desktop and the touchscreen laptop.
//   node tools/build.mjs && node tests/review/attract/wake-press-reaches-title.mjs
// Prints FAIL (exit 1) when the waking input did something on the title.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const url = pathToFileURL(resolve('dist/index.html')).href;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const fails = [];
const report = (what, ok, detail) => { console.log((ok ? 'ok   ' : 'FAIL ') + what + ': ' + detail); if (!ok) fails.push(what); };

// a touchscreen laptop: a trackpad (its primary pointer, fine) and a touch screen. Chromium's touch emulation makes the
// only pointer coarse (a phone: the kiosk), so the pointer queries answer as such a laptop's do
function LAPTOP() {
  const mm = window.matchMedia.bind(window), fake = { '(pointer: coarse)': false, '(pointer: fine)': true, '(any-pointer: fine)': true, '(any-pointer: coarse)': true };
  window.matchMedia = q => (q in fake ? { matches: fake[q], media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } } : mm(q));
}
async function open(ctxOpts, laptop = false) {
  const ctx = await browser.newContext(ctxOpts), page = await ctx.newPage();
  if (laptop) await page.addInitScript(LAPTOP);
  await page.goto(url); await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 30000 });
  await page.evaluate(() => window.__gtm.game.stop());   // (virtual time: every frame stepped and drawn here)
  return { ctx, page };
}
// secs of frames at hz, each stepped then drawn as the page's own loop does (120 Hz: one step a frame; 60 Hz: two)
const frames = (page, secs, hz) => page.evaluate(([s, hz]) => { const g = window.__gtm.game; for (let i = 0; i < Math.round(s * hz); i++) g.advance(1 / hz, { draw: true }); }, [secs, hz]);
const snap = page => page.evaluate(() => window.__gtm.game.debug.snapshot());
// the title menu's NEW GAME row, centred, in page pixels
async function newGameRow(page) {
  const r = await page.evaluate(() => {
    const G = window.__gtm, L = G.ui.layer, top = G.ui.screens.top, row = top && top.list && top.list.rows.find(q => top.list.items[q.i] && top.list.items[q.i].label === 'NEW GAME');
    if (!row) return null;
    const b = document.getElementById('ui').getBoundingClientRect();
    return { x: b.left + (row.x + row.w / 2) * b.width / L.W, y: b.top + (row.y + row.h / 2) * b.height / L.H };
  });
  if (!r) throw new Error('no title menu: ' + JSON.stringify(await snap(page)));
  return r;
}
// into the demo by 10 s of idle on the title, and two seconds of it
async function toDemo(page, hz) {
  await frames(page, 11, hz);
  const s = await snap(page); if (s.scene !== 'attract') throw new Error('no demo after 11 s idle: ' + JSON.stringify(s));
  await frames(page, 2, hz);
}
const what = s => (s.scene === 'play' ? 'scene play: A NEW GAME STARTED (career ' + JSON.stringify(s.career).slice(0, 90) + ')' : `scene ${s.scene}, menu ${s.screen}, row ${s.item}`);
const HZ = 120;

{ // 1. a finger's tap on a touch screen that has a trackpad too (a touchscreen laptop: not a kiosk)
  const { ctx, page } = await open({ viewport: { width: 1280, height: 720 }, hasTouch: true }, true);
  await frames(page, .5, HZ);
  const kiosk = await page.evaluate(() => !!window.__gtm.kiosk), row = await newGameRow(page);
  await toDemo(page, HZ);
  const before = await snap(page);
  await page.touchscreen.tap(row.x, row.y);
  await frames(page, 1 / HZ, HZ); const woke = await snap(page);
  await frames(page, 1.5, HZ); const after = await snap(page);
  report(`${HZ} Hz, a tap that wakes the demo does nothing on the title`, after.scene === 'title',
    `kiosk ${kiosk}; in the demo (${before.scene}, reel ${before.reel}); tapped over the title's NEW GAME row at (${Math.round(row.x)}, ${Math.round(row.y)}); next step leaving: ${woke.leaving}; 1.5 s later: ${what(after)}`);
  await ctx.close();
}
{ // 2. a mouse button pressed to wake the demo and let go a quarter of a second later, the pointer resting where it was
  const { ctx, page } = await open({ viewport: { width: 1280, height: 720 } });
  await frames(page, .5, HZ);
  const row = await newGameRow(page);
  await page.mouse.move(row.x, row.y); await frames(page, .1, HZ);   // (the pointer left over the menu as the player stopped)
  await toDemo(page, HZ);
  await page.mouse.down();
  await frames(page, 1 / HZ, HZ); const woke = await snap(page);
  await frames(page, .25, HZ);
  await page.mouse.up();
  await frames(page, 1.5, HZ); const after = await snap(page);
  report(`${HZ} Hz, a click held a quarter second to wake the demo does nothing on the title`, after.scene === 'title',
    `pressed with the pointer resting over NEW GAME; next step leaving: ${woke.leaving}; let go .25 s later; 1.5 s later: ${what(after)}`);
  await ctx.close();
}
{ // 3. the wheel (60 Hz): one notch wakes the demo, and the title's menu moves with it
  const hz = 60, { ctx, page } = await open({ viewport: { width: 1280, height: 720 } });
  await frames(page, .5, hz);
  const row = await newGameRow(page);
  await page.mouse.move(row.x, row.y); await frames(page, .1, hz);
  const sel0 = await page.evaluate(() => { const l = window.__gtm.ui.screens.top.list; return l.sel + ' (' + l.items[l.sel].label + ')'; });
  await toDemo(page, hz);
  await page.mouse.wheel(0, 120);
  await frames(page, 1 / hz, hz); const woke = await snap(page);
  await frames(page, 1, hz);
  const after = await snap(page), sel1 = await page.evaluate(() => { const t = window.__gtm.ui.screens.top, l = t && t.list; return l ? l.sel + ' (' + l.items[l.sel].label + (l.items[l.sel].disabled ? ', disabled' : '') + ')' : null; });
  report('60 Hz, a wheel notch that wakes the demo leaves the title menu where it was', after.scene === 'title' && !!sel1 && sel1.split(' ')[0] === sel0.split(' ')[0],
    `title menu row before the demo ${sel0}; next step leaving: ${woke.leaving}; after: scene ${after.scene}, row ${sel1}`);
  await ctx.close();
}
await browser.close();
console.log(fails.length ? `\nFAIL: ${fails.length} check(s): the input that woke the demo did something on the title` : '\nall held');
process.exit(fails.length ? 1 : 0);
