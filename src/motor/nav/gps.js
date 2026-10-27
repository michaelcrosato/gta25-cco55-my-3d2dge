// The GPS (PLAN.md 8.7): the quickest way through the lane graph, for the player's route and for AI drivers. A* over
// the lane pieces: the cost of a step is the time to cross its connector (turns at TURN_SPEED, plus a penalty for each
// kind of move) and then the next lane at its speed; the heuristic is the straight distance left at the network's top
// speed, which never overestimates, so A* finds what Dijkstra finds (the unit suite checks 1,000 pairs).
//   const gps = new GPS(graph);  gps.route(fromLane, toLane, { s, avoid }) -> { lanes, conns, cost } | null
//   gps.routeTo(x, y, heading, tx, ty) (nearest lanes at both ends; a goal behind on the same lane: round the block to
//   it); gps.dijkstra(fromLane, toLane) (the reference);
//   gps.costsTo(lane) (every lane's cost to it: where to start a drive from); gps.costsFrom(lane, s) (the cost from
//   it to every lane: which of many places is the quickest drive)
import { TURN_SPEED } from './roadgraph.js';

/** seconds a move costs on top of its time: turning, crossing back, changing lane */
export const MOVE_PENALTY = { straight: 0, right: .8, left: 1.6, uturn: 6, change: .7 };

export class GPS {
  constructor(graph) { this.g = graph; this.n = graph.lanes.length; this._dist = new Float64Array(this.n); this._prev = new Int32Array(this.n); this._via = new Int32Array(this.n); this._seen = new Uint32Array(this.n); this._stamp = 0; }
  /** the cost of moving along conn c into its lane */
  stepCost(c) { const b = this.g.lanes[c.to]; return c.len / (c.kind === 'straight' || c.kind === 'change' ? b.speed : TURN_SPEED) + (MOVE_PENALTY[c.kind] || 0) + b.len / b.speed; }
  /** the quickest lanes from lane `from` (s: how far along it we are) to lane `to`. o.avoid(lane) -> true skips a lane
   *  (a raised drawbridge, a crash ahead); o.noDeadEnds: never into a dead end's stub to turn back in it, but the goal's
   *  own (a car can't turn in one: a stub at a district's edge turns back through the wall beyond it). Returns
   *  { lanes: [ids], conns: [ids], cost } or null */
  route(from, to, o = {}) { return this._search(from, to, o, true); }
  /** the same by Dijkstra (no heuristic): the reference the A* is checked against */
  dijkstra(from, to, o = {}) { return this._search(from, to, o, false); }
  _search(from, to, o, astar) {
    const G = this.g, L = G.lanes, goal = L[to], st = ++this._stamp, D = this._dist, P = this._prev, V = this._via, S = this._seen, vmax = G.maxSpeed;
    if (!L[from] || !goal) return null;
    const h = astar ? i => Math.hypot(L[i].b[0] - goal.a[0], L[i].b[1] - goal.a[1]) / vmax * (i === to ? 0 : 1) : () => 0;
    const heap = new Heap(); const s0 = Math.max(0, L[from].len - (o.s || 0)) / L[from].speed;
    D[from] = s0; P[from] = -1; V[from] = -1; S[from] = st; heap.push(from, s0 + h(from));
    const closed = new Set();
    while (heap.size) {
      const i = heap.pop(); if (closed.has(i)) continue; closed.add(i);
      if (i === to) break;
      for (const cid of L[i].out) {
        const c = G.conns[cid], j = c.to; if ((o.avoid && o.avoid(L[j])) || (o.noDeadEnds && L[j].deadEnd === 'uturn' && j !== to)) continue;
        const nd = D[i] + this.stepCost(c);
        if (S[j] !== st || nd < D[j] - 1e-12) { S[j] = st; D[j] = nd; P[j] = i; V[j] = cid; heap.push(j, nd + h(j)); }
      }
    }
    if (S[to] !== st) return null;
    const lanes = [], conns = []; for (let i = to; i >= 0; i = P[i]) { lanes.push(i); if (V[i] >= 0) conns.push(V[i]); }
    return { lanes: lanes.reverse(), conns: conns.reverse(), cost: D[to] };
  }
  /** the cost from the start of every lane to lane `to` (a Dijkstra backwards over the connectors): a Float64Array,
   *  Infinity where the goal can't be reached. One search answers "which of these places drives there quickest" */
  costsTo(to) {
    const G = this.g, L = G.lanes, D = new Float64Array(this.n).fill(Infinity);
    if (!this._in) { this._in = L.map(() => []); for (const c of G.conns) this._in[c.to].push(c); }
    const heap = new Heap(), done = new Uint8Array(this.n); D[to] = 0; heap.push(to, 0);
    while (heap.size) {
      const j = heap.pop(); if (done[j]) continue; done[j] = 1;
      for (const c of this._in[j]) { const i = c.from, nd = D[j] + this.stepCost(c); if (nd < D[i] - 1e-12) { D[i] = nd; heap.push(i, nd); } }
    }
    return D;
  }
  /** the cost from lane `from` (s: how far along it we are) to the end of every lane (a Dijkstra forward over the
   *  connectors): a Float64Array, Infinity where it can't be reached. One search answers "which of these places is
   *  the quickest drive from here" */
  costsFrom(from, s = 0) {
    const G = this.g, L = G.lanes, D = new Float64Array(this.n).fill(Infinity); if (!L[from]) return D;
    const heap = new Heap(), done = new Uint8Array(this.n); D[from] = Math.max(0, L[from].len - s) / L[from].speed; heap.push(from, D[from]);
    while (heap.size) {
      const i = heap.pop(); if (done[i]) continue; done[i] = 1;
      for (const cid of L[i].out) { const c = G.conns[cid], j = c.to, nd = D[i] + this.stepCost(c); if (nd < D[j] - 1e-12) { D[j] = nd; heap.push(j, nd); } }
    }
    return D;
  }
  /** a route between two world points (each snapped to its nearest lane; heading prefers lanes running that way, as
   *  o.toHeading does at the far end: there facing that way) */
  routeTo(x, y, heading, tx, ty, o = {}) {
    const a = this.g.nearestLane(x, y, heading, o.z || 0), b = this.g.nearestLane(tx, ty, o.toHeading ?? null, o.tz || 0); if (!a || !b) return null;
    let r;
    if (a.lane.id === b.lane.id && b.s < a.s - 1) {   // (the goal behind us on our own lane: off it and round, back onto it)
      for (const cid of a.lane.out) { const c = this.g.conns[cid]; if ((o.avoid && o.avoid(this.g.lanes[c.to])) || (o.noDeadEnds && this.g.lanes[c.to].deadEnd === 'uturn' && c.to !== b.lane.id)) continue; const q = this.route(c.to, b.lane.id, { ...o, s: c.toS || 0 }); if (q && (!r || q.cost + this.stepCost(c) < r.cost)) r = { lanes: [a.lane.id, ...q.lanes], conns: [cid, ...q.conns], cost: q.cost + this.stepCost(c) }; }
    } else r = this.route(a.lane.id, b.lane.id, { ...o, s: a.s });
    if (r) { r.from = a; r.to = b; } return r;
  }
}

// a binary min-heap of (item, key)
class Heap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.v.length; }
  push(v, k) { const K = this.k, V = this.v; let i = V.length; K.push(k); V.push(v); while (i > 0) { const p = (i - 1) >> 1; if (K[p] <= k) break; K[i] = K[p]; V[i] = V[p]; i = p; } K[i] = k; V[i] = v; }
  pop() {
    const K = this.k, V = this.v, top = V[0], lk = K.pop(), lv = V.pop(); const n = V.length;
    if (n) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && K[c + 1] < K[c]) c++; if (K[c] >= lk) break; K[i] = K[c]; V[i] = V[c]; i = c; } K[i] = lk; V[i] = lv; }
    return top;
  }
}
