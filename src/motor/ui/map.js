// The map screen (PLAN.md 8.18): the district as one big map on the UI layer, the pause's first tab. Pan with the left
// stick (the arrows or WASD, a mouse drag), zoom with L2/R2 (- and =, the wheel), △ the legend, ✕ a waypoint at the
// cross (a click: where it lands; ✕ on the waypoint takes it away), □ the blips by kind. The city is the radar's
// picture (a pixel a tile) drawn whole-pixel at each zoom; the blips keep their shapes and colours, and the name of the
// neighbourhood under the cross shows at the foot. A page for a screen with tabs (the pause) or a screen of its own.
//   mapPage(app, { city, turf, blips, player, waypoint, onWaypoint, filters, legend }) -> { body, bodyH, update, legend }
import { E } from '../engine.js';
import { UI } from './tenfoot.js';
import { cityImage, drawBlip } from './radar.js';

const ZOOMS = [1, 1.5, 2, 3, 4], PAN = 220;   // (zoom: times the whole map's fit; pan: UI pixels a second)

/** o: { city, turf, blips: () => [{ x, y, shape, color, label, cat }], player: () => ({ x, y, facing }),
 *  waypoint: () => [x, y] | null, onWaypoint([x, y] | null), filters: [[cat | 'all', label]], legend: [{ shape, color, label }] } */
export function mapPage(app, o) {
  const C = o.city, T = C.T, B = app.bindings, filters = o.filters || [['all', 'ALL']];
  const st = { cx: null, cy: null, z: 0, legend: false, filter: 0, drag: null, box: null, mouse: false, mx: 0, my: 0 };
  const view = () => { const b = st.box; if (!b) return null; const k = Math.min(b.w / C.w, b.h / C.h) * ZOOMS[st.z]; return { k, ox: b.x + b.w / 2 - st.cx / T * k, oy: b.y + b.h / 2 - st.cy / T * k }; };
  const toWorld = (sx, sy) => { const v = view(); return v ? [(sx - v.ox) / v.k * T, (sy - v.oy) / v.k * T] : null; };
  // the centre kept so the map fills the box where it can (a zoomed-out map sits in the middle)
  const clampCentre = () => {
    const b = st.box; if (!b) return; const k = Math.min(b.w / C.w, b.h / C.h) * ZOOMS[st.z], hw = b.w / 2 / k * T, hh = b.h / 2 / k * T, W = C.w * T, H = C.h * T;
    st.cx = hw * 2 >= W ? W / 2 : E.clamp(st.cx, hw, W - hw); st.cy = hh * 2 >= H ? H / 2 : E.clamp(st.cy, hh, H - hh);
  };
  const zoom = (d, at) => {
    const z = E.clamp(st.z + d, 0, ZOOMS.length - 1); if (z === st.z) return 'error';
    const before = at && toWorld(at[0], at[1]); st.z = z;
    if (before) { const v = view(); st.cx += (before[0] - ((at[0] - v.ox) / v.k * T)); st.cy += (before[1] - ((at[1] - v.oy) / v.k * T)); }   // (the point under the mouse stays put)
    clampCentre(); return 'move';
  };
  const target = () => st.mouse && st.box ? toWorld(st.mx, st.my) : [st.cx, st.cy];
  const setWaypoint = at => {
    const w = o.waypoint && o.waypoint(), v = view();
    if (w && v && Math.hypot((w[0] - at[0]) / T * v.k, (w[1] - at[1]) / T * v.k) < 8) { o.onWaypoint(null); return 'back'; }   // (✕ on the waypoint: gone)
    o.onWaypoint([Math.round(at[0]), Math.round(at[1])]); return 'confirm';
  };
  const shown = () => { const f = filters[st.filter][0]; return (o.blips ? o.blips() : []).filter(b => f === 'all' || b.cat === f); };
  const page = {
    id: 'map', w: 9999,
    legend: '{menu:confirm} WAYPOINT   {menu:secondary} LEGEND   {menu:tertiary} FILTER   {menu:zoomOut}{menu:zoomIn} ZOOM',
    enter() { const p = o.player && o.player(); st.cx = p ? p.x : C.w * T / 2; st.cy = p ? p.y : C.h * T / 2; st.mouse = false; },
    bodyH: P => Math.max(80, P.safe[3] - P.safe[1] - 30 - 22 - 26 - 8 - (P.legendExtra || 0)),   // (the screen's legend on two lines: a line less)
    update(nav, mouse, dt) {
      if (st.cx === null) page.enter();
      let sound = null;
      const [dx, dy] = B.direction('menu'), k = view() ? view().k : 1;
      if (dx || dy) { st.cx += dx * PAN * dt / k * T; st.cy += dy * PAN * dt / k * T; st.mouse = false; clampCentre(); }
      if (B.tap('zoomIn', 'menu')) sound = zoom(1); if (B.tap('zoomOut', 'menu')) sound = zoom(-1);
      if (nav.secondary) { st.legend = !st.legend; sound = 'move'; }
      if (nav.tertiary) { st.filter = (st.filter + 1) % filters.length; sound = 'move'; }
      if (nav.confirm) sound = setWaypoint(target());
      // the mouse: over the map it is the cross; the wheel zooms where it points; a drag pans; a click (no drag) sets the waypoint
      const b = st.box, over = b && mouse.x !== null && mouse.x >= b.x && mouse.x < b.x + b.w && mouse.y >= b.y && mouse.y < b.y + b.h;
      if (over && mouse.moved) { st.mouse = true; st.mx = mouse.x; st.my = mouse.y; }
      if (over && mouse.wheel) sound = zoom(mouse.wheel < 0 ? 1 : -1, [mouse.x, mouse.y]);
      if (over && mouse.click) st.drag = { x: mouse.x, y: mouse.y, moved: 0 };
      if (st.drag && mouse.down && mouse.x !== null) { const ddx = mouse.x - st.drag.x, ddy = mouse.y - st.drag.y; st.drag.moved += Math.abs(ddx) + Math.abs(ddy); st.cx -= ddx / k * T; st.cy -= ddy / k * T; st.drag.x = mouse.x; st.drag.y = mouse.y; clampCentre(); }
      if (st.drag && mouse.up) { if (st.drag.moved < 3 && over) sound = setWaypoint(toWorld(mouse.x, mouse.y)); st.drag = null; }
      return sound;
    },
    body(P, x, y, w) {
      const h = page.bodyH(P), g = P.g, first = !st.box; st.box = { x, y, w, h };
      if (st.cx === null) page.enter(); if (first) clampCentre();
      const v = view(), img = cityImage(C, o.turf || []);
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
      P.fill(x, y, w, h, '#0b1a30');
      g.imageSmoothingEnabled = false; g.drawImage(img, Math.round(v.ox), Math.round(v.oy), Math.round(C.w * v.k), Math.round(C.h * v.k));
      const at = (wx, wy) => [v.ox + wx / T * v.k, v.oy + wy / T * v.k];
      for (const bl of shown()) { const [sx, sy] = at(bl.x, bl.y); if (sx > x - 6 && sx < x + w + 6 && sy > y - 6 && sy < y + h + 6) drawBlip(g, sx, sy, bl.shape || 'square', bl.color || UI.accent); }
      const wp = o.waypoint && o.waypoint();
      if (wp) { const [sx, sy] = at(wp[0], wp[1]); drawBlip(g, sx, sy, 'flag', UI.cyan); }
      const p = o.player && o.player();
      if (p) { const [sx, sy] = at(p.x, p.y), a = p.facing || 0, c = Math.cos(a), s = Math.sin(a); E.px.poly(g, [[sx + c * 6, sy + s * 6], [sx - c * 4 - s * 4, sy - s * 4 + c * 4], [sx - c * 4 + s * 4, sy - s * 4 - c * 4]], '#05030c'); E.px.poly(g, [[sx + c * 5, sy + s * 5], [sx - c * 3 - s * 3, sy - s * 3 + c * 3], [sx - c * 3 + s * 3, sy - s * 3 - c * 3]], '#f0ecff'); }
      // the cross: the middle, or where the mouse points
      const [cx, cy] = st.mouse ? [Math.round(st.mx), Math.round(st.my)] : [Math.round(x + w / 2), Math.round(y + h / 2)];
      P.fill(cx - 6, cy, 4, 1, UI.accent); P.fill(cx + 3, cy, 4, 1, UI.accent); P.fill(cx, cy - 6, 1, 4, UI.accent); P.fill(cx, cy + 3, 1, 4, UI.accent);
      g.restore(); E.px.reset(g);
      P.rec.rect('map', x, y, w, h);
      const wc = toWorld(cx, cy), hood = wc && C.hoodAtPoint ? C.hoodAtPoint(wc[0], wc[1]) : null;
      P.text((hood ? hood.name : 'LOWTOWN').toUpperCase(), x + 6, y + h - 12, UI.ink);
      P.text('SHOWING ' + filters[st.filter][1] + '   ' + Math.round(ZOOMS[st.z] * 100) + '%', x + w - 6, y + 4, UI.dim, { align: 'right' });
      if (st.legend && o.legend) {
        // (a map too short for the legend in one column, at HUD size Huge: in two or more, clear of the hood's name)
        const rows = o.legend.slice(0, 8), per = Math.max(1, Math.min(rows.length, Math.floor((h - 30) / 12))), cols = Math.ceil(rows.length / per);
        const cw = cols > 1 ? 28 + Math.max(...rows.map(r => P.width(r.label.toUpperCase()))) : 128, lw = cw * cols, lh = Math.min(rows.length, per) * 12 + 10, lx = x + 6, ly = y + 6;
        P.panel(lx, ly, lw, lh, { kind: 'legend' });
        rows.forEach((r, i) => { const cx = lx + Math.floor(i / per) * cw, cy = ly + (i % per) * 12; drawBlip(g, cx + 10, cy + 10, r.shape, r.color); P.text(r.label.toUpperCase(), cx + 20, cy + 7, UI.ink); });
        E.px.reset(g);
      }
      return h;
    },
  };
  return page;
}
