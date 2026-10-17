// Lowtown's four neighbourhoods (PLAN.md 9.1, 10): who owns them, their palettes (sidewalks, lots, grass), and the
// buildings each fills its blocks with: lot kinds (widths, depths, storeys, weights) and looks (the engine's wall-type
// options: face and roof materials, windows, shutters, balconies, doors), and the floor a cut-away shows inside them.
// One storey is 24 units.
//   Neon Mile: magenta and cyan neon on deep blue; towers.   Palm Terraces: pastel stucco, palm green, warm.
//   Brickyard: rust, brick and soot; warehouses.             Harborfront: teal water, yellow cranes, grey concrete.
export const HOODS = {
  palm: { name: 'Palm Terraces', style: 'palm', gang: 'gnomes', trees: true, music: 'sunny', rects: [[0, 0, 79, 76]],
    palette: { walk: { stones: ['#b8a890', '#b0a088', '#c0b098'], mortar: '#7a6a58', hi: '#d0c0a8', lo: '#8a7a68', speck: '#a09078' }, lot: { base: '#8a7a5a', dark: '#7a6a4a', light: '#9a8a6a' } } },
  neon: { name: 'Neon Mile', style: 'neon', gang: 'saints', music: 'neon', rects: [[80, 0, 159, 76]],
    palette: { walk: { stones: ['#5a5a72', '#54546c', '#606078'], mortar: '#2e2e42', hi: '#727290', lo: '#44445a', speck: '#4c4c64' }, road: { base: '#26262e', var: 5 } } },
  brick: { name: 'Brickyard', style: 'brick', gang: null, music: 'rust', rects: [[0, 77, 79, 159]],
    palette: { walk: { stones: ['#7a6a62', '#74645c', '#80706a'], mortar: '#4a3e3a', hi: '#8e7e76', lo: '#5e504a', speck: '#6a5a54' }, lot: { base: '#5a4a40', dark: '#4a3c34', light: '#6a584c' }, yard: { base: '#4e4640', dark: '#403a34', light: '#5a524a' } } },
  harbor: { name: 'Harborfront', style: 'harbor', gang: 'rats', music: 'harbor', rects: [[80, 77, 159, 159]],
    palette: { walk: { stones: ['#6a7478', '#646e72', '#707a7e'], mortar: '#3e4648', hi: '#808a8e', lo: '#525a5e', speck: '#5a6468' }, yard: { base: '#5a6066', dark: '#4a5056', light: '#666c72' } } },
};

const pastel = ['#e8c8a8', '#c8e0c0', '#e8b8c8', '#c8d8e8', '#f0e0a8', '#d8c8e8'];
const palmLooks = pastel.flatMap((side, i) => [
  { side, top: '#a85a3a', face: 'plaster', roof: 'tiles', windows: { lit: .35 }, shutters: ['#2a6a5a', '#6a3a5a', '#3a5a8a'][i % 3], door: { chance: .5 } },
  { side, top: '#8a8478', face: 'plaster', roof: 'slab', windows: { lit: .3 }, balcony: { z: 30, color: '#5a4a3a' }, door: { chance: .4 } },
]);
const neonLooks = [
  { side: '#3a4a6a', top: '#2a2e3e', face: 'stone', roof: 'plain', windows: { w: 3, h: 12, step: 10, lit: .55 } },
  { side: '#4a3a5a', top: '#2e2a3a', face: 'stone', roof: 'plain', windows: { w: 4, h: 10, lit: .5 } },
  { side: '#2e4a5a', top: '#263440', face: '#2e4a5a metal', roof: 'plain', windows: { w: 3, h: 12, step: 10, lit: .6 } },
  { side: '#5a5a6e', top: '#3a3a48', face: 'stone', roof: 'slab', windows: { w: 4, h: 11, lit: .45 }, door: { chance: .3 } },
];
const brickLooks = [
  { side: '#9a5a42', top: '#4a4a4e', face: 'brick', roof: 'slab', windows: { lit: .15, w: 5 }, door: { chance: .35, color: '#3a3a40' } },
  { side: '#8a4a3a', top: '#45403e', face: 'brick', roof: 'slab', windows: { lit: .12 } },
  { side: '#a86a4a', top: '#504a48', face: 'brick', roof: 'plain', windows: { lit: .18, w: 6, h: 7 }, door: { chance: .3 } },
  { side: '#7a6a5e', top: '#3e3a3a', face: 'stone', roof: 'slab', windows: { lit: .1 } },
];
const harborLooks = [
  { side: '#6a7a8a', top: '#4a5258', face: '#6a7a8a metal', roof: 'plain', windows: { lit: .15, w: 5, h: 6 }, door: { chance: .4, color: '#2a3a4a' } },
  { side: '#5a8a8a', top: '#3e5a5a', face: '#5a8a8a metal', roof: 'plain', windows: { lit: .12 } },
  { side: '#8a8a82', top: '#5a5a56', face: 'stone', roof: 'slab', windows: { lit: .2 } },
];
const containers = ['#c8423a', '#3a6ac8', '#3a8a5a', '#c8a03a', '#8a3a8a'].map(c => ({ side: c, top: c, face: `${c} metal`, roof: 'plain', texture: true }));

export const STYLES = {
  palm: { kinds: { row: 4, shop: 2, apartment: 2 }, looks: palmLooks, alleys: .2, filler: 'grass', floor: '#b89a78', lots: {
    row: { kind: 'building', w: [3, 5], d: [6, 9], storeys: [2, 3] },
    shop: { kind: 'building', w: [4, 7], d: [4, 6], storeys: [1, 2] },
    apartment: { kind: 'building', w: [6, 9], d: [6, 9], storeys: [3, 4] } } },
  neon: { kinds: { tower: 3, midrise: 3, club: 1 }, looks: neonLooks, alleys: .25, filler: 'plaza', floor: '#7a7488', lots: {
    tower: { kind: 'building', w: [6, 10], d: [6, 10], storeys: [5, 8] },
    midrise: { kind: 'building', w: [5, 8], d: [5, 8], storeys: [3, 5] },
    club: { kind: 'building', w: [4, 6], d: [4, 6], storeys: [1, 2] } } },
  brick: { kinds: { warehouse: 3, factory: 2, garage: 2 }, looks: brickLooks, alleys: .3, filler: 'yard', floor: '#8a7462', lots: {
    warehouse: { kind: 'building', w: [7, 12], d: [6, 10], storeys: [2, 3] },
    factory: { kind: 'building', w: [6, 10], d: [6, 10], storeys: [2, 4] },
    garage: { kind: 'building', w: [4, 6], d: [4, 6], storeys: [1, 1] } } },
  harbor: { kinds: { shed: 3, office: 2, stack: 2 }, looks: harborLooks, alleys: .3, filler: 'yard', floor: '#7a8486', lots: {
    shed: { kind: 'building', w: [6, 10], d: [5, 8], storeys: [1, 2] },
    office: { kind: 'building', w: [4, 6], d: [4, 6], storeys: [2, 3] },
    stack: { kind: 'building', w: [2, 3], d: [4, 6], storeys: [1, 2], looks: containers } } },
};
