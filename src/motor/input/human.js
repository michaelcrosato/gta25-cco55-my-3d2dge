// The HumanController (PLAN.md 7.5, 8.1): the player's bindings -> a world-space Intent for the possessed actor. Sticks
// and keys are screen-relative, so they turn into world directions through the active view; everything downstream
// (peds, vehicles) reads only the Intent.
import { makeIntent, clearIntent, BUTTONS } from '../sim/intent.js';

export class HumanController {
  /** bindings: a Bindings; views: the ViewManager (screen -> world directions); game: for the mouse */
  constructor(bindings, views, game) { this.bindings = bindings; this.views = views; this.game = game; this.intent = makeIntent(); }
  /** fill the intent for this step; context 'onFoot' | 'vehicle'; actor: the possessed one (mouse aim is relative to it) */
  update(context, actor) {
    const B = this.bindings, I = clearIntent(this.intent);
    B.setContext(context);
    for (const b of BUTTONS) if (B.codes(b).length) { I.down[b] = B.down(b); I.tap[b] = B.tap(b); }
    if (context === 'vehicle') {
      const [sx] = B.stick('LS');
      I.steer = sx || ((B.down('right') ? 1 : 0) - (B.down('left') ? 1 : 0));
      I.throttle = B.value('throttle'); I.brake = B.value('brake');
    } else {
      const [mx, my] = B.direction('onFoot'), d = this.views.screenDirToGround(mx, my);
      I.move[0] = d[0]; I.move[1] = d[1];
    }
    // aim: the right stick (screen-relative) or the mouse's ground point
    const rs = B.modifierHeld() ? [0, 0] : B.stick('RS');   // (R3 held: the stick turns the camera instead)
    I.aimStick = Math.min(1, Math.hypot(rs[0], rs[1]));
    if (rs[0] || rs[1]) { const a = this.views.screenDirToGround(rs[0], rs[1]), l = Math.hypot(a[0], a[1]) || 1; I.aim = [a[0] / l, a[1] / l]; }
    else if (actor && this.game.input.lastDevice === 'mouse' && this.game.input.mouse.active) {
      const p = this.views.mouseGround();
      if (p) { const dx = p[0] - actor.x, dy = p[1] - actor.y, l = Math.hypot(dx, dy); if (l > 4) { I.aim = [dx / l, dy / l]; I.aimPoint = [p[0], p[1], p[2] || 0]; } }
    }
    return I;
  }
}
