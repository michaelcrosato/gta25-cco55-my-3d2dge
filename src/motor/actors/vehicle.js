// A vehicle in the world (PLAN.md 8.8): a definition's body (the class's physics), its model (the kit folded in), its
// paint, damage, seats and the people in them, doors, lights, siren, horn, radio and mods. Its driver's Intent drives
// it (throttle, brake, steer, handbrake; nitro, horn and siren, the radio); with nobody at the wheel it coasts to a
// stop and sits on its handbrake. An AI-only class (the heli) takes its ctl from v.ai. The Fleet steps every vehicle
// and settles what they hit; Combat sees each one as a box (shots hit it, blasts hurt it).
// Everything here is simulation (fixed steps, no drawing state read), except `look`, which the renderer eases.
//   const v = new Vehicle('cortez', { x, y, heading, color });  fleet.add(v);  v.driver · v.seats · v.damage
import { E } from '../engine.js';
import { TUNE, knob } from '../core/tune.js';
import { all } from '../core/registry.js';
import { Actor } from '../sim/actor.js';
import { vehicleDef, classOf, modelOf, makeBody } from '../sim/vehicle/defs.js';
import { Damage } from '../sim/vehicle/damage.js';

knob('Vehicles', 'nitroTime', 'Nitro burst', 2.5, .5, 8, .25, 'Seconds a nitro charge lasts');
knob('Vehicles', 'nitroBoost', 'Nitro power', 1.8, 1, 4, .05, 'A factor on power (and launch) while the nitro burns');
knob('Vehicles', 'sinkTime', 'Sinking time', 1.4, .2, 5, .1, 'Seconds a land vehicle takes to go under in deep water');
knob('Vehicles', 'coastBelow', 'Parks below', 18, 0, 80, 1, 'An empty vehicle puts its handbrake on below this speed (u/s); faster, it rolls on');

/** the roles whose vehicles carry a siren by default */
const SIREN_ROLES = new Set(['police', 'medic', 'fire']);

export class Vehicle {
  /** defId: a 'vehicles' id; o: { x, y, heading, color, kit (a different kit than the definition's), id, owner
   *  ('world' | 'mission'), locked, mods: { armor, nitro, oil, mines, roofMG, bomb } } */
  constructor(defId, o = {}) {
    const d = this.def = vehicleDef(defId);
    this.cls = classOf(d); this.model = modelOf(o.kit !== undefined ? { ...d, kit: o.kit } : d);
    this.body = this.cls === 'rail' ? null : makeBody(defId, o.x || 0, o.y || 0, o.heading || 0);
    this.actor = new Actor('vehicle', { id: o.id, x: o.x, y: o.y, faction: d.role === 'police' ? 'police' : 'civilian' });
    this.id = this.actor.id; this.owner = o.owner || 'world';
    this.color = o.color || d.palette[0];
    this.mods = Object.assign({ armor: false, nitro: 0, oil: 0, mines: 0, roofMG: false, bomb: null }, o.mods || {});
    this.damage = new Damage(d.health * (this.mods.armor ? 1.5 : 1), d.toughness);
    const nSeats = Math.max(1, d.seats || this.model.seats.length || 1);
    /** seats[i]: the Ped sitting there (0: the driver) */ this.seats = new Array(nSeats).fill(null);
    /** doors[id]: how open (0..1), stepped toward doorWant[id] */ this.doors = {}; this.doorWant = {};
    for (const dr of this.model.doors) { this.doors[dr.id] = 0; this.doorWant[dr.id] = 0; }
    this.locked = o.locked ?? d.locked; this.hasSiren = d.siren || SIREN_ROLES.has(d.role) && this.model.lights.siren.length > 0;
    this.siren = false; this.sirenT = 0; this.horn = false; this.radio = o.radio || d.radio;
    this.nitroT = 0; this.sinking = 0; this.sunk = false; this.ai = null; this.ctlNow = { throttle: 0, brake: 0, steer: 0, handbrake: true };
    /** flats: its tyres burst (a spike strip: 0..1), slower and slipping, the wheel tugging; flatT: the tug's clock */ this.flats = 0; this.flatT = 0;
    /** brain: the AI driving it (a DriverBrain: traffic, services, police); kinematic: moved along its lane by that brain
     *  (far from the focus), its physics skipped */ this.brain = null; this.kinematic = false;
    /** lights this step: head (on at night or when told), brake, reverse */ this.lights = { head: false, brake: false, reverse: false };
    this.towing = null; this.towedBy = null; this.burnFx = 0; this.blownAt = null; this.chainT = -1; this.chainBy = null;
    /** asleep: at rest and untouched, so the Fleet skips its step (actors/fleet.js) */ this.asleep = false; this._still = 0;
    /** presentation: eased roll, pitch, bike lean, wheelie, suspension squash (the renderer reads; never simulated) */
    this.look = { roll: 0, pitch: 0, lean: 0, wheelie: 0, squash: 0, spin: 0 };
  }
  // the box Combat and the Fleet see
  get x() { return this.body ? this.body.x : 0; } get y() { return this.body ? this.body.y : 0; } get z() { return this.body ? this.body.z : 0; }
  get heading() { return this.body ? this.body.heading : 0; }
  get hl() { return this.body ? this.body.hl : this.model.length / 2; } get hw() { return this.body ? this.body.hw : this.model.width / 2; }
  get height() { return this.model.height; }
  get speed() { return this.body ? this.body.speed : 0; }
  /** a vehicle is never `dead` to the hit tests (a wreck still stops bullets); it is wrecked */
  get dead() { return false; }
  get wrecked() { return this.damage.wrecked; }
  get driver() { return this.seats[0]; }
  get occupied() { return this.seats.some(Boolean); }
  /** does the fire button belong to the vehicle (a tool, a roof MG, oil or mines) rather than a drive-by? */
  get armed() { const m = this.mods; return !!(this.def.tool || m.roofMG || m.oil > 0 || m.mines > 0); }
  /** the explosive interface (Combat's chains): a wreck is blown */
  get blown() { return this.damage.wrecked; } set blown(v) { /* (the Fleet decides when it goes up) */ }
  /** world point of a point in the vehicle's frame */
  toWorld(lx, ly) { const c = Math.cos(this.heading), s = Math.sin(this.heading); return [this.x + lx * c - ly * s, this.y + lx * s + ly * c]; }
  /** a world point in the vehicle's frame */
  toLocal(x, y) { const c = Math.cos(this.heading), s = Math.sin(this.heading), dx = x - this.x, dy = y - this.y; return [dx * c + dy * s, -dx * s + dy * c]; }
  /** the seat's world spot and the door's for seat i (the nearest door to a point when several serve it) */
  seatAt(i) { const s = this.model.seats[Math.min(i, this.model.seats.length - 1)] || { x: 0, y: 0 }; return this.toWorld(s.x, s.y); }
  /** a ped sits down (boarding.js calls it once the beats have played) */
  sit(ped, i) { this.seats[i] = ped; ped.seat = { body: this, vehicle: this, index: i }; if (i === 0) this.ai = null; this.asleep = false; }
  /** a ped gets up out of its seat */
  unseat(ped) { const i = this.seats.indexOf(ped); if (i >= 0) this.seats[i] = null; if (ped.seat && ped.seat.vehicle === this) ped.seat = null; return i; }
  /** Combat's hurt: bullets, blasts, melee, fire. Returns a report (zeros for a wreck: the bullet stopped) */
  hurt(o) {
    if (this.damage.wrecked) return { health: 0, armor: 0 };
    this.asleep = false; this._still = 0;
    const at = o.at, [lx, ly] = at ? this.toLocal(at[0], at[1]) : [null, null];
    const k = o.kind === 'explosion' ? 1.6 : o.kind === 'melee' ? .15 : o.kind === 'fire' ? .6 : 1;   // (a bat dents, a blast wrecks)
    const took = this.damage.hit(o.amount * k, lx, ly, this.hl, this.hw);
    if (o.kind === 'explosion' && this.body && o.knock) {   // thrown about by a blast: shoved, lifted, rolled
      const dir = o.dir || [0, 0], m = o.knock * .45;
      this.body.setVelocity(this.body.vx + dir[0] * m, this.body.vy + dir[1] * m);
      if (o.knock > 120 && this.cls !== 'boat' && this.cls !== 'heli') this.body.launch(o.knock * .5, (dir[0] * -Math.sin(this.heading) + dir[1] * Math.cos(this.heading)) * (o.knock > 200 ? 9 : 3));
    }
    this.lastBy = o.by ?? this.lastBy;
    return { health: took, armor: 0, killed: false };
  }
  /** one step. I: the driver's Intent (null: nobody drives); w: { map, wet, night, surface, ground, water, game } */
  update(dt, I, w = {}) {
    const b = this.body; if (!b) return;
    const D = this.damage, wreck = D.wrecked, live = !wreck && !this.sunk;
    // what the controls ask
    let ctl;
    if (this.ai && live) ctl = this.ai(dt, this, w) || {};
    else if (I && live && this.driver) {
      ctl = { throttle: I.throttle, brake: I.brake, steer: I.steer, handbrake: !!I.down.handbrake };
      if (I.tap.nitro && this.mods.nitro > 0 && this.nitroT <= 0) { this.mods.nitro--; this.nitroT = TUNE.nitroTime; }
      if (this.hasSiren && I.tap.horn) this.siren = !this.siren; else this.horn = !!I.down.horn && !this.hasSiren;
      if (I.tap.radioNext || I.tap.radioPrev) this.radio = nextStation(this.radio, I.tap.radioNext ? 1 : -1);
    } else {   // nobody at the wheel: roll on, then the handbrake (never the brake pedal at rest: held at a stop, it reverses)
      const slow = b.speed < TUNE.coastBelow; ctl = { throttle: 0, brake: slow ? 0 : .05, steer: 0, handbrake: slow && !b.lifted };
      if (b.lifted) ctl.handbrake = false; this.horn = false;
    }
    if (this.nitroT > 0) { this.nitroT -= dt; ctl.boost = TUNE.nitroBoost; }
    if (this.flats > 0) { b.flat = this.flats; this.flatT += dt; if (b.speed > 20) ctl = { ...ctl, steer: E.clamp((ctl.steer || 0) + Math.sin(this.flatT * 7) * .14 * this.flats, -1, 1) }; }   // (on its rims: the wheel tugs)
    this.ctlNow = ctl;
    // a land vehicle in deep water goes under (its people swim out: the Fleet's business)
    if (this.cls !== 'boat' && this.cls !== 'heli' && w.water && b.z < 4 && w.water(Math.floor(b.x / 16), Math.floor(b.y / 16))) {
      this.sinking += dt; b.u *= Math.exp(-3 * dt); b.v *= Math.exp(-3 * dt); b.w *= Math.exp(-3 * dt); ctl = { throttle: 0, brake: 0, steer: 0, handbrake: false };
      if (this.sinking >= TUNE.sinkTime && !this.sunk) this.sunk = true;
    }
    if (this.kinematic && live) { b.felt.hit = 0; b.felt.land = 0; }   // (a far traffic car: its brain moves it along its lane; no physics, PLAN.md 7.11)
    else b.step(dt, ctl, w);
    // the crash: what the impulse cost, at the corner that took it
    if (b.felt.hit > 0 && !wreck) {
      const hurt = Damage.crash(b.felt.hit, b.h.mass); if (hurt > 0) { const [lx, ly] = this.toLocal(b.felt.hitX, b.felt.hitY); D.hit(hurt, lx, ly, this.hl, this.hw); this.lastCrash = hurt; }
    }
    if (b.felt.land > 320 && !wreck) D.hit((b.felt.land - 320) * .12, null, null);
    if (b.flipped && !wreck) D.flip();
    // lights and siren
    this.lights.head = !wreck && !!w.night && this.cls !== 'heli' && (!!this.driver || !!this.ai || this.showLights);   // (a parked car sits dark; showLights: the showroom's)
    this.lights.brake = !wreck && ((ctl.brake > 0 && b.u > 1) || (ctl.handbrake && b.speed > 2));
    this.lights.reverse = !wreck && b.u < -1;
    if (this.siren && !wreck) this.sirenT += dt; if (wreck) this.siren = false;
    // doors swing toward what boarding asks
    for (const id in this.doors) this.doors[id] = E.approach(this.doors[id], this.doorWant[id], dt * 4);
    const a = this.actor; a.x = b.x; a.y = b.y; a.z = b.z; a.facing = b.heading; a.dead = wreck;
  }
  /** its tyres burst (a spike strip): a land vehicle with wheels only */
  flatten(k = 1) { if (!this.body || this.cls === 'heli' || this.cls === 'boat' || this.cls === 'rail') return false; this.flats = Math.min(1, this.flats + k); this.asleep = false; return true; }
  /** for state hashes */
  hash() { const b = this.body; return b ? [Math.round(b.x * 8), Math.round(b.y * 8), Math.round(b.z * 8), Math.round(b.heading * 1000), this.damage.hash()] : [this.damage.hash()]; }
  /** the save's part (Boom Box mods and the garage): definition, paint, mods, health */
  toJSON() { return { def: this.def.id, color: this.color, mods: { ...this.mods }, damage: this.damage.toJSON() }; }
}

/** the station after (dir 1) or before this one, through 'off' (the 'stations' registry: M10's radio; a stub till then) */
export function nextStation(id, dir) {
  const list = ['off', ...all('stations').map(s => s.id)]; if (list.length < 2) return id;
  const i = Math.max(0, list.indexOf(id)); return list[(i + dir + list.length) % list.length];
}
