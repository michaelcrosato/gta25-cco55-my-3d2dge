// The Heights Regatta (EXPANSION.md 5, X7): Glass Heights' race, on the water. Any boat to the line in the bay below the
// Causeway, and at the green round the Heights by sea through ten buoys in order: south out of the bay, east along the
// south shore past the marina's piers and the Club's, round the south-east point and up the east shore to the line off
// the Strip. The Yacht Club keeps the board: its three best times. Beat the third for a podium; the purse pays by the
// place, a win the most. A buoy is passed within its reach. Proves: boats in a race (a standing start, a course over
// the water round the piers and the point), the board's times as the racers.
import { defActivity } from '../../motor/index.js';

const MC = { name: 'The Commodore', color: '#7ab0ff' };
const T = 16, C = (x, y) => [x * T + 8, y * T + 8];
// the buoys, once round: out of the bay, along the south shore clear of the piers' ends, round the point, up the east
const BUOYS = [C(4, 104), C(24, 109), C(50, 109), C(76, 109), C(96, 110), C(116, 110), C(124, 103), C(124, 88), C(124, 73), C(124, 58)];
const R = 56;   // (a buoy passed: within R of it)
const LINE = { x: 4 * T + 8, y: 90 * T, heading: Math.PI / 2 };   // (the start line in the bay below the Causeway, bow south)
const BOARD = [{ name: 'The Commodore', secs: 28 }, { name: 'Bunny Fairweather', secs: 32 }, { name: 'Old Ironsides', secs: 38 }];
const PURSE = [0, 2600, 1600, 1000];

const inBoat = m => !!m.vehicle && m.vehicle.cls === 'boat' && m.vehicle.driver === m.player;
// the boat: the one the player sails ('ride'), else the Club's Splash on the line, the player at the helm
function ride(m) {
  if (inBoat(m)) { const b = m.one('ride'); if (b === m.vehicle) return b; if (b) m.remove(b); return m.adopt(m.vehicle, 'ride'); }
  let b = m.one('ride');
  if (!b || m.dist(b) > 300) { if (b) m.remove(b); b = m.ensure.vehicle('ride', 'splash', [LINE.x, LINE.y], { heading: LINE.heading, color: '#7ab0ff' }); }
  m.place('player', { in: b });
  return b;
}
const past = (m, q) => inBoat(m) && Math.hypot(m.vehicle.x - q[0], m.vehicle.y - q[1]) < R;
const blindEye = m => Object.assign(m.waitUntil(() => false), { start: mm => { mm.wanted.clear(); mm.wanted.cap(0); }, end: mm => mm.wanted.clear() });

defActivity('race_heights_regatta', {
  title: 'Heights Regatta', kind: 'race', district: 'glass-heights', start: { at: [LINE.x, LINE.y], vehicle: ['boat'], radius: 64 },
  brief: ['Round the Heights by sea, through ten buoys, against the Yacht Club\'s best three.', 'Beat the third for a podium. The purse pays by the place: a win pays the most.'],
  rewardsFor: (level, m) => ({ cash: PURSE[(m && m.data.place) || 1] || PURSE[3] }),
  bonus: [{ id: 'win', text: 'Fastest on the board', check: m => m.data.place === 1 }],
  stages: [{
    id: 'race',
    setup(m) {
      const b = ride(m);
      // (the Club clears its course of what was left standing on it, along each leg: the Gulls The Gull and House Edge
      // set down in the bay, across the south shore's line, had stranded a Splash swung round them in the shallows)
      for (let k = 0, a = [LINE.x, LINE.y]; k < BUOYS.length; a = BUOYS[k++]) {
        const q = BUOYS[k], n = Math.ceil(Math.hypot(q[0] - a[0], q[1] - a[1]) / 30);   // (on the line itself: the moorings 24 off it and more are the Club's and the marina's own)
        for (let i = 0; i <= n; i++) m.clearSpot([a[0] + (q[0] - a[0]) * i / n, a[1] + (q[1] - a[1]) * i / n], 16);
      }
      const turned = Math.abs(Math.atan2(Math.sin(b.heading - LINE.heading), Math.cos(b.heading - LINE.heading))) > .5;
      if (Math.hypot(b.x - LINE.x, b.y - LINE.y) > 80 || turned) m.place(b, [LINE.x, LINE.y], { heading: LINE.heading });   // (a retry, a deep link, a boat come to the line bow north: on the line, bow south; one turned round at the green had lost the podium in the turn)
      m.failIf(mm => !inBoat(mm) && !mm.one('ride'), 'the boat\'s gone');
    },
    *run(m) {
      const P0 = [m.mover.x, m.mover.y];
      m.data.go = false;
      m.failIf(mm => !mm.data.go && Math.hypot(mm.mover.x - P0[0], mm.mover.y - P0[1]) > 48, 'a false start');
      yield m.say(['Ten buoys, once round the Heights. Mind the piers.', '3...', '2...', '1...'], { ...MC, per: 1.2 });
      m.data.go = true;
      const t0 = m.elapsed, clock = m.timer(150, { label: `BUOY 0/${BUOYS.length}`, reason: 'the Club closed the course' });
      const course = m.sequence(BUOYS.map((q, k) => Object.assign(m.waitUntil(mm => { if (!past(mm, q)) return false; clock.label = `BUOY ${k + 1}/${BUOYS.length}`; return true; }), {
        start: mm => { mm.objective(`Buoy ${k + 1} of ${BUOYS.length}${k === BUOYS.length - 1 ? ': the line' : ''}`, { hint: { kind: 'goto', at: q, radius: 30, vehicle: 'ride', style: 'race' } }); mm.marker(q, { color: '#ffa23a', r: 36 }); },
        nav: () => q,
      })));
      yield m.first([blindEye(m), m.parallel([m.say(['GO!'], MC), course])]);
      clock.stop();
      const secs = m.elapsed - t0; m.data.secs = Math.round(secs * 10) / 10;
      m.data.place = 1 + BOARD.filter(b => b.secs < secs).length;
      m.failIf(mm => mm.data.place > 3, 'off the podium');
      yield m.wait(.2);
      const time = `${m.data.secs.toFixed(1)} s.`;
      yield m.say([['', `${time} Fastest on the board! Splendid. Infuriating, but splendid.`, `${time} Second, behind yours truly.`, `${time} Third. Old Ironsides will be livid.`, `${time} Not on the board, I'm afraid.`][Math.min(4, m.data.place)]], MC);
    },
  }],
});
