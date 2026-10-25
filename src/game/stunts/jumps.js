// Lowtown's five stunt jumps (PLAN.md 9.5). A jump counts when the car leaves the ground inside its takeoff circle and
// lands upright far enough on (play/stunts.js: the first pays its reward). Each has an approach, where a run-up from a
// standstill flat out at the takeoff makes it (the bot campaign's way: driven there, then straight at the takeoff;
// [x, y, z]: up on a deck). The distances are what the slowest cars make (a Retiree, a Saint); a Zephyr flies farther.
//   - The Loop Gap: the Loop's unfinished stub over the construction site ends in thin air, 64 u up: off its end,
//     westbound, over the site (the run-up along the stub from the Loop's west leg).
//   - The Drawbridge: Dock Road's bridge lifts its leaves every three game hours; half raised (on the way up or down)
//     each leaf is a ramp, and a car driven south up the north leaf flies the gap and the south leaf.
//   - Back Across the Canal: the same leaves the other way, north from the harbour side (against Dock Road's one-way
//     traffic, which a raised bridge has stopped). Its takeoff circle is a big one centred south of the bridge: it holds
//     every takeoff from the south leaf's tip and none from the north leaf's (the Drawbridge's, a little north). The
//     first circle that holds a takeoff is the jump's, so this one is registered before the Drawbridge.
//   - The Container Stack: in the Container Yard's south-west corner (its 'container-ramp' point, which no container
//     ever stands on), a kicker up off Brick Lane, over the stacked containers, onto a landing ramp that runs out to
//     Loop Avenue's sidewalk.
//   - The Car Park Roof: there is no parking garage in Lowtown; its nearest equivalent is the half-built car park at the
//     construction site, a deck two storeys up on stilts. Up its ramp off Chapel Street, along the top deck and off
//     its open end, west over the site.
// The last two need ramps the district has none of: they are this file's landmark's decks, of kind 'ramp' (terrain:
// no lanes, never a junction, nothing piled on or against them), which MOTOR folds into the city once landmarks carry
// decks (the extras worker's MOTOR request: world/district.js, nav/roadgraph.js, world/builder.js); until then those
// two can't be jumped. Their slopes are a third and a half (a long Saint climbs them), and nothing of theirs stands on a
// road or a lane.
import { def } from '../../motor/index.js';

def('landmarks', 'stunt-ramps', {
  district: 'lowtown', name: 'Stunt ramps',
  decks: [
    // the Container Stack: a kicker 32 u up over six cells, north from Brick Lane's sidewalk; a gap of three cells over
    // the yard; a landing ramp from 16 u down to the yard's north edge
    { id: 'container-kicker', kind: 'ramp', z: 32, width: 3, path: [[110, 91]], railing: false, ramps: [{ at: [110, 91], dir: 'S', length: 6 }] },
    { id: 'container-landing', kind: 'ramp', z: 16, width: 3, path: [[110, 91]], railing: false, ramps: [{ at: [110, 91], dir: 'N', length: 4 }] },
    // the half-built car park: a top deck 48 u up (two storeys) on stilts in the construction site's south half (clear of
    // the mound, the stub's pillars and Lefty's corner), its ramp down east to the site's frontage, its west end open
    { id: 'car-park', kind: 'ramp', z: 48, width: 3, path: [[19, 95], [15, 95]], railing: false, openEnd: true, pillarEvery: 4, ramps: [{ at: [19, 95], dir: 'E', length: 6 }] },
  ],
});

def('stunts', 'loop-gap', { name: 'The Loop Gap', takeoff: [224, 1456], r: 44, minDist: 55, minAir: .38, reward: 750, approach: [456, 1456, 64] });
def('stunts', 'container-ramp', { name: 'The Container Stack', takeoff: [1760, 1488], r: 40, minDist: 45, minAir: .3, reward: 500, approach: [1760, 1650] });
def('stunts', 'garage-roof', { name: 'The Car Park Roof', takeoff: [224, 1528], r: 40, minDist: 50, minAir: .35, reward: 500, approach: [456, 1528] });   // (the run-up from the site's frontage, off Chapel Street: from the street a car parked at its kerb had stood across it)
def('stunts', 'canal', { name: 'Back Across the Canal', takeoff: [2056, 2198], r: 150, minDist: 50, minAir: .4, reward: 1000, approach: [2056, 2330] });
def('stunts', 'drawbridge', { name: 'The Drawbridge', takeoff: [2036, 2040], r: 48, minDist: 100, minAir: .4, reward: 1000, approach: [2036, 1700] });
