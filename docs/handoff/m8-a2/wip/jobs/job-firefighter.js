// Firefighter (PLAN.md 9.5): the second job. At the Pumper's wheel, the phone's JOBS take Engine 9's calls: a car on
// fire at a curb across town. Get there and put it out with the water cannon (stop within reach, aim, hold fire)
// before the clock runs out and its tank goes up. Level 1 is two calls with time to spare; level 2 three, on a
// quicker clock; level 3 four, the last two of them two cars ablaze in the same street, on a tight clock. Between
// calls the crew patches the engine up (a shift of city driving wears a Pumper down). Started anywhere else (a deep
// link, a retry with the engine gone), the fire house sends a Pumper to the nearest lane.
// Proves: the water cannon against the fire grid (m.fire, m.heat), the spray hint, a job by level.
import { defActivity } from '../../motor/index.js';

const CHIEF = { name: 'Dispatch', color: '#ff6a3a' };
// where the calls come from: a curb by a point of interest (the burning car parks there)
const CALLS = [
  ['palm-park', 'Palm Park'], ['greasy-spoke', 'the Greasy Spoke'], ['gnomes-hq', 'Gutterball Lanes'], ['threads', 'Threads'], ['kwik-lux-palm', 'the Palm Kwik-Lux'],
  ['hotel-marquee', 'the Hotel Marquee'], ['lead-farm', 'Lead Farm'], ['pixel-palace', 'the Pixel Palace'], ['bank-door', 'the bank'], ['kwik-lux-neon', 'the Neon Mile Kwik-Lux'],
  ['container-ramp', 'the container yard'], ['spray-pray', 'Spray & Pray'], ['car-wash', 'the car wash'], ['kwik-lux-harbor', 'the Harbor Kwik-Lux'],
].map(([id, name]) => ({ id, name }));
const CARS = ['cortez', 'retiree', 'brute', 'saint', 'zephyr', 'hauler'];
const MAX = 4;   // (level 3's calls; level n answers n + 1)
const count = m => Math.min(MAX, 1 + m.level);
const cars = (m, k) => (m.level === 3 && k >= 2 ? 2 : 1);   // (level 3's last two calls: two cars ablaze)
// the fire on a car: how far round each of its points it burns (the body's own cells, none out in the lane beside it)
// and its fuel (seconds; while the call runs its burning cells are kept fed, rain or no rain, so only the cannon puts
// them out; a job quit leaves them to burn out on their own)
const SIZE = 6, FUEL = 45, FEED = 3;
// the clock: the quickest way there by the road (the GPS's time at the streets' limits, one-way streets and all, from
// where the engine stands) stretched by the level's factor (a Pumper tops out at 180 and takes its time getting
// there), and a grace for the hosing (more for a second car)
const SLACK = [0, 3.2, 2.8, 2.4], GRACE = [0, 30, 24, 18], MORE = 10;
function clock(m, at, n) {
  const P = m.mover, G = m.W.roads && m.W.roads.gps, r = G && G.routeTo(P.x, P.y, P.heading, at[0], at[1], { z: P.z || 0 });
  const cost = r ? r.cost : Math.hypot(at[0] - P.x, at[1] - P.y) * 1.4 / 150;
  return Math.round(GRACE[m.level] + (n - 1) * MORE + cost * SLACK[m.level]);
}
const REACH = 100;   // (the bot's spray reach: the jet goes 150 from the nozzle)

const inEngine = m => !!m.vehicle && m.vehicle.def.tool === 'cannon' && m.vehicle.driver === m.player;
// a ground lane's point near p with no vehicle on it (the engine's spot)
function freeLane(m, p) {
  for (const k of [0, 1, -1, 2, -2, 3]) {
    const q = m.lane([p[0] + k * 60, p[1]]);
    if ((q.z || 0) < 4 && !m.fleet.near(q.x, q.y, 50).some(v => !v.wrecked && Math.hypot(v.x - q.x, v.y - q.y) < 50)) return q;
  }
  return m.lane(p);
}
// the engine: the one the player drives (the phone's start), else the fire house's Pumper on a lane nearby (one still
// about and near: back in it), the player at its wheel
function engine(m) {
  if (inEngine(m)) return m.vehicle;
  let e = m.one('engine');
  if (!e || m.dist(e) > 250) { if (e) m.remove(e); const q = freeLane(m, [m.player.x, m.player.y]); e = m.ensure.vehicle('engine', 'pumper', q, { heading: q.heading }); }
  m.place('player', { in: e });
  return e;
}
// the calls, picked once a run: each a fair drive on from the last (500 to 1200 u as the crow flies), never the same
// spot twice
function plan(m) {
  if (m.data.calls) return m.data.calls;
  let from = [m.player.x, m.player.y]; const left = CALLS.slice(), out = [];
  while (out.length < MAX && left.length) {
    const far = c => Math.hypot(m.at(c.id)[0] - from[0], m.at(c.id)[1] - from[1]);
    let pool = left.filter(c => far(c) > 500 && far(c) < 1200);
    if (!pool.length) pool = left.filter(c => far(c) > 300).sort((a, b) => far(a) - far(b)).slice(0, 3);
    if (!pool.length) pool = left;
    const c = pool[Math.floor(m.rng.next() * pool.length) % pool.length], pick = () => CARS[Math.floor(m.rng.next() * CARS.length) % CARS.length];
    out.push({ id: c.id, name: c.name, cars: [pick(), pick()] }); left.splice(left.indexOf(c), 1); from = m.at(c.id);
  }
  return (m.data.calls = out);
}
const tags = (m, k) => Array.from({ length: cars(m, k) }, (_, j) => `car${k + 1}${'ab'[j]}`);
// the fire's points on a car (front, middle, rear): the cells under its body
const pointsOf = v => [-.6, 0, .6].map(k => v.toWorld(k * v.hl, 0));
// the fire round the call's cars now: how hot its hottest cell burns, its burning cells, and the one nearest the
// engine (the cannon's aim: hosed from the near edge in, so the engine never pulls up in the flames)
function blaze(m, list) {
  let heat = 0, near = null, nd = 1e9; const P = m.mover, T = m.city.T, seen = new Set(), cells = [];
  for (const v of list) for (let cy = Math.floor((v.y - 56) / T); cy <= Math.floor((v.y + 56) / T); cy++) for (let cx = Math.floor((v.x - 56) / T); cx <= Math.floor((v.x + 56) / T); cx++) {
    const key = cy * 4096 + cx; if (seen.has(key)) continue; seen.add(key);
    const p = [(cx + .5) * T, (cy + .5) * T], h = m.heat(p, 0); if (h <= 0) continue;
    heat = Math.max(heat, h); cells.push(p); const d = Math.hypot(p[0] - P.x, p[1] - P.y); if (d < nd) { nd = d; near = p; }
  }
  return { heat, at: near, cells };
}
// put the call's fire out: within reach of its nearest burning cell, the cannon on it (the hint follows the fire as
// it shrinks, car by car); the cells still burning kept fed meanwhile
function douse(m, list, text) {
  let hint = null, fed = 0; const at = list[0];
  return Object.assign(m.waitUntil(mm => {
    const b = blaze(mm, list); if (b.at && hint) hint.spray = [Math.round(b.at[0]), Math.round(b.at[1])];
    if (mm.stageTime - fed > FEED) { fed = mm.stageTime; for (const p of b.cells) mm.fire(p, 0, FUEL); }
    return b.heat <= 0;
  }), {
    nav: () => (hint ? hint.spray : [at.x, at.y]),
    start: mm => { const b = blaze(mm, list); hint = { kind: 'goto', at: [Math.round(at.x), Math.round(at.y)], spray: b.at ? [Math.round(b.at[0]), Math.round(b.at[1])] : [Math.round(at.x), Math.round(at.y)], reach: REACH, radius: REACH }; mm.objective(text, { hint }); for (const v of list) mm.marker(v, { color: '#ff6a3a' }); },
  });
}
const fireStage = k => ({
  id: 'fire' + (k + 1),
  setup(m) {
    if (k >= count(m)) return;
    const c = plan(m)[k], e = engine(m);
    if (e.damage && !e.damage.burning && e.damage.share < .6) e.damage.repair();   // (between calls the crew patches the engine up)
    tags(m, k).forEach((tag, j) => {
      let v = m.one(tag);
      if (!v) { const s = m.curb(j ? m.one(tags(m, k)[0]) || c.id : c.id); v = m.ensure.vehicle(tag, c.cars[j], s, { heading: s.heading, health: .3 }); }
      for (const p of pointsOf(v)) m.fire(p, SIZE, FUEL);   // (lit again on a retry: the same fire)
    });
    m.failIf(mm => !mm.one('engine') && !inEngine(mm), 'the engine\'s a wreck');
  },
  *run(m) {
    if (k >= count(m)) return;
    const c = m.data.calls[k], list = tags(m, k).map(t => m.one(t)).filter(Boolean), n = count(m), two = list.length > 1;
    yield m.say([two ? `Engine 9: two cars ablaze by ${c.name}.` : `Engine 9: a car fire by ${c.name}.`], CHIEF);
    const T = m.timer(clock(m, [list[0].x, list[0].y], list.length), { label: 'FIRE', fail: false });
    m.failIf(() => { if (T.left > 0) return false; for (const v of list) if (!v.wrecked && v.damage) v.damage.flip(); return true; }, two ? 'the cars went up' : 'the car went up');
    yield douse(m, list, `Put out the ${two ? 'two cars' : 'car fire'} by ${c.name} (${k + 1} of ${n}): stop close, aim the cannon, hold fire`);
    m.data.spare = Math.min(m.data.spare ?? 1e9, T.left); T.stop();
    yield m.say([k < n - 1 ? 'Fire\'s out. Good work. Stand by.' : 'All out. Engine 9, back to quarters.'], CHIEF);
  },
});

defActivity('job_firefighter', {
  title: 'Firefighter', kind: 'job', levels: 3, start: { vehicle: ['pumper'] },
  brief: ['Engine 9 takes the city\'s car fires.', 'Hose each one down before its tank goes up. More calls and bigger fires, level by level.'],
  rewardsFor: level => ({ cash: [0, 500, 1000, 1700][level] || 500 }),
  bonus: [{ id: 'quick', text: 'Every fire out with 15 s to spare', check: m => (m.data.spare ?? 0) >= 15 }],
  stages: [
    { id: 'call', setup(m) { plan(m); engine(m); }, *run(m) { yield m.say(['Engine 9, you\'re on. Calls coming in.'], CHIEF); } },
    ...Array.from({ length: MAX }, (_, k) => fireStage(k)),
  ],
});
