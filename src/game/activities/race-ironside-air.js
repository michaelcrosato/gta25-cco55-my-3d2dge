// The Ironside Air Race (EXPANSION.md 5, X4): Ironside's race, flown. Taxi the Duster to the line on the runway west
// of the hangar, and at the green take off and fly once round the works through twelve gates hung over them, in order:
// west over the Flyover's south ramp and Crusher Lane, north up the Foundry past the Union Hall, east over the rail
// yard and the slag tip, round the Power Station's stacks, south over Loop Avenue and Crusher Lane, and down the
// runway to the line. The Airstrip has no other pilot mad enough to race it, so it's flown against the board: the
// club's three best times. Beat the third for a podium; the purse pays by the place, a win the most. A gate is flown
// through within its reach across and its height. Proves: the plane in a race (a takeoff from a standing start, gates
// in the air), the board's times as the racers.
import { defActivity } from '../../motor/index.js';

const MC = { name: 'The Tower', color: '#7af0ff' };
const T = 16, C = (x, y, z) => [x * T + 8, y * T + 8, z];
// the gates, once round: each flown at from the last with nothing taller in between than it clears
const GATES = [C(82, 90, 90), C(60, 88, 120), C(40, 88, 130), C(18, 78, 140), C(18, 52, 140), C(30, 26, 150),
  C(52, 18, 140), C(80, 18, 120), C(104, 30, 180), C(106, 56, 130), C(100, 80, 100), C(90, 90, 70)];
const R = 60, H = 36;   // (a gate flown through: within R across of its middle, within H of its height)
const LINE = [1480, 1448];   // (the start line on the runway, nose west)
// the board: the club's best three, and the purse by the place
const BOARD = [{ name: 'Ace Malone', secs: 21 }, { name: 'Dusty Rhodes', secs: 24 }, { name: 'Old Biggles', secs: 28 }];
const PURSE = [0, 2400, 1500, 900];

const inDuster = m => !!m.vehicle && m.vehicle.def.id === 'duster' && m.vehicle.driver === m.player;
// the Duster: the one the player flies ('ride'), else the club's own on the line, the player at the stick
function ride(m) {
  if (inDuster(m)) {
    const b = m.one('ride'); if (b === m.vehicle) return b;
    if (b) m.remove(b);
    return m.adopt(m.vehicle, 'ride');
  }
  let b = m.one('ride');
  if (!b || m.dist(b) > 240) { if (b) m.remove(b); m.clearSpot(LINE, 40); b = m.ensure.vehicle('ride', 'duster', LINE, { heading: Math.PI }); }
  m.place('player', { in: b });
  return b;
}
const through = (m, q) => inDuster(m) && Math.hypot(m.vehicle.x - q[0], m.vehicle.y - q[1]) < R && Math.abs((m.vehicle.z || 0) - q[2]) < H;
// an op held beside the race: the precinct looks the other way while it runs (the Tower cleared it with them)
const blindEye = m => Object.assign(m.waitUntil(() => false), { start: mm => { mm.wanted.clear(); mm.wanted.cap(0); }, end: mm => mm.wanted.clear() });

defActivity('race_ironside_air', {
  title: 'Ironside Air Race', kind: 'race', district: 'ironside', start: { at: LINE, vehicle: ['duster'], radius: 48 },
  brief: ['Once round the works in the Duster, through twelve gates, against the club\'s best three.', 'Beat the third for a podium. The purse pays by the place: a win pays the most.'],
  rewardsFor: (level, m) => ({ cash: PURSE[(m && m.data.place) || 1] || PURSE[3] }),
  bonus: [{ id: 'win', text: 'Fastest on the board', check: m => m.data.place === 1 }],
  stages: [{
    id: 'race',
    setup(m) {
      const b = ride(m);
      if (Math.hypot(b.x - LINE[0], b.y - LINE[1]) > 60 || !b.body.landed) m.place(b, LINE, { heading: Math.PI });   // (a retry, a deep link: on the line, nose west)
      m.failIf(mm => !inDuster(mm) && !mm.one('ride'), 'the Duster\'s down');
    },
    *run(m) {
      // the countdown (held on the line: a roll before the green is a false start), then away
      const P0 = [m.mover.x, m.mover.y];
      m.data.go = false;
      m.failIf(mm => !mm.data.go && Math.hypot(mm.mover.x - P0[0], mm.mover.y - P0[1]) > 40, 'a false start');
      yield m.say(['Twelve gates, once round. Mind the stacks on the power station.', '3...', '2...', '1...'], { ...MC, per: 1.2 });
      m.data.go = true;
      const t0 = m.elapsed, clock = m.timer(120, { label: `GATE 0/${GATES.length}`, reason: 'the Tower closed the course' });
      const course = m.sequence(GATES.map((q, k) => {
        const p = k ? GATES[k - 1] : [LINE[0], LINE[1]], h = Math.atan2(q[1] - p[1], q[0] - p[0]);
        return Object.assign(m.waitUntil(mm => { if (!through(mm, q)) return false; clock.label = `GATE ${k + 1}/${GATES.length}`; return true; }), {
          start: mm => { mm.objective(`Gate ${k + 1} of ${GATES.length}: fly through it`, { hint: { kind: 'goto', at: q, radius: 30, vehicle: 'ride', speed: 230 } }); mm.marker(q, { color: '#7af0ff', r: 44, hoop: { h }, ring: false }); },
          nav: () => q,
        });
      }));
      yield m.first([blindEye(m), m.parallel([m.say(['GO!'], MC), course])]);
      clock.stop();
      const secs = m.elapsed - t0; m.data.secs = Math.round(secs * 10) / 10;
      m.data.place = 1 + BOARD.filter(b => b.secs < secs).length;
      m.failIf(mm => mm.data.place > 3, 'off the podium');
      yield m.wait(.2);
      const time = `${m.data.secs.toFixed(1)} s.`;
      yield m.say([['', `${time} Fastest on the board! Ace Malone's buying the drinks.`, `${time} Second, behind Ace.`, `${time} Third on the board, just ahead of Old Biggles.`, `${time} Not on the board this time.`][Math.min(4, m.data.place)]], MC);
    },
  }],
});
