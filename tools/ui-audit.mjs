// The UI audit (PLAN.md 8.18): every screen walked in a real browser, by a synthetic pad first, and each checked against
// the 10-foot rules from what the UI layer drew that frame (window.__gtm.ui.record()):
//   - the focus is visible wherever a list or cards are shown;
//   - six items a page at most;
//   - no text under the UI layer's own scale (scale >= 1; the 3 x 5 font never reaches the UI layer);
//   - every glyph token resolves to a button of the device in use, and none is drawn as plain text ('{interact}');
//   - nothing (text, prompt, panel, card, focus) outside the 5% safe area.
// At 1920 x 1080 and 1280 x 720, a screenshot at each stop (--shots). Then the same walk by the keyboard alone, and a
// walk by the mouse alone (hover, click, the wheel, a right click to go back). Exit 0 when every stop passed.
// --hud 2: at a HUD size (1 Large, 2 Huge: 320 x 180 UI pixels at 720p and at 1080p's Huge, the tightest the layer gets).
//   node tools/ui-audit.mjs [--page dist/index.html] [--sizes 1920x1080,1280x720] [--passes pad,keys,mouse] [--hud 0]
//                           [--shots dir] [--report docs/ui-audit.md] [--verbose]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './build.mjs';
import { auditRecord } from '../src/motor/ui/record.js';

const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; }, has = k => args.includes('--' + k);
const PAGE = resolve(arg('page', join(ROOT, 'dist/index.html'))), SIZES = arg('sizes', '1920x1080,1280x720').split(',').map(s => s.split('x').map(Number));
const PASSES = arg('passes', 'pad,keys,mouse').split(','), SHOTS = arg('shots', null), REPORT = arg('report', null), VERBOSE = has('verbose'), HUD = +arg('hud', 0);
const EXE = process.env.PLAYWRIGHT_BROWSERS_PATH ? '/opt/pw-browsers/chromium' : undefined;

// the pad: a DualSense on the standard mapping, its buttons pressed for a few steps at a time
const PAD = { up: 12, down: 13, left: 14, right: 15, confirm: 0, back: 1, tertiary: 2, secondary: 3, tabPrev: 4, tabNext: 5, zoomOut: 6, zoomIn: 7, close: 9, phone: 12, wheel: 4, interact: 3, pause: 9 };
const KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', confirm: 'Enter', back: 'Escape', tertiary: 'KeyF', secondary: 'KeyR', tabPrev: 'KeyQ', tabNext: 'KeyE', zoomOut: 'Minus', zoomIn: 'Equal', close: 'Escape', phone: 'KeyT', wheel: 'KeyQ', interact: 'KeyE', pause: 'Escape' };
// a save in slot 1 and the autosave, so CONTINUE and LOAD have something to show
const SAVE = { schema: 1, game: 'GrandTheftMoto-5S', slot: '1', label: 'Lowtown', playtime: 3723, gameDay: 2, completion: 12.5, savedAt: 1700000000000 };

/** the rules, on one frame's record: a list of what broke (MOTOR's: the Proving Ground's UI gallery checks the same) */
export { auditRecord };

async function session(size, pass) {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(([save, pad]) => {
    try { localStorage.setItem('my3d2dge:GrandTheftMoto-5S:save:1', JSON.stringify(save)); localStorage.setItem('my3d2dge:GrandTheftMoto-5S:save:auto', JSON.stringify({ ...save, slot: 'auto', completion: 14, savedAt: save.savedAt + 1 })); } catch (e) { /* no storage */ }
    if (!pad) return;
    const btn = () => ({ pressed: false, touched: false, value: 0 });
    const P = { id: 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: 0, buttons: Array.from({ length: 18 }, btn), axes: [0, 0, 0, 0] };
    window.__auditPad = P; navigator.getGamepads = () => [P];
  }, [SAVE, pass === 'pad']);
  const stops = [];
  const S = {
    page, errors, stops, size, pass,
    /** a fresh load at a deep link (about:blank first: a new hash alone would not reload the page) */
    async open(hash = '', query = '') { await page.goto('about:blank'); await page.goto(pathToFileURL(PAGE).href + query + (hash ? '#' + hash : '')); await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 60000 }); if (HUD) await page.evaluate(n => window.__gtm.game.settings.set('hudSize', n), HUD); await page.waitForTimeout(900); if (pass === 'pad') await S.pad(PAD.right, 40); },
    async pad(b, ms = 70) { await page.evaluate(([i, on]) => { const q = window.__auditPad.buttons[i]; q.pressed = on; q.value = on ? 1 : 0; q.touched = on; }, [b, true]); await page.waitForTimeout(ms); await page.evaluate(i => { const q = window.__auditPad.buttons[i]; q.pressed = false; q.value = 0; q.touched = false; }, b); await page.waitForTimeout(90); },
    /** an action by the pass's device: pad buttons or keys */
    async act(a, n = 1) { for (let i = 0; i < n; i++) { if (pass === 'pad') await S.pad(PAD[a]); else { await page.keyboard.press(KEYS[a]); await page.waitForTimeout(110); } } },
    async hold(a, ms) { if (pass === 'pad') await S.pad(PAD[a], ms); else { await page.keyboard.down(KEYS[a]); await page.waitForTimeout(ms); await page.keyboard.up(KEYS[a]); await page.waitForTimeout(100); } },
    record: () => page.evaluate(() => window.__gtm.ui.record()),
    gtm: (fn, a) => page.evaluate(fn, a),
    /** a stop: the frame checked (and its screen as expected), a screenshot */
    async stop(name, screen) {
      await page.waitForTimeout(260);
      const R = await S.record(), bad = auditRecord(R);
      if (screen !== undefined && R.screen !== screen) bad.unshift(`the screen is ${R.screen}, not ${screen}`);
      stops.push({ name, screen: R.screen, ok: !bad.length, bad, texts: R.texts.length, lists: R.lists.map(l => `${l.id} ${l.shown} (${l.page + 1}/${l.pages})`) });
      if (VERBOSE || bad.length) console.log(`${bad.length ? 'FAIL' : 'ok  '} ${pass} ${size.join('x')} ${name}${bad.length ? ': ' + bad.join('; ') : ''}`);
      if (SHOTS) { const d = join(SHOTS, `${pass}-${size[0]}x${size[1]}`); mkdirSync(d, { recursive: true }); await page.screenshot({ path: join(d, name + '.png') }); }
      return R;
    },
    // the mouse: UI pixels to the page's, then hover or click
    async uiPoint(x, y) { return page.evaluate(([x, y]) => { const L = window.__gtm.ui.layer, r = document.getElementById('ui').getBoundingClientRect(); return [r.left + x * r.width / L.W, r.top + y * r.height / L.H]; }, [x, y]); },
    async clickBox(b, button = 'left') { const [x, y] = await S.uiPoint(b.x + b.w / 2, b.y + b.h / 2); await page.mouse.move(x - 3, y); await page.waitForTimeout(60); await page.mouse.move(x, y); await page.waitForTimeout(90); await page.mouse.down({ button }); await page.waitForTimeout(70); await page.mouse.up({ button }); await page.waitForTimeout(160); },
    async row(label) { const R = await S.record(); for (const l of R.lists) { const r = l.rows.find(q => q.label === label); if (r) return r; } for (const t of R.tabs) if (t.label === label) return t; throw new Error(`no row or tab "${label}" on ${R.screen}`); },
    async click(label) { await S.clickBox(await S.row(label)); },
    async rightClick() { const R = await S.record(), [x, y] = await S.uiPoint(R.W / 2, R.H / 2); await page.mouse.move(x, y); await page.mouse.down({ button: 'right' }); await page.waitForTimeout(70); await page.mouse.up({ button: 'right' }); await page.waitForTimeout(160); },
    async wheel(dy, at = null) { const R = await S.record(), [x, y] = await S.uiPoint(...(at || [R.W / 2, R.H / 2])); await page.mouse.move(x, y); await page.waitForTimeout(40); await page.mouse.wheel(0, dy); await page.waitForTimeout(160); },
    close: () => browser.close(),
  };
  return S;
}

// ---- the walks
/** the title and everything under it, by pad or keys */
async function walkTitle(S) {
  await S.open('');
  await S.stop('title', 'title');
  await S.act('down', 3); await S.act('confirm'); await S.stop('settings-controls', 'settings');
  await S.act('down', 6); await S.stop('settings-controls-2', 'settings');
  for (const t of ['display', 'audio', 'game', 'access']) { await S.act('tabNext'); await S.stop('settings-' + t, 'settings'); }
  await S.act('tabPrev', 3); await S.act('down', 6); await S.stop('settings-display-2', 'settings');
  await S.act('tabPrev'); await S.act('up', 6); await S.act('down', 6); await S.act('confirm'); await S.stop('layout-onfoot', 'layout');   // (the layout: below the control scheme (D49), the dead zone, invert, vibration, DualSense haptics and the button symbols)
  await S.act('tabNext'); await S.stop('layout-vehicle', 'layout'); await S.act('back');
  await S.act('down'); await S.act('confirm'); await S.stop('rebind-onfoot', 'rebind');
  await S.act('down', 6); await S.stop('rebind-onfoot-2', 'rebind'); await S.act('down', 6); await S.stop('rebind-onfoot-3', 'rebind');
  await S.act('confirm'); await S.stop('rebind-capture', 'rebind'); await S.act(S.pass === 'pad' ? 'close' : 'back');
  await S.act('secondary'); await S.stop('rebind-defaults', 'confirm'); await S.act('back');
  await S.act('back', 2); await S.stop('title-again', 'title');
  await S.act('up', 1); await S.act('confirm'); await S.stop('load', 'slots-load'); await S.act('back');
  await S.act('down', 2); await S.act('confirm'); await S.stop('extras', 'extras');
  await S.act('down'); await S.act('confirm'); await S.stop('credits', 'credits');
  const creditPages = await S.gtm(() => window.__gtm.ui.screens.top.paging()[1]);   // (every page: 5 at 1080p, 6 at 720p)
  for (let i = 2; i <= creditPages; i++) { await S.act('right'); await S.stop('credits-' + i, 'credits'); }
  await S.act('back'); await S.act('down'); await S.act('confirm'); await S.stop('help', 'help');
  await S.act('confirm'); await S.stop('help-page', 'guide-page'); await S.act('right'); await S.stop('help-page-2', 'guide-page');
  await S.act('back', 3); await S.stop('title-last', 'title');
}
/** play: the HUD, the pause's tabs, QUIT's question, the phone and its apps, a shop, a job's card, the results, the
 *  weapon wheel, WRECKED */
async function walkPlay(S) {
  await S.open('play');
  await S.stop('hud-roam', null);
  await S.act('pause'); await S.stop('pause-map', 'pause');
  await S.act('secondary'); await S.stop('pause-map-legend', 'pause'); await S.act('secondary');
  await S.act('zoomIn'); await S.act('confirm'); await S.stop('pause-map-waypoint', 'pause');
  await S.act('tabNext'); await S.stop('pause-brief', 'pause');
  await S.act('down', 1); await S.act('confirm'); await S.stop('quit-confirm', 'confirm'); await S.act('back');
  await S.act('tabNext'); await S.stop('pause-stats', 'pause'); await S.act('down', 2); await S.stop('pause-stats-2', 'pause');
  await S.act('tabNext'); await S.stop('pause-settings', 'pause'); await S.act('confirm'); await S.stop('pause-settings-controls', 'settings'); await S.act('back');
  await S.act('tabNext'); await S.stop('pause-help', 'pause');
  await S.act('back'); await S.stop('resumed', null);
  // the phone (d-pad up / T) and its apps
  await S.act('phone'); await S.stop('phone', 'phone');
  await S.act('confirm'); await S.stop('phone-contacts', 'contacts'); await S.act('confirm'); await S.stop('phone-cabs', 'cabs'); await S.act('back');
  await S.act('back'); await S.act('down'); await S.act('confirm'); await S.stop('phone-texts', 'texts'); await S.act('back');
  await S.act('down'); await S.act('confirm'); await S.stop('phone-jobs', 'jobs'); await S.act('back'); await S.act('back');
  // a shop at its door
  await S.gtm(() => { const g = window.__gtm, q = g.city.poi('greasy-spoke'); g.crew.ped.place(q.x, q.y); g.crew.fund = 400; });
  await S.page.waitForTimeout(400); await S.act('interact'); await S.stop('shop', 'shop'); await S.act('back');
  // a job's card at its giver (the prologue's, at the safehouse), then the results by the runtime's own hand
  await S.gtm(() => { const g = window.__gtm, C = g.career, m = C.available()[0]; if (m) { const at = C.giverOf(m); g.crew.ped.place(at[0], at[1]); } else C._jobCard(g.motor.all('missions')[0]); });   // (walked into a giver's ring; or, none on offer, the first mission's card)
  await S.page.waitForTimeout(500); await S.stop('job-card', 'job');
  await S.act('confirm'); await S.page.waitForTimeout(1500); await S.stop('hud-mission', null);
  await S.gtm(() => window.__gtm.career.R.fail('time')); await S.page.waitForTimeout(500); await S.stop('job-blown', 'blown');
  await S.act('confirm'); await S.page.waitForTimeout(800); await S.gtm(() => window.__gtm.career.R.pass()); await S.page.waitForTimeout(600); await S.stop('job-done', 'done'); await S.act('confirm');
  // the safehouse's save: the three slots (after the job: the prologue's giver stands at the safehouse's door, and a
  // new game's first card there is its JOB card)
  await S.gtm(() => { const g = window.__gtm, q = g.city.poi('safehouse'); g.crew.ped.place(q.x, q.y); });
  await S.page.waitForTimeout(400); await S.act('interact'); await S.stop('save', 'slots-save'); await S.act('back');
  // the weapon wheel, held open
  if (S.pass === 'pad') { await S.page.evaluate(() => { const q = window.__auditPad.buttons[4]; q.pressed = true; q.value = 1; }); await S.page.waitForTimeout(500); await S.stop('weapon-wheel', null); await S.page.evaluate(() => { const q = window.__auditPad.buttons[4]; q.pressed = false; q.value = 0; }); }
  else { await S.page.keyboard.down('KeyQ'); await S.page.waitForTimeout(500); await S.stop('weapon-wheel', null); await S.page.keyboard.up('KeyQ'); }
  await S.page.waitForTimeout(300);
  // WRECKED
  await S.gtm(() => { const p = window.__gtm.crew.ped; p.vitals.armor = 0; p.vitals.hit({ amount: 500, kind: 'audit' }); });
  await S.page.waitForTimeout(1500); await S.stop('wrecked', null);
  const down = await S.gtm(() => window.__gtm.game.debug.snapshot().down); if (down !== 'wrecked') S.stops.push({ name: 'wrecked (the card)', ok: false, bad: ['no WRECKED card: ' + down] });
}
/** the mouse alone: hover, click, the wheel, a right click back */
async function walkMouse(S) {
  await S.open('');
  await S.stop('m-title', 'title');
  await S.click('SETTINGS'); await S.stop('m-settings', 'settings');
  await S.click('DISPLAY'); await S.stop('m-settings-display', 'settings');
  await S.wheel(100); await S.wheel(100); await S.wheel(100); await S.wheel(100); await S.wheel(100); await S.wheel(100); await S.stop('m-settings-display-2', 'settings');
  await S.click('AUDIO'); await S.click('MUSIC'); await S.stop('m-settings-audio', 'settings');
  await S.rightClick(); await S.stop('m-title-2', 'title');
  await S.click('EXTRAS'); await S.click('CREDITS & ABOUT'); await S.stop('m-credits', 'credits');
  const R = await S.record(); await S.clickBox({ x: R.W / 2, y: R.H / 2, w: 2, h: 2 }); await S.stop('m-credits-2', 'credits');
  await S.rightClick(); await S.click('HOW TO PLAY'); await S.click('THE BASICS'); await S.stop('m-help-page', 'guide-page');
  await S.rightClick(); await S.rightClick(); await S.rightClick(); await S.stop('m-title-3', 'title');
  await S.click('LOAD'); await S.stop('m-load', 'slots-load'); await S.rightClick();
  await S.open('play');
  await S.page.keyboard.press('Escape'); await S.page.waitForTimeout(200);   // (the pause opens by a key: there is no mouse button for it in play)
  await S.stop('m-pause-map', 'pause');
  await S.wheel(-100); await S.stop('m-pause-map-zoom', 'pause');
  await S.click('STATS'); await S.stop('m-pause-stats', 'pause');
  await S.click('BRIEF'); await S.click('QUIT TO TITLE'); await S.stop('m-quit', 'confirm'); await S.click('NO');
  await S.click('SETTINGS'); await S.click('DISPLAY'); await S.stop('m-pause-settings-display', 'settings');
  await S.rightClick(); await S.rightClick(); await S.stop('m-resumed', null);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
async function main() {
  const results = [];
  for (const size of SIZES) for (const pass of PASSES) {
    const S = await session(size, pass);
    try {
      if (pass === 'mouse') await walkMouse(S); else { await walkTitle(S); await walkPlay(S); }
    } catch (e) { S.stops.push({ name: 'walk', ok: false, bad: [String(e.message || e)] }); console.log(`FAIL ${pass} ${size.join('x')} the walk stopped: ${e.message}`); }
    if (S.errors.length) S.stops.push({ name: 'page errors', ok: false, bad: S.errors.slice(0, 5) });
    results.push({ size: size.join('x'), pass, stops: S.stops });
    const n = S.stops.length, ok = S.stops.filter(s => s.ok).length;
    console.log(`== ${pass} ${size.join('x')}: ${ok}/${n} stops pass`);
    await S.close();
  }
  const all = results.flatMap(r => r.stops), failed = all.filter(s => !s.ok);
  if (REPORT) {
    const lines = ['# UI audit', '', `\`node tools/ui-audit.mjs\` (PLAN.md 8.18): ${all.length} stops, ${all.length - failed.length} pass.`, '', '| Pass | Size | Stops | Pass | Failures |', '|---|---|---|---|---|'];
    for (const r of results) lines.push(`| ${r.pass} | ${r.size} | ${r.stops.length} | ${r.stops.filter(s => s.ok).length} | ${r.stops.filter(s => !s.ok).map(s => `${s.name}: ${s.bad.join('; ')}`).join('<br>') || '—'} |`);
    lines.push('', '## Stops', '', '| Stop | Screen | Lists |', '|---|---|---|');
    for (const s of (results[0] || { stops: [] }).stops) lines.push(`| ${s.name} | ${s.screen ?? '(the HUD)'} | ${(s.lists || []).join(', ') || '—'} |`);
    writeFileSync(REPORT, lines.join('\n') + '\n');
  }
  console.log(`ui-audit: ${all.length - failed.length}/${all.length} stops pass`);
  process.exit(failed.length ? 1 : 0);
}
