// The mission runtime (PLAN.md 8.15): it plays the staged DSL (mission/dsl.js). A mission is its stages in order; a
// stage is a setup(m) that puts the world as the stage needs it, then a *run(m) generator that yields ops (m.wait,
// m.reach, m.deliver...): the runtime steps the op each simulation step and resumes the generator with its result.
//   - one main mission at a time; an activity (defActivity: a job, a race, a MAYHEM) takes the same slot, as missions
//     do, and the random events run in a second runtime of their own while the first is idle;
//   - a failure (a failIf of the stage's, the player WRECKED or NABBED, an op's own: a timer run out, the escort dead)
//     stops it on JOB BLOWN until retry() (the stage again from its setup, what it spawned released first) or quit();
//   - a pass grades a medal from the bonus objectives (grading.js), pays the rewards and records it (the save's
//     missions.done and medals, or activities[id]: the highest level passed);
//   - everything it spawns is the mission's (owner 'mission', mission/actors.js) and released when it ends;
//   - BUS: missionStart (id) · stageStart (mission, stage) · stageFail (mission, stage, reason) · missionPass (id, medal,
//     elapsed) · missionFail (id, reason) · activityStart (id, level) · activityEnd (id, level, result). Its own
//     listeners (an op's: a photo, a pickup) are in the 'mission' scope, dropped when it ends.
// An op is { step(m, dt) -> undefined while it runs | { value } once done, start(m), end(m) (also when the stage stops
// under it), nav(m) -> [x, y] or an actor (where it wants the player: the GPS line and the bot's goal) }. Markers made
// while an op starts are its own and go with it.
// Deterministic: ops read only the simulation; its own RNG stream 'mission:<id>'. The bot (ai/missionbot.js) plays any
// objective from its hint.
//   const R = new MissionRuntime({ world: () => W, save });  R.start('saints_holy_rollers', { stage: 'deliver' })
//   each step: R.update(dt)  ·  R.state: 'idle' | 'running' | 'failed' | 'passed'  ·  R.objective { text, hint }
//   R.nav() · R.retry() · R.quit() · R.hash()
import { get } from '../core/registry.js';
import { BUS } from '../core/bus.js';
import { RNG } from '../core/rng.js';
import { MissionActors, pointOf, curbNear, laneNear, within } from './actors.js';
import { grade } from './grading.js';
import { checkHint } from './dsl.js';
import { boxDistance } from '../actors/fleet.js';

const OP = Symbol('op');
/** an op: step(m, dt) returns undefined while it runs, or { value } once done (o: start, end, nav) */
export function op(step, o = {}) { return { [OP]: true, step, ...o }; }
export const isOp = x => !!(x && x[OP]);
const MEDALS = ['bronze', 'silver', 'gold'];
const RAIL_HEADINGS = { north: 0, east: 90, south: 180, west: 270 };   // (m.view('side7', { heading }))

export class MissionRuntime {
  /** o: { world() -> W (the scene's world: game, city, fleet, combat, crew, life, clock, weather, stage, roads,
   *  junctions, wanted(), cash(n, why), respect(gang, delta, why), possess(id), switchTo(id), enter(interior, door),
   *  leave(), inside(), snap(), endMission(R), bot), save (the save's object: missions, activities), scope (the BUS
   *  scope of its listeners: 'mission'), onEnd(result) } */
  constructor(o) {
    this.world = o.world; this.save = o.save || null; this.onEnd = o.onEnd || null; this.scope = o.scope || 'mission';
    this.state = 'idle'; this.id = null; this.spec = null; this.kind = 'mission'; this.level = 1;
    this.stageIdx = -1; this.gen = null; this.op = null; this.m = null; this.actors = null;
    this.objective = null; this.fails = []; this.failure = null; this.result = null; this.t = 0; this.stageT = 0; this.retries = 0;
    this.markers = []; this.timer = null; this.lines = null; this.choosing = null; this.picked = null; this.data = {}; this.errors = [];
  }
  get active() { return this.state === 'running' || this.state === 'failed'; }
  get stage() { return (this.spec && this.spec.stages[this.stageIdx]) || null; }
  /** start mission (or activity, o.activity; or the attract mode's reel, o.reel) id at o.stage (an id or an index: a
   *  deep link), o.level (an activity's), o.data (m.data's start: a random event's spot) */
  start(id, o = {}) {
    if (this.active) this.quit('replaced');
    const kind = o.reel ? 'reel' : o.bench ? 'bench' : o.activity ? 'activity' : 'mission';   // (bench: the Proving Ground's mission bench, def('bench', ...): a reel's terms, paid and kept nowhere)
    const spec = get(kind === 'reel' ? 'reels' : kind === 'bench' ? 'bench' : kind === 'activity' ? 'activities' : 'missions', id); if (!spec) throw new Error('MOTOR: no ' + kind + ' "' + id + '"');
    const k = typeof o.stage === 'number' ? o.stage : o.stage ? spec.stages.findIndex(s => s.id === o.stage) : 0;
    if (k < 0 || k >= spec.stages.length) throw new Error('MOTOR: ' + id + ' has no stage "' + o.stage + '"');
    this.id = id; this.spec = spec; this.kind = kind; this.level = Math.max(1, Math.min(spec.levels || 1, o.level || 1));
    this.rng = RNG.stream('mission:' + id); this.t = 0; this.retries = 0; this.result = null; this.failure = null; this.data = { ...(o.data || {}) }; this.startedAt = k;
    this.actors = new MissionActors(this.world(), this);
    if (kind === 'mission' && spec.gang) { const G = this.world().life && this.world().life.gangs; if (G) { G.allies.add(spec.gang); this.allyHeld = true; } }   // (the gang whose job it is leaves the player be while it runs, hostile or not)
    if (kind !== 'reel' && kind !== 'bench') BUS.emit(kind === 'activity' ? 'activityStart' : 'missionStart', kind === 'activity' ? { id, level: this.level } : { id });
    this.state = 'running'; this._stage(k);
    return this;
  }
  // into stage k: the op under way ended, what this stage and the ones after it spawned released, its setup, its run
  // from the start
  _stage(k) {
    this._endOp(); this.stageIdx = k; this.stageT = 0; this.fails = []; this.objective = null; this.failure = null; this.allowWanted = false;
    for (const mk of this.markers) mk.gone = true; this.markers = []; this.timer = null; this.lines = null; this.choosing = null; this.picked = null;
    BUS.clear(this.scope);
    this.actors.release(a => a.stage >= k, { evict: this.retrying });   // (a retry: the player's mission car goes too, the player beside it)
    this.retrying = false;
    this.m = new MissionContext(this, k);
    const s = this.stage;
    if (!this._guard(() => { s.setup(this.m); this.gen = s.run(this.m); })) return;
    BUS.emit('stageStart', { mission: this.id, stage: s.id });
    if (this.kind === 'reel') BUS.emit('attractBeat', { reel: this.id, beat: s.id });
    this._guard(() => this._next(undefined));
  }
  // content's code run safely: a throw fails the job (reason 'error'), logged and kept in errors, never the game
  _guard(f) {
    try { f(); return true; } catch (err) {
      this.errors.push({ mission: this.id, stage: this.stage && this.stage.id, err }); console.error(`MOTOR: mission ${this.id} (${this.stage && this.stage.id}):`, err);
      if (this.state === 'running') { this.state = 'failed'; this.failure = 'error'; this.op = null; BUS.emit('stageFail', { mission: this.id, stage: this.stage ? this.stage.id : '', reason: 'error' }); }
      return false;
    }
  }
  // resume the stage's generator with value: its next op, or the next stage when it is done
  _next(value) {
    for (let guard = 0; guard < 1000; guard++) {
      if (this.state !== 'running') return;
      const r = this.gen.next(value);
      if (r.done) { if (this.state === 'running') this._advance(); return; }
      if (!isOp(r.value)) { value = r.value; continue; }   // (a plain value yielded: given straight back)
      this.op = r.value; this._starting = this.op;
      if (this.op.start) this.op.start(this.m);
      this._starting = null; if (this.state !== 'running' || !this.op) return;
      const now = this.op.step(this.m, 0); if (!now) return;
      this._endOp(); value = now.value;
    }
    throw new Error('MOTOR: ' + this.id + ' stage ' + this.stage.id + ' yields without waiting');
  }
  // the op under way finished (or stopped under it): its end, its markers gone
  _endOp() {
    const o = this.op; if (!o) return; this.op = null;
    if (o.end) o.end(this.m);
    if (this.objective && this.objective.op === o) this.objective = null;
    for (const mk of this.markers) if (mk.op === o) mk.gone = true;
    this.markers = this.markers.filter(mk => !mk.gone);
  }
  _advance() {
    if (this.state !== 'running') return;
    if (this.stageIdx + 1 < this.spec.stages.length) this._stage(this.stageIdx + 1); else this.pass();
  }
  /** one simulation step */
  update(dt) {
    if (this.state !== 'running') return;
    this.t += dt; this.stageT += dt;
    const W = this.world(), P = W.crew && W.crew.ped;
    // the fails: the stage's own, then the player down
    let failed = null; if (!this._guard(() => { for (const f of this.fails) if (f.pred(this.m)) { failed = f.reason; return; } })) return;
    if (failed !== null) { this.fail(failed); return; }
    if (P && P.dead && !this.spec.allowDeath) { this.fail('wrecked'); return; }
    if (this.timer && !this.timer.paused) { this.timer.left -= dt; if (this.timer.left <= 0) { this.timer.left = 0; const T = this.timer; if (T.fail !== false) { this.fail(T.reason); return; } this.timer = null; } }
    if (!(W.inside && W.inside())) this.actors.update(dt);   // (indoors the city stands still, the mission's things in it too)
    if (this.lines) { this.lines.t -= dt; if (this.lines.t <= 0) { this.lines.i++; this.lines.t = this.lines.per; if (this.lines.i >= this.lines.list.length) this.lines = null; } }
    if (this.op) this._guard(() => { const r = this.op.step(this.m, dt); if (r && this.state === 'running') { this._endOp(); this._next(r.value); } });
  }
  /** where the player is wanted now: the op's own point (or actor), else the objective's hint's */
  nav() {
    if (!this.active) return null;
    const n = this.op && this.op.nav ? this.op.nav(this.m) : null; if (n) return n;
    const h = this.objective && this.objective.hint; if (!h) return null;
    const tag = h.vehicle || h.what || h.target || h.targets;
    if (tag && typeof tag === 'string') { const a = this.actors.tagged(tag).find(q => !q.dead && !q.wrecked); if (a) return a; }
    return h.at || h.to || (h.route && h.route[0]) || (h.line && h.line[0]) || (h.path && h.path[h.path.length - 1]) || null;
  }
  /** JOB BLOWN: the stage stops, its reason kept, until retry() or quit() */
  fail(reason = 'failed') {
    if (this.state !== 'running') return;
    this.state = 'failed'; this.failure = reason; this._endOp(); this.timer = null; this.lines = null; this.choosing = null;
    BUS.emit('stageFail', { mission: this.id, stage: this.stage.id, reason });
  }
  /** the failed stage again, from its setup */
  retry() { if (this.state !== 'failed') return; this.retries++; this.state = 'running'; this.retrying = true; this._stage(this.stageIdx); }
  /** out to free roam: the mission's things released */
  quit(why = 'quit') {
    if (!this.active) return;
    const id = this.id, reason = this.failure || why;
    this.state = 'idle'; this._end();
    if (this.kind === 'reel') BUS.emit('attractBeat', { reel: id, beat: 'cut' });
    else BUS.emit(this.kind === 'activity' ? 'activityEnd' : 'missionFail', this.kind === 'activity' ? { id, level: this.level, result: 'quit' } : { id, reason });
    this.result = { id, kind: this.kind, level: this.level, passed: false, reason };
    if (this.onEnd) this.onEnd(this.result);
  }
  /** JOB DONE: the medal, the rewards, the record */
  pass() {
    if (this.state !== 'running') return;
    const S = this.spec, bonus = (S.bonus || []).map(b => ({ id: b.id, text: b.text, ok: !!safe(() => b.check(this.m)) })), medal = grade(bonus, this.retries);
    const W = this.world(), rw = this.kind === 'reel' || this.kind === 'bench' ? {} : (this.kind === 'activity' && S.rewardsFor ? S.rewardsFor(this.level, this.m) : S.rewards) || {};   // (a reel pays nothing)
    if (rw.cash && W.cash) W.cash(rw.cash, this.kind + ':' + this.id);
    for (const [g, d] of Object.entries(rw.respect || {})) if (W.respect) W.respect(g, d, this.kind + ':' + this.id);
    this.result = { id: this.id, kind: this.kind, level: this.level, passed: true, medal, bonus, elapsed: this.t, retries: this.retries, rewards: rw, title: S.title };
    if (this.save && this.kind !== 'reel' && this.kind !== 'bench') {   // (nor is it recorded)
      if (this.kind === 'mission') { const M = this.save.missions; if (!M.done.includes(this.id)) M.done.push(this.id); if (!M.medals[this.id] || MEDALS.indexOf(medal) > MEDALS.indexOf(M.medals[this.id])) M.medals[this.id] = medal; }
      else if (S.record !== false && S.kind !== 'event') { const A = this.save.activities; A[this.id] = Math.max(A[this.id] || 0, this.level); }
    }
    this.state = 'passed'; this._end();
    if (this.kind === 'activity') BUS.emit('activityEnd', { id: this.id, level: this.level, result: 'pass' });
    else if (this.kind === 'reel') BUS.emit('attractBeat', { reel: this.id, beat: 'end' });
    else BUS.emit('missionPass', { id: this.id, medal, elapsed: Math.round(this.t * 10) / 10 });
    if (this.onEnd) this.onEnd(this.result);
  }
  _end() {
    this._endOp();
    if (this.actors) { this.actors.restoreKit(); this.actors.release(() => true); }
    for (const mk of this.markers) mk.gone = true; this.markers = [];
    this.gen = null; this.objective = null; this.timer = null; this.lines = null; this.fails = []; this.choosing = null; this.music = null;
    BUS.clear(this.scope);
    const W = this.world(); if (W.endMission) W.endMission(this);
    if (this.wantedHeld) { const w = W.wanted ? W.wanted() : null; if (w) { w.floor(0); w.cap(5); } this.wantedHeld = false; }   // (a stage's cap or floor never outlives its job)
    if (this.blocksHeld) { const P = W.life && W.life.police; if (P) P.noBlocks = false; this.blocksHeld = false; }   // (nor its word on roadblocks)
    if (this.allyHeld) { const G = W.life && W.life.gangs; if (G) G.allies.clear(); this.allyHeld = false; }   // (nor its allies and truces)
    if (this.servicesHeld) { const S = W.life && W.life.services; if (S) S.held.clear(); this.servicesHeld = false; }   // (nor a service stood down)
    if (W.stage && W.stage.pointRail) W.stage.pointRail(null);   // (nor a set piece's rail)
    if (W.slowmo) W.slowmo(1);   // (nor its slow motion)
    if (this.weatherHeld) { if (W.weather) W.weather.release(); this.weatherHeld = false; }   // (nor its weather)
  }
  /** after a pass, back to idle (the card read) */
  done() { if (this.state === 'passed') this.state = 'idle'; }
  /** the mission's share of the sim hash */
  hash() {
    if (!this.active) return [0];
    return [this.stageIdx + 1, Math.round(this.t * 10), this.state === 'failed' ? 1 : 0, ...(this.actors ? this.actors.hash() : [])];
  }
}
const safe = f => { try { return f(); } catch { return false; } };
const isActor = a => a && typeof a === 'object' && !Array.isArray(a) && typeof a.x === 'number';
const alive = a => a && !a.dead && !a.wrecked && !a.out;   // (out: taken down)
const done = a => a.dead || a.wrecked || a.out || !!(a.damage && a.damage.burning);   // (a vehicle on fire: its wreck is coming)
// a run of ops as one op (each started as it comes up)
function chain(m, list) {
  let i = -1, cur = null;
  const go = () => { if (cur && cur.end) cur.end(m); i++; cur = list[i] || null; if (cur && cur.start) cur.start(m); };
  return op((mm, dt) => { if (i < 0) go(); while (cur) { const r = cur.step(mm, dt); if (!r) return undefined; go(); dt = 0; } return { value: true }; },
    { end: () => { if (cur && cur.end) cur.end(m); cur = null; }, nav: mm => (cur && cur.nav ? cur.nav(mm) : null) });
}

/** the m API a stage's setup and run are given (PLAN.md 8.15) */
export class MissionContext {
  constructor(R, k) {
    this.R = R; this.k = k; const W = R.world();
    this.W = W; this.city = W.city; this.fleet = W.fleet; this.crew = W.crew; this.data = R.data; this.level = R.level;
    this.spawn = {
      vehicle: (def, at, o = {}) => R.actors.vehicle(def, at, { ...o, stage: k }),
      ped: (arch, at, o = {}) => R.actors.ped(arch, at, { ...o, stage: k }),
      pickup: (kind, at, o = {}) => R.actors.pickup(kind, at, { ...o, stage: k }),
      prop: (kind, at, o = {}) => R.actors.prop(kind, at, { ...o, stage: k }),
    };
    this.ensure = {   // (a stage's setup restores what it needs: the tagged one if it is still about, else a new one)
      vehicle: (tag, def, at, o = {}) => this.one(tag) || this.spawn.vehicle(def, at, { ...o, tag }),
      ped: (tag, arch, at, o = {}) => this.one(tag) || this.spawn.ped(arch, at, { ...o, tag }),
    };
    const wanted = () => (W.wanted ? W.wanted() : null);
    this.wanted = {
      set: n => { const w = wanted(); if (w) w.set(n); },
      floor: n => { const w = wanted(); if (w) { w.floor(n); R.wantedHeld = true; } },   // (held: lifted when the run ends, however it ends)
      cap: n => { const w = wanted(); if (w) { w.cap(n); R.wantedHeld = true; } },
      clear: () => { const w = wanted(); if (w) { w.clear('mission'); w.floor(0); w.cap(5); } },   // (the heat gone before the cap lifts: no star shows for a step)
      /** roadblocks and spike strips (false: none, while the run lasts: a reel's chase down its own street) */
      blocks: on => { const P = W.life && W.life.police; if (P) { P.noBlocks = !on; R.blocksHeld = true; } },
      get stars() { const w = wanted(); return w ? w.stars : 0; },
    };
  }
  /** the possessed protagonist */
  get player() { return this.crew.ped; }
  /** the vehicle the player is in, or null */
  get vehicle() { const p = this.player; return p && p.seat ? p.seat.vehicle : null; }
  /** the player's body, or the vehicle it rides in */
  get mover() { return this.vehicle || this.player; }
  get elapsed() { return this.R.t; }
  get stageTime() { return this.R.stageT; }
  /** how many times the job has been retried (a stage's setup can tell a retry from the first try) */
  get retries() { return this.R.retries; }
  get rng() { return this.R.rng; }
  get stars() { return this.wanted.stars; }
  /** the game's save, to read (respect, missions done: a choice's terms); the runtime writes what a pass earns */
  get save() { return this.R.save; }
  /** a point of interest's [x, y], or [x, y] itself */
  at(p) { return pointOf(this.city, p); }
  /** the curb spot nearest a point ({ x, y, heading }: a parked car's place), and the lane point nearest it (a car
   *  that drives off from there; o.heading: running that way) */
  curb(at, o = {}) { return curbNear(this.city, at, this.fleet, o.hl || 30, o); }
  lane(at, heading = null, z = null) { return laneNear(this.city, this.W.roads, at, heading, z); }
  /** how far the player (or the vehicle it rides in) is from a point or an actor */
  dist(to) { const q = isActor(to) ? [to.x, to.y] : this.at(to), P = this.mover; return Math.hypot(q[0] - P.x, q[1] - P.y); }
  // ---- objectives, markers, routes (immediate)
  /** what to do now, and the bot's hint for it ({ kind, ...data }: mission/dsl.js HINTS) */
  objective(text, o = {}) {
    if (o.hint) { const bad = checkHint(o.hint); if (bad.length) throw new Error('MOTOR: mission ' + this.R.id + ': ' + bad.join('; ')); }
    this.R.objective = { text, hint: o.hint || null, op: this.R._starting || null };   // (an op's own goes when it ends)
  }
  /** a marker at a point or on an actor (a ring on the floor, a blip on the radar): { remove() }. One made as an op
   *  starts goes when the op ends */
  marker(at, o = {}) {
    const mk = { at: isActor(at) ? null : this.at(at), actor: isActor(at) ? at : null, color: o.color || '#ffe066', r: o.r || 16, blip: o.blip !== false, ring: o.ring !== false, label: o.label || '', gone: false, op: this.R._starting || null, remove() { this.gone = true; } };
    this.R.markers.push(mk); return mk;
  }
  /** a GPS route shown to a point (the radar's line, M9): a marker there, routed */
  route(to, o = {}) { const mk = this.marker(to, o); mk.route = true; return mk; }
  /** the mission's actors with a tag (alive or not), oldest first */
  tagged(tag) { return this.R.actors.tagged(tag); }
  /** the first living actor with a tag, or null */
  one(tag) { return this.tagged(tag).find(alive) || null; }
  /** a gang whose city members stay out of the job's fight (null: none): the player's strays on them and their cars
   *  rally no one and cost no respect, and none go for the player on sight; lifted when the run ends. ally: a job
   *  fought beside that gang (R3's Rats); truce: one fought against its own (G3's), the same thing */
  ally(gang) { const G = this.W.life && this.W.life.gangs; if (!G) return; if (gang) G.allies.add(gang); else G.allies.clear(); this.R.allyHeld = true; }
  truce(gang) { this.ally(gang); }
  /** the city's traffic within r of at taken off the road (a race's marshals clearing its grid: done as the player is
   *  put on it, so nothing is seen to go); how many went */
  clearTraffic(at, r) { const T = this.W.life && this.W.life.traffic, q = this.at(at); return T && q ? T.clear(q[0], q[1], r) : 0; }
  /** the vehicles left standing within r of at (parked or abandoned: nobody in them, none of the job's own) towed away
   *  at once: a door the stage needs kept clear (a car left on the bank's door step had held H4's lobby shut for good,
   *  a player as much as the bot); how many went */
  clearSpot(at, r) {
    const q = this.at(at), F = this.fleet; if (!q || !F) return 0;
    let n = 0;
    for (const v of F.near(q[0], q[1], r + 40)) {
      if (v.owner === 'mission' || v.seats.some(p => p && !p.dead) || v.speed > 2 || boxDistance(v, q[0], q[1]) > r) continue;
      F.remove(v); n++;
    }
    return n;
  }
  /** the city's own service of a kind ('fire' | 'medic' | 'police') takes no new calls while the run lasts: a job that is
   *  that service (Firefighter: the player's the engine on call, and the city's own would come to the same fires) */
  standDown(kind) { const S = this.W.life && this.W.life.services; if (!S) return; S.held.add(kind); this.R.servicesHeld = true; }
  /** put a world vehicle on the job's list under a tag (a garaged car, one the player came in): the hints can name it;
   *  the world's again when the run ends, and a retry never releases it */
  adopt(v, tag) { if (!v) return null; const R = this.R; if (R.actors.entry(v)) return v; const was = v.owner; R.actors._add(v, 'vehicle', { tag, stage: -1 }); v.adopted = was || 'world'; return v; }
  /** the hour on the clock (0..24) */
  get hour() { return this.W.clock ? this.W.clock.hour : 12; }
  /** the crew fund now; and money paid in (n > 0) or out (a bribe: n < 0), with what for */
  get fund() { return this.crew ? this.crew.fund || 0 : 0; }
  pay(n, why = 'mission') { if (this.W.cash) this.W.cash(n, why); }
  /** the GPS's time by road (seconds at the streets' limits) from the player, or their vehicle (or from: an actor or a
   *  point), to a point; null with no way there (a job's clock: a drop's fair time) */
  eta(at, from = null) { const G = this.W.roads && this.W.roads.gps, P = from ? (Array.isArray(from) ? { x: from[0], y: from[1], z: from[2] || 0, heading: 0 } : from) : this.mover, q = this.at(at); if (!G || !P) return null; const r = G.routeTo(P.x, P.y, P.heading ?? P.facing ?? 0, q[0], q[1], { z: P.z || 0, tz: q[2] }); return r ? r.cost : null; }
  /** a body or a vehicle by its id (a BUS event's target or by: who it was, its gang, whose it is), or null */
  byId(id) { const C = this.W.combat, F = this.W.fleet; return (C && C.bodies.find(b => b.id === id)) || (F && F.vehicles.find(v => v.id === id)) || null; }
  /** a blast at a point, nobody's (a drum the fire set off): o { damage (80), splash (56), z (6), fire (false: no
   *  blaze), source ('blast') } */
  blast(at, o = {}) {
    const C = this.W.combat, [x, y] = this.at(at); if (!C) return null;
    const b = C.explosives.blast({ x, y, z: o.z ?? 6, damage: o.damage ?? 80, splash: o.splash ?? 56, by: null, source: o.source || 'blast' }); if (o.fire === false) b.fire = false; return b;
  }
  /** a passer-by sent running from the player (and its troupe with it): a crowd ped, by itself or its id (true: sent) */
  shoo(ped) {
    const C = this.W.life && this.W.life.crowd, P = this.player, id = ped && typeof ped === 'object' ? ped.id : ped; if (!C || !P) return false;
    const q = C.members.find(c => c.ped.id === id); if (!q || q.ped.gang || q.ped.patrol || q.ped.dead) return false;
    for (const c of C.members) if (c === q || (q.ped.troupe && c.ped.troupe === q.ped.troupe)) c.brain.react('flee', { x: P.x, y: P.y, t: 8, force: true });
    return true;
  }
  /** the countdown on the HUD now ({ left, total, stop() }), or null */
  get countdown() { return this.R.timer || null; }
  /** is any guard or enemy with a tag alerted (it saw the player, was hurt, or a mate called it) and still in it (not
   *  taken down, not dead)? A stealth stage's fail */
  alerted(tag) { return this.tagged(tag).some(a => { const e = this.R.actors.entry(a); return !!e && e.alerted && !e.down && !a.dead; }); }
  /** put the player or an actor somewhere: at [x, y] (or a poi), or { in: vehicle, seat } */
  place(actor, to, o = {}) {
    const a = actor === 'player' ? this.player : actor;
    this.R.actors.place(a, to, o);
    if (a === this.player && this.W.snap) this.W.snap();
  }
  /** take an actor out of the world now (a car the garage takes: anyone in it put out beside it first) */
  remove(actor) {
    const a = actor === 'player' ? null : actor; if (!a) return;
    if (a.body && this.player.seat && this.player.seat.vehicle === a) { const P = this.player; a.unseat(P); P.place(a.x + Math.cos(a.heading + Math.PI / 2) * (a.hw + 10), a.y + Math.sin(a.heading + Math.PI / 2) * (a.hw + 10), 0); }
    this.R.actors.release(e => e.a === a);
  }
  /** listen to a BUS event for the stage (the mission's scope: dropped when the stage or the mission ends); returns
   *  the unsubscribe */
  on(ev, fn) { return BUS.on(ev, fn, this.R.scope); }
  /** a fire on the city's grid at a point (radius, seconds of fuel): a firebomb's, a burning wreck's for the
   *  firefighters; and how hot it burns within r of a point now (0: out) */
  /** set a disc alight: at, its radius, the fuel it brings (seconds); o: { vigor (0..1: how keenly it spreads; 1),
   *  spread (false: it burns where it was set and no further: vigour 0), heat (0..1; 1) } */
  fire(at, r = 16, fuel = 20, o = {}) { const C = this.W.combat; if (!C || !C.fire) return; const [x, y] = this.at(at); C.fire.add(x, y, r, o.heat ?? 1, fuel, o.spread === false ? 0 : o.vigor ?? 1); }
  heat(at, r = 24) { const C = this.W.combat, F = C && C.fire; if (!F) return 0; const [x, y] = this.at(at); let h = 0; for (let dy = -r; dy <= r; dy += 8) for (let dx = -r; dx <= r; dx += 8) h = Math.max(h, F.heatAt(x + dx, y + dy)); return h; }
  /** a protagonist's Ped (one not played: placed, seated, given a job's orders) */
  crewPed(id) { const q = this.crew.member(id); return q ? q.ped : null; }
  /** a vehicle kept in the save's garage under an id (it stays in the world, the mission over), and the one kept so */
  stash(v, id, at = null) { if (!v || !this.W.stash) return; this.R.actors.adopt(v); this.W.stash(v, id, at); }
  garaged(id) { return this.W.garaged ? this.W.garaged(id) : null; }
  /** a view for a set piece (ISO, TOP or MODE 7: presentation only, the simulation the same); o.heading: MODE 7's rail
   *  held looking that way (0 or 'north', 90 'east', 180 'south', 270 'west') till the next view call or the job's end */
  view(id, o = {}) {
    const G = this.W.game, S = this.W.stage, h = typeof o.heading === 'string' ? RAIL_HEADINGS[o.heading] : o.heading;
    if (G && G.views && G.views.includes(id)) { if (this.W.setView) this.W.setView(id); else G.setView(id); }   // (the scene's say: the attract mode's VIEW may hold one view throughout)
    if (S && S.pointRail) S.pointRail(id === 'side7' && h !== undefined ? h : null);
  }
  /** play as a protagonist from now (a setup's: no switch camera) */
  as(id) { if (this.crew.active !== id && this.W.possess) this.W.possess(id); }
  /** the player's kit for the stage: { weapons, ammo, select, health, armor, only } (only: these weapons alone for
   *  the mission; the player's own come back when it ends) */
  loadout(o) { this.R.actors.loadout(this.player, o); }
  /** the stage goes on with the stars (the bot doesn't stop to lose them first): a getaway, a tow at two stars */
  allowWanted(on = true) { this.R.allowWanted = on; }
  /** the score under the job (presentation): 'chase', 'tension', or null for none; the radio ducks under it, and the
   *  job's end lets it go */
  music(cue = null) { this.R.music = cue; }
  /** fail the stage when pred(m) holds */
  failIf(pred, reason) { this.R.fails.push({ pred, reason }); }
  /** the clock to an hour; the weather to a state */
  time(h) { if (this.W.clock) this.W.clock.set(h); }
  /** slow motion (a stunt's flight, a reel's moment): the game's speed k (0.1..1; 1 back to normal); gone when the job ends */
  slowmo(k = 1) { if (this.W.slowmo) this.W.slowmo(k); }
  weather(state) { if (this.W.weather) { this.W.weather.set(state); this.R.weatherHeld = true; } }   // (held till the job ends)
  /** into an interior by one of its doors (a setup's), and back out */
  interior(id, door) { if (this.W.enter) this.W.enter(id, door); }
  outside() { if (this.W.leave) this.W.leave(); }
  /** the interior the player is in ({ id, run }), or null */
  get inside() { return this.W.inside ? this.W.inside() : null; }
  /** a countdown on the HUD: run out, the stage fails (o.fail false: it only stops); { left, stop() } */
  timer(secs, o = {}) { const T = { left: secs, total: secs, reason: o.reason || 'time', fail: o.fail, label: o.label || '', paused: false, stop: () => { if (this.R.timer === T) this.R.timer = null; } }; this.R.timer = T; return T; }
  // ---- ops (yield them)
  /** wait s seconds */
  wait(s) { let t = 0; return op((m, dt) => ((t += dt) >= s ? { value: true } : undefined)); }
  /** wait until pred(m) holds (o.timeout: give up after so many seconds, the value false) */
  waitUntil(pred, o = {}) { let t = 0; return op((m, dt) => { if (pred(m)) return { value: true }; if (o.timeout && (t += dt) >= o.timeout) return { value: false }; return undefined; }); }
  /** lines spoken: the subtitles (and live portraits, M9) a few seconds each; o: { name, color, portrait, per } */
  say(lines, o = {}) {
    const list = Array.isArray(lines) ? lines : [lines], per = o.per || 2.6;
    return op(m => (m.R.lines ? undefined : { value: true }), { start: m => { m.R.lines = { list, i: 0, t: per, per, name: o.name || '', color: o.color || '#ffe066', portrait: o.portrait || null }; } });
  }
  /** a cut-scene: the camera rig held on each shot for its time ({ at, zoom, heading, secs }); presentation only */
  cutscene(shots) {
    let i = 0, t = 0;
    return op((m, dt) => {
      const S = this.W.stage, sh = shots[i];
      if (!sh) return { value: true };
      if (S && t === 0) { const [x, y] = this.at(sh.at); S.setRig({ x, y, zoom: sh.zoom || 1, heading: sh.heading }); }
      if ((t += dt) >= (sh.secs || 2)) { i++; t = 0; }
      return undefined;
    }, { end: () => { const S = this.W.stage; if (S) S.setRig(null); } });
  }
  /** get there (within o.radius, 24): on foot or any way (o.vehicle: in that tagged vehicle; o.inVehicle: in one;
   *  o.stopped: and standing); the objective o.text, a marker, the bot's goto hint */
  reach(at, o = {}) {
    const to = this.at(at), r = o.radius || 24;
    const ok = m => {
      if (o.vehicle && (!m.vehicle || m.vehicle !== m.one(o.vehicle))) return false;
      if (o.inVehicle && !m.vehicle) return false;
      if (o.foot && m.vehicle) return false;
      return within(to, m.mover.x, m.mover.y, m.mover.z, r) && (!o.stopped || (m.mover.speed || 0) < 10);
    };
    return op(m => (ok(m) ? { value: true } : undefined), { nav: () => to,
      start: m => { m.objective(o.text || 'Go there', { hint: { kind: 'goto', at: to, radius: r, foot: !!o.foot, vehicle: o.vehicle || null, inVehicle: !!o.inVehicle } }); m.marker(to, { color: o.color || '#ffe066', r: Math.min(r, 24) }); } });
  }
  /** get into a tagged vehicle (at the wheel, unless o.driver is false); its loss fails the stage */
  enter(tag, o = {}) {
    return op(m => {
      const v = m.one(tag); if (!v) { m.R.fail(o.lost || 'the vehicle\'s gone'); return undefined; }
      return m.vehicle === v && (o.driver === false || v.driver === m.player) ? { value: v } : undefined;
    }, { nav: m => m.one(tag), start: m => { m.objective(o.text || 'Get in', { hint: { kind: 'enterVehicle', vehicle: tag } }); const v = m.one(tag); if (v) m.marker(v, { color: '#7ac8ff' }); } });
  }
  /** lose the wanted level (the stars to 0, or below o.below) */
  evade(o = {}) {
    const below = o.below ?? 1;
    return op(m => (m.stars < below ? { value: true } : undefined), { start: m => m.objective(o.text || 'Lose the cops', { hint: { kind: 'evade' } }) });
  }
  /** get what (a tagged vehicle or ped) to the point to (within o.radius, 40; o.stopped: standing there; o.health: the
   *  vehicle above that share of its health, or the stage fails); the objective and the bot's deliver hint */
  deliver(o) {
    const to = this.at(o.to), r = o.radius || 40, text = o.text || 'Deliver it';
    return op(m => {
      const w = m.one(o.what); if (!w) { m.R.fail(o.lost || 'it\'s gone'); return undefined; }
      if (o.health && w.damage && w.damage.share < o.health) { m.R.fail(o.damaged || 'too much damage'); return undefined; }
      const there = Math.hypot(w.x - to[0], w.y - to[1]) < r && (!o.stopped || (w.speed || 0) < 10);
      return there ? { value: true } : undefined;
    }, { nav: m => { const w = m.one(o.what); return w && w.body && m.vehicle !== w ? w : to; },
      start: m => { m.objective(text, { hint: { kind: 'deliver', what: o.what, to, tow: o.tow, health: o.health } }); m.marker(to, { color: '#7aff8a', r: Math.min(r, 28) }); } });   // (health: the bot spares the car)
  }
  /** keep within o.lose (400) of a tagged target until o.until(m) holds (or it gets to o.to); out of reach for o.grace
   *  (4 s) fails the stage */
  follow(tag, o = {}) {
    const lose = o.lose || 400, to = o.to ? this.at(o.to) : null; let far = 0;
    return op((m, dt) => {
      const t = m.one(tag); if (!t) { m.R.fail(o.lost || 'lost them'); return undefined; }
      const P = m.mover, d = Math.hypot(t.x - P.x, t.y - P.y);
      far = d > lose ? far + dt : 0; if (far > (o.grace || 4)) { m.R.fail(o.reason || 'lost them'); return undefined; }
      if (o.near && d < o.near) { m.R.fail(o.spotted || 'they saw you'); return undefined; }
      if (to && Math.hypot(t.x - to[0], t.y - to[1]) < (o.radius || 60)) return { value: true };
      return o.until && o.until(m) ? { value: true } : undefined;
    }, { nav: m => m.one(tag), start: m => { m.objective(o.text || 'Follow them', { hint: { kind: 'follow', target: tag, dist: o.dist || 120 } }); const t = m.one(tag); if (t) m.marker(t, { color: '#ffb03a' }); } });
  }
  /** catch a tagged target: in reach and stopped, or wrecked or dead */
  chase(tag, o = {}) {
    return op(m => {
      const list = m.tagged(tag); if (!list.length) return { value: true };
      const t = list.find(alive); if (!t) return { value: true };
      return m.dist(t) < (o.reach || 30) && (t.speed || 0) < 10 ? { value: true } : undefined;
    }, { nav: m => m.one(tag), start: m => { m.objective(o.text || 'Stop them', { hint: { kind: 'kill', targets: tag } }); const t = m.one(tag); if (t) m.marker(t, { color: '#ff5a4a' }); } });
  }
  /** keep a tagged actor alive until o.until(m) holds: its death fails the stage */
  protect(tag, o = {}) {
    return op(m => {
      const a = m.tagged(tag)[0]; if (!alive(a)) { m.R.fail(o.reason || 'they didn\'t make it'); return undefined; }
      return o.until && o.until(m) ? { value: true } : undefined;
    }, { nav: m => (o.nav ? o.nav(m) : m.one(tag)), start: m => { if (o.text) m.objective(o.text, { hint: o.hint || { kind: 'follow', target: tag, dist: 80 } }); const a = m.one(tag); if (a && o.mark !== false) m.marker(a, { color: '#7ac8ff' }); } });
  }
  /** kill (or wreck) every actor with a tag; o.count: that many of them */
  kill(tag, o = {}) {
    const need = m => (o.count ? Math.min(o.count, m.tagged(tag).length) : m.tagged(tag).length), isDone = o.done ? a => done(a) || !!o.done(a) : done;
    return op(m => (m.tagged(tag).filter(isDone).length >= need(m) ? { value: true } : undefined),
      { nav: m => { const P = m.mover; let b = null, bd = 1e9; for (const a of m.tagged(tag)) if (!isDone(a)) { const d = Math.hypot(a.x - P.x, a.y - P.y); if (d < bd) { bd = d; b = a; } } return b; },
        start: m => { m.objective(o.text || 'Take them out', { hint: { kind: 'kill', targets: tag, done: o.done || null, vehicle: o.vehicle || null } }); for (const a of m.tagged(tag)) if (alive(a) && o.mark !== false) m.marker(a, { color: '#ff5a4a', ring: false }); } });
  }
  /** pick up the mission pickups tagged tag (all of them, or o.count); the hint goes on to the nearest one left as each
   *  is taken */
  collect(tag, o = {}) {
    const left = m => m.tagged(tag).filter(k => !k.taken);
    const near = m => { const P = m.mover; let b = null, bd = 1e9; for (const k of left(m)) { const d = Math.hypot(k.x - P.x, k.y - P.y); if (d < bd) { bd = d; b = [k.x, k.y]; } } return b; };
    let hint = null;
    return op(m => {
      if (m.tagged(tag).length - left(m).length >= (o.count || m.tagged(tag).length)) return { value: true };
      const n = hint && near(m); if (n && (n[0] !== hint.at[0] || n[1] !== hint.at[1])) hint.at = n;
      return undefined;
    }, {
      nav: near,
      start: m => { const k = left(m)[0]; hint = { kind: 'goto', at: k ? [k.x, k.y] : m.at([m.player.x, m.player.y]), foot: true }; m.objective(o.text || 'Pick it up', { hint }); for (const q of left(m)) m.marker([q.x, q.y], { color: '#7aff8a', r: 10 }); } });
  }
  /** a photo (the Snap) of a tagged ped, or of a point (o.range, 160: within it and facing it); o.from: where to take
   *  it from (the bot's) */
  photo(target, o = {}) {
    let got = false, un = null; const range = o.range || 160;
    return op(() => (got ? { value: true } : undefined), {
      nav: m => (o.from ? m.at(o.from) : typeof target === 'string' ? m.one(target) : m.at(target)),
      start: m => {
        const pt = typeof target === 'string' ? null : m.at(target);
        m.objective(o.text || 'Take a photo', { hint: { kind: 'photo', target: typeof target === 'string' ? target : pt, from: o.from ? m.at(o.from) : (pt || null) } });
        un = BUS.on('photo', e => {
          const P = m.player; if (e.by !== P.id) return;
          if (typeof target === 'string') { got = m.tagged(target).some(a => e.targets.includes(a.id)); return; }
          if (e.frame) { got = Math.hypot(pt[0] - e.x, pt[1] - e.y) < e.frame; return; }   // (photo mode's: the point near the picture's middle)
          const dx = pt[0] - e.x, dy = pt[1] - e.y, d = Math.hypot(dx, dy), dir = e.dir || [Math.cos(P.facing), Math.sin(P.facing)];
          got = d < range && (dx * dir[0] + dy * dir[1]) / (d || 1) > .8;
        }, m.R.scope);
        if (pt) m.marker(pt, { color: '#c88aff', r: 12 });
      },
      end: () => { if (un) un(); un = null; } });
  }
  /** the checkpoints of a course in order ([[x, y], ...] or { line, laps }): the race. Its value is the player's place
   *  (1: first; the racers tagged o.racers that finished ahead of it counted) */
  race(course, o = {}) {
    const line = (course.line || course).map(p => this.at(p)), laps = course.laps || 1, r = o.radius || 48; let i = 0, lap = 0;
    return op(m => {
      const P = m.mover, c = line[i];
      if (within(c, P.x, P.y, P.z, r)) { i++; if (i >= line.length) { lap++; i = 0; if (lap >= laps) return { value: o.racers ? m.R.actors.racePlace(o.racers) : 1 }; } m.R.lap = lap; m.R.checkpoint = i; }
      return undefined;
    }, { nav: () => line[i], start: m => { m.objective(o.text || 'Race', { hint: { kind: 'race', line, laps } }); m.R.lap = 0; m.R.checkpoint = 0; m.R.laps = laps; m.R.course = line; },
      end: m => { m.R.course = null; } });
  }
  /** a choice between options ([{ id, text }]): the player picks (the bot: o.bot, or the first); its value the id */
  choice(options, o = {}) {
    return op(m => (m.R.picked ? { value: m.R.picked } : undefined), { start: m => { m.R.picked = null; m.R.choosing = { options, title: o.title || '' }; if (m.W.bot) m.R.picked = o.bot || options[0].id; }, end: m => { m.R.choosing = null; } });
  }
  /** every op done (their values, in order) */
  parallel(ops) {
    const vals = ops.map(() => undefined), done = ops.map(() => false);
    return op((m, dt) => { ops.forEach((q, i) => { if (done[i]) return; const r = q.step(m, dt); if (r) { done[i] = true; vals[i] = r.value; if (q.end) q.end(m); } }); return done.every(Boolean) ? { value: vals } : undefined; },
      { start: m => { for (const q of ops) if (q.start) q.start(m); }, end: m => { ops.forEach((q, i) => { if (!done[i] && q.end) q.end(m); }); }, nav: m => { for (let i = 0; i < ops.length; i++) if (!done[i] && ops[i].nav) { const n = ops[i].nav(m); if (n) return n; } return null; } });
  }
  /** the first op done: its index and value */
  first(ops) {
    return op((m, dt) => { for (let i = 0; i < ops.length; i++) { const r = ops[i].step(m, dt); if (r) return { value: { index: i, value: r.value } }; } return undefined; },
      { start: m => { for (const q of ops) if (q.start) q.start(m); }, end: m => { for (const q of ops) if (q.end) q.end(m); }, nav: m => { for (const q of ops) if (q.nav) { const n = q.nav(m); if (n) return n; } return null; } });
  }
  /** ops one after another, as one op (for parallel and first) */
  sequence(ops) { return chain(this, ops); }
  /** switch to a protagonist (the crew's switch camera, forced: the mission's); o.vignette: as a player's switch, the
   *  vignette played where the camera finds them (a reel's) */
  switchTo(id, o = {}) {
    return op(m => (m.crew.active === id && !m.crew.switching ? { value: true } : undefined), { start: m => { if (m.crew.active !== id && m.W.switchTo) m.W.switchTo(id, o); } });
  }
  /** the mission passed now (the last stage's end does it too) */
  reward() { return op(m => { m.R.pass(); return { value: true }; }); }
}
