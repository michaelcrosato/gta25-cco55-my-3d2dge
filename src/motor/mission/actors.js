// What a mission spawns (PLAN.md 8.15: owner 'mission', released when it ends): its vehicles, its peds, its pickups and
// its props, each with the tag its script finds it by and the stage that made it (a retry releases what the stage made,
// then its setup makes it again). The peds act by role:
//   - 'enemy': a fighter (ai/fighter.js) that goes for the player once alerted: from the start (o.attack), within its
//     alert radius (o.alert, 260), hurt, or a mate within 200 alerted; unalerted, it walks its o.route or stands;
//   - 'guard': stands its post facing o.facing (or walks o.route), alerted by seeing the player (E.sees: 220 u, a 2 rad
//     cone), a hurt, or a mate's alert; either, with o.leash (u), gives up past that far from where it was put and walks
//     back (a showroom's bouncers never chase a car across town); only a fresh hurt turns it again on the way;
//   - 'ally': walks after the player (or o.follow, a tag) and fights the mission's alerted enemies within 220 of it;
//   - 'flee': runs from the player once it comes within 160;
//   - 'idle' (by default): stands where it was put, facing o.facing.
// A vehicle with o.driver (a ped archetype) at the wheel drives by o.drive: { to (a point or poi), route ([points],
// loop), race ([checkpoints], laps), chase: 'player' or a tag (its first living actor: an escort's car to ambush),
// flee: 'player', style ('calm' | 'fast' | 'race'), siren (true: lights and siren on, through reds, the traffic pulling
// over), then: 'stop' | 'flee' } with a DriverBrain on the GPS, as traffic does (its Intent through intentFor(v): the
// scene's fleet step asks). A point with no height is on the ground (a deck's point says so: [x, y, z]); a route's or a
// race's point off the lanes (a junction's middle, a sidewalk) counts once the driver has stopped at the end of its
// route to it, as near as the lanes go.
// Deterministic: the RNG stream 'mission:<id>:actors'; only the simulation is read.
import { E } from '../engine.js';
import { get } from '../core/registry.js';
import { RNG } from '../core/rng.js';
import { BUS } from '../core/bus.js';
import { makeIntent, clearIntent } from '../sim/intent.js';
import { Ped } from '../actors/ped.js';
import { pedLook } from '../actors/peds.js';
import { Fighter } from '../ai/fighter.js';
import { DriverBrain } from '../ai/driver.js';
import { drawBoxModel } from '../render/box-model.js';
import { PROP_MODELS } from '../render/city-render.js';
import { curbSpots, blockedSpot } from '../world/fleet-spawn.js';
import { boxDistance } from '../actors/fleet.js';
import { exitFor, standable } from '../actors/boarding.js';

const ALERT = 260, MATES = 200, GUARD_SIGHT = 220, ALLY_REACH = 220, FLEE_R = 160, REPLAN = 2, TAKEDOWN_R = 20;
const NOAIM = { candidates: [], level: 'off' };
const STYLES = { calm: { speed: 1, gap: 1, patience: 1, calm: true }, fast: { speed: 1.3, gap: .8, patience: .5, calm: true }, race: { speed: 1.55, gap: .6, patience: .2, calm: false } };

/** a point: [x, y], { x, y }, or a point of interest's id in the city */
export function pointOf(city, p) {
  if (Array.isArray(p)) return p;
  if (p && typeof p === 'object' && typeof p.x === 'number') return p.z ? [p.x, p.y, p.z] : [p.x, p.y];
  const q = city.poi(p); if (!q) throw new Error('MOTOR: no point of interest "' + p + '"'); return q.z ? [q.x, q.y, q.z] : [q.x, q.y];
}
/** is (x, y, z) within r of point q, counting its height when it has one ([x, y, z]: a deck, a roof; 24 u either way)? */
export const within = (q, x, y, z, r) => Math.hypot(q[0] - x, q[1] - y) < r && (q[2] === undefined || Math.abs((z || 0) - q[2]) < 24);

/** the free curb spot nearest a point: { x, y, heading } (where a mission's parked car goes): none of the fleet's
 *  vehicles on it (a car hl long), nothing solid */
// would a vehicle o stand in the footprint (hl long, 11 wide) at q? (its box against points along and round ours)
const overlaps = (o, q, hl) => { const c = Math.cos(q.heading), s = Math.sin(q.heading); for (const [f, r] of [[0, 0], [hl * .5, 0], [-hl * .5, 0], [hl, 0], [-hl, 0], [hl, 11], [hl, -11], [-hl, 11], [-hl, -11]]) if (boxDistance(o, q.x + f * c - r * s, q.y + f * s + r * c) < 4) return true; return false; };
export function curbNear(city, at, fleet = null, hl = 30, o = {}) {
  const [x, y] = pointOf(city, at), T = city.T, cx = Math.floor(x / T), cy = Math.floor(y / T), seen = new Set(), cands = [];
  for (let r = 0; r <= 10; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    for (const q of curbSpots(city, cx + dx, cy + dy).slice(0, 2)) { const k = Math.round(q.x) + ',' + Math.round(q.y); if (seen.has(k)) continue; seen.add(k); cands.push({ q, d: Math.hypot(q.x - x, q.y - y) }); }
  }
  cands.sort((a, b) => a.d - b.d);
  for (const { q, d } of cands) {
    if (o.within && d > o.within) break;   // (none near enough: never another street's spot)
    if (fleet && fleet.near(q.x, q.y, hl * 3).some(v => v.body && v.speed < 8 && overlaps(v, q, hl))) continue;   // (a car parked there; traffic going by is no matter)
    if (blockedSpot(city, q.x, q.y, q.heading, hl, 13)) continue;
    return { x: q.x, y: q.y, heading: q.heading };
  }
  return o.within ? null : { x, y, heading: 0 };
}
/** the lane point nearest a point (running heading's way, if given; on the deck at height z, if given: the Loop's at
 *  its height): { x, y, z, heading } (where a driving one starts) */
export function laneNear(city, roads, at, heading = null, z = null) {
  const q = pointOf(city, at), [x, y] = q, h = z ?? q[2] ?? 0, n = roads.graph.nearestLane(x, y, heading, h, 400); if (!n) return { x, y, z: h, heading: heading || 0 };
  const P = roads.graph.pointOn(n.lane, n.s); return { x: P[0], y: P[1], z: P[2] || 0, heading: Math.atan2(n.lane.dir[1], n.lane.dir[0]) };
}

export class MissionActors {
  /** W: the runtime's world; R: the runtime (its id names the RNG stream) */
  constructor(W, R) { this.W = W; this.R = R; this.list = []; this.rng = RNG.stream('mission:' + R.id + ':actors'); this.t = 0; this.idle = makeIntent(); }
  _at(p) { return pointOf(this.W.city, p); }
  _add(a, kind, o) { a.owner = 'mission'; a.missionTag = o.tag || null; const e = { a, kind, tag: o.tag || null, stage: o.stage ?? 0, role: o.role || 'idle', o, brain: null, I: null, alerted: !!o.attack }; this.list.push(e); return e; }
  _newPed(arch, x, y, o) {
    const spec = get('peds', arch) || {}, health = o.health ?? spec.health ?? 100;
    const p = new Ped({ x, y, z: o.z || 0, facing: o.facing || 0, faction: o.faction || spec.faction || 'civilian', look: o.look || spec.look || pedLook(spec, this.rng), weapons: o.weapons || spec.weapons || ['fists'], ammo: o.ammo, health, maxHealth: health, armor: o.armor || 0 });
    p.archetype = arch; p.gang = o.gang || spec.gang || null; p.lazyRig = true; p.owner = 'mission'; p.name = o.name || spec.name || '';
    const gun = (o.weapons || spec.weapons || []).find(w => w !== 'fists'); if (gun) p.inv.select(gun);
    if (this.W.combat) this.W.combat.add(p);
    return p;
  }
  /** a vehicle of a definition at a point; o: { tag, heading, color, locked, mods, health (0..1 of its own), gang,
   *  driver (an archetype), passengers ([archetypes]), weapons (theirs), drive, stage } */
  vehicle(def, at, o = {}) {
    const q = this._at(at), [x, y] = q, h = o.heading ?? (at && typeof at.heading === 'number' ? at.heading : 0), v = this.W.fleet.spawn(def, x, y, h, { owner: 'mission', color: o.color, locked: o.locked, mods: o.mods });
    const z = o.z ?? q[2]; if (v.body && typeof z === 'number') v.body.z = z;   // (a deck's point: up there, not on the street under it)
    if (o.health !== undefined && v.damage) v.damage.health = v.damage.max * o.health;
    if (o.gang) v.gang = o.gang;
    const e = this._add(v, 'vehicle', o);
    if (o.driver) { const p = this._newPed(o.driver, x, y, { gang: o.gang, weapons: o.weapons, faction: o.faction }); v.sit(p, 0); e.crew = [p]; }
    (o.passengers || []).forEach((arch, i) => { if (i + 1 < v.seats.length) { const p = this._newPed(arch, x, y, { gang: o.gang, weapons: o.weapons, faction: o.faction }); v.sit(p, i + 1); (e.crew ||= []).push(p); } });
    // (each of its crew an entry of its own, untagged, the car's stage: it rides in its seat; carjacked, bailed out or
    // thrown, it is stepped and drawn where it is, runs from the player, and goes with the stage wherever it ended up)
    for (const p of e.crew || []) { const c = this._add(p, 'ped', { stage: e.stage, role: 'flee' }); c.home = [x, y]; c.brain = new Fighter(p, { walks: this.W.life ? this.W.life.walks : null, map: this.W.city.map, fleet: this.W.fleet, rng: this.rng }); }
    if (o.drive && o.driver) e.drive = { ...o.drive, cp: 0, finishedAt: null, replan: 0 };
    return v;
  }
  /** a ped of an archetype at a point; o: { tag, role, facing, weapons, ammo, health, armor, faction, gang, look, name,
   *  attack, alert, leash, follow (an ally's tag to follow), route ([points]: a patrol), profile (the fighter's), aimable
   *  (false: the lock-on passes it over: a victim standing nearer than her attacker), stage } */
  ped(arch, at, o = {}) {
    const [x, y] = this._at(at), p = this._newPed(arch, x, y, o), e = this._add(p, 'ped', o); e.home = [x, y];
    if (o.aimable === false) p.aimable = false;
    if (e.role !== 'idle') e.brain = new Fighter(p, { walks: this.W.life ? this.W.life.walks : null, map: this.W.city.map, fleet: this.W.fleet, rng: this.rng, profile: o.profile });
    if (e.role === 'enemy' || e.role === 'guard') p.hostile = true;
    return p;
  }
  /** a pickup (health, armor, weapon, ammo, cash, token, or a mission item: kind 'item', o.item) at a point; taken,
   *  it is marked taken */
  pickup(kind, at, o = {}) {
    const [x, y] = this._at(at), C = this.W.combat; if (!C) return null;
    const k = C.pickups.place({ kind, item: o.item, amount: o.amount ?? 1, x, y, z: o.z || 0, respawn: 0 }); k.mission = true; this._add(k, 'pickup', o); return k;
  }
  /** a prop: one of the city's prop models (a crate, a barrel...) or a model of its own (o.model), drawn while the
   *  mission lasts; { x, y, z, heading, kind }. o.explosive (true, or { hp, damage, splash, fire }: Combat's
   *  makeExplosive): it blows when shot, blasted or stood in fire, and sets the next off */
  prop(kind, at, o = {}) {
    const [x, y] = this._at(at), q = { kind, x, y, z: o.z || 0, heading: o.heading || 0, model: o.model || PROP_MODELS[kind] || PROP_MODELS.crate, dead: false };
    if (o.explosive && this.W.combat) this.W.combat.makeExplosive(q, o.explosive === true ? {} : o.explosive);   // (a red barrel: Combat's while it stands)
    this._add(q, 'prop', o); return q;
  }
  /** move an actor (a Ped or a Vehicle) to a point, or a ped into a vehicle ({ in: vehicle, seat }); one already in
   *  that seat stays (one in another of its seats moves over), and o.within leaves one already that near the point
   *  where it is (a setup run on a stage already under way changes nothing) */
  place(a, to, o = {}) {
    if (!a) return;
    if (to && to.in) {
      const v = to.in, seat = to.seat ?? 0; if (!v) return;
      if (a.seat && a.seat.vehicle === v && a.seat.index === seat) return;
      if (a.seat) a.seat.vehicle.unseat(a);
      a.boarding = null; a.held = null;
      const prev = v.seats[seat]; if (prev && prev !== a) { v.unseat(prev); if (prev.owner !== 'mission') prev.place(v.x + v.hw + 12, v.y); else if (this.W.combat) this.W.combat.remove(prev); }
      if (a.dead && a.revive) a.revive(v.x, v.y, v.z);
      if (!a.seat) v.sit(a, seat);
      a.place(v.x, v.y, v.z);
      return;
    }
    const [x, y] = this._at(to);
    if (o.within && Math.hypot(a.x - x, a.y - y) < o.within) return;
    if (a.body) { const b = a.body; b.x = x; b.y = y; b.z = o.z || 0; if (o.heading !== undefined) b.heading = o.heading; b.u = b.v = b.w = 0; b.vz = 0; b.airborne = false; a.asleep = false; return; }   // (the body's vx, vy and speed are read from u and v)
    if (a.seat) a.seat.vehicle.unseat(a); a.boarding = null; a.held = null;
    if (a.dead && a.revive) a.revive(x, y, o.z || 0); else a.place(x, y, o.z || 0);
    if (a.mover) { a.mover.vx = a.mover.vy = 0; if (o.facing !== undefined) a.mover.facing = o.facing; }
  }
  /** a ped's kit: { weapons (given, with ammo), ammo, select, health, armor } */
  loadout(p, o = {}) {
    if (!p) return;
    if (o.only) { if (!this.kept) this.kept = { p, kit: { weapons: p.inv.list(), ammo: { ...p.inv.ammo }, mag: { ...p.inv.mag }, current: p.inv.current } }; p.inv.strip(); }   // (these alone: the player's own kept for the end)
    for (const w of o.weapons || []) if (w !== 'fists') p.inv.give(w, (o.ammo && o.ammo[w]) ?? 999, true);
    if (o.select) p.inv.select(o.select);
    if (o.health !== undefined) { if (p.dead && p.revive) p.revive(p.x, p.y, p.z); p.vitals.health = o.health; }
    if (o.armor !== undefined) p.vitals.armor = o.armor;
  }
  /** the player's own weapons back, as they were (a stage's `only` kit over: the mission's end) */
  restoreKit() {
    const K = this.kept; if (!K) return; this.kept = null;
    const inv = K.p.inv; inv.strip(); for (const id of K.kit.weapons) if (id !== 'fists') inv.give(id, 0, true);
    inv.ammo = { ...K.kit.ammo }; inv.mag = { ...K.kit.mag }; inv.select(inv.has(K.kit.current) ? K.kit.current : 'fists');
  }
  /** the actors with a tag, oldest first */
  tagged(tag) { const out = []; for (const e of this.list) if (e.tag === tag) out.push(e.a); return out; }
  /** the entry of an actor */
  entry(a) { return this.list.find(e => e.a === a) || null; }
  /** the player's place in a race against the vehicles tagged tag: 1 + the racers that finished first */
  racePlace(tag) { return 1 + this.list.filter(e => e.tag === tag && e.drive && e.drive.finishedAt !== null).length; }
  /** the Intent a mission vehicle's driver wants now (null: not the mission's, or nobody driving it) */
  intentFor(v) { if (v.owner !== 'mission') return null; const e = this.list.find(q => q.a === v); return e && e.I ? e.I : null; }
  /** one step: the peds' brains, the drivers' */
  update(dt) {
    this.t += dt; const W = this.W, P = W.crew && W.crew.ped, PW = { map: W.city.map, city: W.city, combat: W.combat, fleet: W.fleet, aim: NOAIM };
    for (const e of this.list) {
      if (e.kind === 'vehicle') { this._drive(dt, e, P); continue; }   // (its crew: entries of their own, riding in their seats)
      if (e.kind !== 'ped') continue;
      const p = e.a; if (p === P) continue;
      if (p.seat) { if (!p.dead) p.ride(); continue; }   // (a rider in its seat, wherever the vehicle goes: hits and draws find it there)
      if (e.down && !p.held) p.vitals.down = Math.max(p.vitals.down, 1e6);   // (taken down: out of it for good)
      p.update(dt, p.dead || e.down ? clearIntent(this.idle) : this._think(dt, e, P), PW);
    }
  }
  // a ped's Intent by its role
  _think(dt, e, P) {
    const p = e.a, o = e.o;
    if (!e.brain || !P) { if (o.facing !== undefined && !p.mover.action) p.mover.facing = o.facing; return clearIntent(this.idle); }
    const I = clearIntent(e.brain.I), tgt = P.seat && P.seat.vehicle ? P.seat.vehicle : P, d = Math.hypot(tgt.x - p.x, tgt.y - p.y);
    if (e.role === 'enemy' || e.role === 'guard') {
      if (e.alerted && o.leash && Math.hypot(p.x - e.home[0], p.y - e.home[1]) > o.leash) { e.alerted = false; e.homing = true; e.calmHp = p.vitals.health; }   // (leashed: it gives up)
      if (e.homing) {   // (on its way back to its post: only a fresh hurt turns it)
        if (p.vitals.health < e.calmHp) e.homing = false;
        else if (Math.hypot(p.x - e.home[0], p.y - e.home[1]) > 16) return e.brain._go(dt, I, e.home[0], e.home[1], false, 'home');
        else { e.homing = false; if (o.facing !== undefined) p.mover.facing = o.facing; }
      }
      if (!e.alerted) {
        const hurt = p.vitals.health < (e.calmHp ?? p.vitals.maxHealth);
        if (e.role === 'enemy') e.alerted = hurt || d < (o.alert || ALERT);
        else { const s = d < GUARD_SIGHT && E.sees({ x: p.x, y: p.y, z: p.z, facing: p.mover.facing }, P, { map: this.W.city.map, range: GUARD_SIGHT, fov: 2, facing: p.mover.facing }); e.alerted = hurt || !!(s && (s.seen || s === true)); }
        if (e.alerted) for (const q of this.list) if (q !== e && q.kind === 'ped' && (q.role === 'enemy' || q.role === 'guard') && Math.hypot(q.a.x - p.x, q.a.y - p.y) < MATES) q.alerted = true;
      }
      if (!e.alerted) { if (o.route) return this._patrol(dt, e, I); if (o.facing !== undefined) p.mover.facing = o.facing; return I; }
      if (P.dead) return I;
      return e.brain.attack(dt, I, tgt);
    }
    if (e.role === 'ally') {
      const lead = o.follow ? (this.tagged(o.follow).find(a => !a.dead) || P) : P;
      let foe = null, fd = ALLY_REACH;
      for (const q of this.list) if (q.kind === 'ped' && (q.role === 'enemy' || q.role === 'guard') && !q.a.dead && q.alerted) { const dd = Math.hypot(q.a.x - p.x, q.a.y - p.y); if (dd < fd) { fd = dd; foe = q.a; } }
      if (foe) return e.brain.attack(dt, I, foe);
      const dl = Math.hypot(lead.x - p.x, lead.y - p.y); if (dl > 48) return e.brain._go(dt, I, lead.x, lead.y, dl > 140, 'lead');
      return I;
    }
    if (e.role === 'flee' && d < FLEE_R) { const k = 240 / (d || 1); return e.brain._go(dt, I, p.x - (tgt.x - p.x) * k, p.y - (tgt.y - p.y) * k, true, 'flee'); }
    return I;
  }
  // an unalerted ped walks its route's points in turn
  _patrol(dt, e, I) {
    const p = e.a, R = e.o.route; e.ri = e.ri || 0;
    const q = this._at(R[e.ri % R.length]); if (Math.hypot(q[0] - p.x, q[1] - p.y) < 10) e.ri++;
    return e.brain._go(dt, I, q[0], q[1], false, 'patrol' + (e.ri % R.length));
  }
  // a mission vehicle's driver: a DriverBrain on the GPS to its drive's next point (re-planned for a chase or a flight)
  _drive(dt, e, P) {
    const v = e.a, D = e.drive; e.I = null; if (v.wrecked || !v.driver || v.driver.dead || v.driver === P) { v.drivenBy = null; return; }   // (anyone but the player at its wheel: a mission's driver, a protagonist not played)
    if (!D) { v.drivenBy = null; const I = clearIntent(e.Ib || (e.Ib = makeIntent())); I.down.handbrake = true; e.I = I; return; }   // (a crew with no orders: parked, the handbrake on, not nudged along by traffic; and no brain to read: one parked kept its last 'queue', and a bot behind it waited on it for good)
    const W = this.W, roads = W.roads; if (!roads) return;
    let goal = null;
    if (D.chase && P) { const T = D.chase === 'player' ? P : this.tagged(D.chase).find(a => !a.dead && !a.wrecked), t = T && T.seat && T.seat.vehicle ? T.seat.vehicle : T; if (t) goal = [t.x, t.y, t.z || 0]; }
    else if (D.flee === 'player' && P) { if (!D.dest || Math.hypot(D.dest[0] - v.x, D.dest[1] - v.y) < 80) D.dest = this._away(v, P); goal = D.dest; }
    else if (D.race) {
      const line = D.race.map(q => this._at(q)), c = line[D.cp % line.length];
      if (within(c, v.x, v.y, v.z, 48) || this._there(e, c)) { D.cp++; if (D.cp >= line.length * (D.laps || 1) && D.finishedAt === null) { D.finishedAt = this.R.t; D.done = true; } }
      goal = D.done ? null : line[D.cp % line.length];
    } else if (D.route) {
      const pts = D.route.map(q => this._at(q)), c = pts[D.cp];
      if (c && (within(c, v.x, v.y, v.z, 40) || this._there(e, c))) { D.cp++; if (D.cp >= pts.length) { if (D.loop) D.cp = 0; else D.done = true; } }
      goal = D.done ? null : pts[D.cp];
    } else if (D.to && !D.done) { goal = this._at(D.to); if (Math.hypot(goal[0] - v.x, goal[1] - v.y) < 40 && v.speed < 30) { D.done = true; goal = null; } }
    if (!goal) {
      if (D.then === 'flee' && P) { D.flee = 'player'; D.dest = null; return; }
      v.drivenBy = null; const I = clearIntent(e.Ib || (e.Ib = makeIntent())); if (v.speed > 2) I.brake = 1; else I.down.handbrake = true; e.I = I; return;   // (there: it stops; stopped, the handbrake: a brake held at a stop backs it up)
    }
    if (D.siren && v.hasSiren && !v.siren) v.siren = true;   // (the traffic pulls over for it: city life's sirens)
    D.replan -= dt;
    const key = Math.round(goal[0]) + ',' + Math.round(goal[1]);
    if (!e.brain || D.replan <= 0 || (!D.chase && e.brainGoal !== key)) {
      if (!e.brain) e.brain = new DriverBrain(v, roads.graph, { junctions: W.junctions || null, rng: this.rng, personality: STYLES[D.style || (D.race ? 'race' : 'fast')] || STYLES.fast, siren: !!D.siren });
      const r = roads.gps.routeTo(v.x, v.y, v.heading, goal[0], goal[1], { z: v.z, tz: goal[2] ?? 0 }); if (r) e.brain.setRoute(r.lanes, { lane: r.to.lane.id, s: r.to.s }); else { e.brain.arrived = false; if (D.flee) D.dest = null; }   // (a goal up on a deck says so; no way there: not there, and somewhere else to run to)
      e.brainGoal = key; D.replan = D.chase || D.flee ? REPLAN : 1e9;
    }
    const L = W.life; v.drivenBy = e.brain;   // (drivenBy: what it waits for, read as a city car's own brain says it: a racer at a red light; only while it drives)
    e.I = e.brain.update(dt, { fleet: W.fleet, t: L ? L.t : this.t, pedsNear: L ? (x, y, r) => L.pedsNear(x, y, r) : null, wet: 0, sirens: null });
    if (D.chase && P && Math.hypot(goal[0] - v.x, goal[1] - v.y) < 70) { const a = Math.atan2(goal[1] - v.y, goal[0] - v.x); e.I.steer = E.clamp(E.angDiff(v.heading, a) * 2, -1, 1); e.I.throttle = 1; e.I.brake = 0; }   // (close: straight at it)
  }
  // has the driver stopped at the end of its route to point c (the GPS's goal is on the lane nearest it: a point off
  // the lanes is never within reach)?
  _there(e, c) { return !!e.brain && e.brain.arrived && e.brainGoal === Math.round(c[0]) + ',' + Math.round(c[1]); }
  // a point to flee to: of a few ground lanes' starts, the one farthest from the player
  _away(v, P) {
    const G = this.W.roads.graph; let best = null, bd = -1;
    for (let k = 0; k < 6; k++) { const L = G.lanes[Math.floor(this.rng.next() * G.lanes.length)]; if (!L || !L.ground) continue; const [ax, ay] = L.a, d = Math.hypot(ax - P.x, ay - P.y); if (d > bd) { bd = d; best = [ax, ay]; } }
    return best || [v.x + 600, v.y];
  }
  /** draw the mission's peds standing about (seated ones ride with their vehicle) and its props */
  draw(stage, fx, fy, reach) {
    const P = this.W.crew && this.W.crew.ped;
    for (const e of this.list) {
      const a = e.a; if (Math.abs(a.x - fx) > reach || Math.abs(a.y - fy) > reach) continue;
      if (e.kind === 'ped' && !a.seat && a !== P) a.draw(stage, { crowd: true, key: a.rig });
      else if (e.kind === 'prop' && !a.dead) stage.shape(a.x, a.y, a.z, (g, Pj) => drawBoxModel(g, Pj, a.model, a.x, a.y, a.z, a.heading, { lit: true }), { kept: { key: a, r: 24, h: 24 } });
    }
  }
  /** release the actors pred(e) picks: vehicles and peds out of the world. The player's own vehicle is kept, as the
   *  world's, unless o.evict (a retry: the player put out beside it, and it goes too) */
  release(pred, o = {}) {
    const W = this.W, P = W.crew && W.crew.ped;
    for (const e of this.list) {
      if (!pred(e)) continue; e.gone = true;
      if (e.kind === 'vehicle') {
        const v = e.a; if (e.brain && e.brain.dispose) e.brain.dispose(); v.drivenBy = null;
        if (v.adopted) { v.owner = v.adopted; v.adopted = null; continue; }   // (the world's own, lent to the job: back to the world)
        for (const q of e.crew || []) { const c = this.entry(q); if (c) c.gone = true; if (q.seat && q.seat.vehicle === v) continue; if (q.seat) q.seat.vehicle.unseat(q); if (W.combat) W.combat.remove(q); }   // (its crew go with it, wherever they are)
        if (P && P.seat && P.seat.vehicle === v && o.evict) { v.unseat(P); P.boarding = null; P.place(v.x + Math.cos(v.heading + Math.PI / 2) * (v.hw + 10), v.y + Math.sin(v.heading + Math.PI / 2) * (v.hw + 10), 0); }
        // (the people in it by whose they are: the job's go with it, anyone else, a protagonist riding along, gets out at
        // a door; the player's own car, kept as the world's, keeps the player)
        const out = q => { if (q.owner === 'mission') { v.unseat(q); if (W.combat) W.combat.remove(q); return; } const ex = exitFor(q, v, (x, y) => standable(W.city, x, y, v.z)); v.unseat(q); q.place(ex ? ex.at.x : v.x + v.hw + 12, ex ? ex.at.y : v.y, v.z); };
        if (P && P.seat && P.seat.vehicle === v) { v.owner = 'world'; for (const q of [...v.seats]) if (q && q !== P) out(q); continue; }
        for (const q of [...v.seats]) if (q) { if (q === P) { v.unseat(q); continue; } out(q); }
        if (P && P.boarding && P.boarding.v === v) P.boarding = null;
        W.fleet.remove(v);
      } else if (e.kind === 'ped') { const p = e.a; if (p === P) continue; if (p.seat) p.seat.vehicle.unseat(p); if (W.combat) W.combat.remove(p); }
      else if (e.kind === 'pickup' && W.combat) { const L = W.combat.pickups.list, i = L.indexOf(e.a); if (i >= 0) L.splice(i, 1); }
      else if (e.kind === 'prop' && e.a.fuse && W.combat) W.combat.dropBox(e.a);
    }
    this.list = this.list.filter(e => !e.gone);
  }
  /** a guard or an unalerted enemy close in front of the player with its back turned (the attack button takes it
   *  down quietly, as indoors), or null */
  takedownFor(P) {
    if (!P || P.seat || P.dead) return null;
    for (const e of this.list) {
      if (e.kind !== 'ped' || (e.role !== 'guard' && e.role !== 'enemy') || e.alerted || e.down) continue;
      const p = e.a; if (p.dead || p.seat || p.mover.action) continue;
      const d = Math.hypot(p.x - P.x, p.y - P.y), behind = Math.abs(E.angDiff(p.mover.facing, Math.atan2(p.y - P.y, p.x - P.x))) < 1.1;
      if (d < TAKEDOWN_R && behind && Math.abs((p.z || 0) - (P.z || 0)) < 10) return e;
    }
    return null;
  }
  /** the player takes one down: the paired action on both bodies; it is out of it (counted as a kill's) */
  takedown(P, e) { const p = e.a; p.held = P.mover.play('takedown', { other: p.mover, map: this.W.city.map }); e.down = true; p.out = true; BUS.emit('takedown', { interior: null, guard: p.id, by: P.id }); return true; }
  /** let the world keep an actor (a stashed car): out of the mission's list, owned by the world, never released */
  adopt(a) { const e = this.entry(a); if (!e) return; this.list = this.list.filter(q => q !== e); a.owner = 'world'; if (e.brain && e.brain.dispose) e.brain.dispose(); a.drivenBy = null; }
  /** how many of the mission's actors are about (the count check) */
  get count() { return this.list.length; }
  hash() {
    let h = this.list.length;
    for (const e of this.list) { const a = e.a; h = (h * 31 + Math.round((a.x || 0) * 4) * 7 + Math.round((a.y || 0) * 4) + (a.dead || a.wrecked ? 3 : 0) + (a.taken ? 5 : 0) + (e.down ? 11 : 0) + (e.alerted ? 13 : 0)) >>> 0; }
    return [h];
  }
}
