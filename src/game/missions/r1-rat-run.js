// R1 · Rat Run (PLAN.md 9.4): the Harbor Rats' first job, from their payphone at the end of Wharf Street. Mama Bilge's
// van of "seafood" waits at the curb by the boathouse, and the MPD has been sitting on it all week: the moment it moves
// the stakeout lights it up (two stars). Lefty buys it, at the construction site in the Brickyard (off Chapel Street,
// under the Loop gap: the Boom Box's back lot), and he wants no company: pull up there with a star showing and they saw
// you arrive. Lose the police on the way (out of their sight long enough, or through Spray & Pray's respray), then park
// the van in the lot. Proves: wanted, evade, the respray. Unlocks the Persuader at Lead Farm (its unlock is this
// mission's id).
import { defMission } from '../../motor/index.js';

const BILGE = { name: 'Mama Bilge', color: '#ffd23a' }, LEFTY = { name: 'Lefty', color: '#ff5a3a' };
const VAN = { def: 'hauler', color: '#e8c040' };   // (the Rats' yellow, a little dirtier)
const HOME = 'phone-rats';   // (the van parks at the curb nearest the payphone: the end of Wharf Street)
// the drop: the construction site's frontage on Chapel Street, between a lamp post and the Loop's pillars (the lot has
// no random clutter, and Chapel Street parks on its other side: the way in is clear on every seed). A van pulled up in
// Chapel Street's lane alongside it has arrived (56 u off); arriving is stopping there, so driving by is no arrival
const DROP = [464, 1400], DROP_R = 60, BUYER = [392, 1384];   // (Lefty in the lot, off the sidewalk)

// where the van waits (the same spot for every stage and retry: kept in m.data)
const vanSpot = m => (m.data.vanAt ||= m.curb(HOME));
const atDrop = m => Math.hypot(m.mover.x - DROP[0], m.mover.y - DROP[1]) < DROP_R && (m.mover.speed || 0) < 20;
// the stakeout's two stars (never fewer: more stay)
const stakeout = m => { if (m.stars < 2) m.wanted.set(2); m.music('chase'); };

defMission('rats_rat_run', {
  title: 'Rat Run', giver: { phone: 'rats' }, gang: 'rats', tier: 1, requires: ['prologue'], plays: 'any',
  brief: ['Mama Bilge needs a van of "seafood" taken to Lefty, off Chapel Street.', 'The MPD is watching it. Lose them before the drop.'],
  rewards: { cash: 2500, respect: { rats: 15, gnomes: -5 } },
  bonus: [
    { id: 'time', text: 'Under 5:00', check: m => m.elapsed < 300 },
    { id: 'clean', text: 'The van above 75%', check: m => (m.data.health ?? 0) > .75 },
    { id: 'paint', text: 'Lost them at Spray & Pray', check: m => !!m.data.resprayed },
  ],
  stages: [
    { id: 'call', setup() {}, *run(m) {
      yield m.say(['Ahoy, sweetheart. Bilge here.', 'My van by the boathouse is full of seafood. Mostly.', 'Lefty\'s buying, at the building site off Chapel Street.'], BILGE);
    } },
    {
      id: 'van',
      setup(m) {
        const at = vanSpot(m), v = m.ensure.vehicle('van', VAN.def, at, { heading: at.heading, color: VAN.color });
        if (v.damage.share < .6) v.damage.repair();
        if (m.dist(v) > 700) m.place('player', [at.x - 40, at.y - 30]);   // (a deep link: on the sidewalk beside it)
      },
      *run(m) {
        yield m.enter('van', { text: 'Take Mama Bilge\'s van at the end of Wharf Street', lost: 'the van\'s gone' });
        stakeout(m);
      },
    },
    {
      id: 'drop',
      // the van at the boathouse, the player at its wheel and the stakeout on it: as it was the moment it moved (a
      // retry and a deep link start here; on from 'van' nothing changes). Lefty waits in the yard
      setup(m) {
        const at = vanSpot(m), old = m.one('van');
        if (old && Math.hypot(old.x - at.x, old.y - at.y) > 80) m.remove(old);   // (a retry: a fresh van back at the curb)
        const v = m.ensure.vehicle('van', VAN.def, at, { heading: at.heading, color: VAN.color });
        if (v.damage.share < .6) v.damage.repair();
        if (m.vehicle !== v) m.place('player', { in: v });
        stakeout(m);
        m.ensure.ped('lefty', 'lefty', BUYER, { facing: 0 });   // (watching the street)
      },
      *run(m) {
        m.failIf(m => m.stars > 0 && atDrop(m), 'they saw you arrive');
        m.on('respray', e => { const v = m.one('van'); if (v && e.vehicle === v.id) m.data.resprayed = true; });
        m.marker('spray-pray', { color: '#ff8af0', ring: false, label: 'Spray & Pray' });   // (a blip: one way to lose them)
        yield m.parallel([
          m.say(['That\'s the stakeout! Lose them.', 'Spray & Pray paints a van for a hundred bucks. No questions.', 'And nobody follows you to Lefty.'], BILGE),
          m.deliver({ what: 'van', to: DROP, radius: DROP_R, stopped: true, lost: 'the van\'s gone', text: 'Lose the police, then pull up at the building site on Chapel Street' }),
        ]);
        const v = m.one('van'); m.data.health = v ? v.damage.share : 0;
        m.remove(v);   // (Lefty takes it)
        yield m.say(['Smells like low tide. Bilge\'s usual, then.'], LEFTY);
        yield m.say(['Not a whisker on you. That\'s my rat.', 'Lead Farm will sell you a Persuader now. Tell them Bilge sent you.'], BILGE);
      },
    },
  ],
});
