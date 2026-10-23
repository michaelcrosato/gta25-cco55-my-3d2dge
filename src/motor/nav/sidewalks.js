// The sidewalk graph (PLAN.md 8.7, 8.10): where peds walk, built from the CityMap's roads like the lane graph.
//   - each road's sidewalk bands give a walking line down their middle (on a bridge, the inner cell's: the outer row is
//     its railing);
//   - a line is cut where it crosses another road's carriageway (a crosswalk: a 'cross' edge, tied to that road's
//     traffic at the junction beside it) and where it meets a crossing road's sidewalk line (a corner node);
//   - nodes closer than a few units are one; edges through walls or water are dropped;
//   - each edge knows, piece by piece along it, the offsets across it (right of a to b) at which a ped's body touches
//     no wall and no solid (lamps, palms, benches, newsstands), so a calm ped can glide along it with no physics at all,
//     stepping round what stands on the sidewalk.
// A crossing at a signalled junction is open when the crossed road's traffic has red (signals.js, the same region and
// clock the drivers read); at a stop junction it is always open (drivers yield to peds on a crosswalk).
//   const S = new Sidewalks(city, roadGraph);  S.nodes · S.edges · S.nearestNode(x, y) · S.crossOpen(edge, t) · S.route(a, b)
import { signalAt } from './signals.js';

const T = 16, SNAP = 4, BODY = 5.5, W = 14, PIECE = 16, SLIDE = 6, ALL = (1 << (2 * W + 1)) - 1;   // (a ped's body radius and a little to spare; offsets either side; a piece; room to slide round a solid)

export class Sidewalks {
  constructor(city, graph = null) {
    this.city = city; this.graph = graph; this.nodes = []; this.edges = []; this._grid = new Map();
    const C = city, lines = [];
    for (const r of C.roads) for (const w of r.walks) {
      const ns = r.axis === 'y', [x0, y0, x1, y1] = w;
      // the line down the band's middle; on a bridge with a railing row, the inner cell's middle
      let at = ns ? (x0 + x1 + 1) / 2 * T : (y0 + y1 + 1) / 2 * T;
      const mid = ns ? Math.floor((y0 + y1) / 2) : Math.floor((x0 + x1) / 2), outerLo = ns ? x0 : y0, outerHi = ns ? x1 : y1;
      const wall = c => ns ? C.map.cell(c, mid) !== 0 : C.map.cell(mid, c) !== 0;
      if (wall(outerLo) && !wall(outerHi)) at = (outerHi + .5) * T; else if (wall(outerHi) && !wall(outerLo)) at = (outerLo + .5) * T;
      lines.push({ road: r, ns, at, from: (ns ? y0 : x0) * T, to: ((ns ? y1 : x1) + 1) * T, cuts: [] });
    }
    // corners: where two perpendicular lines meet; crossings: where a line runs over another road's carriageway
    for (const L of lines) {
      for (const M of lines) if (M.ns !== L.ns && M.at >= L.from - 1 && M.at <= L.to + 1 && L.at >= M.from - 1 && L.at <= M.to + 1) L.cuts.push({ s: M.at, corner: true });
      for (const p of C.roads) {
        if (p === L.road || (p.axis === 'y') === L.ns) continue;
        const b = p.band, lo = (L.ns ? b[1] : b[0]) * T, hi = ((L.ns ? b[3] : b[2]) + 1) * T, acrossLo = (L.ns ? b[0] : b[1]) * T, acrossHi = ((L.ns ? b[2] : b[3]) + 1) * T;
        if (L.at < acrossLo || L.at > acrossHi || hi < L.from || lo > L.to) continue;
        L.cuts.push({ s: Math.max(L.from, lo), crossStart: p }, { s: Math.min(L.to, hi), crossEnd: p });
      }
      L.cuts.push({ s: L.from }, { s: L.to });
      L.cuts.sort((a, b) => a.s - b.s);
    }
    // nodes and edges along each line
    for (const L of lines) {
      let prev = null, inCross = null;
      for (const c of L.cuts) {
        const x = L.ns ? L.at : c.s, y = L.ns ? c.s : L.at, n = this._node(x, y, !!c.corner);
        if (prev !== null && prev !== n) this._edge(prev, n, inCross ? 'cross' : 'walk', inCross);
        if (c.crossEnd) inCross = null;
        if (c.crossStart) inCross = c.crossStart;
        prev = n;
      }
    }
    // drop edges through walls or water (a sidewalk that runs into a building or off a quay)
    this.edges = this.edges.filter(e => this._clear(e));
    this._reindex();
    this._clearance();
    // an edge with a piece no body gets through (a lamp and a palm a hand's width apart) is no way at all
    const shut = this.edges.length; this.edges = this.edges.filter(e => e.masks.every(m => m)); this.shut = shut - this.edges.length;
    if (this.shut) this._reindex();
    // a crossing's junction: the lane graph's region beside it (the drivers' clock and offsets)
    for (const e of this.edges) if (e.kind === 'cross') {
      const a = this.nodes[e.a], b = this.nodes[e.b], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      e.axis = e.road.axis === 'y' ? 'ns' : 'ew';   // (the crossed road's traffic)
      if (graph) { let best = null, bd = 1e9; for (const R of graph.regions) { if (R.kind !== 'junction') continue; const cx = (R.box[0] + R.box[2]) / 2, cy = (R.box[1] + R.box[3]) / 2, d = Math.hypot(cx - mx, cy - my); if (d < bd) { bd = d; best = R; } } e.region = bd < 160 ? best : null; }
    }
  }
  _node(x, y, corner) {
    const k = Math.floor(x / 32) * 4096 + Math.floor(y / 32);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const n of this._grid.get(k + dx * 4096 + dy) || []) if (Math.abs(n.x - x) < SNAP && Math.abs(n.y - y) < SNAP) { n.corner = n.corner || corner; return n.id; }
    const n = { id: this.nodes.length, x, y, z: 0, edges: [], corner }; this.nodes.push(n);
    let a = this._grid.get(k); if (!a) this._grid.set(k, a = []); a.push(n); return n.id;
  }
  _edge(a, b, kind, road) {
    if (this.edges.some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a))) return;
    const A = this.nodes[a], B = this.nodes[b]; this.edges.push({ id: this.edges.length, a, b, len: Math.hypot(B.x - A.x, B.y - A.y), kind, road: road || null });
  }
  _clear(e) {
    const A = this.nodes[e.a], B = this.nodes[e.b], C = this.city, n = Math.max(1, Math.ceil(e.len / 6));
    for (let k = 0; k <= n; k++) { const x = A.x + (B.x - A.x) * k / n, y = A.y + (B.y - A.y) * k / n, cx = Math.floor(x / T), cy = Math.floor(y / T); if (!C.inside(cx, cy) || C.map.cell(cx, cy) !== 0) return false; const s = C.surfaceAt(cx, cy); if (s === 'water' || s === 'deep') return false; }
    return e.len > 1;
  }
  _reindex() {
    this.edges.forEach((e, i) => { e.id = i; });
    for (const n of this.nodes) n.edges = [];
    for (const e of this.edges) { this.nodes[e.a].edges.push(e.id); this.nodes[e.b].edges.push(e.id); }
    this.live = this.nodes.filter(n => n.edges.length);
    this._eg = new Map();   // (the edges by 64-unit cell, for nearestEdge)
    for (const e of this.edges) {
      const A = this.nodes[e.a], B = this.nodes[e.b];
      for (let gx = Math.floor(Math.min(A.x, B.x) / 64); gx <= Math.floor(Math.max(A.x, B.x) / 64); gx++) for (let gy = Math.floor(Math.min(A.y, B.y) / 64); gy <= Math.floor(Math.max(A.y, B.y) / 64); gy++) {
        const k = gx * 4096 + gy; let a = this._eg.get(k); if (!a) this._eg.set(k, a = []); a.push(e);
      }
    }
  }
  /** the nearest point on any edge to (x, y), within r: { e, d (units from its a), o (offset across it, right of a to b),
   *  dist } or null */
  nearestEdge(x, y, r = 120) {
    let best = null;
    for (let gx = Math.floor((x - r) / 64); gx <= Math.floor((x + r) / 64); gx++) for (let gy = Math.floor((y - r) / 64); gy <= Math.floor((y + r) / 64); gy++) for (const e of this._eg.get(gx * 4096 + gy) || []) {
      const A = this.nodes[e.a], B = this.nodes[e.b], dx = (B.x - A.x) / (e.len || 1), dy = (B.y - A.y) / (e.len || 1);
      const d = Math.max(0, Math.min(e.len, (x - A.x) * dx + (y - A.y) * dy)), px = A.x + dx * d, py = A.y + dy * d, dist = Math.hypot(x - px, y - py);
      if (dist <= r && (!best || dist < best.dist || (dist === best.dist && e.id < best.e.id))) best = { e, d, o: (x - A.x) * -dy + (y - A.y) * dx, dist };
    }
    return best;
  }
  // each edge's clearance, piece by piece (PIECE units along it): a bitmask of the offsets across it (W either side of
  // its line, right of a to b) at which a body of BODY radius clears every wall, the water and every solid there; a
  // solid also narrows the pieces just before and after it, so a ped sliding round it has room to
  _clearance() {
    const C = this.city, map = C.map;
    const wall = (x, y) => { const cx = Math.floor(x / T), cy = Math.floor(y / T); if (!C.inside(cx, cy) || map.cell(cx, cy) !== 0) return true; const s = C.surfaceAt(cx, cy); return s === 'water' || s === 'deep'; };
    for (const e of this.edges) {
      const A = this.nodes[e.a], B = this.nodes[e.b], dx = (B.x - A.x) / e.len, dy = (B.y - A.y) / e.len, nx = -dy, ny = dx, n = Math.max(1, Math.ceil(e.len / PIECE));
      const masks = new Uint32Array(n).fill(ALL);
      const block = (a0, a1, o0, o1) => {
        const lo = Math.max(-W, Math.ceil(o0)), hi = Math.min(W, Math.floor(o1)); if (lo > hi) return;
        let bits = 0; for (let o = lo; o <= hi; o++) bits |= 1 << (o + W);
        for (let i = Math.max(0, Math.floor(a0 / PIECE)); i <= Math.min(n - 1, Math.floor(a1 / PIECE)); i++) masks[i] &= ~bits;
      };
      for (const sol of map.solidsNear((A.x + B.x) / 2, (A.y + B.y) / 2, e.len / 2 + W + 24)) {
        if (sol.z > 28 || sol.top < 4) continue;   // (overhead, like a deck, or flat underfoot)
        let a0 = Infinity, a1 = -Infinity, o0 = Infinity, o1 = -Infinity;
        for (const [u, v] of [[sol.hx, sol.hy], [-sol.hx, sol.hy], [sol.hx, -sol.hy], [-sol.hx, -sol.hy]]) {
          const x = sol.x + u * sol.c - v * sol.s, y = sol.y + u * sol.s + v * sol.c, al = (x - A.x) * dx + (y - A.y) * dy, of = (x - A.x) * nx + (y - A.y) * ny;
          a0 = Math.min(a0, al); a1 = Math.max(a1, al); o0 = Math.min(o0, of); o1 = Math.max(o1, of);
        }
        if (a1 < -BODY || a0 > e.len + BODY) continue;
        block(a0 - BODY - SLIDE, a1 + BODY + SLIDE, o0 - BODY, o1 + BODY);
      }
      for (let al = 0; al <= e.len; al += 4) for (let o = -W - BODY; o <= W + BODY; o += 2) {
        const x = A.x + dx * al + nx * o, y = A.y + dy * al + ny * o; if (wall(x, y)) block(al - 4, al + 4, o - BODY - 1, o + BODY + 1);
      }
      e.masks = masks;
    }
  }
  /** the free offset nearest `want` across an edge at d units from a (offsets right of a to b), or null where none is */
  freeAt(e, d, want) {
    const m = e.masks ? e.masks[Math.max(0, Math.min(e.masks.length - 1, Math.floor(d / PIECE)))] : ALL; if (!m) return null;
    const w = Math.max(-W, Math.min(W, Math.round(want)));
    for (let k = 0; k <= 2 * W; k++) { if (w + k <= W && (m >> (w + k + W)) & 1) return w + k; if (k && w - k >= -W && (m >> (w - k + W)) & 1) return w - k; }
    return null;
  }
  /** a point d units from a along an edge, at offset o across it (right of a to b) */
  along(e, d, o = 0) {
    const A = this.nodes[e.a], B = this.nodes[e.b], k = Math.max(0, Math.min(1, d / (e.len || 1))), dx = (B.x - A.x) / (e.len || 1), dy = (B.y - A.y) / (e.len || 1);
    return [A.x + (B.x - A.x) * k - dy * o, A.y + (B.y - A.y) * k + dx * o];
  }
  /** the node at the other end of an edge */
  other(e, n) { return e.a === n ? e.b : e.a; }
  /** the nearest node with an edge to (x, y) (within r) */
  nearestNode(x, y, r = 200) {
    let best = null, bd = r;
    for (let dx = -Math.ceil(r / 32); dx <= Math.ceil(r / 32); dx++) for (let dy = -Math.ceil(r / 32); dy <= Math.ceil(r / 32); dy++) for (const n of this._grid.get((Math.floor(x / 32) + dx) * 4096 + Math.floor(y / 32) + dy) || []) {
      if (!n.edges.length) continue; const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
  /** may a ped step onto this crossing at time t? (signalled: the crossed road's traffic has red) */
  crossOpen(e, t) {
    if (e.kind !== 'cross' || !e.region || e.region.signals !== 'signal') return true;
    return signalAt(e.region, t)[e.axis] === 'red';
  }
  /** the fewest-metres walk between two nodes (Dijkstra over the edges): a list of node ids, or null */
  route(from, to) {
    if (from === to) return [from];
    const dist = new Map([[from, 0]]), prev = new Map(), open = [[0, from]], done = new Set();
    while (open.length) {
      open.sort((a, b) => a[0] - b[0]); const [d, n] = open.shift(); if (done.has(n)) continue; done.add(n);
      if (n === to) break;
      for (const eid of this.nodes[n].edges) { const e = this.edges[eid], m = this.other(e, n), nd = d + e.len + (e.kind === 'cross' ? 20 : 0); if (nd < (dist.get(m) ?? Infinity)) { dist.set(m, nd); prev.set(m, n); open.push([nd, m]); } }
    }
    if (!prev.has(to)) return null;
    const out = [to]; for (let n = to; prev.has(n); n = prev.get(n)) out.push(prev.get(n)); return out.reverse();
  }
  /** for tests and the overlay */
  stats() { const kinds = {}; for (const e of this.edges) kinds[e.kind] = (kinds[e.kind] || 0) + 1; return { nodes: this.live.length, edges: this.edges.length, kinds, corners: this.live.filter(n => n.corner).length }; }
}
