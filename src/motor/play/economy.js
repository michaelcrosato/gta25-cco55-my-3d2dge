// The economy (PLAN.md 8.16): the crew's cash, the shops and the properties. Cash comes from missions, jobs, hold-ups,
// stunts, cash pickups and the properties; it goes on the shops' items, resprays, cabs, fees and donations.
//   - a shop (def('shops')) stands at a point of interest and sells items: { id, name, kind, item, amount, price } with
//     price a number or a TUNE knob's name (every price is a knob, PLAN.md 9.10). Kinds: 'weapon' (with its ammo),
//     'ammo', 'armor' (to full), 'health' (to full), 'snack' (amount healed), 'mod' (item: armor | nitro | oil | mines |
//     roofMG | bomb, on the vehicle driven in), 'paint' (item: a colour, on it), 'repair', 'outfit' (item: its index);
//     buying is ✕, with a confirm above CONFIRM_ABOVE;
//   - a property (def('properties')) is bought once at its point of interest, then pays its income into a till at
//     every in-game midnight (up to its cap), collected by walking up to it;
//   - the save keeps what is owned: properties [{ id, till }], the crew fund (fund.get / fund.add).
// Deterministic: no randomness; only the save and the actors it is given are touched.
//   const X = new Economy({ save, fund: { get, add(n, why) } });  X.buy(shop, item, { ped, vehicle })  ·  X.midnight()
import { declare } from '../core/registry.js';
import { shape } from '../core/schema.js';
import { TUNE } from '../core/tune.js';
import { BUS } from '../core/bus.js';

export const CONFIRM_ABOVE = 5000;
export const ITEM_KINDS = ['weapon', 'ammo', 'armor', 'health', 'snack', 'mod', 'paint', 'repair', 'outfit'];
const itemsOk = (items, id) => (Array.isArray(items) ? items.flatMap((it, i) => (!it || typeof it.id !== 'string' ? [`item ${i} needs an id`] : !ITEM_KINDS.includes(it.kind) ? [`item "${it.id}": kind "${it.kind}" (${ITEM_KINDS.join(', ')})`] : typeof it.price !== 'number' && typeof it.price !== 'string' ? [`item "${it.id}" needs a price`] : [])) : [`shop ${id}: items should be an array`]);
const shopShape = shape({ name: { type: 'string', req: true }, poi: { type: 'string', req: true }, items: { type: 'array', def: [] }, drive: { type: 'boolean', def: false }, holdup: { type: 'boolean', def: false }, color: { type: 'string', def: '#ffe066' } });
declare('shops', (spec, id) => [...shopShape(spec, id), ...itemsOk(spec.items, id)]);
declare('properties', shape({ name: { type: 'string', req: true }, poi: { type: 'string', req: true }, price: { type: 'any', req: true }, income: { type: 'any', req: true }, cap: { type: 'any', def: 0 }, district: { type: 'string', def: 'lowtown' } }));   // (district: where its door is, EXPANSION.md 2.1)

/** a price, an income, a cap: a number, or a TUNE knob's name */
export const amountOf = v => (typeof v === 'string' ? TUNE[v] ?? 0 : v || 0);

export class Economy {
  /** o: { save (properties), fund: { get() -> cash, add(n, why) } } */
  constructor(o) { this.save = o.save; this.fund = o.fund; }
  get cash() { return this.fund.get(); }
  /** the price of an item */
  price(it) { return Math.round(amountOf(it.price)); }
  /** can it be bought now: { ok, reason ('cash' | 'have' | 'full' | 'vehicle' | 'none'), price, confirm } */
  check(it, ctx = {}) {
    const price = this.price(it), p = ctx.ped, v = ctx.vehicle, out = (ok, reason = null) => ({ ok, reason, price, confirm: ok && price > CONFIRM_ABOVE });
    if (this.cash < price) return out(false, 'cash');
    switch (it.kind) {
      case 'weapon': return out(!!p);
      case 'ammo': return !p || !p.inv.has(it.item) ? out(false, 'none') : out(true);
      case 'armor': return !p || p.vitals.armor >= 100 ? out(false, 'full') : out(true);
      case 'health': case 'snack': return !p || p.vitals.health >= p.vitals.maxHealth ? out(false, 'full') : out(true);
      case 'mod': return !v ? out(false, 'vehicle') : modHas(v, it) ? out(false, 'have') : out(true);
      case 'paint': return !v ? out(false, 'vehicle') : v.color === it.item ? out(false, 'have') : out(true);
      case 'repair': return !v ? out(false, 'vehicle') : v.damage.share >= 1 && !v.flats ? out(false, 'full') : out(true);
      case 'outfit': return !p ? out(false, 'none') : out(true);
      default: return out(false, 'none');
    }
  }
  /** buy an item for ctx ({ ped, vehicle, outfit(index) }): paid and applied, or refused: { ok, reason, price } */
  buy(shopId, it, ctx = {}) {
    const c = this.check(it, ctx); if (!c.ok) return c;
    this.fund.add(-c.price, 'shop:' + shopId); apply(it, ctx);
    BUS.emit('purchase', { shop: shopId, item: it.id, price: c.price });
    return { ok: true, price: c.price };
  }
  // ---- properties
  owned(id) { return this.save.properties.find(q => q.id === id) || null; }
  /** buy a property: { ok, reason ('cash' | 'have'), price } */
  buyProperty(id, spec) {
    const price = Math.round(amountOf(spec.price)); if (this.owned(id)) return { ok: false, reason: 'have', price };
    if (this.cash < price) return { ok: false, reason: 'cash', price };
    this.fund.add(-price, 'property:' + id); this.save.properties.push({ id, till: 0 });
    BUS.emit('property', { id, price });
    return { ok: true, price };
  }
  /** midnight: every property's income into its till, up to its cap */
  midnight(specs) {
    for (const q of this.save.properties) { const s = specs(q.id); if (!s) continue; const cap = amountOf(s.cap) || Infinity; q.till = Math.min(cap, (q.till || 0) + Math.round(amountOf(s.income))); }
  }
  /** the till emptied into the crew fund: how much */
  collect(id) { const q = this.owned(id); if (!q || !q.till) return 0; const n = q.till; q.till = 0; this.fund.add(n, 'property:' + id); return n; }
}
const modHas = (v, it) => { const m = v.mods, k = it.item; return k === 'armor' || k === 'roofMG' ? !!m[k] : k === 'bomb' ? !!m.bomb : (m[k] || 0) >= 3; };
// what an item does
function apply(it, ctx) {
  const p = ctx.ped, v = ctx.vehicle;
  switch (it.kind) {
    case 'weapon': p.inv.give(it.item, it.amount ?? null); break;
    case 'ammo': p.inv.give(it.item, it.amount || 30, true); break;
    case 'armor': p.vitals.armor = 100; break;
    case 'health': p.vitals.health = p.vitals.maxHealth; break;
    case 'snack': p.vitals.heal(it.amount || 25); break;
    case 'mod': { const m = v.mods, k = it.item; if (k === 'armor') { m.armor = true; v.damage.max *= 1.5; v.damage.health = Math.min(v.damage.max, v.damage.health * 1.5); } else if (k === 'roofMG') m.roofMG = true; else if (k === 'bomb') m.bomb = it.amount || 'ignition'; else m[k] = Math.min(3, (m[k] || 0) + (it.amount || 3)); break; }
    case 'paint': v.color = it.item; break;
    case 'repair': v.damage.repair(); v.flats = 0; if (v.body) v.body.flat = 0; break;
    case 'outfit': if (ctx.outfit) ctx.outfit(it.item); break;
  }
}
