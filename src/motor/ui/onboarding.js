// Onboarding (PLAN.md 8.18): a hint the first time each verb becomes possible ("{onFoot:interact} GETS YOU INTO ANY
// CAR"), in the player's own glyphs, in a box at the top left under the location line; one at a time, each for
// TUNE.tipTime seconds, never again once shown (kept in the player's settings: game.settings.tipsSeen). A game lists
// its verbs; each step it says what the player can do now. Presentation only: the simulation never reads it, and the
// bot gets none.
//   const tips = new Onboarding(game, [{ id, text, when(ctx) }]);  each step tips.update(dt, ctx)  ·  each frame tips.draw(pen, x, y)
import { knob, TUNE } from '../core/tune.js';
import { UI } from './tenfoot.js';

knob('UI', 'tipTime', 'Onboarding hint time', 6, 2, 20, .5, 'Seconds a first-time hint stays up');

export class Onboarding {
  constructor(game, verbs) { this.game = game; this.verbs = verbs; this.now = null; this.t = 0; this.queue = []; this._seen = null; }
  /** the hints shown already (the player's settings: kept between visits) */
  get seen() {
    if (!this._seen) { const S = this.game.settings; if (S && S.define && !S.spec('tipsSeen')) S.define({ key: 'tipsSeen', group: 'Hidden', type: 'value', value: () => [] }); this._seen = new Set(Array.isArray(S && S.tipsSeen) ? S.tipsSeen : []); }
    return this._seen;
  }
  _mark(id) { this.seen.add(id); const S = this.game.settings; if (S && S.set && S.spec('tipsSeen')) S.set('tipsSeen', [...this.seen]); }
  /** each step: ctx is the game's own (what the player can do now; ctx.off: no hints, the bot plays) */
  update(dt, ctx) {
    if (ctx.off) { this.now = null; return; }
    for (const v of this.verbs) if (!this.seen.has(v.id) && !this.queue.includes(v) && this.now !== v && v.when(ctx)) this.queue.push(v);
    if (this.now) { this.t += dt; if (this.t >= TUNE.tipTime) this.now = null; }
    if (!this.now && this.queue.length) { this.now = this.queue.shift(); this.t = 0; this._mark(this.now.id); }
  }
  /** the width of the hint's box (0: none showing): what stands beside it at its height makes way */
  width(P) { return this.now ? P.promptWidth(this.now.text) + 16 : 0; }
  /** the hint showing, in a box from (x, y) */
  draw(P, x, y) {
    const v = this.now; if (!v) return;
    const a = Math.min(1, this.t * 4, (TUNE.tipTime - this.t) * 2), w = P.promptWidth(v.text) + 16;
    P.g.globalAlpha = Math.max(0, a); P.panel(x, y, w, 19, { kind: 'tip', bg: ['#1c1a34', '#0e0c1c'], border: UI.cyan }); P.prompt(v.text, x + 8, y + 6, { color: UI.ink }); P.g.globalAlpha = 1;
  }
}
