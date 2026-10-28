// The Velvet Casino (EXPANSION.md 2.3, 7, X6): the Velvet Syndicate's HQ on the Strip and House Edge's interior, its
// front doors on the forecourt off Loop Avenue, the fire escape off its roof down to Casino Row behind it. The entrance
// hall (marble, gold pillars) and the floor (the public's: the slots down the west side, blackjack and roulette under
// the chandeliers, the bar up the east wall), the cage behind its gilt bars along the floor's north side (the cashiers'
// window in them, the counting tables, the files and a safe behind), the vault behind the cage (its round gold door in
// the cage's east wall: seen from the window, past the cashiers), the staff corridor behind the floor's north wall (its
// door at the east end, the cage's at the west), and the roof up the stairs off the corridor's east end (the plant, the
// fire escape's door in its south-east corner). The Syndicate's hoods walk the floor's edge, the corridor and the cage;
// cameras watch the floor, the cage and the corridor. One cell a character:
//   #  the outer walls   +  inner walls   V  the vault's steel   v  its door   $  the cash on its pallets   T  the take
//   b  the cage's bars   =  the cashiers' window   c  counting tables   f  files   g  the safe   s  slot machines
//   t  blackjack tables   o  roulette   p P  gold pillars   B  the bar's counter   r  the back bar   a  the roof's plant
//   ,  carpet   .  concrete (the staff's)   _  the vault's steel floor   :  the roof's gravel   ~  marble
//   D  the front doors   R  the fire escape's door
import { def } from '../../motor/index.js';

const wall = (side, top, o = {}) => ({ side, top, face: 'plaster', roof: 'plain', ...o });

def('interiors', 'velvet-casino', {
  name: 'The Velvet Casino',
  blocks: [
    '########################################',
    '#,,,,,,,,,,,V_$$__TT__$$__V+:::::::::::#',
    '#,cc,,cc,,f,V_____________V+::a::::a:::#',
    '#,,,,,,,,,f,v_____________V+:::::::::::#',
    '#,cc,,cc,,g,v_____________V+::a::::::::#',
    '#,,,,,,,,,,,V_$$__$$__$$__V+:::::::::R:#',
    '#,,,,,,,,,,,VVVVVVVVVVVVVVV++++++::++++#',
    '#,,,,,,,,,,,,..........................#',
    '#,,,,,,,,,,,+..........................#',
    '#bbbbb==bbbb+++++++++++++++++++++.+++++#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,B,,r#',
    '#,,ssssssss,,,,tt,,,tt,,,ooo,,,,,,,B,,r#',
    '#,,,,,,,,,,,,,,tt,,,tt,,,ooo,,,,,,,B,,r#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,B,,r#',
    '#,,,,,,,,,,,,p,,,,,,,,,p,,,,,,p,,,,B,,r#',
    '#,,ssssssss,,,,,,,,,,,,,,,,,,,,,,,,B,,r#',
    '#,,,,,,,,,,,,,,tt,,,tt,,,ooo,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,tt,,,tt,,,ooo,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,ssssssss,,p,,,,,,,,,p,,,,,,p,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '#~~~~~~~P~~~~~~~~~~~~~~~~~~~~~~P~~~~~~~#',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '###################DD###################',
  ],
  legend: {
    '#': { wall: 'outer' }, '+': { wall: 'inner' }, 'V': { wall: 'vault', floor: 'steel' }, 'v': { wall: 'vaultDoor', floor: 'steel', mark: 'vault-door' },
    '$': { wall: 'cash', floor: 'steel' }, 'T': { wall: 'cash', floor: 'steel', mark: 'take' }, 'b': { wall: 'bars', floor: 'carpet' }, '=': { wall: 'window', floor: 'carpet' },
    'c': { wall: 'counting', floor: 'carpet' }, 'f': { wall: 'cabinet', floor: 'carpet' }, 'g': { wall: 'safe', floor: 'carpet' }, 's': { wall: 'slots', floor: 'carpet' },
    't': { wall: 'table', floor: 'carpet' }, 'o': { wall: 'roulette', floor: 'carpet' }, 'p': { wall: 'pillar', floor: 'carpet' }, 'P': { wall: 'pillar', floor: 'marble' },
    'B': { wall: 'counter', floor: 'carpet' }, 'r': { wall: 'backbar', floor: 'carpet' }, 'a': { wall: 'plant', floor: 'yard' },
    ',': { floor: 'carpet' }, '.': { floor: 'concrete' }, '_': { floor: 'steel' }, ':': { floor: 'yard' }, '~': { floor: 'marble' },
    'D': { floor: 'marble', mark: 'front' }, 'R': { floor: 'yard', mark: 'roof' },
  },
  types: {
    outer: wall('#3a1a40', '#24102a', { h: 64, face: 'stone', cutH: 6 }),
    inner: wall('#5a2a5e', '#3a1a40', { h: 52, cutH: 6 }),
    vault: wall('#8a8e96', '#5a5e66', { h: 52, face: '#8a8e96 metal', cutH: 6 }),
    vaultDoor: wall('#d8b04a', '#8a7a3a', { h: 52, face: '#d8b04a metal', cutH: 6 }),
    cash: wall('#3a6a3a', '#7ac87a', { h: 14, face: 'plank', cut: false }),
    bars: wall('#d8b04a', '#8a7a3a', { h: 26, face: '#d8b04a metal', cut: false }),
    window: wall('#3a2418', '#d8b04a', { h: 12, face: 'plank', cut: false }),
    counting: wall('#5a4a3a', '#2a6a3a', { h: 12, face: 'plank', cut: false }),
    cabinet: wall('#5a5e66', '#3e4248', { h: 24, face: '#5a5e66 metal', cut: false }),
    safe: wall('#2e3036', '#4a4c54', { h: 20, face: '#2e3036 metal', cut: false }),
    slots: wall('#8a3a9a', '#d8b04a', { h: 22, face: '#8a3a9a metal', windows: { w: 3, h: 4, step: 4, lit: 1 }, cut: false }),
    table: wall('#3a2418', '#2a7a4a', { h: 10, face: 'plank', cut: false }),
    roulette: wall('#5a2a1a', '#1a6a3a', { h: 11, face: 'plank', cut: false }),
    pillar: wall('#d8b04a', '#8a7a3a', { h: 64, face: '#d8b04a metal', cutH: 8 }),
    counter: wall('#3a1a2a', '#d8b04a', { h: 16, face: 'plank', cut: false }),
    backbar: wall('#2a1a20', '#ff8af0', { h: 34, face: 'plank', windows: { w: 2, h: 3, step: 4, lit: .9 }, cut: false }),
    plant: wall('#8a8e94', '#4a4e54', { h: 12, face: '#8a8e94 metal', cut: false }),
  },
  rooms: [
    { name: 'the floor', rect: [1, 10, 38, 21], public: true }, { name: 'the entrance hall', rect: [1, 22, 38, 24], public: true },
    { name: 'the cage', rect: [1, 1, 11, 8] }, { name: 'the vault', rect: [13, 1, 25, 5] }, { name: 'the staff corridor', rect: [13, 7, 38, 8] },
    { name: 'the roof', rect: [28, 1, 38, 5] },
  ],
  doors: [{ id: 'front', from: 'casino-door', at: [19, 24], mark: 'front' }, { id: 'roof', from: 'casino-back', at: [37, 4], mark: 'roof' }],
  // the vault's door (cracked: a job's) and the take on its pallet (bagged), △ at either told on the BUS (spot)
  spots: [{ id: 'vault', mark: 'vault-door', verb: 'CRACK', label: 'THE VAULT' }, { id: 'take', mark: 'take', verb: 'BAG', label: 'THE TAKE' }],
  // the Syndicate's hoods: round the floor (past the cage's window, along the bar's front, by the staff door), up and
  // down the corridor, across the cage behind the counting tables; a snub each under a dinner jacket (the house's: the
  // Syndicate's Buzzsaws and Persuaders stay on the street)
  guards: [
    { arch: 'velvet-grunt', route: [[2, 10], [33, 10], [33, 21], [2, 21]], weapons: ['fists', 'snub38'] },
    { arch: 'velvet-grunt', route: [[14, 8], [37, 8]], weapons: ['fists', 'snub38'] },
    { arch: 'velvet-enforcer', route: [[2, 6], [9, 6]], weapons: ['fists', 'snub38'] },
  ],
  // (the floor's from its north-west and south-east corners, the cage's from its north-west corner over the counting
  // tables and the vault's door, the corridor's from its east end)
  cameras: [
    { at: [1, 10], z: 52, facing: .6, sweep: .6, period: 10, range: 220, fov: .7 },
    { at: [38, 21], z: 52, facing: -2.5, sweep: .6, period: 11, range: 220, fov: .7 },
    { at: [1, 1], z: 46, facing: .55, sweep: .4, period: 8, range: 170, fov: .7 },
    { at: [38, 7], z: 46, facing: Math.PI, sweep: .25, period: 9, range: 200, fov: .5 },
  ],
  patrons: [
    // (the slots' players, facing their machines; the tables' gamblers round them, the croupiers across)
    ...[[4, 13, -1], [7, 13, -1], [9, 11, 1], [5, 17, -1], [8, 15, 1], [4, 19, 1], [10, 19, 1]].map(([x, y, s], i) => ({ arch: ['retiree', 'tourist', 'office', 'nightowl'][i % 4], at: [x, y], facing: s * Math.PI / 2 })),
    ...[[15, 14, -1], [16, 14, -1], [20, 14, -1], [21, 11, 1], [15, 19, -1], [20, 19, -1], [26, 14, -1], [27, 11, 1], [25, 19, -1]].map(([x, y, s], i) => ({ arch: ['tourist', 'clubber', 'office', 'nightowl', 'retiree'][i % 5], at: [x, y], facing: s * Math.PI / 2 })),
    ...[[17, 12], [22, 13], [17, 17], [22, 18], [28, 12], [28, 17]].map(([x, y]) => ({ arch: 'clerk', at: [x, y], pose: 'hips', facing: Math.PI })),
    { arch: 'clerk', at: [36, 13], pose: 'hips', facing: Math.PI }, { arch: 'clubber', at: [34, 12], facing: 0 }, { arch: 'office', at: [34, 15], facing: 0 },   // (the bar)
    { arch: 'clerk', at: [6, 8], pose: 'hips', facing: Math.PI / 2 }, { arch: 'office', at: [4, 3], facing: Math.PI / 2 }, { arch: 'office', at: [8, 5], facing: -Math.PI / 2 },   // (the cage: the cashier at the window, the counters)
  ],
  lights: [
    { at: [8, 14], radius: 90, color: '#ff8af0' }, { at: [18, 14], radius: 100, color: '#ffe066' }, { at: [26, 14], radius: 100, color: '#ffe066' }, { at: [18, 19], radius: 90, color: '#ffd890' },
    { at: [33, 18], radius: 90, color: '#c87aff' }, { at: [36, 13], radius: 80, color: '#ff8af0' }, { at: [6, 4], radius: 90, color: '#fff0c0' }, { at: [19, 3], radius: 90, color: '#c8e0ff' },
    { at: [25, 8], radius: 80 }, { at: [33, 3], radius: 90, color: '#a8b8d8' }, { at: [19, 23], radius: 110, color: '#ffe8b0' },
  ],
  music: 'velvet',
});
