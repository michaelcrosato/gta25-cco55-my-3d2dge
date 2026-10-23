// Loop Sprint (PLAN.md 9.5): a street race on the Loop, the expressway ring at z 64. Drive into the start by the
// Cranes, line up on Seawall Drive with three racers, and at the green: down Seawall, up the south-east ramp onto the
// deck, twice round the Loop (west along its south side, north up the west, east along the north, south down the
// east), down the north-east ramp and back down Seawall to the line. The checkpoints up there are points with a
// height ([x, y, z]: the deck's, not the streets under it). A podium (third or better) passes; the purse pays by the
// place, a win the most. Proves: the race system on the decks and the ramps, the grid, a countdown.
import { defActivity } from '../../motor/index.js';

const W = Math.PI, N = -Math.PI / 2, E = 0, S = Math.PI / 2, Z = 64;
const MC = { name: 'Flagger', color: '#ff5ad8' };
// the course: [x, y, heading, z]; deck points carry the deck's height (snapped to the deck lane running that way)
const COURSE = [
  [1900, 1624, W, Z], [1100, 1624, W, Z], [536, 1560, N, Z], [536, 1340, N, Z], [900, 1272, E, Z], [1700, 1272, E, Z], [2040, 1450, S, Z],   // (lap 1)
  [1700, 1624, W, Z], [900, 1624, W, Z], [536, 1540, N, Z], [536, 1330, N, Z], [1300, 1272, E, Z], [1950, 1272, E, Z],   // (lap 2)
  [2400, 1300, S, 0], [2400, 1480, S, 0],   // (down the north-east ramp, and back down Seawall Drive to the line)
];
// the grid on Seawall Drive, facing south: two abreast (the lane, the parking lane beside it), the player in the
// second row's lane
const LINE = [2400, 1560];
const RACERS = [{ def: 'zephyr', driver: 'saint-grunt', color: '#e8e8ec' }, { def: 'brute', driver: 'rat-grunt', color: '#ffd23a' }, { def: 'saint', driver: 'gnome-grunt', color: '#ff8ac8' }];
const PURSE = [0, 2000, 1200, 700];   // (by place: first, second, third)

const course = m => COURSE.map(([x, y, h, z]) => { const q = m.lane([x, y], h, z || null); return z ? [Math.round(q.x), Math.round(q.y), z] : [Math.round(q.x), Math.round(q.y)]; });
// the grid's slots: the lane's point at the line and the parking lane beside it (on its right: the west side), the
// second row behind
function slots(m) {
  const q = m.lane(LINE, S), rx = -Math.sin(q.heading), ry = Math.cos(q.heading);   // (the lane's right, facing its way)
  const lane = [q.x, q.y], park = [q.x + rx * 24, q.y + ry * 24], back = (p, d) => [Math.round(p[0] - Math.cos(q.heading) * d), Math.round(p[1] - Math.sin(q.heading) * d)];
  return { heading: q.heading, racers: [back(lane, 0), back(park, 0), back(park, 74)], mine: back(lane, 74) };
}
const inCar = m => !!m.vehicle && m.vehicle.driver === m.player && ['car', 'truck', 'bike'].includes(m.vehicle.cls);
// the player's car: the one they drive (their own), else a loaner on the grid (one still about and near: back in it)
function car(m, G) {
  if (inCar(m)) return m.vehicle;
  let c = m.one('mine');
  if (!c || m.dist(c) > 250) { if (c) m.remove(c); c = m.ensure.vehicle('mine', 'zephyr', G.mine, { heading: G.heading, color: '#ff5a4a' }); }
  m.place('player', { in: c });
  return c;
}
// the racers waiting on the grid (a driver at each wheel, going nowhere till the green)
function grid(m, G) { RACERS.forEach((r, i) => m.ensure.vehicle('grid' + i, r.def, G.racers[i], { heading: G.heading, color: r.color, driver: r.driver })); }
// to the grid's empty slot, in a car, and stopped there
function toSlot(m, G) {
  const at = G.mine;
  return Object.assign(m.waitUntil(mm => inCar(mm) && Math.hypot(mm.mover.x - at[0], mm.mover.y - at[1]) < 26 && mm.mover.speed < 12), {
    nav: () => at,
    start: mm => { mm.objective('Line up on the grid: the empty slot on Seawall Drive', { hint: { kind: 'goto', at, radius: 20, vehicle: mm.one('mine') ? 'mine' : null } }); mm.marker(at, { color: '#ff5ad8', r: 20 }); },
  });
}

defActivity('race_loop_sprint', {
  title: 'Loop Sprint', kind: 'race', start: { at: 'cranes', vehicle: ['car', 'truck', 'bike'], radius: 40 },
  brief: ['Twice round the Loop at full tilt, ramp to ramp.', 'A podium passes. The purse pays by the place: a win pays the most.'],
  rewardsFor: (level, m) => ({ cash: PURSE[(m && m.data.place) || 3] || PURSE[3] }),
  bonus: [{ id: 'win', text: 'First across the line', check: m => m.data.place === 1 }],
  stages: [
    {
      id: 'grid',
      setup(m) { const G = slots(m); car(m, G); grid(m, G); },
      *run(m) { const G = slots(m); if (m.dist(G.mine) > 26) yield toSlot(m, G); },
    },
    {
      id: 'race',
      setup(m) {
        const G = slots(m), c = car(m, G);
        if (m.dist(G.mine) > 60) m.place(c, G.mine, { heading: G.heading });   // (a deep link, a retry: back on the grid)
        grid(m, G);
      },
      *run(m) {
        // the countdown (the player held at the line: a jump start is a false start), then the racers away
        const P0 = [m.mover.x, m.mover.y];
        m.failIf(mm => !mm.data.go && Math.hypot(mm.mover.x - P0[0], mm.mover.y - P0[1]) > 40, 'a false start');
        m.data.go = false;
        yield m.say(['Up the ramp, twice round, down the far one.', '3...', '2...', '1...'], { ...MC, per: 1.2 });
        m.data.go = true;
        const line = course(m);
        RACERS.forEach((r, i) => {
          const g = m.one('grid' + i); if (!g) return;
          const at = { x: g.x, y: g.y, heading: g.heading }; m.remove(g);
          m.spawn.vehicle(r.def, at, { tag: 'racer', heading: at.heading, color: r.color, driver: r.driver, drive: { race: line, laps: 1 } });
        });
        const place = yield m.parallel([m.say(['GO!'], MC), m.race({ line, laps: 1 }, { racers: 'racer', text: 'Loop Sprint: twice round the Loop. Podium or bust' })]);
        m.data.place = place[1];
        m.failIf(mm => mm.data.place > 3, 'off the podium');
        yield m.wait(.2);
        yield m.say([['', 'First! King of the Loop.', 'Second. Close one.', 'Third. On the podium, just.'][m.data.place]], MC);
      },
    },
  ],
});
