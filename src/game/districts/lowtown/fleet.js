// Lowtown's fleet (PLAN.md 9.6): what is parked where when the city loads. Cars and bikes along the curbs by
// neighbourhood (each definition's spawn zones and weight); the landmarks' own vehicles at their doors (cruisers and the
// Rhino at the precinct, the Medic at the hospital, the Strongbox and a Fed Sedan at the bank, the Pumper and the Drill
// Rig by the L depot, the Hookline at Crush Hour, bikes at the Greasy Spoke...); the Bilge Rat at the marina; two L
// trains on the elevated line; the MPD Eye on its patrol over the district. Definitions not registered are skipped.
import { def } from '../../../motor/index.js';

def('fleets', 'lowtown', {
  district: 'lowtown',
  curb: { every: 6, chance: .45, roles: ['civilian'], classes: ['car', 'bike'] },
  spots: [
    { def: 'cruiser', near: 'precinct', n: 2 }, { def: 'rhino', near: 'precinct' },
    { def: 'medic', near: 'hospital' },
    { def: 'strongbox', near: 'bank-door' }, { def: 'fedsedan', near: 'plaza' },
    { def: 'pumper', near: 'l-depot' }, { def: 'drillrig', near: 'fish-market' }, { def: 'hookline', near: 'crush-hour' },
    { def: 'vandal', near: 'greasy-spoke' }, { def: 'sparrow', near: 'gas-n-sip' },
    { def: 'brute', near: 'boom-box' }, { def: 'zephyr', near: 'hotel-marquee' }, { def: 'saint', near: 'car-wash' },
    { def: 'retiree', near: 'palm-park' }, { def: 'cortez', near: 'safehouse' }, { def: 'hauler', near: 'kwik-lux-harbor' },
  ],
  water: [{ def: 'bilgerat', at: [143.5, 115.4], heading: 'E' }],   // (in the slip, alongside the south pier, bow out to sea)
  rail: [{ deck: 'L', def: 'thel', trains: 2, gauge: 10 }],
  air: [{ def: 'eye', alt: 150, patrol: [[93, 70], [128, 30], [32, 30], [32, 118], [128, 118]] }],
});
