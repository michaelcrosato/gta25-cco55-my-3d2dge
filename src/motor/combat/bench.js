// The weapons bench (PLAN.md 8.12's accept, the Proving Ground's range): a fight of its own, away from any scene, that
// measures what a weapon really deals. A shooter at its starting stats locks on to an anchored dummy that can't burn or
// die, holds the trigger (taps it for a semi-automatic, presses on for a combo) for some seconds of fixed steps, and
// the dummy's lost health over the time is the DPS, set against the spec's (sustainedDps: rate, magazine and reloads;
// damage x rate for melee). Each weapon is measured at a distance its spread lands every shot at (BENCH_RANGE).
//   measureDps('buzzsaw') -> { weapon, dps, spec, ratio, hits, fired, seconds }
import { E } from '../engine.js';
import { get } from '../core/registry.js';
import { RNG } from '../core/rng.js';
import { sustainedDps } from './weapons.js';
import { Combat } from './combat.js';
import { Ped } from '../actors/ped.js';
import { makeIntent, clearIntent } from '../sim/intent.js';

/** the distance (units) each kind of weapon is measured at: close enough for its spread to land every shot */
export const BENCH_RANGE = { melee: 14, bullet: 40, pellets: 24, stream: 50, zap: 60 };
/** the weapons whose damage a bench can measure as a rate (explosives and the camera have their own tests) */
export const benchable = spec => spec && spec.damage > 0 && ['melee', 'bullet', 'pellets', 'stream'].includes(spec.projectile);

/** measure a weapon: o { seconds (without a magazine: default 20), distance, seed } */
export function measureDps(weapon, o = {}) {
  const spec = get('weapons', weapon); if (!benchable(spec)) return null;
  RNG.seed(o.seed ?? 7);
  const map = new E.TileMap({ w: 40, h: 20 }), d = o.distance ?? BENCH_RANGE[spec.projectile] ?? 40, y = 10 * 16;
  const C = new Combat({ map, fire: false });
  const me = C.add(new Ped({ x: 8 * 16, y, faction: 'crew', weapons: [weapon], ammo: { [weapon]: 100000 }, look: { build: 'heroic' } }));
  me.inv.select(weapon); me.inv.cool = 0; me.inv.reloading = 0;
  const dummy = C.add(new Ped({ x: 8 * 16 + d, y, faction: 'range', maxHealth: 1e9, anchored: true, look: { build: 'heroic', style: 'classic' } }));
  dummy.ignite = () => {};   // (the flame's own damage only, not the burning after it)
  // a magazine weapon is measured over whole cycles from an empty magazine (a reload, then a magazine's worth, five
  // times), so the start's full magazine doesn't flatter it; the rest over o.seconds. Shots still in the air land after
  const cycle = spec.mag && spec.reload ? spec.mag / spec.rate + spec.reload : 0, seconds = cycle ? 5 * cycle : (o.seconds ?? 20);
  if (cycle) { me.inv.mag[weapon] = 0; me.inv.reloading = spec.reload; }
  const I = makeIntent(), idle = makeIntent(), dt = 1 / 120, steps = Math.round(seconds / dt), W = { map, combat: C, aim: { candidates: [dummy], toScreen: (a, b, c) => [a, b - c], level: 'standard' } };
  const before = dummy.vitals.health;
  for (let i = 0; i < steps + 60; i++) {
    const firing = i < steps;
    clearIntent(I); I.down.aim = true; I.aim = [1, 0]; I.down.attack = firing; I.tap.attack = firing;   // (a tap every step: as fast as the weapon allows)
    me.update(dt, I, W); dummy.update(dt, clearIntent(idle), W); C.update(dt);
  }
  const dealt = before - dummy.vitals.health, dps = dealt / seconds;
  const want = spec.projectile === 'melee' ? spec.damage * spec.rate : sustainedDps(spec);
  return { weapon, dps: +dps.toFixed(2), spec: +want.toFixed(2), ratio: +(dps / want).toFixed(3), hits: C.shots.hits, fired: C.shots.fired, seconds };
}
