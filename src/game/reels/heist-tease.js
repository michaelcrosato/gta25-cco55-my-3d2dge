// Reel: HEIST TEASE (PLAN.md 9.11). Inside the First Lowtown Bank at night: Viv waits by the counter's gate for the
// lobby guard's round and takes him down from behind (the interior's own takedown, the stealth bot's), out by the
// front door to the getaway car at the curb, and up onto the Loop with the stars after her: ISO inside, MODE 7 on the
// deck.
import { defReel } from '../../motor/index.js';

const W = (x, y) => [x * 16, y * 16], T = 16, C = (x, y, z) => (z === undefined ? [x * T + 8, y * T + 8] : [x * T + 8, y * T + 8, z]);
const WAIT = W(26.5, 15.7), DOOR_IN = W(26.5, 27.5), EXIT = W(26.5, 28.4), CURB = [1864, 816];
const ACROSS = [W(25.6, 15.6), W(25.6, 22), DOOR_IN];   // (across the lobby to the front door: clear of the pillar)
const STREET = [C(149, 70)], LOOP = [C(120, 102, 64), C(64, 102, 64)];   // (east on Lantern Lane and down Seawall Drive; up the Loop's south-east ramp and west along its south leg)
// an objective with its bot hint, done when pred(m) holds
const until = (m, pred, text, hint) => ({ ...m.waitUntil(pred), start: mm => mm.objective(text, { hint }) });

defReel('heist_tease', {
  title: 'Heist Tease', shows: 'The First Lowtown Bank', views: ['iso', 'side7'], time: 100,
  stages: [
    { id: 'lobby', view: 'iso', caption: 'THE FIRST LOWTOWN BANK',
      setup(m) {
        m.as('viv'); m.time(23); m.weather('overcast');
        m.place('player', 'bank-door'); m.interior('bank', 'front');
        m.loadout({ weapons: ['snub38'], select: 'fists' }); m.place('player', WAIT);   // (by the counter's gate as the lobby guard's round comes by)
      },
      *run(m) {
        const guardDown = mm => mm.inside && mm.inside.run.watch().guards.some(g => g.down);   // (the round that comes by first)
        yield until(m, guardDown, 'Take the guard', { kind: 'stealth', path: [WAIT] });
        yield m.wait(1);
      } },
    { id: 'out', view: 'iso', caption: 'A TAKEDOWN',
      setup() {},
      *run(m) {
        yield until(m, mm => Math.hypot(mm.player.x - DOOR_IN[0], mm.player.y - DOOR_IN[1]) < 10, 'To the door', { kind: 'stealth', path: ACROSS });
        yield until(m, mm => !mm.inside, 'Out', { kind: 'goto', at: EXIT, interact: true, foot: true });
      } },
    { id: 'getaway', view: 'iso', caption: 'THE GETAWAY',
      setup(m) {
        m.as('viv'); if (m.inside) m.outside();
        const q = m.lane(CURB, 0); m.spawn.vehicle('zephyr', [q.x, q.y], { tag: 'getaway', heading: q.heading, color: '#1e1e24', mods: { armor: true } });
        m.allowWanted(); m.wanted.set(2); m.wanted.cap(2);
      },
      *run(m) { yield m.enter('getaway', { text: 'The car' }); yield m.race(STREET, { text: 'Go', radius: 90 }); } },
    { id: 'loop', view: 'side7', caption: 'UP ON THE LOOP',
      setup(m) { m.as('viv'); m.view('side7', { heading: 'west' }); },   // (the rail along the Loop's south leg)
      *run(m) { yield m.race(LOOP, { text: 'Up on the Loop', radius: 90 }); yield m.wait(1); } },
  ],
});
