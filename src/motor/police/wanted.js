// The wanted level (PLAN.md 8.13): the heat the player's crimes earn, and the stars it shows.
//   - crimes are def('crimes', type, { heat, report, cops, violent }) (content: src/game/crimes.js). One the player
//     commits earns its heat only when someone tells the police: a cop who sees it (police.js: E.sees and a Suspicion a
//     cop, an alert files it at once, with TUNE.copSeenMul more heat) or a civilian witness who phones it in (the
//     crowd's `report`, 2-4 s later, unless the witness is stopped first). A crime nobody saw earns nothing. A crime
//     against someone counts once a victim a while (a beating's punches, the cop and the witness who both tell of it);
//     one against no one once a few seconds a place (an SMG's burst); every kill counts;
//   - heat to stars at TUNE.star1..star5 (20 / 60 / 150 / 300 / 600); a mission may hold a floor or a cap;
//   - while any police unit sees the player the stars are solid and the last-known position follows them; out of sight
//     they flash, the units search outward from where the player was last seen (`search`: the radius grows), and once
//     the player has stayed out of every unit's sight for TUNE.evade1..5 seconds by star, the stars clear (`evaded`);
//   - cleared at once by a respray, a mission pass, being wrecked or nabbed; a bribe takes one star off.
// BUS: wanted (stars, heat, prev) when the stars change · search (x, y, r) once a second while searching · evaded.
// Deterministic: no clock but the steps it is given.
//   const W = new Wanted({ isPlayer });  W.crime(e, { cop })  ·  W.update(dt, { seen, at })  ·  W.stars
import { BUS } from '../core/bus.js';
import { TUNE, knob } from '../core/tune.js';
import { declare, get } from '../core/registry.js';
import { shape } from '../core/schema.js';

declare('crimes', shape({
  name: { type: 'string', req: true }, heat: { type: 'number', req: true, min: 0 },
  report: { type: 'boolean', def: true },    // a civilian who sees it may phone it in (traffic offences: only cops care)
  violent: { type: 'boolean', def: false },  // the crowd runs from it
  severity: { type: 'number', def: 1, min: 0, max: 3 },
}));

knob('Wanted', 'star1', '1 star at heat', 20, 1, 2000, 1, 'Heat for one star');
knob('Wanted', 'star2', '2 stars at heat', 60, 1, 2000, 1, 'Heat for two stars');
knob('Wanted', 'star3', '3 stars at heat', 150, 1, 2000, 1, 'Heat for three stars');
knob('Wanted', 'star4', '4 stars at heat', 300, 1, 4000, 1, 'Heat for four stars');
knob('Wanted', 'star5', '5 stars at heat', 600, 1, 8000, 1, 'Heat for five stars');
knob('Wanted', 'evade1', 'Evade 1 star in', 10, 1, 120, 1, 'Seconds out of every unit\'s sight that clear one star');
knob('Wanted', 'evade2', 'Evade 2 stars in', 15, 1, 120, 1, 'Seconds out of sight that clear two stars');
knob('Wanted', 'evade3', 'Evade 3 stars in', 25, 1, 120, 1, 'Seconds out of sight that clear three stars');
knob('Wanted', 'evade4', 'Evade 4 stars in', 35, 1, 120, 1, 'Seconds out of sight that clear four stars');
knob('Wanted', 'evade5', 'Evade 5 stars in', 45, 1, 180, 1, 'Seconds out of sight that clear five stars');
knob('Wanted', 'copSeenMul', 'Seen by a cop', 1.5, 1, 4, .05, 'Heat a crime earns when a cop sees it, against a civilian\'s report');
knob('Wanted', 'searchR0', 'Search radius', 120, 20, 600, 10, 'The search area\'s radius when the player is first lost (u)');
knob('Wanted', 'searchGrow', 'Search widens', 12, 0, 80, 1, 'How fast the search area widens, u a second');
knob('Wanted', 'searchMax', 'Search radius at most', 520, 100, 1500, 10, 'The widest the search area grows (u)');
const SAME_VICTIM = 30, SAME_T = 6, SAME_R = 120, MAX_HEAT = 2000;   // (s: one count a victim; s and u: one count a place)

export class Wanted {
  /** o: { isPlayer(id) -> bool (an id of one of the crew) } */
  constructor(o = {}) {
    this.isPlayer = o.isPlayer || (() => false);
    this.heat = 0; this.stars = 0; this.floorStars = 0; this.capStars = 5; this.t = 0;
    this.seen = false; this.lastKnown = null; this.lostT = 0; this.searchR = 0; this._searchT = 0;
    this.recent = []; this.log = [];   // (crimes counted lately, for the same-crime rule; what earned heat, for tests and the debug overlay)
  }
  /** the crime type's spec (unknown types earn a little heat) */
  static spec(type) { return get('crimes', type) || { name: type, heat: 5, report: true, violent: false, severity: 1 }; }
  /** a crime someone told the police about: its heat (more when a cop saw it), the last-known position its place.
   *  e: the crime event ({ type, x, y, by, victim }); o: { cop (a cop saw it) }. Returns the heat it earned */
  crime(e, o = {}) {
    if (!e || !this.isPlayer(e.by)) return 0;
    const S = Wanted.spec(e.type);
    // (the same crime again counts once: against the same victim a while, against no one close by and soon after; a cop
    // who saw what was reported adds its share)
    const victim = e.victim ?? null;
    for (const r of this.recent) {
      if (r.type !== e.type || r.victim !== victim) continue;
      if (victim !== null ? this.t - r.t >= SAME_VICTIM : this.t - r.t >= SAME_T || Math.hypot(r.x - e.x, r.y - e.y) >= SAME_R) continue;
      if (o.cop && !r.cop) { r.cop = true; return this._add(S.heat * (TUNE.copSeenMul - 1), e, 'seen'); }
      return 0;
    }
    this.recent.push({ type: e.type, victim: e.victim ?? null, x: e.x, y: e.y, t: this.t, cop: !!o.cop }); if (this.recent.length > 24) this.recent.shift();
    return this._add(S.heat * (o.cop ? TUNE.copSeenMul : 1), e, o.cop ? 'cop' : 'report');
  }
  _add(h, e, how) {
    if (h <= 0) return 0;
    this.heat = Math.min(MAX_HEAT, this.heat + h); this.log.push({ type: e.type, heat: h, how, t: this.t }); if (this.log.length > 40) this.log.shift();
    if (e.x !== undefined && (!this.seen || !this.lastKnown)) { this.lastKnown = { x: e.x, y: e.y }; this.lostT = 0; }   // (a fresh report: the search starts again from there)
    this._restar();
    return h;
  }
  /** the stars the heat earns, within the floor and the cap */
  starsFor(heat) { let s = 0; for (let k = 1; k <= 5; k++) if (heat >= TUNE['star' + k]) s = k; return Math.max(this.floorStars, Math.min(this.capStars, s)); }
  _restar() {
    const prev = this.stars; this.stars = this.starsFor(this.heat);
    if (this.stars !== prev) { if (prev === 0) { this.lostT = 0; } BUS.emit('wanted', { stars: this.stars, heat: Math.round(this.heat), prev }); }
  }
  /** set the stars outright (a mission, a test): the heat at that star's threshold */
  set(n) { n = Math.max(0, Math.min(5, n | 0)); this.heat = n ? TUNE['star' + n] : 0; this._restar(); }
  /** a mission's floor (the stars never fall below it) and cap (never above it); 0 and 5 lift them */
  floor(n) { this.floorStars = Math.max(0, Math.min(5, n | 0)); this._restar(); }
  cap(n) { this.capStars = Math.max(0, Math.min(5, n | 0)); this._restar(); }
  /** a bribe: one star off */
  lose(n = 1) { const s = Math.max(0, this.stars - n); this.heat = s ? TUNE['star' + s] : 0; this._restar(); }
  /** all clear (a respray, a pass, wrecked, nabbed, evaded): why goes in the log */
  clear(why = 'clear') {
    const prev = this.stars; this.heat = 0; this.recent.length = 0; this.lastKnown = null; this.lostT = 0; this.searchR = 0; this.seen = false;
    this.stars = this.starsFor(0); if (prev !== this.stars) BUS.emit('wanted', { stars: this.stars, heat: 0, prev, why });
  }
  /** the evade time for the current stars (s) */
  get evadeTime() { return this.stars ? TUNE['evade' + this.stars] : 0; }
  /** the stars flash (the police lost sight of the player) */
  get flashing() { return this.stars > 0 && !this.seen; }
  /** one step. o: { seen (a unit sees the player now), at: { x, y } (the player) } */
  update(dt, o = {}) {
    this.t += dt;
    if (!this.stars) { this.seen = false; this.searchR = 0; return; }
    this.seen = !!o.seen;
    if (this.seen) { if (o.at) this.lastKnown = { x: o.at.x, y: o.at.y }; this.lostT = 0; this.searchR = 0; return; }
    this.lostT += dt; this.searchR = Math.min(TUNE.searchMax, TUNE.searchR0 + TUNE.searchGrow * this.lostT);
    if ((this._searchT -= dt) <= 0 && this.lastKnown) { this._searchT = 1; BUS.emit('search', { x: this.lastKnown.x, y: this.lastKnown.y, r: Math.round(this.searchR) }); }
    if (this.lostT >= this.evadeTime && this.stars > this.floorStars) { const s = this.stars; this.clear('evaded'); BUS.emit('evaded', { stars: s }); }
  }
  hash() { return [this.stars, Math.round(this.heat), this.seen ? 1 : 0, Math.round(this.lostT * 10)]; }
  toJSON() { return { stars: this.stars, heat: Math.round(this.heat) }; }
}
