// Vigilante (PLAN.md 9.5): the third job. At the wheel of a police car (a cruiser, the Fed Sedan, the Rhino), the
// phone's JOBS put the player on the MPD's band: a stolen car is running on the streets nearby. Stop it: ram it till
// it gives up (held stopped against the cruiser), run it to a wreck, or shoot its driver. Each suspect has a clock;
// level 1 is two of them in tired sedans, level 2 three in quicker cars, level 3 four in the fastest, the last two
// with a gun out of the window. While the job runs Dispatch has the player down as one of theirs (no stars); a stopped
// suspect is cuffed in the passenger seat. Started out of a police car (a deep link, a retry with it gone), the motor
// pool leaves a cruiser on the nearest lane. Proves: chases, rams, a job by level.
import { defActivity } from '../../motor/index.js';

const MPD = { name: 'Dispatch', color: '#5a8aff' };
const POLICE = ['cruiser', 'fedsedan', 'rhino'];
const MAX = 4;   // (level 3's suspects; level n chases n + 1)
const count = m => Math.min(MAX, 1 + m.level);
// the suspects by level: what they drive (in turn), how fast (the drive's style), the clock for each (s), and whether
// they shoot back (a passenger with a pistol: levels 3's last two)
const CARS = [null, ['cortez', 'retiree'], ['brute', 'saint', 'cortez'], ['zephyr', 'brute', 'saint', 'zephyr']];
const NAMES = { cortez: 'Cortez', retiree: 'Retiree wagon', brute: 'Brute', saint: 'Saint', zephyr: 'Zephyr GT' };
const CLOCK = [0, 150, 130, 115];
const THUGS = ['rat-grunt', 'saint-grunt', 'gnome-grunt'];
// where a suspect runs: a loop through a few of these, picked at random (each a point of interest on a street)
const RUNS = ['palm-park', 'greasy-spoke', 'gnomes-hq', 'threads', 'kwik-lux-palm', 'hotel-marquee', 'lead-farm', 'pixel-palace', 'bank-door', 'kwik-lux-neon', 'container-ramp', 'car-wash', 'kwik-lux-harbor', 'fish-market', 'precinct', 'safehouse'];
const HELD = 1.4;   // (seconds held stopped against the player's car: the suspect gives up)

const inCop = m => !!m.vehicle && POLICE.includes(m.vehicle.def.id) && m.vehicle.driver === m.player;
// a lane point near p with no vehicle on it
function freeLane(m, p, heading = null) {
  for (const k of [0, 1, -1, 2, -2, 3, -3]) {
    const q = m.lane([p[0] + k * 50, p[1] + k * 30], heading);
    if ((q.z || 0) < 4 && !m.fleet.near(q.x, q.y, 50).some(v => !v.wrecked && Math.hypot(v.x - q.x, v.y - q.y) < 46)) return q;
  }
  return m.lane(p, heading);
}
// the player's police car: the one they drive (the phone's start), else the motor pool's cruiser on a lane nearby
// (one still about and near: back in it)
function cruiser(m) {
  if (inCop(m)) return m.vehicle;
  let c = m.one('cruiser');
  if (!c || m.dist(c) > 250) { if (c) m.remove(c); const q = freeLane(m, [m.player.x, m.player.y]); c = m.ensure.vehicle('cruiser', 'cruiser', q, { heading: q.heading }); }
  m.place('player', { in: c });
  return c;
}
// where the suspect turns up: a free ground lane 380 to 650 u off (tried round the compass from a random bearing),
// and the loop it runs: four points of interest, the nearest of them first
function hideout(m) {
  const P = m.mover, a0 = m.rng.next() * Math.PI * 2;
  for (const r of [480, 380, 650]) for (let k = 0; k < 12; k++) {
    const a = a0 + k * Math.PI / 6, p = [P.x + Math.cos(a) * r, P.y + Math.sin(a) * r];
    if (p[0] < 120 || p[0] > 2440 || p[1] < 120 || p[1] > 1940) continue;   // (north of the canal, off the embankments)
    const q = m.lane(p); if ((q.z || 0) > 4 || Math.hypot(q.x - P.x, q.y - P.y) < 300) continue;
    if (m.fleet.near(q.x, q.y, 60).some(v => Math.hypot(v.x - q.x, v.y - q.y) < 50)) continue;
    return q;
  }
  return freeLane(m, [P.x + 450, P.y]);
}
function loopFrom(m, q) {
  const pool = RUNS.slice(), out = [];
  while (out.length < 4 && pool.length) { const i = Math.floor(m.rng.next() * pool.length) % pool.length; const id = pool.splice(i, 1)[0], p = m.at(id); if (Math.hypot(p[0] - q.x, p[1] - q.y) > 350) out.push(id); }
  return out;
}
// an op that holds, beside another, the precinct's blind eye: no stars while the job runs (lifted however it ends)
const onDuty = m => Object.assign(m.waitUntil(() => false), { start: mm => mm.wanted.cap(0), end: mm => mm.wanted.clear() });
// the suspect stopped: wrecked or burning, its driver dead or out, or held stopped against the player's car a while
function stopped(m, tag) {
  let held = 0, last = m.stageTime;
  return m.waitUntil(mm => {
    const v = mm.tagged(tag)[0], dt = Math.max(0, mm.stageTime - last); last = mm.stageTime;
    if (!v || v.wrecked || (v.damage && v.damage.burning)) return true;
    const d = v.driver; if (!d || d.dead || d === mm.player) return true;
    const P = mm.mover, near = Math.hypot(P.x - v.x, P.y - v.y) < (v.hl + (P.hl || 8)) + 34;
    held = near && v.speed < 14 ? held + dt : Math.max(0, held - dt * .5);
    return held > HELD;
  });
}
const perpStage = k => ({
  id: 'perp' + (k + 1),
  setup(m) {
    if (k >= count(m)) return;
    cruiser(m);
    const tag = 'perp' + (k + 1);
    if (!m.one(tag)) {
      const q = hideout(m), def = CARS[m.level][k % CARS[m.level].length];
      m.ensure.vehicle(tag, def, q, { heading: q.heading, driver: THUGS[k % THUGS.length], drive: { route: loopFrom(m, q), loop: true, style: m.level === 1 ? 'fast' : 'race' } });
    }
    m.failIf(mm => !mm.one('cruiser') && !inCop(mm), 'the cruiser\'s a wreck');
  },
  *run(m) {
    if (k >= count(m)) return;
    const tag = 'perp' + (k + 1), v = m.one(tag), n = count(m), name = NAMES[v.def.id] || 'car';
    yield m.say([`All units: a stolen ${name} running nearby. ${k + 1} of ${n} tonight.`], MPD);
    const T = m.timer(CLOCK[m.level], { label: 'SUSPECT', reason: 'the suspect got away' });
    yield m.first([onDuty(m), Object.assign(stopped(m, tag), { nav: mm => mm.one(tag),
      start: mm => { mm.objective(`Stop the stolen ${name}: ram it till it gives up, or shoot the driver`, { hint: { kind: 'kill', targets: tag } }); const c = mm.one(tag); if (c) mm.marker(c, { color: '#ff5a4a' }); } })]);
    T.stop();
    const car = m.tagged(tag)[0], d = car && car.driver;
    if (car && !car.wrecked && d && !d.dead && d !== m.player) m.place(d, { in: car, seat: Math.min(car.seats.length - 1, 1) });   // (cuffed: in the passenger seat, the car going nowhere)
    m.data.caught = (m.data.caught || 0) + 1;
    yield m.say([k < n - 1 ? 'Suspect stopped. Nice driving. Stand by.' : 'That\'s the last of them. Good shift, officer.'], MPD);
  },
});

defActivity('job_vigilante', {
  title: 'Vigilante', kind: 'job', levels: 3, start: { vehicle: POLICE },
  brief: ['The MPD is short-handed. Take a cruiser and stop the stolen cars.', 'Ram them till they give up, or shoot the driver. More of them, faster, level by level.'],
  rewardsFor: level => ({ cash: [0, 600, 1200, 2000][level] || 600 }),
  bonus: [{ id: 'clean', text: 'The cruiser above half its health', check: m => { const v = m.vehicle; return !!v && !!v.damage && v.damage.share > .5; } }],
  stages: [
    { id: 'call', setup(m) { cruiser(m); }, *run(m) { yield m.say(['Dispatch to the new unit: we\'re short tonight.', 'Stolen cars on the move. Stop them.'], MPD); } },
    ...Array.from({ length: MAX }, (_, k) => perpStage(k)),
  ],
});
