// Ironside's Moto Tokens (EXPANSION.md 5, X4): 15 of them, as Lowtown's moto-tokens.js: on roofs a ped can climb to,
// on the yards' containers, the crusher and a transformer, and in the yards (under the Flyover's spur), on the slag
// tip, in the allotments and on the runway (the decks are the traffic's: a body walking up a ramp's lane was knocked
// back down it by every car). Every spot stands on what the district fixes whatever the seed
// (a landmark's walls, yards and props, the decks), never on a lot the seed fills. Each spot: { id, at: [x, y, z],
// via } as Lowtown's (the way there for the bot campaign).
import { def } from '../../motor/index.js';

const ROOF = 24;

def('collectibles', 'moto-tokens-ironside', {
  name: 'Moto Tokens', district: 'ironside', reward: 100, bonus: 1500,
  spots: [
    // ---- the Foundry
    { id: 'mt-sooty-yard', at: [392, 392, 0], via: [] },                              // in St. Sooty's yard
    { id: 'mt-union-forecourt', at: [424, 776, 0], via: [] },                         // the east end of the Union Hall's forecourt
    { id: 'mt-rail-container', at: [832, 352, 16], via: [[832, 372]] },               // up on the blue container in the rail yard
    { id: 'mt-smelting-yard', at: [904, 776, 0], via: [] },                           // the smelters' yard
    // ---- Scrapyard Flats
    { id: 'mt-cathedral-container', at: [896, 1152, 16], via: [[878, 1152]] },        // up on a container in the Scrap Cathedral's yard
    { id: 'mt-cathedral-yard', at: [632, 1080, 0], via: [] },                         // the Cathedral yard's west side
    { id: 'mt-monk-crusher-top', at: [312, 1448, 30], via: [[312, 1428]] },           // up on the crusher at Monk & Sons
    { id: 'mt-spray-west-roof', at: [624, 1424, ROOF], via: [[598, 1424]] },          // Spray & Pray West's roof, up from its west side
    { id: 'mt-kwik-lux-ironside-roof', at: [840, 1384, ROOF], via: [[840, 1357]] },   // the Ironside Kwik-Lux's roof, up from Crusher Lane
    { id: 'mt-flyover-end', at: [744, 1200, 0], via: [] },                            // under the end of the Flyover's spur, in the Monks' yard
    // ---- Voltage Row
    { id: 'mt-slag-tip', at: [1200, 240, 0], via: [] },                               // on the slag tip, west of the Slag Heap's landing
    { id: 'mt-substation-transformer', at: [1160, 760, 20], via: [[1160, 773]] },     // up on a transformer in Substation 9's yard
    { id: 'mt-pylon-strip', at: [1560, 1128, 0], via: [] },                           // under the pylons south of Loop Avenue
    { id: 'mt-allotments', at: [1368, 1192, 0], via: [] },                            // among the allotments' beans
    { id: 'mt-hangar-back', at: [1800, 1416, 0], via: [] },                           // behind the Airstrip's hangar
  ],
});
