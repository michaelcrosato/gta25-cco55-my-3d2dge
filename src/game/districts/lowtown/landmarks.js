// Lowtown's landmarks (PLAN.md 9.1): each claims its lots in a block before the neighbourhood fills the rest, and
// names its points of interest (doors, payphones, shops, the safehouse). Rects are tile cells, inclusive.
//   lot: { rect, kind: 'building' | 'park' | 'plaza' | 'yard' | 'construction' | 'water' | 'pier', storeys or height,
//          look (wall-type options; floor: the floor a cut-away shows inside), surface, sign: { text, color } }
//   poi: { id, kind, at: [cx, cy] (a walkable cell at the door), label, gang, shop, interior }
import { def } from '../../../motor/index.js';

const L = (id, name, lots, pois = [], props = []) => def('landmarks', id, { district: 'lowtown', name, lots, pois, props });
const look = (side, top, o = {}) => ({ side, top, face: 'plaster', roof: 'slab', windows: { lit: .35 }, ...o });

// Palm Terraces
L('gas-n-sip', "Gas'n'Sip", [{ rect: [37, 11, 51, 19], kind: 'yard', surface: 'yard' }, { rect: [45, 11, 51, 15], kind: 'building', storeys: 1, look: look('#f0e0a8', '#c8423a', { door: { chance: 1 } }), sign: { text: "GAS'N'SIP", color: '#ffd23a' } }],
  [{ id: 'gas-n-sip', kind: 'shop', shop: 'gas', at: [47, 16], label: "Gas'n'Sip" }], [{ kind: 'pump', at: [40, 15] }, { kind: 'pump', at: [40, 17.5] }]);
L('palm-park', 'Palm Park', [{ rect: [61, 11, 73, 25], kind: 'park', surface: 'park' }, { rect: [65, 15, 69, 20], kind: 'water', surface: 'water' }], [{ id: 'palm-park', kind: 'landmark', at: [62, 22], label: 'Palm Park' }]);
L('chapel', "St. Christopher's Chapel", [{ rect: [11, 35, 27, 49], kind: 'park', surface: 'park' }, { rect: [14, 37, 23, 45], kind: 'building', storeys: 2, look: look('#c8c0b0', '#5a4a4a', { face: 'stone', roof: 'tiles', windows: { lit: .6, w: 4, h: 12 } }), sign: { text: 'SAFEHOUSE', color: '#7af0ff' } }],
  [{ id: 'safehouse', kind: 'safehouse', at: [18, 47], label: "St. Christopher's Chapel" }]);
L('greasy-spoke', 'The Greasy Spoke', [{ rect: [37, 43, 44, 49], kind: 'building', storeys: 1, look: look('#d8d8e0', '#c8423a', { face: '#d8d8e0 metal', door: { chance: 1 } }), sign: { text: 'GREASY SPOKE', color: '#ff5a5a' } }],
  [{ id: 'greasy-spoke', kind: 'shop', shop: 'diner', at: [40, 50], label: 'The Greasy Spoke' }]);
L('gutterball', 'Gutterball Lanes', [{ rect: [38, 60, 50, 70], kind: 'building', storeys: 2, look: look('#e8b8c8', '#7a5a6a', { windows: { lit: .5 } }), sign: { text: 'GUTTERBALL', color: '#ff7ac8' } }],
  [{ id: 'gnomes-hq', kind: 'gang', gang: 'gnomes', at: [44, 71], label: 'Gutterball Lanes' }, { id: 'phone-gnomes', kind: 'payphone', gang: 'gnomes', at: [37, 72] }]);
L('lowtown-general', 'Lowtown General', [{ rect: [11, 59, 27, 67], kind: 'building', storeys: 4, look: look('#e8e8ec', '#8a9aa0', { face: 'stone', windows: { lit: .55, w: 5 } }), sign: { text: 'LOWTOWN GENERAL', color: '#ff4a4a' } }, { rect: [11, 68, 27, 71], kind: 'yard', surface: 'yard' }],
  [{ id: 'hospital', kind: 'hospital', at: [19, 70], label: 'Lowtown General' }]);
L('threads', 'Threads', [{ rect: [61, 65, 68, 71], kind: 'building', storeys: 2, look: look('#c8d8e8', '#4a5a6a', { door: { chance: 1 } }), sign: { text: 'THREADS', color: '#7af0ff' } }],
  [{ id: 'threads', kind: 'shop', shop: 'clothes', at: [64, 72], label: 'Threads' }]);
L('kwik-lux-palm', 'Kwik-Lux (Palm)', [{ rect: [67, 44, 73, 49], kind: 'building', storeys: 1, look: look('#f0e0a8', '#3a8a5a', { door: { chance: 1 } }), sign: { text: 'KWIK-LUX', color: '#5aff8a' } }],
  [{ id: 'kwik-lux-palm', kind: 'shop', shop: 'kwiklux', holdup: true, at: [70, 50], label: 'Kwik-Lux' }]);

// Neon Mile
const neon = (side, top, o = {}) => ({ side, top, face: 'stone', roof: 'plain', windows: { w: 3, h: 12, step: 10, lit: .6 }, ...o });
L('hotel-marquee', 'Hotel Marquee', [{ rect: [88, 12, 98, 24], kind: 'building', storeys: 7, look: neon('#5a3a6a', '#2e2a3a'), sign: { text: 'HOTEL MARQUEE', color: '#ff4ad8' } }],
  [{ id: 'hotel-marquee', kind: 'landmark', at: [93, 26], label: 'Hotel Marquee' }]);
L('plaza', 'Marquee Plaza', [{ rect: [109, 11, 123, 25], kind: 'plaza', surface: 'plaza' }], [{ id: 'plaza', kind: 'landmark', at: [116, 18], label: 'Marquee Plaza' }],
  [{ kind: 'fountain', at: [116.5, 18.5], solid: { hx: 18, hy: 18, top: 10 } }]);
L('lead-farm', 'Lead Farm', [{ rect: [133, 19, 140, 25], kind: 'building', storeys: 2, look: neon('#3a3a3e', '#2a2a2e', { windows: { lit: .2 } }), sign: { text: 'LEAD FARM', color: '#ffa23a' } }],
  [{ id: 'lead-farm', kind: 'shop', shop: 'guns', at: [136, 27], label: 'Lead Farm' }]);
L('pixel-palace', 'Pixel Palace', [{ rect: [87, 41, 95, 49], kind: 'building', storeys: 2, look: neon('#2a2a4a', '#1e1e30', { windows: { lit: .8, w: 6, h: 6 } }), sign: { text: 'PIXEL PALACE', color: '#5af0ff' } }],
  [{ id: 'pixel-palace', kind: 'property', property: 'arcade', at: [91, 50], label: 'Pixel Palace' }]);
L('bank', 'First Lowtown Bank', [{ rect: [109, 35, 123, 49], kind: 'plaza', surface: 'plaza' }, { rect: [111, 37, 121, 47], kind: 'building', storeys: 8, look: neon('#8a8070', '#4a4440', { face: 'stone', windows: { w: 4, h: 14, step: 12, lit: .5 }, floor: '#c8bca8' }), sign: { text: 'FIRST LOWTOWN BANK', color: '#ffe066' } }],
  [{ id: 'bank-door', kind: 'door', interior: 'bank', at: [116, 49], label: 'First Lowtown Bank' }]);
L('club-chrome', 'Club Chrome', [{ rect: [133, 45, 144, 49], kind: 'plaza', surface: 'plaza' }, { rect: [134, 36, 143, 44], kind: 'building', storeys: 2, look: neon('#a8b0c0', '#5a6070', { face: '#a8b0c0 metal', windows: { lit: .7 } }), sign: { text: 'CLUB CHROME', color: '#7ae0ff' } }],
  [{ id: 'saints-hq', kind: 'gang', gang: 'saints', at: [138, 46], label: 'Club Chrome' }, { id: 'phone-saints', kind: 'payphone', gang: 'saints', at: [133, 50] }]);
L('precinct', 'MPD 5th Precinct', [{ rect: [87, 59, 99, 67], kind: 'building', storeys: 4, look: neon('#5a6a8a', '#3a4458', { windows: { lit: .6, w: 5 } }), sign: { text: 'MPD', color: '#5a8aff' } }, { rect: [87, 68, 99, 71], kind: 'yard', surface: 'yard' }],
  [{ id: 'precinct', kind: 'police', at: [93, 70], label: 'MPD 5th Precinct' }]);
L('kwik-lux-neon', 'Kwik-Lux (Neon)', [{ rect: [117, 65, 123, 71], kind: 'building', storeys: 1, look: neon('#3a5a4a', '#2a3a32', { windows: { lit: .7 } }), sign: { text: 'KWIK-LUX', color: '#5aff8a' } }],
  [{ id: 'kwik-lux-neon', kind: 'shop', shop: 'kwiklux', holdup: true, at: [120, 72], label: 'Kwik-Lux' }]);

// Brickyard
const brick = (side, top, o = {}) => ({ side, top, face: 'brick', roof: 'slab', windows: { lit: .2 }, ...o });
L('boom-box', 'Boom Box Garage', [{ rect: [37, 94, 51, 97], kind: 'yard', surface: 'yard' }, { rect: [37, 85, 46, 93], kind: 'building', storeys: 1, look: brick('#8a5a3a', '#3a3a40', { door: { chance: 1, w: 12, h: 14, color: '#3a3a40' } }), sign: { text: 'BOOM BOX', color: '#ff5a3a' } }],
  [{ id: 'boom-box', kind: 'shop', shop: 'mods', at: [41, 94], label: 'Boom Box Garage' }]);
L('construction', 'The Construction Site', [{ rect: [11, 85, 27, 97], kind: 'construction', surface: 'dirt' }], [{ id: 'loop-gap', kind: 'stunt', at: [14, 91], label: 'The Loop Gap' }],
  [{ kind: 'drill', at: [20, 88] }, { kind: 'mound', at: [14, 93], solid: { hx: 20, hy: 14, top: 10 } }, { kind: 'scaffold', at: [24, 95] }]);
L('spray-pray', 'Spray & Pray', [{ rect: [11, 107, 18, 113], kind: 'building', storeys: 1, look: brick('#5a6a8a', '#3a3a44', { door: { chance: 1, w: 12, h: 14 } }), sign: { text: 'SPRAY & PRAY', color: '#ff8af0' } }],
  [{ id: 'spray-pray', kind: 'shop', shop: 'respray', at: [15, 114], label: 'Spray & Pray' }]);
L('l-depot', 'L Depot', [{ rect: [61, 107, 73, 113], kind: 'yard', surface: 'rail' }], [{ id: 'l-depot', kind: 'landmark', at: [67, 110], label: 'L Depot' }]);
L('car-wash', 'Palm Car Wash', [{ rect: [37, 107, 51, 113], kind: 'yard', surface: 'yard' }, { rect: [37, 107, 44, 113], kind: 'building', storeys: 1, look: brick('#5ab0d0', '#3a6a8a', { face: 'plaster' }), sign: { text: 'CAR WASH', color: '#5af0ff' } }],
  [{ id: 'car-wash', kind: 'property', property: 'carwash', at: [47, 114], label: 'Palm Car Wash' }]);
L('crush-hour', 'Crush Hour', [{ rect: [37, 145, 51, 151], kind: 'yard', surface: 'yard' }], [{ id: 'crush-hour', kind: 'crusher', at: [44, 147], label: 'Crush Hour' }], [{ kind: 'crusher', at: [44.5, 148.5], solid: { hx: 20, hy: 14, top: 30 } }]);

// Harborfront
const shed = (side, top, o = {}) => ({ side, top, face: `${side} metal`, roof: 'plain', windows: { lit: .15 }, ...o });
L('fish-market', 'Fish Market', [{ rect: [87, 93, 99, 97], kind: 'yard', surface: 'quay' }, { rect: [87, 85, 99, 92], kind: 'building', storeys: 2, look: shed('#5a8a8a', '#3e5a5a', { door: { chance: .8 } }), sign: { text: 'FISH MARKET', color: '#7affd0' } }],
  [{ id: 'fish-market', kind: 'landmark', at: [93, 94], label: 'Fish Market' }]);
L('container-yard', 'Container Yard', [{ rect: [109, 85, 123, 97], kind: 'yard', surface: 'yard' }], [{ id: 'container-ramp', kind: 'stunt', at: [111, 96], label: 'Container Ramp' }]);
L('cranes', 'The Cranes', [{ rect: [133, 85, 146, 97], kind: 'yard', surface: 'quay' }], [{ id: 'cranes', kind: 'landmark', at: [139, 98], label: 'The Cranes' }],
  [{ kind: 'crane', at: [137, 89], solid: { hx: 6, hy: 6, top: 120 } }, { kind: 'crane', at: [143, 92], solid: { hx: 6, hy: 6, top: 120 } }]);
L('kwik-lux-harbor', 'Kwik-Lux (Harbor)', [{ rect: [94, 107, 99, 113], kind: 'building', storeys: 1, look: shed('#3a5a4a', '#2a3a32'), sign: { text: 'KWIK-LUX', color: '#5aff8a' } }],
  [{ id: 'kwik-lux-harbor', kind: 'shop', shop: 'kwiklux', holdup: true, at: [96, 114], label: 'Kwik-Lux' }]);
L('marina', 'The Marina', [{ rect: [133, 107, 139, 123], kind: 'yard', surface: 'quay' }, { rect: [140, 111, 148, 112], kind: 'pier', surface: 'pier' }, { rect: [140, 117, 148, 118], kind: 'pier', surface: 'pier' }],
  [{ id: 'marina', kind: 'marina', at: [137, 115], label: 'The Marina' }]);
L('boathouse', 'Harbor Rats Boathouse', [{ rect: [142, 134, 151, 145], kind: 'pier', surface: 'pier' }, { rect: [144, 136, 150, 142], kind: 'building', storeys: 2, look: shed('#8a6a4a', '#5a4a3a', { face: 'plank' }), sign: { text: 'BOATHOUSE', color: '#ffd23a' } }, { rect: [138, 138, 141, 139], kind: 'pier', surface: 'pier' }],
  [{ id: 'rats-hq', kind: 'gang', gang: 'rats', at: [147, 143], label: 'Harbor Rats Boathouse' }, { id: 'phone-rats', kind: 'payphone', gang: 'rats', at: [134, 139] }]);
L('lighthouse', 'The Lighthouse', [{ rect: [148, 146, 153, 151], kind: 'pier', surface: 'quay' }, { rect: [149, 147, 152, 150], kind: 'building', storeys: 6, look: { side: '#e8e8ec', top: '#c8423a', face: 'plaster', roof: 'tiles', windows: { lit: .3, w: 4 } } }],
  [{ id: 'lighthouse', kind: 'landmark', at: [148, 146], label: 'The Lighthouse' }]);
