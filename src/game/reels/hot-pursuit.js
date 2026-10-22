// Reel: HOT PURSUIT (PLAN.md 9.11). Night and rain: three stars on a stolen Zephyr, two cruisers on its tail and the
// chopper's spotlight overhead, MODE 7 down Motor Avenue; then a cut to TOP, the heat down to a star, the car pulled
// in at Spray & Pray, which takes the colour off it and the stars with it (out of the police's sight: PLAN.md 8.13),
// and away along Canal Street.
import { defReel } from '../../motor/index.js';

const T = 16, C = (x, y) => [x * T + 8, y * T + 8];
const START = C(80, 26), RUN = [C(80, 48), C(80, 72)];   // (Motor Avenue, south from Sunset Strip: ahead of any roadblock)
const APRON = [248, 1858], AWAY = [C(6, 118)];   // (Spray & Pray's apron, in reach of its door; then off west along Canal Street)

defReel('hot_pursuit', {
  title: 'Hot Pursuit', shows: 'Three stars, one way out', views: ['side7', 'top'], time: 90,
  stages: [
    { id: 'chase', view: 'side7', caption: 'THREE STARS',
      setup(m) {
        m.as('viv'); m.time(23); m.weather('rain'); m.pay(400, 'reel');
        const q = m.lane(START, Math.PI / 2), v = m.spawn.vehicle('zephyr', [q.x, q.y], { tag: 'ride', heading: q.heading, color: '#2a2a30', mods: { armor: true } });
        m.place('player', { in: v, seat: 0 });
        for (let i = 1; i <= 2; i++) m.spawn.vehicle('cruiser', [q.x - Math.cos(q.heading) * 70 * i, q.y - Math.sin(q.heading) * 70 * i], { tag: 'cops', heading: q.heading, driver: 'mpd', drive: { chase: 'player', style: 'fast' } });
        m.allowWanted(); m.wanted.set(3); m.wanted.floor(3); m.wanted.cap(3);
        m.view('side7', { heading: 'south' });   // (MODE 7's rail down the avenue, the cruisers behind)
      },
      *run(m) { yield m.race(RUN, { text: 'Run', radius: 80 }); } },
    { id: 'respray', view: 'top', caption: 'SPRAY & PRAY',
      setup(m) {
        m.as('viv'); m.allowWanted(); m.wanted.floor(0); m.wanted.cap(1); m.wanted.set(1); for (const c of m.tagged('cops')) m.remove(c);
        const v = m.one('ride'); if (v) m.place(v, APRON, { heading: Math.PI / 2 });   // (the cut, under the director's TOP: backed in at the door, nose out)
      },
      *run(m) {
        yield m.waitUntil(mm => mm.stars === 0, { timeout: 4 });   // (out of their sight: the respray, the stars gone)
        yield m.wait(1.5);
        yield m.race(AWAY, { text: 'Away, another colour', radius: 60 });
      } },
  ],
});
