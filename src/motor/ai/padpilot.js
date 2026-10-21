// The pad pilot (PLAN.md 8.15's "scripted human-style pass"): it turns an Intent someone wants (the mission bot's) into
// a gamepad's state for the next step, so the game reads it the way it reads a player: through the bindings (the
// player's own codes for each action), the HumanController's camera-relative sticks and their dead zone, presses and
// releases (a tap is a fresh press, never a held button), triggers by their travel. Nothing reaches the simulation but
// the pad: whatever passes this way, a player holding a DualSense could do.
//   const P = new PadPilot(pad, bindings, views, input);  after each step: P.write(I, 'onFoot' | 'vehicle', actor)
import { BUTTONS } from '../sim/intent.js';

export class PadPilot {
  /** pad: a gamepad object the game reads (navigator.getGamepads's); bindings, views, input: the app's */
  constructor(pad, bindings, views, input) { this.pad = pad; this.B = bindings; this.views = views; this.input = input; this.tapped = new Set(); this.presses = 0; }
  // a stick's push for a wanted output after the radial dead zone (the Bindings' stick() undone)
  _stick(x, y) {
    const l = Math.hypot(x, y); if (l < 1e-3) return [0, 0];
    const d = Math.min(.8, Math.max(0, this.input.deadzone || 0)), want = Math.min(1, l), push = d + want * (1 - d);
    return [x / l * push, y / l * push];
  }
  // a world direction as the stick's, through the active view (the push the HumanController reads back as it)
  _screen(dx, dy) { const s = this.views.groundDirToScreen(dx, dy), l = Math.hypot(s[0], s[1]); return l ? [s[0] / l, s[1] / l] : [0, 0]; }
  /** the pad for the next step, from the Intent wanted in a context, for the actor at the stick's centre */
  write(I, context, actor) {
    const P = this.pad; for (const b of P.buttons) { b.pressed = false; b.value = 0; } for (let i = 0; i < P.axes.length; i++) P.axes[i] = 0;
    const press = (n, v = 1) => { const b = P.buttons[n]; if (!b) return; b.value = Math.max(b.value, v); b.pressed = b.value > .5; };
    const pads = action => this.B.codes(action, context).filter(c => /^Pad\d/.test(c));
    const tapped = new Set();
    for (const b of BUTTONS) {
      if (!I.down[b] && !I.tap[b]) continue;
      if (I.tap[b] && this.tapped.has(b)) continue;   // (pressed by a tap last step: let go now, so the next press is a fresh one)
      for (const code of pads(b)) {
        if (code.includes('>') || code.endsWith('^')) continue;   // (the camera's modifiers and release taps: not the bot's)
        for (const part of code.split('+')) press(+part.slice(3));
        break;
      }
      if (I.tap[b]) { tapped.add(b); this.presses++; }
    }
    this.tapped = tapped;
    if (context === 'vehicle') {
      const [sx] = this._stick(I.steer || 0, 0); P.axes[0] = sx;
      for (const code of pads('throttle')) { press(+code.slice(3), I.throttle || 0); break; }
      for (const code of pads('brake')) { press(+code.slice(3), I.brake || 0); break; }
    } else {
      const m = I.move, l = Math.hypot(m[0], m[1]); if (l > 1e-3) { const s = this._screen(m[0], m[1]), [x, y] = this._stick(s[0] * l, s[1] * l); P.axes[0] = x; P.axes[1] = y; }
    }
    let ax = null; if (I.aimPoint && actor) ax = [I.aimPoint[0] - actor.x, I.aimPoint[1] - actor.y]; else if (I.aim) ax = I.aim;
    if (ax && Math.hypot(ax[0], ax[1]) > 1e-3) { const s = this._screen(ax[0], ax[1]), [x, y] = this._stick(s[0], s[1]); P.axes[2] = x; P.axes[3] = y; }
    P.timestamp = (P.timestamp || 0) + 1;
    return P;
  }
}
