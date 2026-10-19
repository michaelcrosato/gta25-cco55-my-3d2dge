// Harbor Hustle (PLAN.md 9.5): a street race round the Harborfront. Drive into the start outside the Harbor Kwik-Lux,
// line up on Canal Street with three of the docks' racers, and at the green go twice round: west on Canal Street,
// north up Motor Avenue under the Loop, east along Loop Avenue, south down Dock Road past the container yard, and
// back along Canal Street to the line. A podium (third or better) passes; the purse pays by the place, a win the most.
// Proves: the race system on the streets (checkpoints, laps, racers on the GPS), the grid, a countdown.
import { defActivity } from '../../motor/index.js';

const W = Math.PI, N = -Math.PI / 2, E = 0, S = Math.PI / 2;
const MC = { name: 'Flagger', color: '#5af0ff' };
// the course: checkpoints on the lanes (each snapped to the lane running that way), the last the line; two laps
const COURSE = [[1330, 1906, W], [1310, 1720, N], [1310, 1420, N], [1500, 1278, E], [1850, 1278, E], [2066, 1450, S], [2066, 1780, S], [1850, 1906, W], [1560, 1906, W]];
const LAPS = 2;
// the grid on Canal Street, facing west: two abreast (the lane, the parking lane beside it), the player in the
// second row's lane
const SLOTS = [[1500, 1906], [1500, 1880], [1576, 1880]], MINE = [1576, 1906];
const RACERS = [{ def: 'saint', driver: 'saint-grunt', color: '#d8d8e0' }, { def: 'brute', driver: 'gnome-grunt', color: '#ff8ac8' }, { def: 'cortez', driver: 'rat-grunt', color: '#ffd23a' }];
const PURSE = [0, 1600, 1000, 600];   // (by place: first, second, third)

const course = m => COURSE.map(([x, y, h]) => { const q = m.lane([x, y], h); return [Math.round(q.x), Math.round(q.y)]; });
const inCar = m => !!m.vehicle && m.vehicle.driver === m.player && ['car', 'truck', 'bike'].includes(m.vehicle.cls);
// the player's car: the one they drive (their own), else a loaner on the grid (one still about and near: back in it)
function car(m) {
  if (inCar(m)) return m.vehicle;
  let c = m.one('mine');
  if (!c || m.dist(c) > 250) { if (c) m.remove(c); c = m.ensure.vehicle('mine', 'zephyr', MINE, { heading: W, color: '#ff5a4a' }); }
  m.place('player', { in: c });
  return c;
}
// the racers waiting on the grid (a driver at each wheel, going nowhere till the green)
function grid(m) { RACERS.forEach((r, i) => m.ensure.vehicle('grid' + i, r.def, SLOTS[i], { heading: W, color: r.color, driver: r.driver })); }
// to the grid's empty slot, in a car, and stopped there
function toSlot(m) {
  return Object.assign(m.waitUntil(mm => inCar(mm) && Math.hypot(mm.mover.x - MINE[0], mm.mover.y - MINE[1]) < 26 && mm.mover.speed < 12), {
    nav: () => MINE,
    start: mm => { mm.objective('Line up on the grid: the empty slot on Canal Street', { hint: { kind: 'goto', at: MINE, radius: 20, vehicle: mm.one('mine') ? 'mine' : null } }); mm.marker(MINE, { color: '#5af0ff', r: 20 }); },
  });
}

defActivity('race_harbor_hustle', {
  title: 'Harbor Hustle', kind: 'race', start: { at: 'kwik-lux-harbor', vehicle: ['car', 'truck', 'bike'], radius: 56 },
  brief: ['Twice round the Harborfront against three of the docks\' racers.', 'A podium passes. The purse pays by the place: a win pays the most.'],
  rewardsFor: (level, m) => ({ cash: PURSE[(m && m.data.place) || 3] || PURSE[3] }),
  bonus: [{ id: 'win', text: 'First across the line', check: m => m.data.place === 1 }],
  stages: [
    {
      id: 'grid',
      setup(m) { car(m); grid(m); },
      *run(m) { if (m.dist(MINE) > 26) yield toSlot(m); },
    },
    {
      id: 'race',
      setup(m) {
        const c = car(m);
        if (m.dist(MINE) > 60) m.place(c, MINE, { heading: W });   // (a deep link, a retry: back on the grid)
        grid(m);
      },
      *run(m) {
        // the countdown (the player held at the line: a jump start is a false start), then the racers away
        const P0 = [m.mover.x, m.mover.y];
        m.failIf(mm => !mm.data.go && Math.hypot(mm.mover.x - P0[0], mm.mover.y - P0[1]) > 40, 'a false start');
        m.data.go = false;
        yield m.say(['Twice round. Watch the pillars under the Loop.', '3...', '2...', '1...'], { ...MC, per: 1.2 });
        m.data.go = true;
        const line = course(m);
        RACERS.forEach((r, i) => {
          const g = m.one('grid' + i); if (!g) return;
          const at = { x: g.x, y: g.y, heading: g.heading }; m.remove(g);
          m.spawn.vehicle(r.def, at, { tag: 'racer', heading: at.heading, color: r.color, driver: r.driver, drive: { race: line, laps: LAPS } });
        });
        const place = yield m.parallel([m.say(['GO!'], MC), m.race({ line, laps: LAPS }, { racers: 'racer', text: `Harbor Hustle: ${LAPS} laps. Podium or bust` })]);
        m.data.place = place[1];
        m.failIf(mm => mm.data.place > 3, 'off the podium');
        yield m.wait(.2);
        yield m.say([['', 'First! The harbour\'s yours.', 'Second. Not bad at all.', 'Third. On the podium, just.'][m.data.place]], MC);
      },
    },
  ],
});
