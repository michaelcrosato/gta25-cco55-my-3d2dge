// Box-part models (PLAN.md 8.8): a vehicle (or any prop) is a list of boxes in its own frame (x forward, y right, z
// up), each with a colour and a role. It is drawn through a projector (stage.shape's P: ISO, TOP or SIDE7), so one
// model looks right in every view: each box's corners are projected, the faces turned away are culled, and the rest
// are filled flat, shaded by their normal against the light. Never r.shape (its facing snaps to 32 steps) or r.sprite
// (no rotation).
//   model: { parts: [{ box: [x0, y0, z0, x1, y1, z1], color, role: 'body' | 'cabin' | 'glass' | 'wheel' | 'light' |
//   'tail' | 'siren' }] }
import { E } from '../engine.js';

const LIGHT = [-.6, -.8, .9];   // the engine's light direction, from above
const FACES = [[0, 1, 2, 3, 0, 0, -1], [4, 7, 6, 5, 0, 0, 1], [0, 4, 5, 1, 0, -1, 0], [2, 6, 7, 3, 0, 1, 0], [1, 5, 6, 2, 1, 0, 0], [0, 3, 7, 4, -1, 0, 0]];
const ORDER = { wheel: 0, body: 1, cabin: 2, glass: 3, light: 4, tail: 4, siren: 5 };
const shades = new Map();
function shadeFor(color, k) { const key = color + k; let c = shades.get(key); if (!c) { c = E.shade(color, k); shades.set(key, c); } return c; }

/** draw model at (x, y, z) turned to heading (radians, 0 east) through projector P (P.proj(x, y, z) -> [sx, sy, k]).
 *  o: { roll, pitch (radians, cosmetic), steer (front wheels' angle), lit (lights on), siren (0..1 phase), tint } */
export function drawBoxModel(g, P, model, x, y, z, heading, o = {}) {
  const c = Math.cos(heading), s = Math.sin(heading), roll = o.roll || 0, pitch = o.pitch || 0;
  const parts = model._sorted || (model._sorted = model.parts.slice().sort((a, b) => (ORDER[a.role] ?? 1) - (ORDER[b.role] ?? 1)));
  for (const p of parts) {
    const [x0, y0, z0, x1, y1, z1] = p.box, pts = [];
    for (const [bx, by, bz] of [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]) {
      const zz = bz + by * roll - bx * pitch;   // the body leans: cosmetic, the collision box never does
      const q = P.proj(x + bx * c - by * s, y + bx * s + by * c, z + zz); if (!q) return; pts.push(q);
    }
    let color = p.color;
    if (p.role === 'light') color = o.lit ? '#fff4c8' : '#c8c4b0';
    else if (p.role === 'tail') color = o.braking ? '#ff3a2a' : '#8a1a1a';
    else if (p.role === 'siren') color = o.siren === undefined ? p.color : (o.siren < .5) === (p.box[1] < 0) ? '#ff2a2a' : '#2a6aff';
    else if (o.tint && p.role === 'body') color = o.tint;
    for (const [a, b, cc, d, nx, ny, nz] of FACES) {
      const A = pts[a], B = pts[b], C = pts[cc], D = pts[d];
      if ((B[0] - A[0]) * (D[1] - A[1]) - (B[1] - A[1]) * (D[0] - A[0]) >= 0) continue;   // turned away (or edge-on)
      if (nz < 0) continue;
      const wx = nx * c - ny * s, wy = nx * s + ny * c, lit = wx * LIGHT[0] + wy * LIGHT[1] + nz * LIGHT[2];
      g.fillStyle = shadeFor(color, nz > 0 ? .14 : lit > .2 ? .06 : lit < -.2 ? -.28 : -.1);
      g.beginPath(); g.moveTo(Math.round(A[0]), Math.round(A[1])); g.lineTo(Math.round(B[0]), Math.round(B[1])); g.lineTo(Math.round(C[0]), Math.round(C[1])); g.lineTo(Math.round(D[0]), Math.round(D[1])); g.closePath(); g.fill();
    }
  }
  g._c = null;
}

/** a car model from its sizes: a body, a cabin with glass, four wheels, head and tail lights (and a light bar) */
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
  return { parts };
}
