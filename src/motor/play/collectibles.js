// Collectibles (PLAN.md 8.16, 9.5): sets of tokens hidden about a district (def('collectibles'): Lowtown's 25 Moto
// Tokens on roofs and in alleys). Each spot is { id, at: [x, y, z] (z: a roof's top), via: [[x, y, z]...] (the way up,
// for the bot: a climbable crate, a stair) }. A spot not yet found lies there as a token pickup; found, it is in the
// save's collectibles for good, pays the set's reward, and the last one of a set pays its bonus too.
//   const C = new Collectibles({ combat, save });  C.place()  ·  C.found(pickup) -> { id, set, reward, all } | null
import { declare, all, get } from '../core/registry.js';
import { shape } from '../core/schema.js';
import { BUS } from '../core/bus.js';

declare('collectibles', (spec, id) => {
  const out = shape({ name: { type: 'string', req: true }, spots: { type: 'array', req: true }, reward: { type: 'number', def: 100 }, bonus: { type: 'number', def: 0 } })(spec, id), ids = new Set();
  for (const [i, s] of (spec.spots || []).entries()) { if (!s || typeof s.id !== 'string' || !Array.isArray(s.at)) out.push(`spot ${i} needs { id, at: [x, y, z] }`); else if (ids.has(s.id)) out.push(`spot "${s.id}" twice`); else ids.add(s.id); }
  return out;
});

export class Collectibles {
  /** o: { combat (its pickups), save (collectibles: the ids found) } */
  constructor(o) { this.combat = o.combat; this.save = o.save; this.placed = []; }
  /** every spot not found yet laid out as a token */
  place() {
    for (const set of all('collectibles')) for (const s of set.spots) {
      if (this.save.collectibles.includes(s.id)) continue;
      const k = this.combat.pickups.place({ kind: 'token', item: set.id, id: s.id, x: s.at[0], y: s.at[1], z: s.at[2] || 0, respawn: 0 }); this.placed.push(k);
    }
    return this;
  }
  /** a token taken: recorded, its reward (and the set's bonus with the last one) */
  found(k) {
    if (k.kind !== 'token' || this.save.collectibles.includes(k.id)) return null;
    const set = get('collectibles', k.item); this.save.collectibles.push(k.id);
    const left = set ? set.spots.filter(s => !this.save.collectibles.includes(s.id)).length : 0;
    BUS.emit('collectible', { id: k.id });
    return { id: k.id, set: k.item, reward: set ? set.reward : 0, all: set && !left ? set.bonus : 0, left, of: set ? set.spots.length : 0 };
  }
  /** the spots of every set (found or not) */
  static spots() { return all('collectibles').flatMap(c => c.spots.map(s => ({ ...s, set: c.id }))); }
}
