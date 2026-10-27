// Limo (EXPANSION.md 5, X7): Glass Heights' job. In a limousine (the Grand Palms' white one for hire, or the Syndicate's
// black), the phone's JOBS put the player on Heights Limousines' book: a fare waiting at a hotel's or a landmark's curb,
// driven to the door they name, smoothly. A fare minds the bumps: every knock the car takes costs their patience, and a
// fare out of it gets out where the car stands. Each drop runs against its own clock (the road's time to it, m.eta,
// stretched by the level); the fare tips by how smooth the ride was. Level 1 is two fares, level 2 three, level 3 four,
// the clock and the fares' patience tighter each level. Started on foot (a deep link, a retry after the car was
// wrecked), Heights Limousines lends theirs at the Grand Palms' curb. Proves: a fare job (picked up, carried, set down),
// a ride judged by its smoothness.
import { defActivity } from '../../motor/index.js';

const BOSS = { name: 'Heights Limousines', color: '#e8e4dc' };
// the doors: points of interest on the Heights' streets (the marker on the lane outside)
const DOORS = [
  ['grand-palms', 'the Grand Palms'], ['hotel-riviera', 'the Hotel Riviera'], ['velvet-casino', 'the Velvet Casino'], ['glass-tower', 'the Glass Tower'],
  ['st-chrome', 'St. Chrome\'s'], ['observatory', 'the Observatory'], ['yacht-club', 'the Yacht Club'], ['hospital', 'Heights General'],
  ['safehouse', 'the Bellevue'], ['marina', 'the Marina'], ['precinct', 'Heights PD'], ['villa-marisol', 'Villa Marisol'],
].map(([id, name]) => ({ id, name }));
const FARES = [0, 2, 3, 4], KNOCK = [0, 260, 330, 400];   // (KNOCK: the patience a whole car's worth of damage costs)
const SLACK = [0, 4.4, 4.1, 3.8], GRACE = [0, 48, 44, 40];   // (looser than the tow's: a limo driven gently is slow, stopping at the reds, a van's turning circle round the Heights' one-way blocks. At 3.0 and 32 s, level 3, the bot had been late with a fare a light short of the door)
const ARCH = ['office', 'tourist', 'retiree', 'nightowl', 'clubber'];
const R = 40, CURB = [104, 76];   // (how near the door a fare is met or set down; the Grand Palms' curb, the loaner's)

const inLimo = m => !!m.vehicle && ['limo', 'velvetlimo'].includes(m.vehicle.def.id) && m.vehicle.driver === m.player;
const spot = (m, id) => { const q = m.lane(id); return [Math.round(q.x), Math.round(q.y)]; };
// the limo: the one the player drives ('ride'), else Heights Limousines' white one at the Grand Palms' curb (one
// burning, a wreck or half gone: replaced, a retry's fares never in it)
const fit = v => !!v && !v.wrecked && !(v.damage && v.damage.burning) && (!v.damage || v.damage.share > .5);
function ride(m) {
  if (inLimo(m) && fit(m.vehicle)) { const b = m.one('ride'); if (b === m.vehicle) return b; if (b) m.remove(b); return m.adopt(m.vehicle, 'ride'); }
  if (inLimo(m)) m.remove(m.vehicle);
  let b = m.one('ride');
  if (!b || !fit(b) || m.dist(b) > 240) { if (b) m.remove(b); const q = m.lane([CURB[0] * 16, CURB[1] * 16]); m.clearSpot([q.x, q.y], 40); b = m.ensure.vehicle('ride', 'limo', q, { heading: q.heading }); }
  m.place('player', { in: b });
  return b;
}
// fare k's door to be met at and the one they name (kept for a retry): each a fair drive by the road from the last
// (m.eta: ETA[0] to ETA[1] s at the streets' limits), never the same door twice running
const ETA = [6, 16];
function legs(m) {
  if (m.data.legs) return m.data.legs;
  const out = []; let at = [m.mover.x, m.mover.y], last = null;
  const pick = (from, not) => {
    const left = DOORS.filter(d => !not.includes(d.id)).map(d => ({ d, t: m.eta(spot(m, d.id), from) ?? 1e9 }));
    let pool = left.filter(q => q.t >= ETA[0] && q.t <= ETA[1]); if (!pool.length) pool = left.filter(q => q.t < 1e9).sort((a, b) => a.t - b.t).slice(0, 4); if (!pool.length) pool = left;
    return pool[Math.floor(m.rng.next() * pool.length) % pool.length].d;
  };
  for (let k = 0; k < FARES[3]; k++) {
    const meet = pick(at, last ? [last] : []), to = pick(spot(m, meet.id), [meet.id]);
    out.push({ meet: meet.id, meetName: meet.name, to: to.id, toName: to.name }); at = spot(m, to.id); last = to.id;
  }
  return (m.data.legs = out);
}
const clock = (m, to, from) => Math.round(GRACE[m.level] + (m.eta(to, from) ?? Math.hypot(to[0] - from[0], to[1] - from[1]) * 1.4 / 150) * SLACK[m.level]);
const neutral = m => { for (const g of ['saints', 'velvet', 'yacht']) m.truce(g); };   // (a hire car is nobody's business)

// fare k: met at its door (it gets in once the limo stands there), driven to the door it names
const fareStage = k => ({
  id: 'fare' + (k + 1),
  setup(m) {
    if (k >= FARES[m.level]) return;
    neutral(m); ride(m); legs(m);
    for (const a of m.tagged('fare')) m.remove(a);
    const L = m.data.legs[k];
    m.spawn.ped(ARCH[k % ARCH.length], m.at(L.meet), { tag: 'fare', role: 'idle' });   // (on the sidewalk at the door)
    m.data.comfort = 100;
  },
  *run(m) {
    if (k >= FARES[m.level]) return;
    const L = m.data.legs[k], meet = spot(m, L.meet), to = spot(m, L.to);
    m.failIf(mm => !mm.one('ride'), 'the limo\'s a wreck');
    yield m.deliver({ what: 'ride', to: meet, radius: R, stopped: true, health: .05, style: 'smooth', text: `Fare ${k + 1} of ${FARES[m.level]}: pick up at ${L.meetName}` });
    const f = m.one('fare'), v = m.one('ride'); if (f && v) m.place(f, { in: v, seat: 2 });   // (in the back)
    yield m.say([['To ' + L.toName + ', please. And gently.', 'Take me to ' + L.toName + '. No rush. No bumps.', L.toName + '. I have a weak stomach, driver.', L.toName + ', and step on it. Smoothly.'][k % 4]], { name: 'Your fare', color: '#c8c8d0' });
    // the ride: its clock, and the fare's patience, which every knock to the car wears down
    const T = m.timer(clock(m, to, meet), { label: 'FARE', reason: 'the fare was late and got out' });
    let share = v ? v.damage.share : 1;
    const comfort = m.waitUntil(mm => {
      const c = mm.one('ride'); if (!c) return false;
      const d = share - c.damage.share; if (d > 0) { mm.data.comfort -= d * KNOCK[mm.level]; share = c.damage.share; }
      T.label = `FARE  ${Math.max(0, Math.round(mm.data.comfort))}%`;
      return false;
    });
    m.failIf(mm => mm.data.comfort <= 0, 'the fare had enough of the bumps');
    yield m.first([comfort, m.deliver({ what: 'ride', to, radius: R, stopped: true, health: .05, style: 'smooth', text: `Drive your fare to ${L.toName}, smoothly` })]);
    m.data.left = (m.data.left || 0) + T.left; T.stop();
    const g = m.one('fare'); if (g) m.place(g, m.at(L.to));   // (out at the door)
    m.data.smooth = Math.min(m.data.smooth ?? 100, m.data.comfort);
    m.data.tips = (m.data.tips || 0) + Math.round(Math.max(0, m.data.comfort) * 2);
    yield m.say([m.data.comfort > 85 ? 'Like floating. Here, for you.' : m.data.comfort > 50 ? 'Fine. Just fine.' : 'I\'ll walk next time.'], { name: 'Your fare', color: '#c8c8d0' });
  },
});

defActivity('job_limo', {
  title: 'Limo', kind: 'job', levels: 3, district: 'glass-heights', start: { vehicle: ['limo', 'velvetlimo'] },
  brief: ['Heights Limousines: fares to the doors they name, smoothly.', 'A fare minds the bumps. More fares, less time and less patience, level by level.'],
  rewardsFor: (level, m) => ({ cash: ([0, 800, 1500, 2400][level] || 800) + ((m && m.data.tips) || 0) }),
  bonus: [{ id: 'smooth', text: 'Every ride above 80%', check: m => (m.data.smooth ?? 0) > 80 }],
  stages: [
    { id: 'brief', setup(m) { neutral(m); ride(m); }, *run(m) { yield m.say([`${FARES[m.level]} fares tonight. Doors to doors.`, 'They pay for smooth. Mind the kerbs.'], BOSS); } },
    ...[0, 1, 2, 3].map(fareStage),
  ],
});
