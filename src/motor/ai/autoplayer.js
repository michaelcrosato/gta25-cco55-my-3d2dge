// The AutoPlayer's core (PLAN.md 8.20, M5): it plays the possessed protagonist by writing the same Intent a player's
// controller writes, so whatever it does a player could do (the attract mode, the bot campaign and the tests drive the
// real game code through it). This core goes places:
//   - on foot it walks the sidewalk graph's shortest way to the node nearest its goal, then straight to the goal; a
//     body stuck against something for a moment finds its way again;
//   - for a long way (TUNE.autoDriveFrom) it takes the nearest vehicle it can reach (△ / E at its door, as a player
//     would: the scene boards it), drives it on the GPS route with a player-style DriverBrain (quicker than traffic,
//     still stopping for red lights and what is in front of it), stops at the lane point nearest the goal, gets out and
//     walks the rest.
// Later milestones add the fighting, the evading and the mission hints. Deterministic: it reads only the simulation.
//   const A = new AutoPlayer({ city, roads: roadsOf(city), fleet, junctions });  A.goto(x, y)
//   each step: I = A.update(dt, ped, { t, pedsNear })  ·  A.state: 'idle' | 'walk' | 'board' | 'drive' | 'exit' | 'arrived'
import { TUNE, knob } from '../core/tune.js';
import { makeIntent, clearIntent } from '../sim/intent.js';
import { DriverBrain } from './driver.js';

knob('AutoPlayer', 'autoDriveFrom', 'Drives beyond', 420, 0, 3000, 10, 'The AutoPlayer takes a vehicle for a trip longer than this (u)');
knob('AutoPlayer', 'autoArrive', 'Arrives within', 14, 2, 80, 1, 'How near its goal the AutoPlayer stops (u)');
const CAR_REACH = 140, NODE_NEAR = 9;

export class AutoPlayer {
  /** o: { city, roads ({ graph, gps, walks }), fleet, junctions } */
  constructor(o) {
    this.city = o.city; this.G = o.roads.graph; this.gps = o.roads.gps; this.S = o.roads.walks; this.fleet = o.fleet; this.J = o.junctions || null;
    this.I = makeIntent(); this.goal = null; this.state = 'idle'; this.path = null; this.i = 0; this.brain = null; this.car = null;
    this.stuck = 0; this.last = [0, 0]; this.t = 0; this.tried = new Set();
  }
  /** go to (x, y): o.foot keeps it on foot; o.car: drive there in this vehicle */
  goto(x, y, o = {}) { this.goal = { x, y, foot: !!o.foot }; this.state = 'idle'; this.path = null; this.car = o.car || null; this.tried.clear(); this._dropBrain(); return this; }
  get arrived() { return this.state === 'arrived'; }
  /** one step for the possessed ped: its Intent (on foot or at the wheel). w: { t (the signals' clock), pedsNear } */
  update(dt, p, w = {}) {
    const I = clearIntent(this.I); this.t += dt; if (!this.goal || p.dead) return I;
    const g = this.goal, v = p.seat && p.seat.vehicle, d = Math.hypot(g.x - p.x, g.y - p.y);
    if (p.boarding || p.held || p.floored) return I;   // (the scene plays getting in and out)
    if (v) return this._drive(dt, p, v, w);
    if (d < TUNE.autoArrive) { this.state = 'arrived'; return I; }
    // a long way on foot: a vehicle near enough to take?
    if (!g.foot && d > TUNE.autoDriveFrom && this.state !== 'board') { const car = this.car && !this.car.wrecked ? this.car : this._pickCar(p); if (car) { this.car = car; this.state = 'board'; } }
    if (this.state === 'board') return this._board(p);
    return this._walk(dt, p);
  }
  // ---- on foot
  _walk(dt, p) { this.state = 'walk'; return this._walkTo(dt, p, this.goal.x, this.goal.y, 'goal'); }
  // to (tx, ty) on foot: the sidewalk graph's shortest way between the nodes nearest each end, then straight there;
  // stuck against something, a hop, then the way again from the next-nearest node
  _walkTo(dt, p, tx, ty, key) {
    const I = this.I, far = Math.hypot(tx - p.x, ty - p.y);
    if (!this.path || this.pathKey !== key) {
      const a = this._startNode(p), b = this.S.nearestNode(tx, ty, 200);
      this.path = a && b && far > 60 ? this.S.route(a.id, b.id) || [] : []; this.i = 0; this.pathKey = key;
    }
    let to = [tx, ty];
    while (this.i < this.path.length) {
      const n = this.S.nodes[this.path[this.i]];
      if (Math.hypot(n.x - p.x, n.y - p.y) < NODE_NEAR) { this.i++; continue; }
      if (this.i > 0 && far < Math.hypot(tx - n.x, ty - n.y)) { this.i = this.path.length; break; }   // (the target nearer than the next node: straight on)
      to = [n.x, n.y]; break;
    }
    const dx = to[0] - p.x, dy = to[1] - p.y, l = Math.hypot(dx, dy) || 1;
    I.move[0] = dx / l; I.move[1] = dy / l; I.down.sprint = far > 120 && p.stamina > .4;
    const moved = Math.hypot(p.x - this.last[0], p.y - this.last[1]); this.last[0] = p.x; this.last[1] = p.y;
    this.stuck = moved < .1 ? this.stuck + dt : 0;
    if (this.stuck > 1) { this.stuck = 0; this.skip = (this.skip || 0) + 1; this.path = null; I.tap.jump = true; I.down.jump = true; }   // (a hop: a low wall, a fence; then another way)
    return I;
  }
  // the node to start a walk from: the nearest, or after being stuck, the next-nearest ones in turn
  _startNode(p) {
    const k = this.skip || 0; if (!k) return this.S.nearestNode(p.x, p.y, 200);
    const near = this.S.live.map(n => [Math.hypot(n.x - p.x, n.y - p.y), n]).filter(q => q[0] < 260).sort((a, b) => a[0] - b[0] || a[1].id - b[1].id);
    return near.length ? near[k % near.length][1] : null;
  }
  // the nearest vehicle to take: unlocked, standing, nobody in it but traffic's driver (a carjack, as a player would)
  _pickCar(p) {
    let best = null, bd = CAR_REACH;
    for (const v of this.fleet.near(p.x, p.y, CAR_REACH)) {
      if (this.tried.has(v.id) || v.wrecked || v.locked || v.cls === 'heli' || v.cls === 'boat' || v.cls === 'rail' || v.speed > 30 || v.owner === 'service') continue;
      const d = Math.hypot(v.x - p.x, v.y - p.y); if (d < bd) { bd = d; best = v; }
    }
    return best;
  }
  // to the vehicle's door, then △ (the scene boards: get in, or jack the driver)
  _board(p) {
    const I = this.I, v = this.car; if (!v || v.wrecked || v.speed > 40) { this.tried.add(v && v.id); this.car = null; this.state = 'walk'; return I; }
    const c = Math.cos(v.heading), s = Math.sin(v.heading), dx = p.x - v.x, dy = p.y - v.y, lx = dx * c + dy * s, ly = -dx * s + dy * c;
    if (Math.abs(lx) <= v.hl + 20 && Math.abs(ly) <= v.hw + 20) { I.tap.interact = true; I.down.interact = true; this._tries = (this._tries || 0) + 1; if (this._tries > 90) { this.tried.add(v.id); this.car = null; this.state = 'walk'; this._tries = 0; } return I; }
    this._boardT = (this._boardT || 0) + 1 / 120; if (this._boardT > 20) { this._boardT = 0; this.tried.add(v.id); this.car = null; this.state = 'walk'; return I; }   // (no way to it: another, or on foot)
    return this._walkTo(1 / 120, p, v.x, v.y, 'car' + v.id);
  }
  // ---- at the wheel
  _drive(dt, p, v, w) {
    const g = this.goal, d = Math.hypot(g.x - v.x, g.y - v.y); this._tries = 0;
    if (v.driver !== p) { this.state = 'exit'; this.I.tap.interact = true; return this.I; }   // (a passenger seat: out)
    if (!this.brain || this.brain.v !== v) {
      this._dropBrain();
      this.brain = new DriverBrain(v, this.G, { junctions: this.J, personality: { speed: 1.25, gap: .75, patience: .5, calm: true } });
      const r = this.gps.routeTo(v.x, v.y, v.heading, g.x, g.y, { z: v.z }); if (r) this.brain.setRoute(r.lanes, { lane: r.to.lane.id, s: r.to.s });
      this.state = 'drive';
    }
    const b = this.brain;
    if (b.lost || ((b.arrived || d < 70) && v.speed < 8) || (d < TUNE.autoArrive * 3 && v.speed < 20)) {   // there (or as near as the road goes): out, and on foot the rest
      if (v.speed > 6) { const I = clearIntent(this.I); I.brake = 1; return I; }
      this.state = 'exit'; this._dropBrain(); const I = clearIntent(this.I); I.tap.interact = true; I.down.interact = true; return I;
    }
    const I = b.update(dt, { fleet: this.fleet, t: w.t || this.t, pedsNear: w.pedsNear || null, wet: w.wet || 0, sirens: null });
    return I;
  }
  _dropBrain() { if (this.brain) this.brain.dispose(); this.brain = null; }
  dispose() { this._dropBrain(); }
}
