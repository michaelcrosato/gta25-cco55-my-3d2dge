// The bot campaign (PLAN.md 15.4: "a headless bot campaign reaches 100% completion"): a new game from the title's NEW
// GAME, played through by the mission bot: the prologue the new game starts, every mission as it comes on offer, every
// job to its top level, the street races, the MAYHEMs, the Moto Tokens, the stunt jumps and the properties, until the
// phone's COMPLETION reads 100%. Between them it travels by the dev teleport (PLAN.md 8.20 allows the campaign, never
// the attract mode, that); the rest is played as a player plays it, through the scene's own seams: a giver's marker
// walked into (the bot accepts the JOB card), a job from the phone in its vehicle, a race's start driven into, a token
// walked onto, a stunt driven at flat out, a property's BUY prompt pressed and its confirm card accepted. Stars left
// over from a job are lost first, as a player would (the MissionBot's evade); a property short of cash waits for the
// pay of what comes after it, or of a job played again.
//   node tools/bot-campaign.mjs [--seed 1] [--hours 8] [--verbose] [--only id,id]  ·  exit 0 at 100% (--only: those items
//   alone, every other mission, activity, token, stunt and property passed over: a probe of what failed)
import { loadGame } from '../tests/harness.mjs';

const TRIES = 3;   // (an item that fails is tried again, after the rest: three times in all)

/** one campaign: { pct, tenths, items (the checklist), steps: [{ what, id, ok, secs, why, fails }], secs (game time), fund,
 *  errors }. prep(gtm, save): a probe's, once the new game is up; only: ids to play (the rest passed over) */
export async function campaign({ seed = 1, hours = 8, verbose = false, out = console.log, prep = null, only = null } = {}) {
  const g = await loadGame({ hash: '#title', query: { seed: String(seed), bot: '1' } }), { game, gtm } = g, M = gtm.motor;
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
  // the game run for secs of game time, or until until() comes true (true: it came)
  const run = (secs, until = null) => { for (let s = 0; s < secs; s += .25) { game.advance(.25); t += .25; if (until && until()) return true; } return false; };
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
  const teleport = (x, y) => { onFoot(); const n = roads.walks.nearestNode(x, y, 400); gtm.teleport(n ? n.x : x, n ? n.y : y); run(.5); };
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
  // a vehicle near (x, y) the campaign can take: fitting need (else any a player takes), parked; the fastest near. A
  // locked one only when a job needs that kind (every police car is locked: Vigilante's, broken into as a player would)
  const carNear = (x, y, need = null, r = 600) => {
    let best = null, bs = -Infinity;   // (a far one still counts: the only Pumper may be across town)
    for (const v of gtm.fleet.vehicles) {
      if (v.wrecked || (v.locked && !need) || (v.driver && v.driver !== P()) || v.cls === 'rail' || v.cls === 'boat' || v.cls === 'heli') continue;   // (the player's own counts: the Pumper the last call was answered in)
      if (need ? !fits(need, v) : !M.pickable(v) || v.cls !== 'car') continue;
      const d = Math.hypot(v.x - x, v.y - y); if (d > r) continue; const s = top(v) - d * .2; if (s > bs) { bs = s; best = v; }
    }
    return best;
  };
  const board = v => { if (P().seat && P().seat.vehicle === v) return true; teleport(v.x, v.y); A.board(v); return auto(60, () => P().seat && P().seat.vehicle === v); };
  // a job, an activity or a mission played out by the bot from its start (true: passed); why: what kept it from
  // starting (start() may set it), fails: its stages' failures on the way
  let why = '';
  const play = (what, id, start, max = 2400) => {
    const t0 = t; cool(); why = '';
    const began = start() || R().state === 'running';
    if (!began || R().state !== 'running') { steps.push({ what, id, ok: false, secs: Math.round(t - t0), why: 'did not start' + (why ? ': ' + why : '') }); say(`${what} ${id}: did not start${why ? ' (' + why + ')' : ''}`); return false; }
    say(`${what} ${id}: started at ${clock()} (${Math.floor(gtm.clock.hour)}:00, ${gtm.weather.state || 'clear'}, ${P().seat ? 'in the ' + P().seat.vehicle.def.id : 'on foot'})`);
    const fails = [], un = gtm.BUS.on('stageFail', e => fails.push(`${e.stage}: ${e.reason}`), 'global');
    run(max, () => R().state === 'idle'); un();
    const r = R().result || {}, ok = !!r.passed;
    steps.push({ what, id, ok, secs: Math.round(t - t0), medal: r.medal || null, retries: r.retries ?? null, why: ok ? '' : r.failure || 'not passed', fails });
    say(`${what} ${id}: ${ok ? 'passed' + (r.medal ? ' ' + r.medal : '') : 'NOT passed (' + (r.failure || 'quit') + ')'} in ${Math.round(t - t0)} s${fails.length ? '; fails: ' + fails.join(', ') : ''}`);
    run(2); return ok;
  };
  const onlySet = only ? new Set(only) : null, mine = id => !onlySet || onlySet.has(id);
  const tried = new Map(), again = k => { if (!mine(k.split(':')[1])) return false; const n = (tried.get(k) || 0) + 1; tried.set(k, n); return n <= TRIES; };
  const startAt = a => { const q = typeof a.start.at === 'string' ? city.poi(a.start.at) : null; return q ? [q.x, q.y] : a.start.at; };

  // ---- each kind of thing to do
  const mission = m => play('mission', m.id, () => { const at = C().giverOf(m); teleport(at[0], at[1]); return walk(at[0], at[1], { until: () => R().state === 'running' }) && R().state === 'running'; });
  const job = (a, level) => play('job', `${a.id} L${level}`, () => {
    const v = carNear(P().x, P().y, a.start.vehicle, 1e9); if (!v) { why = 'no ' + [].concat(a.start.vehicle).join('/') + ' about'; return false; } if (!board(v)) { why = 'could not board the ' + v.def.id; return false; }
    if (C().card) C().close();   // (a drive-in shop's card, opened by stopping at its door: the phone waits for no card)
    C().phone(); const it = C().card && C().card.items.find(q => q.label === a.title.toUpperCase());
    if (!it) { why = 'not on the phone (' + (C().card ? C().card.items.map(q => q.label).join(', ') : 'no phone') + ')'; C().close(); return false; } it.act(); run(1); return R().state === 'running';
  });
  const activity = a => play(a.kind, a.id, () => {
    const at = startAt(a), need = a.start.vehicle;
    if (a.start.foot || !need) { teleport(at[0], at[1]); return walk(at[0], at[1], { until: () => R().state === 'running' }) && R().state === 'running'; }
    const v = carNear(at[0], at[1], need === true ? null : need) || carNear(P().x, P().y, need === true ? null : need, 1e9); if (!v) { why = 'no ' + (need === true ? 'car' : [].concat(need).join('/')) + ' near its start'; return false; } if (!board(v)) { why = 'could not board the ' + v.def.id; return false; }
    A.goto(at[0], at[1], { car: v, stay: true }); const ok = auto(240, () => R().state === 'running') && R().state === 'running'; if (!ok) why = `drove to ${Math.round(P().x)},${Math.round(P().y)}: ${Math.round(Math.hypot(at[0] - P().x, at[1] - P().y))} u from the start`; return ok;
  });
  const token = s => {
    const way = [...(s.via || []), s.at], t0 = t; teleport(way[0][0], way[0][1]);
    walk(way[0][0], way[0][1], { secs: 60 });
    for (const w of way) climb(w[0], w[1], w.length > 2 ? w[2] : null);
    run(1); const ok = S().collectibles.includes(s.id);
    steps.push({ what: 'token', id: s.id, ok, secs: Math.round(t - t0), why: ok ? '' : `stood at ${P().x.toFixed(0)},${P().y.toFixed(0)},${(P().z || 0).toFixed(0)}` }); say(`token ${s.id}: ${ok ? 'found' : 'NOT found'}`);
    return ok;
  };
  // a stunt over the drawbridge waits at its approach for a lift: the run starts once the leaves are on their way up
  // and high enough that they stand half raised as the car reaches them (a try later, a little later in the lift)
  const bridgeOf = s => (gtm.bridges || []).find(b => b.contains(s.takeoff[0], s.takeoff[1]) || Math.hypot((b.rect[0] + b.rect[2] + 1) * city.T / 2 - s.takeoff[0], (b.rect[1] + b.rect[3] + 1) * city.T / 2 - s.takeoff[1]) < s.r + 40);
  const lift = (b, go) => pilot((dt, p) => { const I = M.clearIntent(idle); I.down.handbrake = true; return I; }, 4 * 3600 / 24, () => b.phase === 'raising' && b.lift >= go);
  const stunt = s => {
    const t0 = t, ap = s.approach || [s.takeoff[0] - 300, s.takeoff[1]], [tx, ty] = s.takeoff, n = tried.get('s:' + s.id) || 1; cool();
    const v = carNear(ap[0], ap[1]) || carNear(P().x, P().y, null, 1e9); let ok = false;   // (none near the run-up: one from where the player is, driven there)
    if (v && board(v)) {
      A.goto(ap[0], ap[1], { car: v, stay: true, radius: 30, z: ap[2] ?? null }); auto(240);   // (the Loop Gap's run-up is on the deck)
      const b = bridgeOf(s); if (b) { const d = Math.hypot(tx - v.x, ty - v.y); lift(b, Math.max(0, .5 - d / 160 * (1 / Math.max(.1, M.TUNE.drawbridgeRaise))) + (n - 1) * .08); }
      // the run: flat out at the takeoff (held straight once over it), the nitro if fitted
      let over = false, h = 0;
      pilot((dt, p) => {
        const I = M.clearIntent(idle), c = p.seat && p.seat.vehicle; if (!c) return I;
        const dx = tx - c.x, dy = ty - c.y; if (!over && Math.hypot(dx, dy) < 20) { over = true; h = c.heading; }
        let da = (over ? h : Math.atan2(dy, dx)) - c.heading; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        I.steer = Math.max(-1, Math.min(1, da * 2)); I.throttle = 1; I.down.nitro = true; return I;
      }, 25, () => S().stunts.includes(s.id));
      ok = S().stunts.includes(s.id);
    }
    steps.push({ what: 'stunt', id: s.id, ok, secs: Math.round(t - t0), why: ok ? '' : v ? 'no landing' : 'no car' }); say(`stunt ${s.id}: ${ok ? 'landed' : 'NOT landed'}`);
    return ok;
  };
  const owned = id => S().properties.some(q => q.id === id);
  const property = pr => {
    const t0 = t, q = city.poi(pr.poi); teleport(q.x, q.y); walk(q.x, q.y, { secs: 60, until: () => !!C().prompt });
    if (C().prompt) { press(); run(.5); if (C().card && C().card.id === 'confirm') { C().card.items[0].act(); run(.5); } }
    const ok = owned(pr.id); steps.push({ what: 'property', id: pr.id, ok, secs: Math.round(t - t0), why: ok ? '' : C().prompt ? 'not bought' : 'no prompt' }); say(`property ${pr.id}: ${ok ? 'bought' : 'NOT bought'}`);
    return ok;
  };

  // ---- the campaign: the prologue, then whatever is left, missions first (they open the rest and pay the most)
  if (prep) prep(gtm, S());   // (a probe's: a save made ready, cash in hand)
  run(3);
  if (R().state === 'running') play('mission', R().id, () => true);
  while (t < limit) {
    const c = M.completion(S()); say(`completion ${c.pct.toFixed(1)}%  $${gtm.crew.fund}`); if (c.tenths >= 1000) break;
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
  return { pct: c.pct, tenths: c.tenths, items: c.items, steps, secs: Math.round(t), fund, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; }, has = k => process.argv.includes('--' + k);
  const t0 = Date.now(), r = await campaign({ seed: +arg('seed', 1), hours: +arg('hours', 8), verbose: has('verbose'), only: arg('only', null) ? arg('only').split(',') : null });
  for (const s of r.steps) console.log(`${s.ok ? 'ok  ' : 'FAIL'} ${s.what} ${s.id}${s.ok ? (s.medal ? ' ' + s.medal : '') : ' (' + s.why + ')'} ${s.secs} s${!s.ok && s.fails && s.fails.length ? '; ' + s.fails.join(', ') : ''}`);
  for (const q of r.items) console.log(`  ${q.label}: ${q.done}/${q.of}`);
  if (r.errors.length) console.log('ERRORS: ' + r.errors.join(' | '));
  console.log(`\ncompletion ${r.pct.toFixed(1)}% after ${(r.secs / 3600).toFixed(2)} h of game [${((Date.now() - t0) / 60000).toFixed(1)} min]`);
  process.exit(r.tenths >= 1000 && !r.errors.length ? 0 : 1);
}
