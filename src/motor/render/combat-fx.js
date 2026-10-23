// The combat renderer (PLAN.md 8.12, 10): what a fight looks like, in every view, through the Stage. It reads the Combat
// world and draws; it never changes it. Tracers and zaps shine (glow lines: the dark never dims them), muzzle flashes
// and fires light the street, thrown things and rockets fly as small shapes, fire burns in its cells (scorch where it
// was), pickups bob, and new hits throw the engine's particles (blood, sparks): presentation, so Math.random is fine.
//   const fx = new CombatFX(game);  fx.draw(stage, combat, focus)
import { E } from '../engine.js';
import { drawWeaponIcon } from './weapon-models.js';
import { get } from '../core/registry.js';

const BLOOD = ['#8a1a1a', '#a82424', '#6a1010'];
const PICKUP_LOOK = { health: ['#ff4a5a', '+'], armor: ['#5ab0ff', 'A'], cash: ['#5aff8a', '$'], bribe: ['#ffd23a', '*'], token: ['#ff7ac8', 'M'], item: ['#ffe066', '!'], ammo: ['#e8c040', 'a'], weapon: ['#e8e8f0', ''] };

export class CombatFX {
  constructor(game) { this.game = game; this._done = new WeakSet(); this.t = 0; }
  /** draw a frame of the combat world round the focus [x, y] (o.radius: how far to look, in units) */
  draw(stage, C, focus, o = {}) {
    const g0 = this.game, P = g0.particles, now = g0.real, R = o.radius || 560, fx = focus[0], fy = focus[1];
    const near = (x, y) => Math.abs(x - fx) < R && Math.abs(y - fy) < R;
    // new hits: the engine's particles, once each
    for (const f of C.fx) {
      if (this._done.has(f)) continue; this._done.add(f);
      if (!P) continue;
      if (f.kind === 'blood') { P.bits(f.x, f.y, f.z, f.n || 4, BLOOD); P.dust(f.x, f.y, f.z, 2, { color: '#7a1414', size: 1.4, speed: 18 }); }
      else if (f.kind === 'spark') P.sparks(f.x, f.y, f.z, 3, null, { color: '#ffd080' });
      else if (f.kind === 'flash') P.ring(f.x, f.y, 4, 26, '#ffffff', .2, f.z);
    }
    for (const f of C.fx) {
      if (f.kind === 'muzzle' && f.t < .06 && near(f.x, f.y)) stage.light(f.x, f.y, f.z, 70, 1.1);
      if (f.kind === 'flash' && f.t < .1) stage.light(f.x, f.y, f.z, 120, 1.4);
    }
    // tracers: a streak behind the bullet's head, fading once it stops
    for (const tr of C.shots.tracers) {
      const b = tr.b; if (!near(b.x, b.y)) continue;
      const sp = Math.hypot(b.vx, b.vy, b.vz) || 1, dist = Math.hypot(b.x - tr.x0, b.y - tr.y0, b.z - tr.z0), L = Math.min(28, dist), fade = b.dead ? 1 - tr.t / .05 : 1;
      if (L < 2 || fade <= 0) continue;
      const head = [b.x, b.y, b.z], tail = [b.x - b.vx / sp * L, b.y - b.vy / sp * L, b.z - b.vz / sp * L];
      stage.glowLine(head, tail, (g, A, B) => { g.globalAlpha = fade; E.px.line(g, B[0], B[1], A[0], A[1], '#ffc860', 1); E.px.dot(g, A[0], A[1], '#fff8e0'); g.globalAlpha = 1; });
    }
    // flame puffs (the Hot Mess): a growing, cooling ball of fire on each live puff
    for (const b of C.shots.list) {
      if (b.data.kind !== 'flame' || !near(b.x, b.y)) continue;
      const u = Math.min(1, b.t / b.life);
      stage.glow(b.x, b.y, b.z, (g, sx, sy, k) => { const r = Math.max(1.5, (2 + u * 6) * k * .6); E.px.disc(g, sx, sy, r, u < .3 ? '#fff0a0' : u < .7 ? '#ffa030' : '#e0502a'); if (u < .5) E.px.disc(g, sx - r * .2, sy - r * .3, r * .5, '#fffbe0'); });
    }
    // impacts: a white pop where a bullet met a wall
    for (const im of C.shots.impacts) if (im.t < .07 && near(im.x, im.y)) stage.glow(im.x, im.y, im.z, (g, sx, sy) => { E.px.rect(g, sx - 1, sy - 1, 3, 3, '#fff2c0'); });
    // casings: brass glints on the ground
    for (const c of C.shots.casings) {
      if (!near(c.x, c.y)) continue;
      stage.shape(c.x, c.y, c.z, (g, Pj) => { const q = Pj.proj(c.x, c.y, c.z); if (!q) return; const w = Math.max(1, Math.round(q[2] * .9)); E.px.rect(g, q[0], q[1], c.rest ? w + 1 : w, w, c.t < .3 ? '#ffe08a' : '#c8a040'); });
    }
    // thrown things and rockets
    for (const p of C.explosives.list) {
      if (!near(p.x, p.y)) continue;
      if (p.kind === 'rocket') {
        const sp = Math.hypot(p.vx, p.vy, p.vz) || 1, tail = [p.x - p.vx / sp * 10, p.y - p.vy / sp * 10, p.z - p.vz / sp * 10];
        stage.shape(p.x, p.y, p.z, (g, Pj) => { const A = Pj.proj(p.x, p.y, p.z), B = Pj.proj(...tail); if (A && B) { E.px.line(g, A[0], A[1], B[0], B[1], '#3a4626', Math.max(2, Math.round(A[2] * 1.6))); E.px.dot(g, A[0], A[1], '#8a9a5a'); } });
        stage.glow(...tail, (g, sx, sy, k) => { const f = 1 + Math.sin(now * 60) * .3; E.px.disc(g, sx, sy, Math.max(1.5, 2.2 * k * f), '#ffa030'); E.px.disc(g, sx, sy, Math.max(1, 1.1 * k), '#fff0b0'); });
        stage.light(p.x, p.y, p.z, 60, .9);
        if (P && Math.random() < .6) P.smoke(tail[0], tail[1], tail[2], 1, { size: 2.2 });
        continue;
      }
      stage.shape(p.x, p.y, p.z, (g, Pj) => {
        const q = Pj.proj(p.x, p.y, p.z); if (!q) return; const k = q[2];
        if (p.kind === 'grenade') { E.px.disc(g, q[0], q[1], Math.max(1.5, 1.5 * k), '#3a4626'); E.px.dot(g, q[0] - 1, q[1] - 1, '#8a9a5a'); }
        else { const a = p.spin, dx = Math.cos(a) * 2.2 * k, dy = Math.sin(a) * 1.2 * k; E.px.line(g, q[0] - dx, q[1] - dy, q[0] + dx, q[1] + dy, '#3a7a3a', Math.max(2, Math.round(k * 1.4))); }
      });
      if (p.kind === 'molotov') { stage.glow(p.x, p.y, p.z + 3, (g, sx, sy, k) => E.px.disc(g, sx, sy, Math.max(1, 1.3 * k), '#ffa030')); stage.light(p.x, p.y, p.z, 50, .8); }
    }
    for (const b of C.explosives.blasts) if (b.t < .35 && near(b.x, b.y)) stage.light(b.x, b.y, b.z + 10, b.splash * 2.4 * (1 - b.t / .35), 1.6);
    // zaps: jagged arcs between the bodies they chain through
    for (const z of C.zaps) {
      for (let i = 1; i < z.pts.length; i++) {
        const a = z.pts[i - 1], b = z.pts[i];
        stage.glowLine(a, b, (g, A, B) => {
          let px0 = A[0], py0 = A[1]; const n = 6, nx = -(B[1] - A[1]), ny = B[0] - A[0], l = Math.hypot(nx, ny) || 1;
          for (let s = 1; s <= n; s++) { const k = s / n, j = s < n ? (Math.random() - .5) * 10 : 0, x = A[0] + (B[0] - A[0]) * k + nx / l * j, y = A[1] + (B[1] - A[1]) * k + ny / l * j; E.px.line(g, px0, py0, x, y, s % 2 ? '#9ff0ff' : '#ffffff', 1); px0 = x; py0 = y; }
        });
      }
      const e = z.pts[z.pts.length - 1]; stage.light(e[0], e[1], e[2], 70, 1.2);
    }
    // fire on the ground, and the scorch where it burned
    if (C.fire) this._fire(stage, C.fire, fx, fy, R, now);
    // burning bodies
    for (const b of C.bodies) if (b.burning > 0 && !b.dead && near(b.x, b.y)) {
      stage.glow(b.x, b.y, b.z + 18, (g, sx, sy, k) => this._flame(g, sx, sy + 10 * k, 6 * k, 16 * k, now * 9 + b.id));
      stage.light(b.x, b.y, b.z + 10, 60, 1);
    }
    // pickups: a bobbing token (its image made once per kind, item and size)
    for (const p of C.pickups.list) {
      if (p.gone || p.away > 0 || !near(p.x, p.y)) continue;
      const bob = 4 + Math.sin(now * 3 + p.x * .1) * 2;
      stage.glow(p.x, p.y, p.z + bob + 6, (g, sx, sy, k) => { const cv = this._token(p, k); g.drawImage(cv, Math.round(sx - cv.width / 2), Math.round(sy - cv.height / 2)); });
    }
  }
  // a pickup's token: a disc of its kind's colour with its letter or weapon's silhouette, cached
  _token(p, k) {
    // (by radius to 12 px, a bigger one in steps of 4 to 24: MODE 7's lens makes k continuous; a bounded cache)
    const r0 = Math.max(3, Math.round(3.4 * k)), r = r0 <= 12 ? r0 : Math.min(24, Math.ceil(r0 / 4) * 4), key = p.kind + ':' + p.item + ':' + r, T = this._tokens || (this._tokens = new Map());
    let cv = T.get(key); if (cv) return cv;
    if (T.size >= 48) T.clear();
    const [col, ch] = PICKUP_LOOK[p.kind] || ['#ffffff', '?'], S = r * 2 + 4; cv = E.mkCanvas(S, S); const g = cv.getContext('2d'), c = S / 2;
    E.px.disc(g, c, c, r + 1, '#0b0814'); E.px.disc(g, c, c, r, col);
    const model = p.kind === 'weapon' && get('weapons', p.item)?.model;
    if (model) drawWeaponIcon(g, model, c, c, Math.max(.6, k * .45), { color: '#0b0814' });
    else if (ch) E.font.text(g, ch, c, c - 3, '#0b0814', { align: 'center', outline: false, font: 'tiny' });
    g._c = null; T.set(key, cv); return cv;
  }
  _fire(stage, F, fx, fy, R, now) {
    const T = F.T, c0 = Math.max(0, Math.floor((fx - R) / T)), c1 = Math.min(F.w - 1, Math.floor((fx + R) / T)), r0 = Math.max(0, Math.floor((fy - R) / T)), r1 = Math.min(F.h - 1, Math.floor((fy + R) / T));
    let lit = 0;
    for (const i of F.live) {
      const cx = i % F.w, cy = (i / F.w) | 0; if (cx < c0 || cx > c1 || cy < r0 || cy > r1) continue;
      const x = (cx + .5) * T, y = (cy + .5) * T, h = F.heat[i], ph = (cx * 7 + cy * 13) % 10;
      stage.glow(x, y, 6, (g, sx, sy, k) => this._flame(g, sx, sy + 6 * k, (5 + h * 4) * k, (8 + h * 10) * k, now * 8 + ph));
      if ((cx + cy) % 2 === 0 && lit < 24) { stage.light(x, y, 8, 46 + h * 30, .7 + h * .5); lit++; }
    }
    // scorch: the burnt cells in view, darkened on the floor
    let any = false; for (let cy = r0; cy <= r1 && !any; cy++) for (let cx = c0; cx <= c1; cx++) if (F.burnt[cy * F.w + cx]) { any = true; break; }
    if (!any) return;
    stage.floor((g, Pj) => {
      g.fillStyle = 'rgba(16,10,8,.55)';
      for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
        if (!F.burnt[cy * F.w + cx] || F.heat[cy * F.w + cx] > 0) continue;
        const a = Pj.proj(cx * T, cy * T, 0), b = Pj.proj((cx + 1) * T, cy * T, 0), c = Pj.proj((cx + 1) * T, (cy + 1) * T, 0), d = Pj.proj(cx * T, (cy + 1) * T, 0);
        if (!a || !b || !c || !d) continue;
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill();
      }
      g._c = null;
    });
  }
  // a pixel flame: three tongues of fire, white at the core (by: its foot on screen)
  _flame(g, x, by, w, h, t) {
    const P = E.px;
    for (let i = 0; i < 3; i++) {
      const o = (i - 1) * w * .35, f = Math.sin(t + i * 2.1) * .5 + .5, hh = h * (.6 + f * .4) * (i === 1 ? 1 : .7), ww = Math.max(1, w * (i === 1 ? .55 : .38));
      P.poly(g, [[x + o - ww, by], [x + o + ww, by], [x + o + Math.sin(t * 1.7 + i) * ww * .6, by - hh]], '#e0502a');
      P.poly(g, [[x + o - ww * .55, by], [x + o + ww * .55, by], [x + o + Math.sin(t * 1.7 + i) * ww * .4, by - hh * .7]], '#ffa030');
    }
    P.poly(g, [[x - w * .2, by], [x + w * .2, by], [x, by - h * .35]], '#fff0a0');
  }
}
