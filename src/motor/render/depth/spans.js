// Box spans (PLAN.md 8.5): a TileMap's wall cells merged into maximal rectangles of one type (so one height), per
// chunk, for the depth views. A span is { x0, y0, x1, y1 } in world units (x1, y1 exclusive), its height h and its wall
// type id and type. Spans never cross a chunk's edge, so each chunk's list is built once, on demand, and rebuilt
// when the map's version moves. The ISO view never uses them: it draws the engine's own wall blocks.
export class Spans {
  /** map: the TileMap; size: the chunk size in world units (FloorChunks' 256) */
  constructor(map, size = 256) { this.map = map; this.size = size; this.cells = Math.round(size / map.T); this.cache = new Map(); this.version = map.version; }
  /** the spans of chunk (i, j) */
  chunk(i, j) {
    const M = this.map; if (M.version !== this.version) { this.cache.clear(); this.version = M.version; }
    const k = j * 4096 + i; let list = this.cache.get(k); if (list) return list;
    const n = this.cells, c0 = i * n, r0 = j * n, c1 = Math.min(M.w, c0 + n), r1 = Math.min(M.h, r0 + n), T = M.T;
    // runs along each row, then runs with the same columns and type in consecutive rows merge downwards
    const open = new Map(); list = [];
    for (let cy = r0; cy <= r1; cy++) {
      const runs = new Map();
      if (cy < r1) for (let cx = c0; cx < c1;) {
        const id = M.cell(cx, cy); if (id <= 0) { cx++; continue; }
        let e = cx + 1; while (e < c1 && M.cell(e, cy) === id) e++;
        runs.set(cx + ',' + e + ',' + id, [cx, e, id]); cx = e;
      }
      for (const [key, s] of open) if (runs.has(key)) { s.y1 += T; runs.delete(key); } else { open.delete(key); list.push(s); }
      for (const [key, [a, b, id]] of runs) open.set(key, { x0: a * T, y0: cy * T, x1: b * T, y1: (cy + 1) * T, id, t: M.types[id], h: M.types[id].h });
    }
    this.cache.set(k, list); return list;
  }
  /** every span of the chunks [i0, j0, i1, j1] (clamped to the map) */
  range(i0, j0, i1, j1) {
    const out = [], ni = Math.ceil(this.map.w / this.cells), nj = Math.ceil(this.map.h / this.cells);
    for (let j = Math.max(0, j0); j <= Math.min(nj - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(ni - 1, i1); i++) for (const s of this.chunk(i, j)) out.push(s);
    return out;
  }
}
