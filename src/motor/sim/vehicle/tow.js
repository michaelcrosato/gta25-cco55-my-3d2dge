// The tow (PLAN.md 8.8): a hook on the tow truck joined to the towed car's end by a spring-damper. The force along the
// link is k (stretch) + c (closing speed), applied as an impulse at both points each step, so it pulls and pushes and
// turns both bodies; k and c come from the pair's effective mass and a frequency and damping ratio, so the joint is as
// stiff as it is stable at the fixed step (omega dt ~ .2). The towed car rides on its far axle: the end on the hook is
// lifted (no grip, no steering), so it trails like a trailer.
//   const j = new TowJoint(truck, car, { end: 'front' });  each step after the bodies: j.update(dt)  ·  j.release()
import { TUNE, knob } from '../../core/tune.js';

knob('Vehicles', 'towHz', 'Tow stiffness', 2.2, .5, 8, .1, 'The tow link\'s natural frequency (Hz): higher is stiffer');
knob('Vehicles', 'towDamp', 'Tow damping', .9, .1, 2, .05, 'The tow link\'s damping ratio (1: critical)');

export class TowJoint {
  /** truck, car: VehicleBodies; o: { hook: [x, y] (the truck's, in its frame), end: 'front' | 'rear' (the car's end on the
   *  hook), rest (the link's length; default: as it is now, at least 4) } */
  constructor(truck, car, o = {}) {
    this.a = truck; this.b = car; this.hook = o.hook || [-truck.hl - 4, 0]; this.end = o.end || 'front';
    this.hitch = [this.end === 'front' ? car.hl : -car.hl, 0];
    const [pa, pb] = this.points(); this.rest = o.rest ?? Math.max(4, Math.hypot(pb[0] - pa[0], pb[1] - pa[1]));
    car.lifted = this.end; this.on = true; this.maxStretch = 0; this.t = 0;
  }
  /** the hook and the hitch in the world */
  points() {
    const w = (B, [lx, ly]) => { const c = Math.cos(B.heading), s = Math.sin(B.heading); return [B.x + lx * c - ly * s, B.y + lx * s + ly * c]; };
    return [w(this.a, this.hook), w(this.b, this.hitch)];
  }
  /** the link's length now */
  get length() { const [pa, pb] = this.points(); return Math.hypot(pb[0] - pa[0], pb[1] - pa[1]); }
  update(dt) {
    if (!this.on) return;
    this.t += dt;
    const A = this.a, B = this.b, [pa, pb] = this.points();
    let nx = pb[0] - pa[0], ny = pb[1] - pa[1]; const d = Math.hypot(nx, ny) || 1e-6; nx /= d; ny /= d;
    const ra = [pa[0] - A.x, pa[1] - A.y], rb = [pb[0] - B.x, pb[1] - B.y];
    const va = [A.vx - A.w * ra[1], A.vy + A.w * ra[0]], vb = [B.vx - B.w * rb[1], B.vy + B.w * rb[0]];
    const vrel = (vb[0] - va[0]) * nx + (vb[1] - va[1]) * ny;
    const ran = ra[0] * ny - ra[1] * nx, rbn = rb[0] * ny - rb[1] * nx;
    const kInv = 1 / A.h.mass + 1 / B.h.mass + ran * ran / A.I + rbn * rbn / B.I, mEff = 1 / kInv;
    const om = 2 * Math.PI * TUNE.towHz, k = mEff * om * om, c = 2 * TUNE.towDamp * mEff * om;
    const F = -(k * (d - this.rest) + c * vrel), J = F * dt;   // (on B along n; on A the opposite)
    push(B, J * nx, J * ny, rb); push(A, -J * nx, -J * ny, ra);
    this.maxStretch = Math.max(this.maxStretch, Math.abs(d - this.rest));
  }
  release() { if (!this.on) return; this.on = false; this.b.lifted = null; }
}
function push(B, Jx, Jy, r) {
  const vx = B.vx + Jx / B.h.mass, vy = B.vy + Jy / B.h.mass;
  B.setVelocity(vx, vy); B.w += (r[0] * Jy - r[1] * Jx) / B.I;
}
