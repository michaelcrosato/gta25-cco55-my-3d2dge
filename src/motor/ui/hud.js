// The on-foot HUD, first pass (PLAN.md 8.18; the radar and the stars: radar.js; M9 brings the rest of the 10-foot kit): health, armour and
// the ability meter at the bottom left, where GTA V keeps them under the radar; the weapon in hand and its rounds at
// the top right; the lock-on's mark and the free aim's sight in the world (drawn through the Stage, so they sit right
// in every view). Big enough to read from a sofa at the game's resolution.
import { E } from '../engine.js';
import { drawWeaponIcon, drawFistIcon } from '../render/weapon-models.js';
import { CHEST } from '../combat/aim.js';
import { ABILITIES } from '../combat/abilities.js';

/** health, armour and ability at the bottom left; the weapon at the top right. o: { color (the protagonist's), name }.
 *  Each corner is drawn into an image of its own and redrawn only when what it shows changes (the pixel font draws a
 *  rectangle a pixel: a HUD redrawn every frame costs the city's lighting budget) */
const CORNERS = new Map();
function corner(key, sig, w, h, draw) {
  let c = CORNERS.get(key);
  if (!c) { c = { cv: E.mkCanvas(w, h), sig: null }; CORNERS.set(key, c); }
  if (c.cv.width !== w || c.cv.height !== h) { c.cv.width = w; c.cv.height = h; c.sig = null; }
  if (c.sig !== sig) { const g = c.cv.getContext('2d'); g.clearRect(0, 0, w, h); g.imageSmoothingEnabled = false; draw(g); g._c = null; c.sig = sig; }
  return c.cv;
}
export function drawPedHud(g, W, H, p, o = {}) {
  const v = p.vitals, a = p.ability, spec = p.inv.spec(), rd = p.inv.rounds();
  const low = v.health < 25 && Math.floor((E.current ? E.current.real : 0) * 4) % 2;
  const bars = [Math.round(v.health), Math.round(v.armor), a ? Math.round(a.meter * 92) : -1, a && a.active ? 1 : 0, low ? 1 : 0, o.name || '', o.color || ''].join('|');
  g.drawImage(corner('bars', bars, 200, 40, cg => drawBars(cg, 0, 40, p, o, low)), 0, H - 40);
  const label = !rd ? '' : p.inv.reloading > 0 ? 'RELOAD' : spec.mag ? `${rd.mag} / ${Math.max(0, rd.total - rd.mag)}` : `${rd.total}`;
  g.drawImage(corner('weapon', [spec && spec.id, label].join('|'), 90, 46, cg => drawWeaponCorner(cg, 90, p, spec, rd, label)), W - 90, 0);
}
function drawBars(g, W0, H, p, o, low) {
  const x = 10, y = H - 26, w = 92, P = E.px, v = p.vitals;   // (low: the health bar blinks red)
  const bar = (yy, frac, col, back) => { P.rect(g, x - 1, yy - 1, w + 2, 6, '#05030c'); P.rect(g, x, yy, w, 4, back); P.rect(g, x, yy, Math.round(w * Math.max(0, Math.min(1, frac))), 4, col); };
  bar(y, v.health / 100, low ? '#ff3a3a' : '#5ad84a', '#1e3a1a');
  bar(y + 7, v.armor / 100, '#5ab0ff', '#1a2a3e');
  if (p.ability) { const a = p.ability, on = a.active; bar(y + 14, a.meter, on ? '#ffffff' : (o.color || '#ffe066'), '#2a2438'); E.font.text(g, ABILITIES[a.id].name + (on ? '  ON' : ''), x + w + 6, y + 12, on ? '#ffffff' : (o.color || '#ffe066'), { font: 'tiny', outline: '#05030c' }); }
  if (o.name) E.font.text(g, o.name, x, y - 11, o.color || '#ffe066', { font: 'tiny', outline: '#05030c' });
}
// the weapon in hand (this corner's image is W wide, the screen's top right)
function drawWeaponCorner(g, W, p, spec, rd, label) {
  const rx = W - 10, ry = 22;   // (thrown and special weapons show how many; magazines, what is loaded and what is left)
  E.ui.box(g, rx - 76, ry - 6, 80, 32, { alpha: .6 });
  if (spec && spec.model) drawWeaponIcon(g, spec.model, rx - 38, ry + 8, 2.2); else drawFistIcon(g, rx - 38, ry + 8, 2.4);
  if (label) E.font.text(g, label, rx - 4, ry + 16, p.inv.reloading > 0 ? '#ffd23a' : rd.total ? '#f0ecff' : '#ff5a5a', { align: 'right', font: 'tiny', outline: '#05030c' });
  if (spec) E.font.text(g, spec.name.toUpperCase(), rx - 72, ry - 12, '#c8c0e8', { font: 'tiny', outline: '#05030c' });
}
/** the vehicle panel (bottom left, over the on-foot bars; o.x: right of the radar): its name, its health, the nitro
 *  charges, the station tuned in. A cached corner like the others: redrawn only when something on it changes */
export function drawVehicleHud(g, W, H, v, o = {}) {
  const share = Math.max(0, v.damage.health / v.damage.max), radio = o.radio || '', sig = [v.def.name, Math.round(share * 46), v.mods.nitro, v.nitroT > 0 ? 1 : 0, v.damage.state, radio].join('|');
  g.drawImage(corner('vehicle', sig, 200, 30, cg => {
    const x = 10, y = 8, w = 92, P = E.px, col = share > .4 ? '#ffb43a' : share > .15 ? '#ff7a2a' : '#ff3a3a';
    E.font.text(cg, v.def.name.toUpperCase(), x, y - 6, '#f0ecff', { font: 'tiny', outline: '#05030c' });
    P.rect(cg, x - 1, y + 3, w + 2, 6, '#05030c'); P.rect(cg, x, y + 4, w, 4, '#3a2a1a'); P.rect(cg, x, y + 4, Math.round(w * share), 4, col);
    for (let i = 0; i < Math.min(5, v.mods.nitro); i++) P.rect(cg, x + w + 6 + i * 6, y + 4, 4, 4, v.nitroT > 0 && i === 0 ? '#ffffff' : '#5ac8ff');
    if (radio) E.font.text(cg, radio, x, y + 12, '#c8c0e8', { font: 'tiny', outline: '#05030c' });
  }), o.x || 0, H - 76);
}
/** the aim in the world: a mark over a locked target, a sight along a free aim. Call between stage.begin and end */
export function drawAimMarks(stage, p, t) {
  if (p.dead) return;
  const A = p.aimer;
  if (A.target) {
    const q = A.target, z = (q.z || 0) + CHEST + 18, hurt = q.vitals ? 1 - q.vitals.health / 100 : 0;
    stage.glow(q.x, q.y, z, (g, sx, sy) => {
      const P = E.px, s = 5 + Math.sin(t * 10) * .8, c = hurt > .6 ? '#ff3a3a' : '#ff8a3a';
      P.poly(g, [[sx - s, sy - s * 1.6], [sx + s, sy - s * 1.6], [sx, sy]], '#05030c'); P.poly(g, [[sx - s + 1.5, sy - s * 1.6 + 1], [sx + s - 1.5, sy - s * 1.6 + 1], [sx, sy - 2]], c);
    }, { always: true });
    return;
  }
  if (!p.aiming) return;
  const d = 64, x = p.x + A.dir[0] * d, y = p.y + A.dir[1] * d, z = p.z + CHEST;
  stage.glow(x, y, z, (g, sx, sy) => { const P = E.px; P.rect(g, sx - 4, sy, 3, 1, '#f0ecff'); P.rect(g, sx + 2, sy, 3, 1, '#f0ecff'); P.rect(g, sx, sy - 4, 1, 3, '#f0ecff'); P.rect(g, sx, sy + 2, 1, 3, '#f0ecff'); }, { always: true });
}
