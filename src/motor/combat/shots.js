// Shots (PLAN.md 8.12): bullets and pellets live in the engine's E.Bullets pool (its fire() defaults and cap, its list),
// but MOTOR moves and hit-tests them itself, as 3D segments: E.Bullets.hit tests 2D circles and can't refuse a hit (the
// bullet dies right after its callback), and its update stops a bullet at a wall only where it lands, so one that
// passes a body and meets a wall in the same step would miss the body. Here each step's segment finds its first
// contact, in order along it:
//   - bodies (peds): a circle in x/y and the body's height span in z (|dz| from the chest past 20 is a miss: a level
//     shot on the street passes under a roof sniper, and one at roof height flies over the street);
//   - boxes (vehicles, props): oriented boxes in x/y with a z span;
//   - walls: the TileMap's heights (a shot from a roof flies over lower roofs), and the decks' slabs.
// Tracers and casings are presentation records the combat renderer draws; nothing here draws.
//   const shots = new Shots(game);  shots.fire({ x, y, z, dir: [dx, dy, dz], speed, range, damage, by, team, weapon })
//   shots.update(dt, { map, city, bodies, boxes, onHit(shot, target, at), onWall(shot, at) })
import { E } from '../engine.js';

const STEP = 4;   // wall samples along a segment (u)

/** first contact of segment p + d*t (t in 0..1) with a vertical cylinder (x, y, r) between z0 and z1, or -1 */
function hitCylinder(px, py, pz, dx, dy, dz, cx, cy, r, z0, z1) {
  const fx = px - cx, fy = py - cy, a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - r * r;
  let t;
  if (c <= 0) t = 0;   // (starts inside)
  else { if (a < 1e-9) return -1; const disc = b * b - 4 * a * c; if (disc < 0) return -1; t = (-b - Math.sqrt(disc)) / (2 * a); if (t < 0 || t > 1) return -1; }
  // the z at entry, or anywhere through the circle while the segment is inside it
  const exitT = a < 1e-9 ? 1 : Math.min(1, (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a));
  for (const s of [t, (t + exitT) / 2, exitT]) { const z = pz + dz * s; if (z >= z0 && z <= z1) return s; }
  return -1;
}
/** first contact of the segment with an oriented box: centre (x, y), half length hl along heading h, half width hw, z0..z1 */
function hitBox(px, py, pz, dx, dy, dz, b) {
  const c = Math.cos(-b.heading), s = Math.sin(-b.heading), ox = px - b.x, oy = py - b.y;
  const lx = ox * c - oy * s, ly = ox * s + oy * c, ldx = dx * c - dy * s, ldy = dx * s + dy * c;
  let t0 = 0, t1 = 1;
  for (const [p, d, h] of [[lx, ldx, b.hl], [ly, ldy, b.hw]]) {
    if (Math.abs(d) < 1e-9) { if (Math.abs(p) > h) return -1; continue; }
    let ta = (-h - p) / d, tb = (h - p) / d; if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return -1;
  }
  const z0 = b.z || 0, z1 = z0 + (typeof b.height === 'number' ? b.height : typeof b.h === 'number' ? b.h : 20);   // (height: a box's own; h: a plain box's)
  for (const t of [t0, (t0 + t1) / 2, t1]) { const z = pz + dz * t; if (z >= z0 && z <= z1) return t; }
  return -1;
}

export class Shots {
  /** game: the E.Game (E.Bullets keeps it for its sparks; MOTOR's renderer makes its own) */
  constructor(game, o = {}) {
    this.pool = new E.Bullets(game, { plane: 'ground', max: o.max || 600, sparks: false });
    this.tracers = []; this.casings = []; this.impacts = []; this.fired = 0; this.hits = 0;
  }
  get list() { return this.pool.list; }
  /** fire one: { x, y, z (the muzzle), dir [dx, dy, dz] (unit), speed, range, damage, by (the shooter's id), team,
   *  weapon (its id), vehicle (the shooter's own vehicle's id: a drive-by never hits it), tracer (draw a streak), casing
   *  ([x, y, z, side]: eject one), kind ('bullet' | 'pellet' | 'flame' | 'flare'), burn (a flare's: seconds what it hits burns) } */
  fire(o) {
    const sp = o.speed || 900, d = o.dir;
    const b = this.pool.fire({ x: o.x, y: o.y, z: o.z, vx: d[0] * sp, vy: d[1] * sp, vz: d[2] * sp, r: 1, dmg: o.damage || 0, life: (o.range || 300) / sp, team: o.team || 'player',
      data: { by: o.by ?? null, vehicle: o.vehicle ?? null, weapon: o.weapon || '', kind: o.kind || 'bullet', ox: o.x, oy: o.y, oz: o.z, burn: o.burn || 0 } });
    if (!b) return null;
    this.fired++;
    if (o.tracer) this.tracers.push({ b, x0: o.x, y0: o.y, z0: o.z, t: 0 });
    if (o.casing) { const [cx, cy, cz, side] = o.casing; this.casings.push({ x: cx, y: cy, z: cz, vx: -d[1] * 60 * side + d[0] * -10, vy: d[0] * 60 * side + d[1] * -10, vz: 70, t: 0, spin: 0, rest: false }); if (this.casings.length > 80) this.casings.shift(); }
    return b;
  }
  /** step every shot: w { map (TileMap), city (its decks), bodies [{ x, y, z, r, h, dead, id }], boxes [{ x, y, z, hl,
   *  hw, h, heading, id }], onHit(shot, target, at [x, y, z]), onWall(shot, at), onEnd(shot) (it ran out of range),
   *  ground(x, y, z) (the floor under a casing at z) } */
  update(dt, w = {}) {
    const list = this.pool.list, map = w.map, decks = (w.city && w.city.decks) || [], bodies = w.bodies || [], boxes = w.boxes || [];
    for (const b of list) {
      if (b.dead) continue;
      const left = b.life - b.t, k = Math.min(dt, left); b.t += dt;
      const px = b.x, py = b.y, pz = b.z, dx = b.vx * k, dy = b.vy * k, dz = b.vz * k;
      let best = 1.0001, hit = null, wall = false;
      for (const t of bodies) {
        if (t.dead || t.id === b.data.by || Math.abs(t.x - px) > 60 + Math.abs(dx) || Math.abs(t.y - py) > 60 + Math.abs(dy)) continue;
        const s = hitCylinder(px, py, pz, dx, dy, dz, t.x, t.y, (t.r || 6) + b.r, (t.z || 0) - 4, (t.z || 0) + (t.h || 34));
        if (s >= 0 && s < best) { best = s; hit = t; }
      }
      for (const t of boxes) {
        if (t.dead || t.id === b.data.by || t.id === b.data.vehicle || Math.abs(t.x - px) > 80 + Math.abs(dx) || Math.abs(t.y - py) > 80 + Math.abs(dy)) continue;
        const s = hitBox(px, py, pz, dx, dy, dz, t);
        if (s >= 0 && s < best) { best = s; hit = t; }
      }
      if (map) {   // walls and deck slabs, sampled along the segment up to the nearest body hit
        const len = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(len / STEP));
        for (let i = 1; i <= n; i++) {
          const s = i / n; if (s >= best) break;
          const x = px + dx * s, y = py + dy * s, z = pz + dz * s;
          let solid = map.heightAt(x, y) > z;
          if (!solid) for (const d of decks) { const top = d.heightAt(x, y); if (top !== null && z <= top && z >= top - (d.thickness || 6)) { solid = true; break; } }
          if (!solid && z < 0) solid = true;   // (the street: a shot pitched down ends where it meets the ground)
          if (solid) { best = s; hit = null; wall = true; break; }
        }
      }
      if (hit || wall) {
        const at = [px + dx * best, py + dy * best, pz + dz * best];
        b.x = at[0]; b.y = at[1]; b.z = at[2]; b.dead = true;
        if (hit) { this.hits++; if (w.onHit) w.onHit(b, hit, at); }
        else { this.impacts.push({ x: at[0], y: at[1], z: at[2], t: 0 }); if (w.onWall) w.onWall(b, at); }
        continue;
      }
      b.x += dx; b.y += dy; b.z += dz;
      if (b.t >= b.life) { b.dead = true; if (w.onEnd) w.onEnd(b); }
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i].dead) list.splice(i, 1);
    // tracers fade a few frames after their bullet; impacts flash; casings bounce and come to rest
    for (const tr of this.tracers) tr.t += dt;
    this.tracers = this.tracers.filter(tr => !tr.b.dead || tr.t < .05);
    for (const im of this.impacts) im.t += dt;
    this.impacts = this.impacts.filter(im => im.t < .25);
    for (const c of this.casings) {
      c.t += dt; if (c.rest) continue;
      c.vz -= 600 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.spin += dt * 30;
      const g = w.ground ? Math.max(0, w.ground(c.x, c.y, Math.max(0, c.z))) : 0;
      if (c.z <= g) { c.z = g; if (c.vz < -60) { c.vz *= -.35; c.vx *= .5; c.vy *= .5; } else { c.vz = 0; c.vx = 0; c.vy = 0; c.rest = true; } }
    }
    this.casings = this.casings.filter(c => c.t < 6);
  }
  /** for state hashes: the live shots, rounded */
  hash() { let h = this.fired; for (const b of this.pool.list) h = (h * 31 + Math.round(b.x) * 7 + Math.round(b.y) * 13 + Math.round(b.z)) >>> 0; return h; }
  clear() { this.pool.clear(); this.tracers.length = 0; this.casings.length = 0; this.impacts.length = 0; }
}
export { hitCylinder, hitBox };
