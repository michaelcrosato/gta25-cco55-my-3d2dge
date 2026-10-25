// Stunt jumps (PLAN.md 9.5): a jump counts when the player's vehicle leaves the ground within a stunt's takeoff circle
// and lands upright beyond it: in its landing circle, or past its minimum distance. The first one of each pays its
// reward and is kept in the save's stunts; every one after scores and shows. Each is def('stunts'): { name, takeoff:
// [x, y], r (40), landing: { at: [x, y], r } (or none), minDist (160), minAir (.5 s), reward, approach: [x, y] (where
// a run-up starts: the bot's) }. The score: the distance flown, twice the height, and a bonus for each half turn of a
// roll.
//   const S = new StuntJumps({ save });  each step: const done = S.update(dt, vehicle)  ->  { id, score, first, ... } | null
import { declare, all } from '../core/registry.js';
import { shape } from '../core/schema.js';
import { BUS } from '../core/bus.js';

declare('stunts', shape({ name: { type: 'string', req: true }, district: { type: 'string', def: 'lowtown' }, takeoff: { type: 'array', req: true }, r: { type: 'number', def: 40 }, landing: { type: 'object', def: null }, minDist: { type: 'number', def: 160 }, minAir: { type: 'number', def: .5 }, reward: { type: 'number', def: 500 }, approach: { type: 'array', def: null } }));

export class StuntJumps {
  /** o: { save (stunts: the ids done), district (the one played: its jumps alone) } */
  constructor(o) { this.save = o.save; this.district = o.district || 'lowtown'; this.jump = null; this.last = null; }
  /** one step with the vehicle the player drives (or null): a jump that just landed, or null */
  update(dt, v) {
    const b = v && v.body; if (!b) { this.jump = null; return null; }
    if (b.airborne) {
      if (!this.jump || this.jump.v !== v) {   // (off the ground: within a stunt's takeoff circle?)
        const s = all('stunts').find(q => q.district === this.district && Math.hypot(q.takeoff[0] - b.x, q.takeoff[1] - b.y) < q.r);
        this.jump = { v, s, x: b.x, y: b.y, z: b.z, t: 0, top: b.z, roll: 0, lastRoll: b.rollA || 0 };
      }
      const J = this.jump; J.t += dt; J.top = Math.max(J.top, b.z); const r = b.rollA || 0; J.roll += Math.abs(r - J.lastRoll); J.lastRoll = r;
      return null;
    }
    const J = this.jump; this.jump = null; if (!J || !J.s || J.v !== v) return null;
    const s = J.s, dist = Math.hypot(b.x - J.x, b.y - J.y);
    const landed = s.landing ? Math.hypot(s.landing.at[0] - b.x, s.landing.at[1] - b.y) < (s.landing.r || 80) : dist >= s.minDist;
    if (!landed || J.t < s.minAir || b.flipped || v.wrecked) { this.last = { id: s.id, ok: false, dist, air: J.t, flipped: !!b.flipped, wrecked: !!v.wrecked }; return null; }
    const score = Math.round(dist + (J.top - J.z) * 2 + Math.floor(J.roll / Math.PI) * 100), first = !this.save.stunts.includes(s.id);
    if (first) this.save.stunts.push(s.id);
    BUS.emit('stunt', { id: s.id, score });
    return (this.last = { id: s.id, ok: true, name: s.name, score, first, reward: first ? s.reward : 0, dist: Math.round(dist), air: +J.t.toFixed(2), height: Math.round(J.top - J.z) });
  }
}
