// What a body carries (PLAN.md 8.12): every weapon it owns, sorted into the wheel's slots (GTA V: a slot holds all of
// its kind, slots[slot] is the one it shows), the ammo for each, the round in the magazine, the reload, and the
// cooldown between shots. Fists are always there, apart from the slots (a bat doesn't cost the fists). The weapon specs
// come from the 'weapons' registry; this is the state, saved per protagonist (weapons and ammo).
//   const inv = new Inventory(['fists', 'snub38'], { snub38: 24 });  inv.select('snub38')
//   inv.trigger(dt, held, tapped) -> how many shots to fire this step (0 while reloading or cooling down)
import { get } from '../core/registry.js';
import { SLOTS } from './weapons.js';

export class Inventory {
  /** weapons: ids; ammo: { id: rounds held, the magazine included } */
  constructor(weapons = ['fists'], ammo = {}) {
    this.owned = []; this.slots = {}; this.ammo = {}; this.mag = {}; this.current = 'fists'; this.cool = 0; this.reloading = 0; this.fired = 0;
    for (const w of weapons) this.give(w, ammo[w] ?? 0, true);
  }
  /** a weapon's spec */
  spec(id = this.current) { return get('weapons', id); }
  has(id) { return id === 'fists' || this.owned.includes(id); }
  /** the weapons owned in a slot, in the registry's order */
  inSlot(slot) { return this.owned.filter(w => get('weapons', w).slot === slot); }
  /** give a weapon (it joins its slot; the slot shows it if it showed nothing) and/or ammo for it. Returns null (kept
   *  for callers that dropped what a slot held, before slots held more than one) */
  give(id, rounds = null, quiet = false) {
    const s = get('weapons', id); if (!s || id === 'fists') return null;
    const fresh = !this.owned.includes(id), old = null;
    if (fresh) { this.owned.push(id); const order = new Map(SLOTS.map((k, i) => [k, i])); this.owned.sort((a, b) => order.get(get('weapons', a).slot) - order.get(get('weapons', b).slot)); }
    if (!this.slots[s.slot]) this.slots[s.slot] = id;
    if (s.mag || s.ammo) {
      this.ammo[id] = (this.ammo[id] || 0) + (rounds ?? s.ammo);
      if (this.mag[id] === undefined) this.mag[id] = s.mag ? Math.min(s.mag, this.ammo[id]) : this.ammo[id];
    }
    if (!quiet && fresh && this.current === 'fists' && s.slot !== 'melee' && s.slot !== 'special') this.select(id);   // (a first gun goes to the hand)
    return old;
  }
  /** weapon ids held, in wheel order */
  list() { return ['fists', ...this.owned]; }
  select(id) {
    if (!this.has(id)) return false;
    if (id !== 'fists') this.slots[get('weapons', id).slot] = id;
    if (this.current !== id) { this.current = id; this.reloading = 0; this.cool = Math.max(this.cool, .25); }
    return true;
  }
  /** the slot's next (dir 1) or previous weapon: what the slot shows (the wheel's d-pad left and right) */
  cycleSlot(slot, dir) { const l = this.inSlot(slot); if (l.length < 2) return this.slots[slot] || null; const i = l.indexOf(this.slots[slot]); this.slots[slot] = l[(i + dir + l.length) % l.length]; return this.slots[slot]; }
  /** the next or previous weapon held (d-pad left and right) */
  cycle(dir) { const l = this.list(), i = l.indexOf(this.current); this.select(l[(i + dir + l.length) % l.length]); return this.current; }
  /** rounds in the magazine and held in all, for the HUD (null for melee) */
  rounds(id = this.current) { const s = this.spec(id); return s && (s.mag || s.ammo) ? { mag: this.mag[id] ?? 0, total: this.ammo[id] ?? 0 } : null; }
  /** can it shoot now (not empty)? */
  loaded(id = this.current) { const s = this.spec(id); if (!s) return false; if (!s.mag && !s.ammo) return true; return (this.mag[id] ?? 0) > 0; }
  /** start a reload (refused when full, or nothing is left to load) */
  reload() {
    const id = this.current, s = this.spec(); if (!s || !s.mag || this.reloading > 0) return false;
    const inMag = this.mag[id] ?? 0, left = (this.ammo[id] ?? 0) - inMag; if (inMag >= s.mag || left <= 0) return false;
    this.reloading = s.reload; return true;
  }
  /** step the trigger: held (automatic fire), tapped (semi-automatic: a press). Returns how many shots to fire now, and
   *  takes the rounds. A dry magazine reloads by itself, once the last shot has cycled */
  trigger(dt, held, tapped) {
    const id = this.current, s = this.spec(); if (!s) return 0;
    this.cool -= dt;   // (it may run below 0 within a step, so a fast weapon keeps its exact rate between steps)
    if (this.reloading > 0) {
      this.cool = Math.max(0, this.cool); this._tap = 0;   // (a press during a reload isn't kept for after it)
      this.reloading -= dt;
      if (this.reloading <= 0) { this.reloading = 0; this.mag[id] = Math.min(s.mag, this.ammo[id] ?? 0); }
      return 0;
    }
    // a dry magazine reloads by itself once its last shot has cycled (so a magazine and its reload take mag / rate + reload)
    if (s.mag && !this.loaded(id) && (this.ammo[id] ?? 0) > 0 && this.cool <= 0) { this.cool = 0; this.reload(); return 0; }
    const auto = s.rate >= 6;   // (SMGs, the flamethrower: hold to fire; the rest fire a shot a press, faster when tapped)
    if (tapped) this._tap = .3; else this._tap = Math.max(0, (this._tap || 0) - dt);   // (a press while cooling down fires when it can)
    if (!(auto ? held : (this._tap > 0 || held))) { this.cool = Math.max(0, this.cool); return 0; }
    let n = 0;
    while (this.cool <= 0 && this.loaded(id)) {
      n++; this.cool += 1 / s.rate; this.fired++; this._tap = 0;
      if (s.mag || s.ammo) { this.mag[id]--; this.ammo[id]--; }
      if (!auto) break;
    }
    return n;
  }
  /** the save's part: weapons and ammo */
  toJSON() { return { weapons: this.list(), ammo: { ...this.ammo }, current: this.current }; }
}
