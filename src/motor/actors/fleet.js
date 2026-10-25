// The Fleet (PLAN.md 8.8): every vehicle in a world, stepped together, and what they do to each other and to the city.
//   - each vehicle steps on its driver's Intent (or its AI, or nobody's: it rolls to a stop), against the world: the
//     map's walls and solids, the decks and drawbridge leaves underfoot (ground), the surfaces' grip, oil slicks, water;
//   - tow joints, then car against car (towing pairs aside), boats against boats;
//   - against peds: pushed out of the way, or knocked down and hurt by the closing speed (Combat.hurt, kind 'vehicle');
//     a bike's rider is thrown off in a hard crash;
//   - against the street furniture: lamps fall, hydrants burst, bins and benches scatter (world.breaks);
//   - damage: crashes dent and hurt (actors/vehicle.js); burning ends in an explosion (a blast through Combat), and an
//     explosion sets off the vehicles beside it a moment later (chains), and any burning vehicle a blast reaches;
//   - the L's trains run their loop and kill what stands on the track;
//   - the vehicle tools: the roof MG, oil, mines, the Pumper's water cannon, the Hookline's hook;
//   - presentation lists the renderer reads (skid marks, smoke, sparks, debris, water jets), never hashed;
//   - sleep: a vehicle nobody drives that has come to rest sleeps (no step) until something touches it (a car, a shot,
//     a blast, a ped getting in); a grid of 128-unit cells finds who is near whom, so a parked city costs nothing.
// Deterministic: fixed steps, no RNG but the 'combat' stream's (through Combat), iteration in insertion order.
//   const F = new Fleet({ city, combat, bridges });  F.spawn('cortez', x, y, heading);  F.update(dt, { intent, peds, night })
import { E } from '../engine.js';
import { TUNE, knob } from '../core/tune.js';
import { BUS } from '../core/bus.js';
import { collideCars, SURFACE_GRIP } from '../sim/vehicle/body.js';
import { TowJoint } from '../sim/vehicle/tow.js';
import { RailLine, Train } from '../sim/vehicle/rail.js';
import { Damage } from '../sim/vehicle/damage.js';
import { Vehicle } from './vehicle.js';
import { sq } from '../core/dmath.js';

knob('Vehicles', 'carBlastDamage', 'Car blast damage', 160, 0, 600, 5, 'A vehicle\'s explosion: damage at its centre');
knob('Vehicles', 'carBlastSplash', 'Car blast reach', 96, 20, 300, 2, 'A vehicle\'s explosion: its radius (u)');
knob('Vehicles', 'carChain', 'Chain reach', 48, 0, 120, 1, 'A vehicle whose body is this near an explosion\'s centre goes up with it, a moment later (u): a car\'s half length and a parking gap');
knob('Vehicles', 'carBlastLift', 'Blast lift', 170, 0, 500, 5, 'How hard an exploding vehicle jumps (u/s up)');
knob('Vehicles', 'knockSpeed', 'Knockdown speed', 50, 10, 200, 5, 'A vehicle closing on a ped faster than this knocks it down (u/s)');
knob('Vehicles', 'runOver', 'Run-over damage', .6, 0, 4, .05, 'Health a ped loses per u/s of closing speed past the knockdown speed');
knob('Vehicles', 'propBreak', 'Breaks props above', 40, 0, 200, 5, 'A vehicle faster than this knocks over lamps, hydrants, bins and benches (u/s)');
knob('Vehicles', 'bikeThrow', 'Rider thrown at', 90, 20, 400, 5, 'A bike crash with this change of speed throws its rider (u/s)');
knob('Vehicles', 'skidSlip', 'Skid marks at', .2, .05, 1, .01, 'Rear slip (radians) past which the tyres leave marks');

const LAND = new Set(['car', 'truck', 'tow', 'bike']);
const GRID = 128;   // the neighbour grid's cell (units)
const TURRET = 1.75;   // how far a water cannon's turret swings either side of the nose (radians: a roof turret, round to the sides)
const SKID_MAX = 900;

export class Fleet {
  /** o: { city (a CityMap), map (its TileMap, by default), combat (a Combat world: boxes, blasts, hurt; optional),
   *  bridges (the live Drawbridges), game (for sounds) } */
  constructor(o = {}) {
    this.city = o.city || null; this.map = o.map || (this.city && this.city.map) || null; this.combat = o.combat || null;
    this.bridges = o.bridges || []; this.game = o.game || null;
    this.vehicles = []; this.trains = []; this.lines = []; this.tows = [];
    /** keepers: the landmarks' own vehicles (a spot's, a pad's: { def, home, color, kit, locked, v }), which the tow
     *  replaces at home once theirs is gone (traffic.js): a job's Medic or SkyCam is never lost for good */
    this.keepers = [];
    this.skids = []; this.fx = []; this.slicks = []; this.mines = []; this.broken = []; this.jets = [];
    this.t = 0; this._n = 0; this._seen = new Set(); this.grid = new Map(); this.awake = 0; this._stamp = 0;
    // street furniture an earlier scene knocked over comes back (the city outlives scenes)
    if (this.city) for (const p of this.city.props) if (p.broken) { const s = p.solidRef; if (s && s.top0 !== undefined) s.top = s.top0; p.x = p.broken.x0; p.y = p.broken.y0; p.facing = p.broken.f0; p.broken = null; }
    const C = this.city, T = C ? C.T : 16;
    this.world = {
      map: this.map, wet: 0, night: false,
      /** the grip under a point: the surface's (a deck's above the street), an oil slick's */
      surface: (x, y, z = 0) => {
        for (const s of this.slicks) if (sq(x - s.x) + sq(y - s.y) < s.r * s.r && Math.abs(z - s.z) < 6) return SURFACE_GRIP.oil;
        if (z > 4) return 1;
        if (C) return SURFACE_GRIP[C.surfaceAtPoint(x, y)] ?? 1;
        const tag = this.map && this.map.floorAt ? this.map.floorAt(x, y) : null; return tag === null || tag === undefined ? 1 : SURFACE_GRIP[tag] ?? 1;   // (a map with no CityMap: its floor tags)
      },
      /** the ground under a point for a body at height z: a deck's top, a drawbridge leaf's (a leaf raised steeper than
       *  a ramp reads as a wall: the body's step refuses it) */
      ground: (x, y, z) => {
        let g = 0; if (C) { const d = C.deckAt(x, y, z, 6); if (d) g = d.z; }
        for (const b of this.bridges) { const h = b.heightAt(x, y); if (h !== null && h > g) g = h; }
        return g;
      },
      /** water a boat floats on and a car sinks in: the sea, the harbour, the canal (under a raised drawbridge too) */
      water: (cx, cy) => {
        if (!C) return false; const s = C.surfaceAt(cx, cy); if (s === 'water' || s === 'deep') return true;
        if (s === 'bridge') for (const b of this.bridges) if (b.lift > .9) { const [x0, y0, x1, y1] = b.rect; if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) return true; }
        return false;
      },
      breaks: (s, body) => this._break(s, body),
    };
    this.T = T;
  }
  /** add a vehicle (Combat sees it as a box) */
  add(v) { this.vehicles.push(v); if (this.combat && !this.combat.boxes.includes(v)) this.combat.boxes.push(v); return v; }
  /** a new vehicle of a definition at (x, y) facing heading; o: Vehicle's options */
  spawn(defId, x, y, heading = 0, o = {}) { return this.add(new Vehicle(defId, { x, y, heading, ...o })); }
  /** a landmark's own vehicle, spawned at its home and kept (replaced there once it is gone: traffic.js) */
  keep(defId, x, y, heading = 0, o = {}) { const v = this.spawn(defId, x, y, heading, { ...o, home: true }); this.keepers.push({ def: defId, home: { x, y, heading }, color: o.color, kit: o.kit, locked: o.locked, v }); return v; }
  remove(v) {
    const i = this.vehicles.indexOf(v); if (i >= 0) this.vehicles.splice(i, 1);
    v.asleep = false;   // (out of the sleepers' grid at once)
    if (this.combat) { const j = this.combat.boxes.indexOf(v); if (j >= 0) this.combat.boxes.splice(j, 1); }
    for (const t of this.tows.filter(t => t.a === v.body || t.b === v.body)) this._untow(t);
    for (const p of v.seats) if (p) v.unseat(p);
  }
  byId(id) { return this.vehicles.find(v => v.id === id) || null; }
  /** wake a sleeping vehicle (anything that touches it does) */
  wake(v) { v.asleep = false; v._still = 0; }
  // the grid: every vehicle by the 128-unit cells its box reaches. The sleepers (a parked city: most of the fleet) are
  // kept in a grid of their own, rebuilt only when who sleeps changes; the rest are put in afresh each step
  _regrid() {
    let key = 0, n = 0; for (const v of this.vehicles) if (v.asleep && v.body) { key = (key * 31 + v.id) >>> 0; n++; }
    if (key !== this._sleepKey || n !== this._sleepN) { this._sleepKey = key; this._sleepN = n; this.gridStatic = new Map(); for (const v of this.vehicles) if (v.asleep && v.body) gridPut(this.gridStatic, v); }
    const G = this.grid; G.clear();
    for (const v of this.vehicles) if (v.body && !v.asleep) gridPut(G, v);
  }
  /** the vehicles whose cells reach within r of (x, y) (each once, in fleet order) */
  around(x, y, r) {
    const out = [], st = ++this._stamp, S = this.gridStatic;
    for (let gy = Math.floor((y - r) / GRID); gy <= Math.floor((y + r) / GRID); gy++) for (let gx = Math.floor((x - r) / GRID); gx <= Math.floor((x + r) / GRID); gx++) {
      const k = gy * 4096 + gx, a = this.grid.get(k); if (a) for (const v of a) if (v._st !== st) { v._st = st; out.push(v); }
      const b = S && S.get(k); if (b) for (const v of b) if (v._st !== st && v.asleep) { v._st = st; out.push(v); }
    }
    return out.length > 1 ? out.sort((p, q) => p._i - q._i) : out;
  }
  /** the vehicles within r of (x, y), nearest first (pred filters) */
  near(x, y, r, pred = null) {
    const out = [];
    for (const v of this.vehicles) { if (!v.body) continue; const d = Math.hypot(v.x - x, v.y - y); if (d <= r + v.hl && (!pred || pred(v))) out.push([d, v]); }   // (every vehicle: one spawned this step is in no grid yet)
    return out.sort((a, b) => a[0] - b[0]).map(a => a[1]);
  }
  /** call fn(v) for each vehicle whose cells reach within r of (x, y), once each, without making a list (hot loops) */
  each(x, y, r, fn, sleepers = true) {
    const st = ++this._stamp, S = sleepers ? this.gridStatic : null;
    for (let gy = Math.floor((y - r) / GRID); gy <= Math.floor((y + r) / GRID); gy++) for (let gx = Math.floor((x - r) / GRID); gx <= Math.floor((x + r) / GRID); gx++) {
      const k = gy * 4096 + gx, a = this.grid.get(k); if (a) for (const v of a) if (v._st !== st) { v._st = st; fn(v); }
      const b = S && S.get(k); if (b) for (const v of b) if (v._st !== st && v.asleep) { v._st = st; fn(v); }
    }
  }
  /** a rail line (o: RailLine's options) and trains on it (each { s, cars, id }) */
  addLine(o, trains = []) { const line = new RailLine(o); this.lines.push(line); this.addTrains(line, trains); return line; }
  /** trains on a line (each Train's options: { s, cars, carLength, top, dwell, id }); their cars are boxes to Combat */
  addTrains(line, list) {
    const out = [];
    for (const t of list) { const tr = new Train(line, t); this.trains.push(tr); out.push(tr); for (const c of tr.cars) { c.hurt = () => ({ health: 0, armor: 0 }); if (this.combat) this.combat.boxes.push(c); } }
    return out;
  }
  /** hook car behind truck (the Hookline): its nearer end goes on the hook */
  tow(truck, car) {
    if (truck.towing || car.towedBy) return null;
    const hook = truck.model.hook || [-truck.hl - 4, 0], [hx, hy] = truck.toWorld(hook[0], hook[1]), [fx, fy] = car.toWorld(car.hl, 0), [rx, ry] = car.toWorld(-car.hl, 0);
    const end = Math.hypot(fx - hx, fy - hy) <= Math.hypot(rx - hx, ry - hy) ? 'front' : 'rear';
    const j = new TowJoint(truck.body, car.body, { hook, end }); j.truck = truck; j.car = car;
    this.tows.push(j); truck.towing = j; car.towedBy = truck; this.wake(truck); this.wake(car); return j;
  }
  _untow(j) { j.release(); if (j.truck) j.truck.towing = null; if (j.car) j.car.towedBy = null; this.tows = this.tows.filter(t => t !== j); }
  /** a car bomb fitted at the Boom Box ('ignition' | 'remote') is armed when its fitter gets out (PLAN.md 8.8); any armed
   *  bomb goes off on detonate() (the phone's DETONATE), and an ignition bomb when the next driver puts a foot down too */
  armBomb(v, by) { if (v.mods.bomb && !v.bombArmed) { v.bombArmed = true; v.bombBy = by || null; } }
  detonate(v) { if (!v || !v.bombArmed || v.wrecked) return false; v.bombArmed = false; this.wake(v); v.chainT = .05; v.chainBy = v.bombBy; return true; }
  /** the armed bombs set by any of these ped ids (the phone lists them) */
  bombsBy(ids) { return this.vehicles.filter(v => v.bombArmed && !v.wrecked && ids.includes(v.bombBy)); }

  /** one step. o: { intent(v) -> the Intent of v's driver (null: none), peds: [Ped] (bodies cars meet), night, wet } */
  update(dt, o = {}) {
    this.t += dt; const W = this.world; W.wet = o.wet || 0; W.night = !!o.night;
    const peds = o.peds || [];
    let awake = 0;
    this.vehicles.forEach((v, i) => { v._i = i; });
    for (const v of this.vehicles) {
      if (v.asleep) continue;
      awake++;
      const I = v.driver && o.intent ? o.intent(v) : null;
      if (I && v.bombArmed && v.mods.bomb !== 'remote' && I.throttle > .1 && v.driver.id !== v.bombBy && v.chainT < 0) { v.bombArmed = false; v.chainT = .6; v.chainBy = v.bombBy; }   // (the ignition: a moment, then up)
      v.update(dt, I, W);
      if (I && v.driver && !v.wrecked) this._tools(dt, v, I);
      if (v.cls === 'heli' && v.wrecked) v.body.falling = true;
      // at rest with nobody at it: asleep after a second
      const b = v.body;
      if (b && !v.driver && !v.ai && !v.towing && !v.towedBy && !v.damage.burning && !v.sinking && v.chainT < 0 && b.speed < .5 && Math.abs(b.w) < .01 && !b.airborne && !(b.lifted) && Object.values(v.doors).every(d => d === 0)) { v._still = (v._still || 0) + dt; if (v._still > 1) v.asleep = true; }
      else v._still = 0;
    }
    this.awake = awake;
    for (const j of [...this.tows]) { if (j.truck.wrecked || j.car.wrecked || j.length > j.rest * 4 + 40) this._untow(j); else { this.wake(j.truck); this.wake(j.car); j.update(dt); } }
    this._regrid();
    // vehicles against vehicles (towing pairs aside; boats only meet boats; helis fly over it all, a landed one is met): each awake one
    // against its neighbours; a sleeper it touches wakes
    // (far traffic on its lanes meets nothing by itself: its brain keeps it off other cars and its lanes clear of the
    // parked ones; the physical vehicles meet it)
    for (const a of this.vehicles) {
      if (a.asleep || !a.body || (a.cls === 'heli' && !a.body.landed) || a.kinematic) continue;
      for (const b of this.around(a.x, a.y, a.hl + 8)) {
        if (b === a || !b.body || (b.cls === 'heli' && !b.body.landed) || (!b.asleep && !b.kinematic && b._i < a._i)) continue;
        if ((a.cls === 'boat') !== (b.cls === 'boat')) continue;
        if (a.towing && a.towing.car === b || b.towing && b.towing.car === a) continue;
        const imp = collideCars(a.body, b.body);
        if (imp > 0) {   // (who hit whom, and how hard: a velocity change, u/s; traffic's drivers react to the player's)
          if (b.asleep) this.wake(b);
          a.bumpedBy = b; b.bumpedBy = a; a.bumpT = b.bumpT = this.t; a.bumpDv = imp / a.body.h.mass; b.bumpDv = imp / b.body.h.mass;
          this._crash(a, imp, b); this._crash(b, imp, a);
        }
      }
    }
    this._riders(dt);
    this._peds(dt, peds);
    this._trains(dt, peds);
    this._mines(dt);
    // damage: burning runs out into an explosion; chains count down; blasts reach burning vehicles; the sunk go under
    for (const v of [...this.vehicles]) {
      if (v.damage.update(dt) === 'explode') this.explode(v, v.lastBy);
      if (v.chainT >= 0) { v.chainT -= dt; if (v.chainT < 0) this.explode(v, v.chainBy); }
      if (v.lastCrash > 2) { BUS.emit('vehicleDamage', { vehicle: v.id, amount: Math.round(v.lastCrash), x: v.x, y: v.y, by: v.crashBy ?? null }); }
      v.lastCrash = 0; v.crashBy = null;
      if (v.sunk && v.sunkAt === undefined) this._sink(v);
      if (v.sunkAt !== undefined && this.t - v.sunkAt > 2.5) this.remove(v);
    }
    if (this.combat) for (const b of this.combat.explosives.blasts) {
      if (this._seen.has(b)) continue; this._seen.add(b);
      for (const v of this.vehicles) {
        if (v.wrecked || v.chainT >= 0 || !v.body || Math.abs((v.z || 0) - (b.z || 0)) > 40) continue;   // (a street's blast never the deck's cars over it)
        const d = boxDistance(v, b.x, b.y);
        if (d <= b.splash) this.wake(v);
        if (d <= TUNE.carChain || (v.damage.burning && d <= b.splash * .9)) { v.chainT = TUNE.chainDelay + .1 * (this._n++ % 3); v.chainBy = b.by; }
      }
    }
    if (this._seen.size > 64) this._seen = new Set(this.combat ? this.combat.explosives.blasts : []);
    this._presentation(dt);
  }
  // a crash between two vehicles: what it cost this one (collideCars' impulse comes after Vehicle.update has read the
  // step's own knocks, walls and props), and who did it: the other one's driver (a parked car's: no one)
  _crash(v, imp, o) {
    if (v.wrecked || !v.body) return;
    const hurt = Damage.crash(imp, v.body.h.mass); if (hurt <= 0) return;
    const [lx, ly] = v.toLocal(v.body.felt.hitX, v.body.felt.hitY); v.damage.hit(hurt, lx, ly, v.hl, v.hw);
    if (hurt > v.lastCrash) { v.lastCrash = hurt; v.crashBy = o.driver ? o.driver.id : null; }
    if (o.driver) v.lastBy = o.driver.id;
  }
  /** blow a vehicle up now: a blast through Combat (it hurts, lights fire, chains), the wreck thrown up, its people killed */
  explode(v, by = null) {
    if (v.blownAt !== null) return;
    if (v.damage.immune) { v.chainT = -1; return; }   // (a bot's own ride never goes up: D29)
    this.wake(v); v.damage.explode(); v.blownAt = this.t; v.chainT = -1; v.siren = false;
    const who = by ?? v.lastBy ?? null;
    if (this.combat) this.combat.explosives.blast({ x: v.x, y: v.y, z: v.z + 10, damage: TUNE.carBlastDamage, splash: TUNE.carBlastSplash, by: who, source: 'car' });
    if (v.body && LAND.has(v.cls)) v.body.launch(TUNE.carBlastLift, ((this._n++ % 3) - 1) * 3.5);
    for (const p of [...v.seats]) if (p) { const [sx, sy] = v.seatAt(v.seats.indexOf(p)); v.unseat(p); p.place(sx, sy, v.z); if (this.combat) this.combat.hurt(p, { amount: 999, kind: 'explosion', by: who }); else p.vitals.hit({ amount: 999, kind: 'explosion' }); }
    if (v.towing) this._untow(v.towing); if (v.towedBy && v.towedBy.towing) this._untow(v.towedBy.towing);
    BUS.emit('vehicleDestroyed', { vehicle: v.id, by: who });
    this.fx.push({ kind: 'explosion', x: v.x, y: v.y, z: v.z + 8, t: 0 });
  }
  // a land vehicle gone under: its people swim to the nearest dry ground
  _sink(v) {
    v.sunkAt = this.t; v.damage.state = 'wrecked';
    for (const p of [...v.seats]) if (p) {
      v.unseat(p); let [cx, cy] = [Math.floor(v.x / this.T), Math.floor(v.y / this.T)];
      if (this.city) [cx, cy] = this.city.nearestWalkable(cx, cy, 16); p.place((cx + .5) * this.T, (cy + .5) * this.T, 0);
    }
    this.fx.push({ kind: 'splash', x: v.x, y: v.y, z: 0, t: 0 });
  }
  // a bike's rider is thrown off by a hard crash
  _riders() {
    for (const v of this.vehicles) {
      if (v.cls !== 'bike' || !v.driver || !v.body) continue;
      const dv = v.body.felt.hit / v.body.h.mass; if (dv < TUNE.bikeThrow && !v.wrecked) continue;
      const p = v.driver; v.unseat(p); const b = v.body, sp = Math.max(60, b.speed + dv * .5), hx = Math.cos(b.heading), hy = Math.sin(b.heading);
      p.place(b.x + hx * (v.hl + 6), b.y + hy * (v.hl + 6), b.z);
      if (this.combat) this.combat.hurt(p, { amount: 8 + dv * .08, kind: 'vehicle', by: null, knock: sp * .6, knockdown: true, dir: [hx, hy] });
      v.ejected = this.t;
    }
  }
  // peds in the way: pushed out, or knocked down by the closing speed
  _peds(dt, peds) {
    let p = null, m = null;
    const meet = v => {
      if (!v.body || v.cls === 'heli' || v.cls === 'boat' || v.sunk || (p.boarding && p.boarding.v === v)) return;
      const b = v.body, reach = v.hl + 12;
      if (Math.abs(m.x - b.x) > reach || Math.abs(m.y - b.y) > reach || m.z > b.z + v.height || m.z + 30 < b.z) return;
      const hit = circleObb(v, m.x, m.y, p.r || 6); if (!hit) return;
      // (knocked down by the vehicle's own speed into the body: running into a parked car only stops the runner)
      const closing = (b.vx - m.vx) * hit.nx + (b.vy - m.vy) * hit.ny, driven = b.vx * hit.nx + b.vy * hit.ny;
      m.x += hit.nx * hit.depth; m.y += hit.ny * hit.depth;
      if (driven > TUNE.knockSpeed && closing > TUNE.knockSpeed && !p.dead && !p.anchored && !p.floored) {
        const sp = Math.hypot(b.vx, b.vy) || 1, dir = [b.vx / sp * .7 + hit.nx * .3, b.vy / sp * .7 + hit.ny * .3], by = v.driver ? v.driver.id : null;
        const amount = (closing - TUNE.knockSpeed * .7) * TUNE.runOver;
        if (this.combat) this.combat.hurt(p, { amount, kind: 'vehicle', by, knock: closing * .8, knockdown: true, dir }); else p.hurt({ amount, kind: 'vehicle', knock: closing * .8, knockdown: true, dir });
        b.setVelocity(b.vx * .94, b.vy * .94);
        if (by) BUS.emit('crime', { type: 'runOver', x: m.x, y: m.y, by, victim: p.id, severity: 2, lawful: v.driver.faction === 'police' });
      } else if (closing > 0) { m.vx += hit.nx * closing; m.vy += hit.ny * closing; }
    };
    // (a ped gliding its sidewalk line never walks into a parked car: only what moves can reach it)
    for (const q of peds) { if (q.seat || q.held || q.coast) continue; p = q; m = q.mover; this.each(m.x, m.y, 12, meet, !q.gliding); }
  }
  // the L: its trains move on, and kill what stands on their track
  _trains(dt, peds) {
    for (const tr of this.trains) {
      tr.update(dt);
      // (the bodies inside the train's box first: a crowd is mostly nowhere near it)
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
      for (const c of tr.cars) { x0 = Math.min(x0, c.x - c.hl - 10); x1 = Math.max(x1, c.x + c.hl + 10); y0 = Math.min(y0, c.y - c.hl - 10); y1 = Math.max(y1, c.y + c.hl + 10); z0 = Math.min(z0, c.z - 10); z1 = Math.max(z1, c.z + 10); }
      for (const p of peds) {
        if (p.seat || p.dead || p.coast || p.onTrain) continue; const m = p.mover;   // (onTrain: riding in it)
        if (m.z < z0 || m.z > z1 || m.x < x0 || m.x > x1 || m.y < y0 || m.y > y1) continue;
        for (const c of tr.cars) {
          if (Math.abs(m.z - c.z) > 10 || Math.abs(m.x - c.x) > c.hl + 10 || Math.abs(m.y - c.y) > c.hl + 10) continue;
          if (!circleObb(c, m.x, m.y, p.r || 6)) continue;
          const d = [Math.cos(c.heading), Math.sin(c.heading)];
          if (this.combat) this.combat.hurt(p, { amount: 999, kind: 'train', by: null, knock: 320, knockdown: true, dir: d }); else p.hurt({ amount: 999, kind: 'train', knock: 320, knockdown: true, dir: d });
          break;
        }
      }
      for (const c of tr.cars) {   // (only what moves can be on the track: a sleeper was left where no train runs)
        const hit = [];
        this.each(c.x, c.y, c.hl + 8, v => { if (v.body && !v.wrecked && Math.abs(v.z - c.z) <= 12 && Math.abs(v.x - c.x) <= c.hl + v.hl && Math.abs(v.y - c.y) <= c.hl + v.hl && obbOverlap(c, v)) hit.push(v); }, false);
        for (const v of hit) { this.wake(v); v.damage.hit(999); this.explode(v, null); }
      }
    }
  }
  // armed mines go off under the first vehicle over them
  _mines(dt) {
    for (const mn of this.mines) {
      mn.arm -= dt; if (mn.arm > 0 || mn.gone) continue;
      for (const v of this.around(mn.x, mn.y, 8)) if (v.body && LAND.has(v.cls) && !v.wrecked && boxDistance(v, mn.x, mn.y) < 4 && Math.abs(v.z - mn.z) < 8) {
        mn.gone = true; if (this.combat) this.combat.explosives.blast({ x: mn.x, y: mn.y, z: mn.z + 2, damage: 120, splash: 56, by: mn.by, source: 'mine' }); break;
      }
    }
    this.mines = this.mines.filter(m => !m.gone);
    for (const s of this.slicks) s.t -= dt; this.slicks = this.slicks.filter(s => s.t > 0);
  }
  // what the vehicle's fire button does: the roof MG, oil, mines, the water cannon, the hook
  _tools(dt, v, I) {
    const b = v.body, hx = Math.cos(b.heading), hy = Math.sin(b.heading), C = this.combat, by = v.driver.id;
    v._cool = Math.max(-1, (v._cool || 0) - dt);
    if (v.def.tool === 'hook' && I.tap.fire) {
      if (v.towing) this._untow(v.towing);
      else { const hook = v.model.hook || [-v.hl - 4, 0], [x, y] = v.toWorld(hook[0], hook[1]); const car = this.near(x, y, 24, c => c !== v && LAND.has(c.cls) && c.cls !== 'bike' && !c.towedBy && !c.wrecked && Math.abs(c.z - v.z) < 12).find(c => Math.min(Math.hypot(...sub(c.toWorld(c.hl, 0), [x, y])), Math.hypot(...sub(c.toWorld(-c.hl, 0), [x, y]))) < 22); if (car) this.tow(v, car); }
      return;
    }
    if (v.def.tool === 'cannon' && I.down.fire) {   // the water cannon: knocks peds over, puts fires out
      if (v._cool <= 0) {
        // (its turret swings toward the aim, up to TURRET either side of the nose; ahead with no aim)
        let hx = Math.cos(b.heading), hy = Math.sin(b.heading);
        if (I.aim) { const d = Math.max(-TURRET, Math.min(TURRET, E.angDiff(b.heading, Math.atan2(I.aim[1], I.aim[0])))); hx = Math.cos(b.heading + d); hy = Math.sin(b.heading + d); }
        v._cool += .06; const reach = 150, nz = v.model.nozzle, zx = v.toWorld(nz ? nz[0] : v.hl * .1, nz ? nz[1] : 0);   // (from the model's nozzle)
        this.jets.push({ x: zx[0], y: zx[1], z: b.z + (nz ? nz[2] : v.height + 6), dx: hx, dy: hy, t: 0, life: .5 });
        if (C && C.fire && C.fire.count) for (let k = 12; k <= reach; k += 18) C.fire.douse(zx[0] + hx * k, zx[1] + hy * k, 10);   // (the jet's whole length, from just off the nozzle)
        if (C) for (const p of C.bodies) { if (p.dead || p.seat || Math.abs((p.z || 0) - v.z) > 16) continue; const dx = p.x - zx[0], dy = p.y - zx[1], along = dx * hx + dy * hy, side = Math.abs(-dx * hy + dy * hx); if (along > 0 && along < reach && side < 14 && !p.floored) C.hurt(p, { amount: 1, kind: 'water', by, knock: 180, knockdown: true, dir: [hx, hy] }); }
      }
      return;
    }
    const w = v.mods.weapon || (v.mods.roofMG ? 'mg' : v.mods.oil > 0 ? 'oil' : v.mods.mines > 0 ? 'mines' : null);
    if (w === 'mg' && v.mods.roofMG && I.down.fire && C) {
      while (v._cool <= 0) {
        v._cool += 1 / 8; const [mx, my] = v.toWorld(v.hl * .2, 0);
        C.shots.fire({ x: mx + hx * (v.hl * .8 + 4), y: my + hy * (v.hl * .8 + 4), z: b.z + v.height + 2, dir: [hx, hy, 0], speed: 900, range: 420, damage: 9, by, team: v.driver.faction, weapon: 'roofmg', vehicle: v.id, kind: 'bullet', tracer: true, casing: null });
        BUS.emit('crime', { type: 'shooting', x: v.x, y: v.y, by, victim: null, severity: 1, lawful: v.driver.faction === 'police' });
      }
    } else if (w === 'oil' && I.tap.fire && v.mods.oil > 0) { v.mods.oil--; const [x, y] = v.toWorld(-v.hl - 14, 0); this.slicks.push({ x, y, z: b.z, r: 22, t: 40 }); }
    else if (w === 'mines' && I.tap.fire && v.mods.mines > 0) { v.mods.mines--; const [x, y] = v.toWorld(-v.hl - 8, 0); this.mines.push({ x, y, z: b.z, arm: 1.2, by }); }
    if (v._cool < 0 && !I.down.fire) v._cool = 0;
  }
  // street furniture a fast vehicle meets gives way (true) instead of stopping it
  _break(s, body) {
    if (body.speed < TUNE.propBreak) return false;
    const p = s.prop; if (!p || p.broken) return true;
    const sp = body.speed, k = Math.min(1.2, sp / 200);
    p.broken = { t: 0, x0: p.x, y0: p.y, f0: p.facing || 0, dir: Math.atan2(body.vy, body.vx), vx: body.vx * k, vy: body.vy * k, spin: (this._n++ % 2 ? 1 : -1) * (4 + sp / 40), spray: p.kind === 'hydrant' ? 10 : 0 };
    s.top0 = s.top; s.top = s.z + 1;   // (down: no longer in anyone's way)
    body.setVelocity(body.vx * (p.kind === 'lamp' ? .82 : .93), body.vy * (p.kind === 'lamp' ? .82 : .93));
    this.broken.push(p); this.fx.push({ kind: p.kind === 'hydrant' ? 'burst' : 'debris', x: p.x, y: p.y, z: 6, t: 0, color: p.kind === 'lamp' ? '#5a5a62' : '#7a7a82' });
    return true;
  }
  // the knocked-over furniture settles; skid marks, smoke and sparks for the renderer
  _presentation(dt) {
    for (const p of this.broken) {
      const B = p.broken; if (!B) continue; B.t += dt;
      if (p.kind !== 'lamp' && p.kind !== 'hydrant') { p.x += B.vx * dt; p.y += B.vy * dt; const f = Math.exp(-4 * dt); B.vx *= f; B.vy *= f; p.facing = (p.facing || 0) + B.spin * dt; B.spin *= f; }
      if (B.spray > 0) B.spray -= dt;
    }
    for (const v of this.vehicles) {
      const b = v.body;
      if (v.asleep) { if (b && v.damage.smoking && (this._n++ % 9) === 0) { const [x, y] = v.toWorld(v.hl * .6, 0); this.fx.push({ kind: v.damage.burning ? 'flame' : 'engine', x, y, z: b.z + v.height * .6, t: 0 }); } continue; }
      if (!b || !LAND.has(v.cls) || b.airborne || v.wrecked) { v._skid = null; continue; }
      const C = v.ctlNow, sp = b.speed, slip = Math.abs(b.felt.slip);
      const skid = (slip > TUNE.skidSlip && sp > 40) || (b.felt.wheelspin > .4 && sp > 4) || (C.handbrake && sp > 30) || (C.brake > .85 && sp > 140);
      if (skid) {
        const rear = v.model.wheels.filter(w => w.x < 0), pts = (rear.length ? rear : v.model.wheels).map(w => v.toWorld(w.x, w.y));
        if (v._skid) for (let i = 0; i < pts.length && i < v._skid.length; i++) { this.skids.push([v._skid[i][0], v._skid[i][1], pts[i][0], pts[i][1], this.t, b.z]); }
        v._skid = pts;
        if (sp > 60 && (this._n++ % 4) === 0) for (const q of pts) this.fx.push({ kind: 'smoke', x: q[0], y: q[1], z: b.z + 2, t: 0 });
      } else v._skid = null;
      if (b.felt.hit / b.h.mass > 30) this.fx.push({ kind: 'sparks', x: b.felt.hitX, y: b.felt.hitY, z: b.z + 6, t: 0, n: Math.min(12, Math.round(b.felt.hit / b.h.mass / 12)) });
      if (v.flats > 0 && sp > 60 && (this._n++ % 3) === 0) for (const w of v.model.wheels) { const [x, y] = v.toWorld(w.x, w.y); this.fx.push({ kind: 'sparks', x, y, z: b.z + 1, t: 0, n: 2 }); }   // (on its rims)
      if (v.damage.smoking && (this._n++ % (v.damage.burning ? 2 : 5)) === 0) { const [x, y] = v.toWorld(v.hl * .6, 0); this.fx.push({ kind: v.damage.burning ? 'flame' : 'engine', x, y, z: b.z + v.height * .6, t: 0 }); }
    }
    if (this.skids.length > SKID_MAX) this.skids.splice(0, this.skids.length - SKID_MAX);
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter(f => f.t < .4);
    for (const j of this.jets) j.t += dt; this.jets = this.jets.filter(j => j.t < j.life);
  }
  /** for state hashes (presentation lists left out) */
  hash() {
    let h = 0; for (const v of this.vehicles) for (const n of v.hash()) h = (h * 31 + n) >>> 0;
    for (const t of this.trains) h = (h * 31 + t.hash()) >>> 0;
    return (h * 31 + this.tows.length * 7 + this.broken.length * 13 + this.mines.length * 17 + this.slicks.length * 19) >>> 0;
  }
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
/** how far a point is from a vehicle's (or rail car's) box (0 inside) */
function gridPut(G, v) {
  const r = v.hl + 4, x0 = Math.floor((v.x - r) / GRID), x1 = Math.floor((v.x + r) / GRID), y0 = Math.floor((v.y - r) / GRID), y1 = Math.floor((v.y + r) / GRID);
  for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const k = gy * 4096 + gx; let a = G.get(k); if (!a) G.set(k, a = []); a.push(v); }
}
export function boxDistance(v, x, y) {
  const c = Math.cos(v.heading), s = Math.sin(v.heading), dx = x - v.x, dy = y - v.y, lx = dx * c + dy * s, ly = -dx * s + dy * c;
  const ox = Math.max(0, Math.abs(lx) - v.hl), oy = Math.max(0, Math.abs(ly) - v.hw); return Math.hypot(ox, oy);
}
/** a circle against a vehicle's box: null, or { nx, ny (out of the box toward the circle), depth } */
export function circleObb(v, x, y, r) {
  const c = Math.cos(v.heading), s = Math.sin(v.heading), dx = x - v.x, dy = y - v.y, lx = dx * c + dy * s, ly = -dx * s + dy * c;
  const qx = E.clamp(lx, -v.hl, v.hl), qy = E.clamp(ly, -v.hw, v.hw), ex = lx - qx, ey = ly - qy, d = Math.hypot(ex, ey);
  let nlx, nly, depth;
  if (d > r) return null;
  if (d > 1e-6) { nlx = ex / d; nly = ey / d; depth = r - d; }
  else { const px = v.hl - Math.abs(lx), py = v.hw - Math.abs(ly); if (px < py) { nlx = Math.sign(lx) || 1; nly = 0; depth = px + r; } else { nlx = 0; nly = Math.sign(ly) || 1; depth = py + r; } }
  return { nx: nlx * c - nly * s, ny: nlx * s + nly * c, depth };
}
/** do two boxes (vehicles or rail cars) overlap? (separating axes) */
function obbOverlap(A, B) {
  const ax = [[Math.cos(A.heading), Math.sin(A.heading)], [-Math.sin(A.heading), Math.cos(A.heading)]], bx = [[Math.cos(B.heading), Math.sin(B.heading)], [-Math.sin(B.heading), Math.cos(B.heading)]];
  const dx = B.x - A.x, dy = B.y - A.y;
  for (const [nx, ny] of [...ax, ...bx]) {
    const ra = A.hl * Math.abs(ax[0][0] * nx + ax[0][1] * ny) + A.hw * Math.abs(ax[1][0] * nx + ax[1][1] * ny);
    const rb = B.hl * Math.abs(bx[0][0] * nx + bx[0][1] * ny) + B.hw * Math.abs(bx[1][0] * nx + bx[1][1] * ny);
    if (Math.abs(dx * nx + dy * ny) > ra + rb) return false;
  }
  return true;
}
export { Damage };
