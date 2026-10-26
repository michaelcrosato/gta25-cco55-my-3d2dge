// Ironside's landmarks (EXPANSION.md 2.2), as Lowtown's landmarks.js: each claims its lots in a block before the
// neighbourhood fills the rest, and names its points of interest. Rects are tile cells, inclusive. The blocks lie
// between the roads: x 11-27, 37-57, 71-87 and 97-112 (south of Crusher Lane, 71-112: Pylon Street stops there); y
// 11-25, 35-49, 63-75 and 85-95.
import { def } from '../../../motor/index.js';

const L = (id, name, lots, pois = [], props = []) => def('landmarks', id, { district: 'ironside', name, lots, pois, props });
const brick = (side, top, o = {}) => ({ side, top, face: 'brick', roof: 'slab', windows: { lit: .25 }, ...o });
const metal = (side, top, o = {}) => ({ side, top, face: `${side} metal`, roof: 'plain', windows: { lit: .15 }, ...o });
const stone = (side, top, o = {}) => ({ side, top, face: 'stone', roof: 'slab', windows: { lit: .35, w: 5 }, ...o });

// The Foundry
L('st-sooty', "St. Sooty's Clinic", [{ rect: [12, 12, 22, 21], kind: 'building', storeys: 3, look: stone('#d8d4cc', '#7a8488', { windows: { lit: .55, w: 5 } }), sign: { text: "ST. SOOTY'S", color: '#ff4a4a' } }, { rect: [12, 22, 26, 25], kind: 'yard', surface: 'yard' }],
  [{ id: 'hospital', kind: 'hospital', at: [17, 26], label: "St. Sooty's Clinic" }]);
L('union-hall', 'Union Hall', [{ rect: [13, 36, 25, 46], kind: 'building', storeys: 3, look: brick('#9a5a46', '#4a3a3a', { windows: { lit: .5 }, door: { chance: 1 } }), sign: { text: 'UNION HALL', color: '#ff8ac8' } }, { rect: [11, 47, 27, 49], kind: 'plaza', surface: 'plaza' }],   // (its forecourt on Loop Avenue: the hall seen from the street)
  [{ id: 'union-hall', kind: 'landmark', at: [19, 50], label: 'Union Hall' }, { id: 'phone-union', kind: 'payphone', at: [12, 50] }]);
L('rail-yard', 'Ironside Rail Yard', [{ rect: [37, 11, 57, 25], kind: 'yard', surface: 'rail' }], [{ id: 'rail-yard', kind: 'landmark', at: [47, 26], label: 'The rail yard' }],
  [{ kind: 'container', at: [41, 14], facing: 0, color: '#8a5a3a', solid: { hx: 20, hy: 8, top: 16 } }, { kind: 'container', at: [52, 22], facing: 0, color: '#3a6ac8', solid: { hx: 20, hy: 8, top: 16 } }]);
L('launderette', "Sudsy's Launderette", [{ rect: [40, 41, 48, 48], kind: 'building', storeys: 2, look: brick('#c8b8a0', '#5a4a40', { face: 'plaster', door: { chance: 1 } }), sign: { text: "SUDSY'S", color: '#5af0ff' } }, { rect: [37, 49, 49, 49], kind: 'plaza', surface: 'plaza' }],
  [{ id: 'safehouse', kind: 'safehouse', at: [44, 50], label: "The flat over Sudsy's" }, { id: 'ironside-board', kind: 'landmark', at: [39, 50], label: 'The planning board' }]);   // (the crew's board for Blackout, EXPANSION.md X3: in the flat, its marker at the plaza's west end)
L('smelting', 'Ironside Smelting Co.', [{ rect: [50, 36, 57, 47], kind: 'building', storeys: 4, look: brick('#6e4436', '#363230', { windows: { lit: .4, w: 6, h: 5 } }), sign: { text: 'SMELTING CO.', color: '#ffa23a' } }, { rect: [50, 48, 57, 49], kind: 'yard', surface: 'yard' }],
  [{ id: 'smelting', kind: 'landmark', at: [53, 50], label: 'Ironside Smelting Co.' }],
  [{ kind: 'chimney', at: [52.5, 38.5], z: 96, roof: true }, { kind: 'chimney', at: [55.5, 38.5], z: 96, roof: true }]);

// Scrapyard Flats
L('precinct-9', 'MPD 9th Precinct', [{ rect: [12, 64, 24, 72], kind: 'building', storeys: 3, look: stone('#5a6a8a', '#3a4458', { windows: { lit: .6, w: 5 } }), sign: { text: 'MPD', color: '#5a8aff' } }, { rect: [12, 73, 24, 75], kind: 'yard', surface: 'yard' }],
  [{ id: 'precinct', kind: 'police', at: [18, 76], label: 'MPD 9th Precinct' }]);
// (a church of welded hulks: rust-dark iron under a pitched roof, tall lit windows, its yard heaped with wrecks)
L('scrap-cathedral', 'The Scrap Cathedral', [{ rect: [37, 63, 57, 75], kind: 'yard', surface: 'dirt' }, { rect: [41, 64, 53, 72], kind: 'building', storeys: 4, look: metal('#5e3424', '#3a2620', { roof: 'tiles', windows: { lit: .7, w: 4, h: 16, step: 14 } }), sign: { text: 'SCRAP CATHEDRAL', color: '#d8903a' } }],
  [{ id: 'scrap-cathedral', kind: 'landmark', at: [47, 76], label: 'The Scrap Cathedral' }, { id: 'phone-monks', kind: 'payphone', at: [38, 77] }],
  [{ kind: 'container', at: [38.5, 64], facing: Math.PI / 2, color: '#7a4a2e', solid: { hx: 8, hy: 20, top: 16 } }, { kind: 'container', at: [56, 65], facing: Math.PI / 2, color: '#5a5a5e', solid: { hx: 8, hy: 20, top: 16 } },
    { kind: 'container', at: [38.5, 72], facing: Math.PI / 2, color: '#8a3a2a', solid: { hx: 8, hy: 20, top: 16 } }, { kind: 'container', at: [56, 72], facing: Math.PI / 2, color: '#6a5a3a', solid: { hx: 8, hy: 20, top: 16 } }]);
L('scrap-crusher', 'Monk & Sons Crushing', [{ rect: [11, 85, 27, 95], kind: 'yard', surface: 'yard' }], [{ id: 'scrap-crusher', kind: 'landmark', at: [19, 84], label: 'Monk & Sons Crushing' }],
  [{ kind: 'crusher', at: [19.5, 90.5], solid: { hx: 20, hy: 14, top: 30 } }, { kind: 'mound', at: [13.5, 93.5], solid: { hx: 20, hy: 14, top: 10 } }, { kind: 'mound', at: [25.5, 93.5], solid: { hx: 20, hy: 14, top: 10 } }]);
L('spray-pray-west', 'Spray & Pray West', [{ rect: [38, 86, 45, 92], kind: 'building', storeys: 1, look: brick('#5a6a8a', '#3a3a44', { door: { chance: 1, w: 12, h: 14 } }), sign: { text: 'SPRAY & PRAY', color: '#ff8af0' } }],
  [{ id: 'spray-pray', kind: 'shop', shop: 'respray', at: [41, 84], label: 'Spray & Pray West' }]);

// Voltage Row
// (a turbine hall in plain concrete, slit windows high up, its stacks on the roof)
L('power-station', 'Ironside Power Station', [{ rect: [98, 12, 111, 24], kind: 'building', storeys: 5, look: stone('#8a8a84', '#4a4a4c', { roof: 'plain', windows: { lit: .2, w: 3, h: 5, step: 18 } }), sign: { text: 'IRONSIDE POWER', color: '#ffd23a' } }],
  [{ id: 'power-station', kind: 'landmark', at: [104, 26], label: 'Ironside Power Station' }, { id: 'power-door', kind: 'door', interior: 'power-station', at: [101, 26], label: 'Ironside Power Station' }],
  [{ kind: 'chimney', at: [100.5, 14.5], z: 120, roof: true }, { kind: 'chimney', at: [104.5, 14.5], z: 120, roof: true }, { kind: 'chimney', at: [108.5, 14.5], z: 120, roof: true },
    { kind: 'tank', at: [101.5, 21.5], z: 120, roof: true }, { kind: 'tank', at: [107.5, 21.5], z: 120, roof: true }]);
L('substation', 'Substation 9', [{ rect: [71, 35, 87, 49], kind: 'yard', surface: 'yard' }, { rect: [74, 37, 84, 45], kind: 'building', storeys: 2, look: metal('#8a8c86', '#4a4c48', { windows: { lit: .3 } }), sign: { text: 'SUBSTATION 9', color: '#ffd23a' } }],
  [{ id: 'substation', kind: 'landmark', at: [79, 50], label: 'Substation 9' }, { id: 'phone-volts', kind: 'payphone', at: [85, 50] }],
  [{ kind: 'transformer', at: [72.5, 47.5], solid: { hx: 9, hy: 7, top: 20 } }, { kind: 'transformer', at: [86, 47.5], solid: { hx: 9, hy: 7, top: 20 } }, { kind: 'transformer', at: [86, 36.5], solid: { hx: 9, hy: 7, top: 20 } }]);
// (EXPANSION.md X3) the pylon line down Pylon Street's east side, the Substation's feed: four pylons on a strip of dirt
// at the blocks' west edges, either side of Loop Avenue (Blackout's line, cut from the Bucket)
L('pylon-line', 'The pylon line', [{ rect: [97, 35, 98, 49], kind: 'yard', surface: 'dirt' }, { rect: [97, 63, 98, 75], kind: 'yard', surface: 'dirt' }],
  [{ id: 'pylons', kind: 'landmark', at: [95, 42], label: 'The pylon line' }],
  [[98, 37], [98, 47], [98, 65], [98, 73]].map(at => ({ kind: 'pylon', at, facing: Math.PI / 2, solid: { hx: 9, hy: 9, top: 116 } })));
// (the runway a lot of its own kind, 'construction', paved: a yard's would be strewn with crates, a plaza's lit on a grid)
L('airstrip', 'Ironside Airstrip', [{ rect: [71, 85, 112, 95], kind: 'construction', surface: 'road' }, { rect: [104, 86, 111, 91], kind: 'building', storeys: 2, look: metal('#7a8a8a', '#4a5458', { windows: { lit: .25 } }), sign: { text: 'AIRSTRIP', color: '#7af0ff' } }],
  [{ id: 'airstrip', kind: 'landmark', at: [90, 97], label: 'Ironside Airstrip' }]);
