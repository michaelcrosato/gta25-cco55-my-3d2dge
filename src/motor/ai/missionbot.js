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
//     stars are gone; with the Eye up, under a deck instead, held there while the stars flash out;
//   - follow: in a vehicle, after the target, held back to its distance;
//   - race: the course's next checkpoint, in the racing style;
//   - photo: on foot to where it is taken from, the Snap in hand (the weapon steps), aimed, the shutter;
//   - stealth: walked to where the path begins (outdoors), then crouched along its waypoints, waiting at cover while
//     a guard indoors is uneasy (one outdoors that has seen it fought); a guard close with its back turned taken down.
// A choice is the runtime's (W.bot picks); a failed stage is its caller's to retry. Deterministic: only the simulation
// is read (no RNG of its own).
//   const B = new MissionBot({ city, roads, fleet, junctions });  each step: I = B.update(dt, ped, R, { t, pedsNear, wanted, police, inside })
import { makeIntent, clearIntent } from '../sim/intent.js';
import { TUNE } from '../core/tune.js';
import { AutoPlayer, pickable } from './autoplayer.js';
import { Fighter, lineOfFire } from './fighter.js';
import { boxDistance } from '../actors/fleet.js';
import { blockedSpot } from '../world/fleet-spawn.js';
import { pointOf } from '../mission/actors.js';
import { underDeck } from '../police/police.js';

const RETARGET = 1.2, CAR_NEAR = 220;
/** how the player fights (a fighter's profile): from farther off than a gang's grunt, in longer bursts, better aimed,
 *  backing off from one come close */
const PLAYER_FIGHT = { range: .75, burst: 1.3, pause: .25, aimOff: .03, kite: .6 };
const alive = a => a && !a.dead && !a.wrecked && !a.out;
const ptOf = a => (Array.isArray(a) ? a : [a.x, a.y]);

// a cop on foot within r of the car, on its level (police: the Police), or undefined
const copOnFoot = (police, v, r) => ((police && police.cops) || []).find(c => !c.ped.dead && !c.ped.seat && !c.ped.floored && Math.hypot(c.ped.x - v.x, c.ped.y - v.y) < r && Math.abs((c.ped.z || 0) - (v.z || 0)) < 14);

export class MissionBot {
  /** o: { city, roads ({ graph, gps, walks }), fleet, junctions, pad (true: every weapon change by the d-pad's steps,
   *  as a pad would: the pad pilot's) } */
  constructor(o) {
    this.pad = !!o.pad; this.city = o.city; this.roads = o.roads; this.fleet = o.fleet; this.J = o.junctions || null;
    this.auto = new AutoPlayer({ city: o.city, roads: o.roads, fleet: o.fleet, junctions: this.J });
    this.I = makeIntent(); this.ped = null; this.fighter = null; this.key = null; this.t = 0; this.re = 0; this.si = 0; this.aimT = 0; this.dest = null; this.crouchT = 0; this.crouched = false;
  }
  /** the stars lost in free roam, as a player loses them (the bot campaign's, between jobs): in a car, away from the
   *  police. w: as update's */
  evade(dt, p, w = {}) {
    this.t += dt; this.re -= dt;   // (the retarget's clock too: without it a goal that moved was followed once, never again)
    if (p !== this.ped) { this.ped = p; this.auto.goal = null; this.car = null; this.dest = null; this.cover = null; }
    if (p.dead || p.held || p.floored) return clearIntent(this.I);
    if (p.boarding) { this.auto.update(dt, p, w); return clearIntent(this.I); }
    return this._evade(dt, p, null, w);
  }
  /** the possessed ped's Intent this step, playing runtime R's objective. w: { t (the signals' clock), pedsNear, wet,
   *  wanted (the Wanted), police (the Police: its units), inside ({ id, run }: the interior it is in), heat ((x, y) -> the
   *  fire grid's heat there: its steps on foot keep out of fire), respray ([x, y]: a respray shop's yard the player can
   *  pay for, or null: losing the stars, it drives in once out of sight) } */
  update(dt, p, R, w = {}) { return this._mindFire(this._update(dt, p, R, w), p, w); }
  // on foot, never a step into fire (a Molotov's, a burning wreck's): the way past it either side, the nearer turn first;
  // none, it waits for the fire to burn down. Standing in it, the quickest way out
  _mindFire(I, p, w) {
    if (p.seat || !w.heat) return I;
    const heat = (a, r = 14) => w.heat(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r), m = Math.hypot(I.move[0], I.move[1]);
    if (w.heat(p.x, p.y) > .35) {   // (in it: out by the coolest of the eight ways it can walk, the nearer its own way the better; a wall has no heat, and no way through)
      const C = this.city, open = a => [16, 32].every(r => { const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; return C.walkable(Math.floor(x / C.T), Math.floor(y / C.T)) && C.map.heightAt(x, y) <= (p.z || 0) + 4; });
      const F = this.fireOut || (this.fireOut = { at: [p.x, p.y], k: -1, bad: new Map() });
      if (F.k >= 0 && Math.hypot(p.x - F.at[0], p.y - F.at[1]) < .2) F.bad.set(F.k, this.t + 1.5);   // (that way went nowhere: a car, a fence)
      F.at = [p.x, p.y];
      const want = m > .2 ? Math.atan2(I.move[1], I.move[0]) : null; let best = -1, bs = 1e9;
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4; if ((F.bad.get(k) || 0) > this.t || !open(a)) continue;
        const d = want === null ? 0 : Math.abs(Math.atan2(Math.sin(a - want), Math.cos(a - want))), sc = heat(a, 16) + heat(a, 32) + d * .25;
        if (sc < bs) { bs = sc; best = k; }
      }
      F.k = best; if (best >= 0) { const a = best * Math.PI / 4; I.move[0] = Math.cos(a); I.move[1] = Math.sin(a); I.down.sprint = true; }
      return I;
    }
    if (this.fireOut) this.fireOut.k = -1;
    if (m < .2) return I;
    const a0 = Math.atan2(I.move[1], I.move[0]), hot = a => heat(a) > .35;
    if (!hot(a0)) return I;
    for (const da of [.6, -.6, 1.2, -1.2, 1.8, -1.8]) if (!hot(a0 + da)) { I.move[0] = Math.cos(a0 + da) * m; I.move[1] = Math.sin(a0 + da) * m; return I; }
    I.move[0] = I.move[1] = 0; return I;   // (no way past: it burns down)
  }
  _update(dt, p, R, w) {
    this.t += dt; this.re -= dt;
    if (p !== this.ped) { this.ped = p; this.fighter = null; this.key = null; this.auto.goal = null; }
    const I = clearIntent(this.I);
    if (!R || R.state !== 'running' || p.dead || p.held || p.floored) return I;
    if (p.boarding) { this.auto.update(dt, p, w); return I; }   // (the scene plays it; the AutoPlayer watches it go or give up)
    const v = p.seat && p.seat.vehicle;
    if (v && v.damage && v.damage.burning) return this._out(v);   // (a burning car: out)
    if (!v) { const f = this.fleet.near(p.x, p.y, 90).find(c => c.damage && c.damage.burning && !c.wrecked && Math.hypot(c.x - p.x, c.y - p.y) < 90); if (f) return this._away(f.x, f.y, p); }   // (and away from any car on fire before it goes up: the one just left too)
    const h = R.objective && R.objective.hint; if (!h) return this._idle(I, v);
    const key = R.retries + ':' + R.stageIdx + ':' + h.kind + ':' + (h.target || h.targets || h.vehicle || h.what || '') + ':' + (R.objective.text || '');   // (a retry: all afresh)
    if (key !== this.key) { this.key = key; this.re = 0; this.si = 0; this.aimT = 0; this.dest = null; this.auto.goal = null; this.car = null; this.boardFor = null; this.tow = null; this.ramS = null; this.ramW = null; }
    // wanted on the way somewhere (a drop-off, a place to be), where the job doesn't ask for it (no timer running, the
    // stage not allowing the stars): lose them first, as a player would, and the objective after. (A fight, a chase, a
    // race or a photo goes on with the stars.)
    const travel = h.kind === 'deliver' || (h.kind === 'goto' && !h.spray);
    if (travel && w.wanted && w.wanted.stars > 0 && !R.allowWanted && !R.timer && !(w.inside)) { const job = h.kind === 'deliver' && !h.tow ? R.actors.tagged(h.what).find(alive) : null; return this._evade(dt, p, R, w, job && job.body ? job : null, h.health ? 'careful' : 'race'); }   // (a car to deliver whole: lost them at a careful pace)
    const out = this._act(dt, p, R, h, w, I, v);
    // crouched for a stealth stage that is over: stood up again, as a player would (a crouch is a toggle: left on, it
    // walks the rest of the job slowly and climbs nothing)
    if (h.kind !== 'stealth' && p.crouching && this.crouched && !v) { this.crouchT -= dt; if (this.crouchT <= 0) { out.tap.crouch = true; out.down.crouch = true; this.crouchT = .5; } }
    if (!p.crouching) this.crouched = false;
    return out;
  }
  _act(dt, p, R, h, w, I, v) {
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
      case 'drive': return this._floor(p, h);
      case 'rail': return this._rail(dt, p, R, h, w);
      case 'arcade': return this._arcade(dt, p, R, h, w);
      default: return this._idle(I, v);
    }
  }
  // the L (a rail hint: { to: a station's name }): on the street, to the stairs of the nearest station (on the side
  // whose trains reach the stop sooner) and up them; on a platform, at its edge by the track until a train stops with
  // its doors open, and aboard; riding, off when it stops at the stop. Out of a vehicle first
  _rail(dt, p, R, h, w) {
    const T = this.fleet && this.fleet.transit, I = clearIntent(this.I), v = p.seat && p.seat.vehicle; if (!T) return I;
    const press = () => { const beat = this.t * 4 | 0; if (beat % 2 === 0) { I.down.interact = true; if (beat !== this._tapBeat) { this._tapBeat = beat; I.tap.interact = true; } } return I; };
    if (p.onTrain) { const tr = p.onTrain.train; return tr.state === 'stop' && tr.station === h.to ? press() : I; }
    if (v) return this._out(v);
    const at = T.sideAt(p);
    if (at) {
      if (at.station.name === h.to) return I;   // (there: the stage's own check)
      if (T.trainAt(p)) return press();
      // (waiting at the platform's edge by the track, level with its middle: a train's doors in reach whichever car stops there)
      const [a0, b0, a1, b1] = at.side.cells, Tc = T.city.T, inner = at.side.side < 0 ? (st => (st.axis === 'y' ? (a1 + 1) * Tc - 6 : (b1 + 1) * Tc - 6))(at.station) : (st => (st.axis === 'y' ? a0 * Tc + 6 : b0 * Tc + 6))(at.station);
      const goal = at.station.axis === 'y' ? [inner, at.side.platform[1]] : [at.side.platform[0], inner], dx = goal[0] - p.x, dy = goal[1] - p.y, d = Math.hypot(dx, dy);
      if (d > 4) { I.move[0] = dx / d; I.move[1] = dy / d; }
      return I;
    }
    let best = null, bd = Infinity;   // (the nearest station's stairs, its side toward the stop)
    for (const st of T.stations) { const side = T.towardSide(st.name, h.to), sd = st.sides.find(q => q.side === side) || st.sides[0], d = Math.hypot(sd.foot[0] - p.x, sd.foot[1] - p.y); if (d < bd) { bd = d; best = sd; } }
    if (!best) return I;
    if (bd < TUNE.stairsReach * .8 && T.stairsAt(p)) return press();
    return this._go(dt, p, best.foot[0], best.foot[1], { foot: true, stay: true, radius: 8 }, w);
  }
  // an arcade cabinet (an arcade hint: { at: [x, y] by it, path: [[x, y], ...] the way there from the door, score }):
  // along the path to it and △ (the scene opens it); at it, its kit played as a player plays a shoot-'em-up: ✕ in
  // bursts (a held press carried into a new scene is lost), the ship weaving across the playfield, a bomb every 9 s; ✕
  // at its title (a coin) and at its GAME OVER (again); △ once a play has made the score
  _arcade(dt, p, R, h, w) {
    const A = w.arcade, I = clearIntent(this.I), t = this.t;
    if (A) {
      const st = A.state;
      if (st.best >= h.score) { const beat = t * 4 | 0; if (beat % 2 === 0 && beat !== this._tapBeat) { this._tapBeat = beat; I.tap.interact = true; I.down.interact = true; } return I; }
      if (st.scene !== A.kit.scene || st.over) { if ((t * 4 | 0) % 2 === 0) I.down.fire = true; return I; }   // (a coin; again)
      const s = st.ship, want = 136 + 70 * Math.sin(t * .8);
      I.down.fire = (t % .3) < .25; I.down.roll = (t % 9) < .05;
      if (s) I.move[0] = s.x > want + 4 ? -1 : s.x < want - 4 ? 1 : 0;
      return I;
    }
    const v = p.seat && p.seat.vehicle; if (v) return this._out(v);
    const run = w.inside && w.inside.run;
    if (run && run.spotAt && run.spotAt(p) && run.spotAt(p).id === 'arcade') { const beat = t * 4 | 0; if (beat % 2 === 0 && beat !== this._tapBeat) { this._tapBeat = beat; I.tap.interact = true; I.down.interact = true; } return I; }
    const path = [...(h.path || []), h.at]; this.si = Math.min(this.si || 0, path.length - 1);
    while (this.si < path.length - 1 && Math.hypot(path[this.si][0] - p.x, path[this.si][1] - p.y) < 10) this.si++;
    const q = path[this.si], dx = q[0] - p.x, dy = q[1] - p.y, l = Math.hypot(dx, dy) || 1;
    if (l > 4) { I.move[0] = dx / l; I.move[1] = dy / l; }
    return I;
  }
  // full throttle along a heading (radians), the wheel held on it, nitro if asked (a stunt's run-up: off a deck's open
  // end, up a ramp)
  _floor(p, h) {
    const v = p.seat && p.seat.vehicle, I = clearIntent(this.I); if (!v || v.driver !== p) return I;
    let da = h.heading - v.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
    I.steer = Math.max(-1, Math.min(1, da * 2)); I.throttle = 1; I.down.nitro = !!h.nitro; return I;
  }
  _idle(I, v) {
    if (!v) return I;
    if (v.cls === 'heli') { const u = v.body.u || 0; if (u > 8) I.brake = 1; else if (u < -8) I.throttle = .4; return I; }   // (a helicopter hangs where it is: the handbrake's shoulder would climb)
    const b = v.body, u = b ? b.vx * Math.cos(b.heading) + b.vy * Math.sin(b.heading) : 0;   // (its speed along its nose: < 0 rolling back)
    if (u > 4) I.brake = 1; else if (u < -4) I.throttle = 1; else I.down.handbrake = true;   // (a brake held rolling back, or stopped, drives it backwards: body.js)
    return I;
  }
  // on foot away from a point (a car about to blow), at a run
  _away(x, y, p) { const I = clearIntent(this.I), d = Math.hypot(p.x - x, p.y - y) || 1; I.move[0] = (p.x - x) / d; I.move[1] = (p.y - y) / d; I.down.sprint = true; return I; }
  _out(v) { const I = clearIntent(this.I); if (v.speed > 6) { I.brake = 1; return I; } I.tap.interact = true; I.down.interact = true; return I; }
  // the AutoPlayer to (x, y) with options, its goal moved only once the target has (a moving target: every RETARGET s)
  _go(dt, p, x, y, o, w) {
    const A = this.auto, g = A.goal;
    if (!g || g.board || !!g.foot !== !!o.foot || !!g.stay !== !!o.stay || !!g.hold !== !!o.hold || (g.style || 'player') !== (o.style || 'player')) A.goto(x, y, o);
    else if (this.re <= 0 && Math.hypot(g.x - x, g.y - y) > (o.slack ?? 24)) { this.re = RETARGET; A.goto(x, y, { ...o, keep: true }); }
    return A.update(dt, p, w);
  }
  // into that vehicle: a long way off, near it first by any means (a car taken, as the AutoPlayer does), then to its door
  // (held to one way or the other: near it by car until within 260 or there, then to its door until it is 650 off). Off
  // its level (up on a deck above it, under one below it) it is far, and the drive near it is to its level: S1's bot
  // got out on the Loop over Gutterball Lanes for the Gnomes' Brute below, and walked the deck for good
  _board(dt, p, v, w) {
    const P = p.seat ? p.seat.vehicle : p, d = Math.hypot(v.x - P.x, v.y - P.y) + (Math.abs((P.z || 0) - (v.z || 0)) > 24 ? 700 : 0), A = this.auto;
    if (this.boardFor !== v) { this.boardFor = v; this.boardNear = d < (p.seat ? 110 : 450); }
    if (this.boardNear && d > 650) this.boardNear = false;
    else if (!this.boardNear && (d < (p.seat ? 110 : 260) || (A.goal && !A.goal.board && (A.state === 'arrived' || A.state === 'final')))) this.boardNear = true;
    if (!this.boardNear) return this._go(dt, p, v.x, v.y, { stay: true, radius: 100, slack: 80, z: v.z || 0 }, w);
    if (!A.goal || A.goal.board !== v) A.board(v);
    return A.update(dt, p, w);
  }
  // a vehicle to drive: the nearest one that would do (the AutoPlayer's pick), boarded (not in it in 12 s, the scene's
  // walks to a door it can't reach among them: another)
  _car(dt, p, w) {
    if (this.car && this.car === this._carFor && this.t - this._carAt > 12 && !(p.seat && p.seat.vehicle === this.car)) { this.auto._giveUp(this.car.id); this.car = null; }
    if (this.car !== this._carFor) { this._carFor = this.car; this._carAt = this.t; }
    if (!this.car || this.car.wrecked || this.auto.shuns(this.car.id) || Math.hypot(this.car.x - p.x, this.car.y - p.y) > CAR_NEAR * 1.5 || (this.car.driver && this.car.driver !== p && this.car.driver.owner === 'mission')) this.car = this.auto._pickCar(p) || this._anyCar(p);
    return this.car ? this._board(dt, p, this.car, w) : null;
  }
  _anyCar(p) { let best = null, bd = CAR_NEAR * 3 + 60; for (const v of this.fleet.near(p.x, p.y, CAR_NEAR * 3)) { if (!pickable(v) || this.auto.shuns(v.id)) continue; const d = Math.hypot(v.x - p.x, v.y - p.y), k = d + (v.seats.some(q => q && !q.dead) ? 60 : 0); if (d < CAR_NEAR * 3 && k < bd) { bd = k; best = v; } } return best; }   // (an empty one before a carjack, as the AutoPlayer's pick)
  _goto(dt, p, R, h, w) {
    const at = h.at || (h.route && h.route[0]);
    if (h.vehicle) { const t = R.actors.tagged(h.vehicle).find(alive); if (t && (!p.seat || p.seat.vehicle !== t)) return this._board(dt, p, t, w); }
    if (h.spray) {   // (a fire to put out, a point to shoot at: within reach, stopped, aimed, the fire button held)
      const sp = h.spray, P = p.seat ? p.seat.vehicle : p, d = Math.hypot(sp[0] - P.x, sp[1] - P.y);
      if (d < (h.reach || 110)) { const I = clearIntent(this.I), a = Math.atan2(sp[1] - P.y, sp[0] - P.x); I.aim = [Math.cos(a), Math.sin(a)]; I.aimPoint = [sp[0], sp[1], 0]; const ws = !p.seat && p.inv.spec(), auto = !ws || ws.rate >= 6; I.down.fire = true; I.down.attack = auto || (this.t * 4 | 0) % 2 === 0; I.tap.attack = !auto && I.down.attack; I.down.aim = !p.seat; if (p.seat && P.speed > 6) I.brake = 1; if (p.seat) { let da = a - P.heading; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) > .9 && P.speed < 20) { I.throttle = .3; I.steer = Math.sign(da); } } return I; }
      return this._go(dt, p, sp[0], sp[1], { stay: true, radius: (h.reach || 110) * 1.2, slack: 30 }, w);
    }
    // (h.path: a way there by waypoints, walked straight first, as a stealth leg is: indoors no walk graph runs, and the
    // straight line at a turbine's valve from the corridor had stood against the hall's wall for good)
    if (h.path && !p.seat) {
      const G = this._gp && this._gp.path === h.path ? this._gp : (this._gp = { path: h.path, i: 0 });
      while (G.i < h.path.length && Math.hypot(h.path[G.i][0] - p.x, h.path[G.i][1] - p.y) < 10) G.i++;
      if (G.i < h.path.length) { const q = h.path[G.i], I = clearIntent(this.I), dx = q[0] - p.x, dy = q[1] - p.y, l = Math.hypot(dx, dy) || 1; I.move[0] = dx / l; I.move[1] = dy / l; return I; }
    }
    if (h.interact && !p.seat && Math.hypot(at[0] - p.x, at[1] - p.y) < Math.min(16, h.radius || 16)) { const I = clearIntent(this.I); const beat = this.t * 4 | 0; if (beat % 2 === 0) { I.down.interact = true; if (beat !== this._tapBeat) { this._tapBeat = beat; I.tap.interact = true; } } return I; }   // (there: △, a door's or a prompt's)
    return this._go(dt, p, at[0], at[1], { foot: !!h.foot || !!h.interact, stay: true, radius: h.interact ? 8 : h.radius || 24, z: at[2], hold: !!h.inVehicle && !!p.seat, hover: !!h.hover, land: h.land ?? null, taxi: !!h.taxi }, w);   // (land: a plane set down on the strip ending there, its heading; to be got to in a vehicle: never out of it in a jam, backed and driven round again and again: H4's getaway failed on "Dex left the getaway car")
  }
  _deliver(dt, p, R, h, w) {
    const what = R.actors.tagged(h.what).find(alive), v = p.seat && p.seat.vehicle;
    if (h.tow && what) return this._towTo(dt, p, R, h, what, w);
    if (what && what.body && v !== what) return this._board(dt, p, what, w);   // (the vehicle to deliver: in it first)
    if (!v) { const I = this._car(dt, p, w); if (I) return I; }
    return this._go(dt, p, h.to[0], h.to[1], { stay: true, style: 'careful', radius: 40, z: h.to[2], hold: !!(what && what.body) }, w);   // (the job's own car: never left in a jam)
  }
  // a tow (deliver's tow: the truck's tag): into the truck; lined up on the car's axis past whichever end has room,
  // facing away from it (driven in along a lane that runs that way: a long truck turned round at the kerb had wedged
  // itself at the corner for good); backed straight onto that end until the hook meets it, the hook's button; then
  // there with it in tow. No closer while backing (something in the way): staged again, and the second time from the
  // other end; no nearer the staging point for 25 s: the other end at once
  _towTo(dt, p, R, h, car, w) {
    const truck = R.actors.tagged(h.tow).find(alive) || (p.seat && p.seat.vehicle && p.seat.vehicle.def.tool === 'hook' ? p.seat.vehicle : null), v = p.seat && p.seat.vehicle;
    if (!truck) return clearIntent(this.I);
    if (v !== truck) { this.tow = null; return this._board(dt, p, truck, w); }
    if (car.towedBy === truck) { this.tow = null; return this._go(dt, p, h.to[0], h.to[1], { stay: true, style: 'careful', radius: 50, z: h.to[2], hold: true }, w); }
    const T = this.tow && this.tow.car === car ? this.tow : (this.tow = { car, phase: 'stage', end: this._towEnd(car, truck), t: 0, n: 0, best: 1e9 });
    if (!T.S || T.S.end !== T.end) T.S = { end: T.end, at: this._towStage(car, truck, T.end) };
    const e = T.end, dir = [Math.cos(e.h), Math.sin(e.h)], E = car.toWorld(e.k * car.hl, 0), S = T.S.at;
    const hook = truck.model.hook || [-truck.hl - 4, 0], H = truck.toWorld(hook[0], hook[1]), dH = Math.hypot(H[0] - E[0], H[1] - E[1]), I = clearIntent(this.I);
    let ah = e.h - truck.heading; ah = Math.atan2(Math.sin(ah), Math.cos(ah));
    if (dH < 18 && truck.speed < 12) { if ((this.t * 4 | 0) % 2 === 0) { I.tap.fire = true; I.down.fire = true; } I.brake = 1; return I; }   // (the hook)
    if (T.phase === 'stage') {   // to the staging point (the road, then straight at it), come in along a lane running the way the truck must face
      const dS = Math.hypot(truck.x - S[0], truck.y - S[1]);
      if (dS < 30 && truck.speed < 10) { T.phase = Math.abs(ah) < .35 ? 'back' : 'align'; T.t = 0; T.best = dH; }
      else {
        // (no nearer it for 25 s, a long truck wedged at a corner short of it: the other end, from another way in)
        if (dS < (T.sBest ?? 1e9) - 20) { T.sBest = dS; T.st = 0; } else if ((T.st = (T.st || 0) + dt) > 25) { T.n++; T.st = 0; T.sBest = 1e9; T.end = this._swapEnd(car, truck, T.end); T.S = null; this.auto.goal = null; return I; }
        return this._go(dt, p, S[0], S[1], { stay: true, radius: 16, slack: 10, z: car.z, heading: e.h }, w);   // (on a deck: the staging point up there)
      }
    }
    if (T.phase === 'align') {   // on along the axis, away from the car, until the truck faces its way on it
      T.t += dt; const A = [E[0] + dir[0] * (truck.hl + 200), E[1] + dir[1] * (truck.hl + 200)]; let da = Math.atan2(A[1] - truck.y, A[0] - truck.x) - truck.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
      const off = Math.abs((truck.x - E[0]) * -dir[1] + (truck.y - E[1]) * dir[0]), out = (truck.x - E[0]) * dir[0] + (truck.y - E[1]) * dir[1];
      if ((Math.abs(ah) < .2 && off < 6 && out > truck.hl + 30) || T.t > 7) { T.phase = 'back'; T.t = 0; T.best = dH; return I; }
      I.steer = Math.max(-1, Math.min(1, da * 2)); if (truck.speed < 15) I.throttle = .5; return I;   // (slow: a wide turn put it off the axis)
    }
    // backing: the hook onto the car's end, steered by where that end lies behind (still rolling on from the turn: the
    // brakes first, the clock not yet running: it had given up on the hook before it ever went back)
    const fwd = truck.body.u || 0; if (fwd > 2) { I.brake = 1; I.steer = 0; return I; }
    T.t += dt; if (dH < T.best - 1) { T.best = dH; T.t = 0; }
    // (no closer for 2.5 s: pulled forward along the axis and backed again, as a driver shuffles in, twice; then staged
    // again, and the next time from the other end: a re-route at each miss had sent it round the block for a hair's
    // offset at the hook)
    if (T.t > 2.5) { T.n++; T.t = 0; if (T.n % 3) { T.phase = 'align'; return I; } T.phase = 'stage'; T.st = 0; T.sBest = 1e9; if (T.n % 6 === 0) { T.end = this._swapEnd(car, truck, T.end); T.S = null; } this.auto.goal = null; return I; }
    const back = Math.atan2(E[1] - H[1], E[0] - H[0]); let a = back - (truck.heading + Math.PI); a = Math.atan2(Math.sin(a), Math.cos(a));
    I.steer = Math.max(-1, Math.min(1, -a * 2.5)); if (truck.speed < 14) I.brake = .55; return I;
  }
  // where the truck stands to back onto end e: out along the car's axis past it, then on the nearest lane running the
  // way the truck must face (in the road beside a kerb's parked row, backed in at a slant: on the axis itself, the next
  // car parked there, it had gone the wrong way up the street to it and wedged itself at the corner); with no such lane
  // near, on the axis
  _towStage(car, truck, e) {
    const c = Math.cos(e.h), s = Math.sin(e.h), E = car.toWorld(e.k * car.hl, 0), off = truck.hl + 90, A = [E[0] + c * off, E[1] + s * off];   // (room to come back to the line after passing it)
    const G = this.roads && this.roads.graph, n = G && G.nearestLane(A[0], A[1], e.h, car.z || 0, 90);
    if (!n || c * n.lane.dir[0] + s * n.lane.dir[1] < .8) return A;
    const q = G.pointOn(n.lane, n.s); return [q[0], q[1]];
  }
  // the car's end to tow it by ({ k: 1 front | -1 rear, h: the way the truck faces }): one with room past it (no wall, no
  // vehicle where the truck would stand), else the front; other: the end tried before (the other one, then)
  _towEnd(car, truck, other = null) {
    const ends = [{ k: 1, h: car.heading }, { k: -1, h: car.heading + Math.PI }];
    if (other) return ends.find(e => e.k !== other.k);
    const room = e => {
      const E = car.toWorld(e.k * car.hl, 0), c = Math.cos(e.h), s = Math.sin(e.h), at = d => [E[0] + c * d, E[1] + s * d];
      for (let d = 6; d <= truck.hl + 24; d += 8) {   // (the room its body takes backing in at a slant from the lane: a car parked further along is no matter)
        const [x, y] = at(d); if (blockedSpot(this.city, x, y, e.h, 8, truck.hw)) return false;
        if (this.fleet.near(x, y, 40).some(o => o !== car && o !== truck && o.body && o.speed < 15 && boxDistance(o, x, y) < truck.hw + 3)) return false;   // (parked: traffic going by is gone in a moment)
      }
      return true;
    };
    // (a lane running the way the truck would face, near where it stands: hooked from the wrong end on a one-way
    // street, it faced up it and towed the car the long way round the map's edge. Before room: a queue standing at one
    // end's light had sent it to the other end, against a one-way, by a route round the map's edge it wedged on)
    const lane = e => this._endLane(car, truck, e);
    return ends.find(e => room(e) && lane(e)) || ends.find(lane) || ends.find(room) || ends[0];
  }
  // is there a lane running the way the truck faces for end e, by where it would stand?
  _endLane(car, truck, e) { const E = car.toWorld(e.k * car.hl, 0), off = truck.hl + 90, x = E[0] + Math.cos(e.h) * off, y = E[1] + Math.sin(e.h) * off, G = this.roads && this.roads.graph, n = G && G.nearestLane(x, y, e.h, car.z || 0, 90); return !!n && Math.cos(e.h) * n.lane.dir[0] + Math.sin(e.h) * n.lane.dir[1] > .8; }
  // the other end to try, if a lane runs its way (on a one-way street the far end faced the wrong way up it: no route
  // came in that way, and the truck arrived on the cross street at speed and drove off the map's edge to turn); else
  // this one again, from a fresh route
  _swapEnd(car, truck, e) { const o = this._towEnd(car, truck, e); return this._endLane(car, truck, o) || !this._endLane(car, truck, e) ? o : e; }
  _kill(dt, p, R, h, w) {
    if (h.vehicle) { const hv = R.actors.tagged(h.vehicle).find(alive); if (hv && (!p.seat || p.seat.vehicle !== hv)) return this._board(dt, p, hv, w); }   // (the job's to be done from that one)
    const v = p.seat && p.seat.vehicle, live = a => alive(a) && !(a.damage && a.damage.burning) && !(h.done && h.done(a)); let t = null, td = 1e9;   // (h.done: when the job counts one: a car once it smokes)
    for (const a of R.actors.tagged(h.targets)) if (live(a)) { const d = Math.hypot(a.x - p.x, a.y - p.y); if (d < td) { td = d; t = a; } }
    // on foot, the nearest the gun has a clear line to (one in cover waits: a player shoots the one in the open, not
    // the one behind a pillar), chosen again every half a second; none in the open, the nearest
    if (!v && t && !t.body) {
      const K = this.pick;
      if (!K || K.until <= this.t || !live(K.t) || K.tag !== h.targets) {
        let best = null, bd = 420;
        for (const a of R.actors.tagged(h.targets)) { if (!live(a) || a.body) continue; const d = Math.hypot(a.x - p.x, a.y - p.y); if (d < bd && lineOfFire(p, a, this.city.map, this.fleet) === true) { bd = d; best = a; } }
        this.pick = { t: best || t, until: this.t + .5, tag: h.targets };
      }
      t = this.pick.t; td = Math.hypot(t.x - p.x, t.y - p.y);
    }
    const fire = !v && R.actors.tagged(h.targets).find(a => a.damage && a.damage.burning && !a.wrecked && Math.hypot(a.x - p.x, a.y - p.y) < 90);
    if (fire) return this._away(fire.x, fire.y, p);   // (one on fire: away before it goes up)
    if (!t) return this._idle(clearIntent(this.I), v);
    if (v) {
      if (v.driver !== p) return this._driveBy(p, t, R.actors.tagged(h.targets).filter(live));   // (a passenger: out of the window)
      if (t.body) {   // (a vehicle: rammed; rams that do it no harm a while, pushed where the car can't get at it, and out to finish it on foot)
        const share = t.damage ? t.damage.share : 1, S = this.ramW && this.ramW.t === t ? this.ramW : (this.ramW = { t, share, at: this.t });
        if (share < S.share - .02 || td > 200) { S.share = Math.min(S.share, share); S.at = this.t; }
        if (this.t - S.at > 20 && !(w.wanted && w.wanted.stars > 1) && !h.vehicle) return this._out(v);   // (not into the police's guns on foot; never out of the hint's own vehicle)
        return this._ram(dt, p, v, t, td, w, !!h.vehicle);
      }
      if (td > 260) return this._go(dt, p, t.x, t.y, { stay: true, slack: 60 }, w);
      return this._out(v);
    }
    if (td > 420 && !t.body) { const I = this._car(dt, p, w); if (I) return I; }
    return this._fight(dt, p, t, w);
  }
  // a drive-by from a passenger seat: a pistol or the SMG in hand, aimed at the target, the trigger held
  _driveBy(p, t, list = [t]) {
    const I = clearIntent(this.I), gun = p.inv.list().find(id => { const s = p.inv.spec(id); return s && (s.slot === 'pistol' || s.slot === 'smg') && p.inv.rounds(id) && p.inv.rounds(id).total + p.inv.rounds(id).mag > 0; });
    if (!gun) return I;
    if (p.inv.current !== gun) return this._step(I, p, gun);
    // the nearest target with a clear line (never through a building or the traffic beside the car); none, the nearest
    // aimed at and the trigger held off
    let c = null, cd = 1e9; for (const a of list) { const dd = Math.hypot(a.x - p.x, a.y - p.y); if (dd < cd && lineOfFire(p, a, this.city.map, this.fleet) === true) { cd = dd; c = a; } }
    const q = c || t, d = Math.hypot(q.x - p.x, q.y - p.y) || 1; I.aim = [(q.x - p.x) / d, (q.y - p.y) / d]; I.aimPoint = [q.x, q.y, q.z || 0];
    if (c && d < (p.inv.spec(gun).range || 300) * .8) { I.down.fire = true; I.down.attack = true; if (!p.inv.loaded()) I.tap.reload = true; }
    return I;
  }
  // a vehicle rammed: at it flat out; pressed against it at a crawl (a push does no harm), backed off for another run
  _ram(dt, p, v, t, d, w, hold = false) {
    if (d > 140) { if (this.ramS) this.ramS.back = this.ramS.round = this.ramS.slow = this.ramS.held = 0; return this._go(dt, p, t.x, t.y, { stay: true, style: 'race', slack: 50, hold }, w); }   // (hold: the hint's own vehicle, never given up in a jam; out of reach, a back-off is over: one left standing had braked it the moment it caught up again, and H4's Strongbox drove off round its block each time)
    const I = clearIntent(this.I), S = this.ramS || (this.ramS = { back: 0, slow: 0, held: 0, round: 0, side: 1 }); let da = Math.atan2(t.y - v.y, t.x - v.x) - v.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (S.back > 0) { S.back -= dt; I.brake = 1; if (Math.abs(da) > .4) I.steer = da > 0 ? -1 : 1; return I; }   // (backing off, the nose swung toward it: from beside a broadside target, straight back and straight on had slid past it again and again)
    // held at a crawl short of it (a queue between: the car ahead, not the target): backed off, then past at a slant,
    // one side and the next time the other
    if (S.round > 0) { S.round -= dt; if (S.round > 1.4) { I.brake = .8; I.steer = -S.side * .6; } else { I.throttle = .75; I.steer = S.side * .7; } return I; }
    S.held = v.speed < 5 && d > v.hl + t.hl + 30 ? S.held + dt : 0;
    if (S.held > 2.5) { S.held = 0; S.side = -S.side; S.round = 2.4; return I; }
    // pressed against it at a crawl, or shoving it along the road (both moving: no blow lands), a run up again
    const shove = (t.speed || 0) > 15; S.slow = d < v.hl + t.hl + 24 && (v.speed < 12 || shove) ? S.slow + dt : 0;
    if (S.slow > .8) { S.slow = 0; S.back = shove ? 2.4 : 1.6; I.brake = 1; return I; }   // (a longer run at one that gives way)
    if (Math.abs(da) > 2.2) { I.brake = 1; I.steer = da > 0 ? -1 : 1; return I; }   // (behind: back up, turning)
    I.steer = Math.max(-1, Math.min(1, da * 2.5)); I.throttle = 1; return I;
  }
  // on foot against one target: the fighter brain with the player's own weapons (a vehicle beaten with a bat, or shot)
  _fight(dt, p, t, w) {
    const r0 = this.fighter && this.fighter.gun && p.inv.rounds(this.fighter.gun), dry = r0 && r0.total + r0.mag <= 0;   // (out of ammo: the next gun, else the bat or the fists)
    if (!this.fighter || this.fighter.ped !== p || this._kit !== p.inv.list().join() || dry) { this.fighter = new Fighter(p, { walks: this.roads.walks, map: this.city.map, fleet: this.fleet, refill: false, noSelect: this.pad, profile: PLAYER_FIGHT, best: true, careful: true }); this._kit = p.inv.list().join(); }
    const F = this.fighter; F.pedsNear = w.pedsNear || null;   // (the player holds fire over bystanders)
    const I = clearIntent(F.I);
    if (t.body) {   // a vehicle: right up to its side for a swing; a gun from where the fighter stands
      const melee = !F.gun || p.inv.spec(F.gun).projectile === 'melee';
      if (melee) {
        const bd = boxDistance(t, p.x, p.y);
        if (bd > 40) { F.path = null; return this._go(dt, p, t.x, t.y, { foot: true, stay: true, radius: 8 }, w); }   // (a way off: the AutoPlayer's walk; the fighter's path re-plans to one node a post can block)
        if (bd > 10) return F._go(dt, I, t.x, t.y, true, 'car' + t.id);
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
  _evade(dt, p, R, w, job = null, style = 'race') {   // (job: the vehicle the job is about, a delivery's: lost them in it, never another)
    const W = w.wanted; if (!W || !W.stars) return this._idle(clearIntent(this.I), p.seat && p.seat.vehicle);
    if (job && (!p.seat || p.seat.vehicle !== job)) return this._board(dt, p, job, w);
    if (!p.seat) { const I = this._car(dt, p, w); if (I) return I; }
    const v = p.seat && p.seat.vehicle, P = v || p;
    // the Eye up (three stars and more): it sees all round from above, so no drive away loses it, and a respray is
    // never reached unseen. Under a deck (the L, the Loop) it sees nothing (police.js _sees): there, and held there
    // while the stars flash out; seen there by a ground unit, on to another stretch, away from them
    const K = v && (v.z || 0) < 10 && w.police && w.police.heli ? this._cover(v, w) : null;
    if (K && K.hid) return this._idle(clearIntent(this.I), v);
    if (K) {   // (another spot: a trip of its own, its stall clock and the lanes it kept off afresh; kept, it had stalled 6 s on)
      const o = { stay: true, style, radius: 14, slack: 40, z: 0, hold: !!job };
      if (this.coverFor !== K) { this.coverFor = K; this.auto.goto(K.at[0], K.at[1], { ...o, car: v }); }
      return this._go(dt, p, K.at[0], K.at[1], o, w);
    }
    // out of their sight in a car, a respray within reach (and the fee in hand): there, before they find it again
    if (v && w.respray && !W.seen && Math.hypot(w.respray[0] - v.x, w.respray[1] - v.y) < 1200) return this._go(dt, p, w.respray[0], w.respray[1], { stay: true, style, radius: 18, slack: 30, hold: !!job }, w);
    if (!this.dest || Math.hypot(this.dest[0] - P.x, this.dest[1] - P.y) < 80) this.dest = this._far(P, w);
    return this._go(dt, p, this.dest[0], this.dest[1], { stay: true, style, slack: 80, hold: !!job }, w);
  }
  // a spot on a ground lane under a deck, out of the Eye's sight (null: none within 1200): points every 24 along the
  // lanes under the decks' high stretches, 48 in from either end of the stretch, worked out once (on a lane, so a route
  // ends there: a road cell's centre past a lane's end had the car crawl at the road's end short of it, in sight; and
  // in from the ends, so a car stopped short is still under it); of them the one best away from the police's cars and
  // the quickest drive (gps.costsFrom). Under any deck on the way (police.js underDeck) it is hidden (hid: held there
  // while the stars flash out) till a unit sees it there for 3 s, or at all from close by: then another spot, away
  // from there; and a spot not reached in a minute, or that leaves it short and in sight, another
  _cover(v, w) {
    if (!this.covers) {
      const G = this.roads.graph, C = this.city, high = (x, y, z) => (C.decks || []).some(d => { const h = d.heightAt(x, y); return h !== null && h > z + 30; });
      this.covers = [];
      const deep = (L, s) => { if (s < 48 || s > L.len - 48) return false; for (const ds of [-48, 0, 48]) { const q = G.pointOn(L, s + ds); if ((q[2] || 0) >= 4 || !high(q[0], q[1], q[2] || 0)) return false; } return true; };
      for (const L of G.lanes) for (let s = 12; s < L.len; s += 24) if (deep(L, s)) { const q = G.pointOn(L, s); this.covers.push([q[0], q[1], L.id, s]); }
    }
    const W = w.wanted, K = this.cover, PO = w.police, units = PO && PO.units ? PO.units.filter(u => !u.gone && u.car && u.car.v).map(u => u.car.v) : [];
    if (K) {   // (shortT: stopped short of it, not hidden: a spot that doesn't hide it, another after 5 s)
      const at = Math.hypot(K.at[0] - v.x, K.at[1] - v.y), dt = this.t - K.last;
      K.hid = underDeck(this.city, v) && (!K.seenAt || Math.hypot(v.x - K.seenAt[0], v.y - K.seenAt[1]) > 100);
      K.seenT = K.hid && W && W.seen ? K.seenT + dt : 0; K.shortT = !K.hid && at < 60 && v.speed < 3 ? K.shortT + dt : 0; K.last = this.t;
      // (seen there with a unit or a cop on foot close: off at once, before they are at the door: held there the 3 s, the
      // gym's on seed 2 was busted. A unit sees 180 under a deck: only one nearer than 80 is about to put its crew out)
      const close = K.seenT > 0 && (units.some(u => Math.hypot(u.x - v.x, u.y - v.y) < 80) || !!copOnFoot(PO, v, 100));
      if (K.seenT >= 3 || close) K.seenAt = [v.x, v.y];
      else if (K.hid || (this.t - K.t < 60 && K.shortT < 5)) return K;
    }
    const G = this.roads.graph, n = G.nearestLane(v.x, v.y, v.heading, v.z || 0), D = n ? this.roads.gps.costsFrom(n.lane.id, n.s) : null;
    let best = null, bd = -Infinity;
    for (const q of this.covers) {
      const dv = Math.hypot(q[0] - v.x, q[1] - v.y); if (dv > 1200) continue;
      if (K && (Math.hypot(q[0] - K.at[0], q[1] - K.at[1]) < 160 || (K.seenAt && Math.hypot(q[0] - K.seenAt[0], q[1] - K.seenAt[1]) < 200))) continue;   // (not the spot given up on, nor the stretch it was seen at: 200, so a car stopped short of the next is clear of it)
      // (the drive there, not the crow's way: one across a one-way street had it go a thousand round)
      const L = G.lanes[q[2]], secs = D ? D[q[2]] - (L.len - q[3]) / L.speed : dv / 150; if (!(secs < Infinity)) continue;
      let du = 400; for (const u of units) du = Math.min(du, Math.hypot(q[0] - u.x, q[1] - u.y));
      const s = du - Math.max(secs, 0) * 90; if (s > bd) { bd = s; best = q; }
    }
    this.cover = best ? { at: [best[0], best[1]], t: this.t, last: this.t, seenT: 0, shortT: 0, hid: false, seenAt: K ? K.seenAt || null : null } : null;
    return this.cover;
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
    if (v.cls === 'heli') return this._go(dt, p, t.x, t.y, { stay: true, hover: true, radius: dist * .5, slack: 16 }, w);   // (a helicopter: over them, held there)
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
    if (!p.crouching) { this.crouchT -= dt; if (this.crouchT <= 0) { I.tap.crouch = true; I.down.crouch = true; this.crouchT = .5; this.crouched = true; } return I; }
    // a guard close with its back turned: taken down (the scene offers it; the bot presses attack)
    if ((run && run.takedownFor && run.takedownFor(p)) || (!run && R.actors.takedownFor(p))) { I.tap.attack = true; I.down.attack = true; return I; }
    // indoors, a guard uneasy (noticing, searching): wait where it stands (at cover), or, in its sight, back off along
    // the way it came, out of it. Outdoors a guard that has seen us fights (it has no unease): fought back
    const uneasy = run && run.guards ? run.guards.filter(g => g.mind && g.mind.state !== 'calm' && g.mind.state !== 'down' && !g.down && !g.ped.dead) : [];   // (a dead guard's unease is stale)
    if (uneasy.length) {
      if (!uneasy.some(g => g.sees)) return I;
      const b = path[Math.max(0, this.si - 1)], bx = b[0] - p.x, by = b[1] - p.y, bl = Math.hypot(bx, by);
      if (bl > 6) { I.move[0] = bx / bl * .6; I.move[1] = by / bl * .6; } else if (this.si > 0) this.si--;
      return I;
    }
    const foe = !run && R.actors.list.find(e => e.role === 'guard' && e.alerted && !e.a.dead && !e.down && !e.a.out && Math.hypot(e.a.x - p.x, e.a.y - p.y) < 320);
    if (foe) return this._fight(dt, p, foe.a, w);
    while (this.si < path.length - 1 && Math.hypot(path[this.si][0] - p.x, path[this.si][1] - p.y) < 10) this.si++;
    const q = path[this.si], dx = q[0] - p.x, dy = q[1] - p.y, l = Math.hypot(dx, dy) || 1;
    if (l < 6) return I;
    I.move[0] = dx / l * .6; I.move[1] = dy / l * .6; return I;
  }
  dispose() { this.auto.dispose(); }
}
