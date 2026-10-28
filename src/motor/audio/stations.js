// Radio stations (PLAN.md 8.17, 9.9): def('stations', id, spec) from the game's content, the ads they play,
// def('radioAds', id, { name, lines }), and songs written by hand, def('songs', id, spec). A station's music is MOTOR's composer's, from its genre and seed; its words
// (the DJ's lines, the ads, a talk show's calls) show as subtitles: the radio has no voices. A vehicle's radio steps
// through them (and 'off') with d-pad left and right, and the HUD names the one tuned in.
import { declare, get } from '../core/registry.js';
import { shape } from '../core/schema.js';

declare('stations', shape({
  name: { type: 'string', req: true }, freq: { type: 'string', def: '' }, dj: { type: 'string', def: '' }, genre: { type: 'string', def: '' },
  color: { type: 'string', def: '#ffe066' }, about: { type: 'string', def: '' },
  seed: { type: 'number', def: 1 },   // (the composer's: the same songs every game)
  songs: { type: 'array', def: [] },   // ([{ title, artist }]: a song each, composed in the station's genre)
  djLines: { type: 'array', def: [] }, ads: { type: 'array', def: [] }, jingle: { type: 'string', def: '' },
  talk: { type: 'array', def: [] },   // (a talk station's segments: [[lines]], callers and host, over a bed)
}));
declare('radioAds', shape({ name: { type: 'string', req: true }, lines: { type: 'array', req: true } }));
// a station's genre from a content pack, as composer.js's own GENRES are made: { bpm: [lo, hi], scale ('minor', 'dorian',
// 'major', 'mixo', 'pentatonic', 'blues'), roots: ['E', ...], progs: [[degrees, a bar each]], bass: { wave, rhythm, vol,
// low?, oct? }, drums: { intro, verse, chorus, bridge } (k kick, s snare, h hat, o open hat), lead: { wave, lo, hi, rhythm:
// [..], leap, vol } | null, keys: { wave, kind: 'stab' | 'chord' | 'arp', vol }, swing?, form: [[section, bars]] }
declare('genres', shape({
  bpm: { type: 'array', req: true }, scale: { type: 'string', req: true }, roots: { type: 'array', req: true }, progs: { type: 'array', req: true },
  bass: { type: 'object', req: true }, drums: { type: 'object', req: true }, lead: { type: 'any', def: null }, keys: { type: 'object', req: true },
  swing: { type: 'boolean', def: false }, form: { type: 'array', req: true },
}));
// a song written by hand (PLAN.md 8.17: the engine's note syntax, audio/notes.js), played on a station after the ones
// its composer writes: def('songs', id, { title, artist, station, bpm, steps, tracks: [{ wave, vol, notes }] })
declare('songs', shape({
  title: { type: 'string', req: true }, artist: { type: 'string', def: '' }, station: { type: 'string', req: true },
  bpm: { type: 'number', def: 120, min: 40, max: 240 }, steps: { type: 'number', def: 4, min: 1 }, tracks: { type: 'array', req: true },
}));
/** what the HUD shows for a station id ('off': RADIO OFF) */
export function stationLabel(id) { if (!id || id === 'off') return 'RADIO OFF'; const s = get('stations', id); return s ? (s.freq ? `${s.name}  ${s.freq}` : s.name) : id.toUpperCase(); }
