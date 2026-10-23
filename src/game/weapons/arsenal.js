// Lowtown's 11 weapons (PLAN.md 9.7). Health is 100 and armour 100, so a pistol drops a ped in 6 hits and a shotgun
// blast at close range in one or two. Prices are Lead Farm's; unlocks are the missions that put them on its shelves.
import { def } from '../../motor/index.js';

const W = (id, spec) => def('weapons', id, spec);
W('fists', { name: 'Fists', slot: 'melee', projectile: 'melee', damage: 8, rate: 2.6, range: 22, sound: 'punch' });
W('slugger', { name: 'Lowtown Slugger', slot: 'melee', projectile: 'melee', damage: 24, rate: 1.4, range: 30, model: 'bat', sound: 'bat', twoHanded: true, price: 60 });
W('snub38', { name: 'Snub .38', slot: 'pistol', projectile: 'bullet', damage: 18, rate: 3, mag: 6, reload: 1.2, spread: 2.5, range: 420, speed: 1100, ammo: 48, model: 'pistol', sound: 'pistol', recoil: .3, rumble: .25, price: 250 });
W('buzzsaw', { name: 'Buzzsaw', slot: 'smg', projectile: 'bullet', damage: 9, rate: 11, mag: 30, reload: 1.6, spread: 6, range: 340, speed: 1000, ammo: 150, model: 'smg', sound: 'smg', recoil: .15, rumble: .2, price: 900, unlock: 'saints_holy_rollers' });
W('persuader', { name: 'Persuader', slot: 'shotgun', projectile: 'pellets', damage: 9, pellets: 8, rate: 1.1, mag: 6, reload: 2.4, spread: 12, range: 210, speed: 950, ammo: 36, model: 'shotgun', sound: 'shotgun', recoil: .8, rumble: .6, twoHanded: true, price: 1200, unlock: 'rats_rat_run' });
W('boomtube', { name: 'Boom Tube', slot: 'heavy', projectile: 'rocket', damage: 120, rate: .6, mag: 1, reload: 2.5, range: 700, speed: 380, splash: 64, ammo: 6, model: 'launcher', sound: 'rocket', recoil: 1, rumble: 1, twoHanded: true, price: 5000, unlock: 'gnomes_gutter_ball' });
W('hotmess', { name: 'Hot Mess', slot: 'heavy', projectile: 'stream', damage: 4, rate: 12, mag: 100, reload: 3, spread: 8, range: 110, speed: 260, burn: 4, ammo: 300, model: 'flamer', sound: 'flame', rumble: .3, twoHanded: true, price: 3500, unlock: 'rats_crane_game' });
W('partystarter', { name: 'Party Starter', slot: 'thrown', projectile: 'molotov', damage: 18, rate: .8, range: 260, speed: 260, splash: 40, burn: 6, ammo: 5, model: 'molotov', sound: 'glass', price: 150 });
W('pineapple', { name: 'Pineapple', slot: 'thrown', projectile: 'grenade', damage: 110, rate: .8, range: 280, speed: 280, splash: 72, fuse: 2.5, ammo: 5, model: 'grenade', sound: 'boom', price: 300, unlock: 'gnomes_lawn_order' });
W('zapomatic', { name: 'Zap-O-Matic', slot: 'special', projectile: 'zap', damage: 6, rate: 4, range: 180, chain: 3, stun: 1.2, ammo: 60, model: 'zapper', sound: 'zap', rumble: .4, price: 4000, unlock: 'saints_drag_mass' });
W('snap', { name: 'Snap', slot: 'special', projectile: 'photo', damage: 0, rate: 1.5, range: 600, model: 'phone', sound: 'shutter', keep: true });
