// The station recipe's fixture (docs/CONTENT-GUIDE.md, "A radio station"), as src/game/radio/brick-fm.js: another
// station on the dial, its music the composer's (a genre of its own and a seed: no notes to write), its DJ's lines,
// its ads (one of its own) and its jingle. tests/recipes/station.test.mjs bundles it in.
import { def } from '../../motor/index.js';

def('genres', 'shift-blues', { bpm: [96, 104], scale: 'blues', roots: ['E', 'A'], progs: [[0, 0, 2, 0], [3, 3, 0, 0], [4, 3, 0, 4]],
  bass: { wave: 'triangle', rhythm: 'x..x..x.x..x..x.', vol: .24, low: true },
  drums: { intro: 'k.......s.......', verse: 'k..hs.h.k..hs.h.', chorus: 'k.hhs.hhk.hhs.hk', bridge: 'k...s...k...s...' },
  lead: { wave: 'square', lo: 64, hi: 79, rhythm: ['x..x.x..', 'x.x...x.', '.x.x.x..'], leap: 2, vol: .09 },
  keys: { wave: 'triangle', kind: 'chord', vol: .05 }, swing: true, form: [['intro', 2], ['verse', 8], ['chorus', 8], ['verse', 8], ['chorus', 8], ['outro', 2]] });
def('radioAds', 'mortar-mart', { name: 'MORTAR MART', lines: ['Mortar Mart. We hold it all together.', 'Bricks by the pallet, grout by the bucket.'] });
def('stations', 'brickfm', {
  name: 'BRICK FM', freq: '93.3', dj: 'Rusty', genre: 'shift-blues', color: '#c86a3a', seed: 933,
  about: 'Shift-change beats from the Brickyard.',
  songs: [{ title: 'Rivets and Rhymes', artist: 'MC Mortar' }, { title: 'Overtime', artist: 'The Night Shift' }],
  djLines: ['Rusty on BRICK FM. Punch in, turn up.', 'BRICK FM: music to weld to.'],
  ads: ['mortar-mart', 'kwiklux'], jingle: 'Ninety-three point three. BRICK FM.',
});
