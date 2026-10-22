// Song data in the engine's note syntax (PLAN.md 8.17: "the engine's note and drum syntax for song data"): a song is
// { bpm, steps (a beat's steps: 4 = sixteenths), tracks: [{ wave, vol, notes: 'C5 - E5 . G5 | ...' }] }. A token per
// step: a note (C4, F#3, Bb2), '-' holds the note before, '.' rests, '|' is a bar line and counts for nothing; on a
// 'drums' track k (kick), s (snare), h (closed hat), o (open hat), c (crash), t (tom). Parsed once into events, each
// { step, len (steps), freq | drum }, and each track loops on its own length.
//   parseSong(song) -> { bpm, steps, stepDur (s), tracks: [{ wave, vol, len (steps), events }], length (s, the longest) }
const NOTE = /^([A-Ga-g])([#b]?)(-?\d)$/, SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const DRUMS = ['k', 's', 'h', 'o', 'c', 't'];
/** a note's frequency (A4 = 440 Hz), or null when the token isn't one */
export function noteFreq(tok) {
  const m = NOTE.exec(tok); if (!m) return null;
  const n = SEMI[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;   // (MIDI: C4 = 60)
  return 440 * Math.pow(2, (n - 69) / 12);
}
/** a track's tokens as events: { step, len, freq } or { step, len: 1, drum } */
export function parseTrack(notes, drums = false) {
  const toks = String(notes || '').replace(/\|/g, ' ').trim().split(/\s+/).filter(Boolean), ev = [];
  let last = null;
  toks.forEach((t, i) => {
    if (t === '-') { if (last) last.len++; return; }
    last = null; if (t === '.') return;
    if (drums) { for (const d of t) if (DRUMS.includes(d)) ev.push({ step: i, len: 1, drum: d }); return; }
    const f = noteFreq(t); if (f) { last = { step: i, len: 1, freq: f }; ev.push(last); }
  });
  return { len: toks.length, events: ev };
}
/** a whole song, parsed */
export function parseSong(song) {
  const bpm = song.bpm || 120, steps = song.steps || 4, stepDur = 60 / bpm / steps;
  const tracks = (song.tracks || []).map(t => { const p = parseTrack(t.notes, t.wave === 'drums'); return { wave: t.wave || 'square', vol: t.vol === undefined ? .15 : t.vol, len: p.len, events: p.events, release: t.release }; }).filter(t => t.len);
  const len = Math.max(0, ...tracks.map(t => t.len));
  return { bpm, steps, stepDur, tracks, lenSteps: len, length: len * stepDur };
}
