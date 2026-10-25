// A helicopter (PLAN.md 8.8): the MPD Eye (AI), and since L4 one the player flies. The AI's flies to a point at an
// altitude: an acceleration toward where it wants to be (a spring with damping, capped at its top speed), a climb or a
// descent to the altitude (never lower than what stands under it plus a margin: it rises over towers), and a yaw toward
// where it goes. It tilts into its acceleration (cosmetic: tiltF nose down, tiltS a bank) and sweeps a spotlight toward
// a point. A player's (ctl.pilot): the stick yaws it, the pedals push it on along its heading and back (let go, the air
// slows it), the shoulders climb and descend, and it holds its height between; let down slow over flat ground or a roof,
// it settles there (landed: nothing moves it, the rotor idles) until the climb lifts it off. With nobody at the
// controls it sinks and settles where it is (a pilot who got out on the ground; one that starts landed stays so).
//   ctl: { to: [x, y], alt, face (a heading, or null: the way it flies), spot: [x, y] | null }   (the AI's)
//   ctl: { pilot: true, throttle, brake, steer, climb (-1..1) }   (a player's)
import { E } from '../../engine.js';
import { VehicleBody } from './body.js';

export const HELI_HANDLING = { length: 60, width: 16, height: 18, mass: 2200, top: 240, accel: 160, climb: 90, yawRate: 1.4, clearance: 36, spotSpeed: 160, hoverZ: 140, ceiling: 300, landSpeed: 40, parked: false };

export class HeliBody extends VehicleBody {
  constructor(spec = {}, x = 0, y = 0, heading = 0) {
    super(Object.assign({}, HELI_HANDLING, spec), x, y, heading);
    this.z = this.h.parked ? 0 : this.h.hoverZ; this.airborne = !this.h.parked; this.landed = !!this.h.parked; this.landT = this.landed ? 99 : 0;   // (parked: on the ground till flown)
    this.wx = 0; this.wy = 0; this.tiltF = 0; this.tiltS = 0; this.spot = null; this.rotor = 0; this.rpm = 0;
  }
  /** what it would stand on at (x, y): a roof, a deck, the street (null over water: it never sets down there) */
  pad(world, x = this.x, y = this.y) {
    const c = Math.cos(this.heading), s = Math.sin(this.heading), hl = this.h.length * .4, hw = this.h.width * .5;
    let g = 0;
    for (const [a, b] of [[0, 0], [hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw]]) {   // (its skids' corners: the highest thing under them)
      const px = x + c * a - s * b, py = y + s * a + c * b;
      if (world.map) g = Math.max(g, world.map.heightAt(px, py) || 0);
      if (world.ground) g = Math.max(g, world.ground(px, py, 1e4) || 0);
    }
    if (g < 1 && world.water && world.water(Math.floor(x / 16), Math.floor(y / 16))) return null;
    return g;
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
    if (ctl.pilot || !ctl.to) return this._flown(dt, ctl, world);
    this.landed = false; this.airborne = true;   // (the AI's flies from wherever it stands)
    const h = this.h, to = ctl.to, k = 1.6, damp = 2.2;
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
  // a player's at the controls, or nobody's (ctl.pilot false: it sinks and settles)
  _flown(dt, ctl, world) {
    const h = this.h, pilot = !!ctl.pilot, climb = pilot ? E.clamp(ctl.climb || 0, -1, 1) : -1;
    this.felt.hit = 0; this.felt.land = 0;
    let g = this.pad(world);
    if (this.landed) {   // on the ground: the climb lifts it off, else it sits (turned by nothing, pushed by nothing)
      this.wx = this.wy = 0; this.vz = 0; this.w = 0; this.u = this.v = 0; this.tiltF *= .8; this.tiltS *= .8;
      if (g !== null) this.z = g;
      this.landT += dt; this.rpm += ((pilot ? .45 : 0) - this.rpm) * Math.min(1, dt * (pilot ? 2 : .5)); this.rotor += dt * 26 * this.rpm;
      if (pilot && climb > .2 && this.rpm > .3) { this.landed = false; this.airborne = true; this.landT = 0; }
      return;
    }
    // the yaw (the stick), the push along the heading (the pedals) less the air's drag, the drift sideways damped harder
    const c = Math.cos(this.heading), sn = Math.sin(this.heading);
    this.w = (pilot ? E.clamp(ctl.steer || 0, -1, 1) : 0) * h.yawRate; this.heading += this.w * dt;
    let u = this.wx * c + this.wy * sn, v = -this.wx * sn + this.wy * c;
    const push = pilot ? ((ctl.throttle || 0) - (ctl.brake || 0) * .6) * h.accel : 0;
    const fa = push - u * (push ? .55 : 1.4), sa = -v * 2.4;
    u += fa * dt; v += sa * dt; u = E.clamp(u, -h.top * .35, h.top);
    this.wx = u * c - v * sn; this.wy = u * sn + v * c;
    { const nx = this.x + this.wx * dt, ny = this.y + this.wy * dt, g2 = this.pad(world, nx, ny);   // (a wall taller than it flies: it stops against it, to be climbed over)
      if (g2 !== null && g2 > this.z + 2) { this.felt.hit = Math.hypot(this.wx, this.wy) * this.h.mass * .3; this.wx = this.wy = 0; u = v = 0; } else { this.x = nx; this.y = ny; } }
    // the height: the shoulders climb and descend, it holds between; never through what stands below, never past its
    // ceiling. Low and slow over somewhere to stand, it sets down
    g = this.pad(world);   // (where it is now)
    const s = Math.hypot(this.wx, this.wy), floor = g === null ? 8 : g;
    this.vz = climb * h.climb * (climb < 0 && this.z - floor < 30 ? .5 : 1); this.z += this.vz * dt;
    if (this.z > h.ceiling) this.z = h.ceiling;
    if (this.z <= floor + .5) {
      this.z = floor;
      if (g !== null && s < h.landSpeed && climb <= 0) { this.landed = true; this.airborne = false; this.landT = 0; this.felt.land = Math.max(0, -this.vz); this.vz = 0; this.wx = this.wy = 0; }
      else this.vz = Math.max(0, this.vz);
    }
    this.tiltF += (E.clamp(fa / 600, -.3, .3) - this.tiltF) * Math.min(1, 4 * dt); this.tiltS += (E.clamp((this.w * u) / 600, -.3, .3) - this.tiltS) * Math.min(1, 4 * dt);
    this.u = u; this.v = v;
    this.rpm += ((pilot ? .8 + .2 * Math.min(1, s / h.top) : .5) - this.rpm) * Math.min(1, dt * 2); this.rotor += dt * 26 * this.rpm;
    this.ctl.throttle = ctl.throttle || 0; this.ctl.brake = ctl.brake || 0; this.ctl.steer = ctl.steer || 0; this.ctl.handbrake = false;
  }
  launch() {}
}
