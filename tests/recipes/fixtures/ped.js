// The ped recipe's fixture (docs/CONTENT-GUIDE.md, "A ped"), as src/game/peds/knife-grinder.js: a crowd archetype of the
// Brickyard's, picked by its weight among the others there; each one's look drawn from its palettes.
// tests/recipes/ped.test.mjs bundles it in.
import { def } from '../../motor/index.js';

def('peds', 'knife-grinder', {
  name: 'Knife grinder', kind: 'civilian', weight: 40, zones: ['brick'], times: ['day', 'night'], builds: ['chibi', 'heroic'],
  outfits: ['coat'], sleeves: ['long'], hairs: ['long', 'short'], hats: [{ style: 'cap', color: '#c8423a' }, null],
  palettes: { cloth: ['#3a6ac8', '#c8a03a'], coat: ['#5a3a2a', '#2a2a30'], pants: ['#2a2a30'] }, traits: { brave: .05, pace: .8, idles: ['chat'] },
});
