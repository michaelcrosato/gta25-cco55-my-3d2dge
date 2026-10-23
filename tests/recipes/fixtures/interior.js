// The interior recipe's fixture (docs/CONTENT-GUIDE.md, "An interior"), as src/game/interiors/pawnshop.js: a small
// pawn shop, one cell a character (the legend names each), its rooms, its way in from the city (a door point of
// interest beside a building, a landmark's), a light and a guard. tests/recipes/interior.test.mjs bundles it in.
//   #  the outer walls   +  the inner wall   =  the counter   s  shelves   .  linoleum   ,  carpet (the back room)
//   D  the door
import { def } from '../../motor/index.js';

const wall = (side, top, o = {}) => ({ side, top, face: 'plaster', roof: 'plain', ...o });
def('interiors', 'pawnshop', {
  name: 'Lucky Pawn',
  blocks: [
    '##############',
    '#,,,,,,+.....#',
    '#,,,,,,+.ssss#',
    '#,,,,,,+.....#',
    '#+++.+++.....#',
    '#............#',
    '#...======...#',
    '#............#',
    '#s..........s#',
    '#............#',
    '######DD######',
  ],
  legend: {
    '#': { wall: 'outer' }, '+': { wall: 'inner' }, '=': { wall: 'counter', floor: 'lino' }, 's': { wall: 'shelf', floor: 'lino' },
    '.': { floor: 'lino' }, ',': { floor: 'carpet' }, 'D': { floor: 'lino', mark: 'front' },
  },
  types: {
    outer: wall('#8a7060', '#4a4038', { h: 48, face: 'brick', cutH: 6 }), inner: wall('#d8c8a8', '#6a5a48', { h: 40, cutH: 6 }),
    counter: wall('#5a3a28', '#c8b898', { h: 16, face: 'plank', cut: false }), shelf: wall('#6a5a48', '#8a7a68', { h: 28, face: 'plank', cut: false }),
  },
  rooms: [{ name: 'the shop', rect: [1, 5, 12, 9], public: true }, { name: 'the back room', rect: [1, 1, 6, 3] }, { name: 'the stockroom', rect: [8, 1, 12, 3] }],
  doors: [{ id: 'front', from: 'pawnshop-door', at: [6, 9], mark: 'front' }],
  guards: [{ arch: 'guard', route: [[2, 7], [11, 7]] }],
  cameras: [],
  lights: [{ at: [6, 6], radius: 80 }, { at: [3, 2], radius: 50, color: '#ffd8a0' }],
  music: 'heist',
});
def('landmarks', 'lucky-pawn', { district: 'lowtown', name: 'Lucky Pawn',
  lots: [{ rect: [52, 145, 60, 151], kind: 'building', storeys: 2, look: { side: '#6a5a7a', top: '#3a3446', face: 'brick', roof: 'slab', door: { chance: 1 } }, sign: { text: 'LUCKY PAWN', color: '#ff7ac8' } }],
  pois: [{ id: 'pawnshop-door', kind: 'door', interior: 'pawnshop', at: [56, 144], label: 'Lucky Pawn' }] });
