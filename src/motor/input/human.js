// The HumanController (PLAN.md 7.5, 8.1): the player's bindings -> a world-space Intent for the possessed actor. Sticks
// and keys are screen-relative, so they turn into world directions through the active view; everything downstream
// (peds, vehicles) reads only the Intent.
import { makeIntent, clearIntent, BUTTONS } from '../sim/intent.js';

// the actions a press can latch (Settings, ACCESS: toggle instead of hold); crouch is a toggle of the ped's own, held
// when the player asks for that instead
const LATCHED = ['sprint', 'aim'];

export class HumanController {
  /** bindings: a Bindings; views: the ViewManager (screen -> world directions); game: for the mouse. toggles: the actions
   *  the player toggles instead of holding (ui/settings.js toggled(game): sprint, aim, crouch), set by the scene */
  constructor(bindings, views, game) { this.bindings = bindings; this.views = views; this.game = game; this.intent = makeIntent(); this.toggles = new Set(['crouch']); this.latch = {}; this._ctx = null; }
  /** fill the intent for this step; context 'onFoot' | 'vehicle'; actor: the possessed one (mouse aim is relative to it) */
  update(context, actor) {
    const B = this.bindings, I = clearIntent(this.intent);
    B.setContext(context);
    for (const b of BUTTONS) if (B.codes(b).length) { I.down[b] = B.down(b); I.tap[b] = B.tap(b); }
    if (context !== this._ctx) { this.latch = {}; this._ctx = context; }   // (a latch ends with its context: into a car, the sprint is off)
    for (const b of LATCHED) if (this.toggles.has(b)) { if (I.tap[b]) this.latch[b] = !this.latch[b]; I.down[b] = !!this.latch[b]; } else this.latch[b] = false;
    if (context === 'onFoot' && !this.toggles.has('crouch') && actor && actor.crouching !== undefined) I.tap.crouch = !!I.down.crouch !== !!actor.crouching;   // (crouch held: the press and the release each flip it)
    if (context === 'vehicle') {
      const [sx] = B.stick('LS');
      I.steer = sx || ((B.down('right') ? 1 : 0) - (B.down('left') ? 1 : 0));
      I.throttle = B.value('throttle'); I.brake = B.value('brake');
    } else if (context === 'arcade') {   // (a cabinet's stick: the screen's own directions, not the ground's)
      const [mx, my] = B.direction('arcade'); I.move[0] = mx; I.move[1] = my;
    } else {
      const [mx, my] = B.direction('onFoot'), d = this.views.screenDirToGround(mx, my);
      I.move[0] = d[0]; I.move[1] = d[1];
    }
    // aim: the right stick (screen-relative) or the mouse's ground point. The right stick aims unless it turns the
    // camera: in ORIGINAL while R3 is held, in MODERN unless L2 is (at the wheel, the drive-by's ○: B.stickAims)
    const aims = B.stickAims(), rs = aims ? B.stick('RS') : [0, 0];
    if (!aims) { const [lx, ly] = B.stick('RS'); I.look[0] = lx; I.look[1] = ly; }   // (the camera's: the free camera reads it, D50)
    if (this.game.input.invertAimY) rs[1] = -rs[1];   // (Settings, Controls: invert aim)
    I.aimStick = Math.min(1, Math.hypot(rs[0], rs[1]));
    if (rs[0] || rs[1]) { const a = this.views.screenDirToGround(rs[0], rs[1]), l = Math.hypot(a[0], a[1]) || 1; I.aim = [a[0] / l, a[1] / l]; }
    else if (actor && this.game.input.aimSource === 'mouse' && this.game.input.mouse.active) {   // (the engine's own "what aims now": a key pressed meanwhile, a strafe, leaves the mouse aiming)
      const p = this.views.mouseGround();
      if (p) { const dx = p[0] - actor.x, dy = p[1] - actor.y, l = Math.hypot(dx, dy); if (l > 4) { I.aim = [dx / l, dy / l]; I.aimPoint = [p[0], p[1], p[2] || 0]; } }
    }
    return I;
  }
}
