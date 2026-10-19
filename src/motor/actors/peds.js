// The peds registry (PLAN.md 9.8): the archetypes the crowd, the traffic's drivers and the services are made from.
// def('peds', id, spec):
//   { name, kind ('civilian' | 'gang' | 'service' | 'special'), faction, weight, zones (neighbourhood ids; none: all),
//     times (['day', 'night']), build / builds, outfits, sleeves, hairs, hats (a hat or null each), size,
//     palettes: { skin, hair, cloth, coat, pants, boot } (each a list: one is picked per ped, so no two look alike),
//     traits: { tough (0..1: fights back when hurt or jacked), brave (0..1: stands rather than flees), phone (0..1:
//     calls the police when it sees a crime), pace (a walking speed factor), idles: ['phone', 'chat', 'bench', 'shop',
//     'cab', 'smoke', 'dance'] }, weapons, uniform (true: the palettes' first entries, always), health, armor }
// pedLook(spec, rng) makes one look from an archetype; pickPed(rng, filter) picks an archetype by weight.
import { declare, all } from '../core/registry.js';
import { shape } from '../core/schema.js';

declare('peds', shape({
  name: { type: 'string', req: true }, kind: { type: 'string', def: 'civilian', oneOf: ['civilian', 'gang', 'service', 'special', 'cast'] },
  faction: { type: 'string', def: 'civilian' }, weight: { type: 'number', def: 1, min: 0 }, zones: { type: 'array', def: [] },
  times: { type: 'array', def: ['day', 'night'] }, builds: { type: 'array', def: ['heroic', 'chibi'] }, outfits: { type: 'array', def: ['shirt'] },
  sleeves: { type: 'array', def: ['short'] }, hairs: { type: 'array', def: ['short'] }, hats: { type: 'array', def: [null] }, size: { type: 'number', def: .9 },
  palettes: { type: 'object', def: {} }, traits: { type: 'object', def: {} }, weapons: { type: 'array', def: ['fists'] }, uniform: { type: 'boolean', def: false },
  health: { type: 'number', def: 0, min: 0 }, armor: { type: 'number', def: 0, min: 0 },   // (0: the spawner's default)
  look: { type: 'object', def: null },   // (the story cast's own look: the protagonists' detailed rig, never picked from palettes)
}));

const SKIN = ['#e8c0a0', '#c8906a', '#a8724e', '#8a5a3a', '#5a3a2a', '#f0d0b0'];
const HAIR = ['#1e1a22', '#3a2a1e', '#6a4a2a', '#c8a050', '#8a8a90', '#d8d8dc', '#8a2a1e'];
const BOOT = ['#18161c', '#3a2a1e', '#5a4a3a', '#e8e8ec'];
/** the traits every archetype starts from */
export const TRAITS = { tough: .15, brave: .1, phone: .5, pace: 1, idles: ['phone', 'chat', 'shop'] };

/** one look from an archetype: a classic rig (D13: the crowd's style), each colour picked from its palette */
export function pedLook(spec, rng) {
  const P = spec.palettes || {}, pick = (l, d) => { const a = l && l.length ? l : d; return spec.uniform ? a[0] : a[Math.floor(rng.next() * a.length)]; };
  const cloth = pick(P.cloth, ['#c84a3a', '#3a6ac8', '#e8c040', '#3a8a5a', '#8a3a8a', '#e0e0e4']);
  const hat = pick(spec.hats, [null]);
  return {
    build: pick(spec.builds, ['heroic']), size: spec.size || .9, outfit: pick(spec.outfits, ['shirt']), sleeves: pick(spec.sleeves, ['short']),
    hair: pick(spec.hairs, ['short']), hat: hat ? { ...hat } : null, style: 'classic',
    colors: { skin: pick(P.skin, SKIN), hair: pick(P.hair, HAIR), cloth, coat: pick(P.coat, [shade(cloth)]), pants: pick(P.pants, ['#2a3048', '#3a3a3a', '#5a4a3a', '#2a2a30']), boot: pick(P.boot, BOOT), belt: pick(P.belt, ['#2a2a30', '#5a3a22']) },
  };
}
function shade(hex) { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.round(c * .7)); return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map(f).map(c => c.toString(16).padStart(2, '0')).join(''); }
/** an archetype's traits, with the defaults filled in */
export const traitsOf = spec => ({ ...TRAITS, ...(spec && spec.traits) });
/** an archetype picked by weight among those filter(spec) keeps (null when none) */
export function pickPed(rng, filter = () => true) {
  const c = all('peds').filter(p => p.weight > 0 && filter(p)); if (!c.length) return null;
  let r = rng.next() * c.reduce((a, p) => a + p.weight, 0);
  for (const p of c) if ((r -= p.weight) <= 0) return p;
  return c[c.length - 1];
}
/** does an archetype walk in a neighbourhood at this time of day? */
export const pedFits = (spec, hood, night) => (!spec.zones.length || spec.zones.includes(hood)) && spec.times.includes(night ? 'night' : 'day');
