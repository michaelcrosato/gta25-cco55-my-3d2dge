// The ped brain (PLAN.md 8.10): utility AI for one pedestrian of the crowd. It moves two ways:
//   - gliding (glide(dt, w)): a calm ped walks its sidewalk edges exactly, at its own offset across each (right of the
//     middle the way it goes, so two ways pass), stepping round what stands on the sidewalk by the edges' clearance
//     (Sidewalks.freeAt). No physics: Ped.glide places the body, so a crowd costs little;
//   - on its feet (update(dt, w)): a ped that reacts near a threat (flees, fights), heads off the graph to a spot, or
//     is off its line writes its Intent and its own physics moves it, until it is back on a line (feet: true).
// The Crowd chooses how often each runs (near the focus or far) and keeps a hurt, floored or burning ped on its feet.
// What it does:
//   - walks edge to edge; waits at a crosswalk for its signal (the crossed road's red) and for a gap in the cars (held
//     there longer than any light, by a car left standing on the zebra or a jam over it, it turns and goes another way);
//     now and then heads for a spot (a bench, a shop window, the curb to hail a cab);
//   - idles: a phone call, a chat with a passer-by, sitting on a bench, window-shopping, hailing a cab, a smoke, a dance
//     (the archetype's traits.idles); the rig plays each as a clip where the mocap set has one, else as a held pose;
//   - in rain some shelter against the buildings until it stops (the rest walk faster);
//   - reactions (react(kind, o)): flee (gunfire, a blast, a car coming at it on the sidewalk: away from the threat,
//     straight when it is near, else by the graph), cower (aimed at), fight back (tough ones, when hurt or jacked),
//     witness (a crime it saw: it stops and watches, then phones the police, which makes a `report` on the BUS unless
//     it is hurt or scared off first); knocked down and getting up are the Ped's own; dead, it lies where it fell.
// Deterministic: its rolls come from the crowd's RNG stream; it reads only the simulation.
//   const b = new PedBrain(ped, walks, { rng, traits });  calm: b.glide(dt, w)  on its feet: I = b.update(dt, w)
import { TUNE, knob } from '../core/tune.js';
import { BUS } from '../core/bus.js';
import { makeIntent, clearIntent } from '../sim/intent.js';
import { TRAITS } from '../actors/peds.js';
import { boxDistance } from '../actors/fleet.js';
import { aloft } from '../sim/vehicle/defs.js';

knob('Crowd', 'fleeTime', 'Flees for', 7, 1, 30, .5, 'Seconds a scared ped runs before it calms down');
knob('Crowd', 'callAfter', 'Call lasts', 2, .5, 10, .25, 'Seconds a witness spends on the phone before the police have the report (it can be stopped before then)');
knob('Crowd', 'idleChance', 'Stops to idle', .14, 0, 1, .01, 'The chance a walking ped stops for something at a corner');
knob('Crowd', 'shelterChance', 'Shelters from rain', .45, 0, 1, .05, 'The share of peds who stand under cover while it rains');
/** each idle: the clip the rig plays (mocap), the held pose without one, a prop in hand (raised at aim) and how long */
export const IDLES = {
  phone: { clip: 'Idle_TalkingPhone_Loop', pose: null, prop: 'phone', aim: .9, secs: [5, 10] },
  text: { clip: null, pose: null, prop: 'phone', aim: -.55, secs: [3, 7] },
  chat: { clip: 'Idle_Talking_Loop', pose: 'hips', secs: [5, 11] },
  bench: { clip: 'Sitting_Idle_Loop', pose: 'kneel', secs: [8, 16] },
  shop: { clip: 'Idle_FoldArms_Loop', pose: 'hips', secs: [4, 8] },
  cab: { clip: 'Help_One_Arm', pose: 'wave', secs: [4, 7] },
  smoke: { clip: 'Idle_FoldArms_Loop', pose: 'hips', secs: [4, 8] },
  dance: { clip: 'Dance_Loop', pose: 'cheer', secs: [5, 9] },
  shelter: { clip: 'Idle_FoldArms_Loop', pose: 'hips', secs: [1e9, 1e9] },
  cower: { clip: 'Help_Two_Arms', pose: 'crouch', secs: [2.5, 4.5] },
  call: { clip: 'Idle_TalkingPhone_Loop', pose: null, prop: 'phone', aim: .9, secs: [0, 0] },
};
const SPOT_IDLES = new Set(['bench', 'shop', 'cab']);
const CROSS_K = [.1, .3, .5, .7, .9];   // where along a crossing a car's box is tested
const WALK = 50, RUN = 85, LOOK = 10, NEAR_LINE = 2.5, JOIN = 16, W = 14, GIVE_UP = 20;   // (GIVE_UP: s at a crossing's curb before it goes another way: a light keeps it under 13)

export class PedBrain {
  /** ped: the Ped; walks: the Sidewalks; o: { rng, traits, id } */
  constructor(ped, walks, o = {}) {
    this.ped = ped; this.S = walks; this.rng = o.rng || null; this.I = makeIntent(); this.id = o.id ?? ped.id;
    this.traits = { ...TRAITS, ...(o.traits || {}) };
    this.want = 2 + 8 * this._r();   // (its offset across a sidewalk, right of the middle the way it goes: no single file, and two ways pass)
    this.state = 'walk'; this.t = 0; this.until = 0; this.threat = null; this.target = null; this.crime = null; this.goal = null;
    this.idle = null; this.spot = null; this.partner = null; this.sheltered = false; this.calls = 0; this.face = null;
    this.edge = null; this.node = null; this.to = null; this.a = 0; this.o = 0; this.from = null; this._pinch = undefined;
    this.feet = false; this.tick = this.id % 6; this.stuck = 0; this.lastPos = [ped.x, ped.y];
    /** follow: { leader (a PedBrain), i, gap }: walks in single file on the leader's trail (a troupe); trail: the
     *  leader's own (its last steps, newest last); home: { x, y, r }: keeps within r of it (a patrol's beat) */
    this.follow = null; this.trail = null; this.home = null;
    this.rejoin();
  }
  /** the point d units back along this ped's trail from where it stands (a follower's place), or null */
  trailPoint(d) {
    const T = this.trail, p = this.ped; if (!T || !T.length) return null;
    let x = p.x, y = p.y, left = d;
    for (let i = T.length - 1; i >= 0; i--) {
      const [tx, ty] = T[i], l = Math.hypot(tx - x, ty - y);
      if (l >= left) { const k = left / (l || 1); return [x + (tx - x) * k, y + (ty - y) * k]; }
      left -= l; x = tx; y = ty;
    }
    return null;
  }
  /** busy with a reaction (not to be talked to, nor sent anywhere) */
  get busy() { return this.state === 'flee' || this.state === 'fight' || this.state === 'cower' || this.state === 'witness' || this.state === 'phone' || this.state === 'dead'; }
  get offLine() { return this.feet || !this.edge; }
  /** put it on an edge, d units from a and at offset o across it (right of a to b), walking toward its b (dir 1) or a */
  place(e, d, o, dir = 1) {
    this.edge = e; this.node = dir > 0 ? e.a : e.b; this.to = dir > 0 ? e.b : e.a;
    this.a = dir > 0 ? d : e.len - d; this.o = dir > 0 ? o : -o; this.feet = false;
  }
  /** back onto the nearest line from wherever the body stands: gliding again if it is on one, else on its feet toward it.
   *  Returns true when it can glide */
  rejoin() {
    const p = this.ped, n = this.S.nearestEdge(p.x, p.y, 200); if (!n) { this.edge = null; this.feet = true; return false; }
    const e = n.e, A = this.S.nodes[e.a], B = this.S.nodes[e.b], hx = Math.cos(p.facing), hy = Math.sin(p.facing);
    const dir = (B.x - A.x) * hx + (B.y - A.y) * hy >= 0 ? 1 : -1;   // (on the way it faces)
    this.place(e, n.d, Math.max(-W, Math.min(W, n.o)), dir); this.from = null;
    this.feet = Math.abs(n.o) > W + 1 || n.dist > W + 1.5;
    return !this.feet;
  }
  /** something happened to it or near it: 'flee' { x, y, t } · 'cower' { by } · 'fight' { target } · 'witness' { crime }
   *  · 'chat' { with, secs } · 'goto' { x, y, idle, face, spot } · 'calm' */
  react(kind, o = {}) {
    const p = this.ped; if (p.dead) return false;
    if (kind === 'flee') {
      if (this.state === 'fight' && !o.force) return false;
      this._stopIdle(); this._cancelCall();
      this.state = 'flee'; this.threat = { x: o.x, y: o.y }; this.until = this.t + (o.t || TUNE.fleeTime) * (.8 + .4 * this._r());
    } else if (kind === 'cower') {
      if (this.state === 'fight' || this.state === 'flee') return false;
      this._stopIdle(); this._cancelCall();
      this.state = 'cower'; this.threat = o.by ? { x: o.by.x, y: o.by.y } : this.threat; this._idle('cower'); this.face = this.threat;
    } else if (kind === 'fight') {
      this._stopIdle(); this._cancelCall(); this.state = 'fight'; this.target = o.target; this.until = this.t + (o.t || 12); this.feet = true;
    } else if (kind === 'witness') {
      if (this.busy) return false;
      this._stopIdle(); this.state = 'witness'; this.crime = o.crime; this.threat = { x: o.crime.x, y: o.crime.y }; this.face = this.threat; this.until = this.t + .8 + .7 * this._r();
    } else if (kind === 'chat') {
      if (this.busy || this.state === 'idle' || this.state === 'goto') return false;
      this.partner = o.with; this.state = 'idle'; this._idle('chat', o.secs); this.face = o.with.ped;
    } else if (kind === 'goto') {
      if (this.busy) return false;
      this._stopIdle(); this.spot = o.spot || null; this.state = 'goto';
      const end = this.S.nearestEdge(o.x, o.y, 160);
      this.goal = { x: o.x, y: o.y, idle: o.idle || null, face: o.face || null, path: end ? this._pathTo(end.e) : null };
    } else if (kind === 'calm') { this._stopIdle(); this._cancelCall(); this.state = 'walk'; this.threat = null; this.target = null; this.feet = !this.rejoin(); }
    return true;
  }
  _r() { return this.rng ? this.rng.next() : .5; }
  // the call is off: the witness was hurt or scared before it got through
  _cancelCall() { if ((this.state === 'phone' || this.state === 'witness') && this.crime && !this.crime.reported) this.crime.cancelled = (this.crime.cancelled || 0) + 1; this.crime = null; }
  // an idle starts: its clip, pose and prop on the ped, for its time
  _idle(kind, secs) {
    const d = IDLES[kind] || IDLES.shop, p = this.ped; this.idle = kind;
    this.until = this.t + (secs ?? d.secs[0] + (d.secs[1] - d.secs[0]) * this._r());
    p.posing = d.pose; p.clip = d.clip; p.prop = d.prop || null; p.propAim = d.prop ? d.aim : null;
  }
  _stopIdle() {
    const p = this.ped; p.posing = null; p.clip = null; p.prop = null; p.propAim = null; this.idle = null; this.face = null;
    if (this.spot) { if (this.spot.by === this.id) this.spot.by = null; this.spot = null; }
    if (this.partner) { const q = this.partner; this.partner = null; if (q.partner === this && q.state === 'idle') { q.partner = null; q.until = Math.min(q.until, q.t + .5); } }
  }
  // the nodes from where it is walking to an edge's nearer end (the sidewalk graph's shortest walk), or null
  _pathTo(e) { if (this.to === null) return null; const r = this.S.route(this.to, e.a), r2 = this.S.route(this.to, e.b); return !r ? r2 : !r2 ? r : r.length <= r2.length ? r : r2; }

  // ---- gliding along the edges
  /** a calm step without physics: along its edge, round what stands on it; a stop at a corner, a wait at a crossing.
   *  w: { t (the signals' clock), city, fleet, player (the possessed Ped), wet, near (inside fpFull), crowdNear(x, y, r),
   *  spotFor(kind, x, y, brain), partnerFor(brain) } */
  glide(dt, w) {
    const p = this.ped; this.t += dt; this._closedAt = w.closedAt || null;
    if (p.dead) { this._die(); return; }
    if (this.follow) {   // in single file: its place on the leader's trail (the leader stops, it stops)
      const F = this.follow, L = F.leader;
      if (L.ped.dead || L.feet || L.state !== 'walk' && L.state !== 'idle' && L.state !== 'wait' || this.state !== 'walk') { this.follow = null; this.feet = !this.rejoin(); return; }
      // (never left standing in the road: with the leader stopped, the file closes up on the sidewalk behind it)
      let d = F.i * F.gap, pt = L.trailPoint(d);
      while (pt && d > 0 && w.city && w.city.surfaceAtPoint(pt[0], pt[1]) === 'road' && Math.hypot(L.ped.mover.vx, L.ped.mover.vy) < 5) { d -= 4; pt = L.trailPoint(Math.max(0, d)); }
      if (pt) p.glide(pt[0], pt[1], 0, (pt[0] - p.x) / dt, (pt[1] - p.y) / dt); else p.glide(p.x, p.y, p.z, 0, 0);
      return;
    }
    if (--this.tick <= 0) { this.tick = w.near ? 6 : 2; this._decide(w, !!w.near); }
    if (this.feet) return;
    const sp = this._plan(dt, w);
    if (this.feet) return;
    if (sp > 0 && this.edge) this._walk(dt, w, sp);
    else { p.glide(p.x, p.y, p.z, 0, 0); if (this.face) p.mover.facing = Math.atan2(this.face.y - p.y, this.face.x - p.x); }
  }
  // the state machine's calm part: how fast to walk now (0: stand), with its stops and its waits
  _plan(dt, w) {
    switch (this.state) {
      case 'walk': return this._curb(dt, this._canGo(w), w) ? WALK * (this.traits.pace || 1) * (w.wet > .5 ? 1.3 : 1) : 0;
      case 'goto': return this._curb(dt, this._canGo(w), w) ? WALK * (this.traits.pace || 1) : 0;
      case 'flee':
        if (this.t > this.until) { this.react('calm'); return 0; }
        if (w.near) { this.feet = true; return 0; }   // (near the focus: on its feet, straight away from the threat)
        return this._curb(dt, this._canGo(w, true), w) ? RUN : 0;
      case 'idle': if (this.t > this.until) { this._stopIdle(); this.state = 'walk'; this.feet = !this.rejoin(); } return 0;
      case 'witness': if (this.t > this.until) this._startCall(); return 0;
      case 'phone': if (this.t > this.until) this._report(); return 0;
      case 'cower': if (this.t > this.until) { this._stopIdle(); const th = this.threat || { x: this.ped.x, y: this.ped.y }; this.state = 'walk'; this.react('flee', { x: th.x, y: th.y, t: 4 }); } return 0;
      case 'fight': this.feet = true; return 0;
      default: return 0;
    }
  }
  // the wait at a crossing's curb (go: may it step off): held there GIVE_UP s, it turns and takes another way from the
  // corner it stands at (one heading for a spot gives that up). Returns go
  _curb(dt, go, w = null) {
    // (the time counts at the spot where it stands at the curb, whatever its state: a ped that fled to a curb, then calmed
    // down there, had started its wait again, and waited 38 s behind a lorry stopped on the zebra)
    const e = this.edge, p = this.ped, at = this.curbAt, away = !at || Math.hypot(p.x - at[0], p.y - at[1]) > 4;
    if (!e || e.kind !== 'cross' || this.a > 4) { if (away) { this.curbAt = null; this.curbT = 0; } return go; }
    if (go) return true;
    if (away) { this.curbAt = [p.x, p.y]; this.curbT = 0; }
    // (held by a vehicle stopped on its crossing, maybe waiting for it to get out of its sweep: after a moment it goes
    // another way; the two had waited on each other, and every ped coming round the corner stood on the same spot)
    if (w && this._stillBlock && this.curbT > 1.5) this.curbT = GIVE_UP;
    if ((this.curbT += dt) < GIVE_UP) return false;
    const S = this.S, here = this.node, N = S.nodes[here]; this.curbT = 0; this.curbAt = null; if (!N) return false;
    let opts = N.edges.map(id => S.edges[id]).filter(q => q !== e); if (opts.some(q => q.kind !== 'cross')) opts = opts.filter(q => q.kind !== 'cross');
    if (!opts.length) return false;
    if (this.state === 'goto') { this._stopIdle(); this.goal = null; this.state = 'walk'; }
    const next = opts[Math.min(opts.length - 1, Math.floor(this._r() * opts.length))], B = S.nodes[S.other(next, here)], l = next.len || 1, dx = (B.x - N.x) / l, dy = (B.y - N.y) / l;
    this.from = this.to; this.edge = next; this.to = S.other(next, here); this.a = (p.x - N.x) * dx + (p.y - N.y) * dy; this.o = (p.x - N.x) * -dy + (p.y - N.y) * dx; this._piece = undefined;
    return false;
  }
  // at the curb of a crossing: may it step off? (its signal, and no car coming; fleeing, only the cars count)
  _canGo(w, fleeing = false) {
    const e = this.edge; if (!e || e.kind !== 'cross' || this.a > 4) return true;
    const lit = !fleeing && e.region && e.region.signals === 'signal';   // (on its signal the cars yield: only one on it, or about to be, holds it back)
    return (fleeing || this.S.crossOpen(e, w.t)) && this._carsClear(w, e, lit);
  }
  // no car on a crossing, nor one that would reach it while we cross (lit: on the walk signal the cars yield: only one
  // on it or about to roll onto it, a third of a second away, holds a ped back; a long crossing over an avenue is no
  // longer than a short one for that)
  _carsClear(w, e, lit = false) {
    this._stillBlock = false; if (!e || !w.fleet) return true;
    const A = this.S.nodes[e.a], B = this.S.nodes[e.b], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    for (const v of w.fleet.around(mx, my, e.len / 2 + 90)) {
      if (!v.body || v.wrecked || aloft(v)) continue;
      const dx = mx - v.x, dy = my - v.y, d = Math.hypot(dx, dy);
      let near = Infinity; if (d < v.hl + e.len / 2 + 50) for (const k of CROSS_K) near = Math.min(near, boxDistance(v, A.x + (B.x - A.x) * k, A.y + (B.y - A.y) * k));
      if (near < (v.speed < 2 ? 3 : 9)) { this._stillBlock = v.speed < 2; return false; }   // (a car on it, moving or not; one stopped short of it is yielding: it goes first)
      if (v.speed < 15) continue;
      const toward = (v.body.vx * dx + v.body.vy * dy) / (v.speed * (d || 1));
      if (toward > .55 && (lit ? near < 6 + v.speed * .35 : d < 40 + v.speed * 1.1)) return false;   // (one that would reach it while we cross)
    }
    return true;
  }
  // one glide: along the edge at sp, its offset sliding toward the free one it wants a little ahead
  _walk(dt, w, sp) {
    const p = this.ped, S = this.S, e = this.edge, fwd = this.node === e.a, step = sp * dt;
    const look = Math.min(e.len, Math.max(0, this.a) + LOOK), piece = (e.id << 8) + Math.floor((fwd ? look : e.len - look) / 16);   // (the clear offset is worked out once a piece)
    if (piece !== this._piece) { this._piece = piece; this._free = S.freeAt(e, fwd ? look : e.len - look, fwd ? this.want : -this.want); }
    const free = this._free;
    if (free === null && w.near) { this.feet = true; this._pinch = this.a + LOOK + 18; return; }   // (nowhere clear ahead: past it on its feet)
    let goal = free === null ? this.o : fwd ? free : -free;
    // (the player in its way: round them, on the side of the line with room)
    const pl = w.player; if (pl && !pl.seat && Math.abs(pl.x - p.x) < 34 && Math.abs(pl.y - p.y) < 34) {
      const A = S.nodes[this.node], B = S.nodes[this.to], l = e.len || 1, ux = (B.x - A.x) / l, uy = (B.y - A.y) / l, ahead = (pl.x - p.x) * ux + (pl.y - p.y) * uy;
      if (ahead > -4 && ahead < 30) {
        const po = (pl.x - A.x) * -uy + (pl.y - A.y) * ux;   // (the player's offset, in its own frame)
        if (Math.abs(po - goal) < 12) for (const side of po <= this.o ? [1, -1] : [-1, 1]) { const want = po + side * 13, f = S.freeAt(e, fwd ? look : e.len - look, fwd ? want : -want); if (f !== null && Math.abs((fwd ? f : -f) - po) >= 10) { goal = fwd ? f : -f; break; } }
      }
    }
    if (w.closedAt && !w.closedAt(p.x, p.y)) {   // (a drawbridge's gates shut ahead: back the way it came, never onto the span; one on it walks off)
      const ah = Math.min(e.len, Math.max(0, this.a) + 6), [nx, ny] = S.along(e, fwd ? ah : e.len - ah, fwd ? this.o : -this.o);
      if (w.closedAt(nx, ny)) { const n = this.node; this.node = this.to; this.to = n; this.from = n; this.a = e.len - this.a; this.o = -this.o; this._piece = undefined; p.glide(p.x, p.y, p.z, 0, 0); return; }
    }
    const slide = Math.max(-step * .8, Math.min(step * .8, goal - this.o));
    this.o += slide; this.a += Math.sqrt(Math.max(0, step * step - slide * slide));
    if (this.a >= e.len) { this._arrive(w); if (!this.edge || this.feet) return; }
    const E2 = this.edge, f2 = this.node === E2.a, [x, y] = S.along(E2, f2 ? this.a : E2.len - this.a, f2 ? this.o : -this.o);
    if (this.trail) { const T = this.trail, q = T[T.length - 1]; if (!q || Math.hypot(q[0] - p.x, q[1] - p.y) >= 3) { T.push([p.x, p.y]); if (T.length > 80) T.shift(); } }
    p.glide(x, y, 0, (x - p.x) / dt, (y - p.y) / dt);
  }
  // at the node it walked to: the next edge (by its goal's path, away from a threat, or at random), framed from where it
  // stands; and maybe a stop for something
  _arrive(w) {
    const S = this.S, e0 = this.edge, f0 = this.node === e0.a, here = this.to, at = S.along(e0, f0 ? this.a : e0.len - this.a, f0 ? this.o : -this.o);
    this.from = this.node; this.node = here;
    let next = null;
    if (this.state === 'goto' && this.goal) { next = this._goalEdge(); if (!next) return; }
    if (!next) next = this._choose(this.state === 'flee' ? this.threat : null, this.state === 'flee' && !this._crossingsClear(w, here));
    if (!next) { this.edge = null; this.feet = true; return; }
    const N = S.nodes[here], B = S.nodes[S.other(next, here)], l = next.len || 1, dx = (B.x - N.x) / l, dy = (B.y - N.y) / l;
    this.edge = next; this.to = S.other(next, here); this.a = (at[0] - N.x) * dx + (at[1] - N.y) * dy; this.o = (at[0] - N.x) * -dy + (at[1] - N.y) * dx;
    if (this.state === 'walk' && next.kind !== 'cross' && N.corner && this._r() < TUNE.idleChance && this.traits.idles.length) this._startIdle(w);
  }
  // fleeing: are this node's crossings clear of cars? (not into the traffic)
  _crossingsClear(w, node) { for (const id of this.S.nodes[node].edges) { const e = this.S.edges[id]; if (e.kind === 'cross' && !this._carsClear(w, e)) return false; } return true; }
  // the next edge from the node it stands on: not straight back unless that is all there is; away from a threat, the
  // one leading farthest from it (a crossing counts as less far: the road is the last way out)
  _choose(away, noCross) {
    const S = this.S, here = this.node, n = S.nodes[here]; if (!n || !n.edges.length) return null;
    let opts = n.edges.map(id => S.edges[id]).filter(e => S.other(e, here) !== this.from || n.edges.length === 1);
    if (this._closedAt) { const ok = opts.filter(e => { const B = S.nodes[S.other(e, here)]; return !this._closedAt((n.x + B.x) / 2, (n.y + B.y) / 2) && !this._closedAt(B.x, B.y); }); if (ok.length) opts = ok; }   // (never onto a drawbridge with its gates shut)
    if (noCross && opts.some(e => e.kind !== 'cross')) opts = opts.filter(e => e.kind !== 'cross');
    if (!opts.length) opts = n.edges.map(id => S.edges[id]);
    if (away) {
      let best = null, bd = -1;
      for (const e of opts) { const B = S.nodes[S.other(e, here)], d = Math.hypot(B.x - away.x, B.y - away.y) * (e.kind === 'cross' ? .6 : 1); if (d > bd) { bd = d; best = e; } }
      return best;
    }
    // (a patrol out past its beat turns back toward it: the edges that lead home weigh more)
    const H = this.home, out = H && Math.hypot(n.x - H.x, n.y - H.y) > H.r;
    const wt = e => (e.kind === 'cross' ? .5 : 1) * (out ? (Math.hypot(S.nodes[S.other(e, here)].x - H.x, S.nodes[S.other(e, here)].y - H.y) < Math.hypot(n.x - H.x, n.y - H.y) ? 4 : .25) : 1);
    let tot = 0; for (const e of opts) tot += wt(e);
    let r = this._r() * tot;
    for (const e of opts) { r -= wt(e); if (r <= 0) return e; }
    return opts[opts.length - 1];
  }
  // walking to a spot: the next edge of its path; at the path's end, the last leg off the graph on its feet
  _goalEdge() {
    const g = this.goal, S = this.S, here = this.node;
    if (g.path) { const i = g.path.indexOf(here); if (i >= 0 && i < g.path.length - 1) { const nx = g.path[i + 1]; const e = S.nodes[here].edges.map(id => S.edges[id]).find(q => S.other(q, here) === nx); if (e) return e; } }
    this.feet = true; return null;   // (there: off the line to the spot itself)
  }
  // stop for something: a spot near by (a bench, a shop window, the curb), a passer-by to chat to, or an idle in place
  _startIdle(w) {
    const l = this.traits.idles, kind = l[Math.floor(this._r() * l.length)], p = this.ped;
    if (SPOT_IDLES.has(kind) && w.spotFor) { const s = w.spotFor(kind, p.x, p.y, this); if (s) { s.by = this.id; this.react('goto', { x: s.x, y: s.y, idle: kind, face: s.face, spot: s }); return; } }
    if (kind === 'chat') { const q = w.partnerFor && w.partnerFor(this); if (q) { const secs = 5 + 6 * this._r(); this.react('chat', { with: q, secs }); q.react('chat', { with: this, secs }); return; } }
    if (SPOT_IDLES.has(kind) && kind !== 'cab') return;   // (no bench or window near: walk on)
    this.state = 'idle'; this._idle(kind);
  }

  // ---- on its feet
  /** a step through the ped's own physics: returns its Intent (w as for glide) */
  update(dt, w) {
    const I = clearIntent(this.I), p = this.ped; this.t += dt;
    if (p.dead) { this._die(); return I; }
    if (p.floored || p.held || p.boarding || p.seat) return I;
    if (--this.tick <= 0) { this.tick = 6; this._decide(w, true); }
    const plan = this._feet(dt, w);
    if (!plan) { if (this.face) p.mover.facing = Math.atan2(this.face.y - p.y, this.face.x - p.x); }
    else if (plan.attack) { const tg = plan.attack; p.mover.facing = Math.atan2(tg.y - p.y, tg.x - p.x); I.tap.attack = true; I.down.attack = true; }
    else {
      const to = plan.to; let dx = to[0] - p.x, dy = to[1] - p.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      if (w.crowdNear) for (const o of w.crowdNear(p.x, p.y, 12)) { if (o === p || o.dead) continue; const ox = p.x - o.x, oy = p.y - o.y, od = Math.hypot(ox, oy); if (od > .1 && od < 11) { const k = (11 - od) / 11 * .8; dx += ox / od * k; dy += oy / od * k; } }
      const n = Math.hypot(dx, dy) || 1, push = plan.run ? 1 : .5;   // (.5: the Mover walks; a full push runs)
      I.move[0] = dx / n * push; I.move[1] = dy / n * push; I.down.sprint = !!plan.sprint;
      p.mover.walk = WALK * (this.traits.pace || 1);
    }
    // walking into something for a while: back to a line another way; long stuck, set down on the nearest one
    const moved = Math.hypot(p.x - this.lastPos[0], p.y - this.lastPos[1]); this.lastPos[0] = p.x; this.lastPos[1] = p.y;
    this.stuck = plan && !plan.attack && moved < .2 * dt * 60 ? this.stuck + dt : 0;
    if (this.stuck > 2.5 && this.stuck - dt <= 2.5) { if (this.state === 'goto') { this._stopIdle(); this.goal = null; this.state = 'walk'; } this._pinch = undefined; }
    if (this.stuck > 6) { const n = this.S.nearestEdge(p.x, p.y, 300); if (n) { const [x, y] = this.S.along(n.e, n.d, 0); p.place(x, y, 0); } this.stuck = 0; this.rejoin(); }
    return I;
  }
  // the state machine on its feet: where to go (null: stay), whether to run, whom to hit
  _feet(dt, w) {
    const p = this.ped;
    switch (this.state) {
      case 'flee': {
        if (this.t > this.until) { this.react('calm'); return this.feet ? this._join() : null; }
        if (!w.near && this.rejoin()) return null;   // (far from the focus: back to gliding, by the graph)
        const th = this.threat || { x: p.x - 1, y: p.y }, d = Math.hypot(p.x - th.x, p.y - th.y) || 1;
        return { to: [p.x + (p.x - th.x) / d * 40, p.y + (p.y - th.y) / d * 40], run: true, sprint: this.traits.brave < .5 && d < 260 };
      }
      case 'fight': {
        const tg = this.target;
        if (!w.near || !tg || tg.dead || this.t > this.until || Math.hypot(tg.x - p.x, tg.y - p.y) > 280) { p.posing = null; this.react('calm'); return this.feet ? this._join() : null; }
        const d = Math.hypot(tg.x - p.x, tg.y - p.y), car = tg.seat && tg.seat.vehicle;
        if (car) {   // (in a car: up to its door, shaking a fist, until it drives off or they get out)
          const dc = Math.hypot(car.x - p.x, car.y - p.y), reach = (car.hl || 20) + 10;
          if (dc > reach) { p.posing = null; return { to: [car.x, car.y], run: dc > 40 }; }
          this.face = car; p.posing = 'hips'; return null;
        }
        p.posing = null;
        if (d > 13) return { to: [tg.x, tg.y], run: d > 30 };
        this.face = tg; return this._r() < .25 ? { attack: tg } : null;
      }
      case 'goto': {
        const g = this.goal; if (!g) { this.state = 'walk'; return this._join(); }
        if (Math.hypot(g.x - p.x, g.y - p.y) < 5) { this.goal = null; this.state = 'idle'; this._idle(g.idle || 'shop'); this.face = g.face; return null; }
        return { to: [g.x, g.y] };
      }
      case 'idle': case 'witness': case 'phone': case 'cower':   // (standing: its calm part runs as it would gliding)
        this._plan(dt, w); return this.state === 'walk' ? this._join() : null;
      default: return this._join();
    }
  }
  // on its feet and calm: back to the nearest line (a pinch on the sidewalk: past it first); there, gliding again
  _join() {
    const p = this.ped;
    if (this._pinch !== undefined && this.edge) {
      const e = this.edge, fwd = this.node === e.a, d = Math.min(e.len, this._pinch), [x, y] = this.S.along(e, fwd ? d : e.len - d, 0);
      if (Math.hypot(x - p.x, y - p.y) > 6 && d < e.len) return { to: [x, y] };
      this._pinch = undefined;
    }
    const n = this.S.nearestEdge(p.x, p.y, 300); if (!n) return null;
    const o = Math.round(Math.max(-W, Math.min(W, n.o)));
    if (n.dist < NEAR_LINE || (Math.abs(n.o) < W && n.dist < JOIN && this.S.freeAt(n.e, n.d, o) === o)) { this.rejoin(); return null; }
    const [x, y] = this.S.along(n.e, n.d, 0); return { to: [x, y] };
  }

  // ---- what it notices: ten times a second near the focus, five far
  _decide(w, near) {
    const p = this.ped;
    if (near && w.fleet && !this.busy) {   // a car coming at it fast on the sidewalk: out of its way
      for (const v of w.fleet.around(p.x, p.y, 80)) {
        if (!v.body || v.speed < 55 || Math.abs(v.z - p.z) > 10) continue;
        const dx = p.x - v.x, dy = p.y - v.y, d = Math.hypot(dx, dy), toward = (v.body.vx * dx + v.body.vy * dy) / (v.speed * (d || 1));
        if (d < 72 && toward > .75 && w.city) { const s = w.city.surfaceAtPoint(v.x, v.y); if (s !== 'road' && s !== 'bridge') { this.react('flee', { x: v.x, y: v.y, t: 2.5 + this._r() * 2 }); break; } }
      }
    }
    // aimed at by the player: cower, or run (the brave and tough square up)
    const pl = w.player;
    if (near && pl && pl.aiming && !this.busy && pl.aimer && this._aimedAt(pl)) {
      if (this.traits.tough > .6 && this.traits.brave > .5) this.react('fight', { target: pl });
      else if (this._r() < .7) this.react('cower', { by: pl }); else this.react('flee', { x: pl.x, y: pl.y });
    }
    // rain: some go under cover, the rest hurry; dry again, out they come
    if (w.wet > .5 && !this.sheltered && this.state === 'walk') { this.sheltered = true; if (this._r() < TUNE.shelterChance) this._shelter(w); }
    if (w.wet < .3 && this.sheltered) { this.sheltered = false; if (this.state === 'idle' && this.idle === 'shelter') this.until = this.t; }
  }
  // the player's gun on it: locked on, or pointed within a few degrees, near enough to matter
  _aimedAt(pl) {
    const p = this.ped, dx = p.x - pl.x, dy = p.y - pl.y, d = Math.hypot(dx, dy); if (d > 240 || d < 1) return false;
    if (pl.aimer.target === p) return true;
    const a = pl.aimer.dir; return !!a && (a[0] * dx + a[1] * dy) / d > .985 && d < 180;
  }
  // to the building side of the sidewalk, out of the rain: a few units off the line toward the nearest wall
  _shelter(w) {
    const p = this.ped, C = w.city; if (!C) return false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 10; k <= 28; k += 6) {
      const x = p.x + dx * k, y = p.y + dy * k; if (C.map.cell(Math.floor(x / 16), Math.floor(y / 16)) !== 0) { this.state = 'goto'; this.goal = { x: p.x + dx * (k - 9), y: p.y + dy * (k - 9), idle: 'shelter', face: { x: p.x - dx * 40, y: p.y - dy * 40 }, path: null }; this.feet = true; return true; }
    }
    return false;
  }
  _startCall() { const c = this.crime; if (!c || c.reported) { this.crime = null; this._stopIdle(); this.state = 'walk'; return; } this.state = 'phone'; this._idle('call', TUNE.callAfter * (.8 + .4 * this._r())); this.face = this.threat; BUS.emit('witness', { crime: c.type, by: this.ped.id }); }
  // through to the police: the report (once a crime)
  _report() {
    const c = this.crime, p = this.ped; this.crime = null; this._stopIdle(); this.state = 'walk'; this.calls++;
    if (c && !c.reported) { c.reported = true; BUS.emit('report', { crime: c.type, x: c.x, y: c.y, by: c.by, victim: c.victim ?? null, witness: p.id, severity: c.severity || 1 }); }
  }
  _die() { if (this.state !== 'dead') { this._cancelCall(); this._stopIdle(); this.state = 'dead'; } }
}
