// The traffic driver (PLAN.md 8.9): a brain that drives one vehicle through the lane graph by writing its driver's
// Intent, as a player's controller would.
//   - its path: the lane it is on and the connectors and lanes ahead (a wander that picks each turn by weight, or a
//     GPS route to a goal); it keeps three lanes in hand;
//   - steering: pure pursuit of a point ahead on the path (further ahead the faster it goes);
//   - speed: the Intelligent Driver Model, after the leader on its path (the nearest vehicle ahead in its lane), and
//     after the stop line when the light ahead is red (or amber with room to stop), when a stop sign wants a halt, or
//     when someone is on the crosswalk; its desired speed is the lane's by its personality and the weather;
//   - stuck behind something stopped for a while: a honk, then round it (a lane change, or a swerve past it);
//   - panic (shots, a blast nearby): faster, signals ignored; after a crash it stops, then drives off (or the brain
//     says it wants out: the ped brain's business, M5's reactions);
//   - a siren behind: it pulls to the right and slows to let it by.
// Deterministic: its choices draw from the 'traffic' RNG stream; it reads only the simulation.
//   const b = new DriverBrain(vehicle, graph, { rng });  each step: I = b.update(dt, world)  (world: { fleet, t, peds,
//   crosswalks, wet })
import { E } from '../engine.js';
import { TUNE, knob } from '../core/tune.js';
import { makeIntent, clearIntent } from '../sim/intent.js';
import { TURN_SPEED } from '../nav/roadgraph.js';
import { lightFor } from '../nav/signals.js';

knob('Traffic', 'idmGap', 'Following time gap', 1.3, .5, 3, .05, 'Seconds a calm driver keeps behind the car ahead (IDM T)');
knob('Traffic', 'idmMin', 'Standstill gap', 9, 2, 30, 1, 'Units between bumpers a queue stops at (IDM s0)');
knob('Traffic', 'idmAccel', 'Driver acceleration', 130, 30, 400, 5, 'How briskly a calm driver speeds up (IDM a, u/s²)');
knob('Traffic', 'idmBrake', 'Comfortable braking', 220, 60, 600, 5, 'How hard a calm driver likes to brake (IDM b, u/s²)');
knob('Traffic', 'honkAfter', 'Honks after', 2, .5, 10, .25, 'Seconds blocked before a driver leans on the horn');
knob('Traffic', 'stopHalt', 'Stop-sign halt', .6, 0, 3, .1, 'Seconds a driver waits stopped at a stop sign before going');
knob('Traffic', 'passAfter', 'Goes round after', 3.5, 1, 15, .25, 'Seconds behind something stopped before a driver goes round it');
const TURN_W = { straight: .58, right: .22, left: .2, uturn: .01, change: 0 };

export class DriverBrain {
  /** v: the Vehicle; graph: the RoadGraph; o: { rng (a stream), personality: { speed, gap, patience }, route: [lane
   *  ids] (a GPS route to follow; else it wanders), lane, s (where it starts on its lane) } */
  constructor(v, graph, o = {}) {
    this.v = v; this.g = graph; this.rng = o.rng; this.I = makeIntent();
    this.p = Object.assign({ speed: 1, gap: 1, patience: 1 }, o.personality || {});
    this.route = o.route ? o.route.slice() : null;
    const at = o.lane !== undefined ? { lane: graph.lanes[o.lane], s: o.s || 0 } : graph.nearestLane(v.x, v.y, v.heading, v.z);
    /** the path: [{ k: 'lane' | 'conn', id, len }]; i: the element it is on; s: how far along it */
    this.path = at ? [{ k: 'lane', id: at.lane.id, len: at.lane.len }] : []; this.i = 0; this.s = at ? at.s : 0;
    this.blocked = 0; this.halt = 0; this.haltFor = null; this.inBox = null; this._entered = false; this.panic = 0; this.crashT = 0; this.honk = 0; this.passing = 0; this.passSide = 1; this.lost = !at;
    this._grow();
  }
  /** the lane or connector it is on */
  get here() { return this.path[this.i] || null; }
  // keep three lanes ahead in the path: from the route if it has one, else a weighted pick at each lane's end
  _grow() {
    const G = this.g;
    while (this.path.filter((e, j) => j >= this.i && e.k === 'lane').length < 3) {
      const last = this.path[this.path.length - 1]; if (!last) return;
      const lane = G.lanes[last.id], outs = lane.out.map(c => G.conns[c]).filter(c => c.kind !== 'change');
      if (!outs.length) return;   // (the end of the road: the jump)
      let c = null;
      if (this.route && this.route.length) { const want = this.route.indexOf(lane.id); const next = want >= 0 ? this.route[want + 1] : null; c = outs.find(q => q.to === next) || null; }
      if (!c) {   // a wander: by the kind of turn, keeping out of dead ends (the map's edges) unless nothing else goes, and never the jump
        let w = outs.map(q => { const to = G.lanes[q.to]; return to.deadEnd ? 0 : TURN_W[q.kind] ?? .1; });
        if (!w.some(x => x > 0)) w = outs.map(q => G.lanes[q.to].deadEnd === 'jump' ? 0 : 1);   // (forced: a dead end, turned round at its end)
        const tot = w.reduce((a, b) => a + b, 0) || 1;
        let r = (this.rng ? this.rng.next() : .5) * tot; c = outs[outs.length - 1]; for (let k = 0; k < outs.length; k++) { r -= w[k]; if (w[k] > 0 && r <= 0) { c = outs[k]; break; } }
      }
      this.path.push({ k: 'conn', id: c.id, len: c.len }, { k: 'lane', id: c.to, len: G.lanes[c.to].len });
    }
  }
  /** the point [x, y, z] d units ahead of where it is on its path (and the element it falls in) */
  ahead(d) {
    let j = this.i, s = this.s + d;
    while (j < this.path.length) { const e = this.path[j]; if (s <= e.len || j === this.path.length - 1) return { p: this._point(e, Math.min(s, e.len)), j, s }; s -= e.len; j++; }
    return null;
  }
  _point(e, s) { const G = this.g; if (e.k === 'lane') return G.pointOn(G.lanes[e.id], s); const c = G.conns[e.id]; return G.pointOnConn(c, E.clamp(s / (c.len || 1), 0, 1)); }
  /** one step: where it is on the path, what is ahead, and the Intent that drives there */
  update(dt, w = {}) {
    const I = clearIntent(this.I), v = this.v, b = v.body; if (!b || this.lost || !this.path.length) return I;
    // where it is: along the current element, moving on to the next as it passes the end
    for (let guard = 0; guard < 4; guard++) {
      const e = this.here; if (!e) break;
      const proj = this._project(e, b.x, b.y); this.s = Math.max(this.s, proj);
      if (this.s < e.len - .5 || this.i >= this.path.length - 1) break;
      this.s -= e.len; this.i++;
    }
    if (this.i > 6) { this.path.splice(0, this.i); this.i = 0; }   // (the path behind it, forgotten)
    if (this.inBox && this.here.k === 'lane' && this.here.id !== (this.path[this.i - 2] || {}).id && this._entered) { if (this.inBox.owner === this.v) this.inBox.owner = null; this.inBox = null; this._entered = false; }
    if (this.inBox && this.here.k === 'conn') this._entered = true;
    // knocked off its way (a crash, a shove): back onto the nearest lane running its way
    const on = this._point(this.here, Math.min(this.s, this.here.len)); if (Math.hypot(on[0] - b.x, on[1] - b.y) > 48) { const n = this.g.nearestLane(b.x, b.y, b.heading, b.z); if (n) { this.path = [{ k: 'lane', id: n.lane.id, len: n.lane.len }]; this.i = 0; this.s = n.s; this.tr = null; } }
    this._grow();
    const sp = b.speed, here = this.here, lane = here.k === 'lane' ? this.g.lanes[here.id] : null;
    // a dead end (the map's edge): turn round in three moves rather than drive off the end
    const nextC = this.path[this.i + 1] && this.path[this.i + 1].k === 'conn' ? this.g.conns[this.path[this.i + 1].id] : null;
    if ((here.k === 'conn' && this.g.conns[here.id].kind === 'uturn') || (lane && nextC && nextC.kind === 'uturn' && here.len - this.s < 30) || this.tr) return this._turnRound(dt, I, b, w, lane || this.g.lanes[this.g.conns[here.id].from]);
    // the desired speed: its lane's (a turn's on a connector), by its mood and the weather
    const mood = this.p.speed * (w.wet ? .85 : 1) * (this.panic > 0 ? 1.35 : 1), elSpeed = e => e.k === 'lane' ? this.g.lanes[e.id].speed : (c => c.kind === 'straight' || c.kind === 'change' ? this.g.lanes[c.to].speed : TURN_SPEED)(this.g.conns[e.id]);
    let v0 = elSpeed(here) * mood;
    // slow in time for what is ahead: each element within reach caps the speed now at what still brakes down to its own
    for (let j = this.i + 1, d = here.len - this.s; j < this.path.length && d < 260; d += this.path[j].len, j++) v0 = Math.min(v0, Math.sqrt((elSpeed(this.path[j]) * mood) ** 2 + 2 * TUNE.idmBrake * .7 * Math.max(0, d - 6)));
    // what stops it: the leader on its path, a red light's stop line, a stop sign, a crosswalk with someone on it
    const look = 60 + sp * 1.2;
    let gap = Infinity, dv = 0;
    const leader = w.fleet ? this._leader(w.fleet, look) : null; if (leader) { gap = leader.gap; dv = sp - leader.speed; }
    if (this.panic <= 0) {
      const stopAt = this._stopLine(w, look, sp, dt); if (stopAt !== null && stopAt < gap) { gap = stopAt; dv = sp; }
    }
    // IDM
    const T = TUNE.idmGap * this.p.gap, s0 = TUNE.idmMin, a = TUNE.idmAccel, bb = TUNE.idmBrake;
    const sStar = s0 + Math.max(0, sp * T + sp * dv / (2 * Math.sqrt(a * bb)));
    let acc = a * (1 - Math.pow(sp / Math.max(1, v0), 4) - (gap < Infinity ? Math.pow(sStar / Math.max(.5, gap), 2) : 0));
    if (this.crashT > 0) { this.crashT -= dt; acc = -bb * 2; }
    if (acc >= 0) I.throttle = E.clamp(acc / a, 0, 1); else I.brake = E.clamp(-acc / (bb * 1.6), 0, 1);
    if (I.brake > 0 && sp < 3 && gap < s0 + 4) I.brake = 0;   // (stopped: off the pedal, so it never reverses; the handbrake holds it)
    if (sp < 2 && I.throttle < .05) I.down.handbrake = true;
    // stuck behind something stopped: honk, then go round it
    const stuck = leader && leader.speed < 2 && gap < 40 && sp < 4 && !leader.signal;
    this.blocked = stuck ? this.blocked + dt : 0;
    this.honk = this.blocked > TUNE.honkAfter * this.p.patience && this.blocked < TUNE.honkAfter * this.p.patience + .6;
    if (this.blocked > TUNE.passAfter * this.p.patience && !this.passing) { this.passing = 2.2; this.passSide = this._passSide(); }
    if (this.passing > 0) { this.passing -= dt; if (stuck || this.passing > .3) { I.throttle = Math.max(I.throttle, .45); I.brake = 0; I.down.handbrake = false; } }
    I.down.horn = this.honk;
    // steering: pure pursuit of a point ahead on the path (pushed sideways while passing, or to the curb for a siren)
    const tgt = this.ahead(14 + sp * .45); if (!tgt) return I;
    let [tx, ty] = tgt.p;
    const side = this.passing > 0 ? this.passSide * 22 : w.siren ? 14 : 0;
    if (side) { const h = b.heading; tx += -Math.sin(h) * side; ty += Math.cos(h) * side; }
    const dx = tx - b.x, dy = ty - b.y, c = Math.cos(b.heading), sn = Math.sin(b.heading), lx = dx * c + dy * sn, ly = -dx * sn + dy * c;
    const curv = 2 * ly / Math.max(1, lx * lx + ly * ly), wheelbase = b.h.wheelbase || 36;
    I.steer = E.clamp(Math.atan(curv * wheelbase) / (b.h.steer || .55), -1, 1);
    if (lx < 0) { I.steer = ly >= 0 ? 1 : -1; I.throttle = Math.min(I.throttle, .3); }   // (it overshot: turn back)
    if (this.panic > 0) this.panic -= dt;
    return I;
  }
  // the three-point turn: forward on full lock (left, toward the far lane) until it has turned a right angle or a wall
  // is close ahead; back on the other lock until it faces the way it came; then on along the path as usual
  _turnRound(dt, I, b, w, lane) {
    const T = this.tr || (this.tr = { phase: 'in', h0: Math.atan2(lane.dir[1], lane.dir[0]), t: 0 }); T.t += dt;
    const turned = Math.abs(Math.atan2(Math.sin(b.heading - T.h0), Math.cos(b.heading - T.h0))), c = Math.cos(b.heading), s = Math.sin(b.heading);
    const wall = d => { const x = b.x + c * d, y = b.y + s * d, W = w.fleet && w.fleet.world; return (W && W.map && W.map.heightAt(x, y) > b.z + 4) || (W && W.water && W.water(Math.floor(x / 16), Math.floor(y / 16))); };   // (a wall, or the water's edge)
    if (T.phase === 'in') { I.throttle = .32; I.steer = -1; if (turned > 1.45 || wall(b.hl + 10) || T.t > 4) { T.phase = 'back'; T.t = 0; } }
    else if (T.phase === 'back') { I.brake = .7; I.steer = 1; if (turned > 2.7 || wall(-b.hl - 10) || T.t > 4) { T.phase = 'out'; T.t = 0; } }
    else { this.tr = null; const e = this.path.findIndex((q, j) => j > this.i && q.k === 'lane'); if (e > 0) { this.i = e; this.s = this._project(this.path[e], b.x, b.y); } }
    return I;
  }
  // how far along element e the point (x, y) lies
  _project(e, x, y) {
    const G = this.g;
    if (e.k === 'lane') { const l = G.lanes[e.id], dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1], L2 = dx * dx + dy * dy || 1; return E.clamp(((x - l.a[0]) * dx + (y - l.a[1]) * dy) / L2, 0, 1) * l.len; }
    const c = G.conns[e.id]; let best = 0, bd = Infinity;
    for (let k = 0; k <= 8; k++) { const q = G.pointOnConn(c, k / 8), d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) { bd = d; best = k / 8; } }
    return best * c.len;
  }
  // the nearest vehicle ahead on its path (its centre within its half width of the path's line): { gap (bumper to
  // bumper), speed (along our way), v }. The path ahead is sampled once, every 8 units
  _leader(fleet, look) {
    const v = this.v, me = Math.max(v.hl, 10), pts = [];
    for (let d = 0; d <= look; d += 8) { const q = this.ahead(d); if (!q) break; pts.push(q.p); }
    if (!pts.length) return null;
    const mid = pts[pts.length >> 1]; let best = null;
    for (const o of fleet.around(mid[0], mid[1], look / 2 + 40)) {
      if (o === v || !o.body || o.cls === 'heli' || Math.abs(o.z - v.z) > 10) continue;
      for (let k = 0; k < pts.length; k++) {
        if (Math.hypot(o.x - pts[k][0], o.y - pts[k][1]) < o.hw + 7) { const gap = Math.max(0, k * 8 - me - o.hl); if (!best || gap < best.gap) best = { gap, speed: Math.max(0, o.body.u * Math.cos(o.heading - v.heading)), v: o }; break; }
      }
    }
    return best;
  }
  // the distance to where it must stop, at the first junction ahead: a red light's line (or an amber's, with room to
  // stop), a stop sign's (a halt of TUNE.stopHalt there first, then the box clear), a crosswalk someone is on
  _stopLine(w, look, sp, dt) {
    let d = this.path[this.i].len - this.s;
    for (let j = this.i; j < this.path.length && d < look + 40; j++) {
      const e = this.path[j]; if (j > this.i) d += e.len;
      const next = this.path[j + 1]; if (!next || next.k !== 'conn' || e.k !== 'lane') continue;
      const c = this.g.conns[next.id], light = lightFor(c, this.g, w.t || 0), dist = Math.max(0, d - this.v.hl);
      if (w.crosswalkBusy && w.crosswalkBusy(this.g.lanes[e.id].b, this.v)) return Math.max(0, dist - 12);
      if (light === 'red') return dist;
      if (light === 'amber') return dist > sp * sp / (2 * TUNE.idmBrake) ? dist : null;
      if (light === 'green') {   // (never into the box without room beyond it; a left turn waits for the box to clear)
        if (this._exitFull(w, c) || (c.kind === 'left' && dist < 40 && !this._claim(w, c))) return dist;
        return null;
      }
      if (light === 'stop') {
        if (this.haltFor !== c.region) { if (dist < TUNE.idmMin + 6 && sp < 3) { this.halt += dt; if (this.halt >= TUNE.stopHalt) { this.haltFor = c.region; this.halt = 0; } } return dist; }
        return this._exitFull(w, c) || !this._claim(w, c) ? dist : null;
      }
      return null;   // (green, or no junction: nothing to stop for this side of it)
    }
    return null;
  }
  // take a junction's box for this car: refused while another holds it or stands in it (the first to claim it goes;
  // a claim lapses when its holder is through, wrecked, or after a few seconds stuck)
  _claim(w, c) {
    const R = this.g.regions.find(r => r.id === c.region); if (!R) return true;
    const t = w.t || 0, o = R.owner;
    if (o && o !== this.v && !o.wrecked && t - R.ownerT < 5 && o._brain && o._brain.inBox === R) return false;
    if (this._boxBusy(w, c)) return false;
    R.owner = this.v; R.ownerT = t; this.inBox = R; this.v._brain = this; return true;
  }
  // is a stop junction's box busy with another vehicle (it waits its turn)?
  _boxBusy(w, c) {
    if (!w.fleet || !c.region) return false; const R = this.g.regions.find(r => r.id === c.region); if (!R) return false;
    const [x0, y0, x1, y1] = R.box;
    return w.fleet.around((x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) / 2).some(o => o !== this.v && o.body && o.cls !== 'heli' && Math.abs(o.z - this.v.z) < 10 && o.x > x0 && o.x < x1 && o.y > y0 && o.y < y1);
  }
  // is the lane beyond a junction too full to take this car (a queue reaching back to the box)?
  _exitFull(w, c) {
    if (!w.fleet) return false; const L = this.g.lanes[c.to], need = this.v.hl * 2 + TUNE.idmMin + 8;
    const fx = L.a[0] + L.dir[0] * need / 2, fy = L.a[1] + L.dir[1] * need / 2;
    return w.fleet.around(fx, fy, need / 2 + 30).some(o => { if (o === this.v || !o.body || Math.abs(o.z - L.a[2]) > 10) return false; const dx = o.x - L.a[0], dy = o.y - L.a[1], along = dx * L.dir[0] + dy * L.dir[1], off = Math.abs(-dx * L.dir[1] + dy * L.dir[0]); return along > -o.hl && along < need && off < o.hw + 6 && o.speed < 30; });
  }
  // which side to pass a stopped car on: the side with more room (its lane's neighbour if any, else the left)
  _passSide() { return this.rng && this.rng.next() < .2 ? 1 : -1; }
  /** a shot, a blast, a crash nearby: panic for a while (faster, the lights ignored) */
  scare(seconds = 8) { this.panic = Math.max(this.panic, seconds); }
  /** it was hit: stop for a moment */
  crashed() { this.crashT = 1.5; }
}
