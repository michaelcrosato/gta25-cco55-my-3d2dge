// Lowtown's Moto Tokens (PLAN.md 8.16, 9.5): 25 of them on roofs and in the alleys, yards and piers, each one reachable
// on foot. A ped climbs a ledge up to TUNE.climbMax (34 u) with a jump: a one-storey roof (24) from the street, the
// crusher at Crush Hour (30), the fountain in Marquee Plaza and the mound under the Loop gap (10); it walks up the
// Loop's north-west ramp to the deck (64) and out along the unfinished stub. Every spot stands on what the district
// fixes whatever the seed (a landmark's walls, yards, quays, piers and props, the decks), never on a lot the seed fills.
// Each spot: { id, at: [x, y, z] (z: what it stands on), via: [[x, y(, z)]...] (the way there for the bot campaign:
// walked to the first point, then straight at each next one, a jump up each ledge on the way) }. A point of the way
// (and a token on the ground) lies a step into a wall, a railing or the water's edge, so a body walking at it comes to
// rest against it there rather than running past and back.
import { def } from '../../motor/index.js';

const ROOF = 24, DECK = 64;
// the Loop's north-west ramp, walked up its north edge from Loop Avenue (the railing on one hand, the downhill lane 30 u
// off on the other), to the corner square at the top
const UP = [[214, 1203], [456, 1203, 62]];
// the Rats' pier: from Wharf Street's end over the footbridge, then round the boathouse by its walls (west, then south)
const PIER = [[2203, 2250], [2216, 2211], [2333, 2224], [2333, 2280], [2380, 2291]];

def('collectibles', 'moto-tokens', {
  name: 'Moto Tokens', reward: 100, bonus: 2500,
  spots: [
    // ---- Palm Terraces
    { id: 'mt-gas-n-sip-roof', at: [776, 216, ROOF], via: [[776, 173]] },            // the Gas'n'Sip's roof, up from Terrace Road
    { id: 'mt-greasy-spoke-roof', at: [656, 744, ROOF], via: [[656, 803]] },         // the Greasy Spoke's roof, up from Lantern Lane
    { id: 'mt-kwik-lux-palm-roof', at: [1136, 752, ROOF], via: [[1187, 752]] },      // the Palm Kwik-Lux's roof, up from Motor Avenue
    { id: 'mt-chapel-garden', at: [296, 587, 0], via: [] },                          // behind St. Christopher's, in the chapel garden
    { id: 'mt-gutterball-back', at: [712, 957, 0], via: [] },                        // the strip behind Gutterball Lanes
    // ---- Neon Mile
    { id: 'mt-marquee-fountain', at: [1864, 296, 10], via: [[1864, 275]] },          // up on the fountain in Marquee Plaza
    { id: 'mt-marquee-back', at: [1496, 189, 0], via: [] },                          // behind the Hotel Marquee
    { id: 'mt-bank-back', at: [1864, 589, 0], via: [] },                             // behind the First Lowtown Bank
    { id: 'mt-club-chrome-side', at: [2307, 640, 0], via: [] },                      // down the side of Club Chrome
    { id: 'mt-kwik-lux-neon-roof', at: [1928, 1096, ROOF], via: [[1987, 1096]] },    // the Neon Kwik-Lux's roof, up from Dock Road
    // ---- the Loop
    { id: 'mt-loop-ramp-top', at: [470, 1203, DECK], via: UP.slice(0, 1) },          // the top of the north-west ramp
    { id: 'mt-loop-gap-lip', at: [240, 1427, DECK], via: [...UP, [467, 1203, DECK], [467, 1410, DECK], [440, 1427, DECK]] },   // the stub's open end, over the construction site
    // ---- Brickyard
    { id: 'mt-gap-mound', at: [224, 1488, 10], via: [[247, 1488]] },                 // on the mound under the Loop gap
    { id: 'mt-boom-box-roof', at: [672, 1432, ROOF], via: [[589, 1432]] },           // Boom Box Garage's roof, up from Chapel Street
    { id: 'mt-spray-pray-roof', at: [240, 1768, ROOF], via: [[173, 1768]] },         // Spray & Pray's roof, up from Gnome Row
    { id: 'mt-car-wash-roof', at: [656, 1768, ROOF], via: [[589, 1768]] },           // the Palm Car Wash's roof, up from Chapel Street
    { id: 'mt-l-depot', at: [1080, 1752, 0], via: [] },                              // in the L Depot's yard
    { id: 'mt-canal-towpath', at: [1032, 1981, 0], via: [] },                        // the towpath along the canal
    { id: 'mt-crusher-top', at: [712, 2376, 30], via: [[712, 2359]] },               // up on the crusher at Crush Hour
    // ---- Harborfront
    { id: 'mt-fish-market-quay', at: [1496, 1544, 0], via: [] },                     // the Fish Market's quay
    { id: 'mt-cranes-quay', at: [2232, 1544, 0], via: [] },                          // under the cranes
    { id: 'mt-kwik-lux-harbor-roof', at: [1552, 1768, ROOF], via: [[1603, 1768]] },  // the Harbor Kwik-Lux's roof, up from Marquee Street
    { id: 'mt-marina-pier', at: [2377, 1792, 0], via: [[2248, 1779]] },              // the end of the marina's north pier
    { id: 'mt-boathouse-back', at: [2424, 2224, 0], via: [...PIER, [2423, 2291]] },  // behind the Rats' boathouse, out on its pier
    { id: 'mt-lighthouse-quay', at: [2457, 2425, 0], via: [...PIER, [2400, 2349], [2445, 2349]] },   // round the back of the lighthouse
  ],
});
