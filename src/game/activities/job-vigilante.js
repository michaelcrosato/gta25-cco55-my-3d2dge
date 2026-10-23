// Vigilante (PLAN.md 9.5): the third of the three jobs. At the wheel of a police car (a cruiser, the Fed Sedan, the
// Rhino), the phone's JOBS put the player on the MPD's band: joyriders in a stolen car are doing laps of a block
// nearby. Stop them: ram the car till it gives up (smoking, held against the police car a moment, boxed in the
// traffic with the police car on its tail, or tailed close a while: it can't shake the law), run it to a wreck, or
// shoot the driver. Each suspect has a clock and a block of its own; level 1 is two of them in tired sedans keeping to
// the rules, level 2 three in quicker cars driven fast, level 3 four of them in the fastest. While the job runs
// Dispatch has the player down as one of theirs (no stars, the stolen police car forgotten), and the gangs keep out of
// it; a stopped suspect is cuffed in the passenger seat, the car towed in as the next call comes, and the police car
// patched up if it's in a bad way. Started out of a police car (a deep link, a retry with it gone), the motor pool
// leaves a cruiser on the nearest lane. Proves: chases, rams, a job by level.
import { defActivity } from '../../motor/index.js';

const MPD = { name: 'Dispatch', color: '#5a8aff' };
const POLICE = ['cruiser', 'fedsedan', 'rhino'];
const MAX = 4;   // (level 3's suspects; level n chases n + 1)
const count = m => Math.min(MAX, 1 + m.level);
// the suspects by level: what they drive (in turn), how they drive (the drive's style: level 1's keep to the rules,
// level 2's and 3's drive fast; in the racing style they were as quick as the police car, and round a one-way block
// the bot only ever chased their tails), and the clock for each (s)
const CARS = [null, ['cortez', 'retiree'], ['brute', 'saint', 'cortez'], ['zephyr', 'brute', 'saint', 'zephyr']];
const STYLE = [null, 'calm', 'fast', 'fast'];
const NAMES = { cortez: 'Cortez', retiree: 'Retiree wagon', brute: 'Brute', saint: 'Saint', zephyr: 'Zephyr GT' };
const CLOCK = [0, 150, 150, 150];
const THUGS = ['rat-grunt', 'saint-grunt', 'gnome-grunt'];
// the joyriders' circuits: a block driven round by right turns, every one-way street the right way (east along an
// eastbound street, down a southbound one, west along a westbound one, up a northbound one); its corners are the
// junctions' middles, in driving order from the north-west. Each one drives round as drawn (the GPS's way from each of
// its points to the next keeps to the block). Single blocks: round two-block circuits (bigger loops, and two of them
// not drivable round as drawn: Gnome Row to Palm Walk and Marquee Street to the Seawall between Lantern Row and Loop
// Avenue, a leg of each going round other blocks 4 and 7 times as far) a level's chases in a row were too many to win
const X = { chapel: 520, palm: 904, marquee: 1672, dock: 2056 };
const Y = { terrace: 104, sunset: 488, lantern: 872, loop: 1256, brick: 1640 };
const block = (x1, x2, y1, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
const CIRCUITS = [block(X.chapel, X.palm, Y.terrace, Y.sunset), block(X.chapel, X.palm, Y.lantern, Y.loop), block(X.chapel, X.palm, Y.loop, Y.brick),
  block(X.marquee, X.dock, Y.terrace, Y.sunset), block(X.marquee, X.dock, Y.lantern, Y.loop), block(X.marquee, X.dock, Y.loop, Y.brick)];
const HELD = 1.4;   // (seconds held stopped against the player's car: the suspect gives up)

const inCop = m => !!m.vehicle && POLICE.includes(m.vehicle.def.id) && m.vehicle.driver === m.player;
// a lane point near p with no vehicle on it but self
function freeLane(m, p, heading = null, self = null) {
  for (const k of [0, 1, -1, 2, -2, 3, -3]) {
    const q = m.lane([p[0] + k * 50, p[1] + k * 30], heading);
    if ((q.z || 0) < 4 && !m.fleet.near(q.x, q.y, 50).some(v => v !== self && !v.wrecked && Math.hypot(v.x - q.x, v.y - q.y) < 46)) return q;
  }
  return m.lane(p, heading);
}
// the police car back on the road between suspects (a ram leaves it nose to tail with the last one, or up on the
// curb): stopped there, put in the nearest free lane running its way (the other way, it once had to turn round over
// the canal, and drove off the far end into the harbour)
function unstick(m, c) {
  if (c.speed > 10) return;
  const q = m.lane([c.x, c.y], c.heading), off = Math.hypot(q.x - c.x, q.y - c.y) > 14, against = m.fleet.near(c.x, c.y, 80).some(v => v !== c && v.body && Math.hypot(v.x - c.x, v.y - c.y) < 56);
  if (!off && !against) return;
  const f = freeLane(m, [c.x, c.y], c.heading, c); m.place(c, f, { heading: f.heading });
}
// the player's police car: the one they drive (the phone's start: on the job's list as 'cruiser', so a hint can name
// it), else the motor pool's cruiser on a lane nearby (one still about and near: back in it), or near `at` (a retry:
// on the beat by the joyriders' block, wherever the last try ended)
function cruiser(m, at = null) {
  if (inCop(m)) {
    const c = m.one('cruiser'); if (c === m.vehicle) return c;
    if (c) m.remove(c);   // (another police car now: that one's the job's)
    return m.adopt(m.vehicle, 'cruiser');
  }
  let c = m.one('cruiser');
  if (!c || m.dist(c) > 250) { if (c) m.remove(c); const q = freeLane(m, at || [m.player.x, m.player.y]); c = m.ensure.vehicle('cruiser', 'cruiser', q, { heading: q.heading }); }
  m.place('player', { in: c });
  return c;
}
// suspect k's circuit (kept for a retry) and where it turns up on it: of the circuits not driven yet tonight,
// one whose middle is a fair drive off (350 to 900 u; else one of the two nearest), at random. Its route is a point a
// third of the way along each side, on the lane running that way (a junction's middle is on no lane: a driver's route
// there ends at the lane's end short of it, and it would wait there for good), the GPS taking the corner between; the
// car turns up at one of them with room on it, its route the next ones on
function joyride(m, k) {
  const P = m.mover, C = m.data.circuits || (m.data.circuits = {}), mid = c => [(c[0][0] + c[2][0]) / 2, (c[0][1] + c[2][1]) / 2], far = c => Math.hypot(mid(c)[0] - P.x, mid(c)[1] - P.y);
  if (!C[k]) {
    const used = Object.values(C), left = CIRCUITS.filter(c => !used.includes(c)), all = left.length ? left : CIRCUITS;
    let pool = all.filter(c => far(c) > 350 && far(c) < 900); if (!pool.length) pool = all.slice().sort((a, b) => far(a) - far(b)).slice(0, 2);
    C[k] = pool[Math.floor(m.rng.next() * pool.length) % pool.length];
  }
  const c = C[k], sides = c.map((a, i) => { const b = c[(i + 1) % 4]; return m.lane([a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3], Math.atan2(b[1] - a[1], b[0] - a[0])); });
  const route = i => [1, 2, 3, 4].map(n => { const q = sides[(i + n) % 4]; return [Math.round(q.x), Math.round(q.y)]; });
  for (let j = 0, s0 = Math.floor(m.rng.next() * 4); j < 4; j++) {   // (a side with room on it, from a random one)
    const i = (s0 + j) % 4, q = sides[i];
    if (!m.fleet.near(q.x, q.y, 60).some(v => Math.hypot(v.x - q.x, v.y - q.y) < 50)) return { at: q, route: route(i) };
  }
  return { at: sides[0], route: route(0) };
}
// the suspects stopped earlier tonight: towed in as the next call comes (a car left in a junction blocks it for good)
function tow(m, k) { for (let j = 0; j < k; j++) for (const v of m.tagged('perp' + (j + 1))) m.remove(v); }
// an op held beside the chase: on the MPD's band, no stars (the heat forgotten however it ends)
const onDuty = m => Object.assign(m.waitUntil(() => false), { start: mm => { mm.wanted.clear(); mm.wanted.cap(0); }, end: mm => mm.wanted.clear() });
// with the MPD out in force the gangs keep their heads down: a gangster's car rammed in the chase rallies nobody and
// costs no respect, and none go for the police car on sight (till the job ends, however it ends)
const neutral = m => { for (const g of ['saints', 'rats', 'gnomes']) m.truce(g); };
// the suspect stopped: the car rammed till it smokes (it won't go on, and it isn't a bomb yet), wrecked or burning,
// its driver dead or out, held stopped against the player's car a while, boxed in (stuck in the traffic STUCK s with
// the police car on its tail: behind it, the same way, within BOXED), or tailed: the police car never more than CLOSE
// off it for TAILED s (it can't shake the law: it gives up). The kill hint names the police car: the bot rams the
// suspect from it, and never leaves it for the job on foot (out of it among the gangs' corners, the player was
// beaten down)
const BOXED = 200, STUCK = 2.5, CLOSE = 130, TAILED = 8;
function stopped(m, tag, text) {
  let held = 0, stuck = 0, close = 0, last = m.stageTime;
  return Object.assign(m.waitUntil(mm => {
    const v = mm.tagged(tag)[0], dt = Math.max(0, mm.stageTime - last); last = mm.stageTime;
    if (!v || v.wrecked || (v.damage && v.damage.smoking)) return true;
    const d = v.driver; if (!d || d.dead || d === mm.player) return true;
    const P = mm.mover, dx = v.x - P.x, dy = v.y - P.y, dist = Math.hypot(dx, dy), cop = inCop(mm);
    held = dist < (v.hl + (P.hl || 8)) + 34 && v.speed < 14 ? held + dt : Math.max(0, held - dt * .5);
    stuck = v.speed < 6 ? stuck + dt : 0;
    close = cop && dist < CLOSE ? close + dt : Math.max(0, close - dt * .5);
    const tail = cop && dist < BOXED && dx * Math.cos(v.heading) + dy * Math.sin(v.heading) > dist * .8 && Math.cos(P.heading - v.heading) > .7;
    return held > HELD || (tail && stuck > STUCK) || close > TAILED;
  }), {
    nav: mm => mm.one(tag),
    start: mm => { mm.objective(text, { hint: { kind: 'kill', targets: tag, vehicle: 'cruiser' } }); const c = mm.one(tag); if (c) mm.marker(c, { color: '#ff5a4a' }); },
  });
}
// a suspect's car on fire beside the police car: back off down the road till it has gone up (or a few seconds)
function backOff(m, car) {
  const P = m.mover, d = Math.hypot(P.x - car.x, P.y - car.y) || 1, q = m.lane([car.x + (P.x - car.x) / d * 220, car.y + (P.y - car.y) / d * 220]), at = [Math.round(q.x), Math.round(q.y)];
  return Object.assign(m.waitUntil(mm => car.wrecked || Math.hypot(mm.mover.x - car.x, mm.mover.y - car.y) > 160, { timeout: 8 }), {
    nav: () => at, start: mm => { mm.objective('Back off: it\'s going to blow', { hint: { kind: 'goto', at, radius: 30 } }); mm.marker(at, { color: '#ffb03a' }); },
  });
}
const perpStage = k => ({
  id: 'perp' + (k + 1),
  setup(m) {
    if (k >= count(m)) return;   // (past the level's suspects: nothing to do)
    const tries = m.data.tries || (m.data.tries = {}); tries[k] = (tries[k] || 0) + 1;
    const B = tries[k] > 1 && m.data.circuits && m.data.circuits[k], beat = B && [B[0][0] + (B[1][0] - B[0][0]) * 2 / 3, B[0][1] + (B[1][1] - B[0][1]) * 2 / 3];   // (a retry: two-thirds along the first side of the suspect's circuit)
    neutral(m); const c = cruiser(m, beat); tow(m, k); unstick(m, c);
    if (c.damage && !c.damage.burning && c.damage.share < (tries[k] > 1 ? .6 : .5)) c.damage.repair();   // (between suspects, in a bad way, or a retry: the motor pool's patched the car up)
    const tag = 'perp' + (k + 1);
    if (!m.one(tag)) {
      const J = joyride(m, k), def = CARS[m.level][k % CARS[m.level].length];
      m.ensure.vehicle(tag, def, J.at, { heading: J.at.heading, driver: THUGS[k % THUGS.length], drive: { route: J.route, loop: true, style: STYLE[m.level] } });
    }
    m.failIf(mm => !mm.one('cruiser') && !inCop(mm), 'the police car\'s a wreck');
  },
  *run(m) {
    if (k >= count(m)) return;
    const tag = 'perp' + (k + 1), v = m.one(tag), n = count(m), name = NAMES[v.def.id] || 'car';
    const T = m.timer(CLOCK[m.level], { label: 'SUSPECT', reason: 'the suspect got away' });
    yield m.first([onDuty(m), m.sequence([
      m.say([`All units: joyriders in a stolen ${name}, doing laps of a block nearby. ${k + 1} of ${n} tonight.`], MPD),
      stopped(m, tag, `Stop the stolen ${name}: ram it, box it in or stay on its tail till it gives up, or shoot the driver`),
    ])]);
    T.stop();
    const car = m.tagged(tag)[0], d = car && car.driver;
    if (car && car.damage && car.damage.burning && !car.wrecked) yield m.first([onDuty(m), backOff(m, car)]);
    if (car && !car.wrecked && d && !d.dead && d !== m.player && car.seats.length > 1) { m.place(d, [car.x, car.y]); m.place(d, { in: car, seat: 1 }); }   // (cuffed: out from the wheel into the passenger seat, the car going nowhere)
    m.data.caught = (m.data.caught || 0) + 1;
    yield m.say([k < n - 1 ? 'Suspect stopped. Nice driving. Stand by.' : 'That\'s the last of them. Good shift, officer.'], MPD);
  },
});

defActivity('job_vigilante', {
  title: 'Vigilante', kind: 'job', levels: 3, start: { vehicle: POLICE },
  brief: ['The MPD is short-handed. Take a police car and stop the joyriders in stolen cars.', 'Ram them till they give up, or shoot the driver. More of them, faster, level by level.'],
  rewardsFor: level => ({ cash: [0, 600, 1200, 2000][level] || 600 }),
  bonus: [{ id: 'clean', text: 'The police car above half its health', check: m => { const v = m.one('cruiser') || m.vehicle; return !!v && !!v.damage && v.damage.share > .5; } }],
  stages: [
    { id: 'call', setup(m) { neutral(m); cruiser(m); }, *run(m) { yield m.first([onDuty(m), m.say(['Dispatch to the new unit: we\'re short tonight.', 'Joyriders in stolen cars out there. Stop them.'], MPD)]); } },
    ...Array.from({ length: MAX }, (_, k) => perpStage(k)),
  ],
});
