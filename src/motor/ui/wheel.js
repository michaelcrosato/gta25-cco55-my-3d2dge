// The radial wheel (PLAN.md 8.11, 8.18): the weapon wheel (hold L1) and the character wheel (hold d-pad down) are one
// component. Ten-foot and controller-first: big slots round a ring, the left stick (or WASD, or the mouse) points at one,
// and letting go of the button that opened it picks it; d-pad and arrow taps step round it. The game slows while it is
// open (TUNE.wheelSlow, the scene applies it) and the slot under the stick shows its name and detail in the middle.
//   wheel.show(items, selectedIndex)  ·  wheel.update(dt, { dir: [x, y], step: -1 | 0 | 1 })  ·  wheel.draw(g, W, H)
//   item: { id, label, sub, color, disabled, angle (its own place on the ring), icon(g, x, y, r, selected) }
import { E } from '../engine.js';
import { knob } from '../core/tune.js';

knob('UI', 'wheelSlow', 'Wheel slow motion', .3, .05, 1, .05, 'The game\'s speed while a wheel is open (GTA V: about a third)');
knob('UI', 'wheelHold', 'Wheel hold', .14, 0, .5, .02, 'Seconds the wheel button is held before the wheel opens (a quick tap does nothing)');

export class Wheel {
  constructor(o = {}) { this.title = o.title || ''; this.items = []; this.sel = 0; this.open = false; this.t = 0; this._dirSel = -1; }
  /** open with these items; sel: the one selected first (the weapon in hand) */
  show(items, sel = 0, title = this.title) { this.items = items; this.sel = Math.max(0, Math.min(items.length - 1, sel)); this.open = true; this.t = 0; this.title = title; return this; }
  /** close; returns the item picked (null when it was empty or disabled) */
  hide() { this.open = false; const it = this.items[this.sel]; return it && !it.disabled ? it : null; }
  get current() { return this.items[this.sel] || null; }
  /** the angle of slot i: its own (item.angle, radians: 0 right, -PI/2 up), or round from the top, clockwise */
  angle(i) { const a = this.items[i] && this.items[i].angle; return a !== undefined ? a : -Math.PI / 2 + i / this.items.length * Math.PI * 2; }
  /** step: dir [x, y] (screen: the stick, or the mouse from the wheel's centre, pushed past half to count); step: -1 or
   *  1 to move a slot round */
  update(dt, o = {}) {
    if (!this.open) return;
    this.t += dt; const n = this.items.length; if (!n) return;
    const [x, y] = o.dir || [0, 0];
    if (Math.hypot(x, y) > .5) {
      const a = Math.atan2(y, x); let best = 0, bd = Infinity;
      for (let i = 0; i < n; i++) { const d = Math.abs(Math.atan2(Math.sin(a - this.angle(i)), Math.cos(a - this.angle(i)))); if (d < bd) { bd = d; best = i; } }
      this.sel = best;
    } else if (o.step) this.sel = (this.sel + o.step + n) % n;
  }
  /** draw into the HUD overlay of a W x H screen: a dimmed frame, the ring of slots and the selected one's name */
  draw(g, W, H) {
    if (!this.open) return;
    const n = this.items.length, cx = W / 2, cy = H / 2 + 4, R = Math.min(W, H) * .34, sr = Math.max(16, Math.min(28, R * 2.6 / Math.max(n, 3))), k = Math.min(1, this.t / .08);
    g.save(); g.globalAlpha = .55 * k; g.fillStyle = '#05030c'; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    E.px.disc(g, cx, cy, R + sr + 6, '#100c1c'); E.px.disc(g, cx, cy, R - sr - 4, '#1a1428');
    for (let i = 0; i < n; i++) {
      const it = this.items[i], a = this.angle(i), x = cx + Math.cos(a) * R * k, y = cy + Math.sin(a) * R * k, on = i === this.sel, r = on ? sr + 3 : sr;
      E.px.disc(g, x, y, r + 2, on ? (it.color || '#ffe066') : '#3a3450');
      E.px.disc(g, x, y, r, it.disabled ? '#16121e' : on ? '#2e2440' : '#221c30');
      if (it.icon && !it.disabled) it.icon(g, x, y, r, on);
      else E.font.text(g, (it.short || it.label || '').toUpperCase(), x, y - 3, it.disabled ? '#4a4060' : '#e8e0ff', { align: 'center', font: 'tiny', outline: false });
    }
    const it = this.current;
    if (this.title) E.font.text(g, this.title, cx, cy + 18, '#8a80a8', { align: 'center', font: 'tiny', outline: '#05030c' });
    if (it) {
      E.font.text(g, (it.label || '').toUpperCase(), cx, cy - 10, it.disabled ? '#6a6080' : (it.color || '#ffe066'), { align: 'center', scale: 1, outline: '#05030c' });
      if (it.sub) E.font.text(g, it.sub, cx, cy + 3, '#d8d0f0', { align: 'center', outline: '#05030c' });
      else if (it.disabled) E.font.text(g, 'EMPTY', cx, cy + 3, '#6a6080', { align: 'center', font: 'tiny', outline: '#05030c' });
    }
    g.restore(); g._c = null;
  }
}
