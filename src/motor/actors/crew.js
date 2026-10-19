// The crew (PLAN.md 8.11): the protagonists, each a Ped that stays in the world where it was left, one possessed at a
// time, sharing one wallet (the crew fund: a simplification, DECISIONS D14). A switch is asked for, allowed or refused
// (not while wanted, not in a mission unless it allows switching), and then played out:
//   'up'       the camera climbs straight up from the one left behind (TOP, to TUNE.switchHeight, .8 s);
//   'pan'      it crosses to the other at that height;
//   'down'     it drops onto them (.8 s); control passes here;
//   'vignette' they are found doing something (their character's vignette: a pose, a prop, a line) for a few seconds,
//              or until the player moves.
// The crew only keeps time and says where the camera is; the scene moves the camera and draws the vignette.
//   crew.add('dex', ped);  crew.request('viv', { wanted: 0, mission: null }) -> { ok, reason }
//   crew.update(dt) -> { phase, x, y, H } while switching, or null
// M8: a mission's own switch (request with forced: wanted or not, no vignette), and crew.possess(id) (a stage's setup,
// a loaded save: control passes at once, no camera).
import { TUNE, knob } from '../core/tune.js';
import { BUS } from '../core/bus.js';
import { get } from '../core/registry.js';

knob('Switch', 'switchHeight', 'Switch camera height', 2500, 600, 4000, 50, 'How high the switch camera climbs between protagonists (TOP view units)');
knob('Switch', 'switchUp', 'Switch climb time', .8, .2, 3, .05, 'Seconds the switch camera takes to climb, and again to drop');
knob('Switch', 'switchPan', 'Switch pan speed', 3200, 500, 10000, 100, 'Units a second the switch camera crosses at height');
knob('Switch', 'vignetteTime', 'Vignette time', 3.2, 0, 10, .1, 'Seconds a protagonist is left to their vignette before control returns (any move ends it sooner)');
knob('Switch', 'awayFresh', 'Away to be found anew', 60, 0, 600, 5, 'Seconds a protagonist must be left alone before a switch finds them at their vignette, not where they were left');

const ease = u => (u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

export class Crew {
  constructor() { this.members = new Map(); this.order = []; this.active = null; this.seq = null; this.vignette = null; this.t = 0; this.switches = 0; this.fund = 250; }
  /** add a protagonist: its character id and Ped */
  add(id, ped) { this.members.set(id, { id, ped, leftAt: -1e9, played: false }); this.order.push(id); if (!this.active) { this.active = id; this.members.get(id).played = true; } return ped; }
  get ped() { return this.active ? this.members.get(this.active).ped : null; }
  member(id) { return this.members.get(id) || null; }
  get switching() { return !!this.seq; }
  /** may the player switch to id now? ctx: { wanted (stars), mission (the running mission's spec, or null) } */
  canSwitch(id, ctx = {}) {
    if (!this.members.has(id)) return { ok: false, reason: 'unknown' };
    if (id === this.active) return { ok: false, reason: 'same' };
    if (this.seq) return { ok: false, reason: 'busy' };
    if (ctx.forced) return this.members.get(id).ped.dead ? { ok: false, reason: 'down' } : { ok: true };   // (a mission's own switch: wanted or not)
    if ((ctx.wanted || 0) > 0) return { ok: false, reason: 'wanted' };
    if (ctx.mission && !ctx.mission.allowSwitch) return { ok: false, reason: 'mission' };
    const p = this.members.get(id).ped; if (p.dead) return { ok: false, reason: 'down' };
    return { ok: true };
  }
  /** start a switch to id (if allowed). place(member, fresh) is called as control passes: fresh when the protagonist
   *  was left long enough to be found at their vignette instead */
  request(id, ctx = {}, place = null) {
    const ok = this.canSwitch(id, ctx); if (!ok.ok) return ok;
    const from = this.members.get(this.active), to = this.members.get(id), a = from.ped, b = to.ped;
    const fresh = !ctx.forced && (!to.played || this.t - to.leftAt >= TUNE.awayFresh);
    const target = fresh && ctx.vignetteAt ? ctx.vignetteAt(id) : [b.x, b.y];
    this.seq = { from: from.id, to: id, phase: 'up', t: 0, x0: a.x, y0: a.y, x1: target[0], y1: target[1], H0: ctx.H0 || 320, fresh, place };
    this.seq.panTime = Math.max(.35, Math.hypot(this.seq.x1 - this.seq.x0, this.seq.y1 - this.seq.y0) / TUNE.switchPan);
    from.leftAt = this.t;
    return { ok: true, fresh };
  }
  /** step: the switch's camera, or null when no switch is under way. It hands control over at the end of 'down' and
   *  then runs the vignette's clock (endVignette stops it early) */
  update(dt) {
    this.t += dt;
    if (this.vignette) { this.vignette.t += dt; if (this.vignette.t >= TUNE.vignetteTime) this.vignette = null; }
    const s = this.seq; if (!s) return null;
    s.t += dt;
    const up = TUNE.switchUp, Hs = TUNE.switchHeight;
    if (s.phase === 'up' && s.t >= up) { s.phase = 'pan'; s.t -= up; }
    if (s.phase === 'pan' && s.t >= s.panTime) { s.phase = 'down'; s.t -= s.panTime; }
    if (s.phase === 'down' && s.t >= up) { this._arrive(s); return null; }
    if (s.phase === 'up') { const u = ease(Math.min(1, s.t / up)); return { phase: 'up', x: s.x0, y: s.y0, H: s.H0 + (Hs - s.H0) * u }; }
    if (s.phase === 'pan') { const u = ease(Math.min(1, s.t / s.panTime)); return { phase: 'pan', x: s.x0 + (s.x1 - s.x0) * u, y: s.y0 + (s.y1 - s.y0) * u, H: Hs }; }
    const u = ease(Math.min(1, s.t / up)); return { phase: 'down', x: s.x1, y: s.y1, H: Hs + (s.H0 - Hs) * u };
  }
  _arrive(s) {
    const to = this.members.get(s.to); this.seq = null;
    if (s.place) s.place(to, s.fresh, [s.x1, s.y1]);
    this.active = s.to; to.played = true; this.switches++;
    const ch = get('characters', s.to);
    this.vignette = s.fresh && ch && ch.vignette ? { who: s.to, t: 0, ...ch.vignette } : null;
    BUS.emit('switch', { from: s.from, to: s.to });
  }
  /** control passes to id at once (a mission's setup, a load): no switch camera, no vignette */
  possess(id) {
    const to = this.members.get(id); if (!to || id === this.active) return false;
    const from = this.members.get(this.active); if (from) from.leftAt = this.t;
    this.seq = null; this.vignette = null; this.active = id; to.played = true;
    BUS.emit('switch', { from: from ? from.id : null, to: id });
    return true;
  }
  /** the player moved: the vignette ends */
  endVignette() { this.vignette = null; }
  /** the save's part: who is played, and the crew fund */
  toJSON() { return { active: this.active, fund: this.fund }; }
}
