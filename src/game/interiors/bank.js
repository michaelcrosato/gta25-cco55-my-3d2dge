// The First Lowtown Bank (PLAN.md 5.4, 8.21): the lobby, the records office, the vault with its door, and the sewer
// approach from below for QUIET. One cell a character (builder.js buildInterior); the front doors open on the city's
// bank-door, the sewer's grate on bank-sewer, beside the bank on Neon Mile. The vault's round door stays shut until a
// job opens it: the vault is reached from the lobby only through it, and from the sewer through the hatch.
//   #  the outer walls        +  inner walls            V  the vault's steel walls    b  deposit boxes
//   v  the vault's door       f  filing cabinets        d  desks                      =  the tellers' counter
//   p  pillars                n  benches                %  the sewer's brick
//   .  marble   ,  carpet   :  concrete (the staff's)   _  the vault's steel floor    ~  the sewer's channel
//   D  the front doors   S  the sewer's grate   H  the hatch into the vault
import { def } from '../../motor/index.js';

const wall = (side, top, o = {}) => ({ side, top, face: 'plaster', roof: 'plain', ...o });

def('interiors', 'bank', {
  name: 'First Lowtown Bank',
  blocks: [
    '########################################',
    '#%%%%%%%%%%%##VVVVVVVVVVV++++++++++++++#',
    '#%::::::::::::H_bb___bbbV+ffffff,,ffff+#',
    '#%::~~~~~~~~##V________bV+,,,,,,,,,,,,+#',
    '#%::~~~%%%%%##Vb_______bV+,,dd,,dd,,,,+#',
    '#%::~~~%%%%%##Vb_______bV+,,,,,,,,,,,,+#',
    '#%::~~~%%%%%##Vb_______bV+,,dd,,dd,,,,+#',
    '#%::~~~%%%%%##V_________V+,,,,,,,,,,,,+#',
    '#%::~~~%%%%%##VVVVvvvVVVV+,,,,,,,,,,,,+#',
    '#%::~~~%%%%%##++++:::+++++,,+++++++++++#',
    '#%::~~~%%%%%##+:::::::::::::::::::::::+#',
    '#%::~~~%%%%%##+:::::::::::::::::::::::+#',
    '#%::~~~%%%%%###+::++++++++++++++++::++##',
    '#%::~~~%%%%%##::::::::::::::::::::::::##',
    '#%::~~~%%%%%##============.===========##',
    '#%::~~~%%%%%##........................##',
    '#%::~~~%%%%%##........................##',
    '#%::~~~%%%%%##........................##',
    '#%::~~~%%%%%##...p......p....p.....p..##',
    '#%::~~~%%%%%##........................##',
    '#%::~~~%%%%%##........................##',
    '#%::~~~%%%%%##......nnnn.....nnnn.....##',
    '#%::~~~%%%%%##........................##',
    '#%::~~~%%%%%##...p.................p..##',
    '#%::~~~%%%%%##........................##',
    '#%::~~~%%%%%##........................##',
    '#%::~~~%%%%%##........................##',
    '#%::~~~%%%%%##........................##',
    '#%S:%%%%%%%%#############DDD############',
    '########################################',
  ],
  legend: {
    '#': { wall: 'outer' }, '+': { wall: 'inner' }, 'V': { wall: 'vault', floor: 'steel' }, 'b': { wall: 'boxes', floor: 'steel' },
    'v': { wall: 'vaultDoor', floor: 'steel', mark: 'vault-door' }, 'f': { wall: 'cabinet', floor: 'carpet' }, 'd': { wall: 'desk', floor: 'carpet' },
    '=': { wall: 'counter', floor: 'marble' }, 'p': { wall: 'pillar', floor: 'marble' }, 'n': { wall: 'bench', floor: 'marble' }, '%': { wall: 'sewer' },
    '.': { floor: 'marble' }, ',': { floor: 'carpet' }, ':': { floor: 'concrete' }, '_': { floor: 'steel' }, '~': { floor: 'sewer' },
    'D': { floor: 'marble', mark: 'front' }, 'S': { floor: 'concrete', mark: 'sewer' }, 'H': { floor: 'steel', mark: 'hatch' },
  },
  types: {
    outer: wall('#8a8070', '#4a4440', { h: 64, face: 'stone', cutH: 6 }),
    inner: wall('#d8d0c0', '#6a6258', { h: 52, cutH: 6 }),
    vault: wall('#7a8088', '#4a4e56', { h: 56, face: '#7a8088 metal', cutH: 6 }),
    boxes: wall('#a89a68', '#5a5e66', { h: 40, face: '#a89a68 metal', windows: { w: 3, h: 3, step: 5, lit: 0 }, cut: false }),
    vaultDoor: wall('#c0c4cc', '#5a5e66', { h: 52, face: '#c0c4cc metal', cutH: 6 }),
    cabinet: wall('#6a6e76', '#4e5258', { h: 24, face: '#6a6e76 metal', cut: false }),
    desk: wall('#6a4a32', '#8a6442', { h: 12, face: 'plank', cut: false }),
    counter: wall('#5a3a28', '#d8d0c4', { h: 16, face: 'plank', cut: false }),
    pillar: wall('#e0dacc', '#b4aea0', { h: 64, face: 'stone', cutH: 8 }),
    bench: wall('#5a3a28', '#7a5434', { h: 8, face: 'plank', cut: false }),
    sewer: wall('#4a4038', '#2a2420', { h: 56, face: 'brick', cutH: 6 }),
  },
  rooms: [
    { name: 'the lobby', rect: [14, 15, 37, 28], public: true }, { name: 'the tellers', rect: [14, 13, 37, 13] }, { name: 'the staff corridor', rect: [15, 10, 37, 11] },
    { name: 'the records office', rect: [26, 2, 37, 8] }, { name: 'the vault', rect: [15, 2, 23, 7] }, { name: 'the sewer', rect: [1, 1, 13, 28] },
  ],
  // the ways in: from the city's door, onto the cell inside it (and out again from the cells marked beside it)
  doors: [{ id: 'front', from: 'bank-door', at: [26, 27], mark: 'front' }, { id: 'sewer', from: 'bank-sewer', at: [2, 27], mark: 'sewer' }],
  // the guards' rounds (cells); they stand their post a moment at each corner
  guards: [
    { arch: 'guard', route: [[16, 16], [36, 16], [36, 26], [16, 26]] },
    { arch: 'guard', route: [[22, 19], [31, 19], [31, 24], [22, 24]] },
    { arch: 'guard', route: [[16, 10], [37, 10], [37, 11], [16, 11]] },
  ],
  // CCTV: a camera high on a wall, sweeping either side of its facing (radians: 0 east, pi/2 south)
  cameras: [
    { at: [14, 15], z: 52, facing: .8, sweep: .9, period: 7, range: 190, fov: .7 },
    { at: [37, 15], z: 52, facing: 2.35, sweep: .9, period: 8, range: 190, fov: .7 },
    { at: [21, 10], z: 46, facing: Math.PI, sweep: .7, period: 6, range: 150, fov: .7 },
    { at: [19, 7], z: 50, facing: -Math.PI / 2, sweep: .8, period: 9, range: 110, fov: .8 },
  ],
  lights: [
    { at: [19, 18], radius: 90 }, { at: [32, 18], radius: 90 }, { at: [19, 24], radius: 90 }, { at: [32, 24], radius: 90 },
    { at: [26, 10], radius: 80 }, { at: [31, 5], radius: 80 }, { at: [19, 5], radius: 70, color: '#c8d8ff' }, { at: [3, 15], radius: 60, color: '#a8c070' },
  ],
  music: 'heist',
});
