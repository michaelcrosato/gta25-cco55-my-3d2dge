// Wall textures for the depth views (PLAN.md 8.5, the stress test's face7 approach): one small canvas per wall type,
// height, shade and variant, painted the way the engine's facades are (courses, then windows a tile apart, lit or not
// by hash, shutters, a balcony line), so a building reads as the same building in every view. A face is drawn from
// its texture with a pattern fill or an affine drawImage, never pixel by pixel.
import { E } from '../../engine.js';

const TILE = 16, PERIOD = 64;   // a texture is four tiles wide: windows repeat per tile, lit windows vary over four
const cache = new Map();
/** the light's direction (the engine TileMap's): faces toward it are lit, faces away are dark */
const LIGHT = (() => { const l = Math.hypot(-.6, -.8); return [-.6 / l, -.8 / l]; })();
/** a face's shade class from its outward normal: 1 lit, 0 plain, -1 dark */
export function shadeOf(nx, ny) { const lit = -(nx * LIGHT[0] + ny * LIGHT[1]); return lit > .2 ? 1 : lit < -.2 ? -1 : 0; }
/** the colour of a wall type's face in a shade class (the engine's sideLt / sideDk rules) */
export function faceColor(t, shade) { return shade > 0 ? t.sideLt || E.shade(t.side, .12) : shade < 0 ? t.sideDk || E.shade(t.side, -.25) : t.side; }

/** the face texture of wall type t (id) at height h, in a shade class, variant 0-3 (which windows are lit), night or day:
 *  a canvas PERIOD units wide and h tall, texel = 1 unit, z up from the bottom row */
export function faceTexture(id, t, h, shade, variant = 0, night = true) {
  h = Math.max(1, Math.round(h));
  const key = id + ':' + h + ':' + shade + ':' + variant + ':' + (night ? 1 : 0); let cv = cache.get(key); if (cv) return cv;
  cv = E.mkCanvas(PERIOD, h); const g = E.ctx2d(cv), col = faceColor(t, shade), tn = E.tones(col), Y = z => h - z;   // texel row of height z
  g.fillStyle = col; g.fillRect(0, 0, PERIOD, h);
  // courses: a darker line every course (8), a lit line under it, and offset joints, as the engine's bricks
  const course = t.course || 8, line = t.line || E.shade(col, -.3);
  if ((t.face || 'brick') === 'brick') for (let z = course, k = 0; z < h; z += course, k++) {
    g.fillStyle = line; g.fillRect(0, Y(z), PERIOD, 1);
    for (let x = (k & 1) ? 4 : 12; x < PERIOD; x += 16) g.fillRect(x, Y(z) , 1, course);
    g.fillStyle = tn.lt; g.fillRect(0, Y(z) + 1, PERIOD, 1);
  } else for (let z = 24; z < h; z += 24) { g.fillStyle = tn.sh; g.fillRect(0, Y(z), PERIOD, 1); }   // stone, plaster: a line per storey
  const win = t.windows && (t.windows === true ? {} : t.windows);
  if (win) {
    const w = win.w || 6, wh = win.h || 9, from = win.from === undefined ? 9 : win.from, step = win.step || 17, glass = win.glass || '#241e34', frame = win.frame || tn.lt;
    for (let z = from, row = 0; z + wh <= h - 3; z += step, row++) for (let u = TILE / 2; u < PERIOD; u += TILE) {
      const lit = night && E.hash2(variant * 977 + row * 31, u * 7 + id * 13) < (win.lit === undefined ? .25 : win.lit);
      g.fillStyle = frame; g.fillRect(u - w / 2 - 1, Y(z + wh + 1), w + 2, wh + 2);
      g.fillStyle = lit ? '#ffd27a' : glass; g.fillRect(u - w / 2, Y(z + wh), w, wh);
      if (lit) { g.fillStyle = '#ffe8a8'; g.fillRect(u - w / 2, Y(z + wh * .45), w, Math.ceil(wh * .45)); }
      g.fillStyle = frame; g.fillRect(u, Y(z + wh), 1, wh);
      if (t.shutters) { g.fillStyle = t.shutters === true ? '#3a6a52' : t.shutters; g.fillRect(u - w / 2 - 3, Y(z + wh), 2, wh); g.fillRect(u + w / 2 + 1, Y(z + wh), 2, wh); }
    }
  }
  if (t.balcony) { const b = t.balcony === true ? {} : t.balcony, z = b.z === undefined ? Math.min(26, h * .55) : b.z, bc = b.color || '#5a4030'; if (z > 4 && z < h - 4) { g.fillStyle = E.shade(bc, -.2); g.fillRect(0, Y(z), PERIOD, 2); g.fillStyle = bc; g.fillRect(0, Y(z + 6), PERIOD, 1); for (let x = 1; x < PERIOD; x += 3) g.fillRect(x, Y(z + 6), 1, 6); } }
  g.fillStyle = E.shade(col, -.35); g.fillRect(0, h - 1, PERIOD, 1);   // the foot
  cache.set(key, cv); return cv;
}
/** a repeating pattern of a face texture, for faces drawn with one fill */
const patterns = new WeakMap();
export function facePattern(g, cv) { let p = patterns.get(cv); if (!p) { p = g.createPattern(cv, 'repeat-x'); patterns.set(cv, p); } return p; }
export const FACE_PERIOD = PERIOD;
/** forget every texture (a new palette, day to night) */
export function clearTextures() { cache.clear(); }
