// Reel: JOYRIDE (PLAN.md 9.11). A carjack on Gnome Row, north through the traffic at a racer's pace, right up the
// Loop's north-west ramp and south along its west leg, right into the Loop Gap and off its open end in slow motion: TOP,
// then MODE 7 on the deck and for the jump. Played by the mission bot from its hints (the jump's run-up: full
// throttle on a heading), in a fresh world each time.
import { defReel } from '../../motor/index.js';

const T = 16, C = (x, y, z) => (z === undefined ? [x * T + 8, y * T + 8] : [x * T + 8, y * T + 8, z]);
const JACK = C(6, 100);                                             // (Gnome Row, northbound)
const STREET = [C(6, 82)];                                          // (north up Gnome Row to Loop Avenue)
const DECK = [C(30, 80, 64), C(32, 86, 64)], GAP_IN = C(26, 91, 64);   // (up the north-west ramp, south on the west leg, right into the Gap)

defReel('joyride', {
  title: 'Joyride', shows: 'If it has a motor, it\'s yours', views: ['top', 'side7'], time: 80,
  stages: [
    { id: 'jack', view: 'top', caption: 'TAKE ANY CAR',
      setup(m) {
        m.as('dex'); m.time(17.5); m.weather('clear');
        const q = m.lane(JACK, -Math.PI / 2);
        m.spawn.vehicle('zephyr', [q.x, q.y], { tag: 'ride', heading: q.heading, driver: 'office', color: '#d23a3a' });
        const side = q.heading + Math.PI / 2; m.place('player', [q.x + Math.cos(side) * 26, q.y + Math.sin(side) * 26]);
      },
      *run(m) { yield m.enter('ride', { text: 'Take the car' }); } },
    { id: 'weave', view: 'top', caption: 'THROUGH THE TRAFFIC',
      setup(m) { m.as('dex'); },
      *run(m) { yield m.race(STREET, { text: 'Go', radius: 60 }); } },
    { id: 'deck', view: 'side7', caption: 'UP ON THE LOOP',
      setup(m) { m.as('dex'); m.view('side7', { heading: 'south' }); },   // (MODE 7's rail down the west leg)
      *run(m) { yield m.race(DECK, { text: 'Up on the Loop', radius: 50 }); yield m.race([GAP_IN], { text: 'The Gap', radius: 40 }); } },
    { id: 'jump', view: 'side7', caption: 'THE LOOP GAP',
      setup(m) { m.as('dex'); m.view('side7', { heading: 'west' }); },   // (the rail along the Gap: the flight across the frame's depth)
      *run(m) {
        m.objective('Floor it', { hint: { kind: 'drive', heading: Math.PI, nitro: true } });
        let air = false;
        yield m.waitUntil(mm => {   // (slow motion while it flies)
          const b = mm.vehicle && mm.vehicle.body;
          if (b && b.airborne) { air = true; mm.slowmo(.3); return false; }
          if (air) { mm.slowmo(1); return true; }
          return mm.stageTime > 12;
        });
        m.objective('', {});
        yield m.wait(1.5);
      } },
  ],
});
