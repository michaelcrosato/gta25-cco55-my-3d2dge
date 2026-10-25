// Ironside's fleet (EXPANSION.md 2.2), as Lowtown's fleet.js: cars and bikes along the curbs by neighbourhood, the
// landmarks' own vehicles at their doors (cruisers at the 9th Precinct, the Medic at St. Sooty's, the Hookline at the
// crusher, a Hauler at the rail yard, the Brute at Union Hall, the Cortez by the safehouse), the MPD Eye over the
// works, and the traffic and the crowd round the focus. The works are quieter than Lowtown: fewer cars, fewer people,
// more trucks.
import { def } from '../../../motor/index.js';

def('fleets', 'ironside', {
  district: 'ironside',
  curb: { every: 7, chance: .4, roles: ['civilian'], classes: ['car', 'bike'] },
  spots: [
    { def: 'cruiser', near: 'precinct', n: 2 }, { def: 'medic', near: 'hospital' }, { def: 'hookline', near: 'scrap-crusher' },
    { def: 'hauler', near: 'rail-yard' }, { def: 'brute', near: 'union-hall' }, { def: 'cortez', near: 'safehouse' },
    { def: 'pumper', near: 'power-station' }, { def: 'vandal', near: 'substation' },
  ],
  air: [{ def: 'eye', alt: 150, patrol: [[64, 56], [92, 30], [32, 30], [32, 80], [92, 80]] }],
  traffic: { hoods: { foundry: .85, scrapyard: .7, voltage: .75 }, roles: ['civilian'], classes: ['car', 'truck', 'bike'] },
  crowd: {
    hoods: { foundry: .8, scrapyard: .55, voltage: .6 },
    patrols: [{ arch: 'mpd', n: 2, near: 'precinct', r: 320 }],
  },
});
