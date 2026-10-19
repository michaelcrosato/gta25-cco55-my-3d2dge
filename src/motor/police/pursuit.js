// A police unit's driving (PLAN.md 8.9's pursuit): the unit's DriverBrain (siren on: a red is a give-way, the traffic
// pulls over) follows a GPS route to the target, re-routed as the target moves; near it, with a clear line to it on the
// same level, the driver leaves the lanes and steers straight for it: for a car on the move, at its rear quarter (a
// PIT), led by its speed; for a body on foot or a car at rest, up to a stop short of it (the crew gets out there).
// It brakes for anyone on foot in its way (the target aside). Pinned against something, it backs off and tries again.
// Far from the focus (the LOD ring), the brain moves the unit along its route kinematically, as for traffic; held up out
// there (a queue at a light, a jam: nobody pulls over for a siren they can't see), out of every view's sight (beyond
// the spawn ring's inner edge), it slips ahead along its route past the hold-up.
//   const P = new PursuitDriver(car, { gps });  each step: I = P.update(dt, world, target)  (target: { x, y, z, vx, vy,
//   car (the vehicle the target drives, or null) })  ·  P.mode: 'route' | 'direct' | 'stopped'
import { E } from '../engine.js';
import { TUNE, knob } from '../core/tune.js';
import { clearIntent, makeIntent } from '../sim/intent.js';

knob('Police', 'directFrom', 'Drives straight within', 170, 40, 400, 10, 'How near a unit leaves the lanes and steers straight for its target (u)');
knob('Police', 'stopShort', 'Stops short by', 26, 8, 80, 1, 'How far short of a target on foot (or stopped) a unit stops (u)');
const REROUTE = 1.5, REGOAL = 90, LOD_IN = 20, HELD = 2.5;

export class PursuitDriver {
  /** car: the traffic record Traffic.dispatch made ({ v, brain, crew }); o: { gps, map } */
  constructor(car, o = {}) {
    this.car = car; this.v = car.v; this.brain = car.brain; this.gps = o.gps; this.I = makeIntent();
    this.mode = 'route'; this.routeT = 0; this.goalAt = null; this.t = 0; this.pinned = 0; this.backT = 0; this.ramT = 0; this.heldT = 0; this.hops = 0;
  }
  /** one step. w: the DriverBrain's world ({ fleet, t, pedsNear, wet, sirens }); target as above; fp: the footprint
   *  (the LOD ring); stop: stop short of the target (the crew gets out) */
  update(dt, w, target, fp, o = {}) {
    const v = this.v, b = this.brain; this.t += dt;
    const I = clearIntent(this.I); if (!v.body || v.wrecked || !target) return I;
    // near and far: physics within the full ring, else the brain moves the unit along its route
    const df = fp ? fp.d(v.x, v.y) : 0;
    if (v.kinematic && df < TUNE.fpFull - LOD_IN) { v.kinematic = false; v.body.setVelocity(Math.cos(v.heading) * b.speed, Math.sin(v.heading) * b.speed); }
    else if (!v.kinematic && df > TUNE.fpFull + LOD_IN && this.mode === 'route' && b.snap()) v.kinematic = true;
    // the route: again when the target has moved on from where it led, or every so often
    this.routeT -= dt;
    if (this.routeT <= 0 && (!this.goalAt || Math.hypot(target.x - this.goalAt[0], target.y - this.goalAt[1]) > REGOAL || b.arrived || b.lost)) {
      this.routeT = REROUTE; const r = this.gps && this.gps.routeTo(v.x, v.y, v.heading, target.x, target.y, { z: v.z, tz: target.z || 0 });
      if (r) { b.setRoute(r.lanes, { lane: r.to.lane.id, s: r.to.s }); this.goalAt = [target.x, target.y]; }
    }
    const dx = target.x - v.x, dy = target.y - v.y, d = Math.hypot(dx, dy);
    const sameLevel = Math.abs((target.z || 0) - v.z) < 14, clear = sameLevel && d < TUNE.directFrom && this._clearTo(target, o.map);
    if (v.kinematic) {
      this.mode = 'route'; this.heldT = b.speed < 15 && !b.arrived ? this.heldT + dt : 0;
      if (this.heldT > HELD) { this.heldT = 0; if (this._hop(w, fp)) this.hops++; }
      b.step(dt, w); return I;
    }
    if (!clear) { this.mode = 'route'; return b.update(dt, w); }   // (the brain's own Intent: it unpins itself)
    // straight for it
    const tc = target.car, moving = tc && tc.speed > 25 && !o.stop;
    let px = target.x, py = target.y, stopAt = 0;
    if (moving) {   // (its rear quarter, on our side, led by its speed)
      const c = Math.cos(tc.heading), s = Math.sin(tc.heading), side = (dx * -s + dy * c) > 0 ? -1 : 1, lead = Math.min(.7, d / 260);
      px = tc.x - c * tc.hl * .7 + -s * side * tc.hw * .8 + tc.body.vx * lead; py = tc.y - s * tc.hl * .7 + c * side * tc.hw * .8 + tc.body.vy * lead;
    } else stopAt = TUNE.stopShort + (tc ? tc.hl : 0) + v.hl;
    const want = Math.atan2(py - v.y, px - v.x), err = E.angDiff(v.heading, want), sp = v.body.u, dp = Math.hypot(px - v.x, py - v.y);
    I.steer = E.clamp(err * 2.4, -1, 1);
    let vWant = moving ? Math.max(tc.speed + 40, 120) : E.clamp((dp - stopAt) * 2.2, 0, 260);
    const gap = this._pedAhead(w, target, sp); if (gap !== null) vWant = Math.min(vWant, Math.max(0, gap - 4) * 2);   // (someone on foot in the way)
    if (sp < vWant - 8) I.throttle = Math.abs(err) > 1.6 ? .4 : 1; else if (sp > vWant + 12) I.brake = E.clamp((sp - vWant) / 80, .2, 1);
    if (Math.abs(err) > 1.1 && sp > 90) I.down.handbrake = true;   // (a sharp turn at speed: swing it round)
    if (!moving && dp < stopAt + 4 && sp < 6) { I.throttle = 0; I.brake = 0; I.down.handbrake = true; this.mode = 'stopped'; }
    else this.mode = 'direct';
    if (moving && dp < tc.hl + v.hl + 6) this.ramT += dt; else this.ramT = 0;
    return this._unpin(dt, I);
  }
  // the room before the nearest body on foot in the car's path ahead (its width and a little, as far as it takes to stop
  // and more), the target's own body aside: null when clear
  _pedAhead(w, target, sp) {
    if (!w.pedsNear) return null;
    const v = this.v, c = Math.cos(v.heading), s = Math.sin(v.heading), look = v.hl + 20 + Math.max(0, sp) * .6, mx = v.x + c * look / 2, my = v.y + s * look / 2; let best = null;
    for (const p of w.pedsNear(mx, my, look / 2 + 12)) {
      if (p.dead || p.seat || (target.car === null && Math.hypot(p.x - target.x, p.y - target.y) < 3) || Math.abs((p.z || 0) - v.z) > 14) continue;
      const dx = p.x - v.x, dy = p.y - v.y, f = dx * c + dy * s, l = -dx * s + dy * c;
      if (f > v.hl - 2 && f < look && Math.abs(l) < v.hw + 7) { const gap = f - v.hl; if (best === null || gap < best) best = gap; }
    }
    return best;
  }
  // far off and held up: on along its route to the first free stretch of lane past the hold-up, the way there and the
  // spot both out of sight (beyond fpSpawnIn); false when there is none
  _hop(w, fp) {
    const b = this.brain, v = this.v; if (!fp || !w.fleet || fp.d(v.x, v.y) < TUNE.fpSpawnIn) return false;
    for (let d = 40; d <= 640; d += 20) {
      const a = b.ahead(d); if (!a || (a.j === b.path.length - 1 && a.s >= b.path[a.j].len - 1)) return false;   // (past the path's end)
      if (fp.d(a.p[0], a.p[1]) < TUNE.fpSpawnIn) return false;   // (it would come into sight: it waits like anyone)
      const e = b.path[a.j]; if (!e || e.k !== 'lane' || a.s < v.hl + 8 || a.s > e.len - v.hl - 8) continue;   // (on a lane, never in a junction's box)
      if (w.fleet.near(a.p[0], a.p[1], 90).some(o => o !== v && o.body && o.cls !== 'heli' && Math.abs(o.z - a.p[2]) < 12 && Math.hypot(o.x - a.p[0], o.y - a.p[1]) < o.hl + v.hl + 12)) continue;
      b._release(); b._advance(d, 0, 0); b._grow(); b.speed = Math.max(b.speed, 40); return true;
    }
    return false;
  }
  // a clear line from the unit to the target (nothing taller than a curb between them)
  _clearTo(target, map) { if (!map || !map.ray) return true; return map.ray({ x: this.v.x, y: this.v.y, z: this.v.z }, { x: target.x, y: target.y, z: target.z || 0 }, { eye: 10, target: 8 }).clear; }
  // pushing and going nowhere: back off on the other lock a moment
  _unpin(dt, I) {
    const v = this.v;
    if (this.backT > 0) { this.backT -= dt; I.throttle = 0; I.down.handbrake = false; I.brake = v.body.u < -30 ? 0 : .7; I.steer = this._backSteer; return I; }
    this.pinned = I.throttle > .3 && Math.abs(v.body.u) < 2 ? this.pinned + dt : 0;
    if (this.pinned > 1.2) { this.pinned = 0; this.backT = .9; this._backSteer = -(I.steer || 1); }
    return I;
  }
}
