// A vehicle's damage (PLAN.md 8.8): health, and dents by zone (front, rear, left, right: 0 none to 1 crushed) that the
// renderer pushes into the model's corners. Below TUNE.smokeAt of its health it smokes; below TUNE.fireAt it burns,
// and TUNE.burnTime seconds later it explodes (a blast through the Combat world, which chains). On its roof it burns
// at once. A wreck is a burnt shell: it doesn't drive, and it isn't hurt any more.
//   const D = new Damage(100, 1);  D.hit(amount, lx, ly, hl, hw)  ·  D.update(dt) -> 'explode' once  ·  D.state
import { TUNE, knob } from '../../core/tune.js';

knob('Vehicles', 'smokeAt', 'Smokes below', .4, .1, .9, .05, 'A vehicle smokes below this share of its health');
knob('Vehicles', 'fireAt', 'Burns below', .15, .02, .5, .01, 'A vehicle catches fire below this share of its health');
knob('Vehicles', 'burnTime', 'Burn time', 4, .5, 15, .25, 'Seconds a burning vehicle takes to explode');
knob('Vehicles', 'crashDv', 'Crash threshold', 45, 0, 200, 5, 'A crash hurts a vehicle beyond this change of speed (u/s)');
knob('Vehicles', 'crashHurt', 'Crash damage', .28, 0, 2, .02, 'Health a crash takes per u/s of change beyond the threshold');
knob('Vehicles', 'dentRate', 'Dent rate', 1.6, 0, 6, .1, 'How fast a zone dents: share of crush per share of health lost there');

export const ZONES = ['front', 'rear', 'left', 'right'];

export class Damage {
  /** max: full health; toughness: a factor on what it takes (an armoured truck's is low) */
  constructor(max = 100, toughness = 1) {
    this.max = max; this.health = max; this.toughness = toughness; this.dents = { front: 0, rear: 0, left: 0, right: 0 };
    this.state = 'ok'; this.burnT = 0; this.exploded = false; this.taken = 0;
  }
  get share() { return this.health / this.max; }
  get wrecked() { return this.state === 'wrecked'; }
  get burning() { return this.state === 'burning'; }
  get smoking() { return this.state === 'smoking' || this.state === 'burning'; }
  /** the zone of a point in the vehicle's frame (lx forward, ly right) for a body of half sizes hl, hw */
  static zone(lx, ly, hl, hw) { const fx = lx / (hl || 1), fy = ly / (hw || 1); return Math.abs(fx) * 1.25 >= Math.abs(fy) ? (fx >= 0 ? 'front' : 'rear') : (fy >= 0 ? 'right' : 'left'); }
  /** take damage at a point (vehicle frame; null: no dent). Returns what it took */
  hit(amount, lx = null, ly = null, hl = 1, hw = 1) {
    if (this.state === 'wrecked' || amount <= 0 || this.immune) return 0;   // (immune: a bot's own ride, D29)
    const a = Math.min(this.health, amount * this.toughness); this.health -= a; this.taken += a;
    if (lx !== null) { const z = Damage.zone(lx, ly, hl, hw); this.dents[z] = Math.min(1, this.dents[z] + a / this.max * TUNE.dentRate); }
    this._state();
    return a;
  }
  /** on its roof: it burns, whatever its health */
  flip() { if (this.state !== 'wrecked' && this.state !== 'burning' && !this.immune) { this.state = 'burning'; this.burnT = 0; } }
  /** set alight (a flare in it, X6): it burns, whatever its health, as on its roof */
  ignite() { this.flip(); }
  /** put it right (the Boom Box's respray and repair) */
  repair() { this.health = this.max; this.dents = { front: 0, rear: 0, left: 0, right: 0 }; this.state = 'ok'; this.burnT = 0; this.exploded = false; }
  _state() {
    if (this.state === 'wrecked') return;
    const f = this.share;
    if (f <= TUNE.fireAt) { if (this.state !== 'burning') { this.state = 'burning'; this.burnT = 0; } }
    else if (f <= TUNE.smokeAt) this.state = 'smoking';
    else this.state = 'ok';
  }
  /** step: a burning vehicle counts to its explosion. Returns 'explode' on the step it goes up */
  update(dt) {
    if (this.state !== 'burning') return null;
    this.burnT += dt;
    if (this.burnT >= TUNE.burnTime) { this.explode(); return 'explode'; }
    return null;
  }
  /** it goes up now (a chain, a burn run out): a wreck */
  explode() { this.state = 'wrecked'; this.health = 0; this.exploded = true; this.dents = { front: Math.max(this.dents.front, .6), rear: Math.max(this.dents.rear, .6), left: Math.max(this.dents.left, .5), right: Math.max(this.dents.right, .5) }; }
  /** a crash's damage from the impulse it felt (N·s) and the mass: the change of speed beyond the threshold */
  static crash(impulse, mass) { const dv = impulse / mass; return Math.max(0, dv - TUNE.crashDv) * TUNE.crashHurt; }
  toJSON() { return { health: Math.round(this.health), dents: Object.fromEntries(ZONES.map(z => [z, +this.dents[z].toFixed(2)])), state: this.state }; }
  hash() { return Math.round(this.health * 10) * 7 + ZONES.reduce((h, z) => h * 3 + Math.round(this.dents[z] * 20), 0) + ['ok', 'smoking', 'burning', 'wrecked'].indexOf(this.state); }
}
