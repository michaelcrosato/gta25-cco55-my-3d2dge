// Explosives (PLAN.md 8.12): thrown things and rockets, and the blasts they make.
//   - grenades arc under gravity, bounce off the ground and walls (losing speed), and go off when the fuse runs out;
//   - Molotovs arc and shatter on whatever they meet first, leaving burning petrol on the ground (the Fire grid);
//   - rockets fly straight, and burst on the first wall, deck, body or box they meet, or at the end of their range;
//   - a blast hurts and knocks down by distance (full damage at the centre, none at its edge), sets fire to what burns
//     round it, and sets off other explosive things in reach (a parked car's tank, a barrel) a moment later: chains.
// The arcs draw from no RNG (spread is the thrower's); fire's spread draws from the 'fire' stream. Nothing here draws.
//   const ex = new Explosives(fire);  ex.throw({ kind: 'grenade', x, y, z, vx, vy, vz, fuse, damage, splash, by })
//   ex.update(dt, { map, city, bodies, boxes, explosive: [{ x, y, z, id, blow() }], onBlast(b), hurt(target, amount, b) })
import { TUNE, knob } from '../core/tune.js';
import { hitCylinder, hitBox } from './shots.js';

knob('Combat', 'gravity', 'Thrown gravity', 520, 100, 2000, 10, 'Gravity on thrown things (u/s²)');
knob('Combat', 'bounce', 'Grenade bounce', .38, 0, 1, .02, 'The share of its speed a grenade keeps off a bounce');
knob('Combat', 'chainDelay', 'Chain delay', .18, 0, 2, .02, 'Seconds before a blast sets off the next explosive thing in reach');
knob('Combat', 'blastKnock', 'Blast knockback', 260, 0, 1000, 10, 'Knockback speed at a blast\'s centre (u/s)');

export class Explosives {
  /** fire: the Fire grid (Molotovs and blasts light it), or null */
  constructor(fire = null) { this.fire = fire; this.list = []; this.blasts = []; this.pending = []; this.t = 0; this.count = 0; }
  /** throw or launch one: { kind 'grenade' | 'molotov' | 'rocket', x, y, z, vx, vy, vz, fuse (s), damage, splash (u),
   *  burn (seconds of petrol), range (u, rockets), by (the thrower's id), vehicle (the thrower's own vehicle's id) } */
  throw(o) {
    const p = { kind: o.kind, x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, fuse: o.fuse ?? 2.5, damage: o.damage || 0, splash: o.splash || 40,
      burn: o.burn || 0, range: o.range || 600, by: o.by ?? null, vehicle: o.vehicle ?? null, t: 0, dist: 0, dead: false, spin: 0, rest: false };
    this.list.push(p); return p;
  }
  /** an explosion now: { x, y, z, damage, splash, by, fire (light what burns: default true), source ('grenade' |
   *  'rocket' | 'car' | 'barrel' ...) } */
  blast(o) {
    const b = { x: o.x, y: o.y, z: o.z || 0, damage: o.damage ?? 100, splash: o.splash ?? 64, by: o.by ?? null, source: o.source || 'blast', t: 0, done: false };
    this.blasts.push(b); this.count++; return b;
  }
  update(dt, w = {}) {
    this.t += dt;
    const map = w.map, decks = (w.city && w.city.decks) || [], G = TUNE.gravity;
    const ground = (x, y, z) => { let g = 0; if (map) { const h = map.heightAt(x, y); if (h <= z + 2) g = Math.max(g, h); } for (const d of decks) { const top = d.heightAt(x, y); if (top !== null && top <= z + 2) g = Math.max(g, top); } return g; };
    const solidAt = (x, y, z) => { if (map) { const h = map.heightAt(x, y); if (h > 0 && h > z) return true; }   // (walls: the floor is the ground's business)
      for (const d of decks) { const top = d.heightAt(x, y); if (top !== null && z <= top && z >= top - (d.thickness || 6)) return true; } return false; };
    for (const p of this.list) {
      if (p.dead) continue;
      p.t += dt; p.spin += dt * 14;
      if (p.kind === 'rocket') {
        const dx = p.vx * dt, dy = p.vy * dt, dz = p.vz * dt; let s = 1.0001, hit = false;
        for (const t of w.bodies || []) { if (t.dead || t.id === p.by) continue; const k = hitCylinder(p.x, p.y, p.z, dx, dy, dz, t.x, t.y, (t.r || 6) + 2, (t.z || 0) - 4, (t.z || 0) + (t.h || 34)); if (k >= 0 && k < s) { s = k; hit = true; } }
        for (const t of w.boxes || []) { if (t.dead || t.id === p.by || t.id === p.vehicle) continue; const k = hitBox(p.x, p.y, p.z, dx, dy, dz, t); if (k >= 0 && k < s) { s = k; hit = true; } }
        const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4));
        for (let i = 1; i <= n && i / n < s; i++) { const k = i / n; if (solidAt(p.x + dx * k, p.y + dy * k, p.z + dz * k) || p.z + dz * k < 0) { s = k; hit = true; break; } }
        if (hit) { p.x += dx * s; p.y += dy * s; p.z += dz * s; this._burst(p); continue; }
        p.x += dx; p.y += dy; p.z += dz; p.dist += Math.hypot(dx, dy, dz);
        if (p.dist >= p.range) this._burst(p);
        continue;
      }
      // grenades and Molotovs: an arc
      if (!p.rest) {
        p.vz -= G * dt;
        const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
        if (solidAt(nx, ny, nz)) {   // a wall: a Molotov shatters on it; a grenade bounces back off it
          if (p.kind === 'molotov') { this._burst(p); continue; }
          const hx = map ? map.heightAt(nx, p.y) > nz : false, hy = map ? map.heightAt(p.x, ny) > nz : false;
          if (hx || !hy) p.vx *= -TUNE.bounce; if (hy || !hx) p.vy *= -TUNE.bounce;
        } else { p.x = nx; p.y = ny; p.z = nz; }
        // a Molotov also breaks on a body it meets in flight
        if (p.kind === 'molotov') for (const t of w.bodies || []) if (!t.dead && t.id !== p.by && Math.hypot(t.x - p.x, t.y - p.y) < (t.r || 6) + 3 && p.z >= (t.z || 0) - 2 && p.z <= (t.z || 0) + (t.h || 34)) { this._burst(p); break; }
        if (p.dead) continue;
        const g = ground(p.x, p.y, p.z);
        if (p.z <= g) {
          p.z = g;
          if (p.kind === 'molotov') { this._burst(p); continue; }
          if (p.vz < -50) { p.vz = -p.vz * TUNE.bounce; p.vx *= .6; p.vy *= .6; } else { p.vz = 0; p.vx *= .85; p.vy *= .85; if (Math.hypot(p.vx, p.vy) < 8) p.rest = true; }
        }
      }
      if (p.kind === 'grenade' && p.t >= p.fuse) this._burst(p);
    }
    this.list = this.list.filter(p => !p.dead);
    // the chain: explosive things in reach of a blast go off a moment later
    for (const q of this.pending) q.t -= dt;
    for (const q of this.pending.filter(q => q.t <= 0)) if (!q.thing.blown) { q.thing.blown = true; if (q.thing.blow) q.thing.blow(); this.blast({ x: q.thing.x, y: q.thing.y, z: q.thing.z || 0, damage: q.thing.damage ?? 90, splash: q.thing.splash ?? 70, by: q.by, source: q.thing.source || 'chain' }); }
    this.pending = this.pending.filter(q => q.t > 0);
    // blasts: damage, knockback, fire and the chain, once each
    for (const b of this.blasts) {
      b.t += dt; if (b.done) continue; b.done = true;
      for (const t of [...(w.bodies || []), ...(w.boxes || [])]) {
        if (t.dead) continue;
        const d = Math.hypot(t.x - b.x, t.y - b.y, ((t.z || 0) + 12) - b.z); if (d > b.splash) continue;
        if (map && !this._clear(map, b, t)) continue;   // (a wall between them shields it)
        const k = 1 - d / b.splash, amount = b.damage * k;
        if (w.hurt) w.hurt(t, amount, b, { knock: TUNE.blastKnock * k, dir: [(t.x - b.x) / (d || 1), (t.y - b.y) / (d || 1)] });
      }
      for (const thing of w.explosive || []) {
        if (thing.blown || thing.dead) continue;
        if (Math.hypot(thing.x - b.x, thing.y - b.y) <= b.splash * .9 && !this.pending.some(q => q.thing === thing)) this.pending.push({ thing, t: TUNE.chainDelay, by: b.by });
      }
      if (this.fire && b.fire !== false) this.fire.add(b.x, b.y, b.splash * .45, .8, 0, .7);
      if (w.onBlast) w.onBlast(b);
    }
    this.blasts = this.blasts.filter(b => b.t < 1);
  }
  // nothing solid between a blast and a target (sampled in x/y at the blast's height)
  _clear(map, b, t) {
    const n = Math.ceil(Math.hypot(t.x - b.x, t.y - b.y) / 6);
    for (let i = 1; i < n; i++) { const k = i / n; if (map.heightAt(b.x + (t.x - b.x) * k, b.y + (t.y - b.y) * k) > b.z + 6) return false; }
    return true;
  }
  _burst(p) {
    p.dead = true;
    if (p.kind === 'molotov') {   // petrol on the ground: fire with fuel of its own, and a small burst of flame
      if (this.fire) this.fire.add(p.x, p.y, p.splash, 1, p.burn || 5);
      this.blast({ x: p.x, y: p.y, z: p.z, damage: p.damage, splash: p.splash * .6, by: p.by, source: 'molotov' }).fire = false;
      return;
    }
    this.blast({ x: p.x, y: p.y, z: p.z, damage: p.damage, splash: p.splash, by: p.by, source: p.kind });
  }
  /** a throw's launch velocity to land near a target point from (x, y, z): the speed capped, the arc steeper when near.
   *  roll: the share of the distance it rolls on after landing (a grenade's bounce: it lands short and rolls up) */
  static aimArc(from, to, speed, roll = 0) {
    const dx = to[0] - from[0], dy = to[1] - from[1], d = (Math.hypot(dx, dy) || 1) * (1 - roll), G = TUNE.gravity, dz = (to[2] || 0) - from[2];
    // the 45-degree throw lands at v²/g on flat ground: lower the speed for a nearer target, keep the angle
    const v = Math.min(speed, Math.sqrt(G * Math.max(20, d - dz * .6))), a = Math.PI / 4;
    const l = Math.hypot(dx, dy) || 1; return [dx / l * v * Math.cos(a), dy / l * v * Math.cos(a), v * Math.sin(a)];
  }
  hash() { let h = this.count; for (const p of this.list) h = (h * 31 + Math.round(p.x) * 7 + Math.round(p.y) * 13 + Math.round(p.z)) >>> 0; return h; }
}
