// Paramedic (PLAN.md 19's backlog, HANDOFF L4): the fourth job. In the Medic (the ambulance parked by Lowtown General),
// the phone's JOBS offer the hospital's calls: someone hurt across town, kneeling at a door; drive there against the
// clock, stop beside them to take them aboard, and bring them in to Lowtown General against the next. Level 1 is two
// patients at an easy pace, level 2 three, quicker, level 3 four, tight. Started on foot (a deep link, a retry after
// the Medic went down), the hospital lends one at the nearest lane. Proves: a passenger picked up and set down, the
// ambulance, a job's clock both ways.
import { defActivity } from '../../motor/index.js';

const BOSS = { name: 'Lowtown General', color: '#ff4a4a' };
// where the calls come from: points of interest with a lane close by (the patient at the door, the stop on that lane)
const CALLS = [
  ['palm-park', 'Palm Park'], ['greasy-spoke', 'the Greasy Spoke'], ['gnomes-hq', 'Gutterball Lanes'], ['threads', 'Threads'],
  ['kwik-lux-palm', 'the Kwik-Lux on Lantern Lane'], ['hotel-marquee', 'the Hotel Marquee'], ['pixel-palace', 'the Pixel Palace'],
  ['bank-door', 'the First Lowtown Bank'], ['kwik-lux-neon', 'the Neon Mile Kwik-Lux'], ['container-ramp', 'the container yard'],
  ['spray-pray', 'Spray & Pray'], ['car-wash', 'the Palm Car Wash'], ['kwik-lux-harbor', 'the Harbor Kwik-Lux'], ['lead-farm', 'Lead Farm'],
].map(([id, name]) => ({ id, name }));
const MAX = 4;   // (level 3's patients; level n takes n + 1)
const count = m => Math.min(MAX, 1 + m.level);
const SLACK = [0, 3.2, 2.9, 2.7], GRACE = [0, 34, 31, 29];   // (as the courier's clocks: the road's time stretched, and a grace; an ambulance driven with a patient aboard is careful, at 2.4 and 26 s level 3's patients couldn't wait two calls a run, the campaign's three tries running)
const clock = (m, at) => Math.round(GRACE[m.level] + (m.eta(at) ?? m.dist(at) * 1.4 / 150) * SLACK[m.level]);
const R = 40;   // (how near the stop the Medic must come to)
const ETA = [6, 14];   // (a call's ride from where the Medic stands, at the streets' limits)

const inMedic = m => !!m.vehicle && m.vehicle.def.id === 'medic' && m.vehicle.driver === m.player;
const spot = (m, id) => { const q = m.lane(id); return [Math.round(q.x), Math.round(q.y)]; };
const HOSPITAL = 'hospital';
// call k, picked as its stage comes (kept for a retry): a fair ride from the hospital, not used yet
function callFor(m, k) {
  const D = m.data.calls || (m.data.calls = []); if (D[k]) return D[k];
  const used = new Set(D.filter(Boolean)), left = CALLS.filter(c => !used.has(c.id)).map(c => ({ c, t: m.eta(spot(m, c.id)) ?? 1e9 }));
  let pool = left.filter(q => q.t >= ETA[0] && q.t <= ETA[1]);
  if (!pool.length) pool = left.filter(q => q.t >= ETA[0]).sort((a, b) => a.t - b.t).slice(0, 3);
  if (!pool.length) pool = left;
  return (D[k] = pool[Math.floor(m.rng.next() * pool.length) % pool.length].c.id);
}
// a ground lane's point near p with no vehicle on it (the Medic lent on foot goes there)
function freeLane(m, p) {
  for (const k of [0, 1, -1, 2, -2, 3]) {
    const q = m.lane([p[0] + k * 40, p[1] + k * 24]);
    if ((q.z || 0) < 4 && !m.fleet.near(q.x, q.y, 40).some(v => !v.wrecked && Math.hypot(v.x - q.x, v.y - q.y) < 40)) return q;
  }
  return m.lane(p);
}
// the Medic: the one the player drives (the phone's start: on the job's list as 'ride', so a hint can name it), else the
// hospital's own on the nearest lane (one still about and near: back in it), the player at the wheel; on a retry with
// none left to drive, a fresh one from Lowtown General's bay (the last one off a quay into the harbour, one lent where
// it went in had driven on into the water after it)
function ride(m) {
  const retry = m.retries !== (m.data.tried ?? 0); if (retry) m.data.tried = m.retries;
  if (inMedic(m)) {
    const b = m.one('ride'); if (b === m.vehicle) return b;
    if (b) m.remove(b);
    return m.adopt(m.vehicle, 'ride');
  }
  let b = m.one('ride');
  if (!b || m.dist(b) > 240) { if (b) m.remove(b); const q = freeLane(m, retry ? spot(m, HOSPITAL) : [m.player.x, m.player.y]); b = m.ensure.vehicle('ride', 'medic', q, { heading: q.heading }); }
  m.place('player', { in: b });
  return b;
}
const neutral = m => { for (const g of ['saints', 'rats', 'gnomes']) m.truce(g); };   // (nobody shoots at an ambulance on a call)
// drive the Medic up to `at` and stop there (within R, slower than 25)
function stopAt(m, at, text, color) {
  return Object.assign(m.waitUntil(mm => inMedic(mm) && Math.hypot(mm.mover.x - at[0], mm.mover.y - at[1]) < R && mm.mover.speed < 25), {
    nav: () => at,
    start: mm => { mm.objective(text, { hint: { kind: 'goto', at, radius: R, vehicle: 'ride' } }); mm.marker(at, { color, r: 26 }); },
  });
}
// patient k (0-based): to them, aboard, to the hospital
const callStage = k => ({
  id: 'call' + (k + 1),
  setup(m) {
    if (k >= count(m)) return;
    neutral(m); ride(m);
    const id = callFor(m, k), door = m.at(id);
    if (!m.one('patient' + k) && !m.data['in' + k]) { const p = m.spawn.ped(['tourist', 'jogger', 'retiree', 'office'][k % 4], door, { tag: 'patient' + k, role: 'idle' }); p.posing = 'kneel'; p.aimable = false; }
    m.failIf(mm => !inMedic(mm) && !mm.one('ride'), 'the Medic\'s a wreck');
    m.failIf(mm => { const p = mm.one('patient' + k); return !!p && p.dead; }, 'the patient didn\'t make it');
  },
  *run(m) {
    if (k >= count(m)) return;
    const c = CALLS.find(q => q.id === m.data.calls[k]), at = spot(m, c.id), n = count(m), H = spot(m, HOSPITAL);
    if (!m.data['in' + k]) {
      const T = m.timer(clock(m, at), { label: 'CALL', reason: 'the patient couldn\'t wait' });
      yield stopAt(m, at, `Patient ${k + 1} of ${n}: ${c.name}`, '#ff4a4a');
      m.data.spare = Math.min(m.data.spare ?? 1e9, T.left); T.stop();
      const p = m.one('patient' + k); if (p) { p.posing = null; m.place(p, { in: m.one('ride'), seat: 1 }); }
      m.data['in' + k] = true;
      yield m.say([['Easy now, you\'re in good hands.', 'Hold on, we\'re going.', 'Stay with me. Hospital\'s close.', 'In you get. Mind the bump.'][k % 4]], BOSS);
    }
    const T2 = m.timer(clock(m, H), { label: 'HOSPITAL', reason: 'the patient couldn\'t wait' });
    yield stopAt(m, H, 'To Lowtown General', '#ffffff');
    m.data.spare = Math.min(m.data.spare ?? 1e9, T2.left); T2.stop();
    const p = m.one('patient' + k); if (p) m.remove(p);
    if (k < n - 1) yield m.say([['Patient\'s in. There\'s another call.', 'Good drive. Next one\'s on the screen.', 'Admitted. Back out there.'][k % 3]], BOSS);
    else yield m.say(['That\'s the shift. Lowtown General owes you one.'], BOSS);
  },
});

defActivity('job_paramedic', {
  title: 'Paramedic', kind: 'job', levels: 3, start: { vehicle: ['medic'] },
  brief: ['Lowtown General: the hurt to the hospital, against the clock.', 'More patients and less time, level by level.'],
  rewardsFor: level => ({ cash: [0, 500, 1000, 1700][level] || 500 }),
  bonus: [{ id: 'spare', text: 'Every leg with 10 s to spare', check: m => (m.data.spare ?? 0) >= 10 }],
  stages: [
    { id: 'shift', setup(m) { neutral(m); ride(m); }, *run(m) { yield m.say([`Lowtown General. ${count(m)} calls coming in.`, 'Each one has a clock. So does the ride back.'], BOSS); } },
    ...Array.from({ length: MAX }, (_, k) => callStage(k)),
  ],
});
