// A fighter on foot (PLAN.md 8.13, 8.14): the Intent an armed ped acts on against one target, each step. The police's
// officers (cop.js) and the gangs' members (gangs.js) are fighters.
//   - a gun (a pistol, the SMG, the shotgun): it closes to its range (a share of the weapon's) and a clear line of fire
//     (round a wall's corner; a step aside when a car stands in the way), stops, and fires in bursts at the target's
//     chest, each burst a little off;
//   - a bat, or bare fists: it runs in and swings;
//   - a Molotov or a grenade: now and then, at a throw's distance, one goes where the target stands;
//   - blocked by a wall on its way, it takes the sidewalk graph round.
// Deterministic: its share of its owner's RNG stream.
//   class CopBrain extends Fighter  ·  const F = new Fighter(ped, { walks, rng, profile });  I = F.attack(dt, I, target)
import { TUNE } from '../core/tune.js';
import { makeIntent } from '../sim/intent.js';

const NODE_NEAR = 9, THROW_MIN = 70, THROW_MAX = 230, THROW_EVERY = 6;
/** how a fighter fights: its range (a share of its gun's), bursts and pauses (s) and aim (radians off at most) */
export const FIGHT = { range: .45, burst: .7, pause: .6, aimOff: .08 };

export class Fighter {
  /** ped: its Ped; o: { walks (Sidewalks), map (the TileMap: lines of fire), fleet (the cars in the way), rng, profile
   *  ({ range, burst, pause, aimOff }: numbers, or functions of nothing for TUNE knobs) } */
  constructor(ped, o = {}) {
    this.ped = ped; this.S = o.walks || null; this.map = o.map || null; this.fleet = o.fleet || null; this.rng = o.rng; this.I = makeIntent(); this.profile = { ...FIGHT, ...(o.profile || {}) };
    this.side = this.rng && this.rng.next() < .5 ? -1 : 1; this.stepT = 0;
    this.burst = 0; this.pause = this.rng ? this.rng.next() * .5 : 0; this.off = 0; this.throwT = 2 + (this.rng ? this.rng.next() * THROW_EVERY : 0);
    this.goal = null; this.path = null; this.pathKey = null; this.pi = 0; this.last = [ped.x, ped.y]; this.stuck = 0; this.t = 0;
    const spec = id => ped.inv.spec(id);
    this.gun = ped.inv.list().find(id => { const s = spec(id); return s && s.projectile !== 'melee' && s.projectile !== 'molotov' && s.projectile !== 'grenade' && s.damage > 0; }) || null;
    this.melee = ped.inv.list().find(id => { const s = spec(id); return s && s.projectile === 'melee' && id !== 'fists'; }) || 'fists';
    this.thrown = ped.inv.list().find(id => { const s = spec(id); return s && (s.projectile === 'molotov' || s.projectile === 'grenade'); }) || null;
    if (this.gun) ped.inv.give(this.gun, 999, true);
    if (this.thrown) ped.inv.give(this.thrown, 3, true);
  }
  _p(k) { const v = this.profile[k]; return typeof v === 'function' ? v() : v; }
  /** the weapon in hand for a fight at distance d: a throw now and then, else the gun, else the bat */
  _arm(d, dt) {
    const inv = this.ped.inv;
    this.throwT -= dt;
    if (this.thrown && inv.rounds(this.thrown) && inv.rounds(this.thrown).total > 0 && this.throwT <= 0 && d > THROW_MIN && d < THROW_MAX) return this.thrown;
    return this.gun || this.melee;
  }
  /** fight the target ({ x, y, z, ... a body, or a vehicle it drives }): close in, then shoot, swing or throw */
  attack(dt, I, tgt) {
    this.t += dt; const p = this.ped, d = Math.hypot(tgt.x - p.x, tgt.y - p.y), w = this._arm(d, dt), spec = p.inv.spec(w);
    if (p.inv.current !== w) p.inv.select(w);
    if (!spec || spec.projectile === 'melee') {   // in close, then the swings (a press each beat: the combo chains them)
      if (d > 16) return this._go(dt, I, tgt.x, tgt.y, true, 'target');
      p.mover.facing = Math.atan2(tgt.y - p.y, tgt.x - p.x); if (this._r() < .3) I.tap.attack = true; return I;
    }
    if (spec.projectile === 'molotov' || spec.projectile === 'grenade') {   // (one thrown at its feet, then back to the gun)
      this._aimAt(I, tgt, false); I.aimPoint = [tgt.x, tgt.y, tgt.z || 0]; I.tap.attack = true; this.throwT = THROW_EVERY * (.8 + .4 * this._r());
      return I;
    }
    const range = Math.max(40, spec.range * this._p('range')), line = this._lineTo(tgt);
    if (d > range || line === 'wall') return this._go(dt, I, tgt.x, tgt.y, true, 'target');   // (closer, or round the corner it hides behind)
    if (line === 'car') return this._aside(dt, I, tgt);
    I.move[0] = I.move[1] = 0;
    // bursts: the trigger held a while, then let go a while; each burst a little off
    if (this.burst > 0) { this.burst -= dt; this._aimAt(I, tgt, true); if (this.burst <= 0) this.pause = this._p('pause') * (.7 + .6 * this._r()); }
    else { this.pause -= dt; this._aimAt(I, tgt, false); if (this.pause <= 0) { this.burst = this._p('burst') * (.7 + .6 * this._r()); this.off = (this._r() - .5) * 2 * this._p('aimOff'); } }
    return I;
  }
  // (at the target's feet a little off: the aimer pitches to its chest when it stands higher or lower)
  _aimAt(I, tgt, fire) {
    const p = this.ped, d = Math.hypot(tgt.x - p.x, tgt.y - p.y), a = Math.atan2(tgt.y - p.y, tgt.x - p.x) + this.off;
    I.aim = [Math.cos(a), Math.sin(a)]; I.aimPoint = [p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, tgt.z || 0]; I.down.aim = true;
    if (fire && p.inv.loaded()) I.down.attack = true; else if (fire) I.tap.reload = true;
  }
  /** the line of fire to the target (chest to chest), looked at a few times a second: true (clear), 'wall' or 'car' (a
   *  vehicle in the way, not the target's own) */
  _lineTo(tgt) {
    if (this._lineT > this.t && this._lineFor === tgt) return this._line;
    this._lineT = this.t + .25; this._lineFor = tgt; const p = this.ped;
    if (this.map && !this.map.ray(p, tgt, { eye: 18, target: 16 }).clear) return (this._line = 'wall');
    if (this.fleet) {
      const mx = (p.x + tgt.x) / 2, my = (p.y + tgt.y) / 2, r = Math.hypot(tgt.x - p.x, tgt.y - p.y) / 2 + 30, own = tgt.seat ? tgt.seat.vehicle : tgt.body ? tgt : null;
      for (const v of this.fleet.near(mx, my, r)) if (v !== own && v.body && v.cls !== 'heli' && v.z < (p.z || 0) + 18 && crosses(v, p, tgt)) return (this._line = 'car');
    }
    return (this._line = true);
  }
  // a car in the line of fire: a few steps to one side (the other, if that goes nowhere)
  _aside(dt, I, tgt) {
    const p = this.ped, dx = tgt.x - p.x, dy = tgt.y - p.y, l = Math.hypot(dx, dy) || 1;
    this.stepT += dt; if (this.stepT > 1.5) { this.stepT = 0; this.side = -this.side; }
    I.move[0] = -dy / l * this.side * .9; I.move[1] = dx / l * this.side * .9; this._aimAt(I, tgt, false);
    return I;
  }
  _holster() { const p = this.ped; if (p.inv.current !== 'fists') p.inv.select('fists'); }
  // straight for a point (run or walk); stuck against something a moment, the sidewalk graph's way round instead
  _go(dt, I, tx, ty, run, key) {
    const p = this.ped;
    if (this.path && this.pathKey === key) {
      while (this.pi < this.path.length) { const n = this.S.nodes[this.path[this.pi]]; if (Math.hypot(n.x - p.x, n.y - p.y) < NODE_NEAR) this.pi++; else break; }
      if (this.pi < this.path.length) { const n = this.S.nodes[this.path[this.pi]]; tx = n.x; ty = n.y; } else this.path = null;
    }
    const dx = tx - p.x, dy = ty - p.y, l = Math.hypot(dx, dy) || 1, k = run ? 1 : .5;
    I.move[0] = dx / l * k; I.move[1] = dy / l * k; I.down.sprint = run && l > 60;
    const moved = Math.hypot(p.x - this.last[0], p.y - this.last[1]); this.last[0] = p.x; this.last[1] = p.y;
    this.stuck = moved < .15 ? this.stuck + dt : 0;
    if (this.stuck > .8 && this.S) {   // (round by the sidewalks: from the node nearest us to the one nearest the goal)
      this.stuck = 0; const a = this.S.nearestNode(p.x, p.y, 200), b = this.S.nearestNode(tx, ty, 300);
      this.path = a && b ? this.S.route(a.id, b.id) : null; this.pi = 0; this.pathKey = key;
      if (!this.path) { I.tap.jump = true; I.down.jump = true; }
    }
    return I;
  }
  _r() { return this.rng ? this.rng.next() : .5; }
}

/** a body's world reach: is it within TUNE.climbMax of standing level with another (a fight across a rooftop's edge is
 *  no fight) */
export const sameLevel = (a, b) => Math.abs((a.z || 0) - (b.z || 0)) < Math.max(20, TUNE.climbMax);
// does the line from a to b cross the vehicle's box (widened a little)?
function crosses(v, a, b) {
  const [ax, ay] = v.toLocal(a.x, a.y), [bx, by] = v.toLocal(b.x, b.y), L = v.hl + 2, W = v.hw + 2, dx = bx - ax, dy = by - ay; let t0 = 0, t1 = 1;
  for (const [p, q] of [[-dx, ax + L], [dx, L - ax], [-dy, ay + W], [dy, W - ay]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return t0 <= t1;
}
