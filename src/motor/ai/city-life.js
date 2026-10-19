// CityLife (PLAN.md 8.7-8.10): the living city round the focus, stepped together: the road graph, the GPS, the
// junctions and the sidewalks (built once per city and kept on it), the traffic, the crowd and the emergency services.
// A scene makes one per world, calls update(dt, ctx) each step before the Fleet steps (the drivers' Intents are ready),
// and asks it for the Intent of any car it drives.
//   const L = new CityLife({ city, fleet, combat, footprint, spec });  L.update(dt, { night, wet, player, ped, others });
//   fleet.update(dt, { intent: v => mine(v) || L.intentFor(v) })  ·  L.draw(stage, fx, fy, reach)  ·  L.hash()
import { RoadGraph } from '../nav/roadgraph.js';
import { GPS } from '../nav/gps.js';
import { Junctions } from '../nav/junctions.js';
import { Sidewalks } from '../nav/sidewalks.js';
import { RNG } from '../core/rng.js';
import { Traffic } from './traffic.js';
import { Crowd } from './crowd.js';
import { Emergency } from './emergency.js';

/** the city's road graph, GPS and sidewalks (built once: about 200 ms for Lowtown) */
export function roadsOf(city) {
  if (!city._roads) { const graph = new RoadGraph(city); city._roads = { graph, gps: new GPS(graph), walks: new Sidewalks(city, graph) }; }
  return city._roads;
}

export class CityLife {
  /** o: { city, fleet, combat, footprint, spec (the district fleet's entry: its traffic and crowd specs), crowd (false:
   *  no peds), traffic (false: no cars) } */
  constructor(o) {
    this.city = o.city; this.fleet = o.fleet; this.combat = o.combat || null; this.fp = o.footprint; this.spec = o.spec || {};
    const R = roadsOf(this.city); this.graph = R.graph; this.gps = R.gps; this.walks = R.walks;
    this.junctions = new Junctions(this.graph);   // (reservations are per world: a fresh scene starts with every box free)
    this.t = 0; this.handed = []; this.player = null;
    this.crowd = o.crowd === false ? null : new Crowd({ city: this.city, walks: this.walks, combat: this.combat, fleet: this.fleet, footprint: this.fp, spec: this.spec.crowd, rng: RNG.stream('peds') });
    this.traffic = o.traffic === false ? null : new Traffic({ city: this.city, fleet: this.fleet, graph: this.graph, gps: this.gps, junctions: this.junctions, footprint: this.fp, spec: this.spec.traffic, rng: RNG.stream('traffic'),
      onDriverOut: (ped, v, why) => this._driverOut(ped, v, why) });
    this.services = o.services === false || !this.traffic ? null : new Emergency({ life: this, combat: this.combat, fleet: this.fleet, footprint: this.fp, spec: this.spec.services, rng: RNG.stream('services') });
  }
  /** one step. ctx: { night, wet, player (the vehicle the player drives, or null), ped (the possessed Ped), others
   *  (bodies on foot CityLife does not own: the crew) } */
  update(dt, ctx = {}) {
    this.t += dt; this.player = ctx.ped || null;
    const pedsNear = this.crowd ? (x, y, r) => this.crowd.pedsNear(x, y, r) : null;
    if (this.crowd) this.crowd.update(dt, { t: this.t, night: !!ctx.night, wet: ctx.wet || 0, player: ctx.ped || null, others: this.services ? [...(ctx.others || []), ...this.services.bodies] : ctx.others || [] });
    if (this.traffic) this.traffic.update(dt, { t: this.t, night: !!ctx.night, wet: ctx.wet || 0, player: ctx.player || null, pedsNear, sirens: this.fleet.vehicles.filter(v => v.siren && !(v.duty && v.duty.out)) });
    if (this.services) this.services.update(dt, { t: this.t });
  }
  /** the Intent CityLife's AI drives a vehicle on (null: not one of its own) */
  intentFor(v) { return this.traffic ? this.traffic.intentFor(v) : null; }
  /** the bodies on foot near a point (for drivers, the dev overlay, tests) */
  pedsNear(x, y, r) { return this.crowd ? this.crowd.pedsNear(x, y, r) : []; }
  // a traffic driver out of its car (jacked, rammed, dead): the crowd takes it on (it flees or fights), else Combat keeps it
  _driverOut(ped, v, why) {
    this.handed.push({ ped, why, from: v.id });
    const by = why === 'jacked' ? v.driver : this.player;
    if (this.crowd) this.crowd.adopt(ped, why, { from: v, by: by && by.vitals ? by : null });
    else if (this.combat && !this.combat.bodies.includes(ped)) this.combat.add(ped);
  }
  /** draw the people CityLife owns round the focus: the crowd, and the traffic's riders */
  draw(stage, fx, fy, reach) { if (this.crowd) this.crowd.draw(stage, fx, fy, reach); if (this.traffic) this.traffic.draw(stage, fx, fy, reach); if (this.services) this.services.draw(stage, fx, fy, reach); }
  /** for state hashes: the traffic's and the crowd's counts and places (the vehicles themselves are in the Fleet's hash) */
  hash() { return [...(this.traffic ? [this.traffic.count, this.traffic.spawned] : []), ...(this.crowd ? this.crowd.hash() : []), ...(this.services ? this.services.hash() : [])]; }
  stats() { return { traffic: this.traffic ? this.traffic.stats() : null, crowd: this.crowd ? this.crowd.stats() : null, services: this.services ? this.services.stats() : null, junctions: this.junctions.stats() }; }
  dispose() { if (this.services) this.services.dispose(); if (this.traffic) this.traffic.dispose(); if (this.crowd) this.crowd.dispose(); }
}
