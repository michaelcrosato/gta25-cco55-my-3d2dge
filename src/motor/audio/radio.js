// The radio (PLAN.md 8.17, 9.9): each station a timeline that runs whether anyone listens or not (a song, the DJ's
// line, a song, an ad, the jingle, ...), built once from the station's spec and the seed, so a seed always plays the
// same radio and tuning in finds a station where it has got to: its position is the radio clock's (the world's own
// time), never the moment it was tuned. The DJs' and the ads' words show as subtitles (no voices); the music plays
// through MOTOR's sequencer into the engine's music bus, under the radio's own volume and a mission score's ducking.
//   const R = new Radio({ stations: all('stations'), ads: { id: { name, lines } }, seed });  R.at(id, t) -> { seg, offset }
//   R.line(id, t) -> the words showing  ·  playing it: audio/director.js
import { all } from '../core/registry.js';
import { compose } from './composer.js';
import { parseSong } from './notes.js';

const DJ_TIME = 7, AD_TIME = 13, TALK_TIME = 16, JINGLE_BARS = 2;
/** a station's timeline: [{ kind: 'song' | 'dj' | 'ad' | 'jingle' | 'talk', dur (s), t0 (s into the cycle), song (parsed),
 *  title, artist, lines }] and its cycle length */
export function stationTimeline(st, seed = 1) {
  const base = (st.seed || 1) * 7919 + seed * 104729, segs = [], add = s => { s.t0 = segs.reduce((a, q) => a + q.dur, 0); segs.push(s); };
  const jingle = parseSong(compose(st.genre === 'talk' ? 'talk' : st.genre, base + 99, 'jingle')), jdur = Math.min(jingle.length, jingle.stepDur * 16 * JINGLE_BARS);
  const songs = [...(st.songs || []).map((q, i) => ({ ...q, song: parseSong(compose(st.genre, base + i * 31, q.title)) })),
    ...all('songs').filter(q => q.station === st.id).map(q => ({ title: q.title, artist: q.artist, song: parseSong(q) }))];   // (the composer's, then the ones written by hand: def('songs'))
  const bed = parseSong(compose('talk', base + 7, 'bed'));   // (under the talk, the DJ's lines and the ads)
  const ads = st.ads || [], dj = st.djLines || [];
  if (st.genre === 'talk') {
    (st.talk || []).forEach((lines, i) => { add({ kind: 'talk', dur: TALK_TIME + lines.length * 2, song: bed, lines }); if (ads[i % Math.max(1, ads.length)] && i % 2 === 1) add({ kind: 'ad', dur: AD_TIME, song: bed, ad: ads[i % ads.length] }); });
    add({ kind: 'jingle', dur: jdur, song: jingle, lines: [st.jingle || st.name] });
  } else {
    songs.forEach((q, i) => {
      add({ kind: 'song', dur: q.song.length, song: q.song, title: q.title, artist: q.artist });
      if (i % 2 === 0 && dj.length) add({ kind: 'dj', dur: DJ_TIME, song: bed, lines: [dj[i % dj.length]] });
      else if (ads.length) add({ kind: 'ad', dur: AD_TIME, song: bed, ad: ads[(i >> 1) % ads.length] });
      if (i === songs.length - 1) add({ kind: 'jingle', dur: jdur, song: jingle, lines: [st.jingle || st.name] });
    });
  }
  return { id: st.id, name: st.name, dj: st.dj, color: st.color, segs, length: segs.reduce((a, q) => a + q.dur, 0) };
}
export class Radio {
  /** o: { stations: [spec], seed, ads: { id: { name, lines } } } */
  constructor(o = {}) { this.seed = o.seed || 1; this.ads = o.ads || {}; this.timelines = new Map((o.stations || []).map(s => [s.id, stationTimeline(s, this.seed)])); }
  /** where a station is at radio time t: its segment and how far into it */
  at(id, t) {
    const T = this.timelines.get(id); if (!T || !T.length) return null;
    const p = ((t % T.length) + T.length) % T.length; let seg = T.segs[0];
    for (const s of T.segs) if (s.t0 <= p) seg = s; else break;
    return { seg, offset: p - seg.t0, cycle: Math.floor(t / T.length) };
  }
  /** the words showing at time t on a station: { name (who says it: the DJ, the ad's sponsor, a caller), text, kind,
   *  key }, or null (a song plays) */
  line(id, t) {
    const a = this.at(id, t); if (!a) return null; const s = a.seg, T = this.timelines.get(id);
    const ad = s.kind === 'ad' ? this.ads[s.ad] : null, lines = ad ? ad.lines : s.lines || null;
    if (!lines || !lines.length) return null;
    const per = s.dur / lines.length, i = Math.min(lines.length - 1, Math.floor(a.offset / per)), raw = String(lines[i]);
    const m = /^([A-Z][A-Z .']{1,20}):\s*(.*)$/.exec(raw);   // (a talk show's "CALLER: ..." names its speaker)
    return { name: ad ? ad.name : m ? m[1] : s.kind === 'dj' ? T.dj : T.name, text: m && !ad ? m[2] : raw, kind: s.kind, key: s.t0 + ':' + i };
  }
}
