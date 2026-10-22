// The career (PLAN.md 8.15, 8.16, 9.4, 9.5): what the play scene runs on top of free roam. It holds the save's
// progress and plays it through MOTOR's systems:
//   - the missions: a giver's marker (a gang's payphone, a character's hangout, the planning board) for every mission
//     whose requirements are met; walk into it for the JOB card (✕ start, ○ later). One mission (or activity) at a
//     time in MOTOR's MissionRuntime: the objective line, the timer, the subtitles, the markers on the floor and the
//     radar; JOB BLOWN (✕ retry the stage, ○ quit to free roam); JOB DONE (the medal, the rewards, the bonus
//     objectives). #mission/<id>/<stage> starts one at a stage;
//   - the activities: a race's start (drive into it), a MAYHEM's skull, a job from the phone in its vehicle;
//   - the random events, in a runtime of their own, while free;
//   - the economy: the seven shops' cards at their doors (a drive-in one opens to a stopped vehicle), the two
//     properties (bought at their door, their till collected by walking up), the cab skip (the phone's Cabs), Moto
//     Tokens, stunt jumps, Kwik-Lux hold-ups;
//   - the save: written at the safehouse (△ SAVE, slot 1) and to the autosave after a mission or a job; ?load=<slot>
//     (or the title's) loads one;
//   - the bot (?bot=1, or a test's): the MissionBot plays the running mission and answers the cards.
// The cards are screens of the 10-foot kit on the UI layer (≤ 6 items a page, ✕ confirms, ○ and Options back out), over
// the game, which plays on under them: each card is a model ({ id, title, color, body, items, back, confirm, auto }, the
// bot's and the tools' handle) shown by cardScreen.
import { E, all, get, BUS, TUNE, knob, MissionRuntime, AmbientEvents, MissionBot, Economy, CONFIRM_ABOVE, amountOf, completion, Collectibles, StuntJumps, Holdups,
  RNG, roadsOf, clearIntent, List, UI, settingsScreen, slotsScreen, hudLayout, footWidth, drawSubtitle, wrapLines, setting } from '../../motor/index.js';
import { makeSaves, blankSave, normalizeSave, PROTAGONISTS } from '../save.js';

knob('Economy', 'cabBase', 'Cab flag fall', 20, 0, 500, 5, 'What a cab costs to start ($)');
knob('Economy', 'cabRate', 'Cab fare per 100 u', 4, 0, 100, 1, 'What a cab costs per 100 units of the trip ($)');
knob('Missions', 'giverReach', 'Giver reach', 18, 6, 60, 1, 'How near a mission\'s marker you walk to be offered the job (u)');
knob('Missions', 'botRetries', 'Bot retries', 4, 0, 10, 1, 'How many times the bot retries a failed stage before it quits (as a player plays it again)');
const MEDAL = { gold: '#ffd23a', silver: '#d8dce8', bronze: '#d08a4a' };
const REASON = { wrecked: 'YOU WERE WRECKED', busted: 'YOU WERE NABBED', time: 'OUT OF TIME' };
const SHOP_R = 20, DRIVE_R = 44, PROP_R = 22, START_STOP = 10;   // (START_STOP: an activity's start asks once the vehicle in it is this slow)
const giverAt = (city, spec) => { const g = spec.giver || {}, gang = g.phone && get('gangs', g.phone), id = g.at || (gang ? gang.phone : null), q = id && city.poi(id); return q ? [q.x, q.y] : null; };

export class Career {
  /** o: { app, world (the play scene's W), save (the save's data, normalized: the scene's own, its respect the gangs'
   *  too), saves (a SaveStore), bot, demo (the attract mode's: the reels its bot plays, no offers, no random events, no
   *  hold-ups, no cards, nothing ever written) } */
  constructor(o) {
    this.app = o.app; this.W = o.world; this.save = o.save || normalizeSave(blankSave()); this.saves = o.saves || makeSaves(); this.demo = !!o.demo; this.lab = !!o.lab;   // (lab: a district not Lowtown's, the Proving Ground's lab or District 2: free roam alone, no tokens, hold-ups or random events)
    const W = this.W, fund = { get: () => W.crew.fund, add: (n, why) => { W.crew.fund = Math.max(0, W.crew.fund + n); BUS.emit('cash', { amount: n, reason: why }); } };
    this.econ = new Economy({ save: this.save, fund });
    this.R = new MissionRuntime({ world: () => W, save: this.save, onEnd: r => this._ended(r) });
    this.events = new AmbientEvents({ world: () => W, save: this.save, onEnd: r => this._eventEnded(r) });
    this.stunts = new StuntJumps({ save: this.save }); this.holdups = null; this.tokens = null;
    this.bot = o.bot ? new MissionBot({ city: W.city, roads: roadsOf(W.city), fleet: W.fleet, junctions: W.junctions, pad: o.bot === 'pad' }) : null;
    this.padMode = o.bot === 'pad'; this.botI = null;   // (the pad pilot's: the bot's Intent kept for a tool to press on a pad, the player's controller read instead)
    this.card = null; this.prompt = null; this.pops = []; this.waypoint = null; this.visited = null; this.t = 0; this.hours = 0; this.botTries = 0; this.unsub = [];
  }
  get busy() { return !!this.card; }
  get running() { return this.R.active; }
  /** after the scene's world is made: the fund, the tokens, the clerks, a loaded save applied; o.mission starts one */
  start(o = {}) {
    const W = this.W, S = this.save;
    W.crew.fund = S.crewFund;
    this.tokens = this.lab ? null : new Collectibles({ combat: W.combat, save: S }).place();
    this.garage = {};   // (the stashed vehicles: back where they were left)
    for (const q of S.garage) { if (!q || !q.id || !q.def || !Array.isArray(q.at)) continue; const v = W.fleet.spawn(q.def, q.at[0], q.at[1], q.at[2] || 0, { color: q.color, mods: q.mods, owner: 'world' }); v.stashed = q.id; this.garage[q.id] = v; }
    this.holdups = this.lab ? null : new Holdups({ city: W.city, combat: W.combat, rng: RNG.stream('shops') });
    if (o.loaded) this._apply(S);
    for (const u of this.unsub) u();
    this.unsub = [BUS.on('busted', () => { if (this.R.state === 'running') this.R.fail('busted'); }, 'scene')];
    if (this.demo) return;   // (the attract mode: its director starts the reels)
    if (o.mission) {   // (#mission/<id>/<stage>: an unknown one is said, and free roam goes on)
      const act = !get('missions', o.mission) && !!get('activities', o.mission);
      if (!act && !get('missions', o.mission)) console.warn('MOTOR: #mission/' + o.mission + ': no such mission or activity');
      else this.startMission(o.mission, { stage: o.stage, activity: act, level: o.level });
    }
    else if (o.newGame) { const intro = all('missions').find(m => m.giver && m.giver.intro && !S.missions.done.includes(m.id)); if (intro) this.startMission(intro.id); }
  }
  dispose() { for (const u of this.unsub) u(); this.unsub = []; if (this.R.active) this.R.quit('scene'); if (this.events.active) this.events.R.quit('scene'); if (this.holdups) this.holdups.dispose(); if (this.bot) this.bot.dispose(); }
  /** the attract mode's: a reel (def('reels')) played by the bot, or the one playing stopped */
  startReel(id) { this.card = null; this.R.start(id, { reel: true }); }
  stopReel() { if (this.R.active) this.R.quit('cut'); }
  /** start a mission or an activity (o.activity) by id, at o.stage, at o.level */
  startMission(id, o = {}) {
    if (this.events.active) this.events.R.quit('busy');
    this.card = null; this.botTries = 0;
    const lvl = o.activity ? o.level || Math.min((get('activities', id).levels || 1), (this.save.activities[id] || 0) + 1) : 1;
    this.R.start(id, { stage: o.stage, activity: !!o.activity, level: lvl });
  }
  /** the missions on offer: requirements met, not done (in the registry's order) */
  available() {
    const S = this.save, done = S.missions.done; if (this.lab) return [];   // (another district: free roam alone, no job on offer)
    return all('missions').filter(m => !done.includes(m.id) && (m.requires || []).every(r => done.includes(r)) && (!m.unlock || m.unlock(S, this.W)) && giverAt(this.W.city, m));
  }
  // Spray & Pray's yard while the player can pay for a respray (the bot's way to lose the stars), else null
  _respray() { const q = this.W.city.poi('spray-pray'); return q && this.W.crew.fund >= (TUNE.resprayFee ?? 100) ? [q.x, q.y] : null; }
  /** where a mission's giver stands: [x, y] (its marker), or null */
  giverOf(m) { return giverAt(this.W.city, m); }
  /** the activities with a place to start: [{ spec, at }] (jobs start from the phone) */
  startable() { if (this.lab) return []; return all('activities').filter(a => a.start && a.start.at && a.kind !== 'event').map(a => ({ spec: a, at: this.W.city.poi(a.start.at) ? [this.W.city.poi(a.start.at).x, this.W.city.poi(a.start.at).y] : a.start.at })); }
  // ---- each step
  /** ctx: { p (the possessed ped), I (its intent), inside, busy (a wheel, the switch camera, a door's fade), down
   *  (WRECKED or NABBED playing), dt }. Returns the Intent to use: the bot's while it plays */
  update(dt, ctx) {
    const W = this.W, p = ctx.p, S = this.save; this.t += dt;
    S.crewFund = W.crew.fund; S.playtime += dt;
    // the clock: each midnight pays the properties
    const day = W.clock.day; if (this.lastDay !== undefined) for (let k = this.lastDay; k < day; k++) { this.econ.midnight(id => get('properties', id)); S.gameDay++; }
    this.lastDay = day; this.hours = day * 24 + W.clock.hour;
    for (const q of this.pops) q.t -= dt; this.pops = this.pops.filter(q => q.t > 0);
    let I = ctx.I;
    this.botI = null;
    if (this.bot && this.R.state === 'running' && !ctx.busy && !ctx.down) { const B = this.bot.update(dt, p, this.R, { t: W.life ? W.life.t : 0, pedsNear: W.life ? (x, y, r) => W.life.pedsNear(x, y, r) : null, wet: W.weather.wet, wanted: W.wanted(), police: W.life && W.life.police, inside: ctx.inside, heat: W.combat && W.combat.fire ? (x, y) => W.combat.fire.heatAt(x, y) : null, respray: this._respray() }); if (this.padMode) this.botI = B; else I = B; }
    if (this.card) I = clearIntent(I);   // (the card's own input is the screens': MOTOR's step wrapper gave it first)
    this.R.update(dt);   // (WRECKED or NABBED fails the job at once; JOB BLOWN waits for the card)
    if (this.demo) { const v = p.seat && p.seat.vehicle, st = this.stunts.update(dt, v && v.driver === p ? v : null); if (st && st.ok) this.pop('STUNT  ' + st.name.toUpperCase(), st.score + ' PTS', '#5af0ff'); return I; }   // (the attract mode: its director sees a reel's end; a stunt still shows)
    if (this.R.state === 'failed' && !ctx.down && !this.card) this._blown();
    if (this.R.state === 'passed' && !this.card) this._jobDone();
    if (this.R.choosing && !this.card && !this.R.picked) this._choice();
    if (!this.lab) this.events.update(dt, { free: !this.R.active && !ctx.inside && !this.card, player: p });
    // free roam: the givers, the starts, the shops, the properties, the safehouse; the stunts and the tokens always
    const v = p.seat && p.seat.vehicle;
    const st = this.stunts.update(dt, v && v.driver === p ? v : null);
    if (st && st.ok) { if (st.reward) this.econ.fund.add(st.reward, 'stunt'); this.pop(`${st.first ? 'UNIQUE STUNT' : 'STUNT'}  ${st.name.toUpperCase()}`, st.reward ? '+$' + st.reward : st.score + ' PTS', '#5af0ff'); }
    this.prompt = null;
    if (!ctx.inside && !ctx.down && !ctx.busy && !this.card && !p.dead) {
      const hu = this.holdups && this.holdups.update(dt, p, { hours: this.hours, crime: e => { const w = W.wanted(); if (w) w.crime(e); } });
      if (hu) this.pop('HOLD-UP  ' + hu.name.toUpperCase(), '+$' + hu.cash + ' ON THE COUNTER', '#ff8a5a');
      if (!this.R.active) this._free(p, v, I);
      else { const h = this.R.objective && this.R.objective.hint; if (h && h.kind === 'goto' && h.interact && !v) this._doors(p, h.at); }   // (a job's own △ at a door: the prologue's save)
    }
    if (this.bot && !this.R.active && this.R.state === 'idle' && this.card && this.card.auto) this.card.auto();
    return I;
  }
  // free roam's offers: a giver walked into, an activity's start, a drive-in shop, a door's prompt. A marker the player
  // is standing in when free roam begins (a spawn at the chapel, on the prologue's) asks only once they have left it
  _free(p, v, I) {
    const W = this.W, C = W.city, R2 = TUNE.giverReach, quiet = !this.armed; this.armed = true;
    if (!v && !p.boarding) for (const m of this.available()) { const at = giverAt(C, m); if (Math.hypot(at[0] - p.x, at[1] - p.y) < R2) { if (this.visited !== m.id) { this.visited = m.id; if (!quiet) this._jobCard(m); } return; } }
    for (const { spec, at } of this.startable()) {
      const need = spec.start.vehicle; if (need && !v) continue; if (spec.start.foot && v) continue;
      const P = v || p; if (Math.hypot(at[0] - P.x, at[1] - P.y) < (spec.start.radius || 26)) { if (v && v.speed > START_STOP) return; if (this.visited !== spec.id) { this.visited = spec.id; if (!quiet) this._activityCard(spec); } return; }   // (a vehicle stopped in the start: driving by it asks nothing)
    }
    this.visited = null;
    // a drive-in shop: the vehicle stopped in its yard
    if (v && v.driver === p && v.speed < 6) for (const s of all('shops')) { if (!s.drive) continue; const q = C.poi(s.poi); if (q && Math.hypot(q.x - v.x, q.y - v.y) < DRIVE_R) { if (this.shopVisit !== s.id) { this.shopVisit = s.id; this._shopCard(s, { ped: p, vehicle: v }); } return; } }
    if (v && v.speed > 30) this.shopVisit = null;
    if (v) return;
    this._doors(p, null);
  }
  // on foot at a door (near only, when given): a shop, a property, the safehouse
  _doors(p, only) {
    const C = this.W.city, near = q => !only || Math.hypot(q.x - only[0], q.y - only[1]) < 30;
    for (const s of all('shops')) { if (s.drive) continue; const q = C.poi(s.poi); if (q && near(q) && Math.hypot(q.x - p.x, q.y - p.y) < SHOP_R) { this.prompt = { text: `{onFoot:interact} SHOP  ${s.name.toUpperCase()}`, color: s.color, act: () => this._shopCard(s, { ped: p }) }; return; } }
    for (const pr of all('properties')) {
      const q = C.poi(pr.poi); if (!q || !near(q) || Math.hypot(q.x - p.x, q.y - p.y) > PROP_R) continue;
      const own = this.econ.owned(pr.id);
      if (own) { const n = this.econ.collect(pr.id); if (n) this.pop(pr.name.toUpperCase(), '+$' + n, '#5aff8a'); return; }
      const price = Math.round(amountOf(pr.price)); this.prompt = { text: `{onFoot:interact} BUY  ${pr.name.toUpperCase()}  $${price.toLocaleString('en-US')}`, color: '#5aff8a', act: () => this._buyProperty(pr) }; return;
    }
    const safe = C.poi('safehouse'); if (safe && near(safe) && Math.hypot(safe.x - p.x, safe.y - p.y) < SHOP_R) this.prompt = { text: '{onFoot:interact} SAVE', color: '#7af0ff', act: () => this.saveScreen() };
  }
  /** keep a vehicle in the save's garage (a mission's stash), and the one kept under an id (null: gone or wrecked) */
  stash(v, id, at = null) {
    const S = this.save, q = { id, def: v.def.id, color: v.color, mods: { ...v.mods }, at: at || [Math.round(v.x), Math.round(v.y), +v.heading.toFixed(3)] };
    S.garage = S.garage.filter(g => g.id !== id); S.garage.push(q); v.stashed = id; v.owner = 'world'; this.garage[id] = v;
  }
  garaged(id) { const v = this.garage && this.garage[id]; return v && !v.wrecked && this.W.fleet.vehicles.includes(v) ? v : null; }
  /** a pickup walked over: a Moto Token or a mission's item (true: used); null: not the career's */
  take(p, k) {
    if (k.kind === 'token') { const f = this.tokens && this.tokens.found(k); if (!f) return true; if (f.reward) this.econ.fund.add(f.reward, 'token'); if (f.all) this.econ.fund.add(f.all, 'tokens'); this.pop(`MOTO TOKEN  ${f.of - f.left}/${f.of}`, '+$' + (f.reward + f.all), '#ff7ac8'); return true; }
    if (k.kind === 'item') { BUS.emit('pickup', { item: k.item, by: p.id }); return true; }
    return null;
  }
  /** a mission vehicle's driver's Intent (the fleet asks) */
  intentFor(v) { return (this.R.actors && this.R.active && this.R.actors.intentFor(v)) || (this.events.R.actors && this.events.active && this.events.R.actors.intentFor(v)) || null; }
  /** a big-number pop: a title and a line, a few seconds */
  pop(title, line, color = '#ffe066') { this.pops.push({ title, line, color, t: 2.6 }); if (this.pops.length > 3) this.pops.shift(); }
  // ---- the run's ends
  _ended(r) {
    if (this.demo) return;
    if (r.passed && (r.kind === 'mission' || (get('activities', r.id) || {}).kind === 'job') && setting(this.app.game, 'autosave', true)) this.write('auto');   // (the autosave: after missions and jobs, PLAN.md 8.19; Settings, Game, can turn it off)
  }
  _eventEnded(r) { if (r.passed) { const c = r.rewards && r.rewards.cash; this.pop((r.title || 'NICE').toUpperCase(), c ? '+$' + c : '', '#7aff8a'); } }
  // ---- the cards: { id, title, color, body: [lines], items: [{ label, sub, right, disabled, act }], sel, legend, back,
  // confirm (no items: ✕ continues), auto (the bot's answer), medal, style ('phone') }, each shown as a screen
  _open(card) {
    const U = this.app.ui.screens, mine = U.top && U.top.career === this;
    this.card = { sel: 0, ...card };
    const scr = cardScreen(this, this.card); if (mine) U.replace(scr); else U.open(scr);   // (one card at a time: the next in its place)
  }
  close() { const U = this.app.ui.screens; if (this.card && U.top && U.top.career === this) U.back(); this.card = null; }
  _jobCard(m) {
    const rw = m.rewards || {}, resp = Object.entries(rw.respect || {}).map(([g, d]) => `${(get('gangs', g) || { name: g }).name} ${d > 0 ? '+' : ''}${d}`).join('   ');
    this._open({ id: 'job', title: m.title.toUpperCase(), color: (m.gang && get('gangs', m.gang) && get('gangs', m.gang).colors[0]) || '#ffe066',
      body: [...(m.brief || []), '', `$${(rw.cash || 0).toLocaleString('en-US')}${resp ? '   ' + resp : ''}`, m.plays && m.plays !== 'any' ? 'PLAYS AS ' + (get('characters', m.plays) || { name: m.plays }).name.toUpperCase() : ''].filter((l, i, a) => l !== '' || a[i - 1] !== ''),
      items: [{ label: 'START THE JOB', act: () => { this.close(); this.startMission(m.id); } }, { label: 'NOT NOW', act: () => this.close() }],
      auto: () => { this.close(); this.startMission(m.id); } });
  }
  _activityCard(a) {
    const next = Math.min(a.levels || 1, (this.save.activities[a.id] || 0) + 1), rw = (a.rewardsFor ? a.rewardsFor(next) : a.rewards) || {};
    this._open({ id: 'activity', title: a.title.toUpperCase(), color: '#5af0ff', body: [...(a.brief || []), '', (a.levels > 1 ? `LEVEL ${next}/${a.levels}   ` : '') + `$${(rw.cash || 0).toLocaleString('en-US')}`],
      items: [{ label: 'START', act: () => { this.close(); this.startMission(a.id, { activity: true, level: next }); } }, { label: 'NOT NOW', act: () => this.close() }],
      auto: () => { this.close(); this.startMission(a.id, { activity: true, level: next }); } });
  }
  _blown() {
    const R = this.R;
    if (this.bot) { if (this.botTries < TUNE.botRetries) { this.botTries++; R.retry(); } else R.quit(); return; }
    this._open({ id: 'blown', title: 'JOB BLOWN', color: '#ff3a3a', body: [(REASON[R.failure] || String(R.failure || '').toUpperCase())],
      items: [{ label: 'RETRY THIS STAGE', act: () => { this.close(); R.retry(); } }, { label: 'QUIT TO FREE ROAM', act: () => { this.close(); R.quit(); } }], back: () => { this.close(); R.quit(); } });
  }
  _jobDone() {
    const R = this.R, r = R.result || {};
    if (this.bot) { R.done(); return; }
    const rw = r.rewards || {}, body = [];
    if (r.kind === 'activity' && (get('activities', r.id) || {}).levels > 1) body.push(`LEVEL ${r.level} DONE`);
    body.push({ text: `+$${(rw.cash || 0).toLocaleString('en-US')}`, color: '#7aff8a', scale: 2 });   // (the big number)
    for (const [g, d] of Object.entries(rw.respect || {})) body.push(`${(get('gangs', g) || { name: g }).name.toUpperCase()}  ${d > 0 ? '+' : ''}${d} RESPECT`);
    for (const b of r.bonus || []) body.push(`${b.ok ? '[X]' : '[ ]'} ${b.text}`);
    body.push(`TIME ${Math.floor(r.elapsed / 60)}:${String(Math.floor(r.elapsed % 60)).padStart(2, '0')}`);
    this._open({ id: 'done', title: 'JOB DONE!', color: '#7aff8a', medal: r.kind === 'mission' ? r.medal : null, body, items: [], confirm: () => { this.close(); R.done(); }, back: () => { this.close(); R.done(); } });
  }
  _choice() {
    const R = this.R, c = R.choosing;
    this._open({ id: 'choice', title: (c.title || 'CHOOSE').toUpperCase(), color: '#ffe066', body: [], items: c.options.map(o => ({ label: o.text.toUpperCase(), sub: o.sub || '', disabled: o.disabled, act: () => { this.close(); R.picked = o.id; } })), back: () => {} });
  }
  // ---- shops and properties
  _shopCard(s, ctx) {
    const items = s.items.filter(it => !it.unlock || this.save.missions.done.includes(it.unlock) || it.kind !== 'weapon').map(it => {
      const c = this.econ.check(it, ctx), why = c.reason === 'none' && it.kind === 'ammo' ? 'NO GUN' : { cash: 'NOT ENOUGH CASH', full: 'FULL', have: 'FITTED', vehicle: 'DRIVE IN', none: '—' }[c.reason] || '';
      return { label: it.name.toUpperCase(), right: '$' + c.price.toLocaleString('en-US'), sub: c.ok ? '' : why, disabled: !c.ok, act: () => (c.confirm ? this._confirm(s, it, ctx, c.price) : this._buy(s, it, ctx)) };
    });
    this._open({ id: 'shop', title: s.name.toUpperCase(), color: s.color, body: [`CASH  $${this.W.crew.fund.toLocaleString('en-US')}`], items, shop: s, ctx, back: () => this.close() });
  }
  _buy(s, it, ctx) {
    const r = this.econ.buy(s.id, it, { ...ctx, outfit: i => this.W.outfit && this.W.outfit(i) });
    if (r.ok) this.pop(it.name.toUpperCase(), '-$' + r.price, s.color);
    const sel = this.card ? this.card.sel : 0; this._shopCard(s, ctx); this.card.sel = sel;   // (the card again: what can be bought now)
  }
  _confirm(s, it, ctx, price) {
    this._open({ id: 'confirm', title: 'BUY ' + it.name.toUpperCase() + '?', color: s.color, body: [`$${price.toLocaleString('en-US')}`], items: [{ label: 'NO', act: () => this._shopCard(s, ctx) }, { label: 'BUY IT', act: () => this._buy(s, it, ctx) }], back: () => this._shopCard(s, ctx) });
  }
  _buyProperty(pr) {
    const price = Math.round(amountOf(pr.price)), go = () => { const r = this.econ.buyProperty(pr.id, pr); this.close(); if (r.ok) this.pop(pr.name.toUpperCase() + ' IS YOURS', '-$' + price.toLocaleString('en-US'), '#5aff8a'); else this.pop('NOT ENOUGH CASH', '$' + price.toLocaleString('en-US'), '#ff5a4a'); };
    if (price > CONFIRM_ABOVE) this._open({ id: 'confirm', title: 'BUY ' + pr.name.toUpperCase() + '?', color: '#5aff8a', body: [`$${price.toLocaleString('en-US')}`, `PAYS $${Math.round(amountOf(pr.income))} EVERY MIDNIGHT`], items: [{ label: 'NO', act: () => this.close() }, { label: 'BUY IT', act: go }] });
    else go();
  }
  // ---- the phone (PLAN.md 8.18): CONTACTS (the jobs' givers, Lowtown Cabs), TEXTS, JOBS, SNAP, SETTINGS; a job the
  // vehicle you sit in can start now comes first
  phone() {
    if (this.card || this.R.active) return;
    const W = this.W, p = W.crew.ped, v = p.seat && p.seat.vehicle, items = []; this._phoneSel = 0;
    for (const a of all('activities').filter(q => q.kind === 'job' && q.start && q.start.vehicle && v && v.driver === p && fits(q.start.vehicle, v))) {
      const next = Math.min(a.levels || 1, (this.save.activities[a.id] || 0) + 1);
      items.push({ label: a.title.toUpperCase(), sub: `START  LEVEL ${next}/${a.levels || 1}`, icon: 'job', color: '#ffd23a', act: () => { this.close(); this.startMission(a.id, { activity: true, level: next }); } });
    }
    const offers = this.available().length, texts = this._textList().length;
    items.push({ label: 'CONTACTS', sub: `${offers} JOB${offers === 1 ? '' : 'S'} ON OFFER`, icon: 'contacts', act: this._app(() => this._contacts()) });
    items.push({ label: 'TEXTS', sub: texts ? `${texts} UNREAD` : 'NOTHING NEW', icon: 'texts', act: this._app(() => this._texts()) });
    items.push({ label: 'JOBS', sub: 'TAXI, AMBULANCE, MORE', icon: 'jobs', act: this._app(() => this._jobs()) });
    items.push({ label: 'SNAP', sub: 'PHOTO MODE', icon: 'snap', disabled: !this.W.photo, act: () => { this.close(); if (this.W.photo) this.W.photo(); } });
    items.push({ label: 'SETTINGS', icon: 'settings', act: () => this.app.ui.screens.open(settingsScreen(this.app)) });
    this._open({ id: 'phone', style: 'phone', title: 'PHONE', color: '#7af0ff', body: [], items, legend: '{menu:confirm} OPEN   {menu:back} HANG UP' });
  }
  _cabs() {
    const W = this.W, p = W.crew.ped, kinds = new Set(['safehouse', 'shop', 'property', 'gang', 'landmark', 'hospital', 'police', 'marina']), stars = W.wanted() ? W.wanted().stars : 0, v = p.seat && p.seat.vehicle;
    const dests = W.city.pois.filter(q => kinds.has(q.kind) && q.label).sort((a, b) => a.label.localeCompare(b.label));
    const why = stars ? 'NOT WHILE WANTED' : v ? 'ON FOOT ONLY' : '';
    this._open({ id: 'cabs', style: 'phone', title: 'LOWTOWN CABS', color: '#ffd23a', body: [why || `CASH  $${W.crew.fund.toLocaleString('en-US')}`], back: () => this._contacts(),
      items: dests.map(q => { const fee = this.cabFee(p, q); return { label: q.label.toUpperCase(), right: '$' + fee, icon: 'cab', disabled: !!why || fee > W.crew.fund, act: () => this.cab(q) }; }) });
  }
  phone_() { const sel = this._phoneSel || 0; this.close(); this.phone(); if (this.card) { this.card.sel = Math.min(sel, this.card.items.length - 1); this._phoneSel = sel; } }   // (back on the app it opened)
  _app(open) { return () => { this._phoneSel = this.card ? this.card.sel : 0; open(); }; }
  /** a cab's fare from the ped to a point of interest */
  cabFee(p, q) { return Math.round(TUNE.cabBase + Math.hypot(q.x - p.x, q.y - p.y) / 100 * TUNE.cabRate); }
  /** the cab skip: a fade, the fare, and there on foot */
  cab(q) {
    const W = this.W, p = W.crew.ped, fee = this.cabFee(p, q); if (fee > W.crew.fund) return false;
    this.close(); this.econ.fund.add(-fee, 'cab'); BUS.emit('cab', { to: q.id, fee });
    W.fade(() => { p.place(q.x, q.y, 0); p.mover.vx = p.mover.vy = 0; W.snap(); });
    return true;
  }
  // a giver's name: the gang's, the crew member's, or the planning board
  _giverName(m) { return m.gang ? (get('gangs', m.gang) || { name: m.gang }).name.toUpperCase() : m.giver && m.giver.at ? (get('characters', String(m.giver.at).split('-')[0]) || { name: 'VIV' }).name.toUpperCase() : 'THE CREW'; }
  _mark(m) { const at = giverAt(this.W.city, m); this.waypoint = at; this.close(); this.pop('MARKED ON THE MAP', m.title.toUpperCase(), '#7af0ff'); }
  _contacts() {
    const stars = this.W.wanted() ? this.W.wanted().stars : 0;
    const items = [{ label: 'LOWTOWN CABS', sub: stars ? 'NOT WHILE WANTED' : 'A RIDE ANYWHERE', icon: 'cab', color: '#ffd23a', act: () => this._cabs() },
      ...this.available().map(m => ({ label: this._giverName(m), sub: m.title.toUpperCase(), icon: 'pin', color: (m.gang && get('gangs', m.gang) ? get('gangs', m.gang).colors[0] : '#ffe066'), act: () => this._mark(m) }))];
    this._open({ id: 'contacts', style: 'phone', title: 'CONTACTS', color: '#7af0ff', body: [], items, back: () => this.phone_() });
  }
  // the texts: a line from each giver with a job on offer
  _textList() { return this.available().filter(m => (m.brief || []).length); }
  _texts() {
    const list = this._textList(), items = list.map(m => ({ label: this._giverName(m), sub: m.title.toUpperCase(), icon: 'texts', act: () => this._text(m) }));
    this._open({ id: 'texts', style: 'phone', title: 'TEXTS', color: '#7af0ff', body: items.length ? [] : ['NOTHING NEW'], items, back: () => this.phone_() });
  }
  _text(m) {
    this._open({ id: 'text', style: 'phone', title: this._giverName(m), color: (m.gang && get('gangs', m.gang) ? get('gangs', m.gang).colors[0] : '#7af0ff'), body: (m.brief || []).flatMap(l => E.font.wrap(l, 160, {})),
      items: [{ label: 'MARK IT ON THE MAP', icon: 'pin', act: () => this._mark(m) }], back: () => this._texts() });
  }
  _jobs() {
    const W = this.W, p = W.crew.ped, v = p.seat && p.seat.vehicle;
    const items = all('activities').filter(a => a.kind === 'job' && a.start && a.start.vehicle).map(a => {
      const next = Math.min(a.levels || 1, (this.save.activities[a.id] || 0) + 1), ok = !!v && v.driver === p && fits(a.start.vehicle, v), need = [].concat(a.start.vehicle)[0];
      return { label: a.title.toUpperCase(), sub: ok ? `START  LEVEL ${next}/${a.levels || 1}` : 'IN ' + ((get('vehicles', need) || {}).name || String(need)).toUpperCase(), icon: 'job', disabled: !ok, act: () => { this.close(); this.startMission(a.id, { activity: true, level: next }); } };
    });
    this._open({ id: 'jobs', style: 'phone', title: 'JOBS', color: '#ffd23a', body: items.length ? [] : ['NO JOBS YET'], items, back: () => this.phone_() });
  }
  // ---- saving
  /** the save from the live world */
  snapshot() {
    const W = this.W, S = this.save, out = JSON.parse(JSON.stringify(S));
    out.crewFund = W.crew.fund; out.active = W.crew.active; out.clock = W.clock.hour; out.weather = W.weather.state;
    for (const id of PROTAGONISTS) { const m = W.crew.member(id); if (!m) continue; const j = m.ped.toJSON(), q = out.protagonists[id]; q.pos = j.pos; q.health = j.health; q.armor = j.armor; q.weapons = j.weapons; q.ammo = j.ammo; q.ability = j.ability; q.outfit = m.outfit || 0; if (j.stats) q.stats = { ...q.stats, ...j.stats }; }
    if (W.life && W.life.gangs) out.respect = { ...W.life.gangs.respect };
    out.completion = completion(S).pct;
    return out;
  }
  /** the safehouse's save: the three slots as cards (over a used one asked first) */
  saveScreen() { this.app.ui.screens.open(slotsScreen(this.app, { mode: 'save', saves: this.saves, onSave: slot => this.write(slot, true) })); }
  /** write the save to a slot (toast: say so) */
  write(slot, toast = false) {
    if (this.demo) return { ok: false, reason: 'the demo' };   // (the attract mode never writes)
    const r = this.saves.write(slot, this.snapshot()); if (r.ok) BUS.emit('save', { slot });
    if (toast) this.pop(r.ok ? 'GAME SAVED' : 'NOT SAVED', r.ok ? 'SLOT ' + slot : (r.reason || '').toUpperCase(), r.ok ? '#7af0ff' : '#ff5a4a');
    return r;
  }
  // a loaded save on the live world: where each one stands, what they carry, who is played, the hour
  _apply(S) {
    const W = this.W;
    for (const id of PROTAGONISTS) {
      const m = W.crew.member(id), q = S.protagonists[id]; if (!m || !q) continue; const p = m.ped;
      if (q.pos) p.place(q.pos[0], q.pos[1], q.pos[2] || 0);
      p.vitals.health = q.health; p.vitals.armor = q.armor;
      for (const w of q.weapons) if (w !== 'fists') p.inv.give(w, 0, true);
      for (const [w, n] of Object.entries(q.ammo || {})) if (p.inv.has(w)) { p.inv.ammo[w] = n; p.inv.mag[w] = Math.min(p.inv.mag[w] ?? 0, n); }
    }
    if (S.active && S.active !== W.crew.active) W.crew.possess(S.active);
    if (W.clock.set) W.clock.set(S.clock);
    W.snap();
  }
  // ---- drawing (inside the stage: floor rings, the mission's peds and props; the overlay: everything else)
  draw(stage, fx, fy, reach) {
    const W = this.W, t = W.game.real || 0, ring = W.ring;
    if (this.R.actors && this.R.active) this.R.actors.draw(stage, fx, fy, reach);
    if (this.events.R.actors && this.events.active) this.events.R.actors.draw(stage, fx, fy, reach);
    if (this.holdups) this.holdups.draw(stage, fx, fy, reach);
    const near = (x, y) => Math.abs(x - fx) < reach && Math.abs(y - fy) < reach;
    for (const mk of this.R.markers) { if (mk.gone || !mk.ring) continue; const a = mk.actor, x = a ? a.x : mk.at[0], y = a ? a.y : mk.at[1]; if (near(x, y)) ring(x, y, mk.color, a ? Math.max(10, (a.hl || 8) + 4) : mk.r, t); }
    if (!this.R.active) {
      for (const m of this.available()) { const at = giverAt(W.city, m); if (near(at[0], at[1])) ring(at[0], at[1], (m.gang && get('gangs', m.gang) ? get('gangs', m.gang).colors[0] : '#ffe066'), 12, t); }
      for (const { at } of this.startable()) if (near(at[0], at[1])) ring(at[0], at[1], '#5af0ff', 22, t);
      if (this.waypoint && near(this.waypoint[0], this.waypoint[1])) ring(this.waypoint[0], this.waypoint[1], '#7af0ff', 16, t);
    }
  }
  /** where the GPS leads: the waypoint, else the running job's first marker on the radar ([x, y] or null) */
  gpsGoal() {
    if (this.waypoint) return this.waypoint;
    if (!this.R.active) return null;
    const mk = this.R.markers.find(q => !q.gone && q.blip); if (!mk) return null; const a = mk.actor;
    return a ? [Math.round(a.x / 16) * 16, Math.round(a.y / 16) * 16] : mk.at;   // (a moving goal in steps of a tile: the line is worked out again as it moves)
  }
  /** the radar's blips: [{ x, y, color, shape }] (o.waypoint false: without the waypoint, which the big map draws itself) */
  blips(o = {}) {
    const out = [];
    // (the job's own markers and the waypoint pinned to the rim when far: which way to go)
    if (this.R.active) { for (const mk of this.R.markers) if (!mk.gone && mk.blip) { const a = mk.actor; out.push({ x: a ? a.x : mk.at[0], y: a ? a.y : mk.at[1], color: mk.color, shape: a ? 'diamond' : 'square', edge: true }); } }
    else {
      for (const m of this.available()) { const at = giverAt(this.W.city, m), g = m.gang && get('gangs', m.gang); out.push({ x: at[0], y: at[1], color: g ? g.colors[0] : '#ffe066', shape: g ? g.icon || 'square' : 'square', label: m.title }); }
      for (const { at } of this.startable()) out.push({ x: at[0], y: at[1], color: '#5af0ff', shape: 'flag' });
      if (this.waypoint && o.waypoint !== false) out.push({ x: this.waypoint[0], y: this.waypoint[1], color: '#7af0ff', shape: 'flag', edge: true });
    }
    return out;
  }
  /** the HUD's part, on the UI layer: the objective, the timer, the race's checkpoint, the subtitles (Settings: on by
   *  default, the speaker's name in colour), the pops, a hold-up's bar, the prompt at a door (o.blocked: another's) */
  hud(P, o = {}) {
    const R = this.R, t = this.W.game.real || 0, L = hudLayout(P), cx = P.W / 2, fw = footWidth(P);
    if (R.state === 'running' && R.objective && !this.card && !this.demo) {   // (on a band of its own: over a busy street it had blurred into the scene)
      // (a control named in it, '{interact} to hop on': drawn in the player's own glyphs)
      const tok = r => /\{[a-zA-Z]+(:[a-zA-Z]+)?\}/.test(r), wd = r => (tok(r) ? P.promptWidth(r) : P.width(r));
      const rows = wrapLines(P, R.objective.text, fw - 14).slice(0, 2), bw = Math.min(fw, Math.max(...rows.map(wd)) + 14), y = L.sy1 - 78;
      P.fill(cx - bw / 2, y - 3, bw, rows.length * 10 + 5, '#05030c', .6);
      rows.forEach((r, i) => (tok(r) ? P.prompt(r, cx, y + i * 10, { align: 'center', color: '#f0ecff' }) : P.text(r, cx, y + i * 10, '#f0ecff', { align: 'center' })));
    }
    if (R.timer && R.state === 'running' && !this.demo) { const s = Math.ceil(R.timer.left), txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; P.text((R.timer.label ? R.timer.label + ' ' : '') + txt, L.timer[0], L.timer[1], s <= 10 && Math.floor(t * 3) % 2 ? '#ff5a4a' : '#ffe066', { align: 'right', scale: 2 }); }
    if (R.course && R.state === 'running' && !this.demo) P.text(`CHECKPOINT ${R.checkpoint + 1 + R.lap * R.course.length}/${R.course.length * (R.laps || 1)}`, L.timer[0], L.timer[1] + (R.timer ? 18 : 0), '#5af0ff', { align: 'right' });
    const Ls = R.lines || this.events.R.lines; if (Ls && Ls.list[Ls.i] && setting(this.app.game, 'subtitles', true)) drawSubtitle(P, Ls.name, Ls.color, Ls.list[Ls.i], L.sy1 - 48);
    this.pops.forEach((q, i) => { const y = L.sy0 + 54 + i * 30, a = Math.min(1, q.t * 2), big = /^[+-]\$?[\d,]+$/.test(q.line || ''); P.g.globalAlpha = a; P.text(q.title, cx, y, q.color, { align: 'center' }); if (q.line) P.text(q.line, cx, y + 10, big ? (q.line[0] === '-' ? '#ff8a5a' : '#7aff8a') : '#f0ecff', { align: 'center', scale: big ? 2 : 1 }); P.g.globalAlpha = 1; });   // (a sum of money: a big number)
    const hp = this.holdups && this.holdups.progress(); if (hp) P.holdPrompt('HOLD {onFoot:aim} ON THE CLERK', cx + 9, L.sy1 - 100, hp.t, { align: 'center', color: '#ff8a5a' });   // (the hold-up: the ring fills while the gun stays on them)
    if (this.prompt && !this.card && !o.blocked) P.prompt(this.prompt.text, cx, L.sy1 - 10, { align: 'center', color: this.prompt.color });
  }
  /** the career's share of the sim hash */
  hash() { const S = this.save; return [...this.R.hash(), ...this.events.hash(), S.missions.done.length, S.collectibles.length, S.stunts.length, S.properties.length, ...(this.holdups ? this.holdups.hash() : [])]; }
  /** for game.debug.snapshot() */
  debug() {
    const R = this.R;
    return { mission: R.active || R.state === 'passed' ? R.id : null, state: R.state, stage: R.stage ? R.stage.id : null, objective: R.objective ? R.objective.text : null, hint: R.objective && R.objective.hint ? R.objective.hint.kind : null,
      timer: R.timer ? Math.ceil(R.timer.left) : null, card: this.card ? this.card.id : null, event: this.events.active ? this.events.R.id : null, completion: completion(this.save).pct, actors: R.actors ? R.actors.count : 0 };
  }
}
// does a vehicle fit an activity's start.vehicle (a definition id, a class, a role, or a list of them)?
function fits(need, v) { const l = Array.isArray(need) ? need : [need]; return l.some(n => n === v.def.id || n === v.cls || n === v.def.role || n === v.def.model); }
// a card as a screen of the kit: its lines over its list (the card's own sel, so a card made again keeps its place), ○
// and Options back out (a choice can't be backed out of), a card without items continues on ✕ or a click
function cardScreen(C, card) {
  const items = card.items || [], list = items.length ? new List({ id: 'card-' + card.id, items, color: card.color }) : null;
  if (list) { card.sel = Math.max(0, Math.min(items.length - 1, card.sel || 0)); Object.defineProperty(list, 'sel', { get: () => card.sel, set: v => { card.sel = v; }, configurable: true }); }
  const back = () => { if (card.back) card.back(); else C.close(); };
  const scr = {
    id: card.id, career: C, title: card.title, color: card.color, w: 320, list, sticky: true,
    info: [...(card.medal ? [{ text: card.medal.toUpperCase() + ' MEDAL', color: MEDAL[card.medal] || UI.ink, scale: 2 }] : []), ...(card.body || [])],
    legend: card.legend || (items.length ? (card.back && card.id === 'choice' ? '{menu:confirm} SELECT' : '{menu:confirm} SELECT   {menu:back} BACK') : '{menu:confirm} CONTINUE'),
    back: () => { back(); return true; },
    update(nav, mouse) {
      if (nav.close) { back(); return 'back'; }
      if (!items.length && (nav.confirm || mouse.click) && card.confirm) { card.confirm(); return 'confirm'; }
      return null;
    },
  };
  if (card.style === 'phone') scr.draw = (P, U, live) => drawPhone(P, scr, card, C, live);
  return scr;
}
// the phone: a handset at the foot of the screen's right, one column of big rows with an icon each, its time at the top
function drawPhone(P, scr, card, C, live = true) {
  const list = scr.list, items = list ? list.items : [], per = 6, page = list ? list.page : 0, pages = list ? list.pages : 1, shown = items.slice(page * per, page * per + per);
  const [, sy0, sx1, sy1] = P.safe, body = (card.body || []).length, fixed = 44 + body * 10 + (body ? 4 : 0) + 26 + 8;
  const RH = Math.max(20, Math.min(24, Math.floor((sy1 - sy0 - fixed) / per))), w = 188, h = fixed - 8 + per * RH, x = sx1 - w - 4, y = Math.max(sy0 + 4, sy1 - h - 4);   // (rows as tall as the screen allows; its frame inside the safe area too)
  P.shade(.35);
  P.panel(x - 4, y - 4, w + 8, h + 8, { kind: 'phone', bg: ['#0c0a16', '#05030c'], border: '#4a4470' });
  P.fill(x + 4, y + 6, w - 8, h - 12, '#141026');
  P.text(C.W.clock && C.W.clock.label ? C.W.clock.label() : '', x + 10, y + 10, UI.mute);
  P.text(card.title, x + w - 10, y + 10, card.color || UI.cyan, { align: 'right' });
  if (pages > 1) P.pages(page, pages, x + w / 2 + 12, y + 10);
  let yy = y + 26;
  for (const l of card.body || []) { P.text(l, x + w / 2, yy, UI.dim, { align: 'center' }); yy += 10; }
  if (body) yy += 4;
  if (list) {
    list.rows = [];
    shown.forEach((it, i) => {
      const k = page * per + i, on = k === list.sel, ry = yy + i * RH - (on ? 1 : 0), col = it.disabled ? UI.off : on ? UI.ink : UI.dim;
      if (on && live) P.focus(x + 6, ry - 1, w - 12, RH, card.color || UI.cyan);
      phoneIcon(P, it.icon || 'dot', x + 12, ry + 4, it.disabled ? UI.off : it.color || card.color || UI.cyan);
      P.text(it.label, x + 34, ry + 3, col);
      const sub = it.right !== undefined ? it.right + (it.sub ? '  ' + it.sub : '') : it.sub;
      if (sub) P.text(sub, x + 34, ry + 13, it.disabled ? UI.off : UI.mute);
      list.rows.push({ i: k, x: x + 6, y: yy + i * RH, w: w - 12, h: RH });
    });
    P.rec.list(list.id, shown.length, page, pages, list.rows.map(r => ({ label: items[r.i].label, x: r.x, y: r.y, w: r.w, h: r.h })), live);
  }
  P.legend(scr.legend, x + w / 2, y + h - 16);
}
// a phone row's icon, 16 x 16, drawn by code
function phoneIcon(P, kind, x, y, c) {
  const f = (a, b, w, h) => P.fill(x + a, y + b, w, h, c);
  if (kind === 'contacts') { f(5, 1, 6, 6); f(3, 9, 10, 6); }
  else if (kind === 'texts') { f(1, 2, 14, 9); f(4, 11, 3, 3); }
  else if (kind === 'jobs' || kind === 'job') { f(5, 2, 6, 2); f(1, 4, 14, 10); P.fill(x + 1, y + 8, 14, 1, '#141026'); }
  else if (kind === 'snap') { f(1, 4, 14, 10); f(5, 2, 6, 2); P.fill(x + 6, y + 7, 4, 4, '#141026'); }
  else if (kind === 'settings') { f(6, 1, 4, 14); f(1, 6, 14, 4); f(3, 3, 10, 10); P.fill(x + 6, y + 6, 4, 4, '#141026'); }
  else if (kind === 'cab') { f(2, 6, 12, 6); f(4, 3, 8, 3); P.fill(x + 3, y + 12, 3, 3, '#05030c'); P.fill(x + 10, y + 12, 3, 3, '#05030c'); }
  else if (kind === 'pin') { f(4, 1, 8, 8); f(6, 9, 4, 3); f(7, 12, 2, 3); }
  else f(5, 5, 6, 6);
}
