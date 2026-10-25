// The bot campaign (PLAN.md 15.4: "a headless bot campaign reaches 100% completion"): a new game from the title's NEW
// GAME, played through by the mission bot: the prologue the new game starts, every mission as it comes on offer, every
// job to its top level, the street races, the MAYHEMs, the Moto Tokens, the stunt jumps and the properties, until the
// phone's COMPLETION reads 100%. Between them it travels by the dev teleport (PLAN.md 8.20 allows the campaign, never
// the attract mode, that); the rest is played as a player plays it, through the scene's own seams: a giver's marker
// walked into (the bot accepts the JOB card), a job from the phone in its vehicle, a race's start driven into, a token
// walked onto, a stunt driven at flat out, a property's BUY prompt pressed and its confirm card accepted. Stars left
// over from a job are lost first, as a player would (the MissionBot's evade); a property short of cash waits for the
// pay of what comes after it, or of a job played again.
//   node tools/bot-campaign.mjs [--seed 1] [--hours 8] [--verbose] [--only id,id [--ready]] [--mortal]  ·  exit 0 at 100%
//   (--only: those items alone, every other mission, activity, token, stunt and property passed over: a probe of what
//   failed; --ready: every other mission done and $20,000 in hand first, so a late mission is on offer at once).
// The campaign plays god (D29: the crew and their rides take no harm, their guns never run dry): it proves the game's
// way to 100%, its progression, its economy and its completion; each mission's own beatability is the mission bot's
// runs' (tools/bot.mjs, mortal). --mortal plays it without.
import { loadGame } from '../tests/harness.mjs';

const TRIES = 3;   // (an item that fails is tried again, after the rest: three times in all)
const STALL = 120;   // (seconds at the wheel within 40 u before a rescue: rescue())

/** one campaign: { pct, tenths, items (the checklist), steps: [{ what, id, ok, secs, why, fails }], secs (game time), fund,
 *  errors }. prep(gtm, save): a probe's, once the new game is up; only: ids to play (the rest passed over); onStep(t, g):
 *  a probe's, each step */
export async function campaign({ seed = 1, hours = 8, verbose = false, out = console.log, prep = null, only = null, onStep = null, god = true } = {}) {
  const g = await loadGame({ hash: '#title', query: { seed: String(seed), bot: '1', ...(god ? { god: '1' } : {}) } }), { game, gtm } = g, M = gtm.motor;
  const title = gtm.career;
  game.go('play', { newGame: true });   // (NEW GAME: the title's own, deferred to the step's end)
  for (let k = 0; k < 400 && gtm.career === title; k++) game.advance(.25);
  if (gtm.career.saves) gtm.career.saves.backend = M.memoryBackend();   // (no localStorage headless: the saves kept in memory)
  const C = () => gtm.career, R = () => gtm.career.R, P = () => gtm.crew.ped, S = () => gtm.career.save, city = gtm.city, roads = M.roadsOf(city);
  const A = new M.AutoPlayer({ city, roads, fleet: gtm.fleet, junctions: gtm.life ? gtm.life.junctions : null }), idle = M.makeIntent();
  let t = 0; const steps = [], limit = hours * 3600;
  const clock = () => `${Math.floor(t / 3600)}:${String(Math.floor(t / 60) % 60).padStart(2, '0')}:${String(Math.floor(t) % 60).padStart(2, '0')}`;
  const say = s => { if (verbose) out(`  ${clock()} ${s}`); };
  const world = () => { const L = gtm.life; return { t: L ? L.t : 0, pedsNear: L ? (x, y, r) => L.pedsNear(x, y, r) : null, wet: gtm.weather.wet, wanted: L && L.wanted, police: L && L.police }; };
  const stars = () => { const w = gtm.life && gtm.life.wanted; return w ? w.stars : 0; };
  // the game run for secs of game time, or until until() comes true (true: it came). While the campaign is about a
  // token, a stunt or a property (roam), a job that starts on the way (a giver's marker walked by, a race's start stopped
  // in: the bot takes their cards) is quit at once, as ours() quits one on the way to another: whatever runs, the
  // career's bot has the controls, not the campaign
  let roam = false;
  const run = (secs, until = null) => { for (let s = 0; s < secs; s += .25) { game.advance(.25); t += .25; if (roam && R().state === 'running') { say(`${R().id} started on the way: quit`); R().quit('not the campaign\'s'); } if (onStep) onStep(t, g, A); if (until && until()) return true; } return false; };
  // a controller at the scene's pilot seam (the player's own) for secs, or until until()
  const pilot = (f, secs, until) => { gtm.pilot(f); const ok = run(secs, until); gtm.pilot(null); return ok; };
  // the AutoPlayer at the controls until it arrives (or until())
  const auto = (secs, until = null) => pilot((dt, p) => A.update(dt, p, world()), secs, () => A.arrived || (until && until()));
  // a press (the scene's △ / E: a prompt, a door, a seat)
  const press = (k = 'interact') => { let n = 0; pilot(() => { const I = M.clearIntent(idle); if (n++ === 0) { I.tap[k] = true; I.down[k] = true; } return I; }, .5); };
  // standing (a crouch is a toggle: one left on by a stealth job walks slowly and climbs nothing)
  const stand = () => { if (P().crouching && !P().seat) press('crouch'); };
  // on foot: out of the vehicle first
  const onFoot = () => { stand(); const p = P(); if (!p.seat && !p.boarding) return true; A.goto(p.x, p.y, { foot: true }); return auto(12, () => !P().seat && !P().boarding); };
  // the dev teleport: on foot to the sidewalk nearest (x, y)
  const teleport = (x, y) => {
    onFoot(); const p = P(); if (p.seat) p.seat.vehicle.unseat(p);   // (a car it couldn't get out of, its doors against a wall: the teleport takes the player out of it)
    const n = roads.walks.nearestNode(x, y, 400), tx = n ? n.x : x, ty = n ? n.y : y; gtm.teleport(tx, ty); run(.5);
    if (Math.hypot(P().x - tx, P().y - ty) > 60) say(`the teleport to ${Math.round(tx)},${Math.round(ty)} left the player at ${[P().x, P().y, P().z || 0].map(Math.round)} (seat ${!!P().seat}, boarding ${!!P().boarding}, held ${!!P().held}, floored ${!!P().floored}, dead ${!!P().dead})`);
  };
  // on foot to (x, y) the AutoPlayer's way (the sidewalks, then straight)
  const walk = (x, y, o = {}) => { A.goto(x, y, { foot: true, radius: o.r || 0 }); return auto(o.secs || 90, o.until); };
  // straight at (x, y) and up whatever is in the way (a jump climbs a ledge up to TUNE.climbMax): a roof's way up
  const climb = (x, y, z, r = 4, secs = 25) => {
    let last = null, still = 0;
    return pilot((dt, p) => {
      const I = M.clearIntent(idle), dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy) || 1; I.move[0] = dx / d; I.move[1] = dy / d;
      const moved = last ? Math.hypot(p.x - last[0], p.y - last[1]) : 1; last = [p.x, p.y]; still = moved < .05 ? still + dt : 0;
      if (still > .3 || (z !== null && (p.z || 0) < z - 4 && d < 30)) { I.tap.jump = true; I.down.jump = true; still = 0; }
      return I;
    }, secs, () => Math.hypot(x - P().x, y - P().y) <= r && (z === null || Math.abs((P().z || 0) - z) < 12));
  };
  // the stars lost, as a player loses them: away from the police, in a car (the MissionBot's evade)
  const cool = () => { if (!stars()) return true; say(`losing ${stars()} star(s)`); const B = C().bot; return pilot((dt, p) => B.evade(dt, p, world()), 400, () => !stars()); };
  const fits = (need, v) => (Array.isArray(need) ? need : [need]).some(n => n === v.def.id || n === v.cls || n === v.def.role || n === v.def.model);
  const top = v => (v.def.handling && v.def.handling.top) || 0;
  // a vehicle near (x, y) the campaign can take: fitting need (else any a player takes; the first kind need names
  // before the rest: a chase's cruiser, not the SWAT truck), parked, the fastest near. A locked one only when a job needs
  // that kind (every police car is locked: Vigilante's, broken into as a player would). jack: one waiting at a red light
  // instead, jacked as a player would (by the second hour the campaign has driven off the cars parked near every start)
  // (to: where it is to be driven: a car the roads take there the short way, not one facing up a one-way street that
  // leads round the city first: Harbor Hustle's start, 70 u off, had been 2,000 u by the lanes in the car taken)
  const way = (v, to) => { if (!to) return 0; const q = roads.gps.routeTo(v.x, v.y, v.heading, to[0], to[1], { z: v.z || 0 }); return q ? q.cost : 120; };
  const carNear = (x, y, need = null, r = 600, jack = false, to = null) => {
    const kinds = need ? [].concat(need) : null, rank = v => kinds ? kinds.findIndex(n => fits(n, v)) : 0;
    let best = null, bs = -Infinity;   // (a far one still counts: the only Pumper may be across town)
    for (const v of gtm.fleet.vehicles) {
      if (v.wrecked || (v.locked && !need) || v.cls === 'rail' || v.cls === 'boat' || v.cls === 'heli') continue;   // (the player's own counts: the Pumper the last call was answered in)
      if (need ? !fits(need, v) : !M.pickable(v) || v.cls !== 'car') continue;
      const driven = !!(v.driver && v.driver !== P()); if (driven !== jack || shunned(v.id) || (v.z || 0) > 10) continue;   // (at street level: one parked up on the Loop is walked to from under it)
      if (jack && !(v.speed < 2 && v.brain && v.brain.cause === 'signal' && !v.duty && !v.gang && v.owner !== 'mission')) continue;   // (never a unit on a call, a gang's or a job's)
      const d = Math.hypot(v.x - x, v.y - y); if (d > r) continue; const s = top(v) - d * .2 - rank(v) * 400 - way(v, to) * 8; if (s > bs) { bs = s; best = v; }
    }
    return best;
  };
  const unboardable = new Map();   // (a car no door of which the player reached, and when: the one on show in Club Chrome's window, until H1)
  const shunned = id => unboardable.has(id) && t - unboardable.get(id) < 600;   // (for ten minutes: the only Pumper, a while out of reach, had been passed over for good)
  const board = v => { if (P().seat && P().seat.vehicle === v) return true; teleport(v.x, v.y); A.board(v); if (auto(60, () => P().seat && P().seat.vehicle === v)) return true; unboardable.set(v.id, t); say(`could not board the ${v.def.id}#${v.id} at ${Math.round(v.x)},${Math.round(v.y)},${Math.round(v.z || 0)} (the player at ${Math.round(P().x)},${Math.round(P().y)},${Math.round(P().z || 0)})`); return false; };
  // the first of picks' cars the player gets into (a pick that can't be boarded passed over for the next), or null
  const takeCar = (...picks) => { let last = null; for (let k = 0; k < 4; k++) { const v = picks.reduce((q, f) => q || f(), null); if (!v) return { v: last, ok: false }; last = v; if (board(v)) return { v, ok: true }; } return { v: last, ok: false }; };
  // a job, an activity or a mission played out by the bot from its start (true: passed); why: what kept it from
  // starting (start() may set it), fails: its stages' failures on the way
  let why = '';
  // is item id running? Another that started on the way (a giver's marker walked into, its card taken by the bot: G1
  // had started on the way to a race, and was played as the race) is quit, and the way goes on
  const ours = id => { if (R().state === 'running' && R().id !== id && id !== null) { say(`${R().id} started on the way: quit`); R().quit('not the campaign\'s'); run(1); } return R().state === 'running' && (id === null || R().id === id); };
  // a vehicle put down at (x, y, z) facing h, at rest (the dev teleport's, with the player in it), the AutoPlayer's trip over
  const put = (v, x, y, z, h) => { const b = v.body; b.x = x; b.y = y; b.z = z; b.heading = h; b.u = b.v = b.w = 0; b.vz = 0; b.airborne = false; v.asleep = false; A._dropBrain(); A.goal = null; };
  // a car the bot can't drive out of where it stands (a long truck in a dead end it can't turn round in, wedged on a
  // corner), STALL s within 40 u at its wheel: put back on the nearest lane that leads on, at its own spot, facing its
  // way, and the AutoPlayer's route made afresh from there. A player backs out; the bot's driving can't. Each rescue is
  // told and counted in the result (rescues), so a place that needs them is seen
  const rescues = [];
  const rescue = (id, v) => {
    const G = roads.graph, z = v.z || 0, x0 = Math.round(v.x), y0 = Math.round(v.y);
    const n = G.nearestLane(v.x, v.y, null, z, 400, l => (!l.deadEnd && l.out.length && l.len > 60 ? [30, l.len - 30] : null)); if (!n) return;
    const L = n.lane, free = s => { const q = G.pointOn(L, s); return gtm.fleet.near(q[0], q[1], 40).every(o => o === v || Math.hypot(o.x - q[0], o.y - q[1]) > 36) ? q : null; };
    let q = null; for (let k = 0; k < 6 && !q; k++) q = free(Math.min(L.len - 30, n.s + k * 50)); if (!q) q = G.pointOn(L, n.s);
    const b = v.body; b.x = q[0]; b.y = q[1]; b.z = q[2] || 0; b.heading = Math.atan2(L.dir[1], L.dir[0]); b.u = b.v = b.w = 0; b.vz = 0; b.airborne = false; v.asleep = false;
    const A2 = C().bot && C().bot.auto; if (A2) { A2._dropBrain(); A2.esc = null; A2.round = null; A2.prog = null; A2.wedge = null; }
    rescues.push({ id, at: [x0, y0], to: [Math.round(q[0]), Math.round(q[1])], vehicle: v.def.id, t: Math.round(t) });
    say(`  ${id}: rescued, ${STALL} s stuck at ${x0},${y0} in the ${v.def.id}: put back on lane ${L.id} at ${Math.round(q[0])},${Math.round(q[1])}`);
  };
  const play = (what, id, start, max = 2400) => {
    const t0 = t; cool(); why = '';
    const began = start() || ours(id);
    if (!began || R().state !== 'running') { steps.push({ what, id, ok: false, secs: Math.round(t - t0), why: 'did not start' + (why ? ': ' + why : '') }); say(`${what} ${id}: did not start${why ? ' (' + why + ')' : ''}`); return false; }
    say(`${what} ${id}: started at ${clock()} (${Math.floor(gtm.clock.hour)}:00, ${gtm.weather.state || 'clear'}, ${P().seat ? 'in the ' + P().seat.vehicle.def.id : 'on foot'})`);
    // what hurt the player and their vehicle on the way, by source (kind:who), told with each stage's failure
    const dmg = {}, add = (k, n) => { dmg[k] = (dmg[k] || 0) + n; }, us = id => { const v = P().seat && P().seat.vehicle; return id === P().id || (v && id === v.id); };   // (the player or their car: not ours(), which is the item running)
    const who = e => { const b = gtm.combat.bodies.find(q => q.id === e.by), v = !b && gtm.fleet.vehicles.find(q => q.id === e.by); const q = b || v; return q ? (q.gang || (q.owner === 'mission' ? 'job:' + (q.missionTag || '?') : null) || q.faction || q.role || (q.def && q.def.role) || 'ped') : e.by == null ? 'world' : String(e.by); };
    const top = () => Object.entries(dmg).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k} ${Math.round(n)}`).join(', ');
    const fails = [], uns = [gtm.BUS.on('stageFail', e => { fails.push(`${e.stage}: ${e.reason}${Object.keys(dmg).length ? ' [' + top() + ']' : ''}`); for (const k in dmg) delete dmg[k]; }, 'global'),
      gtm.BUS.on('hit', e => { if (us(e.target) && e.damage > 0) add(`${e.kind || 'hit'}:${who(e)}`, e.damage); }, 'global'),
      gtm.BUS.on('vehicleDamage', e => { if (us(e.vehicle)) add('crash', e.amount); }, 'global')], un = () => uns.forEach(f => f());
    // (a long one says where it stands every 5 minutes: a stall shows what holds it)
    let next = t0 + 300, still = { at: [P().x, P().y], t };
    const watch = () => {
      const p = P(), v = p.seat && p.seat.vehicle;
      if (!v || v.driver !== p || R().state !== 'running' || Math.hypot(p.x - still.at[0], p.y - still.at[1]) > 40) still = { at: [p.x, p.y], t };
      else if (t - still.t > STALL) { rescue(id, v); still = { at: [P().x, P().y], t }; }
      if (t >= next) {
        next += 300; const B = C().bot, a = B && B.auto, p = P(), v = p.seat && p.seat.vehicle, st = R().stage, o = R().objective;
        say(`  ${id} at ${Math.round(t - t0)} s: ${st ? st.id : '-'}, "${o && o.text ? o.text.slice(0, 50) : ''}", the bot ${a ? a.state : '-'} at ${[p.x, p.y, p.z || 0].map(Math.round)}, ${v ? `in the ${v.def.id} (${Math.round(v.damage.share * 100)}%) at ${Math.round(v.speed)}` : 'on foot'}, ${stars()} star(s)`);
      }
      return R().state === 'idle';
    };
    if (!run(max, watch) && R().active) { R().quit('over the campaign\'s ' + max + ' s'); run(1); }   // (out at the cap: what comes next starts clean)
    un();
    const r = R().result || {}, ok = !!r.passed;
    steps.push({ what, id, ok, secs: Math.round(t - t0), medal: r.medal || null, retries: r.retries ?? null, why: ok ? '' : r.failure || r.reason || 'not passed', fails });
    say(`${what} ${id}: ${ok ? 'passed' + (r.medal ? ' ' + r.medal : '') : 'NOT passed (' + (r.failure || r.reason || 'quit') + ')'} in ${Math.round(t - t0)} s${fails.length ? '; fails: ' + fails.join(', ') : ''}`);
    run(2); return ok;
  };
  const onlySet = only ? new Set(only) : null, mine = id => !onlySet || onlySet.has(id);
  const tried = new Map(), again = k => { if (!mine(k.split(':')[1])) return false; const n = (tried.get(k) || 0) + 1; tried.set(k, n); return n <= TRIES; };
  const startAt = a => { const q = typeof a.start.at === 'string' ? city.poi(a.start.at) : null; return q ? [q.x, q.y] : a.start.at; };

  // ---- each kind of thing to do
  const mission = m => play('mission', m.id, () => { const at = C().giverOf(m); teleport(at[0], at[1]); return walk(at[0], at[1], { until: () => ours(m.id) }) && ours(m.id); });
  // (a job's car: the fastest kind it allows first, as a player picks a Cruiser over a Fed Sedan to chase Zephyrs)
  const topOf = k => { const d = M.get('vehicles', k); return (d && d.handling && d.handling.top) || 0; };
  const job = (a, level) => play('job', `${a.id} L${level}`, () => {
    const kinds = [].concat(a.start.vehicle).sort((p, q) => topOf(q) - topOf(p)), mid = [city.w * city.T / 2, city.h * city.T / 2];
    // (the one nearest the middle of town, as a player sets out on a job: one taken where the last item had left the
    // player, in a far corner at rush hour, had made the courier's tightest clock impossible from its first drop)
    const { v, ok: aboard } = takeCar(...kinds.map(k => () => carNear(mid[0], mid[1], k, 1e9))); if (!v) { why = 'no ' + [].concat(a.start.vehicle).join('/') + ' about'; return false; } if (!aboard) { why = 'could not board the ' + v.def.id; return false; }
    if (!cool()) { why = 'wanted after taking the ' + v.def.id; return false; }   // (a police car broken into is a crime a cop may see, and a job never starts while wanted: the stars lost in it first, as a player would)
    if (C().card) C().close();   // (a drive-in shop's card, opened by stopping at its door: the phone waits for no card)
    C().phone(); const it = C().card && C().card.items.find(q => q.label === a.title.toUpperCase());
    if (!it) { why = 'not on the phone (' + (C().card ? C().card.items.map(q => q.label).join(', ') : 'no phone') + ')'; C().close(); return false; } it.act(); run(1); return ours(null);
  });
  // (arrived is within reach, not yet stopped: held a moment for the start's card, which asks a stopped car)
  const activity = a => play(a.kind, a.id, () => {
    const at = startAt(a), need = a.start.vehicle;
    if (a.start.foot || !need) { teleport(at[0], at[1]); return walk(at[0], at[1], { until: () => ours(a.id) }) && ours(a.id); }
    teleport(at[0], at[1]); run(2);   // (there first, as a player takes a car there: the traffic about it filled in)
    const nd = need === true ? null : need, { v, ok: aboard } = takeCar(() => carNear(at[0], at[1], nd, 600, false, at), () => carNear(at[0], at[1], nd, 300, true, at), () => carNear(P().x, P().y, nd, 1e9, false, at));
    if (!v) { why = 'no ' + (need === true ? 'car' : [].concat(need).join('/')) + ' near its start'; return false; } if (!aboard) { why = 'could not board the ' + v.def.id; return false; }
    A.goto(at[0], at[1], { car: v, stay: true }); const ok = auto(240, () => ours(a.id)) && (ours(a.id) || pilot(() => { const I = M.clearIntent(idle); I.down.handbrake = true; return I; }, 6, () => ours(a.id))); if (!ok) why = `drove to ${Math.round(P().x)},${Math.round(P().y)}: ${Math.round(Math.hypot(at[0] - P().x, at[1] - P().y))} u from the start`; return ok;
  });
  const token = s => {
    const way = [...(s.via || []), s.at], t0 = t; roam = true; teleport(way[0][0], way[0][1]);
    walk(way[0][0], way[0][1], { secs: 60 });
    for (const w of way) climb(w[0], w[1], w.length > 2 ? w[2] : null);
    run(1); const ok = S().collectibles.includes(s.id);
    steps.push({ what: 'token', id: s.id, ok, secs: Math.round(t - t0), why: ok ? '' : `stood at ${P().x.toFixed(0)},${P().y.toFixed(0)},${(P().z || 0).toFixed(0)}` }); say(`token ${s.id}: ${ok ? 'found' : 'NOT found'}`);
    roam = false; return ok;
  };
  // a stunt over the drawbridge waits at its approach for a lift: the run starts once the leaves are on their way up
  // and high enough that they stand half raised as the car reaches them (a try later, a little later in the lift)
  const bridgeOf = s => (gtm.bridges || []).find(b => b.contains(s.takeoff[0], s.takeoff[1]) || Math.hypot((b.rect[0] + b.rect[2] + 1) * city.T / 2 - s.takeoff[0], (b.rect[1] + b.rect[3] + 1) * city.T / 2 - s.takeoff[1]) < s.r + 40);
  const lift = (b, go) => pilot((dt, p) => { const I = M.clearIntent(idle); I.down.handbrake = true; return I; }, 4 * 3600 / 24, () => b.phase === 'raising' && b.lift >= go);
  const stunt = s => {
    const t0 = t, ap = s.approach || [s.takeoff[0] - 300, s.takeoff[1]], [tx, ty] = s.takeoff, n = tried.get('s:' + s.id) || 1; cool(); roam = true;
    const { v, ok: aboard } = takeCar(() => carNear(ap[0], ap[1]), () => carNear(P().x, P().y, null, 1e9), () => carNear(ap[0], ap[1], null, 300, true)); let ok = false, why = v ? 'no landing' : 'no car';   // (none near the run-up: one from where the player is, driven there)
    if (v && !aboard) why = `could not board the ${v.def.id} at ${Math.round(v.x)},${Math.round(v.y)}${v.driver ? ' (driven)' : ''}`;
    else if (v) {
      // the run-up's start: travelled to by the dev teleport, as the campaign travels between its items (PLAN.md 8.20),
      // the car with the player in it put down there facing the takeoff, or as near before it along the run-up as a car
      // leaves room (driven there, hours into a campaign, it met the city's jams: a junction's exit held on the way up to
      // the Loop Gap's stub had it out of car after car; by the canal it stood 30 u short with no room to turn)
      const L = Math.hypot(tx - ap[0], ty - ap[1]) || 1, ux = (tx - ap[0]) / L, uy = (ty - ap[1]) / L, ang = a => Math.atan2(Math.sin(a), Math.cos(a));
      const z = ap[2] ?? 0, room = (x, y) => gtm.fleet.near(x, y, 80).every(o => o === v || Math.abs((o.z || 0) - z) > 12 || Math.hypot(o.x - x, o.y - y) > o.hl + v.hl + 4);
      let k = 0; while (k < 4 && !room(ap[0] - ux * k * 30, ap[1] - uy * k * 30)) k++;
      put(v, ap[0] - ux * Math.min(k, 3) * 30, ap[1] - uy * Math.min(k, 3) * 30, z, Math.atan2(uy, ux)); run(1);
      // lined up first, at a crawl, on the line from the run-up's start to the takeoff (a car still turning as it floors
      // it misses a three-cell kicker), backed up to the start if lining up took it past, and stopped there
      const along = c => (c.x - ap[0]) * ux + (c.y - ap[1]) * uy, ahead = (c, k) => { const q = Math.max(along(c), 0) + k; return Math.atan2(ap[1] + uy * q - c.y, ap[0] + ux * q - c.x); };
      let phase = 'align';
      pilot((dt, p) => {
        const I = M.clearIntent(idle), c = p.seat && p.seat.vehicle; if (!c) return I;
        const off = -(c.x - ap[0]) * uy + (c.y - ap[1]) * ux, dh = ang(Math.atan2(uy, ux) - c.heading);
        if (phase === 'align') {
          if (Math.abs(dh) < .07 && Math.abs(off) < 6) phase = along(c) > 8 ? 'back' : 'stop';
          else { I.steer = Math.max(-1, Math.min(1, ang(ahead(c, 45) - c.heading) * 2.5)); if (c.speed < 18) I.throttle = .45; else I.brake = .4; return I; }
        }
        if (phase === 'back') { if (along(c) <= 0) phase = 'stop'; else { I.brake = .6; I.steer = Math.max(-1, Math.min(1, -dh * 1.5)); return I; } }   // (reversing: the wheel the other way holds the line)
        if (c.speed > 2) { if (c.body.vx * Math.cos(c.heading) + c.body.vy * Math.sin(c.heading) > 0) I.brake = 1; else I.throttle = 1; } else phase = 'set';   // (stopped against the way it rolls: the brake held while it backs drives it back faster, into the canal behind the Canal's run-up)
        return I;
      }, 30, () => phase === 'set');
      const b = bridgeOf(s); if (b) { const d = Math.hypot(tx - v.x, ty - v.y); lift(b, Math.max(0, .5 - d / 160 * (1 / Math.max(.1, M.TUNE.drawbridgeRaise))) + (n - 1) * .08); }
      // the run: flat out along the line at the takeoff (held straight once over it), the nitro if fitted
      let over = false, h = 0, top = 0; const C0 = C().stunts; if (C0) C0.last = null;
      pilot((dt, p) => {
        const I = M.clearIntent(idle), c = p.seat && p.seat.vehicle; if (!c) return I;
        top = Math.max(top, c.speed);
        if (!over && Math.hypot(tx - c.x, ty - c.y) < 20) { over = true; h = c.heading; }
        const da = ang((over ? h : ahead(c, 80)) - c.heading);
        I.steer = Math.max(-1, Math.min(1, da * 2)); I.throttle = 1; I.down.nitro = true; return I;
      }, 25, () => S().stunts.includes(s.id));
      ok = S().stunts.includes(s.id);
      // (why not: how the last jump came down, or that it never left the ground in the circle)
      const J = C().stunts && C().stunts.last, c = P().seat && P().seat.vehicle;
      if (!ok) why = J && J.id === s.id ? `in the ${v.def.id} at ${Math.round(top)} u/s: down ${Math.round(J.dist)} on after ${J.air.toFixed(2)} s in the air${J.flipped ? ', on its roof' : ''}${J.wrecked ? ', wrecked' : ''} (it needs ${s.minDist} and ${s.minAir} s)`
        : `in the ${v.def.id} at ${Math.round(top)} u/s: never off the ground in the takeoff circle (it ended at ${c ? [c.x, c.y, c.z || 0].map(Math.round) : 'on foot'})`;
    }
    steps.push({ what: 'stunt', id: s.id, ok, secs: Math.round(t - t0), why: ok ? '' : why }); say(`stunt ${s.id}: ${ok ? 'landed' : 'NOT landed (' + why + ')'}`);
    roam = false; return ok;
  };
  const owned = id => S().properties.some(q => q.id === id);
  const property = pr => {
    const t0 = t, q = city.poi(pr.poi); roam = true; teleport(q.x, q.y); walk(q.x, q.y, { secs: 60, until: () => !!C().prompt });
    if (C().prompt) { press(); run(.5); if (C().card && C().card.id === 'confirm') { C().card.items.find(q => /^BUY/.test(q.label)).act(); run(.5); } }
    const ok = owned(pr.id); steps.push({ what: 'property', id: pr.id, ok, secs: Math.round(t - t0), why: ok ? '' : C().prompt ? 'not bought' : 'no prompt' }); say(`property ${pr.id}: ${ok ? 'bought' : 'NOT bought'}`);
    roam = false; return ok;
  };

  // ---- the campaign: the prologue, then whatever is left, missions first (they open the rest and pay the most)
  if (prep) prep(gtm, S());   // (a probe's: a save made ready, cash in hand)
  run(3);
  if (R().state === 'running') play('mission', R().id, () => true);
  while (t < limit) {
    const c = M.completion(S()), G = gtm.life && gtm.life.gangs; say(`completion ${c.pct.toFixed(1)}%  $${gtm.crew.fund}${G ? '  respect ' + ['saints', 'rats', 'gnomes'].map(k => k + ' ' + Math.round(G.get(k))).join(', ') : ''}`); if (c.tenths >= 1000) break;
    const m = C().available().find(q => again('m:' + q.id)); if (m) { mission(m); continue; }
    const A2 = S().activities, todo = M.all('activities').filter(a => a.kind !== 'event' && (A2[a.id] || 0) < (a.kind === 'job' ? a.levels || 1 : 1));
    const a = todo.find(q => again(`a:${q.id}:${(A2[q.id] || 0) + 1}`));
    if (a) { if (a.kind === 'job') job(a, (A2[a.id] || 0) + 1); else activity(a); continue; }
    const tok = M.Collectibles.spots().find(s => !S().collectibles.includes(s.id) && again('t:' + s.id)); if (tok) { token(tok); continue; }
    const st = M.all('stunts').find(s => !S().stunts.includes(s.id) && again('s:' + s.id)); if (st) { stunt(st); continue; }
    const pr = M.all('properties').find(q => !owned(q.id) && gtm.crew.fund >= Math.round(M.amountOf(q.price)) && again('p:' + q.id)); if (pr) { property(pr); continue; }
    // short of a property's price: a job at its top level again for its pay (the best paying one)
    const want = M.all('properties').find(q => !owned(q.id) && (tried.get('p:' + q.id) || 0) < TRIES);
    const jobs = M.all('activities').filter(q => q.kind === 'job' && (A2[q.id] || 0) >= (q.levels || 1)), pay = q => ((q.rewardsFor ? q.rewardsFor(q.levels || 1) : q.rewards) || {}).cash || 0;
    const best = jobs.sort((x, y) => pay(y) - pay(x))[0];
    if (want && best && pay(best) > 0 && again('cash:' + Math.floor(t / 60))) { job(best, best.levels || 1); continue; }
    break;   // (nothing left that might still go)
  }
  const c = M.completion(S()), fund = gtm.crew.fund, errors = [...R().errors.map(e => String(e.err && e.err.message || e.err)), ...gtm.BUS.errors.map(e => String(e.err && e.err.message || e.err))];
  game.dispose && game.dispose();
  return { pct: c.pct, tenths: c.tenths, items: c.items, steps, secs: Math.round(t), fund, errors, rescues };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; }, has = k => process.argv.includes('--' + k);
  const only = arg('only', null) ? arg('only').split(',') : null;
  const ready = only && has('ready') ? (gtm, S) => { S.missions.done = gtm.motor.all('missions').map(m => m.id).filter(id => !only.includes(id)); gtm.crew.fund = Math.max(gtm.crew.fund, 20000); } : null;
  const t0 = Date.now(), r = await campaign({ seed: +arg('seed', 1), hours: +arg('hours', 8), verbose: has('verbose'), only, prep: ready, god: !has('mortal') });
  for (const s of r.steps) console.log(`${s.ok ? 'ok  ' : 'FAIL'} ${s.what} ${s.id}${s.ok ? (s.medal ? ' ' + s.medal : '') : ' (' + s.why + ')'} ${s.secs} s${!s.ok && s.fails && s.fails.length ? '; ' + s.fails.join(', ') : ''}`);
  for (const q of r.items) console.log(`  ${q.label}: ${q.done}/${q.of}`);
  if (r.errors.length) console.log('ERRORS: ' + r.errors.join(' | '));
  console.log(`rescues: ${r.rescues.length}${r.rescues.map(q => `\n  ${q.id}: the ${q.vehicle} at ${q.at.join(',')} put on the lane at ${q.to.join(',')} (${q.t} s)`).join('')}`);
  console.log(`\ncompletion ${r.pct.toFixed(1)}% after ${(r.secs / 3600).toFixed(2)} h of game [${((Date.now() - t0) / 60000).toFixed(1)} min]`);
  process.exit(r.tenths >= 1000 && !r.errors.length ? 0 : 1);
}
