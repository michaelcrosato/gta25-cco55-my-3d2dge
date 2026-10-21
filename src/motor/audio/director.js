// The audio director (PLAN.md 8.17): the game's sound, steered from the play scene each frame (presentation: it reads
// the simulation and never writes to it). It owns MOTOR's sequencer on the engine's music bus (GTM-PATCH 5), the radio
// playing what the possessed one's vehicle is tuned to (from where the station has got to, at the radio clock), a
// mission's score (the radio ducks under it), AudioX's continuous voices on the effects bus and the SFX map. Nothing is
// made until the browser lets the game make sound (the engine's context, after the first tap or key); headless,
// nothing at all, so no simulation can depend on it.
//   const D = new AudioDirector(game, { radio });  each frame D.frame({ station, t, volume, score, x, dt })  ·  D.dispose()
import { Sequencer } from './sequencer.js';
import { parseSong } from './notes.js';
import { compose } from './composer.js';
import { AudioX } from './audiox.js';

export class AudioDirector {
  /** game: the E.Game; o.radio: the Radio (its stations' timelines) */
  constructor(game, o = {}) { this.game = game; this.radio = o.radio || null; this.seq = null; this.x = null; this.playing = null; this.score = null; this.scoreWant = null; this.cues = {}; }
  /** can the game make sound now? */
  get ready() { const A = this.game.audio; return !this.game.headless && !!A && !!A.ready && !!A.bus; }
  _setup() {
    if (this.seq) return true;
    const A0 = this.game.audio; if (!this.game.headless && A0 && A0.bus && !A0.ctx && !A0.failed) A0.bus('sfx');   // (the context made now: it starts at the player's first key or tap)
    if (!this.ready) return false;
    const A = this.game.audio, c = A.ctx, music = A.bus('music');
    this.radioGain = c.createGain(); this.radioGain.connect(music); this.scoreGain = c.createGain(); this.scoreGain.connect(music);
    this.seq = new Sequencer(c, this.radioGain); this.x = new AudioX(A); return true;
  }
  /** each frame: o { station ('off', null or an id), t (the radio clock, s), volume (the radio's, 0..1), score ('chase' |
   *  'tension' | null), x (AudioX's: { listener, vehicles, sirens, weather, zone }), dt } */
  frame(o) {
    if (!this._setup()) return;
    const now = this.game.audio.ctx.currentTime;
    // the radio: the station's segment at the radio clock, from where it has got to; a new segment or station stops the old
    const at = o.station && o.station !== 'off' && this.radio ? this.radio.at(o.station, o.t) : null, key = at ? `${o.station}@${at.cycle}:${at.seg.t0}` : null;
    if (key !== (this.playing ? this.playing.key : null)) {
      if (this.playing) this.playing.q.stop();
      this.playing = at ? { key, q: this.seq.play(at.seg.song, { t0: now - at.offset, loop: at.seg.kind !== 'song', dest: this.radioGain }) } : null;
    }
    // the score: a mission's cue over everything, the radio ducked under it
    if ((o.score || null) !== this.scoreWant) { this.scoreWant = o.score || null; if (this.score) this.score.stop(); this.score = this.scoreWant ? this.seq.play(this._cue(this.scoreWant), { dest: this.scoreGain }) : null; }
    this.radioGain.gain.setTargetAtTime((o.volume ?? .8) * (this.score ? .35 : 1), now, .1);
    this.seq.tick();
    if (o.x) this.x.update(o.dt || 0, o.x);
  }
  _cue(id) { return this.cues[id] || (this.cues[id] = parseSong(compose(id === 'chase' ? 'chase' : 'tension', 7))); }
  /** what is live (the soak counts it) */
  stats() { return this.seq ? { ...this.seq.stats(), ...this.x.stats(), radio: this.playing ? this.playing.key : null, score: this.scoreWant } : null; }
  dispose() { if (this.playing) this.playing.q.stop(); if (this.score) this.score.stop(); if (this.x) this.x.dispose(); this.playing = null; this.score = null; this.scoreWant = null; }
}
