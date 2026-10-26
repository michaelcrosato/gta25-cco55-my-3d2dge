// Glass Heights' landmarks (EXPANSION.md 2.3), as Lowtown's landmarks.js: each claims its lots in a block before the
// neighbourhood fills the rest, and names its points of interest. Rects are tile cells, inclusive. The blocks lie
// between the roads: x 17-33, 43-57, 71-87 and 97-112; y 11-25, 35-49, 63-75 and 85-95. The bay is x 0-7 and the sea
// rows 105-111: a jetty or a pier out into them is a lot of its own.
import { def } from '../../../motor/index.js';

const L = (id, name, lots, pois = [], props = []) => def('landmarks', id, { district: 'glass-heights', name, lots, pois, props });
const glass = (side, top, o = {}) => ({ side, top, face: `${side} metal`, roof: 'slab', windows: { lit: .55, w: 6, h: 8 }, ...o });
const marble = (side, top, o = {}) => ({ side, top, face: 'stone', roof: 'slab', windows: { lit: .4, w: 5 }, ...o });
const stucco = (side, top, o = {}) => ({ side, top, face: 'plaster', roof: 'tiles', windows: { lit: .35 }, ...o });

// Cathedral Hill
// (the Glass Tower over the bay, the Heights' tallest, its jetty out into the water across Bayshore Drive: a seaplane
// moors by it, EXPANSION.md GH2)
L('glass-tower', 'The Glass Tower', [{ rect: [19, 12, 31, 22], kind: 'building', storeys: 12, look: glass('#8ab0d8', '#4a5a6a', { windows: { lit: .6, w: 6, h: 10 }, door: { chance: 1, color: '#2a3a4a' } }), sign: { text: 'GLASS TOWER', color: '#7af0ff' } },
  { rect: [17, 23, 33, 25], kind: 'plaza', surface: 'plaza' }, { rect: [2, 15, 7, 18], kind: 'pier', surface: 'pier' }],
  [{ id: 'glass-tower', kind: 'landmark', at: [25, 26], label: 'The Glass Tower' }, { id: 'tower-jetty', kind: 'landmark', at: [5, 16], label: "The Tower's jetty" }],
  [{ kind: 'aerial', at: [22.5, 14.5], z: 288, roof: true }, { kind: 'dish', at: [28.5, 19.5], z: 288, roof: true }]);
L('st-chrome', "St. Chrome's Cathedral", [{ rect: [45, 12, 55, 21], kind: 'building', storeys: 5, look: marble('#ece8e0', '#b89a4a', { windows: { lit: .5, w: 4, h: 10 }, door: { chance: 1, color: '#c8a04a' } }), sign: { text: "ST CHROME'S", color: '#ffd23a' } },
  { rect: [43, 22, 57, 25], kind: 'plaza', surface: 'plaza' }],
  [{ id: 'st-chrome', kind: 'landmark', at: [50, 26], label: "St. Chrome's Cathedral" }, { id: 'phone-chrome', kind: 'payphone', at: [44, 26] }]);
L('bellevue', 'The Bellevue', [{ rect: [73, 12, 85, 21], kind: 'building', storeys: 8, look: marble('#e8e4dc', '#7a7a78', { windows: { lit: .55, w: 5 }, door: { chance: 1, color: '#3a5a8a' } }), sign: { text: 'THE BELLEVUE', color: '#ff8ac8' } },
  { rect: [71, 22, 87, 25], kind: 'plaza', surface: 'plaza' }],
  [{ id: 'safehouse', kind: 'safehouse', at: [79, 26], label: 'The penthouse at the Bellevue' }, { id: 'heights-board', kind: 'landmark', at: [74, 26], label: 'The planning board' }]);
L('observatory', 'The Observatory', [{ rect: [100, 13, 109, 20], kind: 'building', storeys: 3, look: marble('#e0e0e4', '#9aa0aa', { windows: { lit: .3, w: 4 } }), sign: { text: 'OBSERVATORY', color: '#c8b8ff' } },
  { rect: [97, 21, 112, 25], kind: 'plaza', surface: 'plaza' }],   // (its forecourt paved: the Saints' car meet's, Flare Up's: on a lawn, its trees had stood in the cars)
  [{ id: 'observatory', kind: 'landmark', at: [104, 26], label: 'The Observatory' }],
  [{ kind: 'tank', at: [104.5, 16.5], z: 72, roof: true }]);

// The Strip
L('hotel-riviera', 'Hotel Riviera', [{ rect: [72, 36, 86, 45], kind: 'building', storeys: 8, look: stucco('#e88aa8', '#6a3a4a', { windows: { lit: .65, w: 5 }, door: { chance: 1, color: '#d8b04a' } }), sign: { text: 'HOTEL RIVIERA', color: '#ff5ac8' } },
  { rect: [71, 46, 87, 49], kind: 'plaza', surface: 'plaza' }],
  [{ id: 'hotel-riviera', kind: 'landmark', at: [79, 50], label: 'Hotel Riviera' }]);
L('heights-pd', 'Heights PD', [{ rect: [99, 36, 110, 44], kind: 'building', storeys: 4, look: marble('#c8ccd8', '#4a5468', { windows: { lit: .6, w: 5 } }), sign: { text: 'HEIGHTS PD', color: '#5a8aff' } },
  { rect: [97, 45, 112, 49], kind: 'yard', surface: 'yard' }],
  [{ id: 'precinct', kind: 'police', at: [104, 50], label: 'Heights PD' }]);
// (the Velvet Casino on Loop Avenue's south side, its forecourt on the avenue: the Syndicate's HQ and House Edge's,
// EXPANSION.md X6; its doors on the forecourt, the fire escape off its roof down to Casino Row behind)
L('velvet-casino', 'The Velvet Casino', [{ rect: [43, 63, 57, 65], kind: 'plaza', surface: 'plaza' }, { rect: [44, 66, 56, 75], kind: 'building', storeys: 4, look: { side: '#5a2a5e', top: '#c8a04a', face: 'plaster', roof: 'slab', windows: { lit: .8, w: 6, h: 4 }, door: { chance: 1, color: '#d8b04a' } }, sign: { text: 'VELVET CASINO', color: '#ff4ad8' } }],
  [{ id: 'velvet-casino', kind: 'landmark', at: [50, 62], label: 'The Velvet Casino' }, { id: 'phone-velvet', kind: 'payphone', at: [43, 62] },
    { id: 'casino-door', kind: 'door', interior: 'velvet-casino', at: [50, 65], label: 'The Velvet Casino' }, { id: 'casino-back', kind: 'door', interior: 'velvet-casino', at: [50, 76], label: 'The fire escape' }],
  [{ kind: 'fountain', at: [50.5, 64.5] }, { kind: 'ac', at: [47.5, 69.5], z: 96, roof: true }, { kind: 'ac', at: [53.5, 72.5], z: 96, roof: true }, { kind: 'vent', at: [47.5, 73.5], z: 96, roof: true }, { kind: 'dish', at: [54.5, 68.5], z: 96, roof: true }]);
L('grand-palms', 'The Grand Palms', [{ rect: [98, 63, 111, 72], kind: 'building', storeys: 7, look: stucco('#c8a04a', '#5a4a2a', { windows: { lit: .6 }, door: { chance: 1 } }), sign: { text: 'GRAND PALMS', color: '#ffd23a' } },
  { rect: [97, 73, 112, 75], kind: 'plaza', surface: 'plaza' }],
  [{ id: 'grand-palms', kind: 'landmark', at: [104, 76], label: 'The Grand Palms' }]);
L('spray-pray-heights', 'Spray & Pray Heights', [{ rect: [18, 66, 25, 72], kind: 'building', storeys: 1, look: { side: '#5a6a8a', top: '#3a3a44', face: 'plaster', roof: 'plain', windows: { lit: .2 }, door: { chance: 1, w: 12, h: 14 } }, sign: { text: 'SPRAY & PRAY', color: '#ff8af0' } }],
  [{ id: 'spray-pray', kind: 'shop', shop: 'respray', at: [21, 62], label: 'Spray & Pray Heights' }]);

// Marina Heights
L('heights-general', 'Heights General', [{ rect: [45, 86, 55, 93], kind: 'building', storeys: 4, look: marble('#f0f0f0', '#7a8a9a', { windows: { lit: .6, w: 5 } }), sign: { text: 'HEIGHTS GENERAL', color: '#ff4a4a' } },
  { rect: [43, 94, 57, 95], kind: 'yard', surface: 'yard' }],
  [{ id: 'hospital', kind: 'hospital', at: [50, 96], label: 'Heights General' }]);
// (the marina's piers out into the sea off Marina Drive's south side, the Yacht Club's the widest: the Gull's moorings
// and the Club's boats, EXPANSION.md X6; the marina's stop four rows short of the map's edge, the Club's three (the
// Gull alongside it), the sea along the shore open to a boat: to row 110 they had walled the marina's west off from the
// Club's east)
L('heights-marina', 'The Marina', [{ rect: [74, 105, 75, 107], kind: 'pier', surface: 'pier' }, { rect: [80, 105, 81, 107], kind: 'pier', surface: 'pier' }, { rect: [86, 105, 87, 107], kind: 'pier', surface: 'pier' }],
  [{ id: 'marina', kind: 'marina', at: [80, 104], label: 'The Marina' }]);
L('yacht-club', 'The Yacht Club', [{ rect: [99, 86, 110, 93], kind: 'building', storeys: 2, look: stucco('#f0f0f4', '#2a3a6a', { face: 'plank', roof: 'slab', windows: { lit: .5, w: 6 }, door: { chance: 1, color: '#2a3a6a' } }), sign: { text: 'YACHT CLUB', color: '#7ab0ff' } },
  { rect: [97, 94, 112, 95], kind: 'plaza', surface: 'plaza' }, { rect: [100, 105, 109, 108], kind: 'pier', surface: 'pier' }],
  [{ id: 'yacht-club', kind: 'landmark', at: [104, 96], label: 'The Yacht Club' }, { id: 'club-pier', kind: 'landmark', at: [104, 106], label: "The Club's pier" }, { id: 'phone-yacht', kind: 'payphone', at: [98, 96] }]);
