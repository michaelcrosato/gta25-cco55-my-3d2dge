// Firefighter (PLAN.md 9.5): the second of the three jobs. At the Pumper's wheel (the fire house parks it by the L
// depot), the phone's JOBS take Engine 9's calls: a car on fire at a curb across town. Get there and put it out with
// the water cannon (pull up within reach, aim, hold fire) before the clock runs out and its tank goes up. Level 1 is
// two calls with time to spare; level 2 three, on a quicker clock; level 3 four, the last two of them two cars ablaze
// in the same street, on a tight clock. Each call's clock is the road's time to it (m.eta) stretched for a fire engine,
// and a grace for the hosing. On a call the engine's lights are on: no stars, whatever the driving. Between calls the
// crew patches the engine up. Started anywhere else (a deep link, a retry with the engine gone), the fire house sends a
// Pumper to the nearest lane. Proves: the water cannon against the fire grid (m.fire, m.heat), the spray hint, a job
// by level.
import { defActivity } from '../../motor/index.js';

const CHIEF = { name: 'Dispatch', color: '#ff6a3a' };
// where the calls come from: the curb by a point of interest (the burning car parks there)
const CALLS = [
  ['palm-park', 'Palm Park'], ['greasy-spoke', 'the Greasy Spoke'], ['gnomes-hq', 'Gutterball Lanes'], ['threads', 'Threads'], ['kwik-lux-palm', 'the Palm Kwik-Lux'],
  ['hotel-marquee', 'the Hotel Marquee'], ['lead-farm', 'Lead Farm'], ['pixel-palace', 'the Pixel Palace'], ['bank-door', 'the bank'], ['kwik-lux-neon', 'the Neon Mile Kwik-Lux'],
  ['container-ramp', 'the container yard'], ['spray-pray', 'Spray & Pray'], ['car-wash', 'the car wash'], ['kwik-lux-harbor', 'the Harbor Kwik-Lux'],
].map(([id, name]) => ({ id, name }));
const CARS = ['cortez', 'retiree', 'brute', 'saint', 'zephyr', 'hauler'];
const MAX = 4;   // (level 3's calls; level n answers n + 1)
const count = m => Math.min(MAX, 1 + m.level);
const cars = (m, k) => (m.level === 3 && k >= 2 ? 2 : 1);   // (level 3's last two calls: two cars ablaze)
// the fire on a car: the grid's cells under its body, each with fuel for FUEL s; while the call runs the cells still
// burning are fed every FEED s (rain or no rain, only the cannon puts them out). Only the car's own cells are the call:
// what they spread to on the street round it burns out by itself (a job quit leaves the car to burn out too)
const CELL = 16, FUEL = 45, FEED = 3;
// the clock: the road's time there (m.eta: at the streets' limits, one-way streets and all, from where the engine
// stands) stretched by the level's factor (a Pumper tops out at 180 and pulls away slowly, the lights and the traffic
// cost time, and it crawls round the corners), and a grace for the hosing (more for a second car)
const SLACK = [0, 4, 3.6, 3.2], GRACE = [0, 35, 30, 25], MORE = 12;
function clock(m, at, n) {
  const eta = m.eta(at) ?? m.dist(at) * 1.4 / 150;
  return Math.round(GRACE[m.level] + (n - 1) * MORE + eta * SLACK[m.level]);
}
const REACH = 130;   // (how near the burning cell the cannon is played from: the jet goes 150 from the nozzle)

const inEngine = m => !!m.vehicle && m.vehicle.def.tool === 'cannon' && m.vehicle.driver === m.player;
// a ground lane's point near p with no vehicle on it but self (the engine's spot)
function freeLane(m, p, self = null) {
  for (const k of [0, 1, -1, 2, -2, 3]) {
    const q = m.lane([p[0] + k * 60, p[1]]);
    if ((q.z || 0) < 4 && !m.fleet.near(q.x, q.y, 50).some(v => v !== self && !v.wrecked && Math.hypot(v.x - q.x, v.y - q.y) < 50)) return q;
  }
  return m.lane(p);
}
// the engine: the one the player drives (the phone's start: on the job's list as 'engine', so a hint can name it),
// else the fire house's Pumper on a lane nearby (one still about and near: back in it), the player at its wheel
function engine(m) {
  if (inEngine(m)) {
    const e = m.one('engine'); if (e === m.vehicle) return e;
    if (e) m.remove(e);   // (another one: the one driven is the job's now)
    return m.adopt(m.vehicle, 'engine');
  }
  let e = m.one('engine');
  if (!e || m.dist(e) > 250) { if (e) m.remove(e); const q = freeLane(m, [m.player.x, m.player.y]); e = m.ensure.vehicle('engine', 'pumper', q, { heading: q.heading }); }
  m.place('player', { in: e });
  return e;
}
// call k, picked as its stage comes (kept for a retry): from where the engine stands, a spot not called yet that is a
// fair drive by the road (m.eta, at the streets' limits: the level's band, farther out level by level; a spot round a
// one-way block is a long way however near it looks), else the nearest past the band's low end; and the cars that
// burn there
const ETA = [null, [4, 10], [5, 12], [6, 13]];
function callFor(m, k) {
  const C = m.data.calls || (m.data.calls = []); if (C[k]) return C[k];
  const used = new Set(C.filter(Boolean).map(c => c.id)), left = CALLS.filter(c => !used.has(c.id)).map(c => ({ c, t: m.eta(c.id) ?? 1e9 })), [lo, hi] = ETA[m.level];
  let pool = left.filter(q => q.t >= lo && q.t <= hi);
  if (!pool.length) pool = left.filter(q => q.t >= lo).sort((a, b) => a.t - b.t).slice(0, 3);
  if (!pool.length) pool = left;
  const q = pool[Math.floor(m.rng.next() * pool.length) % pool.length], pick = () => CARS[Math.floor(m.rng.next() * CARS.length) % CARS.length];
  return (C[k] = { id: q.c.id, name: q.c.name, cars: [pick(), pick()] });
}
const tags = (m, k) => Array.from({ length: cars(m, k) }, (_, j) => `car${k + 1}${'ab'[j]}`);
// the curb spot for a second car: behind or ahead of the first along the same curb (the free one nearest it), or
// null when the curb there is parked up (the call is the one car then: two blazes a street apart are two calls)
function beside(m, a) {
  if (!a) return null;
  const dx = Math.cos(a.heading) * 70, dy = Math.sin(a.heading) * 70, near = s => Math.hypot(s.x - a.x, s.y - a.y);
  const s = [m.curb([a.x - dx, a.y - dy]), m.curb([a.x + dx, a.y + dy]), m.curb([a.x, a.y])].sort((p, q) => near(p) - near(q))[0];
  return near(s) < 110 ? s : null;
}
// the grid cells under a car's body (cell centres, [x, y])
function cellsOf(v) {
  const out = [], c = Math.cos(v.heading), s = Math.sin(v.heading), R = Math.hypot(v.hl, v.hw) + CELL;
  for (let cy = Math.floor((v.y - R) / CELL); cy <= Math.floor((v.y + R) / CELL); cy++) for (let cx = Math.floor((v.x - R) / CELL); cx <= Math.floor((v.x + R) / CELL); cx++) {
    const x = (cx + .5) * CELL, y = (cy + .5) * CELL, dx = x - v.x, dy = y - v.y;
    if (Math.abs(dx * c + dy * s) <= v.hl + 4 && Math.abs(-dx * s + dy * c) <= v.hw + 4) out.push([x, y]);
  }
  return out;
}
// the call's cells still burning, and the cannon's aim: the nearest the engine's turret can swing to from where it
// stands (within reach, no more than ARC off its nose), else the nearest (hosed from the near edge in, so the engine
// never pulls up in the flames)
const ARC = 1.5;
function burning(m, cells) {
  const P = m.mover, live = cells.filter(p => m.heat(p, 0) > 0), v = m.vehicle; let at = null, nd = 1e9, swing = null, sd = 1e9;
  for (const p of live) {
    const d = Math.hypot(p[0] - P.x, p[1] - P.y); if (d < nd) { nd = d; at = p; }
    if (v && d < REACH && d < sd) { let a = Math.atan2(p[1] - v.y, p[0] - v.x) - v.heading; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) < ARC) { sd = d; swing = p; } }
  }
  return { live, at: swing || at };
}
// put the call's fire out: within reach of its nearest burning cell, the cannon on it (the hint follows the fire as it
// shrinks); the cells still burning fed meanwhile
function douse(m, cells, list, text) {
  let hint = null, fed = m.stageTime;
  return Object.assign(m.waitUntil(mm => {
    const b = burning(mm, cells); if (!b.live.length) return true;
    if (mm.stageTime - fed > FEED) { fed = mm.stageTime; for (const p of b.live) mm.fire(p, 0, FUEL); }
    if (hint) hint.spray = b.at;
    return false;
  }), {
    nav: () => (hint ? hint.spray : cells[0]),
    start: mm => {
      const b = burning(mm, cells), c = list[0];
      hint = { kind: 'goto', at: [Math.round(c.x), Math.round(c.y)], spray: b.at || cells[0], reach: REACH, radius: REACH, vehicle: 'engine' };
      mm.objective(text, { hint }); for (const v of list) mm.marker(v, { color: '#ff6a3a' });
    },
  });
}
// an op held beside the call's own: the engine's lights on (no stars while it runs; the heat forgotten however it ends)
const lights = m => Object.assign(m.waitUntil(() => false), { start: mm => mm.wanted.cap(0), end: mm => mm.wanted.clear() });
// on the job the gangs leave Engine 9 alone: a gangster the cannon knocks over, or a car of theirs it soaks, rallies
// nobody and costs no respect, and none go for the crew on sight (till the job ends, however it ends)
const neutral = m => { for (const g of ['saints', 'rats', 'gnomes']) m.truce(g); };

const fireStage = k => ({
  id: 'fire' + (k + 1),
  setup(m) {
    if (k >= count(m)) return;   // (past the level's calls: nothing to do)
    neutral(m);
    const e = engine(m), c = callFor(m, k), tries = m.data.tries || (m.data.tries = {});
    if (e.damage && !e.damage.burning && e.damage.share < .6) e.damage.repair();   // (between calls the crew patches the engine up)
    // a retry: the engine back on the road where it stands, the way its lane runs (wedged on a corner, it would stay so)
    if ((tries[k] = (tries[k] || 0) + 1) > 1 && m.vehicle === e) { const q = freeLane(m, [e.x, e.y], e); m.place(e, q, { heading: q.heading }); }
    const cells = [];
    tags(m, k).forEach((tag, j) => {
      let v = m.one(tag);
      if (!v) { const s = j ? beside(m, m.one(tags(m, k)[0])) : m.curb(c.id); if (!s) return; v = m.ensure.vehicle(tag, c.cars[j], s, { heading: s.heading, health: .3 }); }   // (smoking already)
      if (v.damage) v.damage.toughness = 0;   // (while the call runs only its clock sets the car off: never a stray shot from a street fight by the curb, a call no one could win)
      for (const p of cellsOf(v)) { cells.push(p); m.fire(p, 0, FUEL); }   // (lit again on a retry: the same fire)
    });
    m.data.cells = cells;
    m.failIf(mm => !mm.one('engine'), 'the engine\'s a wreck');
  },
  *run(m) {
    if (k >= count(m)) return;
    const c = m.data.calls[k], list = tags(m, k).map(t => m.one(t)).filter(Boolean), n = count(m), two = list.length > 1, cells = m.data.cells;
    yield m.say([two ? `Engine 9: two cars ablaze by ${c.name}.` : `Engine 9: a car fire by ${c.name}.`], CHIEF);
    const T = m.timer(clock(m, [list[0].x, list[0].y], list.length), { label: 'FIRE', fail: false });
    m.failIf(() => { if (T.left > 0) return false; for (const v of list) if (!v.wrecked && v.damage) v.damage.flip(); return true; }, two ? 'the cars went up' : 'the car went up');
    yield m.first([lights(m), douse(m, cells, list, `Put out the ${two ? 'two cars' : 'car fire'} by ${c.name} (${k + 1} of ${n}): pull up close, aim the cannon, hold fire`)]);
    m.data.spare = Math.min(m.data.spare ?? 1e9, T.left); T.stop();
    for (const v of list) if (v.damage) v.damage.toughness = v.def.toughness ?? 1;   // (out: a car like any other again)
    yield m.say([k < n - 1 ? 'Fire\'s out. Good work. Stand by.' : 'All out. Engine 9, back to quarters.'], CHIEF);
  },
});

defActivity('job_firefighter', {
  title: 'Firefighter', kind: 'job', levels: 3, start: { vehicle: ['pumper'] },
  brief: ['Engine 9 takes the city\'s car fires.', 'Hose each one down before its tank goes up. More calls and bigger fires, level by level.'],
  rewardsFor: level => ({ cash: [0, 500, 1000, 1700][level] || 500 }),
  bonus: [{ id: 'quick', text: 'Every fire out with 15 s to spare', check: m => (m.data.spare ?? 0) >= 15 }],
  stages: [
    { id: 'call', setup(m) { neutral(m); engine(m); }, *run(m) { yield m.say(['Engine 9, you\'re on. Calls coming in.'], CHIEF); } },
    ...Array.from({ length: MAX }, (_, k) => fireStage(k)),
  ],
});
