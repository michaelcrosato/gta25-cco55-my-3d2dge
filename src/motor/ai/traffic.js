// Traffic (PLAN.md 8.9): the cars that drive a district's lanes around the focus.
//   - the spawner: a target count by neighbourhood, time of day and weather (the district fleet's `traffic` spec);
//     cars appear only inside the footprint's spawn annulus (fpSpawnIn..fpSpawnOut world units from the focus: never in
//     sight of a nearer camera, the same in every view), on a lane that goes somewhere, with room around them, and
//     leave beyond its outer edge;
//   - each car: a civilian definition picked by the neighbourhood's weights and the time of day, a driver (a Ped of a
//     local archetype, sitting in the driver's seat) and a DriverBrain;
//   - LOD (PLAN.md 7.11): within fpFull of the focus a car drives on its physics (the brain writes the driver's
//     Intent); beyond it, its brain moves it along its lane (kinematic), so far traffic costs little and never stalls;
//   - panic: shots, blasts and killings near a driver scare it (faster, the lights ignored, for a while);
//   - hand-off: a car whose driver's seat someone else takes (a carjack) leaves the traffic, and its old driver is
//     handed on (onDriverOut: the crowd decides whether it flees or fights); a car the player rams hard stops, and its
//     driver may get out angry or scared.
// Deterministic: the 'traffic' RNG stream, lanes and cars in a fixed order; the camera is never read.
//   const T = new Traffic({ city, fleet, graph, junctions, footprint, spec });  T.update(dt, ctx);  T.intentFor(v)
import { TUNE, knob } from '../core/tune.js';
import { RNG } from '../core/rng.js';
import { BUS } from '../core/bus.js';
import { all } from '../core/registry.js';
import { clearIntent, makeIntent } from '../sim/intent.js';
import { classOf } from '../sim/vehicle/defs.js';
import { Ped } from '../actors/ped.js';
import { pedLook, pickPed, pedFits } from '../actors/peds.js';
import { DriverBrain } from './driver.js';

knob('Traffic', 'trafficCars', 'Traffic cars', 34, 0, 60, 1, 'Moving traffic around the focus at full density (the neighbourhood, time and weather scale it)');
knob('Traffic', 'trafficNight', 'Night traffic', .6, 0, 1.5, .05, 'Traffic density at night, against the day');
knob('Traffic', 'trafficRain', 'Rain traffic', .8, 0, 1.5, .05, 'Traffic density in rain or storm');
knob('Traffic', 'panicRange', 'Panics within', 220, 0, 800, 10, 'A shot, blast or killing scares drivers this near (u)');
knob('Traffic', 'rammedOut', 'Gets out when rammed', .55, 0, 1, .05, 'The chance a driver the player rams hard gets out (angry or scared)');
const LOD_IN = 20;   // hysteresis either side of fpFull (u)
const SPAWN_EVERY = .25, SAMPLE = 40;

export class Traffic {
  /** o: { city, fleet, graph, junctions, footprint, spec (the fleets entry's traffic: { hoods: { id: factor }, roles,
   *  classes }), rng, onDriverOut(ped, car, why) } */
  constructor(o) {
    this.city = o.city; this.fleet = o.fleet; this.g = o.graph; this.J = o.junctions; this.fp = o.footprint;
    this.spec = Object.assign({ hoods: {}, roles: ['civilian'], classes: ['car', 'truck', 'bike'] }, o.spec || {});
    this.rng = o.rng || RNG.stream('traffic'); this.onDriverOut = o.onDriverOut || null;
    this.cars = []; this.t = 0; this._spawnT = 0; this.spawned = 0; this.despawned = 0; this.idle = makeIntent();
    // spawn points: every SAMPLE units along each lane that goes somewhere (no dead ends, no jump, room at both ends)
    this.points = [];
    for (const l of this.g.lanes) {
      if (l.deadEnd || !l.out.length || l.kind === 'stub' || l.len < 60) continue;
      for (let s = 24; s < l.len - 24; s += SAMPLE) { const p = this.g.pointOn(l, s); this.points.push({ lane: l, s, x: p[0], y: p[1], z: p[2] }); }
    }
    this.pool = all('vehicles').filter(d => d.spawn && (d.spawn.weight || 0) > 0 && d.spawn.zones && this.spec.roles.includes(d.role) && this.spec.classes.includes(classOf(d)));
    this._unsub = [BUS.on('crime', e => this._scare(e.x, e.y, e.type === 'murder' || e.type === 'explosion' ? 1.4 : 1), 'world'), BUS.on('explode', e => this._scare(e.x, e.y, 1.6), 'world')];
  }
  /** stop listening (the scene is leaving) */
  dispose() { for (const u of this._unsub) u(); for (const c of [...this.cars]) this._drop(c, false); }
  get count() { return this.cars.length; }
  /** the Intent a traffic car's driver drives on this step (null: not a traffic car) */
  intentFor(v) { const b = v.brain; return b && v.traffic ? (v.kinematic ? clearIntent(this.idle) : b.I) : null; }
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
      if (c.v.driver !== c.driver || c.v.wrecked || c.v.sunk || !this.fleet.vehicles.includes(c.v)) { this._drop(c, true); continue; }
      if (fp.d(c.v.x, c.v.y) > TUNE.fpSpawnOut + 60 && c.v.owner !== 'mission') { this._drop(c, false, true); continue; }
    }
    this._spawnT -= dt;
    if (this._spawnT <= 0) { this._spawnT = SPAWN_EVERY; const want = this.target(ctx); for (let k = 0; k < 2 && this.cars.length < want; k++) this._spawn(ctx); }
    const W = { fleet: this.fleet, t: ctx.t ?? this.t, pedsNear: ctx.pedsNear || null, wet: ctx.wet || 0, sirens: ctx.sirens || null };
    for (const c of this.cars) {
      const v = c.v, b = c.brain, d = fp.d(v.x, v.y);
      // near and far (with a little hysteresis); a car pushed off its lane stays physical until it is back on one
      if (v.kinematic && d < TUNE.fpFull - LOD_IN) { v.kinematic = false; v.body.setVelocity(Math.cos(v.heading) * b.speed, Math.sin(v.heading) * b.speed); }
      else if (!v.kinematic && d > TUNE.fpFull + LOD_IN && b.snap()) v.kinematic = true;
      // a hard knock from the player's vehicle: a pause, maybe out of the car
      if (v.bumpedBy && v.bumpT === this.fleet.t && ctx.player && v.bumpedBy === ctx.player && v.bumpDv > 40) {
        b.crashed(1.6);
        if (this.rng.next() < TUNE.rammedOut && this.onDriverOut) { c.out = { why: this.rng.next() < (c.tough ?? .3) ? 'angry' : 'scared', t: 1.4 }; }
      }
      if (c.out) { c.out.t -= dt; if (c.out.t <= 0 && v.speed < 6) { this._getOut(c, c.out.why); continue; } }
      if (v.kinematic) b.step(dt, W); else b.update(dt, W);
      if (!v.kinematic && c.driver) c.driver.update(dt, clearIntent(this.idle), { map: this.city.map, city: this.city });   // (the driver rides in its seat)
    }
  }
  // a new car somewhere in the annulus, on a lane, with room, of a definition the neighbourhood and the hour allow
  _spawn(ctx) {
    const fp = this.fp, inR = TUNE.fpSpawnIn, outR = TUNE.fpSpawnOut, cand = [];
    for (const p of this.points) { const d = Math.hypot(p.x - fp.x, p.y - fp.y); if (d >= inR && d <= outR && !(p.lane.bridge && ctx.bridgeUp && ctx.bridgeUp(p.lane.bridge))) cand.push(p); }
    if (!cand.length) return null;
    for (let tries = 0; tries < 4; tries++) {
      const p = cand[Math.floor(this.rng.next() * cand.length)], hood = this.city.hoodAtPoint(p.x, p.y), f = hood && this.spec.hoods[hood.id] !== undefined ? this.spec.hoods[hood.id] : 1;
      if (this.rng.next() > f / Math.max(1, ...Object.values(this.spec.hoods), 1)) continue;
      if (this.city.zonesAt(p.x, p.y).some(z => z.kind === 'noSpawn')) continue;
      if (this.fleet.around(p.x, p.y, 70).some(o => o.body && Math.abs(o.z - p.z) < 12 && Math.hypot(o.x - p.x, o.y - p.y) < o.hl + 46)) continue;
      const def = this._pickDef(hood ? hood.id : '', ctx.night); if (!def) return null;
      const h = Math.atan2(p.lane.dir[1], p.lane.dir[0]), v = this.fleet.spawn(def.id, p.x, p.y, h, { color: def.palette[Math.floor(this.rng.next() * def.palette.length)] });
      v.body.z = p.z; v.traffic = true; v.bornT = this.t;
      const arch = pickPed(this.rng, s => s.kind === 'civilian' && pedFits(s, hood ? hood.id : '', ctx.night)) || pickPed(this.rng, s => s.kind === 'civilian');
      const driver = new Ped({ x: p.x, y: p.y, faction: 'civilian', look: arch ? pedLook(arch, this.rng) : {} });
      driver.archetype = arch ? arch.id : null; v.sit(driver, 0);
      const brain = new DriverBrain(v, this.g, { junctions: this.J, rng: this.rng, lane: p.lane.id, s: p.s,
        personality: { speed: .88 + this.rng.next() * .24, gap: .85 + this.rng.next() * .4, patience: .7 + this.rng.next() * .7, calm: true } });
      brain.speed = p.lane.speed * .6; v.brain = brain; v.kinematic = true;
      const c = { v, driver, brain, tough: arch && arch.traits ? arch.traits.tough ?? .15 : .15, out: null };
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
  // a car leaves the traffic: its brain lets go of its junctions; despawned, it is removed with its driver; jacked, its
  // old driver is handed on
  _drop(c, jacked, despawn = false) {
    const i = this.cars.indexOf(c); if (i >= 0) this.cars.splice(i, 1);
    c.brain.dispose(); const v = c.v; v.brain = null; v.kinematic = false; v.traffic = false;
    if (despawn) { this.fleet.remove(v); this.despawned++; return; }
    if (jacked && c.driver && v.driver !== c.driver && this.onDriverOut) this.onDriverOut(c.driver, v, c.driver.dead ? 'dead' : 'jacked');
  }
  // shots, blasts and killings near drivers scare them
  _scare(x, y, k = 1) {
    if (x === undefined) return;
    const r = TUNE.panicRange * k;
    for (const c of this.cars) if (Math.abs(c.v.x - x) < r && Math.abs(c.v.y - y) < r && Math.hypot(c.v.x - x, c.v.y - y) < r) c.brain.scare(6 + 4 * this.rng.next());
  }
  /** for tests and the dev overlay */
  stats() { let kin = 0, moving = 0; for (const c of this.cars) { if (c.v.kinematic) kin++; if (c.v.speed > 5) moving++; } return { cars: this.cars.length, kinematic: kin, moving, spawned: this.spawned, despawned: this.despawned }; }
}
