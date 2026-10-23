// MOTOR's sequencer (PLAN.md 8.17): a look-ahead scheduler on any BaseAudioContext (the realtime one in play, an
// OfflineAudioContext in the tests) for the radio, a mission's score and the title's jingle. The engine's music() has
// one slot, schedules against the realtime clock with setInterval and starts a song at its first step; a station must
// keep its place while it is off and play under a mission's score, and a test must render it offline. Every sequence
// has its own timeline: a song started at t0 is (now - t0) in whenever it is heard, so tuning back in finds it where
// it got to, and many run at once. Notes are the engine's syntax (notes.js); a voice cap keeps the graph bounded.
//   const S = new Sequencer(ctx, dest);  const q = S.play(parseSong(song), { t0, loop, gain });  each frame S.tick()
//   offline: S.schedule(from, to) schedules every note in the window at once  ·  q.stop()  ·  S.stats()
const DRUM = {   // (each drum: its voice, by code)
  k: { kind: 'osc', wave: 'sine', f: 150, to: 42, dur: .14, vol: .9 },
  t: { kind: 'osc', wave: 'sine', f: 140, to: 85, dur: .16, vol: .6 },
  s: { kind: 'noise', filter: 'bandpass', f: 1900, q: .8, dur: .13, vol: .55, body: { wave: 'triangle', f: 190, to: 140, dur: .07, vol: .3 } },
  h: { kind: 'noise', filter: 'highpass', f: 7200, q: .7, dur: .04, vol: .28 },
  o: { kind: 'noise', filter: 'highpass', f: 6200, q: .7, dur: .22, vol: .24 },
  c: { kind: 'noise', filter: 'highpass', f: 4800, q: .5, dur: .7, vol: .26 },
};
/** a second of white noise (a seeded LCG: the same every time, nothing taken from the game's random numbers) */
export function makeNoise(ctx, seed = 0x5EED) {
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0); let x = seed >>> 0;
  for (let i = 0; i < d.length; i++) { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; d[i] = x / 2147483648 - 1; }
  return b;
}
export class Sequencer {
  /** ctx: an AudioContext or OfflineAudioContext; dest: the node it plays into (the engine's music bus); o: { lookahead
   *  (s), maxVoices } */
  constructor(ctx, dest, o = {}) { this.ctx = ctx; this.dest = dest; this.lookahead = o.lookahead || .3; this.maxVoices = o.maxVoices || 64; this.seqs = new Set(); this.noise = makeNoise(ctx); this.ends = []; this.dropped = 0; this._pulse = {}; }
  /** start a parsed song: o { t0 (its timeline's start: now by default), loop (true), gain (1), dest } */
  play(song, o = {}) {
    const c = this.ctx, g = c.createGain(); g.gain.value = o.gain === undefined ? 1 : o.gain; g.connect(o.dest || this.dest);
    const s = { song, t0: o.t0 === undefined ? c.currentTime : o.t0, loop: o.loop !== false, out: g, done: -Infinity, stopped: false };
    s.stop = (at = c.currentTime) => { if (s.stopped) return; s.stopped = true; this.seqs.delete(s); try { g.gain.setValueAtTime(g.gain.value, at); g.gain.linearRampToValueAtTime(0, at + .05); } catch (e) { /* a closed context */ } setTimeout(() => { try { g.disconnect(); } catch (e) { /* gone */ } }, 400); };
    this.seqs.add(s); return s;
  }
  /** each frame (realtime): schedule what falls in the next lookahead seconds */
  tick() { const now = this.ctx.currentTime; this.schedule(now, now + this.lookahead); }
  /** schedule every sequence's notes in [from, to) not scheduled yet */
  schedule(from, to) {
    for (const s of this.seqs) {
      const a = Math.max(from, s.done); if (to <= a) continue;
      if (!s.loop && a - s.t0 >= s.song.length) { this.seqs.delete(s); continue; }   // (a song played once, over)
      this._window(s, a, to); s.done = to;
    }
    const now = this.ctx.currentTime; this.ends = this.ends.filter(t => t > now);
  }
  _window(s, a, b) {
    const P = s.song, sd = P.stepDur;
    for (const T of P.tracks) {
      const L = T.len * sd, r0 = Math.max(0, a - s.t0), r1 = b - s.t0; if (r1 <= 0 || L <= 0) continue;
      const k0 = Math.floor(r0 / L), k1 = s.loop ? Math.floor((r1 - 1e-9) / L) : 0;
      for (let k = k0; k <= k1; k++) for (const e of T.events) {
        const t = s.t0 + k * L + e.step * sd; if (t < a || t >= b) continue;
        if (this.ends.length >= this.maxVoices) { this.dropped++; continue; }   // (the voice cap: a note dropped, never the graph grown)
        const end = e.drum ? this._drum(e.drum, t, T.vol, s.out) : this._note(T, e, t, sd, s.out); this.ends.push(end);
      }
    }
  }
  _osc(wave) { const o = this.ctx.createOscillator(); if (wave === 'pulse') { o.setPeriodicWave(this._wave(.25)); } else o.type = wave === 'saw' ? 'sawtooth' : ['square', 'triangle', 'sine', 'sawtooth'].includes(wave) ? wave : 'square'; return o; }
  _wave(duty) {
    if (this._pulse[duty]) return this._pulse[duty];
    const N = 32, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) { const a = 2 / (n * Math.PI) * Math.sin(n * Math.PI * duty); re[n] = a * Math.cos(n * Math.PI * duty); im[n] = a * Math.sin(n * Math.PI * duty); }
    return (this._pulse[duty] = this.ctx.createPeriodicWave(re, im));
  }
  // a pitched note: attack, held for its steps, a short release
  _note(T, e, t, sd, out) {
    const c = this.ctx, dur = Math.max(.03, e.len * sd * .92), rel = T.release || .05, g = c.createGain(), o = this._osc(T.wave);
    o.frequency.setValueAtTime(e.freq, t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(T.vol, t + .006); g.gain.setValueAtTime(T.vol, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + rel);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + rel + .02);
    return t + dur + rel;
  }
  _drum(d, t, vol, out) {
    const c = this.ctx, D = DRUM[d], g = c.createGain(), v = D.vol * vol / .15 * .5;   // (a drum track's vol: .15 is the engine's usual)
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0005, t + D.dur); g.connect(out);
    if (D.kind === 'osc') { const o = c.createOscillator(); o.type = D.wave; o.frequency.setValueAtTime(D.f, t); o.frequency.exponentialRampToValueAtTime(D.to, t + D.dur); o.connect(g); o.start(t); o.stop(t + D.dur + .02); }
    else { const n = c.createBufferSource(), f = c.createBiquadFilter(); n.buffer = this.noise; n.loop = true; f.type = D.filter; f.frequency.value = D.f; f.Q.value = D.q; n.connect(f); f.connect(g); n.start(t, (t * 7.31) % .9); n.stop(t + D.dur + .02);
      if (D.body) { const o = c.createOscillator(), bg = c.createGain(); o.type = D.body.wave; o.frequency.setValueAtTime(D.body.f, t); o.frequency.exponentialRampToValueAtTime(D.body.to, t + D.body.dur); bg.gain.setValueAtTime(D.body.vol * v, t); bg.gain.exponentialRampToValueAtTime(.0005, t + D.body.dur); o.connect(bg); bg.connect(out); o.start(t); o.stop(t + D.body.dur + .02); } }
    return t + D.dur;
  }
  /** what is live: sequences, voices sounding, notes dropped by the cap */
  stats() { return { seqs: this.seqs.size, voices: this.ends.length, dropped: this.dropped }; }
}
