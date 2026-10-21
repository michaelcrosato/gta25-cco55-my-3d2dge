// One Lowtown per seed, built once (about 80 ms) and kept across scene changes: the play scene's city and the title's
// fly-over share it. The seed is the deep link's (?seed=), 1999 by default.
import { buildCity, CityRenderer } from '../../motor/index.js';

let cached = null;
/** the city and its renderer for a seed: { seed, city, render } */
export function lowtown(seed) { if (!cached || cached.seed !== seed) { const city = buildCity('lowtown', seed); cached = { seed, city, render: new CityRenderer(city) }; } return cached; }
/** the seed a page asks for */
export const citySeed = links => +(links.query.get('seed') || 1999);
