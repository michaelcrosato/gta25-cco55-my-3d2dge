// The view manager: owns which view is active. ISO is the engine's own view; MOTOR's depth views (top, side7: M7) plug
// in with addView. It wraps this game instance's setView, so the engine's tools that cycle game.views through setView
// (vendor/my-3d2dge/tools/check.mjs:77-79) exercise every view, and the simulation never reads any of it.
import { E } from '../engine.js';

export class ViewManager {
  /** game: the E.Game; base: the engine view MOTOR draws ISO with */
  constructor(game, base = 'iso') {
    this.game = game; this.views = new Map(); this.active = base; this.listeners = [];
    const engineSetView = game.setView.bind(game);
    this.views.set(base, { id: base, label: 'ISO', engine: true });
    game.views = [base];
    // route ids MOTOR owns to their renderer; engine ids go to the engine
    game.setView = id => {
      const key = typeof id === 'string' ? id : id && id.id;
      const v = this.views.get(key);
      if (v && !v.engine) { this.active = key; this._notify(); return game; }
      this.active = key || this.active; engineSetView(id); this._notify(); return game;
    };
  }
  /** add a MOTOR view: { id, label, enter(), exit(), draw(r) } */
  addView(spec) { this.views.set(spec.id, spec); if (!this.game.views.includes(spec.id)) this.game.views.push(spec.id); return spec; }
  /** the active view's spec */
  get spec() { return this.views.get(this.active); }
  /** cycle to the next view in game.views */
  next() { const ids = this.game.views, i = ids.indexOf(this.active); this.game.setView(ids[(i + 1) % ids.length]); return this.active; }
  onChange(fn) { this.listeners.push(fn); }
  _notify() { for (const fn of this.listeners) fn(this.active); }
}
export { E };
