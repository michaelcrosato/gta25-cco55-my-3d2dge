// Special abilities (PLAN.md 8.11): one per protagonist, a meter filled by playing in character and spent while it
// runs. MOTOR keeps the meter and the effect's numbers; the game says who has which (def('characters', ...).ability).
//   OVERDRIVE (Dex): time x0.5 and handling x1.3, for 8 s
//   DEAD CALM (Viv): time x0.35 while aiming, accuracy and damage up; it drains only while aiming
//   RED MIST  (Gus): damage taken x0.5, melee knockback x2, for 10 s
// The effects are read by the systems they touch (time scale by the scene, handling by vehicles, damage by combat),
// through the getters below, so a test can check each without a screen.
//   const a = new Ability('overdrive', 1);  a.feed('driveFast', dt);  a.toggle();  a.update(dt, { aiming });  a.timeScale
import { TUNE, knob } from '../core/tune.js';

knob('Abilities', 'abilityFill', 'Ability fill rate', 1, 0, 10, .1, 'A factor on how fast every ability meter fills');
/** each ability: its effect's numbers, how long a full meter lasts (seconds of use), and what fills it (deed -> share
 *  of a full meter per unit) */
export const ABILITIES = {
  overdrive: { name: 'OVERDRIVE', who: 'dex', time: .5, handling: 1.3, duration: 8, fills: { driveFast: .012, nearMiss: .05, takedown: .02 } },
  deadcalm: { name: 'DEAD CALM', who: 'viv', time: .35, accuracy: .25, damage: 1.35, duration: 9, aimOnly: true, fills: { shotHit: .02, headshot: .06, sneak: .004 } },
  redmist: { name: 'RED MIST', who: 'gus', damageTaken: .5, knockback: 2, duration: 10, fills: { meleeHit: .035, hurt: .004, smash: .02 } },
};

export class Ability {
  /** id: an ABILITIES key; meter 0..1 (from the save) */
  constructor(id, meter = 0) {
    if (!ABILITIES[id]) throw new Error('MOTOR: no ability ' + id);
    this.id = id; this.spec = ABILITIES[id]; this.meter = Math.max(0, Math.min(1, meter)); this.active = false; this._aiming = false;
  }
  get name() { return this.spec.name; }
  /** fill the meter for a deed (its share per unit, n units); nothing fills while it runs */
  feed(deed, n = 1) { const f = this.spec.fills[deed]; if (f && !this.active) this.meter = Math.min(1, this.meter + f * n * TUNE.abilityFill); }
  /** start it (needs some meter) or stop it early */
  toggle() { if (this.active) this.active = false; else if (this.meter > .05) this.active = true; return this.active; }
  /** step: the meter drains while it runs (DEAD CALM only while aiming) and it stops when empty. o.aiming */
  update(dt, o = {}) {
    this._aiming = !!o.aiming;
    if (!this.active) return;
    if (this.spec.aimOnly && !this._aiming) return;
    this.meter -= dt / this.spec.duration;
    if (this.meter <= 0) { this.meter = 0; this.active = false; }
  }
  /** is its effect on this step (DEAD CALM: only while aiming)? */
  get on() { return this.active && (!this.spec.aimOnly || this._aiming); }
  /** the game's time scale while it is on (1: none) */
  get timeScale() { return this.on && this.spec.time ? this.spec.time : 1; }
  /** a factor on vehicle handling */
  get handling() { return this.on && this.spec.handling ? this.spec.handling : 1; }
  /** a factor on damage the holder takes */
  get damageTaken() { return this.on && this.spec.damageTaken ? this.spec.damageTaken : 1; }
  /** a factor on the holder's melee knockback */
  get knockback() { return this.on && this.spec.knockback ? this.spec.knockback : 1; }
  /** a factor on the holder's weapon spread (lower: tighter) */
  get spread() { return this.on && this.spec.accuracy ? 1 - this.spec.accuracy : 1; }
  /** a factor on the holder's weapon damage */
  get damage() { return this.on && this.spec.damage ? this.spec.damage : 1; }
}
