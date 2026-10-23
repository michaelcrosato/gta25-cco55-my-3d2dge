// AudioX (PLAN.md 8.17): the continuous sounds, kept running and steered each frame from what the simulation says
// (read only: presentation): the engine hum of the vehicle driven and the nearest others (two oscillators and filtered
// noise, the pitch from the speed through the gears), tyre squeal by slip, the sirens (two-tone and wail, a Doppler
// shift by closing speed), rain and wind by the weather, the crowd's murmur and the city's hum by where you are. Each
// voice is panned and falls off with distance from the listener; a voice limit keeps the nearest. All of it plays into
// the engine's effects bus (GTM-PATCH 5: audio.bus('sfx')), so the volume settings and mute hold.
//   const X = new AudioX(audio);  each frame X.update(dt, { listener, vehicles, sirens, weather, zone, paused })
const MAX_ENGINES = 4, MAX_SIRENS = 3, FAR = 700;

/** a voice: nodes made once, its gain and pan steered; stop() lets it go */
class Voice {
  constructor(ctx, out, make) { this.ctx = ctx; this.g = ctx.createGain(); this.g.gain.value = 0; this.p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (this.p) { this.g.connect(this.p); this.p.connect(out); } else this.g.connect(out); this.parts = make(ctx, this.g); this.live = true; }
  set(vol, pan = 0, k = .08) { const t = this.ctx.currentTime; this.g.gain.setTargetAtTime(Math.max(0, vol), t, k); if (this.p) this.p.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, k); }
  stop() { if (!this.live) return; this.live = false; const t = this.ctx.currentTime; this.g.gain.setTargetAtTime(0, t, .05); for (const n of this.parts.nodes || []) if (n.stop) try { n.stop(t + .3); } catch (e) { /* already */ } setTimeout(() => { try { this.g.disconnect(); if (this.p) this.p.disconnect(); } catch (e) { /* gone */ } }, 500); }
}
export class AudioX {
  /** audio: the engine's game.audio (its context and its buses) */
  constructor(audio, o = {}) { this.audio = audio; this.engines = new Map(); this.sirens = new Map(); this.beds = {}; this.noise = null; this.maxEngines = o.maxEngines || MAX_ENGINES; this.maxSirens = o.maxSirens || MAX_SIRENS; }
  get ready() { const A = this.audio; return !!(A && A.ctx && A.ctx.state === 'running' && A.bus && A.bus('sfx')); }
  _noise() { if (this.noise) return this.noise; const c = this.audio.ctx, b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); let x = 0x1234567; for (let i = 0; i < d.length; i++) { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; d[i] = x / 2147483648 - 1; } return (this.noise = b); }
  _src(ctx, out, kind, f, q = 1) { const n = ctx.createBufferSource(); n.buffer = this._noise(); n.loop = true; const fl = ctx.createBiquadFilter(); fl.type = kind; fl.frequency.value = f; fl.Q.value = q; n.connect(fl); fl.connect(out); n.start(); return { n, fl }; }
  // ---- the voices
  _engine() {
    return new Voice(this.audio.ctx, this.audio.bus('sfx'), (c, out) => {
      const a = c.createOscillator(), b = c.createOscillator(), ga = c.createGain(), gb = c.createGain(), lp = c.createBiquadFilter(); a.type = 'sawtooth'; b.type = 'square'; ga.gain.value = .5; gb.gain.value = .25; lp.type = 'lowpass'; lp.frequency.value = 600;
      a.connect(ga); b.connect(gb); ga.connect(lp); gb.connect(lp); lp.connect(out); a.start(); b.start();
      const rumble = this._src(c, out, 'lowpass', 180, .7);
      return { a, b, lp, rumble, nodes: [a, b, rumble.n] };
    });
  }
  _siren() {
    return new Voice(this.audio.ctx, this.audio.bus('sfx'), (c, out) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; g.gain.value = .35; o.connect(g); g.connect(out); o.start(); return { o, nodes: [o] }; });
  }
  _bed(kind) {
    const c = this.audio.ctx, out = this.audio.bus('sfx');
    return new Voice(c, out, (cx, o) => {
      if (kind === 'rain') { const s = this._src(cx, o, 'highpass', 2600, .4); return { nodes: [s.n] }; }
      if (kind === 'wind') { const s = this._src(cx, o, 'bandpass', 420, .6); return { s, nodes: [s.n] }; }
      if (kind === 'crowd') { const s = this._src(cx, o, 'bandpass', 900, 1.4); return { nodes: [s.n] }; }
      const s = this._src(cx, o, 'lowpass', 140, .5); return { nodes: [s.n] };   // (the city's hum)
    });
  }
  /** each frame: o { listener: { x, y, heading } (the camera's focus), vehicles: [{ id, x, y, speed, rpm (0..1), slip,
   *  mine }], sirens: [{ id, x, y, vx, vy, kind: 'wail' | 'two' }], weather: { rain, wind } (0..1), zone: { crowd, city }
   *  (0..1), paused, t (s) } */
  update(dt, o) {
    if (!this.ready) return;
    const L = o.listener, t = o.t || 0, pan = (x, y) => { const dx = x - L.x, dy = y - L.y, d = Math.hypot(dx, dy) || 1; return { d, pan: Math.max(-1, Math.min(1, dx / Math.max(160, d))) }; };
    const fall = d => Math.max(0, 1 - d / FAR) ** 2, hush = o.paused ? 0 : 1;
    // engines: the player's own and the nearest others, a voice each (the rest silent)
    const cars = (o.vehicles || []).map(v => ({ v, ...pan(v.x, v.y) })).filter(q => q.d < FAR || q.v.mine).sort((a, b) => (b.v.mine ? 1 : 0) - (a.v.mine ? 1 : 0) || a.d - b.d).slice(0, this.maxEngines);
    const keep = new Set(cars.map(q => q.v.id));
    for (const [id, vo] of this.engines) if (!keep.has(id)) { vo.stop(); this.engines.delete(id); }
    for (const q of cars) {
      let vo = this.engines.get(q.v.id); if (!vo) { vo = this._engine(); this.engines.set(q.v.id, vo); }
      const rpm = q.v.rpm ?? Math.min(1, q.v.speed / 300), f = 38 + 110 * rpm, now = this.audio.ctx.currentTime, P = vo.parts;
      P.a.frequency.setTargetAtTime(f, now, .05); P.b.frequency.setTargetAtTime(f * 2.01, now, .05); P.lp.frequency.setTargetAtTime(300 + 1400 * rpm, now, .08);
      vo.set(hush * (q.v.mine ? .32 : .2 * fall(q.d)) * (.35 + .65 * rpm) + hush * (q.v.slip || 0) * .1, q.v.mine ? 0 : q.pan);
    }
    // sirens: two-tone (alternating every .5 s) or a wail (a slow sweep), Doppler by the closing speed
    const sir = (o.sirens || []).map(s => ({ s, ...pan(s.x, s.y) })).filter(q => q.d < FAR * 1.4).sort((a, b) => a.d - b.d).slice(0, this.maxSirens), sk = new Set(sir.map(q => q.s.id));
    for (const [id, vo] of this.sirens) if (!sk.has(id)) { vo.stop(); this.sirens.delete(id); }
    for (const q of sir) {
      let vo = this.sirens.get(q.s.id); if (!vo) { vo = this._siren(); this.sirens.set(q.s.id, vo); }
      const close = -((q.s.x - L.x) * (q.s.vx || 0) + (q.s.y - L.y) * (q.s.vy || 0)) / q.d, dop = 343 * 8 / (343 * 8 - close);   // (8 u a metre)
      const base = q.s.kind === 'two' ? (Math.floor(t * 2) % 2 ? 960 : 720) : 700 + 450 * (.5 + .5 * Math.sin(t * Math.PI * .8));
      vo.parts.o.frequency.setTargetAtTime(base * dop, this.audio.ctx.currentTime, .02); vo.set(hush * .14 * fall(q.d * .7), q.pan);
    }
    // the beds: rain, wind, the crowd, the city
    const want = { rain: (o.weather && o.weather.rain) || 0, wind: (o.weather && o.weather.wind) || 0, crowd: (o.zone && o.zone.crowd) || 0, city: (o.zone && o.zone.city) || .4 };
    for (const [k, v] of Object.entries(want)) { let vo = this.beds[k]; if (!vo && v > .01) vo = this.beds[k] = this._bed(k); if (vo) vo.set(hush * v * ({ rain: .16, wind: .1, crowd: .06, city: .05 })[k], 0, .5); }
  }
  /** the live voices: what the soak test counts */
  stats() { return { engines: this.engines.size, sirens: this.sirens.size, beds: Object.keys(this.beds).length }; }
  dispose() { for (const v of this.engines.values()) v.stop(); for (const v of this.sirens.values()) v.stop(); for (const v of Object.values(this.beds)) v.stop(); this.engines.clear(); this.sirens.clear(); this.beds = {}; }
}
