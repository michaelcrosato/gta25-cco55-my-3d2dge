// One Lowtown per seed, built once (about 80 ms) and kept across scene changes: the play scene's city and the title's
// fly-over share it. The seed is the deep link's (?seed=), 1999 by default.
import { buildCity, CityRenderer } from '../../motor/index.js';

const cache = new Map();
/** a district's city and its renderer for a seed, kept per district: { seed, city, render } (Lowtown's for the game and
 *  the title; the Proving Ground's lab, District 2) */
export function cityFor(id, seed) { const c = cache.get(id); if (c && c.seed === seed) return c; const city = buildCity(id, seed), out = { seed, city, render: new CityRenderer(city) }; cache.set(id, out); return out; }
/** Lowtown's for a seed */
export const lowtown = seed => cityFor('lowtown', seed);
/** the seed a page asks for */
export const citySeed = links => +(links.query.get('seed') || 1999);
