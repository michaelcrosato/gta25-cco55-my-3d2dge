// The reel recipe's fixture (docs/CONTENT-GUIDE.md, "An attract reel"), as src/game/reels/cab-ride.js: a short reel
// for the attract mode, staged as a mission (the bot plays it from its hints): a cab east along Lantern Lane (one-way
// east) in TOP, then on in MODE 7. Its first stage sets the protagonist, the hour and the weather and spawns what it needs.
// tests/recipes/reel.test.mjs plays it through the attract mode's director.
import { defReel } from '../../motor/index.js';

const T = 16, C = (x, y) => [x * T + 8, y * T + 8];
defReel('cab-ride', {
  title: 'Cab Ride', shows: 'Somewhere to be', views: ['top', 'side7'], time: 40,
  stages: [
    { id: 'hail', view: 'top', caption: 'TAKE A CAB',
      setup(m) {
        m.as('viv'); m.time(20); m.weather('clear');
        const q = m.lane(C(10, 54), 0);
        const cab = m.spawn.vehicle('cortez', [q.x, q.y], { tag: 'cab', heading: q.heading, color: '#ffd23a' });
        m.place('player', { in: cab });
      },
      *run(m) { yield m.race([C(44, 54)], { text: 'East on Lantern Lane', radius: 60 }); } },
    { id: 'cruise', view: 'side7', caption: 'ALL THE WAY HOME',
      setup(m) { m.as('viv'); m.view('side7', { heading: 'east' }); },
      *run(m) { yield m.race([C(70, 54)], { text: 'On east', radius: 60 }); } },
  ],
});
