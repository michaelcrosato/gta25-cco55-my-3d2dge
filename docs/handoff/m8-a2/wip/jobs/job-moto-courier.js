// Moto Courier (PLAN.md 9.5): the first of the three jobs. On any bike, the phone's JOBS offer Lowtown Express's
// parcels: a run of drops across the four neighbourhoods, each against its own clock (set by how far it lies from the
// last one). Level 1 is three drops at an easy pace; level 2 four, quicker; level 3 five, tight. Ride up to each
// drop's marker and slow down to hand the parcel over. Started on foot (a deep link, or a retry after the bike went
// down), Lowtown Express lends a Sparrow at the nearest curb. Proves: a repeatable job by level, timers, bikes.
import { defActivity } from '../../motor/index.js';

const BOSS = { name: 'Lowtown Express', color: '#ffb03a' };
// the drops: points of interest with a lane close by (the marker goes on that lane, outside the door)
const DROPS = [
  ['palm-park', 'Palm Park'], ['safehouse', 'St. Christopher\'s Chapel'], ['greasy-spoke', 'the Greasy Spoke'], ['gnomes-hq', 'Gutterball Lanes'],
  ['threads', 'Threads'], ['kwik-lux-palm', 'the Kwik-Lux on Lantern Lane'], ['hotel-marquee', 'the Hotel Marquee'], ['lead-farm', 'Lead Farm'],
  ['pixel-palace', 'the Pixel Palace'], ['bank-door', 'the First Lowtown Bank'], ['precinct', 'the 5th Precinct'], ['kwik-lux-neon', 'the Neon Mile Kwik-Lux'],
  ['container-ramp', 'the container yard'], ['spray-pray', 'Spray & Pray'], ['car-wash', 'the Palm Car Wash'], ['kwik-lux-harbor', 'the Harbor Kwik-Lux'],
].map(([id, name]) => ({ id, name }));
const MAX = 5;   // (level 3's drops; level n rides n + 2)
const count = m => Math.min(MAX, 2 + m.level);
// the clock for a drop: the quickest way there by the road (the GPS's time at the streets' limits, one-way streets
// and all, from where the bike stands) stretched by the level's factor (a moped is slower than an avenue's limit,
// and the lights and the traffic cost time), and a grace for the start
const SLACK = [0, 2.6, 2.3, 2.0], GRACE = [0, 25, 20, 15];
function clock(m, at) {
  const P = m.mover, G = m.W.roads && m.W.roads.gps, r = G && G.routeTo(P.x, P.y, P.heading, at[0], at[1], { z: P.z || 0 });
  const cost = r ? r.cost : Math.hypot(at[0] - P.x, at[1] - P.y) * 1.4 / 150;
  return Math.round(GRACE[m.level] + cost * SLACK[m.level]);
}
const R = 36;   // (how near the marker a parcel is handed over)

const onBike = m => !!m.vehicle && m.vehicle.cls === 'bike' && m.vehicle.driver === m.player;
// the run of drops, picked once a run (the first stage, or whichever a deep link lands on): each the next a fair ride
// on from the last (600 to 1300 u as the crow flies, else the nearest past 400), never the same twice
function plan(m) {
  if (m.data.drops) return m.data.drops;
  let from = [m.player.x, m.player.y]; const left = DROPS.slice(), out = [];
  while (out.length < MAX && left.length) {
    const far = d => Math.hypot(m.at(d.id)[0] - from[0], m.at(d.id)[1] - from[1]);
    let pool = left.filter(d => far(d) > 600 && far(d) < 1300);
    if (!pool.length) pool = left.filter(d => far(d) > 400).sort((a, b) => far(a) - far(b)).slice(0, 3);
    if (!pool.length) pool = left;
    const d = pool[Math.floor(m.rng.next() * pool.length) % pool.length];
    out.push(d.id); left.splice(left.indexOf(d), 1); from = m.at(d.id);
  }
  return (m.data.drops = out);
}
const spot = (m, id) => { const q = m.lane(id); return [Math.round(q.x), Math.round(q.y)]; };
// a ground lane's point near p with no vehicle on it
function freeLane(m, p) {
  for (const k of [0, 1, -1, 2, -2, 3]) {
    const q = m.lane([p[0] + k * 40, p[1] + k * 24]);
    if ((q.z || 0) < 4 && !m.fleet.near(q.x, q.y, 40).some(v => !v.wrecked && Math.hypot(v.x - q.x, v.y - q.y) < 36)) return q;
  }
  return m.lane(p);
}
// the bike: the one the player rides (their own, the phone's start), else Lowtown Express's on the nearest lane (one
// still about and near: back on it), the player on it
function ride(m) {
  if (onBike(m)) return m.vehicle;
  let b = m.one('ride');
  if (!b || m.dist(b) > 200) { if (b) m.remove(b); const q = freeLane(m, [m.player.x, m.player.y]); b = m.ensure.vehicle('ride', 'sparrow', q, { heading: q.heading, color: '#ffb03a' }); }
  m.place('player', { in: b });
  return b;
}
// ride up to the drop on a bike (any: the job's or the player's own), slow enough to hand the parcel over
function drop(m, at, text) {
  return Object.assign(m.waitUntil(mm => onBike(mm) && Math.hypot(mm.mover.x - at[0], mm.mover.y - at[1]) < R && mm.mover.speed < 30), {
    nav: () => at,
    start: mm => { mm.objective(text, { hint: { kind: 'goto', at, radius: R, vehicle: mm.one('ride') ? 'ride' : null } }); mm.marker(at, { color: '#ffb03a', r: 24 }); },
  });
}
// drop k (0-based): from the last drop (or wherever the player is, for the first)
const dropStage = k => ({
  id: 'drop' + (k + 1),
  setup(m) {
    if (k >= count(m)) return;   // (past the level's drops: nothing to do)
    const drops = plan(m);
    if (k > 0 && m.dist(spot(m, drops[k - 1])) > 600 && m.dist(spot(m, drops[k])) > 600) m.place('player', m.curb(drops[k - 1]));   // (a deep link: where the last drop was)
    ride(m);
    m.failIf(mm => !onBike(mm) && mm.tagged('ride').length > 0 && !mm.one('ride'), 'the bike\'s a wreck');
  },
  *run(m) {
    if (k >= count(m)) return;
    const drops = m.data.drops, d = DROPS.find(q => q.id === drops[k]), at = spot(m, d.id), n = count(m);
    const T = m.timer(clock(m, at), { label: 'DROP' });
    yield drop(m, at, `Parcel ${k + 1} of ${n}: ${d.name}`);
    m.data.spare = Math.min(m.data.spare ?? 1e9, T.left); T.stop();
    if (k < n - 1) yield m.say([['Signed for. Next one\'s on the screen.', 'Delivered. Keep it moving.', 'Got it. Don\'t stop now.', 'Sweet. One more after this.'][k % 4]], BOSS);
    else yield m.say(['That\'s the lot. Lowtown Express thanks you.'], BOSS);
  },
});

defActivity('job_moto_courier', {
  title: 'Moto Courier', kind: 'job', levels: 3, start: { vehicle: ['bike'] },
  brief: ['Lowtown Express: parcels across town on two wheels.', 'Each drop has its clock. More drops and less time, level by level.'],
  rewardsFor: level => ({ cash: [0, 450, 900, 1500][level] || 450 }),
  bonus: [{ id: 'spare', text: 'Every drop with 10 s to spare', check: m => (m.data.spare ?? 0) >= 10 }],
  stages: [
    { id: 'call', setup(m) { plan(m); ride(m); }, *run(m) { yield m.say([`Lowtown Express. ${count(m)} parcels in your box.`, 'The clock starts when you see the address. Go.'], BOSS); } },
    ...Array.from({ length: MAX }, (_, k) => dropStage(k)),
  ],
});
