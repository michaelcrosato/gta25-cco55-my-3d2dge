// MOTOR's standard screens (PLAN.md 8.18), made of the 10-foot kit for any game on MOTOR, each a screen object for the
// app's screen stack (app.ui.screens):
//   - confirmScreen(S, o): a question, NO first (the safe answer under the thumb);
//   - settingsScreen(app, o): the settings in five tabs (ui/settings.js), a page of rows each, CONTROLS with the button
//     layout and each context's bindings, and DEFAULTS on every tab (asked first);
//   - rebindScreen(app, ctx): a context's actions six a page, a group a page: ✕ binds the next button pressed on the
//     device in use (Options or Esc cancels; one another action holds is refused, said and sounded), △ puts the context
//     back as it came (asked first);
//   - layoutScreen(app): the controls in the player's glyphs, a tab a context;
//   - slotsScreen(app, o): the save slots as big cards (load; or save, over a used slot asked first);
//   - guideScreen(app, o): a field guide, a page a topic (✕ opens one, left and right turn the pages).
import { UI, List, Tabs, Cards } from './tenfoot.js';
import { drawScreen } from './screens.js';
import { SETTING_TABS, settingRows, resetSettings } from './settings.js';
import { deviceOf } from '../input/prompts.js';

/** each action as a person reads it */
export const ACTION_LABELS = { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', sprint: 'SPRINT', jump: 'JUMP / CLIMB', roll: 'ROLL', interact: 'GET IN / USE', reload: 'RELOAD',
  wheel: 'WEAPON WHEEL', aim: 'AIM', attack: 'ATTACK', crouch: 'CROUCH', weaponPrev: 'WEAPON BACK', weaponNext: 'WEAPON ON', view: 'CHANGE VIEW', turnLeft: 'TURN LEFT',
  turnRight: 'TURN RIGHT', ability: 'ABILITY', phone: 'PHONE', switch: 'SWITCH CHARACTER', map: 'MAP', pause: 'PAUSE', photo: 'PHOTO MODE', throttle: 'ACCELERATE',
  brake: 'BRAKE / REVERSE', handbrake: 'HANDBRAKE', nitro: 'NITRO', fire: 'DRIVE-BY', horn: 'HORN', radioPrev: 'RADIO BACK', radioNext: 'RADIO ON', confirm: 'CONFIRM',
  back: 'BACK', tabPrev: 'TAB LEFT', tabNext: 'TAB RIGHT', secondary: 'MORE', tertiary: 'FILTER', close: 'CLOSE ALL', zoomIn: 'ZOOM IN', zoomOut: 'ZOOM OUT', snap: 'TAKE THE SHOT' };
export const actionLabel = a => ACTION_LABELS[a] || String(a).replace(/([A-Z])/g, ' $1').toUpperCase();
/** the contexts the player rebinds, each in pages of a group (six at most): [context, its name, [[group, actions]]] */
export const REBIND = [
  ['onFoot', 'ON FOOT', [['MOVING', ['up', 'down', 'left', 'right', 'sprint', 'jump']], ['DOING', ['roll', 'crouch', 'interact', 'ability', 'switch', 'phone']],
    ['FIGHTING', ['aim', 'attack', 'reload', 'wheel', 'weaponPrev', 'weaponNext']], ['CAMERA AND MENUS', ['view', 'turnLeft', 'turnRight', 'map', 'photo', 'pause']]]],
  ['vehicle', 'IN A VEHICLE', [['DRIVING', ['left', 'right', 'throttle', 'brake', 'handbrake', 'nitro']], ['DOING', ['fire', 'horn', 'interact', 'radioPrev', 'radioNext', 'ability']],
    ['CAMERA AND MENUS', ['view', 'turnLeft', 'turnRight', 'phone', 'switch', 'map']], ['MORE', ['photo', 'pause']]]],
  ['photo', 'PHOTO MODE', [['FRAMING', ['up', 'down', 'left', 'right', 'zoomIn', 'zoomOut']], ['THE SHOT', ['view', 'snap', 'back']]]],
];
const LOCKED = /^(Escape|Enter|F\d+|Pad9|Pad16|Meta|Control|Alt)/;   // (the bindings' own rule: the menus and the browser keep them)
const PADLIKE = /^(Pad|LS|RS)/, KEYS = /^(Key[A-Z]|Digit\d|Numpad\d|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Tab|Backspace|Backquote|Minus|Equal|Bracket(Left|Right)|Backslash|Semicolon|Quote|Comma|Period|Slash|CapsLock|Mouse[0-4])$/;

/** a question: o { title, lines, yes, no, onYes, onNo, color, id } */
export function confirmScreen(S, o) {
  const items = [{ label: o.no || 'NO', act: () => { S.back(); if (o.onNo) o.onNo(); } }, { label: o.yes || 'YES', act: () => { S.back(); o.onYes(); } }];
  return { id: o.id || 'confirm', title: o.title, color: o.color || UI.accent, info: o.lines || [], w: o.w || 280, over: true, list: new List({ id: 'confirm', items, color: o.color }) };
}

/** the settings in five tabs; o: { tab (index), full (drawn over nothing: the title's) } */
export function settingsScreen(app, o = {}) {
  const S = app.ui.screens, game = app.game, tabs = new Tabs({ tabs: SETTING_TABS.map(t => ({ id: t.id, label: t.label })), i: o.tab || 0 });
  const extra = { controls: [{ label: 'BUTTON LAYOUT', help: 'Every button, in your controller\'s symbols', act: () => S.open(layoutScreen(app)) },
    ...REBIND.map(([ctx, name]) => ({ label: 'REBIND ' + name, help: `Change the buttons ${name.toLowerCase()}, one at a time`, act: () => S.open(rebindScreen(app, ctx)) }))] };
  const lists = SETTING_TABS.map(t => new List({ id: 'settings-' + t.id, items: [...settingRows(game, t.keys), ...(extra[t.id] || []),
    { label: 'DEFAULTS', help: `Every ${t.label.toLowerCase()} setting as it came`, act: () => S.open(confirmScreen(S, { title: 'BACK TO DEFAULTS?', lines: [`Every ${t.label.toLowerCase()} setting as it came`], yes: 'DEFAULTS', onYes: () => resetSettings(game, t.keys) })) }] }));
  return { id: 'settings', title: 'SETTINGS', w: 380, tabs, tips: true, full: !!o.full, get list() { return lists[tabs.i]; } };
}

/** a context's bindings, a group a page; ✕ binds the next button pressed on the device in use */
export function rebindScreen(app, ctx) {
  const S = app.ui.screens, B = app.bindings, I = app.game.input, spec = REBIND.find(r => r[0] === ctx) || [ctx, ctx.toUpperCase(), [['', Object.keys(B.map[ctx] || {})]]];
  let capture = null, said = null;
  const pad = () => deviceOf(I).device === 'gamepad';
  const rows = () => spec[2].flatMap(([, acts]) => acts.filter(a => B.map[ctx] && B.map[ctx][a]).map(action => {
    const list = B.codes(action, ctx), dev = pad(), i = list.findIndex(c => PADLIKE.test(c) === dev), code = i >= 0 ? list[i] : null;
    const fixed = !code || /[+>^]/.test(code) || LOCKED.test(code);
    return { label: actionLabel(action), action, prompt: code ? `{${ctx}:${action}}` : undefined, right: code ? undefined : 'STICK', sub: fixed && code ? 'FIXED' : '', disabled: fixed,
      help: fixed ? 'Kept as it is: the menus, a chord or a stick need it' : 'Press, then the button you want', act: () => { capture = { action, slot: i, dev, t: 0, steps: 0 }; said = null; } };
  }));
  const list = new List({ id: 'rebind-' + ctx, items: rows() });
  const scr = {
    id: 'rebind', w: 340, tips: true, list, title: 'REBIND ' + spec[1],
    get info() { const g = spec[2][list.page]; return g && g[0] ? [{ text: g[0], color: UI.cyan }] : []; },
    legend: '{menu:confirm} CHANGE   {menu:secondary} DEFAULTS   {menu:back} BACK',
    enter() { list.set(rows()); },
    update(nav, mouse, dt) {
      if (said) { said.t -= dt; if (said.t <= 0) said = null; }
      if (!capture) {
        if (scr._dev !== pad()) { scr._dev = pad(); list.set(rows()); }   // (the device changed: its buttons)
        if (nav.secondary) { S.open(confirmScreen(S, { title: 'BACK TO DEFAULTS?', lines: [`Every button ${spec[1].toLowerCase()} as it came`], yes: 'DEFAULTS', onYes: () => { B.reset(ctx); B.save(); list.set(rows()); } })); return 'confirm'; }
        return null;
      }
      capture.t += dt;
      // (the engine's raw presses come a step after the bindings see them: the first step's are the press that began it)
      const R = I.raw, fresh = capture.steps++ && R && R.pressed ? [...R.pressed] : [];
      for (const c of fresh) {
        if (c === 'Escape' || c === 'Pad9') { capture = null; return 'back'; }
        if (capture.dev ? !/^Pad\d+$/.test(c) : !KEYS.test(c)) continue;
        const r = B.rebind(ctx, capture.action, c, capture.slot < 0 ? null : capture.slot), what = actionLabel(capture.action);
        capture = null;
        if (r.ok) { B.save(); list.set(rows()); said = { text: what + ' CHANGED', color: UI.green, t: 1.5 }; return 'confirm'; }
        said = { text: r.reason === 'conflict' ? `THAT ONE IS ${actionLabel(r.with)}` : 'THAT ONE STAYS AS IT IS', color: UI.red, t: 2.2 }; return 'error';
      }
      if (capture.t > 8) { capture = null; return 'back'; }
      return true;   // (waiting for the button: nothing else moves)
    },
    draw(P) {
      drawScreen(P, scr, !capture);
      if (said) P.text(said.text, P.W / 2, P.safe[1] + 4, said.color, { align: 'center' });
      if (capture) {
        const w = 240, h = 52, x = Math.round(P.W / 2 - w / 2), y = Math.round(P.H / 2 - h / 2);
        P.shade(.5); P.panel(x, y, w, h, { kind: 'capture' });
        P.text('PRESS A ' + (capture.dev ? 'BUTTON' : 'KEY') + ' FOR', P.W / 2, y + 8, UI.dim, { align: 'center' });
        P.text(actionLabel(capture.action), P.W / 2, y + 20, UI.accent, { align: 'center' });
        P.legend(capture.dev ? '{menu:close} CANCEL' : '{menu:back} CANCEL', P.W / 2, y + h - 13);
        P.focus(x, y, w, h);
      }
    },
  };
  return scr;
}

/** the controls in glyphs: a tab a context, its actions in two columns */
export function layoutScreen(app) {
  const tabs = new Tabs({ tabs: REBIND.map(([id, label]) => ({ id, label })) }), B = app.bindings;
  const scr = { id: 'layout', title: 'BUTTON LAYOUT', w: 400, tabs, bodyH: 6 * 14 + 8,
    body(P, x, y, w) {
      const ctx = tabs.current.id, acts = REBIND.find(r => r[0] === ctx)[2].flatMap(g => g[1]).filter(a => B.map[ctx] && B.map[ctx][a]), per = Math.ceil(acts.length / 2), colW = Math.floor(w / 2);
      acts.forEach((a, i) => { const cx = x + 8 + Math.floor(i / per) * colW, cy = y + 4 + (i % per) * Math.min(14, Math.floor(86 / per)); P.prompt(`{${ctx}:${a}} ${actionLabel(a)}`, cx, cy, { color: UI.ink }); });
      return this.bodyH;
    } };
  return scr;
}

/** the save slots as big cards; o: { mode: 'load' | 'save', saves (a SaveStore), onLoad(slot), onSave(slot), full } */
export function slotsScreen(app, o) {
  const S = app.ui.screens, slots = o.mode === 'save' ? ['1', '2', '3'] : ['1', '2', '3', 'auto'];
  const make = () => {
    const have = new Map(o.saves.list().map(q => [q.slot, q]));
    return slots.map(sl => {
      const q = have.get(sl), title = sl === 'auto' ? 'AUTOSAVE' : 'SLOT ' + sl;
      return { slot: sl, title, value: q ? (Number.isFinite(q.completion) ? q.completion.toFixed(1) + '%' : 'SAVED') : 'EMPTY', sub: q ? clock(q.playtime) + (Number.isFinite(q.day) ? `   DAY ${q.day + 1}` : '') : o.mode === 'save' ? 'FREE' : '',
        color: q ? UI.ink : UI.mute, disabled: o.mode === 'load' && !q, act: () => pick(sl, q, title) };
    });
  };
  const cards = new Cards({ id: 'slots', cards: make(), cols: 2 });
  function pick(sl, q, title) {
    if (o.mode === 'load') { S.closeAll(); o.onLoad(sl); return; }
    const go = () => { o.onSave(sl); cards.cards = make(); };
    if (q) S.open(confirmScreen(S, { title: 'SAVE OVER ' + title + '?', lines: ['The game saved there is lost'], yes: 'SAVE OVER IT', onYes: go })); else go();
  }
  return { id: 'slots-' + o.mode, title: o.mode === 'load' ? 'LOAD' : 'SAVE', w: 320, cards, cardH: 56, cardsH: 2 * 56 + 8, full: !!o.full, enter() { cards.cards = make(); } };
}
const clock = s => { s = Math.floor(s || 0); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

/** a field guide: o { id, title, topics: [{ title, lines }], full } */
export function guideScreen(app, o) {
  const S = app.ui.screens;
  const list = new List({ id: 'guide', items: o.topics.map((t, i) => ({ label: t.title.toUpperCase(), act: () => S.open(pageScreen(o, i)) })) });
  return { id: o.id || 'guide', title: o.title || 'HELP', w: 300, list, full: !!o.full };
}
function pageScreen(o, i) {
  let k = i;
  const n = o.topics.length, scr = {
    id: 'guide-page', w: 380, legend: '{menu:left}{menu:right} TURN THE PAGE   {menu:back} BACK',
    get title() { return o.topics[k].title.toUpperCase(); }, get info() { return o.topics[k].lines.flatMap((l, i) => (i ? ['', l] : [l])); }, paging: () => [k, n],
    update(nav, mouse) { const d = nav.right || mouse.wheel > 0 || mouse.click ? 1 : nav.left || mouse.wheel < 0 ? -1 : 0; if (!d) return null; k = (k + d + n) % n; return 'move'; },
  };
  return scr;
}

/** a document in pages (Credits & About): o { id, title, sections: [{ title, rows: [[label, text]], lines: [text] }] }.
 *  Laid out to the screen as it is drawn (a larger HUD size, more pages); left and right turn them */
export function docScreen(o) {
  let k = 0, laid = null;
  const layout = (P, w, h) => {
    if (laid && laid.W === P.W && laid.H === P.H) return laid.pages;
    const lines = [];
    for (const s of o.sections) {
      if (lines.length) lines.push({ gap: 6 });
      lines.push({ text: s.title.toUpperCase(), color: UI.accent, head: true });
      for (const [label, text] of s.rows || []) { lines.push({ text: label.toUpperCase(), color: UI.cyan }); for (const l of wrapText(P, text, w)) lines.push({ text: l, color: UI.ink }); lines.push({ gap: 3 }); }
      for (const t of s.lines || []) { for (const l of wrapText(P, t, w)) lines.push({ text: l, color: UI.dim }); lines.push({ gap: 3 }); }
    }
    const pages = [[]]; let y = 0;
    for (const l of lines) { const lh = l.gap || 10; if (y + lh > h && pages[pages.length - 1].length) { pages.push([]); y = 0; if (l.gap) continue; } pages[pages.length - 1].push(l); y += lh; }
    laid = { W: P.W, H: P.H, pages }; return pages;
  };
  const scr = {
    id: o.id || 'doc', title: o.title, w: 9999, full: !!o.full, legend: '{menu:left}{menu:right} TURN THE PAGE   {menu:back} BACK',
    paging: () => [k, laid ? laid.pages.length : 1],
    bodyH: P => Math.max(60, P.safe[3] - P.safe[1] - 30 - 26 - 8),
    body(P, x, y, w) {
      const h = scr.bodyH(P), pages = layout(P, w - 24, h); k = Math.min(k, pages.length - 1); let yy = y;
      for (const l of pages[k]) { if (l.gap) { yy += l.gap; continue; } P.text(l.text, x + 12, yy, l.color); yy += 10; }
      return h;
    },
    update(nav, mouse) { const n = laid ? laid.pages.length : 1, d = nav.right || mouse.wheel > 0 || mouse.click ? 1 : nav.left || mouse.wheel < 0 ? -1 : 0; if (!d || n < 2) return null; k = (k + d + n) % n; return 'move'; },
  };
  return scr;
}
// a paragraph in lines that fit w UI pixels
function wrapText(P, s, w) { const out = []; let line = ''; for (const word of String(s).split(' ')) { const t = line ? line + ' ' + word : word; if (P.width(t) > w && line) { out.push(line); line = word; } else line = t; } if (line) out.push(line); return out; }

/** a screen of tabs, each a page (a part of a screen: { list, cards, cardH, cardsH, info, body, bodyH, tips, legend, w,
 *  update(nav, mouse, dt), enter() }): the pause's MAP, BRIEF, STATS, SETTINGS and HELP. o: { id, title, color, tabs:
 *  [{ id, label, page }], tab (index), pause, legend (added to every page's), back() } */
export function tabbedScreen(o) {
  const tabs = new Tabs({ tabs: o.tabs.map(t => ({ id: t.id, label: t.label })), i: o.tab || 0, color: o.color }), pg = () => o.tabs[tabs.i].page;
  let seen = -1;
  const scr = {
    id: o.id, title: o.title, color: o.color, pause: !!o.pause, tabs, back: o.back,
    get w() { return pg().w || o.w || 380; }, get list() { return pg().list || null; }, get cards() { return pg().cards || null; }, get cardH() { return pg().cardH; }, get cardsH() { return pg().cardsH; },
    get info() { return pg().info || []; }, get body() { const p = pg(); return p.body ? (P, x, y, w) => p.body(P, x, y, w) : null; }, get bodyH() { return pg().bodyH || 0; }, get tips() { return !!pg().tips; },
    get legend() { const l = pg().legend || (pg().list || pg().cards ? '{menu:confirm} SELECT' : ''); return [l, o.legend].filter(Boolean).join('   '); },
    get tab() { return tabs.current.id; },
    show(id) { const i = o.tabs.findIndex(t => t.id === id); if (i >= 0) tabs.i = i; return scr; },
    enter() { seen = -1; },
    update(nav, mouse, dt) {
      if (tabs.i !== seen) { seen = tabs.i; const p = pg(); if (p.enter) p.enter(); }
      const p = pg(); return p.update ? p.update(nav, mouse, dt) : null;
    },
  };
  return scr;
}
