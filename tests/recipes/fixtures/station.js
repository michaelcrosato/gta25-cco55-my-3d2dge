// The station recipe's fixture (docs/CONTENT-GUIDE.md, "A radio station"), as src/game/radio/brick-fm.js: a fifth
// station on the dial, its music the composer's (a genre and a seed: no notes to write), its DJ's lines, its ads (one
// of its own) and its jingle. tests/recipes/station.test.mjs bundles it in.
import { def } from '../../motor/index.js';

def('radioAds', 'mortar-mart', { name: 'MORTAR MART', lines: ['Mortar Mart. We hold it all together.', 'Bricks by the pallet, grout by the bucket.'] });
def('stations', 'brickfm', {
  name: 'BRICK FM', freq: '93.3', dj: 'Rusty', genre: 'boom-bap', color: '#c86a3a', seed: 933,
  about: 'Shift-change beats from the Brickyard.',
  songs: [{ title: 'Rivets and Rhymes', artist: 'MC Mortar' }, { title: 'Overtime', artist: 'The Night Shift' }],
  djLines: ['Rusty on BRICK FM. Punch in, turn up.', 'BRICK FM: music to weld to.'],
  ads: ['mortar-mart', 'kwiklux'], jingle: 'Ninety-three point three. BRICK FM.',
});
