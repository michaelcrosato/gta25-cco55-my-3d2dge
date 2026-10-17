// Prompts with glyph tokens (PLAN.md 8.18): "{interact} Steal" shows the interact action's button for the device in
// use (a DualSense △, an Xbox Y, the E key), in the live context or the one named: "{vehicle:handbrake} Drift".
import { E } from '../engine.js';
import { drawGlyph, glyphWidth } from './glyphs.js';

/** the code to show for an action on a device family: 'pad' codes for a gamepad, keys and mouse otherwise */
export function codeFor(bindings, action, device, ctx) {
  const codes = bindings.codes(action, ctx), pad = device === 'gamepad';
  return codes.find(c => pad ? /^(Pad|LS|RS)/.test(c) : !/^(Pad|LS|RS)/.test(c)) || codes[0] || null;
}
/** split a prompt into text and glyph parts */
export function parsePrompt(text, bindings, device) {
  const out = [];
  for (const part of String(text).split(/(\{[^}]+\})/)) {
    if (!part) continue;
    const m = /^\{(?:([a-zA-Z]+):)?([a-zA-Z]+)\}$/.exec(part);
    if (m) { const code = codeFor(bindings, m[2], device, m[1] || undefined); out.push(code ? { code } : { text: '?' }); }
    else out.push({ text: part });
  }
  return out;
}
/** the device whose glyphs to show, and its pad family */
export function deviceOf(input) { return { device: input.lastDevice === 'gamepad' ? 'gamepad' : 'keyboard', style: input.padStyle ? input.padStyle() : 'xbox' }; }
/** the width of a prompt at scale 1 */
export function promptWidth(text, bindings, input) {
  const { device, style } = deviceOf(input);
  return parsePrompt(text, bindings, device).reduce((w, p) => w + (p.code ? glyphWidth(p.code, style, input) + 1 : E.font.width(p.text)), 0);
}
/** draw a prompt at (x, y); align 'left' | 'center' | 'right'; returns its width */
export function drawPrompt(g, text, x, y, bindings, input, o = {}) {
  const { device, style } = deviceOf(input), parts = parsePrompt(text, bindings, device);
  const w = promptWidth(text, bindings, input);
  let cx = o.align === 'center' ? Math.round(x - w / 2) : o.align === 'right' ? x - w : x;
  for (const p of parts) {
    if (p.code) cx += drawGlyph(g, p.code, cx, y - 1, style, input) + 1;
    else { E.font.text(g, p.text, cx, y, o.color || '#ffffff', { shadow: o.shadow === undefined ? '#000' : o.shadow }); cx += E.font.width(p.text); }
  }
  return w;
}
