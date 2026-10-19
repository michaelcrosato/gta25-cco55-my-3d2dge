// CityLife (PLAN.md 8.7-8.10): the living city round the focus, stepped together: the road graph, the GPS and the
// junctions (built once per city and kept on it), the traffic, the crowd and the emergency services. A scene makes one
// per world, calls update(dt, ctx) each step before the Fleet steps (the drivers' Intents are ready), and asks it for
// the Intent of any car it drives.
//   const L = new CityLife({ city, fleet, combat, footprint, spec });  L.update(dt, { focus, night, wet, player });
//   fleet.update(dt, { intent: v => mine(v) || L.intentFor(v) })  ·  L.draw(stage, focus)  ·  L.hash()
import { RoadGraph } from '../nav/roadgraph.js';
import { GPS } from '../nav/gps.js';
import { Junctions } from '../nav/junctions.js';
import { RNG } from '../core/rng.js';
import { Traffic } from './traffic.js';

/** the city's road graph, GPS and junctions (built once: about 70 ms for Lowtown) */
export function roadsOf(city) {
  if (!city._roads) { const graph = new RoadGraph(city); city._roads = { graph, gps: new GPS(graph), junctions: null }; }
  return city._roads;
}

export class CityLife {
  /** o: { city, fleet, combat, footprint, spec (the district fleet's traffic and crowd spec) } */
  constructor(o) {
    this.city = o.city; this.fleet = o.fleet; this.combat = o.combat || null; this.fp = o.footprint; this.spec = o.spec || {};
    const R = roadsOf(this.city); this.graph = R.graph; this.gps = R.gps;
    this.junctions = new Junctions(this.graph);   // (reservations are per world: a fresh scene starts with every box free)
    this.t = 0; this.handed = [];
    this.traffic = new Traffic({ city: this.city, fleet: this.fleet, graph: this.graph, junctions: this.junctions, footprint: this.fp, spec: this.spec.traffic, rng: RNG.stream('traffic'),
      onDriverOut: (ped, v, why) => this._driverOut(ped, v, why) });
  }
  /** one step. ctx: { focus: [x, y], night, wet, player (the vehicle the player drives, or null), pedsNear } */
  update(dt, ctx = {}) {
    this.t += dt;
    this.traffic.update(dt, { t: this.t, night: !!ctx.night, wet: ctx.wet || 0, player: ctx.player || null, pedsNear: ctx.pedsNear || null, sirens: this.fleet.vehicles.filter(v => v.siren && v.speed > 20) });
  }
  /** the Intent CityLife's AI drives a vehicle on (null: not one of its own) */
  intentFor(v) { return this.traffic.intentFor(v); }
  // a traffic driver out of its car (jacked, rammed, dead): the crowd takes it on (M5's PedBrain), or Combat keeps it
  _driverOut(ped, v, why) { this.handed.push({ ped, why, from: v.id }); if (this.combat && !this.combat.bodies.includes(ped)) this.combat.add(ped); if (this.onDriverOut) this.onDriverOut(ped, v, why); }
  /** for state hashes: the traffic's count (the vehicles themselves are in the Fleet's hash) */
  hash() { return [this.traffic.count, this.traffic.spawned]; }
  stats() { return { traffic: this.traffic.stats(), junctions: this.junctions.stats() }; }
  dispose() { this.traffic.dispose(); }
}
