// Hold-ups (PLAN.md 9.5): a shop with holdup: true (def('shops')) keeps a clerk at its counter, the shop's point of
// interest. Aim a gun at the clerk from within TUNE.holdupRange for TUNE.holdupTime and the till empties: cash dropped
// at the counter, the store's silent alarm (the 'holdup' crime: two stars), and that store shut to hold-ups for
// TUNE.holdupRest game hours. The clerk raises their hands while it lasts; let the aim go and the till's count runs back down.
//   const H = new Holdups({ city, combat, rng });  each step: const done = H.update(dt, ped, { hour, crime })
import { all } from '../core/registry.js';
import { TUNE, knob } from '../core/tune.js';
import { BUS } from '../core/bus.js';
import { makeIntent, clearIntent } from '../sim/intent.js';
import { Ped } from '../actors/ped.js';
import { pedLook } from '../actors/peds.js';
import { get } from '../core/registry.js';

knob('Hold-ups', 'holdupTime', 'Aim for', 3, .5, 10, .1, 'Seconds a gun must be held on the clerk for the till');
knob('Hold-ups', 'holdupRange', 'Aim from within', 110, 20, 300, 5, 'How near the clerk the gun must be (u)');
knob('Hold-ups', 'holdupCash', 'The till', 450, 0, 5000, 10, 'Cash a hold-up takes ($)');
knob('Hold-ups', 'holdupRest', 'Shut for', 24, 1, 96, 1, 'Game hours a store stays shut to hold-ups after one');
const NEAR = 360, GUNS = new Set(['bullet', 'pellets', 'rocket', 'stream', 'zap', 'flare']);

export class Holdups {
  /** o: { city, combat, rng (a stream: the clerks' looks) } */
  constructor(o) { this.city = o.city; this.combat = o.combat; this.rng = o.rng; this.stores = new Map(); this.I = makeIntent(); this.aiming = null; }
  // a store's clerk, spawned when the player comes near (and kept): at the counter, facing out to the street
  _store(shop) {
    let s = this.stores.get(shop.id); if (s) return s;
    const q = this.city.poi(shop.poi); if (!q) return null;
    const spec = get('peds', 'clerk') || get('peds', 'vendor') || {}, clerk = new Ped({ x: q.x, y: q.y, faction: 'civilian', look: pedLook(spec, this.rng), weapons: ['fists'] });
    clerk.archetype = 'clerk'; clerk.lazyRig = true; clerk.owner = 'shop'; clerk.mover.facing = this._facing(q);
    this.combat.add(clerk);
    s = { shop, clerk, x: q.x, y: q.y, t: 0, shutUntil: -1e9 }; this.stores.set(shop.id, s); return s;
  }
  // which way the counter faces: away from the building behind the door
  _facing(q) {
    const C = this.city, T = C.T, cx = Math.floor(q.x / T), cy = Math.floor(q.y / T);
    for (const [dx, dy, a] of [[0, -1, Math.PI / 2], [0, 1, -Math.PI / 2], [-1, 0, 0], [1, 0, Math.PI]]) if (!C.walkable(cx + dx, cy + dy)) return a;
    return Math.PI / 2;
  }
  /** one step. ctx: { hours (the game's running hour count), crime(e) (the police told) }: a hold-up done, or null */
  update(dt, p, ctx = {}) {
    let done = null;
    for (const shop of all('shops')) {
      if (!shop.holdup) continue;
      const q = this.city.poi(shop.poi); if (!q || Math.hypot(q.x - p.x, q.y - p.y) > NEAR) continue;
      const s = this._store(shop); if (!s) continue;
      const c = s.clerk; if (c.dead) continue;
      const spec = p.inv.spec(), d = Math.hypot(c.x - p.x, c.y - p.y), dir = p.aimer && p.aimer.dir;
      const onIt = !p.seat && p.aiming && spec && GUNS.has(spec.projectile) && d < TUNE.holdupRange && dir && ((c.x - p.x) * dir[0] + (c.y - p.y) * dir[1]) / (d || 1) > .9;
      const open = (ctx.hours ?? 0) >= s.shutUntil;
      s.t = onIt && open ? s.t + dt : Math.max(0, s.t - dt * 2);
      c.posing = s.t > 0 ? 'cheer' : null;   // (hands up)
      if (s.t >= TUNE.holdupTime) {
        s.t = 0; s.shutUntil = (ctx.hours ?? 0) + TUNE.holdupRest;
        const cash = Math.round(TUNE.holdupCash);
        this.combat.pickups.drop({ kind: 'cash', amount: cash, x: c.x + Math.cos(c.mover.facing) * 10, y: c.y + Math.sin(c.mover.facing) * 10, life: 60 });
        if (ctx.crime) ctx.crime({ type: 'holdup', x: c.x, y: c.y, by: p.id, victim: c.id, severity: 2 });
        BUS.emit('holdup', { shop: shop.id, by: p.id, cash });
        done = { shop: shop.id, name: shop.name, cash };
      }
    }
    for (const s of this.stores.values()) { const c = s.clerk; if (!c.dead) c.update(dt, clearIntent(this.I), { map: this.city.map, city: this.city, combat: this.combat, fleet: null, aim: { candidates: [], level: 'off' } }); }
    return done;
  }
  /** the store being held up now: { shop, t (0..1) } or null (the HUD's ring) */
  progress() { for (const s of this.stores.values()) if (s.t > 0) return { shop: s.shop, t: Math.min(1, s.t / TUNE.holdupTime) }; return null; }
  draw(stage, fx, fy, reach) { for (const s of this.stores.values()) { const c = s.clerk; if (Math.abs(c.x - fx) < reach && Math.abs(c.y - fy) < reach) c.draw(stage, { crowd: true, key: c.rig }); } }
  hash() { let h = this.stores.size; for (const s of this.stores.values()) h = (h * 31 + Math.round(s.t * 10) + (s.clerk.dead ? 7 : 0) + Math.round(s.shutUntil)) >>> 0; return [h]; }
  dispose() { for (const s of this.stores.values()) this.combat.remove(s.clerk); this.stores.clear(); }
}
