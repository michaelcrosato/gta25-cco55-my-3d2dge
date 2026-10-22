// The traffic driver (PLAN.md 8.9): a brain that drives one vehicle through the lane graph. Near the focus it writes its
// driver's Intent and the vehicle's physics does the rest, as for a player; far from it (PLAN.md 7.11's LOD) it moves
// the vehicle along its path itself, a kinematic lane follower, by the same rules.
//   - its path: the lane it is on and the connectors and lanes ahead, at least three lanes and 320 units: a wander that
//     picks each turn by weight (never into a dead end unless nothing else goes), or a GPS route to a goal;
//   - speed: the Intelligent Driver Model after whatever is nearest on its path: the vehicle ahead (any vehicle whose box
//     comes within half its width of the path: one crossing a junction counts), a stop line it may not pass yet, a ped
//     in its way (calm drivers only); its desired speed is the lane's (a turn's on a connector) by its personality and
//     the weather, eased down in time for slower stretches ahead and for its goal;
//   - junctions: it asks the Junctions for its connector once within braking distance of the stop line (short of the
//     crosswalk), ready when its light is green (or amber with no room to stop and time to clear), when it has halted
//     at a stop sign, or always at a merge, and the lane beyond has room for it; it stops at the line until granted, and
//     releases the box once its tail is out (the lane beyond has room when a car stopped there would stand clear of the
//     junction and the zebra: lane.clearS). A siren asks first and treats a red as a give-way;
//   - stuck behind something stopped that isn't queueing (a parked car poking out, a wreck, the player): a honk, then a
//     pass on whichever side has a clear corridor (walls, street furniture, vehicles, peds checked along it); a jammed
//     exit makes it pick another turn; pinned against something (physics), it backs off and tries again; behind a unit
//     parked at its scene with no way round (no room before the junction, the far lane busy, its crew in the street) it
//     waits for it, its cause the scene ('scene'), still trying to go round;
//   - a gridlock (a ring of stopped drivers each waiting on the next, none with room to back off): after TUNE.gridlock
//     seconds the one with the lowest id creeps on through a moment, and its bump moves the rest;
//   - a car nobody drives (a unit whose crew never came back, a wreck) in the lane: gone round even where the pass runs
//     on through the junction's box beside it (an assertive driver round a unit parked at its scene too); with no way
//     round at all, after 4 x TUNE.gridlock seconds shoved aside at a creep;
//   - panic (shots, a blast nearby): faster, the lights and the reservations ignored; a crash: a pause, then on;
//   - a siren behind it: it pulls over into a gap on its right wide enough to clear the siren's way and waits there;
//     with none (a street parked up on both sides) it drives on ahead of it at its own speed.
// Deterministic: its choices draw from the RNG stream it is given; it reads only the simulation (fleet, junctions,
// peds), never the view.
//   const b = new DriverBrain(vehicle, graph, { junctions, rng, lane, s });
//   near: I = b.update(dt, world)   far: b.step(dt, world)   world: { fleet, t, pedsNear(x, y, r), wet, sirens }
import { E } from '../engine.js';
import { TUNE, knob } from '../core/tune.js';
import { makeIntent, clearIntent } from '../sim/intent.js';
import { TURN_SPEED, TURN_R } from '../nav/roadgraph.js';
import { lightFor, amberLeft } from '../nav/signals.js';
import { boxDistance } from '../actors/fleet.js';

knob('Traffic', 'idmGap', 'Following time gap', 1.2, .5, 3, .05, 'Seconds a calm driver keeps behind the car ahead (IDM T)');
knob('Traffic', 'idmMin', 'Standstill gap', 5, 1, 30, 1, 'Units between bumpers a queue stops at (IDM s0)');
knob('Traffic', 'idmAccel', 'Driver acceleration', 130, 30, 400, 5, 'How briskly a calm driver speeds up (IDM a, u/s²)');
knob('Traffic', 'idmBrake', 'Comfortable braking', 220, 60, 600, 5, 'How hard a calm driver likes to brake (IDM b, u/s²)');
knob('Traffic', 'honkAfter', 'Honks after', 2, .5, 10, .25, 'Seconds blocked before a driver leans on the horn');
knob('Traffic', 'stopHalt', 'Stop-sign halt', .5, 0, 3, .1, 'Seconds a driver waits stopped at a stop sign before going');
knob('Traffic', 'passAfter', 'Goes round after', 2.5, .5, 15, .25, 'Seconds behind something stopped (not queueing) before a driver goes round it');
knob('Traffic', 'exitWait', 'Takes another turn after', 5, 1, 30, .5, 'Seconds a driver waits for a jammed exit before choosing another way');
knob('Traffic', 'gridlock', 'Breaks a gridlock after', 4, 1, 30, .5, 'Seconds a ring of stopped drivers, each waiting on the next (two nose to nose in a box with cars behind them, a gridlocked junction), stands before the one with the lowest id creeps on through');
knob('Traffic', 'pedPatience', 'Edges past peds after', 5, 1, 60, .5, 'Seconds a calm driver waits for people about a crossing (a crowd at a corner) before it waits only for those in its way');
const TURN_W = { straight: .58, right: .24, left: .18, uturn: 0, change: 0 };
const SAMPLE = 6;   // units between the samples along the path ahead
const LANE_CLEAR = 18;   // a parked vehicle this far from every lane's line is out of everyone's way (the widest half-width, and room)
const GATE = 6;   // units short of a drawbridge's span a driver stops while its gates are shut
const SNAP_OFF = 12;   // the farthest a car may be off its lane's line to go over to the far LOD (it is put on the line)
const DRIVE = new Set(['road', 'bridge', 'alley']);   // the surfaces a car pulls over onto (never a curb or a sidewalk)
const OVER_RAMP = 30;   // units a car takes to pull over (and back)

export class DriverBrain {
  /** v: the Vehicle; graph: the RoadGraph; o: { junctions, rng (a stream), personality: { speed, gap, patience, calm,
   *  squeeze (seconds in a stopped queue before it goes round it; none: it waits) },
   *  lane, s (where it starts on its lane; else the nearest lane), route: [lane ids], siren, keep (lane -> a weight,
   *  0..1: where it likes to wander, a gang car's turf: each way on is weighed by it) } */
  constructor(v, graph, o = {}) {
    this.v = v; this.g = graph; this.J = o.junctions || null; this.rng = o.rng || null; this.I = makeIntent(); this.id = v.id;
    this.p = Object.assign({ speed: 1, gap: 1, patience: 1, calm: true }, o.personality || {});
    this.route = o.route ? o.route.slice() : null; this.goal = null; this.arrived = false;
    this.path = []; this.i = 0; this.s = 0; this.speed = v.speed || 0;
    this.cause = null; this.leader = null; this.held = null; this.halted = null; this.haltT = 0;
    this.blocked = 0; this.honkT = 0; this.pass = null; this.passTry = 0; this.panic = 0; this.crashT = 0; this.exitT = 0;
    this.pinned = 0; this.unstick = 0; this.unsticks = 0; this.tr = null; this.siren = !!o.siren; this.lost = false; this.keep = o.keep || null;
    this.yieldTo = null; this.over = 0; this.overT = 0; this.overTry = 0; this.overS = 0; this.overWait = 0; this.lat = 0; this.noYield = null; this.noYieldT = 0;   // (pulled over for a siren: by how far, for how long after)
    const at = o.lane !== undefined ? { lane: graph.lanes[o.lane], s: o.s || 0 } : graph.nearestLane(v.x, v.y, v.heading, v.z);
    if (at) this.reset(at.lane, at.s); else this.lost = true;
  }
  /** start over on a lane, s along it */
  reset(lane, s = 0) { this.path = [{ k: 'lane', id: lane.id, s0: 0, len: lane.len }]; this.i = 0; this.s = s; this.rk = 0; this.lost = false; this.pass = null; this.tr = null; this._release(); this._grow(); }
  /** follow a GPS route (lane ids) to its last lane, stopping at s there (goal: { lane, s }) */
  setRoute(route, goal = null) {
    this.route = route ? route.slice() : null; this.goal = goal; this.arrived = false; this.rk = 0;
    const here = this.path[this.i];
    if (here && here.k === 'lane' && this.route && this.route.includes(here.id)) { this.path.length = this.i + 1; this._grow(); }
    else if (this.route && this.route.length) { const n = this.g.nearestLane(this.v.x, this.v.y, this.v.heading, this.v.z); if (n) this.reset(n.lane, n.s); }
  }
  /** the lane or connector it is on */
  get here() { return this.path[this.i] || null; }
  /** the lane it is on (or its connector's way in) */
  get lane() { const e = this.here; return !e ? null : e.k === 'lane' ? this.g.lanes[e.id] : this.g.lanes[this.g.conns[e.id].from]; }
  /** a shot, a blast, a crash nearby: panic for a while (faster, the lights ignored) */
  scare(seconds = 8) { this.panic = Math.max(this.panic, seconds); }
  /** it was hit: stop for a moment */
  crashed(seconds = 1.5) { this.crashT = Math.max(this.crashT, seconds); }
  /** gone (despawned, the driver out): give back any junction it holds */
  dispose() { this._release(); }

  // ---- the path
  _grow() {
    const G = this.g; let ahead = -this.s, lanes = 0;
    for (let j = this.i; j < this.path.length; j++) { ahead += this.path[j].len; if (this.path[j].k === 'lane') lanes++; }
    while ((lanes < 3 || ahead < 320) && this.path.length < 48) {
      const last = this.path[this.path.length - 1]; if (!last || last.k !== 'lane') return;
      const c = this._choose(G.lanes[last.id]); if (!c) return;
      this._append(last, c); ahead += c.len + G.lanes[c.to].len - c.toS - (G.lanes[last.id].len - c.fromS); lanes++;
    }
  }
  // after lane element `last`, connector c and the lane it joins (the lane element ends where c leaves it, the next
  // starts where c joins)
  _append(last, c) {
    const to = this.g.lanes[c.to];
    last.len = Math.max(1, c.fromS - (last.s0 || 0));
    this.path.push({ k: 'conn', id: c.id, len: c.len }, { k: 'lane', id: to.id, s0: c.toS, len: Math.max(1, to.len - c.toS) });
  }
  // the connector out of a lane: the route's, else a weighted pick (no dead ends unless forced; avoid: connector ids)
  _choose(lane, avoid = null) {
    const G = this.g, outs = lane.out.map(id => G.conns[id]).filter(c => c.kind !== 'change' && !(avoid && avoid.has(c.id)));
    if (!outs.length) return null;
    if (this.route) {
      // (where the path has grown to along the route: a route round the block visits its first lane twice)
      let k = this.route.indexOf(lane.id, this.rk || 0); if (k < 0) k = this.route.indexOf(lane.id);
      if (k >= 0 && k + 1 < this.route.length) { const c = outs.find(q => q.to === this.route[k + 1]); if (c) { this.rk = k + 1; return c; } }
      if (k === this.route.length - 1) { if (this.goal) return null; this.route = null; }   // (a route with no goal is only a way there: at its end, on as anyone)
    }
    let w = outs.map(q => { const to = G.lanes[q.to]; return to.deadEnd || !to.out.length || (to.bridge && this._closed && this._closed(to.bridge)) ? 0 : TURN_W[q.kind] ?? .1; });   // (a drawbridge with its gates shut: a dead end while they are)
    if (this.keep) { const k = outs.map(q => this.keep(G.lanes[q.to])); if (k.some((x, i) => x > 0 && w[i] > 0)) w = w.map((x, i) => x * k[i]); }   // (inside its turf while it can, back toward it when out)
    if (!w.some(x => x > 0) && !avoid) w = outs.map(q => (G.lanes[q.to].deadEnd === 'jump' ? 0 : 1));   // (forced: only a dead end goes on; never to dodge a jam)
    const tot = w.reduce((a, b) => a + b, 0); if (tot <= 0) return null;
    let r = (this.rng ? this.rng.next() : .5) * tot;
    for (let k = 0; k < outs.length; k++) { if (w[k] <= 0) continue; r -= w[k]; if (r <= 0) return outs[k]; }
    for (let k = outs.length - 1; k >= 0; k--) if (w[k] > 0) return outs[k];
    return null;
  }
  // the point [x, y, z] at s along element e
  _point(e, s) { const G = this.g; if (e.k === 'lane') return G.pointOn(G.lanes[e.id], (e.s0 || 0) + s); const c = G.conns[e.id]; return G.pointOnConn(c, E.clamp(s / (c.len || 1), 0, 1)); }
  /** { p, t (unit tangent), j, s } d units ahead along the path (null past its end) */
  ahead(d) {
    let j = this.i, s = this.s + d;
    while (j < this.path.length) {
      const e = this.path[j];
      if (s <= e.len || j === this.path.length - 1) { const ss = Math.min(Math.max(0, s), e.len), a = this._at(e, ss); return { p: a.p, t: a.t, j, s: ss }; }
      s -= e.len; j++;
    }
    return null;
  }
  // { p, t } at s along element e (a lane's direction is its own; a connector's from its path)
  _at(e, s) { const G = this.g; if (e.k === 'lane') { const l = G.lanes[e.id]; return { p: G.pointOn(l, (e.s0 || 0) + s), t: l.dir }; } return G.connAt(G.conns[e.id], s); }
  // how far along element e the point (x, y) lies
  _project(e, x, y) {
    const G = this.g;
    if (e.k === 'lane') { const l = G.lanes[e.id], dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1], L2 = dx * dx + dy * dy || 1; return E.clamp(E.clamp(((x - l.a[0]) * dx + (y - l.a[1]) * dy) / L2, 0, 1) * l.len - (e.s0 || 0), 0, e.len); }
    const c = G.conns[e.id]; let best = 0, bd = Infinity;   // (the nearest of the connector's own points, then between)
    for (let k = 0; k < c.pts.length; k++) { const q = c.pts[k], d = (q[0] - x) ** 2 + (q[1] - y) ** 2; if (d < bd) { bd = d; best = k; } }
    let s = c.cum[best];
    for (const k of [best - 1, best + 1]) { if (k < 0 || k >= c.pts.length) continue; const a = c.pts[Math.min(k, best)], b = c.pts[Math.max(k, best)], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy; if (!L2) continue; const f = ((x - a[0]) * dx + (y - a[1]) * dy) / L2; if (f > 0 && f < 1) { s = c.cum[Math.min(k, best)] + f * Math.sqrt(L2); break; } }
    return s;
  }
  // move s on by ds through the path's elements (kinematic), or to where (x, y) lies (physical)
  _advance(ds, x, y) {
    for (let guard = 0; guard < 8; guard++) {
      const e = this.path[this.i]; if (!e) break;
      if (ds !== null) { this.s += ds; ds = 0; } else { const pr = this._project(e, x, y); if (pr > this.s) this.s = pr; }
      if (this.s < e.len - .25 || this.i >= this.path.length - 1) break;
      this.s -= e.len; this.i++;
    }
    if (this.i > 10) { this.path.splice(0, this.i - 3); this.i = 3; }
    // a junction held is let go once its tail is out of the box (on the lane after it)
    if (this.held) {
      const e = this.path[this.i], j = this.path.indexOf(this.held.el);
      if (j < 0 || (this.i > j && e.k === 'lane' && this.s > this.v.hl + 6) || this.i > j + 1) this._release();
      else if (this.J) this.J.touch(this, this.held.conn, this.t || 0);
    }
  }
  _release() { if (this.held && this.J) this.J.release(this, this.held.conn.region); this.held = null; }

  // ---- what it sees ahead: the path sampled every few units (shifted while passing)
  _samples(look) {   // (one walk along the path, a sample every SAMPLE units)
    const out = []; let off = 0, d = 0, j = this.i, s = this.s;
    while (j < this.path.length && d <= look) {
      const e = this.path[j];
      if (s > e.len) { if (j === this.path.length - 1) break; s -= e.len; j++; continue; }
      const a = this._at(e, s);
      if (this.pass) off = this.pass.off * E.clamp((this.pass.d + d) / 24, 0, 1) * E.clamp((this.pass.end - (this.pass.d + d)) / 24, 0, 1);
      else if (this.over) off = this.lat + (this.over - this.lat) * E.clamp(d / OVER_RAMP, 0, 1);   // (where it is going: over to the right)
      out.push({ d, p: off ? [a.p[0] - a.t[1] * off, a.p[1] + a.t[0] * off, a.p[2]] : a.p, t: a.t, j, s });
      d += SAMPLE; s += SAMPLE;
    }
    return out;
  }
  // the nearest vehicle whose box comes within half our width of the path ahead: { gap (bumper to it), speed (along
  // our way: 0 for one coming at us), v, k }
  _leader(w, S) {
    const v = this.v, hw = v.hw + 1.5, hl = v.hl; if (!w.fleet || !S.length) return null;
    const mid = S[S.length >> 1].p; let best = null, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of S) { if (q.p[0] < x0) x0 = q.p[0]; if (q.p[0] > x1) x1 = q.p[0]; if (q.p[1] < y0) y0 = q.p[1]; if (q.p[1] > y1) y1 = q.p[1]; }
    for (const o of w.fleet.around(mid[0], mid[1], S[S.length - 1].d / 2 + 60)) {
      const R = o.hl + hw + 4;
      if (o.x < x0 - R || o.x > x1 + R || o.y < y0 - R || o.y > y1 + R) continue;   // (nowhere near the path's box)
      if (o === v || !o.body || o.cls === 'heli' || (this.pass && o === this.pass.obstacle) || o.towedBy === v || v.towedBy === o) continue;
      if (o.asleep && this._laneClear(o)) continue;   // (parked at a curb, clear of every lane)
      for (let qi = 0; qi < S.length; qi++) {
        const q = S[qi], far = Math.max(Math.abs(o.x - q.p[0]), Math.abs(o.y - q.p[1])) - R;
        if (far > 0) { qi += Math.floor(far / (SAMPLE + 2)); continue; }   // (the samples are about SAMPLE apart: none nearer can come sooner)
        if (q.d < hl - 4 || Math.abs(o.z - q.p[2]) > 12) continue;
        if (boxDistance(o, q.p[0], q.p[1]) >= hw) continue;
        // how far its near side is along our way from this sample: the gap from our front bumper
        const c = Math.cos(o.heading), s = Math.sin(o.heading); let minA = Infinity;
        for (const [f, r] of [[o.hl, o.hw], [o.hl, -o.hw], [-o.hl, o.hw], [-o.hl, -o.hw]]) { const cx = o.x + f * c - r * s, cy = o.y + f * s + r * c, al = (cx - q.p[0]) * q.t[0] + (cy - q.p[1]) * q.t[1]; if (al < minA) minA = al; }
        const gap = Math.max(0, q.d + Math.max(minA, -hw) - hl);
        if (!best || gap < best.gap) best = { gap, speed: Math.max(0, o.body.vx * q.t[0] + o.body.vy * q.t[1]), v: o, k: q };
        break;
      }
    }
    return best;
  }
  // the lowest brain id in the ring of stopped drivers whose leaders lead from L back to this one, or null (no ring)
  _ring(L) {
    let o = L && L.v, low = this.id;
    for (let n = 0; o && n < 8; n++) { if (o === this.v) return low; const b = o.brain; if (!b || !b.leader || o.speed > 2) return null; low = Math.min(low, b.id); o = b.leader.v; }
    return null;
  }
  // is a vehicle at rest clear of every lane (a car parked at a curb)? Worked out once each time it comes to rest there
  _laneClear(o) {
    const key = Math.round(o.x) * 7919 + Math.round(o.y) * 31 + Math.round(o.heading * 100);
    if (o._laneKey === key) return o._laneClr;
    const G = this.g, r = o.hl + 24; let clear = true;
    for (let gy = Math.floor((o.y - r) / 64); gy <= Math.floor((o.y + r) / 64) && clear; gy++) for (let gx = Math.floor((o.x - r) / 64); gx <= Math.floor((o.x + r) / 64) && clear; gx++) {
      for (const l of G.grid.get(gy * 4096 + gx) || []) {
        if (Math.abs(l.a[2] - o.z) > 14 && Math.abs(l.b[2] - o.z) > 14) continue;
        const dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1], L2 = dx * dx + dy * dy || 1, f = E.clamp(((o.x - l.a[0]) * dx + (o.y - l.a[1]) * dy) / L2, 0, 1), L = Math.sqrt(L2);
        for (const k of [-o.hl, 0, o.hl]) { const g = E.clamp(f + k / L, 0, 1); if (boxDistance(o, l.a[0] + dx * g, l.a[1] + dy * g) < LANE_CLEAR) { clear = false; break; } }
        if (!clear) break;
      }
    }
    o._laneKey = key; o._laneClr = clear; return clear;
  }
  // a ped in the way: the gap to it, or null. A calm driver yields on a crosswalk ahead (a wider reach); a panicking or
  // reckless one still brakes for a body right in its path
  _peds(w, S) {
    if (!w.pedsNear || !S.length) return null;
    const v = this.v, hl = v.hl, mid = S[S.length >> 1].p, kind = this.p.calm && !(this.panic > 0), patient = !(this.pedT > TUNE.pedPatience * this.p.patience); let best = null;   // (out of patience: a crossing's wide berth given up, a body's width kept)
    const C = this.g.city;
    for (const p of w.pedsNear(mid[0], mid[1], S[S.length - 1].d / 2 + 30)) {
      if (p.dead || p.floored || p.seat || Math.abs((p.z || 0) - mid[2]) > 14) continue;
      // (one standing still off the road, at a curb, is waited for only if it stands in our very way: it waits for us)
      const mv = p.mover, off = !!mv && C && C.surfaceAtPoint && !DRIVE.has(C.surfaceAtPoint(p.x, p.y)) && Math.hypot(mv.vx, mv.vy) < 6;
      for (const q of S) {
        if (q.d < hl - 2) continue;
        const reach = v.hw + (off ? 1 : !kind ? 3 : patient && this._onCross(q) ? 14 : 5);
        if ((p.x - q.p[0]) ** 2 + (p.y - q.p[1]) ** 2 < reach * reach) { const gap = Math.max(0, q.d - hl - 6); if (best === null || gap < best) best = gap; break; }
      }
    }
    return best;
  }
  _onCross(q) { const e = this.path[q.j]; if (!e || e.k !== 'lane') return false; const l = this.g.lanes[e.id], s = (e.s0 || 0) + q.s; for (const c of l.cross) if (s >= c[0] - 2 && s <= c[1] + 2) return true; return false; }
  // is that vehicle queueing for something (a light, a stop sign, the car ahead of it)? Then we queue behind it
  _queued(o) { const b = o && o.brain; return !!b && b !== this && !b.parked && b.yieldTo !== this.v && (b.cause !== null || b.speed > 3); }   // (parked: a unit whose crew is out; or pulled over for our siren: passed like any stopped car)
  // the lane beyond a connector has no room for us: something slow there with its tail within our length and a gap of
  // where that lane is clear of the junction and its zebra (lane.clearS): stopped behind it, we would stand on either
  _exitFull(w, c) {
    if (!w.fleet) return false; const L = this.g.lanes[c.to], need = (L.clearS || 0) + this.v.hl * 2 + 16, fx = L.a[0] + L.dir[0] * need / 2, fy = L.a[1] + L.dir[1] * need / 2;
    for (const o of w.fleet.around(fx, fy, need / 2 + 56)) {
      if (o === this.v || !o.body || o.cls === 'heli' || Math.abs(o.z - L.a[2]) > 12) continue;
      if (!o.driver && !o.brain && !o.ai) continue;   // (a car nobody drives will never move on: gone round, as in the lane, not waited for at the line)
      const dx = o.x - L.a[0], dy = o.y - L.a[1], along = dx * L.dir[0] + dy * L.dir[1], off = Math.abs(-dx * L.dir[1] + dy * L.dir[0]);
      if (along > -o.hl && along - o.hl < need && off < o.hw + 8 && o.speed < 30) return true;
    }
    return false;
  }
  // the stop line ahead: the distance from our front to where we must stop (null: nothing to stop for)
  _junction(dt, w, sp, S) {
    if (!this.J || this.panic > 0) return null;
    const G = this.g, t = w.t || 0, v = this.v, b = TUNE.idmBrake;
    // the first connector ahead with a box to reserve, and the distance to its stop line
    let d = -this.s, j = this.i;
    for (; j < this.path.length; j++) {
      const e = this.path[j];
      if (e.k === 'conn' && j > this.i) {
        const c = G.conns[e.id]; if (!this.J.regionOf(c)) { d += e.len; continue; }
        const lane = G.lanes[c.from], stopPos = Math.min(lane.stopS, c.fromS - 2);   // (d: from our centre to where this connector leaves its lane)
        const lineD = d - (c.fromS - stopPos) - v.hl, approach = sp * sp / (2 * b * .6) + 45;
        if (this.held && this.held.conn === c) {
          if (lineD > 1 && c.signals === 'signal' && !this.siren) {   // (not through yet: a light that changed is obeyed)
            const light = lightFor(c, G, t);
            if (light === 'red' || (light === 'amber' && lineD > sp * sp / (2 * b) + 2)) { this._release(); this.cause = 'signal'; return Math.max(0, lineD); }
          }
          return null;
        }
        if (lineD > approach) return null;
        const light = lightFor(c, G, t);
        let ready = true, cause = 'yield';
        if (light === 'red' && !this.siren) { ready = false; cause = 'signal'; }
        else if (light === 'amber' && !this.siren) {
          // (go only with no room to stop and time to cross the line at the speed it will reach it: a turn's, if slower)
          const stopping = sp * sp / (2 * b) + 2, left = amberLeft(G.regions.find(r => r.id === c.region), t, c.axis), vLine = c.kind === 'straight' ? sp : Math.min(sp, this._turnV || TURN_SPEED);
          if (lineD > stopping || lineD / Math.max(1, vLine) > left - .2) { ready = false; cause = 'signal'; }
        } else if (light === 'stop' && !this.siren) {
          cause = 'stop';
          if (this.halted !== c.region) { if (lineD < 14 && sp < 3) { this.haltT += dt; if (this.haltT >= TUNE.stopHalt) { this.halted = c.region; this.haltT = 0; } } ready = false; }
        }
        if (ready && this._exitFull(w, c)) { ready = false; cause = 'exit'; this.exitConn = c; this.exitT += dt; if (this.exitT > TUNE.exitWait && !this.route) { this.exitT = 0; this._reroute(j, c, w); } }
        else if (ready) this.exitT = 0;
        // (a squeezer kept yielding by a box that never clears, its way otherwise open: in anyway, as a player would)
        this.yieldT = ready && cause === 'yield' && this.p.squeeze ? (this.yieldT || 0) + dt : 0;
        if (this.J.ask(this, c, t, ready, this.siren ? 1 : 0) || this.yieldT > this.p.squeeze + 4) { this.held = { conn: c, el: e }; this.halted = null; this.yieldT = 0; return null; }
        this.cause = cause; return Math.max(0, lineD);
      }
      d += e.len;
      if (d > 400) break;
    }
    return null;
  }
  // a drawbridge's gates shut ahead (w.closed(id)): the stop line short of its span, as at a red light; a wanderer
  // waiting there TUNE.exitWait s takes another way where its lane has one (one already on the span drives off it)
  _gate(dt, w, sp) {
    this._closed = w.closed || null; if (!w.closed) return null;
    const G = this.g, v = this.v; let d = -this.s;
    for (let j = this.i; j < this.path.length && d < 320; j++) {
      const e = this.path[j], L = e.k === 'lane' ? G.lanes[e.id] : null;
      if (L && L.bridge && w.closed(L.bridge)) {
        const at = d + spanS(L, G.city) - (e.s0 || 0) - v.hl - GATE;   // (from our centre: our front stops GATE short of the span)
        if (at < 0) break;   // (past the line already, its nose at or on the span: on across, never left standing on it)
        if (sp < 3 && at < 20) { this.gateT = (this.gateT || 0) + dt; if (this.gateT > TUNE.exitWait && !this.route && j >= 2 && this.path[j - 1].k === 'conn') { this.gateT = 0; this._reroute(j - 1, G.conns[this.path[j - 1].id], w); } }
        return Math.max(0, at);
      }
      d += e.len;
    }
    this.gateT = 0; return null;
  }
  // a jammed exit: choose another way out of the lane before connector at path index j
  _reroute(j, c, w) {
    const lane = this.g.lanes[c.from], avoid = new Set([c.id]);
    for (const id of lane.out) { const o = this.g.conns[id]; if (o.id !== c.id && this._exitFull(w, o)) avoid.add(o.id); }
    const alt = this._choose(lane, avoid); if (!alt) return;
    this.path.length = j; this._append(this.path[j - 1], alt); this._grow();
  }
  /** may a pass round o run on past the stop line, through the box beside it? Round a car nobody drives (abandoned,
   *  wrecked: no brain, nobody at the wheel), any driver; round a unit parked at its scene, an assertive one (the
   *  player's, a siren's): either would stand in the lane for good */
  _throughBox(o) { return (!o.brain && !o.driver) || (!!this.siren && !!o.brain && (!!o.brain.parked || !!(o.duty && o.duty.out))); }
  /** stuck behind a car nobody drives a while (4 x TUNE.gridlock s), with no pass round it (at a junction's mouth, on a
   *  connector): shove it aside at a creep, as the gridlock breaker shoves a ring's next car */
  _shoves(L, stuck) { return !!(stuck && !this.pass && L && !L.v.brain && !L.v.driver && L.v.owner !== 'mission' && this.blocked > TUNE.gridlock * 4 && !(this.creepT > 0)); }   // (never a job's: a roadblock stays where it was put)
  // a pass round a stopped obstacle: the smallest sideways offset whose corridor is clear (walls, street furniture,
  // water, other vehicles, peds), out to past its far end; null when neither side is
  _planPass(L, w, S) {
    const v = this.v, o = L.v, q = L.k, n = [-q.t[1], q.t[0]], map = w.fleet && w.fleet.map; if (!map) return null;
    const c = Math.cos(o.heading), s = Math.sin(o.heading); let lo = Infinity, hi = -Infinity, far = 0;
    for (const [f, r] of [[o.hl, o.hw], [o.hl, -o.hw], [-o.hl, o.hw], [-o.hl, -o.hw]]) {
      const cx = o.x + f * c - r * s, cy = o.y + f * s + r * c, lat = (cx - q.p[0]) * n[0] + (cy - q.p[1]) * n[1], al = (cx - q.p[0]) * q.t[0] + (cy - q.p[1]) * q.t[1];
      lo = Math.min(lo, lat); hi = Math.max(hi, lat); far = Math.max(far, q.d + al);
    }
    const end = far + v.hl + 26, offs = [lo - v.hw - 5, hi + v.hw + 5].sort((a, b) => Math.abs(a) - Math.abs(b));
    // only along the lane it is on, short of its junction's stop line (never round a car into a junction box)
    const here = this.path[this.i]; if (!here || here.k !== 'lane') return null;
    const nextC = this.path[this.i + 1] && this.path[this.i + 1].k === 'conn' ? this.g.conns[this.path[this.i + 1].id] : null;
    const room = here.len - this.s - (nextC && this.J && this.J.regionOf(nextC) ? Math.max(0, nextC.fromS - Math.min(this.g.lanes[here.id].stopS, nextC.fromS - 2)) + v.hl : 0);
    if (end > room && !this._throughBox(o)) return null;
    for (const off of offs) {
      if (Math.abs(off) > 70) continue;
      let ok = true;
      for (let d = 0; d <= end && ok; d += 8) {
        const a = this.ahead(d); if (!a) { ok = false; break; }
        const k = E.clamp(d / 24, 0, 1) * E.clamp((end - d) / 24, 0, 1), px = a.p[0] - a.t[1] * off * k, py = a.p[1] + a.t[0] * off * k;
        if (!this._clearSpot(w, px, py, a.p[2], Math.atan2(a.t[1], a.t[0]), map)) { ok = false; break; }
        if (!ok) break;
        for (const u of w.fleet.around(px, py, v.hl + 40)) { if (u === v || u === o || !u.body || u.cls === 'heli' || Math.abs(u.z - a.p[2]) > 12) continue; if (boxDistance(u, px, py) < v.hw + 4 + (u.speed > 5 ? 20 : 0)) { ok = false; break; } }
        if (ok && w.pedsNear) for (const p of w.pedsNear(px, py, v.hl + 10)) if (!p.dead && !p.seat && Math.hypot(p.x - px, p.y - py) < v.hw + 6) { ok = false; break; }
      }
      if (ok) return { off, obstacle: o, d: 0, end };
    }
    return null;
  }

  // room to pull over for a siren: an offset to the right of at least need (its half-width and ours, and room) whose strip,
  // from beside us to a length and a bit ahead on this lane, is road (no curb), clear of vehicles, walls, street
  // furniture and peds: the offset, or 0
  _pullRoom(w, need) {
    const v = this.v, map = w.fleet && w.fleet.map, C = this.g.city, here = this.path[this.i]; if (!map || !here || here.k !== 'lane') return 0;
    const reach = v.hl + OVER_RAMP + 20; if (here.len - this.s < reach + v.hl) return 0;   // (room to get right over before the car ahead; never into a junction)
    for (const off of [need + 2, need]) {
      let ok = true;
      for (let d = 8; d <= reach && ok; d += 8) {
        const a = this.ahead(d); if (!a) { ok = false; break; }
        const k = E.clamp(d / OVER_RAMP, 0, 1), px = a.p[0] - a.t[1] * off * k, py = a.p[1] + a.t[0] * off * k, h = Math.atan2(a.t[1], a.t[0]);
        if (a.p[2] < 30 && C && C.surfaceAtPoint) for (const r of [-v.hw, 0, v.hw]) if (!DRIVE.has(C.surfaceAtPoint(px - a.t[1] * r, py + a.t[0] * r))) { ok = false; break; }
        if (!ok || !this._clearSpot(w, px, py, a.p[2], h, map)) { ok = false; break; }
        for (const u of w.fleet.around(px, py, v.hl + 40)) { if (u === v || !u.body || u.cls === 'heli' || Math.abs(u.z - a.p[2]) > 12) continue; if (boxDistance(u, px, py) < v.hw + 3) { ok = false; break; } }
        if (ok && w.pedsNear) for (const p of w.pedsNear(px, py, v.hw + 8)) if (!p.dead && !p.seat && Math.hypot(p.x - px, p.y - py) < v.hw + 5) { ok = false; break; }
      }
      if (ok) return off;
    }
    return 0;
  }
  // nothing moving along our lane beside or behind us (back into it after a siren has gone by)
  _laneFree(w) {
    const v = this.v, a = this.ahead(0); if (!a || !w.fleet) return true;
    const c = Math.cos(v.heading), s = Math.sin(v.heading);
    for (const u of w.fleet.around(v.x, v.y, v.hl + 90)) {
      if (u === v || !u.body || u.cls === 'heli' || u.speed < 3 || Math.abs(u.z - v.z) > 12) continue;
      const al = (u.x - v.x) * c + (u.y - v.y) * s, lat = (u.x - a.p[0]) * -a.t[1] + (u.y - a.p[1]) * a.t[0];
      if (al > -(v.hl + 80) && al < v.hl + 12 && Math.abs(lat) < u.hw + v.hw + 2) return false;
    }
    return true;
  }

  // can the vehicle stand at (x, y, z) facing h: no wall cell, no water, no solid in its box (street furniture still
  // standing, railings, pillars; a deck's own treads are road), and the ground under every corner within a step of z
  // (not off a deck's edge)
  _clearSpot(w, x, y, z, h, map) {
    const v = this.v, c = Math.cos(h), s = Math.sin(h), W = w.fleet.world, g0 = W.ground ? W.ground(x, y, z + 6) : z;
    if (Math.abs(g0 - z) > 12) return false;
    for (const [f, r] of [[v.hl, v.hw], [v.hl, -v.hw], [-v.hl, v.hw], [-v.hl, -v.hw], [0, 0]]) {
      const px = x + f * c - r * s, py = y + f * s + r * c, cx = Math.floor(px / 16), cy = Math.floor(py / 16);
      if ((z < 30 && map.cell(cx, cy) !== 0) || (W.water && W.water(cx, cy))) return false;
      if (W.ground && Math.abs(W.ground(px, py, z + 6) - g0) > 12) return false;   // (a corner off a deck's edge; a ramp's slope is fine)
    }
    if (map.solidsNear) for (const q of map.solidsNear(x, y, v.hl + 8)) {
      if (q.deck || q.top <= z + 3 || q.z > z + 30) continue;
      if (boxPoint(x, y, h, v.hl + 2, v.hw + 2, q.x, q.y, Math.max(q.hx, q.hy))) return false;
    }
    return true;
  }
  // is there room to back up d units: no other vehicle in the way behind it, its tail clear of a wall or a deck's edge?
  // (the railing or wall it is pinned against doesn't count: backing off is how it leaves it)
  _roomBehind(w, d) {
    const v = this.v, b = v.body; if (!b || !w.fleet) return false;
    const c = Math.cos(b.heading), s = Math.sin(b.heading), x = b.x - c * d, y = b.y - s * d, W = w.fleet.world, map = w.fleet.map;
    const tx = x - c * v.hl, ty = y - s * v.hl, cx = Math.floor(tx / 16), cy = Math.floor(ty / 16);
    if (map && b.z < 30 && map.cell(cx, cy) !== 0) return false;
    if (W.water && W.water(cx, cy)) return false;
    if (W.ground && Math.abs(W.ground(tx, ty, b.z + 6) - b.z) > 14) return false;
    for (const o of w.fleet.around(x, y, v.hl + d)) {
      if (o === v || !o.body || o.cls === 'heli' || Math.abs(o.z - b.z) > 12) continue;
      for (let k = v.hl; k <= v.hl + d; k += 6) if (boxDistance(o, b.x - c * k, b.y - s * k) < v.hw + 2) return false;
    }
    return true;
  }
  // ---- one step's thinking: the acceleration it wants (the leader, the line, peds), its honk and its passes
  _think(dt, w) {
    const v = this.v, G = this.g, sp = this.speed; this.t = w.t || 0;
    this.cause = null; if (this.panic > 0) this.panic -= dt;
    const mood = this.p.speed * (w.wet ? .86 : 1) * (this.panic > 0 ? 1.3 : 1);
    this._turnV ??= turnSpeed(v);   // (a long wheelbase takes a turn slower; a tighter arc slower still)
    const elV = e => e.k === 'lane' ? G.lanes[e.id].speed : (c => c.kind === 'straight' ? Math.min(G.lanes[c.to].speed, G.lanes[c.from].speed) : c.radius && c.radius < TURN_R - .5 ? turnSpeed(v, c.radius) : this._turnV)(G.conns[e.id]);
    const here = this.path[this.i]; let v0 = elV(here) * mood;
    for (let j = this.i + 1, d = here.len - this.s; j < this.path.length && d < 300; d += this.path[j].len, j++) v0 = Math.min(v0, Math.sqrt((elV(this.path[j]) * mood) ** 2 + 2 * TUNE.idmBrake * .55 * Math.max(0, d - v.hl)));
    let goalGap = null;   // (from our centre to where the goal wants it)
    if (this.goal) {
      let d = -this.s;
      for (let j = this.i; j < this.path.length; j++) { const e = this.path[j]; if (e.k === 'lane' && e.id === this.goal.lane) { const gg = d + this.goal.s - (e.s0 || 0); if (gg >= -1 || j > this.i) { goalGap = Math.max(0, gg); break; } } d += e.len; }   // (the goal behind us on this lane: the next time round)
      if (goalGap !== null && goalGap < 8 && sp < 8) this.arrived = true;
    }
    if (this.pass) { this.pass.d += sp * dt; if (this.pass.d >= this.pass.end) this.pass = null; }
    const look = 46 + sp * 1.35, S = this._samples(look);
    const L = this._leader(w, S); this.leader = L;
    // a gridlock: a ring of stopped drivers each waiting on the next (none can back off: cars behind each). After
    // TUNE.gridlock s the one of them with the lowest id creeps on a moment as if the way were clear, and its bump
    // shoves the others aside
    const ring = L && sp < 2 && !(this.creepT > 0) ? this._ring(L) : null;
    this.ringT = ring !== null ? (this.ringT || 0) + dt : 0;
    if (this.ringT > TUNE.gridlock && ring === this.id) { this.creepT = 2.5; this.ringT = 0; }
    const creep = this.creepT > 0; if (creep) { this.creepT -= dt; v0 = Math.min(v0, 18); }
    let gap = Infinity, lv = 0;
    if (L && !creep) { gap = L.gap; lv = L.speed; if (L.gap < 34 && L.speed < 3 && this._queued(L.v)) this.cause = 'queue'; }
    const stop = this._junction(dt, w, sp, S); if (stop !== null && stop < gap) { gap = stop; lv = 0; }
    const gate = this._gate(dt, w, sp); if (gate !== null && gate < gap) { gap = gate; lv = 0; this.cause = 'bridge'; }
    const pg = this._peds(w, S); if (pg !== null && pg < gap) { gap = pg; lv = 0; this.cause = 'ped'; }
    this.pedT = this.cause === 'ped' && sp < 3 ? (this.pedT || 0) + dt : sp > 20 ? 0 : this.pedT || 0;   // (how long held by people near its way; patience back once it is moving)
    if (goalGap !== null && goalGap + TUNE.idmMin < gap) { gap = goalGap + TUNE.idmMin; lv = 0; if (this.arrived) this.cause = 'arrived'; }
    // a siren coming up behind in our lane: over to the right into a gap that clears its way, and wait there; with no gap
    // (parked up on both sides), on ahead of it at our own speed. Back into the lane a moment after it has gone by, when
    // nothing is coming along it. A siren that stands behind us anyway (it could not get by) is led on instead
    this.yieldTo = null; if (this.noYieldT > 0 && (this.noYieldT -= dt) <= 0) this.noYield = null;
    if (w.sirens && !this.siren) for (const s of w.sirens) { if (s === v || s === this.noYield) continue; const dx = v.x - s.x, dy = v.y - s.y, d = Math.hypot(dx, dy); if (d < 140 && d > 10 && Math.abs(s.z - v.z) < 12 && (dx * Math.cos(s.heading) + dy * Math.sin(s.heading)) / d > .8 && Math.cos(s.heading - v.heading) > .5) { this.yieldTo = s; break; } }
    if (this.overTry > 0) this.overTry -= dt;
    if (this.yieldTo && !v.kinematic && !(this.panic > 0)) {
      this.overT = 1.5;
      if (!this.over && !(this.overTry > 0)) { this.overTry = .5; this.over = this._pullRoom(w, this.yieldTo.hw + v.hw + 4); this.overS = 0; }
    } else if (this.over && (this.overT -= dt) <= 0) { if (this._laneFree(w)) this.over = 0; else this.overT = .3; }
    this.overWait = this.over && this.yieldTo && sp < 2 && this.yieldTo.speed < 2 ? this.overWait + dt : 0;
    if (this.overWait > 3) { this.noYield = this.yieldTo; this.noYieldT = 12; this.yieldTo = null; this.over = 0; this.overWait = 0; }
    if (this.over) { v0 = Math.min(v0, 22); this.cause = this.cause || 'yield'; }
    // IDM
    const T = TUNE.idmGap * this.p.gap, s0 = TUNE.idmMin, a = TUNE.idmAccel, b = TUNE.idmBrake;
    const sStar = s0 + Math.max(0, sp * T + sp * (sp - lv) / (2 * Math.sqrt(a * b)));
    let acc = a * (1 - Math.pow(sp / Math.max(1, v0), 4)) - (gap < Infinity ? a * Math.pow(sStar / Math.max(.5, gap), 2) : 0);
    if (this.crashT > 0) { this.crashT -= dt; acc = -b * 2; this.cause = this.cause || 'crash'; }
    acc = E.clamp(acc, -b * 3, a);
    // nose to nose with another driver, each the other's leader: one backs off a little: the one with the higher id if
    // it has room behind it, else the other if that one has
    const ob = L && L.v.brain, mutual = !!(ob && ob.leader && ob.leader.v === v && sp < 3 && L.gap < 12);
    this.canBack = mutual ? this._roomBehind(w, 30) : false;
    if (mutual && !(this.unstick > 0) && !(ob.unstick > 0) && this.canBack && (this.id > ob.id || !ob.canBack)) this.unstick = .9;
    // stuck behind something stopped that isn't queueing (or, a driver who squeezes, behind a queue that hasn't moved for
    // its squeeze seconds: a player's way round a jam): a honk, then a pass round it
    this.queueT = this.cause === 'queue' && sp < 3 ? (this.queueT || 0) + dt : 0;
    const cur = this.path[this.i], left = cur && cur.k === 'lane' ? cur.len - this.s : 0;   // (a queue at a junction's line is no place to squeeze: only mid-lane, room past it)
    const squeeze = !!this.p.squeeze && this.queueT > this.p.squeeze && !!L && left > L.gap + L.v.hl * 2 + 50;
    const stuck = L && L.speed < 2 && L.gap < 30 && sp < 3 && (!this._queued(L.v) || (ob && ob.leader && ob.leader.v === v) || squeeze) && (!this.cause || squeeze);
    this.blocked = stuck ? this.blocked + dt : Math.max(0, this.blocked - dt * 2);
    if (stuck && this.siren) this.blocked = Math.max(this.blocked, TUNE.passAfter * this.p.patience);   // (a siren goes round at once)
    if (stuck) this.cause = L.v.duty && L.v.duty.out ? 'scene' : null;   // (a unit at its scene: a cause to wait, while it tries to go round)
    this.honkT = Math.max(0, this.honkT - dt);
    if (this.blocked > TUNE.honkAfter * this.p.patience && this.honkT <= 0) this.honkT = 3.5;
    if (stuck && !this.pass && this.blocked > TUNE.passAfter * this.p.patience) { this.passTry -= dt; if (this.passTry <= 0) { this.passTry = .75; this.pass = this._planPass(L, w, S); } }
    if (this._shoves(L, stuck)) { this.creepT = 2.5; this.blocked = TUNE.passAfter * this.p.patience; L.v.shoved = 3; if (w.fleet) w.fleet.wake(L.v); }   // (it gives as a pushed car does: vehicle.js)
    return acc;
  }
  // the free-road part of the thinking alone (between a far car's looks): no faster than its lane allows
  _think0(dt) { const e = this.path[this.i], G = this.g, v0 = (e && e.k === 'lane' ? G.lanes[e.id].speed : TURN_SPEED) * this.p.speed; if (this.held && this.J) this.J.touch(this, this.held.conn, w0(this)); return this.speed > v0 ? -TUNE.idmBrake * .5 : TUNE.idmAccel; }
  /** near: one step as a driver, writing the Intent the vehicle drives on */
  update(dt, w = {}) {
    const I = clearIntent(this.I), v = this.v, b = v.body; if (!b || this.lost || !this.path.length) return I;
    this.speed = Math.max(0, b.u);
    this._advance(null, b.x, b.y);
    // knocked off its way (a crash, a shove): back onto the nearest lane running its way
    const on = this._point(this.here, Math.min(this.s, this.here.len));
    if (Math.hypot(on[0] - b.x, on[1] - b.y) > 44 || Math.abs(on[2] - b.z) > 20) { const n = this.g.nearestLane(b.x, b.y, b.heading, b.z, 200); if (n) this.reset(n.lane, n.s); else return I; }
    this._grow();
    // (it thinks on every other step, by its id, and drives on that wish in between)
    const think = (this._tick = (this._tick || 0) + 1) % 2 === this.id % 2 || this._acc === undefined;
    const acc = think ? (this._acc = this._think(dt * 2, w)) : this._acc, sp = this.speed;
    // the controls from the acceleration wanted: throttle by the power left at this speed, the brake by the grip; held
    // at a stop on the handbrake (the pedal held at rest reverses)
    const top = b.h.top || 260, can = Math.max(30, (b.h.accel || 120) * (1 - sp / top));
    if (acc >= 0) I.throttle = E.clamp(acc / can, 0, 1); else I.brake = E.clamp(-acc / Math.max(120, b.h.brake || 300), 0, 1);
    if (sp < 4 && acc < 8) { I.throttle = 0; I.brake = 0; I.down.handbrake = true; }
    I.down.horn = this.honkT > 3;
    // pursuit steering: a point ahead on the path (shifted while passing, or right for a siren)
    const tg = this.ahead(Math.max(v.hl * 1.2, 10 + sp * .32)); if (!tg) return I;   // (never shorter than the vehicle: no lurch at a crawl)
    let side = 0;
    if (this.pass) side = this.pass.off * E.clamp(this.pass.d / 24, 0, 1) * E.clamp((this.pass.end - this.pass.d) / 24, 0, 1);
    else if (this.over) { this.overS += sp * dt; side = this.over * E.clamp(this.overS / OVER_RAMP, 0, 1); }
    // (and pulled back across by how far off the path it is now: pursuit alone cuts a corner's inside)
    const now = this.ahead(0), cross = now ? (b.x - now.p[0]) * -now.t[1] + (b.y - now.p[1]) * now.t[0] : 0, back = E.clamp(cross - side, -8, 8) * .6; this.lat = cross;
    const tx = tg.p[0] - tg.t[1] * (side - back), ty = tg.p[1] + tg.t[0] * (side - back);
    const dx = tx - b.x, dy = ty - b.y, c = Math.cos(b.heading), sn = Math.sin(b.heading), lx = dx * c + dy * sn, ly = -dx * sn + dy * c;
    const curv = 2 * ly / Math.max(1, lx * lx + ly * ly), wb = b.h.wheelbase || 36;
    I.steer = E.clamp(Math.atan(curv * wb) / (b.h.steer || .55), -1, 1);
    if (lx < 0) { I.steer = ly >= 0 ? 1 : -1; I.throttle = Math.min(I.throttle, .35); if (I.down.handbrake && sp < 4) { I.down.handbrake = false; I.throttle = .3; } }   // (it overshot: turn back)
    // pinned (pushing and going nowhere, nothing ahead): back off on the other lock, then try again
    const pushing = I.throttle > .25 && sp < 1.5 && (!this.leader || this.leader.gap > 12) && !this.cause;
    this.pinned = pushing ? this.pinned + dt : 0;
    if (this.pinned > 1.6) { this.pinned = 0; if (this._roomBehind(w, 24)) { this.unstick = .8; this.unsticks++; } }
    if (this.unstick > 0) { this.unstick -= dt; I.throttle = 0; I.down.handbrake = false; I.brake = b.u < -18 ? 0 : .55; I.steer = -I.steer || 1; }   // (a short, slow back-off)
    else this.unsticks = sp > 20 ? 0 : this.unsticks;
    return I;
  }
  /** far: one step as a kinematic lane follower (the vehicle placed on its path; no physics) */
  step(dt, w = {}) {
    const v = this.v, b = v.body; if (!b || this.lost || !this.path.length) return;
    this._grow();
    // (time-sliced: a far car looks about it every third step, by its id, and keeps its last wish in between; it still
    // keeps its junction asks alive)
    const look = (this._tick = (this._tick || 0) + 1) % 3 === this.id % 3 || this._acc === undefined;
    const acc = look ? (this._acc = this._think(dt * 3, w)) : Math.min(this._acc, this._think0(dt));
    this.speed = E.clamp(this.speed + acc * dt, 0, 400);
    this._advance(this.speed * dt, 0, 0); this._grow();
    const a = this.ahead(0); if (!a) return;
    // (going round something: beside its path by the pass's offset, as a near car steers it, never through it)
    const side = this.pass ? this.pass.off * E.clamp(this.pass.d / 24, 0, 1) * E.clamp((this.pass.end - this.pass.d) / 24, 0, 1) : 0;
    b.x = a.p[0] - a.t[1] * side; b.y = a.p[1] + a.t[0] * side; b.z = a.p[2]; b.heading = Math.atan2(a.t[1], a.t[0]);
    b.u = this.speed; b.v = 0; b.w = 0; b.vz = 0; b.airborne = false; b.steerAngle = 0;
    v.ctlNow = { throttle: acc > 0 ? .5 : 0, brake: acc < -20 ? .6 : 0, steer: 0, handbrake: false };
  }
  /** snap onto the path where the vehicle is (before going kinematic): false when it is too far off it */
  /** a car off its line and wedged there, out of the full simulation (a long truck turned across its lane at a post,
   *  nothing behind it it could back into): put back on its path at the first place ahead with room for it, facing its
   *  way, stopped (true: put). The far LOD takes it from there (snap) */
  unwedge(fleet) {
    const v = this.v, b = v.body; if (!b || this.over || this.lost || !this.path.length) return false;
    for (let d = 0; d <= 300; d += 30) {   // (none with room: tried again a while later, the queue it stands in moved on)
      const a = this.ahead(d); if (!a) return false;
      const [x, y, z = 0] = a.p;
      if (fleet && fleet.near(x, y, 80).some(o => o !== v && o.body && Math.abs((o.z || 0) - z) < 12 && Math.hypot(o.x - x, o.y - y) < o.hl + v.hl + 4)) continue;
      b.x = x; b.y = y; b.z = z; b.heading = Math.atan2(a.t[1], a.t[0]); b.u = b.v = b.w = 0; b.vz = 0; b.airborne = false; v.asleep = false;
      this.i = a.j; this.s = a.s; this.speed = 0; this.pass = null; this.pinned = 0; this.unstick = 0;
      return true;
    }
    return false;
  }
  snap() {
    const v = this.v, here = this.here; if (!here || !v.body || this.over) return false;   // (pulled over for a siren: physical until back in its lane)
    const pr = this._project(here, v.x, v.y), p = this._point(here, pr);
    if (Math.hypot(p[0] - v.x, p[1] - v.y) > SNAP_OFF || Math.abs(p[2] - v.z) > 12) return false;   // (well off its line, pulled over or pushed: physical until it is back on it, never put down on a car beside it)
    this.s = Math.max(this.s, pr); this.speed = Math.max(0, v.body.u); return true;
  }
}

const w0 = b => b.t || 0;
/** a vehicle's turning circle at rest (units, at its rear axle): its wheelbase over the tangent of its full lock */
export function turnCircle(v) { const h = v.body && v.body.h; return h ? h.wheelbase / Math.tan(h.steer || .55) : 60; }
/** the fastest a vehicle takes a junction's turn: where its lock, fading with speed (steerFade), still holds an arc a
 *  little tighter than TURN_R (at most TURN_SPEED; a crawl for a long wheelbase with little lock) */
export function turnSpeed(v, r = TURN_R) {
  const h = v.body && v.body.h; if (!h) return TURN_SPEED;
  const need = Math.atan(h.wheelbase / (r * .95)), k = 1 - need / (h.steer || .55);
  return E.clamp(k > 0 && h.steerFade > 0 ? k * h.top / h.steerFade : TURN_SPEED, 16, TURN_SPEED);
}
// is a circle (x, y, r) within a box at (bx, by) heading h with half sizes hl, hw?
function boxPoint(bx, by, h, hl, hw, x, y, r) {
  const c = Math.cos(h), s = Math.sin(h), dx = x - bx, dy = y - by, lx = dx * c + dy * s, ly = -dx * s + dy * c;
  return Math.abs(lx) < hl + r && Math.abs(ly) < hw + r;
}
// how far along a lane its drawbridge's span begins (the lane's first point inside the span), kept on the lane
function spanS(L, city) {
  if (L._spanS !== undefined) return L._spanS;
  const b = city && (city.drawbridges || []).find(q => q.id === L.bridge), T = city ? city.T : 16;
  let s0 = 0;
  if (b) { const [x0, y0, x1, y1] = b.rect; for (let s = 0; s <= L.len; s += 2) { const k = s / (L.len || 1), x = L.a[0] + (L.b[0] - L.a[0]) * k, y = L.a[1] + (L.b[1] - L.a[1]) * k; if (x >= x0 * T && x < (x1 + 1) * T && y >= y0 * T && y < (y1 + 1) * T) { s0 = s; break; } } }
  return (L._spanS = s0);
}
