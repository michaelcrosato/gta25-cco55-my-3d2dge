// Per-context bindings over raw device state (PLAN.md 8.1). MOTOR binds its own controls instead of switching engine
// presets: input.use() clears held buttons (ENG:706-707), the engine fixes the d-pad to the moves (FIXED_CODES), and its
// rebind conflict check spans one map. Here each context (onFoot, vehicle, menu, wheel, phone, photo) has its own map
// of action -> codes, read every step from GTM-PATCH(4)'s input.raw, so a held button survives a context switch.
//   Codes: key codes ('KeyE', 'Space', 'ShiftLeft'), 'Mouse0' / 'Mouse2', 'Pad<n>' (button n of the pad in use; 6 and 7
//   are the analog triggers), 'LS<Dir>' / 'RS<Dir>' (a stick pushed past halfway: LSUp, RSLeft...), chords
//   'Pad10+Pad11' (both within the chord window), held modifiers 'Pad11>RSLeft' (RSLeft pressed while R3 is held) and
//   release taps 'Pad11^' (R3 let go within the release window, unless it served as a modifier or a chord half).
import { E } from '../engine.js';

/** the standard gamepad layout, DualSense names: 0 ✕, 1 ○, 2 □, 3 △, 4 L1, 5 R1, 6 L2, 7 R2, 8 Create, 9 Options,
 *  10 L3, 11 R3, 12-15 d-pad up/down/left/right, 16 PS, 17 touchpad (Chromium) */
const NAV = { up: ['Pad12', 'ArrowUp', 'KeyW', 'LSUp'], down: ['Pad13', 'ArrowDown', 'KeyS', 'LSDown'], left: ['Pad14', 'ArrowLeft', 'KeyA', 'LSLeft'], right: ['Pad15', 'ArrowRight', 'KeyD', 'LSRight'] };
// R3 is the view button on release; held, a flick of the right stick turns the camera a quarter (ISO yaw, the MODE 7 rail)
const SHARED = { view: ['Pad11^', 'KeyV'], turnLeft: ['Pad11>RSLeft', 'BracketLeft'], turnRight: ['Pad11>RSRight', 'BracketRight'],
  ability: ['Pad10+Pad11', 'KeyF'], phone: ['Pad12', 'KeyT'], switch: ['Pad13', 'KeyZ'], map: ['Pad17', 'KeyM', 'Tab'], pause: ['Pad9', 'Escape'], photo: ['Pad8', 'KeyB'] };
export const DEFAULT_BINDINGS = {
  onFoot: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    sprint: ['Pad0', 'ShiftLeft', 'ShiftRight'], jump: ['Pad2', 'Space'], roll: ['Pad1', 'KeyX'], interact: ['Pad3', 'KeyE'],
    reload: ['Pad5', 'KeyR'], wheel: ['Pad4', 'KeyQ'], aim: ['Pad6', 'Mouse2'], attack: ['Pad7', 'Mouse0'], crouch: ['Pad10', 'KeyC'],
    weaponPrev: ['Pad14'], weaponNext: ['Pad15'], ...SHARED },
  vehicle: { left: ['KeyA'], right: ['KeyD'], throttle: ['Pad7', 'KeyW'], brake: ['Pad6', 'KeyS'], handbrake: ['Pad5', 'Space'],
    nitro: ['Pad4', 'ShiftLeft'], fire: ['Pad1', 'Mouse0'], horn: ['Pad0', 'KeyH'], interact: ['Pad3', 'KeyE'],
    radioPrev: ['Pad14', 'Comma'], radioNext: ['Pad15', 'Period'], ...SHARED },
  menu: { ...NAV, confirm: ['Pad0', 'Enter', 'Space'], back: ['Pad1', 'Escape', 'Backspace'], tabPrev: ['Pad4', 'KeyQ'], tabNext: ['Pad5', 'KeyE'],
    secondary: ['Pad3'], tertiary: ['Pad2'], close: ['Pad9'] },
  wheel: { ...NAV, wheel: ['Pad4', 'KeyQ'], confirm: ['Pad0', 'Enter'], back: ['Pad1', 'Escape'] },
  phone: { ...NAV, confirm: ['Pad0', 'Enter', 'Space'], back: ['Pad1', 'Escape', 'Backspace', 'KeyT'] },
  photo: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], zoomIn: ['Pad7', 'KeyE'], zoomOut: ['Pad6', 'KeyQ'],
    view: ['Pad11^', 'KeyV'], snap: ['Pad0', 'Space', 'Enter'], back: ['Pad1', 'Escape', 'Pad8', 'KeyB'] },
};
/** codes that may not be rebound: the menus and the browser keep them (the engine's BINDABLE rule, ENG:1047) */
const LOCKED = /^(Escape|Enter|F\d+|Pad9|Pad16|Meta|Control|Alt)/;
const KEY = 'GrandTheftMoto-5S:bindings';
const TRIGGER = .35, STICK = .5;

export class Bindings {
  /** input: the engine's game.input (GTM-PATCH(4) gives it .raw) */
  constructor(input, saved = null) {
    this.input = input; this.context = 'onFoot'; this.chordWindow = .12; this.releaseWindow = .5;
    this.map = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
    if (saved) this._overlay(saved);
    this._down = new Set(); this._prev = new Set(); this._pressAt = {}; this._pending = []; this._taps = new Set(); this._chorded = new Set(); this.t = 0;
    this._combos = new Set(); this._released = new Set(); this._modded = new Set();   // this step's modifier taps and release taps; modifiers spent this hold
  }
  _overlay(saved) { for (const [c, acts] of Object.entries(saved || {})) if (this.map[c]) for (const [a, codes] of Object.entries(acts)) if (Array.isArray(codes)) this.map[c][a] = codes.slice(); this._ver = (this._ver || 0) + 1; }
  // what update reads of the map, worked out again only when the map changes (rebind, reset, a saved overlay): every
  // code a binding uses, its held-modifier combos [a, b, code] and chords [a, b, code], and the chords' halves
  _derive() {
    const D = this._dv; if (D && D.ver === this._ver && D.map === this.map) return D;
    const codes = new Set(), combos = [], chords = [], half = new Set();
    for (const c of Object.values(this.map)) for (const list of Object.values(c)) for (const code of list) {
      for (const p of code.replace(/\^$/, '').split(/[+>]/)) codes.add(p);
      if (code.includes('>')) { const [a, b] = code.split('>'); combos.push([a, b, code]); }
      if (code.includes('+')) { const [a, b] = code.split('+'); chords.push([a, b, code]); half.add(a); half.add(b); }
    }
    const kinds = [...codes].map(c => [c, /^(Pad|LS|RS)/.test(c) ? 1 : 0]);   // (0: a key or mouse button, read as held or pressed)
    return (this._dv = { ver: this._ver, map: this.map, codes: [...codes], kinds, combos, chords, half });
  }
  /** the pad in use, raw ({ buttons, axes }) or null */
  pad() { const R = this.input.raw; return (R && (R.pads.find(p => p.index === R.active) || R.pads[0])) || null; }
  /** a stick [x, y] after the radial dead zone: 'LS' or 'RS' */
  stick(which) {
    const p = this.pad(); if (!p) return [0, 0];
    const i = which === 'RS' ? 2 : 0, x = p.axes[i] || 0, y = p.axes[i + 1] || 0, l = Math.hypot(x, y), d = E.clamp(this.input.deadzone, 0, .8);
    if (l <= d) return [0, 0];
    const k = Math.min(1, (l - d) / (1 - d)) / l; return [x * k, y * k];
  }
  /** a code's analog value 0..1 (triggers and sticks; keys and buttons are 0 or 1) */
  codeValue(c) {
    if (c.includes('+')) return c.split('+').every(p => this.codeValue(p) > 0) ? 1 : 0;
    const I = this.input;
    if (c.startsWith('Pad')) { const n = +c.slice(3), b = this.pad()?.buttons[n]; const v = b ? (b.value > 0 ? b.value : b.pressed ? 1 : 0) : 0; return Math.max(v, I.held.has(c) ? 1 : 0); }   // (a trigger's travel as it is: browsers call it pressed from about an eighth of the way, and a pad that reports no value has its press)
    const m = /^(LS|RS)(Up|Down|Left|Right)$/.exec(c);
    if (m) { const [x, y] = this.stick(m[1]), v = { Up: -y, Down: y, Left: -x, Right: x }[m[2]]; return Math.max(0, v); }
    // held now, or pressed since the step before (a tap shorter than a step still counts once: GTM-PATCH(4) raw.pressed)
    return (I.held.has(c) || (I.raw && (I.raw.keys.has(c) || (I.raw.pressed && I.raw.pressed.has(c))))) ? 1 : 0;
  }
  /** is a code held (a trigger past a third, a stick past halfway)? */
  codeDown(c) { const v = this.codeValue(c); return /^(LS|RS)/.test(c) ? v > STICK : c === 'Pad6' || c === 'Pad7' ? v > TRIGGER : v > 0; }
  // a key or mouse button: held now, or pressed since the step before (codeValue's last line, without its parsing)
  _keyDown(c) { const I = this.input, R = I.raw; return I.held.has(c) || (!!R && (R.keys.has(c) || (!!R.pressed && R.pressed.has(c)))); }
  /** which context's actions are live: 'onFoot' | 'vehicle' | 'menu' | 'wheel' | 'phone' | 'photo' (held buttons carry over) */
  setContext(c) { if (!this.map[c]) throw new Error('MOTOR: unknown input context ' + c); this.context = c; }
  /** read the devices: call once per step, before any controller reads an action */
  update(dt) {
    this.t += dt; const prev = this._prev; this._prev = this._down; this._down = prev; this._down.clear(); this._taps.clear();
    const D = this._derive();
    for (const [c, kind] of D.kinds) if (kind === 0 ? this._keyDown(c) : this.codeDown(c)) this._down.add(c);
    for (const c of this._down) if (!this._prev.has(c)) this._pressAt[c] = this.t;
    // held modifiers: 'A>B' taps when B goes down while A is held (A is then spent: its release tap won't fire)
    this._combos.clear(); this._released.clear();
    for (const [a, b, code] of D.combos) if (this._down.has(a) && this._down.has(b) && !this._prev.has(b)) { this._combos.add(code); this._modded.add(a); }
    // release taps: let go within the release window, unless the button was spent as a modifier or a chord half
    for (const c of this._prev) if (!this._down.has(c)) {
      if (!this._modded.has(c) && !this._chorded.has(c) && this.t - (this._pressAt[c] ?? -9) <= this.releaseWindow + 1e-9) this._released.add(c);
      this._modded.delete(c);
    }
    // chords: both halves pressed within the window; a chord's halves don't also fire their own taps
    const fresh = c => this._down.has(c) && !this._prev.has(c);
    for (const [a, b, code] of D.chords) {
      if ((fresh(a) || fresh(b)) && this._down.has(a) && this._down.has(b) && Math.abs((this._pressAt[a] ?? -9) - (this._pressAt[b] ?? -9)) <= this.chordWindow) {
        this._taps.add(code); this._pending = this._pending.filter(p => p.code !== a && p.code !== b);
        this._chorded.add(a); this._chorded.add(b);   // the halves are spent until they are let go
      }
    }
    for (const c of this._chorded) if (!this._down.has(c)) this._chorded.delete(c);
    // a chord half's own tap waits out the chord window, then fires if the chord didn't
    for (const c of this._down) if (!this._prev.has(c) && !this._chorded.has(c)) { if (D.half.has(c)) this._pending.push({ code: c, at: this.t }); else this._taps.add(c); }
    this._pending = this._pending.filter(p => { if (this.t - p.at >= this.chordWindow) { this._taps.add(p.code); return false; } return true; });
  }
  /** the codes bound to an action in the live context (or the one named) */
  codes(action, ctx = this.context) { return (this.map[ctx] && this.map[ctx][action]) || []; }
  /** is the action held? */
  down(action, ctx) { return this.codes(action, ctx).some(c => /[+>]/.test(c) ? c.split(/[+>]/).every(p => this._down.has(p)) : this._down.has(c.replace(/\^$/, ''))); }
  /** was the action pressed this step? (a chord half waits out the chord window first; a release tap fires as it is
   *  let go; a held modifier's combo as its second code goes down) */
  tap(action, ctx) { return this.codes(action, ctx).some(c => c.endsWith('^') ? this._released.has(c.slice(0, -1)) : c.includes('>') ? this._combos.has(c) : this._taps.has(c)); }
  /** is a held modifier of the live context down (its second codes, the right stick for one, aren't free for aiming)? */
  modifierHeld(ctx = this.context) { return Object.values(this.map[ctx] || {}).some(list => list.some(c => c.includes('>') && this._down.has(c.split('>')[0]))); }
  /** the action's analog value 0..1 (the strongest of its codes) */
  value(action, ctx) { let v = 0; for (const c of this.codes(action, ctx)) v = Math.max(v, c.includes('>') ? (this._down.has(c.split('>')[0]) ? this.codeValue(c.split('>')[1]) : 0) : this.codeValue(c.replace(/\^$/, ''))); return v; }
  /** a direction from four actions (up/down/left/right) plus a stick: screen x right, y down, length <= 1 */
  direction(ctx = this.context, stick = 'LS') {
    let [x, y] = this.stick(stick);
    if (!x && !y) { x = (this.down('right', ctx) ? 1 : 0) - (this.down('left', ctx) ? 1 : 0); y = (this.down('down', ctx) ? 1 : 0) - (this.down('up', ctx) ? 1 : 0); }
    const l = Math.hypot(x, y); return l > 1 ? [x / l, y / l] : [x, y];
  }
  /** bind code to action in a context; refuses locked codes and a code another action of that context uses */
  rebind(ctx, action, code, slot = null) {
    if (LOCKED.test(code)) return { ok: false, reason: 'locked', code };
    const c = this.map[ctx]; if (!c || !c[action]) return { ok: false, reason: 'unknown' };
    for (const [a, list] of Object.entries(c)) if (a !== action && list.includes(code)) return { ok: false, reason: 'conflict', with: a };
    const list = c[action].slice(); if (slot === null || slot >= list.length) list.push(code); else list[slot] = code;
    c[action] = list; this._ver = (this._ver || 0) + 1; return { ok: true };
  }
  /** back to the defaults (one context, or all) */
  reset(ctx = null) { const d = JSON.parse(JSON.stringify(DEFAULT_BINDINGS)); if (ctx) this.map[ctx] = d[ctx]; else this.map = d; this._ver = (this._ver || 0) + 1; }
  /** the player's changes, saved apart from the engine's bindings */
  save() { E.store.set(KEY, this.map); }
  static load(input) { return new Bindings(input, E.store.get(KEY, null)); }
}
