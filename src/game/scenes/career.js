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
// The cards are this milestone's 10-foot screens (≤ 6 items a page, ✕ confirms, ○ backs out); M9 rebuilds them with
// the UI kit.
import { E, all, get, BUS, TUNE, knob, MissionRuntime, AmbientEvents, MissionBot, Economy, CONFIRM_ABOVE, amountOf, completion, Collectibles, StuntJumps, Holdups,
  RNG, roadsOf, drawPrompt, clearIntent } from '../../motor/index.js';
import { makeSaves, blankSave, normalizeSave, PROTAGONISTS } from '../save.js';

knob('Economy', 'cabBase', 'Cab flag fall', 20, 0, 500, 5, 'What a cab costs to start ($)');
knob('Economy', 'cabRate', 'Cab fare per 100 u', 4, 0, 100, 1, 'What a cab costs per 100 units of the trip ($)');
knob('Missions', 'giverReach', 'Giver reach', 18, 6, 60, 1, 'How near a mission\'s marker you walk to be offered the job (u)');
knob('Missions', 'botRetries', 'Bot retries', 2, 0, 10, 1, 'How many times the bot retries a failed stage before it quits');
const MEDAL = { gold: '#ffd23a', silver: '#d8dce8', bronze: '#d08a4a' };
const REASON = { wrecked: 'YOU WERE WRECKED', busted: 'YOU WERE NABBED', time: 'OUT OF TIME' };
const SHOP_R = 20, DRIVE_R = 44, PROP_R = 22, PAGE = 6;
const giverAt = (city, spec) => { const g = spec.giver || {}, gang = g.phone && get('gangs', g.phone), id = g.at || (gang ? gang.phone : null), q = id && city.poi(id); return q ? [q.x, q.y] : null; };

export class Career {
  /** o: { app, world (the play scene's W), save (the save's data, normalized: the scene's own, its respect the gangs'
   *  too), saves (a SaveStore), bot } */
  constructor(o) {
    this.app = o.app; this.W = o.world; this.save = o.save || normalizeSave(blankSave()); this.saves = o.saves || makeSaves();
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
    this.tokens = new Collectibles({ combat: W.combat, save: S }).place();
    this.garage = {};   // (the stashed vehicles: back where they were left)
    for (const q of S.garage) { if (!q || !q.id || !q.def || !Array.isArray(q.at)) continue; const v = W.fleet.spawn(q.def, q.at[0], q.at[1], q.at[2] || 0, { color: q.color, mods: q.mods, owner: 'world' }); v.stashed = q.id; this.garage[q.id] = v; }
    this.holdups = new Holdups({ city: W.city, combat: W.combat, rng: RNG.stream('shops') });
    if (o.loaded) this._apply(S);
    for (const u of this.unsub) u();
    this.unsub = [BUS.on('busted', () => { if (this.R.state === 'running') this.R.fail('busted'); }, 'scene')];
    if (o.mission) {   // (#mission/<id>/<stage>: an unknown one is said, and free roam goes on)
      const act = !get('missions', o.mission) && !!get('activities', o.mission);
      if (!act && !get('missions', o.mission)) console.warn('MOTOR: #mission/' + o.mission + ': no such mission or activity');
      else this.startMission(o.mission, { stage: o.stage, activity: act, level: o.level });
    }
    else if (o.newGame) { const intro = all('missions').find(m => m.giver && m.giver.intro && !S.missions.done.includes(m.id)); if (intro) this.startMission(intro.id); }
  }
  dispose() { for (const u of this.unsub) u(); this.unsub = []; if (this.R.active) this.R.quit('scene'); if (this.events.active) this.events.R.quit('scene'); if (this.holdups) this.holdups.dispose(); if (this.bot) this.bot.dispose(); }
  /** start a mission or an activity (o.activity) by id, at o.stage, at o.level */
  startMission(id, o = {}) {
    if (this.events.active) this.events.R.quit('busy');
    this.card = null; this.botTries = 0;
    const lvl = o.activity ? o.level || Math.min((get('activities', id).levels || 1), (this.save.activities[id] || 0) + 1) : 1;
    this.R.start(id, { stage: o.stage, activity: !!o.activity, level: lvl });
  }
  /** the missions on offer: requirements met, not done (in the registry's order) */
  available() {
    const S = this.save, done = S.missions.done;
    return all('missions').filter(m => !done.includes(m.id) && (m.requires || []).every(r => done.includes(r)) && (!m.unlock || m.unlock(S, this.W)) && giverAt(this.W.city, m));
  }
  /** where a mission's giver stands: [x, y] (its marker), or null */
  giverOf(m) { return giverAt(this.W.city, m); }
  /** the activities with a place to start: [{ spec, at }] (jobs start from the phone) */
  startable() { return all('activities').filter(a => a.start && a.start.at && a.kind !== 'event').map(a => ({ spec: a, at: this.W.city.poi(a.start.at) ? [this.W.city.poi(a.start.at).x, this.W.city.poi(a.start.at).y] : a.start.at })); }
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
    if (this.bot && this.R.state === 'running' && !ctx.busy && !ctx.down) { const B = this.bot.update(dt, p, this.R, { t: W.life ? W.life.t : 0, pedsNear: W.life ? (x, y, r) => W.life.pedsNear(x, y, r) : null, wet: W.weather.wet, wanted: W.wanted(), police: W.life && W.life.police, inside: ctx.inside }); if (this.padMode) this.botI = B; else I = B; }
    if (this.card) { this._cardInput(dt); I = clearIntent(I); }
    this.R.update(dt);   // (WRECKED or NABBED fails the job at once; JOB BLOWN waits for the card)
    if (this.R.state === 'failed' && !ctx.down && !this.card) this._blown();
    if (this.R.state === 'passed' && !this.card) this._jobDone();
    if (this.R.choosing && !this.card && !this.R.picked) this._choice();
    this.events.update(dt, { free: !this.R.active && !ctx.inside && !this.card, player: p });
    // free roam: the givers, the starts, the shops, the properties, the safehouse; the stunts and the tokens always
    const v = p.seat && p.seat.vehicle;
    const st = this.stunts.update(dt, v && v.driver === p ? v : null);
    if (st && st.ok) { if (st.reward) this.econ.fund.add(st.reward, 'stunt'); this.pop(`${st.first ? 'UNIQUE STUNT' : 'STUNT'}  ${st.name.toUpperCase()}`, st.reward ? '+$' + st.reward : st.score + ' PTS', '#5af0ff'); }
    this.prompt = null;
    if (!ctx.inside && !ctx.down && !ctx.busy && !this.card && !p.dead) {
      const hu = this.holdups.update(dt, p, { hours: this.hours, crime: e => { const w = W.wanted(); if (w) w.crime(e); } });
      if (hu) this.pop('HOLD-UP  ' + hu.name.toUpperCase(), '+$' + hu.cash + ' ON THE COUNTER', '#ff8a5a');
      if (!this.R.active) this._free(p, v, I);
      else { const h = this.R.objective && this.R.objective.hint; if (h && h.kind === 'goto' && h.interact && !v) this._doors(p, h.at); }   // (a job's own △ at a door: the prologue's save)
    }
    if (this.bot && !this.R.active && this.R.state === 'idle' && this.card && this.card.auto) this.card.auto();
    return I;
  }
  // free roam's offers: a giver walked into, an activity's start, a drive-in shop, a door's prompt
  _free(p, v, I) {
    const W = this.W, C = W.city, R2 = TUNE.giverReach;
    if (!v && !p.boarding) for (const m of this.available()) { const at = giverAt(C, m); if (Math.hypot(at[0] - p.x, at[1] - p.y) < R2) { if (this.visited !== m.id) { this.visited = m.id; this._jobCard(m); } return; } }
    for (const { spec, at } of this.startable()) {
      const need = spec.start.vehicle; if (need && !v) continue; if (spec.start.foot && v) continue;
      const P = v || p; if (Math.hypot(at[0] - P.x, at[1] - P.y) < (spec.start.radius || 26)) { if (this.visited !== spec.id) { this.visited = spec.id; this._activityCard(spec); } return; }
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
    for (const s of all('shops')) { if (s.drive) continue; const q = C.poi(s.poi); if (q && near(q) && Math.hypot(q.x - p.x, q.y - p.y) < SHOP_R) { this.prompt = { text: `{interact} SHOP  ${s.name.toUpperCase()}`, color: s.color, act: () => this._shopCard(s, { ped: p }) }; return; } }
    for (const pr of all('properties')) {
      const q = C.poi(pr.poi); if (!q || !near(q) || Math.hypot(q.x - p.x, q.y - p.y) > PROP_R) continue;
      const own = this.econ.owned(pr.id);
      if (own) { const n = this.econ.collect(pr.id); if (n) this.pop(pr.name.toUpperCase(), '+$' + n, '#5aff8a'); return; }
      const price = Math.round(amountOf(pr.price)); this.prompt = { text: `{interact} BUY  ${pr.name.toUpperCase()}  $${price.toLocaleString('en-US')}`, color: '#5aff8a', act: () => this._buyProperty(pr) }; return;
    }
    const safe = C.poi('safehouse'); if (safe && near(safe) && Math.hypot(safe.x - p.x, safe.y - p.y) < SHOP_R) this.prompt = { text: '{interact} SAVE', color: '#7af0ff', act: () => this.write('1', true) };
  }
  /** keep a vehicle in the save's garage (a mission's stash), and the one kept under an id (null: gone or wrecked) */
  stash(v, id, at = null) {
    const S = this.save, q = { id, def: v.def.id, color: v.color, mods: { ...v.mods }, at: at || [Math.round(v.x), Math.round(v.y), +v.heading.toFixed(3)] };
    S.garage = S.garage.filter(g => g.id !== id); S.garage.push(q); v.stashed = id; v.owner = 'world'; this.garage[id] = v;
  }
  garaged(id) { const v = this.garage && this.garage[id]; return v && !v.wrecked && this.W.fleet.vehicles.includes(v) ? v : null; }
  /** a pickup walked over: a Moto Token or a mission's item (true: used); null: not the career's */
  take(p, k) {
    if (k.kind === 'token') { const f = this.tokens.found(k); if (!f) return true; if (f.reward) this.econ.fund.add(f.reward, 'token'); if (f.all) this.econ.fund.add(f.all, 'tokens'); this.pop(`MOTO TOKEN  ${f.of - f.left}/${f.of}`, '+$' + (f.reward + f.all), '#ff7ac8'); return true; }
    if (k.kind === 'item') { BUS.emit('pickup', { item: k.item, by: p.id }); return true; }
    return null;
  }
  /** a mission vehicle's driver's Intent (the fleet asks) */
  intentFor(v) { return (this.R.actors && this.R.active && this.R.actors.intentFor(v)) || (this.events.R.actors && this.events.active && this.events.R.actors.intentFor(v)) || null; }
  /** a big-number pop: a title and a line, a few seconds */
  pop(title, line, color = '#ffe066') { this.pops.push({ title, line, color, t: 2.6 }); if (this.pops.length > 3) this.pops.shift(); }
  // ---- the run's ends
  _ended(r) {
    if (r.passed && (r.kind === 'mission' || (get('activities', r.id) || {}).kind === 'job')) this.write('auto');   // (the autosave: after missions and jobs, PLAN.md 8.19)
  }
  _eventEnded(r) { if (r.passed) { const c = r.rewards && r.rewards.cash; this.pop((r.title || 'NICE').toUpperCase(), c ? '+$' + c : '', '#7aff8a'); } }
  // ---- the cards: { title, color, body: [lines], items: [{ label, sub, right, disabled, act }], sel, legend, back, auto }
  _open(card) { this.card = { sel: 0, page: 0, ...card }; this.app.game.input.consumeAll && this.app.game.input.consumeAll(); BUS.emit('uiOpen', { screen: card.id }); }
  close() { if (this.card) BUS.emit('uiClose', { screen: this.card.id }); this.card = null; }
  _cardInput() {
    const B = this.app.bindings, c = this.card; B.setContext('menu');
    const items = c.items || [], n = items.length;
    if (n) {
      if (B.tap('down') || B.tap('right')) c.sel = (c.sel + 1) % n;
      if (B.tap('up') || B.tap('left')) c.sel = (c.sel - 1 + n) % n;
      c.page = Math.floor(c.sel / PAGE);
    }
    if (B.tap('confirm')) { const it = items[c.sel]; if (it && !it.disabled && it.act) it.act(); else if (!n && c.confirm) c.confirm(); }
    else if (B.tap('back')) { if (c.back) c.back(); else this.close(); }
  }
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
    body.push(`$${(rw.cash || 0).toLocaleString('en-US')}`);
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
    this._open({ id: 'confirm', title: 'BUY ' + it.name.toUpperCase() + '?', color: s.color, body: [`$${price.toLocaleString('en-US')}`], items: [{ label: 'BUY IT', act: () => this._buy(s, it, ctx) }, { label: 'NO', act: () => this._shopCard(s, ctx) }], back: () => this._shopCard(s, ctx) });
  }
  _buyProperty(pr) {
    const price = Math.round(amountOf(pr.price)), go = () => { const r = this.econ.buyProperty(pr.id, pr); this.close(); if (r.ok) this.pop(pr.name.toUpperCase() + ' IS YOURS', '-$' + price.toLocaleString('en-US'), '#5aff8a'); else this.pop('NOT ENOUGH CASH', '$' + price.toLocaleString('en-US'), '#ff5a4a'); };
    if (price > CONFIRM_ABOVE) this._open({ id: 'confirm', title: 'BUY ' + pr.name.toUpperCase() + '?', color: '#5aff8a', body: [`$${price.toLocaleString('en-US')}`, `PAYS $${Math.round(amountOf(pr.income))} EVERY MIDNIGHT`], items: [{ label: 'BUY IT', act: go }, { label: 'NO', act: () => this.close() }] });
    else go();
  }
  // ---- the phone: jobs (in a job's vehicle), cabs, contacts, completion
  phone() {
    if (this.card || this.R.active) return;
    const W = this.W, p = W.crew.ped, v = p.seat && p.seat.vehicle, items = [];
    for (const a of all('activities').filter(q => q.kind === 'job' && q.start && q.start.vehicle && v && v.driver === p && fits(q.start.vehicle, v))) {
      const next = Math.min(a.levels || 1, (this.save.activities[a.id] || 0) + 1);
      items.push({ label: a.title.toUpperCase(), sub: `LEVEL ${next}/${a.levels || 1}`, act: () => { this.close(); this.startMission(a.id, { activity: true, level: next }); } });
    }
    const stars = W.wanted() ? W.wanted().stars : 0;
    items.push({ label: 'LOWTOWN CABS', sub: stars ? 'NOT WHILE WANTED' : v ? 'ON FOOT ONLY' : '', disabled: !!stars || !!v, act: () => this._cabs() });
    items.push({ label: 'CONTACTS', sub: `${this.available().length} JOBS ON OFFER`, act: () => this._contacts() });
    const c = completion(this.save); items.push({ label: 'COMPLETION', right: c.pct.toFixed(1) + '%', act: () => this._stats() });
    this._open({ id: 'phone', title: 'PHONE', color: '#7af0ff', body: [], items });
  }
  _cabs() {
    const W = this.W, p = W.crew.ped, kinds = new Set(['safehouse', 'shop', 'property', 'gang', 'landmark', 'hospital', 'police', 'marina']);
    const dests = W.city.pois.filter(q => kinds.has(q.kind) && q.label).sort((a, b) => a.label.localeCompare(b.label));
    this._open({ id: 'cabs', title: 'LOWTOWN CABS', color: '#ffd23a', body: [`CASH  $${W.crew.fund.toLocaleString('en-US')}`], back: () => this.phone_(),
      items: dests.map(q => { const fee = this.cabFee(p, q); return { label: q.label.toUpperCase(), right: '$' + fee, disabled: fee > W.crew.fund, act: () => this.cab(q) }; }) });
  }
  phone_() { this.close(); this.phone(); }
  /** a cab's fare from the ped to a point of interest */
  cabFee(p, q) { return Math.round(TUNE.cabBase + Math.hypot(q.x - p.x, q.y - p.y) / 100 * TUNE.cabRate); }
  /** the cab skip: a fade, the fare, and there on foot */
  cab(q) {
    const W = this.W, p = W.crew.ped, fee = this.cabFee(p, q); if (fee > W.crew.fund) return false;
    this.close(); this.econ.fund.add(-fee, 'cab'); BUS.emit('cab', { to: q.id, fee });
    W.fade(() => { p.place(q.x, q.y, 0); p.mover.vx = p.mover.vy = 0; W.snap(); });
    return true;
  }
  _contacts() {
    const items = this.available().map(m => ({ label: m.title.toUpperCase(), sub: m.gang ? (get('gangs', m.gang) || { name: m.gang }).name.toUpperCase() : 'VIV', act: () => { const at = giverAt(this.W.city, m); this.waypoint = at; this.close(); this.pop('MARKED ON THE MAP', m.title.toUpperCase(), '#7af0ff'); } }));
    this._open({ id: 'contacts', title: 'CONTACTS', color: '#7af0ff', body: items.length ? [] : ['NOTHING ON OFFER'], items, back: () => this.phone_() });
  }
  _stats() {
    const c = completion(this.save);
    this._open({ id: 'stats', title: `COMPLETION ${c.pct.toFixed(1)}%`, color: '#ffe066', body: [], items: c.items.map(q => ({ label: q.label.toUpperCase(), right: `${q.done}/${q.of}` })), back: () => this.phone_() });
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
  /** write the save to a slot (toast: say so) */
  write(slot, toast = false) {
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
  /** the radar's blips: [{ x, y, color, shape }] */
  blips() {
    const out = [];
    // (the job's own markers and the waypoint pinned to the rim when far: which way to go)
    if (this.R.active) { for (const mk of this.R.markers) if (!mk.gone && mk.blip) { const a = mk.actor; out.push({ x: a ? a.x : mk.at[0], y: a ? a.y : mk.at[1], color: mk.color, shape: a ? 'diamond' : 'square', edge: true }); } }
    else {
      for (const m of this.available()) { const at = giverAt(this.W.city, m), g = m.gang && get('gangs', m.gang); out.push({ x: at[0], y: at[1], color: g ? g.colors[0] : '#ffe066', shape: g ? g.icon || 'square' : 'square', label: m.title }); }
      for (const { at } of this.startable()) out.push({ x: at[0], y: at[1], color: '#5af0ff', shape: 'flag' });
      if (this.waypoint) out.push({ x: this.waypoint[0], y: this.waypoint[1], color: '#7af0ff', shape: 'square', edge: true });
    }
    return out;
  }
  /** the HUD's part: the objective, the timer, the subtitles, the race, the pops, the card */
  hud(g, Wd, Hd, o = {}) {
    const R = this.R, B = this.app.bindings, input = this.app.game.input, t = this.W.game.real || 0;
    if (R.state === 'running' && R.objective && !this.card) {   // (on a band of its own: over a busy street it had blurred into the scene)
      const rows = E.font.wrap(R.objective.text, Wd - 80, {}), bw = Math.min(Wd - 40, Math.max(...rows.map(r => E.font.width(r))) + 14);
      g.fillStyle = 'rgba(5,3,12,.6)'; g.fillRect(Math.round(Wd / 2 - bw / 2), Hd - 89, Math.round(bw), rows.length * 10 + 5); g._c = null;
      E.font.text(g, R.objective.text, Wd / 2, Hd - 86, '#f0ecff', { align: 'center', outline: '#05030c', wrap: Wd - 80 });
    }
    if (R.timer && R.state === 'running') { const s = Math.ceil(R.timer.left), txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; E.font.text(g, (R.timer.label ? R.timer.label + ' ' : '') + txt, Wd - 8, 22, s <= 10 && Math.floor(t * 3) % 2 ? '#ff5a4a' : '#ffe066', { align: 'right', scale: 2, outline: '#05030c' }); }
    if (R.course && R.state === 'running') E.font.text(g, `CHECKPOINT ${R.checkpoint + 1 + R.lap * R.course.length}/${R.course.length * (R.laps || 1)}`, Wd - 8, 42, '#5af0ff', { align: 'right', outline: '#05030c' });
    const L = R.lines || (this.events.R.lines); if (L && L.list[L.i]) { const line = L.list[L.i]; E.ui.box(g, Wd / 2 - 160, Hd - 58, 320, 24, { alpha: .75 }); E.font.text(g, (L.name ? L.name.toUpperCase() + ': ' : '') + line, Wd / 2, Hd - 54, '#f0ecff', { align: 'center', wrap: 308 }); if (L.name) E.font.text(g, L.name.toUpperCase() + ':', Wd / 2 - 154, Hd - 54, L.color, {}); }
    this.pops.forEach((q, i) => { const y = 64 + i * 26, a = Math.min(1, q.t * 2); g.globalAlpha = a; E.font.text(g, q.title, Wd / 2, y, q.color, { align: 'center', outline: '#05030c' }); if (q.line) E.font.text(g, q.line, Wd / 2, y + 10, '#f0ecff', { align: 'center', scale: 1, outline: '#05030c' }); g.globalAlpha = 1; });
    const hp = this.holdups && this.holdups.progress(); if (hp) { E.ui.bar(g, Wd / 2 - 40, Hd - 100, 80, 5, hp.t, '#ff8a5a'); E.font.text(g, 'HOLD-UP', Wd / 2, Hd - 112, '#ff8a5a', { align: 'center', outline: '#05030c' }); }
    if (this.prompt && !this.card && !o.blocked) drawPrompt(g, this.prompt.text, Wd / 2, Hd - 64, B, input, { align: 'center', color: this.prompt.color });
    if (this.card) drawCard(g, Wd, Hd, this.card, B, input, t);
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
// a card: a panel in the middle, its title, its lines, up to six items with the focus, a page count, the legend
function drawCard(g, W, H, c, B, input, t) {
  const items = c.items || [], pages = Math.max(1, Math.ceil(items.length / PAGE)), page = Math.min(c.page || 0, pages - 1), shown = items.slice(page * PAGE, page * PAGE + PAGE);
  const w = Math.min(W - 40, 320), rows = (c.body || []).map(l => Math.max(1, E.font.wrap(l, w - 16, {}).length)), lines = rows.reduce((a, b) => a + b, 0), gap = lines ? 6 : 0;
  const h = 34 + lines * 10 + gap + shown.length * 18 + (c.medal ? 20 : 0) + 22, x = Math.round(W / 2 - w / 2), y = Math.max(12, Math.round(H / 2 - h / 2));
  g.fillStyle = 'rgba(5,3,12,.55)'; g.fillRect(0, 0, W, H); g._c = null;
  E.ui.box(g, x, y, w, h, { bg: ['#1a1830', '#0e0c1c'] });
  E.font.text(g, c.title, W / 2, y + 8, c.color || '#ffe066', { align: 'center', scale: 2, outline: '#05030c' });
  let yy = y + 30;
  if (c.medal) { E.font.text(g, c.medal.toUpperCase() + ' MEDAL', W / 2, yy, MEDAL[c.medal] || '#fff', { align: 'center', scale: 2, outline: '#05030c' }); yy += 20; }
  (c.body || []).forEach((l, i) => { E.font.text(g, l, W / 2, yy, '#c8c0e8', { align: 'center', wrap: w - 16 }); yy += 10 * rows[i]; });
  yy += gap;   // (the items clear of the last line: a one-line reason had sat under the first item's frame)
  shown.forEach((it, i) => {
    const k = page * PAGE + i, on = k === c.sel, iy = yy + i * 18 + (on ? -1 : 0);
    if (on) { const a = .65 + .35 * Math.sin(t * 6); g.strokeStyle = c.color || '#ffe066'; g.globalAlpha = a; g.lineWidth = 2; g.strokeRect(x + 8, iy - 2, w - 16, 16); g.globalAlpha = 1; g._c = null; }
    E.font.text(g, it.label, x + 14, iy + 2, it.disabled ? '#6a6488' : on ? '#ffffff' : '#d8d4f0', {});
    if (it.right) E.font.text(g, it.right, x + w - 14, iy + 2, it.disabled ? '#6a6488' : '#ffe066', { align: 'right' });
    if (it.sub) E.font.text(g, it.sub, x + w - 14 - (it.right ? E.font.width(it.right) + 12 : 0), iy + 2, '#8a84a8', { align: 'right' });   // (why it can't be had: left of its price)
  });
  if (pages > 1) E.font.text(g, `${page + 1}/${pages}`, x + w - 10, y + 8, '#8a84a8', { align: 'right' });
  const legend = items.length ? '{menu:confirm} SELECT   {menu:back} BACK' : '{menu:confirm} CONTINUE';
  drawPrompt(g, legend, W / 2, y + h - 14, B, input, { align: 'center', color: '#c8c0e8' });
}
