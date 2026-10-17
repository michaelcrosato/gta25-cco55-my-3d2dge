// Button glyphs drawn by code (PLAN.md 8.1): the engine's pixel font has no ✕ ○ □ △ (it draws '?', ENG:1160), so
// MOTOR draws controller buttons, triggers, sticks, the d-pad, keyboard keys and mouse buttons as pixel icons. Glyph
// sets are registry entries (def('glyphSets', ...)): a new controller family is content, not code.
import { E } from '../engine.js';
import { def, get } from '../core/registry.js';

const PS_FACE = {
  cross: ['..bbbbb..', '.bbbbbbb.', 'bbXbbbXbb', 'bbbXbXbbb', 'bbbbXbbbb', 'bbbXbXbbb', 'bbXbbbXbb', '.bbbbbbb.', '..bbbbb..'],
  circle: ['..bbbbb..', '.bbbbbbb.', 'bbbXXXbbb', 'bbXbbbXbb', 'bbXbbbXbb', 'bbXbbbXbb', 'bbbXXXbbb', '.bbbbbbb.', '..bbbbb..'],
  square: ['..bbbbb..', '.bbbbbbb.', 'bbXXXXXbb', 'bbXbbbXbb', 'bbXbbbXbb', 'bbXbbbXbb', 'bbXXXXXbb', '.bbbbbbb.', '..bbbbb..'],
  triangle: ['..bbbbb..', '.bbbbbbb.', 'bbbbXbbbb', 'bbbXbXbbb', 'bbbXbXbbb', 'bbXbbbXbb', 'bbXXXXXbb', '.bbbbbbb.', '..bbbbb..'],
};
const sprites = new Map();
function faceSprite(shape, color) {
  const k = shape + color; let s = sprites.get(k);
  if (!s) sprites.set(k, s = E.sprite(PS_FACE[shape], { b: '#16141f', X: color }));
  return s;
}
/** a face button with a letter (Xbox, Nintendo, generic) */
function letterDisc(g, x, y, letter, color) {
  E.px.disc(g, x + 4, y + 4, 4, '#16141f');
  E.font.text(g, letter, x + 5, y + 1, color, { align: 'center' });
  return 10;
}
/** a rounded pill with a label: L1, R2, OPTIONS, a keyboard key */
function pill(g, x, y, label, fg = '#f4f0ff', bg = '#2c2840', edge = '#6c6490') {
  const w = Math.max(9, E.font.width(label) + 6);
  E.px.rect(g, x + 1, y, w - 2, 9, edge); E.px.rect(g, x, y + 1, w, 7, edge); E.px.rect(g, x + 1, y + 1, w - 2, 7, bg);
  E.font.text(g, label, x + Math.round(w / 2), y + 1, fg, { align: 'center' });
  return w + 1;
}
/** a stick: a ring with its letter (L, R), an arrow for a direction */
function stickIcon(g, x, y, letter, dir) {
  E.px.disc(g, x + 4, y + 4, 4, '#6c6490'); E.px.disc(g, x + 4, y + 4, 3, '#2c2840');
  E.font.text(g, dir ? { Up: '↑', Down: '↓', Left: '←', Right: '→' }[dir] : letter, x + 5, y + 1, '#f4f0ff', { align: 'center' });
  return 10;
}
/** the d-pad with one arm lit */
function dpad(g, x, y, arm) {
  const c = '#6c6490', on = '#ffe066';
  E.px.rect(g, x + 3, y, 3, 9, c); E.px.rect(g, x, y + 3, 9, 3, c);
  const r = { Up: [3, 0, 3, 3], Down: [3, 6, 3, 3], Left: [0, 3, 3, 3], Right: [6, 3, 3, 3] }[arm];
  if (r) E.px.rect(g, x + r[0], y + r[1], r[2], r[3], on);
  return 10;
}

def('glyphSets', 'playstation', {
  face: [['cross', '#7aa7ff'], ['circle', '#ff6b6b'], ['square', '#ff86d4'], ['triangle', '#40e0b0']],
  names: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'CREATE', 'OPTIONS', 'L3', 'R3', 'Up', 'Down', 'Left', 'Right', 'PS', 'PAD'],
});
def('glyphSets', 'xbox', { letters: [['A', '#5ad65a'], ['B', '#ff5a5a'], ['X', '#5aa0ff'], ['Y', '#ffd23a']],
  names: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'VIEW', 'MENU', 'LS', 'RS', 'Up', 'Down', 'Left', 'Right', 'XBOX', 'PAD'] });
def('glyphSets', 'nintendo', { letters: [['B', '#e8e8e8'], ['A', '#e8e8e8'], ['Y', '#e8e8e8'], ['X', '#e8e8e8']],
  names: ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '-', '+', 'LS', 'RS', 'Up', 'Down', 'Left', 'Right', 'HOME', 'PAD'] });

/** the glyph family for a pad style ('playstation' | 'xbox' | 'nintendo' | 'generic') */
export const glyphSet = style => get('glyphSets', style) || get('glyphSets', 'xbox');

/** draw one code as a glyph at (x, y) (9 px tall); returns its width. style: the pad family; input: for key labels */
export function drawGlyph(g, code, x, y, style = 'playstation', input = null) {
  const set = glyphSet(style);
  let m = /^Pad(\d+)$/.exec(code);
  if (m) {
    const n = +m[1];
    if (n <= 3) {
      if (set.face) { const [shape, color] = set.face[n]; E.px.sprite(g, faceSprite(shape, color), x, y); return 10; }
      const [letter, color] = set.letters[n]; return letterDisc(g, x, y, letter, color);
    }
    if (n >= 12 && n <= 15) return dpad(g, x, y, set.names[n]);
    return pill(g, x, y, set.names[n] || ('B' + n));
  }
  if (code.includes('+')) { let w = 0; for (const [i, part] of code.split('+').entries()) { if (i) w += pill(g, x + w, y, '+', '#f4f0ff', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)') - 2; w += drawGlyph(g, part, x + w, y, style, input); } return w; }
  m = /^(LS|RS)(Up|Down|Left|Right)?$/.exec(code);
  if (m) return stickIcon(g, x, y, m[1][0], m[2]);
  if (code === 'Mouse0' || code === 'Mouse2') return pill(g, x, y, code === 'Mouse0' ? 'LMB' : 'RMB');
  const label = input && input.codeLabel ? input.codeLabel(code) : code.replace(/^Key|^Digit/, '');
  return pill(g, x, y, label.toUpperCase());
}
/** how wide drawGlyph would draw a code (layout before drawing) */
export function glyphWidth(code, style = 'playstation', input = null) {
  const set = glyphSet(style), m = /^Pad(\d+)$/.exec(code);
  if (m) { const n = +m[1]; return n <= 3 || (n >= 12 && n <= 15) ? 10 : Math.max(9, E.font.width(set.names[n] || 'B' + n) + 6) + 1; }
  if (code.includes('+')) return code.split('+').reduce((w, p, i) => w + glyphWidth(p, style, input) + (i ? Math.max(9, E.font.width('+') + 6) - 1 : 0), 0);
  if (/^(LS|RS)/.test(code)) return 10;
  const label = code === 'Mouse0' ? 'LMB' : code === 'Mouse2' ? 'RMB' : input && input.codeLabel ? input.codeLabel(code) : code.replace(/^Key|^Digit/, '');
  return Math.max(9, E.font.width(label.toUpperCase()) + 6) + 1;
}
