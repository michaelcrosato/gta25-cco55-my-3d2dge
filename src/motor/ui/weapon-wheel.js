// The weapon wheel (PLAN.md 8.18, M3's UI first pass): hold L1 (Q) and the wheel opens on the weapons a ped carries,
// one slot a kind, clockwise from the fists at the top; point with the stick, WASD or the mouse, step through a slot
// holding more than one with the d-pad's left and right, let go to take it.
// The scene slows the game while it is open (TUNE.wheelSlow). wheelPointer is shared with the character wheel.
//   const ww = new WeaponWheel(bindings);  ww.update(realDt, ped, { blocked })  ·  ww.open  ·  ww.draw(g, W, H)
import { TUNE } from '../core/tune.js';
import { get } from '../core/registry.js';
import { Wheel } from './wheel.js';
import { drawWeaponIcon, drawFistIcon } from '../render/weapon-models.js';

/** the wheel's slots, clockwise from the top (fists apart from the melee slot, which holds the bat) */
export const WHEEL_SLOTS = ['fists', 'pistol', 'smg', 'shotgun', 'heavy', 'special', 'thrown', 'melee'];

/** where a wheel is pointed: the stick (or WASD); the mouse by how far it moved since the wheel opened (o.from: its
 *  point then, kept by the caller) */
export function wheelPointer(game, B, from) {
  const dir = B.direction('onFoot', 'LS'), m = game.input.mouse && game.input.mouse.active && game.input.mouseScreen ? game.input.mouseScreen() : null;
  const md = m && from ? [(m[0] - from[0]) / 24, (m[1] - from[1]) / 24] : null;
  return { dir: md && Math.hypot(md[0], md[1]) > .5 ? md : dir, mouse: m };
}

export class WeaponWheel {
  constructor(bindings) { this.B = bindings; this.wheel = new Wheel({ title: 'WEAPONS' }); this.hold = 0; this.from = null; }
  get open() { return this.wheel.open; }
  /** the slots for a ped's inventory, and the one in hand */
  items(p) {
    const inv = p.inv, items = WHEEL_SLOTS.map(slot => {
      const id = slot === 'fists' ? 'fists' : inv.slots[slot], spec = id && get('weapons', id), rd = id && inv.rounds(id);
      const n = slot === 'fists' ? 1 : inv.inSlot(slot).length, more = n > 1 ? `  ${inv.inSlot(slot).indexOf(id) + 1}/${n}` : '';
      return { id: id || slot, slot, label: spec ? spec.name : slot.toUpperCase(), short: slot, disabled: !id, color: '#ffe066',
        sub: (rd ? (spec.mag ? `${rd.mag} / ${Math.max(0, rd.total - rd.mag)}` : `${rd.total}`) : '') + more,
        icon: (g, x, y, r, on) => { if (!spec) return; if (spec.model) drawWeaponIcon(g, spec.model, x, y, r / 7, on ? {} : { color: '#9a90b8' }); else drawFistIcon(g, x, y, r / 9); } };
    });
    return { items, sel: Math.max(0, items.findIndex(i => i.id === inv.current)) };
  }
  /** step (real seconds): open after the hold, point, pick on release. o: { game (for the mouse), blocked (it can't
   *  open now: a switch, a menu) } */
  update(real, p, o = {}) {
    const held = this.B.down('wheel', 'onFoot') && !o.blocked && p && !p.dead;
    if (held) { this.hold += real; if (!this.wheel.open && this.hold >= TUNE.wheelHold) { const w = this.items(p); this.wheel.show(w.items, w.sel); this.from = null; } }
    else { if (this.wheel.open) { const it = this.wheel.hide(); if (it && p) p.inv.select(it.id); } this.hold = 0; this.from = null; }
    if (this.wheel.open && o.game) { const ptr = wheelPointer(o.game, this.B, this.from); if (ptr.mouse && !this.from) this.from = ptr.mouse; this.wheel.update(real, { dir: ptr.dir }); }
    // a slot holding more than one: d-pad left and right step through it
    const cur = this.wheel.open && this.wheel.current, step = this.B.tap('weaponNext', 'onFoot') ? 1 : this.B.tap('weaponPrev', 'onFoot') ? -1 : 0;
    if (cur && step && cur.slot !== 'fists' && p.inv.inSlot(cur.slot).length > 1) { p.inv.cycleSlot(cur.slot, step); const w = this.items(p); this.wheel.items = w.items; }
    return this.wheel.open;
  }
  draw(g, W, H) { this.wheel.draw(g, W, H); }
}
