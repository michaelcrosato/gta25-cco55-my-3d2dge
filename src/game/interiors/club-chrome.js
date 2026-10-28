// Club Chrome (PLAN.md 19's backlog, HANDOFF L4): the Chrome Saints' nightclub on Sunset Strip, its doors on the plaza
// out front. The hall by the doors and the coat check; the bar down the west wall; the dance floor (lit tiles, the
// dancers on it) under the DJ's stage and its speaker stacks; the VIP lounge up the east side, where the Saints keep an
// arcade cabinet (it plays the engine's shooter starter kit: the Pixel Palace's HIGH SCORE, play/arcade.js); and
// Father Fender's office behind the bar, his desk, his files and his safe. The Saints' bouncers walk the floor: the
// club is anyone's (the floor, the stage, the lounge), but the office is the Saints', and a gun out, a wanted face or
// a step behind the office door brings them. The room's music is VELVET 92.1. One cell a character:
//   #  the outer walls (chrome)   +  inner walls       d  Fender's desk     f  filing cabinets    g  the safe
//   k  the DJ's decks             x  speaker stacks    p  chrome pillars    b  the bar's counter  r  the back bar
//   s  sofas   t  tables          c  the coat check    A  the arcade cabinet
//   .  concrete   ,  carpet   _  the stage's steel   ~  the dance floor   D  the front doors
import { def } from '../../motor/index.js';

const wall = (side, top, o = {}) => ({ side, top, face: 'plaster', roof: 'plain', ...o });

def('interiors', 'club-chrome', {
  name: 'Club Chrome',
  blocks: [
    '########################################',
    '#,,,,,,,,,+__x_______________x__+,,,,,,#',
    '#,dddd,,,,+______kkkkkkkkk______+,ss,s,#',
    '#,,,,,,,f,+_____________________+,,,,s,#',
    '#,,,,,,,f,+_x_________________x_+,tt,,,#',
    '#,,,,,,,f,+.....................+,,,,,A#',
    '#g,,,,,,f,+p~~~~~~~~~~~~~~~~~~~p+,sss,,#',
    '#,,,,,,,,,+~~~~~~~~~~~~~~~~~~~~~+,,,,,,#',
    '#++++,+++++~~~~~~~~~~~~~~~~~~~~~+++,+++#',
    '#..........~~~~~~~~~~~~~~~~~~~~~.......#',
    '#r...b.....~~~~~~~~~~~~~~~~~~~~~.......#',
    '#r...b.....~~~~~~~~~~~~~~~~~~~~~...t...#',
    '#r...b.....~~~~~~~~~~~~~~~~~~~~~.......#',
    '#r...b.....~~~~~~~~~~~~~~~~~~~~~.......#',
    '#r...b.....~~~~~~~~~~~~~~~~~~~~~...t...#',
    '#r...b.....p~~~~~~~~~~~~~~~~~~~p.......#',
    '#r...b.................................#',
    '#r...b.............................t...#',
    '#r...b.................................#',
    '#r...b.................................#',
    '#.............p..........p.............#',
    '#.............................cccc.....#',
    '#......................................#',
    '#......................................#',
    '#......................................#',
    '###################DD###################',
  ],
  legend: {
    '#': { wall: 'outer' }, '+': { wall: 'inner' }, 'd': { wall: 'desk', floor: 'carpet' }, 'f': { wall: 'cabinet', floor: 'carpet' }, 'g': { wall: 'safe', floor: 'carpet' },
    'k': { wall: 'decks', floor: 'steel' }, 'x': { wall: 'speaker', floor: 'steel' }, 'p': { wall: 'pillar', floor: 'dance' }, 'b': { wall: 'counter', floor: 'concrete' },
    'r': { wall: 'backbar', floor: 'concrete' }, 's': { wall: 'sofa', floor: 'carpet' }, 't': { wall: 'table', floor: 'carpet' }, 'c': { wall: 'counter', floor: 'concrete' },
    'A': { wall: 'arcade', floor: 'carpet', mark: 'arcade' },
    '.': { floor: 'concrete' }, ',': { floor: 'carpet' }, '_': { floor: 'steel' }, '~': { floor: 'dance' }, 'D': { floor: 'concrete', mark: 'front' },
  },
  types: {
    outer: wall('#a8b0c0', '#5a6070', { h: 64, face: '#a8b0c0 metal', cutH: 6 }),
    inner: wall('#3a2a4a', '#24182e', { h: 52, cutH: 6 }),
    desk: wall('#3a2418', '#5a3a26', { h: 12, face: 'plank', cut: false }),
    cabinet: wall('#5a5e66', '#3e4248', { h: 24, face: '#5a5e66 metal', cut: false }),
    safe: wall('#2e3036', '#4a4c54', { h: 20, face: '#2e3036 metal', cut: false }),
    decks: wall('#1e1e24', '#3a3a44', { h: 14, face: '#1e1e24 metal', cut: false }),
    speaker: wall('#16161c', '#2a2a32', { h: 30, face: '#16161c metal', cut: false }),
    pillar: wall('#c8d0dc', '#8a92a0', { h: 64, face: '#c8d0dc metal', cutH: 8 }),
    counter: wall('#5a2a3a', '#c8c0b8', { h: 16, face: 'plank', cut: false }),
    backbar: wall('#3a2a20', '#7af0ff', { h: 34, face: 'plank', windows: { w: 2, h: 3, step: 4, lit: .9 }, cut: false }),
    sofa: wall('#7a2a6a', '#9a3a8a', { h: 8, face: 'plank', cut: false }),
    table: wall('#2a2a30', '#c8d0dc', { h: 10, face: '#2a2a30 metal', cut: false }),
    arcade: wall('#1a1a3a', '#5af0ff', { h: 22, face: '#1a1a3a metal', windows: { w: 6, h: 5, step: 8, lit: 1 }, cut: false }),
  },
  rooms: [
    { name: 'the club floor', rect: [1, 9, 38, 24], public: true }, { name: 'the stage', rect: [11, 1, 31, 5], public: true },
    { name: 'the VIP lounge', rect: [33, 1, 38, 7], public: true }, { name: 'Fender\'s office', rect: [1, 1, 9, 7] },
  ],
  doors: [{ id: 'front', from: 'club-chrome-door', at: [19, 23], mark: 'front' }],
  spots: [{ id: 'arcade', mark: 'arcade', label: 'CHROME RAIDERS' }],
  // the Saints' bouncers: one by the office door, one on the doors, one round the floor's edge
  guards: [
    { arch: 'saint-grunt', route: [[2, 9], [9, 9]] },
    { arch: 'saint-grunt', route: [[16, 22], [23, 22]] },
    { arch: 'saint-grunt', route: [[33, 9], [37, 9], [37, 19], [33, 19]] },
  ],
  patrons: [
    ...[[14, 8], [17, 10], [20, 8], [23, 11], [26, 9], [29, 12], [15, 13], [19, 14], [24, 13], [28, 15]].map(([x, y], i) => ({ arch: ['clubber', 'nightowl', 'skater', 'clubber', 'tourist'][i % 5], at: [x, y], clip: 'Dance_Loop', facing: [-1.6, 1.6, 0, 3.1][i % 4] })),
    { arch: 'clubber', at: [21, 3], clip: 'Dance_Loop', facing: Math.PI / 2 },   // (the DJ at the decks)
    { arch: 'clerk', at: [3, 14], pose: 'hips', facing: 0 },   // (behind the bar)
    { arch: 'nightowl', at: [7, 12], facing: Math.PI }, { arch: 'clubber', at: [7, 16], facing: Math.PI },   // (at the bar)
    { arch: 'clubber', at: [34, 3], facing: Math.PI / 2 }, { arch: 'nightowl', at: [36, 6], facing: -Math.PI / 2 },   // (in the VIP lounge)
  ],
  lights: [
    { at: [15, 9], radius: 80, color: '#ff4ad8' }, { at: [27, 9], radius: 80, color: '#5af0ff' }, { at: [15, 13], radius: 80, color: '#ffe066' }, { at: [27, 13], radius: 80, color: '#7a5aff' },
    { at: [21, 2], radius: 90, color: '#ff8a5a' }, { at: [3, 14], radius: 90, color: '#ffb87a' }, { at: [35, 4], radius: 80, color: '#c87aff' }, { at: [5, 4], radius: 70 },
    { at: [20, 21], radius: 90, color: '#a8c8ff' }, { at: [37, 5], radius: 40, color: '#5af0ff' },
  ],
  music: 'velvet',
});
