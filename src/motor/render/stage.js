// The Stage (PLAN.md 7.7): how scenes draw the world, the same code in every view. A scene hands the stage its world
// (the TileMap, the floor chunks, the spans) and, each frame, its actors and shapes; the stage draws them with the
// active view. In ISO everything goes to the engine's renderer (FloorChunks.drawIso, the patched queueWalls, r.actor
// with outlines and x-ray). In TOP and SIDE7 the stage collects everything with a depth key and draws it back to front
// through that view's projection, over its own sky and floor; the engine's lighting and particles stay out of those
// views (MOTOR's own light pass arrives with M7).
//   stage.begin(r, { focus, vel, speed01 }) · stage.actor(x, y, z, draw, o) · stage.shape(x, y, z, draw) · stage.end()
//   draw(g, sx, sy, view, k): a rig or anything drawn by code with an engine View at (sx, sy), k pixels per unit
import { E } from '../engine.js';
import { Spans } from './depth/spans.js';
import { Side7View } from './depth/side7.js';
import { TopView } from './depth/top.js';
import { CutAway } from './cutaway.js';

const CROWD = { outline: false, rim: false }, XRAY = { xray: true };

export class Stage {
  /** game: the E.Game; views: the ViewManager (it learns the depth views here) */
  constructor(game, views) {
    this.game = game; this.views = views; this.items = []; this.world = null; this.last = 0;
    this.side7 = new Side7View({}); this.top = new TopView({});
    for (const v of [this.top, this.side7]) views.addView({ id: v.id, label: v.label, depth: v,
      screenDirToGround: (dx, dy) => v.screenDirToGround(dx, dy),
      mouseGround: () => { const m = game.input.mouseScreen && game.input.mouseScreen(); return m && v.P ? v.toGround(m[0] - game.screen.ix, m[1] - game.screen.iy) : null; } });
    // the engine's lighting pass and particles draw in its own views only (the stress test does the same, 634-642)
    if (game.lights && game.lights.render) { const render = game.lights.render.bind(game.lights); game.lights.render = r => { if (!this.depthActive) render(r); }; }
    if (game.particles && game.particles.draw) { const draw = game.particles.draw.bind(game.particles); game.particles.draw = r => { if (!this.depthActive) draw(r); }; }
  }
  /** the active depth view (Side7View or TopView), or null in ISO */
  get depth() { const s = this.views.spec; return (s && s.depth) || null; }
  get depthActive() { return !!this.depth; }
  /** the world to draw: { map (TileMap), city (its CityMap, for the cut-away), floor (FloorChunks), backdrop (E.Backdrop,
   *  ISO's sky), night, engineFloor (ISO draws the engine's own whole-map floor bake: small maps only, for comparisons) } */
  setWorld(w) {
    this.world = Object.assign({ night: true }, w);
    this.spans = w.map ? new Spans(w.map, w.floor ? w.floor.size : 256) : null;
    this.cutaway = w.city ? (w.city.cutaway || (w.city.cutaway = new CutAway(w.city))) : null;   // (a city's buildings drop round the player in ISO)
    this.side7.ready = false; this.top.ready = false; this.side7.heading = 0;
  }
  /** start a frame: o.focus [x, y] (the possessed actor), o.vel [vx, vy] and o.speed01 (0..1 of top speed) steer the
   *  depth cameras; o.player [x, y, z] (the focus by default) is who the cut-away keeps in sight. Presentation only:
   *  the simulation never reads it */
  begin(r, o = {}) {
    this.r = r; this.items.length = 0; this.focus = o.focus || null; this.isoP = null;
    const now = this.game.real, dt = E.clamp(now - (this.last || now), 0, .1); this.last = now;
    const d = this.depth, W = this.world;
    if (!d) {   // ISO: the engine draws; the floor and walls go first
      if (this.cutaway) { const p = o.player || this.focus; if (p) this.cutaway.update(r.view, p[0], p[1], p[2] || 0); }
      if (W.backdrop) W.backdrop.draw(r);
      if (W.engineFloor && W.map) W.map.drawFloor(r); else if (W.floor) W.floor.drawIso(r);
      if (W.map) { W.map.queueWalls(r); W.map.prebakeWalls(r); }
      return;
    }
    if (this.focus) d === this.top ? d.follow(dt, this.focus[0], this.focus[1], (o.vel || [0, 0])[0], (o.vel || [0, 0])[1], o.speed01 || 0) : d.follow(dt, this.focus[0], this.focus[1]);
    d.frame(r);
  }
  /** an actor drawn by code with an engine View (a rig): o { shadow: radius, xray, alpha, crowd }. A crowd actor takes
   *  the engine's fast path in ISO (no outline or rim: the composite costs about half a millisecond a body); the player
   *  and named characters keep them */
  actor(x, y, z, draw, o = {}) {
    const d = this.depth, r = this.r;
    if (!d) { if (o.shadow) r.shadow(x, y, o.shadow); r.actor(x, y, z, (g, ox, oy) => draw(g, ox, oy, r.view, r.view.scale), o.crowd ? CROWD : o.xray ? XRAY : undefined); return; }
    this.items.push({ k: d.depth(x, y), actor: true, fn: g => {
      const p = d.proj(x, y, z); if (!p) return;
      if (o.shadow) { const s = d.proj(x, y, 0); if (s) { g.fillStyle = 'rgba(5,3,12,.45)'; g.beginPath(); g.ellipse(s[0], s[1], o.shadow * s[2] * 1.1, Math.max(1, o.shadow * s[2] * (d === this.top ? 1.1 : .45)), 0, 0, Math.PI * 2); g.fill(); } }
      if (o.alpha !== undefined) g.globalAlpha = o.alpha;
      draw(g, Math.round(p[0]), Math.round(p[1]), d.view(p[2]), p[2]);
      g.globalAlpha = 1;
    } });
  }
  /** a shape drawn through a projector: draw(g, P) with P.proj(x, y, z) -> [sx, sy, k] (vehicles, props, markers).
   *  o: the engine queue's options in ISO ({ emissive, bias, hides, footprint }) */
  shape(x, y, z, draw, o) {
    const d = this.depth, r = this.r;
    if (!d) { r.queue(x, y, z, g => draw(g, this.isoP || (this.isoP = { proj: (a, b, c = 0) => { const q = r.w(a, b, c); return [q[0], q[1], r.view.scale]; } })), o); return; }
    this.items.push({ k: d.depth(x, y) - (o && o.bias || 0), fn: g => draw(g, d) });
  }
  /** one of the engine's props (E.PROPS: 'streetlamp', 'palm', 'trashcan'...): r.prop's billboard in ISO (o: its options:
   *  size, light, lightRadius...), the same sprite scaled to its distance in TOP and SIDE7 */
  prop(name, x, y, z, o = {}) {
    const d = this.depth, r = this.r;
    if (!d) { r.prop(name, x, y, z, o); return; }
    const p = E.prop(name, o.size ? { size: o.size } : undefined); if (!p) return;
    const spr = p.frames[0];
    this.items.push({ k: d.depth(x, y), fn: g => {
      const q = d.proj(x, y, z); if (!q) return;
      const s = q[2] / Math.SQRT2, w = spr.w * s, h = spr.h * s; if (h < 1) return;   // (sprites are drawn for ISO's sqrt 2 pixels a unit)
      g.drawImage(spr.cv, Math.round(q[0] - w / 2), Math.round(q[1] - h), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
      if (p.glowAt && o.light) { const gx = q[0] - w / 2 + w * p.glowAt[0], gy = q[1] - h + h * p.glowAt[1], R = Math.max(2, w * .9); g.globalAlpha = .25; g.fillStyle = p.glowAt[2]; g.beginPath(); g.arc(gx, gy, R, 0, 6.3); g.fill(); g.globalAlpha = 1; }
    } });
  }
  /** finish the frame: in a depth view, the sky, the floor, then the spans and everything queued, far to near */
  end() {
    const d = this.depth; if (!d) return;
    const r = this.r, g = r.ctx, W = this.world, S = W.floor ? W.floor.size : 256;
    g.save(); g.imageSmoothingEnabled = false; d.stats.quads = 0;
    let spans = [];
    if (d === this.side7) {
      d.drawSky(g, Math.max(0, d.P.hy));
      if (W.floor) { const [i0, j0, i1, j1] = d.wedge(S); for (let j = Math.max(0, j0); j <= j1; j++) for (let i = Math.max(0, i0); i <= i1; i++) W.floor.canvas(i, j); W.floor.pump(d.x, d.y); d.drawFloor(g, W.floor); }
      if (this.spans) { const [i0, j0, i1, j1] = d.wedge(S); spans = this.spans.range(i0, j0, i1, j1); d.spanItems(spans, this.items, this.focus, W.night); }
    } else {
      g.fillStyle = '#0a0812'; g.fillRect(0, 0, r.bw, r.bh);
      if (W.floor) { const [i0, j0, i1, j1] = d.range(S, S / 2); for (let j = Math.max(0, j0); j <= j1; j++) for (let i = Math.max(0, i0); i <= i1; i++) W.floor.canvas(i, j); W.floor.pump(d.x, d.y); d.drawFloor(g, W.floor); }
      if (this.spans) { const [i0, j0, i1, j1] = d.range(S); spans = this.spans.range(i0, j0, i1, j1); d.spanItems(spans, this.items, W.night); }
    }
    // far to near; at equal keys the actor last (it stands in front of the face it touches)
    this.items.sort((a, b) => b.k - a.k || (a.actor ? 1 : 0) - (b.actor ? 1 : 0));
    let actors = 0; for (const it of this.items) { it.fn(g); if (it.actor) actors++; }
    g.restore(); g._c = null;
    d.stats.actors = actors; d.stats.spans = spans.length; d.stats.items = this.items.length;
    this.game.stats.actors = actors;   // (the engine's checker counts the characters on screen)
  }
}
