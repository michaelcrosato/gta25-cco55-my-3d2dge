// The radar (PLAN.md 8.18, 8.13, 8.14): a round map at the bottom left, north-up on foot and turning with the vehicle
// (its heading up), with chunky shaped blips (up and down arrows for what is above or below), the police's search circle
// while they hunt the player and their sight cones (a toggle: TUNE.radarCones), and each gang's turf hatched in its
// colour and pattern. The city under it is baked once into a picture a pixel a tile; everything else is drawn each
// frame from the simulation's state (read only: presentation), the GPS line to the goal under the blips.
//   const R = new Radar(city, { turf });  R.draw(pen, cx, cy, { focus, heading, player, police, blips, route, t }) (the UI layer)
import { E } from '../engine.js';
import { TUNE, knob } from '../core/tune.js';
import { PALETTE } from '../render/surface-paint.js';

knob('HUD', 'radarCones', 'Cop cones on the radar', 1, 0, 1, 1, 'Show the police\'s sight cones on the radar (1) or not (0)');
knob('HUD', 'radarRange', 'Radar range', 560, 200, 1600, 20, 'World units from the radar\'s centre to its rim');
const SURF = { road: '#3a3a44', alley: '#3e3c46', bridge: '#44444c', walk: '#5e5c66', curb: '#5e5c66', plaza: '#6e6458', lot: '#4a4640', yard: '#4c4850',
  grass: '#3e6a38', park: '#40703a', dirt: '#5e4a34', sand: '#9a8a62', water: '#1a3a62', deep: '#132e50', quay: '#55555c', pier: '#5e4630', rail: '#38323a' };

const baked = new WeakMap();
/** the city a pixel a tile (the radar's and the map screen's picture): surfaces, buildings (taller lighter), decks, then
 *  each gang's turf hatched over its hoods in its pattern; made once a city */
export function cityImage(city, turf = []) {
  let img = baked.get(city); if (!img) { img = bake(city, turf); baked.set(city, img); }
  return img;
}
function bake(C, turf) {
  const w = C.w, h = C.h, cv = E.mkCanvas(w, h), g = cv.getContext('2d'), maxH = Math.max(1, ...Object.values(C.types || {}).map(t => t.h || 0));
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
    const id = C.map.cell(cx, cy);
    if (id > 0 && C.types && C.types[id]) { const t = C.types[id]; g.fillStyle = E.shade(t.top || '#6a6a74', -.35 + .4 * (t.h || 0) / maxH); }
    else g.fillStyle = SURF[C.surfaceAt(cx, cy)] || (PALETTE.lot && PALETTE.lot.base) || '#4a4640';
    g.fillRect(cx, cy, 1, 1);
  }
  for (const d of C.decks || []) if (d.kind !== 'rail') for (const c of d.cells || []) { g.fillStyle = '#56565e'; g.fillRect(c.cx, c.cy, 1, 1); }
  for (const T of turf) {
    const hoods = new Set(T.hoods); g.fillStyle = T.color;
    for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
      const hd = C.hoodAt(cx, cy); if (!hd || !hoods.has(hd.id)) continue;
      const on = T.pattern === 'dots' ? cx % 4 === 0 && cy % 4 === 0 : T.pattern === 'checks' ? (cx >> 1) % 3 === 0 && (cy >> 1) % 3 === 0
        : T.pattern === 'rivets' ? (cx % 6 === 0 || cx % 6 === 3) && cy % 6 === (cx % 6 === 0 ? 0 : 3)   // (the Rust Monks': rivets in a staggered grid)
        : T.pattern === 'chevrons' ? (Math.abs((cx % 8) - 4) + cy) % 8 === 0   // (the Volt Boys': chevrons stacked up the map)
        : T.pattern === 'damask' ? ((cx + cy) % 8 === 0 || (cx - cy + 64) % 8 === 0) && (cx + cy) % 2 === 0   // (the Velvet Syndicate's: a diamond lattice)
        : T.pattern === 'bands' ? cy % 5 === 0   // (the Yacht Club's: a sailor's stripes, across)
        : (cx + cy) % 6 === 0;
      if (on) { g.globalAlpha = .45; g.fillRect(cx, cy, 1, 1); g.globalAlpha = 1; }
    }
  }
  return cv;
}

export class Radar {
  /** city: the CityMap; o: { turf: [{ hoods: [ids], color, pattern ('stripes' | 'dots' | 'checks' | 'rivets' | 'chevrons' | 'damask' | 'bands') }], r (radius px) } */
  constructor(city, o = {}) { this.city = city; this.turf = o.turf || []; this.r = o.r || 44; this.img = null; }
  _bake() { this.img = cityImage(this.city, this.turf); }
  /** draw it centred at (cx, cy). o: { focus: [x, y], heading (radians: the vehicle's, or null: north-up), player
   *  ({ x, y, z, facing }), police (Police: its eyes, units, Eye and wanted level), blips ([{ x, y, z, shape, color }]),
   *  t (seconds: blinking) } */
  draw(Pn, cx, cy, o = {}) {
    if (!this.img) this._bake();
    const g = Pn.g;
    const R = this.r, C = this.city, T = C.T, [fx, fy] = o.focus, range = TUNE.radarRange, k = R / range;   // (px per world unit)
    const rot = o.heading === null || o.heading === undefined ? 0 : -o.heading - Math.PI / 2, cs = Math.cos(rot), sn = Math.sin(rot), t = o.t || 0;
    const at = (x, y) => { const dx = (x - fx) * k, dy = (y - fy) * k; return [cx + dx * cs - dy * sn, cy + dx * sn + dy * cs]; };
    g.save();
    E.px.disc(g, cx, cy, R + 3, '#05030c');
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#132e50'; g.fillRect(cx - R, cy - R, R * 2, R * 2); E.px.reset(g);
    // the city, turned
    g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(k * T, k * T); g.imageSmoothingEnabled = false; g.drawImage(this.img, -fx / T, -fy / T); g.restore();
    // the GPS line (o.route: world points from here to the goal): under the blips, outlined
    if (o.route && o.route.length > 1) {
      g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); o.route.forEach((q, i) => { const [x, y] = at(q[0], q[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      g.strokeStyle = '#05030c'; g.lineWidth = 4; g.stroke(); g.strokeStyle = markerColor(o.routeColor || '#ff5ac8'); g.lineWidth = 2; g.stroke();
    }
    const P = o.police, W = P && P.wanted;
    // the police's eyes while the player is wanted (TUNE.radarCones): a cone a body on foot, a faint ring a car or the
    // Eye (they see all round), brighter on an officer who is alert
    if (P && W && W.stars && TUNE.radarCones) {
      for (const e of P.eyes()) {
        const alert = e.state === 'alert', [sx, sy] = at(e.x, e.y), r = e.range * k;
        if (e.fov >= 6.2) { g.strokeStyle = alert ? 'rgba(255,80,80,.55)' : 'rgba(255,110,110,.3)'; g.lineWidth = 1; g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.stroke(); continue; }
        const a = e.facing + rot; g.fillStyle = alert ? 'rgba(255,60,60,.34)' : 'rgba(255,110,110,.18)';
        g.beginPath(); g.moveTo(sx, sy); g.arc(sx, sy, r, a - e.fov / 2, a + e.fov / 2); g.closePath(); g.fill();
      }
    }
    // the search area: a ring round where they last saw the player, pulsing
    if (W && W.stars && !W.seen && W.lastKnown) {
      const [sx, sy] = at(W.lastKnown.x, W.lastKnown.y), r = Math.max(4, W.searchR * k), pulse = .5 + .5 * Math.sin(t * 6);
      g.strokeStyle = `rgba(255,${Math.round(120 + 100 * pulse)},80,.9)`; g.lineWidth = 1.5; g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.stroke();
      g.fillStyle = 'rgba(255,160,80,.10)'; g.fill();
    }
    // the blips: others' first (missions, shops, gangs), then the police (cars red and blue by turns, officers dots,
    // the Eye a diamond), the player's arrow on top
    E.px.reset(g);   // (fills set by hand above: the pixel helpers' colour cache starts over)
    const pz = o.player ? o.player.z || 0 : 0, height = (z, x, y, c) => { const dz = (z || 0) - pz; if (Math.abs(dz) < 20) return; const s = dz > 0 ? -1 : 1; E.px.poly(g, [[x - 2, y + s * -3], [x + 2, y + s * -3], [x, y + s * -5]], c); };
    for (const b of o.blips || []) { const [x, y] = edge(at(b.x, b.y), cx, cy, R - 3, b.edge), c = markerColor(b.color || '#ffe066'); blip(g, x, y, b.shape || 'dot', c); height(b.z, x, y, c); }
    if (P) {
      const blink = Math.floor(t * 4) % 2;
      for (const u of P.units) { const v = u.car.v; const [x, y] = edge(at(v.x, v.y), cx, cy, R - 3, true); blip(g, x, y, 'square', markerColor(blink ? '#ff3a3a' : '#3a7aff')); height(v.z, x, y, '#f0ecff'); }
      for (const b of P.blocks) { const [x, y] = at(b.x, b.y); blip(g, x, y, 'square', '#ff3a3a'); }
      for (const c of P.cops) { if (c.ped.dead || c.ped.seat) continue; const [x, y] = at(c.ped.x, c.ped.y); blip(g, x, y, 'dot', '#6a9aff'); }
      const C2 = P.life && P.life.crowd; if (C2) for (const m of C2.members) { if (m.ped.faction !== 'police' || m.ped.dead) continue; const [x, y] = at(m.ped.x, m.ped.y); blip(g, x, y, 'dot', '#6a9aff'); }
      if (P.heli) { const v = P.heli.v, [x, y] = edge(at(v.x, v.y), cx, cy, R - 3, true); blip(g, x, y, 'diamond', blink ? '#ff3a3a' : '#f0ecff'); }
    }
    if (o.player) {   // (the player: an arrow the way it faces, or up in a vehicle)
      const a = (o.heading === null || o.heading === undefined ? o.player.facing : o.heading) + rot, c = Math.cos(a), s = Math.sin(a);
      E.px.poly(g, [[cx + c * 5, cy + s * 5], [cx - c * 3 - s * 3.5, cy - s * 3 + c * 3.5], [cx - c * 3 + s * 3.5, cy - s * 3 - c * 3.5]], '#05030c');
      E.px.poly(g, [[cx + c * 4, cy + s * 4], [cx - c * 2 - s * 2.5, cy - s * 2 + c * 2.5], [cx - c * 2 + s * 2.5, cy - s * 2 - c * 2.5]], '#f0ecff');
    }
    g.restore(); E.px.reset(g);
    // the rim, and north on it
    g.strokeStyle = '#c8c0e8'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R + .5, 0, Math.PI * 2); g.stroke();
    const na = -Math.PI / 2 + rot, nx = cx + Math.cos(na) * (R + 1), ny = cy + Math.sin(na) * (R + 1);
    E.px.disc(g, nx, ny, 6, '#05030c'); Pn.text('N', nx + 1, ny - 3, '#ffe066', { align: 'center', outline: false });   // (the 5 x 7 font: never the tiny one, PLAN.md 8.18)
  }
}
// a blip pinned to the rim when it lies beyond it (pin: the ones worth chasing off the edge)
function edge(p, cx, cy, R, pin) { const dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy); return d > R && pin ? [cx + dx / d * R, cy + dy / d * R] : p; }
/** the markers' colours for everyone (Settings, Display, Colourblind markers): the gangs' and the map's hues moved onto
 *  the Okabe-Ito palette, told apart with any colour vision; the shapes and the turf's patterns say it as well */
export const MARKERS = { cvd: false };
const CVD = { '#5af0ff': '#56b4e9', '#ffd23a': '#e69f00', '#ff8ac8': '#cc79a7', '#ffe066': '#f0e442', '#5aff8a': '#009e73', '#7aff8a': '#009e73', '#2a8a4a': '#00664a',
  '#ff5a5a': '#d55e00', '#ff3a3a': '#d55e00', '#5a9aff': '#0072b2', '#3a7aff': '#0072b2', '#7af0ff': '#56b4e9', '#ffa23a': '#e69f00', '#ff5a3a': '#d55e00', '#ff8af0': '#cc79a7' };
/** a marker's colour as the player sees it */
export const markerColor = c => (MARKERS.cvd && c && CVD[String(c).toLowerCase()]) || c;
/** a blip by its shape (square, diamond, triangle, circle, cross, bolt, spade, anchor, flag, dot...) in its colour, outlined: the radar's and the map's */
export function drawBlip(g, x, y, shape, c) { blip(g, x, y, shape, markerColor(c)); }
function blip(g, x, y, shape, c) {
  const P = E.px, X = Math.round(x), Y = Math.round(y);
  if (shape === 'square') { P.rect(g, X - 3, Y - 3, 6, 6, '#05030c'); P.rect(g, X - 2, Y - 2, 4, 4, c); }
  else if (shape === 'diamond') { P.poly(g, [[X, Y - 4], [X + 4, Y], [X, Y + 4], [X - 4, Y]], '#05030c'); P.poly(g, [[X, Y - 3], [X + 3, Y], [X, Y + 3], [X - 3, Y]], c); }
  else if (shape === 'triangle') { P.poly(g, [[X, Y - 4], [X + 4, Y + 3], [X - 4, Y + 3]], '#05030c'); P.poly(g, [[X, Y - 2], [X + 2, Y + 2], [X - 2, Y + 2]], c); }
  else if (shape === 'circle') { P.disc(g, X, Y, 4, '#05030c'); P.disc(g, X, Y, 3, c); }
  else if (shape === 'cross') { P.rect(g, X - 2, Y - 4, 4, 9, '#05030c'); P.rect(g, X - 4, Y - 2, 9, 4, '#05030c'); P.rect(g, X - 1, Y - 3, 2, 7, c); P.rect(g, X - 3, Y - 1, 7, 2, c); }
  else if (shape === 'bolt') { P.poly(g, [[X + 2, Y - 5], [X - 4, Y + 1], [X, Y + 1], [X - 2, Y + 5], [X + 4, Y - 1], [X, Y - 1]], '#05030c'); P.poly(g, [[X + 1, Y - 3], [X - 2, Y], [X + 1, Y], [X - 1, Y + 3], [X + 2, Y], [X - 1, Y]], c); }
  else if (shape === 'spade') { P.poly(g, [[X, Y - 5], [X + 5, Y + 1], [X + 1, Y + 2], [X + 2, Y + 4], [X - 2, Y + 4], [X - 1, Y + 2], [X - 5, Y + 1]], '#05030c'); P.poly(g, [[X, Y - 3], [X + 3, Y + 1], [X, Y + 1], [X + 1, Y + 3], [X - 1, Y + 3], [X, Y + 1], [X - 3, Y + 1]], c); }
  else if (shape === 'anchor') { P.rect(g, X - 2, Y - 5, 4, 10, '#05030c'); P.rect(g, X - 4, Y - 3, 9, 3, '#05030c'); P.rect(g, X - 5, Y + 1, 11, 4, '#05030c'); P.rect(g, X - 1, Y - 4, 2, 8, c); P.rect(g, X - 3, Y - 2, 7, 1, c); P.rect(g, X - 4, Y + 2, 2, 2, c); P.rect(g, X + 3, Y + 2, 2, 2, c); P.rect(g, X - 3, Y + 3, 7, 1, c); }
  else if (shape === 'flag') { P.rect(g, X - 3, Y - 5, 2, 10, '#05030c'); P.poly(g, [[X - 1, Y - 5], [X + 5, Y - 2], [X - 1, Y + 1]], '#05030c'); P.poly(g, [[X - 1, Y - 4], [X + 3, Y - 2], [X - 1, Y]], c); P.rect(g, X - 2, Y - 4, 1, 8, c); }
  else { P.rect(g, X - 2, Y - 2, 4, 4, '#05030c'); P.rect(g, X - 1, Y - 1, 2, 2, c); }
}

/** the wanted stars at the top right, under the weapon: outlined, the earned ones gold, flashing while the police search.
 *  right: the last star's right edge; wanted: the Wanted (or null); t: seconds (the blink) */
export function drawWanted(g, right, y, wanted, t) {
  if (!wanted) return;
  const n = wanted.stars, flash = wanted.flashing && Math.floor(t * 3) % 2 === 0, s = 7, gap = 15, x0 = right - 8 - gap * 4;
  g.fillStyle = 'rgba(5,3,12,.45)'; g.fillRect(Math.round(x0 - 10), Math.round(y - 10), gap * 4 + 20, 20);   // (a plate: the stars read over a sign or a bright street)
  for (let i = 0; i < 5; i++) {
    const x = x0 + i * gap, on = i < n;
    star(g, x, y, s + 1.5, on ? '#05030c' : '#8a84a8');   // (the stars not earned: outlines)
    star(g, x, y, s, on ? (flash ? '#8a6a20' : '#ffd23a') : '#1e1a2a');
    if (on && !flash) star(g, x - .5, y - 1, s * .45, '#fff2a0');
  }
}
function star(g, x, y, r, c) { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } E.px.poly(g, pts, c); }
