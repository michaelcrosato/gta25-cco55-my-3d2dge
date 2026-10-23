// The outfit recipe's fixture (docs/CONTENT-GUIDE.md, "An outfit"), as src/game/outfits/track-suit.js: a fourth look
// for each of the crew (pushed onto each character's outfits, its name onto outfitNames: the same index for all
// three), and Threads selling it (an outfit item names that index). This file loads after src/game/characters/ and
// src/game/economy.js, by path. tests/recipes/outfit.test.mjs bundles it in.
import { get } from '../../motor/index.js';

for (const id of ['dex', 'viv', 'gus']) {
  const ch = get('characters', id), base = ch.outfits[0];
  ch.outfits.push({ ...base, outfit: 'shirt', sleeves: 'long', hat: null, colors: { ...base.colors, cloth: '#2a8a5a', pants: '#2a8a5a', boot: '#e8e8ec', belt: '#f0f0f0' } });
  ch.outfitNames.push('Track Suit');
}
get('shops', 'threads').items.push({ id: 'outfit3', name: 'Track suit', kind: 'outfit', item: 3, price: 750 });
