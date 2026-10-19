// A cop on foot (PLAN.md 8.13): the Intent an officer, a SWAT trooper or a Fed acts on, each step (a Fighter: fighter.js
// moves it and fires its bursts).
//   - in sight of the player: at 1 star (arrest first) it holsters and runs up to them (police.js cuffs them when it
//     reaches them while they are slow or unarmed, or waits at the door of a stopped car); once the tier shoots, or the
//     player has fought the police, it closes to its range, stops, aims at the chest and fires in bursts, a little off
//     each time; a Fed flanks first, coming in from the player's side;
//   - out of sight: it runs to where the player was last seen, then walks the search area, point to point;
//   - at a roadblock it holds its post, and shoots or gives chase from there;
//   - stood down (no stars), it walks back to its car and gets in (or, with no car, police.js hands it to the crowd).
// Deterministic: its own share of the police's RNG stream.
//   const B = new CopBrain(ped, { walks, rng, unit, seat, post, flank });  I = B.update(dt, w)
import { TUNE, knob } from '../core/tune.js';
import { clearIntent } from '../sim/intent.js';
import { boardingFor } from '../actors/boarding.js';
import { Fighter } from '../ai/fighter.js';

knob('Police', 'copRange', 'Officers shoot within', 150, 40, 400, 5, 'How near an officer comes before it stops to shoot (u)');
knob('Police', 'copBurst', 'A burst lasts', .7, .1, 3, .05, 'Seconds an officer holds the trigger');
knob('Police', 'copPause', 'Between bursts', .6, .1, 3, .05, 'Seconds between an officer\'s bursts');
knob('Police', 'copAimOff', 'Officers\' aim', .07, 0, .4, .01, 'How far off (radians) an officer\'s burst may be');
const PROFILE = { burst: () => TUNE.copBurst, pause: () => TUNE.copPause, aimOff: () => TUNE.copAimOff };

export class CopBrain extends Fighter {
  /** ped: the cop's Ped; o: { walks (Sidewalks), map, rng, unit (its car's police unit, or null), seat, post ([x, y]:
   *  a roadblock's), flank (-1 | 1: a Fed's side) } */
  constructor(ped, o = {}) {
    super(ped, { walks: o.walks, map: o.map, fleet: o.fleet, rng: o.rng, profile: PROFILE });
    this.unit = o.unit || null; this.seat = o.seat ?? 0; this.post = o.post || null; this.flank = o.flank || 0; this.sees = false;
  }
  /** one step. w: { player (Ped), car (the player's vehicle or null), seen (this cop sees the player), stars, shoot
   *  (the tier shoots, or the player fought the police), lastKnown, searchR, standDown } */
  update(dt, w) {
    const I = clearIntent(this.I), p = this.ped, P = w.player; this.t += dt;
    if (p.dead || p.floored || p.held || p.boarding || p.seat || !P) return I;
    if (w.standDown) return this._home(dt, I);
    if (w.seen) {
      const tgt = w.car ? { x: w.car.x, y: w.car.y, z: w.car.z } : P, d = Math.hypot(tgt.x - p.x, tgt.y - p.y);
      if (w.shoot && this.gun) return this._shoot(dt, I, w, tgt, d);
      this._holster();
      if (w.car && w.car.speed < 6) { const door = doorOf(w.car); return this._go(dt, I, door[0], door[1], Math.hypot(door[0] - p.x, door[1] - p.y) > 30, 'door'); }   // (to the driver's door of a stopped car)
      if (d < 9) { p.mover.facing = Math.atan2(tgt.y - p.y, tgt.x - p.x); return I; }   // (there: police.js does the cuffing)
      if (this.post && d > 90) return this._hold(I, tgt);
      return this._go(dt, I, tgt.x, tgt.y, true, 'player');
    }
    this._holster();
    if (this.post) return this._hold(I, w.lastKnown);
    // out of sight: where they were last seen, then the search area point by point
    const L = w.lastKnown; if (!L) return I;
    if (!this.goal || this.goal.key !== 'search') this.goal = { x: L.x, y: L.y, key: 'search', reached: false };
    if (Math.hypot(this.goal.x - p.x, this.goal.y - p.y) < 14) {
      const a = this._r() * Math.PI * 2, r = (w.searchR || 120) * (.3 + .7 * this._r());
      this.goal = { x: L.x + Math.cos(a) * r, y: L.y + Math.sin(a) * r, key: 'search', reached: true };
    }
    return this._go(dt, I, this.goal.x, this.goal.y, !this.goal.reached, 'search');
  }
  // in range with a clear shot: stop, aim at the chest and fire in bursts; out of range (or a Fed's flank): close in
  _shoot(dt, I, w, tgt, d) {
    const p = this.ped;
    if (p.inv.current !== this.gun) p.inv.select(this.gun);
    if (this.flank && d > 70) {   // (a Fed comes in from the player's side)
      const hx = w.car ? Math.cos(w.car.heading) : Math.cos(w.player.mover.facing), hy = w.car ? Math.sin(w.car.heading) : Math.sin(w.player.mover.facing);
      const fx = tgt.x - hy * this.flank * 80, fy = tgt.y + hx * this.flank * 80;
      if (Math.hypot(fx - p.x, fy - p.y) > 24) { this._go(dt, I, fx, fy, true, 'flank'); this._aimAt(I, tgt, false); return I; }
    }
    const range = TUNE.copRange * (this.post ? 1.4 : 1), line = this._lineTo(tgt);
    if (d > range || line === 'wall') { this._go(dt, I, tgt.x, tgt.y, true, 'player'); return I; }   // (closer, or round the corner)
    if (line === 'car' && !(w.car && w.car.speed < 6 && d < 40)) return this._aside(dt, I, tgt);   // (a car in the way: aside; the player's own, they shoot)
    I.move[0] = I.move[1] = 0;
    if (this.burst > 0) { this.burst -= dt; this._aimAt(I, tgt, true); if (this.burst <= 0) this.pause = TUNE.copPause * (.7 + .6 * this._r()); }
    else { this.pause -= dt; this._aimAt(I, tgt, false); if (this.pause <= 0) { this.burst = TUNE.copBurst * (.7 + .6 * this._r()); this.off = (this._r() - .5) * 2 * TUNE.copAimOff; } }
    return I;
  }
  // a roadblock's officer: at its post, facing the way the player is
  _hold(I, at) {
    const p = this.ped, [px, py] = this.post, d = Math.hypot(px - p.x, py - p.y);
    if (d > 8) { I.move[0] = (px - p.x) / d * .6; I.move[1] = (py - p.y) / d * .6; }
    else if (at) p.mover.facing = Math.atan2(at.y - p.y, at.x - p.x);
    return I;
  }
  // stood down (or called back to drive on): back to its car's door and in; with no car, nothing
  _home(dt, I) {
    const p = this.ped, u = this.unit, v = u && u.car && u.car.v;
    this._holster();
    if (!v || v.wrecked) return I;
    const d = Math.hypot(v.x - p.x, v.y - p.y);
    if (d < v.hl + 16 && !v.seats[this.seat]) { const plan = boardingFor(p, v, this.seat); if (plan) p.board(plan); return I; }
    return this._go(dt, I, v.x, v.y, d > 80, 'car');
  }
}

/** the driver's door of a vehicle (a world point beside the driver's seat, outside) */
export function doorOf(v) { const s = (v.model && v.model.seats && v.model.seats[0]) || { x: 0, y: -1 }; return v.toWorld(s.x, (s.y >= 0 ? 1 : -1) * (v.hw + 7)); }
