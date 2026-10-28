// Crop Duster (EXPANSION.md 5, X4): Ironside's job, and the one flown in a plane. In the Duster on its apron at the
// Airstrip, the phone's JOBS put the player on the Allotment Society's books: dust the beans before the rain comes,
// through the rings hung low over the rows and round the runway, in order, against the clock. Level 1 is one and a half
// times round the field (twelve rings), level 2 twice (sixteen), level 3 three times (24), the clock tighter each level. A
// ring is flown through within its reach across and its height; the field's round keeps south of the Flyover's End,
// east of the Flyover and west of the pylons. Started on foot (a deep link, a retry after the Duster went down), the
// Society lends theirs on the apron, the player at the stick. Proves: the player's plane, flown through points in the
// air, low and round and round.
import { defActivity } from '../../motor/index.js';

const SOC = { name: 'The Allotment Society', color: '#7aff8a' };
const T = 16, C = (x, y, z) => [x * T + 8, y * T + 8, z];
// once round the field: west along the runway, north over Crusher Lane, up the allotments' rows and round east, south
// over Crusher Lane again and round over the runway's east end. Each ring is flown at with nothing tall on in front
// (the Flyover west, the pylons east): the bot's lookout, and a player's, climbs for what stands ahead
const LAP = [C(86, 91, 60), C(76, 91, 60), C(76, 81, 65), C(77, 72, 60), C(84, 66, 60), C(88, 74, 60), C(90, 84, 65), C(97, 89, 70)];   // (none under 60: a street lamp stands 44)
const COUNT = [0, 12, 16, 24], SECS = [0, 30, 38, 52];
const R = 50, H = 30, DUST = 130;   // (a ring flown through: within R across of its middle, within H of its height; DUST: the pace the field is flown at, its turns tight enough for the rings)
const PAD = [1624, 1480];   // (the Duster's apron by the hangar, its nose down the runway)

const inDuster = m => !!m.vehicle && m.vehicle.def.id === 'duster' && m.vehicle.driver === m.player;
// the Duster: the one the player flies ('ride'), else the Society's own on the apron, the player at the stick
function ride(m) {
  if (inDuster(m)) {
    const b = m.one('ride'); if (b === m.vehicle) return b;
    if (b) m.remove(b);
    return m.adopt(m.vehicle, 'ride');
  }
  let b = m.one('ride');
  if (!b || m.dist(b) > 240) { if (b) m.remove(b); m.clearSpot(PAD, 40); b = m.ensure.vehicle('ride', 'duster', PAD, { heading: Math.PI }); }
  m.place('player', { in: b });
  return b;
}
const ringAt = k => LAP[k % LAP.length];
const through = (m, q) => inDuster(m) && Math.hypot(m.vehicle.x - q[0], m.vehicle.y - q[1]) < R && Math.abs((m.vehicle.z || 0) - q[2]) < H;

defActivity('job_crop_duster', {
  title: 'Crop Duster', kind: 'job', levels: 3, district: 'ironside', start: { vehicle: ['duster'] },
  brief: ['The Allotment Society: dust the beans before the rain.', 'Through the rings over the rows, in order. More rings and less time, level by level.'],
  rewardsFor: level => ({ cash: [0, 700, 1400, 2300][level] || 700 }),
  bonus: [{ id: 'spare', text: 'Done with 10 s to spare', check: m => (m.data.left ?? 0) >= 10 }],
  stages: [
    { id: 'brief', setup(m) { ride(m); }, *run(m) { yield m.say([`${COUNT[m.level]} rings over the beans. Low and steady.`, 'Mind the Flyover. And the pylons.'], SOC); } },
    {
      id: 'dust',
      setup(m) { ride(m); m.failIf(mm => !inDuster(mm) && !mm.one('ride'), 'the Duster\'s down'); },
      *run(m) {
        const n = COUNT[m.level], clock = m.timer(SECS[m.level], { label: `RINGS 0/${n}`, reason: 'the rain came first' });
        for (let k = 0; k < n; k++) {
          const q = ringAt(k), p = k ? ringAt(k - 1) : PAD, h = Math.atan2(q[1] - p[1], q[0] - p[0]);
          m.objective(`Ring ${k + 1} of ${n}: fly through it`, { hint: { kind: 'goto', at: q, radius: 30, vehicle: 'ride', speed: DUST } });
          const mk = m.marker(q, { color: '#7aff8a', r: 34, hoop: { h }, ring: false });
          yield m.waitUntil(mm => through(mm, q));
          mk.remove(); clock.label = `RINGS ${k + 1}/${n}`;
        }
        m.data.left = clock.left; clock.stop();
        yield m.say([['', 'The beans thank you.', 'Lovely even coat. The Society is pleased.', 'Best dusting in years. Same time next week?'][m.level]], SOC);
      },
    },
  ],
});
