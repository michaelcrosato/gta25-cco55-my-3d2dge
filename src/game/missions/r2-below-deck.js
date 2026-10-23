// R2 · Below Deck (PLAN.md 9.4): the Harbor Rats' second job, played as Viv. The Chrome Saints chop their stolen cars
// in Club Chrome's front lot after hours, and Father Fender keeps the books on the workbench by the club's door. Mama
// Bilge wants a photo of that ledger: leverage. Viv meets the Rats' lookout on the corner north of the club, then
// sneaks in round the back: down the club's east side and along its front wall, behind the backs of the Saints
// watching the street (a guard who sees her outdoors fights: being seen blows the job), takes the bench guard down from
// behind, photographs the ledger with the Snap and gets out the way she came. The chop shop is built from mission
// props (crates, pallets, barrels, a scaffold, a stripped Saint) in the lot the plaza already is: no landmark of its
// own. Proves: stealth (E.sees cones), takedowns, the Snap.
//   The guards stand their posts facing out (south, south-east, south-west, west): the lot's path runs north of all
// of them, behind their backs and outside every cone (220 u, 2 rad), so a player who keeps to the wall is never seen.
import { defMission } from '../../motor/index.js';

const BILGE = { name: 'Mama Bilge', color: '#ffd23a' }, VIV = { name: 'Viv', color: '#3ad0c8' };
const MEET = [2296, 540];   // (the north sidewalk at the block's north-east corner: out of every guard's sight)
const BENCH = [2200, 726], SPOT = [2200, 744];   // (the ledger on the workbench by the club's door; where it is shot from)
// the way in: the corner, the club's east side, round its south-east corner, along its front wall close behind the
// bench guard (the takedown: 18 u off, its back turned), on to the bench. The way out is the same, back
const IN = [[2336, 548], [2312, 572], [2312, 704], [2296, 736], [2232, 744], SPOT];
const OUT = [SPOT, [2296, 736], [2312, 704], [2312, 572], [2336, 548]];
const GUARDS = [
  { tag: 'g-bench', arch: 'saint-enforcer', at: [2224, 760], facing: Math.PI / 2 },   // (the bench's: watching the car and the street)
  { tag: 'g-east', arch: 'saint-grunt', at: [2310, 776], facing: Math.PI / 4 },       // (the lot's south-east corner: Seawall Drive)
  { tag: 'g-west', arch: 'saint-grunt', at: [2152, 784], facing: Math.PI * .75 },     // (its south-west corner: Lantern Lane)
  { tag: 'g-dock', arch: 'saint-grunt', at: [2136, 616], facing: Math.PI },           // (the club's west side: Dock Road)
];
// the chop shop: the workbench, crates, pallets, barrels and a scaffold (props: drawn, never solid), and a Saint on its
// way to parts
const PROPS = [
  ['crate', BENCH], ['crate', [2182, 726]], ['pallet', [2220, 726]], ['scaffold', [2150, 728]],
  ['crate', [2328, 616]], ['pallet', [2330, 652]], ['crate', [2328, 688]],
  ['barrel', [2296, 760]], ['barrel', [2288, 752]], ['barrel', [2140, 760]], ['pallet', [2172, 792]],
];
const near = (m, q, r) => Math.hypot(m.player.x - q[0], m.player.y - q[1]) < r;
// a guard of the lot has made her: alerted (it saw her, was hurt, or a mate called it), and not taken down
const made = m => GUARDS.some(g => m.alerted(g.tag));
// the lot as the night has it: its props and the stripped car (kept across the stages: made once)
function shop(m) {
  if (!m.one('shop')) for (const [kind, at] of PROPS) m.spawn.prop(kind, at, { tag: 'shop' });
  m.ensure.vehicle('chopped', 'saint', [2240, 784], { heading: 0, color: '#c8c8d0', locked: true, health: .45 });
}

defMission('rats_below_deck', {
  title: 'Below Deck', giver: { phone: 'rats' }, gang: 'rats', tier: 2, requires: ['rats_rat_run'], plays: 'viv',
  brief: ['The Saints chop cars in Club Chrome\'s lot after hours.', 'Photograph Fender\'s ledger. Nobody sees you.'],
  rewards: { cash: 3500, respect: { rats: 15, saints: -10 } },
  bonus: [
    { id: 'time', text: 'Under 4:00', check: m => m.elapsed < 240 },
    { id: 'takedown', text: 'Took the bench guard down quietly', check: m => m.tagged('g-bench').some(g => g.out) },
  ],
  stages: [
    { id: 'call', setup(m) { m.as('viv'); }, *run(m) {
      yield m.say(['Viv, sweetheart. You were a cop once. Go below deck for me.', 'The Saints chop cars in Club Chrome\'s lot. Fender\'s ledger is on the bench by the door.', 'One photo. Nobody sees you.'], BILGE);
    } },
    { id: 'meet', setup(m) { m.as('viv'); shop(m); }, *run(m) {
      yield m.reach(MEET, { radius: 48, text: 'Meet the lookout on the corner north of Club Chrome' });
      yield m.say(['They watch the street, not the wall. Come in round the back.'], { name: 'Rats lookout', color: '#ffd23a' });
    } },
    {
      id: 'sneak',
      // the lot's guards at their posts (fresh on a retry: what the stage spawned goes first), Viv on the corner with
      // the Snap and nothing else
      setup(m) {
        m.as('viv'); shop(m);
        m.place('player', MEET, { within: 60 });
        m.loadout({ weapons: ['snap'], only: true, select: 'fists' });
        for (const g of GUARDS) m.ensure.ped(g.tag, g.arch, g.at, { role: 'guard', facing: g.facing });
      },
      *run(m) {
        m.failIf(made, 'they made you'); m.music('tension');   // (the score under the sneaking)
        m.marker(SPOT, { color: '#c88aff', r: 10 });
        m.objective('Sneak in round the back: down the club\'s east side and along its front wall to the bench. Stay behind them', { hint: { kind: 'stealth', path: IN } });
        yield m.waitUntil(m => near(m, SPOT, 12));
        yield m.photo(BENCH, { from: SPOT, range: 120, text: 'Photograph the ledger on the bench (the Snap)' });
        yield m.say(['Got it.'], VIV);
        m.objective('Get out the way you came', { hint: { kind: 'stealth', path: OUT } });
        yield m.waitUntil(m => near(m, OUT[OUT.length - 1], 20));
        yield m.say(['Fender keeps neat books. Bless him.', 'Lovely work, Viv. The Saints will be paying the Rats\' bills for a while.'], BILGE);
      },
    },
  ],
});
