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
  const list = o.extra ? [...sorted, ...o.extra] : sorted, upside = cr * cp < 0;
  const L = (model.length || 58) / 2, W = (model.width || 26) / 2, dn = o.dents;
  const dentF = dn ? dn.front : 0, dentR = dn ? dn.rear : 0, dentL = dn ? dn.left : 0, dentRt = dn ? dn.right : 0, dented = dentF + dentR + dentL + dentRt > .01;
  for (let pi = 0; pi < list.length; pi++) {
    const p = list[upside ? list.length - 1 - pi : pi], role = p.role;
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
