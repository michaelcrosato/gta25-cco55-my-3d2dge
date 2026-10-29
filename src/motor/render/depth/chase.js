// THE CHASE CAMERA (PLAN.md 19's backlog, HANDOFF L4): MODE 7 with its rail let go. The same level camera with its lens
// shifted (walls and figures upright, the floor receding as from a pitched one), but behind the focus at any heading,
// turning after it as a kart game's does: in a vehicle it swings round behind the bonnet with the car's heading, on
// foot it eases round behind the player while they walk on ahead of it, and the turn buttons swing it a quarter
// round. Everything MODE 7 draws it draws too, through Side7View's drawing at any heading (MODE 7's own off its quarters,
// D48): the floor raster steps across each buffer row in both world axes; a span shows whichever of its four faces look
// toward the camera, each cut a tile wide (sorted by its far end, as MODE 7's side slices) and filled through the same
// affine quads; a top seen from above is cut at the near plane. Rigs are drawn through views at the heading in 3° steps (kept and reused).
// Presentation only, as every view: the simulation never reads it.
import { E } from '../../engine.js';
import { Side7View, axesAt } from './side7.js';

export { axesAt };

const DEG = Math.PI / 180, VIEW_STEP = 3;
/** the chase lens: height, how far behind the focus, the field of view (widen: degrees more at top speed) and how fast
 *  the camera swings round after the focus's heading (turn: 1/s) */
export const CHASE = {
  foot: { h: 66, back: 130, fov: 54, widen: 0, turn: 1.2 },
  vehicle: { h: 78, back: 175, fov: 56, widen: 10, turn: 3.2 },
  indoor: { h: 50, back: 80, fov: 60, widen: 0, turn: 1.5 },
};
const FOOT_CONE = 60;   // (degrees: on foot the camera comes round only while the player walks within this of its forward)
const CHEST = 20;   // (world units: the player's chest, which the free camera keeps in sight, D50)
const FREE_RECENTRE = 1.5;   // (s: the free camera at the wheel comes round behind again this long after the stick lets go, D50)

/** a world direction (x, y) as a heading in degrees, 0..360 */
export function headingOf(x, y) { return ((Math.atan2(x, -y) / DEG) % 360 + 360) % 360; }
const turnTo = (a, b) => ((b - a + 540) % 360) - 180;   // (the shortest signed turn from a to b, degrees)

export class ChaseView extends Side7View {
  /** o: as Side7View's ({ sky, fog, farClip, ... }) */
  constructor(o = {}) {
    super({ id: 'chase', label: 'CHASE', back: CHASE.foot.back, turn: CHASE.foot.turn, h: CHASE.foot.h, fov: CHASE.foot.fov, ...o });
    this.mode7 = true; this.swing = 0;
  }
  /** drawn as at any heading, always (it turns all the time: Side7View's general floor and spans, its kept images by
   *  the heading in steps of 1.5°) */
  get aligned() { return false; }
  /** face a heading (any, in degrees) round the focus at the lens's distance behind it */
  setHeading(deg, fx, fy) {
    this.heading = ((deg % 360) + 360) % 360; this.swing = 0;
    if (fx !== undefined) { const a = this.ax(); this.x = fx - a.f[0] * this.back; this.y = fy - a.f[1] * this.back; this.ready = true; }
  }
  /** the turn buttons: a quarter round, eased in by follow (dir -1 left, 1 right) */
  turnBy(dir) { this.swing += 90 * dir; }
  /** the lens for where the focus is, how fast and how high: eased as MODE 7's */
  rig(dt, vehicle, speed01 = 0, fz = 0) {
    const R = this.indoor ? CHASE.indoor : vehicle ? CHASE.vehicle : CHASE.foot, k = this.ready ? 1 - Math.exp(-dt * 2.5) : 1, fov = R.fov + R.widen * E.clamp(speed01, 0, 1);
    this.lensH = this.lensH === undefined ? this.h : this.lensH;   // (the lens's own height; the free camera, come in, rides lower along its sight line: follow)
    this.lensH += (Math.max(8, R.h + fz + this.lift(this.back)) - this.lensH) * k; this.h = this.lensH;   // (tilted up, the lens never under the street)
    this.back += (R.back - this.back) * k; this.fov += (fov - this.fov) * k;
    this.near = this.back * .8; this.far = this.back * 1.25;   // (MODE 7's keys, for whatever reads them)
  }
  /** each simulation step (the heading maps the stick, so it turns in the step, never in a frame drawn: the same game
   *  headless and in the page): after the focus's heading h (degrees, or null: hold), in a vehicle while it moves, on
   *  foot while it walks on ahead (moving: past a stroll), and the turn buttons' swing eased in */
  steer(dt, h = null, moving = false, vehicle = false) {
    this.inVehicle = !!vehicle; this.turn = (this.indoor ? CHASE.indoor : vehicle ? CHASE.vehicle : CHASE.foot).turn;
    if (this.swing) { const s = Math.abs(this.swing) < .05 ? this.swing : this.swing * Math.min(1, dt * 6); this.swing -= s; this.heading = ((this.heading + s) % 360 + 360) % 360; return; }
    if (this.free) {   // (the free camera, D50: it stays where the stick left it, as a modern open-city game's does; at the wheel it comes round behind again a moment after the stick lets go)
      this.idle = (this.idle || 0) + dt;
      if (!vehicle || this.idle < FREE_RECENTRE) return;
    }
    if (h === null || !moving || (!vehicle && Math.abs(turnTo(this.heading, h)) >= FOOT_CONE)) return;
    this.heading = ((this.heading + turnTo(this.heading, h) * Math.min(1, dt * this.turn)) % 360 + 360) % 360;
  }
  /** behind the focus at (fx, fy) at the heading steer keeps (presentation only: where it stands is never read) */
  follow(dt, fx, fy) {
    if (!this.ready) { this.setHeading(this.heading, fx, fy); return; }
    // a wall taller than the lens between the focus and where the camera would stand: it comes in to this side of it at
    // once (never inside a building looking at its wall), and back out eased once clear
    const a = this.ax(), clear = this._clear(fx, fy, -a.f[0], -a.f[1], this.back);
    this.dist = this.dist === undefined || clear < this.dist ? clear : this.dist + (clear - this.dist) * Math.min(1, dt * 2);
    const k = 1 - Math.exp(-dt * 6), tx = fx - a.f[0] * this.dist, ty = fy - a.f[1] * this.dist;
    if (clear < this.back - 1) { this.x = tx + (this.x - tx) * (1 - k); this.y = ty + (this.y - ty) * (1 - k); const dx = this.x - fx, dy = this.y - fy, d = Math.hypot(dx, dy); if (d > this.dist) { this.x = fx + dx / d * this.dist; this.y = fy + dy / d * this.dist; } }
    else { this.x += (tx - this.x) * k; this.y += (ty - this.y) * k; }
    // the free camera come in (D50): down its sight line to the player's chest, as a modern open-city game's slides in,
    // so the player keeps their place on screen, only nearer
    if (this.free && this.lensH !== undefined) {
      const dd = Math.hypot(this.x - fx, this.y - fy); if (dd < this.back) this.h = CHEST + (this.lensH - CHEST) * Math.max(.2, dd / this.back);
      if (this.under) this.h = Math.min(this.h, this.under - 4);   // (still short of the wall at its nearest: under its roof, the walls between cut to their stubs)
    }
  }
  /** how far from (fx, fy) along (dx, dy) the camera may stand, up to max: short of the first wall cell taller than the
   *  lens (the map's, when it has one) */
  _clear(fx, fy, dx, dy, max) {
    const M = this.map; if (!M) return max;
    const T = M.T;
    for (let d = 8; d <= max; d += 6) {
      const id = M.cell(Math.floor((fx + dx * d) / T), Math.floor((fy + dy * d) / T)); if (id <= 0) continue;
      // the free camera (D50) keeps the line from the lens to the player's chest clear, as a modern open-city game's
      // does, and comes in as close as it must; otherwise only a wall taller than the lens comes between, and the
      // camera no nearer than 60 (the walls still between are cut to their stubs)
      const wh = M.types[id].h || 0;
      if (wh > (this.free ? CHEST + (this.h - CHEST) * d / max : this.h - 8)) { this.under = d - 12 < (this.free ? 50 : 60) ? wh : 0; return Math.max(this.free ? 50 : 60, d - 12); }
    }
    this.under = 0; return max;
  }
  autoRail() { return null; }   // (it turns by itself all the time)
  /** MODE 7's projection, the horizon raised while the camera is in short of a wall: the focus's feet stay on the screen
   *  row they stand on at the lens's full distance (the lens shifted further, so walls stay upright). The free camera
   *  comes in down its sight line instead (follow), which keeps them there by itself (D50) */
  frame(r) {
    const P = super.frame(r);
    if (!this.free && this.dist !== undefined && this.dist < this.back - 1) P.hy -= this.h * P.F * (1 / this.dist - 1 / this.back);
    return P;
  }
  /** the engine View a rig is drawn with at k pixels per unit, at the heading in 3° steps (whole 1/16ths of scale) */
  view(k) {
    const q = Math.max(1 / 16, Math.round(k * 16) / 16), hd = (Math.round(this.heading / VIEW_STEP) * VIEW_STEP) % 360, key = hd * 1000 + q; let v = this.views.get(key);
    if (!v) { if (this.views.size > 600) this.views.clear(); v = new E.View('chase', 'Chase', (360 - hd) % 360, this.pitch, q, 1); this.views.set(key, v); }
    return v;
  }

}
