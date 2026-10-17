// Vehicle physics (PLAN.md 8.8): a 2D rigid body with bicycle-model tyre forces. Not E.Body (a circle with no heading)
// and never map.solid (moving things would re-bake the map's caches every step).
//   Tyres: each axle's slip angle gives a lateral force up to its grip, past the peak falling to 80% (a drift holds,
//   and can be caught), and to half sliding sideways; a friction circle shares the grip between driving or braking and cornering (power oversteer);
//   weight shifts with acceleration; the handbrake drops the rear's grip and locks it: drifts. Brakes are grip-limited
//   (ABS), so a wet road really stops longer. Below walking pace the body turns like a kinematic bicycle (the slip
//   model is singular at rest).
//   Collisions: the car is an oriented box. Against wall cells taller than the curb step (4 u: curbs are climbed),
//   map solids and other cars: separating axes for the push-out, an impulse with spin at the deepest corner
//   (restitution .2, scraping friction), so a glancing hit turns the car and a square hit stops it.
//   Height (M4): world.ground(x, y, z) gives the ground under the car (a deck's smooth top, ramps included): the car
//   follows it up and down, and leaves it where it falls away (a ramp's lip, the Loop's unfinished end) to fly
//   ballistically, landing with a squash (felt.land). Deck slabs are ridden, never hit, unless far above the wheels; in
//   the air the tyres do nothing and a roll (rollW, set by a blast or a hard hit) turns the body over: landing past 90
//   degrees leaves it on its roof (flipped: it slides to a stop and burns, damage.js).
//   A towed car rides on one axle (lifted: 'front' | 'rear': that axle has no grip and its wheels don't steer).
//   Determinism: plain arithmetic at the fixed step; substeps keep a step's travel under 6 u (no tunnelling at 400 u/s).
//   Units: world units (16 per tile) and seconds. Grip and brake are accelerations (u/s²): arcade numbers, tuned on the
//   Proving Ground's pad.
import { E } from '../../engine.js';

/** surface grip multipliers by floor tag (unknown tags: 1); weather multiplies again (wet: .8) */
export const SURFACE_GRIP = { road: 1, asphalt: 1, deck: 1, bridge: 1, walk: .95, curb: .95, crosswalk: .97, alley: .95, plaza: .95, quay: .9, pier: .9, rail: .9,
  lot: .8, yard: .8, dirt: .7, grass: .6, park: .6, sand: .5, water: .3, deep: .3, oil: .25 };
const CURB = 4;   // a wall cell this low (or lower) is climbed, not hit
const PEAK = .12; // the slip angle (radians) where a tyre's grip peaks
const MAX_STEP = 6;   // units a substep may travel
const DECK_STEP = 10;   // a deck slab whose top is this close above the wheels is driven onto, not hit
export const CAR_GRAVITY = 600;   // u/s²: an arcade fall (a storey of 24 in .28 s)

/** the handling of a vehicle class: every number a TUNE-able default; a vehicle def overrides any of them */
export const HANDLING = {
  length: 58, width: 26, height: 22, wheelbase: 36, cg: .5,   // cg: where the centre of mass sits, 0 at the rear axle, 1 at the front
  mass: 1200, top: 260, accel: 150, reverseTop: 80, brake: 640, grip: 460, drift: .32,   // drift: the rear's grip with the handbrake on
  steer: .55, steerRate: 3.2, steerFade: .55, drag: 0, rolling: .06, drive: 'rwd', gears: 5, cgHeight: .25,
};

export class VehicleBody {
  /** spec: HANDLING overrides (a vehicle def's handling); x, y: where; heading: radians (0 east, PI/2 south) */
  constructor(spec = {}, x = 0, y = 0, heading = 0) {
    const h = this.h = Object.assign({}, HANDLING, spec);
    this.x = x; this.y = y; this.z = 0; this.vz = 0; this.heading = heading;
    /** u: forward speed, v: sideways (right), w: yaw rate (+ turns right, clockwise on screen) */
    this.u = 0; this.v = 0; this.w = 0; this.steerAngle = 0;
    this.a = h.wheelbase * h.cg; this.b = h.wheelbase - this.a;   // centre of mass to the front axle, to the rear
    this.I = h.mass * (h.length * h.length + h.width * h.width) / 12;
    // power from the launch and the top speed: drive force per mass is min(accel, P / speed); drag balances it at top
    this.P = h.accel * h.top * .32;
    this.cd = h.drag || Math.max(0, (this.P / h.top - h.rolling * h.top) / (h.top * h.top));
    this.ctl = { throttle: 0, brake: 0, steer: 0, handbrake: false };
    /** what the last step felt: lateral and forward acceleration, rear slip (drift) angle, contact this step */
    this.felt = { lat: 0, lon: 0, slip: 0, hit: 0, hitX: 0, hitY: 0, wheelspin: 0 };
    this.gear = 1; this.rpm = 0; this.airborne = false;
    /** lifted: the axle off the ground while towed ('front' | 'rear' | null); flipped: on its roof; rollA, rollW: the
     *  body's roll (radians) and its rate in the air */
    this.lifted = null; this.flipped = false; this.rollA = 0; this.rollW = 0; this.felt.land = 0;
  }
  /** the half length and width, and the corners [x, y] in the world (front-left, front-right, rear-right, rear-left) */
  get hl() { return this.h.length / 2; }
  get hw() { return this.h.width / 2; }
  corners() {
    const c = Math.cos(this.heading), s = Math.sin(this.heading), L = this.hl, W = this.hw;
    return [[L, -W], [L, W], [-L, W], [-L, -W]].map(([f, r]) => [this.x + f * c - r * s, this.y + f * s + r * c]);
  }
  /** the world velocity [vx, vy] */
  get vx() { return this.u * Math.cos(this.heading) - this.v * Math.sin(this.heading); }
  get vy() { return this.u * Math.sin(this.heading) + this.v * Math.cos(this.heading); }
  /** speed in u/s (always >= 0) */
  get speed() { return Math.hypot(this.u, this.v); }
  /** set the world velocity (keeps the yaw rate) */
  setVelocity(vx, vy) { const c = Math.cos(this.heading), s = Math.sin(this.heading); this.u = vx * c + vy * s; this.v = -vx * s + vy * c; }

  /** one simulation step against the map. ctl: { throttle 0..1, brake 0..1, steer -1..1 (right +), handbrake, boost
   *  (nitro: a factor on power) }; world: { map, wet, surface(x, y) -> grip multiplier, ground(x, y, z) -> the ground's
   *  height }. Cars meet cars in collidePairs, once per step */
  step(dt, ctl, world = {}) {
    Object.assign(this.ctl, ctl);
    const n = Math.max(1, Math.ceil(this.speed * dt / MAX_STEP));
    this.felt.hit = 0; this.felt.land = 0;
    for (let i = 0; i < n; i++) this._sub(dt / n, world);
    this._gearbox();
  }
  _sub(dt, world) {
    const h = this.h, C = this.ctl, m = h.mass, g = 400, contact = !this.airborne && !this.flipped;
    // steering: toward the stick, slower to turn the faster it goes (an arcade car stays drivable at speed)
    const want = E.clamp(C.steer, -1, 1) * h.steer * (1 - h.steerFade * Math.min(1, Math.abs(this.u) / h.top));
    this.steerAngle += E.clamp(want - this.steerAngle, -h.steerRate * dt, h.steerRate * dt);
    const d = this.lifted === 'front' ? 0 : this.steerAngle, cd = Math.cos(d), sd = Math.sin(d), u = this.u, v = this.v, w = this.w;
    const mu = this._grip(world), wet = world.wet ? .8 : 1, grip = h.grip * mu * wet;
    // the throttle drives forward, or backward once stopped with the brake held a moment (and the brake pedal brakes)
    this.held = Math.abs(u) < 1 && C.brake > 0 && !(C.throttle > 0) ? (this.held || 0) + dt : 0;
    const fwd = u > .5 || (u > -.5 && C.throttle >= C.brake), rev = !fwd && C.brake > 0 && u < 2 && (u < -.5 || this.held > .2);
    let drive = 0, braking = 0;
    if (contact) {
      if (fwd && C.throttle > 0) drive = C.throttle * Math.min(h.accel * (C.boost || 1), this.P * (C.boost || 1) / Math.max(1, Math.abs(u)));
      if (rev) drive = -C.brake * (Math.abs(u) < h.reverseTop ? h.accel * .6 : 0);
      if (fwd && C.brake > 0 && u > .5) braking = C.brake * h.brake;
      if (!fwd && C.throttle > 0 && u < -.5) braking = C.throttle * h.brake;   // the throttle brakes a reversing car
    }
    // the load on each axle, shifted by the last step's forward acceleration (braking loads the front)
    const shift = E.clamp(this.felt.lon * h.cgHeight / g, -.3, .3), Nf = E.clamp(this.b / h.wheelbase - shift, .2, .8), Nr = 1 - Nf;
    let Ff = contact && this.lifted !== 'front' ? m * grip * Nf : 0, Fr = contact && this.lifted !== 'rear' ? m * grip * Nr : 0;   // each axle's grip (force)
    // longitudinal forces at each axle: drive by the drive type, brakes 60/40, the handbrake locks the rear
    const dir = Math.sign(u) || 1, hand = C.handbrake && Math.abs(u) > 2;
    let FxF = 0, FxR = 0;
    const share = h.drive === 'fwd' ? 1 : h.drive === 'awd' ? .5 : 0;
    FxF += drive * m * share; FxR += drive * m * (1 - share);
    FxF -= dir * braking * m * .6; FxR -= dir * braking * m * .4;
    if (hand) { Fr *= h.drift; FxR -= dir * Fr * .7; }
    // the friction circle: driving or braking spends grip that cornering then lacks (wheelspin when it asks too much)
    this.felt.wheelspin = Fr > 0 ? Math.max(0, Math.abs(FxR) - Fr) / Fr : 0;
    FxF = E.clamp(FxF, -Ff, Ff); FxR = E.clamp(FxR, -Fr, Fr);
    const latF = Math.sqrt(Math.max(0, Ff * Ff - FxF * FxF)), latR = Math.sqrt(Math.max(0, Fr * Fr - FxR * FxR));
    // slip angles: the front axle's velocity in its wheel's frame; the rear's in the body's
    const vfl = u * cd + (v + this.a * w) * sd, vfs = -u * sd + (v + this.a * w) * cd, vr = v - this.b * w;
    const af = Math.atan2(vfs, Math.abs(vfl) + 1), ar = Math.atan2(vr, Math.abs(u) + 1);
    const Fyf = -latF * tyre(af / PEAK), Fyr = -latR * tyre(ar / PEAK);
    // body forces: the front's (turned with the wheel), the rear's, drag and rolling resistance (in the air: drag only)
    const Fx = FxF * cd - Fyf * sd + FxR - m * (this.cd * u * Math.abs(u) + (contact ? h.rolling * u : 0));
    const Fy = FxF * sd + Fyf * cd + Fyr;
    const Mz = this.a * (FxF * sd + Fyf * cd) - this.b * Fyr;
    let du = (Fx / m + v * w) * dt, dv = (Fy / m - u * w) * dt, dw = Mz / this.I * dt;
    // brakes never push a car backward: a braking step that would reverse the car stops it instead
    if ((braking > 0 || hand) && Math.sign(u + du) !== Math.sign(u) && Math.abs(u) < 40) du = -u;
    this.u += du; this.v += dv; this.w += dw;
    if (this.flipped) {   // on its roof: it scrapes to a stop
      const s0 = Math.hypot(this.u, this.v), k = s0 > 0 ? Math.max(0, s0 - 380 * dt) / s0 : 0; this.u *= k; this.v *= k; this.w *= Math.max(0, 1 - 4 * dt);
    } else if (contact) {
      // below walking pace (all of it: a car sliding sideways off a wall is not slow), turn like a kinematic bicycle and
      // let the slip die (the slip model is singular at rest)
      const s = Math.hypot(this.u, this.v), kin = E.clamp(1 - (s - 6) / 24, 0, 1);
      if (kin > 0) {
        const wk = this.lifted === 'front' ? this.w : this.u * Math.tan(d) / this.h.wheelbase;
        this.w += (wk - this.w) * kin; this.v += (wk * this.b - this.v) * kin * .5;
        if (s < .5 && !drive && !(C.throttle > 0)) { this.u = 0; this.v *= .5; this.w *= .5; if (Math.abs(this.v) < .05) this.v = 0; if (Math.abs(this.w) < 1e-3) this.w = 0; }
      }
    }
    this.felt.lat = Fy / m; this.felt.lon = Fx / m; this.felt.slip = contact ? Math.atan2(vr, Math.abs(this.u) + 1) : 0;
    // move, then follow (or leave) the ground, then resolve contacts
    const c = Math.cos(this.heading), sn = Math.sin(this.heading), px = this.x, py = this.y;
    this.x += (this.u * c - this.v * sn) * dt; this.y += (this.u * sn + this.v * c) * dt; this.heading += this.w * dt;
    if (!this._height(dt, world)) {   // the ground ahead rose like a wall (a raised bridge leaf): stopped short
      this.x = px; this.y = py; const hit = Math.abs(this.u) * this.h.mass * 1.2; this.u *= -.2; this.v *= .5; this.w *= .5;
      this.felt.hit += hit; this.felt.hitX = px + c * this.hl; this.felt.hitY = py + sn * this.hl;
    }
    if (world.map) this._collideMap(world.map, world);
  }
  /** the ground under the car: follow it (a slope's climb gives the body its vertical speed), or fly off it. Returns
   *  false when the ground ahead is a wall (more than a ramp's climb above the wheels) */
  _height(dt, world) {
    const gz = world.ground ? world.ground(this.x, this.y, this.z) : 0;
    if (gz > this.z + 8) return false;
    if (this.airborne) {
      this.vz -= CAR_GRAVITY * dt; this.z += this.vz * dt; this.rollA += this.rollW * dt;
      if (this.z <= gz) {
        this.felt.land = Math.max(this.felt.land, -this.vz); this.z = gz; this.vz = 0; this.airborne = false;
        const r = Math.atan2(Math.sin(this.rollA), Math.cos(this.rollA));
        if (Math.abs(r) > Math.PI / 2) { this.flipped = true; this.rollA = Math.PI; } else this.rollA = 0;
        this.rollW = 0;
      }
      return true;
    }
    if (gz < this.z - 3) { this.airborne = true; return true; }   // (the ground fell away: it flies on with the slope's speed; a blast sets airborne itself)
    this.vz = (gz - this.z) / dt; this.z = gz;
    if (this.vz < 0) this.vz = Math.max(this.vz, -60);   // (down a ramp it keeps to the slope)
    return true;
  }
  _grip(world) {
    if (world.surface) return world.surface(this.x, this.y, this.z);
    const M = world.map; if (!M || !M.floorAt) return 1;
    const tag = M.floorAt(this.x, this.y); return tag === null || tag === undefined ? 1 : (SURFACE_GRIP[tag] ?? 1);
  }
  /** an automatic box: the gear and the engine's turn of speed (0..1, the audio's RPM) */
  _gearbox() {
    const h = this.h, f = E.clamp(Math.abs(this.u) / h.top, 0, 1), n = h.gears;
    const g = Math.min(n, 1 + Math.floor(f * n * .999)); this.gear = this.u < -1 ? -1 : g;
    this.rpm = E.clamp(.25 + .75 * ((f * n) - (g - 1)), .2, 1) * (this.ctl.throttle > 0 || Math.abs(this.u) > 1 ? 1 : .3);
  }
  /** push out of wall cells taller than a curb, and out of map solids (street furniture that world.breaks(solid, body)
   *  says gives way is driven through: the Fleet knocks it over) */
  _collideMap(map, world = {}) {
    const T = map.T, cs = this.corners(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of cs) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const tall = (cx, cy) => this._blocked(map, cx, cy);
    for (let it = 0; it < 2; it++) for (let cy = Math.floor(y0 / T); cy <= Math.floor(y1 / T); cy++) for (let cx = Math.floor(x0 / T); cx <= Math.floor(x1 / T); cx++) {
      if (!tall(cx, cy)) continue;
      // the faces this cell shows (a face against another tall cell is inside a wall: never pushed through)
      const open = { '1,0': !tall(cx + 1, cy), '-1,0': !tall(cx - 1, cy), '0,1': !tall(cx, cy + 1), '0,-1': !tall(cx, cy - 1) };
      const hit = obbVsBox(this, (cx + .5) * T, (cy + .5) * T, T / 2, T / 2, 1, 0, (nx, ny) => open[Math.round(nx) + ',' + Math.round(ny)] !== false);
      if (hit) this._resolve(hit, null);
    }
    if (map.solidsNear) for (const s of map.solidsNear(this.x, this.y, this.hl + 8)) {
      if (s.top <= this.z + (s.deck ? DECK_STEP : CURB) || s.z >= this.z + this.h.height) continue;   // (on top of it, or wholly above)
      const hit = obbVsBox(this, s.x, s.y, s.hx, s.hy, s.c, s.s, null);
      if (hit && !(s.breakable && world.breaks && world.breaks(s, this))) this._resolve(hit, null);
    }
  }
  /** throw the body into the air (a blast under it, a hard hit): vz up (u/s), rollW (radians a second about its length) */
  launch(vz, rollW = 0) { this.airborne = true; this.vz = Math.max(this.vz, vz); this.rollW += rollW; }
  /** is a cell a wall to this body (a land vehicle: a wall taller than a curb above its wheels)? Boats override it */
  _blocked(map, cx, cy) { const id = map.cell(cx, cy); return id < 0 || (id > 0 && map.types[id].h > this.z + CURB); }
  /** push out by the hit's depth along its normal, then an impulse at its contact point (restitution .2, friction .3) */
  _resolve(hit, other) {
    const [nx, ny] = hit.n;
    this.x += nx * hit.depth; this.y += ny * hit.depth;
    impulse(this, null, hit.p, nx, ny, .2, .3);
  }
}

/** the tyre's grip curve: linear to the peak, easing to 80% by three peaks (a drift holds), then to half by eight (a
 *  car sliding sideways after a crash slides on) */
function tyre(x) { const a = Math.abs(x); return a <= 1 ? x : Math.sign(x) * (a <= 3.5 ? 1 - .2 * (a - 1) / 2.5 : Math.max(.5, .8 - .3 * (a - 3.5) / 4.5)); }

/** separating axes between car A (an oriented box) and a box at (bx, by), half sizes (hx, hy), turned (c, s): null, or
 *  { n: the push-out direction for A, depth, p: the contact point }. faceOk(nx, ny) may veto the box's own faces as
 *  push-out normals (a face inside a wall) */
function obbVsBox(A, bx, by, hx, hy, c, s, faceOk) {
  const ca = Math.cos(A.heading), sa = Math.sin(A.heading);
  const axes = [[c, s, 'b'], [-s, c, 'b'], [ca, sa, 'a'], [-sa, ca, 'a']];
  const dx = bx - A.x, dy = by - A.y; let best = null;
  for (const [ax, ay, who] of axes) {
    const rA = A.hl * Math.abs(ca * ax + sa * ay) + A.hw * Math.abs(-sa * ax + ca * ay);
    const rB = hx * Math.abs(c * ax + s * ay) + hy * Math.abs(-s * ax + c * ay);
    const dist = dx * ax + dy * ay, over = rA + rB - Math.abs(dist);
    if (over <= 0) return null;
    const sg = dist > 0 ? -1 : 1, nx = ax * sg, ny = ay * sg;   // from the box toward the car
    if (who === 'b' && faceOk && !faceOk(nx, ny)) continue;
    if (!best || over < best.depth) best = { n: [nx, ny], depth: over, who };
  }
  if (!best) return null;
  // the contact point: the car's corner deepest into the box (or the box's corner deepest into the car)
  const [nx, ny] = best.n;
  if (best.who === 'b') { let p = null, m = 1e9; for (const q of A.corners()) { const d = q[0] * nx + q[1] * ny; if (d < m) { m = d; p = q; } } best.p = p; }
  else { let p = null, m = -1e9; for (const [fx, fy] of [[hx, hy], [-hx, hy], [-hx, -hy], [hx, -hy]]) { const q = [bx + fx * c - fy * s, by + fx * s + fy * c], d = q[0] * nx + q[1] * ny; if (d > m) { m = d; p = q; } } best.p = p; }
  return best;
}

/** an impulse between body A and body B (null: the world) at point p along normal n (pointing toward A) */
function impulse(A, B, p, nx, ny, e, mu) {
  const ra = [p[0] - A.x, p[1] - A.y], rb = B ? [p[0] - B.x, p[1] - B.y] : [0, 0];
  const va = [A.vx - A.w * ra[1], A.vy + A.w * ra[0]], vb = B ? [B.vx - B.w * rb[1], B.vy + B.w * rb[0]] : [0, 0];
  const rvx = va[0] - vb[0], rvy = va[1] - vb[1], vn = rvx * nx + rvy * ny;
  if (vn >= 0) return 0;   // separating already
  const imA = 1 / A.h.mass, imB = B ? 1 / B.h.mass : 0, iIA = 1 / A.I, iIB = B ? 1 / B.I : 0;
  const ran = ra[0] * ny - ra[1] * nx, rbn = rb[0] * ny - rb[1] * nx;
  const j = -(1 + e) * vn / (imA + imB + ran * ran * iIA + rbn * rbn * iIB);
  // friction along the contact, capped by the normal impulse
  const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty, rat = ra[0] * ty - ra[1] * tx, rbt = rb[0] * ty - rb[1] * tx;
  const jt = E.clamp(-vt / (imA + imB + rat * rat * iIA + rbt * rbt * iIB), -mu * j, mu * j);
  const Jx = j * nx + jt * tx, Jy = j * ny + jt * ty;
  applyImpulse(A, Jx, Jy, ra); if (B) applyImpulse(B, -Jx, -Jy, rb);
  const mag = Math.hypot(Jx, Jy); A.felt.hit += mag; A.felt.hitX = p[0]; A.felt.hitY = p[1];
  if (B) { B.felt.hit += mag; B.felt.hitX = p[0]; B.felt.hitY = p[1]; }
  return mag;
}
function applyImpulse(A, Jx, Jy, r) {
  const vx = A.vx + Jx / A.h.mass, vy = A.vy + Jy / A.h.mass;
  A.setVelocity(vx, vy); A.w += (r[0] * Jy - r[1] * Jx) / A.I;
}

/** every pair of cars that touch, once: push apart by inverse mass, then a shared impulse (call after every car's step) */
export function collidePairs(bodies) {
  let n = 0; for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) if (collideCars(bodies[i], bodies[j])) n++;
  return n;
}
/** car against car: push both apart by their inverse masses, then a shared impulse */
export function collideCars(A, B) {
  if (Math.abs(A.x - B.x) > A.hl + B.hl + 4 || Math.abs(A.y - B.y) > A.hl + B.hl + 4) return 0;
  if (A.z >= B.z + B.h.height - 1 || B.z >= A.z + A.h.height - 1) return 0;
  const hit = obbVsBox(A, B.x, B.y, B.hl, B.hw, Math.cos(B.heading), Math.sin(B.heading), null); if (!hit) return 0;
  const [nx, ny] = hit.n, imA = 1 / A.h.mass, imB = 1 / B.h.mass, k = hit.depth / (imA + imB);
  A.x += nx * k * imA; A.y += ny * k * imA; B.x -= nx * k * imB; B.y -= ny * k * imB;
  return impulse(A, B, hit.p, nx, ny, .2, .3);
}
