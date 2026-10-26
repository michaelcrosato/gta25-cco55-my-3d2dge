// The city builder (PLAN.md 8.3): a district definition and a seed in, a CityMap out, deterministically and headless.
//   1. neighbourhoods paint the hood grid; water paints sea, harbour, canal and ponds;
//   2. roads paint their sidewalks, then their carriageways (so crossings cut through sidewalks); a road over water is a
//      bridge (its outer sidewalk row a railing); intersections and crosswalks come from where the bands overlap;
//   3. the ground left over falls into blocks; landmark lots claim their rectangles, then each block is filled with
//      lots in its neighbourhood's style (a greedy fill, seeded), alleys between some;
//   4. building lots become wall cells of generated wall types (facades, roofs, windows per style and storeys);
//   5. decks (the Loop, the L) are rasterized with ramps, pillars and railings; peds get raised solids (8-unit treads
//      on ramps: the engine's step is 2), vehicles read deckAt;
//   6. props by rule (lamps, hydrants, trees, benches, bins, payphones) become solids in one addSolids call;
//   7. points of interest and zones; then the TileMap.
// Everything random comes from streams seeded by (seed, a name), so a definition and a seed always give the same city.
import { E } from '../engine.js';
import { CityMap, Deck, SURF, SURFACES } from './citymap.js';
import { hash32 } from '../core/rng.js';

/** road kinds: carriageway width (tiles), sidewalk width each side, lanes, a median */
export const ROAD_KINDS = { avenue: { width: 9, walk: 2, lanes: 4, median: true }, street: { width: 5, walk: 2, lanes: 2 }, alley: { width: 3, walk: 0, lanes: 1 } };

/** a seeded stream (the builder's own: the world's RNG streams are for the simulation) */
function stream(seed, name) {
  const next = E.rng(hash32(seed, 'build', name));
  return { next, int: (a, b) => a + Math.floor((b - a + 1) * next()), range: (a, b) => a + (b - a) * next(), pick: l => l[Math.floor(next() * l.length)], chance: p => next() < p };
}

/** a one-way street's direction along its axis: +1 the way its cells count up (south on a north-south road, east on an
 *  east-west one), -1 the other way; 0 two-way. r.oneway: 'N' | 'S' | 'E' | 'W' */
export function onewaySign(r) { const o = r.oneway; if (!o) return 0; return r.axis === 'y' ? (o === 'S' ? 1 : o === 'N' ? -1 : 0) : (o === 'E' ? 1 : o === 'W' ? -1 : 0); }
/** build spec (a districts registry entry: { id, size: [w, h], seed, hoods, hoodMap, water, roads, decks, lots, styles,
 *  props, pois, zones, signs }) into a CityMap */
/** the prop kinds a vehicle knocks over instead of stopping at */
export const BREAKABLE = new Set(['lamp', 'hydrant', 'bin', 'bench', 'newsstand', 'payphone']);
export function buildDistrict(spec, o = {}) {
  const seed = o.seed ?? spec.seed ?? 1, [W, H] = spec.size, C = new CityMap(W, H, 16), T = 16;
  C.id = spec.id; C.seed = seed; C.spec = spec;
  const cells = new Int32Array(W * H), used = new Uint8Array(W * H), taken = new Uint8Array(W * H);   // wall type per cell; claimed by anything; 1 water, 2 a road
  const types = {}; let nextType = 1;
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H, I = (x, y) => y * W + x;
  const rect = (r, fn) => { for (let y = Math.max(0, r[1]); y <= Math.min(H - 1, r[3]); y++) for (let x = Math.max(0, r[0]); x <= Math.min(W - 1, r[2]); x++) fn(x, y, I(x, y)); };

  // 1. neighbourhoods and water
  const hoodIds = Object.keys(spec.hoods || {});
  C.hoods = hoodIds.map((id, i) => ({ id, index: i, ...spec.hoods[id] }));
  for (const [x0, y0, x1, y1, id] of spec.hoodMap || []) rect([x0, y0, x1, y1], (x, y, i) => { C.hood[i] = hoodIds.indexOf(id); });
  for (const w of spec.water || []) rect(w.rect, (x, y, i) => { C.surface[i] = SURF[w.deep === false ? 'water' : 'deep']; used[i] = 1; taken[i] = 1; });

  // 2. roads: sidewalks first, then carriageways; over water, a bridge with railings
  C.roads = (spec.roads || []).map((r, n) => {
    const k = ROAD_KINDS[r.kind] || ROAD_KINDS.street, half = (k.width - 1) / 2, ns = r.axis === 'y';
    const band = ns ? [r.at - half, r.from, r.at + half, r.to] : [r.from, r.at - half, r.to, r.at + half];
    const walks = k.walk ? (ns ? [[band[0] - k.walk, band[1], band[0] - 1, band[3]], [band[2] + 1, band[1], band[2] + k.walk, band[3]]] : [[band[0], band[1] - k.walk, band[2], band[1] - 1], [band[0], band[3] + 1, band[2], band[3] + k.walk]]) : [];
    return { id: r.id || r.kind + n, kind: r.kind, axis: r.axis, at: r.at, from: r.from, to: r.to, band, walks, lanes: k.lanes, median: !!k.median, width: k.width, name: r.name || '', oneway: onewaySign(r) };
  });
  const water = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) water[i] = C.surface[i] === SURF.water || C.surface[i] === SURF.deep ? 1 : 0;
  const railings = [];
  for (const r of C.roads) for (const w of r.walks) rect(w, (x, y, i) => { if (water[i]) { C.surface[i] = SURF.bridge; railings.push([x, y, r]); } else if (C.surface[i] !== SURF.road) C.surface[i] = SURF[r.kind === 'alley' ? 'alley' : 'walk']; used[i] = 1; taken[i] = 2; });
  for (const r of C.roads) rect(r.band, (x, y, i) => { C.surface[i] = water[i] ? SURF.bridge : SURF[r.kind === 'alley' ? 'alley' : 'road']; used[i] = 1; taken[i] = 2; });
  // a bridge's outer sidewalk row is its railing: walls a car can't drive off
  for (const [x, y, r] of railings) {
    const outer = r.axis === 'y' ? (x === r.walks[0][0] || x === r.walks[1][2]) : (y === r.walks[0][1] || y === r.walks[1][3]);
    if (outer && C.surface[I(x, y)] === SURF.bridge) cells[I(x, y)] = -2;   // (a railing type, made below)
  }
  // drawbridges: a bridge's span split into two leaves hinged at the banks (world/drawbridge.js lifts them); the water
  // shows under them (the painter's mask), and their railings ride on the leaves, not as walls
  C.drawbridges = []; C.drawMask = new Uint8Array(W * H);
  for (const B of spec.drawbridges || []) {
    const [x0, y0, x1, y1] = B.rect, ns = (B.axis || 'y') === 'y';
    rect(B.rect, (x, y, i) => { C.drawMask[i] = 1; if (cells[i] === -2) cells[i] = 0; });
    const mid = ns ? Math.floor((y0 + y1) / 2) : Math.floor((x0 + x1) / 2);
    const leaves = ns ? [{ rect: [x0, y0, x1, mid], hinge: 'n' }, { rect: [x0, mid + 1, x1, y1], hinge: 's' }] : [{ rect: [x0, y0, mid, y1], hinge: 'w' }, { rect: [mid + 1, y0, x1, y1], hinge: 'e' }];
    C.drawbridges.push({ id: B.id, rect: B.rect.slice(), axis: ns ? 'y' : 'x', leaves, every: B.every, up: B.up });
  }
  // intersections (carriageway overlaps) and crosswalks (a carriageway across another road's sidewalk)
  for (const a of C.roads) for (const b of C.roads) if (a.axis === 'y' && b.axis === 'x') {
    const ix = [Math.max(a.band[0], b.band[0]), Math.max(a.band[1], b.band[1]), Math.min(a.band[2], b.band[2]), Math.min(a.band[3], b.band[3])];
    if (ix[0] <= ix[2] && ix[1] <= ix[3]) C.intersections.push({ rect: ix, roads: [a.id, b.id], signals: a.kind === 'avenue' && b.kind === 'avenue' ? 'signal' : a.kind === 'avenue' || b.kind === 'avenue' ? 'signal' : 'stop' });
  }
  C.crosswalks = [];
  for (const a of C.roads) for (const b of C.roads) if (a !== b && a.axis !== b.axis && a.kind !== 'alley') for (const w of b.walks) {
    const cw = [Math.max(a.band[0], w[0]), Math.max(a.band[1], w[1]), Math.min(a.band[2], w[2]), Math.min(a.band[3], w[3])];
    if (cw[0] <= cw[2] && cw[1] <= cw[3] && !water[I(cw[0], cw[1])]) C.crosswalks.push({ rect: cw, axis: a.axis, road: a.id });
  }
  C.busy = new Uint8Array(W * H);   // 1: an intersection, 2: a crosswalk (no lane paint there; traffic stops short of a crosswalk)
  for (const n of C.intersections) rect(n.rect, (x, y, i) => { C.busy[i] = 1; });
  for (const w of C.crosswalks) rect(w.rect, (x, y, i) => { C.busy[i] = 2; });

  // 3. landmark lots, then blocks filled by style
  const rs = stream(seed, 'lots');
  const addLot = (lot) => {
    lot.index = C.lots.length; C.lots.push(lot);
    const overWater = lot.kind === 'pier' || lot.surface === 'pier' || lot.surface === 'quay';
    rect(lot.rect, (x, y, i) => {
      if (taken[i] === 2 || (taken[i] === 1 && !overWater && !lot.onWater)) return;   // never over a road; over water only a pier or quay
      used[i] = 1; C.lot[i] = lot.index; if (lot.surface) C.surface[i] = SURF[lot.surface];
      if (lot.kind === 'building') taken[i] = 3;
      else if (overWater && taken[i] === 1) taken[i] = 0;   // (a pier's planks: ground a building can stand on, the boathouse's, the lighthouse's)
    });
    return lot;
  };
  for (const L of spec.lots || []) addLot({ ...L, rect: L.rect.slice(), landmark: L.landmark || true, hood: C.hoods[C.hood[I(L.rect[0], L.rect[1])]]?.id });
  // blocks: 4-connected regions of unclaimed ground
  const seen = new Uint8Array(W * H); C.blocks = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i0 = I(x, y); if (used[i0] || seen[i0]) continue;
    const list = [], q = [i0]; seen[i0] = 1; let x0 = x, y0 = y, x1 = x, y1 = y;
    while (q.length) { const i = q.pop(), cx = i % W, cy = (i - cx) / W; list.push(i); x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (!inside(nx, ny)) continue; const j = I(nx, ny); if (!used[j] && !seen[j]) { seen[j] = 1; q.push(j); } } }
    C.blocks.push({ rect: [x0, y0, x1, y1], cells: list.sort((a, b) => a - b), hood: C.hoods[C.hood[i0]]?.id });   // (row by row: lots grow from the top left)
  }
  for (const b of C.blocks) fillBlock(b);
  function fillBlock(b) {
    const hood = C.hoods.find(h => h.id === b.hood), style = (spec.styles || {})[(hood && hood.style) || 'default'] || DEFAULT_STYLE;
    const free = new Set(b.cells), isFree = (x, y) => free.has(I(x, y));
    for (const i of b.cells) { const x = i % W, y = (i - x) / W; if (!free.has(i)) continue;
      // grow a lot from here: a width and a depth from the style, cut short by what is taken
      const kind = pickWeighted(rs, style.kinds), k = style.lots[kind];
      let w = rs.int(k.w[0], k.w[1]), d = rs.int(k.d[0], k.d[1]);
      let mw = 0; while (mw < w && isFree(x + mw, y)) mw++;
      let md = 0; outer: while (md < d) { for (let dx = 0; dx < mw; dx++) if (!isFree(x + dx, y + md)) break outer; md++; }
      // a sliver too thin for its own lot joins the block's yard or courtyard
      const lot = { rect: [x, y, x + mw - 1, y + md - 1], kind: k.kind || 'building', style: kind, hood: b.hood };
      if (mw < 2 || md < 2) { lot.kind = 'yard'; lot.surface = style.filler || 'yard'; }
      else if (k.kind === 'building') lot.storeys = rs.int(k.storeys[0], k.storeys[1]);
      for (let yy = lot.rect[1]; yy <= lot.rect[3]; yy++) for (let xx = lot.rect[0]; xx <= lot.rect[2]; xx++) free.delete(I(xx, yy));
      if (lot.kind === 'building' && style.alleys && rs.chance(style.alleys) && mw > 4) { lot.rect[2]--; lot.alley = true; }   // a gap to the next lot
      addLot(lot);
      if (lot.alley) rect([lot.rect[2] + 1, lot.rect[1], lot.rect[2] + 1, lot.rect[3]], (xx, yy, ii) => { C.surface[ii] = SURF.alley; C.lot[ii] = -1; });
    }
  }

  // 4. buildings: a wall type per lot style and storeys (shared by lots that look alike, with variants)
  const typeKey = new Map(), STOREY = spec.storey || 24;
  // A building's cells inside its outline get a twin type that looks the same whole but cuts lower: cut away (ISO), the
  // outline stays as stub walls round the floor inside (cutTop, in the style's floor color), like a doll's house
  const wallType = (lot, inner) => {
    const st = (spec.styles || {})[(C.hoods.find(h => h.id === lot.hood) || {}).style || 'default'] || DEFAULT_STYLE;
    const look = lot.look || (st.lots[lot.style] && st.lots[lot.style].looks ? rs.pick(st.lots[lot.style].looks) : st.looks ? rs.pick(st.looks) : DEFAULT_LOOK);
    const h = lot.height || Math.max(8, (lot.storeys || 2) * STOREY);
    const key = JSON.stringify([look, h, inner]); let id = typeKey.get(key);
    if (!id) { id = nextType++; typeKey.set(key, id); types[id] = { ...look, h, cut: h > 30, cutH: inner ? 2 : 8, cutTop: look.floor || st.floor || '#7e7266', cutRoof: 'slab' }; }
    lot.look = look; return id;
  };
  for (const lot of C.lots) if (lot.kind === 'building') {
    lot.typeId = wallType(lot, false); const inner = wallType(lot, true), mine = (x, y) => inside(x, y) && C.lot[I(x, y)] === lot.index;
    rect(lot.rect, (x, y, i) => { if (C.lot[i] === lot.index) cells[i] = mine(x - 1, y) && mine(x + 1, y) && mine(x, y - 1) && mine(x, y + 1) ? inner : lot.typeId; });
  }
  const railType = nextType++; types[railType] = { h: 7, top: '#8a8a92', side: '#6a6a72', face: 'stone', roof: 'plain', texture: false };
  for (let i = 0; i < W * H; i++) if (cells[i] === -2) cells[i] = railType;
  for (const wall of spec.walls || []) { const id = nextType++; types[id] = wall.type; rect(wall.rect, (x, y, i) => { cells[i] = id; }); }
  // openings: cells cut back out of the walls, after everything above (a crossing's gate through an embankment, X1:
  // the blocks, lots and props laid out as they were without it)
  for (const o of spec.openings || []) rect(o.rect, (x, y, i) => { cells[i] = 0; C.lot[i] = -1; C.surface[i] = SURF[o.surface || 'road']; });
  C.types = types;

  // 5. decks: the Loop, the L, stubs; pillars and railings; raised solids for peds
  const solids = [], props = [];
  for (const D of spec.decks || []) C.decks.push(buildDeck(D, C, solids, props));
  // where two road decks meet at one height (the Loop and the gap's stub), neither's railing stands between them
  for (let i = solids.length - 1; i >= 0; i--) {
    const q = solids[i]; if (!q.railing) continue;
    const [cx, cy, dx, dy] = q.edge, h = q.z;
    const joins = C.decks.some(d => d.id !== q.railing && d.kind !== 'rail' && [[cx, cy], [cx + dx, cy + dy]].some(([x, y]) => { const c = d._cellMap().get(x + ',' + y); return c && Math.abs(Math.max(c.z0, c.z1) - h) < 2; }));
    if (joins) solids.splice(i, 1);
  }

  // 6. props by rule
  const rp = stream(seed, 'props'), P = spec.props || {};
  const addProp = (kind, x, y, o = {}) => {
    const top = (o.z || 0) + (o.solid ? o.solid.top : 0) + 6;   // (nothing grows up through a deck: a palm under a ramp's low end)
    if (!o.roof && C.decks.some(d => { const h = d.heightAt(x, y); return h !== null && h > (o.z || 0) && h < top; })) return;
    props.push({ kind, x, y, z: o.z || 0, facing: o.facing || 0, ...o });
  };
  // lamps along every sidewalk's outer edge (the curb side), every P.lampEvery tiles; hydrants near corners; benches,
  // bins and newsstands here and there
  for (const r of C.roads) for (const [wi, w] of r.walks.entries()) {
    const ns = r.axis === 'y', curbSide = wi === 0 ? (ns ? w[2] : w[3]) : (ns ? w[0] : w[1]), off = wi === 0 ? .78 : .22;
    for (let s = (ns ? w[1] : w[0]) + 2; s <= (ns ? w[3] : w[2]) - 1; s++) {
      const cx = ns ? curbSide : s, cy = ns ? s : curbSide; if (!inside(cx, cy) || C.surface[I(cx, cy)] !== SURF.walk) continue;
      const px = (ns ? cx + off : cx + .5) * T, py = (ns ? cy + .5 : cy + off) * T;
      if (s % (P.lampEvery || 6) === 0) addProp('lamp', px, py, { solid: { hx: 1.5, hy: 1.5, top: 44 }, facing: ns ? (wi === 0 ? 0 : Math.PI) : (wi === 0 ? Math.PI / 2 : -Math.PI / 2) });
      else if (s % (P.lampEvery || 6) === 3 && rp.chance(P.clutter ?? .25)) addProp(rp.pick(['bin', 'bench', 'hydrant', 'newsstand']), px, py, { solid: { hx: 2.5, hy: 2.5, top: 14 } });
      if (C.hoods[C.hood[I(cx, cy)]]?.trees && s % 4 === 1 && rp.chance(.6)) addProp('palm', (ns ? cx + (wi === 0 ? .2 : .8) : cx + .5) * T, (ns ? cy + .5 : cy + (wi === 0 ? .2 : .8)) * T, { solid: { hx: 2, hy: 2, top: 60 } });
    }
  }
  // lamps over plazas and parks too, on a grid (a big square is never a black hole at night)
  for (const lot of C.lots) if (lot.kind === 'plaza' || lot.kind === 'park') rect(lot.rect, (x, y, i) => {
    if ((x - lot.rect[0]) % 6 === 3 && (y - lot.rect[1]) % 6 === 3 && C.lot[i] === lot.index && (C.surface[i] === SURF.plaza || C.surface[i] === SURF.park) && !cells[i]) addProp('lamp', (x + .5) * T, (y + .5) * T, { solid: { hx: 1.5, hy: 1.5, top: 44 } });
  });
  for (const lot of C.lots) if (lot.kind === 'park') rect(lot.rect, (x, y) => { if (C.surface[I(x, y)] === SURF.park && (x + y * 3) % 5 === 0 && rp.chance(.55)) addProp(rp.chance(.5) ? 'tree' : 'palm', (x + .5) * T, (y + .5) * T, { solid: { hx: 3, hy: 3, top: 56 } }); });
  // roofs, shopfronts, yards and quays (PLAN.md 8.3, 10): clutter on flat roofs (AC units, water tanks, vents), a
  // billboard on some tall ones, a neon sign over some street-facing lots, crates and containers in the yards,
  // bollards along the quays. Their own stream, so the street props above never shift
  const rr = stream(seed, 'roofs'), NEON = ['#ff4ad8', '#5af0ff', '#ffe066', '#ff7a3a', '#7aff8a', '#ff5a5a'], held = new Uint8Array(W * H);   // (cells a yard prop already stands on)
  for (const pr of spec.propList || []) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inside(Math.floor(pr.at[0]) + dx, Math.floor(pr.at[1]) + dy)) held[I(Math.floor(pr.at[0]) + dx, Math.floor(pr.at[1]) + dy)] = 1;
  for (const d of C.decks) if (d.kind === 'ramp') for (const c of d.cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inside(c.cx + dx, c.cy + dy)) held[I(c.cx + dx, c.cy + dy)] = 1;   // (nothing piled on or against a stunt's ramp)
  const shops = spec.shopNames || SHOP_NAMES, brands = spec.billboards || BILLBOARDS;
  for (const lot of C.lots) {
    if (lot.kind === 'building' && lot.typeId) {
      const t = types[lot.typeId], [x0, y0, x1, y1] = lot.rect, w = x1 - x0 + 1, d = y1 - y0 + 1, hood = lot.hood;
      if (t.roof !== 'tiles' && w >= 3 && d >= 3 && !(t.texture === true)) {   // (tiled roofs are pitched; a container has no roof clutter)
        const n = Math.min(5, Math.max(1, Math.round(w * d / 14)));
        for (let k = 0; k < n; k++) addProp(rr.pick(['ac', 'ac', 'tank', 'vent', 'vent']), (rr.int(x0 + 1, x1 - 1) + rr.range(.2, .8)) * T, (rr.int(y0 + 1, y1 - 1) + rr.range(.2, .8)) * T, { z: t.h, lot: lot.index, facing: rr.pick([0, Math.PI / 2]), roof: true });
      }
      if (!lot.landmark && !lot.sign && t.h >= 48 && w >= 4 && rr.chance(.16)) lot.sign = { text: rr.pick(brands), color: '#f0e8d0', board: '#2a3a5a', billboard: true };
      else if (!lot.landmark && !lot.sign && hood !== 'harbor' && rr.chance(.24)) lot.sign = { text: rr.pick(shops), color: rr.pick(NEON), low: true };
    } else if (lot.kind === 'yard') {
      const [x0, y0, x1, y1] = lot.rect, area = (x1 - x0 + 1) * (y1 - y0 + 1), harbor = lot.hood === 'harbor', n = Math.floor(area / (harbor ? 10 : 16));
      for (let k = 0; k < n; k++) {
        const cx = rr.int(x0, x1), cy = rr.int(y0, y1), kind = harbor ? rr.pick(['container', 'container', 'crate', 'pallet']) : rr.pick(['crate', 'pallet', 'barrel', 'barrel']), facing = rr.pick([0, Math.PI / 2]), color = rr.pick(['#c8423a', '#3a6ac8', '#3a8a5a', '#c8a03a', '#8a3a8a']);
        const span = kind === 'container' ? 2 : 0, foot = [];   // (a container is three cells long)
        for (let s2 = -span; s2 <= span; s2++) foot.push(facing ? [cx, cy + s2] : [cx + s2, cy]);
        if (foot.some(([fx, fy]) => !inside(fx, fy) || cells[I(fx, fy)] || C.lot[I(fx, fy)] !== lot.index || held[I(fx, fy)]) || (spec.pois || []).some(p => Math.abs(p.at[0] - cx) < 3 && Math.abs(p.at[1] - cy) < 3)) continue;   // (never by a door, never on another)
        for (const [fx, fy] of foot) held[I(fx, fy)] = 1;
        addProp(kind, (cx + .5) * T, (cy + .5) * T, { facing, color, solid: kind === 'container' ? (facing ? { hx: 8, hy: 20, top: 16 } : { hx: 20, hy: 8, top: 16 }) : { hx: 5, hy: 5, top: 9 } });
      }
    }
  }
  // the look pass (M13): busier flat roofs (a stair hut, skylights, a duct, a chimney on brick, an aerial or a dish on
  // the tall, more units), and a style's neon (style.neon: { tubes, signs }: a tube of light up a building's street
  // corners at that chance each, a shop sign on that share more of its lots). Their own stream after everything above,
  // so nothing above shifts; none of it is solid (the look only: the simulation never sees it)
  const rl = stream(seed, 'roofs+');
  for (const lot of C.lots) {
    if (lot.kind !== 'building' || !lot.typeId) continue;
    const t = types[lot.typeId], [x0, y0, x1, y1] = lot.rect, w = x1 - x0 + 1, d = y1 - y0 + 1, area = (w - 2) * (d - 2);
    if (t.roof !== 'tiles' && t.texture !== true && area > 0) {
      const busy = new Set(props.filter(p => p.roof && p.lot === lot.index).map(p => Math.floor(p.x / T) + ',' + Math.floor(p.y / T)));
      const put = kind => { for (let k = 0; k < 8; k++) { const cx = rl.int(x0 + 1, x1 - 1), cy = rl.int(y0 + 1, y1 - 1), key = cx + ',' + cy; if (busy.has(key)) continue; busy.add(key); addProp(kind, (cx + .5) * T, (cy + .5) * T, { z: t.h, lot: lot.index, facing: rl.pick([0, Math.PI / 2]), roof: true }); return; } };
      if (area >= 4) put('hatch');
      for (let k = 0, n = Math.min(4, Math.floor(area / 12)); k < n; k++) put('skylight');
      if (area >= 9 && rl.chance(.6)) put('duct');
      if (/brick/.test(t.face || '') && rl.chance(.7)) put('chimney');
      if (t.h >= 72 && rl.chance(.7)) put(rl.chance(.5) ? 'aerial' : 'dish');
      for (let k = 0, n = Math.floor(area / 10); k < n; k++) put(rl.pick(['ac', 'vent', 'ac', 'vent', 'tank']));
    }
    const st = (spec.styles || {})[(C.hoods.find(h => h.id === lot.hood) || {}).style || 'default'], N = st && st.neon;
    if (!N || lot.landmark) continue;
    const street = (x, y) => inside(x, y) && (C.surface[I(x, y)] === SURF.walk || C.surface[I(x, y)] === SURF.road || C.surface[I(x, y)] === SURF.plaza);
    for (const [cx, cy, ox, oy] of [[x0, y0, -1, -1], [x1, y0, 1, -1], [x0, y1, -1, 1], [x1, y1, 1, 1]]) {
      if (!(street(cx + ox, cy) || street(cx, cy + oy)) || !rl.chance(N.tubes || 0)) continue;
      const h = Math.max(12, t.h - 10); addProp('neon', (cx + .5 + ox * .5) * T + ox, (cy + .5 + oy * .5) * T + oy, { z: 6, tube: h, top: h, color: rl.pick(NEON), roof: true, lot: lot.index });
    }
    if (!lot.sign && rl.chance(N.signs || 0)) lot.sign = { text: rl.pick(shops), color: rl.pick(NEON), low: true };
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {   // bollards on the quay's edge, every few tiles
    if (C.surface[I(x, y)] !== SURF.quay || (x + y) % 4 || cells[I(x, y)]) continue;
    const wet = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => inside(x + dx, y + dy) && water[I(x + dx, y + dy)]);
    if (wet) addProp('bollard', (x + .5 + wet[0] * .35) * T, (y + .5 + wet[1] * .35) * T, { solid: { hx: 2, hy: 2, top: 6 } });
  }
  for (const pr of spec.propList || []) addProp(pr.kind, pr.at[0] * T, pr.at[1] * T, pr);
  C.props = props;
  // (street furniture a car knocks over: lamps fall, hydrants burst, bins and benches scatter; fleet.js breaks them)
  for (const p of props) if (p.solid) solids.push({ x: p.x, y: p.y, z: p.z || 0, top: (p.z || 0) + p.solid.top, hx: p.solid.hx, hy: p.solid.hy, prop: p, breakable: BREAKABLE.has(p.kind) && !p.roof });

  // 7. points of interest, zones, signs
  C.pois = (spec.pois || []).map(p => ({ ...p, x: (p.at[0] + .5) * T, y: (p.at[1] + .5) * T }));
  C.zones = (spec.zones || []).map(z => ({ ...z }));
  C.tour = (spec.tour || []).map(([x, y]) => [(x + .5) * T, (y + .5) * T]);   // a loop of road corners (perf runs, the attract camera)
  for (const h of C.hoods) if (h.rects) for (const r of h.rects) C.zones.push({ kind: 'hood', hood: h.id, gang: h.gang || null, rect: r });
  C.signs = [...C.lots.filter(l => l.sign).map(l => ({ lot: l.index, ...l.sign, rect: l.rect })), ...(spec.signs || []).map(s => ({ lot: -1, ...s }))];   // (spec.signs: { rect, text, color, h, low } on no lot: a wall's)

  // pockets: open ground walled in where no one can walk to (between buildings) joins the building beside it
  {
    const open = i => cells[i] <= 0 && C.surface[i] !== SURF.water && C.surface[i] !== SURF.deep, seen = new Uint8Array(W * H), q = [];
    for (let i = 0; i < W * H; i++) if (open(i) && (C.surface[i] === SURF.road || C.surface[i] === SURF.walk)) { seen[i] = 1; q.push(i); }
    while (q.length) { const i = q.pop(), x = i % W, y = (i - x) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!inside(nx, ny)) continue; const j = I(nx, ny); if (!seen[j] && open(j)) { seen[j] = 1; q.push(j); } } }
    for (let i = 0; i < W * H; i++) if (open(i) && !seen[i]) {
      const x = i % W, y = (i - x) / W, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => inside(x + dx, y + dy) ? I(x + dx, y + dy) : -1).find(j => j >= 0 && cells[j] > 0 && C.lot[j] >= 0);
      if (nb !== undefined) { cells[i] = cells[nb]; C.lot[i] = C.lot[nb]; }
    }
  }
  // the TileMap: walls, floor tags (the surfaces), blocked water
  const floor = Array.from(C.surface, s => SURFACES[s]);
  const map = new E.TileMap({ w: W, h: H, cells: Array.from(cells), floor, types, block: ['water', 'deep'] });
  // (every solid with the same fields in the same order: one object shape, so the hot loops that read them stay fast)
  const one = q => ({ x: q.x, y: q.y, z: q.z, top: q.top, hx: q.hx, hy: q.hy, deck: q.deck ?? null, railing: q.railing ?? null, edge: q.edge ?? null, pillar: q.pillar ?? null, prop: q.prop ?? null, breakable: !!q.breakable });
  for (const sol of map.addSolids(solids.map(one))) if (sol.prop) sol.prop.solidRef = sol;   // (a prop knows its solid: a fallen lamp lowers it)
  C.map = map; map.city = C;
  return C;
}

/** an interior (PLAN.md 5.4, 8.21; def('interiors', id, spec)) into a CityMap, by a district's conventions:
 *  spec.blocks: rows of characters, a cell each; spec.legend: char -> { wall: a type's name } or { floor: a surface }
 *  (mark: a name, to find those cells again: doors, spawns); spec.types: name -> wall-type options (an engine TileMap
 *  type, as a landmark's look: h, side, top, face, roof, windows, cutH); spec.rooms: [{ name, rect }] (zones);
 *  spec.pois. Each wall cell is a lot of its own, so the interior cut-away drops the walls between the camera and the
 *  player a cell at a time (a room keeps its walls everywhere else) */
export function buildInterior(spec, o = {}) {
  const rows = spec.blocks, H = rows.length, W = Math.max(...rows.map(r => r.length)), T = 16, C = new CityMap(W, H, T);
  C.id = spec.id; C.seed = o.seed ?? spec.seed ?? 1; C.spec = spec; C.interior = true;
  C.hoods = [{ id: spec.id, index: 0, name: spec.name }]; C.crosswalks = []; C.intersections = []; C.busy = new Uint8Array(W * H);
  const cells = new Int32Array(W * H), types = {}, ids = {}, marks = {}, legend = spec.legend || {};
  let next = 1;
  const typeOf = name => { if (ids[name] === undefined) { if (!spec.types[name]) throw new Error('MOTOR: interior ' + spec.id + ' has no wall type "' + name + '"'); types[next] = { cut: true, cutH: 6, ...spec.types[name] }; ids[name] = next++; } return ids[name]; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = rows[y][x] || ' ', L = legend[ch], i = y * W + x;
    if (!L) throw new Error('MOTOR: interior ' + spec.id + ' has no legend for "' + ch + '" (' + x + ', ' + y + ')');
    if (L.wall) { cells[i] = typeOf(L.wall); C.lot[i] = i; }
    C.surface[i] = SURF[L.floor || spec.floor || 'concrete'];
    if (L.mark) (marks[L.mark] ||= []).push([x, y]);
  }
  C.types = types; C.marks = marks;
  C.pois = (spec.pois || []).map(p => ({ ...p, x: (p.at[0] + .5) * T, y: (p.at[1] + .5) * T }));
  C.zones = (spec.rooms || []).map(r => ({ kind: 'room', ...r }));
  C.lots = []; C.signs = []; C.tour = [];
  const map = new E.TileMap({ w: W, h: H, cells: Array.from(cells), floor: Array.from(C.surface, q => SURFACES[q]), types, block: ['water', 'deep', 'sewer'] });
  C.map = map; map.city = C;
  return C;
}

/** shop signs and billboards for lots with no landmark of their own (a district's shopNames / billboards replace them) */
const SHOP_NAMES = ['PIZZAZZ PIZZA', 'NOODLE NOOK', 'VIDEO VAULT', 'DONUT DEPOT', 'WASH & WOE', 'LUCKY LIQUOR', 'NEON NAILS', 'CASH-O-MATIC',
  'BURGER BARON', 'TACO TORNADO', 'HOT DOG HUT', 'DISCO INFERNO', 'CHEAP SUITS', 'MOTEL 2', 'PAWN PALACE', 'KARAOKE KING', 'BAIT & TACKLE', 'SPARE PARTS'];
const BILLBOARDS = ['DRINK FIZZ-O', 'VOTE NOBODY', 'ZAPPO COLA', 'LAWYER? CALL MOE', 'MOTOPOLIS: NICE!', 'SKYLINE SMOKES', 'BUY A BOAT', 'EAT AT JOE\'S'];
function pickWeighted(rs, pairs) { let t = 0; for (const k in pairs) t += pairs[k]; let r = rs.next() * t; for (const k in pairs) { if ((r -= pairs[k]) < 0) return k; } return Object.keys(pairs)[0]; }
const DEFAULT_LOOK = { side: '#8a7a6a', top: '#5a5060', face: 'brick', roof: 'slab', windows: { lit: .3 } };
const DEFAULT_STYLE = { kinds: { block: 1 }, lots: { block: { kind: 'building', w: [4, 8], d: [4, 8], storeys: [2, 4] } }, looks: [DEFAULT_LOOK], alleys: .2 };

/** a deck from its definition: { id, kind ('road' | 'rail'), z, width, path: [[x, y], ...] (centre-line cells, axis
 *  turns), closed, ramps: [{ at: [x, y], dir: 'N' | 'S' | 'E' | 'W', length }], gaps: [[x0, y0, x1, y1]], pillarEvery,
 *  stations: [{ name, rect }] } */
function buildDeck(D, C, solids, props) {
  const T = 16, half = Math.floor(D.width / 2), cells = new Map(), z = D.z, thick = D.thickness || 6;
  const rect2 = (r, fn) => { for (let y = r[1]; y <= r[3]; y++) for (let x = r[0]; x <= r[2]; x++) fn(x, y); };
  const underOther = (x, y) => C.decks.some(d => d._cellMap().has(x + ',' + y));   // (built decks: a pillar never stands through one)
  const gap = (x, y) => (D.gaps || []).some(g => x >= g[0] && x <= g[2] && y >= g[1] && y <= g[3]);
  const put = (x, y, z0, z1, axis) => { if (!C.inside(x, y) || gap(x, y)) return; const k = x + ',' + y; if (!cells.has(k)) cells.set(k, { cx: x, cy: y, z0, z1, axis }); };
  const pts = D.path.slice(); if (D.closed) pts.push(pts[0]);
  const lo = -half, hi = D.width - 1 - half, centre = [];
  for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], axis = ax === bx ? 'y' : 'x', n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)), sx = Math.sign(bx - ax), sy = Math.sign(by - ay);
    for (let k = 0; k <= n; k++) {
      const cx = ax + sx * k, cy = ay + sy * k; centre.push([cx, cy, axis]);
      for (let o = lo; o <= hi; o++) put(axis === 'y' ? cx + o : cx, axis === 'y' ? cy : cy + o, z, z, axis);   // the width across the run
      if (k === 0 || k === n) for (let a = lo; a <= hi; a++) for (let b = lo; b <= hi; b++) put(cx + a, cy + b, z, z, axis);   // a turn's corner square
    }
  }
  for (const st of D.stations || []) rect2(st.rect, (x, y) => put(x, y, z, z, 'y'));   // station platforms beside the track
  // ramps: from the deck's edge down to the ground over length tiles (the top falls away from the deck)
  const ramps = [], feet = new Set();   // (feet: a ramp's last cells' outer edges, left open: no railing across the bottom)
  for (const R of D.ramps || []) {
    const [rx, ry] = R.at, L = R.length || 16, dx = { E: 1, W: -1, N: 0, S: 0 }[R.dir], dy = { E: 0, W: 0, N: -1, S: 1 }[R.dir], axis = dx ? 'x' : 'y';
    const edge = (dx || dy) > 0 ? hi + 1 : -lo + 1, pos = (dx || dy) > 0;   // the first cell past the corner square
    for (let k = 0; k < L; k++) for (let o = lo; o <= hi; o++) {
      const cx = rx + dx * (edge + k) + (axis === 'y' ? o : 0), cy = ry + dy * (edge + k) + (axis === 'x' ? o : 0);
      const zNear = z * (1 - k / L), zFar = z * (1 - (k + 1) / L);
      put(cx, cy, pos ? zNear : zFar, pos ? zFar : zNear, axis);
      if (k === L - 1) feet.add(cx + ',' + cy + ',' + dx + ',' + dy);
    }
    ramps.push({ at: R.at, dir: R.dir, length: L, foot: [rx + dx * (edge + L), ry + dy * (edge + L)] });
  }
  // a road deck's square notches get an apron cell (where a ramp leaves a corner, a bend's inner corner): a turning car's
  // body swings across them. The apron takes the slope of the ramp beside it, or the deck's height
  if ((D.kind || 'road') !== 'rail') for (let pass = 0; pass < 3; pass++) {   // (three passes: a stepped chamfer three cells deep)
    const notch = [];
    for (const c of [...cells.values()]) for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = c.cx + dx, ny = c.cy + dy, k = nx + ',' + ny; if (cells.has(k) || !C.inside(nx, ny) || gap(nx, ny)) continue;
      const a = cells.get(nx + ',' + c.cy), b = cells.get(c.cx + ',' + ny);   // (the notch's two sides: beside it in x and in y)
      if (!a || !b || Math.abs(Math.max(a.z0, a.z1) - Math.max(b.z0, b.z1)) > 8) continue;
      const ramp = a.z0 !== a.z1 ? a : b.z0 !== b.z1 ? b : null;
      notch.push([nx, ny, ramp ? ramp.z0 : z, ramp ? ramp.z1 : z, ramp ? ramp.axis : 'x']);
    }
    for (const [nx, ny, z0, z1, axis] of notch) put(nx, ny, z0, z1, axis);
  }
  const deck = new Deck({ id: D.id, kind: D.kind || 'road', width: D.width, z, cells: [...cells.values()], ramps, thickness: thick, stations: D.stations || [], lanes: D.lanes || 2, gaps: D.gaps || [], path: D.path.slice(), closed: !!D.closed, surface: D.surface || null });   // (surface: its top's look, 'slag' a stunt ramp of dross: X4)
  // peds stand on it: the flat parts as one solid per cell row run (merged), ramps in 8-unit treads (the engine's step is 2)
  for (const c of deck.cells) {
    if (c.z0 === c.z1) { solids.push({ x: (c.cx + .5) * T, y: (c.cy + .5) * T, z: c.z0 - thick, top: c.z0, hx: 8, hy: 8, deck: D.id }); continue; }
    for (let h2 = 0; h2 < 2; h2++) {
      const f = (h2 + .5) / 2, top = c.z0 + (c.z1 - c.z0) * f, x = (c.cx + (c.axis === 'x' ? h2 * .5 + .25 : .5)) * T, y = (c.cy + (c.axis === 'y' ? h2 * .5 + .25 : .5)) * T;
      solids.push({ x, y, z: Math.max(0, top - thick), top, hx: c.axis === 'x' ? 4 : 8, hy: c.axis === 'y' ? 4 : 8, deck: D.id });
    }
  }
  // pillars every pillarEvery tiles along the centre line, under the median of an avenue or the kerb of a street
  const every = D.pillarEvery || 4;
  const nearBox = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy; if (C.inside(x, y) && C.busy[y * C.w + x] === 1) return true; } return false; };
  centre.forEach(([cx, cy, axis], n) => {
    if (n % every || gap(cx, cy) || underOther(cx, cy) || nearBox(cx, cy)) return;   // (never in a junction's box or at its mouth: the deck spans it, and turning traffic swings past)
    const below = C.roads.find(r => cx >= r.band[0] && cx <= r.band[2] && cy >= r.band[1] && cy <= r.band[3]);
    const spots = below && below.median ? [[cx, cy]] : below ? (axis === 'y' ? [[below.band[0] - 1, cy], [below.band[2] + 1, cy]] : [[cx, below.band[1] - 1], [cx, below.band[3] + 1]]) : [[cx, cy]];
    for (const [px, py] of spots) { if (underOther(px, py)) continue; const x = (px + .5) * T, y = (py + .5) * T; solids.push({ x, y, z: 0, top: z - thick, hx: 3, hy: 3, pillar: D.id }); props.push({ kind: 'pillar', x, y, z: 0, top: z - thick, deck: D.id }); }
  });
  // railings along the deck's outer edges (not where a ramp leaves): solids a car on the deck hits, nothing below
  const end = D.openEnd ? D.path[D.path.length - 1] : null;   // an unfinished end: no railing, a car flies off it
  if (D.railing !== false) for (const c of deck.cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (cells.has((c.cx + dx) + ',' + (c.cy + dy)) || feet.has(c.cx + ',' + c.cy + ',' + dx + ',' + dy)) continue;
    if (end && Math.abs(c.cx - end[0]) <= half && Math.abs(c.cy - end[1]) <= half && (D.path[0][0] === end[0] ? dy === Math.sign(end[1] - D.path[0][1]) : dx === Math.sign(end[0] - D.path[0][0]))) continue;
    const top = Math.max(c.z0, c.z1);
    solids.push({ x: (c.cx + .5 + dx * .5) * T, y: (c.cy + .5 + dy * .5) * T, z: top, top: top + 8, hx: dx ? .8 : 8, hy: dy ? .8 : 8, railing: D.id, edge: [c.cx, c.cy, dx, dy] });
  }
  return deck;
}
