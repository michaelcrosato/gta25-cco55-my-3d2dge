// Tow Truck (PLAN.md 19's backlog, HANDOFF L4): the fifth job. In the Hookline, the phone's JOBS offer Hook & Line
// Towing's tickets: a car left where it shouldn't be, across town; back the hook up to its nose or its tail and
// hook it, then tow it to the impound behind the MPD 5th Precinct against the clock. Level 1 is two cars at an easy
// pace, level 2 three, quicker, level 3 four, tight. Started on foot (a deep link, a retry after the truck went down),
// Hook & Line lends a Hookline at the nearest lane. Proves: the tow in a job, a car taken in by the job when it's in.
import { defActivity } from '../../motor/index.js';

const BOSS = { name: 'Hook & Line Towing', color: '#ffa03a' };
// where the tickets are written: points of interest with a curb close by
const TICKETS = [
  ['palm-park', 'Palm Park'], ['greasy-spoke', 'the Greasy Spoke'], ['gnomes-hq', 'Gutterball Lanes'], ['threads', 'Threads'],
  ['hotel-marquee', 'the Hotel Marquee'], ['pixel-palace', 'the Pixel Palace'], ['bank-door', 'the First Lowtown Bank'],
  ['kwik-lux-neon', 'the Neon Mile Kwik-Lux'], ['spray-pray', 'Spray & Pray'], ['car-wash', 'the Palm Car Wash'], ['kwik-lux-palm', 'the Kwik-Lux on Lantern Lane'],
].map(([id, name]) => ({ id, name }));
const CARS = ['cortez', 'zephyr', 'saint'];
const MAX = 4;   // (level 3's cars; level n tows n + 1)
const count = m => Math.min(MAX, 1 + m.level);
const SLACK = [0, 3.8, 3.4, 3.0], GRACE = [0, 50, 44, 40];   // (a tow is slower than a run: backing up to the car, a car on the hook round the corners)
const clock = (m, at, from = null) => Math.round(GRACE[m.level] + (m.eta(at, from) ?? Math.hypot(at[0] - (from ? from.x : m.mover.x), at[1] - (from ? from.y : m.mover.y)) * 1.4 / 150) * SLACK[m.level]);   // (from: the car, for the tow's own leg)
const IMPOUND = 'precinct', IN = 130;   // (the impound's gate by the precinct, and how near the towed car must come: the truck stops on the gate, the car a length behind)
const ETA = [6, 14];

const inTruck = m => !!m.vehicle && m.vehicle.def.id === 'hookline' && m.vehicle.driver === m.player;
const spot = (m, id) => { const q = m.lane(id); return [Math.round(q.x), Math.round(q.y)]; };
function ticketFor(m, k) {
  const D = m.data.tickets || (m.data.tickets = []); if (D[k]) return D[k];
  const used = new Set(D.filter(Boolean)), left = TICKETS.filter(c => !used.has(c.id)).map(c => ({ c, t: m.eta(spot(m, c.id)) ?? 1e9 }));
  let pool = left.filter(q => q.t >= ETA[0] && q.t <= ETA[1]);
  if (!pool.length) pool = left.filter(q => q.t >= ETA[0]).sort((a, b) => a.t - b.t).slice(0, 3);
  if (!pool.length) pool = left;
  return (D[k] = pool[Math.floor(m.rng.next() * pool.length) % pool.length].c.id);
}
function freeLane(m, p, heading = null) {
  for (const k of [0, 1, -1, 2, -2, 3]) {
    const q = m.lane([p[0] + k * 40, p[1] + k * 24], heading);
    if ((q.z || 0) < 4 && !m.fleet.near(q.x, q.y, 40).some(v => !v.wrecked && Math.hypot(v.x - q.x, v.y - q.y) < 40)) return q;
  }
  return m.lane(p, heading);
}
// the Hookline: the one the player drives ('ride'), else Hook & Line's own on the nearest lane, the player at the wheel;
// on a retry a fresh one a block behind the ticket's car in its lane, facing its way (near: where the car stands, and
// its heading), the staging point straight on past it. (On the way from where the last one stopped, it had been put
// back in the jam that ran the clock out, or facing away down a one-way street)
function ride(m, near = null) {
  const retry = m.retries !== (m.data.tried ?? 0);
  if (retry) { m.data.tried = m.retries; const b = m.one('ride'); if (b) m.remove(b); }   // (the player put out beside it first)
  if (inTruck(m)) {
    const b = m.one('ride'); if (b === m.vehicle) return b;
    if (b) m.remove(b);
    return m.adopt(m.vehicle, 'ride');
  }
  let b = m.one('ride');
  if (!b || m.dist(b) > 240) {
    if (b) m.remove(b);
    const P = [m.player.x, m.player.y], back = retry && near && Math.hypot(P[0] - near.x, P[1] - near.y) > 260;
    const q = back ? freeLane(m, [near.x - Math.cos(near.heading) * 240, near.y - Math.sin(near.heading) * 240], near.heading) : freeLane(m, P); b = m.ensure.vehicle('ride', 'hookline', q, { heading: q.heading });
  }
  m.place('player', { in: b });
  return b;
}
const neutral = m => { for (const g of ['saints', 'rats', 'gnomes']) m.truce(g); };   // (a tow truck is everybody's problem and nobody's target)
// ticket k (0-based): the car where it was left, hooked and towed to the impound
const ticketStage = k => ({
  id: 'ticket' + (k + 1),
  setup(m) {
    if (k >= count(m)) return;
    neutral(m);
    const id = ticketFor(m, k), c0 = m.one('car' + k), at = c0 && !c0.wrecked ? { x: c0.x, y: c0.y, heading: c0.heading } : m.lane(spot(m, id));
    ride(m, at);
    if (!m.one('car' + k)) { const q = m.lane(spot(m, id)); m.clearSpot([q.x, q.y], 110); m.ensure.vehicle('car' + k, CARS[k % CARS.length], q, { heading: q.heading }); }   // (abandoned in the traffic lane, square to it: the truck pulls up ahead in that lane and backs straight on)
    m.failIf(mm => !inTruck(mm) && !mm.one('ride'), 'the Hookline\'s a wreck');
    m.failIf(mm => { if (mm.data['in' + k]) return false; const c = mm.one('car' + k); return !c || c.wrecked; }, 'the car\'s a wreck: no fee for scrap');   // (in: impounded, gone from the street)
  },
  *run(m) {
    if (k >= count(m) || m.data['in' + k]) return;
    const t = TICKETS.find(q => q.id === m.data.tickets[k]), n = count(m), I = spot(m, IMPOUND), tag = 'car' + k;   // (the impound's gate: the lane outside the precinct)
    const c = m.one(tag), at = c ? [c.x, c.y] : spot(m, t.id), T = m.timer(clock(m, at) + clock(m, I, c || { x: at[0], y: at[1], heading: 0 }), { label: 'TICKET', reason: 'the owner got there first' });   // (to the car, then the car to the impound)
    m.objective(`Ticket ${k + 1} of ${n}: ${t.name}: hook it and tow it to the impound`, { hint: { kind: 'deliver', what: tag, to: I, tow: 'ride' } });
    m.marker(I, { color: '#ffa03a', r: 28 });
    yield Object.assign(m.waitUntil(mm => { const c = mm.one(tag); return !!c && !!c.towedBy && Math.hypot(c.x - I[0], c.y - I[1]) < IN; }), { nav: mm => { const c = mm.one(tag); return c && !c.towedBy ? c : I; } });
    m.data.spare = Math.min(m.data.spare ?? 1e9, T.left); T.stop();
    m.data['in' + k] = true; m.remove(m.one(tag));   // (the impound takes it, off the hook)
    if (k < n - 1) yield m.say([['Impounded. Another ticket on the screen.', 'Nice hook. There\'s more.', 'That one\'s ours now. Next.'][k % 3]], BOSS);
    else yield m.say(['That\'s the book cleared. Hook & Line pays on the dot.'], BOSS);
  },
});

defActivity('job_tow', {
  title: 'Tow Truck', kind: 'job', levels: 3, start: { vehicle: ['hookline'] },
  brief: ['Hook & Line Towing: cars where they shouldn\'t be, to the impound.', 'More tickets and less time, level by level.'],
  rewardsFor: level => ({ cash: [0, 550, 1100, 1800][level] || 550 }),
  bonus: [{ id: 'spare', text: 'Every tow with 15 s to spare', check: m => (m.data.spare ?? 0) >= 15 }],
  stages: [
    { id: 'shift', setup(m) { neutral(m); ride(m); }, *run(m) { yield m.say([`Hook & Line. ${count(m)} tickets in the book.`, 'Back the hook up to a bumper, then haul it in.'], BOSS); } },
    ...Array.from({ length: MAX }, (_, k) => ticketStage(k)),
  ],
});
