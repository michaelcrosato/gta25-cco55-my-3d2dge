// PedRig (PLAN.md 8.11, 8.12): a ped's look over the engine's Humanoid, and the weapon in its hands.
//   - The look: build ('chibi' | 'heroic' | 'bulky': the engine's builds; anything else falls back to 'heroic'), size,
//     outfit, sleeves, hair, hat, colours, style ('hd' for the protagonists and named characters, 'classic' for the
//     crowd: D13). An outfit change makes the rig again (the Humanoid works its shades out once).
//   - The weapon: MOTOR's models (render/weapon-models.js), drawn among the limbs through GTM-PATCH(8). The engine's own
//     weapon kind still drives the pose: 'gun' points the right arm (a pistol is one-handed), 'sword' swings (the bat),
//     none for fists and thrown things. A long gun brings the left hand to its foregrip, by two-bone IK on the rig's
//     joints after its own pose; where the grip is out of reach the hand stops short at the shoulder (a stylized
//     shouldered pose: DECISIONS D14).
//   - A clip: the state's clip (a mocap clip's name: a phone call, sitting on a bench) plays over the rig's own pose,
//     faded in and out, where GTM's cut set has it (engine.js mocap()); without it the held pose stands in.
//   - The clock: the engine's Humanoid starts its own at a random time (its idle sway); a PedRig starts it at its
//     phase instead (the Ped's: from its id), since the possessed one's shots leave from its posed hand and the game
//     must play the same twice.
//   const pr = new PedRig({ build: 'heroic', outfit: 'coat', hair: 'spiky', colors }, { phase });  pr.hold('smg')
//   pr.update(dt, mover.rigState({ point: true, aim: 0 }))  ·  pr.draw(g, x, y, view)  ·  pr.muzzle() -> [x, y, z]
import { E, mocap } from '../engine.js';
import { drawWeaponInRig, weaponModel, muzzleLocal, gripLocal } from '../render/weapon-models.js';

/** the engine's weapon kind behind each model */
const HOLD = { pistol: 'gun', smg: 'gun', shotgun: 'gun', launcher: 'gun', flamer: 'gun', zapper: 'gun', nailgun: 'gun', coil: 'gun', flaregun: 'gun', phone: 'gun', bat: 'sword', molotov: null, grenade: null };
export const RIG_BUILDS = ['chibi', 'heroic', 'bulky'];

export class PedRig {
  /** look: { build, size, outfit, sleeves, hair, hat, colors, style }; o.phase: where its clock starts (s) */
  constructor(look = {}, o = {}) { this.model = null; this.flash = 0; this.lit = false; this.phase = o.phase || 0; this.setLook(look); }
  /** put on a look (an outfit): the rig is made again where it stands */
  setLook(look) {
    const old = this.rig; this.look = look; this._driven = false;
    this.rig = new E.Humanoid({ size: look.size || 1, build: RIG_BUILDS.includes(look.build) ? look.build : 'heroic', outfit: look.outfit || 'shirt', sleeves: look.sleeves || 'short',
      hair: look.hair || 'short', hat: look.hat || null, style: look.style || 'hd', weapon: null, colors: { ...(look.colors || {}) }, weaponDraw: api => this._drawWeapon(api) });
    this.rig.t = old ? old.t : this.phase;   // (never the engine's Math.random start: the posed hand is the muzzle)
    if (old) { this.rig.x = old.x; this.rig.y = old.y; this.rig.z = old.z; this.rig.facing = old.facing; }
    if (this.model) this.hold(this.model, true);
  }
  /** the weapon in the hands: a model id (weapon-models.js WEAPON_MODELS) or null (fists) */
  hold(model, force = false) {
    if (model === this.model && !force) return;
    this.model = model && weaponModel(model) ? model : null;
    this.rig.o.weapon = this.model ? HOLD[this.model] ?? null : null;
    if (this.model === 'bat') this.rig.o.bladeLen = 12;
  }
  get twoHanded() { const m = this.model && weaponModel(this.model); return !!(m && m.grip !== undefined); }
  /** a shot: the muzzle flashes for a few frames */
  fired() { this.flash = 1; }
  /** step the pose: s is the Mover's rigState plus MOTOR's own fields (point, aim, attack, down, pose, hurt...) */
  update(dt, s) {
    this.flash = Math.max(0, this.flash - dt * 14);
    if (s.clip || this.clip) this._clip(dt, s.clip || null);
    this.rig.update(dt, s);
    this.pointW = E.approach(this.pointW || 0, s.point ? 1 : 0, dt * (s.point ? 30 : 8));   // (the rig's own easing of point, 30 in and 8 out a second, kept here)
    if (this.twoHanded && this.pointW > .3) this._foregrip();
  }
  // a mocap clip over the rig's own pose: a new one starts at its beginning; it fades in, and out when the state drops it
  _clip(dt, name) {
    const M = mocap(), c = name && M && M.lib.clip(name); if (!M) { this.clip = null; return; }
    if (c && name !== this.clip) { this.clip = name; this.clipT = 0; }
    this.clipW = E.approach(this.clipW || 0, c ? 1 : 0, dt * 5); this.clipT = (this.clipT || 0) + dt;
    if (!this._driven) { M.Mocap.drive(this.rig, M.lib); this._driven = true; }
    const cur = this.clip && M.lib.clip(this.clip);
    if (this.clipW > 0 && cur) { this.rig.mocap = M.lib.sample(cur, this.clipT, this._pose || (this._pose = new Float32Array(M.lib.P * 3))); this.rig.mocapW = this.clipW; }
    else { this.rig.mocap = null; this.clip = null; }
  }
  // the left hand to the foregrip: two-bone IK from the left shoulder, the elbow bent down and out
  _foregrip() {
    const R = this.rig, J = R.J, o = R.o, grip = gripLocal(this.model, J.handR, J.bladeDir); if (!grip) return;
    const w = Math.min(1, (this.pointW - .3) / .5), target = E.V3.lerp(J.handL, grip, w);
    const [elbow, hand] = E.ik3(J.shL, target, o.armUpper, o.armLower, [-.2, -1, -1]);
    J.elbowL = elbow; J.handL = hand;
  }
  _drawWeapon(api) { if (this.model && !this._bare) drawWeaponInRig(api, this.model, { flash: this.flash, lit: this.lit && this.model === 'molotov' }); }
  draw(g, x, y, view) { this.rig.draw(g, x, y, view); }
  /** a bust for the switch wheel and the HUD (x, y: its top left; no weapon) */
  portrait(g, x, y, size, o) { this._bare = true; try { this.rig.drawPortrait(g, x, y, size, { weapon: false, ...o }); } finally { this._bare = false; } }
  /** the muzzle (or the hand, with no model) in the world, from the last pose. Simulation reads it (shots start here),
   *  so it leaves out the 3/4 cheat that drawing sets (rig.worldOffset includes it: headless runs never draw) */
  muzzle() { const J = this.rig.J; return this.at(this.model ? muzzleLocal(this.model, J.handR, J.bladeDir) : J.handR); }
  /** a hand in the world (the same rule) */
  hand(which = 'R') { const J = this.rig.J; return this.at(J['hand' + which] || J.handR); }
  /** a rig-local [forward, right, up] point in the world, without the drawing's cheat */
  at(p) {
    const R = this.rig, a = R.facing + (R.spin || 0), c = Math.cos(a), s = Math.sin(a), sz = R.o.size, k = (1 - (R.sq || 0) * .4) * sz;
    return [R.x + (p[0] * c - p[1] * s) * k, R.y + (p[0] * s + p[1] * c) * k, R.z + p[2] * (1 + (R.sq || 0)) * sz];
  }
}
