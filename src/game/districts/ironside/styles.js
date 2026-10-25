// Ironside's three neighbourhoods (EXPANSION.md 2.2): the city's works, west of Lowtown across the canal. Who owns
// them, their palettes and the buildings each fills its blocks with, as Lowtown's styles.js does. One storey is 24 units.
//   The Foundry: smelters and worker terraces in brick and soot under sodium light (the Lawn Gnomes' union turf).
//   Scrapyard Flats: crusher yards, sheds and lock-ups in rust (the Rust Monks').
//   Voltage Row: plant halls and transformer yards, concrete striped safety yellow (the Volt Boys').
export const HOODS = {
  foundry: { name: 'The Foundry', style: 'foundry', gang: null, music: 'rust', rects: [[0, 0, 63, 56]],
    palette: { walk: { stones: ['#6e625a', '#685c54', '#746860'], mortar: '#3e3430', hi: '#847870', lo: '#54483f', speck: '#5e524a' }, lot: { base: '#4e4238', dark: '#40362e', light: '#5c4e42' }, yard: { base: '#463e38', dark: '#3a332e', light: '#524842' } } },
  scrapyard: { name: 'Scrapyard Flats', style: 'scrapyard', gang: null, music: 'rust', rects: [[0, 57, 63, 111]],
    palette: { walk: { stones: ['#6a5e52', '#64584c', '#706458'], mortar: '#3a3028', hi: '#80746a', lo: '#50463c', speck: '#5a4e44' }, lot: { base: '#5a4634', dark: '#4a3a2a', light: '#68523e' }, yard: { base: '#54443a', dark: '#46382e', light: '#605044' } } },
  voltage: { name: 'Voltage Row', style: 'voltage', gang: null, music: 'harbor', rects: [[64, 0, 127, 111]],
    palette: { walk: { stones: ['#6c6e6a', '#666864', '#727470'], mortar: '#3c3e3a', hi: '#828480', lo: '#525450', speck: '#5c5e5a' }, yard: { base: '#56585a', dark: '#46484a', light: '#626466' } } },
};

const foundryLooks = [
  { side: '#8a4a36', top: '#3a3634', face: 'brick', roof: 'slab', windows: { lit: .25, w: 5 }, door: { chance: .35, color: '#2e2a28' } },
  { side: '#6e4436', top: '#363230', face: 'brick', roof: 'slab', windows: { lit: .2 } },
  { side: '#5a5048', top: '#2e2c2a', face: '#5a5048 metal', roof: 'plain', windows: { lit: .3, w: 6, h: 5 } },
  { side: '#9a6a48', top: '#4a4038', face: 'brick', roof: 'tiles', windows: { lit: .35 }, door: { chance: .5 } },
];
const scrapLooks = [
  { side: '#8a5a3a', top: '#4a3a2e', face: '#8a5a3a metal', roof: 'plain', windows: { lit: .1, w: 5, h: 5 }, door: { chance: .4, color: '#3a2e26' } },
  { side: '#6a4a3a', top: '#3e3028', face: '#6a4a3a metal', roof: 'plain', windows: { lit: .08 } },
  { side: '#7a6a5a', top: '#45403a', face: 'plank', roof: 'plain', windows: { lit: .12 } },
];
const voltLooks = [
  { side: '#8a8c86', top: '#4a4c48', face: 'stone', roof: 'slab', windows: { lit: .3, w: 6, h: 6 }, door: { chance: .3, color: '#c8a020' } },
  { side: '#6a6c68', top: '#3e403c', face: '#6a6c68 metal', roof: 'plain', windows: { lit: .2 } },
  { side: '#a8a8a0', top: '#58585a', face: 'stone', roof: 'plain', windows: { lit: .35, w: 4, h: 10 } },
];
const crates = ['#8a5a3a', '#6a6a6e', '#c8a020', '#5a6a4a'].map(c => ({ side: c, top: c, face: `${c} metal`, roof: 'plain', texture: true }));

export const STYLES = {
  foundry: { kinds: { smelter: 2, terrace: 3, works: 2 }, looks: foundryLooks, alleys: .3, filler: 'yard', floor: '#7a6a5e', neon: { tubes: .1, signs: .25 }, lots: {
    smelter: { kind: 'building', w: [8, 12], d: [7, 11], storeys: [3, 5] },
    terrace: { kind: 'building', w: [3, 5], d: [6, 8], storeys: [2, 2] },
    works: { kind: 'building', w: [5, 8], d: [5, 8], storeys: [1, 2] } } },
  scrapyard: { kinds: { shed: 3, lockup: 2, stack: 2 }, looks: scrapLooks, alleys: .35, filler: 'yard', floor: '#7a6650', lots: {
    shed: { kind: 'building', w: [6, 10], d: [5, 8], storeys: [1, 2] },
    lockup: { kind: 'building', w: [3, 5], d: [4, 6], storeys: [1, 1] },
    stack: { kind: 'building', w: [2, 3], d: [4, 6], storeys: [1, 2], looks: crates } } },
  voltage: { kinds: { hall: 3, plant: 2, office: 1 }, looks: voltLooks, alleys: .25, filler: 'yard', floor: '#7a7c78', lots: {
    hall: { kind: 'building', w: [8, 12], d: [6, 10], storeys: [2, 3] },
    plant: { kind: 'building', w: [5, 8], d: [5, 8], storeys: [2, 4] },
    office: { kind: 'building', w: [4, 6], d: [4, 6], storeys: [3, 4] } } },
};
