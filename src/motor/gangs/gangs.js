// Gangs and respect (PLAN.md 8.14): the city's gangs, what each thinks of the player, and what they do about it.
//   - data: def('gangs', id, { name, colors, icon, pattern, turf (neighbourhood ids), hq and phone (points of
//     interest), rival, vehicles, weapons, peds: { grunt, enforcer } (archetypes), thresholds: { hostile, friendly },
//     chain (its missions) }) (content: src/game/gangs.js);
//   - respect runs -100..100 a gang (the save's, kept here): a mission's ±, a member killed TUNE.respectKill (-5), a
//     member of a gang's rival killed TUNE.respectRival (+1), one of a gang's cars damaged TUNE.respectCar (-2, once a
//     car a while). At or below its hostile threshold a gang is hostile, at or above its friendly one friendly;
//   - members: on the sidewalks (the crowd's: crowd.group), a few hanging out at the gang's HQ and pairs walking beats by
//     its borders, and at the wheel of its cars, which keep to its turf (traffic.js's pick). In a fight a member is a
//     fighter (fighter.js: its guns, bat and throws), off the crowd's hands until it is over;
//   - behaviour: a hostile gang's members go for the player on sight inside their turf; a hurt member and its mates go
//     for whoever hurt it, unless the gang is friendly and it was a small thing (a punch); a friendly gang's members go
//     for whoever goes for the player; rival members who see each other start a turf war, every member of both sides
//     near joining in, until one side is down or gone;
//   - BUS: respect (gang, delta, value, why) · turfWar (gangs, x, y) · turfWarEnd (gangs, x, y, dead).
// Deterministic: the 'gangs' RNG stream; gangs, members and fighters in a fixed order; the camera is never read.
//   const G = new Gangs({ life, city, fleet, combat, footprint, respect, isPlayer });  G.update(dt, ctx);  G.stance(id)
import { E } from '../engine.js';
import { TUNE, knob } from '../core/tune.js';
import { RNG } from '../core/rng.js';
import { BUS } from '../core/bus.js';
import { declare, get, all } from '../core/registry.js';
import { shape } from '../core/schema.js';
import { makeIntent, clearIntent } from '../sim/intent.js';
import { classOf } from '../sim/vehicle/defs.js';
import { Fighter, sameLevel } from '../ai/fighter.js';

declare('gangs', shape({
  name: { type: 'string', req: true }, colors: { type: 'array', req: true }, icon: { type: 'string', def: 'circle', oneOf: ['diamond', 'triangle', 'circle'] },
  pattern: { type: 'string', def: 'stripes', oneOf: ['stripes', 'dots', 'checks'] }, turf: { type: 'array', req: true }, hq: { type: 'string', def: '' }, phone: { type: 'string', def: '' },
  rival: { type: 'string', def: '' }, vehicles: { type: 'array', def: [] }, weapons: { type: 'array', def: [] }, peds: { type: 'object', req: true },
  thresholds: { type: 'object', def: { hostile: -20, friendly: 40 } }, chain: { type: 'array', def: [] },
  beats: { type: 'array', def: [] },   // ([x, y] tiles: where its patrols walk, by its borders)
}));

knob('Gangs', 'respectKill', 'Respect for a member killed', -5, -50, 0, 1, 'What killing one of a gang\'s members costs with that gang');
knob('Gangs', 'respectRival', 'Respect for a rival killed', 1, 0, 20, 1, 'What killing a member of a gang\'s rival earns with that gang');
knob('Gangs', 'respectCar', 'Respect for a car damaged', -2, -20, 0, 1, 'What damaging one of a gang\'s cars costs with that gang (once a car a while)');
knob('Gangs', 'gangSight', 'Members see', 200, 60, 500, 10, 'How far a gang member sees the player or a rival (u)');
knob('Gangs', 'gangHangout', 'At the HQ', 3, 0, 8, 1, 'Members hanging out by a gang\'s HQ while it is near');
knob('Gangs', 'gangPatrol', 'A patrol', 2, 0, 6, 1, 'Members walking each of a gang\'s beats while it is near');
knob('Gangs', 'gangCars', 'Gang cars', .3, 0, 1, .05, 'The share of the traffic in a gang\'s turf that is its own cars');
knob('Gangs', 'turfWarTime', 'A turf war lasts at most', 60, 10, 300, 5, 'Seconds before a turf war\'s survivors walk away');
const SENSE_EVERY = .25, KEEP_EVERY = 2, MATES = 150, WAR_R = 240, GIVE_UP = 6, LOSE_R = 320, CAR_AGAIN = 10, WAR_AGAIN = 45, SMALL = 10;
const NOAIM = { candidates: [], level: 'off' };
const PROFILE = { range: .5, burst: .6, pause: .8, aimOff: .1 };

export class Gangs {
  /** o: { life (CityLife: crowd, traffic, walks), city, fleet, combat, footprint, respect ({ gang: value }: the save's,
   *  kept in place), isPlayer(id), rng } */
  constructor(o) {
    this.life = o.life; this.city = o.city; this.fleet = o.fleet; this.combat = o.combat || null; this.fp = o.footprint;
    this.rng = o.rng || RNG.stream('gangs'); this.isPlayer = o.isPlayer || (() => false);
    this.respect = o.respect || {}; for (const g of all('gangs')) if (typeof this.respect[g.id] !== 'number') this.respect[g.id] = 0;
    this.groups = []; this.fighters = []; this.wars = []; this.lastWar = new Map(); this.carHits = new Map(); this.small = new Map();
    this.t = 0; this._senseT = 0; this._keepT = 0; this.warCount = 0; this.player = null; this.idle = makeIntent();
    for (const g of all('gangs')) {   // (its hangout by the HQ, a patrol a beat)
      const hq = this.city.poi(g.hq), T = this.city.T;
      if (hq) this.groups.push({ gang: g.id, kind: 'hangout', at: { x: hq.x, y: hq.y }, r: 70, n: () => TUNE.gangHangout, members: [] });
      for (const [bx, by] of g.beats) this.groups.push({ gang: g.id, kind: 'patrol', at: { x: (bx + .5) * T, y: (by + .5) * T }, r: 220, n: () => TUNE.gangPatrol, members: [] });
    }
    const T = this.life.traffic; if (T) T.pick = (p, hood, rng) => this._pickCar(p, hood, rng);
    this._unsub = [
      BUS.on('kill', e => this._kill(e), 'world'),
      BUS.on('hit', e => this._hit(e), 'world'),
    ];
  }
  dispose() { for (const u of this._unsub) u(); this._unsub = []; const T = this.life.traffic; if (T && T.pick) T.pick = null; }
  // ---- respect
  /** a gang's respect for the player */
  get(id) { return this.respect[id] ?? 0; }
  /** respect up or down (a mission's, a killing's): clamped to -100..100; returns the new value */
  add(id, delta, why = '') {
    if (!get('gangs', id) || !delta) return this.get(id);
    const was = this.get(id), now = Math.max(-100, Math.min(100, was + delta)); this.respect[id] = now;
    if (now !== was) BUS.emit('respect', { gang: id, delta: now - was, value: now, why });
    return now;
  }
  /** 'hostile' | 'neutral' | 'friendly' by its thresholds */
  stance(id) { const g = get('gangs', id); if (!g) return 'neutral'; const r = this.get(id), T = g.thresholds || {}; return r <= (T.hostile ?? -20) ? 'hostile' : r >= (T.friendly ?? 40) ? 'friendly' : 'neutral'; }
  /** the gang whose turf holds a point (null: no one's) */
  turfAt(x, y) { const h = this.city.hoodAtPoint(x, y); if (!h) return null; for (const g of all('gangs')) if (g.turf.includes(h.id)) return g.id; return null; }
  // a killing: the player's of a gang's member costs that gang's respect and earns its rivals'
  _kill(e) {
    if (!this.isPlayer(e.by) || !this.combat) return;
    const t = this.combat.bodies.find(b => b.id === e.target); if (!t || !t.gang) return;
    this.add(t.gang, TUNE.respectKill, 'kill');
    for (const g of all('gangs')) if (g.rival === t.gang) this.add(g.id, TUNE.respectRival, 'rival');
  }
  // a hit: on one of a gang's cars by the player (respect), on a member (it and its mates go for whoever did it), on the
  // player (a friendly gang's members go for whoever did it)
  _hit(e) {
    const by = this.combat && this.combat.bodies.find(b => b.id === e.by), player = this.isPlayer(e.by);
    const v = this.fleet.byId(e.target);
    if (v) { if (player && v.gang) this._carHit(v); return; }
    const t = this.combat && this.combat.bodies.find(b => b.id === e.target); if (!t || !by || by === t) return;
    if (t.gang && !t.dead) {
      if (by.gang === t.gang) return;   // (a mate's stray shot: never one another)
      if (player && this.stance(t.gang) === 'friendly' && e.kind === 'melee' && !(this.small.get(t.id) > this.t)) { this.small.set(t.id, this.t + SMALL); return; }   // (a friend's small thing, once)
      this._rally(t, by);
    }
    if (this.isPlayer(e.target) && !player) for (const m of this._members()) if (this.stance(m.ped.gang) === 'friendly' && Math.hypot(m.ped.x - t.x, m.ped.y - t.y) < TUNE.gangSight) this._fight(m.ped, by, null);
  }
  _carHit(v) { if ((this.carHits.get(v.id) ?? -1e9) > this.t) return; this.carHits.set(v.id, this.t + CAR_AGAIN); this.add(v.gang, TUNE.respectCar, 'car'); }
  // a member hurt: it and the mates near it go for whoever did it
  _rally(t, by) { for (const m of [...this._members(), ...this.fighters.map(f => ({ ped: f.ped }))]) { const p = m.ped; if (p.gang === t.gang && !p.dead && Math.hypot(p.x - t.x, p.y - t.y) < MATES) this._fight(p, by, null); } }
  // ---- the members and their fights
  // the gang members the crowd has (walking, idling)
  _members() { const C = this.life.crowd; return C ? C.members.filter(m => m.ped.gang && !m.ped.dead && !m.deadT) : []; }
  /** a member into a fight (claimed from the crowd, or a driver out of its car): against a body; war: the turf war */
  _fight(ped, target, war) {
    if (!target || target.dead || ped.dead || ped.seat) return null;   // (one at the wheel: traffic.js lets it out first)
    let f = this.fighters.find(q => q.ped === ped);
    if (f) { if (!f.war || war) { f.target = target; f.war = war || f.war; f.lostT = 0; } return f; }
    const C = this.life.crowd, m = C && C.members.find(q => q.ped === ped);
    if (m) { C.release(m); }
    if (this.combat && !this.combat.bodies.includes(ped)) this.combat.add(ped);
    f = { ped, gang: ped.gang, arch: ped.archetype, target, war, brain: new Fighter(ped, { walks: this.life.walks, map: this.city.map, fleet: this.fleet, rng: this.rng, profile: PROFILE }), lostT: 0, deadT: 0 };
    ped.lazyRig = true; ped.coast = false;
    this.fighters.push(f); return f;
  }
  /** a gang member out of its car (pulled out by the player, rammed, or getting out to fight): on foot, in the fight */
  adopt(ped, why, by) {
    const target = by && !by.dead ? by : this.player;
    if (ped.dead || !target) { const C = this.life.crowd; if (C) C.adopt(ped, ped.dead ? 'dead' : 'calm', { arch: ped.archetype ? get('peds', ped.archetype) : null }); return null; }
    if (this.isPlayer(target.id) && this.stance(ped.gang) === 'friendly' && why !== 'angry') { const C = this.life.crowd; if (C) C.adopt(ped, 'calm', { arch: ped.archetype ? get('peds', ped.archetype) : null }); return null; }
    return this._fight(ped, target, null);
  }
  // ---- the step
  /** one step. ctx: { player (the possessed Ped) } */
  update(dt, ctx = {}) {
    this.t += dt; const P = this.player = ctx.player || null;
    const C = this.life.crowd, fill = !!C && C.fills !== this._fills; if (C) this._fills = C.fills;
    this._keepT -= dt; if (fill || this._keepT <= 0) { this._keepT = KEEP_EVERY; this._keep(fill); }   // (with the crowd's own fill, the same step: all round the focus)
    this._senseT -= dt; if (this._senseT <= 0) { this._senseT = SENSE_EVERY; this._sense(P); }
    this._fightersStep(dt, P);
    this._warsStep();
  }
  // the hangouts and patrols kept up while their place is near the focus (put down in the crowd's ring, out of sight);
  // a gang car the streets have carried out of its turf (a border's one-way streets) driven home by the GPS, and let
  // wander again once back
  _keep(fill) {
    const T = this.life.traffic, gps = this.life.gps;
    if (T && gps) for (const c of T.cars) {
      if (!c.gang || c.out) continue;
      const g = get('gangs', c.gang), h = this.city.hoodAtPoint(c.v.x, c.v.y), home = !!h && g.turf.includes(h.id);
      if (c.homing && !c.brain.route) c.homing = false;   // (its way home driven to the end: let it wander, sent again if still out)
      if (home && c.homing) { c.homing = false; c.brain.setRoute(null); }
      // (sent on a lane with room to stop: a new way taken at a light had run its red)
      else if (!home && !c.homing && !c.brain.route && c.brain.here && c.brain.here.k === 'lane' && c.brain.here.len - c.brain.s > 60) { const hq = this.city.poi(g.hq), r = hq && gps.routeTo(c.v.x, c.v.y, c.v.heading, hq.x, hq.y, { z: c.v.z }); if (r) { c.homing = true; c.brain.setRoute(r.lanes, null); } }
    }
    const C = this.life.crowd; if (!C) return;
    for (const q of this.groups) {
      q.members = q.members.filter(m => C.members.includes(m) && !m.deadT && !m.ped.dead);
      const g = get('gangs', q.gang), want = q.n(); if (q.members.length >= want || this.fp.d(q.at.x, q.at.y) > TUNE.crowdOut + q.r) continue;
      const turf = new Set(g.turf), arch = [g.peds.grunt, g.peds.enforcer].filter(Boolean);
      const got = C.group({ n: want - q.members.length, arch, rIn: fill ? 60 : TUNE.crowdIn, home: { x: q.at.x, y: q.at.y, r: q.r }, idles: q.kind === 'hangout' ? ['chat', 'smoke'] : ['smoke'],
        where: p => turf.has(p.hood) && Math.hypot(p.x - q.at.x, p.y - q.at.y) < q.r, tag: ped => { ped.gang = g.id; } });
      q.members.push(...got);
    }
  }
  // who sees whom: a hostile gang's member the player in its turf; rival members one another (a turf war)
  _sense(P) {
    const map = this.city.map, members = this._members();
    for (const m of members) {
      const p = m.ped, g = p.gang; if (p.seat) continue;
      if (P && !P.dead && this.stance(g) === 'hostile' && this.turfAt(p.x, p.y) === g && sameLevel(p, P) && E.sees(p, P, { map, range: TUNE.gangSight, fov: 3.2, facing: p.mover.facing }).seen) { this._rally({ gang: g, x: p.x, y: p.y }, P); continue; }
      const rival = get('gangs', g).rival; if (!rival) continue;
      for (const o of members) {
        if (o.ped.gang !== rival || o.ped.seat || Math.abs(o.ped.x - p.x) > TUNE.gangSight || Math.abs(o.ped.y - p.y) > TUNE.gangSight) continue;
        if (E.sees(p, o.ped, { map, range: TUNE.gangSight * .8, fov: 3.2, facing: p.mover.facing }).seen) { this._war(g, rival, (p.x + o.ped.x) / 2, (p.y + o.ped.y) / 2); break; }
      }
    }
    // a hostile gang's car that sees the player near: its driver gets out to fight
    const T = this.life.traffic;
    if (T && P && !P.dead) for (const c of T.cars) {
      if (!c.gang || c.out || c.v.kinematic || this.stance(c.gang) !== 'hostile') continue;
      const v = c.v; if (Math.hypot(P.x - v.x, P.y - v.y) > 140 || this.turfAt(v.x, v.y) !== c.gang) continue;
      if (map.ray({ x: v.x, y: v.y, z: v.z }, P, { eye: 14, target: 14 }).clear) { c.brain.crashed(2); c.out = { why: 'angry', t: .4 }; }
    }
  }
  // two rival gangs' members meet: a turf war, everyone of both sides near joining in
  _war(a, b, x, y) {
    const key = [a, b].sort().join(':');
    if (this.wars.some(w => w.key === key && Math.hypot(w.x - x, w.y - y) < WAR_R * 1.5) || (this.lastWar.get(key) ?? -1e9) > this.t) return;
    const w = { key, gangs: [a, b], x, y, t: this.t, dead: 0 };
    const side = g => [...this._members().map(m => m.ped), ...this.fighters.filter(f => !f.war).map(f => f.ped)].filter(p => p.gang === g && !p.seat && Math.hypot(p.x - x, p.y - y) < WAR_R);
    const A = side(a), B = side(b); if (!A.length || !B.length) return;
    this.wars.push(w); this.warCount++;
    for (const p of A) this._fight(p, nearest(p, B), w);
    for (const p of B) this._fight(p, nearest(p, A), w);
    BUS.emit('turfWar', { gangs: [a, b], x: Math.round(x), y: Math.round(y) });
  }
  _warsStep() {
    for (const w of this.wars) {
      const sides = w.gangs.map(g => this.fighters.filter(f => f.war === w && f.gang === g && !f.ped.dead));
      if (sides.some(s => !s.length) || this.t - w.t > TUNE.turfWarTime) {
        w.over = true; this.lastWar.set(w.key, this.t + WAR_AGAIN);
        for (const f of this.fighters) if (f.war === w) { f.war = null; f.done = !f.ped.dead; }
        BUS.emit('turfWarEnd', { gangs: w.gangs, x: Math.round(w.x), y: Math.round(w.y), dead: w.dead });
      }
    }
    this.wars = this.wars.filter(w => !w.over);
  }
  // each fighter: at its target (another enemy near when it falls), back to the sidewalks when the fight is over
  _fightersStep(dt, P) {
    const PW = { map: this.city.map, city: this.city, combat: this.combat, fleet: this.fleet, aim: NOAIM }, C = this.life.crowd;
    for (const f of this.fighters) {
      const p = f.ped;
      if (p.dead) {
        if (!f.deadT) { f.deadT = this.t; if (f.war) f.war.dead++; }
        if (this.t - f.deadT < 2.5) p.update(dt, this.idle, PW); else { if (C) C.adopt(p, 'dead', { arch: f.arch ? get('peds', f.arch) : null }); f.gone = true; }
        continue;
      }
      if (p.seat) continue;
      let tg = f.target;
      if (f.war && (!tg || tg.dead)) { const foes = this.fighters.filter(q => q.war === f.war && q.gang !== f.gang && !q.ped.dead).map(q => q.ped); tg = f.target = foes.length ? nearest(p, foes) : null; }
      if (!tg || tg.dead) f.done = true;
      else {
        const far = Math.hypot(tg.x - p.x, tg.y - p.y) > LOSE_R || !sameLevel(p, tg);
        f.lostT = far ? f.lostT + dt : 0; if (f.lostT > GIVE_UP) f.done = true;
      }
      if (f.done) { if (C) C.adopt(p, 'calm', { arch: f.arch ? get('peds', f.arch) : null }); else if (this.combat) this.combat.remove(p); f.gone = true; continue; }
      const I = f.brain.attack(dt, clearIntent(f.brain.I), tg.seat && tg.seat.vehicle ? tg.seat.vehicle : tg);
      p.update(dt, I, PW);
    }
    this.fighters = this.fighters.filter(f => !f.gone);
  }
  // a gang's car for a spawn in its turf (traffic.js asks): its vehicles on land, a grunt at the wheel, its colour; it
  // weighs each way on by where that lane ends (a long lane's middle can lie in the turf and its end out of it), a way
  // that ends in the turf with every way on from there out of it a little; carried out all the same, it is routed home
  // (_keep)
  _pickCar(p, hood, rng) {
    for (const g of all('gangs')) {
      if (!g.turf.includes(hood) || rng.next() >= TUNE.gangCars) continue;
      const defs = g.vehicles.filter(id => { const d = get('vehicles', id); return d && classOf(d) !== 'boat' && classOf(d) !== 'heli' && classOf(d) !== 'rail'; }); if (!defs.length) return null;
      const keep = this._turfKeep(g); if (keep(p.lane) < 1) return null;   // (one put down heading out of the turf: an ordinary car)
      return { def: defs[Math.floor(rng.next() * defs.length)], arch: g.peds.grunt, gang: g.id, color: g.colors[0], keep };
    }
    return null;
  }
  // a gang's turf as a DriverBrain's keep: 1 a lane ending in it with a way on that stays, .25 one ending in it from where
  // every way leaves, 0 one ending out of it
  _turfKeep(g) {
    if (this._keeps && this._keeps[g.id]) return this._keeps[g.id];
    const turf = new Set(g.turf), city = this.city, G = this.life.graph, memo = new Map();
    const inside = l => { const h = city.hoodAtPoint(l.b[0], l.b[1]); return !!h && turf.has(h.id); };
    const keep = l => {
      let k = memo.get(l.id); if (k !== undefined) return k;
      k = !inside(l) ? 0 : !G || l.out.some(id => { const c = G.conns[id]; return c && c.kind !== 'change' && inside(G.lanes[c.to]); }) ? 1 : .25;
      memo.set(l.id, k); return k;
    };
    (this._keeps ||= {})[g.id] = keep; return keep;
  }
  /** the bodies on foot the gangs own now (their fighters: for drivers to yield to, and peds to keep apart from) */
  get bodies() { return this.fighters.filter(f => !f.ped.seat).map(f => f.ped); }
  /** draw the fighters round the focus */
  draw(stage, fx, fy, reach) { for (const f of this.fighters) { const p = f.ped; if (!p.seat && Math.abs(p.x - fx) < reach && Math.abs(p.y - fy) < reach) p.draw(stage, { crowd: true, key: p.rig }); } }
  hash() { let h = this.warCount * 31 + this.fighters.length; for (const f of this.fighters) h = (h * 31 + Math.round(f.ped.x * 4) * 7 + Math.round(f.ped.y * 4)) >>> 0; return [...all('gangs').map(g => this.get(g.id)), this.fighters.length, this.wars.length, h]; }
  stats() { return { respect: { ...this.respect }, members: this._members().length, fighters: this.fighters.length, wars: this.wars.length, warCount: this.warCount, groups: this.groups.map(q => q.gang + ':' + q.kind + ':' + q.members.length) }; }
}

// the nearest of some bodies to p
function nearest(p, list) { let best = null, bd = Infinity; for (const q of list) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = q; } } return best; }
