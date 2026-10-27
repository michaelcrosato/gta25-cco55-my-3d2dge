// Glass Heights' fleet (EXPANSION.md 2.3), as Lowtown's fleet.js: cars and bikes along the curbs by neighbourhood, the
// landmarks' own vehicles at their doors (cruisers at Heights PD, the Medic at Heights General, a Zephyr GT under the
// Riviera's awning, a Saint at St. Chrome's, the Cortez by the safehouse, a Fed Sedan and the white limo for hire at the
// Grand Palms); the Gull at its moorings off the Yacht Club's pier, the MPD Eye over the Strip, and the traffic and the
// crowd round the focus.
// The Heights drive the dearest cars in the city, and the Strip never sleeps.
import { def } from '../../../motor/index.js';

def('fleets', 'glass-heights', {
  district: 'glass-heights',
  curb: { every: 6, chance: .4, roles: ['civilian'], classes: ['car', 'bike'] },
  spots: [
    { def: 'cruiser', near: 'precinct', n: 2 }, { def: 'medic', near: 'hospital' }, { def: 'zephyr', near: 'hotel-riviera' },
    { def: 'saint', near: 'st-chrome' }, { def: 'cortez', near: 'safehouse' }, { def: 'fedsedan', near: 'grand-palms' },
    { def: 'limo', near: 'grand-palms' },   // (the hotel's white limo for hire: the Limo job's, X7)
  ],
  // (the Gull moored alongside the Club's pier's east side, its nose out to sea, a door on the pier and the passage
  // along the shore past the pier's end clear of it: off the end, a Regatta had rammed it for good and nobody could
  // board it; the Club's Regatta along the pier's west side; the marina's two Splashes for hire between its piers, X6)
  water: [{ def: 'gull', at: [110.8, 106.6], heading: 'S' }, { def: 'regatta', at: [98.5, 106.5], heading: 'S' },
    { def: 'splash', at: [78, 106.5], heading: 'S' }, { def: 'splash', at: [84, 106.5], heading: 'S' }],
  air: [{ def: 'eye', alt: 150, patrol: [[64, 56], [92, 30], [38, 30], [38, 80], [92, 80]] }],
  traffic: { hoods: { strip: 1.1, hill: .8, marina: .75 }, roles: ['civilian'], classes: ['car', 'truck', 'bike'] },
  crowd: {
    hoods: { strip: 1.2, hill: .75, marina: .8 },
    patrols: [{ arch: 'mpd', n: 2, near: 'precinct', r: 320 }],
  },
});
