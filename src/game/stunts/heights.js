// Glass Heights' three stunt jumps (EXPANSION.md 5, X7; D44), as Ironside's: each counts when the car leaves the ground
// inside its takeoff circle and lands upright far enough on; each has an approach, where a run-up from a standstill
// flat out at the takeoff makes it (the bot campaign's way).
//   - The Villa Pool: Villa Marisol's garden on Heights Avenue, a kicker up off the avenue's east sidewalk, eastbound
//     over the pool onto a landing on the far lawn (the run-up from the avenue).
//   - The Velvet Fountain: the Velvet Casino's forecourt, a kicker up off Heights Avenue's west sidewalk, westbound
//     over the fountain, down on the forecourt by the doors.
//   - The Palms Newsstand: the Grand Palms' forecourt, a kicker up off Bluewater Drive's west sidewalk, westbound over
//     the hotel's newsstand, down on the forecourt's west end.
// The kickers and the landing are this file's landmark's decks, of kind 'ramp' (terrain: no lanes, nothing piled on or
// against them).
import { def } from '../../motor/index.js';

def('landmarks', 'stunt-ramps-heights', {
  district: 'glass-heights', name: 'Stunt ramps',
  decks: [
    // the Villa Pool: a kicker 32 u up over six cells, east from the garden's west edge to the pool's; a landing 12 u
    // up past the pool, down east to the lawn
    { id: 'villa-kicker', kind: 'ramp', surface: 'plaza', z: 32, width: 3, path: [[77, 91]], railing: false, ramps: [{ at: [77, 91], dir: 'W', length: 6 }] },
    { id: 'villa-landing', kind: 'ramp', surface: 'plaza', z: 12, width: 3, path: [[81, 91]], railing: false, ramps: [{ at: [81, 91], dir: 'E', length: 3 }] },
    // the Velvet Fountain: a kicker 28 u up over four cells, west from the forecourt's east edge to the fountain's basin
    { id: 'fountain-kicker', kind: 'ramp', surface: 'plaza', z: 28, width: 3, path: [[53, 64]], railing: false, ramps: [{ at: [53, 64], dir: 'E', length: 4 }] },
    // the Palms Newsstand: a kicker 28 u up over four cells, west from the forecourt's east edge
    { id: 'palms-kicker', kind: 'ramp', surface: 'plaza', z: 28, width: 3, path: [[108, 74]], railing: false, ramps: [{ at: [108, 74], dir: 'E', length: 4 }] },
  ],
});

def('stunts', 'villa-pool', { name: 'The Villa Pool', district: 'glass-heights', takeoff: [1240, 1464], r: 40, minDist: 45, minAir: .3, reward: 750, approach: [1032, 1464] });
def('stunts', 'velvet-fountain', { name: 'The Velvet Fountain', district: 'glass-heights', takeoff: [856, 1032], r: 40, minDist: 50, minAir: .3, reward: 500, approach: [952, 1032] });   // (the run-up from the avenue's west walk, the kicker's own climb the rest: across the Strip's lanes, its traffic had stopped the car short each try)
def('stunts', 'palms-newsstand', { name: 'The Palms Newsstand', district: 'glass-heights', takeoff: [1736, 1192], r: 40, minDist: 40, minAir: .3, reward: 500, approach: [1880, 1192] });
