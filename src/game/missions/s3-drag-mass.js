// S3 · Drag Mass (PLAN.md 9.4): the Chrome Saints' third job. Once a month Father Fender says the Drag Mass on the
// Loop: three of the Saints' best drivers, the blessing on Seawall Drive, then up the north-east ramp and twice round
// the Loop at full tilt (west along the north leg, down the west, east along the south, up the east) to the line under
// the L. Fender's own Zephyr GT is on the grid for the player: win it. Proves: the race
// system, racer AI, decks, ramps. Unlocks the Zap-O-Matic at Lead Farm (its unlock is this mission's id).
//   The checkpoints up on the deck are points with a height ([x, y, 64]: counted up there, and the racers' and the
// bot's GPS route up the ramp to them), each snapped to the deck's lane running the course's way.
import { defMission } from '../../motor/index.js';

const FENDER = { name: 'Father Fender', color: '#5af0ff' };
const DECK = 64, W = Math.PI, N = -Math.PI / 2, E = 0, S = Math.PI / 2;
// the course: [x, y, heading, z] (z: the deck's). Up the north-east ramp onto the north leg, twice round the outer
// lanes, and the line on the north leg under the L (well short of the north-west corner, where the queue at the ramp
// foot's lights backs up onto the deck)
const COURSE = [
  [1900, 1240, W, DECK], [1100, 1240, W, DECK], [504, 1380, S, DECK], [900, 1656, E, DECK], [1700, 1656, E, DECK], [2072, 1460, N, DECK],
  [1500, 1240, W, DECK], [504, 1380, S, DECK], [1300, 1656, E, DECK], [2072, 1460, N, DECK], [1300, 1240, W, DECK],
];
// the grid on Seawall Drive (one way, south) above Loop Avenue: Fender's Zephyr at the front, the three Saints behind
// in their chrome Saints (heavy, and slower off the line and flat out than the Zephyr GT)
const GRID = [1130, 1060, 990, 920].map(y => [2402, y]);
const RACERS = [{ def: 'saint', color: '#5af0ff', driver: 'saint-enforcer' }, { def: 'saint', color: '#c8c8d0', driver: 'saint-grunt' }, { def: 'saint', color: '#e8e8ec', driver: 'saint-grunt' }];

// the course's checkpoints, each on the lane running its way, at its height there (counted up there; the GPS routes up
// the ramp to it)
const course = m => (m.data.line ||= COURSE.map(([x, y, h, z]) => { const q = m.lane([x, y], h, z); return [Math.round(q.x), Math.round(q.y), Math.round(q.z)]; }));
const slot = (m, i) => m.lane(GRID[i], S);
// Fender's Zephyr GT on the grid's front slot (a fresh one when it is gone, or far from the grid on a retry)
function zephyr(m, far = 1e9) {
  let v = m.one('ride'); const q = slot(m, 0);
  if (v && Math.hypot(v.x - q.x, v.y - q.y) > far) { m.remove(v); v = null; }
  return v || m.spawn.vehicle('zephyr', q, { tag: 'ride', heading: q.heading, color: '#1e1e24' });
}
// the three Saints waiting on the grid behind it, engines running (fresh ones on a retry)
function grid(m) { RACERS.forEach((r, i) => { const q = slot(m, i + 1); m.ensure.vehicle('grid' + i, r.def, q, { heading: q.heading, color: r.color, driver: r.driver }); }); }
// while the Mass runs the Loop is the Saints' (the precinct paid to look the other way: no stars); however it ends, the
// cap is lifted and the heat forgotten
const blessed = m => Object.assign(m.waitUntil(() => false), { start: mm => mm.wanted.cap(0), end: mm => mm.wanted.clear() });

defMission('saints_drag_mass', {
  title: 'Drag Mass', giver: { phone: 'saints' }, gang: 'saints', tier: 3, requires: ['saints_confession_booth'], plays: 'any',
  brief: ['The Drag Mass: twice round the Loop against three of the Saints\' best.', 'Fender\'s own Zephyr GT. Cross the line first.'],
  rewards: { cash: 5000, respect: { saints: 20 } },
  bonus: [
    { id: 'time', text: 'Under 1:30 on the Loop', check: m => (m.data.lap ?? 1e9) < 90 },
    { id: 'clean', text: 'The Zephyr above 75%', check: m => (m.data.health ?? 0) > .75 },
  ],
  stages: [
    { id: 'call', setup() {}, *run(m) {
      yield m.say(['My son. Tonight I say the Drag Mass.', 'Three of my faithful against my own Zephyr GT, twice round the Loop.', 'You drive it. Seawall Drive, above the ramp.'], FENDER);
    } },
    {
      id: 'grid',
      // Fender's Zephyr on the grid's front slot, the Saints behind it (a deep link from across town: the player at the
      // Saints' payphone)
      setup(m) {
        zephyr(m); grid(m);
        if (m.dist(slot(m, 0)) > 1400) m.place('player', 'phone-saints');
      },
      *run(m) { yield m.enter('ride', { text: 'Take Fender\'s Zephyr GT on the grid, Seawall Drive', lost: 'Fender\'s Zephyr is gone' }); },
    },
    {
      id: 'race',
      // at the Zephyr's wheel on the grid (a retry, a deep link: back on the grid, the Saints behind, the last run's
      // racers gone)
      setup(m) {
        for (const a of m.tagged('racer')) m.remove(a);
        const v = zephyr(m, 60);
        if (v.damage.share < .9) v.damage.repair();
        if (m.vehicle !== v) m.place('player', { in: v });
        grid(m);
      },
      *run(m) {
        const line = course(m);
        // the blessing and the count (held at the line: a jump start is no start), then the Saints away
        const P0 = [m.mover.x, m.mover.y];
        m.data.go = false;
        m.failIf(mm => !mm.data.go && Math.hypot(mm.mover.x - P0[0], mm.mover.y - P0[1]) > 40, 'a jump start: no blessing');
        yield m.say(['Bless these wheels, and the fools who drive them.', 'Three...', 'Two...', 'One...'], { ...FENDER, per: 1.2 });
        m.data.go = true;
        RACERS.forEach((r, i) => {
          const g = m.one('grid' + i); if (!g) return;
          const at = { x: g.x, y: g.y, heading: g.heading }; m.remove(g);
          m.spawn.vehicle(r.def, [at.x, at.y], { tag: 'racer', heading: at.heading, color: r.color, driver: r.driver, drive: { race: line, laps: 1, style: 'race' } });
        });
        const t0 = m.elapsed;
        const r = yield m.first([m.parallel([m.say(['GO!'], FENDER), m.race({ line, laps: 1 }, { racers: 'racer', text: 'The Drag Mass: up the ramp, twice round the Loop, the line under the L. First across it' })]), blessed(m)]);
        const place = r.value[1];
        m.data.lap = m.elapsed - t0; m.data.health = m.vehicle ? m.vehicle.damage.share : 0;
        if (place > 1) { m.failIf(() => true, place === 2 ? 'second: the Mass goes to the faithful' : 'off the pace'); yield m.wait(1); }
        yield m.say(['First across the line! The Lord drives a Zephyr.', 'Lead Farm will sell you a Zap-O-Matic now. Tell them Fender sent you.'], FENDER);
      },
    },
  ],
});
