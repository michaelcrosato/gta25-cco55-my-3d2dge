// GY2 · Flare Up (EXPANSION.md 4, X6): the Yacht Club's second job. The Chrome Saints hold their car meet on Sundays in
// the Observatory's park on Cathedral Hill, chrome and cyan under the dome, and the Commodore wants it remembered: Dex
// takes the Club's Flare Gun to it and sets every car alight (the Saints at the meet scatter: show-offs, not soldiers),
// which brings two stars; a Splash waits at the shore off Bluewater Drive, below the park, and the police don't follow a boat out onto
// the water: lose them there. Proves: fire (a flare sets a car burning), an evasion by water.
//   Every stage's setup puts the world as it needs it: the meet fresh for each try, the Splash at the shore.
import { defMission } from '../../motor/index.js';

const COMMODORE = { name: 'The Commodore', color: '#7ab0ff' }, T = 16, C = (x, y) => [(x + .5) * T, (y + .5) * T];
// the meet: three of the Saints' cars on the park's lawn in a row, three Saints admiring them from behind (in front of
// them they had taken the flares meant for the cars)
const CARS = [{ def: 'saint', at: C(99, 23), color: '#d8dce4' }, { def: 'zephyr', at: C(104, 23), color: '#5af0ff' }, { def: 'saint', at: C(109, 23), color: '#c8c8d0' }];
const SAINTS = [C(100, 21), C(104, 21), C(108, 21)];
const SHORE = { x: 122.45 * T, y: 23 * T, heading: Math.PI / 2 };   // (the Splash in the sea off Bluewater Drive's east walk, straight down from the meet, alongside: its door on the walk)
const LANDING = [121.5 * T, 23 * T];   // (the walk beside it)
const KIT = { weapons: ['flaregun'], ammo: { flaregun: 40 }, select: 'flaregun', only: true };   // (the Club's gun and nothing else: the job's done with it)

const burning = a => !!(a.wrecked || (a.damage && a.damage.burning));
function meet(m) {
  for (const tag of ['meet', 'meetsaint']) for (const a of m.tagged(tag)) m.remove(a);
  CARS.forEach(c => m.spawn.vehicle(c.def, c.at, { tag: 'meet', heading: 0, color: c.color, gang: 'saints' }));
  SAINTS.forEach(at => m.spawn.ped('saint-grunt', at, { tag: 'meetsaint', role: 'flee', gang: 'saints', facing: Math.PI / 2 }));
}
function splash(m) {
  let v = m.one('splash'); if (v && (v.wrecked || v.sinking)) { m.remove(v); v = null; }
  return v || m.spawn.vehicle('splash', [SHORE.x, SHORE.y], { tag: 'splash', heading: SHORE.heading, color: '#ffd23a' });
}

defMission('yacht_flare_up', {
  title: 'Flare Up', giver: { phone: 'yacht' }, gang: 'yacht', tier: 2, requires: ['yacht_overboard'], district: 'glass-heights', plays: 'dex',
  brief: ['The Saints\' car meet in the Observatory\'s park: chrome as far as the eye can see.', 'Flare every car. Then lose the police by water: a Splash waits at the shore below.'],
  rewards: { cash: 5000, respect: { yacht: 15, saints: -15 } },
  bonus: [{ id: 'time', text: 'Under 3:00', check: m => m.elapsed < 180 }, { id: 'clean', text: 'Above 50% health', check: m => (m.data.health ?? 0) > 50 }],
  stages: [
    { id: 'call', setup() {}, *run(m) {
      yield m.say(['The Chrome Saints are showing off their motor cars in the Observatory\'s park.', 'Vulgar. Let\'s add some colour. The Club\'s Flare Gun, my boy: one for every car.', 'A Splash waits at the shore below. The police never did learn to swim.'], COMMODORE);
    } },
    {
      id: 'meet',
      setup(m) {
        meet(m); splash(m); m.loadout(KIT); m.wanted.clear(); m.wanted.cap(0);   // (the police on their way: two stars when the last car's alight)
        m.truce('saints');   // (the meet's own Saints fight for it; the hill's others keep out of it)
        if (m.dist(CARS[1].at) > 1200) m.place('player', 'observatory');
      },
      *run(m) {
        yield m.kill('meet', { done: burning, text: 'Set the Saints\' cars alight with the Flare Gun' });
        yield m.say(['Lovely. Now: to the water.'], COMMODORE);
      },
    },
    {
      id: 'water',
      // two stars and the Splash at the shore (a retry or a deep link: there with them)
      setup(m) {
        const v = splash(m); m.loadout(KIT); m.truce('saints');
        if (m.dist(v) > 300) m.place('player', LANDING);   // (a deep link, a retry: on the walk beside it)
        m.wanted.cap(0);   // (the police on their way: aboard, two stars and no more, the Eye at home)
      },
      *run(m) {
        yield m.enter('splash', { text: 'Run for the Splash at the shore below the meet', lost: 'the Splash is gone' });
        m.wanted.cap(2); m.wanted.set(2);
        yield m.evade({ below: 1, vehicle: 'splash', text: 'Take the Splash at the shore below the meet and lose the police on the water' });
        m.wanted.cap(5);
        m.data.health = m.player.vitals.health;
        yield m.say(['Smoke over the hill for an hour. The Saints will be furious. Marvellous.'], COMMODORE);
      },
    },
  ],
});
