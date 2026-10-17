// A ped on foot (PLAN.md 7.5, 8.11, 8.12): the body (the engine's Mover), its look (PedRig), health (Vitals), what it
// carries (Inventory), its aim (Aimer), its stats and, for a protagonist, its ability. It reads one Intent a step
// (from the HumanController, a brain or a test) and the world around it, and does what the intent asks:
//   - moving: walk and run by the stick's push, sprint on stamina (Stats.sprintTime), crouch (a toggle: sneaking),
//     jump (the Mover's parkour: climb a ledge up to TUNE.climbMax, vault a low wall at a run, hop down, leap a gap),
//     roll (a dodge that stops short of walls: the engine's roll moves through them);
//   - aiming: the aim button locks on, the aim stick or mouse aims free (with the assist level); aiming walks and faces
//     the aim (a strafe); the rig points the weapon and pitches it at what it aims at;
//   - fighting: the trigger fires the weapon (the Combat world makes the shots), punches combos, swings the bat,
//     throws; reload, and the weapon in hand steps with the d-pad;
//   - being hurt: armour first, a flinch, a knockdown slide and the get-up, a stun, death.
// Everything here is simulation: fixed steps, no drawing state read (D3: the same intents give the same game).
//   const p = new Ped({ x, y, look, weapons, faction: 'crew' });  p.update(dt, intent, world);  p.draw(stage)
import { E } from '../engine.js';
import { TUNE, knob } from '../core/tune.js';
import { Actor } from '../sim/actor.js';
import { Vitals } from '../combat/vitals.js';
import { Inventory } from '../combat/inventory.js';
import { Aimer, CHEST } from '../combat/aim.js';
import { Stats } from '../combat/stats.js';
import { Ability } from '../combat/abilities.js';
import { PedRig } from './ped-rig.js';

knob('On foot', 'climbMax', 'Climb height', 34, 0, 82, 1, 'The highest ledge a jump climbs: a one-storey roof (24), a garage (32), a container');
knob('On foot', 'jumpSpeed', 'Jump speed', 140, 60, 300, 5, 'A jump\'s upward speed: 140 peaks about 14 units up, knee to hip (the engine\'s 220 clears a ped\'s head)');
knob('On foot', 'aimWalk', 'Aiming walk', .5, .2, 1, .05, 'The stick push while aiming (half: a walk)');
knob('On foot', 'rollDist', 'Roll distance', 34, 10, 60, 1, 'How far a dodge roll goes (it stops short of a wall)');
knob('On foot', 'staminaBack', 'Stamina recovery', .5, 0, 3, .05, 'Seconds of sprint won back a second at rest');

/** each melee weapon's combo: the engine's moves (the bat's slowed: a heavy swing) */
const COMBOS = { fists: () => ['jab', 'cross', 'hook', 'uppercut'],
  slugger: () => [new E.Attack('overhead', { wind: .22, active: .1, recover: .33 }), new E.Attack('slash', { wind: .12, active: .1, recover: .28 })] };
const MELEE_ARC = 1.1;   // radians either side of the facing a swing reaches

export class Ped {
  /** o: { x, y, z, faction, look (PedRig), weapons, ammo, current, health, armor, stats, ability, abilityMeter, id,
   *  character (a protagonist's id), size } */
  constructor(o = {}) {
    this.mover = new E.Mover({ x: o.x || 0, y: o.y || 0, z: o.z || 0, r: 5, climbMax: TUNE.climbMax, facing: o.facing || 0 });
    this.actor = new Actor('ped', { id: o.id, x: o.x, y: o.y, z: o.z, faction: o.faction || 'civilian' });
    this.id = this.actor.id; this.character = o.character || null; this.faction = this.actor.faction;
    this.rig = new PedRig(o.look || {});
    this.vitals = new Vitals({ health: o.health ?? o.maxHealth ?? 100, maxHealth: o.maxHealth ?? 100, armor: o.armor ?? 0 });
    /** anchored: never knocked about (a range dummy) */ this.anchored = !!o.anchored;
    this.inv = new Inventory(o.weapons || ['fists'], o.ammo || {}); if (o.current) this.inv.select(o.current);
    this.aimer = new Aimer(); this.stats = new Stats(o.stats || {});
    this.ability = o.ability ? new Ability(o.ability, o.abilityMeter || 0) : null;
    this.stamina = this.stats.sprintTime(); this._winded = false;
    this.crouching = false; this.aiming = false; this.flinch = 0; this.burning = 0; this.inCombat = 0;
    this.combo = null; this._comboFor = ''; this.throwing = null; this._down = false; this._dieT = 0;
    this.r = 6; this.h = 34; this.hostile = false; this.exposure = 1; this.posing = null; this.aimable = o.faction !== 'crew';
    /** seat: { body } while riding in a vehicle (body: x, y, z, heading, hw, hl, id): a drive-by's shooter */ this.seat = null;
  }
  // the body for hit tests and the aim (Shots, Explosives and Aimer read x, y, z, r, h, dead, id)
  get x() { return this.mover.x; } get y() { return this.mover.y; } get z() { return this.mover.z; }
  get dead() { return this.vitals.dead; } get alive() { return !this.vitals.dead; }
  get facing() { return this.mover.facing; }
  get health() { return this.vitals.health; } get armor() { return this.vitals.armor; }
  /** on the ground (knocked down or getting up) */
  get floored() { return this.vitals.down > 0 || (this.mover.action && this.mover.action.name === 'getUp'); }
  get weapon() { return this.inv.spec(); }
  place(x, y, z = 0) { const m = this.mover; m.x = x; m.y = y; m.z = z; m.vx = m.vy = m.vz = 0; m.action = null; m.onGround = true; m.lastSafe = { x, y, z }; this.actor.x = x; this.actor.y = y; this.actor.z = z; }

  /** one step. I: the Intent; w: { map, city, combat (fires, throws, melee), aim: { candidates, toScreen, los, level,
   *  threat } } */
  update(dt, I, w = {}) {
    const m = this.mover, v = this.vitals, map = w.map;
    m.climbMax = TUNE.climbMax; m.jumpSpeed = TUNE.jumpSpeed;
    v.damageTaken = this.ability ? this.ability.damageTaken : 1;
    v.update(dt); this.flinch = Math.max(0, this.flinch - dt); this.inCombat = Math.max(0, this.inCombat - dt);
    if (this.ability) this.ability.update(dt, { aiming: this.aiming });
    if (this.burning > 0) { this.burning -= dt; if (w.combat) w.combat.burnBody(this, dt); }
    if (v.dead) { this._dieT += dt; this.aiming = false; this._pose(dt, { pose: 'die' }); return this; }
    // knocked down: slide out the knockback with friction, then get up
    if (v.down > 0) {
      this._down = true; m.action = null;
      const f = m.friction; m.friction = 7; E.Body.prototype.update.call(m, dt, map); m.friction = f;
      this._pose(dt, { down: 1 }); return this._sync();
    }
    if (this._down) { this._down = false; m.vx = m.vy = 0; m.play('getUp'); }
    if (v.stun > 0) { m.update(dt, map, { move: [0, 0] }); this._pose(dt, { hurt: true }); return this._sync(); }
    if (this.seat) return this._seated(dt, I, w);
    // what the intent asks
    const busy = !!(m.action || (this.combo && this.combo.busy) || (this.throwing && this.throwing.busy));
    if (I.tap.crouch && !m.action) this.crouching = !this.crouching;
    const spec = this.inv.spec(), ranged = spec && spec.projectile !== 'melee';
    this.aiming = !!(ranged && (I.down.aim || I.aim) && !m.action && !this.floored);
    if (I.tap.weaponNext) this.inv.cycle(1); if (I.tap.weaponPrev) this.inv.cycle(-1);
    if (I.tap.reload) this.inv.reload();
    if (I.tap.ability && this.ability) this.ability.toggle();
    // the aim: locked, assisted or free (the facing when nothing aims)
    const A = w.aim || {}, range = spec ? spec.range : 300;
    this.aimer.update(dt, { held: !!I.down.aim && ranged, dir: I.aim, facing: m.facing, shooter: this, candidates: A.candidates || [], toScreen: A.toScreen || ((x, y, z) => [x, y - z]),
      los: A.los, range, level: A.level || 'standard', threat: A.threat, point: I.aimPoint, stick: I.aimStick || 0 });
    // moving: sprint on stamina, a walk while aiming, standing still to swing
    let mv = I.move, len = Math.hypot(mv[0], mv[1]);
    if (this.aiming && len > TUNE.aimWalk) mv = [mv[0] / len * TUNE.aimWalk, mv[1] / len * TUNE.aimWalk];
    if (busy && !m.action) mv = [0, 0];
    const maxStam = this.stats.sprintTime(), wantSprint = !!I.down.sprint && !this.aiming && !this.crouching && len > .5;
    if (this.stamina <= 0) this._winded = true; else if (this.stamina > maxStam * .25) this._winded = false;
    const sprint = wantSprint && !this._winded;
    // a roll: toward the stick, stopping short of a wall
    if (I.tap.roll && !m.action && m.onGround && !busy) {
      const dir = len > .2 ? Math.atan2(mv[1], mv[0]) : m.facing, d = this._clearAhead(map, dir, TUNE.rollDist);
      if (d >= 12) { m.dodge(dir, d); this.crouching = false; }
    }
    m.update(dt, map, { move: mv, sprint, crouch: this.crouching, jumpPressed: !!I.tap.jump && !busy });
    if (this.aiming) m.facing = Math.atan2(this.aimer.dir[1], this.aimer.dir[0]);   // (a strafe: the body faces the aim)
    if (m.sprinting) { this.stamina = Math.max(0, this.stamina - dt); this.stats.did('sprint', dt); }
    else this.stamina = Math.min(maxStam, this.stamina + dt * TUNE.staminaBack);
    if (this.crouching && len > .1) this.stats.did('sneak', dt);
    // fighting
    let attack = null;
    if (spec && !m.action && w.combat) attack = this._fight(dt, I, spec, w);
    // the rig: point a gun while aiming (its pitch at what is aimed at), a swing, a throw
    const s = {};
    if (this.aiming) { s.point = true; s.aim = this._pitch(); }
    if (attack) s.attack = attack;
    if (this.flinch > 0) s.hurt = true;
    if (this.crouching && !m.action) s.crouch = true;
    if (this.posing && !m.action && len < .1 && !attack) s.pose = this.posing;   // (a vignette's pose: 'kneel', 'hips'...)
    this._pose(dt, s);
    return this._sync();
  }
  // in a vehicle's seat (PLAN.md 8.12's drive-by): the body rides along; the pistol or SMG fires out of the window
  // toward the aim stick, or at the nearest target off either side (30 to 150 degrees from the heading) when it rests
  _seated(dt, I, w) {
    const m = this.mover, b = this.seat.body, C = w.combat, A = w.aim || {};
    m.x = b.x; m.y = b.y; m.z = (b.z || 0) + 6; m.vx = m.vy = m.vz = 0; m.action = null; m.facing = b.heading;
    const spec = this.inv.spec(), ok = !!spec && (spec.slot === 'pistol' || spec.slot === 'smg'), trigger = !!(I.down.fire || I.down.attack);
    this.aiming = ok && (trigger || !!I.aim);
    let dir = I.aim, held = false;
    if (!dir && this.aiming) {   // no stick: the auto-target off either side
      const hx = Math.cos(b.heading), hy = Math.sin(b.heading); let best = null, bd = Infinity;
      for (const c of A.candidates || []) {
        if (c === this || c.dead || c.aimable === false) continue;
        const dx = c.x - b.x, dy = c.y - b.y, d = Math.hypot(dx, dy); if (d > (spec ? spec.range : 300) || d < 1) continue;
        const ang = Math.acos(Math.max(-1, Math.min(1, (dx * hx + dy * hy) / d)));
        if (ang < Math.PI / 6 || ang > Math.PI * 5 / 6 || (A.los && !A.los(this, c))) continue;
        if (d < bd) { bd = d; best = c; }
      }
      if (best) { dir = [(best.x - b.x) / bd, (best.y - b.y) / bd]; held = true; }
    }
    this.aimer.update(dt, { held, dir, facing: b.heading, shooter: this, candidates: A.candidates || [], toScreen: A.toScreen || ((x, y, z) => [x, y - z]), los: A.los, range: spec ? spec.range : 300, level: A.level || 'standard', threat: A.threat, point: I.aimPoint, stick: I.aimStick || 0 });
    if (ok && C) { const n = this.inv.trigger(dt, trigger, !!(I.tap.fire || I.tap.attack)); for (let i = 0; i < n; i++) { C.shoot(this, spec); this.inCombat = 6; } }
    return this._sync();
  }
  _sync() { const m = this.mover, a = this.actor; a.x = m.x; a.y = m.y; a.z = m.z; a.facing = m.facing; a.health = this.vitals.health; a.dead = this.vitals.dead; return this; }
  _pose(dt, extra) { this.rig.hold(this.inv.spec() ? this.inv.spec().model || null : null); this.rig.update(dt, this.mover.rigState(extra)); }
  // the gun's pitch (radians up) toward what the aim points at
  _pitch() {
    const p = this.aimer.pitchTo; if (!p) return 0;
    const d = Math.hypot(p[0] - this.x, p[1] - this.y) || 1; return Math.atan2(p[2] - (this.z + CHEST), d);
  }
  // how far the body can go along dir before a wall or a solid in its way (for rolls)
  _clearAhead(map, dir, dist) {
    if (!map) return dist;
    const c = Math.cos(dir), s = Math.sin(dir), m = this.mover, top = m.z + E.HEIGHTS.step;
    for (let k = 4; k <= dist + m.r; k += 3) if (map.heightAt(m.x + c * k, m.y + s * k) > top) return Math.max(0, k - m.r - 2);
    return dist;
  }
  // the trigger, by the weapon in hand: melee combos, thrown things, guns (the Combat world makes the shots)
  _fight(dt, I, spec, w) {
    const C = w.combat, id = this.inv.current;
    if (spec.projectile === 'melee') {
      if (this._comboFor !== id) { this.combo = new E.Combo((COMBOS[id] || COMBOS.fists)(), { window: .35 }); this._comboFor = id; this._swingCool = 0; }
      // a press chains the next move once the weapon's rate allows (the engine's combo would cut each move's recovery
      // short: a masher's seven punches a second); a press a moment early is kept until then
      this._swingCool = Math.max(0, (this._swingCool || 0) - dt); this._swingBuf = I.tap.attack ? .3 : Math.max(0, (this._swingBuf || 0) - dt);
      if (this._swingBuf > 0 && this._swingCool <= 0 && this.combo.press()) { this._swingBuf = 0; this._swingCool = 1 / spec.rate; this.inCombat = 6; C.swing(this, spec); }
      this.combo.update(dt);
      if (this.combo.active) this.combo.hits(C.bodiesNear(this, spec.range + 12), t => t !== this && !t.dead && E.inArc(this, this.mover.facing, t, spec.range, MELEE_ARC, 16), t => C.meleeHit(this, t, spec, this.combo.current.spec));
      return this.combo.state;
    }
    if (spec.projectile === 'molotov' || spec.projectile === 'grenade') {
      if (this.throwing) {
        this.throwing.update(dt);
        if (this.throwing.active && !this._thrown) { this._thrown = true; C.throwFrom(this, spec); }
        if (!this.throwing.busy) this.throwing = null;
      } else if (I.tap.attack && this.inv.trigger(dt, false, true)) { this.throwing = new E.Attack('throw'); this.throwing.start(); this._thrown = false; this.inCombat = 6; this.rig.lit = spec.projectile === 'molotov'; }
      else this.inv.trigger(dt, false, false);
      return this.throwing ? this.throwing.state : null;
    }
    const n = this.inv.trigger(dt, !!I.down.attack, !!I.tap.attack);
    for (let i = 0; i < n; i++) { C.shoot(this, spec); this.rig.fired(); this.inCombat = 6; }
    return null;
  }
  /** take a hit: { amount, kind, by (an id), knock (speed u/s), dir ([dx, dy]: away from the hit) }. Returns the vitals'
   *  report. A protagonist's RED MIST halves what it takes (Vitals.damageTaken) */
  hurt(o) {
    if (this.vitals.dead) return null;
    const rolling = this.mover.action && this.mover.action.name === 'roll' && this.mover.action.invulnerable;
    if (rolling && o.kind === 'melee') return null;   // (a roll is a dodge: the swing misses)
    const r = this.vitals.hit({ amount: o.amount, kind: o.kind, by: o.by, knock: o.knockdown });
    this.flinch = .25; this.inCombat = 6;
    if (this.ability) this.ability.feed('hurt', r.health + r.armor);
    if (this.anchored) { this.vitals.down = 0; return r; }
    if (r.down && o.dir) { const k = o.knock || 140; this.mover.vx = o.dir[0] * k; this.mover.vy = o.dir[1] * k; this.mover.action = null; this.throwing = null; }
    return r;
  }
  /** back on its feet at (x, y, z) with full health (after WASTED: the hospital) */
  revive(x, y, z = 0) {
    const v = this.vitals; v.dead = false; v.health = v.maxHealth; v.armor = 0; v.down = 0; v.stun = 0; v.sinceHit = 1e9; v.zaps = 0;
    this.burning = 0; this.flinch = 0; this._dieT = 0; this._down = false; this.throwing = null; this.combo = null; this._comboFor = '';
    this.place(x, y, z); this.stamina = this.stats.sprintTime(); return this._sync();
  }
  /** catch fire for some seconds (a Molotov, the flamethrower, standing in the flames) */
  ignite(s = 4) { this.burning = Math.max(this.burning, s); }
  /** draw on the Stage (o: the actor options, { xray, crowd, key }) */
  draw(stage, o = {}) { const m = this.mover; stage.actor(m.x, m.y, m.z, (g, x, y, v) => this.rig.draw(g, x, y, v), { shadow: 5, ...o }); }
  /** the save's part of a protagonist */
  toJSON() { return { pos: [Math.round(this.x), Math.round(this.y), Math.round(this.z)], health: Math.round(this.vitals.health), armor: Math.round(this.vitals.armor), ...this.inv.toJSON(), stats: this.stats.toJSON(), ability: this.ability ? +this.ability.meter.toFixed(3) : 0 }; }
}
