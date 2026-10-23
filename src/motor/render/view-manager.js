// The view manager (PLAN.md 8.2, 5.5): owns which view is active. ISO is the engine's own view; MOTOR's depth views (top,
// side7) plug in with addView. It wraps this game instance's setView, so the engine's tools that cycle game.views through
// setView (vendor/my-3d2dge/tools/check.mjs:77-79) exercise every view, and the simulation never reads any of it.
//   - memory (TUNE camMemory): the last view the player chose on foot and the last in a vehicle, each its own; getting
//     in or out brings that one back (both start as the view the scene opened in: a deep link's stays until changed);
//   - Auto (TUNE camAuto): ISO on foot, TOP-DOWN at speed in a vehicle and ISO again below it; the player's own switch
//     holds until they get in or out;
//   - each switch is seen as the last frame dissolving into the new view (the Stage's crossfade, render/crossfade.js).
//   views.context('foot' | 'vehicle', speed01) each step from the scene;  views.next(): the player's R3 / V
import { E } from '../engine.js';
import { BUS } from '../core/bus.js';
import { TUNE, knob } from '../core/tune.js';

knob('Camera', 'camMemory', 'Remember views', 1, 0, 1, 1, 'The last view on foot and the last in a vehicle kept apart, each back on getting out or in (1); one view for both (0)');
knob('Camera', 'camAuto', 'Auto view', 0, 0, 1, 1, 'The view picked by itself (1): ISO on foot, TOP-DOWN at speed in a vehicle');
const AUTO_UP = .55, AUTO_DOWN = .3;   // (shares of top speed: Auto goes up to TOP-DOWN past the first, back below the second)

export class ViewManager {
  /** game: the E.Game; base: the engine view MOTOR draws ISO with */
  constructor(game, base = 'iso') {
    this.game = game; this.views = new Map(); this.active = base; this.base = base; this.listeners = [];
    this.ctx = null; this.mem = { foot: base, vehicle: base }; this.held = false; this.fast = false;
    const engineSetView = game.setView.bind(game);
    this.views.set(base, { id: base, label: 'ISO', engine: true });
    game.views = [base];
    // route ids MOTOR owns to their renderer; engine ids go to the engine
    game.setView = id => {
      const key = typeof id === 'string' ? id : id && id.id;
      const v = this.views.get(key), prev = this.active;
      if (v && !v.engine) { this.active = key; this._notify(prev); return game; }
      this.active = key || this.active; engineSetView(id); this._notify(prev); return game;
    };
  }
  /** add a MOTOR view: { id, label, enter(), exit(), draw(r) } */
  addView(spec) { this.views.set(spec.id, spec); if (!this.game.views.includes(spec.id)) this.game.views.push(spec.id); return spec; }
  /** the active view's spec */
  get spec() { return this.views.get(this.active); }
  /** a direction pushed on screen (x right, y down) -> a world ground direction, through the active view */
  screenDirToGround(dx, dy) { const v = this.spec; return v && v.screenDirToGround ? v.screenDirToGround(dx, dy) : this.game.view.screenDirToGround(dx, dy); }
  /** a world offset (x, y, z) as a screen offset [x, y] in the active view, linear and camera-free: the lock-on's cone
   *  is judged on screen (PLAN.md 8.12) without reading the frame being drawn (ISO: the engine view's axes; TOP:
   *  north up; MODE 7: the rail's) */
  screenVec(x, y, z = 0) {
    const s = this.spec; if (s && s.screenVec) return s.screenVec(x, y, z);
    const v = this.game.view; return v && v.ax !== undefined ? [v.ax * x + v.ay * y, v.bx * x + v.by * y + v.bz * z] : [x, y - z];
  }
  /** the screen direction (a stick's push) the active view reads as the ground direction (x, y): screenDirToGround's
   *  inverse (ISO's and TOP's are their screenVec; MODE 7's leaves out the squash its screenVec gives the depth) */
  groundDirToScreen(x, y) { const s = this.spec; return s && s.groundDirToScreen ? s.groundDirToScreen(x, y) : this.screenVec(x, y, 0); }
  /** the ground point under the mouse in the active view, or null */
  mouseGround() { const v = this.spec; return v && v.mouseGround ? v.mouseGround() : this.game.mouseGround(); }
  /** the player's switch (R3 / V): the next view in game.views, remembered for where they are (on foot, in a vehicle) */
  next() {
    const ids = this.game.views, i = ids.indexOf(this.active); this.game.setView(ids[(i + 1) % ids.length]);
    this.mem[this.ctx || 'foot'] = this.active; this.held = true; return this.active;
  }
  /** each step from the scene: where the player is ('foot' | 'vehicle') and how fast (0..1 of top speed). Getting in or
   *  out brings that place's remembered view back (TUNE.camMemory); Auto (TUNE.camAuto) picks one by itself */
  context(ctx, speed01 = 0) {
    if (ctx !== this.ctx) {
      const first = this.ctx === null; this.ctx = ctx; this.held = false; this.fast = false;
      if (first) this.mem.foot = this.mem.vehicle = this.active;
      if (!first && !TUNE.camAuto && TUNE.camMemory && this.mem[ctx] !== this.active && this.views.has(this.mem[ctx])) this.game.setView(this.mem[ctx]);
    }
    if (!TUNE.camAuto || this.held) return;
    this.fast = ctx === 'vehicle' && (speed01 > AUTO_UP || (this.fast && speed01 > AUTO_DOWN));
    const want = this.fast && this.views.has('top') ? 'top' : this.base;
    if (want !== this.active) this.game.setView(want);
  }
  onChange(fn) { this.listeners.push(fn); }
  _notify(prev) { for (const fn of this.listeners) fn(this.active, prev); if (prev !== this.active) BUS.emit('view', { view: this.active, prev }); }
}
export { E };
