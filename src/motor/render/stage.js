// The Stage (PLAN.md 7.7): how scenes draw the world, the same code in every view. A scene hands the stage its world
// (the TileMap, the floor chunks, the spans) and, each frame, its actors and shapes; the stage draws them with the
// active view. In ISO everything goes to the engine's renderer (FloorChunks.drawIso, the patched queueWalls, r.actor
// with outlines and x-ray). In TOP and SIDE7 the stage collects everything with a depth key and draws it back to front
// through that view's projection, over its own sky and floor; the engine's lighting and particles stay out of those
// views, and MOTOR's light pass darkens them by the same numbers (the hour's sky: setSky) with the lamps' pools cut out.
//   stage.begin(r, { focus, vel, speed01, vehicle }) · stage.actor(x, y, z, draw, o) · stage.shape(x, y, z, draw) · stage.end()
//   stage.update(dt, { vehicle, vel }) each simulation step (MODE 7's Auto-rail) · stage.setRig({ x, y, zoom, heading })
//   holds every view's camera on a point (photo mode, cut-scenes; null lets go)
//   draw(g, sx, sy, view, k): a rig or anything drawn by code with an engine View at (sx, sy), k pixels per unit
// A switch of view (or of MODE 7's rail) dissolves the last frame into the new view over a third of a second
// (render/crossfade.js), drawn over the world and under the HUD; switching into ISO, the buildings are flat blocks under
// it while the walls bake a few milliseconds a frame, as in a quarter turn.
// An ISO quarter turn (stage.turn) would bake a screenful of walls at the new yaw in one frame. Instead the camera
// orbits for a third of a second with the buildings drawn as flat-shaded blocks (one box a lot, nothing to bake) while
// the new yaw's walls bake a few milliseconds a frame; then the textured walls come back.
// MODE 7 leaves out what the nearer walls hide (_cull7): a face, a body or a deck cell wholly behind them is not drawn.
import { E } from '../engine.js';
import { Spans } from './depth/spans.js';
import { Side7View } from './depth/side7.js';
import { TopView } from './depth/top.js';
import { CutAway } from './cutaway.js';
import { BACKDROPS } from './sky.js';
import { WeatherFX } from './weather-fx.js';
import { CrossFade } from './crossfade.js';
import { TUNE, knob } from '../core/tune.js';

knob('Graphics', 'crowdEvery', 'Crowd animation rate', 4, 1, 8, 1, 'A crowd body (o.key) is drawn every n frames (4: 15 a second, like classic townsfolk) and its image reused in between, at the place it is now (the player never); away from the player one and a half times n, small on screen twice n');
knob('Camera', 'autoRail', 'Auto-rail', 1, 0, 1, 1, 'MODE 7 in a vehicle: the rail turns to the way it has held for 1.5 s, through the crossfade (1); only by hand (0)');
knob('Graphics', 'depthLightRes', 'Depth views\' light coarseness', 4, 1, 8, 1, 'TOP-DOWN and MODE 7 at night work the dark and the lamps\' pools out every n buffer pixels and scale them up smoothly (the pools are soft: 4 is a sixteenth of the work of 1, per pixel)');
knob('Graphics', 'lightRes', 'Light field coarseness', 2, 1, 4, 1, 'ISO lighting works the light out every n buffer pixels and scales it up smoothly (GTM-PATCH 7): 1 is per pixel, 2 a quarter of the work');

const CROWD = { outline: false, rim: false }, XRAY = { xray: true };
const SMALL = .7;   // a crowd body drawn smaller than this (its view's scale): redrawn half as often
const FAR_BODY = 160;   // (world units, |dx| + |dy| from the focus: a crowd body farther off redraws two thirds as often)
const KEPT_MAX = 60;   // a kept shape whose reach is more pixels than this on screen (near a depth view's camera) is drawn, not kept
const BODY_KEPT_MAX = 160;   // and a crowd body whose image would be taller than this (MODE 7's lens, Sharp MODE 7's buffer): drawn
const PREBAKE_AHEAD = .3;   // (ISO: s ahead of the camera the walls are baked before they show)
// an ISO quarter turn: its length, the longest it waits for walls to bake, the bake budget a frame while it turns and
// while it waits at the new yaw, its yaw steps (degrees)
const TURN = { time: .3, most: .45, bakeMs: 9, holdMs: 14, step: 3 };
// an ISO zoom step: the change's length, the longest a zoom-out waits for the wider view's walls to bake first, the
// bake budget a frame
const ZOOM = { time: .25, most: .35, bakeMs: 9 };
// a lamp's pool as a disc: a radial gradient from the inner colour at its centre to the outer at its rim, drawn once on a
// small canvas and kept (by its colours), then scaled into place for each lamp
const discs = new Map();
function poolDisc(inner, outer) {
  const key = inner + outer; let cv = discs.get(key); if (cv) return cv;
  if (discs.size > 32) discs.clear();
  cv = E.mkCanvas(64, 64); const c = cv.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer); c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
  discs.set(key, cv); return cv;
}

export class Stage {
  /** game: the E.Game; views: the ViewManager (it learns the depth views here) */
  constructor(game, views) {
    this.game = game; this.views = views; this.items = []; this.world = null; this.last = 0; this.fx = null; this.zx = null;
    this.lamps = []; this.glows = []; this.floorFx = []; this.marks = []; this.backdrops = new Map(); this.skyNow = null; this._maxH = null; this.wfx = new WeatherFX();
    this.frameNo = 0; this._kept = new WeakMap();   // (crowd bodies' kept images in the depth views, by their key)
    this.fade = new CrossFade(); this.bx = null; this._dt = 0; this.railHold = null; this.sharp = false; this.px = 1; this.baseS = 1;
    views.onChange((now, prev) => { if (now === prev) return; this.fade.start(this.r && this.r.ctx && this.r.ctx.canvas); this.bx = !views.spec || !views.spec.depth ? { t: 0 } : null; this.sharpSync(); });
    this.side7 = new Side7View({}); this.top = new TopView({});
    for (const v of [this.top, this.side7]) views.addView({ id: v.id, label: v.label, depth: v,
      screenDirToGround: (dx, dy) => v.screenDirToGround(dx, dy), screenVec: (x, y, z) => v.screenVec(x, y, z), groundDirToScreen: v.groundDirToScreen ? (x, y) => v.groundDirToScreen(x, y) : null,
      mouseGround: () => { const m = game.input.mouseScreen && game.input.mouseScreen(); return m && v.P ? v.toGround(m[0] - game.screen.ix, m[1] - game.screen.iy) : null; } });
    // the engine's lighting pass and particles draw in its own views only (the stress test does the same, 634-642)
    if (game.lights && game.lights.render) { const render = game.lights.render.bind(game.lights); game.lights.render = r => { if (!this.depthActive) render(r); }; }
    if (game.particles && game.particles.draw) { const draw = game.particles.draw.bind(game.particles); this._partDraw = draw; game.particles.draw = r => { if (!this.depthActive) draw(r); }; }
  }
  /** the active depth view (Side7View or TopView), or null in ISO */
  get depth() { const s = this.views.spec; return (s && s.depth) || null; }
  get depthActive() { return !!this.depth; }
  /** the world to draw: { map (TileMap), city (its CityMap, for the cut-away), floor (FloorChunks), backdrop (E.Backdrop,
   *  ISO's sky), night, engineFloor (ISO draws the engine's own whole-map floor bake: small maps only, for comparisons) } */
  setWorld(w) {
    this.world = Object.assign({ night: true }, w);
    this.spans = w.map ? new Spans(w.map, w.floor ? w.floor.size : 256) : null;
    this.cutaway = w.city ? (w.city.cutaway || (w.city.cutaway = new CutAway(w.city, { room: !!w.city.interior }))) : null;   // (a city's buildings drop round the player in ISO; an interior's walls on the camera's side)
    this.side7.cutAll = this.side7.indoor = !!(w.city && w.city.interior);   // (indoors MODE 7 drops every wall between the camera and the player, on a room's own lens)
    this.side7.ready = false; this.top.ready = false; this.side7.heading = w.heading || 0; this._maxH = null;
  }
  /** the hour's look (render/sky.js skyAt): the engine's canvas lighting and ISO's backdrop, MODE 7's sky and fog,
   *  TOP's ground, and MOTOR's light pass in the depth views. Presentation only */
  setSky(s) {
    const L = this.game.lights, W = this.world || (this.world = {});
    this.skyNow = s;
    if (L) { L.enabled = s.ambient < .98; L.ambient = s.ambient; L.dark = s.dark; L.tint = s.tint; L.res = TUNE.lightRes; }
    W.night = s.night; W.lamps = s.lamps;
    let b = s.indoor ? null : this.backdrops.get(s.phase); if (!b && !s.indoor) { b = new E.Backdrop(BACKDROPS[s.phase]); this.backdrops.set(s.phase, b); } W.backdrop = b;   // (indoors: no sky past the walls)
    const v7 = this.side7; v7.sky = s.sky; if (v7.fog !== s.fog) { v7.fog = s.fog; v7.fogRGB = E.hex(s.fog); }
    if (!v7.clear) v7.clear = [v7.fogStart, v7.farClip];   // (fog draws MODE 7's far fade in)
    v7.fogStart = v7.clear[0] - 190 * (s.haze || 0); v7.farClip = v7.clear[1] - 200 * (s.haze || 0);
    this.top.bg = s.top;
  }
  /** start a frame: o.focus [x, y] (the possessed actor), o.vel [vx, vy] and o.speed01 (0..1 of top speed) steer the
   *  depth cameras; o.player [x, y, z] (the focus by default) is who the cut-away keeps in sight. Presentation only:
   *  the simulation never reads it */
  begin(r, o = {}) {
    this._t0 = typeof performance !== 'undefined' ? performance.now() : 0;   // (draw-side profiling: the scene's queuing, begin to end)
    this.r = r; this.items.length = 0; this.lamps.length = 0; this.glows.length = 0; this.floorFx.length = 0; this.marks.length = 0; this.focus = o.focus || null; this.isoP = null; this.frameNo++;
    const now = this.game.real, dt = E.clamp(now - (this.last || now), 0, .1); this.last = now; this._dt = dt;
    const d = this.depth, W = this.world, sky = this.skyNow;
    if (sky) this.wfx.update(dt, sky, this.focus);
    if (!d) {   // ISO: the engine draws; the floor and walls go first
      if (this.cutaway) { const p = o.player || this.focus; if (p) this.cutaway.update(r.view, p[0], p[1], p[2] || 0); }
      r.overlay(g => { this._isoGlows(g, r); if (sky) this.wfx.draw(g, this._isoProj(r), r.bw, r.bh, sky); this.fade.draw(g, dt); });   // (after the lights, before a turn or zoom transforms the frame, and before the HUD)
      if (sky && sky.wet > .02) r.decal(g => this.wfx.floor(g, r.bw, r.bh, sky));   // (over the floor, under what stands on it)
      if (W.backdrop && !this._floorCovers(r)) W.backdrop.draw(r);   // (the sky only where the map's edge is in sight)
      if (W.engineFloor && W.map) W.map.drawFloor(r); else if (W.floor) W.floor.drawIso(r);
      if (this.fx) this._turnFrame(r, dt, o.player || this.focus);
      else if (W.map && this.bx) this._bakeIn(r, dt);
      else if (W.map) { W.map.queueWalls(r); if (this.zx) this._zoomFrame(r, dt, o.player || this.focus); else this._prebake(r, W.map, o.vel); }
      return;
    }
    const rig = this.rig; if (rig) { this.focus = [rig.x, rig.y]; o = { ...o, vel: [0, 0] }; }   // (the camera rig holds it: photo mode, a cut-scene)
    if (d === this.side7) { d.rig(dt, !!o.vehicle, o.speed01 || 0); if (rig && rig.heading !== undefined) d.setHeading(rig.heading, rig.x, rig.y); }
    d.zoom = rig && rig.zoom ? rig.zoom : 1;
    if (this.focus) d === this.top ? d.follow(dt, this.focus[0], this.focus[1], (o.vel || [0, 0])[0], (o.vel || [0, 0])[1], rig ? 0 : o.speed01 || 0) : d.follow(dt, this.focus[0], this.focus[1]);
    d.frame(r);
  }
  // ISO: the walls a few milliseconds a frame before they come on screen, in a window a screen's size round where the
  // camera will be a third of a second from now (its ground point and the focus's velocity), not in a ring round the
  // screen: on the move, the ring's sides and back are baked and never shown
  _prebake(r, map, vel) {
    const c = vel && (vel[0] || vel[1]) && r.view.inv ? r.view.toGround(r.ix + r.bw / 2, r.iy + r.bh / 2) : null;
    if (!c) { map.prebakeWalls(r); return; }
    map.prebakeWalls(r, { at: [c[0] + vel[0] * PREBAKE_AHEAD, c[1] + vel[1] * PREBAKE_AHEAD], margin: 24 });
  }
  // ISO: does the floor cover the whole screen (every corner's ground point on the map)? Then nothing of the backdrop
  // would show, and it isn't drawn (the sky's gradient and its skyline strips: a screenful of pixels a frame)
  _floorCovers(r) {
    const W = this.world, m = W.map; if (!W.floor || !m || W.engineFloor) return false;
    const v = r.view, X = m.w * m.T, Y = m.h * m.T;
    for (const [sx, sy] of [[0, 0], [r.bw, 0], [0, r.bh], [r.bw, r.bh]]) { const p = v.toGround(sx + r.ix, sy + r.iy); if (!p || p[0] < 0 || p[1] < 0 || p[0] > X || p[1] > Y) return false; }
    return true;
  }
  // into ISO from a depth view: flat blocks while the walls bake (under the crossfade), then the walls
  _bakeIn(r, dt) {
    const bx = this.bx, map = this.world.map; bx.t += dt;
    if (this.game.headless) { this.bx = null; return; }
    const left = map.prebakeWalls(r, { ms: TURN.bakeMs });
    if (left > 0 && bx.t < TURN.most) { this._flatWalls(r); return; }
    this.bx = null; map.queueWalls(r);
  }
  /** each simulation step from the scene (o.vehicle: the focus is in one; o.vel: its velocity): MODE 7's Auto-rail
   *  turns the rail to the axis a vehicle has held 1.5 s, through the crossfade (TUNE.autoRail; here, between frames, so
   *  the fade starts from the last one drawn). Presentation only: the simulation never reads it */
  /** Sharp MODE 7 (Settings, Display, PLAN.md 5.3): while MODE 7 is the view and the player asks for it, the game's
   *  buffer at the screen's own resolution (the stress test's depthResolution: the framing comes from the field of view,
   *  so more pixels only sharpen); back to the game's pixel size with the setting off or another view. px: the size a
   *  pixel of the overlays (marks, signs' glows) is drawn at meanwhile, so they keep their size on screen; baseS: the
   *  game's own scale (the UI layer keeps it). In the step: a view change, or each update */
  sharpSync() {
    const g = this.game, S = g.screen, want = !g.headless && !!S && this.depth === this.side7 && !!(g.settings && g.settings.sharpSide7);
    if (want === this.sharp) return;
    if (want) { this.baseS = Math.max(1, Math.floor(S.S)); this._res = g.o.res; S.setOptions({ res: null, minW: 1e6, minH: 1e6, maxW: 1e6, maxH: 1e6 }); }
    else S.setOptions({ res: this._res });
    this.sharp = want; this.px = want ? this.baseS : 1; g.cam.snap = true;
  }
  update(dt, o = {}) {
    this.sharpSync();
    const d = this.depth; if (d !== this.side7 || this.rig) return;
    if (this.railHold !== null) { if (d.heading !== this.railHold) this._railTo(this.railHold); d.steadyT = 0; return; }   // (a set piece holds it: m.view('side7', { heading }))
    const want = TUNE.autoRail && o.vehicle && o.vel ? d.autoRail(dt, o.vel[0], o.vel[1]) : (d.steadyT = 0, null);
    if (want === null) return;
    const f = this.focus; this.fade.start(this.r && this.r.ctx && this.r.ctx.canvas); d.setHeading(want, f ? f[0] : d.x, f ? f[1] : d.y);
  }
  /** hold MODE 7's rail at a heading (0 north: the camera south of the focus, looking north; 90 east, 180 south, 270
   *  west; null lets it go): a mission's set piece (m.view('side7', { heading })). Turned there through the crossfade
   *  when MODE 7 is up, or as it comes up, and kept there (Auto-rail and the player's turns hold off) till let go.
   *  Presentation only */
  pointRail(deg) {
    this.railHold = deg === null || deg === undefined ? null : ((Math.round(deg / 90) * 90) % 360 + 360) % 360;
    if (this.railHold !== null && this.depth === this.side7 && this.side7.heading !== this.railHold) this._railTo(this.railHold);
  }
  _railTo(deg) { const d = this.side7, f = this.focus; if (!this.fade.active) this.fade.start(this.r && this.r.ctx && this.r.ctx.canvas); d.setHeading(deg, f ? f[0] : d.x, f ? f[1] : d.y); }
  /** the camera rig (photo mode, cut-scenes; PLAN.md 8.2, 8.22): { x, y, zoom, heading } holds every view's camera on
   *  that point (ISO's through the scene's focus: stage.rig), at that zoom, MODE 7's rail at that heading; null lets the
   *  views follow the focus again. Presentation only */
  setRig(rig) { this.rig = rig ? { ...rig } : null; }
  /** turn the camera a quarter, dir -1 (turnLeft) or 1 (turnRight): ISO's yaw, MODE 7's rail (through the crossfade);
   *  TOP-DOWN stays north-up. Returns true if it turns */
  turn(dir) {
    const d = this.depth, f = this.focus;
    if (d === this.side7) { if (this.railHold !== null) return false; this.fade.start(this.r && this.r.ctx && this.r.ctx.canvas); d.setHeading(d.heading + 90 * dir, f ? f[0] : d.x, f ? f[1] : d.y); return true; }   // (a set piece's rail stays put)
    if (d || !dir) return false;
    if (this.fx || this.zx) { (this.fx || this.zx).queued = dir; return true; }   // (one more turn waits for this one, or for a zoom step)
    const g = this.game, b = g.baseView || g.view, from = g.yaw || 0, to = ((from + 90 * dir) % 360 + 360) % 360;
    if (g.headless || !this.world || !this.world.map) { g.rotateView(90 * dir); return true; }   // (nothing is drawn headless: the yaw turns at once)
    this.fx = { dir, t: 0, from, to, view: new E.View(b.id, b.label, b.yawDeg + to, b.pitchDeg, b.scale * (g.zoom || 1), b.zBoost), left: 1 };
    return true;
  }
  /** is a quarter turn under way? */
  get turning() { return !!this.fx; }
  /** step the ISO zoom to z (SpeedZoom's levels: 1, .8, .65). Zooming out, the wider view's walls bake for a few frames
   *  first, then the view changes and eases out from the old framing; zooming in, the frame eases in while the closer
   *  view's walls bake, then the view changes. A quarter second either way, scaled about the player. Elsewhere (TOP,
   *  MODE 7, headless) the zoom just changes */
  zoomTo(z) {
    const g = this.game, now = g.zoom || 1;
    if (this.zx ? this.zx.to === z : Math.abs(now - z) < 1e-6) return;
    if (this.zx) { this.zx.next = z; return; }   // (the next step waits for this one)
    if (this.fx) { this.zoomWanted = z; return; }   // (and for a turn)
    if (g.headless || this.depth || !this.world || !this.world.map) { g.setZoom(z); return; }
    const b = g.baseView || g.view, yaw = b.pitchDeg < 5 ? 0 : (g.yaw || 0);
    this.zx = { from: now, to: z, t: 0, out: z < now, switched: false, view: new E.View(b.id, b.label, b.yawDeg + yaw, b.pitchDeg, b.scale * z, b.zBoost), left: 1 };
  }
  /** is a zoom step under way? */
  get zooming() { return !!this.zx; }
  _zoomFrame(r, dt, at) {
    const zx = this.zx, W = this.world, g = this.game; zx.t += dt;
    if (at && !zx.switched) { if (this.cutaway) this.cutaway.also(zx.view, at[0], at[1], at[2] || 0); zx.left = W.map.prebakeWalls(r, { view: zx.view, at: [at[0], at[1]], ms: ZOOM.bakeMs }); }
    else if (zx.switched) W.map.prebakeWalls(r);
    let k = 1, act = null;
    if (zx.out) {   // bake first; then the wider view, drawn magnified to the old framing, easing out to 1
      if (!zx.switched) { if (zx.left === 0 || zx.t >= ZOOM.most) act = () => { g.setZoom(zx.to); zx.switched = true; zx.t0 = zx.t; }; }
      else { const e = Math.min(1, (zx.t - zx.t0) / ZOOM.time), q = e * e * (3 - 2 * e); k = Math.pow(zx.from / zx.to, 1 - q); if (e >= 1) act = () => this._zoomDone(); }
    } else {   // ease in on the old view while the closer one bakes; then the closer view
      const e = Math.min(1, zx.t / ZOOM.time), q = e * e * (3 - 2 * e); k = Math.pow(zx.to / zx.from, q);
      if (e >= 1 && (zx.left === 0 || zx.t >= ZOOM.time + ZOOM.most)) act = () => { g.setZoom(zx.to); this._zoomDone(); };
    }
    r.overlay(gg => { if (at && k !== 1) this._scaleDraw(gg, r, at, k); if (act) act(); });
  }
  _zoomDone() { const zx = this.zx; this.zx = null; if (zx.next !== undefined) this.zoomTo(zx.next); if (zx.queued) this.turn(zx.queued); }
  // the frame scaled by k about the player (the engine's own zoom preview does the same for the player's zoom)
  _scaleDraw(g, r, at, k) {
    const cv = this._fxCv || (this._fxCv = E.mkCanvas(r.bw, r.bh));
    if (cv.width !== r.bw || cv.height !== r.bh) { cv.width = r.bw; cv.height = r.bh; }
    const cg = cv.getContext('2d'); cg.clearRect(0, 0, cv.width, cv.height); cg.drawImage(g.canvas, 0, 0);
    const [fx, fy] = r.w(at[0], at[1], at[2] || 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = false;
    g.fillStyle = '#0a0812'; g.fillRect(0, 0, r.bw, r.bh);
    g.setTransform(k, 0, 0, k, fx * (1 - k), fy * (1 - k)); g.drawImage(cv, 0, 0);
    g.restore(); g._c = null;
  }
  // a frame of the turn: flat blocks at this frame's yaw, the final yaw's walls baking; after it, the next frame's yaw
  _turnFrame(r, dt, at) {
    const fx = this.fx, W = this.world, g = this.game; fx.t += dt;
    if (at) { if (this.cutaway) this.cutaway.also(fx.view, at[0], at[1], at[2] || 0); fx.left = W.map.prebakeWalls(r, { view: fx.view, at: [at[0], at[1]], ms: fx.t > TURN.time ? TURN.holdMs : TURN.bakeMs }); }
    this._flatWalls(r);
    const e = Math.min(1, fx.t / TURN.time), k = e * e * (3 - 2 * e), done = e >= 1 && (fx.left === 0 || fx.t >= TURN.most);
    const yaw = done || e >= 1 ? fx.to : ((fx.from + fx.dir * Math.round(90 * k / TURN.step) * TURN.step) % 360 + 360) % 360;
    r.overlay(() => {   // (after this frame is drawn: the next frame starts at the new yaw, the camera snapped to the player)
      if (done) this.fx = null;
      if (yaw !== (g.yaw || 0)) g.rotateView(yaw - (g.yaw || 0));
      if (done && fx.queued) this.turn(fx.queued);
      if (done && this.zoomWanted !== undefined) { const z = this.zoomWanted; this.zoomWanted = undefined; this.zoomTo(z); }
    });
  }
  // the walls as flat-shaded blocks: one box a building lot (its full height, or its stub where the cut-away drops it),
  // one a cell for walls with no lot (railings, embankments); queued with the actors, so they sort and occlude
  _flatWalls(r) {
    const W = this.world, map = W.map, C = W.city, T = map.T, v = r.view, types = map.types;
    let mh = 0; for (const k in types) mh = Math.max(mh, +types[k].h || 0);
    const pad = Math.ceil(mh * Math.abs(v.bz) / Math.max(.2, Math.hypot(v.bx, v.by)) / T) + 2;   // (a tall wall rises into view from below the edge)
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [sx, sy] of [[0, 0], [r.bw, 0], [0, r.bh], [r.bw, r.bh]]) { const p = v.toGround(r.ix + sx, r.iy + sy); if (!p) return; x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const c0 = Math.max(0, Math.floor(x0 / T) - pad), c1 = Math.min(map.w - 1, Math.ceil(x1 / T) + pad), r0 = Math.max(0, Math.floor(y0 / T) - pad), r1 = Math.min(map.h - 1, Math.ceil(y1 / T) + pad);
    const seen = new Set(), cut = this.cutaway ? this.cutaway.cut : null;
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      const id = map.cell(cx, cy); if (id <= 0) continue;
      const t = types[id], lot = C ? C.lot[cy * C.w + cx] : -1, L = lot >= 0 && C.lots ? C.lots[lot] : null;   // (an interior's wall cells are lots of their own with no record: a cell each)
      if (L) {
        if (seen.has(lot)) continue; seen.add(lot);
        const [a, b, c, d] = L.rect, h = cut && cut.has(lot) ? (t.cutH || 6) : t.h, top = h < t.h && t.cutTop ? t.cutTop : t.top;
        r.queue((a + c + 1) / 2 * T, (b + d + 1) / 2 * T, 0, g => r.box(g, a * T, b * T, 0, (c + 1) * T, (d + 1) * T, h, top, t.side), { occluder: true });
      } else r.queue((cx + .5) * T, (cy + .5) * T, 0, g => r.box(g, cx * T, cy * T, 0, cx * T + T, cy * T + T, t.h, t.top, t.side), { occluder: true });
    }
  }
  _isoProj(r) { return this.isoP || (this.isoP = { proj: (a, b, c = 0) => { const q = r.w(a, b, c); return [q[0], q[1], r.view.scale]; }, depth3: (a, b, c = 0) => -r.view.depth(a, b, c) }); }   // (depth3: bigger is farther, for sorting a model's parts)
  /** something drawn on the floor before anything stands on it (water glints, a wet sheen): draw(g, P) with the view's
   *  projector. ISO takes it as one of the engine's floor decals; TOP and MODE 7 draw it right after their floor */
  floor(draw) { const d = this.depth, r = this.r; if (!d) r.decal(g => draw(g, this._isoProj(r))); else this.floorFx.push(draw); }
  /** something that shines at (x, y, z): a lamp's head, a neon sign. draw(g, sx, sy, k) draws it at its screen point, k
   *  pixels a unit. In ISO glows are drawn after the lights, so the dark never dims them, and only where no wall drawn
   *  this frame stands in front of the point (the walls' tops checked down the screen from it: no full-frame mask, the
   *  cut-away included); o.iso: ISO only (a sign the depth views already draw as a shape); o.reflect(g, sx, sy, k, wet):
   *  its smear of light on a wet street, at the point's foot; o.always: never hidden (a lock-on's mark: over walls, the
   *  dark and the weather in every view); o.r: how far it reaches, in world units (8 pixels at least), when MODE 7's
   *  walls may hide it whole (a lamp's head). In TOP and MODE 7 they sort with everything else */
  glow(x, y, z, draw, o = {}) {
    const d = this.depth;
    if (!d) { this.glows.push([x, y, z, draw, o.reflect || null, !!o.always]); return; }
    if (o.iso) return;
    if (o.always) { this.marks.push(() => { const q = d.proj(x, y, z); if (q) this._glowAt(this.r.ctx, draw, q); }); return; }
    // (a glow whose reach misses the buffer costs nothing: MODE 7's lens puts a passing lamp's halo hundreds of pixels
    // off it, ISO's _isoGlows culls the same way)
    const reach = o.r || 16, it = { k: d.depth(x, y) - .01, kind: 'glow', fn: g => { const q = d.proj(x, y, z); if (q && !this._offBuf(q, reach * q[2] + 8)) this._glowAt(g, draw, q); } };
    const q = o.r && d === this.side7 && z >= 0 && d.proj(x, y, z), R = q && Math.max(8, o.r * q[2]) * this.px;
    if (q) { it.box = [q[0] - R, q[0] + R, q[1] - R]; it.m = it.k - o.r; }
    this.items.push(it);
  }
  // is a screen point R pixels round it wholly off the buffer?
  _offBuf(q, R) { const r = this.r; return !r || q[0] + R < 0 || q[1] + R < 0 || q[0] - R > r.bw || q[1] - R > r.bh; }
  // a glow at its screen point; under Sharp MODE 7 drawn px times over (its pixels the game's size on screen)
  _glowAt(g, draw, q) {
    const px = this.px; if (px === 1) { draw(g, q[0], q[1], q[2]); return; }
    g.save(); g.translate(Math.round(q[0]), Math.round(q[1])); g.scale(px, px); draw(g, 0, 0, q[2] / px); g.restore(); g._c = null;
  }
  /** a line that shines from a (where it is hidden-tested in ISO, like a glow) to b: a tracer, a zap's arc. draw(g, A,
   *  B, k) gets both screen points and the pixels a unit at a */
  glowLine(a, b, draw) {
    const d = this.depth;
    if (!d) { this.glows.push([a[0], a[1], a[2], (g, sx, sy, k) => { const B = this.r.w(b[0], b[1], b[2]); draw(g, [sx, sy], B, k); }, null]); return; }
    this.items.push({ k: Math.min(d.depth(a[0], a[1]), d.depth(b[0], b[1])) - .02, kind: 'glow', fn: g => { const A = d.proj(a[0], a[1], a[2]), B = d.proj(b[0], b[1], b[2]); if (A && B) draw(g, A, B, A[2]); } });
  }
  /** a light this frame (a muzzle flash, a fire, a room's lamp): the engine's canvas lights in ISO (o: its options:
   *  { color }), MOTOR's pools in TOP and MODE 7 */
  light(x, y, z, radius, intensity = 1, o) {
    if (!this.depth) { const L = this.game.lights; if (L && L.enabled) L.add(x, y, z, radius, intensity, o); return; }
    this.lamps.push([x, y, z, radius * Math.min(1.2, intensity)]);
  }
  // the engine's particles in a depth view: its own drawing, through a stand-in renderer whose projection, queue and
  // cull are the view's (sizes at the focus's scale: MODE 7's far ones a little large)
  _depthParticles(d) {
    const P = this.game.particles; if (!P || !P.list.length || !this._partDraw) return;
    const r = this.r, f = this.focus || [d.x, d.y], q0 = d.proj(f[0], f[1], 0), scale = q0 ? q0[2] : 1, self = this;
    const fake = { view: { scale, pitchDeg: 10, isTop: false }, ix: 0, iy: 0, bw: r.bw, bh: r.bh,
      w: (x, y, z) => { const q = d.proj(x, y, z); return q ? [q[0], q[1]] : [-9999, -9999]; },
      visible: (x, y, z) => self.onScreen(x, y, z, z, 12),
      queue: (x, y, z, fn, o) => self.items.push({ k: d.depth(x, y) - ((o && o.bias) || 0) * .01, kind: 'fx', fn }),
      decal: fn => self.floorFx.push(g => fn(g)), overlay: fn => r.overlay(fn), groundRing() {} };
    this._partDraw(fake);
  }
  _isoGlows(g, r) {
    if (!this.glows.length) return;
    const k = r.view.scale, wet = this.skyNow ? this.skyNow.wet : 0; g.save(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    for (const [x, y, z, draw, reflect, always] of this.glows) {
      const [sx, sy] = r.w(x, y, z); if (sx < -40 || sy < -60 || sx > r.bw + 40 || sy > r.bh + 40) continue;
      if (reflect && wet > .1 && !this._hidden(r, x, y, 1)) { const [fx, fy] = r.w(x, y, 0); reflect(g, fx, fy, k, wet); }
      if (always || !this._hidden(r, x, y, z)) draw(g, sx, sy, k);
    }
    g.restore(); g._c = null;
  }
  // is the screen point of (x, y, z) behind a wall drawn this frame (ISO)? Down the screen from the point, past its own
  // ground spot (toward the camera), any wall whose drawn top reaches up to the point covers it
  _hidden(r, x, y, z) {
    const W = this.world, map = W && W.map; if (!map) return false;
    const v = r.view, up = -v.bz, T = map.T; if (!(up > 0)) return false;
    if (this._maxH === null || this._maxMap !== map) { let m = 0; for (const t in map.types) m = Math.max(m, +map.types[t].h || 0); this._maxH = m; this._maxMap = map; }
    const [sx, sy] = r.w(x, y, z), X = sx + r.ix, Y = sy + r.iy, k0 = Math.ceil(up * z / 2) + 1, k1 = Math.ceil(up * this._maxH / 2);
    for (let k = k0; k <= k1; k++) {
      const p = v.toGround(X, Y + 2 * k); if (!p) return false;
      const cx = Math.floor(p[0] / T), cy = Math.floor(p[1] / T), id = map.cell(cx, cy); if (id <= 0) continue;
      const t = map.types[id], h = map.cutAt && map.cutAt(cx, cy, v) ? (t.cutH || 6) : t.h;
      if (2 * k <= up * h) return true;
    }
    return false;
  }
  /** could something at (x, y), from height z0 up to z1, about rad units across, be on screen this frame? A cheap cull
   *  for whoever queues many small things (deck slabs, props, signs): nothing queued off screen costs a draw */
  onScreen(x, y, z0 = 0, z1 = z0, rad = 16) {
    const d = this.depth, r = this.r; if (!r) return true;
    if (!d) {
      const s = r.view.scale, m = rad * s + 8, a = r.w(x, y, z0), b = r.w(x, y, z1);
      return Math.max(a[0], b[0]) > -m && Math.min(a[0], b[0]) < r.bw + m && Math.max(a[1], b[1]) > -m && Math.min(a[1], b[1]) < r.bh + m;
    }
    if (d === this.side7 && d.depth(x, y) > d.farClip) return false;   // (past MODE 7's far clip the buildings are gone: so is what stands on them)
    const a = d.proj(x, y, z0), b = d.proj(x, y, z1); if (!a && !b) return false; if (!a || !b) return true;
    const m = rad * Math.max(a[2], b[2]) + 8;
    return Math.max(a[0], b[0]) > -m && Math.min(a[0], b[0]) < r.bw + m && Math.max(a[1], b[1]) > -m && Math.min(a[1], b[1]) < r.bh + m;
  }
  /** an actor drawn by code with an engine View (a rig): o { shadow: radius, xray, alpha, crowd, key, pose }. A crowd
   *  actor takes the engine's fast path in ISO (no outline or rim: the composite costs about half a millisecond a body);
   *  the player and named characters keep them. A crowd actor with a key (any object of its own: its rig) is drawn every
   *  TUNE.crowdEvery frames into an image of its own, reused in between where it stands now; o.pose(seconds) runs just
   *  before each redraw with the time since the last (a rig's animation steps only when it is seen) */
  actor(x, y, z, draw, o = {}) {
    const d = this.depth, r = this.r;
    if (!d) {
      if (!this.onScreen(x, y, z, z + 40, 24)) return;   // (off the screen: not even its shadow, a draw call a body)
      if (o.shadow) r.shadow(x, y, o.shadow, .5 * (o.alpha ?? 1));
      if (o.crowd && o.key && TUNE.crowdEvery > 1) {   // (the engine's own every works on its composite path only, dearer than this)
        const far = this._far(x, y);
        r.queue(x, y, z, g => { const [a, b] = r.w(x, y, z); if (o.alpha < 1) g.globalAlpha = o.alpha; this._keptDraw(g, r.view, r.view.yawDeg, o.key, Math.round(a), Math.round(b), r.view.scale, draw, o.pose, far); g.globalAlpha = 1; }, { solid: true, actor: true });   // (o.alpha: a new arrival fading in)
        return;
      }
      r.actor(x, y, z, (g, ox, oy) => { if (o.pose) o.pose(1 / 60); draw(g, ox, oy, r.view, r.view.scale); }, o.crowd ? CROWD : o.xray ? XRAY : undefined); return;
    }
    if (!this.onScreen(x, y, z, z + 40, 24)) return;   // (off the screen: not drawn, its image not redrawn)
    let k = d.depth(x, y);
    if (d === this.top && z > 2 && this.spans) { const s = this.spans.at(x, y); if (s && s.h <= z + 2) k = Math.min(k, this._spanKey(x, y, k)); }   // (TOP-DOWN: a body up on a roof drawn just after the roof it stands on, not under it)
    if (d === this.side7 && !o.xray && this._hidesFocus(d, x, y, z, k)) o = { ...o, alpha: Math.min(o.alpha ?? 1, .45) };   // (between MODE 7's lens and the player, over them on screen: see-through, never a wall of body)
    const q = d === this.side7 && z >= 0 && d.proj(x, y, z);   // (MODE 7: a body's box on screen, for the walls to hide it: its rig's reach)
    this.items.push({ k, actor: true, m: k - 16, box: q ? [q[0] - 16 * q[2], q[0] + 16 * q[2], q[1] - 56 * q[2]] : null, fn: g => {
      const p = d.proj(x, y, z); if (!p) return;
      if (o.shadow) { const s = d.proj(x, y, 0); if (s) { g.fillStyle = 'rgba(5,3,12,.45)'; g.beginPath(); g.ellipse(s[0], s[1], o.shadow * s[2] * 1.1, Math.max(1, o.shadow * s[2] * (d === this.top ? 1.1 : .45)), 0, 0, Math.PI * 2); g.fill(); } }
      if (o.alpha !== undefined) g.globalAlpha = o.alpha;
      const sx = Math.round(p[0]), sy = Math.round(p[1]);
      if (o.crowd && o.key && TUNE.crowdEvery > 1 && 52 * p[2] + 12 <= BODY_KEPT_MAX) this._keptDraw(g, d.view(p[2]), d.heading, o.key, sx, sy, p[2], draw, o.pose, this._far(x, y)); else { if (o.pose) o.pose(1 / 60); draw(g, sx, sy, d.view(p[2]), p[2]); }
      g.globalAlpha = 1;
    } });
  }
  // MODE 7: does a body at (x, y, z), k along the rail, stand nearer the lens than the player and over them on screen?
  // (about a body's box each: half a body's width either side, its height up)
  _hidesFocus(d, x, y, z, k) {
    const f = this.focus; if (!f || k >= d.depth(f[0], f[1]) - 8) return false;
    const a = d.proj(x, y, z), b = d.proj(f[0], f[1], 0); if (!a || !b) return false;
    const wa = 12 * a[2], wb = 12 * b[2];
    return Math.abs(a[0] - b[0]) < wa + wb && a[1] > b[1] - 44 * b[2] && a[1] - 44 * a[2] < b[1];
  }
  // TOP-DOWN's draw key just after the span over (x, y) (a span's key is its footprint's nearest point to the centre), or
  // k where no span stands there
  _spanKey(x, y, k) { const s = this.spans && this.spans.at(x, y), d = this.top; return s ? Math.hypot(E.clamp(d.x, s.x0, s.x1) - d.x, E.clamp(d.y, s.y0, s.y1) - d.y) - .01 : k; }
  // is (x, y) away from the player (the focus), where the eye is not? A crowd body there redraws its frames less often
  _far(x, y) { const f = this.focus; return !!f && Math.abs(x - f[0]) + Math.abs(y - f[1]) > FAR_BODY; }
  // a crowd body: drawn into its own image every few frames (or when its size or the view changed), and that image put
  // where it stands in between (each actor's frames are staggered by its key's own phase, so the work spreads evenly)
  _keptDraw(g, view, heading, key, sx, sy, k, draw, pose, far = false) {
    let K = this._kept.get(key);
    // (small on screen, far off or seen from high up: its frames half as often; away from the player, two thirds as often)
    const every = k < SMALL ? TUNE.crowdEvery * 2 : far ? Math.round(TUNE.crowdEvery * 1.5) : TUNE.crowdEvery;
    if (!K || this.frameNo - K.n >= every || Math.abs(K.k - k) > K.k * .12 || K.view.id !== view.id || K.heading !== heading) {
      if (pose) { const now = this.game.real; pose(K && K.t !== undefined ? Math.min(.5, now - K.t) : 1 / 60); if (K) K.t = now; }
      const w = Math.ceil(30 * k) + 12, h = Math.ceil(52 * k) + 12, foot = Math.ceil(8 * k) + 6;
      // (its canvas in steps of 16 px with room to grow, as _keptShape's: never reallocated for a pixel as it nears)
      const cw = Math.ceil(w * 1.25 / 16) * 16, ch = Math.ceil(h * 1.25 / 16) * 16;
      if (!K) { K = { cv: E.mkCanvas(cw, ch) }; this._kept.set(key, K); }
      else if (K.cv.width < w || K.cv.height < h || K.cv.width > w * 2) { K.cv.width = cw; K.cv.height = ch; }
      const kg = K.g || (K.g = K.cv.getContext('2d')); kg.setTransform(1, 0, 0, 1, 0, 0); kg.clearRect(0, 0, K.cv.width, K.cv.height); kg.imageSmoothingEnabled = false;
      K.ax = Math.floor(K.cv.width / 2); K.ay = K.cv.height - foot; draw(kg, K.ax, K.ay, view, k); kg._c = null;
      if (K.n === undefined) { K.phase = (this._keptN = (this._keptN || 0) + 1) % TUNE.crowdEvery; K.t = this.game.real; }   // (staggered: a part of a crowd redraws each frame)
      Object.assign(K, { n: this.frameNo - (K.fresh ? 0 : K.phase), k, view, heading }); K.fresh = true;
    }
    g.drawImage(K.cv, sx - K.ax, sy - K.ay);
  }
  /** a shape drawn through a projector: draw(g, P) with P.proj(x, y, z) -> [sx, sy, k] (vehicles, props, markers).
   *  o: the engine queue's options in ISO ({ emissive, bias, hides, footprint }); wall: [x, y], a point of the wall it
   *  hangs on (TOP-DOWN draws it after that building); and kept: { key, r, h } for a shape
   *  that looks the same from frame to frame (a parked car): drawn once into an image of its own (r: its reach round
   *  (x, y), h: its height, d: how far it reaches below z, in world units; sig: a string that changes when its look
   *  does) and put where it stands until the view, its size or its sig changes. In ISO many shapes may share one key
   *  (the city's props, its deck cells): the projection is the same everywhere there */
  /** the view's projector this frame ({ proj(x, y, z) -> [sx, sy, k] }), for whoever must work out where a thing lands
   *  on the screen before it queues it (a sign's board, sliced along its wall) */
  projector() { return this.depth || this._isoProj(this.r); }
  shape(x, y, z, draw, o) {
    const d = this.depth, r = this.r, kept = o && o.kept;
    if (!d) { r.queue(x, y, z, kept ? g => this._keptShape(g, this._isoProj(r), r.view, x, y, z, draw, kept) : g => draw(g, this._isoProj(r)), o); return; }
    // (a kept image only while the shape is small on screen: near MODE 7's lens a parked car's box ran to hundreds of
    // pixels a side, its image redrawn every few frames at that size, dearer than drawing it)
    const q = kept && d.proj(x, y, z), big = q && kept.r * q[2] > KEPT_MAX;
    let k = d.depth(x, y) - (o && o.bias || 0);
    if (d === this.top && o && o.wall) k = Math.min(k, this._spanKey(o.wall[0], o.wall[1], k));   // (TOP-DOWN: a sign drawn after the building it hangs on)
    else if (d === this.top && z > 2 && this.spans) { const s = this.spans.at(x, y); if (s && s.h <= z + 2) k = Math.min(k, this._spanKey(x, y, k)); }   // (and a thing on a roof after the roof: under it, every roof's clutter was hidden)
    const it = { k, kind: (o && o.kind) || 'shape', fn: kept && !big ? g => this._keptShape(g, d, d.view(1), x, y, z, draw, kept) : g => draw(g, d) };
    if (d === this.side7 && o && o.reach) this._reachBox(d, it, x, y, o.reach);   // (o.reach: [r, z0, z1], what the walls may hide)
    this.items.push(it);
  }
  // MODE 7: a shape's box on screen and its nearest depth, from its reach (r round (x, y), from z0 up to z1), for _cull7
  _reachBox(d, it, x, y, [r, z0, z1]) {
    let x0 = 1e9, x1 = -1e9, top = 1e9;
    for (let i = 0; i < 8; i++) { const p = d.proj(x + (i & 1 ? r : -r), y + (i & 2 ? r : -r), i & 4 ? z1 : z0); if (!p || z0 < 0) return; x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); top = Math.min(top, p[1]); }
    it.box = [x0, x1, top]; it.m = d.depth(x, y) - r * Math.SQRT2;
  }
  // MODE 7's occlusion: the camera is level and every wall stands on the floor, so a wall face wholly nearer than a
  // thing hides it over the face's columns from the face's top down (the thing's foot, farther off, is always higher on
  // screen than the wall's). The faces (it.occ: an opaque face's top edge) are taken near to far, and the items with a
  // box on screen (it.box: x0, x1, top) by their nearest depth (it.m): each item is tested against the faces wholly
  // nearer than it (their far depth, the key, under its nearest), which are drawn after it, and left out when it lies
  // under their tops in every column it spans. Exact: what it leaves out would be drawn over
  _cull7(W) {
    const cov = this._cov && this._cov.length === W ? this._cov.fill(1e9) : (this._cov = new Float32Array(W).fill(1e9)), I = this.items, cand = [];
    for (const it of I) if (it.box) cand.push(it);
    cand.sort((a, b) => (a.m ?? a.k) - (b.m ?? b.k));
    let p = I.length - 1, culled = 0;   // (the items run far to near: from the end, the faces come near to far)
    for (const it of cand) {
      const m = it.m ?? it.k;
      for (; p >= 0 && I[p].k < m; p--) {
        const o = I[p].occ; if (!o) continue;
        const [xa, ya, xb, yb] = o[0] <= o[2] ? o : [o[2], o[3], o[0], o[1]], sl = xb - xa > 1e-6 ? (yb - ya) / (xb - xa) : 0;
        for (let c = Math.max(0, Math.ceil(xa)), c1 = Math.min(W, Math.floor(xb)); c < c1; c++) { const t = Math.max(ya + (c - xa) * sl, ya + (c + 1 - xa) * sl); if (t < cov[c]) cov[c] = t; }
      }
      const b = it.box, c0 = Math.max(0, Math.floor(b[0])), c1 = Math.min(W - 1, Math.ceil(b[1])); if (c1 < c0) continue;
      let hid = true; for (let c = c0; c <= c1; c++) if (cov[c] > b[2]) { hid = false; break; }
      if (hid) { it.culled = true; culled++; }
    }
    this.side7.stats.culled = culled;
  }
  // a kept shape: its image, redrawn when the view, its size on screen (depth views) or the frame's skew changed
  _keptShape(g, P, view, x, y, z, draw, kp) {
    const q = P.proj(x, y, z); if (!q) return;
    const k = q[2], key = kp.key; let K = this._kept.get(key);
    const tag = view.id + ':' + (view.yawDeg | 0) + ':' + (this.depth ? this.depth.heading : 0) + ':' + (this.depth ? 0 : view.scale) + ':' + (kp.sig || '');   // (sig: the shape's own state: a parked car's dents, lights, doors)
    if (!K || K.tag !== tag || Math.abs(K.k - k) > K.k * .06 || (this.depth && this.frameNo - K.n >= 8)) {
      // the image covers what the shape can reach on screen in this view: the corners of its box round (x, y) up to its
      // height, projected (TOP-DOWN shows the whole footprint below the anchor; ISO only part of it)
      let bx0 = q[0], by0 = q[1], bx1 = q[0], by1 = q[1];
      for (let i = 0; i < 8; i++) { const p = P.proj(x + (i & 1 ? kp.r : -kp.r), y + (i & 2 ? kp.r : -kp.r), z + (i & 4 ? kp.h : -(kp.d || 0))); if (p) { bx0 = Math.min(bx0, p[0]); by0 = Math.min(by0, p[1]); bx1 = Math.max(bx1, p[0]); by1 = Math.max(by1, p[1]); } }
      const ax = Math.ceil(q[0] - bx0) + 6, ay = Math.ceil(q[1] - by0) + 6, w = Math.ceil((ax + bx1 - q[0] + 6) / 16) * 16, h = Math.ceil((ay + by1 - q[1] + 6) / 16) * 16;   // (sizes in steps of 16: a canvas is never resized for a pixel)
      if (!K) { K = { cv: E.mkCanvas(w, h) }; this._kept.set(key, K); }
      if (K.cv.width < w || K.cv.height < h || K.cv.width > w * 2 || K.cv.height > h * 2) { K.cv.width = w; K.cv.height = h; }
      const kg = K.g || (K.g = K.cv.getContext('2d')); kg.setTransform(1, 0, 0, 1, 0, 0); kg.clearRect(0, 0, K.cv.width, K.cv.height); kg.imageSmoothingEnabled = false;
      const sx = q[0], sy = q[1], LP = { proj: (a, b, c = 0) => { const p = P.proj(a, b, c); return p && [p[0] - sx + ax, p[1] - sy + ay, p[2]]; }, depth3: P.depth3 ? (a, b, c) => P.depth3(a, b, c) : undefined };
      draw(kg, LP); kg._c = null; Object.assign(K, { tag, k, n: this.frameNo, ax, ay });
    }
    g.drawImage(K.cv, Math.round(q[0] - K.ax), Math.round(q[1] - K.ay));
  }
  /** one of the engine's props (E.PROPS: 'streetlamp', 'palm', 'trashcan'...): r.prop's billboard in ISO (o: its options:
   *  size, light, lightRadius...), the same sprite scaled to its distance in TOP and SIDE7 */
  prop(name, x, y, z, o = {}) {
    const d = this.depth, r = this.r;
    if (!d) { r.prop(name, x, y, z, o); return; }
    const p = E.prop(name, o.size ? { size: o.size } : undefined); if (!p) return;
    const spr = p.frames[0];
    if (o.light && p.light) this.lamps.push([x, y, z, o.lightRadius || 70]);
    const q = d === this.side7 && z >= 0 && d.proj(x, y, z), qs = q && q[2] / Math.SQRT2, box = q && !(p.glowAt && o.light && o.halo !== false) ? [q[0] - spr.w * qs / 2 - 1, q[0] + spr.w * qs / 2 + 1, q[1] - spr.h * qs - 1] : null;   // (MODE 7: its sprite's box, for the walls to hide it; a halo reaches wider)
    this.items.push({ k: d.depth(x, y), m: d.depth(x, y) - 4, box, kind: 'prop', fn: g => {
      const q = d.proj(x, y, z); if (!q) return;
      const s = q[2] / Math.SQRT2, w = spr.w * s, h = spr.h * s; if (h < 1) return;   // (sprites are drawn for ISO's sqrt 2 pixels a unit)
      g.drawImage(spr.cv, Math.round(q[0] - w / 2), Math.round(q[1] - h), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
      if (p.glowAt && o.light && o.halo !== false) { const gx = q[0] - w / 2 + w * p.glowAt[0], gy = q[1] - h + h * p.glowAt[1], R = Math.max(2, w * .9); g.globalAlpha = .25; g.fillStyle = p.glowAt[2]; g.beginPath(); g.arc(gx, gy, R, 0, 6.3); g.fill(); g.globalAlpha = 1; }
    } });
  }
  // MOTOR's light pass for TOP and MODE 7: the dark over the whole frame (the engine's own numbers: ambient, dark and
  // darkness, so every view matches the hour), the lamps' pools cut out of it on the ground (round from above,
  // flattened along MODE 7's floor), then a little of their warmth added back
  _depthLight(g, d) {
    const L = this.game.lights, r = this.r, W = r.bw, H = r.bh, a = E.clamp((1 - L.ambient) * (L.darkness === undefined ? .9 : L.darkness), 0, 1);
    if (a < .01) return;
    const S = Math.max(1, TUNE.depthLightRes | 0), w = Math.ceil(W / S), h = Math.ceil(H / S);
    if (!this._lcv || this._lcv.width !== w || this._lcv.height !== h) { this._lcv = E.mkCanvas(w, h); this._gcv = E.mkCanvas(w, h); }
    const lg = this._lcv.getContext('2d'), dk = L.dark || [10, 6, 24], flat = d === this.top ? 1 : .34, pools = [];
    for (const [x, y, , R] of this.lamps) { const q = d.proj(x, y, 0); if (q && R * q[2] >= 2 && q[0] > -R * q[2] && q[0] < W + R * q[2]) pools.push([q[0] / S, q[1] / S, R * q[2] / S]); }
    lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, w, h);
    lg.fillStyle = `rgba(${dk[0]},${dk[1]},${dk[2]},${a.toFixed(3)})`; lg.fillRect(0, 0, w, h);
    const warm = Math.round(48 * (L.tint === undefined ? .32 : L.tint) / .32), hole = poolDisc('rgba(0,0,0,.95)', 'rgba(0,0,0,0)');
    lg.globalCompositeOperation = 'destination-out';
    for (const [x, y, rad] of pools) lg.drawImage(hole, x - rad, y - rad * flat, rad * 2, rad * 2 * flat);
    // the dark, then the warmth added on top ('lighter'), each scaled up smoothly
    const gg = this._gcv.getContext('2d'), glow = poolDisc(`rgba(${warm},${Math.round(warm * .62)},${Math.round(warm * .25)},1)`, 'rgba(0,0,0,1)');   // (sodium orange, as ISO's lamps)
    gg.globalCompositeOperation = 'source-over'; gg.fillStyle = '#000'; gg.fillRect(0, 0, w, h); gg.globalCompositeOperation = 'lighter';
    let x0 = w, y0 = h, x1 = 0, y1 = 0;   // (the pools' box: the warmth is added there only, black adds nothing elsewhere)
    for (const [x, y, rad] of pools) { const q = rad * .8; gg.drawImage(glow, x - q, y - q * flat, q * 2, q * 2 * flat); x0 = Math.min(x0, x - q); x1 = Math.max(x1, x + q); y0 = Math.min(y0, y - q * flat); y1 = Math.max(y1, y + q * flat); }
    const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = S > 1;
    g.drawImage(this._lcv, 0, 0, w, h, 0, 0, w * S, h * S);
    x0 = Math.max(0, Math.floor(x0) - 1); y0 = Math.max(0, Math.floor(y0) - 1); x1 = Math.min(w, Math.ceil(x1) + 1); y1 = Math.min(h, Math.ceil(y1) + 1);   // (a cell of margin: the smooth scaling reads its neighbours)
    if (pools.length && x1 > x0 && y1 > y0) { g.globalCompositeOperation = 'lighter'; g.drawImage(this._gcv, x0, y0, x1 - x0, y1 - y0, x0 * S, y0 * S, (x1 - x0) * S, (y1 - y0) * S); g.globalCompositeOperation = 'source-over'; }
    g.imageSmoothingEnabled = sm;
  }
  // what lies on a depth view's floor: the wet street's tint below the horizon, then the floor decals
  _floorFx(g, d, top) {
    const r = this.r, sky = this.skyNow;
    if (sky && sky.wet > .02) { g.save(); g.beginPath(); g.rect(0, top, r.bw, r.bh - top); g.clip(); this.wfx.floor(g, r.bw, r.bh, sky); g.restore(); }
    for (const f of this.floorFx) f(g, d);
  }
  /** finish the frame: in a depth view, the sky, the floor, then the spans and everything queued, far to near */
  end() {
    const d = this.depth; if (!d) return;
    const r = this.r, g = r.ctx, W = this.world, S = W.floor ? W.floor.size : 256;
    g.save(); g.imageSmoothingEnabled = false; d.stats.quads = 0;
    const flush = this.profFlush ? () => g.getImageData(0, 0, 1, 1) : () => {};   // (?prof=1: each section's raster paid where it is drawn, not at the present)
    const clock = typeof performance !== 'undefined' ? () => performance.now() : () => 0; flush();
    const T = [clock()], mark = () => { flush(); T.push(clock()); };   // (where the frame goes: draw-side profiling, read by tools/perf.mjs)
    const queued = this._t0 ? T[0] - this._t0 : 0;
    let spans = [];
    if (d === this.side7) {
      d.drawSky(g, Math.max(0, d.P.hy), W.backdrop, r); mark();
      if (W.floor) { const [i0, j0, i1, j1] = d.wedge(S); W.floor.tick(); for (let j = Math.max(0, j0); j <= j1; j++) for (let i = Math.max(0, i0); i <= i1; i++) W.floor.canvas(i, j); W.floor.pump(d.x, d.y); d.drawFloor(g, W.floor); }
      mark(); this._floorFx(g, d, Math.max(0, Math.floor(d.P.hy))); mark();
      if (this.spans) { const [i0, j0, i1, j1] = d.wedge(S); spans = this.spans.range(i0, j0, i1, j1); d.spanItems(spans, this.items, this.focus, W.night); }
    } else {
      g.fillStyle = d.bg || '#0a0812'; g.fillRect(0, 0, r.bw, r.bh); mark();
      if (W.floor) { const [i0, j0, i1, j1] = d.range(S, S / 2); W.floor.tick(); for (let j = Math.max(0, j0); j <= j1; j++) for (let i = Math.max(0, i0); i <= i1; i++) W.floor.canvas(i, j); W.floor.pump(d.x, d.y); d.drawFloor(g, W.floor); }
      mark(); this._floorFx(g, d, 0); mark();
      if (this.spans) { const [i0, j0, i1, j1] = d.range(S); spans = this.spans.range(i0, j0, i1, j1); d.spanItems(spans, this.items, W.night); }
    }
    this._depthParticles(d); mark();
    // far to near; at equal keys the actor last (it stands in front of the face it touches)
    this.items.sort((a, b) => b.k - a.k || (a.actor ? 1 : 0) - (b.actor ? 1 : 0));
    if (d === this.side7) this._cull7(r.bw);
    let actors = 0, ta = 0; const each = !!this.profFlush, by = each ? (d.stats.byKind ||= {}) : null;   // (each item timed by its kind only when profiling: a clock call an item costs)
    for (const it of this.items) {
      if (it.culled) continue;
      if (each) { const t = clock(); it.fn(g); flush(); const dt = clock() - t, kd = it.actor ? 'actor' : it.kind || 'other'; by[kd] = (by[kd] || 0) + dt; by[kd + '#'] = (by[kd + '#'] || 0) + 1; if (it.actor) { ta += dt; actors++; } }
      else { it.fn(g); if (it.actor) actors++; }
    }
    mark(); if (this.game.lights && this.game.lights.enabled) this._depthLight(g, d);
    mark(); if (this.skyNow) this.wfx.draw(g, d, r.bw, r.bh, this.skyNow); mark();
    const M = d.stats.ms || (d.stats.ms = { frames: 0, queue: 0, sky: 0, floor: 0, floorFx: 0, spans: 0, items: 0, light: 0, weather: 0 });
    M.frames++; M.queue += queued; M.actors = (M.actors || 0) + ta; ['sky', 'floor', 'floorFx', 'spans', 'items', 'light', 'weather'].forEach((k, i) => { M[k] += T[i + 1] - T[i]; });
    this.fade.draw(g, this._dt);   // (the last view dissolving: over the world, under the marks and the HUD)
    for (const f of this.marks) f();   // (glows that always show: a lock-on's mark, over the dark and the weather)
    g.restore(); g._c = null;
    d.stats.actors = actors; d.stats.spans = spans.length; d.stats.items = this.items.length;
    this.game.stats.actors = actors;   // (the engine's checker counts the characters on screen)
  }
}
