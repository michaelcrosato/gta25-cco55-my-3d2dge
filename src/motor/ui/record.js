// What the UI layer drew this frame (PLAN.md 8.18's audit): every text run with its scale, every prompt and whether
// each of its glyph tokens resolved, the focus frame, and each list's items on the page shown. The kit's draw calls
// write it as they draw; tools/ui-audit.mjs reads it back through the console handle (window.__gtm.ui.record()) and
// checks the screen against the rules: the focus visible, six items a page at most, no text under the UI's own
// scale, every glyph resolved, nothing outside the safe area.
export class UIRecord {
  constructor() { this.begin(480, 270, [0, 0, 480, 270]); }
  /** a fresh frame: its size and safe area in UI pixels */
  begin(W, H, safe) { this.W = W; this.H = H; this.safe = safe; this.screen = null; this.texts = []; this.prompts = []; this.focus = []; this.lists = []; this.rects = []; this.tabs = []; }
  text(s, x, y, w, h, scale, font) { this.texts.push({ s, x, y, w, h, scale, font }); }
  prompt(s, x, y, w, h, unresolved) { this.prompts.push({ s, x, y, w, h, unresolved }); }
  /** a panel or a card: what the safe-area rule checks besides the text */
  rect(kind, x, y, w, h) { this.rects.push({ kind, x, y, w, h }); }
  focused(x, y, w, h) { this.focus.push({ x, y, w, h }); }
  /** a list on screen: the items on its page, the page and the pages; rows: each shown item's box and label (the mouse
   *  pass points at them); live: the screen in front's (one under it is drawn without its focus) */
  list(id, shown, page, pages, rows = [], live = true) { this.lists.push({ id, shown, page, pages, rows, live }); }
  /** a row of tabs: each one's label and box */
  tab(boxes) { this.tabs.push(...boxes); }
  /** the frame as plain data */
  snapshot() { return { W: this.W, H: this.H, safe: this.safe, screen: this.screen, texts: this.texts, prompts: this.prompts, focus: this.focus, lists: this.lists, rects: this.rects, tabs: this.tabs }; }
}

/** the 10-foot rules on one frame's record (snapshot()): a list of what broke (none: the frame passes). tools/ui-audit.mjs
 *  walks every screen with them; the Proving Ground's UI gallery checks each screen in each glyph set */
export function auditRecord(R) {
  const bad = [], [x0, y0, x1, y1] = R.safe, out = b => b.x < x0 - .5 || b.y < y0 - .5 || b.x + b.w > x1 + .5 || b.y + b.h > y1 + .5, at = b => `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}x${Math.round(b.h)}`;
  if (R.lists.some(l => l.live !== false && l.shown > 0) && !R.focus.length) bad.push('no focus on a screen with a list');
  for (const l of R.lists) if (l.shown > 6) bad.push(`list ${l.id}: ${l.shown} items on a page`);
  for (const t of R.texts) if (!(t.scale >= 1)) bad.push(`"${t.s}" at scale ${t.scale}`);
  for (const q of R.prompts) if (q.unresolved) bad.push(`"${q.s}": ${q.unresolved} glyph token(s) unresolved`);
  for (const t of R.texts) if (/\{[a-zA-Z]+(:[a-zA-Z]+)?\}/.test(t.s)) bad.push(`"${t.s}": a glyph token drawn as text`);
  for (const t of R.texts) if (out(t)) bad.push(`"${t.s}" outside the safe area (${at(t)})`);
  for (const q of R.prompts) if (out(q)) bad.push(`prompt "${q.s}" outside the safe area (${at(q)})`);
  for (const r of R.rects) if (out(r)) bad.push(`${r.kind} outside the safe area (${at(r)})`);
  for (const f of R.focus) if (out(f)) bad.push(`the focus outside the safe area (${at(f)})`);
  return bad;
}
