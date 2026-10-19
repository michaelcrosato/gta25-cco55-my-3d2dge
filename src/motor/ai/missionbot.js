// The mission bot (PLAN.md 8.15: "the AutoPlayer can play any mission from its hints"): each step it reads the running
// objective's hint (mission/dsl.js HINTS) and the runtime's nav point, and writes the possessed protagonist's Intent,
// as a pad would (the same scene code boards, drives, shoots and photographs), through the AutoPlayer's moves:
//   - goto: there (walking, or driving a long way; seated, it stays seated; o.foot: out and on foot; o.vehicle: in that
//     tagged vehicle first);
//   - enterVehicle: to the tagged vehicle's door and in (out of another first);
//   - deliver: into the vehicle to deliver, then there, stopped (a ped to deliver rides along: there in any vehicle);
//   - kill: the nearest living target: a vehicle rammed from the wheel, or shot (beaten, with only a bat) on foot; a
//     ped fought on foot (the fighter brain, ai/fighter.js, with the player's own guns and ammo); far, driven to first;
//   - evade: in a vehicle, away to the point of interest farthest from the police (another when there), until the
//     stars are gone;
//   - follow: in a vehicle, after the target, held back to its distance;
//   - race: the course's next checkpoint, in the racing style;
//   - photo: on foot to where it is taken from, the Snap in hand (the weapon steps), aimed, the shutter;
//   - stealth: walked to where the path begins (outdoors), then crouched along its waypoints, waiting at cover while
//     a guard indoors is uneasy (one outdoors that has seen it fought); a guard close with its back turned taken down.
// A choice is the runtime's (W.bot picks); a failed stage is its caller's to retry. Deterministic: only the simulation
// is read (no RNG of its own).
//   const B = new MissionBot({ city, roads, fleet, junctions });  each step: I = B.update(dt, ped, R, { t, pedsNear, wanted, police, inside })
import { makeIntent, clearIntent } from '../sim/intent.js';
import { AutoPlayer, pickable } from './autoplayer.js';
import { Fighter } from './fighter.js';
import { boxDistance } from '../actors/fleet.js';
import { blockedSpot } from '../world/fleet-spawn.js';
import { pointOf } from '../mission/actors.js';

const RETARGET = 1.2, CAR_NEAR = 220;
/** how the player fights (a fighter's profile): from farther off than a gang's grunt, in longer bursts, better aimed,
 *  backing off from one come close */
const PLAYER_FIGHT = { range: .75, burst: 1.3, pause: .25, aimOff: .03, kite: .6 };
const alive = a => a && !a.dead && !a.wrecked && !a.out;
const ptOf = a => (Array.isArray(a) ? a : [a.x, a.y]);

export class MissionBot {
  /** o: { city, roads ({ graph, gps, walks }), fleet, junctions, pad (true: every weapon change by the d-pad's steps,
   *  as a pad would: the pad pilot's) } */
  constructor(o) {
    this.pad = !!o.pad; this.city = o.city; this.roads = o.roads; this.fleet = o.fleet; this.J = o.junctions || null;
    this.auto = new AutoPlayer({ city: o.city, roads: o.roads, fleet: o.fleet, junctions: this.J });
    this.I = makeIntent(); this.ped = null; this.fighter = null; this.key = null; this.t = 0; this.re = 0; this.si = 0; this.aimT = 0; this.dest = null; this.crouchT = 0;
  }
  /** the stars lost in free roam, as a player loses them (the bot campaign's, between jobs): in a car, away from the
   *  police. w: as update's */
  evade(dt, p, w = {}) {
    if (p !== this.ped) { this.ped = p; this.auto.goal = null; this.car = null; this.dest = null; }
    if (p.dead || p.held || p.floored) return clearIntent(this.I);
    if (p.boarding) { this.auto.update(dt, p, w); return clearIntent(this.I); }
    return this._evade(dt, p, null, w);
  }
  /** the possessed ped's Intent this step, playing runtime R's objective. w: { t (the signals' clock), pedsNear, wet,
   *  wanted (the Wanted), police (the Police: its units), inside ({ id, run }: the interior it is in) } */
  update(dt, p, R, w = {}) {
    this.t += dt; this.re -= dt;
    if (p !== this.ped) { this.ped = p; this.fighter = null; this.key = null; this.auto.goal = null; }
    const I = clearIntent(this.I);
    if (!R || R.state !== 'running' || p.dead || p.held || p.floored) return I;
    if (p.boarding) { this.auto.update(dt, p, w); return I; }   // (the scene plays it; the AutoPlayer watches it go or give up)
    const v = p.seat && p.seat.vehicle;
    if (v && v.damage && v.damage.burning) return this._out(v);   // (a burning car: out)
    const h = R.objective && R.objective.hint; if (!h) return this._idle(I, v);
    const key = R.retries + ':' + R.stageIdx + ':' + h.kind + ':' + (h.target || h.targets || h.vehicle || h.what || '') + ':' + (R.objective.text || '');   // (a retry: all afresh)
    if (key !== this.key) { this.key = key; this.re = 0; this.si = 0; this.aimT = 0; this.dest = null; this.auto.goal = null; this.car = null; this.boardFor = null; this.tow = null; this.ramS = null; }
    // wanted on the way somewhere (a drop-off, a place to be), where the job doesn't ask for it (no timer running, the
    // stage not allowing the stars): lose them first, as a player would, and the objective after. (A fight, a chase, a
    // race or a photo goes on with the stars.)
    const travel = h.kind === 'deliver' || (h.kind === 'goto' && !h.spray);
    if (travel && w.wanted && w.wanted.stars > 0 && !R.allowWanted && !R.timer && !(w.inside)) return this._evade(dt, p, R, w);
    switch (h.kind) {
      case 'goto': return this._goto(dt, p, R, h, w);
      case 'enterVehicle': { const t = R.actors.tagged(h.vehicle).find(alive); return t ? this._board(dt, p, t, w) : this._idle(I, v); }
      case 'deliver': return this._deliver(dt, p, R, h, w);
      case 'kill': return this._kill(dt, p, R, h, w);
      case 'evade': return this._evade(dt, p, R, w);
      case 'follow': return this._follow(dt, p, R, h, w);
      case 'race': return this._race(dt, p, R, w);
      case 'photo': return this._photo(dt, p, R, h, w);
      case 'stealth': return this._stealth(dt, p, R, h, w);
      default: return this._idle(I, v);
    }
  }
  _idle(I, v) { if (v && v.speed > 4) I.brake = 1; return I; }
  _out(v) { const I = clearIntent(this.I); if (v.speed > 6) { I.brake = 1; return I; } I.tap.interact = true; I.down.interact = true; return I; }
  // the AutoPlayer to (x, y) with options, its goal moved only once the target has (a moving target: every RETARGET s)
  _go(dt, p, x, y, o, w) {
    const A = this.auto, g = A.goal;
    if (!g || g.board || !!g.foot !== !!o.foot || !!g.stay !== !!o.stay || (g.style || 'player') !== (o.style || 'player')) A.goto(x, y, o);
    else if (this.re <= 0 && Math.hypot(g.x - x, g.y - y) > (o.slack ?? 24)) { this.re = RETARGET; A.goto(x, y, { ...o, keep: true }); }
    return A.update(dt, p, w);
  }
  // into that vehicle: a long way off, near it first by any means (a car taken, as the AutoPlayer does), then to its door
  // (held to one way or the other: near it by car until within 260 or there, then to its door until it is 650 off)
  _board(dt, p, v, w) {
    const P = p.seat ? p.seat.vehicle : p, d = Math.hypot(v.x - P.x, v.y - P.y), A = this.auto;
    if (this.boardFor !== v) { this.boardFor = v; this.boardNear = d < (p.seat ? 110 : 450); }
    if (this.boardNear && d > 650) this.boardNear = false;
    else if (!this.boardNear && (d < (p.seat ? 110 : 260) || (A.goal && !A.goal.board && (A.state === 'arrived' || A.state === 'final')))) this.boardNear = true;
    if (!this.boardNear) return this._go(dt, p, v.x, v.y, { stay: true, radius: 100, slack: 80 }, w);
    if (!A.goal || A.goal.board !== v) A.board(v);
    return A.update(dt, p, w);
  }
  // a vehicle to drive: the nearest one that would do (the AutoPlayer's pick), boarded
  _car(dt, p, w) {
    if (!this.car || this.car.wrecked || this.auto.tried.has(this.car.id) || Math.hypot(this.car.x - p.x, this.car.y - p.y) > CAR_NEAR * 1.5 || (this.car.driver && this.car.driver !== p && this.car.driver.owner === 'mission')) this.car = this.auto._pickCar(p) || this._anyCar(p);
    return this.car ? this._board(dt, p, this.car, w) : null;
  }
  _anyCar(p) { let best = null, bd = CAR_NEAR * 3; for (const v of this.fleet.near(p.x, p.y, bd)) { if (!pickable(v) || this.auto.tried.has(v.id)) continue; const d = Math.hypot(v.x - p.x, v.y - p.y); if (d < bd) { bd = d; best = v; } } return best; }
  _goto(dt, p, R, h, w) {
    const at = h.at || (h.route && h.route[0]);
    if (h.vehicle) { const t = R.actors.tagged(h.vehicle).find(alive); if (t && (!p.seat || p.seat.vehicle !== t)) return this._board(dt, p, t, w); }
    if (h.spray) {   // (a fire to put out, a point to shoot at: within reach, stopped, aimed, the fire button held)
      const sp = h.spray, P = p.seat ? p.seat.vehicle : p, d = Math.hypot(sp[0] - P.x, sp[1] - P.y);
      if (d < (h.reach || 110)) { const I = clearIntent(this.I), a = Math.atan2(sp[1] - P.y, sp[0] - P.x); I.aim = [Math.cos(a), Math.sin(a)]; I.aimPoint = [sp[0], sp[1], 0]; I.down.fire = true; I.down.attack = true; I.down.aim = !p.seat; if (p.seat && P.speed > 6) I.brake = 1; if (p.seat) { let da = a - P.heading; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) > .9 && P.speed < 20) { I.throttle = .3; I.steer = Math.sign(da); } } return I; }
      return this._go(dt, p, sp[0], sp[1], { stay: true, radius: (h.reach || 110) * 1.2, slack: 30 }, w);
    }
    if (h.interact && !p.seat && Math.hypot(at[0] - p.x, at[1] - p.y) < Math.min(16, h.radius || 16)) { const I = clearIntent(this.I); if ((this.t * 4 | 0) % 2 === 0) { I.tap.interact = true; I.down.interact = true; } return I; }   // (there: △, a door's or a prompt's)
    return this._go(dt, p, at[0], at[1], { foot: !!h.foot || !!h.interact, stay: true, radius: h.interact ? 8 : h.radius || 24, z: at[2] }, w);
  }
  _deliver(dt, p, R, h, w) {
    const what = R.actors.tagged(h.what).find(alive), v = p.seat && p.seat.vehicle;
    if (h.tow && what) return this._towTo(dt, p, R, h, what, w);
    if (what && what.body && v !== what) return this._board(dt, p, what, w);   // (the vehicle to deliver: in it first)
    if (!v) { const I = this._car(dt, p, w); if (I) return I; }
    return this._go(dt, p, h.to[0], h.to[1], { stay: true, style: 'careful', radius: 40, z: h.to[2] }, w);
  }
  // a tow (deliver's tow: the truck's tag): into the truck; lined up on the car's axis past whichever end has room,
  // facing away from it; backed straight onto that end until the hook meets it, the hook's button; then there with it
  // in tow. No closer while backing (something in the way): staged again, and the second time from the other end
  _towTo(dt, p, R, h, car, w) {
    const truck = R.actors.tagged(h.tow).find(alive) || (p.seat && p.seat.vehicle && p.seat.vehicle.def.tool === 'hook' ? p.seat.vehicle : null), v = p.seat && p.seat.vehicle;
    if (!truck) return clearIntent(this.I);
    if (v !== truck) { this.tow = null; return this._board(dt, p, truck, w); }
    if (car.towedBy === truck) { this.tow = null; return this._go(dt, p, h.to[0], h.to[1], { stay: true, style: 'careful', radius: 50 }, w); }
    const T = this.tow && this.tow.car === car ? this.tow : (this.tow = { car, phase: 'stage', end: this._towEnd(car, truck), t: 0, n: 0, best: 1e9 });
    const e = T.end, dir = [Math.cos(e.h), Math.sin(e.h)], E = car.toWorld(e.k * car.hl, 0), off = truck.hl + 60, S = [E[0] + dir[0] * off, E[1] + dir[1] * off];
    const hook = truck.model.hook || [-truck.hl - 4, 0], H = truck.toWorld(hook[0], hook[1]), dH = Math.hypot(H[0] - E[0], H[1] - E[1]), I = clearIntent(this.I);
    let ah = e.h - truck.heading; ah = Math.atan2(Math.sin(ah), Math.cos(ah));
    if (dH < 18 && truck.speed < 12) { if ((this.t * 4 | 0) % 2 === 0) { I.tap.fire = true; I.down.fire = true; } I.brake = 1; return I; }   // (the hook)
    if (T.phase === 'stage') {   // to the staging point (the road, then straight at it)
      if (Math.hypot(truck.x - S[0], truck.y - S[1]) < 30 && truck.speed < 10) { T.phase = Math.abs(ah) < .35 ? 'back' : 'align'; T.t = 0; T.best = dH; }
      else return this._go(dt, p, S[0], S[1], { stay: true, radius: 16, slack: 10 }, w);
    }
    if (T.phase === 'align') {   // on along the axis, away from the car, until the truck faces its way
      T.t += dt; const A = [S[0] + dir[0] * 140, S[1] + dir[1] * 140]; let da = Math.atan2(A[1] - truck.y, A[0] - truck.x) - truck.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(ah) < .3 || T.t > 6) { T.phase = 'back'; T.t = 0; T.best = dH; return I; }
      I.steer = Math.max(-1, Math.min(1, da * 2)); if (truck.speed < 25) I.throttle = .5; return I;
    }
    // backing: the hook onto the car's end, steered by where that end lies behind
    T.t += dt; if (dH < T.best - 1) { T.best = dH; T.t = 0; }
    if (T.t > 2.5) { T.n++; T.phase = 'stage'; T.t = 0; if (T.n % 2 === 0) T.end = this._towEnd(car, truck, T.end); this.auto.goal = null; return I; }
    const back = Math.atan2(E[1] - H[1], E[0] - H[0]); let a = back - (truck.heading + Math.PI); a = Math.atan2(Math.sin(a), Math.cos(a));
    I.steer = Math.max(-1, Math.min(1, -a * 2.5)); if (truck.speed < 14) I.brake = .55; return I;
  }
  // the car's end to tow it by ({ k: 1 front | -1 rear, h: the way the truck faces }): one with room past it (no wall, no
  // vehicle where the truck would stand), else the front; other: the end tried before (the other one, then)
  _towEnd(car, truck, other = null) {
    const ends = [{ k: 1, h: car.heading }, { k: -1, h: car.heading + Math.PI }];
    if (other) return ends.find(e => e.k !== other.k);
    const room = e => {
      const E = car.toWorld(e.k * car.hl, 0), c = Math.cos(e.h), s = Math.sin(e.h), at = d => [E[0] + c * d, E[1] + s * d];
      for (let d = truck.hl * .5; d <= truck.hl * 2 + 60; d += 12) {
        const [x, y] = at(d); if (blockedSpot(this.city, x, y, e.h, 8, truck.hw)) return false;
        if (this.fleet.near(x, y, 40).some(o => o !== car && o !== truck && o.body && boxDistance(o, x, y) < truck.hw + 3)) return false;
      }
      return true;
    };
    return ends.find(room) || ends[0];
  }
  _kill(dt, p, R, h, w) {
    const v = p.seat && p.seat.vehicle; let t = null, td = 1e9;
    for (const a of R.actors.tagged(h.targets)) if (alive(a) && !(a.damage && a.damage.burning)) { const d = Math.hypot(a.x - p.x, a.y - p.y); if (d < td) { td = d; t = a; } }
    const fire = !v && R.actors.tagged(h.targets).find(a => a.damage && a.damage.burning && !a.wrecked && Math.hypot(a.x - p.x, a.y - p.y) < 90);
    if (fire) { const I = clearIntent(this.I), d = Math.hypot(p.x - fire.x, p.y - fire.y) || 1; I.move[0] = (p.x - fire.x) / d; I.move[1] = (p.y - fire.y) / d; I.down.sprint = true; return I; }   // (one on fire: away before it goes up)
    if (!t) return this._idle(clearIntent(this.I), v);
    if (v) {
      if (v.driver !== p) return this._driveBy(p, t);   // (a passenger: out of the window)
      if (t.body) return this._ram(dt, p, v, t, td, w);   // (a vehicle: rammed)
      if (td > 260) return this._go(dt, p, t.x, t.y, { stay: true, slack: 60 }, w);
      return this._out(v);
    }
    if (td > 420 && !t.body) { const I = this._car(dt, p, w); if (I) return I; }
    return this._fight(dt, p, t, w);
  }
  // a drive-by from a passenger seat: a pistol or the SMG in hand, aimed at the target, the trigger held
  _driveBy(p, t) {
    const I = clearIntent(this.I), gun = p.inv.list().find(id => { const s = p.inv.spec(id); return s && (s.slot === 'pistol' || s.slot === 'smg') && p.inv.rounds(id) && p.inv.rounds(id).total + p.inv.rounds(id).mag > 0; });
    if (!gun) return I;
    if (p.inv.current !== gun) return this._step(I, p, gun);
    const d = Math.hypot(t.x - p.x, t.y - p.y) || 1; I.aim = [(t.x - p.x) / d, (t.y - p.y) / d]; I.aimPoint = [t.x, t.y, t.z || 0];
    if (d < (p.inv.spec(gun).range || 300) * .8) { I.down.fire = true; I.down.attack = true; if (!p.inv.loaded()) I.tap.reload = true; }
    return I;
  }
  // a vehicle rammed: at it flat out; pressed against it at a crawl (a push does no harm), backed off for another run
  _ram(dt, p, v, t, d, w) {
    if (d > 140) return this._go(dt, p, t.x, t.y, { stay: true, style: 'race', slack: 50 }, w);
    const I = clearIntent(this.I), S = this.ramS || (this.ramS = { back: 0, slow: 0 }); let da = Math.atan2(t.y - v.y, t.x - v.x) - v.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (S.back > 0) { S.back -= dt; I.brake = 1; return I; }
    S.slow = d < v.hl + t.hl + 24 && v.speed < 12 ? S.slow + dt : 0;
    if (S.slow > .8) { S.slow = 0; S.back = 1.6; I.brake = 1; return I; }
    if (Math.abs(da) > 2.2) { I.brake = 1; I.steer = da > 0 ? -1 : 1; return I; }   // (behind: back up, turning)
    I.steer = Math.max(-1, Math.min(1, da * 2.5)); I.throttle = 1; return I;
  }
  // on foot against one target: the fighter brain with the player's own weapons (a vehicle beaten with a bat, or shot)
  _fight(dt, p, t, w) {
    const r0 = this.fighter && this.fighter.gun && p.inv.rounds(this.fighter.gun), dry = r0 && r0.total + r0.mag <= 0;   // (out of ammo: the next gun, else the bat or the fists)
    if (!this.fighter || this.fighter.ped !== p || this._kit !== p.inv.list().join() || dry) { this.fighter = new Fighter(p, { walks: this.roads.walks, map: this.city.map, fleet: this.fleet, refill: false, noSelect: this.pad, profile: PLAYER_FIGHT, best: true }); this._kit = p.inv.list().join(); }
    const F = this.fighter;
    const I = clearIntent(F.I);
    if (t.body) {   // a vehicle: right up to its side for a swing; a gun from where the fighter stands
      const melee = !F.gun || p.inv.spec(F.gun).projectile === 'melee';
      if (melee) {
        const bd = boxDistance(t, p.x, p.y); if (bd > 10) return F._go(dt, I, t.x, t.y, true, 'car' + t.id);
        if (p.inv.current !== F.melee) return this._step(I, p, F.melee);
        const d = Math.hypot(t.x - p.x, t.y - p.y); I.aim = [(t.x - p.x) / d, (t.y - p.y) / d]; I.tap.attack = (this.t * 4 | 0) % 2 === 0; I.down.attack = I.tap.attack; return I;
      }
    }
    const J = F.attack(dt, I, t);
    return F.want && p.inv.current !== F.want ? this._step(J, p, F.want) : J;
  }
  // to a weapon: picked (the wheel's pick), or with the pad the d-pad's steps, a tap every other step
  _step(I, p, w) {
    if (!this.pad) { p.inv.select(w); return I; }
    if ((this.t * 8 | 0) % 2 === 0) { I.tap.weaponNext = true; I.down.weaponNext = true; }
    return I;
  }
  _evade(dt, p, R, w) {
    const W = w.wanted; if (!W || !W.stars) return this._idle(clearIntent(this.I), p.seat && p.seat.vehicle);
    if (!p.seat) { const I = this._car(dt, p, w); if (I) return I; }
    const v = p.seat && p.seat.vehicle, P = v || p;
    if (!this.dest || Math.hypot(this.dest[0] - P.x, this.dest[1] - P.y) < 80) this.dest = this._far(P, w);
    return this._go(dt, p, this.dest[0], this.dest[1], { stay: true, style: 'race', slack: 80 }, w);
  }
  // the point of interest farthest from the police round the player (or from the player, with none about), past 500
  _far(P, w) {
    const units = w.police && w.police.units ? w.police.units.filter(u => !u.gone && u.car && u.car.v).map(u => u.car.v) : [];
    let cx = P.x, cy = P.y; if (units.length) { cx = units.reduce((a, u) => a + u.x, 0) / units.length; cy = units.reduce((a, u) => a + u.y, 0) / units.length; }
    let best = null, bd = -1;
    for (const q of this.city.pois) { const dp = Math.hypot(q.x - P.x, q.y - P.y); if (dp < 500 || dp > 2600) continue; const d = Math.hypot(q.x - cx, q.y - cy) - dp * .3; if (d > bd) { bd = d; best = [q.x, q.y]; } }
    return best || [P.x + 800, P.y];
  }
  _follow(dt, p, R, h, w) {
    const t = R.actors.tagged(h.target).find(alive); if (!t) return this._idle(clearIntent(this.I), p.seat && p.seat.vehicle);
    if (!p.seat) { const I = this._car(dt, p, w); if (I) return I; }
    const v = p.seat && p.seat.vehicle, d = Math.hypot(t.x - v.x, t.y - v.y), dist = h.dist || 120;
    if (d < dist * .6) { const I = clearIntent(this.I); I.brake = v.speed > 20 ? .6 : 0; return I; }   // (too close: held back)
    return this._go(dt, p, t.x, t.y, { stay: true, style: d > dist * 2 ? 'race' : 'player', slack: 40 }, w);
  }
  _race(dt, p, R, w) {
    const nav = R.nav(); if (!nav) return this._idle(clearIntent(this.I), p.seat && p.seat.vehicle);
    if (!p.seat) { const I = this._car(dt, p, w); if (I) return I; }
    const q = ptOf(nav); return this._go(dt, p, q[0], q[1], { stay: true, style: 'race', radius: 30, z: q[2] }, w);
  }
  _photo(dt, p, R, h, w) {
    const v = p.seat && p.seat.vehicle; if (v) return this._out(v);
    const tgt = typeof h.target === 'string' ? R.actors.tagged(h.target).find(alive) : h.target; if (!tgt) return clearIntent(this.I);
    const at = ptOf(tgt), from = h.from || at, d = Math.hypot(from[0] - p.x, from[1] - p.y), dt2 = Math.hypot(at[0] - p.x, at[1] - p.y);
    if (d > 28 && dt2 > 120) return this._go(dt, p, from[0], from[1], { foot: true }, w);
    const I = clearIntent(this.I);
    if (p.inv.current !== 'snap') { if (!p.inv.has('snap')) return I; if ((this.t * 8 | 0) % 2 === 0) I.tap.weaponNext = true; return I; }   // (the weapon steps to the Snap)
    const a = Math.atan2(at[1] - p.y, at[0] - p.x); I.aim = [Math.cos(a), Math.sin(a)]; I.aimPoint = [at[0], at[1], 0]; I.down.aim = true;
    this.aimT += dt; if (this.aimT > .4) { I.tap.attack = true; I.down.attack = true; this.aimT = 0; }
    return I;
  }
  _stealth(dt, p, R, h, w) {
    const v = p.seat && p.seat.vehicle; if (v) return this._out(v);
    const I = clearIntent(this.I), path = h.path.map(q => pointOf(this.city, q)), run = w.inside && w.inside.run;
    if (!run && this.si === 0 && Math.hypot(path[0][0] - p.x, path[0][1] - p.y) > 40) return this._go(dt, p, path[0][0], path[0][1], { foot: true, stay: true, radius: 12 }, w);   // (outdoors: walked to where the path begins)
    if (!p.crouching) { this.crouchT -= dt; if (this.crouchT <= 0) { I.tap.crouch = true; I.down.crouch = true; this.crouchT = .5; } return I; }
    // a guard close with its back turned: taken down (the scene offers it; the bot presses attack)
    if ((run && run.takedownFor && run.takedownFor(p)) || (!run && R.actors.takedownFor(p))) { I.tap.attack = true; I.down.attack = true; return I; }
    // indoors, a guard uneasy (noticing, searching): wait where it stands (at cover). Outdoors a guard that has seen us
    // fights (it has no unease): fought back
    if (run && run.guards && run.guards.some(g => g.mind && g.mind.state !== 'calm' && g.mind.state !== 'down' && !g.down)) return I;
    const foe = !run && R.actors.list.find(e => e.role === 'guard' && e.alerted && !e.a.dead && !e.down && !e.a.out && Math.hypot(e.a.x - p.x, e.a.y - p.y) < 320);
    if (foe) return this._fight(dt, p, foe.a, w);
    while (this.si < path.length - 1 && Math.hypot(path[this.si][0] - p.x, path[this.si][1] - p.y) < 10) this.si++;
    const q = path[this.si], dx = q[0] - p.x, dy = q[1] - p.y, l = Math.hypot(dx, dy) || 1;
    if (l < 6) return I;
    I.move[0] = dx / l * .6; I.move[1] = dy / l * .6; return I;
  }
  dispose() { this.auto.dispose(); }
}
