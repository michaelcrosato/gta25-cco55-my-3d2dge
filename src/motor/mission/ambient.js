// Random events (PLAN.md 9.5): activities of kind 'event' (a purse snatcher, a stalled car, a shoot-out in progress, a
// police chase passing) that happen near the player in free roam. Every TUNE.eventEvery seconds with no job running
// and the player outdoors, the next event in turn whose where(W, player) finds a spot for it starts in a runtime of its
// own (the BUS scope 'event'); it ends by its own stages (passed: its reward; failed: quietly), or when the player
// leaves it TUNE.eventLeave behind for 10 s, or a job starts (a card up, the phone or a shop's, holds off the next one
// and leaves a running one be). Its spot is m.data.at.
//   const A = new AmbientEvents({ world: () => W, save });  each step: A.update(dt, { free, hold, player })  ·  A.R: its runtime
import { all } from '../core/registry.js';
import { TUNE, knob } from '../core/tune.js';
import { MissionRuntime } from './runtime.js';

knob('Random events', 'eventEvery', 'An event every', 150, 20, 1200, 5, 'Seconds of free roam between random events');
knob('Random events', 'eventLeave', 'Left behind at', 900, 200, 3000, 50, 'How far the player can leave a random event before it ends (u)');

export class AmbientEvents {
  /** o: { world() -> W, save, onEnd(result) } */
  constructor(o) { this.world = o.world; this.R = new MissionRuntime({ world: o.world, save: o.save, scope: 'event', onEnd: o.onEnd }); this.t = TUNE.eventEvery * .5; this.next = 0; this.far = 0; }
  get active() { return this.R.active; }
  /** one step. ctx: { free (no job running, outdoors), hold (a card up: no new event), player (the possessed ped) } */
  update(dt, ctx) {
    const R = this.R, P = ctx.player;
    if (R.active) {
      if (!ctx.free) { R.quit('busy'); return; }
      if (R.state === 'failed') { R.quit('failed'); return; }   // (a random event isn't retried)
      const at = R.data.at; this.far = at && P && Math.hypot(at[0] - P.x, at[1] - P.y) > TUNE.eventLeave ? this.far + dt : 0;
      if (this.far > 10) { R.quit('left'); return; }
      R.update(dt); return;
    }
    if (R.state === 'passed') R.done();
    if (!ctx.free || ctx.hold || !P) return;
    this.t -= dt; if (this.t > 0) return;
    this.t = TUNE.eventEvery;
    const list = all('activities').filter(a => a.kind === 'event'); if (!list.length) return;
    for (let k = 0; k < list.length; k++) {
      const spec = list[(this.next + k) % list.length], at = spec.where ? spec.where(this.world(), P) : null;
      if (!at) continue;
      this.next = (this.next + k + 1) % list.length; this.far = 0;
      R.start(spec.id, { activity: true, data: { at } });
      return;
    }
  }
  hash() { return this.R.hash(); }
}
