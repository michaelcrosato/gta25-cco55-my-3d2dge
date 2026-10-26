// IM2 · Sermon on the Mound (EXPANSION.md 4, X3): the Rust Monks' second job. Brother Ferrous preaches from the scrap
// mound in Monk & Sons' crusher yard every Sunday, and the Volt Boys mean to break it up: three waves of them come in
// off Crusher Lane, Zap-O-Matics crackling. The Monks hand over a Nail Gun: hold the yard till the last of them is down.
// Then the raid's Bucket makes off with the collection: take the Monks' car at the gate after it, and stop it (wrecked,
// or caught and stopped). Proves: waves, a chase.
//   The waves come in from the yard's gate on Crusher Lane one after another, each when the last is down; the Bucket
//   runs rings round the yard's block, its crew jeering at the sermon, to shake the player off (X4: it had fled anywhere at all,
//   and the bot's Brute, behind it, met Ironside's worst: wedged at the world's edge, the Bucket waited while the chase
//   stood in a jam at the west bridge's lights for the rest of the hour, three times over in a campaign).
import { defMission } from '../../motor/index.js';

const FERROUS = { name: 'Brother Ferrous', color: '#d8903a' };
const YARD = [304, 1440], PULPIT = [216, 1488];   // (the crusher yard; the mound Ferrous preaches from)
const HOLD = [288, 1400];   // (where the player stands to hold it: in front of the crusher, the gate in sight)
// each wave's raiders come in off Crusher Lane by the yard's gate, a few steps apart
const WAVES = [
  [[400, 1320], [432, 1304], [464, 1328]],
  [[400, 1312], [440, 1336], [376, 1296], [480, 1312]],
  [[392, 1320], [432, 1304], [472, 1336], [512, 1312]],
];
const CAR = [440, 1272];   // (the Monks' Brute at the gate's curb)
const BUCKET = [520, 1288];   // (the raid's Bucket, waiting on Crusher Lane)
// (its run, round the crusher yard's block: south down Forge Street, west on River Road, north up Picket Row, east on
// Crusher Lane past the gate, and again; Ironside Avenue meets Crusher Lane under the Flyover, and a run by it had gone
// round the whole district, through the west bridge's lights)
const RUN = [[530, 1450], [300, 1618], [94, 1450], [300, 1280]];

function raid(m, i) {
  WAVES[i].forEach((at, k) => m.spawn.ped(k === 3 ? 'volt-enforcer' : 'volt-grunt', at, { tag: 'wave' + i, role: 'enemy', gang: 'volts', attack: true, weapons: ['fists', 'zapomatic'], profile: { range: .5, burst: .5, pause: 1, aimOff: .15 } }));
}

defMission('monks_sermon_mound', {
  title: 'Sermon on the Mound', giver: { phone: 'monks' }, gang: 'monks', tier: 2, requires: ['monks_holy_scrap'], district: 'ironside',
  brief: ['The Volt Boys mean to break up Brother Ferrous\'s sermon.', 'Hold the crusher yard, then catch the Bucket with the collection.'],
  rewards: { cash: 4000, respect: { monks: 15, volts: -10 } },
  bonus: [
    { id: 'time', text: 'Under 5:00', check: m => m.elapsed < 300 },
    { id: 'ferrous', text: 'Brother Ferrous unhurt', check: m => { const f = m.one('ferrous'); return !!f && f.vitals.health >= f.vitals.maxHealth; } },
  ],
  stages: [
    { id: 'call', setup() {}, *run(m) {
      yield m.say(['Sunday, brother. I preach from the mound in the crusher yard.', 'The Volt Boys have sworn to break it up. They will try.', 'Come and keep the peace. With a nail gun.'], FERROUS);
    } },
    {
      id: 'hold',
      // Ferrous on the mound, the player in front of the crusher with a Nail Gun, the waves to come (fresh each try)
      setup(m) {
        for (let i = 0; i < WAVES.length; i++) for (const p of m.tagged('wave' + i)) m.remove(p);
        m.ensure.ped('ferrous', 'monk-enforcer', PULPIT, { name: 'Brother Ferrous', facing: -Math.PI / 2, weapons: ['fists'] });
        if (m.dist(YARD) > 160) m.place('player', HOLD);
        m.loadout({ weapons: ['nailgun'], ammo: { nailgun: 800 }, select: 'nailgun', health: 100, armor: 100 });
        m.wanted.clear();
      },
      *run(m) {
        m.allowWanted();   // (the shooting's heat: the Monks' yard, the Monks' business)
        m.wanted.cap(0);
        yield m.say(['Brothers! Sisters! Scrap is holy, for it was once a car!'], FERROUS);
        for (let i = 0; i < WAVES.length; i++) {
          raid(m, i);
          yield m.parallel([
            m.say([['Here they come. Sparks and all.', 'More of them! Keep the faith!', 'The last of them. Smite them, brother!'][i]], FERROUS),
            m.kill('wave' + i, { text: `Hold the yard: the Volt Boys' raid, wave ${i + 1} of ${WAVES.length}` }),
          ]);
        }
      },
    },
    {
      id: 'bucket',
      // the raid's Bucket on Crusher Lane with the collection, making off; the Monks' Brute at the gate
      setup(m) {
        m.ensure.ped('ferrous', 'monk-enforcer', PULPIT, { name: 'Brother Ferrous', facing: -Math.PI / 2, weapons: ['fists'] });
        for (const b of m.tagged('bucket')) m.remove(b);
        const q = m.curb(CAR), car = m.ensure.vehicle('ride', 'brute', q, { heading: q.heading, color: '#a8542a' }); if (car.damage.share < .6) car.damage.repair();
        if (m.dist(YARD) > 400) m.place('player', HOLD);
        const b = m.lane(BUCKET); m.spawn.vehicle('bucket', b, { tag: 'bucket', heading: b.heading, driver: 'volt-grunt', gang: 'volts', drive: { route: RUN, loop: true, style: 'fast' } });
        m.wanted.cap(0);
      },
      *run(m) {
        m.allowWanted();
        yield m.parallel([
          m.say(['The collection! Their Bucket has the collection plate!', 'Take our Brute at the gate. Bring it back.'], FERROUS),
          m.chase('bucket', { reach: 72, text: 'Stop the Volt Boys\' Bucket with the collection (the Monks\' Brute is at the gate)', vehicle: 'ride' }),   // (reach: on its tail with it stopped; the truck's half and the Brute's are 50 between their middles, nose to tail)
        ]);
        m.wanted.cap(5); m.wanted.clear();   // (the heat of the yard and the chase, held back while it lasted, gone with them: the Monks' business; lifted alone, it had come down on the crew as four stars)
        yield m.say(['The collection, returned. Every washer and bottle cap.', 'Go in peace, brother. Mostly peace.'], FERROUS);
      },
    },
  ],
});
