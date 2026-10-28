// Glass Heights' Moto Tokens (EXPANSION.md 5, X7): 15 of them, as Ironside's: on the ground the district fixes whatever
// the seed (the landmarks' forecourts, yards, lawns and piers, the walks by the water), never on a lot the seed fills.
// Each spot: { id, at: [x, y, z], via } as Lowtown's (the way there for the bot campaign).
import { def } from '../../motor/index.js';

const C = (x, y) => [x * 16 + 8, y * 16 + 8, 0];

def('collectibles', 'moto-tokens-heights', {
  name: 'Moto Tokens', district: 'glass-heights', reward: 100, bonus: 1500,
  spots: [
    // ---- Cathedral Hill
    { id: 'mt-tower-jetty', at: C(3, 16), via: [] },              // out at the end of the Glass Tower's jetty
    { id: 'mt-tower-forecourt', at: C(18, 24), via: [] },         // the west end of the Glass Tower's forecourt
    { id: 'mt-hill-park', at: C(30, 11), via: [] },               // in the park along Summit Road, under the tower
    { id: 'mt-observatory', at: C(112, 21), via: [] },            // the Observatory forecourt's north-east corner
    // ---- the Strip
    { id: 'mt-riviera-plaza', at: C(72, 48), via: [] },           // the Hotel Riviera's plaza, its south-west corner
    { id: 'mt-pd-yard', at: C(98, 47), via: [] },                 // Heights PD's yard
    { id: 'mt-casino-forecourt', at: C(44, 63), via: [] },        // the Velvet Casino's forecourt, by the payphone
    { id: 'mt-palms-forecourt', at: C(97, 75), via: [] },         // the west end of the Grand Palms' forecourt
    { id: 'mt-spray-plaza', at: C(17, 74), via: [] },             // behind Spray & Pray Heights
    // ---- Marina Heights
    { id: 'mt-hospital-yard', at: C(44, 95), via: [] },           // Heights General's yard
    { id: 'mt-villa-lawn', at: C(86, 94), via: [] },              // Villa Marisol's lawn, its far corner
    { id: 'mt-heights-marina', at: C(80, 107), via: [] },         // out at the end of the marina's middle pier (its id the Heights': Lowtown has an mt-marina-pier)
    { id: 'mt-club-pier', at: C(101, 107), via: [] },             // on the Yacht Club's pier
    { id: 'mt-club-plaza', at: C(112, 95), via: [] },             // the Yacht Club's plaza, its east end
    { id: 'mt-bayshore', at: C(8, 90), via: [] },                 // on the walk along the bay, south of the Causeway
  ],
});
