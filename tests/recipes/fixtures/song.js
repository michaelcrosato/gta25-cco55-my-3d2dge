// The song recipe's fixture (docs/CONTENT-GUIDE.md, "A song"), as src/game/songs/night-bus.js: a song written by hand
// in the engine's note syntax (a token a step: a note, '-' holds it, '.' rests, '|' a bar line; on the drums track
// k s h o c t), played on NEON DRIVE after the songs its composer writes. tests/recipes/song.test.mjs bundles it in.
import { def } from '../../motor/index.js';

const BARS = n => s => Array.from({ length: n }, () => s).join(' | ');
def('songs', 'night-bus', {
  title: 'Night Bus', artist: 'Lowtown Lo-Fi', station: 'neon', bpm: 92, steps: 4,
  tracks: [
    { wave: 'square', vol: .1, notes: BARS(2)('E4 - - G4 - - B4 - A4 - - G4 - E4 - -') + ' | ' + BARS(2)('D4 - - F#4 - - A4 - G4 - - F#4 - D4 - -') },
    { wave: 'triangle', vol: .22, notes: BARS(2)('E2 - - - - - - - E2 - - - B1 - - -') + ' | ' + BARS(2)('D2 - - - - - - - D2 - - - A1 - - -') },
    { wave: 'drums', vol: .3, notes: BARS(4)('k . h . s . h . k k h . s . h o') },
  ],
});
