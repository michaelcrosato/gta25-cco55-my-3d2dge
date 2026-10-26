// Glass Heights' fleet (EXPANSION.md 2.3), as Lowtown's fleet.js: cars and bikes along the curbs by neighbourhood, the
// landmarks' own vehicles at their doors (cruisers at Heights PD, the Medic at Heights General, a Zephyr GT under the
// Riviera's awning, a Saint at St. Chrome's, the Cortez by the safehouse, a Fed Sedan at the Grand Palms); the Gull at
// its moorings off the Yacht Club's pier, the MPD Eye over the Strip, and the traffic and the crowd round the focus.
// The Heights drive the dearest cars in the city, and the Strip never sleeps.
import { def } from '../../../motor/index.js';

def('fleets', 'glass-heights', {
  district: 'glass-heights',
  curb: { every: 6, chance: .4, roles: ['civilian'], classes: ['car', 'bike'] },
  spots: [
    { def: 'cruiser', near: 'precinct', n: 2 }, { def: 'medic', near: 'hospital' }, { def: 'zephyr', near: 'hotel-riviera' },
    { def: 'saint', near: 'st-chrome' }, { def: 'cortez', near: 'safehouse' }, { def: 'fedsedan', near: 'grand-palms' },
  ],
  water: [{ def: 'gull', at: [111.5, 108.5], heading: 'E' }],   // (moored alongside the Club's pier's east side, its nose out to sea)
  air: [{ def: 'eye', alt: 150, patrol: [[64, 56], [92, 30], [38, 30], [38, 80], [92, 80]] }],
  traffic: { hoods: { strip: 1.1, hill: .8, marina: .75 }, roles: ['civilian'], classes: ['car', 'truck', 'bike'] },
  crowd: {
    hoods: { strip: 1.2, hill: .75, marina: .8 },
    patrols: [{ arch: 'mpd', n: 2, near: 'precinct', r: 320 }],
  },
});
