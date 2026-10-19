// The road network (PLAN.md 8.7): every lane of the city as a directed piece of road, and how the pieces join. Built
// from the CityMap's own data, generically:
//   - strips: a straight run of road with a centre line, a lane layout and a height at each end. Every street, avenue
//     and alley is a strip; so is every leg of a deck's path (the Loop at z 64, the gap's stub) and every ramp (sloping
//     from the deck to its foot). Lanes keep to the right (right-hand traffic). A road's moving lanes leave its curbs
//     free for parking (D17): an avenue has one lane each way beside its median, its outer lanes are the parking lanes;
//     a one-way street (road.oneway) has one lane a little left of its middle, its right-hand curb parked; the decks
//     and ramps have one lane each way with a shoulder.
//   - regions: junction boxes where strips meet: the ground intersections (with their signals), each deck's corners,
//     where a deck's open path meets another's side (the stub on the Loop), and each ramp's foot.
//   - lane pieces: each strip's lanes cut at the regions they cross, and wherever the street is blocked (a wall, a
//     ramp's slab too low to drive under, a railing); a drawbridge's span is marked (closed while it is up).
//   - connectors: inside each region, from every piece ending there to the pieces starting there at its height:
//     straight on (lane to lane), right turns from the outer lane, left turns from the inner lane; quadratic Béziers
//     with the corner as control point. A dead end with nothing else gets a U-turn, marked.
//   - then only the strongly connected part is kept, plus the marked dead ends reachable from it (the stub's jump), so
//     every lane kept can be driven to and away from.
// The GPS is A* over the pieces (gps.js); the signals cycle by junction (signals.js). Plain data, deterministic.
//   - crosswalks: where a lane crosses one (the zebra across a road beside a junction), as a stretch along the lane; a
//     driver stops short of the one before a junction (lane.stopS) and waits while someone is on one ahead.
//   const G = new RoadGraph(city);  G.lanes · G.conns · G.regions · G.nearestLane(x, y, heading) · G.pointOn(lane, s)
import { E } from '../engine.js';

const T = 16;
/** lane layouts: offsets from the centre line to the right of travel (units; a negative one keeps left of the middle)
 *  and speed (u/s) */
export const LANES = { street: { offs: [20], speed: 150 }, oneway: { offs: [-7], speed: 150 }, avenue: { offs: [22], speed: 210 }, alley: { offs: [8], speed: 80 },
  deck: { offs: [16], speed: 230 }, ramp: { offs: [16], speed: 160 }, stub: { offs: [14], speed: 200 } };   // (a deck's lanes keep in from its railings: the inside of a bend clears the inner one)
export const TURN_SPEED = 70;
/** a turn's radius (units): every road vehicle's turning circle fits it (the Cortez turns in about 59 at rest, the long
 *  wheelbases in about 70) */
export const TURN_R = 72;
const SAMPLE = 6;   // units between the blocking test's samples along a lane

export class RoadGraph {
  /** city: a CityMap (roads, intersections, decks, map, drawbridges); o.prune: false keeps every piece (debugging) */
  constructor(city, o = {}) {
    this.city = city; this.strips = []; this.regions = []; this.lanes = []; this.conns = [];
    this._strips(); this._regions(); this._merge(); this._cut(); this._connect(); this._changes(); if (o.prune !== false) this._prune(); this._crosswalks(); this._index();
  }
  // ---- strips: the ground roads, the decks' legs, the ramps
  _strips() {
    const C = this.city;
    for (const r of C.roads) {
      const [x0, y0, x1, y1] = r.band, ns = r.axis === 'y';
      const a = ns ? [(x0 + x1 + 1) / 2 * T, y0 * T] : [x0 * T, (y0 + y1 + 1) / 2 * T], b = ns ? [a[0], (y1 + 1) * T] : [(x1 + 1) * T, a[1]];
      this.strips.push({ id: r.id, kind: r.kind === 'avenue' ? 'avenue' : r.kind === 'alley' ? 'alley' : r.oneway ? 'oneway' : 'street', a, b, z0: 0, z1: 0, road: r, ground: true, half: (ns ? x1 - x0 + 1 : y1 - y0 + 1) * T / 2, oneway: r.oneway || 0 });
    }
    for (const d of C.decks) {
      if (d.kind === 'rail' || !d.path || d.path.length < 2) continue;
      const pts = d.path.map(([cx, cy]) => [(cx + .5) * T, (cy + .5) * T]), n = d.closed ? pts.length : pts.length - 1, kind = d.lanes >= 4 ? 'deck' : 'stub', half = d.width * T / 2;
      for (let i = 0; i < n; i++) this.strips.push({ id: d.id + ':' + i, kind, a: pts[i], b: pts[(i + 1) % pts.length], z0: d.z, z1: d.z, deck: d, half, open: !d.closed && i === n - 1 ? 'end' : null });
      for (const R of d.ramps || []) {
        const dx = { E: 1, W: -1, N: 0, S: 0 }[R.dir], dy = { E: 0, W: 0, N: -1, S: 1 }[R.dir], top = [(R.at[0] + .5) * T + dx * half, (R.at[1] + .5) * T + dy * half], foot = [(R.foot[0] + .5) * T, (R.foot[1] + .5) * T];
        this.strips.push({ id: d.id + ':ramp:' + R.dir + R.at.join(','), kind: 'ramp', a: top, b: foot, z0: d.z, z1: 0, deck: d, half, ramp: R });
      }
    }
  }
  // ---- regions: junction boxes { box: [x0, y0, x1, y1] (world), z, kind, signals, axisOf(strip) }
  _regions() {
    const C = this.city;
    for (const n of C.intersections) { const [x0, y0, x1, y1] = n.rect; this.regions.push({ id: 'j' + this.regions.length, box: [x0 * T, y0 * T, (x1 + 1) * T, (y1 + 1) * T], z: 0, kind: 'junction', signals: n.signals, roads: n.roads }); }
    for (const d of C.decks) {
      if (d.kind === 'rail' || !d.path) continue;
      const half = d.width * T / 2, pts = d.path.map(([cx, cy]) => [(cx + .5) * T, (cy + .5) * T]);
      pts.forEach((p, i) => { if (d.closed || (i > 0 && i < pts.length - 1)) this.regions.push({ id: 'd' + this.regions.length, box: [p[0] - half, p[1] - half, p[0] + half, p[1] + half], z: d.z, kind: 'corner', deck: d.id }); });
      // an open path whose first point lies on another deck's leg: a T where it leaves that deck
      if (!d.closed) for (const o of C.decks) {
        if (o === d || o.kind === 'rail' || !o.path) continue; const p = pts[0], oh = o.width * T / 2, opts = o.path.map(([cx, cy]) => [(cx + .5) * T, (cy + .5) * T]);
        for (let i = 0; i < (o.closed ? opts.length : opts.length - 1); i++) {
          const A = opts[i], B = opts[(i + 1) % opts.length], ns = A[0] === B[0];
          if (ns && Math.abs(p[0] - A[0]) <= oh + T && p[1] > Math.min(A[1], B[1]) && p[1] < Math.max(A[1], B[1])) this.regions.push({ id: 't' + this.regions.length, box: [A[0] - oh, p[1] - half, A[0] + oh, p[1] + half], z: d.z, kind: 'tee' });
          if (!ns && Math.abs(p[1] - A[1]) <= oh + T && p[0] > Math.min(A[0], B[0]) && p[0] < Math.max(A[0], B[0])) this.regions.push({ id: 't' + this.regions.length, box: [p[0] - half, A[1] - oh, p[0] + half, A[1] + oh], z: d.z, kind: 'tee' });
        }
      }
      // a ramp's foot: a cell up the ramp from its foot point and two out along the road (the ramp's own lanes end just
      // above the street there, the road's lanes either side of it)
      for (const R of d.ramps || []) {
        const f = [(R.foot[0] + .5) * T, (R.foot[1] + .5) * T], dx = { E: 1, W: -1, N: 0, S: 0 }[R.dir], dy = { E: 0, W: 0, N: -1, S: 1 }[R.dir];
        const along = dx ? [f[0] + Math.min(-dx * T, dx * 2 * T), f[0] + Math.max(-dx * T, dx * 2 * T)] : [f[0] - half - T, f[0] + half + T];
        const across = dy ? [f[1] + Math.min(-dy * T, dy * 2 * T), f[1] + Math.max(-dy * T, dy * 2 * T)] : [f[1] - half - T, f[1] + half + T];
        this.regions.push({ id: 'f' + this.regions.length, box: [along[0], across[0], along[1], across[1]], z: 0, kind: 'foot' });
      }
    }
  }
  // regions that overlap at one height are one junction (a ramp's foot in a crossroads): their boxes joined
  _merge() {
    let again = true;
    while (again) {
      again = false;
      for (let i = 0; i < this.regions.length && !again; i++) for (let j = i + 1; j < this.regions.length && !again; j++) {
        const A = this.regions[i], B = this.regions[j];
        if (Math.abs(A.z - B.z) > 8 || A.box[2] < B.box[0] || B.box[2] < A.box[0] || A.box[3] < B.box[1] || B.box[3] < A.box[1]) continue;
        A.box = [Math.min(A.box[0], B.box[0]), Math.min(A.box[1], B.box[1]), Math.max(A.box[2], B.box[2]), Math.max(A.box[3], B.box[3])];
        if (B.kind === 'junction') { A.signals = A.signals || B.signals; A.roads = [...(A.roads || []), ...(B.roads || [])]; A.kind = 'junction'; }
        this.regions.splice(j, 1); again = true;
      }
    }
    this.regions.forEach((R, i) => { R.id = R.kind[0] + i; });
  }
  // ---- lane pieces: each strip's lanes cut at its regions and its blocked stretches
  _cut() {
    for (const S of this.strips) {
      const L = Math.hypot(S.b[0] - S.a[0], S.b[1] - S.a[1]), ux = (S.b[0] - S.a[0]) / L, uy = (S.b[1] - S.a[1]) / L, spec = LANES[S.kind];
      S.len = L; S.u = [ux, uy];
      // the regions along the strip (by the stretch of its centre line inside them, at its height there)
      const spans = [];
      for (const R of this.regions) {
        const t0 = clipAxis(S.a, [ux, uy], L, R.box); if (!t0) continue;
        const zm = S.z0 + (S.z1 - S.z0) * ((t0[0] + t0[1]) / 2 / L); if (Math.abs(zm - R.z) > 8) continue;
        spans.push([t0[0], t0[1], R]);
      }
      spans.sort((p, q) => p[0] - q[0]);
      for (const dir of S.oneway ? [S.oneway] : [1, -1]) for (let li = 0; li < spec.offs.length; li++) {
        const off = spec.offs[li], tx = dir > 0 ? ux : -ux, ty = dir > 0 ? uy : -uy, rx = -ty, ry = tx;   // (travel, and the right of it)
        // the free stretches of the centre line between regions, in the strip's own direction
        const free = []; let s = 0;
        for (const [t0, t1] of spans) { if (t0 > s + 1) free.push([s, t0]); s = Math.max(s, t1); }
        if (L > s + 1) free.push([s, L]);
        for (const [s0, s1] of free) {
          // the stretch's samples along this lane, cut where the street is blocked
          const at = t => [S.a[0] + ux * t + rx * off, S.a[1] + uy * t + ry * off, S.z0 + (S.z1 - S.z0) * t / L];
          const pieces = []; let p0 = null;
          for (let t = s0; ; t = Math.min(s1, t + SAMPLE)) {
            const q = at(t), bad = this._blocked(q[0], q[1], q[2], S);
            if (!bad && p0 === null) p0 = t;
            if ((bad || t >= s1) && p0 !== null) { const e = bad ? Math.max(p0, t - SAMPLE) : t; if (e - p0 > 4) pieces.push([p0, e, p0 > s0 + .5, bad]); p0 = null; }
            if (t >= s1) break;
          }
          for (const [t0, t1, cutA, cutB] of pieces) {
            const A = dir > 0 ? at(t0) : at(t1), B = dir > 0 ? at(t1) : at(t0);
            const lane = { id: this.lanes.length, strip: S.id, kind: S.kind, dir: [tx, ty], index: li, a: A, b: B, len: Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), speed: spec.speed, out: [], in: [], deadEnd: null, bridge: null, ground: !!S.ground };
            lane.atEnd = this._regionAt(B, lane.dir, 1); lane.atStart = this._regionAt(A, lane.dir, -1);
            lane.blockedEnd = dir > 0 ? !!cutB : !!cutA;   // (it stops short of something in the road: no U-turn there)
            if (S.open === 'end' && !lane.atEnd && Math.hypot(B[0] - S.b[0], B[1] - S.b[1]) < S.half + 8 && dir > 0) lane.deadEnd = 'jump';
            for (const b of this.city.drawbridges || []) { const [x0, y0, x1, y1] = b.rect; if (overlapsSeg(A, B, [x0 * T, y0 * T, (x1 + 1) * T, (y1 + 1) * T])) lane.bridge = b.id; }
            this.lanes.push(lane);
          }
        }
      }
    }
  }
  // the region a lane end touches (just past its end in travel order), or null
  _regionAt(p, dir, side) {
    const x = p[0] + dir[0] * 2 * side, y = p[1] + dir[1] * 2 * side;
    for (const R of this.regions) if (x >= R.box[0] - 1 && x <= R.box[2] + 1 && y >= R.box[1] - 1 && y <= R.box[3] + 1 && Math.abs(p[2] - R.z) <= 8) return R;
    return null;
  }
  // is a lane's point blocked: a wall cell, a ramp's or deck's slab too low to drive under (a ground lane), or a solid
  // within a car's half width of it (a railing, a pillar, a container: never street furniture knocked flat)
  _blocked(x, y, z, S) {
    const C = this.city, cx = Math.floor(x / T), cy = Math.floor(y / T);
    if (!C.inside(cx, cy)) return true;
    const map = C.map;
    if (map.solidsNear) for (const q of map.solidsNear(x, y, 24)) { if (q.deck || q.top <= z + 4 || q.z >= z + 30 || q.breakable) continue; if (Math.abs(q.x - x) < q.hx + 10 && Math.abs(q.y - y) < q.hy + 10) return true; }   // (a deck's own treads are its road)
    if (!S.ground) return false;   // (a deck or ramp lane rides its own slab)
    if (map.cell(cx, cy) !== 0) return true;
    for (const d of C.decks) { const h = d.heightAt(x, y); if (h !== null && h > .5 && h < 30) return true; }
    return false;
  }
  // ---- connectors inside each region
  _connect() {
    const byRegion = new Map();
    for (const l of this.lanes) {
      if (l.atEnd) { let e = byRegion.get(l.atEnd); if (!e) byRegion.set(l.atEnd, e = { ends: [], starts: [] }); e.ends.push(l); }
      if (l.atStart) { let e = byRegion.get(l.atStart); if (!e) byRegion.set(l.atStart, e = { ends: [], starts: [] }); e.starts.push(l); }
    }
    for (const [R, { ends, starts }] of byRegion) for (const a of ends) {
      const opts = [];
      for (const b of starts) {
        if (b.strip === a.strip && b.dir[0] * a.dir[0] + b.dir[1] * a.dir[1] < 0) continue;   // (its own road back the other way: a U-turn, below)
        const turn = Math.atan2(a.dir[0] * b.dir[1] - a.dir[1] * b.dir[0], a.dir[0] * b.dir[0] + a.dir[1] * b.dir[1]);   // (+: right, clockwise on screen)
        const kind = Math.abs(turn) < .35 ? 'straight' : Math.abs(turn - Math.PI / 2) < .5 ? 'right' : Math.abs(turn + Math.PI / 2) < .5 ? 'left' : null;
        if (!kind) continue;
        const na = this._count(a), nb = this._count(b);
        if (kind === 'straight' && Math.round(a.index * (nb - 1) / Math.max(1, na - 1)) !== b.index && !(na === 1 || nb === 1)) continue;
        if (R.kind === 'corner') { if (kind !== 'straight' && Math.min(a.index, na - 1) !== Math.min(b.index, nb - 1)) continue; }   // (a deck's bend: every lane follows it round)
        else if (kind === 'right' && (a.index !== na - 1 || b.index !== nb - 1)) continue;   // (right turns: outer lane to outer lane)
        else if (kind === 'left' && (a.index !== 0 || b.index !== 0)) continue;   // (left turns: inner to inner)
        opts.push([b, kind]);
      }
      for (const [b, kind] of opts) this._link(a, b, kind, R);
    }
    // dead ends: a lane ending with nowhere to go turns back on its own road (marked, unless it is the stub's jump)
    for (const a of this.lanes) {
      if (a.out.length || a.deadEnd === 'jump' || a.blockedEnd) continue;   // (a piece that runs into a ramp's slab just goes: pruned)
      const back = this.lanes.filter(b => b.strip === a.strip && b.dir[0] * a.dir[0] + b.dir[1] * a.dir[1] < -.9 && Math.hypot(b.a[0] - a.b[0], b.a[1] - a.b[1]) < 120 && Math.abs(b.a[2] - a.b[2]) < 8);
      if (back.length) {   // (the lane of the same place across: outer to outer, inner to inner)
        back.sort((p, q) => (Math.abs(p.index - a.index) - Math.abs(q.index - a.index)) || (Math.hypot(p.a[0] - a.b[0], p.a[1] - a.b[1]) - Math.hypot(q.a[0] - a.b[0], q.a[1] - a.b[1])));
        this._link(a, back[0], 'uturn', null); a.deadEnd = 'uturn';
      }
    }
  }
  // lane changes: between neighbouring lanes running the same way side by side (the zone where they overlap, past its
  // first and before its last 24 units), both ways
  _changes() {
    const by = new Map(); for (const l of this.lanes) { const k = l.strip + (l.dir[0] + l.dir[1] > 0 ? '+' : '-'); let a = by.get(k); if (!a) by.set(k, a = []); a.push(l); }
    for (const list of by.values()) for (const A of list) for (const B of list) {
      if (Math.abs(A.index - B.index) !== 1) continue;
      const along = p => p[0] * A.dir[0] + p[1] * A.dir[1], a0 = Math.max(along(A.a), along(B.a)) + 24, a1 = Math.min(along(A.b), along(B.b)) - 24;
      if (a1 - a0 < 24) continue;
      const fa = (a0 - along(A.a)) / (along(A.b) - along(A.a)), fb = (a1 - along(B.a)) / (along(B.b) - along(B.a));
      const p0 = this.pointOn(A, fa * A.len), p2 = this.pointOn(B, fb * B.len), c = { id: this.conns.length, from: A.id, to: B.id, kind: 'change', fromS: fa * A.len, toS: fb * B.len, region: null, axis: null, signals: null };
      setPath(c, [p0, [(p0[0] + p2[0]) / 2 + A.dir[0] * 6, (p0[1] + p2[1]) / 2 + A.dir[1] * 6, (p0[2] + p2[2]) / 2], p2]);
      this.conns.push(c); A.out.push(c.id); B.in.push(c.id);
    }
  }
  _count(l) { return LANES[l.kind].offs.length; }
  // a connector from lane a's end to lane b's start. A turn is a circular arc of TURN_R tangent to both lanes (a car's
  // turning circle fits it): where the box is too tight for that, the arc leaves lane a before its end (fromS) and joins
  // lane b past its start (toS); a straight on, or a U-turn, is a curve between the lane ends. The path is kept as points
  // (pts, with their running lengths cum) the driver follows
  _link(a, b, kind, R) {
    let fromS = a.len, toS = 0, pts = null; const conn0 = { radius: 0 };
    if (kind === 'left' || kind === 'right') {
      const K = cornerOf(a.b, a.dir, b.a, b.dir), dA = (K[0] - a.b[0]) * a.dir[0] + (K[1] - a.b[1]) * a.dir[1], dB = (b.a[0] - K[0]) * b.dir[0] + (b.a[1] - K[1]) * b.dir[1];
      const th = Math.acos(E.clamp(a.dir[0] * b.dir[0] + a.dir[1] * b.dir[1], -1, 1)), tan = Math.tan(th / 2);
      // (the tangent length: TURN_R's, or as much as a short lane either side leaves room for)
      const ka = a.len / (Math.hypot(a.b[0] - a.a[0], a.b[1] - a.a[1]) || 1), kb = b.len / (Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]) || 1);   // (a lane's s counts a ramp's slope: units along it per unit across the ground)
      const t = Math.min(TURN_R * tan, dA + a.len / ka - 2, dB + b.len / kb - 2), r = t / (tan || 1);
      const wantFrom = a.len - Math.max(0, t - dA) * ka, wantTo = Math.max(0, t - dB) * kb;
      if (r >= TURN_R * .6 && wantFrom >= 2 && wantTo <= b.len - 2 && dA > -2 && dB > -2) {
        fromS = wantFrom; toS = wantTo;
        const P0 = this.pointOn(a, fromS), E1 = this.pointOn(b, toS), side = a.dir[0] * b.dir[1] - a.dir[1] * b.dir[0] > 0 ? 1 : -1;
        const A0 = [K[0] - a.dir[0] * t, K[1] - a.dir[1] * t], C = [A0[0] - a.dir[1] * side * r, A0[1] + a.dir[0] * side * r];
        pts = [[P0[0], P0[1]]]; if (dA > t + .5) pts.push(A0);
        const ang0 = Math.atan2(A0[1] - C[1], A0[0] - C[0]), n = Math.max(4, Math.ceil(th * r / 5));
        for (let k = 1; k <= n; k++) { const ang = ang0 + side * th * k / n; pts.push([C[0] + Math.cos(ang) * r, C[1] + Math.sin(ang) * r]); }
        conn0.radius = r;
        if (dB > t + .5) pts.push([E1[0], E1[1]]);
        pts = withZ(pts, P0[2], E1[2]);
      }
    }
    if (!pts) {   // a curve between the lane ends: straight on, a U-turn, or a turn the box can't give an arc
      const p0 = this.pointOn(a, fromS), p2 = this.pointOn(b, toS), c = kind === 'straight' ? [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2, (p0[2] + p2[2]) / 2] : kind === 'uturn' ? [p0[0] + a.dir[0] * 30 + (p2[0] - p0[0]) / 2, p0[1] + a.dir[1] * 30 + (p2[1] - p0[1]) / 2, (p0[2] + p2[2]) / 2] : cornerOf(p0, a.dir, p2, b.dir);
      pts = []; for (let k = 0; k <= 12; k++) { const u = k / 12, v = 1 - u; pts.push([0, 1, 2].map(i => v * v * p0[i] + 2 * v * u * c[i] + u * u * p2[i])); }
    }
    const conn = { id: this.conns.length, from: a.id, to: b.id, kind, fromS, toS, radius: conn0.radius, region: R ? R.id : null, axis: R && R.kind === 'junction' ? (Math.abs(a.dir[1]) > Math.abs(a.dir[0]) ? 'ns' : 'ew') : null, signals: R ? R.signals || null : null };
    setPath(conn, pts);
    this.conns.push(conn); a.out.push(conn.id); b.in.push(conn.id);
  }
  // ---- keep what can be driven to and away from (the largest strongly connected part), and the marked dead ends off it
  _prune() {
    const n = this.lanes.length, idx = new Array(n).fill(-1), low = new Array(n).fill(0), on = new Array(n).fill(false), comp = new Array(n).fill(-1), st = []; let k = 0, c = 0;
    const succ = l => this.lanes[l].out.map(id => this.conns[id].to);
    for (let s = 0; s < n; s++) {   // (Tarjan's, iterative: the graph runs to thousands of pieces)
      if (idx[s] >= 0) continue;
      const stack = [[s, 0]]; idx[s] = low[s] = k++; st.push(s); on[s] = true;
      while (stack.length) {
        const top = stack[stack.length - 1], v = top[0], ns = succ(v);
        if (top[1] < ns.length) {
          const w = ns[top[1]++];
          if (idx[w] < 0) { idx[w] = low[w] = k++; st.push(w); on[w] = true; stack.push([w, 0]); } else if (on[w]) low[v] = Math.min(low[v], idx[w]);
        } else {
          stack.pop(); if (stack.length) { const u = stack[stack.length - 1][0]; low[u] = Math.min(low[u], low[v]); }
          if (low[v] === idx[v]) { let w; do { w = st.pop(); on[w] = false; comp[w] = c; } while (w !== v); c++; }
        }
      }
    }
    const size = new Array(c).fill(0); for (const x of comp) size[x]++;
    const main = size.indexOf(Math.max(...size)), keep = new Set(this.lanes.filter(l => comp[l.id] === main).map(l => l.id));
    // the marked dead ends one connector off the main part (the stub's jump, a U-turn's stub)
    let grew = true; while (grew) { grew = false; for (const l of this.lanes) if (!keep.has(l.id) && l.deadEnd && l.in.some(id => keep.has(this.conns[id].from))) { keep.add(l.id); grew = true; } }
    this.droppedLanes = this.lanes.filter(l => !keep.has(l.id)).map(l => ({ strip: l.strip, kind: l.kind, a: l.a.map(Math.round), b: l.b.map(Math.round), out: l.out.length, in: l.in.length }));
    this.dropped = this.droppedLanes.length;
    const remap = new Map(), lanes = [];
    for (const l of this.lanes) if (keep.has(l.id)) { remap.set(l.id, lanes.length); l.id = lanes.length; lanes.push(l); }
    const conns = [];
    for (const cn of this.conns) if (remap.has(cn.from) && remap.has(cn.to)) { cn.from = remap.get(cn.from); cn.to = remap.get(cn.to); cn.id = conns.length; conns.push(cn); }
    for (const l of lanes) { l.out = []; l.in = []; }
    for (const cn of conns) { lanes[cn.from].out.push(cn.id); lanes[cn.to].in.push(cn.id); }
    this.lanes = lanes; this.conns = conns; this.components = c;
  }
  // ---- crosswalks along each lane: lane.cross = [[s0, s1, index]] (the zebra's stretch along the lane), and lane.stopS:
  // where a driver stops for the junction at its end (short of a crosswalk just before it)
  _crosswalks() {
    const cws = this.city.crosswalks || [];
    for (const l of this.lanes) {
      l.cross = []; l.stopS = Math.max(0, l.len - 3);
      if (!l.ground) continue;
      const u = [(l.b[0] - l.a[0]) / (l.len || 1), (l.b[1] - l.a[1]) / (l.len || 1)];
      cws.forEach((w, i) => {
        const box = [w.rect[0] * T, w.rect[1] * T, (w.rect[2] + 1) * T, (w.rect[3] + 1) * T], t = clipAxis(l.a, u, l.len, box);
        if (t) l.cross.push([t[0], t[1], i]);
      });
      l.cross.sort((p, q) => p[0] - q[0]);
      const last = l.cross[l.cross.length - 1];
      if (l.atEnd && last && l.len - last[1] < 6) l.stopS = Math.max(0, last[0] - 3);
    }
  }
  // ---- a grid of lane pieces for nearest-lane queries
  _index() {
    this.grid = new Map(); this.maxSpeed = Math.max(...Object.values(LANES).map(s => s.speed));
    for (const l of this.lanes) {
      const x0 = Math.floor(Math.min(l.a[0], l.b[0]) / 64), x1 = Math.floor(Math.max(l.a[0], l.b[0]) / 64), y0 = Math.floor(Math.min(l.a[1], l.b[1]) / 64), y1 = Math.floor(Math.max(l.a[1], l.b[1]) / 64);
      for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const key = gy * 4096 + gx; let a = this.grid.get(key); if (!a) this.grid.set(key, a = []); a.push(l); }
    }
  }
  /** the lane piece nearest (x, y) (and z within 12), preferring one heading within 90 degrees of heading if given:
   *  { lane, s (distance along it), d (distance off it) } or null */
  nearestLane(x, y, heading = null, z = 0, r = 160) {
    let best = null, bd = Infinity;
    for (let gy = Math.floor((y - r) / 64); gy <= Math.floor((y + r) / 64); gy++) for (let gx = Math.floor((x - r) / 64); gx <= Math.floor((x + r) / 64); gx++) {
      for (const l of this.grid.get(gy * 4096 + gx) || []) {
        const dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1], L2 = dx * dx + dy * dy || 1, f = E.clamp(((x - l.a[0]) * dx + (y - l.a[1]) * dy) / L2, 0, 1);
        const zz = l.a[2] + (l.b[2] - l.a[2]) * f; if (Math.abs(zz - z) > 12) continue;
        let d = Math.hypot(l.a[0] + dx * f - x, l.a[1] + dy * f - y);
        if (heading !== null && Math.cos(heading) * l.dir[0] + Math.sin(heading) * l.dir[1] < 0) d += 400;
        if (d < bd) { bd = d; best = { lane: l, s: f * l.len, d }; }
      }
    }
    return best && best.d < r ? best : null;
  }
  /** the point [x, y, z] s units along a lane */
  pointOn(l, s) { const k = E.clamp(s / (l.len || 1), 0, 1); return [l.a[0] + (l.b[0] - l.a[0]) * k, l.a[1] + (l.b[1] - l.a[1]) * k, l.a[2] + (l.b[2] - l.a[2]) * k]; }
  /** { p: [x, y, z], t: [ux, uy] (the unit tangent) } d units along a connector's path */
  connAt(c, d) {
    const P = c.pts, cum = c.cum; d = E.clamp(d, 0, c.len); let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const p = P[lo], q = P[hi], seg = cum[hi] - cum[lo] || 1, k = E.clamp((d - cum[lo]) / seg, 0, 1), dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
    return { p: [p[0] + dx * k, p[1] + dy * k, p[2] + (q[2] - p[2]) * k], t: [dx / l, dy / l] };
  }
  /** the point [x, y, z] a fraction u along a connector's path */
  pointOnConn(c, u) {
    const d = E.clamp(u, 0, 1) * c.len, P = c.pts, cum = c.cum; let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const seg = cum[hi] - cum[lo] || 1, k = E.clamp((d - cum[lo]) / seg, 0, 1), p = P[lo], q = P[hi];
    return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k];
  }
  /** a summary for tests and the dev overlay */
  stats() { const kinds = {}; for (const c of this.conns) kinds[c.kind] = (kinds[c.kind] || 0) + 1; return { lanes: this.lanes.length, conns: this.conns.length, regions: this.regions.length, dropped: this.dropped, deadEnds: this.lanes.filter(l => l.deadEnd).length, kinds }; }
}

// where a centre line [a + u t] crosses an axis-aligned box: [t0, t1] (clipped to 0..L), or null
function clipAxis(a, u, L, box) {
  let t0 = 0, t1 = L;
  for (const [p, d, lo, hi] of [[a[0], u[0], box[0], box[2]], [a[1], u[1], box[1], box[3]]]) {
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return null; continue; }
    let s0 = (lo - p) / d, s1 = (hi - p) / d; if (s0 > s1) [s0, s1] = [s1, s0];
    t0 = Math.max(t0, s0); t1 = Math.min(t1, s1); if (t0 > t1) return null;
  }
  return t1 - t0 > .5 ? [t0, t1] : null;
}
function overlapsSeg(A, B, box) { const x0 = Math.min(A[0], B[0]), x1 = Math.max(A[0], B[0]), y0 = Math.min(A[1], B[1]), y1 = Math.max(A[1], B[1]); return x1 >= box[0] && x0 <= box[2] && y1 >= box[1] && y0 <= box[3]; }
// the corner where two lane lines meet (the control point of a turn), at the mean height
function cornerOf(p, u, q, v) {
  const den = u[0] * v[1] - u[1] * v[0]; if (Math.abs(den) < 1e-6) return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
  const t = ((q[0] - p[0]) * v[1] - (q[1] - p[1]) * v[0]) / den; return [p[0] + u[0] * t, p[1] + u[1] * t, (p[2] + q[2]) / 2];
}
/** give a connector its path: points [x, y, z], running lengths, length, and its ends p0 and p2 */
function setPath(c, pts) {
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  c.pts = pts; c.cum = cum; c.len = Math.max(1, cum[cum.length - 1]); c.p0 = pts[0]; c.p2 = pts[pts.length - 1];
}
/** points [x, y] given heights from z0 to z1 by the distance along them */
function withZ(pts, z0, z1) {
  let L = 0; const cum = [0]; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(L); }
  return pts.map((p, i) => [p[0], p[1], z0 + (z1 - z0) * (L ? cum[i] / L : 0)]);
}
