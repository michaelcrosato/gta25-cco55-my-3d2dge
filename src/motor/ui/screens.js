// The screens (PLAN.md 8.18): a stack of 10-foot menus over the game (the title's, the pause menu and its tabs, the
// settings, load and save, the map, help, credits) on the UI layer. Each step the top one takes the menu context's
// taps (✕ confirm, ○ back, L1/R1 tabs, △ secondary, □ tertiary, Options close) and the mouse; ○ goes back a screen
// unless the screen takes it, Options closes them all. Every move, confirm, back and refusal has its sound. A screen
// is { id, title, color, w (its panel's width), tabs (a Tabs), list (a List), cards (a Cards), body(P, x, y, w) (what
// it draws above its list: returns the height), info (lines under the title), legend (its buttons, in glyph tokens),
// pause (true: the game under it stands still), full (true: drawn over nothing but itself), over (true: a dialog, drawn
// over the screen it asks about; any other screen is drawn alone over the game), tips (true: the focused
// row's help under the list), paging() ([page, pages] where it pages without a list), top(P, h) (its panel's top, where
// not centred), sticky (true: Options leaves it open), back() (true: handled), update(nav, mouse, dt) (its
// own input first: a sound, true when it took the step's input without one, or null to leave it to the tabs, the cards
// and the list), draw(P) (all of it, its own way), enter(), exit() }.
//   const S = new Screens({ app, layer });  S.open(screen) · S.back() · S.closeAll() · each step S.update(dt) · each frame S.draw(P)
import { BUS } from '../core/bus.js';
import { UI, ROW, LEGEND_LINE } from './tenfoot.js';

const SOUND = { move: 'select', confirm: 'confirm', back: 'cancel', error: 'bump' };
const TAPS = ['up', 'down', 'left', 'right', 'confirm', 'back', 'tabPrev', 'tabNext', 'secondary', 'tertiary', 'close'];

export class Screens {
  /** o: { app (bindings, game), layer (the UILayer) } */
  constructor(o) { this.app = o.app; this.L = o.layer; this.stack = []; this.t = 0; this.lastSound = null; this.mouse = { x: null, y: null, moved: false, click: false, wheel: 0 }; }
  get top() { return this.stack[this.stack.length - 1] || null; }
  get isOpen() { return this.stack.length > 0; }
  /** does a screen open hold the game still (the pause menu, the map, settings from it)? */
  get pausing() { return this.stack.some(s => s.pause); }
  open(s) {
    this.stack.push(s); if (s.enter) s.enter();
    const I = this.app.game.input; if (I && I.consumeAll) I.consumeAll(); if (this.L && this.L.reset) this.L.reset();   // (the press that opened it is spent, the pointer's too)
    BUS.emit('uiOpen', { screen: s.id }); return s;
  }
  /** the top screen in place of the one under it (a tab's sub-screen, a confirm) */
  replace(s) { const old = this.stack.pop(); if (old && old.exit) old.exit(); return this.open(s); }
  back() { const s = this.stack.pop(); if (!s) return null; if (s.exit) s.exit(); BUS.emit('uiClose', { screen: s.id }); return s; }
  closeAll() { while (this.stack.length) this.back(); }
  /** Options: every screen closed down to a sticky one (the title's menu, a card: those answer it themselves) */
  closeToSticky() { while (this.stack.length && !this.top.sticky) this.back(); }
  /** a step's taps in the menu context, from the player's bindings */
  nav() { const B = this.app.bindings; B.setContext('menu'); const n = {}; for (const k of TAPS) n[k] = B.tap(k); return n; }
  /** a step: the top screen takes the input; ○ backs out of it, Options closes them all */
  update(dt) {
    this.t += dt; const s = this.top; if (!s) return null;
    const nav = this.nav(), mouse = this.L.poll(); this.mouse = mouse;
    let sound = s.update ? s.update(nav, mouse, dt) : null;
    if (sound === true) return null;   // (the screen took the step's input: a capture, a confirm of its own)
    if (sound === undefined || sound === null) {
      if (s.tabs) sound = s.tabs.input(nav, mouse);
      if (!sound && s.cards) sound = s.cards.input(nav, mouse);
      if (!sound && s.list) sound = s.list.input(nav, mouse);
    }
    if (this.stack.includes(s) && !sound) {
      if (nav.close && !s.sticky) { this.closeToSticky(); sound = 'back'; }
      else if (nav.back) { if (!(s.back && s.back())) this.back(); sound = 'back'; }
    }
    if (sound) this.sound(sound);
    return sound;
  }
  sound(kind) { this.lastSound = kind; const A = this.app.game.audio; if (A && A.sfx && !this.app.game.headless) try { A.sfx(SOUND[kind] || kind); } catch { /* audio not ready */ } }
  /** draw the top screen, and under a dialog (over: true, a question) the screen it asks about, dimmed by it */
  draw(P) {
    const n = this.stack.length; if (!n) return;
    let from = n - 1; while (from > 0 && this.stack[from].over && !this.stack[from].full) from--;
    for (let i = from; i < n; i++) { const s = this.stack[i], live = i === n - 1; if (live) P.rec.screen = s.id; if (s.draw) s.draw(P, this, live); else drawScreen(P, s, live); }
  }
}

/** the standard screen: the game dimmed (or not, full), a panel in the middle with the title, the tabs, the screen's
 *  body, its list or cards, the page count and the button legend */
export function drawScreen(P, s, live = true) {
  if (!s.full && s.shade !== false) P.shade(.62);
  const [sx0, sy0, sx1, sy1] = P.safe, maxW = sx1 - sx0, w = Math.min(maxW, s.w || 320), x = Math.round(P.W / 2 - w / 2);
  const info = (s.info || []).flatMap(l => (typeof l === 'string' ? wrapLines(P, l, w - 24) : [l])), lh = l => (typeof l === 'string' || !l.scale ? 10 : 10 * l.scale + 4), infoH = info.reduce((a, l) => a + lh(l), 0);
  // (the legend wider than the panel: two lines, and the panel a line taller; a body that fills the screen reads
  // P.legendExtra to leave it room)
  const legend = s.legend || (s.list || s.cards ? '{menu:confirm} SELECT   {menu:back} BACK' : '{menu:back} BACK'), legW = w - 16; P.legendExtra = P.promptWidth(legend) > legW ? LEGEND_LINE : 0;
  const cardsH = s.cards ? s.cardsH || 120 : 0, bodyH = typeof s.bodyH === 'function' ? s.bodyH(P, w) : s.bodyH || 0;
  const tip = s.tips ? (s.list && s.list.current && s.list.current.help) || '' : null; let tipH = tip === null ? 0 : 24;
  // (short of room, a HUD size Large or Huge at 320 x 180: the list pages fewer rows, and the tip goes before the rows do)
  const base = (s.title ? 30 : 8) + (s.tabs ? 22 : 0) + infoH + (info.length ? 6 : 0) + bodyH + cardsH + 26 + P.legendExtra, room = sy1 - sy0;
  if (s.list) {
    const per0 = s.list.per0 ?? (s.list.per0 = s.list.per); let rows = Math.floor((room - base - tipH) / ROW);
    if (tipH && rows < Math.min(3, s.list.items.length)) { tipH = 0; rows = Math.floor((room - base) / ROW); }
    s.list.per = Math.max(1, Math.min(per0, rows));
  }
  const listH = s.list ? Math.min(s.list.items.length, s.list.per) * ROW : 0;
  const h = Math.min(room, base + listH + tipH), y = Math.max(sy0, Math.min(sy1 - h, s.top ? s.top(P, h) : Math.round(P.H / 2 - h / 2)));   // (inside the safe area, wherever it asks to be)
  P.panel(x, y, w, h, { kind: 'screen' });
  if (s.title) P.text(s.title, P.W / 2, y + 8, s.color || UI.accent, { align: 'center', scale: 2 });
  const pg = s.paging ? s.paging() : s.list ? [s.list.page, s.list.pages] : s.cards ? [s.cards.page, s.cards.pages] : null;
  if (pg) P.pages(pg[0], pg[1], x + w - 8, y + 8);
  let yy = y + (s.title ? 30 : 8);
  if (s.tabs) { s.tabs.draw(P, P.W / 2, yy); yy += 22; }
  for (const l of info) {   // (a line with glyph tokens shows the player's own buttons; { text, color, scale }: a big one)
    const t = typeof l === 'string' ? l : l.text, c = typeof l === 'string' ? UI.dim : l.color || UI.dim;
    if (TOKEN.test(t)) P.prompt(t, P.W / 2, yy, { align: 'center', color: c }); else P.text(t, P.W / 2, yy, c, { align: 'center', scale: (typeof l === 'object' && l.scale) || 1 });
    yy += lh(l);
  }
  if (info.length) yy += 6;
  if (s.body) yy += s.body(P, x + 8, yy, w - 16) || 0;
  if (s.cards) yy += s.cards.draw(P, x + 10, yy, w - 20, s.cardH || 52, live) + 8;
  if (s.list) { s.list.draw(P, x + 8, yy, w - 16, { focus: live }); yy += listH; }   // (the panel as tall on every page)
  if (tip && tipH) wrapLines(P, tip, w - 24).slice(0, 2).forEach((l, i) => P.text(l, P.W / 2, yy + 6 + i * 10, UI.mute, { align: 'center' }));
  P.legend(legend, P.W / 2, y + h - 14, legW);
}
const TOKEN = /\{[a-zA-Z]+(:[a-zA-Z]+)?\}/;
/** a line split to fit w UI pixels (glyph tokens measured as the buttons they show) */
export function wrapLines(P, s, w) { const m = TOKEN.test(s) ? t => P.promptWidth(t) : t => P.width(t); return m(s) <= w ? [s] : wrapWords(m, s, w); }
function wrapWords(m, s, w) { const out = []; let line = ''; for (const word of String(s).split(' ')) { const t = line ? line + ' ' + word : word; if (m(t) > w && line) { out.push(line); line = word; } else line = t; } if (line) out.push(line); return out; }
