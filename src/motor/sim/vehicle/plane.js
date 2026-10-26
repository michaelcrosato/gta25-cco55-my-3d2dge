// A plane (EXPANSION.md X2): the Duster, a crop duster off Ironside's airstrip, and the Gull, a seaplane. On its wheels
// (or floats) it rolls as a slow car does: the throttle pulls it along, the brake slows it, the stick steers it at a
// taxi, and past its rotation speed the climb lifts it off. In the air the stick banks it and the bank turns it (the
// tighter the slower), the throttle sets the speed it flies at, a climb costs speed and a dive gives it, and the
// shoulders climb and descend (it holds its height between, as the helicopter does). Under its stall speed its wings let
// go: its nose drops and it falls until it has the speed again. It sets down level, slow and gently on what it can
// land on (a landplane on the ground, a seaplane on the water); anything else, a wall it flies into among them, is a
// crash. With nobody at the controls it glides down and its brakes hold it on the ground.
//   ctl: { pilot: true, throttle, brake, steer, climb (-1..1) }   (a player's, or the bot's through the same Intent)
import { E } from '../../engine.js';
import { VehicleBody } from './body.js';

export const PLANE_HANDLING = { length: 44, width: 56, height: 16, mass: 900, top: 230, accel: 70, brake: 120, stall: 70, vr: 85, climb: 70, bankMax: .7, rollRate: 1.6, turnG: 360,
  taxiTurn: 1.4, taxiTop: 60, landSpeed: 125, landSink: 75, ceiling: 320, cruiseZ: 200, water: false };

const EDGE = 240;   // (how near the world's edge a plane is turned back)

export class PlaneBody extends VehicleBody {
  constructor(spec = {}, x = 0, y = 0, heading = 0) {
    super(Object.assign({}, PLANE_HANDLING, spec), x, y, heading);
    this.landed = true; this.airborne = false; this.bank = 0; this.pitch = 0; this.stalled = false; this.prop = 0; this.rpm = 0; this.tiltF = 0; this.tiltS = 0;
  }
  get vx() { return this.u * Math.cos(this.heading); } get vy() { return this.u * Math.sin(this.heading); }
  get speed() { return Math.abs(this.u); }
  setVelocity(vx, vy) { this.u = vx * Math.cos(this.heading) + vy * Math.sin(this.heading); this.v = 0; }
  /** what it would stand on at (x, y): a roof, a deck, the street; over water, 0 for a seaplane and null for the rest */
  ground(world, x = this.x, y = this.y) {
    let g = 0;
    if (world.map) g = Math.max(g, world.map.heightAt(x, y) || 0);
    if (world.ground) g = Math.max(g, world.ground(x, y, this.z + 8) || 0);
    if (g < 1 && world.water && world.water(Math.floor(x / 16), Math.floor(y / 16))) return this.h.water ? 0 : null;
    return g;
  }
  /** is it on the water (a seaplane afloat, or a landplane gone in)? */
  wet(world) { return !!world.water && this.z < 2 && world.water(Math.floor(this.x / 16), Math.floor(this.y / 16)); }
  step(dt, ctl = {}, world = {}) {
    const pilot = !!ctl.pilot; this.felt.hit = 0; this.felt.land = 0;
    if (this.falling) {   // wrecked in the air: it drops, and lies where it lands
      const g = this.ground(world) ?? 0;
      if (this.z > g) { this.vz -= 500 * dt; this.z = Math.max(g, this.z + this.vz * dt); this.x += this.vx * dt; this.y += this.vy * dt; this.u *= .98; if (this.z <= g) { this.felt.land = -this.vz; this.landed = true; this.airborne = false; } }
      else { this.vz = 0; this.u = 0; }
      return;
    }
    const thr = pilot ? E.clamp(ctl.throttle || 0, 0, 1) : 0, brk = pilot ? E.clamp(ctl.brake || 0, 0, 1) : 1, steer = pilot ? E.clamp(ctl.steer || 0, -1, 1) : 0, climb = pilot ? E.clamp(ctl.climb || 0, -1, 1) : 0;
    this.rpm += ((pilot ? .3 + .7 * thr : 0) - this.rpm) * Math.min(1, 2 * dt); this.prop += dt * 40 * this.rpm;
    if (this.landed) this._roll(dt, thr, brk, steer, climb, world); else this._fly(dt, thr, brk, steer, climb, world);
    this.ctl.throttle = thr; this.ctl.brake = brk; this.ctl.steer = steer; this.ctl.handbrake = false;
  }
  // on its gear: pulled by the throttle, held by the brake and the ground's drag, its nose steered at a taxi (less as it
  // gathers speed); never backwards (a plane is pushed back, not driven). Past vr the climb lifts it off
  _roll(dt, thr, brk, steer, climb, world) {
    const h = this.h, g = this.ground(world), stuck = g !== null && h.water && !this.wet(world);   // (a seaplane's floats on dry land: it barely slides)
    let u = this.u + thr * h.accel * (stuck ? .1 : 1) * dt;
    const drag = (brk * h.brake + 14 + .0006 * u * u) * (stuck ? 4 : 1) * dt; u = u > 0 ? Math.max(0, u - drag) : 0;
    this.w = steer * h.taxiTurn * E.clamp(u / 30, 0, 1) * (u > h.taxiTop ? h.taxiTop / u : 1); this.heading += this.w * dt;
    this.u = u; this.v = 0; this.x += this.vx * dt; this.y += this.vy * dt; this.z = g ?? 0; this.vz = 0;
    if (world.map) this._collideMap(world.map, world);
    this.bank *= .8; this.tiltS = this.bank; this.tiltF = 0; this.pitch = 0;
    if (this.u >= h.vr && climb > 0 && !stuck) { this.landed = false; this.airborne = true; this.vz = h.climb * .5; }
  }
  // in the air: banked by the stick, turned by the bank, the speed the throttle's less what a climb costs, the climb the
  // shoulders' (held level between) while the wings bite; a stall drops the nose. What stands below ends the flight
  _fly(dt, thr, brk, steer, climb, world) {
    const h = this.h, rr = h.rollRate * dt;
    // (the world's edge: within EDGE of it and flying out, it banks round hard toward the middle, whatever the stick
    // says; it never leaves the map)
    const M = world.map, Wd = M ? M.w * M.T : 1e9, Hd = M ? M.h * M.T : 1e9, out = M && ((this.x < EDGE && this.vx < 0) || (this.x > Wd - EDGE && this.vx > 0) || (this.y < EDGE && this.vy < 0) || (this.y > Hd - EDGE && this.vy > 0));
    if (out) { const a = Math.atan2(Hd / 2 - this.y, Wd / 2 - this.x) - this.heading; steer = Math.sign(Math.atan2(Math.sin(a), Math.cos(a))) || 1; }
    this.bank += E.clamp(steer * h.bankMax - this.bank, -rr, rr);
    this.w = h.turnG * Math.tan(this.bank) / Math.max(this.u, h.stall); this.heading += this.w * dt;
    if (this.stalled ? this.u > h.stall * 1.15 : this.u < h.stall) this.stalled = !this.stalled;   // (it has the speed back a little past its stall)
    this.u += ((h.top * (.3 + .7 * thr) * (1 - .45 * brk) - this.u) * .6 - (this.stalled ? 0 : this.vz * .35)) * dt;   // (a climb costs speed and a dive gives it, while the wings bite)
    if (this.stalled) { this.vz += (-220 - this.vz) * 2 * dt; this.u += 25 * dt; this.bank *= Math.max(0, 1 - dt); }
    else { const lift = E.clamp((this.u - h.stall) / (h.stall * .5), 0, 1); this.vz += (climb * h.climb * lift - this.vz) * 4 * dt; }
    let nx = this.x + this.vx * dt, ny = this.y + this.vy * dt, g = this.ground(world, nx, ny); const nz = Math.min(h.ceiling, this.z + this.vz * dt);
    if (g !== null && g > nz + 2 && g > this.z) {   // (a wall, a roof's side, a lamp: flown into, it stops there and drops; it had hung stalled against a lamp for good)
      this.felt.hit = this.u * h.mass * .6; this.felt.hitX = nx; this.felt.hitY = ny; this.u *= .2; this.vz = Math.min(this.vz, 0);
      nx = this.x; ny = this.y; g = this.ground(world);
    }
    this.x = M ? E.clamp(nx, 8, Wd - 8) : nx; this.y = M ? E.clamp(ny, 8, Hd - 8) : ny; this.z = nz; this.v = 0;
    this.pitch = Math.atan2(this.vz, Math.max(1, this.u)); this.tiltF = -this.pitch; this.tiltS = this.bank;
    const floor = g ?? (world.water ? 0 : null);
    if (floor !== null && this.z <= floor) {   // (down: set down, or a crash)
      const can = g !== null, gentle = -this.vz <= h.landSink && this.u <= h.landSpeed && Math.abs(this.bank) < .35;
      this.z = floor; this.landed = true; this.airborne = false; this.felt.land = -this.vz;
      if (!can || !gentle) { this.felt.hit = (this.u * .5 + Math.max(0, -this.vz - h.landSink) * 3) * h.mass * .5; this.felt.hitX = this.x; this.felt.hitY = this.y; this.felt.land = Math.max(this.felt.land, 400); this.u *= .3; }
      this.vz = 0; this.bank = 0; this.pitch = 0; this.tiltF = 0; this.tiltS = 0;
    }
  }
  launch() {}
}
