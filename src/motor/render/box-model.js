// Box-part models (PLAN.md 8.8): a vehicle (or any prop) is a list of boxes in its own frame (x forward, y right, z
// up), each with a colour and a role. It is drawn through a projector (stage.shape's P: ISO, TOP or SIDE7), so one
// model looks right in every view: each box's corners are projected, the faces turned away are culled, and the rest
// are filled flat, shaded by their normal against the light. Never r.shape (its facing snaps to 32 steps) or r.sprite
// (no rotation).
//   model: { parts: [{ box: [x0, y0, z0, x1, y1, z1], color, role: 'body' | 'cabin' | 'glass' | 'wheel' | 'light' |
//   'tail' | 'siren' | 'bumper' | 'trim' | 'rotor', paint (true: in the vehicle's paint whatever its role) }], length,
//   width } (sizes for the dents)
import { E } from '../engine.js';

const LIGHT = [-.6, -.8, .9];   // the engine's light direction, from above
const FACES = [[0, 1, 2, 3, 0, 0, -1], [4, 7, 6, 5, 0, 0, 1], [0, 4, 5, 1, 0, -1, 0], [2, 6, 7, 3, 0, 1, 0], [1, 5, 6, 2, 1, 0, 0], [0, 3, 7, 4, -1, 0, 0]];
const ORDER = { wheel: 0, body: 1, bumper: 1, trim: 2, glass: 3, cabin: 4, light: 5, tail: 5, siren: 6, rotor: 7 };   // (the roof, a cabin part, over its glass)
const BURNT = '#2a2422', BURNT_GLASS = '#121012';
const shades = new Map();
function shadeFor(color, k) { const key = color + k; let c = shades.get(key); if (!c) { c = E.shade(color, k); shades.set(key, c); } return c; }
const CORNERS = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
const pts = Array.from({ length: 8 }, () => [0, 0, 0]);

/** draw model at (x, y, z) turned to heading (radians, 0 east) through projector P (P.proj(x, y, z) -> [sx, sy, k]).
 *  o: { roll, pitch (radians: any angle, a wreck on its roof is roll PI), steer (the front wheels' angle), rotor (a
 *  heli's blades' angle), lit (head lights on), braking, reversing, siren (0..1 phase), paint (the 'body' parts'
 *  colour), tint (overrides paint), burnt (a wreck: everything charred), cracked (the glass), dents ({ front, rear,
 *  left, right } 0..1), extra (parts drawn after, in the same frame: open doors) } */
export function drawBoxModel(g, P, model, x, y, z, heading, o = {}) {
  const c = Math.cos(heading), s = Math.sin(heading), roll = o.roll || 0, pitch = o.pitch || 0;
  const cr = Math.cos(roll), sr = Math.sin(roll), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const sorted = model._sorted || (model._sorted = model.parts.slice().sort((a, b) => (ORDER[a.role] ?? 1) - (ORDER[b.role] ?? 1)));
  const upside = !P.depth3 && cr * cp < 0, list = P.depth3 ? partOrder(P, model, x, y, z, heading, o) : o.extra ? [...sorted, ...o.extra] : sorted;
  const L = (model.length || 58) / 2, W = (model.width || 26) / 2, dn = o.dents;
  const dentF = dn ? dn.front : 0, dentR = dn ? dn.rear : 0, dentL = dn ? dn.left : 0, dentRt = dn ? dn.right : 0, dented = dentF + dentR + dentL + dentRt > .01;
  for (let pi = 0; pi < list.length; pi++) {
    const p = list[upside ? list.length - 1 - pi : pi], role = p.role;   // (upside: no depth3, so the roles' order reversed)
    const reps = role === 'rotor' ? 2 : 1;
    for (let rep = 0; rep < reps; rep++) {
      const [x0, y0, z0, x1, y1, z1] = p.box, wcx = (x0 + x1) / 2, wcy = (y0 + y1) / 2;
      const turn = role === 'wheel' && o.steer && wcx > 0 ? o.steer : role === 'rotor' ? (o.rotor || 0) + rep * Math.PI / 2 : p.turn || 0;
      const tc = Math.cos(turn), ts = Math.sin(turn), pivotX = role === 'rotor' ? 0 : p.pivot ? p.pivot[0] : wcx, pivotY = role === 'rotor' ? 0 : p.pivot ? p.pivot[1] : wcy;
      let bad = false;
      for (let i = 0; i < 8; i++) {
        const K = CORNERS[i]; let bx = K[0] ? x1 : x0, by = K[1] ? y1 : y0, bz = K[2] ? z1 : z0;
        if (turn) { const dx = bx - pivotX, dy = by - pivotY; bx = pivotX + dx * tc - dy * ts; by = pivotY + dx * ts + dy * tc; }
        if (dented && role !== 'wheel' && role !== 'rotor') {   // a crumpled zone: its corners pushed in, its top sagging
          if (dentF && bx > L * .35) { const f = (bx - L * .35) / (L * .65); bx -= dentF * 7 * f; if (bz > 3) bz -= dentF * 3 * f; }
          if (dentR && bx < -L * .35) { const f = (-L * .35 - bx) / (L * .65); bx += dentR * 6 * f; if (bz > 3) bz -= dentR * 2.5 * f; }
          if (dentL && by < -W * .3) { const f = (-W * .3 - by) / (W * .7); by += dentL * 4 * f; if (bz > 3) bz -= dentL * 1.5 * f; }
          if (dentRt && by > W * .3) { const f = (by - W * .3) / (W * .7); by -= dentRt * 4 * f; if (bz > 3) bz -= dentRt * 1.5 * f; }
        }
        // roll about the length, then pitch about the width (cosmetic: the collision box never turns)
        const ry = by * cr - bz * sr, rz = by * sr + bz * cr, px = bx * cp + rz * sp, pz = -bx * sp + rz * cp;
        const q = P.proj(x + px * c - ry * s, y + px * s + ry * c, z + pz); if (!q) { bad = true; break; }
        pts[i][0] = q[0]; pts[i][1] = q[1]; pts[i][2] = q[2];
      }
      if (bad) continue;
      let color = p.color;
      if (o.burnt && role !== 'light' && role !== 'tail' && role !== 'siren') color = role === 'glass' ? BURNT_GLASS : role === 'wheel' ? '#141214' : BURNT;
      else if (role === 'light') color = o.lit ? '#fff4c8' : '#c8c4b0';
      else if (role === 'tail') color = o.reversing ? '#f0ece0' : o.braking ? '#ff3a2a' : '#8a1a1a';
      else if (role === 'siren') color = o.siren === undefined ? p.color : (o.siren < .5) === (p.box[1] < 0) ? '#ff2a2a' : '#2a6aff';
      else if (role === 'body' || p.paint) color = o.tint || o.paint || p.color;   // (p.paint: a part of another role in the paint: a roof)
      else if (role === 'glass' && o.cracked) color = shadeFor(p.color, -.3);
      for (const [a, b, cc, d, nx, ny, nz] of FACES) {
        const A = pts[a], B = pts[b], C = pts[cc], D = pts[d];
        if ((B[0] - A[0]) * (D[1] - A[1]) - (B[1] - A[1]) * (D[0] - A[0]) >= 0) continue;   // turned away (or edge-on)
        // the face's normal after the roll and pitch (its own turn too), for culling the underside and the light
        let fx = nx, fy = ny; if (turn) { fx = nx * tc - ny * ts; fy = nx * ts + ny * tc; }
        const ry = fy * cr - nz * sr, rz = fy * sr + nz * cr, mx = fx * cp + rz * sp, mz = -fx * sp + rz * cp;
        if (mz < -.05) continue;
        const wx = mx * c - ry * s, wy = mx * s + ry * c, lit = wx * LIGHT[0] + wy * LIGHT[1] + mz * LIGHT[2];
        g.fillStyle = shadeFor(color, mz > .7 ? .14 : lit > .2 ? .06 : lit < -.2 ? -.28 : -.1);
        g.beginPath(); g.moveTo(Math.round(A[0]), Math.round(A[1])); g.lineTo(Math.round(B[0]), Math.round(B[1])); g.lineTo(Math.round(C[0]), Math.round(C[1])); g.lineTo(Math.round(D[0]), Math.round(D[1])); g.closePath(); g.fill();
      }
    }
  }
  g._c = null;
}

// The parts in drawing order for this view (P.depth3(x, y, z): bigger is farther). Two boxes that a plane between them
// separates are ordered by the side of it the camera is on, the far one first: for boxes that don't overlap that is a
// true painter's order, and it holds on a long body (a locker on the near flank at the far end) as on a short one.
// Overlapping boxes keep their roles' order (the nested core: wheels, body, glass, the roof), except a part fixed on
// the outside (a lamp, bumper, trim or the siren bar) poking out of a core box: after the box if the face it pokes out
// of faces the camera, before it if not. The order depends only on the signs of the way depth grows in the model's
// frame, so it is kept per model for each of the 8 octants. Rotors go last; open doors (o.extra) are fitted in each
// frame, as parts on the outside. A wreck on its roof needs nothing more: the camera is then below its floor.
const CORE = { wheel: 1, body: 1, glass: 1, cabin: 1 }, EPS = .01;
/** model's parts in the order they are drawn through P at (x, y, z) turned to heading (o: roll, pitch, extra) */
export function partOrder(P, model, x, y, z, heading, o = {}) {
  const c = Math.cos(heading), s = Math.sin(heading), cr = Math.cos(o.roll || 0), sr = Math.sin(o.roll || 0), cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0), extra = o.extra;
  const d0 = P.depth3(x, y, z), gx = P.depth3(x + 1, y, z) - d0, gy = P.depth3(x, y + 1, z) - d0, gz = P.depth3(x, y, z + 1) - d0;
  const hx = gx * c + gy * s, hy = -gx * s + gy * c, px = hx * cp - gz * sp, pz = hx * sp + gz * cp;   // undo the heading, the pitch,
  const sg = [Math.sign(px), Math.sign(hy * cr + pz * sr), Math.sign(-hy * sr + pz * cr)];             // the roll: depth's way, model frame
  const key = (sg[0] > 0 ? 1 : 0) | (sg[1] > 0 ? 2 : 0) | (sg[2] > 0 ? 4 : 0), cache = model._orders || (model._orders = []);
  let list = cache[key] || (cache[key] = orderFor(model.parts, sg));
  if (extra) for (const e of extra) list = fitIn(list, e, sg);
  return list;
}
// the part's box for ordering: a part turned about its pivot (a door swung open) by the box round its turned corners
function boxOf(p) {
  if (!p.turn) return p.box;
  const [x0, y0, z0, x1, y1, z1] = p.box, tc = Math.cos(p.turn), ts = Math.sin(p.turn), [ox, oy] = p.pivot || [(x0 + x1) / 2, (y0 + y1) / 2];
  let ax = Infinity, ay = Infinity, bx = -Infinity, by = -Infinity;
  for (const [u, v] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) { const X = ox + (u - ox) * tc - (v - oy) * ts, Y = oy + (u - ox) * ts + (v - oy) * tc; ax = Math.min(ax, X); ay = Math.min(ay, Y); bx = Math.max(bx, X); by = Math.max(by, Y); }
  return [ax, ay, z0, bx, by, z1];
}
// -1: a is drawn before b; 1: after; 0: either (ia, ib: their places in the list, for the same role)
function relation(a, b, A, B, sg, outA, outB, ia, ib) {
  let far = 0, sep = false;
  for (let k = 0; k < 3; k++) {
    const side = A[k + 3] <= B[k] + EPS ? -1 : B[k + 3] <= A[k] + EPS ? 1 : 0;   // a lies on b's -k or +k side
    if (!side) continue; sep = true; if (!sg[k]) continue;
    const f = side === sg[k] ? 1 : -1;   // a is the far one when it lies the way depth grows
    far = far === 0 ? f : far === f ? f : 2;
  }
  if (sep) return far === 1 ? -1 : far === -1 ? 1 : 0;   // (separated two ways that disagree: they can't overlap on screen)
  if (outA !== outB) return outA ? (pokesToward(A, B, sg) ? 1 : -1) : (pokesToward(B, A, sg) ? -1 : 1);
  const up = sg[2] > 0, ra = (ORDER[a.role] ?? 1) * (up ? -1 : 1), rb = (ORDER[b.role] ?? 1) * (up ? -1 : 1);
  return ra !== rb ? (ra < rb ? -1 : 1) : (ia < ib) !== up ? -1 : 1;
}
// does box O (a part on the outside) poke out of box C mostly through a face the camera sees?
function pokesToward(O, C, sg) {
  let best = EPS, k = -1, plus = false;
  for (let i = 0; i < 3; i++) {
    if (O[i + 3] - C[i + 3] > best) { best = O[i + 3] - C[i + 3]; k = i; plus = true; }
    if (C[i] - O[i] > best) { best = C[i] - O[i]; k = i; plus = false; }
  }
  return k >= 0 && (plus ? sg[k] < 0 : sg[k] > 0);   // (inside it: never seen)
}
// the order for one octant: the pairs' relations, then a topological sort that takes the roles' order (and the list's)
// wherever the geometry leaves a choice; a cycle, which boxes can make, is broken there
function orderFor(parts, sg) {
  const list = parts.filter(p => p.role !== 'rotor'), n = list.length, boxes = list.map(boxOf), out = list.map(p => !CORE[p.role]);
  const next = Array.from({ length: n }, () => []), indeg = new Int32Array(n);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const r = relation(list[i], list[j], boxes[i], boxes[j], sg, out[i], out[j], i, j);
    if (r < 0) { next[i].push(j); indeg[j]++; } else if (r > 0) { next[j].push(i); indeg[i]++; }
  }
  const up = sg[2] > 0, prio = i => (ORDER[list[i].role] ?? 1) * (up ? -1 : 1) * 1e4 + (up ? -i : i);
  const done = new Uint8Array(n), order = [];
  for (let m = 0; m < n; m++) {
    let pick = -1;
    for (let i = 0; i < n; i++) if (!done[i] && !indeg[i] && (pick < 0 || prio(i) < prio(pick))) pick = i;
    if (pick < 0) for (let i = 0; i < n; i++) if (!done[i] && (pick < 0 || prio(i) < prio(pick))) pick = i;   // (a cycle)
    done[pick] = 1; order.push(list[pick]); for (const j of next[pick]) indeg[j]--;
  }
  return [...order, ...parts.filter(p => p.role === 'rotor')];
}
// a part fitted into an order: after everything it must follow (an open door is a part on the outside)
function fitIn(list, e, sg) {
  const E = boxOf(e); let at = 0;
  for (let i = 0; i < list.length; i++) { const p = list[i]; if (p.role === 'rotor') break; if (relation(p, e, boxOf(p), E, sg, !CORE[p.role], true, 0, 1) < 0) at = i + 1; }
  return [...list.slice(0, at), e, ...list.slice(at)];
}

/** a car model from its sizes: a body, a cabin with glass, four wheels, head and tail lights (and a light bar). Kept for
 *  the props and stand-ins that predate the vehicleModels registry (sim/vehicle/model.js builds the real ones) */
export function carModel({ length = 58, width = 26, height = 22, color = '#c8423a', cabin = .45, cabinAt = -.08, roof = '#2a2a34', bar = false, wheel = 6 } = {}) {
  const L = length / 2, W = width / 2, body = height * .55, cl = length * cabin, cx = length * cabinAt;
  const parts = [
    { box: [-L, -W, wheel * .5, L, W, body], color, role: 'body' },
    { box: [cx - cl / 2, -W + 2, body, cx + cl / 2, W - 2, height], color: '#3a4a5a', role: 'glass' },
    { box: [cx - cl / 2 + 2, -W + 3, height - 1, cx + cl / 2 - 2, W - 3, height + .5], color: roof, role: 'cabin' },
    { box: [L - 1, -W + 2, body - 5, L + .5, -W + 6, body - 2], color: '#fff4c8', role: 'light' },
    { box: [L - 1, W - 6, body - 5, L + .5, W - 2, body - 2], color: '#fff4c8', role: 'light' },
    { box: [-L - .5, -W + 2, body - 5, -L + 1, -W + 6, body - 2], color: '#8a1a1a', role: 'tail' },
    { box: [-L - .5, W - 6, body - 5, -L + 1, W - 2, body - 2], color: '#8a1a1a', role: 'tail' },
  ];
  for (const fx of [L * .62, -L * .62]) for (const sy of [-1, 1]) parts.push({ box: [fx - wheel, sy < 0 ? -W - .5 : W - 3.5, 0, fx + wheel, sy < 0 ? -W + 3.5 : W + .5, wheel * 1.6], color: '#1a1a20', role: 'wheel' });
  if (bar) for (const sy of [-1, 1]) parts.push({ box: [cx - 3, sy < 0 ? -W + 4 : 0, height + .5, cx + 3, sy < 0 ? 0 : W - 4, height + 3], color: sy < 0 ? '#c82a2a' : '#2a5ac8', role: 'siren' });
  return { parts, length, width };
}
