// The police (PLAN.md 8.13): who sees the player, what that earns (wanted.js keeps the heat and stars), and the
// response the stars send.
//   - seeing: every police body (an officer on foot, a crew in its car, the MPD Eye overhead) looks with E.sees, a
//     shorter way in an alley, a short one from under a deck (the Eye sees nothing there). A crime the player commits
//     in a cop's sight fills that cop's E.Suspicion (a violent or grave one at once, a mild one over a moment's look);
//     its alert files the crime (heat, TUNE.copSeenMul more than a report). A civilian's `report` files it too; one
//     that earns no star, or someone else's, sends a car to look round instead (emergency.js). Traffic offences count
//     only in a cop's sight: speeding, a red light;
//   - the response, by star (def('policeTiers', '1'..'5'): content): patrol cars sent by the GPS with their sirens on
//     and driven by pursuit.js, the precinct's foot patrol and any officers already about joining in; SWAT vans at 4,
//     the Feds' black sedans at 5 (they flank); the MPD Eye from 3 (it circles the player, its searchlight on them at
//     night); roadblocks from 3 and spike strips from 4, put across the road the player drives down, ahead of them in
//     the footprint's annulus (out of sight); a unit's crew gets out where the player is on foot (or stopped) and works
//     on foot (cop.js), and runs back to drive on when the player drives off;
//   - NABBED: a cop reaches the player on foot while they are slow or unarmed (TUNE.arrestTime), or stands at the door
//     of their stopped car for TUNE.doorTime: `busted` goes out, the police hold still, and the scene plays the rest;
//   - stood down (the stars gone), the crews walk back and drive off as traffic again, officers without a car go back
//     to the sidewalks (the crowd), the Eye to its patrol; roadblocks and strips go once out of sight.
// Deterministic: the 'police' RNG stream; units and cops in a fixed order; the camera is never read.
//   const P = new Police({ life, city, fleet, combat, footprint, isPlayer });  P.update(dt, ctx);  P.intentFor(v)
import { E } from '../engine.js';
import { TUNE, knob } from '../core/tune.js';
import { RNG } from '../core/rng.js';
import { BUS } from '../core/bus.js';
import { declare, get } from '../core/registry.js';
import { shape } from '../core/schema.js';
import { makeIntent, clearIntent } from '../sim/intent.js';
import { exitFor } from '../actors/boarding.js';
import { Ped } from '../actors/ped.js';
import { pedLook } from '../actors/peds.js';
import { signalAt } from '../nav/signals.js';
import { Wanted } from './wanted.js';
import { PursuitDriver } from './pursuit.js';
import { CopBrain, doorOf } from './cop.js';

declare('policeTiers', shape({
  cruisers: { type: 'number', def: 1, min: 0 }, swat: { type: 'number', def: 0, min: 0 }, feds: { type: 'number', def: 0, min: 0 },
  chopper: { type: 'boolean', def: false }, roadblocks: { type: 'number', def: 0, min: 0 }, spikes: { type: 'number', def: 0, min: 0 },
  shoot: { type: 'boolean', def: false }, flank: { type: 'boolean', def: false },
}));

knob('Police', 'copSight', 'Officers see', 240, 60, 600, 10, 'How far an officer on foot sees (u)');
knob('Police', 'copFov', 'Officers\' view', 2.6, .5, 6.3, .1, 'How wide an officer on foot sees (radians)');
knob('Police', 'carSight', 'A crew in its car sees', 300, 60, 700, 10, 'How far the crew of a police car sees, all round (u)');
knob('Police', 'heliSight', 'The Eye sees', 520, 100, 1200, 10, 'How far the MPD Eye sees down, all round (u)');
knob('Police', 'arrestTime', 'Cuffed after', .8, .1, 4, .05, 'Seconds a cop must be at a slow or unarmed player on foot to cuff them');
knob('Police', 'doorTime', 'Pulled out after', 1.5, .2, 6, .1, 'Seconds a cop must stand at the door of the player\'s stopped car');
knob('Police', 'arrestReach', 'Cuffs within', 12, 4, 30, 1, 'How near a cop must be to cuff the player (u)');
knob('Police', 'slowSpeed', 'Slow enough to cuff', 35, 5, 200, 5, 'A player on foot slower than this can be cuffed even armed (u/s)');
knob('Police', 'roadblockEvery', 'A roadblock every', 18, 3, 120, 1, 'Seconds between roadblocks (from 3 stars, while the player drives)');
knob('Police', 'spikeEvery', 'Spike strips every', 25, 3, 120, 1, 'Seconds between spike strips (from 4 stars)');
knob('Police', 'speedLimit', 'Speeding above', 230, 60, 500, 5, 'A speed a cop who sees it calls speeding (u/s)');
const UNITS = {   // (each kind's vehicle and crew; content may override: the fleet entry's police.units)
  cruiser: { def: 'cruiser', crew: ['mpd', 'mpd'] },
  swat: { def: 'rhino', crew: ['swat', 'swat', 'swat'] },
  fed: { def: 'fedsedan', crew: ['fed', 'fed'] },
};
const SENSE_EVERY = .2, DISPATCH_EVERY = 1, OUT_NEAR = 90, STUCK_OUT = 3, STUCK_NEAR = 320, PENDING = 3, FALL = 2.5, RECALL = 140, HELI_R = 110;
const NOAIM = { candidates: [], level: 'off' };

export class Police {
  /** o: { life (CityLife: traffic, crowd, services, graph, gps, walks), city, fleet, combat, footprint, isPlayer(id),
   *  spec (the fleet entry's police: { units }), rng } */
  constructor(o) {
    this.life = o.life; this.city = o.city; this.fleet = o.fleet; this.combat = o.combat || null; this.fp = o.footprint;
    this.rng = o.rng || RNG.stream('police'); this.isPlayer = o.isPlayer || (() => false);
    this.unitsSpec = { ...UNITS, ...((o.spec && o.spec.units) || {}) };
    this.wanted = new Wanted({ isPlayer: this.isPlayer });
    this.units = []; this.cops = []; this.blocks = []; this.spikes = []; this.heli = null; this.pending = [];
    this.t = 0; this.step = 0; this._senseT = 0; this._dispT = 0; this._blockT = 0; this._spikeT = 0; this._offT = 0;
    this.seen = false; this.copSees = false; this.cuffT = 0; this.doorT = 0; this.busted = null; this.fought = false; this.player = null; this.car = null;
    this.idle = makeIntent(); this.parked = makeIntent(); this.parked.down.handbrake = true; this._inBox = null; this.spawned = 0; this.claimed = 0;
    this._unsub = [
      BUS.on('crime', e => this._crime(e), 'world'),
      BUS.on('report', e => this._report(e), 'world'),
      BUS.on('hit', e => this._hit(e), 'world'),
    ];
  }
  dispose() { for (const u of this._unsub) u(); this._unsub = []; }
  /** the tier the stars call for (null at none) */
  tier(stars = this.wanted.stars) { return stars ? get('policeTiers', String(stars)) || { cruisers: 1 } : null; }
  // ---- what is seen, and what it earns
  // a crime of the player's: each cop who sees them now takes it in (the mind's alert files it, in _sense)
  _crime(e) {
    if (!e || e.x === undefined || !this.isPlayer(e.by)) return;
    const c = this._classify(e), P = this.player; if (!P) return;
    const S = Wanted.spec(c.type), boost = S.violent || S.severity >= 2 ? 1.2 : .7 + .1 * S.severity;
    for (const o of this._observers()) {
      if (!this._sees(o, P)) continue;
      o.mind.level = Math.max(o.mind.level, boost); o.mind.last = { x: P.x, y: P.y, z: P.z || 0 };
      this.pending.push({ e: c, mind: o.mind, t: this.t });
    }
  }
  // the crime as the police name it: an officer's assault or murder, a police car taken
  _classify(e) {
    const vic = e.victim != null && this.combat ? this.combat.bodies.find(b => b.id === e.victim) : null, cop = !!(vic && vic.faction === 'police');
    let type = e.type;
    if (cop && e.type === 'assault') type = 'copAssault';
    else if (cop && e.type === 'murder') type = 'copMurder';
    else if ((e.type === 'carjack' || e.type === 'breakIn') && (cop || (e.vehicle != null && this.fleet.byId(e.vehicle)?.def.role === 'police'))) type = 'policeCarTheft';
    if (type === 'copAssault' || type === 'copMurder') this.fought = true;
    return type === e.type ? e : { ...e, type };
  }
  // a civilian's report: the player's crime files its heat; one that earns no star (or someone else's) brings a car to
  // look round
  _report(e) {
    const c = { type: e.crime, x: e.x, y: e.y, by: e.by, victim: e.victim ?? null };
    if (this.isPlayer(e.by)) { this.wanted.crime(this._classify(c), { cop: false }); if (this.wanted.stars) return; }
    if (this.life.services) this.life.services.call('police', e.x, e.y, { crime: e.crime, by: e.by });
  }
  // the player hit a cop: from now on the police shoot back
  _hit(e) { if (this.isPlayer(e.by) && this.combat) { const t = this.combat.bodies.find(b => b.id === e.target); if (t && t.faction === 'police') this.fought = true; } }
  /** every police body that looks: { x, y, z, facing, fov, range, eye, kind ('foot' | 'patrol' | 'call' | 'car' |
   *  'block' | 'heli'), mind, ... }. make: false never makes a mind (the radar's view of them) */
  _observers(make = true) {
    const out = [], mind = (o, rise = 2.4) => o.mind || (make ? (o.mind = new E.Suspicion({ rise })) : null);
    for (const c of this.cops) { const p = c.ped; if (p.dead || p.seat || p.floored) continue; out.push({ x: p.x, y: p.y, z: p.z || 0, facing: p.mover.facing, fov: TUNE.copFov, range: TUNE.copSight, kind: 'foot', mind: c.mind, cop: c }); }
    const C = this.life.crowd;
    if (C) for (const m of C.members) { const p = m.ped; if (p.faction !== 'police' || p.dead || m.deadT) continue; out.push({ x: p.x, y: p.y, z: p.z || 0, facing: p.mover.facing, fov: TUNE.copFov, range: TUNE.copSight, kind: 'patrol', mind: mind(m), member: m }); }
    const S = this.life.services;
    if (S) for (const c of S.calls) {
      if (c.kind !== 'police' || c.state === 'done' || !c.unit) continue;
      if (c.state === 'sent') { const v = c.unit.v; out.push({ x: v.x, y: v.y, z: v.z, facing: v.heading, fov: 7, range: TUNE.carSight, eye: 14, kind: 'call', mind: mind(c), call: c }); continue; }
      for (const f of c.crew) { const p = f.ped; if (p.dead || p.seat || p.floored) continue; out.push({ x: p.x, y: p.y, z: p.z || 0, facing: p.mover.facing, fov: TUNE.copFov, range: TUNE.copSight, kind: 'call', mind: mind(f), call: c }); }
    }
    for (const u of this.units) { const v = u.car.v; if (u.out || u.gone || v.wrecked || !u.car.crew.some(q => q && q.seat && !q.dead)) continue; out.push({ x: v.x, y: v.y, z: v.z, facing: v.heading, fov: 7, range: TUNE.carSight, eye: 14, kind: 'car', mind: mind(u), unit: u }); }
    for (const b of this.blocks) for (const v of b.cars) if (!v.wrecked) out.push({ x: v.x, y: v.y, z: v.z, facing: v.heading, fov: 7, range: TUNE.carSight * .8, eye: 14, kind: 'block', mind: mind(b), block: b });
    if (this.heli && !this.heli.v.wrecked) { const v = this.heli.v; out.push({ x: v.x, y: v.y, z: v.z, facing: v.heading, fov: 7, range: TUNE.heliSight, eye: 0, kind: 'heli', mind: mind(this.heli, 3) }); }
    return out.filter(o => o.mind);
  }
  /** does this observer see the player? An alley shortens every sight; under a deck the ground units see a little way
   *  and the Eye nothing */
  _sees(o, P) {
    const under = this._underDeck(P), alley = this.city.surfaceAtPoint && this.city.surfaceAtPoint(P.x, P.y) === 'alley';
    if (o.kind === 'heli') {
      if (under) return false;
      if (Math.hypot(P.x - o.x, P.y - o.y) > o.range * (alley ? .6 : 1)) return false;
      return !this.city.map.ray || this.city.map.ray({ x: o.x, y: o.y, z: o.z }, { x: P.x, y: P.y, z: P.z || 0 }, { eye: 0, target: 10 }).clear;
    }
    const range = o.range * (alley ? .5 : 1) * (under ? .6 : 1);
    return E.sees(o, P, { map: this.city.map, range, fov: o.fov, facing: o.facing, eye: o.eye }).seen;
  }
  _underDeck(P) { for (const d of this.city.decks || []) { const h = d.heightAt(P.x, P.y); if (h !== null && h > (P.z || 0) + 20) return true; } return false; }
  // ---- the step
  /** one step. ctx: { player (the possessed Ped), night, W (the drivers' world: { fleet, t, pedsNear, wet, sirens }) } */
  update(dt, ctx = {}) {
    this.t += dt; this.step++;
    const P = this.player = ctx.player || null; if (!P) return;
    const car = this.car = P.seat && P.seat.vehicle && P.seat.vehicle.driver === P ? P.seat.vehicle : null, W = this.wanted;
    this._senseT -= dt;
    if (this._senseT <= 0) { this._senseT = SENSE_EVERY; this._sense(SENSE_EVERY, P); }
    if (!this.busted) W.update(dt, { seen: this.seen && !P.dead, at: P });   // (held while the arrest plays out)
    if (car && !this.busted) this._offences(dt, P, car); else this._inBox = null;
    const standDown = !W.stars;
    this._dispT -= dt; if (this._dispT <= 0) { this._dispT = DISPATCH_EVERY; this._dispatch(P); }
    this._units(dt, ctx, P, car, standDown);
    this._copsStep(dt, P, car, standDown);
    this._heliStep();
    this._blocksStep(dt, P, car, standDown);
    this._nab(dt, P, car);
  }
  _sense(dt, P) {
    let seen = false, any = false; const live = !P.dead && !this.busted;
    for (const o of this._observers()) {
      const s = live && this._sees(o, P);
      o.mind.update(dt, s ? { exposure: 1, d: Math.hypot(P.x - o.x, P.y - o.y) } : false, P);
      if (o.cop) o.cop.sees = s;
      if (!s) continue;
      any = true;
      if (this.wanted.stars) { seen = true; if (o.member) this._claim(o.member); else if (o.call) this._claimCall(o.call); }
    }
    this.seen = seen; this.copSees = any;
    // crimes a cop saw: filed once its mind alerts (within a moment), else forgotten
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const q = this.pending[i];
      if (q.mind.state === 'alert') { this.wanted.crime(q.e, { cop: true }); this.pending.splice(i, 1); }
      else if (this.t - q.t > PENDING) this.pending.splice(i, 1);
    }
  }
  // speeding past a cop, a red light run in a cop's sight: crimes like any other (nobody else minds them)
  _offences(dt, P, car) {
    this._offT -= dt; if (this._offT > 0) return; this._offT = .25;
    const G = this.life.graph;
    let box = null; if (G) for (const R of G.regions) { if (R.kind !== 'junction') continue; const [x0, y0, x1, y1] = R.box; if (car.x >= x0 && car.x <= x1 && car.y >= y0 && car.y <= y1 && Math.abs(car.z - R.z) < 12) { box = R; break; } }
    const entered = box && box !== this._inBox; this._inBox = box;
    if (!this.copSees) return;
    if (car.speed > TUNE.speedLimit) BUS.emit('crime', { type: 'speeding', x: car.x, y: car.y, by: P.id, victim: null, severity: 0 });
    if (entered && box.signals === 'signal' && car.speed > 30) {   // (into a junction against its light for the way we came in)
      const axis = Math.abs(Math.cos(car.heading)) > Math.abs(Math.sin(car.heading)) ? 'ew' : 'ns';
      if (signalAt(box, this.life.t)[axis] === 'red') BUS.emit('crime', { type: 'redLight', x: car.x, y: car.y, by: P.id, victim: null, severity: 0 });
    }
  }
  // ---- the response
  _dispatch(P) {
    const T = this.tier(); if (!T || this.busted) { if (!T && this.heli) this._freeHeli(); return; }
    const W = this.wanted, at = W.seen || !W.lastKnown ? P : W.lastKnown;
    const want = { cruiser: T.cruisers || 0, swat: T.swat || 0, fed: T.feds || 0 }, have = { cruiser: 0, swat: 0, fed: 0 };
    for (const u of this.units) if (!u.gone) have[u.kind]++;
    for (const k of ['fed', 'swat', 'cruiser']) {   // (one new unit a dispatch: the heaviest kind short first)
      if (have[k] >= want[k]) continue;
      const U = this.unitsSpec[k], c = this.life.traffic && this.life.traffic.dispatch(U.def, at.x, at.y, { kind: 'police', crew: U.crew, stop: 0, z: at.z || 0 });
      if (!c) break;
      const u = this._unit(k, c); u.flank = k === 'fed' ? (this.units.filter(q => q.kind === 'fed').length % 2 ? 1 : -1) : 0;
      this.spawned++; BUS.emit('dispatch', { kind: 'police', unit: c.v.id, x: Math.round(at.x), y: Math.round(at.y), tier: k });
      break;
    }
    // more units than the stars call for (they came down): the farthest goes back to the traffic
    for (const k of ['cruiser', 'swat', 'fed']) {
      const mine = this.units.filter(u => u.kind === k && !u.gone && !u.out); if (mine.length <= want[k]) continue;
      mine.sort((a, b) => Math.hypot(b.car.v.x - P.x, b.car.v.y - P.y) - Math.hypot(a.car.v.x - P.x, a.car.v.y - P.y) || a.car.v.id - b.car.v.id);
      this._release(mine[0]);
    }
    if (T.chopper && !this.heli) this._claimHeli(P);
    if (!T.chopper && this.heli) this._freeHeli();
  }
  _unit(kind, c) {
    c.duty.ext = true; c.v.owner = 'police';
    const u = { kind, car: c, drive: new PursuitDriver(c, { gps: this.life.gps }), I: this.idle, out: false, gone: false, recall: false, born: this.t, flank: 0, mind: null };
    this.units.push(u); return u;
  }
  // each unit: on the chase; near the player on foot (or stopped) its crew gets out; back in to drive on, or to leave
  _units(dt, ctx, P, car, standDown) {
    const W = this.wanted, WD = ctx.W || { fleet: this.fleet, t: this.life.t };
    for (const u of this.units) {
      const c = u.car, v = c.v;
      if (c.duty && c.duty.lost && !v.wrecked && this.fleet.vehicles.includes(v)) this._bail(u);   // (taken: the rest of its crew gets out)
      if (!c.duty || c.duty.lost || v.wrecked || v.sunk || !this.fleet.vehicles.includes(v)) { this._gone(u); continue; }
      for (const q of c.crew) if (q && q.seat && q.seat.vehicle === v) q.ride();
      const living = c.crew.filter(q => q && !q.dead), aboard = living.filter(q => q.seat && q.seat.vehicle === v);
      if (!living.length) { this.life.traffic.abandon(c); this._gone(u); continue; }   // (nobody left to drive it: it stands where it is)
      if (u.out) {   // its crew on foot: parked where it stopped; all back in, it drives again (or leaves)
        u.I = this.parked;
        u.recall = !standDown && !!car && car.speed > 60 && Math.hypot(car.x - v.x, car.y - v.y) > RECALL;
        living.forEach((q, i) => { const cop = this.cops.find(k => k.ped === q); if (cop) cop.brain.seat = i; });   // (the living fill the front seats)
        if (aboard.length === living.length) {
          if (!v.driver) { const q = aboard[0]; v.unseat(q); v.sit(q, 0); }
          c.crew = living; c.driver = v.driver; c.duty.out = false; c.brain.parked = false; u.out = false; u.recall = false;
          u.drive.goalAt = null; u.drive.routeT = 0; for (const q of living) this._dropCop(q, false);
        }
        continue;
      }
      if (standDown) { this._release(u); continue; }
      if (this.busted) { u.I = this.parked; continue; }
      const tgt = W.seen || !W.lastKnown ? { x: P.x, y: P.y, z: P.z || 0, car } : { x: W.lastKnown.x, y: W.lastKnown.y, z: 0, car: null };
      const stopFor = !car || car.speed < 10, d = Math.hypot(tgt.x - v.x, tgt.y - v.y);
      u.I = u.drive.update(dt, WD, tgt, this.fp, { map: this.city.map, stop: stopFor });
      // there (the player on foot or stopped, near and seen), or held up a while not far off (a jam, no way round): out
      // they get, and the rest is on foot
      u.stillT = !v.kinematic && v.speed < 4 ? (u.stillT || 0) + dt : 0;
      const T = this.life.traffic, onLane = T.parkable(c) || T.heldBehind(c);   // (held up in a jam: never left inside a junction, just out of one, nor where the traffic can't go round it, unless the way is blocked already)
      if (stopFor && !v.kinematic && ((W.seen && v.speed < 8 && d < OUT_NEAR) || (u.stillT > STUCK_OUT && d < STUCK_NEAR && onLane))) this._crewOut(u);
    }
    this.units = this.units.filter(u => !u.gone);
  }
  _crewOut(u) {
    const c = u.car, v = c.v; u.out = true; u.I = this.parked; c.duty.out = true; if (c.brain) c.brain.parked = true;   // (parked where it stopped: the traffic goes round it, never queues behind it)
    c.crew.forEach((ped, i) => {
      if (!ped || ped.dead || !ped.seat) return;
      const plan = exitFor(ped, v); if (plan) ped.leave(plan); else { v.unseat(ped); const [x, y] = v.toWorld(0, (i % 2 ? 1 : -1) * (v.hw + 8)); ped.place(x, y, v.z); }
      this._addCop(ped, { unit: u, seat: i, flank: u.flank });
    });
  }
  // a car the player took from a unit: whoever is still in it gets out and joins in on foot
  _bail(u) {
    const v = u.car.v;
    u.car.crew.forEach((q, i) => {
      if (!q || q.dead || !q.seat || q.seat.vehicle !== v || this.isPlayer(q.id)) return;
      const plan = exitFor(q, v); if (plan) q.leave(plan); else { v.unseat(q); const [x, y] = v.toWorld(0, (i % 2 ? 1 : -1) * (v.hw + 8)); q.place(x, y, v.z); }
      this._addCop(q, {});
    });
  }
  // a unit back to the traffic: siren off, its crew aboard (any still out walk back first: cop.js's stand-down)
  _release(u) {
    const c = u.car; if (c.crew.some(q => q && !q.dead && !q.seat)) { u.out = true; c.duty.out = true; return; }
    u.gone = true; c.duty.ext = false; this.life.traffic.release(c); c.v.owner = 'world';
    for (const q of c.crew) if (q) this._dropCop(q, false);
  }
  _gone(u) { u.gone = true; if (u.car.duty) u.car.duty.ext = false; for (const c of this.cops) if (c.unit === u) c.unit = null; }
  // ---- cops on foot
  _addCop(ped, o = {}) {
    let c = this.cops.find(k => k.ped === ped);
    if (c) { if (o.unit) { c.unit = o.unit; c.brain.unit = o.unit; c.brain.seat = o.seat ?? c.brain.seat; } return c; }
    const brain = new CopBrain(ped, { walks: this.life.walks, map: this.city.map, fleet: this.fleet, rng: this.rng, unit: o.unit || null, seat: o.seat ?? 0, post: o.post || null, flank: o.flank || 0 });
    c = { ped, brain, unit: o.unit || null, block: o.block || null, mind: new E.Suspicion({ rise: 2.4 }), sees: false, deadT: 0, crowd: !!o.crowd, arch: o.arch || ped.archetype || null };
    this.cops.push(c); if (this.combat) this.combat.add(ped);
    ped.lazyRig = true; ped.coast = false; ped.crowd = false;
    return c;
  }
  /** an officer out of its car some other way (pulled out by the player, rammed out): on foot, it joins in */
  adoptCop(ped) { return this._addCop(ped, {}); }
  // off the police's hands: seated in its car again (combat: false keeps it in Combat's bodies), or gone
  _dropCop(ped, combat = true) { const i = this.cops.findIndex(c => c.ped === ped); if (i < 0) return; this.cops.splice(i, 1); if (combat && this.combat) this.combat.remove(ped); }
  // a patrol officer who sees the wanted player leaves its beat (the crowd lets it go) and joins the chase
  _claim(m) { const C = this.life.crowd; if (!C || !C.release(m)) return; this._addCop(m.ped, { crowd: true, arch: m.arch }); this.claimed++; }
  // a car sent to look round (emergency.js) whose officers see the player wanted: the unit and its crew join the chase
  _claimCall(call) {
    const S = this.life.services, h = S && S.handOver(call); if (!h) return;
    const u = this._unit('cruiser', h.unit); u.out = h.scene; this.claimed++;
    if (!h.scene) { h.unit.duty.out = false; h.unit.brain.parked = false; }
    for (const f of h.crew) if (!f.ped.dead && !f.ped.seat) this._addCop(f.ped, { unit: u, seat: f.seat });
  }
  _copsStep(dt, P, car, standDown) {
    const W = this.wanted, T = this.tier(), shoot = !!(T && T.shoot) || this.fought;
    const PW = { map: this.city.map, city: this.city, combat: this.combat, fleet: this.fleet, aim: NOAIM }, C = this.life.crowd;
    for (const c of this.cops) {
      const p = c.ped;
      if (p.dead) {   // the fall plays; then the body is the crowd's (it lies its time; the Medic may come)
        if (!c.deadT) c.deadT = this.t;
        if (this.t - c.deadT < FALL) p.update(dt, this.idle, PW); else if (C) { C.adopt(p, 'dead', { arch: c.arch ? get('peds', c.arch) : null }); c.returned = true; }
        continue;
      }
      if (p.seat) continue;
      // stood down: an officer with no car to go back to (a patrol, one pulled out of a car) walks the sidewalks again
      if (standDown && !c.block && (!c.unit || c.unit.gone) && C) { C.adopt(p, 'calm', { arch: c.arch ? get('peds', c.arch) : null }); c.returned = true; continue; }
      const busted = !!this.busted, home = standDown || !!(c.unit && c.unit.recall);
      const I = c.brain.update(dt, { player: P, car, seen: c.sees && W.stars > 0 && !busted, stars: W.stars, shoot: shoot && !busted, lastKnown: W.lastKnown, searchR: W.searchR, standDown: home });
      if (busted) { I.move[0] = I.move[1] = 0; I.down.attack = false; I.down.sprint = false; }
      p.update(dt, I, PW);
    }
    this.cops = this.cops.filter(c => {
      if (c.returned) return false;
      if (standDown && !c.unit && !c.block && !C && this.fp.d(c.ped.x, c.ped.y) > TUNE.fpSpawnOut) { if (this.combat) this.combat.remove(c.ped); return false; }   // (no crowd to go back to: gone out of sight)
      return true;
    });
  }
  // ---- the Eye
  _claimHeli(P) {
    let v = this.fleet.vehicles.find(q => q.def.id === 'eye' && !q.wrecked);
    if (!v) {   // (none flying: another comes in from the annulus)
      const a = this.rng.next() * Math.PI * 2, r = TUNE.fpSpawnIn + 40; v = this.fleet.spawn('eye', P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, a + Math.PI); v.owner = 'police';
    }
    const alt = v.body.h.hoverZ, h = this.heli = { v, patrol: v.ai || null, mind: null, orbit: this.rng.next() * Math.PI * 2 };
    v.ai = (dt, me) => {   // (it circles where the player is, or was: its searchlight on them, else sweeping the search area)
      const W = this.wanted, at = W.seen || !W.lastKnown ? this.player : W.lastKnown;
      if (!at) return { to: [me.x, me.y], alt, spot: null };
      h.orbit += dt * .35; const ox = Math.cos(h.orbit) * HELI_R, oy = Math.sin(h.orbit) * HELI_R;
      const sweep = W.seen ? 0 : W.searchR * .5, sx = at.x + Math.sin(this.t * .7) * sweep, sy = at.y + Math.cos(this.t * .5) * sweep;
      return { to: [at.x + ox, at.y + oy], alt, face: Math.atan2(sy - me.y, sx - me.x), spot: [sx, sy] };
    };
    BUS.emit('dispatch', { kind: 'police', unit: v.id, x: Math.round(P.x), y: Math.round(P.y), tier: 'chopper' });
  }
  _freeHeli() {
    const h = this.heli; this.heli = null; if (h.v.wrecked) return;
    h.v.ai = h.patrol || ((dt, me) => ({ to: [me.x + Math.cos(me.heading) * 400, me.y + Math.sin(me.heading) * 400], alt: me.body.h.hoverZ, spot: null }));   // (one called in flies off)
  }
  _heliStep() { if (this.heli && this.heli.v.wrecked) this.heli = null; }
  // ---- roadblocks and spike strips: ahead of the player's car, inside the annulus
  _blocksStep(dt, P, car, standDown) {
    const T = this.tier();
    if (!standDown && !this.busted && T && car && car.speed > 60) {
      this._blockT -= dt; this._spikeT -= dt;
      // (one that found no room, the road ahead full of traffic, is tried again in a moment)
      if (T.roadblocks && this._blockT <= 0 && this.blocks.length < T.roadblocks) this._blockT = this._roadblock(car) ? TUNE.roadblockEvery : 3;
      if (T.spikes && this._spikeT <= 0 && this.spikes.length < T.spikes) this._spikeT = this._spikeStrip(car) ? TUNE.spikeEvery : 3;
    }
    // gone once passed (or no longer called for, or stale) and out of sight
    const behind = (x, y) => car && (x - car.x) * Math.cos(car.heading) + (y - car.y) * Math.sin(car.heading) < -200;
    for (const b of this.blocks) if ((standDown || behind(b.x, b.y) || this.t - b.t > 90) && this.fp.d(b.x, b.y) > TUNE.fpFull + 120) b.gone = true;
    for (const b of this.blocks) {
      if (!b.gone) continue;
      for (const v of b.cars) if (this.fleet.vehicles.includes(v) && !v.occupied) this.fleet.remove(v);
      for (const c of b.cops) if (!c.ped.dead) this._dropCop(c.ped);
    }
    this.blocks = this.blocks.filter(b => !b.gone);
    for (const s of this.spikes) if ((standDown || behind(s.x, s.y) || this.t - s.t > 120) && this.fp.d(s.x, s.y) > TUNE.fpFull + 120) s.gone = true;
    this.spikes = this.spikes.filter(s => !s.gone);
    // a tyre over a strip goes flat
    for (const s of this.spikes) for (const v of this.fleet.near(s.x, s.y, s.half + 40)) {
      if (!v.body || v.cls === 'heli' || v.cls === 'boat' || v.owner === 'police' || s.hit.has(v) || Math.abs(v.z - s.z) > 6) continue;   // (the police know where their strips are)
      if (segBox(v, s.a, s.b)) { s.hit.add(v); if (v.flatten()) BUS.emit('spiked', { vehicle: v.id }); }
    }
  }
  // a point on the road ahead of the car, inside the annulus: forward along its lanes (straight on where it can, the
  // way a fleeing driver mostly goes) to the first point the annulus holds, clear of the roadblocks and strips already
  // down; null when none
  _ahead(car) {
    const G = this.life.graph; if (!G) return null;
    const n = G.nearestLane(car.x, car.y, car.heading, car.z, 80); if (!n) return null;
    let lane = n.lane, s = n.s; const fp = this.fp;
    for (let hops = 0; hops < 14 && lane; hops++) {
      for (; s < lane.len; s += 16) {
        const p = G.pointOn(lane, s), d = fp.d(p[0], p[1]);
        if (d < TUNE.fpSpawnIn || d > TUNE.fpSpawnOut || (p[0] - car.x) * Math.cos(car.heading) + (p[1] - car.y) * Math.sin(car.heading) <= 0) continue;
        if (this.blocks.some(b => Math.hypot(b.x - p[0], b.y - p[1]) < 90) || this.spikes.some(q => Math.hypot(q.x - p[0], q.y - p[1]) < 90)) continue;
        return { lane, s, p };
      }
      const outs = lane.out.map(id => G.conns[id]).filter(c => c && c.kind !== 'change' && c.kind !== 'uturn'); if (!outs.length) return null;
      const c = outs.find(q => q.kind === 'straight') || outs[0]; lane = G.lanes[c.to]; s = c.toS || 0;
    }
    return null;
  }
  // (A: where, { lane, p }: the dev menu's and the strips' own spot; else ahead of the car)
  _roadblock(car, A = this._ahead(car)) {
    if (!A) return false;
    const { lane, p } = A, h = Math.atan2(lane.dir[1], lane.dir[0]), nx = -lane.dir[1], ny = lane.dir[0], U = this.unitsSpec.cruiser;
    const b = { x: p[0], y: p[1], z: p[2], t: this.t, cars: [], cops: [], mind: null };
    for (const side of [-1, 1]) {   // (two cars nose to nose across the lane, their crews behind them)
      const x = p[0] + nx * side * 15, y = p[1] + ny * side * 15;
      if (this.fleet.near(x, y, 40).some(q => q.body && Math.hypot(q.x - x, q.y - y) < q.hl + 20)) continue;
      const v = this.fleet.spawn(U.def, x, y, h + Math.PI / 2 * side); v.body.z = p[2]; v.owner = 'police'; v.siren = v.hasSiren;
      b.cars.push(v);
      const arch = get('peds', U.crew[0]); if (!arch) continue;
      const px = x - lane.dir[0] * 34, py = y - lane.dir[1] * 34, ped = this._newCop(arch, px, py, p[2]);
      b.cops.push(this._addCop(ped, { post: [px, py], block: b }));
    }
    if (!b.cars.length) return false;
    this.blocks.push(b); BUS.emit('roadblock', { x: Math.round(p[0]), y: Math.round(p[1]) }); return true;
  }
  _spikeStrip(car, A = this._ahead(car)) {
    if (!A) return false;
    const { lane, p } = A, nx = -lane.dir[1], ny = lane.dir[0], half = 26;
    this.spikes.push({ x: p[0], y: p[1], z: p[2], half, a: [p[0] - nx * half, p[1] - ny * half], b: [p[0] + nx * half, p[1] + ny * half], t: this.t, hit: new Set() });
    BUS.emit('spikes', { x: Math.round(p[0]), y: Math.round(p[1]) }); return true;
  }
  _newCop(arch, x, y, z) {
    const ped = new Ped({ x, y, z, faction: arch.faction || 'police', look: pedLook(arch, this.rng), lazyRig: true, health: arch.health || 100, maxHealth: arch.health || 100, armor: arch.armor || 0, weapons: arch.weapons || ['fists'] });
    ped.archetype = arch.id; ped.place(x, y, z); return ped;
  }
  // ---- NABBED
  _nab(dt, P, car) {
    if (this.busted || P.dead || !this.wanted.stars) { this.cuffT = this.doorT = 0; return; }
    const reach = TUNE.arrestReach, able = c => !c.ped.dead && !c.ped.floored && !c.ped.seat && !c.ped.boarding && c.ped.vitals.stun <= 0;
    if (!car && !P.seat && !P.boarding) {
      const spec = P.inv.spec(), unarmed = !spec || spec.projectile === 'melee', slow = Math.hypot(P.mover.vx, P.mover.vy) < TUNE.slowSpeed;
      const cop = this.cops.find(c => able(c) && Math.hypot(c.ped.x - P.x, c.ped.y - P.y) < reach && Math.abs((c.ped.z || 0) - (P.z || 0)) < 12);
      this.cuffT = cop && (unarmed || slow) ? this.cuffT + dt : Math.max(0, this.cuffT - dt * 2);
      if (cop && this.cuffT >= TUNE.arrestTime) this._bust(cop.ped, 'cuffed');
      this.doorT = 0;
    } else if (car) {
      const door = doorOf(car), cop = car.speed < 4 && this.cops.find(c => able(c) && Math.hypot(c.ped.x - door[0], c.ped.y - door[1]) < reach + 4);
      this.doorT = cop ? this.doorT + dt : 0;
      if (cop && this.doorT >= TUNE.doorTime) this._bust(cop.ped, 'door');
      this.cuffT = 0;
    }
  }
  _bust(cop, how) { this.busted = { by: cop.id, how, t: this.t }; BUS.emit('busted', { by: cop.id, how }); }
  /** the scene has played the arrest out (or the player was wrecked): the chase is over, the stars cleared */
  reset(why) { this.busted = null; this.cuffT = this.doorT = 0; this.fought = false; this.pending.length = 0; this.wanted.clear(why); }
  /** the Intent a police vehicle is driven on this step (null: not one of ours) */
  intentFor(v) {
    for (const u of this.units) if (u.car.v === v && !u.gone) return v.kinematic ? clearIntent(this.idle) : u.I;
    for (const b of this.blocks) if (b.cars.includes(v)) return this.parked;
    return null;
  }
  /** the bodies on foot the police own (for drivers to yield to, and peds to keep apart from) */
  get bodies() { return this.cops.filter(c => !c.ped.seat).map(c => c.ped); }
  /** for the radar: the police's eyes ({ x, y, facing, fov, range, kind, state }) */
  eyes() { return this._observers(false).map(o => ({ x: o.x, y: o.y, facing: o.facing, fov: o.fov, range: o.range, kind: o.kind, state: o.mind.state })); }
  /** draw the cops on foot round the focus, and the strips on the road */
  draw(stage, fx, fy, reach) {
    for (const c of this.cops) { const p = c.ped; if (!p.seat && Math.abs(p.x - fx) < reach && Math.abs(p.y - fy) < reach) p.draw(stage, { crowd: true, key: p.rig }); }
    const near = this.spikes.filter(s => Math.abs(s.x - fx) < reach && Math.abs(s.y - fy) < reach);
    if (near.length) stage.floor((g, P) => { for (const s of near) drawStrip(g, P, s); });
  }
  hash() { let h = this.units.length * 31 + this.spawned; for (const c of this.cops) h = (h * 31 + Math.round(c.ped.x * 4) * 7 + Math.round(c.ped.y * 4)) >>> 0; return [...this.wanted.hash(), this.units.length, this.cops.length, this.blocks.length, this.spikes.length, this.heli ? 1 : 0, h]; }
  stats() { return { stars: this.wanted.stars, heat: Math.round(this.wanted.heat), seen: this.seen, units: this.units.map(u => u.kind + (u.out ? ':out' : '')), cops: this.cops.length, heli: !!this.heli, blocks: this.blocks.length, spikes: this.spikes.length, spawned: this.spawned, claimed: this.claimed }; }
}

// does the segment a-b cross the vehicle's box (widened a little)? (Liang-Barsky in its frame)
function segBox(v, a, b) {
  const [ax, ay] = v.toLocal(a[0], a[1]), [bx, by] = v.toLocal(b[0], b[1]), L = v.hl + 1, W = v.hw + 1, dx = bx - ax, dy = by - ay; let t0 = 0, t1 = 1;
  for (const [p, q] of [[-dx, ax + L], [dx, L - ax], [-dy, ay + W], [dy, W - ay]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return t0 <= t1;
}
// a spike strip on the road: a steel band edged dark, its teeth catching the light, yellow tags at the ends (it reads
// on dark asphalt by day and under the lamps at night)
function drawStrip(g, P, s) {
  const a = P.proj(s.a[0], s.a[1], s.z), b = P.proj(s.b[0], s.b[1], s.z); if (!a || !b) return;
  const k = a[2] || 1, w = Math.max(2, Math.round(3 * k));
  E.px.line(g, a[0], a[1], b[0], b[1], '#0c0c10', w + 2); E.px.line(g, a[0], a[1], b[0], b[1], '#8a8a96', w);
  const n = Math.max(6, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3)); for (let i = 0; i <= n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n; E.px.rect(g, Math.round(x), Math.round(y) - 1, 1, 2, i % 2 ? '#f0f0f8' : '#2a2a30'); }
  for (const q of [a, b]) E.px.rect(g, Math.round(q[0]) - 1, Math.round(q[1]) - 1, 3, 3, '#ffd23a');
}
