// Health, armour, knockdown and stun (PLAN.md 8.12): 100 health and up to 100 armour; armour soaks a hit first; health
// creeps back to half when out of combat (GTA V). A hard hit knocks a body down for a moment; a zap stuns it. Simulation
// state: stepped with fixed dt, read by brains, the HUD and the save.
import { TUNE, knob } from '../core/tune.js';

knob('Combat', 'regenDelay', 'Regeneration delay', 5, 0, 30, .5, 'Seconds out of combat before health creeps back');
knob('Combat', 'regenRate', 'Regeneration rate', 6, 0, 50, 1, 'Health a second while regenerating');
knob('Combat', 'regenTo', 'Regenerates to', 50, 0, 100, 5, 'Health regeneration stops here (GTA V: half)');
knob('Combat', 'armorSoak', 'Armour soak', .8, 0, 1, .05, 'The share of a hit armour takes while it lasts');
knob('Combat', 'knockdownAt', 'Knockdown threshold', 30, 5, 200, 1, 'A single hit this hard (after armour) knocks a body down');
knob('Combat', 'downTime', 'Down time', 1.1, .2, 5, .1, 'Seconds on the ground after a knockdown, before getting up');

export class Vitals {
  /** o: { health, maxHealth, armor } */
  constructor(o = {}) {
    this.health = o.health ?? 100; this.maxHealth = o.maxHealth ?? 100; this.armor = o.armor ?? 0;
    /** sinceHit: seconds since the last hit (regeneration waits on it); down: seconds left on the ground; stun: seconds
     *  left stunned; zaps: consecutive zap hits (the Zap-O-Matic kills on repeat) */
    this.sinceHit = 1e9; this.down = 0; this.stun = 0; this.zaps = 0; this.dead = false; this.lastBy = null; this.damageTaken = 1;
  }
  get alive() { return !this.dead; }
  /** take a hit: { amount, by (the attacker's id), kind ('bullet' | 'melee' | 'explosion' | 'fire' | 'zap' | 'fall'),
   *  knock (force a knockdown) }. Returns { health, armor (taken from each), down, killed } */
  hit(o) {
    if (this.dead) return { health: 0, armor: 0, down: false, killed: false };
    let a = Math.max(0, o.amount || 0) * this.damageTaken, fromArmor = 0;
    if (this.armor > 0 && o.kind !== 'fire' && o.kind !== 'fall') { fromArmor = Math.min(this.armor, a * TUNE.armorSoak); this.armor -= fromArmor; a -= fromArmor; }
    const before = this.health; this.health = Math.max(0, this.health - a);
    this.sinceHit = 0; this.lastBy = o.by ?? null;
    if (o.kind === 'zap') this.zaps++; else this.zaps = 0;
    const down = !!o.knock || a >= TUNE.knockdownAt || o.kind === 'explosion';
    if (down && this.health > 0) this.down = Math.max(this.down, TUNE.downTime);
    if (this.health <= 0) this.dead = true;
    return { health: before - this.health, armor: fromArmor, down, killed: this.dead };
  }
  heal(n) { if (!this.dead) this.health = Math.min(this.maxHealth, this.health + n); }
  addArmor(n) { this.armor = Math.min(100, this.armor + n); }
  /** step: regeneration, the knockdown and stun timers */
  update(dt) {
    this.sinceHit += dt; this.down = Math.max(0, this.down - dt); this.stun = Math.max(0, this.stun - dt);
    if (this.sinceHit > 3) this.zaps = 0;
    if (!this.dead && this.sinceHit >= TUNE.regenDelay && this.health < TUNE.regenTo) this.health = Math.min(TUNE.regenTo, this.health + TUNE.regenRate * dt);
  }
  /** can it act (not down, not stunned, alive)? */
  get able() { return !this.dead && this.down <= 0 && this.stun <= 0; }
}
