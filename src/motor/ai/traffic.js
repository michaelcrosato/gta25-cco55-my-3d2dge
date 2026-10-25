// Traffic (PLAN.md 8.9): the cars that drive a district's lanes around the focus.
//   - the spawner: a target count by neighbourhood, time of day and weather (the district fleet's `traffic` spec);
//     cars appear only inside the footprint's spawn annulus (fpSpawnIn..fpSpawnOut world units from the focus: never in
//     sight of a nearer camera, the same in every view), on a lane that goes somewhere, with room around them, and
//     leave beyond its outer edge; when the focus first arrives somewhere (the scene starts, a teleport, a switch, the
//     hospital: nothing round it has been seen yet) the whole disc fills at once;
//   - each car: a civilian definition picked by the neighbourhood's weights and the time of day, a driver (a Ped of a
//     local archetype, sitting in the driver's seat) and a DriverBrain; or, where o.pick says so (gangs.js: a gang's turf),
//     one of a gang's cars with a member at the wheel, keeping to its turf;
//   - LOD (PLAN.md 7.11): within fpFull of the focus a car drives on its physics (the brain writes the driver's
//     Intent); beyond it, its brain moves it along its lane (kinematic), so far traffic costs little and never stalls;
//   - panic: shots, blasts and killings near a driver scare it (faster, the lights ignored, for a while);
//   - hand-off: a car whose driver's seat someone else takes (a carjack) leaves the traffic, and its old driver is
//     handed on (onDriverOut: the crowd decides whether it flees or fights); a car the player rams hard stops, and its
//     driver may get out angry or scared;
//   - service units (dispatch): a police car, the Medic or the Pumper sent to a point with its siren on, crewed, routed
//     by the GPS; it waits where it stops while its crew is out (emergency.js), then rejoins the traffic. A unit on
//     duty.ext is driven by someone else (police.js's chase): the traffic only keeps its record;
//   - the tow: a car the traffic left standing with nobody alive at the wheel (its driver killed, or out to fight, a
//     unit's crew all dead), or one the player got out of, is taken away once it has stood 10 s out of every view's
//     sight (beyond the spawn ring's inner edge): it had blocked its lane, and the crossing beside it, for good (the
//     campaign's bot left the Pumper across the courier's road). One parked when the world was made (the curbs', a
//     landmark's own: the Pumper by the L depot) goes back to its spot instead, if that is clear and out of sight too.
// Deterministic: the 'traffic' RNG stream, lanes and cars in a fixed order; the camera is never read.
//   const T = new Traffic({ city, fleet, graph, junctions, footprint, spec, isPlayer });  T.update(dt, ctx);  T.intentFor(v)
import { TUNE, knob } from '../core/tune.js';
import { RNG } from '../core/rng.js';
import { BUS } from '../core/bus.js';
import { all, get } from '../core/registry.js';
import { clearIntent, makeIntent } from '../sim/intent.js';
import { classOf } from '../sim/vehicle/defs.js';
import { Ped } from '../actors/ped.js';
import { pedLook, pickPed, pedFits } from '../actors/peds.js';
import { DriverBrain } from './driver.js';

knob('Traffic', 'trafficCars', 'Traffic cars', 34, 0, 200, 1, 'Moving traffic around the focus at full density (the neighbourhood, time and weather scale it)');
knob('Traffic', 'trafficNight', 'Night traffic', .6, 0, 1.5, .05, 'Traffic density at night, against the day');
knob('Traffic', 'trafficRain', 'Rain traffic', .8, 0, 1.5, .05, 'Traffic density in rain or storm');
knob('Traffic', 'panicRange', 'Panics within', 220, 0, 800, 10, 'A shot, blast or killing scares drivers this near (u)');
knob('Traffic', 'rammedOut', 'Gets out when rammed', .55, 0, 1, .05, 'The chance a driver the player rams hard gets out (angry or scared)');
const LOD_IN = 20;   // hysteresis either side of fpFull (u)
const WEDGED = 8;   // s a far car off its line may stand barely moving before it is put back on its path
const SPAWN_EVERY = .25, SAMPLE = 40, FILL_IN = 100, SPAWN_SHORT = 40, TOW_AFTER = 10, PARK_BEHIND = 72, PASS_ROOM = 92;   // (FILL_IN: the nearest a car is put when the disc fills; SPAWN_SHORT: how far short of a stop line; TOW_AFTER: s an abandoned car stands before the tow; PARK_BEHIND: the room a unit standing at a call leaves behind it past its lane's clearS, a car's length and its gap; PASS_ROOM: past its front, short of the stop line, for a car to go round it, a car's length and the pass's margin)

export class Traffic {
  /** o: { city, fleet, graph, gps, junctions, footprint, spec (the fleets entry's traffic: { hoods: { id: factor },
   *  roles, classes }), rng, onDriverOut(ped, car, why) }; pick (set later: (point, hood, rng) -> { def, arch, gang,
   *  color, keep } or null) */
  constructor(o) {
    this.city = o.city; this.fleet = o.fleet; this.g = o.graph; this.gps = o.gps || null; this.J = o.junctions; this.fp = o.footprint;
    this.spec = Object.assign({ hoods: {}, roles: ['civilian'], classes: ['car', 'truck', 'bike'] }, o.spec || {});
    this.rng = o.rng || RNG.stream('traffic'); this.onDriverOut = o.onDriverOut || null; this.pick = o.pick || null; this.isPlayer = o.isPlayer || null;
    this.cars = []; this.t = 0; this._spawnT = 0; this.spawned = 0; this.despawned = 0; this.towed = 0; this.homed = 0; this._towT = 0; this.idle = makeIntent(); this.filled = false; this.fills = 0; this._fx = 0; this._fy = 0;
    // spawn points: every SAMPLE units along each lane that goes somewhere (no dead ends, no jump), clear of the junction
    // boxes at both ends and short of its stop line by a braking distance (a car put down is never already in a junction)
    this.points = [];
    for (const l of this.g.lanes) {
      if (l.deadEnd || !l.out.length || l.kind === 'stub' || l.len < 60) continue;
      const end = Math.min(l.len - 24, (l.stopS ?? l.len) - SPAWN_SHORT);
      for (let s = 24; s < end; s += SAMPLE) { const p = this.g.pointOn(l, s); this.points.push({ lane: l, s, x: p[0], y: p[1], z: p[2] }); }
    }
    this.pool = all('vehicles').filter(d => d.spawn && (d.spawn.weight || 0) > 0 && d.spawn.zones && this.spec.roles.includes(d.role) && this.spec.classes.includes(classOf(d)));
    this._unsub = [BUS.on('crime', e => { if (e.severity !== 0) this._scare(e.x, e.y, e.type === 'murder' || e.type === 'explosion' ? 1.4 : 1); }, 'world'), BUS.on('explode', e => this._scare(e.x, e.y, 1.6), 'world'),   // (a traffic offence scares nobody)
      BUS.on('vehicleExit', e => { if (this.isPlayer && this.isPlayer(e.actor)) { const v = this.fleet.byId(e.vehicle); if (v) v.leftT = this.t; } }, 'world'),   // (the player out of a car: the tow's, once out of sight)
      BUS.on('vehicleEnter', e => { const v = this.fleet.byId(e.vehicle); if (v) v.leftT = undefined; }, 'world')];
  }
  /** stop listening (the scene is leaving) */
  dispose() { for (const u of this._unsub) u(); for (const c of [...this.cars]) this._drop(c, false); }
  get count() { return this.cars.length; }
  /** the Intent a traffic car's driver drives on this step (null: not a traffic car) */
  intentFor(v) {
    const b = v.brain; if (!b || !v.traffic) return null; if (v.kinematic) return clearIntent(this.idle);
    const d = v.duty; if (d && d.spray) { const I = b.I, dx = d.spray.x - v.x, dy = d.spray.y - v.y, l = Math.hypot(dx, dy) || 1; I.aim = [dx / l, dy / l]; I.down.fire = true; }   // (the Pumper's cannon on the fire)
    return b.I;
  }
  /** how many cars the focus's surroundings want now */
  target(ctx) {
    const hood = this.city.hoodAtPoint(this.fp.x, this.fp.y), f = hood && this.spec.hoods[hood.id] !== undefined ? this.spec.hoods[hood.id] : 1;
    return Math.round(TUNE.trafficCars * f * (ctx.night ? TUNE.trafficNight : 1) * (ctx.wet > .5 ? TUNE.trafficRain : 1));
  }
  /** one step: spawn and despawn round the focus, switch near and far, think and drive */
  update(dt, ctx = {}) {
    this.t += dt; const fp = this.fp;
    // the hand-off: a car whose driver's seat is no longer its driver's (a carjack, the driver dead or out)
    for (const c of [...this.cars]) {
      if (c.duty && c.duty.out) {   // (a unit waiting for its crew: lost when it goes, or when someone not of its crew takes its wheel: the player's to drive)
        const thief = c.v.driver && c.v.driver !== c.driver && !(c.crew || []).includes(c.v.driver);
        if (thief || c.v.wrecked || c.v.sunk || !this.fleet.vehicles.includes(c.v)) { c.duty.lost = true; c.v.duty = null; c.v.siren = false; this._drop(c, false); }
        continue;
      }
      if (c.v.driver !== c.driver || c.v.wrecked || c.v.sunk || !this.fleet.vehicles.includes(c.v)) { if (c.duty) c.duty.lost = true; this._drop(c, true); continue; }
      if (fp.d(c.v.x, c.v.y) > TUNE.fpSpawnOut + 60 && c.v.owner !== 'mission' && !c.duty) { this._drop(c, false, true); continue; }
    }
    // the first step, and a jump of the focus (a teleport, a switch, the hospital): nothing round it has been seen, so the
    // disc fills at once; from then on cars come only from the annulus
    const jump = this.filled && Math.hypot(fp.x - this._fx, fp.y - this._fy) > TUNE.fpSpawnIn / 2; this._fx = fp.x; this._fy = fp.y;
    if (!this.filled || jump) { this.filled = true; this.fills++; const want = this.target(ctx); for (let k = 0; k < want * 3 && this.cars.length < want; k++) this._spawn(ctx, FILL_IN); }
    this._spawnT -= dt;
    if (this._spawnT <= 0) { this._spawnT = SPAWN_EVERY; const want = this.target(ctx); for (let k = 0; k < 2 && this.cars.length < want; k++) this._spawn(ctx); }
    if ((this._towT -= dt) <= 0) {   // (the tow, out of sight)
      this._towT = 2;
      for (const v of [...this.fleet.vehicles]) {
        const t0 = v.abandonT ?? v.leftT;
        if (t0 === undefined || this.t - t0 <= TOW_AFTER || fp.d(v.x, v.y) <= TUNE.fpSpawnIn || v.owner === 'mission' || v.seats.some(p => p && !p.dead) || (v.damage && v.damage.burning)) continue;
        if (v.home && !v.wrecked && fp.d(v.home.x, v.home.y) > TUNE.fpSpawnIn && this._homeFree(v)) { this._home(v); this.homed++; } else { this.fleet.remove(v); this.towed++; }
      }
    }
    const W = { fleet: this.fleet, t: ctx.t ?? this.t, pedsNear: ctx.pedsNear || null, wet: ctx.wet || 0, sirens: ctx.sirens || null, closed: ctx.closed || null };   // (closed(bridgeId): a drawbridge's gates shut)
    for (const c of this.cars) {
      const v = c.v, b = c.brain, d = fp.d(v.x, v.y);
      if (c.duty && (c.duty.out || c.duty.ext)) continue;   // (parked at the scene, the crew out; or in the police's chase)
      // near and far (with a little hysteresis); a car pushed off its lane stays physical until it is back on one
      if (v.kinematic && d < TUNE.fpFull - LOD_IN) { v.kinematic = false; v.body.setVelocity(Math.cos(v.heading) * b.speed, Math.sin(v.heading) * b.speed); }
      else if (!v.kinematic && d > TUNE.fpFull + LOD_IN && b.snap()) v.kinematic = true;
      // (one off its line can't go over: wedged there, WEDGED s barely moving, it is put back on its path. A long truck
      // turned across Dock Road at the Loop's foot had held a queue a thousand units long, for good)
      if (!v.kinematic && d > TUNE.fpFull + LOD_IN && v.speed < 3 && !b.over) { c.wedgeT = (c.wedgeT || 0) + dt; if (c.wedgeT > WEDGED) { c.wedgeT = 0; b.unwedge(this.fleet); } } else c.wedgeT = 0;
      // a hard knock from the player's vehicle: a pause, maybe out of the car
      if (!c.duty && v.bumpedBy && v.bumpT === this.fleet.t && ctx.player && v.bumpedBy === ctx.player && v.bumpDv > 40) {
        b.crashed(1.6);
        if (this.rng.next() < TUNE.rammedOut && this.onDriverOut) { c.out = { why: this.rng.next() < (c.tough ?? .3) ? 'angry' : 'scared', t: 1.4 }; }
      }
      if (c.out) { c.out.t -= dt; if (c.out.t <= 0 && v.speed < 6) { this._getOut(c, c.out.why); continue; } }
      if (v.kinematic) b.step(dt, W); else b.update(dt, W);
      if (c.duty && b.arrived) c.duty.arrived = true;
      for (const q of c.crew || [c.driver]) if (q && q.seat) q.ride();   // (the driver and crew ride in their seats: a bike's are seen)
    }
  }
  /** a service unit (a vehicle definition) sent to (x, y) with its siren on, for o.stop units short of it along its
   *  lane: spawned on a lane in the annulus (the nearest the call it can route from), crewed by o.crew (archetype ids:
   *  the first drives), routed by the GPS; its stop is where it may stand (see parkable: a call by a junction had
   *  parked units on its connector, or where nobody could pass them, the junction blocked); the Pumper stops as near the
   *  fire as it can (it sprays, never parks).
   *  Returns its record ({ v, driver, crew, brain, duty }) or null */
  dispatch(defId, x, y, o = {}) {
    if (!this.gps) return null;
    // (the goal: the nearest point a unit may stand at, with room for the traffic to go round it before the junction,
    // else with room behind it at least, else the nearest; the Pumper's anywhere)
    const fire = o.kind === 'fire', def = get('vehicles', defId), hl = def && def.length ? def.length / 2 : 30, G = this.g, z = o.z || 0;
    const span = ahead => l => { const lo = l.clearS + hl + PARK_BEHIND, hi = Math.min(l.len - hl - 80, ahead ? l.stopS - hl - PASS_ROOM : Infinity); return hi >= lo ? [lo, hi] : null; };
    const goal = (!fire && (G.nearestLane(x, y, null, z, 240, span(true)) || G.nearestLane(x, y, null, z, 240, span(false)))) || G.nearestLane(x, y, null, z, 240); if (!goal) return null;
    // (the spawn point in the annulus with the quickest drive there, by one search back from the goal: a one-way street
    // can make the nearest the farthest)
    const fp = this.fp, D = this.gps.costsTo(goal.lane.id), cand = [];
    for (const p of this.points) {
      const d = Math.hypot(p.x - fp.x, p.y - fp.y); if (d < TUNE.fpSpawnIn || d > TUNE.fpSpawnOut || !isFinite(D[p.lane.id])) continue;
      cand.push([D[p.lane.id] - p.s / p.lane.speed, p]);
    }
    cand.sort((a, b) => a[0] - b[0] || a[1].lane.id - b[1].lane.id || a[1].s - b[1].s);
    for (const [, p] of cand.slice(0, 30)) {
      if (this.fleet.near(p.x, p.y, 70).some(q => q.body && Math.abs(q.z - p.z) < 12 && Math.hypot(q.x - p.x, q.y - p.y) < q.hl + 40)) continue;
      const r = this.gps.route(p.lane.id, goal.lane.id, { s: p.s }); if (!r) continue;
      const v = this.fleet.spawn(defId, p.x, p.y, Math.atan2(p.lane.dir[1], p.lane.dir[0])); v.body.z = p.z; v.traffic = true; v.bornT = this.t; v.owner = 'service'; v.siren = v.hasSiren;
      const crew = (o.crew || ['civilian']).slice(0, v.seats.length).map((id, i) => {
        const arch = get('peds', id), ped = new Ped({ x: p.x, y: p.y, faction: arch ? arch.faction : 'civilian', look: arch ? pedLook(arch, this.rng) : {}, lazyRig: true, health: arch && arch.health || 100, maxHealth: arch && arch.health || 100, armor: arch && arch.armor || 0, weapons: arch && arch.weapons || ['fists'] });
        ped.archetype = id; v.sit(ped, i); return ped;
      });
      const lo = fire ? 0 : goal.lane.clearS + v.hl + PARK_BEHIND, hi = goal.lane.len - (fire ? 0 : v.hl + 80), stopS = hi >= lo ? Math.min(hi, Math.max(lo, goal.s - (o.stop || 0))) : Math.min(lo, goal.lane.len - 4), brain = new DriverBrain(v, this.g, { junctions: this.J, rng: this.rng, lane: p.lane.id, s: p.s, siren: v.siren, personality: { speed: 1.15, gap: .9, patience: 1.4, calm: true } });
      brain.setRoute(r.lanes, { lane: goal.lane.id, s: stopS }); brain.speed = startSpeed(p); v.brain = brain; v.kinematic = true;
      const c = { v, driver: crew[0], crew, brain, tough: 1, out: null, duty: { kind: o.kind || 'service', x, y, goal, t0: this.t, arrived: false, out: false, lost: false, spray: null } };
      v.duty = c.duty; this.cars.push(c); this.spawned++;
      return c;
    }
    return null;
  }
  /** may this unit stand where it is now? On a lane, short enough of its end for the traffic to go round it, and far
   *  enough along it to leave a car room behind it clear of the junction it came out of and the zebra beside it (one
   *  left on the connector behind it can't go round it, and stood on the crossing for as long as the unit did) */
  parkable(c) {
    const b = c.brain, h = b.here; if (!h) return true; if (h.k !== 'lane') return false;
    return h.len - b.s > c.v.hl + 80 && (h.s0 || 0) + b.s - c.v.hl >= this.g.lanes[h.id].clearS + PARK_BEHIND;
  }
  /** is this car held up on a lane right behind one that won't move (a unit parked at its scene, a car nobody drives)? */
  heldBehind(c) { const b = c.brain, h = b.here, L = b.leader; return !!(h && h.k === 'lane' && L && L.gap < 24 && L.speed < 2 && (!L.v.brain || L.v.brain.parked)); }
  /** a service unit off duty: siren off, back to wandering the lanes as traffic */
  release(c) { if (!c || !c.duty) return; c.duty = null; c.v.duty = null; c.v.siren = false; c.v.owner = 'world'; c.brain.siren = false; c.brain.setRoute(null); }
  /** a unit nobody will drive again (its crew dead): out of the traffic, the car left standing where it is */
  abandon(c) { if (!c || !this.cars.includes(c)) return; if (c.duty) c.duty.lost = true; c.v.duty = null; c.v.siren = false; this._drop(c, false); }
  /** the traffic within r of (x, y) taken off the road at once (a race's marshals clearing its grid): never a unit on a
   *  call; how many went. (The player's own car is never traffic: a car taken leaves it.) */
  clear(x, y, r) { let n = 0; for (const c of [...this.cars]) { if (c.duty || Math.hypot(c.v.x - x, c.v.y - y) > r) continue; this._drop(c, false, true); n++; } return n; }
  /** cars put down anywhere on the lanes, in sight or not, until there are n (the stress pad's); how many there are */
  fill(n, ctx = {}) { for (let k = 0; k < n * 3 && this.cars.length < n; k++) this._spawn(ctx, 0); return this.cars.length; }
  // a new car somewhere in the annulus, on a lane, with room, of a definition the neighbourhood and the hour allow
  _spawn(ctx, inR = TUNE.fpSpawnIn) {
    const fp = this.fp, outR = TUNE.fpSpawnOut, cand = [];
    for (const p of this.points) { const d = Math.hypot(p.x - fp.x, p.y - fp.y); if (d >= inR && d <= outR && !(p.lane.bridge && ctx.bridgeUp && ctx.bridgeUp(p.lane.bridge))) cand.push(p); }
    if (!cand.length) return null;
    for (let tries = 0; tries < 4; tries++) {
      const p = cand[Math.floor(this.rng.next() * cand.length)], hood = this.city.hoodAtPoint(p.x, p.y), f = hood && this.spec.hoods[hood.id] !== undefined ? this.spec.hoods[hood.id] : 1;
      if (this.rng.next() > f / Math.max(1, ...Object.values(this.spec.hoods), 1)) continue;
      if (this.city.zonesAt(p.x, p.y).some(z => z.kind === 'noSpawn')) continue;
      if (this.fleet.near(p.x, p.y, 70).some(o => o.body && Math.abs(o.z - p.z) < 12 && Math.hypot(o.x - p.x, o.y - p.y) < o.hl + 46)) continue;   // (near, not around: the cars put down this step are in no grid yet)
      if (ctx.pedsNear && ctx.pedsNear(p.x, p.y, 50).some(q => !q.seat && Math.abs((q.z || 0) - p.z) < 12 && Math.hypot(q.x - p.x, q.y - p.y) < 48)) continue;   // (never on top of someone crossing)
      const gang = this.pick ? this.pick(p, hood ? hood.id : '', this.rng) : null;   // (a gang's car in its turf)
      const def = gang ? get('vehicles', gang.def) : this._pickDef(hood ? hood.id : '', ctx.night); if (!def) return null;
      const h = Math.atan2(p.lane.dir[1], p.lane.dir[0]), v = this.fleet.spawn(def.id, p.x, p.y, h, { color: gang && gang.color || def.palette[Math.floor(this.rng.next() * def.palette.length)] });
      v.body.z = p.z; v.traffic = true; v.bornT = this.t;
      const arch = gang ? get('peds', gang.arch) : pickPed(this.rng, s => s.kind === 'civilian' && pedFits(s, hood ? hood.id : '', ctx.night)) || pickPed(this.rng, s => s.kind === 'civilian');
      const driver = new Ped({ x: p.x, y: p.y, faction: gang ? arch.faction : 'civilian', look: arch ? pedLook(arch, this.rng) : {}, lazyRig: true, health: arch && arch.health || 60, maxHealth: arch && arch.health || 60, armor: arch && arch.armor || 0, weapons: gang && arch ? arch.weapons : ['fists'] });
      driver.archetype = arch ? arch.id : null; v.sit(driver, 0);
      if (gang) { driver.gang = gang.gang; v.gang = gang.gang; }
      const brain = new DriverBrain(v, this.g, { junctions: this.J, rng: this.rng, lane: p.lane.id, s: p.s, keep: gang ? gang.keep : null,
        personality: { speed: .88 + this.rng.next() * .24, gap: .85 + this.rng.next() * .4, patience: .7 + this.rng.next() * .7, calm: true } });
      brain.speed = startSpeed(p); v.brain = brain; v.kinematic = true;
      const c = { v, driver, brain, tough: arch && arch.traits ? arch.traits.tough ?? .15 : .15, out: null, gang: gang ? gang.gang : null };
      this.cars.push(c); this.spawned++;
      return c;
    }
    return null;
  }
  _pickDef(hood, night) {
    const c = this.pool.filter(d => d.spawn.zones.includes(hood) && (!d.spawn.timeOfDay || d.spawn.timeOfDay.includes(night ? 'night' : 'day')));
    const list = c.length ? c : this.pool; if (!list.length) return null;
    let r = this.rng.next() * list.reduce((a, d) => a + d.spawn.weight, 0);
    for (const d of list) if ((r -= d.spawn.weight) <= 0) return d;
    return list[list.length - 1];
  }
  // a driver gets out of its stopped car (angry: to fight; scared: to run), the car left where it stands
  _getOut(c, why) {
    const v = c.v, p = c.driver, [sx, sy] = v.seatAt(0); v.unseat(p);
    const side = v.toWorld(0, -(v.hw + 8)); p.place(side[0] ?? sx, side[1] ?? sy, v.z);
    this._drop(c, false); if (this.onDriverOut) this.onDriverOut(p, v, why);
  }
  // a towed car's spot (where it was parked as the world was made) with no other vehicle on it
  _homeFree(v) { const h = v.home; return this.fleet.near(h.x, h.y, v.hl + 80).every(o => o === v || Math.hypot(o.x - h.x, o.y - h.y) > o.hl + v.hl + 4); }
  // a towed car back at its spot, parked, the tow's clocks off
  _home(v) { const h = v.home, b = v.body; b.x = h.x; b.y = h.y; b.z = 0; b.heading = h.heading; b.u = b.v = b.w = 0; b.vz = 0; b.airborne = false; if (v.cls === 'heli') { b.landed = true; b.wx = b.wy = 0; } v.abandonT = v.leftT = undefined; v.asleep = false; }   // (a heli: landed on its pad)
  // a car leaves the traffic: its brain lets go of its junctions; despawned, it is removed with its driver; jacked, its
  // old driver is handed on
  _drop(c, jacked, despawn = false) {
    const i = this.cars.indexOf(c); if (i >= 0) this.cars.splice(i, 1);
    c.brain.dispose(); const v = c.v; v.brain = null; v.kinematic = false; v.traffic = false;
    if (despawn) { const C = this.fleet.combat; if (C) for (const q of c.crew || [c.driver]) if (q) C.remove(q); this.fleet.remove(v); this.despawned++; return; }   // (its crew with it: a unit's, back to the traffic as combat bodies, had been left out of sight as bodies nobody moved, and one pushed along Dock Road by the cars stood on the drawbridge for good, which never lifted again)
    if ((!v.driver || v.driver.dead) && v.owner !== 'mission') v.abandonT = this.t;   // (left with nobody at the wheel: the tow takes it, out of sight)
    if (jacked && c.driver && v.driver !== c.driver && this.onDriverOut) this.onDriverOut(c.driver, v, c.driver.dead ? 'dead' : 'jacked');
  }
  // shots, blasts and killings near drivers scare them
  _scare(x, y, k = 1) {
    if (x === undefined) return;
    const r = TUNE.panicRange * k;
    for (const c of this.cars) if (Math.abs(c.v.x - x) < r && Math.abs(c.v.y - y) < r && Math.hypot(c.v.x - x, c.v.y - y) < r) c.brain.scare(6 + 4 * this.rng.next());
  }
  /** draw the riders the traffic's open vehicles show (a bike's) round the focus */
  draw(stage, fx, fy, reach) { for (const c of this.cars) { const v = c.v; if ((v.cls === 'bike' || v.cls === 'boat') && c.driver && Math.abs(v.x - fx) < reach && Math.abs(v.y - fy) < reach) c.driver.draw(stage, { crowd: true, key: c.driver.rig }); } }
  /** for tests and the dev overlay */
  stats() { let kin = 0, moving = 0; for (const c of this.cars) { if (c.v.kinematic) kin++; if (c.v.speed > 5) moving++; } return { cars: this.cars.length, kinematic: kin, moving, spawned: this.spawned, despawned: this.despawned, towed: this.towed }; }
}

// a new car's speed: most of its lane's, but no more than lets it stop at the lane's stop line (it may come up to a red)
function startSpeed(p) { return Math.min(p.lane.speed * .6, Math.sqrt(2 * TUNE.idmBrake * .6 * Math.max(0, (p.lane.stopS ?? p.lane.len) - p.s - 12))); }
