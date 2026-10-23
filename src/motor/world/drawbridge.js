// The drawbridge (PLAN.md 9.1): a bridge's span in two leaves hinged at the banks. Every few game hours it closes its
// gates, waits for the span to clear (no one on it, no vehicle, parked or not), lifts both leaves for the boats, holds
// them up, and lowers them again; the traffic and the crowd keep off it from the moment the gates close.
// While it is not down its cells are blocked (no one walks into the canal), and the leaves' surfaces are a deck whose
// height a vehicle can read (heightAt): half raised, they are the stunt jump. Simulation state: it steps with the
// clock, deterministically. Drawing is render/city-render.js (drawLeaf), over the water the painter leaves under it.
import { TUNE, knob } from '../core/tune.js';

knob('World', 'drawbridgeEvery', 'Drawbridge lifts every', 3, .25, 24, .25, 'Game hours between lifts (PLAN.md 9.1: every 3)');
knob('World', 'drawbridgeRaise', 'Drawbridge lift time', 8, 2, 30, .5, 'Seconds for the leaves to rise (and to come down)');
knob('World', 'drawbridgeUp', 'Drawbridge held up', 20, 3, 120, 1, 'Seconds the leaves stay up');
const MAX = 72 * Math.PI / 180;   // the leaves' angle when fully up

export class Drawbridge {
  /** b: a CityMap drawbridge ({ id, rect, axis, leaves: [{ rect, hinge }] }); city: its CityMap; o.wait: game hours to
   *  the first lift */
  constructor(b, city, o = {}) {
    Object.assign(this, { id: b.id, rect: b.rect, axis: b.axis, city, T: city.T });
    this.leaves = b.leaves.map(l => ({ ...l }));
    /** phase: 'down' | 'raising' | 'up' | 'lowering'; lift 0 (down) .. 1 (up); wait: game hours to the next lift */
    this.phase = 'down'; this.lift = 0; this.held = 0; this.wait = o.wait ?? TUNE.drawbridgeEvery; this.gate = false;   // (gate: closed, the span not clear yet)
    this._block(false);   // (the city's map outlives a scene: a span left up by the last one comes down with this one)
  }
  /** jump straight to fully up (screenshots, tests) */
  raiseNow() { this.phase = 'up'; this.lift = 1; this.held = 0; this.gate = true; this._block(true); }
  /** the leaves' angle (radians, eased) */
  get angle() { const t = this.lift; return MAX * t * t * (3 - 2 * t); }
  /** are the gates closed (a lift due and the span clearing, or anything but down)? */
  get closed() { return this.phase !== 'down' || this.gate; }
  /** step: dt seconds, hours of game time on the clock; busy(bridge) -> true while anyone or any vehicle is on it (the
   *  gates closed, it waits) */
  update(dt, hours, busy = () => false) {
    const raise = Math.max(.1, TUNE.drawbridgeRaise);
    if (this.phase === 'down') { if ((this.wait -= hours) <= 0) { this.gate = true; if (!busy(this)) { this.phase = 'raising'; this._block(true); } } }
    else if (this.phase === 'raising') { if ((this.lift += dt / raise) >= 1) { this.lift = 1; this.phase = 'up'; this.held = 0; } }
    else if (this.phase === 'up') { if ((this.held += dt) >= TUNE.drawbridgeUp) this.phase = 'lowering'; }
    else if ((this.lift -= dt / raise) <= 0) { this.lift = 0; this.phase = 'down'; this.gate = false; this.wait = TUNE.drawbridgeEvery; this._block(false); }
  }
  /** start a lift now (missions, the dev menu, tests) */
  open() { if (this.phase === 'down') this.wait = 0; }
  _block(on) { const [x0, y0, x1, y1] = this.rect, map = this.city.map; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) map.block(x, y, on); }
  /** is the world point on the span? */
  contains(x, y) { const T = this.T, [x0, y0, x1, y1] = this.rect; return x >= x0 * T && x < (x1 + 1) * T && y >= y0 * T && y < (y1 + 1) * T; }
  /** a leaf's geometry now: { x0, x1 (across), a (the hinge's coordinate along the road), dir (+1 or -1: toward the
   *  canal), L (its length), c (its reach along the road: L cos angle), h (its tip's height: L sin angle) } */
  leafGeom(l) {
    const T = this.T, [x0, y0, x1, y1] = l.rect, ns = this.axis === 'y', th = this.angle;
    const L = (ns ? y1 - y0 + 1 : x1 - x0 + 1) * T, start = l.hinge === 'n' || l.hinge === 'w';
    const a = ns ? (start ? y0 * T : (y1 + 1) * T) : (start ? x0 * T : (x1 + 1) * T);
    return { u0: (ns ? x0 : y0) * T, u1: ((ns ? x1 : y1) + 1) * T, a, dir: start ? 1 : -1, L, c: L * Math.cos(th), h: L * Math.sin(th) };
  }
  /** the leaves' surface height under a world point (a deck: 0 when down), or null (off the span, or past a raised
   *  leaf's tip over the open water) */
  heightAt(x, y) {
    if (!this.contains(x, y)) return null;
    const ns = this.axis === 'y', along = ns ? y : x;
    for (const l of this.leaves) {
      const G = this.leafGeom(l), d = (along - G.a) * G.dir;   // how far out from the hinge
      if (d < 0 || d > G.L) continue;
      return d <= G.c ? d * Math.tan(this.angle) : null;
    }
    return null;
  }
}
