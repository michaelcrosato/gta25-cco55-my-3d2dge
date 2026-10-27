// Reel: THE STRIP (EXPANSION.md 5, X7): Glass Heights'. Night on the Strip: a Zephyr GT south down Heights Avenue past
// the Velvet Casino's neon in MODE 7; east along Casino Row past the Grand Palms in ISO; then down Bluewater Drive to
// the marina's lights, TOP. Played by the mission bot from its hints (a goto at a player's pace, through the lights), in
// a fresh Glass Heights each time.
import { defReel } from '../../motor/index.js';

// to points one after another (each within r), at a player's pace: a goto hint with its style
function* drive(m, pts, text, r = 60) {
  for (const q of pts) {
    m.objective(text, { hint: { kind: 'goto', at: q, radius: 30, vehicle: 'ride', style: 'player' } });
    yield m.waitUntil(mm => { const v = mm.vehicle; return !!v && Math.hypot(v.x - q[0], v.y - q[1]) < r; }, { timeout: 25 });
  }
}

const T = 16, C = (x, y) => [x * T + 8, y * T + 8];
const START = C(62, 61);                                    // (Heights Avenue's southbound lane, out of the Loop's junction: north of it, a queue at its lights had the watchdog cut the reel)
const STRIP = [C(62, 75)];                                  // (south past the casino's forecourt to Casino Row)
const ROW = [C(80, 80), C(104, 80)];                        // (east along Casino Row, past the Grand Palms)
const DOWN = [C(117, 92), C(110, 100), C(88, 100)];         // (south on Bluewater Drive, west along Marina Drive)

defReel('strip_night', {
  title: 'The Strip', shows: 'Neon by night', views: ['side7', 'iso', 'top'], time: 70, district: 'glass-heights',
  stages: [
    { id: 'strip', view: 'side7', caption: 'THE STRIP NEVER SLEEPS',
      setup(m) {
        m.as('dex'); m.time(22.5); m.weather('clear'); m.view('side7', { heading: 'south' });
        const q = m.lane(START, Math.PI / 2); m.clearSpot([q.x, q.y], 60);
        const v = m.spawn.vehicle('zephyr', [q.x, q.y], { tag: 'ride', heading: q.heading, color: '#ff4ad8' });
        m.place('player', { in: v, seat: 0 });
      },
      *run(m) { yield m.wait(2.5); yield* drive(m, STRIP, 'Down the Strip'); } },   // (a moment at the light under the casino's neon, then off)
    { id: 'row', view: 'iso', caption: 'CASINO ROW',
      setup(m) { m.as('dex'); },
      *run(m) { yield* drive(m, ROW, 'Along the Row'); } },
    { id: 'marina', view: 'top', caption: 'DOWN TO THE MARINA',
      setup(m) { m.as('dex'); },
      *run(m) { yield* drive(m, DOWN, 'To the water'); yield m.wait(1); } },
  ],
});
