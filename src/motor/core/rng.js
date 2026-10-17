// Gameplay randomness (PLAN.md 7.3): named streams, each E.rng (mulberry32) seeded from hash(world seed, name), so one
// system's draws never shift another's, and a new feature takes a new stream instead of disturbing old rolls. Cosmetic
// randomness (particles, blinks) may use Math.random in render code only; the simulation never does (ESLint holds it).
import { E } from '../engine.js';

/** FNV-1a over the parts' text: a 32-bit seed */
export function hash32(...parts) {
  let h = 0x811c9dc5;
  for (const p of parts) { const s = String(p); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } h ^= 0xff; h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function stream(seed) {
  const next = E.rng(seed);
  return {
    seed, next,
    /** a number in [a, b) */ range: (a, b) => a + (b - a) * next(),
    /** a whole number in [a, b] */ int: (a, b) => a + Math.floor((b - a + 1) * next()),
    /** one item of a list */ pick: list => list[Math.floor(next() * list.length)],
    /** true with probability p */ chance: p => next() < p,
    /** an item by weight: pickW([[item, weight], ...]) */
    pickW(pairs) { let t = 0; for (const p of pairs) t += p[1]; let r = next() * t; for (const p of pairs) if ((r -= p[1]) < 0) return p[0]; return pairs[pairs.length - 1][0]; },
    /** a child stream (a feature's own rolls inside a system) */
    sub: name => stream(hash32(seed, name)),
  };
}
let world = 1;
const streams = new Map();
export const RNG = {
  /** start a world: every stream restarts from (seed, its name) */
  seed(s) { world = s >>> 0; streams.clear(); return world; },
  get worldSeed() { return world; },
  /** the named stream ('traffic', 'peds', 'police', 'gangs', 'loot', 'missions', 'weather', 'spawn', 'attract') */
  stream(name) { let st = streams.get(name); if (!st) streams.set(name, st = stream(hash32(world, name))); return st; },
};
