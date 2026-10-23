// The weapons registry (PLAN.md 8.12): def('weapons', id, spec) from the game's content. A weapon is data: its slot on
// the wheel, what it fires (projectile), how hard and how fast (damage a hit, rate a second, pellets a shot), its
// magazine and reload, spread (degrees either side), range (u), projectile speed (u/s), splash radius (u), and its
// presentation (model, sound, recoil, rumble), price and unlock. The range's DPS check uses sustainedDps.
import { declare } from '../core/registry.js';
import { shape } from '../core/schema.js';

export const SLOTS = ['melee', 'pistol', 'smg', 'shotgun', 'heavy', 'thrown', 'special'];
export const PROJECTILES = ['melee', 'bullet', 'pellets', 'rocket', 'molotov', 'grenade', 'stream', 'zap', 'photo'];
declare('weapons', shape({
  name: { type: 'string', req: true }, slot: { type: 'string', req: true, oneOf: SLOTS }, projectile: { type: 'string', req: true, oneOf: PROJECTILES },
  damage: { type: 'number', def: 0, min: 0 }, rate: { type: 'number', def: 1, min: .05, max: 30 }, pellets: { type: 'number', def: 1, min: 1 },
  mag: { type: 'number', def: 0, min: 0 }, reload: { type: 'number', def: 0, min: 0 }, spread: { type: 'number', def: 0, min: 0, max: 45 },
  range: { type: 'number', def: 300, min: 0 }, speed: { type: 'number', def: 900, min: 0 }, splash: { type: 'number', def: 0, min: 0 },
  ammo: { type: 'number', def: 0, min: 0 }, price: { type: 'number', def: 0, min: 0 }, unlock: { type: 'string', def: '' },
  model: { type: 'string', def: '' }, sound: { type: 'string', def: '' }, recoil: { type: 'number', def: 0 }, rumble: { type: 'number', def: 0 },
  twoHanded: { type: 'boolean', def: false }, fuse: { type: 'number', def: 0 }, burn: { type: 'number', def: 0 }, chain: { type: 'number', def: 0 }, stun: { type: 'number', def: 0 },
  keep: { type: 'boolean', def: false },   // (kept when NABBED: a job's tool, not a weapon the police take)
}));
/** a weapon's damage a second held on a target for a long time, reloads included (the range's check) */
export function sustainedDps(w) {
  const perShot = w.damage * (w.pellets || 1);
  if (!w.mag || !w.reload) return perShot * w.rate;
  return perShot * w.mag / (w.mag / w.rate + w.reload);
}
