// The MPD's response by star (PLAN.md 8.13's dispatch tiers): how many of each unit the stars send, and what they do.
//   1 star: the nearest patrol car and the officers on foot, who try to arrest first;
//   2: more cruisers, and they shoot;
//   3: the MPD Eye overhead (its searchlight at night) and roadblocks ahead of a driving player;
//   4: SWAT in their vans, and spike strips;
//   5: the Feds in black sedans, flanking (D19: with the Buzzsaw: the slice has no rifle).
import { def } from '../motor/index.js';

const T = (stars, spec) => def('policeTiers', String(stars), spec);
T(1, { cruisers: 1 });
T(2, { cruisers: 2, shoot: true });
T(3, { cruisers: 3, shoot: true, chopper: true, roadblocks: 1 });
T(4, { cruisers: 2, swat: 2, shoot: true, chopper: true, roadblocks: 2, spikes: 1 });
T(5, { cruisers: 2, swat: 1, feds: 3, shoot: true, chopper: true, roadblocks: 2, spikes: 2, flank: true });
