// Pickups (PLAN.md 8.12): weapons, ammo, health, armour, cash, police bribes, Moto Tokens and a mission's items (M8)
// lying in the world. A placed pickup (the district's) comes back after its respawn time; a dropped one (a dead ped's
// weapon, cash) is gone once taken or after a while. Walking over one takes it when take() says it can be used (a
// full-health protagonist leaves the health where it is: GTA); taken, it is marked taken. Bobbing and the glow are the
// renderer's.
//   const P = new Pickups();  P.place({ kind: 'weapon', item: 'snub38', x, y, respawn: 60 })
//   P.update(dt, takers, take)   take(taker, pickup) -> true when it was used
export const PICKUP_KINDS = ['weapon', 'ammo', 'health', 'armor', 'cash', 'bribe', 'token', 'item'];

export class Pickups {
  constructor() { this.list = []; this.taken = 0; this.nextId = 1; }
  /** a pickup: { kind, item (a weapon id, or ''), amount, x, y, z, respawn (s: placed ones come back; 0: once), life
   *  (s: dropped ones vanish after it; 0: never), id } */
  place(o) {
    if (!PICKUP_KINDS.includes(o.kind)) throw new Error('MOTOR: unknown pickup kind ' + o.kind);
    const p = { id: o.id || 'pk' + this.nextId++, kind: o.kind, item: o.item || '', amount: o.amount ?? 1, x: o.x, y: o.y, z: o.z || 0, respawn: o.respawn || 0, life: o.life || 0, t: 0, away: 0, gone: false };
    this.list.push(p); return p;
  }
  /** something dropped (a dead ped's weapon, cash): it vanishes after life seconds */
  drop(o) { return this.place({ life: 30, ...o, respawn: 0 }); }
  /** the pickups lying out now (not taken) */
  get live() { return this.list.filter(p => !p.gone && p.away <= 0); }
  /** step: count down respawns and lifetimes; give each taker (with x, y, z) what it stands on, if take() uses it */
  update(dt, takers = [], take = null) {
    for (const p of this.list) {
      p.t += dt;
      if (p.away > 0) { p.away -= dt; if (p.away <= 0) { p.away = 0; p.t = 0; } continue; }
      if (p.life && p.t >= p.life) { p.gone = true; continue; }
      if (!take) continue;
      for (const k of takers) {
        if (!k || k.dead || Math.abs((k.z || 0) - p.z) > 16 || Math.hypot(k.x - p.x, k.y - p.y) > 12) continue;
        if (take(k, p)) { this.taken++; p.taken = true; if (p.respawn) p.away = p.respawn; else p.gone = true; break; }
      }
    }
    this.list = this.list.filter(p => !p.gone);
  }
  hash() { let h = this.taken; for (const p of this.list) h = (h * 31 + (p.away > 0 ? 1 : 2)) >>> 0; return h; }
}
