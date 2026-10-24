// Junction reservations (PLAN.md 8.9: no cars inside each other, no deadlock): who may cross a junction's box now. Each
// region's connectors are compared once: two conflict when their curves pass within a car's width of each other (they
// cross or merge), unless they leave the same lane (one car follows the other through: car-following keeps them apart).
// A driver asks for its connector as it comes within braking distance of the stop line, saying whether it is ready to
// go (its light is green, it has halted at its stop sign, the lane beyond has room for it):
//   - granted when no other holder has a conflicting connector, and no driver ready longer has one (first come, first
//     served among those ready: an all-way stop takes turns, a left turn waiting on a green gets its gap, and nobody
//     waits forever);
//   - a holder keeps it until its car has left the box (release), or until it stops asking for a second (despawned);
//   - a waiter that isn't ready blocks nobody (a red light's queue, a full exit).
// Plain data, deterministic: the same asks in the same order give the same grants.
//   const J = new Junctions(graph);  J.ask(brain, conn, t, ready, prio) -> bool  ·  J.release(brain)  ·  J.holds(brain)
import { sq } from '../core/dmath.js';
const CLEAR = 26;   // two curves nearer than this (two car half-widths) conflict
const STEP = 6;     // units between the samples along a curve

export class Junctions {
  constructor(graph) {
    this.g = graph; this.regions = new Map(); this.conflicts = new Map(); this.t = 0;
    const byRegion = new Map();
    for (const c of graph.conns) { if (!c.region || c.kind === 'change') continue; let a = byRegion.get(c.region); if (!a) byRegion.set(c.region, a = []); a.push(c); }
    for (const [id, list] of byRegion) {
      this.regions.set(id, { id, conns: list.map(c => c.id), holders: new Map(), waiters: new Map() });
      const pts = list.map(c => { const n = Math.max(2, Math.ceil(c.len / STEP)), out = []; for (let k = 0; k <= n; k++) out.push(graph.pointOnConn(c, k / n)); return out; });
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.from === b.from) continue;   // (one lane's cars go through one after another)
        let near = a.to === b.to;   // (they merge into one lane)
        if (!near) outer: for (const p of pts[i]) for (const q of pts[j]) if (Math.abs(p[2] - q[2]) < 10 && sq(p[0] - q[0]) + sq(p[1] - q[1]) < CLEAR * CLEAR) { near = true; break outer; }
        if (near) { this._add(a.id, b.id); this._add(b.id, a.id); }
      }
    }
  }
  _add(a, b) { let s = this.conflicts.get(a); if (!s) this.conflicts.set(a, s = new Set()); s.add(b); }
  /** do two connectors conflict? */
  conflict(a, b) { const s = this.conflicts.get(a); return !!s && s.has(b); }
  /** the region record of a connector (null: no region, nothing to reserve) */
  regionOf(c) { return c && c.region ? this.regions.get(c.region) || null : null; }
  /** brain asks to cross by connector c at time t. ready: it could go now; prio: a siren's (ranks it first).
   *  Returns true when it may go (and then holds the box until it releases) */
  ask(brain, c, t, ready, prio = 0) {
    const R = this.regionOf(c); if (!R) return true;
    this.t = t;
    const h = R.holders.get(brain); if (h && h.conn === c.id) { h.seen = t; return true; }
    if (h) R.holders.delete(brain);
    let w = R.waiters.get(brain);
    if (!ready) { if (w) R.waiters.delete(brain); return false; }
    if (!w || w.conn !== c.id) { w = { conn: c.id, t0: t - (prio ? 1e6 : 0), seen: t, id: brain.id }; R.waiters.set(brain, w); }
    w.seen = t;
    for (const [b, o] of R.holders) {
      if (b === brain) continue;
      if (t - o.seen > 1) { R.holders.delete(b); continue; }   // (it stopped asking: despawned, rerouted)
      if (this.conflict(c.id, o.conn)) return false;
    }
    for (const [b, o] of R.waiters) {
      if (b === brain) continue;
      if (t - o.seen > .25) { R.waiters.delete(b); continue; }
      if ((o.t0 < w.t0 || (o.t0 === w.t0 && o.id < w.id)) && this.conflict(c.id, o.conn)) return false;
    }
    R.waiters.delete(brain); R.holders.set(brain, { conn: c.id, t, seen: t });
    return true;
  }
  /** keep a held box (a holder that is through the stop line asks no more, but holds until it is out) */
  touch(brain, c, t) { const R = this.regionOf(c), h = R && R.holders.get(brain); if (h) h.seen = t; }
  /** does brain hold the box for connector c? */
  holds(brain, c) { const R = this.regionOf(c), h = R && R.holders.get(brain); return !!h && h.conn === c.id; }
  /** give back whatever brain holds or waits for (out of the box; despawned) */
  release(brain, regionId = null) {
    for (const R of regionId ? [this.regions.get(regionId)].filter(Boolean) : this.regions.values()) { R.holders.delete(brain); R.waiters.delete(brain); }
  }
  /** for tests and the dev overlay: holders and waiters per region */
  stats() { let holders = 0, waiters = 0; for (const R of this.regions.values()) { holders += R.holders.size; waiters += R.waiters.size; } let pairs = 0; for (const s of this.conflicts.values()) pairs += s.size; return { regions: this.regions.size, conflicts: pairs / 2, holders, waiters }; }
}
