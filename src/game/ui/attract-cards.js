// The attract mode's cards (PLAN.md 8.20), shown between the reels over the city held still and dimmed: the title card;
// HOW TO PLAY, a DualSense drawn by code with each button's job beside it in PlayStation glyphs (read from the player's
// bindings: a rebind shows); LOWTOWN'S MOST WANTED, the local records (the save slots by completion, then cash),
// topped up with the city's own legends. Presentation only.
import { E, UI, drawGlyph, glyphWidth, actionLabel } from '../../motor/index.js';
import { drawLogo } from '../scenes/title.js';
import { GAME } from '../../about.js';

const LEGENDS = [['BIG SAL', 87, 412000], ['THE DUCHESS', 71, 268500], ['NOODLES', 54, 97200], ['LEFTY', 33, 41800], ['CAPTAIN STATIC', 12, 9900]];
// each row: its buttons, and what they do on foot and at the wheel (the bindings' first action on each), or its own words
const LEFT = [{ codes: ['Pad6'] }, { codes: ['Pad4'] }, { codes: ['Pad12'] }, { codes: ['Pad14', 'Pad15'], text: 'WEAPON  •  STATION' }, { codes: ['Pad13'] }, { codes: ['Pad10'] },
  { codes: ['LS'], text: 'MOVE / STEER' }, { codes: ['Pad8'] }];
const RIGHT = [{ codes: ['Pad7'] }, { codes: ['Pad5'] }, { codes: ['Pad3'] }, { codes: ['Pad1'] }, { codes: ['Pad2'] }, { codes: ['Pad0'] }, { codes: ['Pad11'] },
  { codes: ['RS'], text: 'AIM / LOOK' }, { codes: ['Pad9'] }, { codes: ['Pad17'] }];
const SHORT = { 'GET IN / USE': 'GET IN / OUT', 'WEAPON WHEEL': 'WEAPONS', ACCELERATE: 'GAS', 'BRAKE / REVERSE': 'BRAKE', 'SWITCH CHARACTER': 'SWITCH', 'CHANGE VIEW': 'VIEW', 'PHOTO MODE': 'PHOTO' };

// what a pad code does in a context: the first action bound to it there, a tap or a release (its label), or ''
function job(B, ctx, code) {
  const map = B.map[ctx] || {};
  for (const action of Object.keys(map)) if (B.codes(action, ctx).some(c => c === code || c === code + '^')) { const l = actionLabel(action); return SHORT[l] || l; }
  return '';
}
function label(B, row) {
  if (row.text) return row.text;
  const foot = row.codes.map(c => job(B, 'onFoot', c)).filter(Boolean), car = row.codes.map(c => job(B, 'vehicle', c)).filter(Boolean);
  const a = [...new Set(foot)].join(' / '), b = [...new Set(car)].join(' / ');
  return !b || a === b ? a || b : !a ? b : a + '  •  ' + b;
}
// the controller: body, grips, touchpad, d-pad, the four face buttons, the sticks, the shoulders
function drawPad(g, cx, cy) {
  const body = '#2c2840', edge = '#6c6490', dark = '#16141f';
  E.px.disc(g, cx - 52, cy + 24, 21, edge); E.px.disc(g, cx + 52, cy + 24, 21, edge); E.px.disc(g, cx - 52, cy + 24, 20, body); E.px.disc(g, cx + 52, cy + 24, 20, body);
  E.px.rect(g, cx - 72, cy - 28, 144, 50, edge); E.px.rect(g, cx - 71, cy - 27, 142, 48, body);
  E.px.rect(g, cx - 68, cy - 36, 28, 7, edge); E.px.rect(g, cx + 40, cy - 36, 28, 7, edge);   // (L1, R1)
  E.px.rect(g, cx - 22, cy - 24, 44, 20, dark); E.px.rect(g, cx - 21, cy - 23, 42, 18, '#221e32');   // (the touchpad)
  for (const [x, y, w, h] of [[-52, -16, 5, 15], [-57, -11, 15, 5]]) E.px.rect(g, cx + x, cy + y, w, h, edge);   // (the d-pad)
  for (const [n, x, y] of [[3, 48, -22], [1, 59, -11], [0, 48, 0], [2, 37, -11]]) drawGlyph(g, 'Pad' + n, cx + x - 4, cy + y - 4);
  for (const x of [-26, 26]) { E.px.disc(g, cx + x, cy + 12, 8, dark); E.px.disc(g, cx + x, cy + 12, 6, '#3a3550'); }
}
function howTo(P, app) {
  const g = P.g, B = app.bindings, cx = Math.round(P.W / 2), top = P.safe[1] + 6;
  P.title('HOW TO PLAY', cx, top, { scale: 2, colors: ['#ffe066', '#ff7a2a'], align: 'center' });
  const cy = Math.round(P.H / 2) + 4; drawPad(g, cx, cy);
  const rows = (list, x, align) => list.forEach((row, i) => {
    const y = cy - 52 + i * 12, text = label(B, row), gw = row.codes.reduce((w, c) => w + glyphWidth(c, 'playstation') + 1, 0);
    let gx = align === 'right' ? x - P.width(text) - 5 - gw : x;
    for (const c of row.codes) gx += drawGlyph(g, c, gx, y - 1, 'playstation') + 1;
    P.text(text, align === 'right' ? x : gx + 4, y, UI.ink, align === 'right' ? { align: 'right' } : {});
  });
  rows(LEFT, cx - 80, 'right'); rows(RIGHT, cx + 80, 'left');
  P.text('ON FOOT  •  AT THE WHEEL', cx, cy + 58, UI.dim, { align: 'center' });
}
function mostWanted(P, records) {
  const cx = Math.round(P.W / 2), top = P.safe[1] + 6;
  P.title('LOWTOWN\'S MOST WANTED', cx, top, { scale: 2, colors: ['#ff5a4a', '#d0306a'], align: 'center' });
  const rows = [...records.map(r => [r.name, r.completion, r.cash, true]), ...LEGENDS.map(l => [...l, false])].sort((a, b) => b[1] - a[1] || b[2] - a[2]).slice(0, 6);
  const w = Math.min(P.W - 2 * P.safe[0], 300), x0 = cx - w / 2, y0 = top + 34;
  P.text('NAME', x0 + 22, y0, UI.dim); P.text('DONE', x0 + w - 86, y0, UI.dim, { align: 'right' }); P.text('CASH', x0 + w, y0, UI.dim, { align: 'right' });
  rows.forEach(([name, pct, cash, mine], i) => {
    const y = y0 + 16 + i * 15, c = mine ? UI.accent : UI.ink;
    P.text(String(i + 1), x0, y, i === 0 ? '#ffe066' : UI.dim);
    P.text(name, x0 + 22, y, c); P.text(Math.round(pct) + '%', x0 + w - 86, y, c, { align: 'right' }); P.text('$' + Math.round(cash).toLocaleString('en-US'), x0 + w, y, c, { align: 'right' });
  });
}
/** a card over the dimmed city: id 'title' | 'howto' | 'wanted'; o: { app, records: [{ name, completion, cash }] } */
export function drawCard(P, id, o) {
  P.fill(0, 0, P.W, P.H, '#05030c', .86);
  if (id === 'title') { const Lg = drawLogo(P, Math.round(P.H * .2)); P.text('A GTA2-STYLE CITY  •  THREE WAYS TO SEE IT', P.W / 2, Lg.menu + 10, UI.ink, { align: 'center' }); P.text(GAME.id, P.W / 2, Lg.menu + 24, UI.mute, { align: 'center' }); }
  else if (id === 'howto') howTo(P, o.app);
  else if (id === 'wanted') mostWanted(P, o.records || []);
}
