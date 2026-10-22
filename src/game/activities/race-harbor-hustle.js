// Harbor Hustle (PLAN.md 9.5): a street race round the Harborfront. Drive into the start outside the Harbor Kwik-Lux
// on Canal Street, pull into the grid behind the leader, and at the green go once round, all right turns: west on
// Canal Street, north up Motor Avenue under the Loop, east along Loop Avenue, south down Dock Road past the container
// yard, and back along Canal Street to the line. The docks' racers keep to the lights; a player in a hurry needn't. A
// podium (third or better) passes; the purse pays by the place, a win the most. (Once round: the avenues' lights and
// the Loop's pillars jam up, and twice round a race could run past ten minutes.) Proves: the race system on the
// streets (checkpoints, a lap, racers on the GPS through the junctions), the grid, a countdown.
import { defActivity } from '../../motor/index.js';

const W = Math.PI, N = -Math.PI / 2, E = 0, S = Math.PI / 2;
const MC = { name: 'Flagger', color: '#5af0ff' };
// a lap from the grid: checkpoints [x, y, heading] on the lanes (each snapped to the lane running that way); the last
// is the line, just ahead of the grid
const LAP = [[1310, 1770, N], [1310, 1450, N], [1500, 1278, E], [1860, 1278, E], [2066, 1450, S], [2066, 1770, S], [1860, 1906, W], [1470, 1906, W]];
const LAPS = 1;
// the grid on Canal Street's westbound lane, single file (side by side in one lane, the drivers lock up): the leader
// at the front by Motor Avenue's lights, the player's slot GAP behind it, the other two behind the player (none in
// Marquee Street's junction: past it, a block being too short for four)
const LEAD = [1430, 1906], GAP = 70, BOX = [1596, 1746];
const RACERS = [{ def: 'saint', driver: 'saint-grunt', color: '#d8d8e0' }, { def: 'brute', driver: 'gnome-grunt', color: '#ff8ac8' }, { def: 'cortez', driver: 'rat-grunt', color: '#ffd23a' }];
// where a racer goes once over the line: on west across Motor Avenue (off the course)
const COOL = [1060, 1906];
const PURSE = [0, 1600, 1000, 600];   // (by place: first, second, third)

const lane = (m, p, h = W) => m.lane([p[0], p[1]], h);
const pt = q => [Math.round(q.x), Math.round(q.y)];
const course = m => LAP.map(([x, y, h]) => pt(lane(m, [x, y], h)));
// the racers' own course: the laps, then on past the line to the cool-down (a racer done stops there, out of the
// way of those still racing)
const racerLine = line => [...Array.from({ length: LAPS }, () => line).flat(), COOL];
// the place at the line: each racer's checkpoints counted as it passes them (the racers' own rule: within 48, at the
// point's height), so one past the line but not yet at the cool-down counts as ahead
function standings(m, line) {
  const n = line.length * LAPS, passed = new Map();
  return Object.assign(m.waitUntil(mm => {
    for (const v of mm.tagged('racer')) {
      const k = passed.get(v) || 0, c = line[k % line.length]; if (k >= n) continue;
      if (Math.hypot(c[0] - v.x, c[1] - v.y) < 48 && (c[2] === undefined || Math.abs((v.z || 0) - c[2]) < 24)) passed.set(v, k + 1);
    }
    return false;
  }), { ahead: () => [...passed.values()].filter(k => k >= n).length });
}
// an op held beside the race: the precinct looks the other way while it runs (no stars for a red light run or a
// fender bent; the heat forgotten however it ends)
const blindEye = m => Object.assign(m.waitUntil(() => false), { start: mm => { mm.wanted.clear(); mm.wanted.cap(0); }, end: mm => mm.wanted.clear() });
const inCar = m => !!m.vehicle && m.vehicle.driver === m.player && ['car', 'truck', 'bike'].includes(m.vehicle.cls);
// the player's car: the one they drive (their own: on the job's list as 'mine', so a hint can name it), else a loaner
// in the grid's slot (one still about and near: back in it)
function car(m) {
  if (inCar(m)) { const c = m.one('mine'); if (c === m.vehicle) return c; if (c) m.remove(c); return m.adopt(m.vehicle, 'mine'); }
  let c = m.one('mine');
  if (!c || m.dist(c) > 250) { if (c) m.remove(c); const q = spot(m, spots(m).slot); c = m.ensure.vehicle('mine', 'zephyr', q, { heading: q.heading, color: '#ff5a4a' }); }
  m.place('player', { in: c });
  return c;
}
// is anything but self parked or passing within r of a point (traffic: no car is put on top of it)?
const taken = (m, q, self, r = 40) => m.fleet.near(q.x, q.y, r + 30).some(v => v !== self && v.body && !v.wrecked && Math.hypot(v.x - q.x, v.y - q.y) < r);
// the grid's spots along the lane (x), fixed once a run (kept for a retry): the leader's the first free one from LEAD
// back along the lane, the player's GAP behind it, the other two's free ones behind that, none in the junction
const back = x => (x >= BOX[0] && x <= BOX[1] ? BOX[1] : x);
function spots(m) {
  if (m.data.grid) return m.data.grid;
  let x = LEAD[0]; for (let k = 0; k < 3 && taken(m, lane(m, [x, LEAD[1]]), m.vehicle); k++) x += GAP;
  const lead = x, slot = back(lead + GAP), rest = [];
  for (let b = back(slot + GAP); rest.length < 2 && b < slot + GAP * 8; b = back(b + GAP)) if (!taken(m, lane(m, [b, LEAD[1]]), m.vehicle)) rest.push(b);
  return (m.data.grid = { lead, slot, rest });
}
const spot = (m, x) => lane(m, [x, LEAD[1]]);
// a grid car (a racer at its wheel, going nowhere till the green)
function gridCar(m, i, x) { const g = m.one('grid' + i); if (g) return g; const q = spot(m, x), r = RACERS[i]; return m.ensure.vehicle('grid' + i, r.def, q, { heading: q.heading, color: r.color, driver: r.driver }); }

defActivity('race_harbor_hustle', {
  title: 'Harbor Hustle', kind: 'race', start: { at: 'kwik-lux-harbor', vehicle: ['car', 'truck', 'bike'], radius: 80 },
  brief: ['Once round the Harborfront against three of the docks\' racers.', 'A podium passes. The purse pays by the place: a win pays the most.'],
  rewardsFor: (level, m) => ({ cash: PURSE[(m && m.data.place) || 1] || PURSE[3] }),
  bonus: [{ id: 'win', text: 'First across the line', check: m => m.data.place === 1 }, { id: 'clean', text: 'The car above half at the line', check: m => (m.data.clean ?? 0) > .5 }],
  stages: [
    {
      id: 'grid',
      // the race starts on its grid: the marshals clear Canal Street's stretch of traffic (a racer parked in a live lane
      // jams it, and nobody could drive up into the slot), the leader waits at the front, and the race's setup puts the
      // player's car in the slot behind it
      setup(m) { m.clearTraffic([LEAD[0] + GAP * 4, LEAD[1]], GAP * 5); const G = spots(m); car(m); gridCar(m, 0, G.lead); },
      *run(m) { yield m.say(['Into your slot behind the leader. Canal Street\'s closed for us.'], MC); },
    },
    {
      id: 'race',
      // the grid: the player's car in its slot (a retry, a deep link: put back there), the leader ahead, the other two
      // behind
      setup(m) {
        m.clearTraffic([LEAD[0] + GAP * 4, LEAD[1]], GAP * 5);
        const G = spots(m), c = car(m), q = spot(m, G.slot);
        if (Math.hypot(c.x - q.x, c.y - q.y) > 60) m.place(c, [q.x, q.y], { heading: q.heading });
        gridCar(m, 0, G.lead); G.rest.forEach((x, i) => gridCar(m, i + 1, x));
      },
      *run(m) {
        // the countdown (the player held at the line: a jump start is a false start), then the racers away
        const P0 = [m.mover.x, m.mover.y];
        m.data.go = false;
        m.failIf(mm => !mm.data.go && Math.hypot(mm.mover.x - P0[0], mm.mover.y - P0[1]) > 40, 'a false start');
        yield m.say(['Once round. Watch the pillars under the Loop.', '3...', '2...', '1...'], { ...MC, per: 1.2 });
        m.data.go = true;
        const line = course(m);
        RACERS.forEach((r, i) => {   // (each grid car swapped for one with its orders: the race's line, in the racing style)
          const g = m.one('grid' + i); if (!g) return;
          const at = { x: g.x, y: g.y, heading: g.heading }; m.remove(g);
          m.spawn.vehicle(r.def, at, { tag: 'racer', heading: at.heading, color: r.color, driver: r.driver, drive: { race: racerLine(line), laps: 1 } });
        });
        const S = standings(m, line);
        yield m.first([blindEye(m), S, m.parallel([m.say(['GO!'], MC), m.race({ line, laps: LAPS }, { text: 'Harbor Hustle: once round the Harborfront. Podium or bust' })])]);
        m.data.place = 1 + S.ahead(); m.data.clean = m.vehicle && m.vehicle.damage ? m.vehicle.damage.share : 0;
        m.failIf(mm => mm.data.place > 3, 'off the podium');
        yield m.wait(.2);
        yield m.say([['', 'First! The harbour\'s yours.', 'Second. Not bad at all.', 'Third. On the podium, just.'][m.data.place]], MC);
      },
    },
  ],
});
