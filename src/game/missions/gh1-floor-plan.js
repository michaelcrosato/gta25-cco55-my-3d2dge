// GH1 · Setup: Floor Plan (EXPANSION.md 4, X6): Viv's first setup for House Edge, from the planning board in the
// penthouse at the Bellevue, once two of Glass Heights' gangs have given the crew their first jobs. Played as Viv, by
// day, a high roller in pearls: in at the Velvet Casino's front doors, across the floor (the public's: nobody minds a
// woman with money there) to the cashiers' window in the cage's gilt bars, and two photos with the Snap from the floor:
// the cage behind the bars (its counting tables, its cashiers), and the vault's round gold door at the cage's back,
// seen past them from the window's end. Then out the way she came. No guns (the doors' frisk): the Snap alone. Proves:
// an interior's public room, the photo.
//   The floor's tables and slots stand between the doors and the window: the way across is a path of cells (indoors no
//   walk graph runs; the bot walks it straight, point to point).
import { defMission } from '../../motor/index.js';

const VIV = { name: 'Viv', color: '#3ad0c8' }, DEX = { name: 'Dex', color: '#ff5a4a' }, GUS = { name: 'Gus', color: '#ff9a2a' };
const DOOR = 'casino-door';
const C = (x, y) => [(x + .5) * 16, (y + .5) * 16];   // (a casino cell's middle: velvet-casino.js)
const IN = [C(19, 23), C(12, 19), C(12, 14), C(11, 11), C(6, 10)];   // (the doors to the cashiers' window, round the tables and the slots)
const WINDOW = C(6, 10), CORNER = C(9, 10);   // (at the window; along the bars to its end, the vault's door in view past the cashiers)
const CAGE = C(5, 4), VAULT = C(12, 3.5);   // (the counting tables; the vault's round door)
const OUT = [C(11, 11), C(12, 14), C(12, 19), C(19, 23), C(19, 24)];
const EXIT = C(19, 25);   // (the front doors' own marked cell, as the bank's: △ there goes out)

const day = m => { if (m.hour < 10 || m.hour >= 18) m.time(14); };
// a walk across the floor: the bot's goto with the path's points, done at its end
function walk(m, text, path, interact = false) {
  const end = path[path.length - 1];
  const o = m.waitUntil(mm => !!mm.inside && Math.hypot(mm.player.x - end[0], mm.player.y - end[1]) < 12);
  return { ...o, start: mm => { mm.objective(text, { hint: { kind: 'goto', at: end, radius: 10, foot: true, interact, path } }); mm.marker(end, { color: '#7ac8ff', r: 8 }); }, nav: () => end };
}

defMission('heist_floor_plan', {
  title: 'Setup: Floor Plan', giver: { at: 'heights-board' }, tier: 1, requires: ['heist_blackout'], district: 'glass-heights', plays: 'viv',
  unlock: save => ['saints_communion', 'velvet_comp', 'yacht_overboard'].filter(id => save.missions.done.includes(id)).length >= 2,
  brief: ['House Edge starts on the Velvet Casino\'s floor.', 'In by day as a high roller: a photo of the cage, a photo of the vault\'s door. Out. No guns.'],
  rewards: { cash: 2500 },
  bonus: [{ id: 'time', text: 'Under 4:00', check: m => m.elapsed < 240 }],
  stages: [
    { id: 'plan', setup(m) {
      m.as('viv'); day(m);
      const q = m.at('heights-board'); m.place('player', [q[0] + 40, q[1] + 20], { within: 60 });
    }, *run(m) {
      yield m.reach('heights-board', { text: 'To the planning board', foot: true, radius: 20 });
      yield m.say(['The Velvet Casino keeps its takings in a vault behind the cage. Every chip on the Strip ends up there.', 'First I want to see it. I go in as a high roller and take pictures.'], VIV);
      yield m.say(['High roller. You.', 'You\'ll need pearls.'], GUS);
      yield m.say(['I have pearls, Gus.'], VIV);
    } },
    {
      id: 'casino',
      setup(m) { m.as('viv'); day(m); if (m.inside) m.outside(); m.wanted.clear(); m.loadout({ weapons: ['snap'], only: true, select: 'fists' }); },
      *run(m) {
        const door = m.at(DOOR);
        m.objective('Into the Velvet Casino (its front doors on the forecourt off Loop Avenue)', { hint: { kind: 'goto', at: door, radius: 16, foot: true, interact: true } });
        m.marker(door, { color: '#ffe066', r: 12 });
        let tow = 0;
        yield m.waitUntil(mm => { if (!mm.inside && mm.stageTime >= tow) { tow = mm.stageTime + 1; mm.clearSpot(door, 10); } return !!mm.inside; });
      },
    },
    {
      id: 'floor',
      // Viv inside at the front doors (a retry or a deep link: outside them, and in), the Snap and nothing else
      setup(m) {
        m.as('viv'); day(m); m.data.out = false;
        if (m.inside && m.retries) m.outside();
        if (!m.inside) { if (m.dist(DOOR) > 60) m.place('player', DOOR); m.interior('velvet-casino', 'front'); }
        m.loadout({ weapons: ['snap'], only: true, select: 'fists' });
        m.wanted.clear();
      },
      *run(m) {
        m.failIf(mm => { const R = mm.inside ? mm.inside.run.watch() : null; return !!R && !!R.alarm; }, 'the alarm');
        m.failIf(mm => !mm.inside && !mm.data.out, 'you left the casino');
        yield walk(m, 'Across the floor to the cashiers\' window in the cage\'s bars', IN);
        yield m.say(['Five hundred in chips, darling. Mm, what a pretty cage.'], VIV);
        yield m.photo(CAGE, { from: WINDOW, range: 150, text: 'Photograph the cage through the bars (the Snap)' });
        yield walk(m, 'Along the bars to the window\'s end', [CORNER]);
        yield m.photo(VAULT, { from: CORNER, range: 160, text: 'Photograph the vault\'s door at the back of the cage (the Snap)' });
        yield m.say(['A Hollister 9. Round, gold, very old-fashioned. I can open that.'], VIV);
        m.data.out = true;
        yield walk(m, 'Back across the floor to the front doors', OUT);
        m.objective('Out by the front doors', { hint: { kind: 'goto', at: EXIT, radius: 16, foot: true, interact: true } });
        yield m.waitUntil(mm => !mm.inside);
        yield m.say(['The cage, the vault, and a Hollister 9 on the door.', 'Now we need a way out the casino can\'t follow. Dex: how do you feel about boats with wings?'], VIV);
        yield m.say(['I feel very good about boats with wings.'], DEX);
      },
    },
  ],
});
