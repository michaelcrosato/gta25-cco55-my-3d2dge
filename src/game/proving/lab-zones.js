// The Proving Ground's city zones (PLAN.md 8.23): the play scene's whole simulation on one of the Proving Ground's own
// districts (src/game/districts/proving: the town, 64 x 64 with nine signalled junctions; the handling ground beside
// it), each zone with its own sliders (↑ ↓ pick one, ← → move it: knobs, put back as they were when the zone is left)
// and its ?selftest=1:
//   - handling: the handling ground (track.js): the skidpad, the surface strips, the slalom and the kicker, the boat
//     basin; 1-4 take the car to each ([1] skidpad, [2] strips, [3] slalom, [4] the boat). Its self-test drives them;
//   - traffic: the traffic and crowd lab: the cars' and the crowd's density over the 3 x 3 grid;
//   - wanted: the wanted sandbox: the stars set by hand and held (H lets the search run), the dispatch and the search to
//     watch (the dev overlays help: ?dev=1, `);
//   - bench: the mission bench (bench.js): one tiny job per kind of objective, played by the bot one after another;
//   - stress: the stress pad: up to 200 cars and 300 peds round the focus.
import { def, all, TUNE, tuneSet, knobs, handle, makeIntent, clearIntent } from '../../motor/index.js';
import { PLAY } from '../scenes/play.js';
import { TRACK } from '../districts/proving/track.js';

const KNOB = id => knobs().find(k => k.id === id);
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export function labZone(id, title, o) {
  def('provingZones', id, {
    title,
    make(app) {
      const { game } = app, district = o.district || 'proving', play = PLAY.make(app, null, { district, bot: !!o.bot });
      const sliders = (o.sliders || []).map(s => ({ ...s, k: KNOB(s.knob) })).filter(s => s.k);
      let hash = null, sel = 0, held = {}, saved = {}, Z = null;
      const W = () => handle;   // (the console handle: what the play scene exposed)
      const tap = c => { const d = app.bindings.codeValue(c) > 0, t = d && !held[c]; held[c] = d; return t; };
      const self = {
        enter() {
          saved = Object.fromEntries([...sliders.map(s => s.knob), ...Object.keys(o.hold || {})].map(k => [k, TUNE[k]]));
          for (const s of sliders) if (s.set !== undefined) tuneSet(s.knob, s.set);
          for (const [k, v] of Object.entries(o.hold || {})) tuneSet(k, v);   // (knobs held where the zone wants them, no slider)
          play.enter({ route: ['play', 'safehouse'] }); hash = game.stateHash;
          Z = o.enter ? o.enter(app, play) || {} : {}; Z.tap = tap;
          return { city: W().city };
        },
        exit() { if (o.exit && Z) o.exit(app, play, Z); if (W().pilot) W().pilot(null); app.ui.screens.closeAll(); play.exit(); for (const [k, v] of Object.entries(saved)) tuneSet(k, v); },
        update(dt) {
          if (sliders.length) {   // (the sliders: the arrows, so the stick and the pad still play)
            if (tap('ArrowUp')) sel = (sel + sliders.length - 1) % sliders.length;
            if (tap('ArrowDown')) sel = (sel + 1) % sliders.length;
            const s = sliders[sel], d = (tap('ArrowRight') ? 1 : 0) - (tap('ArrowLeft') ? 1 : 0);
            if (s && d) tuneSet(s.knob, TUNE[s.knob] + d * (s.step || s.k.step || 1));
          }
          const n = Z.speed || 1; for (let i = 0; i < n; i++) play.update(dt);   // (the bench's self-test: faster than life)
          if (o.update) o.update(dt * n, app, play, Z);
        },
        draw(r) { play.draw(r); },
        uiHud(P) { play.hud(P); },
        hud() {
          return [...sliders.map((s, i) => `${i === sel ? '> ' : '  '}${s.label}  < ${Math.round(TUNE[s.knob] * 100) / 100} >`), ...(o.hud ? o.hud(app, play, Z) : [])];
        },
        snapshot() { const h = W(); return { district, cars: h.fleet ? h.fleet.vehicles.length : 0, ...(o.snapshot ? o.snapshot(app, play, Z) : {}) }; },
        perf() { return {}; },
        stateHash() { return hash ? hash() : []; },
        handle() { return { play, zone: Z }; },
        selftest: o.selftest ? st => o.selftest(st, app, play, Z) : undefined,
      };
      return self;
    },
  });
}

// ---- the handling ground ----
const SK = TRACK.skidpad, SL = TRACK.slalom, KI = TRACK.kicker, ST = TRACK.strips, BA = TRACK.basin;
const stripY = k => (ST.row + ST.rows * k + ST.rows / 2) * 16;
const NAMES = { road: 'DRY', wet: 'WET', grass: 'GRASS', sand: 'SAND', oil: 'OIL', ice: 'ICE', deep: 'WATER', water: 'WATER' };
// a ped into a vehicle's driving seat (out of the one it was in), as a mission's place does
function seat(p, v) { if (p.seat && p.seat.vehicle === v) return; if (p.seat) p.seat.vehicle.unseat(p); p.boarding = null; p.held = null; v.sit(p, 0); p.place(v.x, v.y, v.z); }
// a vehicle put down at a point, a heading and a speed along it, patched up
function put(v, x, y, heading, speed = 0) { const b = v.body; b.x = x; b.y = y; b.z = 0; b.heading = heading; b.u = speed; b.v = 0; b.w = 0; b.vz = 0; b.airborne = false; b.flipped = false; v.asleep = false; if (v.damage) v.damage.repair(); }
// the course's trials (the self-test drives them in turn; each its own numbers): a stop from 180 on each strip, a lap of
// the skidpad, the slalom, the kicker, the boat
function trials() {
  const L = ST.surfaces.map((s, k) => ({ id: 'stop on ' + NAMES[s].toLowerCase(), surface: s,
    start: Z => { put(Z.car, ST.x0 + 40, stripY(k), 0, 180); Z.x0 = Z.car.x; },
    drive: (I, Z) => { I.brake = 1; },
    done: (Z, t) => (Z.car.speed < 2 || t > 8) && { value: Math.round(Z.car.x - Z.x0) } }));
  L.push({ id: 'skidpad', start: Z => { put(Z.car, SK.x + SK.r, SK.y, Math.PI / 2, 100); Z.dev = 0; },
    drive: (I, Z, t) => {   // (round the ring at 110, the aim .6 rad ahead on it)
      const v = Z.car, a = Math.atan2(v.y - SK.y, v.x - SK.x) + .6, tx = SK.x + Math.cos(a) * SK.r, ty = SK.y + Math.sin(a) * SK.r;
      I.steer = Math.max(-1, Math.min(1, wrap(Math.atan2(ty - v.y, tx - v.x) - v.heading) * 2.5)); I.throttle = v.speed < 110 ? .6 : 0;
      if (t > 2) Z.dev = Math.max(Z.dev, Math.abs(Math.hypot(v.x - SK.x, v.y - SK.y) - SK.r));
    },
    done: (Z, t) => t > 8 && { value: Math.round(Z.dev), ok: Z.dev < 48, unit: 'u off the ring at most' } });
  const B = SL.barrels, D = B[1][0] - B[0][0], A = 36;   // (the weave: 36 either side of the line at each barrel, level before and after)
  const weave = x => (x < B[0][0] - D / 2 || x > B[B.length - 1][0] + D / 2 ? SL.y : SL.y - A * Math.cos(Math.PI * (x - B[0][0]) / D));
  L.push({ id: 'slalom', start: Z => { put(Z.car, B[0][0] - D / 2 - 20, SL.y, 0, 50); Z.hit = 0; },
    drive: (I, Z) => {
      const v = Z.car, tx = v.x + 50, ty = weave(tx);
      I.steer = Math.max(-1, Math.min(1, wrap(Math.atan2(ty - v.y, tx - v.x) - v.heading) * 2.4)); I.throttle = v.speed < 70 ? .5 : 0; I.brake = v.speed > 90 ? .3 : 0;
      if (v.body.felt.hit > 0) Z.hit++;
    },
    done: (Z, t) => (Z.car.x > B[B.length - 1][0] + 60 || t > 15) && { value: Z.hit ? 'touched' : 'clean', ok: !Z.hit && Z.car.x > B[B.length - 1][0] + 60 } });
  L.push({ id: 'kicker', start: Z => { put(Z.car, KI.foot - 100, SL.y, 0, 160); Z.air = false; Z.top = 0; Z.down = false; },
    drive: (I, Z) => {
      const b = Z.car.body; Z.top = Math.max(Z.top, b.z); if (b.airborne && Z.car.x > KI.end - 8) Z.air = true;
      if (Z.air && !b.airborne) Z.down = true;
      if (Z.down) I.brake = 1; else { I.throttle = .7; I.steer = Math.max(-1, Math.min(1, wrap(Math.atan2(SL.y - Z.car.y, 200) - Z.car.heading) * 2)); }
    },
    done: (Z, t) => ((Z.down && Z.car.speed < 5) || t > 10) && { value: `off at ${Math.round(Z.top)} u, landed ${Z.car.body.flipped ? 'on its roof' : 'on its wheels'}`, ok: Z.air && Z.down && !Z.car.body.flipped && Z.car.x > KI.end } });
  L.push({ id: 'boat', start: Z => { put(Z.boat, BA.x, BA.y, 0); seat(handle.crew.ped, Z.boat); Z.x0 = Z.boat.x; },
    drive: (I, Z) => { I.throttle = 1; I.steer = Math.max(-1, Math.min(1, wrap(-Z.boat.heading) * 2)); },
    done: (Z, t) => t > 3 && { value: Math.round(Z.boat.x - Z.x0) + ' u in 3 s', ok: Z.boat.x - Z.x0 > 80 && !Z.boat.sunk && !Z.boat.wrecked } });
  return L;
}
labZone('handling', 'Handling ground', {
  district: 'proving-track', hold: { trafficCars: 0, crowdDensity: 0 },
  enter: app => {
    const F = handle.fleet, car = F.spawn('cortez', SK.x + SK.r, SK.y, Math.PI / 2, { owner: 'world' }), boat = F.spawn('bilgerat', BA.x, BA.y, 0, { owner: 'world' });
    seat(handle.crew.ped, car);
    const Z = { car, boat, results: [], list: null, i: -1, t: 0, I: makeIntent(), self: app.links.query.get('selftest') === '1' };
    if (Z.self) { Z.list = trials(); Z.speed = 2; handle.pilot(() => { clearIntent(Z.I); const T = Z.list[Z.i]; if (T) T.drive(Z.I, Z, Z.t); return Z.I; }); }
    return Z;
  },
  update: (dt, app, play, Z) => {
    const p = handle.crew.ped;
    if (!Z.self) {   // (by hand: 1-4 take the car to a station)
      const go = [['Digit1', () => put(Z.car, SK.x + SK.r, SK.y, Math.PI / 2)], ['Digit2', () => put(Z.car, ST.x0 - 40, stripY(0), 0)], ['Digit3', () => put(Z.car, SL.barrels[0][0] - 100, SL.y, 0)], ['Digit4', () => { put(Z.boat, BA.x, BA.y, 0); seat(p, Z.boat); }]];
      for (const [c, f] of go) if (Z.tap(c)) { if (c !== 'Digit4') seat(p, Z.car); f(); app.game.cam.snap = true; }
      return;
    }
    if (Z.i >= Z.list.length) return;
    const T = Z.list[Z.i];
    if (T) { Z.t += dt; const r = T.done(Z, Z.t); if (!r) return; Z.results.push({ id: T.id, surface: T.surface, ...r }); }
    if (++Z.i < Z.list.length) { seat(p, Z.car); Z.t = 0; Z.list[Z.i].start(Z); app.game.cam.snap = true; }
  },
  hud: (app, play, Z) => {
    const p = handle.crew.ped, v = (p.seat && p.seat.vehicle) || Z.car, C = handle.city, s = C ? C.surfaceAtPoint(v.x, v.y) : '';
    const last = Z.results.filter(r => r.surface).map(r => `${NAMES[r.surface]} ${r.value}`).join('  ');
    return [`1-4: SKIDPAD STRIPS SLALOM BOAT`, `${Math.round(v.speed)} U/S  SLIP ${Math.round(v.body.felt.slip * 57.3)} DEG  ON ${(NAMES[s] || String(s)).toUpperCase()}`, ...(last ? ['STOPS FROM 180: ' + last] : [])];
  },
  snapshot: (app, play, Z) => ({ handling: Z.results }),
  // ?selftest=1: the stops shorten with the grip, dry to ice; the skidpad held; the slalom clean; off the kicker and
  // down on the wheels; the boat under way
  selftest: (st, app, play, Z) => {
    if (!Z.list || Z.i < Z.list.length) return null;
    const stops = Z.results.filter(r => r.surface), rising = stops.every((r, i) => !i || r.value > stops[i - 1].value);
    const checks = [{ check: 'stops from 180, dry to ice, each longer', value: stops.map(r => r.value).join(' < '), ok: rising && stops.length === 6 },
      ...Z.results.filter(r => !r.surface).map(r => ({ check: r.id, value: r.value, ok: !!r.ok }))];
    return { ok: checks.every(c => c.ok), checks };
  },
});

// ---- the town's zones ----
// the traffic and crowd lab
labZone('traffic', 'Traffic and crowd lab', {
  sliders: [{ knob: 'trafficCars', label: 'CARS' }, { knob: 'crowdDensity', label: 'CROWD', step: .25 }],
  enter: () => ({ used: new Set(), moving: [], peds: [] }),
  update: (dt, app, play, Z) => { const L = handle.life; if (!L) return; for (const [rid, R] of L.junctions.regions) if (R.holders.size) Z.used.add(rid); },
  hud: (app, play, Z) => { const L = handle.life; return L ? [`TRAFFIC ${L.traffic.cars.length}  CROWD ${L.crowd ? L.crowd.members.length : 0}  JUNCTIONS USED ${Z.used.size}/9`] : []; },
  // ?selftest=1: ten seconds of the town: cars on the move, a crowd on the sidewalks, the junctions letting them through
  selftest: (st, app, play, Z) => {
    const L = handle.life, F = handle.fleet; if (!L) return null;
    if (st.frame % 30 === 0) { Z.moving.push(F.vehicles.filter(v => v.brain && v.speed > 20).length); Z.peds.push(L.crowd ? L.crowd.members.length : 0); }
    if (st.frame < 600) return null;
    const checks = [{ check: 'cars moving', value: med(Z.moving), ok: med(Z.moving) >= 5 }, { check: 'a crowd on the sidewalks', value: med(Z.peds), ok: med(Z.peds) >= 20 },
      { check: 'junctions crossed', value: Z.used.size, ok: Z.used.size >= 6 }];
    return { ok: checks.every(c => c.ok), checks };
  },
});

// the wanted sandbox
labZone('wanted', 'Wanted sandbox', {
  sliders: [{ knob: 'trafficCars', label: 'CARS' }],
  enter: () => ({ units: 0, after: null, want: 2, hold: true, changed: true }),
  update: (dt, app, play, Z) => {   // (two stars to begin with, held there; [ less, ] more; H lets the search run its course)
    const w = handle.life && handle.life.wanted; if (!w) return;
    if (Z.tap('BracketRight')) { Z.want = Math.min(5, Z.want + 1); Z.changed = true; } if (Z.tap('BracketLeft')) { Z.want = Math.max(0, Z.want - 1); Z.changed = true; } if (Z.tap('KeyH')) Z.hold = !Z.hold;
    if (!Z.want) { if (w.stars) w.clear(); } else if (Z.hold ? w.stars !== Z.want : Z.changed) w.set(Z.want);
    Z.changed = false;
  },
  hud: (app, play, Z) => { const L = handle.life, P = L && L.police; return P ? [`STARS ${L.wanted.stars} ([ ] SET IT, H ${Z.hold ? 'HELD' : 'SEARCHING'})`, `UNITS ${P.units.length}  COPS ${P.cops.length}${P.heli ? '  EYE UP' : ''}`] : []; },
  // ?selftest=1: two stars bring units; cleared, they stand down
  selftest: (st, app, play, Z) => {
    const L = handle.life, P = L && L.police; if (!P) return null;
    if (Z.after === null) { Z.units = Math.max(Z.units, P.units.length); if (st.frame >= 900 || (Z.units >= 1 && st.frame >= 300)) { Z.want = 0; L.wanted.clear(); Z.after = st.frame; } return null; }
    if (st.frame < Z.after + 600 && P.units.some(u => u.car && u.car.v && u.car.v.siren)) return null;
    const off = !P.units.some(u => u.car && u.car.v && u.car.v.siren);
    const checks = [{ check: 'two stars brought units', value: Z.units, ok: Z.units >= 1 }, { check: 'cleared, the sirens off', value: off ? 'yes' : 'no', ok: off }];
    return { ok: checks.every(c => c.ok), checks };
  },
});

// the mission bench: every bench job in turn, the bot at the controls
labZone('bench', 'Mission bench', {
  bot: true, hold: { trafficCars: 14 },   // (a quiet town: the getaway of the evade job is not a queue at a light with a cop at the door)
  enter: app => { const only = app.links.query.get('job'); return { list: all('bench').map(b => b.id).filter(id => !only || id === 'bench_' + only), i: -1, wait: 1, results: [], speed: app.links.query.get('selftest') === '1' ? 6 : 1 }; },   // (?job=collect: that one alone)
  update: (dt, app, play, Z) => {
    const C = handle.career; if (!C) return;
    if (C.R.state === 'running' || C.R.state === 'failed' || C.R.state === 'passed') return;
    if (Z.i >= 0 && !Z.results[Z.i]) { const r = C.R.result || {}; Z.results[Z.i] = { id: Z.list[Z.i], ok: !!r.passed, secs: Math.round(r.elapsed || 0), why: r.reason || '' }; Z.wait = 1; }
    if ((Z.wait -= dt) > 0 || Z.i >= Z.list.length - 1) return;
    Z.i++; C.botTries = 0; C.R.start(Z.list[Z.i], { bench: true });
  },
  hud: (app, play, Z) => [`JOB ${Math.max(0, Z.i) + 1}/${Z.list.length}  ${(Z.list[Z.i] || '').replace('bench_', '').toUpperCase()}  PASSED ${Z.results.filter(r => r && r.ok).length}`],
  snapshot: (app, play, Z) => ({ bench: Z.results }),
  selftest: (st, app, play, Z) => {
    if (Z.results.filter(Boolean).length < Z.list.length) return null;
    const checks = Z.results.map(r => ({ check: r.id.replace('bench_', ''), value: r.ok ? 'passed' : r.why || 'failed', ok: r.ok }));
    return { ok: checks.every(c => c.ok), checks };
  },
});

// the stress pad: the sliders to their tops (200 cars, a crowd of 300). The town's lanes hold about fifty cars in
// traffic (its six avenues, a car's length and a gap apiece, the queues at the lights): the CARS slider is the most the
// spawner asks for, the HUD says what the town took
labZone('stress', 'Stress pad', {
  sliders: [{ knob: 'trafficCars', label: 'CARS', set: 200, step: 10 }, { knob: 'crowdMax', label: 'PEDS (CAP)', set: 300, step: 10 }, { knob: 'crowdDensity', label: 'CROWD', set: 6, step: .25 }],
  enter: () => { handle.clock.set(12); handle.weather.set('clear'); return { cars: [], peds: [], ms: [], upd: [], fillT: 0 }; },   // (the busiest hour, dry)
  update: (dt, app, play, Z) => {   // (the traffic topped up to the slider anywhere on the lanes, a second at a time: never on a ped crossing)
    const L = handle.life, C = handle.city; if (!L || (Z.fillT -= dt) > 0) return; Z.fillT = 1;
    L.traffic.fill(TUNE.trafficCars, { pedsNear: (x, y, r) => L.pedsNear(x, y, r).filter(q => C.surfaceAtPoint(q.x, q.y) === 'road') });
  },
  hud: app => { const L = handle.life; return L ? [`CARS ${handle.fleet.vehicles.length} (${L.traffic.cars.length} DRIVING)  PEDS ${L.crowd ? L.crowd.members.length : 0}`] : []; },
  // ?selftest=1: the sliders at their tops, ten seconds: the town's lanes full, the crowd near its cap, every frame
  // drawn (the draw and update times reported)
  selftest: (st, app, play, Z) => {
    const L = handle.life, F = handle.fleet; if (!L) return null;
    if (st.frame % 30 === 0) { Z.cars.push(L.traffic.cars.length); Z.peds.push(L.crowd ? L.crowd.members.length : 0); Z.ms.push(+app.game.stats.renderMs || 0); Z.upd.push(+app.game.stats.updateMs || 0); }
    if (st.frame < 600) return null;
    const cars = Math.max(...Z.cars), peds = Math.max(...Z.peds);
    const checks = [{ check: 'cars in traffic', value: cars, ok: cars >= 40 }, { check: 'crowd', value: peds, ok: peds >= 240 }, { check: 'vehicles in all', value: F.vehicles.length, ok: true },
      { check: 'draw ms (median)', value: +med(Z.ms).toFixed(1), ok: true }, { check: 'update ms (median)', value: +med(Z.upd).toFixed(2), ok: true }];
    return { ok: checks.every(c => c.ok), checks };
  },
});
