// Aiming (PLAN.md 8.12): lock-on, flick switching and aim assist, over the candidate targets the game hands in. Aim is
// chosen on SCREEN (the 70-degree cone is the player's view of it, whichever view is up), so every function takes a
// projector, toScreen(x, y, z) -> [sx, sy] (the Stage's, or a flat one in tests). The shot itself flies in the world:
// shotFrom gives its 3D direction, pitched at a locked or assisted target's chest, so a roof shooter hits the street.
//   const aim = new Aimer();  aim.update(dt, { held, dir, shooter, candidates, toScreen, los, range })
//   aim.target (locked actor or null) · aim.dir (world unit [x, y], assisted) · aim.pitchTo ([x, y, z] or null)
import { TUNE, knob } from '../core/tune.js';

knob('Combat', 'lockCone', 'Lock-on cone', 70, 10, 180, 5, 'Degrees of screen a lock-on looks across, centred on the aim');
knob('Combat', 'lockKeep', 'Lock-on keeps to', 1.25, 1, 2, .05, 'A locked target stays locked out to this many times the weapon range');
knob('Combat', 'flickAt', 'Flick threshold', .75, .3, 1, .05, 'How far the right stick must travel from rest, in a moment, to switch the lock');
knob('Combat', 'flickCone', 'Flick cone', 60, 10, 120, 5, 'Degrees either side of the flick that the next target may lie in');
/** aim assist levels: the cone (degrees either side, on screen) it helps within and how much of the way it pulls */
export const ASSIST = { off: { cone: 0, pull: 0 }, low: { cone: 8, pull: .45 }, standard: { cone: 16, pull: .8 } };
export const CHEST = 22;   // a body's chest above its feet (the engine's HEIGHTS.chest)
const SIGHT_TRIES = 4;   // the most sight lines one assist asks

const angleBetween = (ax, ay, bx, by) => { const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by); if (!la || !lb) return Math.PI; return Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)))); };
/** the aim direction as a screen vector: from the shooter's chest along dir (world, unit) */
function screenDir(s, dir, toScreen) {
  const a = toScreen(s.x, s.y, s.z + CHEST), b = toScreen(s.x + dir[0] * 64, s.y + dir[1] * 64, s.z + CHEST);
  return [b[0] - a[0], b[1] - a[1], a];
}
/** could this candidate be aimed at: alive, not the shooter, within reach (the sight line is the dear part: callers
 *  ask it last, of the one that would win) */
function reachable(c, s, range) {
  if (!c || c === s || c.dead || c.alive === false || c.aimable === false) return false;
  return !range || Math.hypot(c.x - s.x, c.y - s.y) <= range;
}
/** can this candidate be aimed at: reachable, and in sight? */
function valid(c, s, range, los) { return reachable(c, s, range) && (!los || los(s, c)); }
/** the lock-on pick: the best target within TUNE.lockCone of the aim on screen. Threats (o.threat(c): it is fighting
 *  the shooter) and hostiles (c.hostile) come first; then the nearest on screen, the angle off the aim counting a little
 *  against (at the cone's edge a target counts half again as far) */
export function pickLock(s, dir, candidates, o) {
  const [ax, ay, a] = screenDir(s, dir, o.toScreen), half = TUNE.lockCone / 2 * Math.PI / 180;
  let best = null, bestScore = Infinity;
  for (const c of candidates) {
    if (!reachable(c, s, o.range)) continue;
    const p = o.toScreen(c.x, c.y, (c.z || 0) + CHEST), dx = p[0] - a[0], dy = p[1] - a[1], ang = angleBetween(ax, ay, dx, dy);
    if (ang > half) continue;
    const near = Math.hypot(dx, dy), threat = o.threat && o.threat(c) ? .35 : c.hostile ? .6 : 1;
    const score = near * (1 + .5 * ang / half) * threat;
    if (score < bestScore && (!o.los || o.los(s, c))) { bestScore = score; best = c; }
  }
  return best;
}
/** a flick from the current target: the target lying in the flick's screen direction (within TUNE.flickCone), the
 *  nearest to the current one first */
export function flickLock(s, current, flick, candidates, o) {
  const a = o.toScreen(current.x, current.y, (current.z || 0) + CHEST), half = TUNE.flickCone * Math.PI / 180;
  let best = null, bestScore = Infinity;
  for (const c of candidates) {
    if (c === current || !reachable(c, s, o.range)) continue;
    const p = o.toScreen(c.x, c.y, (c.z || 0) + CHEST), dx = p[0] - a[0], dy = p[1] - a[1], ang = angleBetween(flick[0], flick[1], dx, dy);
    if (ang > half) continue;
    const score = Math.hypot(dx, dy) * (1 + ang / half);
    if (score < bestScore && (!o.los || o.los(s, c))) { bestScore = score; best = c; }
  }
  return best;
}
/** free aim helped by the assist level: the target within its cone (on screen) and the aim pulled toward it. The
 *  nearest to the aim that is in sight wins; the sight line is asked of the few nearest the aim only (a crowd behind a
 *  wall costs no ray each) */
export function assist(s, dir, candidates, o) {
  const lv = ASSIST[o.level || 'standard'] || ASSIST.standard; if (!lv.cone) return { dir, target: null };
  const [ax, ay, a] = screenDir(s, dir, o.toScreen), half = lv.cone * Math.PI / 180, inCone = [];
  for (const c of candidates) {
    if (!reachable(c, s, o.range)) continue;
    const p = o.toScreen(c.x, c.y, (c.z || 0) + CHEST), ang = angleBetween(ax, ay, p[0] - a[0], p[1] - a[1]);
    if (ang <= half) inCone.push([ang, c]);
  }
  inCone.sort((p, q) => p[0] - q[0]);
  let best = null;
  for (let i = 0; i < inCone.length && i < SIGHT_TRIES; i++) if (!o.los || o.los(s, inCone[i][1])) { best = inCone[i][1]; break; }
  if (!best) return { dir, target: null };
  const tx = best.x - s.x, ty = best.y - s.y, tl = Math.hypot(tx, ty) || 1, k = lv.pull;
  let x = dir[0] * (1 - k) + tx / tl * k, y = dir[1] * (1 - k) + ty / tl * k; const l = Math.hypot(x, y) || 1; x /= l; y /= l;
  return { dir: [x, y], target: best };
}
/** a shot's world direction (unit 3D): along the aim (dir, world unit), pitched to reach the height of a point (a
 *  target's chest, the mouse's ground point) where it lies, or level */
export function shotFrom(s, dir, at) {
  if (!at) return [dir[0], dir[1], 0];
  const d = Math.hypot(at[0] - s.x, at[1] - s.y) || 1, slope = (at[2] - ((s.z || 0) + CHEST)) / d, l = Math.hypot(1, slope);
  return [dir[0] / l, dir[1] / l, slope / l];
}

/** clear sight from a's chest to b's through the map's walls (heights: a roof's edge hides the street below it, a low
 *  wall does not), sampled every 6 units */
export function losClear(map, a, b, decks = null) {
  const az = (a.z || 0) + CHEST, bz = (b.z || 0) + CHEST * .8, n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6);
  for (let i = 1; i < n; i++) {
    const k = i / n, x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k, z = az + (bz - az) * k; if (map.heightAt(x, y) > z) return false;
    if (decks) for (const d of decks) { const top = d.heightAt(x, y); if (top !== null && z <= top && z >= top - (d.thickness || 6)) return false; }   // (a deck's slab between: a shooter up there and a ped on the street)
  }
  return true;
}
/** one shooter's aim over time: lock-on while the aim button is held, flicks to switch, assist otherwise */
export class Aimer {
  constructor() { this.target = null; this.dir = [1, 0]; this.pitchTo = null; this.point = null; this._held = false; this._stick = 0; this._stickT = 0; this._flicked = false; }
  /** o: { held (the aim button), dir (the intent's aim, world unit, or null: keep facing), facing (radians, when dir is
   *  null), shooter (x, y, z), candidates, toScreen, los(shooter, c), range, level (assist), threat(c), point (the mouse's
   *  ground point [x, y], or null), stick (0..1: how far the aim stick is pushed, for flicks) } */
  update(dt, o) {
    const s = o.shooter, dir = o.dir || [Math.cos(o.facing || 0), Math.sin(o.facing || 0)];
    this.point = o.point || null;   // (the mouse's ground point: where a throw lands)
    // not aiming, not firing, no lock: the aim is the facing (the assist and its sight lines are for a shot)
    if (o.idle && !this.target && !this._held) { this._stick = o.stick || 0; this._stickT = 0; this._flicked = false; this.dir = dir; this.pitchTo = null; return this; }
    if (o.held && !this._held) this.target = pickLock(s, dir, o.candidates, o);   // (the press picks)
    if (!o.held) this.target = null;
    this._held = o.held;
    // keep the lock while it stays valid (a little past the weapon's range)
    if (this.target && !valid(this.target, s, o.range ? o.range * TUNE.lockKeep : 0, o.los)) this.target = o.held ? pickLock(s, dir, o.candidates, o) : null;
    // a flick: the stick from near rest to past the threshold within a quarter second
    const st = o.stick || 0;
    if (st < .3) { this._stickT = 0; this._flicked = false; } else this._stickT += dt;
    if (this.target && !this._flicked && st >= TUNE.flickAt && this._stickT <= .25 && o.dir) {
      const [fx, fy] = screenDir(s, o.dir, o.toScreen), next = flickLock(s, this.target, [fx, fy], o.candidates, o);
      if (next) this.target = next; this._flicked = true;
    }
    this._stick = st;
    if (this.target) {
      const t = this.target, dx = t.x - s.x, dy = t.y - s.y, l = Math.hypot(dx, dy) || 1;
      this.dir = [dx / l, dy / l]; this.pitchTo = [t.x, t.y, (t.z || 0) + CHEST]; return this;
    }
    if (o.point) {   // the mouse: aim at its ground point; from a roof that means down at the street
      const dx = o.point[0] - s.x, dy = o.point[1] - s.y, l = Math.hypot(dx, dy) || 1, below = (s.z || 0) - (o.point[2] || 0);
      this.dir = [dx / l, dy / l]; this.pitchTo = Math.abs(below) > 20 ? [o.point[0], o.point[1], (o.point[2] || 0) + CHEST] : null;
      const h = assist(s, this.dir, o.candidates, { ...o, level: o.level === 'off' ? 'off' : 'low' });
      if (h.target) { this.dir = h.dir; this.pitchTo = [h.target.x, h.target.y, (h.target.z || 0) + CHEST]; }
      return this;
    }
    const h = assist(s, dir, o.candidates, o);
    this.dir = h.dir; this.pitchTo = h.target ? [h.target.x, h.target.y, (h.target.z || 0) + CHEST] : null;
    return this;
  }
}
