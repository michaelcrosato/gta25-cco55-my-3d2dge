// MOTOR's 10-foot kit (PLAN.md 8.18): lists that page by six, tabs, cards, the screen stack and its rules (back, Options,
// sticky screens, a pause), the settings' rows, the HUD's layout inside the safe area, and the audit's rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../harness.mjs';

engineGlobal();
const { List, Tabs, Cards, PAGE } = await import('../../src/motor/ui/tenfoot.js');
const { Screens } = await import('../../src/motor/ui/screens.js');
const { settingRows } = await import('../../src/motor/ui/settings.js');
const { hudLayout, footWidth, mph } = await import('../../src/motor/ui/hud.js');
const { confirmScreen } = await import('../../src/motor/ui/menus.js');
const { auditRecord } = await import('../../tools/ui-audit.mjs');

const NAV = ['up', 'down', 'left', 'right', 'confirm', 'back', 'tabPrev', 'tabNext', 'secondary', 'tertiary', 'close'];
const nav = (...on) => Object.fromEntries(NAV.map(k => [k, on.includes(k)]));
const still = { x: null, y: null, moved: false, click: false, wheel: 0 };

test('a list pages by six at most, wraps round, and says what each input did', () => {
  const acts = [], items = Array.from({ length: 13 }, (_, i) => ({ label: 'ROW ' + i, act: () => acts.push(i) }));
  const L = new List({ items, per: 9 });
  assert.equal(L.per, PAGE, 'never more than six a page'); assert.equal(L.pages, 3);
  assert.equal(L.input(nav('up'), still), 'move'); assert.equal(L.sel, 12, 'up from the top wraps to the last'); assert.equal(L.page, 2);
  assert.equal(L.input(nav('down'), still), 'move'); assert.equal(L.sel, 0);
  for (let i = 0; i < 7; i++) L.input(nav('down'), still);
  assert.equal(L.page, 1); assert.equal(L.input(nav('confirm'), still), 'confirm'); assert.deepEqual(acts, [7]);
  L.items[7].disabled = true; assert.equal(L.input(nav('confirm'), still), 'error', 'a disabled row refuses with its sound');
});

test('a list\'s toggle, slider and choice move with left and right; the mouse focuses only when it moves', () => {
  let on = false, vol = .5, view = 'iso';
  const L = new List({ items: [{ kind: 'toggle', label: 'T', get: () => on, set: v => { on = v; } }, { kind: 'slider', label: 'S', get: () => vol, set: v => { vol = v; }, step: .1 }, { kind: 'choice', label: 'C', get: () => view, set: v => { view = v; }, options: [['iso', 'ISO'], ['top', 'TOP'], ['side7', 'MODE 7']] }] });
  L.input(nav('right'), still); assert.equal(on, true);
  L.input(nav('down'), still); L.input(nav('left'), still); assert.equal(vol, .4);
  for (let i = 0; i < 9; i++) L.input(nav('left'), still); assert.equal(vol, 0); assert.equal(L.input(nav('left'), still), 'error', 'the end of a slider says so');
  L.input(nav('down'), still); L.input(nav('right'), still); assert.equal(view, 'top'); L.input(nav('left'), still); L.input(nav('left'), still); assert.equal(view, 'side7', 'a choice wraps round');
  L.rows = [{ i: 0, x: 0, y: 0, w: 100, h: 18 }, { i: 1, x: 0, y: 18, w: 100, h: 18 }, { i: 2, x: 0, y: 36, w: 100, h: 18 }];
  L.input(nav(), { x: 10, y: 20, moved: false, click: false, wheel: 0 }); assert.equal(L.sel, 2, 'a still pointer leaves the pad\'s choice');
  L.input(nav(), { x: 10, y: 20, moved: true, click: false, wheel: 0 }); assert.equal(L.sel, 1, 'a moving one takes it');
  assert.equal(L.input(nav(), { x: 10, y: 3, moved: false, click: true, wheel: 0 }), 'confirm'); assert.equal(on, false, 'a click on a row confirms it (the toggle flips)');
});

test('tabs change on L1/R1 alone and wrap; cards move in a grid and page by six', () => {
  const T = new Tabs({ tabs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }] });
  assert.equal(T.input(nav('tabPrev'), still), 'move'); assert.equal(T.current.id, 'c');
  assert.equal(T.input(nav('down', 'left', 'confirm'), still), null, 'only the bumpers (and a click on a label) change tabs');
  const C = new Cards({ cards: Array.from({ length: 10 }, (_, i) => ({ title: 'C' + i, value: i })), cols: 3 });
  assert.equal(C.pages, 2); C.input(nav('down'), still); assert.equal(C.sel, 3); C.input(nav('down'), still); C.input(nav('right'), still); assert.equal(C.page, 1);
});

/** a Screens over stand-in bindings: tap(k) reads the keys pressed this step */
function stack() {
  const taps = new Set(), app = { bindings: { setContext() {}, tap: k => taps.has(k) }, game: { input: { consumeAll() {} }, headless: true } };
  const S = new Screens({ app, layer: { poll: () => still } }), step = (...keys) => { taps.clear(); for (const k of keys) taps.add(k); return S.update(1 / 60); };
  return { S, step };
}
test('the screen stack: ○ goes back one, Options closes down to a sticky screen, a pause holds, a screen\'s own input first', () => {
  const { S, step } = stack(), title = { id: 'title', sticky: true, list: new List({ items: [{ label: 'X' }] }) };
  S.open(title); S.open({ id: 'settings', list: new List({ items: [{ label: 'A' }] }) }); S.open({ id: 'layout' });
  assert.equal(step('back'), 'back'); assert.equal(S.top.id, 'settings');
  S.open({ id: 'more' }); assert.equal(step('close'), 'back'); assert.equal(S.top, title, 'Options: everything closed down to the title\'s menu');
  step('close'); assert.equal(S.top, title, 'which stays');
  S.open({ id: 'pause', pause: true }); S.open({ id: 'map' }); assert.ok(S.pausing, 'a pause under the map still holds the game');
  step('back'); step('back'); assert.ok(!S.pausing);
  let saw = 0; S.open({ id: 'capture', update: () => { saw++; return true; } });
  assert.equal(step('back'), null); assert.equal(S.top.id, 'capture', 'a screen that takes the step keeps ○ from going back'); assert.equal(saw, 1);
  S.back(); S.open({ id: 'choice', back: () => true }); step('back'); assert.equal(S.top.id, 'choice', 'back() true: handled (a choice can\'t be backed out of)');
});

test('a question puts NO first and answers by its own hand', () => {
  const { S, step } = stack(); let yes = 0;
  S.open({ id: 'pause', pause: true }); S.open(confirmScreen(S, { title: 'QUIT?', onYes: () => { yes++; } }));
  assert.equal(S.top.list.items[0].label, 'NO'); assert.ok(S.top.over, 'a dialog: drawn over the screen it asks about');
  step('confirm'); assert.equal(yes, 0); assert.equal(S.top.id, 'pause', 'NO: back to the pause');
  S.open(confirmScreen(S, { title: 'QUIT?', onYes: () => { yes++; } })); step('down'); step('confirm'); assert.equal(yes, 1);
});

test('the settings\' rows come from the store\'s specs: a toggle, a slider in its range, a choice', () => {
  const specs = { subtitles: { type: 'toggle' }, volume: { type: 'slider', min: 0, max: 1 }, deadzone: { type: 'slider', min: .05, max: .5, step: .01 }, hudSize: { type: 'select', options: [[0, 'Standard'], [1, 'Large'], [2, 'Huge']] } };
  const S = { spec: k => specs[k], subtitles: true, volume: .7, deadzone: .18, hudSize: 0, set(k, v) { this[k] = v; return v; } };
  const rows = settingRows({ settings: S }, ['subtitles', 'volume', 'deadzone', 'hudSize', 'nothing']);
  assert.deepEqual(rows.map(r => r.kind), ['toggle', 'slider', 'slider', 'choice'], 'what the store lacks is left out');
  assert.equal(rows[1].label, 'MASTER VOLUME'); assert.equal(rows[1].format(.7), '70%'); assert.equal(rows[2].step, .01);
  const L = new List({ items: rows }); L.sel = 3; L.input(nav('right'), still); assert.equal(S.hudSize, 1);
});

test('the HUD sits inside the 5% safe area at every size, its radar smaller on a smaller screen', () => {
  for (const [W, H] of [[480, 270], [426, 240], [384, 216], [320, 180]]) {
    const mx = Math.round(W * .05), my = Math.round(H * .05), P = { W, H, safe: [mx, my, W - mx, H - my] }, L = hudLayout(P);
    assert.ok(L.radar[0] - L.R >= mx && L.radar[1] - L.R >= my && L.radar[1] + L.R <= L.bars[1], `the radar inside at ${W}x${H}`);
    assert.ok(L.bars[1] + 34 <= H - my && L.weapon[0] <= W - mx && L.stars[1] < L.timer[1], `the corners inside at ${W}x${H}`);
    assert.ok(footWidth(P) >= 160);
  }
  assert.ok(hudLayout({ W: 320, H: 180, safe: [16, 9, 304, 171] }).R < hudLayout({ W: 480, H: 270, safe: [24, 14, 456, 256] }).R);
  assert.equal(mph(300), 84, 'the speedometer: a car flat out (8 u a metre)');
});

test('the audit\'s rules: focus, six a page, scale, glyphs, the safe area', () => {
  const ok = { safe: [24, 14, 456, 256], lists: [{ id: 'l', shown: 6, live: true }], focus: [{ x: 100, y: 100, w: 200, h: 18 }], texts: [{ s: 'A', x: 30, y: 20, w: 6, h: 7, scale: 1 }], prompts: [{ s: '{menu:confirm} OK', x: 200, y: 240, w: 40, h: 11, unresolved: 0 }], rects: [{ kind: 'screen', x: 40, y: 20, w: 400, h: 230 }] };
  assert.deepEqual(auditRecord(ok), []);
  const bad = { ...ok, lists: [{ id: 'l', shown: 7, live: true }], focus: [], texts: [{ s: 'tiny', x: 30, y: 20, w: 6, h: 5, scale: .5 }, { s: 'edge', x: 2, y: 20, w: 6, h: 7, scale: 1 }], prompts: [{ s: '{nope}', x: 200, y: 240, w: 10, h: 11, unresolved: 1 }] };
  const r = auditRecord(bad).join('\n');
  for (const want of ['no focus', '7 items', 'scale 0.5', 'unresolved', '"edge" outside the safe area']) assert.ok(r.includes(want), want + ' caught:\n' + r);
  assert.deepEqual(auditRecord({ ...ok, lists: [{ id: 'under', shown: 3, live: false }], focus: [] }), [], 'a list under the screen in front needs no focus');
});

test('the Graphics setting: Full is the look as made, Fast the lighter knobs, and back (drawing only)', async () => {
  const { defineSettings, QUALITY } = await import('../../src/motor/ui/settings.js'), { TUNE } = await import('../../src/motor/core/tune.js');
  await import('../../src/motor/render/stage.js'); await import('../../src/motor/render/weather-fx.js');   // (the knobs' homes)
  const specs = {}, S = { spec: k => specs[k], define: sp => { specs[sp.key] = sp; } };
  defineSettings({ settings: S });
  const q = specs.quality; assert.equal(q.value, 'full', 'Full by default');
  assert.deepEqual(q.options.map(o => o[0]), ['full', 'fast']);
  for (const [k, full] of QUALITY) assert.equal(TUNE[k], full, `${k}: Full is the knob's own default`);
  q.apply({}, 'fast'); for (const [k, , fast] of QUALITY) assert.equal(TUNE[k], fast, `${k} on Fast`);
  q.apply({}, 'full'); for (const [k, full] of QUALITY) assert.equal(TUNE[k], full, `${k} back on Full`);
});
