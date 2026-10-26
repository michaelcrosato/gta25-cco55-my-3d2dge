// The Ironside Power Station (EXPANSION.md 2.2, 7, X3): Blackout's interior, its front door on the city's power-door
// on Union Street. The lobby by the doors (reception: the public's, as a bank's lobby is); the corridor north of it to
// the control room, where the consoles run the station and the switchyard's plans hang on the west wall; the turbine
// hall east of them, three turbines on their generators, each with its shut-off valve on the floor south of it; the
// switchyard behind the hall's north door, transformers in rows on the gravel. The Volt Boys moonlight as its night
// watch: a round in the corridor, a round of the hall, one in the switchyard, and the CCTV over the control room, the
// hall and the switchyard. The corridor opens on the lobby alone, the hall on the lobby and the switchyard. One cell a character:
//   #  the outer walls (concrete)   +  inner walls   c  the consoles   m  the plans on the wall   e  the engineers' desk
//   x  transformers   T  a turbine's casing   G  its generator   1 2 3  the valves   p  pillars   k  lockers
//   d  reception's desk   ,  linoleum (the control room)   .  concrete   :  gravel   _  the hall's steel   D  the doors
import { def } from '../../motor/index.js';

const wall = (side, top, o = {}) => ({ side, top, face: 'plaster', roof: 'plain', ...o });

def('interiors', 'power-station', {
  name: 'Ironside Power Station',
  blocks: [
    '####################################',
    '#,ccccc,+::::::::::::::::::::::::::#',
    '#,,,,,,,+:xx::xx::xx::xx::xx::xx:::#',
    '#m,,,,,,+::::::::::::::::::::::::::#',
    '#m,,,ee,+::::::::::::::::::::::::::#',
    '#,,,,,,,+:xx::xx::xx::xx::xx::xx:::#',
    '#,,,,,,,+::::::::::::::::::::::::::#',
    '#+++++.++++++++++++++++++++++++_+++#',
    '#.......+__________________________#',
    '#k......+_TTTTTT__TTTTTT__TTTTTT___#',
    '#...+...+_TTTTTT__TTTTTT__TTTTTT___#',
    '#k..+...+_TTTTTT__TTTTTT__TTTTTT___#',
    '#...+...+_TTTTTT__TTTTTT__TTTTTT___#',
    '#k..+...+__GGGG____GGGG____GGGG____#',
    '#.......+___1_______2_______3______#',
    '#+++++.++__________________________#',
    '#.......+__________________________#',
    '#..dd...+_p_____p_____p_____p_____p#',
    '#.......+__________________________#',
    '#.......___________________________#',
    '#.......+__________________________#',
    '##DD################################',
  ],
  legend: {
    '#': { wall: 'outer' }, '+': { wall: 'inner' }, 'c': { wall: 'console', floor: 'carpet' }, 'm': { wall: 'plans', floor: 'carpet', mark: 'plans' },
    'e': { wall: 'desk', floor: 'carpet' }, 'x': { wall: 'transformer', floor: 'yard' }, 'T': { wall: 'turbine', floor: 'steel' }, 'G': { wall: 'generator', floor: 'steel' },
    '1': { wall: 'valve', floor: 'steel', mark: 'valve1' }, '2': { wall: 'valve', floor: 'steel', mark: 'valve2' }, '3': { wall: 'valve', floor: 'steel', mark: 'valve3' },
    'p': { wall: 'pillar', floor: 'steel' }, 'k': { wall: 'locker', floor: 'concrete' }, 'd': { wall: 'desk', floor: 'concrete' },
    ',': { floor: 'carpet' }, '.': { floor: 'concrete' }, ':': { floor: 'yard' }, '_': { floor: 'steel' }, 'D': { floor: 'concrete', mark: 'front' },
  },
  types: {
    outer: wall('#8a8a84', '#4a4a4c', { h: 64, face: 'stone', cutH: 6 }),
    inner: wall('#c8c4b4', '#5a5850', { h: 52, cutH: 6 }),
    console: wall('#3a4a5a', '#2a3440', { h: 14, face: '#3a4a5a metal', windows: { w: 2, h: 2, step: 3, lit: .9 }, cut: false }),
    plans: wall('#e8e4d8', '#8a8a84', { h: 30, face: 'plaster', windows: { w: 10, h: 12, step: 14, lit: 1 }, cut: false }),
    desk: wall('#6a5a48', '#8a7a62', { h: 12, face: 'plank', cut: false }),
    transformer: wall('#7a8088', '#5a5e66', { h: 22, face: '#7a8088 metal', cut: false }),
    turbine: wall('#d8b830', '#8a7a3a', { h: 30, face: '#d8b830 metal', cutH: 6 }),
    generator: wall('#5a6a7a', '#3a4450', { h: 22, face: '#5a6a7a metal', cut: false }),
    valve: wall('#c83a2a', '#e8e8ec', { h: 10, face: '#c83a2a metal', cut: false }),
    pillar: wall('#9a9a94', '#6a6a64', { h: 64, face: 'stone', cutH: 8 }),
    locker: wall('#5a6a5a', '#3a4a3a', { h: 26, face: '#5a6a5a metal', cut: false }),
  },
  rooms: [
    { name: 'the lobby', rect: [1, 16, 7, 20], public: true }, { name: 'the corridor', rect: [1, 8, 7, 14] }, { name: 'the control room', rect: [1, 1, 7, 6] },
    { name: 'the turbine hall', rect: [9, 8, 34, 20] }, { name: 'the switchyard', rect: [9, 1, 34, 6] },
  ],
  doors: [{ id: 'front', from: 'power-door', at: [2, 20], mark: 'front' }],
  // the valves (△ at one: a mission listens for it) and the plans (the Snap's)
  spots: [1, 2, 3].map(i => ({ id: 'valve' + i, mark: 'valve' + i, verb: 'SHUT', label: 'TURBINE ' + i })),
  guards: [
    { arch: 'volt-grunt', route: [[3, 14], [3, 9], [2, 9], [2, 14]] },   // (round the corridor's west aisle, up its east side and down its west: the wall down its middle hides the east aisle)
    { arch: 'volt-grunt', route: [[10, 15], [33, 15], [33, 19], [10, 19]] },
    { arch: 'volt-enforcer', route: [[10, 3], [33, 3], [33, 6], [10, 6]] },
  ],
  // (the control room's from its north-west corner over the consoles and the door, the hall's two from its east corners,
  // the switchyard's over its gate)
  cameras: [
    { at: [1, 1], z: 46, facing: .7, sweep: .5, period: 12, range: 120, fov: .7 },
    { at: [34, 8], z: 52, facing: 2.6, sweep: .7, period: 10, range: 220, fov: .7 },
    { at: [34, 20], z: 52, facing: -2.6, sweep: .7, period: 11, range: 220, fov: .7 },
    { at: [31, 1], z: 46, facing: 2.2, sweep: .6, period: 9, range: 150, fov: .7 },
  ],
  lights: [
    { at: [4, 18], radius: 80 }, { at: [4, 11], radius: 70 }, { at: [4, 3], radius: 80, color: '#a8d8ff' },
    { at: [13, 15], radius: 100, color: '#ffd890' }, { at: [21, 15], radius: 100, color: '#ffd890' }, { at: [29, 15], radius: 100, color: '#ffd890' },
    { at: [16, 4], radius: 90, color: '#c8e0ff' }, { at: [28, 4], radius: 90, color: '#c8e0ff' },
  ],
  music: 'heist',
});
