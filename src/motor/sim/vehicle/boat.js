// A boat (PLAN.md 8.8): the Bilge Rat on the harbour, the canal and the sea. No tyres: the propeller pushes along the
// hull (the car's power model: min(accel, P / speed), drag balancing it at the top speed), the keel resists sliding
// sideways (the stern swings out in a hard turn), and the rudder turns it by how fast water passes it (no steering at
// rest; reversed going astern). Water cells only: land, quays and bridges are walls to it, except a drawbridge's span
// while it is up (world.water(cx, cy) decides). The bob and the wake are drawn, not simulated.
import { E } from '../../engine.js';
import { VehicleBody } from './body.js';

/** a boat's handling: every number a default a definition overrides */
export const BOAT_HANDLING = { length: 56, width: 22, height: 12, wheelbase: 30, mass: 900, top: 220, accel: 120, reverseTop: 50, brake: 160,
  rudder: 2.4, keel: 3.2, rolling: .12, steerRate: 4, gears: 3 };

export class BoatBody extends VehicleBody {
  constructor(spec = {}, x = 0, y = 0, heading = 0) { super(Object.assign({}, BOAT_HANDLING, spec), x, y, heading); this._water = null; }
  step(dt, ctl, world = {}) { this._water = world.water || null; super.step(dt, ctl, world); }
  _sub(dt, world) {
    const h = this.h, C = this.ctl, u = this.u;
    this.steerAngle += E.clamp(E.clamp(C.steer, -1, 1) - this.steerAngle, -h.steerRate * dt, h.steerRate * dt);
    // thrust: ahead with the throttle, astern with the brake once slow (the brake is reverse thrust first)
    let F = 0;
    if (C.throttle > 0 && u > -5) F = C.throttle * Math.min(h.accel * (C.boost || 1), this.P * (C.boost || 1) / Math.max(1, Math.abs(u)));
    else if (C.brake > 0) F = u > 4 ? -C.brake * h.brake : (u > -h.reverseTop ? -C.brake * h.accel * .5 : 0);
    else if (C.throttle > 0) F = C.throttle * h.brake;   // (the throttle stops a boat going astern)
    const du = (F - this.cd * u * Math.abs(u) - h.rolling * u + this.v * this.w) * dt;
    this.u += du;
    // the keel: sideways motion dies away (slower the faster it planes: a hard turn slides)
    this.v += (-this.u * this.w) * dt * .25; this.v *= Math.exp(-h.keel * dt / (1 + Math.abs(this.u) / 160));
    // the rudder: a yaw rate by the water's speed past it
    const auth = E.clamp(this.u / 70, -1, 1), want = this.steerAngle * h.rudder * auth * (1 - .35 * Math.min(1, Math.abs(this.u) / h.top));
    this.w += (want - this.w) * Math.min(1, 3 * dt);
    this.felt.lat = this.u * this.w; this.felt.lon = F - h.rolling * u; this.felt.slip = Math.atan2(this.v, Math.abs(this.u) + 1); this.felt.wheelspin = 0;
    const c = Math.cos(this.heading), s = Math.sin(this.heading);
    this.x += (this.u * c - this.v * s) * dt; this.y += (this.u * s + this.v * c) * dt; this.heading += this.w * dt;
    if (world.map) this._collideMap(world.map, world);
  }
  /** a cell is a wall to a boat unless it is water (world.water), and any wall cell is */
  _blocked(map, cx, cy) { const id = map.cell(cx, cy); if (id !== 0) return true; return this._water ? !this._water(cx, cy) : false; }
  /** a boat is never airborne, flipped or towed */
  launch() {}
}
