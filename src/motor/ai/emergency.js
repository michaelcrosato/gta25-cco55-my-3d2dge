// Emergency services (PLAN.md 8.10): the city answers what happens in it.
//   - the police answer reports (a witness's call: BUS 'report'; with the wanted system in the city, police.js decides
//     which reports earn the player stars and calls the rest in here): a patrol car comes with its siren on, its two
//     officers get out and look round where it happened, then drive on (police.js takes the unit over when they see
//     the player wanted: handOver);
//   - the Medic comes to bodies: its paramedics walk to the body, kneel over it and may bring a non-story ped back
//     (TUNE.reviveChance); a dead protagonist is the hospital's business, not theirs;
//   - the Pumper comes to car and street fires and plays its water cannon on them from the road until they are out.
// Each call (BUS 'dispatch' when a unit is sent) is answered by a unit Traffic.dispatch spawns at the footprint's edge
// and routes by the GPS; on the scene its crew works on foot (their own physics, steered here), climbs back in, and
// the unit rejoins the traffic. Calls far from the focus are settled without a unit (nobody would see it come).
// Deterministic: the 'services' RNG stream; calls in a fixed order.
//   const S = new Emergency({ life, combat, footprint, spec });  S.update(dt, ctx);  S.draw(stage, fx, fy, reach)
import { TUNE, knob } from '../core/tune.js';
import { RNG } from '../core/rng.js';
import { BUS } from '../core/bus.js';
import { makeIntent, clearIntent } from '../sim/intent.js';
import { boardingFor, exitFor } from '../actors/boarding.js';
import { aloft } from '../sim/vehicle/defs.js';

knob('Services', 'reviveChance', 'Paramedics revive', .6, 0, 1, .05, 'The chance the Medic\'s crew brings a dead non-story ped back');
knob('Services', 'medicAfter', 'Medic called after', 6, 0, 60, 1, 'Seconds after a death before the Medic is sent');
knob('Services', 'fireAfter', 'Pumper called after', 3, 0, 60, 1, 'Seconds a fire burns before the Pumper is sent');
knob('Services', 'callTimeout', 'A unit gives up after', 75, 10, 300, 5, 'Seconds a unit may take to reach its call before it is stood down');
knob('Services', 'searchTime', 'Officers look round for', 9, 1, 60, 1, 'Seconds the officers who answer a report search the scene');
const UNITS = {   // (each call's vehicle, crew, and how far short of the call it stops along its lane)
  police: { def: 'cruiser', crew: ['mpd', 'mpd'], stop: 30, max: 2 },
  medic: { def: 'medic', crew: ['paramedic', 'paramedic'], stop: 12, max: 2 },
  fire: { def: 'pumper', crew: ['firefighter', 'firefighter'], stop: 70, max: 1 },
};
const NOAIM = { candidates: [], level: 'off' };

export class Emergency {
  /** o: { life (CityLife: traffic, crowd), combat, fleet, footprint, spec ({ units: overrides of UNITS }), rng, reports
   *  (false: the police's reports come through police.js, not the BUS) } */
  constructor(o) {
    this.life = o.life; this.combat = o.combat || null; this.fleet = o.fleet; this.fp = o.footprint; this.rng = o.rng || RNG.stream('services');
    this.units = { ...UNITS, ...((o.spec && o.spec.units) || {}) };
    this.calls = []; this.onFoot = []; this.t = 0; this._ids = 0; this.answered = 0; this.revived = 0; this.step = 0;
    this.held = new Set();   // (kinds a job has stood down: m.standDown)
    this._unsub = o.reports === false ? [] : [BUS.on('report', e => this.call('police', e.x, e.y, { crime: e.crime, by: e.by }), 'world')];
  }
  dispose() { for (const u of this._unsub) u(); for (const f of this.onFoot) if (this.combat) this.combat.remove(f.ped); this.onFoot = []; }
  /** open a call ('police' | 'medic' | 'fire') at (x, y): a unit is sent (or the call is settled, far from the focus).
   *  Returns the call, or null when one like it is already being answered */
  call(kind, x, y, o = {}) {
    const U = this.units[kind]; if (!U || this.held.has(kind)) return null;   // (stood down: the job is the service, Firefighter's engine on call)
    if (this.calls.some(c => c.kind === kind && c.state !== 'done' && Math.hypot(c.x - x, c.y - y) < (kind === 'police' ? 260 : kind === 'medic' ? 180 : 90))) return null;   // (already on its way: one Medic a street's bodies, one after another)
    const T = this.life.traffic, far = this.fp.d(x, y) > TUNE.fpActivity;
    if (!far && T && this.calls.filter(q => q.kind === kind && q.unit && q.state !== 'done').length >= U.max) return null;   // (every unit out: it waits its turn)
    const c = { id: ++this._ids, kind, x, y, t: this.t, state: 'sent', unit: null, crew: [], target: o.target || null, info: o, done: null };
    this.calls.push(c);
    if (far || !T) { c.state = 'done'; c.done = 'far'; this.answered++; BUS.emit('dispatch', { kind, call: c.id, x, y, unit: null }); return c; }   // (settled out of sight)
    c.unit = T.dispatch(U.def, x, y, { kind, crew: U.crew, stop: U.stop });
    if (!c.unit) { this.calls.pop(); return null; }   // (no lane free to send one from: asked again in a moment)
    BUS.emit('dispatch', { kind, call: c.id, x, y, unit: c.unit.v.id });
    return c;
  }
  /** a police call given to the wanted system's chase (its officers saw the player wanted): its unit and its crew (on
   *  foot or aboard: { ped, seat }) leave the call, which ends here. Returns them, or null */
  handOver(c) {
    if (!c || c.kind !== 'police' || c.state === 'done' || !c.unit || !c.unit.duty || c.unit.duty.lost) return null;
    const out = { unit: c.unit, crew: c.crew.map(f => ({ ped: f.ped, seat: f.seat })), scene: c.state !== 'sent' };
    this.onFoot = this.onFoot.filter(f => !c.crew.includes(f)); c.state = 'done'; c.done = 'police'; this.answered++;
    return out;
  }
  /** one step. ctx: { t } */
  update(dt, ctx = {}) {
    this.t += dt; this.step++;
    this._watch();
    for (const c of this.calls) if (c.state !== 'done') this._run(c, dt);
    this.calls = this.calls.filter(c => c.state !== 'done' || this.t - c.t < 30);
    // the crews on foot: their own physics, steered here, on alternate steps
    const W = { map: this.life.city.map, city: this.life.city, combat: this.combat, fleet: this.fleet, aim: NOAIM };
    for (const f of this.onFoot) if ((this.step + f.k) % 2 === 0) { const I = this._steer(f, dt * 2); f.ped.update(dt * 2, I, W); }
  }
  // what needs a unit: bodies a while dead (the Medic), fires a while burning (the Pumper)
  _watch() {
    if (this.step % 30) return;   // (four times a second)
    const C = this.life.crowd, fp = this.fp;
    if (C) for (const m of C.members) {
      if (!m.deadT || m.attended || m.served === m.deadT || this.t < 1 || C.t - m.deadT < TUNE.medicAfter || fp.d(m.ped.x, m.ped.y) > TUNE.fpActivity) continue;   // (served: a Medic has been for this death; a body it left lies its time out, never called for again and kept)
      const c = this.call('medic', m.ped.x, m.ped.y, { target: m }); if (c) { c.target = m; m.attended = true; }
    }
    const F = this.combat && this.combat.fire;   // (a burning car goes up long before a unit could come: what it lights is the call)
    if (F && F.count) {
      let best = null, bd = Infinity; const w = F.w, T = F.T;
      for (const i of F.live) { if (F.heat[i] < .5) continue; const x = (i % w + .5) * T, y = ((i / w | 0) + .5) * T, d = fp.d(x, y); if (d < bd) { bd = d; best = [x, y]; } }
      if (best && bd < TUNE.fpActivity) { this._fireSeen = this._fireSeen ?? this.t; if (this.t - this._fireSeen > TUNE.fireAfter) this.call('fire', best[0], best[1]); } else this._fireSeen = null;
    }
  }
  // a call's course: the unit drives there; on the scene its crew works; back in, it drives on
  _run(c, dt) {
    const u = c.unit; if (!u) { c.state = 'done'; return; }
    const d = u.duty; if (!d || d.lost || u.v.wrecked) { this._standDown(c, 'lost'); return; }
    if (c.state === 'sent') {
      // there: at its stop, or standing near it; a crew on foot also gets out where its unit is held up short of the scene
      // a while (behind another unit parked there, on a street with no way round): they walk the rest
      // (never parked inside a junction, just out of one, nor where the traffic can't go round it, Traffic.parkable: held
      // up there, it waits; held up on a lane behind a car that won't move, it stops anyway: the way is blocked already)
      const T = this.life.traffic, dist = Math.hypot(u.v.x - c.x, u.v.y - c.y), ok = T.parkable(u); c.stillT = u.v.speed < 4 ? (c.stillT || 0) + dt : 0;
      if (d.arrived || (ok && u.v.speed < 4 && dist < 90) || (c.kind !== 'fire' && c.stillT > 3 && dist < 220 && (ok || T.heldBehind(u)))) { c.state = 'scene'; c.sceneT = this.t; this._arrive(c); }
      else if (this.t - c.t > TUNE.callTimeout) this._standDown(c, 'late');
      return;
    }
    if (c.state === 'scene') {
      if (c.kind === 'fire') {   // the cannon on what still burns near the scene, from where the Pumper stands
        const tg = this._fireNear(c, 170, u.v, 150);   // (what burns near the call within the cannon's reach)
        d.spray = tg; if (!tg || this.t - c.sceneT > 30) { d.spray = null; this._back(c); }
        return;
      }
      if (c.crew.every(f => f.task === 'aboard' || f.ped.dead)) this._back(c);
      return;
    }
    if (c.state === 'leaving' && c.crew.every(f => f.task === 'aboard' || f.ped.dead)) { this.onFoot = this.onFoot.filter(f => !c.crew.includes(f)); if (this._driver(u)) this.life.traffic.release(u); c.state = 'done'; c.done = c.done || 'answered'; this.answered++; if (c.target && c.target.attended !== undefined) { c.target.attended = false; c.target.served = c.target.deadT; } }   // (a body not brought back lies its time out and goes, as any)
  }
  // on the scene: the crew gets out (the Pumper's stays at its cannon)
  _arrive(c) {
    const u = c.unit; BUS.emit('onScene', { kind: c.kind, call: c.id, unit: u.v.id, x: c.x, y: c.y });
    if (c.kind === 'fire') return;
    u.duty.out = true; const b = u.v.body; b.u = b.v = b.w = 0; u.v.kinematic = true; u.brain.parked = true; u.brain.speed = 0;   // (parked where it stopped, a ramp too, until its crew is back: the traffic passes it)
    u.crew.forEach((ped, i) => {
      if (!ped || ped.dead) return;
      const plan = exitFor(ped, u.v); if (plan) ped.leave(plan); else { u.v.unseat(ped); const [x, y] = u.v.toWorld(0, (i % 2 ? 1 : -1) * (u.v.hw + 8)); ped.place(x, y, u.v.z); }
      const f = { ped, call: c, seat: i, k: this._ids + i, task: 'out', t: 0, to: null, faced: 0 };
      c.crew.push(f); this.onFoot.push(f); if (this.combat) this.combat.add(ped);
    });
  }
  // everyone back in (or the unit drives on without the dead)
  _back(c) {
    c.state = 'leaving';
    for (const f of c.crew) if (f.task !== 'aboard' && !f.ped.dead) f.task = 'back';
    if (!c.crew.length) this._resume(c.unit);
  }
  _standDown(c, why) {
    c.done = why; if (c.target && c.target.attended !== undefined) c.target.attended = false;
    // (its crew on foot stay in the world: handed to the crowd, the living scared off by what took their unit, the dead
    // lying their time out as bodies; nothing vanishes in sight, PLAN.md 7.6)
    const C = this.life.crowd, unit = c.unit && c.unit.v;
    for (const f of c.crew) { if (f.ped.seat) continue; if (C) C.adopt(f.ped, f.ped.dead ? 'dead' : 'scared', { from: unit }); else if (this.combat) this.combat.remove(f.ped); }
    this.onFoot = this.onFoot.filter(f => !c.crew.includes(f));
    if (c.unit && c.unit.duty && !c.unit.duty.lost) { this._resume(c.unit); if (!c.unit.duty.lost) this.life.traffic.release(c.unit); }
    c.state = 'done';
  }
  // the nearest thing still burning within r of the call (from: and within reach of that, nearest it: what the cannon
  // can hit from where the unit stands): a burning vehicle, or a hot cell
  _fireNear(c, r, from = null, reach = 0) {
    let best = null, bd = Infinity;
    const take = (x, y) => { if (Math.hypot(x - c.x, y - c.y) > r) return; const d = from ? Math.hypot(x - from.x, y - from.y) : Math.hypot(x - c.x, y - c.y); if ((!from || d <= reach) && d < bd) { bd = d; best = { x, y }; } };
    for (const v of this.fleet.vehicles) if (v.damage.burning && !v.wrecked) take(v.x, v.y);
    const F = this.combat && this.combat.fire;
    if (F && F.count) for (const i of F.live) { if (F.heat[i] >= .2) take((i % F.w + .5) * F.T, ((i / F.w | 0) + .5) * F.T); }
    return best;
  }
  // a crew member's step on foot: its task, and the Intent that walks it there
  _steer(f, dt) {
    const I = clearIntent(f.I || (f.I = makeIntent())), p = f.ped, c = f.call, u = c.unit; f.t += dt;
    if (p.dead || p.floored || p.held) return I;
    let to = null, via = null;
    switch (f.task) {
      case 'out': if (!p.boarding && !p.seat) { f.task = 'go'; f.t = 0; f.to = this._post(f); } break;
      case 'go': to = f.to; if (Math.hypot(to[0] - p.x, to[1] - p.y) < 10 || f.t > 12) { f.task = 'work'; f.t = 0; to = null; this._startWork(f); } break;
      case 'work': this._work(f, dt); break;
      case 'back':
        if (p.seat) { f.task = 'aboard'; p.clip = null; p.posing = null; if (this.combat) this.combat.remove(p); if (c.crew.every(q => q.task === 'aboard' || q.ped.dead)) this._resume(u); break; }
        if (!p.boarding) {
          p.clip = null; p.posing = null; const plan = boardingFor(p, u.v, f.seat, { clear: (x, y) => this._clear(x, y, u.v) });
          if (plan && !u.v.seats[f.seat] && f.t < 15) {   // (its door against a parked car: in by a clear one; a car between it and the door: round it first, the walk to a door a straight one. X7: a Fed Sedan at the Grand Palms' curb had stranded a Medic's crew and left the unit in Casino Row's lane for good)
            const c = Math.cos(u.v.heading), s = Math.sin(u.v.heading), door = [u.v.x + plan.door.x * c - plan.door.y * s, u.v.y + plan.door.x * s + plan.door.y * c];
            if (this._detour(p, door, u.v) === door) p.board(plan); else { to = door; via = u.v; }
          } else if (f.t >= 15) this._strand(f);
        }
        break;
      default: break;
    }
    if (to) { const g = this._detour(p, to, via), dx = g[0] - p.x, dy = g[1] - p.y, l = Math.hypot(dx, dy) || 1; I.move[0] = dx / l * .5; I.move[1] = dy / l * .5; }
    return I;
  }
  // the way to a point with vehicles in between (its own unit, most often): the shortest way round their boxes (widened
  // by a body) by their corners, a visibility graph over the few near it; its next corner, or straight there (skip: one
  // left out, the unit whose door it walks to)
  _detour(p, to, skip = null) {
    const boxes = [];
    for (const v of this.fleet.near(p.x, p.y, 110)) {
      if (!v.body || v === skip || aloft(v) || Math.abs(v.z - p.z) > 12) continue;
      const c = Math.cos(v.heading), s = Math.sin(v.heading);
      boxes.push({ v, c, s, L: v.hl + 9, W: v.hw + 9, loc: q => [(q[0] - v.x) * c + (q[1] - v.y) * s, -(q[0] - v.x) * s + (q[1] - v.y) * c] });
    }
    const P = [p.x, p.y];
    for (const B of boxes) {   // (a body pressed against a car stands inside its margin: that side drawn in to it, or every way out of there was cut)
      B.l = B.L - 3; B.w = B.W - 3; const [lx, ly] = B.loc(P), ix = B.l - Math.abs(lx), iy = B.w - Math.abs(ly);
      if (ix > 0 && iy > 0) { if (iy < ix) B.w = Math.abs(ly) - .5; else B.l = Math.abs(lx) - .5; }
    }
    const cut = (a, b) => boxes.some(B => segBox(B.loc(a), B.loc(b), B.l, B.w));
    if (!cut(P, to)) return to;
    const nodes = [P, to];
    for (const B of boxes) for (const [lx, ly] of [[B.L, B.W], [B.L, -B.W], [-B.L, B.W], [-B.L, -B.W]]) {
      const q = [B.v.x + lx * B.c - ly * B.s, B.v.y + lx * B.s + ly * B.c];
      if (!boxes.some(o => { const l = o.loc(q); return Math.abs(l[0]) < o.l && Math.abs(l[1]) < o.w; })) nodes.push(q);
    }
    const n = nodes.length, D = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false); D[0] = 0;
    for (;;) {   // (Dijkstra; a sight line is checked only when it would shorten the way)
      let i = -1; for (let k = 0; k < n; k++) if (!done[k] && D[k] < Infinity && (i < 0 || D[k] < D[i])) i = k;
      if (i < 0 || i === 1) break; done[i] = true;
      for (let k = 1; k < n; k++) { if (done[k]) continue; const d = D[i] + Math.hypot(nodes[k][0] - nodes[i][0], nodes[k][1] - nodes[i][1]); if (d < D[k] && !cut(nodes[i], nodes[k])) { D[k] = d; prev[k] = i; } }
    }
    if (prev[1] < 0) return to;
    const way = []; for (let k = 1; k > 0; k = prev[k]) way.unshift(nodes[k]);
    return way.find(q => Math.hypot(q[0] - p.x, q[1] - p.y) > 4) || to;   // (the next corner it is not already at)
  }
  // whether a body can stand at (x, y): no vehicle but v's there (a door's spot, a car parked against it)
  _clear(x, y, v) {
    return !this.fleet.near(x, y, 60).some(o => { if (o === v || aloft(o) || Math.abs(o.z - v.z) > 12) return false; const c = Math.cos(o.heading), s = Math.sin(o.heading), lx = (x - o.x) * c + (y - o.y) * s, ly = -(x - o.x) * s + (y - o.y) * c; return Math.abs(lx) < o.hl + 6 && Math.abs(ly) < o.hw + 6; });
  }
  // where a crew member goes on the scene: the body (the paramedics, either side of it), round the report (the officers)
  _post(f) {
    const c = f.call, side = f.seat % 2 ? 1 : -1;
    if (c.kind === 'medic' && c.target) { const b = c.target.ped; return [b.x + side * 9, b.y + 4]; }
    const a = this.rng.next() * Math.PI * 2, r = 14 + this.rng.next() * 30; return [c.x + Math.cos(a) * r, c.y + Math.sin(a) * r];
  }
  _startWork(f) {
    const c = f.call, p = f.ped;
    if (c.kind === 'medic') { p.clip = 'Fixing_Kneeling'; p.posing = 'kneel'; f.until = 4 + this.rng.next() * 2; if (c.target) p.mover.facing = Math.atan2(c.target.ped.y - p.y, c.target.ped.x - p.x); }
    else { p.posing = 'hips'; f.until = TUNE.searchTime * (.8 + .4 * this.rng.next()); }
  }
  // the work itself: kneeling over the body (then maybe a revive), looking round
  _work(f, dt) {
    const c = f.call, p = f.ped;
    if (c.kind === 'police') { f.faced -= dt; if (f.faced <= 0) { f.faced = 1.5 + this.rng.next() * 2; p.mover.facing += (this.rng.next() - .5) * 2.4; } }
    if (f.t < f.until) return;
    if (c.kind === 'medic' && c.target && f.seat === 0 && !c.revived) {
      c.revived = true; const m = c.target, b = m.ped, C = this.life.crowd;
      if (b.dead && !b.character && this.rng.next() < TUNE.reviveChance && C) { C.revive(m); this.revived++; BUS.emit('revived', { target: b.id, by: p.id }); }
    }
    f.task = 'back'; f.t = 0;
  }
  // the crew back aboard (or gone): the unit drives again
  _resume(u) { if (!u || !u.duty || !this._driver(u)) return; u.duty.out = false; u.brain.parked = false; }
  // a unit whose driver is dead: a living crew member aboard takes the wheel; with none, the car is left where it stands
  // (it had waited there for good, in a junction too)
  _driver(u) {
    const v = u.v; if (v.driver && !v.driver.dead) { u.driver = v.driver; return true; }
    if (v.driver) v.unseat(v.driver);
    const q = (u.crew || []).find(p => p && !p.dead && p.seat && p.seat.vehicle === v);
    if (!q) { this.life.traffic.abandon(u); return false; }
    v.unseat(q); v.sit(q, 0); u.driver = q; return true;
  }
  // a crew member who could not get back in (its seat taken, its unit gone): it walks off with the crowd
  _strand(f) {
    f.task = 'aboard'; const p = f.ped; this.onFoot = this.onFoot.filter(q => q !== f);
    if (this.combat) this.combat.remove(p);
    if (this.life.crowd) this.life.crowd.adopt(p, 'calm', { arch: null }); else if (this.combat) this.combat.add(p);
    if (f.call.unit && f.call.crew.every(q => q.task === 'aboard' || q.ped.dead)) this._resume(f.call.unit);
  }
  /** the crews on foot round the focus */
  draw(stage, fx, fy, reach) { for (const f of this.onFoot) { const p = f.ped; if (!p.seat && Math.abs(p.x - fx) < reach && Math.abs(p.y - fy) < reach) p.draw(stage, { crowd: true, key: p.rig }); } }
  /** the bodies on foot it owns (for drivers to yield to, and peds to keep apart from) */
  get bodies() { return this.onFoot.filter(f => !f.ped.seat).map(f => f.ped); }
  hash() { let h = this.calls.length * 31 + this.answered; for (const f of this.onFoot) h = (h * 31 + Math.round(f.ped.x * 4) * 7 + Math.round(f.ped.y * 4)) >>> 0; return [this.calls.length, this.answered, this.revived, h]; }
  stats() { const st = {}; for (const c of this.calls) st[c.kind + ':' + c.state] = (st[c.kind + ':' + c.state] || 0) + 1; return { calls: st, onFoot: this.onFoot.length, answered: this.answered, revived: this.revived }; }
}

// does the segment a-b (in a box's frame) cross the box [-L, L] x [-W, W]? (Liang-Barsky)
function segBox(a, b, L, W) {
  let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] + L], [dx, L - a[0]], [-dy, a[1] + W], [dy, W - a[1]]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return t0 <= t1;
}
