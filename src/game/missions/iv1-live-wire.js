// IV1 · Live Wire (EXPANSION.md 4, X3): the Volt Boys' first job, from their payphone outside Substation 9, played as
// Viv. Somebody walked off with three of the Substation's transformers, and Sparky knows who: the Rust Monks, who sell
// anything with copper in it. They are stacked in the Scrap Cathedral's yard, and the Monks guard it, watching the
// streets round it. Sparky wants a photo for the insurance: in from Loop Avenue down the yard's east side, behind the
// guard on the Ironside Avenue side, along the yard's south edge behind the two watching Crusher Lane, one photo with
// the Snap, and out the way she came. Being seen blows it. Proves: stealth outdoors, the photo.
//   The guards stand their posts facing out (south, south, east, west): the way in runs inside them, behind their
//   backs and outside every cone, so a player who keeps to the yard is never seen. The transformers are mission props.
import { defMission } from '../../motor/index.js';

const SPARKY = { name: 'Sparky', color: '#ffd23a' }, VIV = { name: 'Viv', color: '#3ad0c8' };
const MEET = [880, 976];   // (the block's north sidewalk, at the yard's north-east corner: out of every guard's sight)
const LOOT = [[720, 1192], [760, 1192], [800, 1192]], SHOT = [760, 1192], SPOT = [832, 1184];   // (the transformers along the yard's south edge; where they are shot from)
// the way in: into the yard's north row, down its east side between the Cathedral and the containers (a cell east
// round the scrap pile halfway down), round into the south row, to the spot; out again the same way
const IN = [[880, 1000], [876, 1020], [876, 1092], [892, 1112], [876, 1132], [876, 1176], SPOT];
const OUT = [SPOT, [876, 1176], [876, 1132], [892, 1112], [876, 1092], [876, 1020], [880, 1000], MEET];
const GUARDS = [
  { tag: 'g-lane', arch: 'monk-grunt', at: [720, 1240], facing: Math.PI / 2 },     // (Crusher Lane's sidewalk, west)
  { tag: 'g-gate', arch: 'monk-enforcer', at: [848, 1240], facing: Math.PI / 2 },  // (Crusher Lane's sidewalk, east)
  { tag: 'g-ave', arch: 'monk-grunt', at: [952, 1080], facing: 0 },                // (the Ironside Avenue side)
  { tag: 'g-forge', arch: 'monk-grunt', at: [568, 1100], facing: Math.PI },        // (the Forge Street side)
];
const near = (m, q, r) => Math.hypot(m.player.x - q[0], m.player.y - q[1]) < r;
const made = m => GUARDS.some(g => m.alerted(g.tag));
function loot(m) { if (!m.one('loot')) for (const at of LOOT) m.spawn.prop('transformer', at, { tag: 'loot', heading: Math.PI / 2 }); }

defMission('volts_live_wire', {
  title: 'Live Wire', giver: { phone: 'volts' }, gang: 'volts', tier: 1, requires: ['heist_big_withdrawal'], district: 'ironside', plays: 'viv',
  brief: ['The Rust Monks stole three of the Substation\'s transformers.', 'Photograph them in the Scrap Cathedral\'s yard. Nobody sees you.'],
  rewards: { cash: 3000, respect: { volts: 15, monks: -10 } },
  bonus: [{ id: 'time', text: 'Under 3:30', check: m => m.elapsed < 210 }],
  stages: [
    { id: 'call', setup(m) { m.as('viv'); }, *run(m) {
      yield m.say(['Sparky, Volt Boys. Somebody nicked three of our transformers.', 'They\'re in the Monks\' yard at the Scrap Cathedral. I need a photo for the insurance.', 'The Monks watch the streets, not their own yard. Go in quiet.'], SPARKY);
    } },
    { id: 'meet', setup(m) { m.as('viv'); loot(m); }, *run(m) {
      yield m.reach(MEET, { radius: 48, text: 'Get to the Scrap Cathedral\'s yard, at its north-east corner on Loop Avenue' });
    } },
    {
      id: 'sneak',
      // the guards at their posts (fresh on a retry), Viv at the corner with the Snap and nothing else
      setup(m) {
        m.as('viv'); loot(m);
        m.place('player', MEET, { within: 60 });
        m.loadout({ weapons: ['snap'], only: true, select: 'fists' });
        for (const g of GUARDS) m.ensure.ped(g.tag, g.arch, g.at, { role: 'guard', facing: g.facing, gang: 'monks' });
      },
      *run(m) {
        m.failIf(made, 'the Monks saw you'); m.music('tension');
        m.marker(SPOT, { color: '#c88aff', r: 10 });
        m.objective('Sneak down the yard\'s east side and along its south edge to the transformers. Stay behind the guards', { hint: { kind: 'stealth', path: IN } });
        yield m.waitUntil(mm => near(mm, SPOT, 12));
        yield m.photo(SHOT, { from: SPOT, range: 120, text: 'Photograph the stolen transformers (the Snap)' });
        yield m.say(['Got them. Serial numbers and all.'], VIV);
        m.objective('Get out the way you came', { hint: { kind: 'stealth', path: OUT } });
        yield m.waitUntil(mm => near(mm, MEET, 24));
        yield m.say(['That\'s our serial numbers! The Monks are going to pay for those.', 'Nice work. The Volt Boys owe you one.'], SPARKY);
      },
    },
  ],
});
