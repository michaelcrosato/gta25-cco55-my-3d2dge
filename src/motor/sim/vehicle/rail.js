// The L (PLAN.md 8.8): AI only. A line is a closed loop of track (a polyline with rounded corners, measured by its
// length), its stations stops along it; a train is a few cars running along the loop: it speeds up to its top, brakes
// to stop with its middle at the next platform, waits there (doors open), and goes on. Trains can't be boarded in the
// slice; what stands on the track in their way dies (fleet.js). Plain arithmetic: deterministic and headless.
//   const line = new RailLine({ points, z, stations: [{ name, at: [x, y] }] });  const t = new Train(line, { s, cars })
//   t.update(dt) · t.cars: [{ x, y, z, heading, hl, hw, height }] · t.state 'run' | 'stop' · t.station
import { TUNE, knob } from '../../core/tune.js';

knob('Vehicles', 'trainTop', 'L top speed', 210, 60, 400, 5, 'The L\'s cruising speed between stations (u/s)');
knob('Vehicles', 'trainDwell', 'L dwell', 5, 1, 20, .5, 'Seconds an L train waits at a platform');

export class RailLine {
  /** points: the loop's corners [[x, y], ...] in world units (closed: the last joins the first); radius: the corners'
   *  rounding; z: the track's height; stations: [{ name, at: [x, y] }] (each stop snaps to the nearest point of track) */
  constructor({ points, z = 0, radius = 24, stations = [] }) {
    this.z = z; this.pts = roundLoop(points, radius);
    this.cum = [0]; for (let i = 1; i <= this.pts.length; i++) { const a = this.pts[i - 1], b = this.pts[i % this.pts.length]; this.cum.push(this.cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    this.length = this.cum[this.pts.length];
    this.stations = stations.map(s => ({ name: s.name, s: this.nearest(s.at[0], s.at[1]) })).sort((a, b) => a.s - b.s);
  }
  /** the point and heading at distance s along the loop (wrapping) */
  at(s) {
    const L = this.length; s = ((s % L) + L) % L;
    let lo = 0, hi = this.pts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (this.cum[mid] <= s) lo = mid; else hi = mid - 1; }
    const a = this.pts[lo], b = this.pts[(lo + 1) % this.pts.length], seg = this.cum[lo + 1] - this.cum[lo] || 1, f = (s - this.cum[lo]) / seg;
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, heading: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  /** the distance along the loop nearest to (x, y) */
  nearest(x, y) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < this.pts.length; i++) {
      const a = this.pts[i], b = this.pts[(i + 1) % this.pts.length], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
      const f = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)), px = a[0] + dx * f, py = a[1] + dy * f, d = Math.hypot(px - x, py - y);
      if (d < bd) { bd = d; best = this.cum[i] + Math.sqrt(l2) * f; }
    }
    return best;
  }
  /** the distance from s forward to the next stop (s itself excluded within eps) */
  toNextStop(s, eps = 2) {
    const L = this.length; let best = Infinity, which = null;
    for (const st of this.stations) { let d = st.s - s; d = ((d % L) + L) % L; if (d < eps) d += L; if (d < best) { best = d; which = st; } }
    return { d: best, station: which };
  }
}
/** a closed polyline with each corner replaced by an arc of radius r (sampled every 8 units) */
function roundLoop(points, r) {
  const n = points.length, out = [];
  for (let i = 0; i < n; i++) {
    const p = points[(i - 1 + n) % n], c = points[i], q = points[(i + 1) % n];
    const ax = p[0] - c[0], ay = p[1] - c[1], bx = q[0] - c[0], by = q[1] - c[1], la = Math.hypot(ax, ay) || 1, lb = Math.hypot(bx, by) || 1;
    const k = Math.min(r, la / 2, lb / 2), s = [c[0] + ax / la * k, c[1] + ay / la * k], e = [c[0] + bx / lb * k, c[1] + by / lb * k];
    const steps = Math.max(2, Math.ceil(k * 1.6 / 8));
    for (let j = 0; j <= steps; j++) { const t = j / steps, u = 1 - t; out.push([u * u * s[0] + 2 * u * t * c[0] + t * t * e[0], u * u * s[1] + 2 * u * t * c[1] + t * t * e[1]]); }   // (a quadratic Bézier: close to the arc)
  }
  return out;
}

export class Train {
  /** line: a RailLine; o: { s (where its lead car starts), cars (how many), carLength, gap, width, height, accel, brake,
   *  top, dwell (0: TUNE's), id } */
  constructor(line, o = {}) {
    this.line = line; this.id = o.id || 'train'; this.s = o.s || 0; this.v = 0; this.state = 'run'; this.wait = 0; this.station = null;
    this.carLength = o.carLength || 84; this.gap = o.gap || 6; this.n = o.cars || 2; this.width = o.width || 20; this.height = o.height || 30;
    this.accel = o.accel || 70; this.brake = o.brake || 90; this.doors = 0; this.top = o.top || 0; this.dwell = o.dwell || 0;   // (0: the TUNE knobs')
    this.cars = Array.from({ length: this.n }, (_, i) => ({ id: this.id + ':' + i, x: 0, y: 0, z: line.z, heading: 0, hl: this.carLength / 2, hw: this.width / 2, height: this.height, train: this, index: i }));
    this._place();
  }
  /** the train's length, nose to tail */
  get span() { return this.n * this.carLength + (this.n - 1) * this.gap; }
  /** one step: run, brake for the platform ahead (its middle on the station's point), wait, go on */
  update(dt) {
    const top = this.top || TUNE.trainTop;
    if (this.state === 'stop') {
      this.wait -= dt; this.doors = Math.min(1, this.doors + dt * 2);
      if (this.wait <= 0) { this.doors = Math.max(0, this.doors - dt * 4); if (this.doors <= 0) this.state = 'run'; }
      this.v = 0; this._place(); return;
    }
    // the stop: where the train's middle meets the station's point
    const mid = this.s - this.span / 2, next = this.line.toNextStop(mid), d = next.d, stop = this.v * this.v / (2 * this.brake);
    if (d <= stop + 1 && this.v > 0) this.v = Math.max(4, this.v - this.brake * dt);
    else this.v = Math.min(top, this.v + this.accel * dt);
    let step = this.v * dt;
    if (step >= d - .5) { step = Math.max(0, d); this.state = 'stop'; this.wait = this.dwell || TUNE.trainDwell; this.station = next.station ? next.station.name : null; this.v = 0; }
    this.s += step; this._place();
  }
  _place() {
    for (const c of this.cars) {
      const f = this.s - c.index * (this.carLength + this.gap), a = this.line.at(f), b = this.line.at(f - this.carLength);
      c.x = (a.x + b.x) / 2; c.y = (a.y + b.y) / 2; c.z = this.line.z; c.heading = Math.atan2(a.y - b.y, a.x - b.x);
    }
  }
  hash() { return Math.round(this.s * 8) * 31 + Math.round(this.v * 8); }
}
