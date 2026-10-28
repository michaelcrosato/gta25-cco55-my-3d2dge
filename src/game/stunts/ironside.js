// Ironside's three stunt jumps (EXPANSION.md 5, X4), as Lowtown's jumps.js: each counts when the car leaves the ground
// inside its takeoff circle and lands upright far enough on; each has an approach, where a run-up from a standstill flat
// out at the takeoff makes it (the bot campaign's way).
//   - The Flyover's End: the Flyover's unfinished spur (the district's deck) ends in thin air 64 u over the Scrap
//     Cathedral's yard: off its end, westbound past the Cathedral's south wall (the run-up along the spur from the
//     Flyover).
//   - The Slag Heap: on the slag tip north of Substation 9, a kicker up off Union Street's sidewalk, northbound over a
//     gap in the dross, onto a landing heap that runs out to Smelter Street.
//   - The Crusher Yard: in Monk & Sons' yard, a kicker up off Crusher Lane's sidewalk, southbound past the crusher
//     (between it and the yard's east mound), down in the yard's south end.
// The kickers and the landing are this file's landmark's decks, of kind 'ramp' (terrain: no lanes, nothing piled on or
// against them), a third of a slope as Lowtown's.
import { def } from '../../motor/index.js';

def('landmarks', 'stunt-ramps-ironside', {
  district: 'ironside', name: 'Stunt ramps',
  decks: [
    // the Slag Heap: a kicker 32 u up over six cells, north from the slag tip's south edge; a gap of four cells; a
    // landing heap from 16 u down to the tip's north edge
    { id: 'slag-kicker', kind: 'ramp', surface: 'slag', z: 32, width: 3, path: [[79, 19]], railing: false, ramps: [{ at: [79, 19], dir: 'S', length: 6 }] },
    { id: 'slag-landing', kind: 'ramp', surface: 'slag', z: 16, width: 3, path: [[79, 14]], railing: false, ramps: [{ at: [79, 14], dir: 'N', length: 3 }] },
    // the Crusher Yard: a kicker 32 u up over six cells, south from the yard's north edge, east of the crusher
    { id: 'crusher-kicker', kind: 'ramp', z: 32, width: 3, path: [[23, 91]], railing: false, ramps: [{ at: [23, 91], dir: 'N', length: 6 }] },
  ],
});

def('stunts', 'flyover-end', { name: 'The Flyover\'s End', district: 'ironside', takeoff: [752, 1200], r: 44, minDist: 55, minAir: .38, reward: 750, approach: [984, 1200, 64] });
def('stunts', 'slag-heap', { name: 'The Slag Heap', district: 'ironside', takeoff: [1272, 336], r: 40, minDist: 45, minAir: .3, reward: 500, approach: [1272, 488] });
def('stunts', 'crusher-yard', { name: 'The Crusher Yard', district: 'ironside', takeoff: [376, 1440], r: 40, minDist: 45, minAir: .3, reward: 500, approach: [376, 1336] });   // (the run-up from Crusher Lane's south walk, the kicker's own climb the rest: from the lane's middle, its traffic had stopped the car short each try)
