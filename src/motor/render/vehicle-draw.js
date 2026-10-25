// Drawing vehicles (PLAN.md 8.8, 10): through the Stage, so each one looks right in ISO, TOP and MODE 7. It reads the
// Fleet and draws; it never changes the simulation (each vehicle's `look` is eased here: presentation only).
//   - the model with its paint, dents, steering front wheels, open doors, lights (head, brake, reverse), the siren's
//     alternating lamps; a wreck charred, on its roof if it landed so; a bike leaning into turns and wheelieing off the
//     line; a boat bobbing; a heli tilted into its push with its rotor turning and its spotlight on the ground; the L;
//   - parked vehicles are kept images (D13), redrawn only when their look changes; in ISO a moving car's image is kept
//     too, while its heading and look hold, and in MODE 7 while it is small on screen and its bearing from the lens
//     holds too (2 degree steps; the Stage redraws a depth view's kept image every 8 frames and at 6% of size anyway);
//   - at night: headlight pools and beams, tail lights, the siren's lights;
//   - VehicleFX: skid marks on the floor, tyre smoke, sparks off scrapes, engine smoke and fire, debris, the wake, the
//     water cannon's jet, oil slicks and mines, the hydrant's spray.
import { E } from '../engine.js';
import { TUNE } from '../core/tune.js';
import { drawBoxModel } from './box-model.js';

const SKID_LIFE = 40;   // seconds a skid mark lasts (it fades over its life)
const HEADING_STEP = Math.PI / 90;   // (a moving car's kept image: redrawn when its heading, or in MODE 7 its bearing, moves 2 degrees)

/** ease a vehicle's cosmetic look toward what its body feels (dt: real seconds since its last frame) */
export function easeLook(v, dt) {
  const b = v.body, L = v.look; if (!b) return L;
  const k = 1 - Math.exp(-dt * 8);
  if (v.cls === 'bike') {
    const lean = E.clamp(b.felt.lat / 520, -.55, .55) * Math.min(1, b.speed / 50);   // (leans into the turn: the inside low)
    L.lean += (lean - L.lean) * k;
    const pop = b.felt.lon > 110 && b.speed > 15 && b.speed < 130 && b.ctl.throttle > .9 ? .22 : 0;
    L.wheelie += (pop - L.wheelie) * (1 - Math.exp(-dt * (pop ? 4 : 7)));
    L.roll = L.lean; L.pitch = -L.wheelie;
  } else if (v.cls === 'heli') { L.roll = b.tiltS || 0; L.pitch = b.tiltF || 0; }
  else if (v.cls === 'boat') {
    const t = (v._t = (v._t || 0) + dt), ph = ((typeof v.id === 'number' ? v.id : String(v.id).length) * 1.7) % 6.3, sp = Math.min(1, b.speed / 120);   // (ids are numbers)
    L.roll = Math.sin(t * 1.9 + ph) * .04 + E.clamp(b.felt.lat * .0008, -.15, .15);
    L.pitch = Math.sin(t * 1.3 + ph) * .03 - sp * .08;   // (the bow rises as it planes)
    L.squash = Math.sin(t * 2.3 + ph) * 1.2;
  } else {
    L.roll += (E.clamp(-b.felt.lat * .0005, -.12, .12) - L.roll) * k;
    L.pitch += (E.clamp(b.felt.lon * .0004, -.08, .08) - L.pitch) * k;
    if (b.felt.land > 80) L.squash = Math.min(5, b.felt.land / 60);
    L.squash *= Math.exp(-dt * 6);
    if (b.lifted) L.pitch = b.lifted === 'front' ? -.12 : .12;   // (on the hook: one end up)
  }
  if (b.rollA) L.roll = b.rollA;
  return L;
}

/** draw one vehicle. o: { night, dt (real seconds since the last frame), t (real time) } */
export function drawVehicle(stage, v, o = {}) {
  const b = v.body; if (!b) return;
  const look = easeLook(v, o.dt ?? 1 / 60), wreck = v.wrecked;
  const rearX = v.cls === 'bike' && look.wheelie > .001 ? v.model.wheels.reduce((m, w) => Math.min(m, w.x), 0) : 0;   // (a wheelie turns about the rear tyre)
  const z = b.z - (v.sinking ? Math.min(1, v.sinking / TUNE.sinkTime) * v.height * .85 : 0) + (v.cls === 'boat' ? look.squash : -look.squash * .4) - rearX * Math.sin(look.wheelie || 0);
  const lit = !wreck && v.lights.head, siren = v.siren ? (v.sirenT * 2.4) % 1 : undefined;
  // open doors: a slab hinged at each one's front edge, swung out (a bike or a boat has none to swing)
  let extra = null, doorSig = '';
  if (v.cls !== 'bike' && v.cls !== 'boat') for (const d of v.model.doors) {
    const open = v.doors[d.id] || 0; if (open < .02 || !d.side) continue;
    const hx = d.x + 7, hy = d.side * v.model.width / 2, H = v.model.height, ang = -d.side * open * 1.15;
    (extra ||= []).push({ box: [hx - 12, hy - .8, H * .18, hx, hy + .8, H * .6], color: v.color, role: 'body', turn: ang, pivot: [hx, hy] });
    doorSig += d.id + open.toFixed(2);
  }
  const opts = { roll: look.roll, pitch: look.pitch, steer: v.cls === 'bike' || v.cls === 'boat' ? 0 : b.steerAngle, rotor: b.rotor || 0, lit, braking: v.lights.brake, reversing: v.lights.reverse,
    siren, paint: v.color, burnt: wreck, cracked: v.damage.share < .5, dents: v.damage.dents, extra };
  const plain = !v.damage.smoking && siren === undefined && !b.airborne && v.cls !== 'heli' && v.cls !== 'boat' && !v.sinking, still = plain && b.speed < .5;
  // ISO's projection is the same everywhere, so a car on the move looks the same wherever it is: its image is kept too,
  // redrawn when its heading (2 degree steps), lean, steering, lights or paint change (a car driving straight: once);
  // in MODE 7 a car looks the same while its bearing from the lens holds (TOP-DOWN leans it by where it is on screen)
  const d7 = stage.mode7, moving = plain && !still && (!stage.depth || d7) && v.cls !== 'bike';
  const sig = still ? `${b.heading.toFixed(3)}|${v.damage.hash()}|${lit ? 1 : 0}${v.lights.brake ? 1 : 0}|${doorSig}|${v.color}|${b.steerAngle.toFixed(2)}`
    : moving ? `m${Math.round(b.heading / HEADING_STEP)}|${Math.round(look.roll / .03)}|${Math.round(look.pitch / .02)}|${Math.round(b.steerAngle / .1)}|${v.damage.hash()}|${lit ? 1 : 0}${v.lights.brake ? 1 : 0}${v.lights.reverse ? 1 : 0}|${doorSig}|${v.color}|${wreck ? 1 : 0}${d7 ? '|' + Math.round(Math.atan2(d7.lateral(b.x, b.y), d7.depth(b.x, b.y)) / HEADING_STEP) : ''}` : '';
  const draw = (g, P) => drawBoxModel(g, P, v.model, b.x, b.y, z, b.heading, opts);
  const reach = [v.hl + 6, z, z + v.height + 8];   // (what MODE 7's walls may hide)
  stage.shape(b.x, b.y, z, draw, still || moving ? { kept: { key: v, r: v.hl + 6, h: v.height + 8, sig }, kind: 'car', reach } : { kind: 'car', reach });
  if (v.cls === 'heli') drawHeliExtras(stage, v, o);
  if (o.night && !wreck) drawNightLights(stage, v, z);
  if (siren !== undefined) {   // the bar's lamps: alternating red and blue glows, and a light either side
    for (const [lx, ly, lz] of v.model.lights.siren) {
      const red = siren < .5, [wx, wy] = v.toWorld(lx, ly + (red ? -4 : 4));
      stage.glow(wx, wy, z + lz + 1, (g, sx, sy, k) => { const r = Math.max(2, 3.2 * k), op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter'; E.px.disc(g, sx, sy, r * 2, red ? 'rgba(255,40,40,.35)' : 'rgba(50,110,255,.35)'); E.px.disc(g, sx, sy, r, red ? '#ff6a6a' : '#7aa8ff'); g.globalCompositeOperation = op; });
      if (o.night) stage.light(wx, wy, z + lz, 64, .7);
    }
  }
}
// headlight pools and beams ahead, tail lights behind (at night)
function drawNightLights(stage, v, z) {
  const L = v.model.lights;
  if (v.lights.head && L.head.length) {
    const reach = v.cls === 'bike' ? 70 : 96, [px, py] = v.toWorld(v.hl + reach * .45, 0);
    stage.light(px, py, z, v.cls === 'bike' ? 40 : 58, .95);
    for (const [lx, ly, lz] of L.head) {
      const [ax, ay] = v.toWorld(lx + 1, ly), [bx, by] = v.toWorld(lx + reach, ly * 1.6);
      stage.glowLine([ax, ay, z + lz], [bx, by, z + 2], (g, A, B, k) => beam(g, A, B, k));
    }
  }
  if (L.tail.length && (v.lights.brake || v.lights.head)) for (const [lx, ly, lz] of L.tail) {
    const [x, y] = v.toWorld(lx - .5, ly), on = v.lights.brake;
    stage.glow(x, y, z + lz, (g, sx, sy, k) => { const r = Math.max(1, (on ? 2 : 1.2) * k), op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter'; E.px.disc(g, sx, sy, r * 1.8, on ? 'rgba(255,40,30,.4)' : 'rgba(200,20,20,.25)'); E.px.disc(g, sx, sy, r * .8, v.lights.reverse ? '#fff4e0' : '#ff5a4a'); g.globalCompositeOperation = op; });
  }
}
// a headlight's beam: a soft wedge widening from the lamp (A) to its reach (B)
function beam(g, A, B, k) {
  const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w0 = Math.max(1, 1.2 * k), w1 = Math.max(4, l * .32);
  const op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
  const gr = g.createLinearGradient(A[0], A[1], B[0], B[1]); gr.addColorStop(0, 'rgba(255,244,200,.32)'); gr.addColorStop(1, 'rgba(255,240,190,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(A[0] + nx * w0, A[1] + ny * w0); g.lineTo(B[0] + nx * w1, B[1] + ny * w1); g.lineTo(B[0] - nx * w1, B[1] - ny * w1); g.lineTo(A[0] - nx * w0, A[1] - ny * w0); g.closePath(); g.fill();
  E.px.disc(g, A[0], A[1], w0 * 1.4, '#fff8e0'); g.globalCompositeOperation = op;
}
// a heli's shadow on the ground under it, and its spotlight: a pool, and a faint shaft from it down to the pool
function drawHeliExtras(stage, v, o) {
  const b = v.body, g0 = o.ground ? o.ground(b.x, b.y) : 0;
  stage.floor((g, P) => { const q = P.proj(b.x, b.y, g0); if (!q) return; const k = q[2], rx = Math.max(4, v.hl * .8 * k), ry = Math.max(2, v.hw * .9 * k); g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(q[0], q[1], rx, ry, 0, 0, Math.PI * 2); g.fill(); });
  if (b.spot && !v.wrecked && o.night) {   // (its searchlight: after dark only; by day the beam doesn't show)
    const [sx, sy] = b.spot, gs = o.ground ? o.ground(sx, sy) : 0; stage.light(sx, sy, 0, 64, 1.5);
    stage.floor((g, P) => {   // (the pool itself: a hard-edged white disc on the ground, brighter than any street lamp's)
      const q = P.proj(sx, sy, gs); if (!q) return; const k = q[2], rx = 26 * k, ry = rx * (stage.depth === stage.top ? 1 : .5), op = g.globalCompositeOperation;
      g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], rx); gr.addColorStop(0, 'rgba(255,255,240,.55)'); gr.addColorStop(.75, 'rgba(240,245,255,.35)'); gr.addColorStop(1, 'rgba(240,245,255,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(q[0], q[1], rx, ry, 0, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = op; g._c = null;
    });
    stage.glowLine([b.x, b.y, b.z - 2], [sx, sy, 0], (g, A, B, k) => { const op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(A[0], A[1], B[0], B[1]); gr.addColorStop(0, 'rgba(230,240,255,.22)'); gr.addColorStop(1, 'rgba(230,240,255,.05)'); g.fillStyle = gr; const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = Math.max(6, 22 * k); g.beginPath(); g.moveTo(A[0] + nx * 2, A[1] + ny * 2); g.lineTo(B[0] + nx * w, B[1] + ny * w); g.lineTo(B[0] - nx * w, B[1] - ny * w); g.lineTo(A[0] - nx * 2, A[1] - ny * 2); g.closePath(); g.fill(); g.globalCompositeOperation = op; });
  }
}
/** draw an L train's cars (o.model: the rail model, o.color) */
export function drawTrain(stage, tr, model, o = {}) {
  for (const c of tr.cars) {
    const m = model, color = o.color || '#9aa2aa';
    stage.shape(c.x, c.y, c.z, (g, P) => drawBoxModel(g, P, m, c.x, c.y, c.z, c.heading, { paint: color, lit: o.night }), { kind: 'car' });
    if (o.night) { stage.light(c.x, c.y, c.z + 10, 70, .6); }
  }
}

/** the fleet's effects: particles once per new entry, skid marks, slicks, mines, jets, the wake */
export class VehicleFX {
  constructor(game) { this.game = game; this._done = new WeakSet(); this._wake = new Map(); }
  draw(stage, F, focus, o = {}) {
    const P = this.game.particles, R = o.radius || 600, fx = focus[0], fy = focus[1], now = F.t;
    const near = (x, y) => Math.abs(x - fx) < R && Math.abs(y - fy) < R;
    for (const f of F.fx) {
      if (this._done.has(f)) continue; this._done.add(f); if (!P || !near(f.x, f.y)) continue;
      if (f.kind === 'smoke') P.smoke(f.x, f.y, f.z, 1, { size: 2.6, light: true });
      else if (f.kind === 'sparks') P.sparks(f.x, f.y, f.z, f.n || 4, null, { color: '#ffd080', speed: 90 });
      else if (f.kind === 'engine') P.smoke(f.x, f.y, f.z, 1, { size: 2.4, dark: true });
      else if (f.kind === 'flame') { P.fire(f.x, f.y, f.z, 1); P.smoke(f.x, f.y, f.z + 6, 1, { size: 3, dark: true }); }
      else if (f.kind === 'explosion') P.explosion(f.x, f.y, f.z, 1.4, { debris: ['#3a3a40', '#5a5a62', '#8a2a1a'], sound: true, freeze: false });   // (the hit-stop is the blast's own, in the simulation: Combat's onBlast. One drawn here stopped the game at the next frame drawn near it, D33)
      else if (f.kind === 'splash') { P.ring(f.x, f.y, 6, 40, '#cfe8ff', .5, 0); P.dust(f.x, f.y, 2, 8, { color: '#e8f4ff', size: 2, speed: 50 }); }
      else if (f.kind === 'debris') P.bits(f.x, f.y, f.z, 5, [f.color || '#7a7a82', '#3a3a40']);
      else if (f.kind === 'burst') P.dust(f.x, f.y, f.z, 8, { color: '#cfe8ff', size: 2, speed: 70 });
    }
    // burning wrecks and fires: flickering light
    for (const v of F.vehicles) if (v.damage.burning && near(v.x, v.y)) stage.light(v.x, v.y, v.z + 10, 80 + Math.sin(now * 23 + v.x) * 8, 1.1);
    // the hydrants' spray: a fountain of drops while it lasts
    for (const p of F.broken) if (p.broken && p.broken.spray > 0 && near(p.x, p.y) && P && Math.random() < .7) P.add({ x: p.x + (Math.random() - .5) * 3, y: p.y + (Math.random() - .5) * 3, z: 6, vx: (Math.random() - .5) * 30, vy: (Math.random() - .5) * 30, vz: 140 + Math.random() * 60, max: .9, g: 380, kind: 'dust', color: '#d8ecff', size: 1.4 });
    // the water cannon: a white jet arcing out, fanning a little as it goes
    for (const j of F.jets) if (!this._done.has(j) && this._done.add(j) && near(j.x, j.y) && P) for (let i = 0; i < 7; i++) {   // (each jet once, when first drawn: the Fleet has aged it by then)
      const a = Math.atan2(j.dy, j.dx) + (Math.random() - .5) * .12, s = 260 + Math.random() * 130; P.add({ x: j.x, y: j.y, z: j.z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 50 + Math.random() * 30, max: .55, g: 240, kind: 'dust', color: i % 3 ? '#e8f6ff' : '#bfe2ff', size: 2.4 }); }
    // the wake: a fading V of foam behind each boat under way
    for (const v of F.vehicles) {
      if (v.cls !== 'boat' || !v.body) continue;
      let w = this._wake.get(v); if (!w) this._wake.set(v, w = []);
      if (v.speed > 20) { const [x, y] = v.toWorld(-v.hl, 0); if (!w.length || Math.hypot(w[w.length - 1][0] - x, w[w.length - 1][1] - y) > 6) w.push([x, y, now, v.heading, Math.min(1, v.speed / 150)]); }
      while (w.length && now - w[0][2] > 2.5) w.shift();
      if (w.length && near(v.x, v.y)) stage.floor((g, Pj) => drawWake(g, Pj, w, now, stage.r));
    }
    // skid marks, slicks and mines on the floor
    const marks = F.skids.filter(m => near(m[0], m[1]) && now - m[4] < SKID_LIFE);
    if (marks.length || F.slicks.length || F.mines.length) stage.floor((g, Pj) => {
      const R = stage.r;
      for (const m of marks) {
        const A = Pj.proj(m[0], m[1], m[5]), B = Pj.proj(m[2], m[3], m[5]); if (!A || !B) continue;
        const w = Math.max(1, Math.round(1.8 * A[2])), c = clipSeg(A, B, R, w); if (!c) continue;   // (off the buffer: MODE 7's lens puts the marks under it hundreds of pixels below)
        g.globalAlpha = .38 * (1 - (now - m[4]) / SKID_LIFE); E.px.line(g, c[0], c[1], c[2], c[3], '#141216', w);
      }
      g.globalAlpha = 1;
      for (const s of F.slicks) { const q = Pj.proj(s.x, s.y, s.z); if (!q) continue; g.fillStyle = 'rgba(10,8,14,.7)'; g.beginPath(); g.ellipse(q[0], q[1], s.r * q[2], s.r * q[2] * .6, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(120,90,200,.18)'; g.beginPath(); g.ellipse(q[0] - 2, q[1] - 1, s.r * q[2] * .5, s.r * q[2] * .25, 0, 0, Math.PI * 2); g.fill(); }
      for (const m of F.mines) { const q = Pj.proj(m.x, m.y, m.z); if (!q) continue; E.px.disc(g, q[0], q[1], Math.max(2, 3 * q[2]), '#2a2a30'); if (m.arm <= 0 && Math.floor(now * 3) % 2) E.px.dot(g, q[0], q[1] - 1, '#ff3a2a'); }
    });
  }
}
function drawWake(g, P, w, now, R) {
  for (let i = 1; i < w.length; i++) {
    const a = w[i - 1], b = w[i], age = (now - b[2]) / 2.5, spread = 3 + age * 22;
    for (const side of [-1, 1]) {
      const nx = -Math.sin(b[3]) * side * spread, ny = Math.cos(b[3]) * side * spread, A = P.proj(a[0] + nx * .9, a[1] + ny * .9, 0), B = P.proj(b[0] + nx, b[1] + ny, 0); if (!A || !B) continue;
      const lw = Math.max(1, Math.round(A[2] * 1.4)), c = clipSeg(A, B, R, lw); if (!c) continue;
      g.globalAlpha = (1 - age) * .55 * b[4]; E.px.line(g, c[0], c[1], c[2], c[3], '#f0f8ff', lw);
    }
  }
  g.globalAlpha = 1;
}
/** a floor line from screen point A to B cut to the buffer (R: the renderer, bw x bh) and m pixels round it: [ax, ay,
 *  bx, by], or null when none of it is on the buffer (a line drawn a pixel a step costs a fill a pixel, on it or not) */
export function clipSeg(A, B, R, m = 0) {
  if (!R || !R.bw) return [A[0], A[1], B[0], B[1]];
  const x0 = -m, y0 = -m, x1 = R.bw + m, y1 = R.bh + m, dx = B[0] - A[0], dy = B[1] - A[1]; let t0 = 0, t1 = 1;
  for (const [p, q] of [[-dx, A[0] - x0], [dx, x1 - A[0]], [-dy, A[1] - y0], [dy, y1 - A[1]]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const t = q / p; if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; }
  }
  return [A[0] + dx * t0, A[1] + dy * t0, A[0] + dx * t1, A[1] + dy * t1];
}
