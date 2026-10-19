// The Combat world (PLAN.md 8.12): one per map, holding every fight's moving parts and settling what they do.
//   - Shots (bullets, pellets, flame puffs), Explosives (thrown things, rockets, blasts and their chains), the Fire grid,
//     and the Pickups lying about;
//   - bodies (Peds) and boxes (vehicles, props: { x, y, z, hl, hw, h, heading, hurt(o) }), and explosive things
//     (barrels, a car's tank: { x, y, z, blow() });
//   - what a weapon does when fired (shoot), swung (meleeHit) or thrown (throwFrom), by its registry spec;
//   - the hurt it does, routed to each target's hurt(), with stats, abilities and the BUS told (hit, kill, crime,
//     explode, photo), and the presentation it asks for (fx: hit sparks, blood, muzzle flashes, zaps) left in lists the
//     combat renderer draws and the scene may hand to the engine's particles.
// Spread draws from the 'combat' RNG stream: the same intents fire the same shots.
//   const C = new Combat({ city, map });  C.add(ped);  C.update(dt, { wet });
import { RNG } from '../core/rng.js';
import { BUS } from '../core/bus.js';
import { TUNE, knob } from '../core/tune.js';
import { Shots } from './shots.js';
import { Explosives } from './explosives.js';
import { Pickups } from './pickups.js';
import { Fire } from '../sim/fire.js';
import { shotFrom, CHEST } from './aim.js';

knob('Combat', 'moveSpread', 'Moving spread', 1.5, 1, 4, .05, 'A factor on spread while the shooter moves');
knob('Combat', 'crouchSpread', 'Crouched spread', .75, .3, 1, .05, 'A factor on spread while crouched');
knob('Combat', 'zapReach', 'Zap chain reach', 70, 10, 200, 5, 'How far a zap arcs from one body to the next');
knob('Combat', 'zapKill', 'Zaps to kill', 4, 1, 20, 1, 'Zap hits in a row that kill (the GTA2 Electrogun)');
knob('Combat', 'meleeKnock', 'Melee knockback', 120, 0, 600, 10, 'A punch\'s knockback when it floors someone (u/s)');
knob('Combat', 'throwDist', 'Throw distance', 150, 30, 400, 10, 'How far a throw goes with nothing aimed at');
/** each melee move's damage and knockback against the weapon's own damage: a combo's moves average 1, so a weapon's
 *  spec (damage x rate) is what its combo deals */
const MOVE_POWER = { jab: .7, cross: .9, hook: 1.1, uppercut: 1.3, overhead: 1.15, slash: .85, kick: 1.2 };

export class Combat {
  /** o: { game (for the engine's effects and sounds; null headless), city (the CityMap: fire's surfaces, decks), map
   *  (the TileMap), fire (false: none) } */
  constructor(o = {}) {
    this.game = o.game || null; this.city = o.city || null; this.map = o.map || (o.city && o.city.map) || null;
    this.shots = new Shots(this.game); this.fire = o.fire === false || !this.city ? null : new Fire(this.city);
    this.explosives = new Explosives(this.fire); this.pickups = new Pickups();
    this.bodies = []; this.boxes = []; this.explosive = []; this.fx = []; this.zaps = []; this.rs = RNG.stream('combat');
    this.kills = 0; this.t = 0;
  }
  add(ped) { if (!this.bodies.includes(ped)) this.bodies.push(ped); return ped; }
  remove(ped) { const i = this.bodies.indexOf(ped); if (i >= 0) this.bodies.splice(i, 1); }
  /** the bodies within r of a ped (alive or not: a swing can't hurt the dead anyway) */
  bodiesNear(p, r) { return this.bodies.filter(b => b !== p && Math.abs(b.x - p.x) <= r && Math.abs(b.y - p.y) <= r); }
  _fx(kind, x, y, z, o = {}) { this.fx.push({ kind, x, y, z, t: 0, ...o }); if (this.fx.length > 200) this.fx.shift(); }
  _sfx(name, o) { const a = this.game && this.game.audio; if (a && a.sfx) a.sfx(name, o); }

  /** fire one shot of a weapon from a ped (the Inventory has counted it) */
  shoot(p, spec) {
    const A = p.aimer, ab = p.ability, seat = p.seat, moving = !seat && Math.hypot(p.mover.vx, p.mover.vy) > 20;
    // the muzzle: the gun in hand, or out of the vehicle's window on the side the aim points to
    let muzzle = p.rig.muzzle();
    if (seat) {
      const b = seat.body, hx = Math.cos(b.heading), hy = Math.sin(b.heading), side = (hx * A.dir[1] - hy * A.dir[0]) >= 0 ? 1 : -1, off = (b.hw || 13) + 3;
      muzzle = [b.x - hy * side * off + hx * 2, b.y + hx * side * off + hy * 2, (b.z || 0) + 15];
    }
    let spread = spec.spread * p.stats.spread() * (ab ? ab.spread : 1) * (moving ? TUNE.moveSpread : 1) * (p.crouching ? TUNE.crouchSpread : 1);
    // the shot's line: from the muzzle to what is aimed at (a lock, the assist, the mouse from a roof), or level along the aim
    const damage = spec.damage * (ab ? ab.damage : 1), at = A.pitchTo;
    let base = at ? [at[0] - muzzle[0], at[1] - muzzle[1], at[2] - muzzle[2]] : [A.dir[0], A.dir[1], 0];
    if (at) { const l = Math.hypot(...base); if (l > 12) base = base.map(v => v / l); else base = shotFrom(p, A.dir, at); }
    this._fx('muzzle', muzzle[0], muzzle[1], muzzle[2], { dir: base });
    BUS.emit('crime', { type: 'shooting', x: p.x, y: p.y, by: p.id, victim: null, severity: 1 });
    if (spec.projectile === 'rocket') {
      this.explosives.throw({ kind: 'rocket', x: muzzle[0], y: muzzle[1], z: muzzle[2], vx: base[0] * spec.speed, vy: base[1] * spec.speed, vz: base[2] * spec.speed, damage, splash: spec.splash, range: spec.range, by: p.id, vehicle: seat ? seat.body.id : null });
      this._sfx('boom', { vol: .5 }); return;
    }
    if (spec.projectile === 'zap') { this._zap(p, spec, muzzle, A.dir, damage); this._sfx('laser'); return; }
    if (spec.projectile === 'photo') { this._photo(p, spec); return; }
    const pellets = spec.projectile === 'pellets' ? spec.pellets : 1, flame = spec.projectile === 'stream';
    for (let i = 0; i < pellets; i++) {
      const a = (this.rs.next() * 2 - 1) * spread * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      const dir = [base[0] * c - base[1] * s, base[0] * s + base[1] * c, base[2] + (flame ? (this.rs.next() - .5) * .08 : 0)];
      this.shots.fire({ x: muzzle[0], y: muzzle[1], z: muzzle[2], dir, speed: spec.speed, range: spec.range * (flame ? .7 + this.rs.next() * .3 : 1), damage, by: p.id, team: p.faction, weapon: spec.id, vehicle: seat ? seat.body.id : null,
        kind: flame ? 'flame' : pellets > 1 ? 'pellet' : 'bullet', tracer: !flame && (pellets > 1 ? i % 3 === 0 : spec.rate < 6 || p.inv.fired % 2 === 0),
        casing: !flame && i === 0 && spec.projectile === 'bullet' ? [muzzle[0], muzzle[1], muzzle[2], 1] : null });
    }
    if (!flame) this._sfx(spec.sound === 'shotgun' ? 'explode' : 'shoot', { vol: spec.sound === 'smg' ? .45 : .6, pitch: spec.sound === 'smg' ? 1.25 : spec.sound === 'shotgun' ? .7 : 1 });
  }
  // the Zap-O-Matic: an arc to the nearest body in front, chaining on to the next ones near it
  _zap(p, spec, muzzle, dir, damage) {
    const hitSet = new Set([p]), pts = [muzzle]; let from = { x: muzzle[0], y: muzzle[1], z: muzzle[2] }, reach = spec.range, cone = .45;
    for (let k = 0; k <= (spec.chain || 0); k++) {
      let best = null, bd = Infinity;
      for (const b of this.bodies) {
        if (hitSet.has(b) || b.dead) continue;
        const dx = b.x - from.x, dy = b.y - from.y, d = Math.hypot(dx, dy); if (d > reach) continue;
        if (k === 0 && Math.acos(Math.max(-1, Math.min(1, (dx * dir[0] + dy * dir[1]) / (d || 1)))) > cone) continue;
        if (this.map && !this._los(from, b)) continue;
        if (d < bd) { bd = d; best = b; }
      }
      if (!best) break;
      hitSet.add(best); pts.push([best.x, best.y, best.z + CHEST]);
      const lethal = best.vitals && best.vitals.zaps + 1 >= TUNE.zapKill;
      this.hurt(best, { amount: lethal ? 999 : damage, kind: 'zap', by: p.id, at: [best.x, best.y, best.z + CHEST] });
      if (best.vitals) best.vitals.stun = Math.max(best.vitals.stun, spec.stun || 1);
      from = best; reach = TUNE.zapReach; cone = Math.PI;
    }
    if (pts.length === 1) { const d = dir; pts.push([muzzle[0] + d[0] * spec.range * .4, muzzle[1] + d[1] * spec.range * .4, muzzle[2]]); }
    this.zaps.push({ pts, t: 0 });
  }
  // the Snap: a photo of whatever is in front (missions listen for it)
  _photo(p, spec) {
    const d = p.aimer.dir, seen = this.bodies.filter(b => b !== p && !b.dead && Math.hypot(b.x - p.x, b.y - p.y) < spec.range && ((b.x - p.x) * d[0] + (b.y - p.y) * d[1]) > 0).map(b => b.id);
    BUS.emit('photo', { by: p.id, x: p.x, y: p.y, targets: seen });
    this._fx('flash', p.x, p.y, p.z + CHEST); this._sfx('select', { pitch: 1.6 });
  }
  /** a melee move connecting (Ped's combo hit): damage by the move and strength, knockback by RED MIST */
  meleeHit(a, t, spec, move) {
    const k = MOVE_POWER[move && move.name] || 1, ab = a.ability, amount = spec.damage * k * a.stats.melee() * (ab ? ab.damage : 1);
    const dx = t.x - a.x, dy = t.y - a.y, d = Math.hypot(dx, dy) || 1;
    const floors = (move && move.name === 'uppercut') || spec.id === 'slugger' && move && move.name === 'overhead';
    const r = this.hurt(t, { amount, kind: 'melee', by: a.id, knock: TUNE.meleeKnock * k * (ab ? ab.knockback : 1), knockdown: floors || (ab && ab.knockback > 1 && k >= 1.25), dir: [dx / d, dy / d], at: [t.x, t.y, t.z + CHEST * .9] });
    if (r) { a.stats.did('meleeHit'); if (ab) ab.feed('meleeHit'); BUS.emit('crime', { type: 'assault', x: t.x, y: t.y, by: a.id, victim: t.id, severity: 1 }); }
    if (this.game && this.game.hitFx) this.game.hitFx(t.x, t.y, t.z + CHEST * .9, { power: k, sound: spec.id === 'slugger' ? 'kick' : 'punch' });
  }
  swing(p, spec) { this._sfx(spec.id === 'slugger' ? 'swing' : 'whoosh', { vol: .5 }); }
  /** throw a Molotov or a grenade from a ped's hand toward its aim */
  throwFrom(p, spec) {
    const h = p.rig.hand(), A = p.aimer, to = A.target ? [A.target.x, A.target.y, A.target.z] : A.point ? [A.point[0], A.point[1], A.point[2] || 0] : [p.x + A.dir[0] * TUNE.throwDist, p.y + A.dir[1] * TUNE.throwDist, p.z];
    const [vx, vy, vz] = Explosives.aimArc(h, to, spec.speed, spec.projectile === 'grenade' ? .35 : 0);   // (a grenade lands short and rolls up)
    this.explosives.throw({ kind: spec.projectile, x: h[0], y: h[1], z: h[2], vx, vy, vz, fuse: spec.fuse || 2.5, damage: spec.damage, splash: spec.splash, burn: spec.burn, by: p.id });
    p.rig.lit = false; this._sfx('whoosh', { vol: .4 });
  }
  /** hurt a target (a Ped or a box): o { amount, kind, by, knock, knockdown, dir, at }. Returns its report or null */
  hurt(t, o) {
    if (!t || t.dead) return null;
    const r = t.hurt ? t.hurt(o) : null; if (!r) return null;
    const at = o.at || [t.x, t.y, (t.z || 0) + CHEST];
    BUS.emit('hit', { target: t.id, by: o.by, damage: (r.health || 0) + (r.armor || 0), kind: o.kind, x: at[0], y: at[1], z: at[2] });
    if (r.health >= 1 && t.vitals && o.kind !== 'fire' && o.kind !== 'zap') this._fx('blood', at[0], at[1], at[2], { n: Math.min(8, 2 + Math.round(r.health / 8)) });   // (burning shows as flames, a zap as its arc)
    if (r.armor > 0) this._fx('spark', at[0], at[1], at[2]);
    const by = this.bodies.find(b => b.id === o.by);
    if (by && (o.kind === 'bullet' || o.kind === 'pellet')) { by.stats.did('shotHit'); if (by.ability) by.ability.feed('shotHit'); }
    if (r.killed) { this.kills++; BUS.emit('kill', { target: t.id, by: o.by, kind: o.kind }); BUS.emit('crime', { type: 'murder', x: at[0], y: at[1], by: o.by, victim: t.id, severity: 3 }); }
    return r;
  }
  /** a body standing in fire, or burning itself: damage, and the cells it crosses catch */
  burnBody(p, dt) { this.hurt(p, { amount: TUNE.fireDps * dt, kind: 'fire', by: null }); if (this.fire && !p.dead) this.fire.ignite(p.x, p.y); }
  // clear sight between two points for a zap (cell heights, at the shooter's height)
  _los(a, b) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6), z = Math.max(a.z || 0, b.z || 0) + 10;
    for (let i = 1; i < n; i++) { const k = i / n; if (this.map.heightAt(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k) > z) return false; }
    return true;
  }

  /** one step: shots, explosives (and their blasts' hurt), fire (and who stands in it), pickups (takers, take: see
   *  Pickups.update), and the presentation lists ageing. w: { wet (0..1: rain damps fire), takers, take } */
  update(dt, w = {}) {
    this.t += dt;
    const bodies = this.bodies.filter(b => !b.dead);
    this.shots.update(dt, { map: this.map, city: this.city, bodies, boxes: this.boxes, ground: this.map && this.map.groundAt ? (x, y, z) => this.map.groundAt(x, y, 1, z) : null,
      onHit: (b, t, at) => {
        const flame = b.data.kind === 'flame';
        this.hurt(t, { amount: b.dmg, kind: flame ? 'fire' : b.data.kind === 'pellet' ? 'pellet' : 'bullet', by: b.data.by, at, dir: [b.vx, b.vy].map(v => v / (Math.hypot(b.vx, b.vy) || 1)) });
        if (flame && t.ignite) t.ignite(3);
      },
      onWall: (b, at) => { if (b.data.kind === 'flame' && this.fire) this.fire.add(at[0], at[1], 4, .8, 1.5, .5); else this._fx('spark', at[0], at[1], at[2]); },
      onEnd: b => { if (b.data.kind === 'flame' && this.fire) this.fire.add(b.x, b.y, 4, .8, 1.5, .5); } });
    this.explosives.update(dt, { map: this.map, city: this.city, bodies, boxes: this.boxes, explosive: this.explosive,
      hurt: (t, amount, b, o) => this.hurt(t, { amount, kind: b.source === 'molotov' ? 'fire' : 'explosion', by: b.by, knock: o.knock, dir: o.dir, knockdown: b.source !== 'molotov' && amount > 8 }),
      onBlast: b => {
        BUS.emit('explode', { x: b.x, y: b.y, z: b.z, r: b.splash, by: b.by, power: b.damage });
        if (b.source !== 'molotov') BUS.emit('crime', { type: 'explosion', x: b.x, y: b.y, by: b.by, victim: null, severity: 2 });
        if (this.game && this.game.particles && b.source !== 'molotov') this.game.particles.explosion(b.x, b.y, b.z, Math.min(2, b.splash / 48), { sound: true });
        if (b.source === 'molotov') { for (const t of bodies) if (Math.hypot(t.x - b.x, t.y - b.y) < b.splash * 1.4 && t.ignite) t.ignite(4); this._sfx('hurt', { pitch: 1.8, vol: .4 }); }
      } });
    if (this.fire) {
      const before = this.fire.count;
      this.fire.update(dt, w.wet || 0);
      if (this.fire.count && this.fire.count !== before && !this._told) { BUS.emit('fire', { x: 0, y: 0, r: 0, by: null }); this._told = true; }
      if (!this.fire.count) this._told = false;
      if (this.fire.count) for (const b of bodies) { const h = this.fire.heatAt(b.x, b.y); if (h > .5 && b.z < 8 && b.ignite) b.ignite(2.5); }
    }
    if (w.takers) this.pickups.update(dt, w.takers, w.take || null); else this.pickups.update(dt);
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter(f => f.t < .5);
    for (const z of this.zaps) z.t += dt; this.zaps = this.zaps.filter(z => z.t < .15);
  }
  /** for state hashes */
  hash() { let h = (this.shots.hash() * 31 + this.explosives.hash()) >>> 0; if (this.fire) h = (h * 31 + this.fire.hash()) >>> 0; h = (h * 31 + this.pickups.hash()) >>> 0; for (const b of this.bodies) h = (h * 31 + Math.round(b.vitals.health * 10) + (b.dead ? 7 : 0)) >>> 0; return h; }
}
