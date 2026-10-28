// Reel: CROP DUSTER (EXPANSION.md 5, X4): Ironside's. Morning at the Airstrip: the Duster off the runway, TOP; low over
// the allotments' rows in ISO; then north up Voltage Row and past the Power Station's stacks in slow motion, in MODE 7.
// Played by the mission bot from its hints (a plane flown through points in the air), in a fresh Ironside each time.
import { defReel } from '../../motor/index.js';

// through points in the air one after another (each within r across and 40 of its height), at pace u/s: a goto hint
// with its height and speed (a race's has neither: flat out, the field's turns were too tight for it)
function* fly(m, pts, text, r = 60, pace = 130) {
  for (const q of pts) {
    m.objective(text, { hint: { kind: 'goto', at: q, radius: 30, vehicle: 'ride', speed: pace } });
    yield m.waitUntil(mm => { const v = mm.vehicle; return !!v && Math.hypot(v.x - q[0], v.y - q[1]) < r && Math.abs((v.z || 0) - q[2]) < 40; }, { timeout: 20 });
  }
}

const T = 16, C = (x, y, z) => [x * T + 8, y * T + 8, z];
const PAD = [1624, 1480];                                               // (the Duster's apron, its nose down the runway)
const UP = [C(84, 90, 60)];                                             // (off the runway, westbound)
const ROWS = [C(76, 82, 65), C(77, 72, 60), C(84, 66, 60), C(88, 74, 60), C(90, 84, 65)];   // (north over Crusher Lane, low up the allotments and round)
const UP_ROW = [C(92, 60, 110), C(94, 40, 140)];                        // (north up Pylon Street)
const STACKS = [C(98, 30, 170), C(110, 30, 170)], BACK = [C(106, 50, 140), C(96, 62, 120)];   // (along the station's face, slowly; and back south)

defReel('crop_duster', {
  title: 'Crop Duster', shows: 'Low over the works', views: ['top', 'iso', 'side7'], time: 70, district: 'ironside',
  stages: [
    { id: 'takeoff', view: 'top', caption: 'TAKE TO THE SKIES',
      setup(m) {
        m.as('dex'); m.time(7.5); m.weather('clear');
        m.clearSpot(PAD, 40); const v = m.spawn.vehicle('duster', PAD, { tag: 'ride', heading: Math.PI });
        m.place('player', { in: v, seat: 0 });
      },
      *run(m) { yield* fly(m, UP, 'Up'); } },
    { id: 'rows', view: 'iso', caption: 'LOW OVER THE BEANS',
      setup(m) { m.as('dex'); },
      *run(m) { yield* fly(m, ROWS, 'Dust them'); } },
    { id: 'stacks', view: 'side7', caption: 'IRONSIDE POWER',
      setup(m) { m.as('dex'); m.view('side7', { heading: 'north' }); },
      *run(m) {
        yield* fly(m, UP_ROW, 'North', 70, 200);
        m.slowmo(.4); yield* fly(m, STACKS, 'Past the stacks', 70, 200); m.slowmo(1);   // (slow past the stacks)
        yield* fly(m, BACK, 'Home', 70, 200); yield m.wait(1);
      } },
  ],
});
