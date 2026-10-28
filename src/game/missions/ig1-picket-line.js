// IG1 · Picket Line (EXPANSION.md 4, X3): the Lawn Gnomes' first job in Ironside, from their payphone outside the Union
// Hall. The Gnomes' strikers have held the rail yard's gates on Union Street since Tuesday, and the Rust Monks (who
// scab for whoever pays) have blockaded the street to starve them out. Shop Steward Bramble's soup van waits at the
// curb by the hall: drive it to the picket, whole. Union Street runs one way, west, so every way to the gates comes
// along it past the blockade: two Scrappers up on its sidewalks and the Monks at their posts beside them, two with
// nail guns and two with bats for a van that slows (the street's traffic thins out ahead of it: who drives into that?). The strikers have bolted steel sheets to the
// van (it takes half the damage), and a van at less than half its health has spilt the soup. Proves: a delivery with
// health, a blockade.
//   Each stage's setup restores what it needs (s1-holy-rollers.js is the template): the van at its curb (the same spot
//   every time: kept in m.data), the blockade fresh for each try at the drive.
import { defMission } from '../../motor/index.js';

const BRAMBLE = { name: 'Shop Steward Bramble', color: '#ff8ac8' }, PICKET = { name: 'Picket captain', color: '#8affc8' };
const VAN = { def: 'hauler', color: '#f0e4c8' };   // (the strikers' soup van: cream, a pink stripe of tape)
// the picket: Union Street's north lane alongside the rail yard's gates (the street, rows 28-32, one-way west: the way
// in is from the east, past the blockade between Ironside Avenue and the gates)
const DROP = [752, 464], DROP_R = 64, WHOLE = .5;
// the blockade, between Ironside Avenue and the gates: a Scrapper up on each sidewalk (rows 26-27 and 33-34), the
// Monks at their posts by them (Scrappers left in the lanes had jammed the street's traffic, the van stuck in the queue
// under the guns)
const SCRAPPERS = [[880, 432], [968, 544]];
const MONKS = [{ at: [830, 432], gun: true }, { at: [932, 432], gun: false }, { at: [918, 544], gun: false }, { at: [1020, 544], gun: true }];
const BLOCKADE = [920, 488];
const HALL = [304, 952];   // (across Loop Avenue from the Union Hall: the van at the eastbound curb, facing the way it goes)

const vanSpot = m => (m.data.vanAt ||= (q => ({ x: Math.round(q.x), y: Math.round(q.y), heading: +q.heading.toFixed(3) }))(m.curb(HALL, { heading: 0 })));
const van = m => {
  const at = vanSpot(m), v = m.ensure.vehicle('van', VAN.def, at, { heading: at.heading, color: VAN.color }); if (v.damage.share < .95) v.damage.repair();
  v.damage.toughness = .5;   // (the steel sheets)
  return v;
};
// the blockade, fresh (what an earlier try left of it goes first)
function blockade(m) {
  for (const a of [...m.tagged('scrapper'), ...m.tagged('monk')]) m.remove(a);
  for (const at of SCRAPPERS) m.spawn.vehicle('scrapper', at, { tag: 'scrapper', heading: Math.PI, color: '#a8542a', gang: 'monks', locked: true });
  // (a nail gun at a passing van: short bursts, wide of the mark; a bat for one that stops)
  MONKS.forEach((q, i) => m.spawn.ped(i % 2 ? 'monk-enforcer' : 'monk-grunt', q.at, { tag: 'monk', role: 'enemy', gang: 'monks', alert: 160, leash: 40, weapons: q.gun ? ['fists', 'nailgun'] : ['fists', 'slugger'], profile: { range: .55, burst: .3, pause: 1.4, aimOff: .22 } }));
  m.clearTraffic(BLOCKADE, 320);
}

defMission('gnomes_picket_line', {
  title: 'Picket Line', giver: { phone: 'gnomes', at: 'phone-union' }, gang: 'gnomes', tier: 1, requires: ['heist_big_withdrawal'], district: 'ironside',
  brief: ['The Gnomes\' strikers at the rail yard haven\'t eaten since Tuesday.', 'Drive the soup van through the Monks\' blockade on Union Street. Whole.'],
  rewards: { cash: 3000, respect: { gnomes: 15, monks: -10 } },
  bonus: [
    { id: 'time', text: 'Under 4:00', check: m => m.elapsed < 240 },
    { id: 'clean', text: 'The van above 80%', check: m => (m.data.health ?? 0) > .8 },
  ],
  stages: [
    { id: 'call', setup() {}, *run(m) {
      yield m.say(['Bramble here, shop steward. The strike\'s on at the rail yard gates.', 'Our lot haven\'t eaten since Tuesday, and the Monks have Union Street blocked.', 'The soup van\'s outside the hall. Get it through. Don\'t spill it.'], BRAMBLE);
    } },
    {
      id: 'van',
      setup(m) { const v = van(m); if (m.dist(v) > 700) m.place('player', [v.x - 30, v.y - 40]); },   // (a deep link: on the forecourt beside it)
      *run(m) { yield m.enter('van', { text: 'Take the soup van outside the Union Hall', lost: 'the van\'s gone' }); },
    },
    {
      id: 'picket',
      // the van at the hall, the player at its wheel (a retry: a fresh van back at its curb), the blockade up
      setup(m) {
        const at = vanSpot(m), old = m.one('van');
        if (old && (Math.hypot(old.x - at.x, old.y - at.y) > 80 || old.damage.share < .95)) m.remove(old);
        const v = van(m); if (m.vehicle !== v) m.place('player', { in: v });
        blockade(m);
      },
      *run(m) {
        yield m.parallel([
          m.say(['The Monks are on Union Street, a block short of the gates.', 'Keep your foot down and your head lower.'], BRAMBLE),
          m.deliver({ what: 'van', to: DROP, radius: DROP_R, stopped: true, health: WHOLE, lost: 'the van\'s gone', damaged: 'the soup\'s all over Union Street', text: 'Drive the soup through the blockade to the picket at the rail yard gates (above 50%)' }),
        ]);
        const v = m.one('van'); m.data.health = v ? v.damage.share : 0;
        yield m.say(['Soup! Real soup! Solidarity, comrade.'], PICKET);
        yield m.say(['That\'s the picket fed. The Monks will remember that.', 'So will we.'], BRAMBLE);
      },
    },
  ],
});
