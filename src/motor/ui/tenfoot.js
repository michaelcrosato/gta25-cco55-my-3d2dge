// The 10-foot kit (PLAN.md 8.18): what every menu and card is drawn with on the UI layer, so they all read from a sofa
// and obey the same rules. A Pen draws (and records, for the audit) text in the 5 x 7 font at scale 1 or more, prompts
// in the player's own glyphs, panels, the focus frame (2 px, pulsing, lifted a pixel) and a screen's button legend.
// The widgets take a step's navigation (menu context: up/down/left/right, ✕ confirm, ○ back, L1/R1 tabs, △ secondary,
// □ tertiary, Options close) and the mouse (hover focuses, a click confirms, the wheel scrolls), and say what sound
// each did ('move', 'confirm', 'back', 'error'):
//   - List: six rows a page at most (a page count when there are more); a row is an action ({ label, act, right, sub,
//     prompt (a glyph-token string shown at its right), help (the screen's tip while focused), disabled }), a toggle ({ kind: 'toggle', get, set }), a slider ({ kind: 'slider', get, set, min, max, step }), a
//     choice ({ kind: 'choice', get, set, options: [[value, label]] }) or a line of information ({ kind: 'info' });
//   - Tabs: L1/R1 (Q/E) between them, the mouse on their labels;
//   - Cards: big cards in a grid, six a page at most (stats, save slots).
import { E } from '../engine.js';
import { drawPrompt, promptWidth, parsePrompt, deviceOf } from '../input/prompts.js';

/** the kit's colours */
export const UI = {
  ink: '#f0ecff', dim: '#c8c0e8', mute: '#8a84a8', off: '#6a6488', accent: '#ffe066', cyan: '#5af0ff', pink: '#ff5ac8',
  green: '#7aff8a', red: '#ff5a4a', panel: ['#1c1a34', '#0e0c1c'], line: '#3a3460', shade: 'rgba(5,3,12,.62)', outline: '#05030c',
};
/** a row's height in UI pixels; the most rows or cards a page shows */
export const ROW = 18, PAGE = 6;

// text as the pixel font draws it, kept by its words and look: the font fills a rectangle a run of each glyph, six times
// over with the outline (a line of the HUD, hundreds of calls a frame), so a text is drawn once into an image of its own
// and put in place with one blit, pixel for pixel (both at whole pixels); the 256 used last are kept
const TEXTS = new Map(), TEXTS_MAX = 256;
function textImage(s, color, o) {
  const key = [s, color, o.outline, o.shadow, o.scale, o.align, o.wrap].join('\u0001');
  let t = TEXTS.get(key);
  if (t) { TEXTS.delete(key); TEXTS.set(key, t); return t; }   // (most recently used last)
  const sc = Math.max(1, Math.round(o.scale || 1)), lines = o.wrap ? E.font.wrap(s, o.wrap, { scale: sc }) : String(s).split('\n');
  const w = Math.max(0, ...lines.map(l => E.font.width(l, { scale: sc }))), h = E.font.height(lines.length, { scale: sc }), pad = 1 + sc;   // (the outline a pixel, the shadow a scaled one)
  const ax = pad + (o.align === 'center' ? Math.round(w / 2) : o.align === 'right' ? w : 0), cv = E.mkCanvas(w + 2 * pad + 1, h + 2 * pad + 1), g = cv.getContext('2d');
  const r = E.font.text(g, s, ax, pad, color, o);
  t = { cv, ax, ay: pad, r };
  TEXTS.set(key, t); if (TEXTS.size > TEXTS_MAX) TEXTS.delete(TEXTS.keys().next().value);
  return t;
}

/** draws on the UI layer, recording what it draws: pen = new Pen(layer, bindings, input) each frame */
export class Pen {
  constructor(layer, bindings, input) { this.L = layer; this.g = layer.g; this.rec = layer.rec; this.B = bindings; this.input = input; this.t = layer.t; }
  get W() { return this.L.W; }
  get H() { return this.L.H; }
  get safe() { return this.L.safe; }
  /** text at (x, y) (its top left; align 'center' or 'right' moves it); o: { scale, align, wrap, outline, shadow } */
  text(s, x, y, color = UI.ink, o = {}) {
    const scale = o.scale || 1, t = textImage(String(s), color, { outline: o.outline === undefined ? UI.outline : o.outline, shadow: o.shadow, scale, align: o.align, wrap: o.wrap }), r = t.r;
    this.g.drawImage(t.cv, Math.round(x) - t.ax, Math.round(y) - t.ay);
    const w = r ? r.w : E.font.width(String(s), { scale }), h = r ? r.h : 7 * scale, x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    this.rec.text(String(s), Math.round(x0), y, w, h, scale, 'normal');
    return { w, h };
  }
  width(s, scale = 1) { return E.font.width(String(s), { scale }); }
  /** big logo letters (E.font.title) */
  title(s, x, y, o = {}) { E.font.title(this.g, s, x, y, o); const sc = o.scale || 2, w = E.font.width(s, { scale: sc }); this.rec.text(s, Math.round(o.align === 'center' ? x - w / 2 : x), y, w, 7 * sc, sc, 'title'); }
  /** a prompt with glyph tokens ("{menu:confirm} SELECT"): the player's own buttons; o: { align, color } */
  prompt(s, x, y, o = {}) {
    const w = drawPrompt(this.g, s, x, y, this.B, this.input, { align: o.align, color: o.color || UI.dim, shadow: o.shadow });
    const { device } = deviceOf(this.input), parts = parsePrompt(s, this.B, device), bad = parts.filter(p => p.text === '?').length;
    this.rec.prompt(s, Math.round(o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x), y - 2, w, 11, bad);
    return w;
  }
  promptWidth(s) { return promptWidth(s, this.B, this.input); }
  /** a prompt with a hold ring before it: how far a held button has got (t, 0..1), filling clockwise from the top */
  holdPrompt(s, x, y, t, o = {}) {
    const w = this.promptWidth(s), x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x, cx = Math.round(x0 - 10), cy = y + 3, g = this.g, f = Math.max(0, Math.min(1, t));
    g.save(); g.lineWidth = 2; g.strokeStyle = UI.line; g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.stroke();
    if (f > 0) { g.strokeStyle = o.color || UI.accent; g.beginPath(); g.arc(cx, cy, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); g.stroke(); }
    g.restore(); g._c = null; this.rec.rect('ring', cx - 7, cy - 7, 14, 14);
    return this.prompt(s, x, y, o);
  }
  /** a window: the kit's gradient, a border and a shadow */
  panel(x, y, w, h, o = {}) { E.ui.box(this.g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: o.bg || UI.panel, border: o.border, shadow: o.shadow }); this.rec.rect(o.kind || 'panel', x, y, w, h); }
  /** a filled rectangle (a bar, a swatch) */
  fill(x, y, w, h, color, a = 1) { const g = this.g; g.globalAlpha = a; g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); g.globalAlpha = 1; g._c = null; }
  /** the whole screen dimmed (under a menu over the game) */
  shade(a = .62) { this.fill(0, 0, this.W, this.H, '#05030c', a); }
  /** the focus: a 2 px frame that pulses, round (x, y, w, h) already lifted a pixel by the caller */
  focus(x, y, w, h, color = UI.accent) {
    const g = this.g, a = .7 + .3 * Math.sin(this.t * 6);
    g.globalAlpha = a; g.strokeStyle = color; g.lineWidth = 2; g.strokeRect(Math.round(x) + 1, Math.round(y) + 1, Math.round(w) - 2, Math.round(h) - 2); g.globalAlpha = 1; g._c = null;
    this.rec.focused(x, y, w, h);
  }
  /** the button legend at the foot of a panel (centred); wider than w, on two lines (the first one a line above) */
  legend(s, cx, y, w = Infinity) {
    const o = { align: 'center', color: UI.dim };
    if (this.promptWidth(s) <= w) return this.prompt(s, cx, y, o);
    const [a, b] = splitLegend(this, s); this.prompt(a, cx, y - LEGEND_LINE, o); return this.prompt(b, cx, y, o);
  }
  /** "2/4": a list's page and its pages, at a panel's top right */
  pages(page, pages, x, y) { if (pages > 1) this.text(`${page + 1}/${pages}`, x, y, UI.mute, { align: 'right' }); }
}

/** a list of rows, six a page at most */
export class List {
  /** o: { id, items, per (≤ 6), color (the focus's), sel } */
  constructor(o = {}) { this.id = o.id || 'list'; this.items = o.items || []; this.per = Math.min(PAGE, o.per || PAGE); this.color = o.color || UI.accent; this.sel = Math.max(0, Math.min(this.items.length - 1, o.sel || 0)); this.rows = []; }
  get page() { return Math.floor(this.sel / this.per); }
  get pages() { return Math.max(1, Math.ceil(this.items.length / this.per)); }
  get current() { return this.items[this.sel] || null; }
  set(items) { this.items = items; this.sel = Math.max(0, Math.min(this.items.length - 1, this.sel)); return this; }
  /** a step's input: nav (taps), mouse ({ x, y, click, wheel }); returns the sound it made, or null */
  input(nav, mouse = {}) {
    const n = this.items.length; if (!n) return nav.confirm ? 'error' : null;
    let sound = null;
    const move = d => { const s0 = this.sel; this.sel = (this.sel + d + n) % n; if (this.sel !== s0) sound = 'move'; };
    if (nav.down) move(1); if (nav.up) move(-1);
    if (mouse.wheel) { const s0 = this.sel; this.sel = Math.max(0, Math.min(n - 1, this.sel + mouse.wheel)); if (s0 !== this.sel) sound = 'move'; }
    const hover = mouse.x !== null && mouse.x !== undefined ? this.rows.find(r => mouse.x >= r.x && mouse.x < r.x + r.w && mouse.y >= r.y && mouse.y < r.y + r.h) : null;
    if (hover && hover.i !== this.sel && mouse.moved) { this.sel = hover.i; sound = 'move'; }
    const it = this.items[this.sel];
    if (it && (nav.left || nav.right)) sound = this.adjust(it, nav.right ? 1 : -1) || sound;
    if (nav.confirm || (mouse.click && hover)) {
      if (mouse.click && hover) this.sel = hover.i;
      return this.activate(this.items[this.sel], mouse.click && hover ? { ...hover, mx: mouse.x } : null);
    }
    return sound;
  }
  /** left or right on a row: a slider's step, a choice's next, a toggle flipped */
  adjust(it, d) {
    if (it.disabled) return null;
    if (it.kind === 'slider') { const v = it.get(), st = it.step || .1, nv = Math.max(it.min ?? 0, Math.min(it.max ?? 1, Math.round((v + d * st) / st) * st)); if (nv === v) return 'error'; it.set(+nv.toFixed(4)); return 'move'; }
    if (it.kind === 'choice') { const o = it.options, i = o.findIndex(q => q[0] === it.get()); it.set(o[((i < 0 ? 0 : i) + d + o.length) % o.length][0]); return 'move'; }
    if (it.kind === 'toggle') { it.set(!it.get()); return 'move'; }
    return null;
  }
  /** ✕ (or a click) on a row */
  activate(it, at = null) {
    if (!it || it.kind === 'info') return null;
    if (it.disabled) return 'error';
    if (it.kind === 'toggle') { it.set(!it.get()); return 'confirm'; }
    if (it.kind === 'choice') return this.adjust(it, 1) && 'confirm';
    if (it.kind === 'slider') { if (at) { const f = (at.mx - at.bx) / at.bw; if (f >= 0 && f <= 1) { const st = it.step || .1; it.set(+(Math.round(((it.min ?? 0) + f * ((it.max ?? 1) - (it.min ?? 0))) / st) * st).toFixed(4)); } } return 'confirm'; }
    if (it.act) { it.act(); return 'confirm'; }
    return null;
  }
  /** draw the page shown, rows of ROW from (x, y), w wide; returns the height used */
  draw(P, x, y, w, o = {}) {
    const page = this.page, shown = this.items.slice(page * this.per, page * this.per + this.per);
    this.rows = [];
    shown.forEach((it, i) => {
      const k = page * this.per + i, on = k === this.sel, ry = y + i * ROW - (on ? 1 : 0), col = it.disabled ? UI.off : on ? UI.ink : UI.dim;
      const row = { i: k, x, y: y + i * ROW, w, h: ROW };
      if (on && o.focus !== false) P.focus(x, ry - 1, w, ROW, this.color);
      if (it.kind === 'info') { P.text(it.label, x + 8, ry + 5, it.color || UI.mute); if (it.right !== undefined) P.text(it.right, x + w - 8, ry + 5, UI.dim, { align: 'right' }); this.rows.push(row); return; }
      P.text(it.label, x + 8, ry + 5, it.color && !it.disabled ? it.color : col);
      const right = x + w - 8;
      if (it.kind === 'toggle') P.text(it.get() ? 'ON' : 'OFF', right, ry + 5, it.get() ? UI.green : UI.mute, { align: 'right' });
      else if (it.kind === 'choice') { const op = it.options.find(q => q[0] === it.get()) || it.options[0], lab = '< ' + String(op ? op[1] : '').toUpperCase() + ' >'; P.text(lab, right, ry + 5, on ? UI.accent : UI.dim, { align: 'right' }); }
      else if (it.kind === 'slider') {
        const v = it.get(), lo = it.min ?? 0, hi = it.max ?? 1, f = (v - lo) / ((hi - lo) || 1), bw = 64, bx = right - bw - 30;
        P.fill(bx, ry + 6, bw, 5, UI.line); P.fill(bx, ry + 6, Math.round(bw * f), 5, on ? UI.accent : UI.cyan);
        P.text(it.format ? it.format(v) : Math.round(f * 100) + '%', right, ry + 5, UI.dim, { align: 'right' });
        row.bx = bx; row.bw = bw;
      } else {
        let rw = 0;
        if (it.prompt) rw = P.prompt(it.prompt, right, ry + 5, { align: 'right', color: it.disabled ? UI.off : UI.accent }) + 12;   // (a binding: the button in the player's glyphs)
        else if (it.right !== undefined) { P.text(it.right, right, ry + 5, it.disabled ? UI.off : UI.accent, { align: 'right' }); rw = P.width(it.right) + 12; }
        if (it.sub) P.text(it.sub, right - rw, ry + 5, UI.mute, { align: 'right' });
      }
      this.rows.push(row);
    });
    P.rec.list(this.id, shown.length, page, this.pages, this.rows.map(r => ({ label: this.items[r.i].label, x: r.x, y: r.y, w: r.w, h: r.h })), o.focus !== false);
    return shown.length * ROW;
  }
}

/** tabs along a screen's top: L1/R1 (Q/E), or a click on one */
export class Tabs {
  /** o: { tabs: [{ id, label }], i, color } */
  constructor(o = {}) { this.tabs = o.tabs || []; this.i = o.i || 0; this.color = o.color || UI.accent; this.boxes = []; }
  get current() { return this.tabs[this.i] || null; }
  input(nav, mouse = {}) {
    const n = this.tabs.length; if (!n) return null;
    if (nav.tabNext) { this.i = (this.i + 1) % n; return 'move'; }
    if (nav.tabPrev) { this.i = (this.i - 1 + n) % n; return 'move'; }
    if (mouse.click && mouse.x !== null) { const b = this.boxes.find(q => mouse.x >= q.x && mouse.x < q.x + q.w && mouse.y >= q.y && mouse.y < q.y + q.h); if (b && b.i !== this.i) { this.i = b.i; return 'move'; } }
    return null;
  }
  /** the labels in a row centred on cx at y, the bumpers' glyphs either side */
  draw(P, cx, y) {
    const gap = 14, ws = this.tabs.map(t => P.width(t.label)), total = ws.reduce((a, b) => a + b, 0) + gap * (this.tabs.length - 1);
    let x = Math.round(cx - total / 2); this.boxes = [];
    P.prompt('{menu:tabPrev}', x - 8, y, { align: 'right' });
    this.tabs.forEach((t, i) => {
      const on = i === this.i;
      if (on) { P.fill(x - 4, y - 3, ws[i] + 8, 13, this.color, .22); P.fill(x - 4, y + 10, ws[i] + 8, 2, this.color); }
      P.text(t.label, x, y, on ? UI.ink : UI.mute);
      this.boxes.push({ i, x: x - 4, y: y - 3, w: ws[i] + 8, h: 15 }); x += ws[i] + gap;
    });
    P.prompt('{menu:tabNext}', x - gap + 8, y);
    P.rec.tab(this.boxes.map(b => ({ label: this.tabs[b.i].label, x: b.x, y: b.y, w: b.w, h: b.h })));
  }
}

/** big cards in a grid, six a page at most: { title, value, sub, color, act, disabled } */
export class Cards {
  constructor(o = {}) { this.id = o.id || 'cards'; this.cards = o.cards || []; this.cols = o.cols || 3; this.per = Math.min(PAGE, o.per || PAGE); this.sel = 0; this.color = o.color || UI.accent; this.boxes = []; }
  get page() { return Math.floor(this.sel / this.per); }
  get pages() { return Math.max(1, Math.ceil(this.cards.length / this.per)); }
  get current() { return this.cards[this.sel] || null; }
  input(nav, mouse = {}) {
    const n = this.cards.length; if (!n) return null; let sound = null;
    const go = d => { const s0 = this.sel; this.sel = Math.max(0, Math.min(n - 1, this.sel + d)); if (s0 !== this.sel) sound = 'move'; };
    if (nav.right) go(1); if (nav.left) go(-1); if (nav.down) go(this.cols); if (nav.up) go(-this.cols);
    if (mouse.wheel) go(mouse.wheel * this.cols);
    const hover = mouse.x !== null && mouse.x !== undefined ? this.boxes.find(b => mouse.x >= b.x && mouse.x < b.x + b.w && mouse.y >= b.y && mouse.y < b.y + b.h) : null;
    if (hover && hover.i !== this.sel && mouse.moved) { this.sel = hover.i; sound = 'move'; }
    if (nav.confirm || (mouse.click && hover)) { const c = this.cards[hover && mouse.click ? hover.i : this.sel]; if (!c || !c.act) return sound; if (c.disabled) return 'error'; c.act(); return 'confirm'; }
    return sound;
  }
  /** the page shown in a grid at (x, y), w wide, cards h tall */
  draw(P, x, y, w, h = 52, live = true) {
    const page = this.page, shown = this.cards.slice(page * this.per, page * this.per + this.per), gap = 8, cw = Math.floor((w - gap * (this.cols - 1)) / this.cols);
    this.boxes = [];
    shown.forEach((c, i) => {
      const k = page * this.per + i, on = k === this.sel, cx = x + (i % this.cols) * (cw + gap), cy = y + Math.floor(i / this.cols) * (h + gap) - (on ? 1 : 0);
      P.panel(cx, cy, cw, h, { kind: 'card', bg: on ? ['#2a2650', '#141028'] : UI.panel });
      if (on && live) P.focus(cx - 1, cy - 1, cw + 2, h + 2, this.color);
      P.text(c.title, cx + cw / 2, cy + 6, c.disabled ? UI.off : UI.mute, { align: 'center' });
      P.text(c.value, cx + cw / 2, cy + 18, c.disabled ? UI.off : c.color || UI.ink, { align: 'center', scale: 2 });
      if (c.sub) P.text(c.sub, cx + cw / 2, cy + h - 12, UI.mute, { align: 'center' });
      this.boxes.push({ i: k, x: cx, y: cy, w: cw, h });
    });
    P.rec.list(this.id, shown.length, page, this.pages, this.boxes.map(b => ({ label: this.cards[b.i].title, x: b.x, y: b.y, w: b.w, h: b.h })), live);
    return Math.ceil(shown.length / this.cols) * (h + gap) - gap;
  }
}

/** a legend's line height, and the legend in two halves as even as its parts allow (its parts: three spaces apart) */
export const LEGEND_LINE = 11;
export function splitLegend(P, s) {
  const parts = String(s).split('   '); let best = null;
  for (let k = 1; k < parts.length; k++) { const a = parts.slice(0, k).join('   '), b = parts.slice(k).join('   '), m = Math.max(P.promptWidth(a), P.promptWidth(b)); if (!best || m < best.m) best = { a, b, m }; }
  return best ? [best.a, best.b] : [s, ''];
}
