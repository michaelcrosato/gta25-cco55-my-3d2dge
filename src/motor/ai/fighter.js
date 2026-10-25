// A fighter on foot (PLAN.md 8.13, 8.14): the Intent an armed ped acts on against one target, each step. The police's
// officers (cop.js) and the gangs' members (gangs.js) are fighters.
//   - a gun (a pistol, the SMG, the shotgun): it closes to its range (a share of the weapon's) and a clear line of fire
//     (round a wall's corner; a step aside when a car stands in the way, or, for a careful fighter, the player's, anyone
//     not in the fight, and round it toward the target when the steps clear nothing; a fighter with someone to spare, a gang's member not after the player, steps aside while the
//     player or their car is anywhere its shots could go), stops, and fires in bursts at the target's chest, each burst
//     a little off;
//   - a bat, or bare fists: it runs in and swings;
//   - a Molotov or a grenade: now and then, at a throw's distance, one goes where the target stands (never with someone
//     it spares near there);
//   - blocked by a wall on its way, it takes the sidewalk graph round.
// Deterministic: its share of its owner's RNG stream.
//   class CopBrain extends Fighter  ·  const F = new Fighter(ped, { walks, rng, profile });  I = F.attack(dt, I, target)
import { TUNE } from '../core/tune.js';
import { makeIntent } from '../sim/intent.js';
import { aloft } from '../sim/vehicle/defs.js';

const NODE_NEAR = 9, THROW_MIN = 70, THROW_MAX = 230, THROW_EVERY = 6, BLAST = 110;
/** how a fighter fights: its range (a share of its gun's), bursts and pauses (s), aim (radians off at most), and kite
 *  (a share of that range: closer than it, it backs off as it fires; 0: it stands) */
export const FIGHT = { range: .45, burst: .7, pause: .6, aimOff: .08, kite: 0 };

export class Fighter {
  /** ped: its Ped; o: { walks (Sidewalks), map (the TileMap: lines of fire), fleet (the cars in the way), rng, profile
   *  ({ range, burst, pause, aimOff }: numbers, or functions of nothing for TUNE knobs), refill (false: no ammo given:
   *  the mission bot fights with what the player carries), noSelect (true: the weapon it wants is left in want, for
   *  its owner to step to: the pad pilot's), best (true: the gun with the most damage a second that has ammo, not the
   *  first carried), spare (() -> [bodies and vehicles]: whom its fire must never reach, the player and their car to a
   *  gang not after them: crossfire in its fights with others had wrecked a job's car) } */
  constructor(ped, o = {}) {
    this.noSelect = !!o.noSelect; this.want = null; this.careful = !!o.careful; this.pedsNear = o.pedsNear || null;   // (careful: holds its fire over people in the way: pedsNear(x, y, r))
    this.spare = o.spare || null;
    this.ped = ped; this.S = o.walks || null; this.map = o.map || null; this.fleet = o.fleet || null; this.rng = o.rng; this.I = makeIntent(); this.profile = { ...FIGHT, ...(o.profile || {}) };
    this.side = this.rng && this.rng.next() < .5 ? -1 : 1; this.stepT = 0; this.blockT = 0;
    this.burst = 0; this.pause = this.rng ? this.rng.next() * .5 : 0; this.off = 0; this.throwT = 2 + (this.rng ? this.rng.next() * THROW_EVERY : 0);
    this.goal = null; this.path = null; this.pathKey = null; this.pi = 0; this.last = [ped.x, ped.y]; this.stuck = 0; this.t = 0;
    const spec = id => ped.inv.spec(id);
    const guns = ped.inv.list().filter(id => { const s = spec(id); return s && s.projectile !== 'melee' && s.projectile !== 'molotov' && s.projectile !== 'grenade' && s.damage > 0; });
    const dps = id => { const s = spec(id), r = ped.inv.rounds(id); return r && r.total + r.mag <= 0 ? -1 : s.damage * (s.pellets || 1) * (s.rate || 1); };
    this.gun = (o.best ? guns.sort((a, b) => dps(b) - dps(a)).find(id => dps(id) >= 0) : guns[0]) || null;
    this.melee = ped.inv.list().find(id => { const s = spec(id); return s && s.projectile === 'melee' && id !== 'fists'; }) || 'fists';
    this.thrown = ped.inv.list().find(id => { const s = spec(id); return s && (s.projectile === 'molotov' || s.projectile === 'grenade'); }) || null;
    if (this.gun && o.refill !== false) ped.inv.give(this.gun, 999, true);
    if (this.thrown && o.refill !== false) ped.inv.give(this.thrown, 3, true);
    if (!this.gun && this.thrown) this.throwT = 0;   // (no gun: it leads with the throw, from a throw's distance)
  }
  _p(k) { const v = this.profile[k]; return typeof v === 'function' ? v() : v; }
  /** the weapon in hand for a fight at distance d: a throw now and then, else the gun, else the bat */
  _arm(d, dt, tgt) {
    const inv = this.ped.inv;
    this.throwT -= dt;
    if (this.thrown && this.ped.throwing) return this.thrown;   // (mid-throw: the bottle in hand till it's gone)
    if (this.thrown && inv.rounds(this.thrown) && inv.rounds(this.thrown).total > 0 && this.throwT <= 0 && d > THROW_MIN && d < THROW_MAX) {
      if (!this._sparedNear(tgt, (inv.spec(this.thrown).splash || 40) + 30)) return this.thrown;
      this.throwT = 1;   // (someone it spares too near where it would land: not now)
    }
    return this.gun || this.melee;
  }
  /** fight the target ({ x, y, z, ... a body, or a vehicle it drives }): close in, then shoot, swing or throw */
  attack(dt, I, tgt) {
    this.t += dt; const p = this.ped, d = Math.hypot(tgt.x - p.x, tgt.y - p.y), w = this._arm(d, dt, tgt), spec = p.inv.spec(w);
    if (p.inv.current !== w) { if (this.noSelect) this.want = w; else p.inv.select(w); }
    if (!spec || spec.projectile === 'melee') {   // in close, then the swings (a press each beat: the combo chains them)
      if (d > 16) return this._go(dt, I, tgt.x, tgt.y, true, 'target');
      p.mover.facing = Math.atan2(tgt.y - p.y, tgt.x - p.x); if (this._r() < .3) I.tap.attack = true; return I;
    }
    if (spec.projectile === 'molotov' || spec.projectile === 'grenade') {   // (one thrown at its feet, then back to the gun)
      this._aimAt(I, tgt, false); I.aimPoint = [tgt.x, tgt.y, tgt.z || 0];
      if (p.throwing) this.throwT = THROW_EVERY * (.8 + .4 * this._r());   // (it's away: the next one a while off)
      else if (p.inv.current === w && p.inv.cool <= 0) { I.tap.attack = true; I.down.attack = true; }   // (pressed once the switch to it has settled)
      return I;
    }
    const range = Math.max(40, spec.range * this._p('range')), line = this._lineTo(tgt);
    if (d > range || line === 'wall') return this._go(dt, I, tgt.x, tgt.y, true, 'target');   // (closer, or round the corner it hides behind)
    if (line === 'car') { this.blockT += dt; return this.careful && this.blockT > 3 ? this._go(dt, I, tgt.x, tgt.y, true, 'round') : this._aside(dt, I, tgt); }   // (the player's: steps aside that clear nothing for 3 s, round it toward the target: two behind a parked truck had kept it stepping to and fro while they shot)
    this.blockT = 0;
    I.move[0] = I.move[1] = 0;
    // (a kiter backs off from a target come closer than its share of the range, still firing: where the way behind is
    // open)
    const kite = this._p('kite'); if (kite && d < range * kite) { const bx = p.x - (tgt.x - p.x) / (d || 1) * 24, by = p.y - (tgt.y - p.y) / (d || 1) * 24; if (!this.map || this.map.cell(Math.floor(bx / this.map.T), Math.floor(by / this.map.T)) === 0) { I.move[0] = (p.x - tgt.x) / (d || 1); I.move[1] = (p.y - tgt.y) / (d || 1); } }
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
  /** the line of fire to the target (chest to chest), looked at a few times a second: lineOfFire's; and every step,
   *  whether someone it spares is where its shots could go (a car moves through a line in a moment) */
  _lineTo(tgt) {
    if (!(this._lineT > this.t && this._lineFor === tgt)) {
      this._lineT = this.t + .25; this._lineFor = tgt;
      const line = lineOfFire(this.ped, tgt, this.map, this.fleet);
      this._line = line !== 'wall' && line !== 'car' && this.careful && this._peopleIn(tgt) ? 'car' : line;   // (someone in the way: stepped round, as a car)
    }
    return this._line === true && this._spares(tgt) ? 'car' : this._line;
  }
  // whom it spares, but the target (and the target's car): none for most
  _spared(tgt) { const S = this.spare ? this.spare() : null; return S && S.length ? S.filter(q => q && q !== tgt && !(tgt.seat && q === tgt.seat.vehicle)) : null; }
  // one it spares where its shots could go: by the line of fire, as wide as the gun's spread (moving) makes it, and on
  // past the target; a car where it is and where it will be in a moment
  _spares(tgt) {
    const S = this._spared(tgt); if (!S || !S.length) return false;
    if (tgt.hl !== undefined && this._sparedNear(tgt, BLAST)) return true;   // (a car shot at may blow up: not with one it spares by it)
    const p = this.ped, dx = tgt.x - p.x, dy = tgt.y - p.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, spec = p.inv.spec(this.gun);
    const wide = 10 + (d + 60) * Math.tan(Math.min(30, (spec && spec.spread || 2) * (TUNE.moveSpread || 1.5)) * Math.PI / 180);
    for (const q of S) {
      const car = !!q.body && q.hl !== undefined, r = car ? Math.max(q.hl, q.hw) : 6;
      for (const k of car ? [0, .4] : [0]) {
        const x = q.x + (car ? q.body.vx * k : 0) - p.x, y = q.y + (car ? q.body.vy * k : 0) - p.y, along = x * ux + y * uy;
        if (along > -r && along < d + 60 + r && Math.abs(y * ux - x * uy) < wide + r) return true;
      }
    }
    return false;
  }
  // one it spares within r of the target (a throw's splash, and its miss)
  _sparedNear(tgt, r) { const S = this._spared(tgt); return !!S && S.some(q => Math.hypot(q.x - tgt.x, q.y - tgt.y) - (q.body && q.hl !== undefined ? q.hl : 0) < r); }
  // someone not in the fight between it and the target, near the line of fire
  _peopleIn(tgt) {
    const p = this.ped, N = this.pedsNear; if (!N) return false;
    const dx = tgt.x - p.x, dy = tgt.y - p.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    for (const q of N((p.x + tgt.x) / 2, (p.y + tgt.y) / 2, d / 2 + 12)) {
      if (q === p || q === tgt || q.dead || q.floored || q.seat || q.hostile) continue;
      const ox = q.x - p.x, oy = q.y - p.y, along = ox * ux + oy * uy;
      if (along > 6 && along < d - 6 && Math.abs(oy * ux - ox * uy) < 9) return true;
    }
    return false;
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
    const p = this.ped, far = Math.hypot(tx - p.x, ty - p.y);
    if (this.path && this.pathKey === key) {
      while (this.pi < this.path.length) { const n = this.S.nodes[this.path[this.pi]]; if (Math.hypot(n.x - p.x, n.y - p.y) < NODE_NEAR) this.pi++; else break; }
      if (this.pi < this.path.length) { const n = this.S.nodes[this.path[this.pi]]; tx = n.x; ty = n.y; } else this.path = null;
    }
    const dx = tx - p.x, dy = ty - p.y, l = Math.hypot(dx, dy) || 1, k = run ? 1 : .5;
    I.move[0] = dx / l * k; I.move[1] = dy / l * k; I.down.sprint = run && l > 60;
    const moved = Math.hypot(p.x - this.last[0], p.y - this.last[1]); this.last[0] = p.x; this.last[1] = p.y;
    this.stuck = moved < .15 ? this.stuck + dt : 0;
    if (this.aside > 0) { this.aside -= dt; I.move[0] = -dy / l * this.asideK; I.move[1] = dx / l * this.asideK; I.down.sprint = false; return I; }   // (a step to one side: round a parked car, a post)
    if (far < (this.stuckFar ?? 1e9) - 30) { this.stuckN = 0; this.stuckFar = far; }   // (getting there: not stuck)
    if (this.stuck > .8 && this.S) {   // (round by the sidewalks: from the node nearest us to the one nearest the goal; stuck again, a step aside, one way then the other)
      this.stuck = 0; this.stuckN = (this.stuckN || 0) + 1; this.stuckFar = far;
      if (this.stuckN % 2 === 0) { this.aside = .7; this.asideK = this.stuckN % 4 === 0 ? -1 : 1; return I; }
      const a = this.S.nearestNode(p.x, p.y, 200), b = this.S.nearestNode(tx, ty, 300);
      this.path = a && b ? this.S.route(a.id, b.id) : null; this.pi = 0; this.pathKey = key;
      if (!this.path) { I.tap.jump = true; I.down.jump = true; }
    }
    return I;
  }
  _r() { return this.rng ? this.rng.next() : .5; }
}

/** the line of fire from a body to a target (chest to chest): true (clear), 'wall' (the map's cells, or a solid on the
 *  way as the shots meet it: a pillar, a container, a crate; map.ray sees the cells only) or 'car' (a vehicle in the
 *  way, not the target's own nor the shooter's: a drive-by's) */
export function lineOfFire(p, tgt, map = null, fleet = null) {
  if (map && !map.ray(p, tgt, { eye: 18, target: 16 }).clear) return 'wall';
  if (map && map.solids && map.solids.length) {
    const z0 = (p.z || 0) + 18, z1 = (tgt.z || 0) + 16, dx = tgt.x - p.x, dy = tgt.y - p.y, L = Math.hypot(dx, dy);
    for (let s = 14; s < L - 14; s += 8) { const k = s / L; if (map.heightAt(p.x + dx * k, p.y + dy * k) > z0 + (z1 - z0) * k) return 'wall'; }
  }
  if (fleet) {
    const mx = (p.x + tgt.x) / 2, my = (p.y + tgt.y) / 2, r = Math.hypot(tgt.x - p.x, tgt.y - p.y) / 2 + 30, own = tgt.seat ? tgt.seat.vehicle : tgt.body ? tgt : null, mine = p.seat ? p.seat.vehicle : null;
    for (const v of fleet.near(mx, my, r)) if (v !== own && v !== mine && v.body && !aloft(v) && v.z < (p.z || 0) + 18 && crosses(v, p, tgt)) return 'car';
  }
  return true;
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
