// Textured faces in perspective with canvas 2D (affine only): a planar face is cut into quads, each filled with the
// face's texture under the affine map of its corners (the PlayStation's way), split again only where the affine guess
// misses the true projection by more than a pixel: near the camera, at the top and foot of tall walls. Each quad's
// outline is exact (its corners are projected), so neighbours meet without gaps; only the texture inside is affine.
import { facePattern } from './textures.js';

const MAX_LEVEL = 3, TOL = 2;

/** fill face P (s, t) -> [x, y] (s along the texture's u from u0 to u0 + tw, t down its v from v0 to v0 + th; null
 *  behind the camera) with texture cv, or colour where cv is null or the face is tiny. Returns the quads filled */
export function texturedFace(g, P, cv, u0, v0, tw, th, color, fog = null) {
  return part(g, P, cv, u0, v0, tw, th, color, fog, 0, 0, 1, 0, 1);
}
function part(g, P, cv, u0, v0, tw, th, color, fog, level, s0, s1, t0, t1) {
  const a = P(s0, t0), b = P(s1, t0), c = P(s1, t1), d = P(s0, t1); if (!a || !b || !c || !d) return 0;
  if (cv && level < MAX_LEVEL) {   // (a flat colour needs no splitting: the outline is exact)
    const sm = (s0 + s1) / 2, tm = (t0 + t1) / 2, ms = P(sm, t0), mt = P(s0, tm);
    if (ms && mt) {
      const eS = Math.hypot(ms[0] - (a[0] + b[0]) / 2, ms[1] - (a[1] + b[1]) / 2), eT = Math.hypot(mt[0] - (a[0] + d[0]) / 2, mt[1] - (a[1] + d[1]) / 2);
      const eC = Math.hypot(c[0] - (b[0] + d[0] - a[0]), c[1] - (b[1] + d[1] - a[1]));
      if (Math.max(eS, eT, eC) > TOL) {
        const splitS = eS > eT || (eS === eT && Math.hypot(b[0] - a[0], b[1] - a[1]) >= Math.hypot(d[0] - a[0], d[1] - a[1]));
        return splitS ? part(g, P, cv, u0, v0, tw, th, color, fog, level + 1, s0, sm, t0, t1) + part(g, P, cv, u0, v0, tw, th, color, fog, level + 1, sm, s1, t0, t1)
          : part(g, P, cv, u0, v0, tw, th, color, fog, level + 1, s0, s1, t0, tm) + part(g, P, cv, u0, v0, tw, th, color, fog, level + 1, s0, s1, tm, t1);
      }
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
  const area = Math.abs((b[0] - a[0]) * (d[1] - a[1]) - (d[0] - a[0]) * (b[1] - a[1]));
  if (cv && area > 12) {
    // texel (u0 + s0 tw, v0 + t0 th) -> a, one texel along u -> (b - a) / ((s1 - s0) tw), along v -> (d - a) / ((t1 - t0) th)
    const du = (s1 - s0) * tw, dv = (t1 - t0) * th, A = (b[0] - a[0]) / du, B = (b[1] - a[1]) / du, C = (d[0] - a[0]) / dv, D = (d[1] - a[1]) / dv, U = u0 + s0 * tw, V = v0 + t0 * th;
    g.setTransform(A, B, C, D, a[0] - A * U - C * V, a[1] - B * U - D * V); g.fillStyle = facePattern(g, cv); g.fill(); g.setTransform(1, 0, 0, 1, 0, 0);
  } else { g.fillStyle = color; g.fill(); }
  if (fog) { g.fillStyle = fog; g.fill(); }
  return 1;
}
