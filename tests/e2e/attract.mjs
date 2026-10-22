// The attract mode in Chromium (PLAN.md 8.20): the built page from file://. On a desktop, the demo plays its reels drawn
// (no page errors), and each kind of input leaves it within one step: a key, an unbound key, a mouse move, a click,
// the wheel, a pad's button, a stick, a trigger (a stand-in pad behind navigator.getGamepads). On a phone (390 x 844 at
// 3x, touch, no keyboard or pad: the kiosk): no touch controls, the demo runs, the menu button opens its overlay, taps
// never leave the demo, and a controller connecting opens the title.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const url = pathToFileURL(resolve('dist/index.html')).href, fails = [];
const ok = (what, cond, detail = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + what + (cond ? '' : ': ' + detail)); if (!cond) fails.push(what); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
// a stand-in pad: window.__pads (a DualSense at 0 from the start when the page is opened with one), read by the engine
// through navigator.getGamepads; window.__plug(i) connects one
function PADS(withPad) {
  const mk = i => ({ index: i, id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', connected: true, mapping: 'standard', timestamp: 0,
    buttons: Array.from({ length: 18 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] });
  window.__pads = withPad ? [mk(0)] : [];
  window.__plug = i => { window.__pads[i] = mk(i); return window.__pads[i]; };
  navigator.getGamepads = () => window.__pads;
}
async function open(ctxOpts, hash = '#attract', withPad = false) {
  const ctx = await browser.newContext(ctxOpts), page = await ctx.newPage();
  await page.addInitScript(PADS, withPad);
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url + hash); await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 20000 });
  return { ctx, page };
}
const snap = p => p.evaluate(() => window.__gtm.game.debug.snapshot());
const step = (p, secs = 1 / 120) => p.evaluate(s => window.__gtm.game.advance(s), secs);
const DESK = { viewport: { width: 1280, height: 720 } };

{   // the reels, drawn: a minute of the show, frame by frame
  const { ctx, page } = await open(DESK);
  await page.evaluate(() => window.__gtm.game.stop());
  for (let i = 0; i < 60; i++) await page.evaluate(() => { for (let k = 0; k < 30; k++) window.__gtm.game.advance(1 / 30, { draw: true }); });
  const s = await snap(page), D = await page.evaluate(() => ({ reels: Object.keys(window.__gtm.director.stats.reels).length }));
  ok('the demo plays its reels, drawn (a minute)', s.scene === 'attract' && !s.leaving && D.reels >= 2, JSON.stringify({ s, D }));
  await ctx.close();
}
{   // the bank's ISO from another view, drawn: the flat walls stand in while its walls bake (an interior's wall cells
  // are lots with no record of their own: this threw before M11's soak found it)
  const { ctx, page } = await open(DESK, '#interior/bank'), before = errors.length;
  await page.evaluate(() => window.__gtm.game.stop());
  for (const v of ['top', 'iso', 'side7', 'iso']) await page.evaluate(v => { const g = window.__gtm.game; g.setView(v); for (let i = 0; i < 20; i++) g.advance(1 / 30, { draw: true }); }, v);
  ok('the bank into ISO from TOP and MODE 7, drawn', errors.length === before, errors.slice(before).join(' | '));
  await ctx.close();
}
const inputs = [
  ['a key', async p => { await p.keyboard.down('Enter'); }],
  ['an unbound key', async p => { await p.keyboard.down('KeyP'); }],
  ['a mouse move', async p => { await p.mouse.move(400, 300); await p.mouse.move(430, 320); }],
  ['a click', async p => { await p.mouse.click(640, 360); }],
  ['the wheel', async p => { await p.mouse.wheel(0, 120); }],
  ['a pad button', async p => { await p.evaluate(() => { const q = window.__pads[0]; q.buttons[0].pressed = true; q.buttons[0].value = 1; }); }, true],
  ['a stick', async p => { await p.evaluate(() => { window.__pads[0].axes[0] = .8; }); }, true],
  ['a trigger', async p => { await p.evaluate(() => { window.__pads[0].buttons[7].value = .6; }); }, true],
];
for (const [what, act, withPad] of inputs) {   // (each in a fresh demo, its loop stopped: the step after the input is the one that leaves)
  const { ctx, page } = await open(DESK, '#attract', !!withPad);
  await page.evaluate(() => window.__gtm.game.stop()); await step(page, 1);
  const before = await snap(page);
  await act(page); await step(page);
  const s = await snap(page);
  ok(`${what} leaves the demo within one step`, before.scene === 'attract' && !before.leaving && !!s.leaving, JSON.stringify({ before: before.leaving, after: s.leaving }));
  await step(page, .6); ok(`${what}: the title`, (await snap(page)).scene === 'title', JSON.stringify(await snap(page)));
  await ctx.close();
}

{   // the phone: the kiosk, touch only
  const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, '');
  await page.waitForTimeout(1000);
  let s = await snap(page);
  ok('a phone boots straight into the demo (the kiosk)', s.scene === 'attract' && s.kiosk === true, JSON.stringify(s));
  const touchUI = await page.evaluate(() => { const I = window.__gtm.game.input; return { buttons: document.querySelectorAll('[data-act]').length, stick: !!(I._stickEl || I._knobEl || I._touchEl), enabled: I.touchEnabled }; });
  ok('no touch controls', touchUI.buttons === 0 && !touchUI.stick && touchUI.enabled === false, JSON.stringify(touchUI));
  const at = (x, y) => page.evaluate(([x, y]) => { const L = window.__gtm.ui.layer, r = document.getElementById('ui').getBoundingClientRect(); return [r.left + x * r.width / L.W, r.top + y * r.height / L.H]; }, [x, y]);
  const [cx, cy] = await at(60, 140);
  await page.touchscreen.tap(cx, cy); await page.waitForTimeout(300);
  s = await snap(page); ok('a tap: BEST WITH A CONTROLLER, still the demo', s.scene === 'attract' && !s.leaving && s.note === 'BEST WITH A CONTROLLER', JSON.stringify(s));
  const b = await page.evaluate(() => window.__gtm.kioskButton()), [bx, by] = await at(b[0] + b[2] / 2, b[1] + b[3] / 2);
  await page.touchscreen.tap(bx, by); await page.waitForTimeout(300);
  s = await snap(page); ok('the menu button opens its overlay', s.scene === 'attract' && s.menu === 'kiosk', JSON.stringify(s));
  await page.evaluate(() => window.__gtm.ui.screens.closeAll());
  for (let i = 0; i < 6; i++) { await page.touchscreen.tap(cx + i * 25, cy + i * 40); await page.waitForTimeout(150); }
  s = await snap(page); ok('taps never leave the demo', s.scene === 'attract' && !s.leaving, JSON.stringify(s));
  await page.evaluate(() => { window.__plug(0); }); await page.waitForTimeout(600);
  s = await snap(page); ok('a controller connecting opens the title', s.scene === 'title', JSON.stringify(s));
  await ctx.close();
}
ok('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
await browser.close();
process.exit(fails.length ? 1 : 0);
