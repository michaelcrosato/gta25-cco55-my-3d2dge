// Glass Heights' three neighbourhoods (EXPANSION.md 2.3): the money, east of Lowtown across the bay. Who owns them,
// their palettes and the buildings each fills its blocks with, as Lowtown's styles.js does. One storey is 24 units.
//   Cathedral Hill: towers in glass and white marble along the ridge, St. Chrome's and the observatory (the Saints').
//   The Strip: hotels and casinos in plum, gold and neon either side of Loop Avenue (the Velvet Syndicate's).
//   Marina Heights: villas and boat sheds in white stucco and sunset pink above the sea (the Yacht Club's).
export const HOODS = {
  hill: { name: 'Cathedral Hill', style: 'hill', gang: null, music: 'harbor', rects: [[0, 0, 127, 31]],
    palette: { walk: { stones: ['#c8ccd2', '#c0c4cc', '#d0d4da'], mortar: '#8a9098', hi: '#e0e4ea', lo: '#a0a6ae', speck: '#b4b8c0' }, lot: { base: '#5a7a5a', dark: '#4a6a4a', light: '#6a8a6a' }, yard: { base: '#9aa0a8', dark: '#8a9098', light: '#aab0b8' } } },
  strip: { name: 'The Strip', style: 'strip', gang: null, music: 'neon', rects: [[0, 32, 127, 78]],
    palette: { walk: { stones: ['#8a7a8e', '#827286', '#928296'], mortar: '#4a3e4e', hi: '#a898ac', lo: '#6a5a6e', speck: '#7a6a7e' }, lot: { base: '#4a3a4e', dark: '#3e3042', light: '#584862' }, yard: { base: '#5a4e5e', dark: '#4a3e4e', light: '#6a5e6e' } } },
  marina: { name: 'Marina Heights', style: 'marina', gang: null, music: 'sunny', rects: [[0, 79, 127, 111]],
    palette: { walk: { stones: ['#d8c8b8', '#d0c0b0', '#e0d0c0'], mortar: '#9a8a7a', hi: '#ece0d4', lo: '#b8a898', speck: '#c8b8a8' }, lot: { base: '#6a8a5a', dark: '#5a7a4a', light: '#7a9a6a' }, yard: { base: '#c8b8a4', dark: '#b8a894', light: '#d8c8b4' } } },
};

const hillLooks = [
  { side: '#9ab8d8', top: '#5a6a7a', face: '#9ab8d8 metal', roof: 'slab', windows: { lit: .5, w: 6, h: 8 }, door: { chance: .4, color: '#2a3a4a' } },
  { side: '#e8e4dc', top: '#8a8a88', face: 'stone', roof: 'slab', windows: { lit: .45, w: 5 } },
  { side: '#7a9ab8', top: '#4a5a6a', face: '#7a9ab8 metal', roof: 'plain', windows: { lit: .55, w: 4, h: 10 } },
];
const stripLooks = [
  { side: '#6a3a6e', top: '#3a2a3e', face: 'plaster', roof: 'slab', windows: { lit: .65, w: 5 }, door: { chance: .6, color: '#d8b04a' } },
  { side: '#c8a04a', top: '#5a4a2a', face: 'plaster', roof: 'slab', windows: { lit: .6 } },
  { side: '#4a2a5a', top: '#2a1e32', face: '#4a2a5a metal', roof: 'plain', windows: { lit: .7, w: 6, h: 6 } },
  { side: '#e88aa8', top: '#6a3a4a', face: 'plaster', roof: 'tiles', windows: { lit: .5 } },
];
const marinaLooks = [
  { side: '#f0e8dc', top: '#c87a5a', face: 'plaster', roof: 'tiles', windows: { lit: .35, w: 5 }, door: { chance: .45, color: '#3a5a8a' } },
  { side: '#f0b8a8', top: '#a85a4a', face: 'plaster', roof: 'tiles', windows: { lit: .3 } },
  { side: '#e8e0d0', top: '#6a7a8a', face: 'plank', roof: 'plain', windows: { lit: .25 } },
];

export const STYLES = {
  hill: { kinds: { tower: 3, mansion: 2, block: 2 }, looks: hillLooks, alleys: .2, filler: 'park', floor: '#c8ccd2', neon: { tubes: .05, signs: .15 }, lots: {
    tower: { kind: 'building', w: [6, 9], d: [6, 9], storeys: [5, 8] },
    mansion: { kind: 'building', w: [6, 10], d: [5, 8], storeys: [2, 3] },
    block: { kind: 'building', w: [4, 7], d: [5, 8], storeys: [4, 6] } } },
  strip: { kinds: { hotel: 3, club: 2, arcade: 2 }, looks: stripLooks, alleys: .3, filler: 'plaza', floor: '#8a7a8e', neon: { tubes: .5, signs: .6 }, lots: {
    hotel: { kind: 'building', w: [8, 12], d: [7, 11], storeys: [4, 8] },
    club: { kind: 'building', w: [5, 8], d: [5, 8], storeys: [2, 3] },
    arcade: { kind: 'building', w: [3, 5], d: [5, 7], storeys: [1, 2] } } },
  marina: { kinds: { villa: 3, shed: 1, flats: 2 }, looks: marinaLooks, alleys: .25, filler: 'park', floor: '#d8c8b8', neon: { tubes: .1, signs: .2 }, lots: {
    villa: { kind: 'building', w: [5, 8], d: [5, 7], storeys: [1, 2] },
    shed: { kind: 'building', w: [6, 9], d: [5, 7], storeys: [1, 1] },
    flats: { kind: 'building', w: [4, 6], d: [5, 7], storeys: [3, 4] } } },
};
