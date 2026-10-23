// The attract mode's director (PLAN.md 8.20, 9.11): the show. It plays the reels (def('reels'): staged like missions,
// played by the mission bot from their hints) in an order its seed shuffles each time round, a card between them every
// two or three reels (the host draws it: the title card, HOW TO PLAY, LOWTOWN'S MOST WANTED), and loops for ever: each
// reel in a fresh world, from the attract seed plus the count of reels so far. The camera plan is the reels': as a
// stage starts, its view is set and its caption shown (a reel's title first). A watchdog cuts to the next reel when
// nothing has moved for TUNE.attractStall seconds (the camera's focus still, no op begun) or a reel runs past its time.
// It counts what the show has shown, for the soak's checks: each reel's runs, ends and cuts, the views, the bank, the
// most stars, the explosions and the switches. Deterministic: the order from its seed, the cuts from the steps.
//   const D = new Director({ reels: [ids], cards: [ids], seed, host });  each step D.update(dt)  ·  D.now { kind, id, t }
//   D.caption { text, sub, t }  ·  D.stats  ·  D.dispose()
//   host: { startReel(id, seed), stopReel(), card(id), runtime() -> the reel's MissionRuntime, focus() -> [x, y] (the
//   camera's), view(id) (set it), viewNow(), inside() (in an interior?), stars() }
import { E } from '../engine.js';
import { get } from '../core/registry.js';
import { BUS } from '../core/bus.js';
import { TUNE, knob } from '../core/tune.js';
import { hash32 } from '../core/rng.js';

knob('Attract', 'attractStall', 'Watchdog: stalled after', 6, 2, 30, .5, 'Seconds without progress (the camera still, no op begun) before the director cuts to the next reel');
knob('Attract', 'attractCard', 'A card shows for', 6, 2, 20, .5, 'Seconds an interstitial card (the title card, HOW TO PLAY, MOST WANTED) shows');
knob('Attract', 'attractTail', 'A reel\'s end held', 1.5, 0, 6, .1, 'Seconds the end of a reel holds before the next');
const MOVED = 24, TITLE = 3.2;   // (u the camera's focus must move to count as progress; s a reel's title shows)

export class Director {
  /** o: { reels: [reel ids], cards: [card ids], seed, host, every: [2, 3] (reels between cards, in turn) } */
  constructor(o) {
    this.reels = [...o.reels]; this.cards = o.cards || []; this.seed = o.seed >>> 0; this.host = o.host; this.every = o.every || [2, 3];
    this.loop = 0; this.count = 0; this.cardN = 0; this.show = this._order(); this.i = -1; this.now = null; this.caption = null; this.log = [];
    this.stats = { reels: {}, ended: {}, cuts: {}, views: new Set(), bank: false, stars: 0, explosions: 0, switches: 0, cards: 0, errors: 0 };
    this.unsub = [BUS.on('explode', () => { this.stats.explosions++; }, 'attract'), BUS.on('switch', e => { if (e && e.camera) this.stats.switches++; }, 'attract')];
  }
  dispose() { for (const u of this.unsub) u(); this.unsub = []; }
  // one time round: the reels shuffled (never the last one again first), a card after every two or three
  _order() {
    const r = E.rng(hash32(this.seed, 'show', this.loop)), list = [...this.reels];
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    const last = this.show && this.show.filter(q => q.kind === 'reel').pop();
    if (last && list.length > 1 && list[0] === last.id) [list[0], list[1]] = [list[1], list[0]];
    const out = []; let n = 0, k = 0;
    for (const id of list) {
      out.push({ kind: 'reel', id }); n++;
      if (this.cards.length && n >= this.every[k % this.every.length]) { out.push({ kind: 'card', id: this.cards[this.cardN++ % this.cards.length] }); n = 0; k++; }
    }
    return out;
  }
  _next() {
    this.i++; if (this.i >= this.show.length) { this.loop++; this.show = this._order(); this.i = 0; }
    const it = this.show[this.i], H = this.host;
    if (it.kind === 'card') { H.stopReel(); this.now = { kind: 'card', id: it.id, t: 0 }; this.stats.cards++; this.caption = null; if (H.card) H.card(it.id); return; }
    const seed = (this.seed + this.count++) >>> 0, spec = get('reels', it.id);
    this.now = { kind: 'reel', id: it.id, t: 0, seed, stage: -1, stall: 0, mark: null, pStage: -1, pOp: null, errors: 0, tail: 0 };
    this.stats.reels[it.id] = (this.stats.reels[it.id] || 0) + 1;
    this.caption = { text: spec ? spec.title.toUpperCase() : it.id, sub: spec ? spec.shows : '', t: 0, title: true };
    H.startReel(it.id, seed);
    this.now.errors = H.runtime().errors.length;
  }
  // the reel stopped before its end: why, counted, and on to the next
  _cut(why) {
    const N = this.now; this.stats.cuts[N.id] = (this.stats.cuts[N.id] || 0) + 1; this.log.push({ reel: N.id, seed: N.seed, why, t: +N.t.toFixed(1) });
    BUS.emit('attractBeat', { reel: N.id, beat: 'watchdog:' + why });
    this.host.stopReel(); this._next();
  }
  /** one step */
  update(dt) {
    if (!this.now) { this._next(); return; }
    const N = this.now, H = this.host, S = this.stats; N.t += dt;
    if (this.caption) { const C = this.caption; C.t += dt; if (C.title && C.t > TITLE) this.caption = C.next ? { text: C.next, sub: '', t: 0 } : null; }   // (a stage's caption waits for the reel's title)
    if (N.kind === 'card') { if (N.t >= TUNE.attractCard) this._next(); return; }
    const R = H.runtime();
    if (H.inside()) S.bank = true; S.stars = Math.max(S.stars, H.stars());
    if (R.errors.length > N.errors) { S.errors += R.errors.length - N.errors; N.errors = R.errors.length; }
    if (R.state === 'running' && R.stageIdx !== N.stage) {   // (the camera plan: the stage's view, its caption)
      N.stage = R.stageIdx; const st = R.stage;
      if (st.view && H.viewNow() !== st.view) H.view(st.view);
      if (st.caption && !(this.caption && this.caption.title)) this.caption = { text: st.caption, sub: '', t: 0 };
      else if (st.caption) this.caption.next = st.caption;
    }
    S.views.add(H.viewNow());   // (after the camera plan: the view this step shows)
    if (R.state === 'passed' || R.state === 'idle') { N.tail += dt; if (N.tail >= TUNE.attractTail) { S.ended[N.id] = (S.ended[N.id] || 0) + 1; this.log.push({ reel: N.id, seed: N.seed, why: 'end', t: +N.t.toFixed(1) }); this._next(); } return; }
    if (R.state === 'failed') { this._cut('failed:' + R.failure); return; }
    // the watchdog: progress is the camera's focus moving, or a stage or an op begun
    const f = H.focus();
    if (!N.mark || Math.hypot(f[0] - N.mark[0], f[1] - N.mark[1]) > MOVED || R.stageIdx !== N.pStage || R.op !== N.pOp) { N.mark = [f[0], f[1]]; N.stall = 0; N.pStage = R.stageIdx; N.pOp = R.op; }
    else N.stall += dt;
    const spec = R.spec;
    if (N.stall >= TUNE.attractStall) this._cut('stalled');
    else if (spec && N.t >= spec.time) this._cut('time');
  }
}
