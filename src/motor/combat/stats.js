// Stats (PLAN.md 8.11): 0-100 each, raised by doing (GTA San Andreas and V), saved per protagonist. Gains slow as a stat
// climbs, so the first hours show progress and the last points take work. What they act on is read here, so every
// system asks Stats rather than knowing the curves:
//   driving -> handling; shooting -> spread; stamina -> sprint time; stealth -> noise radius; strength -> melee damage.
// Each effect is 1 (or its base) at the starting 10, so a weapon's spec is what a new protagonist gets.
//   stats.gain('shooting', 1)  ·  stats.spread() (a factor on a weapon's spread)  ·  stats.toJSON()
import { TUNE, knob } from '../core/tune.js';

export const STAT_NAMES = ['driving', 'shooting', 'stamina', 'stealth', 'strength'];
knob('Stats', 'statRate', 'Stat gain rate', 1, 0, 10, .1, 'A factor on every stat gain (dev: raise it to test the curves)');
/** what one unit of each deed is worth, before the curve: */
export const DEEDS = {
  /** a second at speed (over half top speed) */ driveFast: ['driving', .05],
  /** a near miss in traffic */ nearMiss: ['driving', .4],
  /** a bullet that hit */ shotHit: ['shooting', .12],
  /** a second sprinting */ sprint: ['stamina', .06],
  /** a second sneaking (crouched, moving) */ sneak: ['stealth', .05],
  /** a stealth takedown */ takedown: ['stealth', 1.5],
  /** a melee hit that landed */ meleeHit: ['strength', .25],
};

export class Stats {
  constructor(o = {}) { for (const s of STAT_NAMES) this[s] = Number.isFinite(o[s]) ? Math.max(0, Math.min(100, o[s])) : 10; }
  /** add to a stat: the gain shrinks as it nears 100 (at 0 it is the full amount, at 90 a fifth) */
  gain(stat, amount) {
    if (!STAT_NAMES.includes(stat)) return 0;
    const v = this[stat], g = amount * TUNE.statRate * (1 - v / 112);
    this[stat] = Math.min(100, Math.max(0, v + g)); return this[stat] - v;
  }
  /** a deed's worth (DEEDS), n times (or for n seconds) */
  did(deed, n = 1) { const d = DEEDS[deed]; return d ? this.gain(d[0], d[1] * n) : 0; }
  /** grip and steering response: x1 at 10, x1.15 at 100 */
  handling() { return 1 + (this.driving - 10) / 90 * .15; }
  /** a factor on a weapon's spread: x1 at 10, x0.6 at 100 */
  spread() { return 1 - (this.shooting - 10) / 90 * .4; }
  /** seconds of sprint from full stamina: 4 at 10, 12 at 100 */
  sprintTime() { return 4 + (this.stamina - 10) / 90 * 8; }
  /** a factor on the noise radius footsteps and fights make: x1 at 10, x0.5 at 100 */
  noise() { return 1 - (this.stealth - 10) / 90 * .5; }
  /** a factor on melee damage: x1 at 10, x1.5 at 100 */
  melee() { return 1 + (this.strength - 10) / 90 * .5; }
  toJSON() { return Object.fromEntries(STAT_NAMES.map(s => [s, Math.round(this[s] * 100) / 100])); }
}
