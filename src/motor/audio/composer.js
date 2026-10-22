// The composer (PLAN.md 8.17): a genre's template and a seed make a song in the engine's note syntax, so each station
// has music of its own with no sound file. A template: the tempo, the scale, chord progressions (scale degrees, a bar
// each), the bass's rhythm, the drums' patterns by section, the lead's instrument, range, rhythm and leaps, an arp or
// pad, and the arrangement (intro, verse, chorus, bridge, outro, in bars). The same genre and seed make the same song.
//   compose(genre, seed) -> { title, genre, bpm, steps, tracks }  ·  GENRES (the four stations' templates)
const SCALE = { minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], major: [0, 2, 4, 5, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10] };
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const nameOf = midi => NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);   // (60 -> C4)
const ROOTS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** the stations' genres (PLAN.md 9.9) */
export const GENRES = {
  'synth-punk': { bpm: [164, 178], scale: 'minor', roots: ['E', 'A', 'D', 'B'], progs: [[0, 5, 2, 6], [0, 3, 4, 4], [0, 6, 5, 4]], bass: { wave: 'triangle', rhythm: 'x.x.x.x.x.x.x.x.', vol: .2 },
    drums: { intro: 'k...h...s...h...', verse: 'k.h.s.h.k.k.s.h.', chorus: 'k.o.s.o.k.okskso', bridge: 'k...s...k.k.s...' }, lead: { wave: 'square', lo: 64, hi: 81, rhythm: ['x.x.x.xx', 'x..x..x.', 'xx.x.x.x'], leap: 3, vol: .1 },
    keys: { wave: 'pulse', kind: 'stab', vol: .06 }, form: [['intro', 2], ['verse', 8], ['chorus', 8], ['verse', 8], ['chorus', 8], ['bridge', 4], ['chorus', 8], ['outro', 2]] },
  'boom-bap': { bpm: [84, 94], scale: 'dorian', roots: ['D', 'G', 'C', 'F'], progs: [[0, 3, 0, 4], [0, 5, 3, 4], [1, 4, 0, 0]], bass: { wave: 'triangle', rhythm: 'x.....x...x.....', vol: .3, low: true },
    drums: { intro: 'k.......s.......', verse: 'k..k..k.s....k..', chorus: 'k.hk.hk.s.h..kh.', bridge: 'k.......s..k....' }, lead: { wave: 'triangle', lo: 67, hi: 79, rhythm: ['x...x.x.', '..x...x.', 'x.x.....'], leap: 2, vol: .12 },
    keys: { wave: 'square', kind: 'chord', vol: .045 }, swing: true, form: [['intro', 2], ['verse', 8], ['chorus', 4], ['verse', 8], ['chorus', 4], ['bridge', 4], ['chorus', 4], ['outro', 2]] },
  synthwave: { bpm: [100, 114], scale: 'minor', roots: ['A', 'F', 'C', 'G'], progs: [[0, 5, 2, 6], [0, 3, 5, 4], [5, 3, 0, 4]], bass: { wave: 'saw', rhythm: 'x.x.x.x.x.x.x.x.', vol: .14, oct: true },
    drums: { intro: 'k.......s.......', verse: 'k...s...k...s...', chorus: 'k.h.s.h.k.h.s.hh', bridge: 'k.......k.......' }, lead: { wave: 'saw', lo: 69, hi: 84, rhythm: ['x...x...', 'x.x.x...', 'x..x..x.'], leap: 4, vol: .08 },
    keys: { wave: 'pulse', kind: 'arp', vol: .06 }, form: [['intro', 4], ['verse', 8], ['chorus', 8], ['verse', 8], ['chorus', 8], ['bridge', 4], ['chorus', 8], ['outro', 4]] },
  talk: { bpm: [92, 96], scale: 'major', roots: ['F', 'C'], progs: [[0, 3, 4, 3]], bass: { wave: 'triangle', rhythm: 'x.......x.......', vol: .16 },
    drums: { intro: 'k.......h.......', verse: 'k...h...k...h...', chorus: 'k...h...k...h...', bridge: 'k...h...k...h...' }, lead: null,
    keys: { wave: 'sine', kind: 'chord', vol: .05 }, form: [['intro', 2], ['verse', 8], ['outro', 2]] },
};
/** a mission's score (m.music(cue)): loops under the action, the radio ducked under them */
export const SCORES = {
  chase: { bpm: [150, 150], scale: 'minor', roots: ['D'], progs: [[0, 0, 5, 6]], bass: { wave: 'saw', rhythm: 'x.xxx.xxx.xxx.xx', vol: .16 },
    drums: { intro: 'k.h.s.h.k.h.s.hh', verse: 'k.hks.h.k.hks.hs', chorus: 'k.hks.h.k.hks.hs', bridge: 'k.hks.h.k.hks.hs' }, lead: { wave: 'pulse', lo: 62, hi: 74, rhythm: ['x.x.x.x.'], leap: 1, vol: .07 },
    keys: { wave: 'square', kind: 'stab', vol: .04 }, form: [['verse', 4], ['chorus', 4]] },
  tension: { bpm: [92, 92], scale: 'minor', roots: ['A'], progs: [[0, 0, 1, 0]], bass: { wave: 'triangle', rhythm: 'x.......x.......', vol: .2 },
    drums: { intro: 'k...............', verse: 'k.......h.......', chorus: 'k.......h.......', bridge: 'k.......h.......' }, lead: null,
    keys: { wave: 'sine', kind: 'chord', vol: .05 }, form: [['verse', 8]] },
};
/** a song: a genre's template (or a score cue's) made particular by the seed (the title is the station's to give) */
export function compose(genre, seed = 1, title = '') {
  const G = GENRES[genre] || SCORES[genre]; if (!G) throw new Error('MOTOR: no genre ' + genre);
  let x = (seed * 2654435761) >>> 0 || 1; const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }, pick = l => l[Math.floor(rnd() * l.length)];
  const bpm = Math.round(G.bpm[0] + rnd() * (G.bpm[1] - G.bpm[0])), root = 48 + ROOTS[pick(G.roots)], sc = SCALE[G.scale], prog = pick(G.progs), chorusProg = pick(G.progs);
  const deg = (d, oct = 0) => { const n = sc.length, k = ((d % n) + n) % n; return root + sc[k] + 12 * (Math.floor(d / n) + oct); };   // (a scale degree as MIDI)
  const bars = G.form.reduce((a, f) => a + f[1], 0), tracks = { lead: [], bass: [], keys: [], drums: [] };
  let leadDeg = 7, bar = 0;
  for (const [part, n] of G.form) {
    const P = part === 'chorus' ? chorusProg : prog, motif = pick(G.lead ? G.lead.rhythm : ['x.......']), drums = G.drums[part] || G.drums.verse;
    for (let b = 0; b < n; b++, bar++) {
      const ch = P[b % P.length], fill = b === n - 1 && part !== 'outro';
      // drums: the section's pattern, a fill on its last bar, the crash where a section starts
      const dr = (fill ? drums.slice(0, 8) + 'k.s.ssss' : drums).split('').map(c => (c === '.' ? '.' : c));
      if (b === 0 && part !== 'intro') dr[0] = dr[0] === 'k' ? 'kc' : 'c';
      if (part === 'outro') dr.fill('.', 4); tracks.drums.push(...dr);
      // the bass: the chord's root on its rhythm (low: an octave down), octave jumps for synthwave
      for (let s = 0; s < 16; s++) tracks.bass.push(G.bass.rhythm[s] === 'x' && part !== 'intro' ? nameOf(deg(ch, G.bass.low ? -1 : 0) - 12 + (G.bass.oct && s % 4 === 2 ? 12 : 0)) : '.');
      // the keys: a stab on the beat, a held chord, or an arpeggio over the chord's notes
      const chord = [deg(ch), deg(ch + 2), deg(ch + 4)];
      for (let s = 0; s < 16; s++) {
        if (G.keys.kind === 'arp') tracks.keys.push(nameOf(chord[s % 3] + 12 + (s % 6 >= 3 ? 12 : 0)));
        else if (G.keys.kind === 'stab') tracks.keys.push(s % 4 === 0 && part !== 'intro' ? nameOf(chord[(s / 4) % 3] + 12) : '.');
        else tracks.keys.push(s === 0 ? nameOf(chord[0] + 12) : s < 14 ? '-' : '.');
      }
      // the lead: the motif's rhythm, steps along the scale (a leap now and then), resting in the intro and the bridge
      if (G.lead) for (let s = 0; s < 16; s++) {
        const on = motif[s % motif.length] === 'x' && (part === 'verse' || part === 'chorus');
        if (!on) { tracks.lead.push(s && tracks.lead[tracks.lead.length - 1] !== '.' && rnd() < .3 ? '-' : '.'); continue; }
        leadDeg += rnd() < .25 ? (rnd() < .5 ? -G.lead.leap : G.lead.leap) : rnd() < .5 ? -1 : 1;
        let m = deg(leadDeg, 1); while (m > G.lead.hi) { leadDeg -= sc.length; m = deg(leadDeg, 1); } while (m < G.lead.lo) { leadDeg += sc.length; m = deg(leadDeg, 1); }
        if (s % 4 === 0 && rnd() < .5) m = chord[Math.floor(rnd() * 3)] + 12 * Math.round((G.lead.lo + G.lead.hi) / 24 - chord[0] / 12);   // (on the beat, often a chord tone)
        tracks.lead.push(nameOf(m));
      }
    }
  }
  const out = [{ wave: G.bass.wave, vol: G.bass.vol, notes: tracks.bass.join(' ') }, { wave: G.keys.wave, vol: G.keys.vol, notes: tracks.keys.join(' ') }, { wave: 'drums', vol: .15, notes: tracks.drums.join(' ') }];
  if (G.lead) out.unshift({ wave: G.lead.wave, vol: G.lead.vol, notes: tracks.lead.join(' ') });
  return { title, genre, bpm, steps: 4, bars, tracks: out };
}
