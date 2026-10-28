// CityLife (PLAN.md 8.7-8.10, 8.13): the living city round the focus, stepped together: the road graph, the GPS, the
// junctions and the sidewalks (built once per city and kept on it), the traffic, the crowd, the emergency services and
// the police (the wanted level and its response).
// A scene makes one per world, calls update(dt, ctx) each step before the Fleet steps (the drivers' Intents are ready),
// and asks it for the Intent of any car it drives.
//   const L = new CityLife({ city, fleet, combat, footprint, spec, isPlayer });  L.update(dt, { night, wet, player, ped, others });
//   fleet.update(dt, { intent: v => mine(v) || L.intentFor(v) })  ·  L.draw(stage, fx, fy, reach)  ·  L.hash()
import { RoadGraph } from '../nav/roadgraph.js';
import { GPS } from '../nav/gps.js';
import { Junctions } from '../nav/junctions.js';
import { Sidewalks } from '../nav/sidewalks.js';
import { RNG } from '../core/rng.js';
import { Traffic } from './traffic.js';
import { Crowd } from './crowd.js';
import { Emergency } from './emergency.js';
import { Police } from '../police/police.js';
import { Gangs } from '../gangs/gangs.js';

/** the city's road graph, GPS and sidewalks (built once: about 200 ms for Lowtown) */
export function roadsOf(city) {
  if (!city._roads) { const graph = new RoadGraph(city); city._roads = { graph, gps: new GPS(graph), walks: new Sidewalks(city, graph) }; }
  return city._roads;
}

export class CityLife {
  /** o: { city, fleet, combat, footprint, spec (the district fleet's entry: its traffic, crowd, services and police
   *  specs), crowd (false: no peds), traffic (false: no cars), police (false: no wanted level), gangs (false: none),
   *  isPlayer (id -> the player's: whose crimes earn stars), respect ({ gang: value }: the save's, kept in place) } */
  constructor(o) {
    this.city = o.city; this.fleet = o.fleet; this.combat = o.combat || null; this.fp = o.footprint; this.spec = o.spec || {};
    const R = roadsOf(this.city); this.graph = R.graph; this.gps = R.gps; this.walks = R.walks;
    this.junctions = new Junctions(this.graph);   // (reservations are per world: a fresh scene starts with every box free)
    this.t = 0; this.handed = []; this.player = null;
    this.crowd = o.crowd === false ? null : new Crowd({ city: this.city, walks: this.walks, combat: this.combat, fleet: this.fleet, footprint: this.fp, spec: this.spec.crowd, rng: RNG.stream('peds') });
    this.traffic = o.traffic === false ? null : new Traffic({ city: this.city, fleet: this.fleet, graph: this.graph, gps: this.gps, junctions: this.junctions, footprint: this.fp, spec: this.spec.traffic, rng: RNG.stream('traffic'),
      onDriverOut: (ped, v, why) => this._driverOut(ped, v, why), isPlayer: o.isPlayer });
    const police = o.police !== false && !!this.traffic;
    this.services = o.services === false || !this.traffic ? null : new Emergency({ life: this, combat: this.combat, fleet: this.fleet, footprint: this.fp, spec: this.spec.services, rng: RNG.stream('services'), reports: !police });
    this.police = police ? new Police({ life: this, city: this.city, fleet: this.fleet, combat: this.combat, footprint: this.fp, spec: this.spec.police, isPlayer: o.isPlayer, rng: RNG.stream('police') }) : null;
    this.gangs = o.gangs === false || !this.crowd ? null : new Gangs({ life: this, city: this.city, fleet: this.fleet, combat: this.combat, footprint: this.fp, respect: o.respect, isPlayer: o.isPlayer, rng: RNG.stream('gangs') });
  }
  /** one step. ctx: { night, wet, player (the vehicle the player drives, or null), ped (the possessed Ped), others
   *  (bodies on foot CityLife does not own: the crew), bridges (the live drawbridges: their gates shut the traffic and
   *  the crowd off the span) } */
  update(dt, ctx = {}) {
    this.t += dt; this.player = ctx.ped || null;
    const pedsNear = this.crowd ? (x, y, r) => this.crowd.pedsNear(x, y, r) : null, B = ctx.bridges || [];
    const closed = B.length ? id => B.some(b => b.id === id && b.closed) : null, closedAt = B.length ? (x, y) => B.some(b => b.closed && b.contains(x, y)) : null;
    if (this.crowd) this.crowd.update(dt, { t: this.t, night: !!ctx.night, wet: ctx.wet || 0, closedAt, player: ctx.ped || null, truce: this.gangs ? this.gangs.allies : null, others: [...(ctx.others || []), ...(this.services ? this.services.bodies : []), ...(this.police ? this.police.bodies : []), ...(this.gangs ? this.gangs.bodies : [])] });
    const sirens = this.fleet.vehicles.filter(v => v.siren && !(v.duty && v.duty.out)), W = { fleet: this.fleet, t: this.t, pedsNear, wet: ctx.wet || 0, sirens, closed };
    if (this.traffic) this.traffic.update(dt, { t: this.t, night: !!ctx.night, wet: ctx.wet || 0, player: ctx.player || null, pedsNear, sirens, closed, bridgeUp: closed });
    if (this.services) this.services.update(dt, { t: this.t });
    if (this.police) this.police.update(dt, { player: ctx.ped || null, night: !!ctx.night, W });
    if (this.gangs) this.gangs.update(dt, { player: ctx.ped || null });
  }
  /** the Intent CityLife's AI drives a vehicle on (null: not one of its own) */
  intentFor(v) { return (this.police && this.police.intentFor(v)) || (this.traffic ? this.traffic.intentFor(v) : null); }
  /** the wanted level (null: no police in this world) */
  get wanted() { return this.police ? this.police.wanted : null; }
  /** the bodies on foot near a point (for drivers, the dev overlay, tests) */
  pedsNear(x, y, r) { return this.crowd ? this.crowd.pedsNear(x, y, r) : []; }
  // a traffic driver out of its car (jacked, rammed, dead): the crowd takes it on (it flees or fights), else Combat keeps it
  _driverOut(ped, v, why) {
    this.handed.push({ ped, why, from: v.id });
    const by = why === 'jacked' ? v.driver : this.player;
    if (this.police && ped.faction === 'police' && !ped.dead) this.police.adoptCop(ped, why, v);   // (an officer pulled out of its car joins the chase)
    else if (this.gangs && ped.gang) this.gangs.adopt(ped, why, by && by.vitals ? by : null);   // (a gang's member: in the fight, unless its gang is the player's friend)
    else if (this.crowd) this.crowd.adopt(ped, why, { from: v, by: by && by.vitals ? by : null });
    else if (this.combat && !this.combat.bodies.includes(ped)) this.combat.add(ped);
  }
  /** draw the people CityLife owns round the focus: the crowd, and the traffic's riders */
  draw(stage, fx, fy, reach) { if (this.crowd) this.crowd.draw(stage, fx, fy, reach); if (this.traffic) this.traffic.draw(stage, fx, fy, reach); if (this.services) this.services.draw(stage, fx, fy, reach); if (this.police) this.police.draw(stage, fx, fy, reach); if (this.gangs) this.gangs.draw(stage, fx, fy, reach); }
  /** for state hashes: the traffic's and the crowd's counts and places (the vehicles themselves are in the Fleet's hash) */
  hash() { return [...(this.traffic ? [this.traffic.count, this.traffic.spawned] : []), ...(this.crowd ? this.crowd.hash() : []), ...(this.services ? this.services.hash() : []), ...(this.police ? this.police.hash() : []), ...(this.gangs ? this.gangs.hash() : [])]; }
  stats() { return { traffic: this.traffic ? this.traffic.stats() : null, crowd: this.crowd ? this.crowd.stats() : null, services: this.services ? this.services.stats() : null, police: this.police ? this.police.stats() : null, gangs: this.gangs ? this.gangs.stats() : null, junctions: this.junctions.stats() }; }
  dispose() { if (this.gangs) this.gangs.dispose(); if (this.police) this.police.dispose(); if (this.services) this.services.dispose(); if (this.traffic) this.traffic.dispose(); if (this.crowd) this.crowd.dispose(); }
}
