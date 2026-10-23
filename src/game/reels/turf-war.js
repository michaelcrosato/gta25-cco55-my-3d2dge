// Reel: TURF WAR (PLAN.md 9.11). Gus against the Saints at the edge of the Neon Mile: a Molotov into three Saints idling
// by their stack of red barrels (the fire, then the chain of blasts), back from the flames, then the Saints' crew up the
// street the other way and the shoot-out to the last man. ISO throughout.
import { defReel } from '../../motor/index.js';

const T = 16, C = (x, y) => [x * T + 8, y * T + 8];
const AT = C(116, 54), FOE = C(122, 54), BACK = C(112, 54);   // (Lantern Lane by Marquee Street: Gus west of the Saints; where he falls back to)
const RED = null;
const dead = a => !a || a.dead;

defReel('turf_war', {
  title: 'Turf War', shows: 'Every block belongs to somebody', views: ['iso'], time: 80,
  stages: [
    { id: 'molotov', view: 'iso', caption: 'A MOLOTOV',
      setup(m) {
        m.as('gus'); m.time(21); m.weather('clear');
        m.place('player', AT); m.loadout({ weapons: ['partystarter'], ammo: { partystarter: 6 }, select: 'partystarter', only: true, health: 100, armor: 100 });
        const ring = [[0, -12, Math.PI / 2], [12, 4, Math.PI], [-6, 12, -Math.PI / 2]];   // (round their barrels, facing in)
        for (const [dx, dy, f] of ring) m.spawn.ped('saint-grunt', [FOE[0] + 20 + dx, FOE[1] + dy], { tag: 'front', role: 'idle', gang: 'saints', weapons: ['fists'], facing: f });
        for (let i = 0; i < 4; i++) m.spawn.prop('barrel', [FOE[0] + 16 + (i % 2) * 9, FOE[1] - 5 + Math.floor(i / 2) * 9], { tag: 'barrels', model: RED, explosive: { hp: 12, damage: 60, splash: 52, fire: true } });
      },
      *run(m) {
        yield m.first([m.kill('front', { text: 'Burn them out' }), m.waitUntil(mm => !!mm.player.throwing)]);   // (the bottle away)
        yield m.parallel([m.reach(BACK, { foot: true, radius: 18, text: 'Back' }), m.waitUntil(mm => mm.tagged('front').every(dead), { timeout: 5 })]);   // (back from the fire as it goes up)
      } },
    { id: 'shootout', view: 'iso', caption: 'TURF WAR',
      setup(m) {
        m.as('gus'); m.loadout({ weapons: ['buzzsaw'], ammo: { buzzsaw: 240 }, select: 'buzzsaw', only: true, armor: 100 });
        for (let i = 0; i < 3; i++) m.spawn.ped('saint-grunt', [BACK[0] - 70 - i * 12, BACK[1] - 8 + i * 8], { tag: 'back', role: 'enemy', gang: 'saints', weapons: ['snub38'], health: 50, attack: true });   // (up the street the other way: the fire at his back)
      },
      *run(m) { yield m.kill('back', { text: 'Hold the corner' }); yield m.wait(1.5); } },
  ],
});
