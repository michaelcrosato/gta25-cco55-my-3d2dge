// A helicopter (PLAN.md 8.8): the MPD Eye, AI only in the slice. It flies to a point at an altitude: an acceleration
// toward where it wants to be (a spring with damping, capped at its top speed), a climb or a descent to the altitude
// (never lower than what stands under it plus a margin: it rises over towers), and a yaw toward where it goes. It
// tilts into its acceleration (cosmetic: tiltF nose down, tiltS a bank) and sweeps a spotlight toward a point.
//   ctl: { to: [x, y], alt, face (a heading, or null: the way it flies), spot: [x, y] | null }
import { E } from '../../engine.js';
import { VehicleBody } from './body.js';

export const HELI_HANDLING = { length: 60, width: 16, height: 18, mass: 2200, top: 240, accel: 160, climb: 90, yawRate: 1.4, clearance: 36, spotSpeed: 160, hoverZ: 140 };

export class HeliBody extends VehicleBody {
  constructor(spec = {}, x = 0, y = 0, heading = 0) {
    super(Object.assign({}, HELI_HANDLING, spec), x, y, heading);
    this.z = this.h.hoverZ; this.airborne = true; this.wx = 0; this.wy = 0; this.tiltF = 0; this.tiltS = 0; this.spot = null; this.rotor = 0;
  }
  get vx() { return this.wx; } get vy() { return this.wy; }
  get speed() { return Math.hypot(this.wx, this.wy); }
  setVelocity(vx, vy) { this.wx = vx; this.wy = vy; }
  step(dt, ctl = {}, world = {}) {
    if (this.falling) {   // shot down: it drops out of the sky, spinning, and lies where it lands
      const g = world.map ? world.map.heightAt(this.x, this.y) : 0;
      if (this.z > g) { this.vz -= 500 * dt; this.z = Math.max(g, this.z + this.vz * dt); this.heading += 3 * dt; this.x += this.wx * dt; this.y += this.wy * dt; this.wx *= .98; this.wy *= .98; if (this.z <= g) this.felt.land = -this.vz; }
      else { this.vz = 0; this.wx = this.wy = 0; this.felt.land = 0; }
      this.rotor += dt * 4; this.felt.hit = 0; return;
    }
    const h = this.h, to = ctl.to || [this.x, this.y], k = 1.6, damp = 2.2;
    // where it wants to go: a damped spring toward the point, the push capped at its acceleration, the speed at its top
    let ax = (to[0] - this.x) * k - this.wx * damp, ay = (to[1] - this.y) * k - this.wy * damp;
    const a = Math.hypot(ax, ay); if (a > h.accel) { ax *= h.accel / a; ay *= h.accel / a; }
    this.wx += ax * dt; this.wy += ay * dt;
    const s = Math.hypot(this.wx, this.wy); if (s > h.top) { this.wx *= h.top / s; this.wy *= h.top / s; }
    this.x += this.wx * dt; this.y += this.wy * dt;
    // its altitude: the asked one, and always clear of what stands below
    const floor = (world.map ? world.map.heightAt(this.x, this.y) : 0) + h.clearance, alt = Math.max(ctl.alt ?? h.hoverZ, floor);
    this.vz = E.clamp((alt - this.z) * 1.5, -h.climb, h.climb); this.z += this.vz * dt;
    if (this.z < floor) this.z = floor;
    // yaw toward the way it flies (or a heading it is told to face), and tilt into the push
    const want = ctl.face ?? (s > 20 ? Math.atan2(this.wy, this.wx) : this.heading), err = Math.atan2(Math.sin(want - this.heading), Math.cos(want - this.heading));
    this.w = E.clamp(err * 2, -h.yawRate, h.yawRate); this.heading += this.w * dt;
    const c = Math.cos(this.heading), sn = Math.sin(this.heading), fa = ax * c + ay * sn, sa = -ax * sn + ay * c;
    this.tiltF += (E.clamp(fa / 600, -.3, .3) - this.tiltF) * Math.min(1, 4 * dt); this.tiltS += (E.clamp(sa / 600, -.3, .3) - this.tiltS) * Math.min(1, 4 * dt);
    this.u = this.wx * c + this.wy * sn; this.v = -this.wx * sn + this.wy * c;
    // the spotlight sweeps toward its point
    if (ctl.spot) {
      if (!this.spot) this.spot = [this.x, this.y];
      const dx = ctl.spot[0] - this.spot[0], dy = ctl.spot[1] - this.spot[1], d = Math.hypot(dx, dy), m = h.spotSpeed * dt;
      if (d <= m) this.spot = [ctl.spot[0], ctl.spot[1]]; else this.spot = [this.spot[0] + dx / d * m, this.spot[1] + dy / d * m];
    } else this.spot = null;
    this.rotor += dt * 26; this.rpm = .8 + .2 * Math.min(1, s / h.top); this.felt.hit = 0; this.felt.land = 0;
    this.ctl.throttle = 1; this.ctl.brake = 0; this.ctl.steer = 0; this.ctl.handbrake = false;
  }
  launch() {}
}
