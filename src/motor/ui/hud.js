// The HUD (PLAN.md 8.18) on the UI layer, inside the safe area, in the 5 x 7 font (never the 3 x 5): health, armour
// and the ability meter at the bottom left under the radar, the weapon in hand and its rounds at the top right over the
// wanted stars, the vehicle's panel at the bottom right; the lock-on's mark and the free aim's sight in the world (drawn
// through the Stage, so they sit right in every view). Each corner is drawn into an image of its own and redrawn only
// when what it shows changes (the pixel font draws a rectangle a pixel: a HUD redrawn every frame costs the city's
// lighting budget); its text runs are recorded every frame all the same, for the UI audit.
import { E } from '../engine.js';
import { drawWeaponIcon, drawFistIcon } from '../render/weapon-models.js';
import { CHEST } from '../combat/aim.js';
import { ABILITIES } from '../combat/abilities.js';

const CORNERS = new Map(), OUT = '#05030c';
/** a plate behind a run of the HUD's words: over a neon sign, a white crossing or a pale wall they still read (X8's look) */
export const PLATE = 'rgba(5,3,12,.55)';
export function plate(g, x, y, w, h) { g.fillStyle = PLATE; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
/** a cached corner drawn at (x, y): draw(g, text) paints it, text(s, x, y, color, o) its words (recorded) */
function corner(P, key, sig, w, h, x, y, draw) {
  let c = CORNERS.get(key);
  if (!c) { c = { cv: E.mkCanvas(w, h), sig: null, texts: [] }; CORNERS.set(key, c); }
  if (c.cv.width !== w || c.cv.height !== h) { c.cv.width = w; c.cv.height = h; c.sig = null; }
  if (c.sig !== sig) {
    const g = c.cv.getContext('2d'); g.clearRect(0, 0, w, h); g.imageSmoothingEnabled = false; c.texts = [];
    draw(g, (s, tx, ty, color, o = {}) => { const r = E.font.text(g, s, tx, ty, color, { outline: OUT, ...o }), tw = r ? r.w : E.font.width(s); c.texts.push({ s, x: o.align === 'right' ? tx - tw : o.align === 'center' ? tx - tw / 2 : tx, y: ty, w: tw, h: 7 }); });
    g._c = null; c.sig = sig;
  }
  P.g.drawImage(c.cv, Math.round(x), Math.round(y));
  for (const t of c.texts) P.rec.text(t.s, Math.round(x + t.x), Math.round(y + t.y), t.w, t.h, 1, 'normal');
}
/** where the HUD's parts sit on a screen, in UI pixels: the radar's centre and radius, the bars, the weapon, the stars,
 *  a job's timer (all inside the safe area) */
export function hudLayout(P) {
  const [sx0, sy0, sx1, sy1] = P.safe, R = Math.max(26, Math.min(44, Math.round(P.H * .163)));   // (the radar a sixth of the screen's height: smaller at the larger HUD sizes)
  return { sx0, sy0, sx1, sy1, R, radar: [sx0 + R + 3, sy1 - 38 - R - 4], bars: [sx0, sy1 - 34], weapon: [sx1, sy0], stars: [sx1, sy0 + 66], timer: [sx1, sy0 + 80] };
}
/** health, armour and the ability at the bottom left (o.name: the protagonist and the cash, o.color theirs); the weapon
 *  in hand and its rounds at the top right */
export function drawPedHud(P, p, o = {}) {
  const L = hudLayout(P), v = p.vitals, a = p.ability, spec = p.inv.spec(), rd = p.inv.rounds();
  const low = v.health < 25 && Math.floor((E.current ? E.current.real : 0) * 4) % 2;
  const named = !!a && L.sx0 + 102 + E.font.width(ABILITIES[a.id].name + '  ON') <= P.W / 2 - 64;   // (the ability's name beside its bar where the foot's prompt leaves room)
  const bars = [Math.round(v.health), Math.round(v.armor), a ? Math.round(a.meter * 92) : -1, a && a.active ? 1 : 0, low ? 1 : 0, o.name || '', o.color || '', named ? 1 : 0].join('|');
  corner(P, 'bars', bars, 230, 34, L.bars[0], L.bars[1], (g, T) => {
    const x = 0, y = 12, w = 92, X = E.px;   // (low: the health bar blinks red)
    const bar = (yy, frac, col, back) => { X.rect(g, x, yy - 1, w + 2, 6, OUT); X.rect(g, x + 1, yy, w, 4, back); X.rect(g, x + 1, yy, Math.round(w * Math.max(0, Math.min(1, frac))), 4, col); };
    if (o.name) { plate(g, x, 0, E.font.width(o.name) + 4, 9); T(o.name, x + 1, 1, o.color || '#ffe066'); }
    bar(y, v.health / 100, low ? '#ff3a3a' : '#5ad84a', '#1e3a1a');
    bar(y + 7, v.armor / 100, '#5ab0ff', '#1a2a3e');
    if (a) { const on = a.active; bar(y + 14, a.meter, on ? '#ffffff' : (o.color || '#ffe066'), '#2a2438'); if (named) T(ABILITIES[a.id].name.toUpperCase() + (on ? '  ON' : ''), x + w + 8, y + 11, on ? '#ffffff' : (o.color || '#ffe066')); }
  });
  const label = !rd ? '' : p.inv.reloading > 0 ? 'RELOAD' : spec.mag ? `${rd.mag} / ${Math.max(0, rd.total - rd.mag)}` : `${rd.total}`;
  corner(P, 'weapon', [spec && spec.id, label].join('|'), 100, 56, L.weapon[0] - 100, L.weapon[1], (g, T) => {
    const rx = 100;   // (thrown and special weapons show how many; magazines, what is loaded and what is left)
    if (spec) { const s = spec.name.toUpperCase(); plate(g, rx - E.font.width(s) - 4, 0, E.font.width(s) + 4, 9); T(s, rx - 1, 1, '#c8c0e8', { align: 'right' }); }
    E.ui.box(g, rx - 84, 10, 84, 36, { alpha: .78 });   // (.6 had shown a sign behind it as plainly as the gun)
    if (spec && spec.model) drawWeaponIcon(g, spec.model, rx - 42, 26, 2.2); else drawFistIcon(g, rx - 42, 26, 2.4);
    if (label) T(label, rx - 4, 37, p.inv.reloading > 0 ? '#ffd23a' : rd.total ? '#f0ecff' : '#ff5a5a', { align: 'right' });
  });
}
/** a vehicle's speed in miles an hour (a storey is 24 u, about 3 m: 8 u a metre) */
export const mph = speed => Math.round(speed / 8 * 2.237);
/** the vehicle's panel at the bottom right: its name, its health, the nitro charges, the station tuned in; o.speedo:
 *  its speed too (Settings, Display) */
export function drawVehicleHud(P, v, o = {}) {
  const L = hudLayout(P), share = Math.max(0, v.damage.health / v.damage.max), radio = o.radio || '', speed = o.speedo ? mph(v.speed) + ' MPH' : '', sig = [v.def.name, Math.round(share * 46), v.mods.nitro, v.nitroT > 0 ? 1 : 0, v.damage.state, radio, speed].join('|');
  corner(P, 'vehicle', sig, 150, 34, L.sx1 - 150, L.sy1 - 34, (g, T) => {
    const w = 92, x = 150 - w - 2, X = E.px, col = share > .4 ? '#ffb43a' : share > .15 ? '#ff7a2a' : '#ff3a3a';
    T(v.def.name.toUpperCase(), 148, 0, '#f0ecff', { align: 'right' });
    if (speed) T(speed, 0, 0, '#ffe066');
    X.rect(g, x - 1, 11, w + 2, 6, OUT); X.rect(g, x, 12, w, 4, '#3a2a1a'); X.rect(g, x, 12, Math.round(w * share), 4, col);
    for (let i = 0; i < Math.min(5, v.mods.nitro); i++) X.rect(g, x - 8 - i * 6, 12, 4, 4, v.nitroT > 0 && i === 0 ? '#ffffff' : '#5ac8ff');
    if (radio) T(radio, 148, 22, '#c8c0e8', { align: 'right' });
  });
}
/** the aim in the world: a mark over a locked target, a sight along a free aim. Call between stage.begin and end */
export function drawAimMarks(stage, p, t) {
  if (p.dead) return;
  const A = p.aimer;
  if (A.target) {
    const q = A.target, z = (q.z || 0) + CHEST + 18, hurt = q.vitals ? 1 - q.vitals.health / 100 : 0;
    stage.glow(q.x, q.y, z, (g, sx, sy) => {
      const X = E.px, s = 5 + Math.sin(t * 10) * .8, c = hurt > .6 ? '#ff3a3a' : '#ff8a3a';
      X.poly(g, [[sx - s, sy - s * 1.6], [sx + s, sy - s * 1.6], [sx, sy]], OUT); X.poly(g, [[sx - s + 1.5, sy - s * 1.6 + 1], [sx + s - 1.5, sy - s * 1.6 + 1], [sx, sy - 2]], c);
    }, { always: true });
    return;
  }
  if (!p.aiming) return;
  const d = 64, x = p.x + A.dir[0] * d, y = p.y + A.dir[1] * d, z = p.z + CHEST;
  stage.glow(x, y, z, (g, sx, sy) => { const X = E.px; X.rect(g, sx - 4, sy, 3, 1, '#f0ecff'); X.rect(g, sx + 2, sy, 3, 1, '#f0ecff'); X.rect(g, sx, sy - 4, 1, 3, '#f0ecff'); X.rect(g, sx, sy + 2, 1, 3, '#f0ecff'); }, { always: true });
}
/** the width the foot of the screen leaves between the radar and the vehicle's panel, for the lines drawn there */
export function footWidth(P) { const L = hudLayout(P); return Math.max(160, P.W - 2 * (L.sx0 + 2 * L.R + 12)); }
/** a subtitle at the foot (y: its band's top): the speaker's name in their colour, then the line, wrapped to the foot's
 *  width (two lines at most) on a dark band. Returns its height */
export function drawSubtitle(P, name, color, line, y) {
  const w = footWidth(P), head = name ? String(name).toUpperCase() + ':' : '', words = String(line).split(' '), rows = [];
  let cur = head;
  for (const word of words) { const t = cur ? cur + ' ' + word : word; if (P.width(t) > w - 12 && cur) { rows.push(cur); cur = word; } else cur = t; }
  if (cur) rows.push(cur);
  const shown = rows.slice(0, 2), bw = Math.min(w, Math.max(...shown.map(r => P.width(r))) + 12), cx = P.W / 2;
  P.fill(cx - bw / 2, y - 3, bw, shown.length * 10 + 5, OUT, .72);
  shown.forEach((r, i) => {
    const x0 = Math.round(cx - P.width(r) / 2), yy = y + i * 10;
    if (i === 0 && head && r.startsWith(head)) { P.text(head, x0, yy, color || '#ffe066'); P.text(r.slice(head.length), x0 + P.width(head), yy, '#f0ecff'); }
    else P.text(r, x0, yy, '#f0ecff');
  });
  return shown.length * 10 + 5;
}
