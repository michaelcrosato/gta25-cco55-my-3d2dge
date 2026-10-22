// Loop Sprint (PLAN.md 9.5): a street race on the Loop, the expressway ring at z 64. Drive into the start by the
// Neon Mile Kwik-Lux on Loop Avenue, then up a ramp onto the Loop and into the grid on its south side, behind the
// leader: at the green, twice round the deck clockwise (west along the south side, north up the west, east along the
// north, south down the east) against three racers, the line on the south side by the grid. The checkpoints are points
// with a height ([x, y, 64]: the deck's, never the streets under it). A podium (third or better) passes; the purse
// pays by the place, a win the most. Proves: the race system on the decks, racers on the GPS up there, the grid, a
// countdown.
import { defActivity } from '../../motor/index.js';

const DECK = 64, W = Math.PI, N = -Math.PI / 2, E = 0, S = Math.PI / 2;
const MC = { name: 'Flagger', color: '#ff5ad8' };
// a lap, clockwise from the grid: [x, y, heading] on the deck (each snapped to the deck's lane running that way); the
// last is the line, just ahead of the grid
const LAP = [[1000, 1624, W], [536, 1560, N], [536, 1340, N], [1000, 1272, E], [1700, 1272, E], [2040, 1450, S], [1900, 1624, W], [1420, 1624, W]];
const LAPS = 2;
// the grid on the south side's westbound lane, single file (side by side in one lane, the drivers lock up): the
// leader's car at the front, the player's slot GAP behind it, the other two behind the player
const LEAD = [1500, 1624], GAP = 80;
const RACERS = [{ def: 'zephyr', driver: 'saint-grunt', color: '#e8e8ec' }, { def: 'brute', driver: 'rat-grunt', color: '#ffd23a' }, { def: 'saint', driver: 'gnome-grunt', color: '#ff8ac8' }];
// where a racer goes once over the line: on west and down the south-west ramp to its foot (off the course)
const COOL = [230, 1624, 0];
const PURSE = [0, 2000, 1200, 700];   // (by place: first, second, third)

// a point on the deck's lane running heading's way: { x, y, z, heading } (a car put there stands on the deck)
const deck = (m, p, h) => m.lane([p[0], p[1]], h, DECK);
const pt = q => [Math.round(q.x), Math.round(q.y), DECK];
const course = m => LAP.map(([x, y, h]) => pt(deck(m, [x, y], h)));
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
const onDeck = v => Math.abs((v.z || 0) - DECK) < 24;
// the player's car: the one they drive (their own: on the job's list as 'mine', so a hint can name it), else a loaner
// in the grid's slot (one still about and near: back in it)
function car(m) {
  if (inCar(m)) { const c = m.one('mine'); if (c === m.vehicle) return c; if (c) m.remove(c); return m.adopt(m.vehicle, 'mine'); }
  let c = m.one('mine');
  if (!c || m.dist(c) > 250) { if (c) m.remove(c); const q = spot(m, spots(m).slot); c = m.ensure.vehicle('mine', 'zephyr', q, { heading: q.heading, color: '#ff5a4a' }); }
  m.place('player', { in: c });
  return c;
}
// is anything but self parked or passing within r of a point (traffic on the deck: no car is put on top of it)?
const taken = (m, q, self, r = 40) => m.fleet.near(q.x, q.y, r + 30).some(v => v !== self && v.body && !v.wrecked && Math.abs((v.z || 0) - (q.z || 0)) < 16 && Math.hypot(v.x - q.x, v.y - q.y) < r);
// the grid's spots along the lane (x), fixed once a run (kept for a retry): the leader's the first free one from LEAD
// back along the lane, the player's GAP behind it, the other two's free ones behind that
function spots(m) {
  if (m.data.grid) return m.data.grid;
  let x = LEAD[0]; for (let k = 0; k < 3 && taken(m, deck(m, [x, LEAD[1]], W), m.vehicle); k++) x += GAP;
  const lead = x, slot = lead + GAP, rest = [];
  for (let b = slot + GAP; rest.length < 2 && b < slot + GAP * 6; b += GAP) if (!taken(m, deck(m, [b, LEAD[1]], W), m.vehicle)) rest.push(b);
  return (m.data.grid = { lead, slot, rest });
}
const spot = (m, x) => deck(m, [x, LEAD[1]], W);
// a grid car (a racer at its wheel, going nowhere till the green)
function gridCar(m, i, x) { const g = m.one('grid' + i); if (g) return g; const q = spot(m, x), r = RACERS[i]; return m.ensure.vehicle('grid' + i, r.def, q, { heading: q.heading, color: r.color, driver: r.driver }); }

defActivity('race_loop_sprint', {
  title: 'Loop Sprint', kind: 'race', start: { at: 'kwik-lux-neon', vehicle: ['car', 'truck', 'bike'], radius: 80 },
  brief: ['Twice round the Loop, up on the deck, against three racers.', 'A podium passes. The purse pays by the place: a win pays the most.'],
  rewardsFor: (level, m) => ({ cash: PURSE[(m && m.data.place) || 1] || PURSE[3] }),
  bonus: [{ id: 'win', text: 'First across the line', check: m => m.data.place === 1 }, { id: 'clean', text: 'The car above half at the line', check: m => (m.data.clean ?? 0) > .5 }],
  stages: [
    {
      id: 'grid',
      // the race starts on its grid: the marshals clear the deck's stretch of traffic (a racer parked in a live lane jams
      // it, and nobody could drive up into the slot), the leader waits at the front, and the race's setup puts the
      // player's car in the slot behind it
      setup(m) { m.clearTraffic([LEAD[0] + GAP * 4, LEAD[1]], GAP * 5); const G = spots(m); car(m); gridCar(m, 0, G.lead); },
      *run(m) { yield m.say(['Into your slot behind the leader. On the deck, engines on.'], MC); },
    },
    {
      id: 'race',
      // the grid: the player's car in its slot (a retry, a deep link: put back there), the leader ahead, the other two
      // behind it
      setup(m) {
        m.clearTraffic([LEAD[0] + GAP * 4, LEAD[1]], GAP * 5);
        const G = spots(m), c = car(m), q = spot(m, G.slot);
        if (!onDeck(c) || Math.hypot(c.x - q.x, c.y - q.y) > 60) m.place(c, [q.x, q.y], { z: DECK, heading: q.heading });
        gridCar(m, 0, G.lead); G.rest.forEach((x, i) => gridCar(m, i + 1, x));
      },
      *run(m) {
        // the countdown (the player held at the line: a jump start is a false start), then the racers away
        const P0 = [m.mover.x, m.mover.y];
        m.data.go = false;
        m.failIf(mm => !mm.data.go && Math.hypot(mm.mover.x - P0[0], mm.mover.y - P0[1]) > 40, 'a false start');
        yield m.say(['Twice round, clockwise. Mind the traffic up there.', '3...', '2...', '1...'], { ...MC, per: 1.2 });
        m.data.go = true;
        const line = course(m);
        RACERS.forEach((r, i) => {   // (each grid car swapped for one with its orders: the race's line, in the racing style)
          const g = m.one('grid' + i); if (!g) return;
          const at = { x: g.x, y: g.y, z: DECK, heading: g.heading }; m.remove(g);
          m.spawn.vehicle(r.def, at, { tag: 'racer', heading: at.heading, color: r.color, driver: r.driver, drive: { race: racerLine(line), laps: 1 } });
        });
        const S = standings(m, line);
        yield m.first([blindEye(m), S, m.parallel([m.say(['GO!'], MC), m.race({ line, laps: LAPS }, { text: 'Loop Sprint: twice round the Loop. Podium or bust' })])]);
        m.data.place = 1 + S.ahead(); m.data.clean = m.vehicle && m.vehicle.damage ? m.vehicle.damage.share : 0;
        m.failIf(mm => mm.data.place > 3, 'off the podium');
        yield m.wait(.2);
        yield m.say([['', 'First! King of the Loop.', 'Second. Close one.', 'Third. On the podium, just.'][m.data.place]], MC);
      },
    },
  ],
});
