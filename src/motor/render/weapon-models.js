// Weapon models (PLAN.md 8.12): every weapon a rig can hold, as parts along its barrel from the gripping hand, drawn in
// the rig's own frame through GTM-PATCH(8)'s weaponDraw hook (so a gun held on the far side of the body is behind it),
// and the same parts flat as the weapon wheel's and the HUD's icons. A part runs along the barrel axis from a to b
// (units from the hand; less than 0 is behind it: a stock), sits off the axis by up (units above it) and side, and is
// a capsule r0 to r1 units thick. Two-handed models name their foregrip (units along), where PedRig puts the left hand.
import { E } from '../engine.js';

const M = {
  pistol: { parts: [[0, 5.5, 0, .9, .8, 'metal'], [-.4, -.2, -1.2, .7, .65, 'dark', -.6]], muzzle: 5.8 },
  smg: { parts: [[-1, 6, 0, 1.1, 1, 'dark'], [6, 8.2, .2, .5, .5, 'metal'], [1.2, 1.8, -2.6, .6, .55, 'dark', 0, true], [-1, -3.8, -.4, .45, .45, 'metal']], muzzle: 8.4, grip: 4.2 },
  shotgun: { parts: [[-1, 10.5, .2, .65, .6, 'metal'], [4, 7, -.6, .95, .95, 'wood'], [-1, -6, -.8, 1.1, .9, 'wood']], muzzle: 10.8, grip: 5.5 },
  launcher: { parts: [[-6, 9, .6, 1.7, 1.7, 'olive'], [8.4, 9.6, .6, 2, 2, 'oliveDk'], [-6.4, -5.4, .6, 1.9, 1.9, 'oliveDk'], [.2, .9, -1.4, .6, .6, 'dark', 0, true]], muzzle: 9.8, grip: 4 },
  flamer: { parts: [[-1, 7, 0, 1.1, 1, 'red'], [7, 10, .2, .55, .45, 'metal'], [1, 4.5, -1.6, 1.4, 1.4, 'red'], [-1, -4, -.5, .5, .5, 'metal']], muzzle: 10.2, grip: 5 },
  zapper: { parts: [[0, 6, 0, 1.2, 1, 'teal'], [6, 7.6, 0, .85, .55, 'spark'], [-.3, .3, -1.4, .7, .6, 'dark', 0, true]], muzzle: 7.8 },
  phone: { parts: [[.2, 2.2, .4, .9, .9, 'dark'], [.9, 1.6, .9, .4, .4, 'screen']], muzzle: 2.4 },
  bat: { parts: [[-.6, 4, 0, .45, .5, 'woodDk'], [4, 12, 0, .55, 1.2, 'woodLt']], muzzle: 12 },
  molotov: { parts: [[-.5, 2.6, 0, 1, .95, 'glass'], [2.6, 3.5, 0, .45, .4, 'glass'], [3.5, 4.6, 0, .45, .3, 'rag']], muzzle: 4.6 },
  grenade: { parts: [[.3, 1.4, 0, 1.4, 1.4, 'olive'], [1.6, 2.1, .6, .4, .4, 'metal']], muzzle: 2 },
};
const COLORS = { metal: '#8a8e9a', dark: '#2e2c34', wood: '#8a5a32', woodDk: '#5a3a20', woodLt: '#c89a5a', olive: '#5a6a3a', oliveDk: '#3a4626', red: '#b8322a',
  teal: '#2a8a9a', spark: '#9ff0ff', screen: '#bfe8ff', glass: '#4a8a4a', rag: '#e8dcc0' };
const GLOW = new Set(['spark', 'screen']);
export const WEAPON_MODELS = Object.keys(M);
/** the model's numbers: { parts, muzzle (units along), grip (the foregrip, units along, two-handed only) } */
export const weaponModel = id => M[id] || null;

/** the barrel's frame in the rig: a (along it), up (above it, in the vertical plane), side */
function frame(bd) {
  const l = Math.hypot(bd[0], bd[1], bd[2]) || 1, a = [bd[0] / l, bd[1] / l, bd[2] / l];
  let up = [-a[0] * a[2], -a[1] * a[2], 1 - a[2] * a[2]], ul = Math.hypot(up[0], up[1], up[2]);
  if (ul < 1e-3) { up = [1, 0, 0]; ul = 1; }
  up = [up[0] / ul, up[1] / ul, up[2] / ul];
  return { a, up, side: [a[1] * up[2] - a[2] * up[1], a[2] * up[0] - a[0] * up[2], a[0] * up[1] - a[1] * up[0]] };
}
/** a rig-local offset from the hand: along, up and side units */
const off = (F, along, up, side = 0) => [F.a[0] * along + F.up[0] * up + F.side[0] * side, F.a[1] * along + F.up[1] * up + F.side[1] * side, F.a[2] * along + F.up[2] * up + F.side[2] * side];
/** the muzzle (or the bat's tip) in rig-local coordinates, from the hand and blade direction */
export function muzzleLocal(id, hand, bd) { const m = M[id]; if (!m) return hand; const F = frame(bd), o = off(F, m.muzzle, m.parts[0][2]); return [hand[0] + o[0], hand[1] + o[1], hand[2] + o[2]]; }
/** the foregrip in rig-local coordinates (for the left hand), or null */
export function gripLocal(id, hand, bd) { const m = M[id]; if (!m || m.grip === undefined) return null; const F = frame(bd), o = off(F, m.grip, -.9); return [hand[0] + o[0], hand[1] + o[1], hand[2] + o[2]]; }

const tonesOf = {};
const tone = c => tonesOf[c] || (tonesOf[c] = E.tones(COLORS[c] || c));
// a capsule on screen with an outline and a lit edge
function capsule(g, A, B, ra, rb, c, classic) {
  const t = tone(c), P = E.px;
  if (classic) { P.line(g, A[0], A[1], B[0], B[1], t.sh, Math.max(1, Math.round((ra + rb)))); return; }
  const vx = B[0] - A[0], vy = B[1] - A[1], L = Math.hypot(vx, vy);
  const body = (ax, ay, bx, by, r0, r1, col) => {
    if (L > .01) { const nx = -vy / L, ny = vx / L; P.poly(g, [[ax + nx * r0, ay + ny * r0], [bx + nx * r1, by + ny * r1], [bx - nx * r1, by - ny * r1], [ax - nx * r0, ay - ny * r0]], col); }
    P.disc(g, ax, ay, Math.max(0, r0 - .35), col); P.disc(g, bx, by, Math.max(0, r1 - .35), col);
  };
  body(A[0], A[1], B[0], B[1], Math.max(.6, ra), Math.max(.6, rb), t.deep);
  if (ra > .9 || rb > .9) body(A[0] - .4, A[1] - .4, B[0] - .4, B[1] - .4, Math.max(.4, ra - .7), Math.max(.4, rb - .7), t.base);
  if (GLOW.has(c)) { P.glow(g, 1); P.disc(g, B[0], B[1], Math.max(.6, rb), COLORS[c]); }
}
/** draw a model in a rig (GTM-PATCH(8)'s api): o.lit (a lit rag), o.flash (a muzzle flash, 0..1) */
export function drawWeaponInRig(api, id, o = {}) {
  const m = M[id]; if (!m) return;
  const J = api.J, hand = J.handR, F = frame(J.bladeDir), u = api.u, H = api.P(hand);
  for (const [a, b, up, r0, r1, c, side = 0] of m.parts) {
    const A = api.P(hand, ...off(F, a, up, side)), B = api.P(hand, ...off(F, b, up, side));
    api.push((A[2] + B[2]) / 2 + .03, () => capsule(api.g, A, B, r0 * u, r1 * u, c, api.classic));
  }
  if (o.lit || o.flash) {
    const T = api.P(hand, ...off(F, m.muzzle + (o.flash ? 1.2 : 0), m.parts[0][2]));
    api.push(Math.max(H[2], T[2]) + .05, () => {
      const g = api.g, P = E.px; P.glow(g, 1);
      if (o.flash) { const r = Math.max(1.5, u * (1.6 + o.flash * 1.6)); P.disc(g, T[0], T[1], r, '#ffd060'); P.disc(g, T[0], T[1], r * .55, '#fff8d0'); }
      else { const f = Math.sin(E.current ? E.current.real * 30 : 0); P.disc(g, T[0], T[1] - u * .6, Math.max(1, u * (1 + f * .25)), '#ffa030'); P.dot(g, T[0], T[1] - u * .9, '#fff0a0'); }
    });
  }
}
/** the model flat, as an icon: centred at (x, y), s pixels a unit, pointing right (o.color: one flat colour, a
 *  silhouette) */
export function drawWeaponIcon(g, id, x, y, s, o = {}) {
  const m = M[id]; if (!m) return;
  let a0 = Infinity, a1 = -Infinity; for (const p of m.parts) { a0 = Math.min(a0, p[0], p[1]); a1 = Math.max(a1, p[0], p[1]); }
  const cx = x - (a0 + a1) / 2 * s;
  for (const [a, b, up, r0, r1, c] of m.parts) {
    const A = [cx + a * s, y - up * s], B = [cx + b * s, y - up * s], ra = r0 * s, rb = r1 * s;
    if (o.color) { capsuleFlat(g, A, B, ra, rb, o.color); continue; }
    capsule(g, A, B, ra, rb, c, false);
  }
}
function capsuleFlat(g, A, B, ra, rb, col) {
  const P = E.px, vx = B[0] - A[0], vy = B[1] - A[1], L = Math.hypot(vx, vy);
  if (L > .01) { const nx = -vy / L, ny = vx / L; P.poly(g, [[A[0] + nx * ra, A[1] + ny * ra], [B[0] + nx * rb, B[1] + ny * rb], [B[0] - nx * rb, B[1] - ny * rb], [A[0] - nx * ra, A[1] - ny * ra]], col); }
  P.disc(g, A[0], A[1], ra, col); P.disc(g, B[0], B[1], rb, col);
}
/** a fist icon (fists have no model) */
export function drawFistIcon(g, x, y, s, col = '#e8b890') {
  const P = E.px, t = E.tones(col);
  P.disc(g, x, y, s * 2.2, t.deep); P.disc(g, x - s * .3, y - s * .3, s * 1.8, t.base);
  for (let i = 0; i < 4; i++) P.disc(g, x - s * 1.5 + i * s, y - s * 1.6, s * .55, t.sh);
}
