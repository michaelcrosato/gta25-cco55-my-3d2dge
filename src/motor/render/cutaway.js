// The player-relative cut-away (PLAN.md 5.1), for ISO: a building between the camera and the player, near enough to hide
// them, drops to low stubs (its type's cutH) through the patched TileMap's cutAt hook (GTM-PATCH 1). A building drops
// whole (its lot), never a hole in it, and only while it hides the player; MODE 7 cuts its own spans and TOP needs none.
// The engine's own cut rule (the camera-facing row of every 'cut' type) is turned off: the hook answers for every cell.
//   Cut and whole blocks are cached side by side (GTM-PATCH 2), so a building that drops and comes back bakes once.
export class CutAway {
  /** city: a CityMap (its lot grid names each wall cell's building) */
  constructor(city) {
    this.city = city; this.cut = new Set(); this.on = false; this.radius = 13;
    city.map.cutAt = (cx, cy, view) => {
      if (!this.on || !view.inv || view.isTop) return false;
      const lot = city.lot[cy * city.w + cx]; return lot >= 0 && this.cut.has(lot);
    };
  }
  /** pick the buildings that hide a body at (x, y, z) in the engine view: wall cells in front of it (nearer the camera)
   *  whose drawn box covers its sprite on screen. Call each ISO frame, before the walls are queued */
  update(view, x, y, z = 0) {
    this.cut.clear(); this.on = !!view.inv && !view.isTop; if (!this.on) return;
    const C = this.city, T = C.T, map = C.map, s = view.scale, own = view.fx * x + view.fy * y, [px, py] = view.p(x, y, z);
    const bx0 = px - 10 * s, bx1 = px + 10 * s, by0 = py - 40 * s, by1 = py + 2 * s;   // the body's box on screen (about 32 units tall)
    const cx0 = Math.floor(x / T), cy0 = Math.floor(y / T), R = this.radius;
    for (let cy = cy0 - R; cy <= cy0 + R; cy++) for (let cx = cx0 - R; cx <= cx0 + R; cx++) {
      const id = map.cell(cx, cy); if (id <= 0) continue;
      const lot = C.lot[cy * C.w + cx]; if (lot < 0 || this.cut.has(lot)) continue;
      const mx = (cx + .5) * T, my = (cy + .5) * T; if (view.fx * mx + view.fy * my <= own + 6) continue;   // behind or level: never in the way
      const h = C.types[id].h, a = view.p(cx * T, cy * T, 0), b = view.p(cx * T + T, cy * T + T, 0), c = view.p(cx * T + T, cy * T, 0), d = view.p(cx * T, cy * T + T, 0);
      const sx0 = Math.min(a[0], b[0], c[0], d[0]), sx1 = Math.max(a[0], b[0], c[0], d[0]), sy1 = Math.max(a[1], b[1], c[1], d[1]), sy0 = Math.min(a[1], b[1], c[1], d[1]) + view.bz * h;
      if (sx1 > bx0 && sx0 < bx1 && sy1 > by0 && sy0 < by1) this.cut.add(lot);
    }
  }
}
