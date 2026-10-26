// GS2 · High Mass (EXPANSION.md 4, X6): the Chrome Saints' second job in Glass Heights. The Yacht Club have called the
// Saints soft: Father Fender answers with a High Mass, a race down Cathedral Hill against three of the Club's Zephyrs,
// from the grid on Summit Road at the top of the hill to the line on Marina Drive by the marina: east to Heights Avenue,
// down it through the Strip, east along Casino Row, down Bluewater Drive and west along Marina Drive. A Saints Zephyr
// GT on the grid's front slot for the player: win it. Proves: a race through the city's traffic.
//   The checkpoints are points on the lanes running the course's way (m.lane), as Drag Mass's are.
import { defMission } from '../../motor/index.js';

const FENDER = { name: 'Father Fender', color: '#5af0ff' }, COMMODORE = { name: 'The Commodore', color: '#7ab0ff' };
const W = Math.PI, S = Math.PI / 2, E = 0, T = 16;
// the course: [x, y, heading] in cells (the southbound lanes of Heights Avenue are its west half)
const COURSE = [[62, 16, S], [62, 44, S], [62, 70, S], [82, 80, E], [106, 80, E], [117, 90, S], [102, 100, W], [84, 100, W]];
// the grid on Summit Road (one way, east), at the top of the hill west of Heights Avenue
const GRID = [44, 39, 34, 29].map(x => [x * T, 6 * T]);
const RACERS = [{ color: '#f0f0f4' }, { color: '#2a3a7a' }, { color: '#e8e4d8' }];

const course = m => (m.data.line ||= COURSE.map(([x, y, h]) => { const q = m.lane([x * T, y * T], h); return [Math.round(q.x), Math.round(q.y)]; }));
const slot = (m, i) => m.lane(GRID[i], E);
// the Saints' Zephyr GT on the grid's front slot (a fresh one when it is gone, or far from the grid on a retry)
function zephyr(m, far = 1e9) {
  let v = m.one('ride'); const q = slot(m, 0);
  if (v && Math.hypot(v.x - q.x, v.y - q.y) > far) { m.remove(v); v = null; }
  return v || m.spawn.vehicle('zephyr', q, { tag: 'ride', heading: q.heading, color: '#5af0ff' });
}
// the Club's three waiting on the grid behind it, engines running (fresh ones on a retry)
function grid(m) { RACERS.forEach((r, i) => { const q = slot(m, i + 1); m.ensure.vehicle('grid' + i, 'zephyr', q, { heading: q.heading, color: r.color, driver: 'yacht-grunt', gang: 'yacht' }); }); }
// Summit Road kept clear round the grid while it waits (the street's traffic, queued behind the grid on a one-way with
// no way round it, had backed up Bayshore Drive and held the player off the grid for good): towed every second and a half
const keepClear = m => m.waitUntil(mm => { if (mm.stageTime >= (mm.data.clearT || 0)) { mm.data.clearT = mm.stageTime + 1.5; mm.clearTraffic([36 * T, 6 * T], 340); } return false; });
// while the Mass runs the hill is the Saints' (no stars); however it ends, the cap is lifted and the heat forgotten
const blessed = m => Object.assign(m.waitUntil(() => false), { start: mm => mm.wanted.cap(0), end: mm => mm.wanted.clear() });

defMission('saints_high_mass', {
  title: 'High Mass', giver: { phone: 'saints', at: 'phone-chrome' }, gang: 'saints', tier: 2, requires: ['saints_communion'], district: 'glass-heights', plays: 'dex',
  brief: ['The Yacht Club call the Saints soft.', 'A High Mass: race their Zephyrs down Cathedral Hill to the marina. First across the line.'],
  rewards: { cash: 4000, respect: { saints: 15, yacht: -10 } },
  bonus: [
    { id: 'time', text: 'Under 1:10 down the hill', check: m => (m.data.lap ?? 1e9) < 70 },
    { id: 'clean', text: 'The Zephyr above 75%', check: m => (m.data.health ?? 0) > .75 },
  ],
  stages: [
    { id: 'call', setup() {}, *run(m) {
      yield m.say(['The Yacht Club say we drive like we pray: slowly.', 'High Mass, my child. Summit Road to the marina, against three of their Zephyrs.', 'Mine is on the grid. Make them eat their blazers.'], FENDER);
    } },
    {
      id: 'grid',
      // the Zephyr on the grid's front slot, the Club behind it (a deep link from across town: the player at the payphone)
      setup(m) { zephyr(m); grid(m); m.data.clearT = 0; if (m.dist(slot(m, 0)) > 1400) m.place('player', 'phone-chrome'); },
      *run(m) { yield m.first([m.enter('ride', { text: 'Take the Saints\' Zephyr GT on the grid, Summit Road', lost: 'the Zephyr\'s gone' }), keepClear(m)]); },
    },
    {
      id: 'race',
      // at the Zephyr's wheel on the grid (a retry, a deep link: back on the grid, the Club behind, the last run's gone)
      setup(m) {
        for (const a of m.tagged('racer')) m.remove(a);
        const v = zephyr(m, 60); if (v.damage.share < .9) v.damage.repair();
        if (m.vehicle !== v) m.place('player', { in: v });
        grid(m); m.data.clearT = 0;
      },
      *run(m) {
        const line = course(m), P0 = [m.mover.x, m.mover.y];
        m.data.go = false;
        m.failIf(mm => !mm.data.go && Math.hypot(mm.mover.x - P0[0], mm.mover.y - P0[1]) > 40, 'a jump start: no blessing');
        yield m.first([m.sequence([m.say(['Gentlemen. Try to keep up.'], COMMODORE), m.say(['Lord, guide these wheels downhill.', 'Three...', 'Two...', 'One...'], { ...FENDER, per: 1.2 })]), keepClear(m)]);
        m.data.go = true;
        RACERS.forEach((r, i) => {
          const g = m.one('grid' + i); if (!g) return;
          const at = { x: g.x, y: g.y, heading: g.heading }; m.remove(g);
          m.spawn.vehicle('zephyr', [at.x, at.y], { tag: 'racer', heading: at.heading, color: r.color, driver: 'yacht-grunt', gang: 'yacht', drive: { race: line, laps: 1, style: 'race' } });
        });
        const t0 = m.elapsed;
        const r = yield m.first([m.parallel([m.say(['GO!'], FENDER), m.race({ line, laps: 1 }, { racers: 'racer', text: 'High Mass: down Cathedral Hill to the marina. First across the line' })]), blessed(m)]);
        const place = r.value[1];
        m.data.lap = m.elapsed - t0; m.data.health = m.vehicle ? m.vehicle.damage.share : 0;
        if (place > 1) { m.failIf(() => true, place === 2 ? 'second: the Club go home smug' : 'off the pace'); yield m.wait(1); }
        yield m.say(['First! The Lord drives downhill like the devil.', 'The Yacht Club can row home.'], FENDER);
      },
    },
  ],
});
